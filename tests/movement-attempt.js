// API-level tests for the BODY · MOVEMENT execution flow's in-progress-
// attempt persistence layer (design handoff, stage 3): POST /api/quest/:id/
// attempt/{start,save,abandon}. Pure route-level tests via fetch against a
// locally-booted keyless server (same convention as tests/nutrition.js's
// Part 2) - Movement quests are seeded directly via SQL since keyless
// generateQuest always falls back to "reflective" (same limitation every
// other AI-authored completionType has in this suite).
//
// Run: node tests/movement-attempt.js
// Requires: local Postgres reachable via TEST_DATABASE_URL.

const assert = require("assert");
const { spawn } = require("child_process");
const { Client } = require("pg");

const PORT = 3994;
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

  const email = `movement-attempt-${Date.now()}@example.com`;
  await call("/api/signup", { email, password: "password123", betaCode: "TESTCODE" });
  await call("/api/profile", {
    name: "Movement Attempt Tester",
    radarSnapshot: { body: 5, growth: 5, livelihood: 5, emotional: 5, social: 5, purpose: 5, autonomy: 5 },
    pathway: "Architect",
    goals: ["Latihan gym rutin tiap minggu"],
  });
  const { rows: userRows } = await sql.query("SELECT id FROM users WHERE email = $1", [email]);
  const userId = userRows[0].id;
  const todayKey = new Date().toLocaleDateString("en-CA");

  async function seedQuest(quest) {
    const { rows } = await sql.query(
      `INSERT INTO days (user_id, goal_index, date, quest, insight, reflection, is_side_quest, is_meta)
       VALUES ($1, 0, $3, $2, NULL, NULL, false, false) RETURNING id`,
      [userId, quest, todayKey]
    );
    return rows[0].id;
  }

  const strengthQuest = {
    mode: "quest", completionType: "structured-physical", structuredKind: "gym",
    domain: "BODY", primaryFeature: "MOVEMENT", supportingFeatures: [],
    executionMode: "STRENGTH", evidenceMode: "SET_REP_LOAD",
    evidenceSchema: { activityType: null, hasWeight: true, metricType: "reps", target: 10 },
    plannedExercises: [
      { name: "Squat", targetSets: 3, targetReps: 10, targetLoadKg: null },
      { name: "Calf Raise", targetSets: 3, targetReps: 12, targetLoadKg: null },
    ],
    title: "Lower Body Strength", description: "test", statFocus: "body", why: "test",
  };
  const cardioQuest = {
    mode: "quest", completionType: "structured-physical", structuredKind: "cardio",
    domain: "BODY", primaryFeature: "MOVEMENT", supportingFeatures: [],
    executionMode: "CARDIO", evidenceMode: "MANUAL_ACTIVITY",
    evidenceSchema: { activityType: "Lari", hasWeight: null, metricType: "distance", target: 3.2 },
    plannedExercises: null,
    title: "Lari 3.2 km", description: "test", statFocus: "body", why: "test",
  };
  const recoveryQuest = {
    mode: "quest", completionType: "structured-physical", structuredKind: "recovery",
    domain: null, primaryFeature: null, evidenceSchema: { metricType: "recovery", target: null },
    title: "Pemulihan", description: "test", statFocus: "body", why: "test",
  };

  let strengthId, cardioId, recoveryId;

  console.log("API: attempt/start");
  await test("STRENGTH quest: start seeds per-exercise sets from plannedExercises, currentScreen=active", async () => {
    strengthId = await seedQuest(strengthQuest);
    const { status, json } = await call(`/api/quest/${strengthId}/attempt/start`, {});
    assert.strictEqual(status, 200, JSON.stringify(json));
    const a = json.activeAttempt;
    assert.strictEqual(a.executionMode, "STRENGTH");
    assert.strictEqual(a.currentScreen, "active");
    assert.strictEqual(a.strengthExercises.length, 2);
    assert.strictEqual(a.strengthExercises[0].sets.length, 3);
    assert.deepStrictEqual(a.strengthExercises[0].sets[0], { reps: "", weightKg: "", done: false });
    assert.strictEqual(a.strengthExercises[0].rpe, null);
    assert.ok(a.attemptId && a.startedAt);
  });

  await test("CARDIO quest: start goes straight to currentScreen=review, no strengthExercises", async () => {
    cardioId = await seedQuest(cardioQuest);
    const { json } = await call(`/api/quest/${cardioId}/attempt/start`, {});
    assert.strictEqual(json.activeAttempt.executionMode, "CARDIO");
    assert.strictEqual(json.activeAttempt.currentScreen, "review");
    assert.strictEqual(json.activeAttempt.strengthExercises, null);
  });

  await test("double-tap Start / refresh-triggered re-POST is idempotent - returns the SAME attempt, not a new one", async () => {
    const { json: first } = await call(`/api/quest/${strengthId}/attempt/start`, {});
    assert.strictEqual(first.activeAttempt.attemptId, (await call(`/api/quest/${strengthId}/attempt/start`, {})).json.activeAttempt.attemptId);
  });

  await test("a non-Movement quest (recovery) rejects attempt/start entirely", async () => {
    recoveryId = await seedQuest(recoveryQuest);
    const { status, json } = await call(`/api/quest/${recoveryId}/attempt/start`, {});
    assert.strictEqual(status, 400, JSON.stringify(json));
  });

  console.log("API: attempt/save");
  await test("save merges a patch into the existing activeAttempt", async () => {
    const { json } = await call(`/api/quest/${strengthId}/attempt/save`, {
      patch: { strengthExercises: [{ name: "Squat", targetSets: 3, targetReps: 10, targetLoadKg: null, sets: [{ reps: 10, weightKg: 30, done: true }], rpe: 7 }] },
    });
    assert.strictEqual(json.activeAttempt.strengthExercises[0].sets[0].done, true);
    assert.strictEqual(json.activeAttempt.strengthExercises[0].rpe, 7);
  });

  await test("save cannot overwrite attemptId/startedAt/executionMode (identity fields stripped)", async () => {
    const { json: before } = await call(`/api/quest/${strengthId}/attempt/save`, { patch: { currentScreen: "review" } });
    const originalAttemptId = before.activeAttempt.attemptId;
    const { json: after } = await call(`/api/quest/${strengthId}/attempt/save`, {
      patch: { attemptId: "hijacked", startedAt: "hijacked", executionMode: "CARDIO", currentScreen: "review" },
    });
    assert.strictEqual(after.activeAttempt.attemptId, originalAttemptId, "attemptId must not be overwritable via save");
    assert.strictEqual(after.activeAttempt.executionMode, "STRENGTH", "executionMode must not be overwritable via save");
  });

  await test("save on a quest with no active attempt is rejected", async () => {
    const freshId = await seedQuest(cardioQuest);
    const { status, json } = await call(`/api/quest/${freshId}/attempt/save`, { patch: { currentScreen: "review" } });
    assert.strictEqual(status, 400, JSON.stringify(json));
  });

  console.log("API: refresh-survival via GET /api/state");
  await test("activeAttempt round-trips through GET /api/state (refresh/reopen resumes correctly)", async () => {
    const { json } = await call("/api/state", null, "GET");
    const q = json.openQuests.find((d) => d.id === strengthId);
    assert.ok(q.quest.activeAttempt, "activeAttempt must survive a fresh GET /api/state read");
    assert.strictEqual(q.quest.activeAttempt.currentScreen, "review");
  });

  console.log("API: attempt/abandon");
  await test("abandon clears activeAttempt, writes no reflection, quest stays open/retryable", async () => {
    const { status } = await call(`/api/quest/${strengthId}/attempt/abandon`, {});
    assert.strictEqual(status, 200);
    const { rows } = await sql.query("SELECT quest, reflection FROM days WHERE id = $1", [strengthId]);
    assert.strictEqual(rows[0].quest.activeAttempt, null, "activeAttempt must be cleared");
    assert.strictEqual(rows[0].reflection, null, "abandon must never write a reflection");
  });

  await test("after abandon, Start can begin a brand-new attempt on the same quest", async () => {
    const { json } = await call(`/api/quest/${strengthId}/attempt/start`, {});
    assert.ok(json.activeAttempt.attemptId, "a fresh attempt must be creatable after abandon");
  });

  await sql.end();
  server.kill();
  console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL TESTS PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error("Test run crashed:", e);
  process.exit(1);
});
