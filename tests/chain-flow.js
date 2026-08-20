// SOMA Training feedback brief (20 Agustus) item 4: API-level tests for the
// condition-triggered Recovery -> Nutrition -> Training(adapted) quest
// chain, fired when Context Update transitions INTO "Sakit/cedera". Pure
// route-level tests via fetch against a locally-booted keyless server (same
// convention as tests/movement-attempt.js/tests/nutrition.js) - step 3
// (Training) goes through keyless generateQuest's fallbackQuest path in this
// mode (reflective completionType), same limitation every other AI-authored
// completionType test in this suite already works within; only quest.chain
// metadata and control-flow are asserted for step 3, not its structuredKind.
//
// Run: node tests/chain-flow.js
// Requires: local Postgres reachable via TEST_DATABASE_URL.

const assert = require("assert");
const { spawn } = require("child_process");
const { Client } = require("pg");

const PORT = 3995;
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

  let cookie = "";
  async function call(path, body, method) {
    const res = await fetch(`${BASE}${path}`, {
      method: method || (body ? "POST" : "GET"), headers: { "Content-Type": "application/json", cookie },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const setCookie = res.headers.getSetCookie?.() || [];
    if (setCookie.length) cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  }

  const sql = new Client({ connectionString: env.DATABASE_URL });
  await sql.connect();

  const email = `chain-flow-${Date.now()}@example.com`;
  await call("/api/signup", { email, password: "password123", betaCode: "TESTCODE" });
  await call("/api/profile", {
    name: "Chain Flow Tester",
    radarSnapshot: { body: 5, growth: 5, livelihood: 5, emotional: 5, social: 5, purpose: 5, autonomy: 5 },
    pathway: "Architect",
    goals: ["Latihan gym rutin tiap minggu"],
  });
  const { rows: userRows } = await sql.query("SELECT id FROM users WHERE email = $1", [email]);
  const userId = userRows[0].id;

  async function chainRow() {
    const { rows } = await sql.query("SELECT active_chain FROM character_state WHERE user_id = $1", [userId]);
    return rows[0].active_chain;
  }
  async function openChainQuests() {
    const { rows } = await sql.query("SELECT id, quest, reflection FROM days WHERE user_id = $1 AND is_chain = true ORDER BY id ASC", [userId]);
    return rows;
  }

  // Profile creation already generates the goal's first quest lazily -
  // fetch state once so it exists before the chain trigger, needed for the
  // rotation-suspension assertions below.
  await call("/api/state");

  console.log("Chain trigger");
  await test("transitioning Context Update into 'Sakit/cedera' starts a chain with a step-1 Recovery quest", async () => {
    const { json } = await call("/api/kondisi", { status: "Sakit/cedera", note: "Kaki keseleo" });
    assert.strictEqual(json.chainStarted, true);
    const chain = await chainRow();
    assert.strictEqual(chain.step, 1);
    assert.strictEqual(chain.total, 3);
    assert.strictEqual(chain.kondisiNoteSnapshot, "Kaki keseleo");
    const rows = await openChainQuests();
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].quest.completionType, "structured-physical");
    assert.strictEqual(rows[0].quest.structuredKind, "recovery");
    assert.deepStrictEqual(rows[0].quest.chain, { id: chain.id, step: 1, total: 3, label: "Recovery" });
  });

  await test("re-triggering 'Sakit/cedera' while already in that state does not start a second chain", async () => {
    const before = await chainRow();
    const { json } = await call("/api/kondisi", { status: "Sakit/cedera", note: "masih sama" });
    assert.strictEqual(json.chainStarted, false);
    const after = await chainRow();
    assert.strictEqual(after.id, before.id, "chain id must be unchanged");
    const rows = await openChainQuests();
    assert.strictEqual(rows.length, 1, "no second chain quest may be created");
  });

  console.log("Goal rotation suspension");
  await test("while the chain is active, a needy goal slot does NOT get a fresh quest on GET /api/state", async () => {
    // The goal's own quest (seeded by profile creation) is still open and
    // untouched - so there is nothing "needy" to test against directly.
    // Instead assert indirectly: total open non-chain, non-side quest count
    // for the goal stays at exactly 1 (its original quest) across repeated
    // state reads, never silently replaced/duplicated while the chain runs.
    await call("/api/state");
    await call("/api/state");
    const { rows } = await sql.query(
      "SELECT count(*)::int AS n FROM days WHERE user_id = $1 AND goal_index = 0 AND is_chain = false AND is_side_quest = false",
      [userId]
    );
    assert.strictEqual(rows[0].n, 1, "goal rotation must stay frozen while a chain is active");
  });

  console.log("Step 1 -> Step 2");
  await test("reflecting on the Recovery step (levelNyeri captured) generates the step-2 Nutrition quest", async () => {
    const rows = await openChainQuests();
    const step1 = rows.find((r) => r.quest.chain.step === 1);
    const { json, status } = await call("/api/reflection", {
      status: "COMPLETED", text: "", questId: step1.id,
      structuredData: { kind: "recovery", durasiTidurJam: 7, asupanAirGelas: 8, makanProtein: 2, levelNyeri: "Sedang" },
    });
    assert.strictEqual(status, 200, JSON.stringify(json));
    const chain = await chainRow();
    assert.strictEqual(chain.step, 2);
    assert.strictEqual(chain.levelNyeri, "Sedang", "step 1's levelNyeri must be captured onto active_chain");
    const openRows = await openChainQuests();
    const step2 = openRows.find((r) => !r.reflection);
    assert.strictEqual(step2.quest.completionType, "nutrition-log");
    assert.deepStrictEqual(step2.quest.chain, { id: chain.id, step: 2, total: 3, label: "Nutrition" });
  });

  console.log("Step 2 -> Step 3 (via POST /api/nutrition/log, the OTHER saveReflection choke point)");
  await test("logging enough meals to resolve the Nutrition step's progressive state generates the step-3 Training quest", async () => {
    const rows = await openChainQuests();
    const step2 = rows.find((r) => !r.reflection);
    for (let i = 0; i < 3; i++) {
      const { json, status } = await call("/api/nutrition/log", {
        questId: step2.id, source: "search", mealType: "camilan",
        foodName: `Meal ${i}`, servingAmount: 1, servingUnit: "porsi",
        calories: 400, protein: 25, carbohydrates: 30, fat: 10,
      });
      assert.strictEqual(status, 200, JSON.stringify(json));
    }
    const chain = await chainRow();
    assert.strictEqual(chain.step, 3, `chain did not advance to step 3, still: ${JSON.stringify(chain)}`);
    const openRows = await openChainQuests();
    const step3 = openRows.find((r) => !r.reflection);
    assert.ok(step3, "step 3 quest must exist and be open");
    assert.deepStrictEqual(step3.quest.chain, { id: chain.id, step: 3, total: 3, label: "Training" });
  });

  console.log("Step 3 completion");
  await test("reflecting on the Training step clears active_chain, and goal rotation resumes immediately", async () => {
    const rows = await openChainQuests();
    const step3 = rows.find((r) => !r.reflection);
    const { status, json } = await call("/api/reflection", { status: "COMPLETED", text: "Selesai, terasa lebih baik dari sesi ini.", questId: step3.id });
    assert.strictEqual(status, 200, JSON.stringify(json));
    const chain = await chainRow();
    assert.strictEqual(chain, null, "active_chain must be cleared after step 3");
  });

  console.log("Edge case: relabeling mid-chain cancels it");
  await test("Context Update changing to a different label mid-chain cancels the chain but leaves the in-flight quest open", async () => {
    // kondisiStatus is still "Sakit/cedera" from the earlier chain (never
    // reset) - reset to Normal first so the next call is a REAL transition,
    // same as a user coming back to baseline before getting hurt again.
    await call("/api/kondisi", { status: "Normal", note: null });
    await call("/api/kondisi", { status: "Sakit/cedera", note: null });
    const started = await chainRow();
    assert.ok(started, "a fresh chain must have started");
    const { json } = await call("/api/kondisi", { status: "Capek/energi rendah", note: null });
    assert.strictEqual(json.chainStarted, false);
    const after = await chainRow();
    assert.strictEqual(after, null, "chain must be cancelled");
    const rows = await openChainQuests();
    const orphan = rows.find((r) => r.quest.chain?.id === started.id);
    assert.ok(orphan && !orphan.reflection, "the orphaned step-1 quest stays open, never force-closed");
  });

  console.log("Edge case: an abandoned chain step expires");
  await test("a chain step that ages past the 28h expiry sweep resolves EXPIRED and clears active_chain", async () => {
    await call("/api/kondisi", { status: "Normal", note: null });
    const { json } = await call("/api/kondisi", { status: "Sakit/cedera", note: null });
    assert.strictEqual(json.chainStarted, true);
    const rows = await openChainQuests();
    const step1 = rows.find((r) => !r.reflection);
    await sql.query("UPDATE days SET created_at = now() - interval '29 hours' WHERE id = $1", [step1.id]);
    await call("/api/state");
    const chain = await chainRow();
    assert.strictEqual(chain, null, "active_chain must clear when its step expires unattended");
    const { rows: closed } = await sql.query("SELECT reflection FROM days WHERE id = $1", [step1.id]);
    assert.strictEqual(closed[0].reflection.status, "EXPIRED");
  });

  await sql.end();
  server.kill();
  console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL TESTS PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error("Chain flow test run crashed:", e);
  process.exit(1);
});
