// API-level tests for auth session validity (no browser needed - this is
// purely server middleware behavior). Added alongside the production data
// reset (27 Agustus): TRUNCATE-ing `users` while a browser still holds a
// valid-but-now-stale signed session cookie (cookie-session is stateless -
// the cookie IS the session, see server/index.js's cookieSession() setup)
// used to sail through requireAuth as req.userId = <deleted id>, and GET
// /api/state's "no profile row" branch (built for a genuinely new,
// mid-onboarding account) couldn't tell that apart from "this account no
// longer exists" - both look identical to it. The founder hit this live:
// resetting their whole production database while still logged in on their
// phone dropped them into onboarding ("Siapa namamu?") instead of the
// login/signup screen. requireAuth (server/index.js) now checks the user
// still exists and clears the stale cookie (req.session = null, same idiom
// POST /api/logout already uses) before responding 401 - this test proves
// that both halves of the fix actually work, not just that it compiles.
//
// Run: node tests/auth.js
// Requires: local Postgres (same TEST_DATABASE_URL convention as the rest
// of this suite).

const assert = require("assert");
const { spawn } = require("child_process");
const { Client } = require("pg");

const PORT = 3999;
const BASE = `http://localhost:${PORT}`;

let failures = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`  ok - ${name}`);
  } catch (e) {
    failures += 1;
    console.error(`  FAIL - ${name}: ${e.message}`);
  }
}

(async () => {
  const env = {
    ...process.env,
    DATABASE_URL: process.env.TEST_DATABASE_URL || "postgres://postgres:testpass@localhost:5432/eleva_test",
    SESSION_SECRET: "testsecret", BETA_CODE: "TESTCODE", PORT: String(PORT),
  };
  delete env.ANTHROPIC_API_KEY;

  const server = spawn("node", ["server/index.js"], { env, stdio: ["ignore", "pipe", "pipe"] });
  let serverLog = "";
  server.stdout.on("data", (d) => { serverLog += d; });
  server.stderr.on("data", (d) => { serverLog += d; });
  await new Promise((resolve, reject) => {
    const deadline = Date.now() + 15000;
    (function poll() {
      fetch(`${BASE}/`).then(() => resolve()).catch(() => {
        if (Date.now() > deadline) return reject(new Error(`server never came up:\n${serverLog}`));
        setTimeout(poll, 300);
      });
    })();
  });

  function makeClient() {
    let cookie = "";
    let lastSetCookie = [];
    return {
      async call(path, body, method) {
        const res = await fetch(`${BASE}${path}`, {
          method: method || (body ? "POST" : "GET"), headers: { "Content-Type": "application/json", cookie },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        lastSetCookie = res.headers.getSetCookie?.() || [];
        if (lastSetCookie.length) cookie = lastSetCookie.map((c) => c.split(";")[0]).join("; ");
        const json = await res.json().catch(() => ({}));
        return { status: res.status, json };
      },
      get lastSetCookie() { return lastSetCookie; },
      get cookie() { return cookie; },
    };
  }

  const sql = new Client({ connectionString: env.DATABASE_URL });
  await sql.connect();

  console.log("E2E: requireAuth session-existence check");

  await test("a normal logged-in session still authenticates fine (regression: existence check doesn't break the common case)", async () => {
    const c = makeClient();
    const email = `auth-ok-${Date.now()}@example.com`;
    const signup = await c.call("/api/signup", { email, password: "password123", betaCode: "TESTCODE" });
    assert.strictEqual(signup.status, 200);
    const state = await c.call("/api/state");
    assert.strictEqual(state.status, 200);
  });

  await test("a stale session cookie for a user deleted from the database (e.g. a full reset) gets 401, not treated as mid-onboarding", async () => {
    const c = makeClient();
    const email = `auth-stale-${Date.now()}@example.com`;
    const signup = await c.call("/api/signup", { email, password: "password123", betaCode: "TESTCODE" });
    assert.strictEqual(signup.status, 200);

    // Simulate the reset: delete the user row directly, same as
    // TRUNCATE users CASCADE would, WITHOUT touching the browser's cookie -
    // this is exactly the founder's scenario.
    await sql.query(`DELETE FROM users WHERE email = $1`, [email]);

    const state = await c.call("/api/state");
    assert.strictEqual(state.status, 401, "a deleted user's stale cookie must not be treated as a valid session");
    assert.strictEqual(state.json.profile, undefined, "must not fall into the {profile: null} onboarding-draft shape");
  });

  await test("that 401 also clears the stale cookie itself (reuses the same idiom as POST /api/logout)", async () => {
    const c = makeClient();
    const email = `auth-clear-${Date.now()}@example.com`;
    await c.call("/api/signup", { email, password: "password123", betaCode: "TESTCODE" });
    await sql.query(`DELETE FROM users WHERE email = $1`, [email]);
    await c.call("/api/state");
    assert.ok(c.lastSetCookie.some((h) => /session=;|Max-Age=0|expires=Thu, 01 Jan 1970/i.test(h)), "expected the session cookie to be cleared, got: " + JSON.stringify(c.lastSetCookie));
  });

  await sql.end();
  server.kill();

  if (failures > 0) {
    console.log(`\n${failures} FAILURE(S)`);
    process.exit(1);
  }
  console.log("\nALL TESTS PASSED");
  process.exit(0);
})().catch((e) => {
  console.error("crashed:", e);
  process.exit(1);
});
