// Playwright e2e for the real server-side quest expiration mechanism (round
// 40, founder feedback on the just-shipped quest-hub Home): before this, a
// quest's 24h deadline was 100% client-side cosmetic - the server never
// closed an unreflected quest, so a goal whose only open quest passed 24h
// got permanently stuck with a disabled "Waktu habis" CTA forever. This
// covers the fix: a rolling 28h deadline (24h nominal + 4h invisible grace),
// checked lazily on every GET /api/state (server/index.js's expiry loop +
// resolveExpiredQuest), auto-closing the stale quest with a neutral
// resolution and letting the existing needySlots pass regenerate a fresh,
// deliberately easier quest for that goal in the same request.
//
// Run: node tests/quest-expiry.e2e.js
// Requires: local Postgres (same TEST_DATABASE_URL convention as the rest of
// this suite) and the preinstalled Playwright Chromium at
// /opt/pw-browsers/chromium.

const assert = require("assert");
const { spawn } = require("child_process");
const { chromium } = require("playwright-core");
const { Client } = require("pg");

const PORT = 3991;
const BASE = `http://localhost:${PORT}`;
const CHROMIUM = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";

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

  const sql = new Client({ connectionString: env.DATABASE_URL });
  await sql.connect();

  async function freshAccount(goals) {
    const email = `expiry-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    let cookieHeader = "";
    async function call(path, body, method = "POST") {
      const res = await fetch(`${BASE}${path}`, {
        method, headers: { "Content-Type": "application/json", cookie: cookieHeader },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const setCookie = res.headers.getSetCookie?.() || [];
      if (setCookie.length) cookieHeader = setCookie.map((c) => c.split(";")[0]).join("; ");
      return res.json().catch(() => ({}));
    }
    await call("/api/signup", { email, password: "password123", betaCode: "TESTCODE" });
    await call("/api/profile", {
      name: "Expiry Tester",
      radarSnapshot: { body: 5, growth: 5, livelihood: 5, emotional: 5, social: 5, purpose: 5, autonomy: 5 },
      pathway: "Architect",
      goals,
    });
    const { rows } = await sql.query("SELECT id FROM users WHERE email = $1", [email]);
    return { userId: rows[0].id, cookieHeader };
  }

  async function insertQuest(userId, { goalIndex = 0, completionType = "reflective", title, description = "d", createdAtSql = "now()", isMeta = false, lifecycleType, progressive, date = "2026-08-15" }) {
    const quest = {
      mode: "quest", completionType, structuredKind: null, evidenceSchema: null, practiceTestSchema: null,
      title, description, statFocus: "growth", why: `Kenapa: ${title}`, goalIndex: isMeta ? undefined : goalIndex,
      ...(lifecycleType ? { lifecycleType, progressive } : {}),
    };
    const { rows } = await sql.query(
      `INSERT INTO days (user_id, goal_index, date, quest, insight, reflection, is_side_quest, is_meta, created_at)
       VALUES ($1, $2, $3, $4, NULL, NULL, false, $5, ${createdAtSql}) RETURNING id`,
      [userId, isMeta ? null : goalIndex, date, quest, isMeta]
    );
    return rows[0].id;
  }

  async function newPageForCookie(browser, cookieHeader) {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const cookies = cookieHeader.split("; ").map((pair) => {
      const eq = pair.indexOf("=");
      return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: BASE };
    });
    await context.addCookies(cookies);
    const page = await context.newPage();
    return { context, page };
  }

  const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });

  console.log("E2E: full expiry + auto-replace, single goal");
  await test("a 30h-old quest gets closed with a neutral 'expired' reflection and replaced by a fresh quest for the same goal", async () => {
    const { userId, cookieHeader } = await freshAccount(["Goal A"]);
    const oldId = await insertQuest(userId, { goalIndex: 0, title: "Old Stuck Quest", createdAtSql: "now() - interval '30 hours'" });
    const { context, page } = await newPageForCookie(browser, cookieHeader);
    await page.goto(BASE);
    await page.waitForSelector("[data-qhub-idx]", { timeout: 20000 });

    const { rows: oldRows } = await sql.query("SELECT reflection FROM days WHERE id = $1", [oldId]);
    assert.strictEqual(oldRows[0].reflection.status, "expired", "old quest must be closed with a neutral status='expired' reflection");
    assert.deepStrictEqual(oldRows[0].reflection.deltas, {}, "resolution must apply zero stat deltas (neutral, no penalty)");

    const { rows: newRows } = await sql.query("SELECT id, created_at FROM days WHERE user_id = $1 AND goal_index = 0 AND reflection IS NULL", [userId]);
    assert.strictEqual(newRows.length, 1, "exactly one fresh open quest must exist for goalIndex 0");
    assert.notStrictEqual(newRows[0].id, oldId, "the replacement must be a different row, not the same one reopened");

    const title = (await page.locator(".qhub-title").first().textContent()).trim();
    assert.notStrictEqual(title, "Old Stuck Quest", "the card must show the NEW quest's title, not the expired one");
    const timeLabel = (await page.locator(".qhub-time").first().textContent()).trim();
    assert.notStrictEqual(timeLabel, "Waktu habis", "the new quest's countdown must not read Waktu habis - its own createdAt is fresh");
    await context.close();
  });

  console.log("E2E: grace window (24-28h) leaves the quest completely untouched server-side");
  await test("a 26h-old quest (inside the invisible 4h grace) is left open, unresolved, unreplaced", async () => {
    const { userId, cookieHeader } = await freshAccount(["Goal A"]);
    const id = await insertQuest(userId, { goalIndex: 0, title: "Grace Window Quest", createdAtSql: "now() - interval '26 hours'" });
    const { context, page } = await newPageForCookie(browser, cookieHeader);
    await page.goto(BASE);
    await page.waitForSelector("[data-qhub-idx]", { timeout: 20000 });

    const { rows } = await sql.query("SELECT id, reflection FROM days WHERE user_id = $1 AND goal_index = 0", [userId]);
    assert.strictEqual(rows.length, 1, "exactly one row must exist - nothing should have been generated or closed");
    assert.strictEqual(rows[0].id, id, "it must be the SAME row, not replaced");
    assert.strictEqual(rows[0].reflection, null, "it must still be open (reflection null) inside the 24-28h grace window");
    await context.close();
  });

  console.log("E2E: multi-goal isolation - only the truly expired goal's quest is touched");
  await test("with 3 goals, only the one past 28h is closed+replaced; the other two are untouched", async () => {
    const { userId, cookieHeader } = await freshAccount(["Goal A", "Goal B", "Goal C"]);
    const id0 = await insertQuest(userId, { goalIndex: 0, title: "Fresh 0", createdAtSql: "now()" });
    const idExpired = await insertQuest(userId, { goalIndex: 1, title: "Expired 1", createdAtSql: "now() - interval '30 hours'" });
    const id2 = await insertQuest(userId, { goalIndex: 2, title: "Fresh 2", createdAtSql: "now()" });
    const { context, page } = await newPageForCookie(browser, cookieHeader);
    await page.goto(BASE);
    await page.waitForSelector("[data-qhub-idx]", { timeout: 20000 });

    const { rows: r0 } = await sql.query("SELECT id, reflection FROM days WHERE id = $1", [id0]);
    const { rows: r2 } = await sql.query("SELECT id, reflection FROM days WHERE id = $1", [id2]);
    assert.strictEqual(r0[0].reflection, null, "goal 0's quest must be completely untouched");
    assert.strictEqual(r2[0].reflection, null, "goal 2's quest must be completely untouched");
    const { rows: rExp } = await sql.query("SELECT reflection FROM days WHERE id = $1", [idExpired]);
    assert.strictEqual(rExp[0].reflection.status, "expired", "goal 1's quest must be closed");
    const { rows: goal1Open } = await sql.query("SELECT id FROM days WHERE user_id = $1 AND goal_index = 1 AND reflection IS NULL", [userId]);
    assert.strictEqual(goal1Open.length, 1, "goal 1 must have exactly one fresh replacement quest");
    await context.close();
  });

  console.log("E2E: META quests are excluded from auto-expiry");
  await test("a 40h-old META session (goal_index NULL) is never auto-closed", async () => {
    const { userId, cookieHeader } = await freshAccount(["Goal A"]);
    const metaId = await insertQuest(userId, { title: "Meta Session", createdAtSql: "now() - interval '40 hours'", isMeta: true });
    const { context, page } = await newPageForCookie(browser, cookieHeader);
    await page.goto(BASE);
    await page.waitForSelector("[data-qhub-idx]", { timeout: 20000 });
    const { rows } = await sql.query("SELECT reflection FROM days WHERE id = $1", [metaId]);
    assert.strictEqual(rows[0].reflection, null, "META quest must never be auto-expired regardless of age");
    await context.close();
  });

  console.log("E2E: nutrition PROGRESSIVE quests are unaffected (resolved by their own existing lazy loop, not double-processed)");
  await test("a 40h-old nutrition-log/progressive quest resolves via resolveNutritionQuest (nutritionResult present), not the new neutral shape", async () => {
    const { userId, cookieHeader } = await freshAccount(["Goal A"]);
    const nutId = await insertQuest(userId, {
      goalIndex: 0, completionType: "nutrition-log", title: "Nutrition Quest",
      lifecycleType: "progressive",
      progressive: { requiredContributions: 3, completedContributions: 0, primaryMetric: "protein", targetValue: 60, currentValue: 0, evidenceComplete: false, targetMet: false, status: "ACTIVE" },
      createdAtSql: "now() - interval '40 hours'",
      date: "2020-01-01",
    });
    const { context, page } = await newPageForCookie(browser, cookieHeader);
    await page.goto(BASE);
    await page.waitForSelector("[data-qhub-idx]", { timeout: 20000 });
    const { rows } = await sql.query("SELECT reflection FROM days WHERE id = $1", [nutId]);
    assert.ok(rows[0].reflection, "nutrition quest must have been resolved by its own lazy loop");
    assert.ok(rows[0].reflection.nutritionResult, "must carry nutritionResult (proves resolveNutritionQuest ran), not the generic expiry shape");
    assert.notStrictEqual(rows[0].reflection.status, "expired", "must not be double-processed/clobbered by the new generic expiry loop");
    await context.close();
  });

  await browser.close();
  await sql.end();
  server.kill();

  console.log(failures ? `\n${failures} E2E FAILURE(S)` : "\nALL E2E TESTS PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
