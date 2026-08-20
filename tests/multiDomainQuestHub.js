// Regression script for the Multi-Domain Quest Hub (design handoff, 19
// Agustus): a single quest requiring BOTH a Recovery AND a Nutrition
// sub-flow, completed in either order, before it resolves. Deliberately
// named multiDomainQuestHub.js/.e2e.js (NOT quest-hub.*, which is already
// taken by the pre-existing, unrelated Home compact multi-quest carousel
// feature at tests/quest-hub.e2e.js) so the two are never confused, same
// reasoning as the .mdq- vs .qh-/--qh-* CSS prefix split in styles.css.
//
// Part 1: unit tests against server/questHub.js directly (no DB, no
// server) - completion/progress derivation, patch validation, the
// canonical template's own internal id consistency.
// Part 2: API-level tests via fetch against a locally-booted server
// (keyless - generateQuest's keyless fallback can never produce
// completionType "multi-domain", same limitation every other AI-authored
// completionType in this codebase works around, see tests/nutrition.js's
// own comment) - the quest is seeded directly into `days` via SQL, then
// driven through the 3 real routes.
//
// Run: node tests/multiDomainQuestHub.js
// Requires: local Postgres reachable via TEST_DATABASE_URL (same
// convention as tests/practicetest.js).

const assert = require("assert");
const questHub = require("../server/questHub");

let failures = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ok - ${name}`);
  } catch (e) {
    failures += 1;
    console.error(`  FAIL - ${name}: ${e.message}`);
  }
}

console.log("Unit: computeFeatureState");
test("no fields recorded -> NOT_STARTED", () => {
  assert.strictEqual(questHub.computeFeatureState(questHub.RECOVERY_REQUIREMENTS, {}), "NOT_STARTED");
  assert.strictEqual(questHub.computeFeatureState(questHub.RECOVERY_REQUIREMENTS, null), "NOT_STARTED");
});
test("some but not all required fields recorded -> IN_PROGRESS", () => {
  assert.strictEqual(questHub.computeFeatureState(questHub.RECOVERY_REQUIREMENTS, { sleep: "Cukup", energy: "Normal" }), "IN_PROGRESS");
});
test("every required field recorded -> COMPLETE", () => {
  const data = { sleep: "Cukup", energy: "Normal", soreness: "Ringan", recovery_session: "Stretching" };
  assert.strictEqual(questHub.computeFeatureState(questHub.RECOVERY_REQUIREMENTS, data), "COMPLETE");
});
test("a falsy-but-not-nullish value (0) still counts as recorded", () => {
  const data = { protein: 0, hydration: 0, meals: 0 };
  assert.strictEqual(questHub.computeFeatureState(questHub.NUTRITION_REQUIREMENTS, data), "COMPLETE");
});
test("only required:true entries count toward completion", () => {
  const reqs = [{ id: "a", required: true }, { id: "b", required: false }];
  assert.strictEqual(questHub.computeFeatureState(reqs, { a: "x" }), "COMPLETE");
});

console.log("Unit: countRecorded");
test("fraction reflects recorded vs total required, independent of extra keys", () => {
  const { recorded, total } = questHub.countRecorded(questHub.NUTRITION_REQUIREMENTS, { protein: 40, extraneous: "ignored" });
  assert.strictEqual(recorded, 1);
  assert.strictEqual(total, 3);
});
test("empty requirements list never divides by zero, returns {0,0}", () => {
  const { recorded, total } = questHub.countRecorded([], {});
  assert.strictEqual(recorded, 0);
  assert.strictEqual(total, 0);
});

console.log("Unit: computeQuestStatus");
test("both NOT_STARTED -> NOT_STARTED", () => {
  const s = questHub.computeQuestStatus({ RECOVERY: "NOT_STARTED", NUTRITION: "NOT_STARTED" }, "RECOVERY", ["NUTRITION"]);
  assert.strictEqual(s, "NOT_STARTED");
});
test("Recovery-first: Recovery COMPLETE, Nutrition untouched -> IN_PROGRESS", () => {
  const s = questHub.computeQuestStatus({ RECOVERY: "COMPLETE", NUTRITION: "NOT_STARTED" }, "RECOVERY", ["NUTRITION"]);
  assert.strictEqual(s, "IN_PROGRESS");
});
test("Nutrition-first: Nutrition IN_PROGRESS, Recovery untouched -> IN_PROGRESS", () => {
  const s = questHub.computeQuestStatus({ RECOVERY: "NOT_STARTED", NUTRITION: "IN_PROGRESS" }, "RECOVERY", ["NUTRITION"]);
  assert.strictEqual(s, "IN_PROGRESS");
});
test("both COMPLETE, either order -> READY_TO_COMPLETE", () => {
  const a = questHub.computeQuestStatus({ RECOVERY: "COMPLETE", NUTRITION: "COMPLETE" }, "RECOVERY", ["NUTRITION"]);
  assert.strictEqual(a, "READY_TO_COMPLETE");
});

console.log("Unit: validateRecoveryPatch");
test("valid partial patch (one field) is accepted", () => {
  const r = questHub.validateRecoveryPatch({ sleep: "Baik" });
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.clean, { sleep: "Baik" });
});
test("all 4 fields valid at once is accepted", () => {
  const r = questHub.validateRecoveryPatch({ sleep: "Baik", energy: "Tinggi", soreness: "Tidak ada", recovery_session: "Meditasi" });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(Object.keys(r.clean).length, 4);
});
test("invalid enum value is rejected with a specific message, not silently dropped", () => {
  const r = questHub.validateRecoveryPatch({ sleep: "Lumayan" });
  assert.strictEqual(r.ok, false);
  assert.ok(/tidur/i.test(r.error));
});
test("invalid recovery_session choice is rejected", () => {
  const r = questHub.validateRecoveryPatch({ recovery_session: "Lari maraton" });
  assert.strictEqual(r.ok, false);
});
test("empty payload is rejected, not accepted as a no-op", () => {
  const r = questHub.validateRecoveryPatch({});
  assert.strictEqual(r.ok, false);
});
test("unknown keys are silently dropped, not errored", () => {
  const r = questHub.validateRecoveryPatch({ sleep: "Baik", madeUpField: "x" });
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.clean, { sleep: "Baik" });
});

console.log("Unit: validateNutritionPatch");
test("valid partial numeric patch accepted, including protein=0", () => {
  const r = questHub.validateNutritionPatch({ protein: 0 });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.clean.protein, 0);
});
test("protein out of 0-300 range rejected", () => {
  assert.strictEqual(questHub.validateNutritionPatch({ protein: 301 }).ok, false);
  assert.strictEqual(questHub.validateNutritionPatch({ protein: -1 }).ok, false);
});
test("hydration out of 0-10 range rejected", () => {
  assert.strictEqual(questHub.validateNutritionPatch({ hydration: 10.5 }).ok, false);
});
test("meals must be a non-negative integer 0-10", () => {
  assert.strictEqual(questHub.validateNutritionPatch({ meals: 2.5 }).ok, false);
  assert.strictEqual(questHub.validateNutritionPatch({ meals: -1 }).ok, false);
  assert.strictEqual(questHub.validateNutritionPatch({ meals: 11 }).ok, false);
  assert.strictEqual(questHub.validateNutritionPatch({ meals: 3 }).ok, true);
});
test("non-numeric string is rejected", () => {
  assert.strictEqual(questHub.validateNutritionPatch({ protein: "banyak" }).ok, false);
});
test("empty payload is rejected", () => {
  assert.strictEqual(questHub.validateNutritionPatch({}).ok, false);
});

console.log("Unit: RECOVERY_NUTRITION_TEMPLATE internal consistency");
test("every RECOVERY requirement id has a matching validator branch (vocabulary sync guard)", () => {
  const ids = questHub.RECOVERY_REQUIREMENTS.map((r) => r.id);
  assert.deepStrictEqual(ids.sort(), ["energy", "recovery_session", "sleep", "soreness"]);
  const filled = {};
  ids.forEach((id) => { filled[id] = questHub[`${id.toUpperCase()}_OPTIONS`]?.[0] || questHub.RECOVERY_SESSION_OPTIONS[0]; });
  // sleep/energy/soreness/recovery_session each have their own *_OPTIONS export - confirm the validator accepts a full set built purely from those exports (not hardcoded strings here).
  const patch = { sleep: questHub.SLEEP_OPTIONS[0], energy: questHub.ENERGY_OPTIONS[0], soreness: questHub.SORENESS_OPTIONS[0], recovery_session: questHub.RECOVERY_SESSION_OPTIONS[0] };
  const r = questHub.validateRecoveryPatch(patch);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(questHub.computeFeatureState(questHub.RECOVERY_REQUIREMENTS, r.clean), "COMPLETE");
});
test("every NUTRITION requirement id has a matching fixed target", () => {
  questHub.NUTRITION_REQUIREMENTS.forEach((r) => assert.ok(typeof questHub.NUTRITION_TARGETS[r.id] === "number", `missing target for ${r.id}`));
});
test("template's featureRequirements match the exported requirement lists by reference shape", () => {
  assert.deepStrictEqual(questHub.RECOVERY_NUTRITION_TEMPLATE.featureRequirements.RECOVERY, questHub.RECOVERY_REQUIREMENTS);
  assert.deepStrictEqual(questHub.RECOVERY_NUTRITION_TEMPLATE.featureRequirements.NUTRITION, questHub.NUTRITION_REQUIREMENTS);
  assert.strictEqual(questHub.RECOVERY_NUTRITION_TEMPLATE.primaryFeature, "RECOVERY");
  assert.deepStrictEqual(questHub.RECOVERY_NUTRITION_TEMPLATE.supportingFeatures, ["NUTRITION"]);
});

// ---------------------------------------------------------------------------

async function apiTests() {
  const { spawn } = require("child_process");
  const PORT = 3989;
  const BASE = `http://localhost:${PORT}`;
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

  async function atest(name, fn) {
    try {
      await fn();
      console.log(`  ok - ${name}`);
    } catch (e) {
      failures += 1;
      console.error(`  FAIL - ${name}: ${e.message}`);
    }
  }

  const { Client } = require("pg");
  const sql = new Client({ connectionString: env.DATABASE_URL });
  await sql.connect();

  console.log("API: setup account");
  const email = `mdqhub-${Date.now()}@example.com`;
  await call("/api/signup", { email, password: "password123", betaCode: "TESTCODE" });
  await call("/api/profile", {
    name: "Quest Hub Tester",
    radarSnapshot: { body: 5, growth: 5, livelihood: 5, emotional: 5, social: 5, purpose: 5, autonomy: 5 },
    pathway: "Architect",
    goals: ["Pulih dan makan lebih baik"],
  });
  const { rows: userRows } = await sql.query("SELECT id FROM users WHERE email = $1", [email]);
  const userId = userRows[0].id;

  const statsBefore = (await call("/api/state")).json.stats;

  async function seedQuest() {
    const quest = questHub.RECOVERY_NUTRITION_TEMPLATE;
    const full = {
      mode: "quest", completionType: "multi-domain", structuredKind: null,
      title: quest.title, description: quest.description, why: quest.why, statFocus: quest.statFocus,
      domain: quest.domain, primaryFeature: quest.primaryFeature, supportingFeatures: quest.supportingFeatures,
      featureRequirements: quest.featureRequirements, tujuanSingkat: quest.tujuanSingkat,
      featureData: { RECOVERY: {}, NUTRITION: {} },
      featureState: { RECOVERY: "NOT_STARTED", NUTRITION: "NOT_STARTED" },
      status: "NOT_STARTED", goalIndex: 0,
    };
    const todayKey = new Date().toLocaleDateString("en-CA");
    const { rows } = await sql.query(
      `INSERT INTO days (user_id, goal_index, date, quest, insight, reflection, is_side_quest, is_meta)
       VALUES ($1, 0, $3, $2, NULL, NULL, false, false) RETURNING id`,
      [userId, full, todayKey]
    );
    return rows[0].id;
  }

  console.log("API: route guards");
  let plainQuestId;
  await atest("saving to a non-multi-domain quest is rejected", async () => {
    const todayKey = new Date().toLocaleDateString("en-CA");
    const plain = { mode: "quest", completionType: "reflective", title: "t", description: "d", why: "w", statFocus: "body" };
    const { rows } = await sql.query(
      `INSERT INTO days (user_id, goal_index, date, quest, insight, reflection, is_side_quest, is_meta) VALUES ($1, 0, $3, $2, NULL, NULL, false, false) RETURNING id`,
      [userId, plain, todayKey]
    );
    plainQuestId = rows[0].id;
    const { status, json } = await call("/api/quest-hub/recovery", { questId: plainQuestId, sleep: "Baik" });
    assert.strictEqual(status, 400);
    assert.ok(/bukan Multi-Domain/.test(json.error));
  });
  await atest("saving to a nonexistent quest id is rejected", async () => {
    const { status, json } = await call("/api/quest-hub/recovery", { questId: 999999999, sleep: "Baik" });
    assert.strictEqual(status, 400);
    assert.ok(/tidak ditemukan/.test(json.error));
  });
  await atest("invalid enum value on the real route is rejected before any write", async () => {
    const qid = await seedQuest();
    const { status, json } = await call("/api/quest-hub/recovery", { questId: qid, sleep: "banyak sekali" });
    assert.strictEqual(status, 400);
    assert.ok(json.error);
    const day = (await sql.query("SELECT quest FROM days WHERE id=$1", [qid])).rows[0];
    assert.deepStrictEqual(day.quest.featureData.RECOVERY, {}, "rejected patch must not partially persist");
  });
  await atest("completing before both features are done is rejected", async () => {
    const qid = await seedQuest();
    const { status, json } = await call("/api/quest-hub/complete", { questId: qid });
    assert.strictEqual(status, 400);
    assert.ok(/Lengkapi Recovery dan Nutrition/.test(json.error));
  });

  console.log("API: Recovery-first completion order");
  let questA;
  await atest("partial Recovery save moves feature + quest status to IN_PROGRESS, never READY", async () => {
    questA = await seedQuest();
    const { status, json } = await call("/api/quest-hub/recovery", { questId: questA, sleep: "Cukup", energy: "Normal" });
    assert.strictEqual(status, 200, JSON.stringify(json));
    assert.strictEqual(json.featureState.RECOVERY, "IN_PROGRESS");
    assert.strictEqual(json.featureState.NUTRITION, "NOT_STARTED");
    assert.strictEqual(json.status, "IN_PROGRESS");
  });
  await atest("a second Recovery save merges with the first rather than replacing it", async () => {
    const { status, json } = await call("/api/quest-hub/recovery", { questId: questA, soreness: "Ringan" });
    assert.strictEqual(status, 200);
    assert.strictEqual(json.featureData.RECOVERY.sleep, "Cukup", "earlier save must survive a later partial save");
    assert.strictEqual(json.featureData.RECOVERY.soreness, "Ringan");
  });
  await atest("finishing Recovery's last field flips it to COMPLETE", async () => {
    const { json } = await call("/api/quest-hub/recovery", { questId: questA, recovery_session: "Jalan pemulihan" });
    assert.strictEqual(json.featureState.RECOVERY, "COMPLETE");
    assert.strictEqual(json.status, "IN_PROGRESS", "quest not ready until Nutrition is also done");
  });
  await atest("re-editing an already-COMPLETE feature stays COMPLETE and stores the new value", async () => {
    const { json } = await call("/api/quest-hub/recovery", { questId: questA, sleep: "Baik" });
    assert.strictEqual(json.featureState.RECOVERY, "COMPLETE");
    assert.strictEqual(json.featureData.RECOVERY.sleep, "Baik", "edit must overwrite, not be ignored");
  });
  await atest("completing Nutrition brings the quest to READY_TO_COMPLETE", async () => {
    const { json } = await call("/api/quest-hub/nutrition", { questId: questA, protein: 80, hydration: 2.5, meals: 3 });
    assert.strictEqual(json.featureState.NUTRITION, "COMPLETE");
    assert.strictEqual(json.status, "READY_TO_COMPLETE");
  });
  await atest("Selesaikan Quest succeeds, credits ONLY the body stat, and marks the quest COMPLETED", async () => {
    const { status, json } = await call("/api/quest-hub/complete", { questId: questA });
    assert.strictEqual(status, 200, JSON.stringify(json));
    assert.strictEqual(json.questTitle, questHub.RECOVERY_NUTRITION_TEMPLATE.title);
    const statsAfter = (await call("/api/state")).json.stats;
    Object.keys(statsBefore).forEach((k) => {
      if (k === "body") { assert.ok(statsAfter.body >= statsBefore.body, "body stat should not decrease on completion"); return; }
      assert.strictEqual(statsAfter[k], statsBefore[k], `stat "${k}" must not change - Nutrition's growth must not double-count outside primaryFeature`);
    });
    const day = (await sql.query("SELECT quest, reflection FROM days WHERE id=$1", [questA])).rows[0];
    assert.strictEqual(day.quest.status, "COMPLETED");
    assert.ok(day.reflection, "reflection must be recorded on completion");
    assert.strictEqual(day.reflection.status, "COMPLETED");
  });
  await atest("an already-completed quest rejects further feature saves", async () => {
    const { status, json } = await call("/api/quest-hub/recovery", { questId: questA, sleep: "Baik" });
    assert.strictEqual(status, 400);
    assert.ok(/sudah selesai/.test(json.error));
  });
  await atest("an already-completed quest rejects a duplicate complete call", async () => {
    const { status, json } = await call("/api/quest-hub/complete", { questId: questA });
    assert.strictEqual(status, 400);
    assert.ok(/sudah selesai/.test(json.error));
  });

  console.log("API: Nutrition-first completion order (order independence)");
  let questB;
  await atest("Nutrition can be completed before Recovery is even touched", async () => {
    questB = await seedQuest();
    const { json } = await call("/api/quest-hub/nutrition", { questId: questB, protein: 80, hydration: 2.5, meals: 3 });
    assert.strictEqual(json.featureState.NUTRITION, "COMPLETE");
    assert.strictEqual(json.featureState.RECOVERY, "NOT_STARTED");
    assert.strictEqual(json.status, "IN_PROGRESS");
  });
  await atest("finishing Recovery afterward reaches READY_TO_COMPLETE the same as the other order", async () => {
    const { json } = await call("/api/quest-hub/recovery", {
      questId: questB, sleep: "Baik", energy: "Tinggi", soreness: "Tidak ada", recovery_session: "Mobility",
    });
    assert.strictEqual(json.status, "READY_TO_COMPLETE");
  });
  await atest("completes cleanly from the Nutrition-first order too", async () => {
    const { status } = await call("/api/quest-hub/complete", { questId: questB });
    assert.strictEqual(status, 200);
  });

  await browserlessCleanup();
  async function browserlessCleanup() {
    await sql.end();
    server.kill();
  }
}

apiTests()
  .then(() => {
    console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL TESTS PASSED");
    process.exit(failures ? 1 : 0);
  })
  .catch((e) => {
    console.error("Test run crashed:", e);
    process.exit(1);
  });
