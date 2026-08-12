// Regression script for the practice-test stack (Task 9 + Item 1
// practiceTestSchema + Task 13 Objective Assessment Engine).
//
// Part 1: unit tests against server/practiceTest.js directly (estimateBand
// anchor points, category breakdown, schema migration, ladder, cleanPayload
// with matching/minimums).
// Part 2: API-level tests via fetch against a locally-booted server
// (keyless mode - exercises the expanded 20-question fallback, band/
// confidence in the submit response, practiceTestSchema auto-skip contract,
// drill alternation, META remains full-picker).
//
// Run: node tests/practicetest.js
// Requires: local Postgres reachable via TEST_DATABASE_URL (or the default
// below); the script creates/drops its own scratch database objects via the
// app's own db.init().
//
// NOTE (12 Agustus): the session prompt said to extend "the existing
// practicetest.js regression script" - no such file existed in the repo
// (earlier sessions verified via ephemeral scripts that were never
// committed), so this file IS the canonical regression script from now on.
// Sprint size expectations are 20 (Task 13) - the old 3-question size is
// gone deliberately, not a regression.

const assert = require("assert");
const pt = require("../server/practiceTest");

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

console.log("Unit: estimateBand");
test("anchor 15/40 ≈ band 5", () => {
  const b = pt.estimateBand(15, 40);
  assert.strictEqual(b.mid, 5);
  assert.strictEqual(b.rangeLow, 4.5);
  assert.strictEqual(b.rangeHigh, 5.5);
});
test("anchor 23/40 ≈ band 6", () => assert.strictEqual(pt.estimateBand(23, 40).mid, 6));
test("anchor 30/40 ≈ band 7", () => assert.strictEqual(pt.estimateBand(30, 40).mid, 7));
test("anchor 35/40 ≈ band 8", () => assert.strictEqual(pt.estimateBand(35, 40).mid, 8));
test("interpolation between anchors (26.5/40 ≈ 6.5)", () => {
  assert.strictEqual(pt.estimateBand(26.5, 40).mid, 6.5);
});
test("half-length sprint projects to 40 scale (15/20 → raw 30 → band 7)", () => {
  const b = pt.estimateBand(15, 20);
  assert.strictEqual(b.projectedRaw, 30);
  assert.strictEqual(b.mid, 7);
});
test("perfect score clamps within band 9", () => {
  const b = pt.estimateBand(40, 40);
  assert.ok(b.mid <= 9 && b.rangeHigh <= 9);
});
test("zero score clamps at band 1", () => {
  const b = pt.estimateBand(0, 40);
  assert.ok(b.mid >= 1 && b.rangeLow >= 1);
});
test("no questions → null", () => assert.strictEqual(pt.estimateBand(0, 0), null));

console.log("Unit: confidence thresholds");
test("<20 Low", () => assert.strictEqual(pt.confidenceLabel(19), "Low"));
test("20-99 Moderate", () => assert.strictEqual(pt.confidenceLabel(20), "Moderate"));
test("≥100 High", () => assert.strictEqual(pt.confidenceLabel(100), "High"));

console.log("Unit: parseTargetBand");
test("parses band from goal text", () => assert.strictEqual(pt.parseTargetBand("IELTS Academic band 6.5"), 6.5));
test("comma decimal accepted", () => assert.strictEqual(pt.parseTargetBand("target band 7,5"), 7.5));
test("default 6.5 when no band named", () => assert.strictEqual(pt.parseTargetBand("lulus tes bahasa"), 6.5));

console.log("Unit: schema migration (flat → tracks)");
test("old flat state backfills per testKind, totals separate from history", () => {
  const old = {
    level: 4,
    history: [
      { ts: "t1", testKind: "reading", track: "academic", score: 2, total: 3 },
      { ts: "t2", testKind: "listening", track: "academic", score: 3, total: 4 },
      { ts: "t3", testKind: "reading", track: "general", score: 1, total: 3 },
    ],
  };
  const m = pt.migrateState(old);
  assert.strictEqual(m.tracks.reading.history.length, 2);
  assert.strictEqual(m.tracks.listening.history.length, 1);
  assert.strictEqual(m.tracks.reading.totalQuestions, 6);
  assert.strictEqual(m.tracks.reading.totalCorrect, 3);
  assert.strictEqual(m.tracks.listening.totalQuestions, 4);
  assert.strictEqual(m.tracks.reading.level, 4);
  assert.strictEqual(m.tracks.listening.level, 4);
  // writing/speaking slots exist, empty, ready for the future rubric types
  assert.deepStrictEqual(m.tracks.writing.history, []);
  assert.deepStrictEqual(m.tracks.speaking.history, []);
});
test("already-migrated state passes through", () => {
  const cur = { tracks: { reading: { level: 2, history: [], totalQuestions: 20, totalCorrect: 10 } } };
  const m = pt.migrateState(cur);
  assert.strictEqual(m.tracks.reading.totalQuestions, 20);
  assert.strictEqual(m.tracks.listening.totalQuestions, 0);
});
test("null/empty state → all-empty tracks", () => {
  const m = pt.migrateState(null);
  assert.strictEqual(m.tracks.reading.history.length, 0);
  assert.strictEqual(m.tracks.reading.level, 1);
});

console.log("Unit: status ladder");
const attempt = (score, total) => ({ score, total });
test("no attempts → null (untested)", () => {
  assert.strictEqual(pt.trackStatus({ history: [] }, 6.5), null);
});
test("STABLE: ≥3 of last 4 at/above target", () => {
  // 15/20 → band 7 ≥ 6.5; 8/20 → below
  const ts = { history: [attempt(15, 20), attempt(15, 20), attempt(8, 20), attempt(15, 20)] };
  assert.strictEqual(pt.trackStatus(ts, 6.5), "STABLE");
});
test("EMERGING: some but <3 hits in window", () => {
  const ts = { history: [attempt(15, 20), attempt(8, 20), attempt(8, 20), attempt(8, 20)] };
  assert.strictEqual(pt.trackStatus(ts, 6.5), "EMERGING");
});
test("EXPOSED: attempts but none at target", () => {
  const ts = { history: [attempt(8, 20), attempt(8, 20)] };
  assert.strictEqual(pt.trackStatus(ts, 6.5), "EXPOSED");
});
test("MASTERED: two consecutive stable windows", () => {
  const ts = { history: [attempt(15, 20), attempt(15, 20), attempt(15, 20), attempt(15, 20), attempt(15, 20)] };
  assert.strictEqual(pt.trackStatus(ts, 6.5), "MASTERED");
});

console.log("Unit: bottleneck-first currentTargetFor");
test("untested track wins over tested one (establish baseline)", () => {
  const state = { tracks: { reading: { level: 2, history: [attempt(15, 20)], totalQuestions: 20, totalCorrect: 15 } } };
  const t = pt.currentTargetFor(state, "IELTS band 6.5");
  assert.strictEqual(t.track, "listening");
  assert.ok(/Establish Listening baseline/.test(t.label));
  assert.strictEqual(t.targetBand, 6.5);
});
test("lowest-band non-stable track wins when both tested", () => {
  const state = { tracks: {
    reading: { level: 2, history: [attempt(15, 20)], totalQuestions: 20, totalCorrect: 15 },
    listening: { level: 2, history: [attempt(8, 20)], totalQuestions: 20, totalCorrect: 8 },
  } };
  const t = pt.currentTargetFor(state, "IELTS band 6.5");
  assert.strictEqual(t.track, "listening");
  assert.ok(/Stabilize Listening at Band 6.5/.test(t.label));
});

console.log("Unit: gradeAnswers category breakdown");
test("per-category correct/total aggregation", () => {
  const qs = [
    { id: "a", type: "mc", text: "x", options: ["1", "2"], correctAnswer: "1", category: "detail retrieval" },
    { id: "b", type: "mc", text: "y", options: ["1", "2"], correctAnswer: "1", category: "detail retrieval" },
    { id: "c", type: "tf", text: "z", options: ["True", "False", "Not Given"], correctAnswer: "True", category: "true/false/not given" },
  ];
  const g = pt.gradeAnswers(qs, { a: "1", b: "2", c: "True" });
  assert.strictEqual(g.correct, 2);
  assert.deepStrictEqual(g.categories["detail retrieval"], { correct: 1, total: 2 });
  assert.deepStrictEqual(g.categories["true/false/not given"], { correct: 1, total: 1 });
});
test("categorySplit thresholds + weakestCategory", () => {
  const cats = { strongcat: { correct: 5, total: 5 }, weakcat: { correct: 1, total: 5 }, midcat: { correct: 3, total: 4 } };
  const s = pt.categorySplit(cats);
  assert.deepStrictEqual(s.strong, ["strongcat"]);
  assert.deepStrictEqual(s.unstable, ["weakcat"]);
  assert.strictEqual(pt.weakestCategory(cats), "weakcat");
});

console.log("Unit: cleanPayload (matching type, category tags, minimums)");
function makeQuestions(n, type = "mc") {
  return Array.from({ length: n }, (_, i) => ({
    id: `q${i + 1}`, type, text: `Question ${i + 1}`,
    options: type === "fill" ? null : type === "tf" ? ["True", "False", "Not Given"] : ["A", "B", "C"],
    correctAnswer: type === "fill" ? "word" : type === "tf" ? "True" : "A",
    explanation: "e", category: "detail retrieval",
  }));
}
test("matching questions validate with a shared option bank", () => {
  const raw = { passage: "P", questions: [...makeQuestions(12), { id: "m1", type: "matching", text: "match", options: ["Paragraph A", "Paragraph B"], correctAnswer: "Paragraph A", explanation: "e", category: "matching headings" }] };
  const clean = pt.cleanPayload("reading", raw);
  assert.ok(clean);
  assert.strictEqual(clean.questions.find((q) => q.id === "m1").type, "matching");
});
test("sprint minimum: 11 surviving questions → null", () => {
  assert.strictEqual(pt.cleanPayload("reading", { passage: "P", questions: makeQuestions(11) }), null);
});
test("sprint minimum: 12 surviving questions → ok", () => {
  assert.ok(pt.cleanPayload("reading", { passage: "P", questions: makeQuestions(12) }));
});
test("drill minimum (8) is lower than sprint minimum", () => {
  assert.ok(pt.cleanPayload("reading", { passage: "P", questions: makeQuestions(8) }, { minQuestions: pt.MIN_QUESTIONS_DRILL }));
});
test("missing category falls back to a type label, not a drop", () => {
  const raw = { passage: "P", questions: makeQuestions(12).map(({ category, ...q }) => q) };
  const clean = pt.cleanPayload("reading", raw);
  assert.ok(clean);
  assert.strictEqual(clean.questions[0].category, "multiple choice");
});
test("caps at 20 questions", () => {
  const clean = pt.cleanPayload("reading", { passage: "P", questions: makeQuestions(25) });
  assert.strictEqual(clean.questions.length, 20);
});

// ---------------------------------------------------------------------------
// Part 2: API-level tests (needs a running Postgres; boots the app itself).
// ---------------------------------------------------------------------------

async function apiTests() {
  const { spawn } = require("child_process");
  const PORT = 3998;
  const BASE = `http://localhost:${PORT}`;
  const env = {
    ...process.env,
    DATABASE_URL: process.env.TEST_DATABASE_URL || "postgres://postgres:testpass@localhost:5432/eleva_test",
    SESSION_SECRET: "testsecret", BETA_CODE: "TESTCODE", PORT: String(PORT),
  };
  delete env.ANTHROPIC_API_KEY; // keyless on purpose - fallbacks are the contract under test

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
  async function call(path, body, method = "POST") {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json", cookie },
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

  console.log("API: setup account + practice-test quests");
  const email = `pt-${Date.now()}@example.com`;
  await call("/api/signup", { email, password: "password123", betaCode: "TESTCODE" });
  await call("/api/profile", {
    name: "PT Tester",
    radarSnapshot: { body: 5, growth: 5, livelihood: 5, emotional: 5, social: 5, purpose: 5, autonomy: 5 },
    pathway: "Architect",
    goals: ["IELTS Academic band 6.5"],
  });
  const { rows: userRows } = await sql.query("SELECT id FROM users WHERE email = $1", [email]);
  const userId = userRows[0].id;

  // Insert practice-test quests directly (keyless fallbackQuest never emits
  // completionType practice-test, so the schema-driven variants are seeded
  // at the DB layer - same data shape generateQuest would produce).
  async function insertQuest(practiceTestSchema) {
    const quest = {
      mode: "quest", completionType: "practice-test", structuredKind: null,
      evidenceSchema: null, practiceTestSchema,
      title: "Tembus Blind Spot Listening", description: "Latihan terarah.",
      statFocus: "growth", why: "test", goalIndex: 0,
    };
    const { rows } = await sql.query(
      `INSERT INTO days (user_id, goal_index, date, quest, insight, reflection, is_side_quest, is_meta)
       VALUES ($1, 0, '2026-08-12', $2, NULL, NULL, false, false) RETURNING id`,
      [userId, quest]
    );
    return rows[0].id;
  }

  const fullSchemaQuest = await insertQuest({ kind: "listening", track: "academic" });
  const kindOnlyQuest = await insertQuest({ kind: "listening", track: null });

  await atest("state exposes practiceTestSchema on the quest for the client auto-skip", async () => {
    const { json } = await call("/api/state", null, "GET");
    const q = json.openQuests.find((x) => x.id === fullSchemaQuest);
    assert.deepStrictEqual(q.quest.practiceTestSchema, { kind: "listening", track: "academic" });
    const q2 = json.openQuests.find((x) => x.id === kindOnlyQuest);
    assert.strictEqual(q2.quest.practiceTestSchema.kind, "listening");
    assert.strictEqual(q2.quest.practiceTestSchema.track, null);
  });

  let generated;
  await atest("generate honors quest-provided kind/track (Item 1 server side) and returns a 20-question sprint", async () => {
    const { json } = await call("/api/practice-test/generate", { questId: fullSchemaQuest, kind: "listening", track: "academic" });
    generated = json;
    assert.strictEqual(json.kind, "listening");
    assert.strictEqual(json.track, "academic");
    assert.strictEqual(json.entryType, "sprint");
    assert.strictEqual(json.questions.length, 20); // Task 13: was 3-4, now a full sprint (deliberate change)
    assert.ok(json.questions.every((q) => !("correctAnswer" in q)), "answer key must not leak");
    assert.ok(json.questions.some((q) => q.type === "matching"), "matching type present");
  });

  let submitResp;
  await atest("submit returns band range + confidence + observed/decision blocks", async () => {
    // Answer everything with the first option / empty fill - deterministic
    // mixed score against the static fallback set.
    const answers = {};
    generated.questions.forEach((q) => { answers[q.id] = q.options ? q.options[0] : "x"; });
    const { json } = await call("/api/practice-test/submit", { questId: fullSchemaQuest, answers });
    submitResp = json;
    assert.ok(json.assessment, "assessment missing");
    const a = json.assessment;
    assert.strictEqual(a.trackKey, "listening");
    assert.strictEqual(a.entryType, "sprint");
    assert.strictEqual(a.sprintNumber, 1);
    assert.ok(a.band && a.band.rangeLow < a.band.rangeHigh, "band must be a range");
    assert.strictEqual(a.confidence, "Moderate"); // 20 questions observed
    assert.strictEqual(a.totalQuestions, 20);
    assert.strictEqual(a.targetBand, 6.5);
    assert.ok(a.categories && a.categories.breakdown, "category breakdown missing");
    assert.strictEqual(a.decision.primaryQuest, "IELTS Academic band 6.5");
    assert.ok(a.decision.currentTarget, "currentTarget line missing");
  });

  await atest("per-track state persisted in tracks shape, running totals kept", async () => {
    const { rows } = await sql.query("SELECT practice_test FROM character_state WHERE user_id = $1", [userId]);
    const ptState = rows[0].practice_test["0"];
    assert.ok(ptState.tracks, "tracks shape missing");
    assert.strictEqual(ptState.tracks.listening.totalQuestions, 20);
    assert.strictEqual(ptState.tracks.listening.history.length, 1);
    assert.strictEqual(ptState.tracks.reading.totalQuestions, 0);
  });

  await atest("weak sprint schedules a focused DRILL for the next session on that track", async () => {
    const { rows } = await sql.query("SELECT practice_test FROM character_state WHERE user_id = $1", [userId]);
    const ptState = rows[0].practice_test["0"];
    // The all-first-option answer sheet reliably bombs at least one category
    // of the static fallback set - a nextDrill must be pending.
    assert.ok(ptState.tracks.listening.nextDrill, "nextDrill not scheduled");
    const { json } = await call("/api/practice-test/generate", { questId: kindOnlyQuest, kind: "listening", track: "academic" });
    assert.strictEqual(json.entryType, "drill");
    assert.ok(json.focusCategory, "drill focusCategory missing");
    assert.ok(json.questions.length <= 12, "drill must be shorter than a sprint");
  });

  await atest("drill submit accumulates totals but does NOT advance the sprint number", async () => {
    const { json: state } = await call("/api/state", null, "GET");
    const q2 = state.openQuests.find((x) => x.id === kindOnlyQuest);
    assert.ok(q2, "kind-only quest should still be open");
    const { json: gen } = await call("/api/practice-test/generate", { questId: kindOnlyQuest, kind: "listening", track: "academic" });
    const answers = {};
    gen.questions.forEach((q) => { answers[q.id] = q.options ? q.options[0] : "x"; });
    const { json } = await call("/api/practice-test/submit", { questId: kindOnlyQuest, answers });
    assert.strictEqual(json.assessment.entryType, "drill");
    assert.strictEqual(json.assessment.sprintNumber, 1, "drill must not increment SPRINT #");
    assert.ok(json.assessment.totalQuestions > 20, "drill evidence must still accumulate");
  });

  await atest("META practice-test session still starts from the full picker (no schema)", async () => {
    const { json } = await call("/api/meta/start", { tool: "practice-test" });
    assert.strictEqual(json.quest.quest.practiceTestSchema ?? null, null);
  });

  await atest("regression: reflective quest flow untouched (state still serves goal quest)", async () => {
    const { json } = await call("/api/state", null, "GET");
    assert.ok(json.openQuests.length >= 1, "open quests must survive");
  });

  await sql.end();
  server.kill();
}

(async () => {
  if (process.env.SKIP_API_TESTS === "1") {
    console.log("(API tests skipped: SKIP_API_TESTS=1)");
  } else {
    console.log("API: booting server (keyless, scratch Postgres)");
    await apiTests();
  }
  console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL TESTS PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error("Test run crashed:", e);
  process.exit(1);
});
