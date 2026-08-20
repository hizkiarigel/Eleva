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

// --- Round 42: Reading Half Diagnostic (v2 sprint schema) ---

console.log("Unit: checkWordLimit");
test("within limit ok, over limit rejected, empty rejected", () => {
  assert.strictEqual(pt.checkWordLimit("two words", 2), true);
  assert.strictEqual(pt.checkWordLimit(" one ", 2), true);
  assert.strictEqual(pt.checkWordLimit("three whole words", 2), false);
  assert.strictEqual(pt.checkWordLimit("", 2), false);
});

console.log("Unit: cleanReadingSprintPayload (strict all-or-null)");
function makeReadingRaw(mutate) {
  // 9 words x 16 = 144 words per paragraph, 576 total - inside the 550-1000
  // validation bounds.
  const para = (label) => ({ label, text: "surveys conducted across several major cities suggest that this ".repeat(16).trim() });
  const questions = [];
  for (let i = 1; i <= 5; i++) questions.push({ id: `q${i}`, text: `mc ${i}`, options: ["opt A", "opt B", "opt C", "opt D"], correctAnswer: "opt B", explanation: "e" });
  for (let i = 6; i <= 10; i++) questions.push({ id: `q${i}`, text: `tf ${i}`, correctAnswer: "True", explanation: "e" });
  for (let i = 11; i <= 15; i++) questions.push({ id: `q${i}`, text: `match ${i}`, correctAnswer: "B", explanation: "e" });
  for (let i = 16; i <= 20; i++) questions.push({ id: `q${i}`, text: `fill ${i}`, correctAnswer: "two words", acceptableAnswers: ["word"], explanation: "e" });
  const raw = { passage: { title: "Test Passage", paragraphs: ["A", "B", "C", "D"].map(para) }, questions };
  if (mutate) mutate(raw);
  return raw;
}
test("valid v2 payload normalizes: 4 blocks, sections, categories, maxWords stamped", () => {
  const clean = pt.cleanReadingSprintPayload(makeReadingRaw());
  assert.ok(clean, "valid payload must pass");
  assert.strictEqual(clean.blocks.length, 4);
  assert.deepStrictEqual(clean.blocks.map((b) => b.range), ["1-5", "6-10", "11-15", "16-20"]);
  assert.strictEqual(clean.questions.length, 20);
  assert.strictEqual(clean.questions[0].type, "mc");
  assert.strictEqual(clean.questions[0].section, "multiple_choice");
  assert.strictEqual(clean.questions[0].category, "multiple choice");
  assert.deepStrictEqual(clean.questions[5].options, ["True", "False", "Not Given"]);
  assert.deepStrictEqual(clean.questions[10].options, ["A", "B", "C", "D"]);
  assert.strictEqual(clean.questions[15].maxWords, 2);
  assert.deepStrictEqual(clean.blocks[3].questionIds, ["q16", "q17", "q18", "q19", "q20"]);
});
test("3 paragraphs → null", () => {
  assert.strictEqual(pt.cleanReadingSprintPayload(makeReadingRaw((r) => r.passage.paragraphs.pop())), null);
});
test("paragraph labels out of order → null", () => {
  assert.strictEqual(pt.cleanReadingSprintPayload(makeReadingRaw((r) => { r.passage.paragraphs[0].label = "B"; r.passage.paragraphs[1].label = "A"; })), null);
});
test("mc correctAnswer not among options → null (check cleanPayload never had)", () => {
  assert.strictEqual(pt.cleanReadingSprintPayload(makeReadingRaw((r) => { r.questions[0].correctAnswer = "not an option"; })), null);
});
test("tf answer outside True/False/Not Given → null", () => {
  assert.strictEqual(pt.cleanReadingSprintPayload(makeReadingRaw((r) => { r.questions[6].correctAnswer = "Yes"; })), null);
});
test("matching answer outside A-D → null", () => {
  assert.strictEqual(pt.cleanReadingSprintPayload(makeReadingRaw((r) => { r.questions[11].correctAnswer = "E"; })), null);
});
test("completion key over the 2-word limit → null (server-side NO MORE THAN TWO WORDS)", () => {
  assert.strictEqual(pt.cleanReadingSprintPayload(makeReadingRaw((r) => { r.questions[16].correctAnswer = "three whole words"; })), null);
});
test("acceptableAnswers variant over the word limit → null", () => {
  assert.strictEqual(pt.cleanReadingSprintPayload(makeReadingRaw((r) => { r.questions[17].acceptableAnswers = ["three whole words"]; })), null);
});
test("19 questions → null (exactly 20 required)", () => {
  assert.strictEqual(pt.cleanReadingSprintPayload(makeReadingRaw((r) => r.questions.pop())), null);
});
test("ids out of order → null", () => {
  assert.strictEqual(pt.cleanReadingSprintPayload(makeReadingRaw((r) => { r.questions[0].id = "q2"; })), null);
});
test("short passage rejected by default, allowed with minPassageWords: 0 (fallback fixture rule)", () => {
  const shorten = (r) => r.passage.paragraphs.forEach((p) => { p.text = "short paragraph text here"; });
  assert.strictEqual(pt.cleanReadingSprintPayload(makeReadingRaw(shorten)), null);
  assert.ok(pt.cleanReadingSprintPayload(makeReadingRaw(shorten), { minPassageWords: 0 }));
});

console.log("Unit: gradeAnswers v2 additions (acceptableAnswers, word limit, section)");
test("acceptableAnswers widen the key; over-limit answer is wrong even on a match", () => {
  const qs = [
    { id: "q1", type: "fill", section: "sentence_completion", text: "x", correctAnswer: "two words", acceptableAnswers: ["word"], maxWords: 2, category: "sentence completion" },
    { id: "q2", type: "fill", section: "sentence_completion", text: "y", correctAnswer: "two words", maxWords: 1, category: "sentence completion" },
  ];
  const g = pt.gradeAnswers(qs, { q1: " Word ", q2: "two words" });
  assert.strictEqual(g.correct, 1, "acceptable variant must count");
  const w = g.wrong.find((x) => x.id === "q2");
  assert.ok(w, "over-limit answer must be wrong despite matching the key");
  assert.strictEqual(w.section, "sentence_completion");
});
test("old flat payloads grade identically (no maxWords/acceptableAnswers/section)", () => {
  const qs = [{ id: "a", type: "fill", text: "x", correctAnswer: "word", category: "completion" }];
  const g = pt.gradeAnswers(qs, { a: "WORD " });
  assert.strictEqual(g.correct, 1);
});

console.log("Unit: stripAnswers v2 whitelist");
test("keeps blocks/section/maxWords/weekKey, still strips every answer field", () => {
  const cleaned = pt.cleanReadingSprintPayload(makeReadingRaw());
  const stripped = pt.stripAnswers({ kind: "reading", track: "academic", entryType: "sprint", schemaVersion: 2, weekKey: "2026-08-17", ...cleaned });
  assert.strictEqual(stripped.schemaVersion, 2);
  assert.strictEqual(stripped.weekKey, "2026-08-17");
  assert.strictEqual(stripped.blocks.length, 4);
  assert.strictEqual(stripped.questions[0].section, "multiple_choice");
  assert.strictEqual(stripped.questions[15].maxWords, 2);
  const s = JSON.stringify(stripped);
  assert.ok(!s.includes("correctAnswer") && !s.includes("acceptableAnswers") && !s.includes("explanation") && !s.includes("category"), "answer key fields must not leak");
});

console.log("Unit: cleanListeningSprintPayload (strict all-or-null, round 43)");
function makeListeningRaw(mutate) {
  const script = "hello and welcome to the centre today we will talk through everything you need ".repeat(20).trim(); // 14 words x 20 = 280
  const rec = (id, title) => ({ recordingId: id, title, announcement: `Recording ${id}. You will hear something. Questions.`, script });
  const legend = ["A", "B", "C", "D", "E"].map((letter, i) => ({ letter, label: `Team ${i + 1}` }));
  const questions = [];
  for (let i = 1; i <= 5; i++) questions.push({ id: `q${i}`, text: `note ${i}`, correctAnswer: "two words", acceptableAnswers: ["2 words"], explanation: "e" });
  for (let i = 6; i <= 10; i++) questions.push({ id: `q${i}`, text: `mc ${i}`, options: [{ letter: "A", label: "one" }, { letter: "B", label: "two" }, { letter: "C", label: "three" }], correctAnswer: "B", explanation: "e" });
  for (let i = 11; i <= 15; i++) questions.push({ id: `q${i}`, text: `match ${i}`, correctAnswer: "C", explanation: "e" });
  for (let i = 16; i <= 20; i++) questions.push({ id: `q${i}`, text: `sentence ${i}`, correctAnswer: "one word", explanation: "e" });
  const raw = { recordings: [rec(1, "Rec One Title"), rec(2, "Rec Two Title")], matchingLegend: legend, questions };
  if (mutate) mutate(raw);
  return raw;
}
test("valid listening payload normalizes: recordings, legend, 4 blocks, letter answers", () => {
  const clean = pt.cleanListeningSprintPayload(makeListeningRaw());
  assert.ok(clean, "valid payload must pass");
  assert.strictEqual(clean.recordings.length, 2);
  assert.ok(clean.recordings[0].announcement && clean.recordings[1].title);
  assert.deepStrictEqual(clean.blocks.map((b) => b.blockType), ["note_completion", "multiple_choice", "matching", "sentence_completion"]);
  assert.deepStrictEqual(clean.questions.map((q) => q.type).join(","), [...Array(5).fill("fill"), ...Array(5).fill("mc"), ...Array(5).fill("matching"), ...Array(5).fill("fill")].join(","));
  assert.strictEqual(clean.questions[0].maxWords, 2);
  assert.strictEqual(clean.questions[5].correctAnswer, "B");
  assert.deepStrictEqual(clean.questions[5].options[0], { letter: "A", label: "one" });
  assert.strictEqual(clean.questions[10].recordingId, 2);
});
test("1 recording → null; empty announcement → null; short script → null", () => {
  assert.strictEqual(pt.cleanListeningSprintPayload(makeListeningRaw((r) => r.recordings.pop())), null);
  assert.strictEqual(pt.cleanListeningSprintPayload(makeListeningRaw((r) => { r.recordings[0].announcement = ""; })), null);
  assert.strictEqual(pt.cleanListeningSprintPayload(makeListeningRaw((r) => { r.recordings[1].script = "too short"; })), null);
});
test("legend must be exactly 5 A-E", () => {
  assert.strictEqual(pt.cleanListeningSprintPayload(makeListeningRaw((r) => r.matchingLegend.pop())), null);
  assert.strictEqual(pt.cleanListeningSprintPayload(makeListeningRaw((r) => { r.matchingLegend[2].letter = "X"; })), null);
});
test("mc needs exactly 3 A-C options with a letter answer; matching answer must be A-E", () => {
  assert.strictEqual(pt.cleanListeningSprintPayload(makeListeningRaw((r) => r.questions[6].options.pop())), null);
  assert.strictEqual(pt.cleanListeningSprintPayload(makeListeningRaw((r) => { r.questions[6].correctAnswer = "D"; })), null);
  assert.strictEqual(pt.cleanListeningSprintPayload(makeListeningRaw((r) => { r.questions[11].correctAnswer = "F"; })), null);
  const lower = pt.cleanListeningSprintPayload(makeListeningRaw((r) => { r.questions[11].correctAnswer = "c"; }));
  assert.strictEqual(lower.questions[11].correctAnswer, "C", "letter answers normalize to uppercase");
});
test("completion keys respect the 2-word limit", () => {
  assert.strictEqual(pt.cleanListeningSprintPayload(makeListeningRaw((r) => { r.questions[0].correctAnswer = "three whole words"; })), null);
  assert.strictEqual(pt.cleanListeningSprintPayload(makeListeningRaw((r) => { r.questions[16].acceptableAnswers = ["three whole words"]; })), null);
});
test("stripAnswers keeps recordings/legend/recordingId, still strips the key", () => {
  const cleaned = pt.cleanListeningSprintPayload(makeListeningRaw());
  const stripped = pt.stripAnswers({ kind: "listening", track: "academic", entryType: "sprint", schemaVersion: 2, weekKey: "2026-08-17", ...cleaned });
  assert.strictEqual(stripped.recordings.length, 2);
  assert.strictEqual(stripped.matchingLegend.length, 5);
  assert.strictEqual(stripped.questions[10].recordingId, 2);
  const s = JSON.stringify(stripped);
  assert.ok(!s.includes("correctAnswer") && !s.includes("acceptableAnswers") && !s.includes("explanation"), "answer key must not leak");
});
test("listening fallback = the fixed round-41 diagnostic converted to v2", () => {
  const ai = require("../server/claude");
  const fb = ai.fallbackListeningSprint();
  assert.strictEqual(fb.questions.length, 20);
  assert.strictEqual(fb.recordings[0].title, "Riverside Leisure Centre");
  assert.strictEqual(fb.matchingLegend.length, 5);
  assert.strictEqual(fb.blocks.length, 4);
  // grading via the practice-test pipeline honors acceptableAnswers
  const g = pt.gradeAnswers(fb.questions, { q19: "forty-eight" });
  assert.strictEqual(g.correct, 1);
});

console.log("Unit: reading fallback fixture is a valid v2 sprint");
test("fallbackPracticeTest reading = 4 labelled paragraphs + exact 5/5/5/5 blocks", () => {
  const ai = require("../server/claude");
  const fb = ai.fallbackPracticeTest({ kind: "reading", track: "academic", drill: null });
  assert.strictEqual(fb.passage.paragraphs.length, 4);
  assert.deepStrictEqual(fb.passage.paragraphs.map((p) => p.label), ["A", "B", "C", "D"]);
  assert.strictEqual(fb.blocks.length, 4);
  assert.deepStrictEqual(fb.questions.map((q) => q.type), [
    ...Array(5).fill("mc"), ...Array(5).fill("tf"), ...Array(5).fill("matching"), ...Array(5).fill("fill"),
  ]);
  const drill = ai.fallbackPracticeTest({ kind: "reading", track: "academic", drill: { category: "sentence completion" } });
  assert.strictEqual(drill.questions.length, pt.DRILL_QUESTIONS);
  assert.ok(!drill.blocks, "drill payload must not carry the 4x5 sprint blocks");
  assert.strictEqual(drill.questions[0].category, "sentence completion");
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

  // --- Round 42: Reading Half Diagnostic (v2 sprint + weekly global cache) ---

  // Same Monday-start week key the server derives (startOfWeekKey,
  // server/index.js) - the test process shares the spawned server's TZ.
  function testWeekKey(d = new Date()) {
    const day = (d.getDay() + 6) % 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - day);
    return monday.toLocaleDateString("en-CA");
  }

  const readingQuestA = await insertQuest({ kind: "reading", track: "academic" });
  const readingQuestB = await insertQuest({ kind: "reading", track: "academic" });

  // The weekly caches are GLOBAL (not per-user like everything else this
  // script creates), so leftovers from a previous run on the same scratch DB
  // must be cleared or the empty-cache/seed assertions below break.
  await sql.query("DELETE FROM weekly_reading_tests");
  await sql.query("DELETE FROM weekly_listening_tests");

  await atest("keyless reading sprint serves the v2 fallback and never caches it", async () => {
    const { json } = await call("/api/practice-test/generate", { questId: readingQuestA, kind: "reading", track: "academic" });
    assert.strictEqual(json.entryType, "sprint");
    assert.strictEqual(json.schemaVersion, 2);
    assert.strictEqual(json.weekKey, testWeekKey());
    assert.ok(json.passage && Array.isArray(json.passage.paragraphs), "passage must be paragraph-labelled");
    assert.strictEqual(json.passage.paragraphs.length, 4);
    assert.strictEqual(json.blocks.length, 4);
    assert.strictEqual(json.questions.length, 20);
    assert.ok(json.questions.every((q) => !("correctAnswer" in q) && !("acceptableAnswers" in q)), "answer key must not leak");
    const { rows } = await sql.query("SELECT count(*)::int AS n FROM weekly_reading_tests");
    assert.strictEqual(rows[0].n, 0, "fallback must NOT be cached as the week's content");
  });

  // Seed this week's global content directly (stands in for a successful AI
  // generation - keyless mode can't produce one).
  const seeded = pt.cleanReadingSprintPayload((() => {
    const para = (label) => ({ label, text: "the seeded weekly passage text repeats to reach length here ".repeat(16).trim() });
    const questions = [];
    for (let i = 1; i <= 5; i++) questions.push({ id: `q${i}`, text: `mc ${i}`, options: ["opt A", "opt B", "opt C", "opt D"], correctAnswer: "opt B", explanation: "e" });
    for (let i = 6; i <= 10; i++) questions.push({ id: `q${i}`, text: `tf ${i}`, correctAnswer: "True", explanation: "e" });
    for (let i = 11; i <= 15; i++) questions.push({ id: `q${i}`, text: `match ${i}`, correctAnswer: "B", explanation: "e" });
    for (let i = 16; i <= 20; i++) questions.push({ id: `q${i}`, text: `fill ${i}`, correctAnswer: "two words", explanation: "e" });
    return { passage: { title: "Seeded Weekly Topic", paragraphs: ["A", "B", "C", "D"].map(para) }, questions };
  })());

  await atest("seeded weekly content is served to every attempt that week (global cache)", async () => {
    assert.ok(seeded, "seed fixture must pass the strict validator");
    await sql.query(
      `INSERT INTO weekly_reading_tests (week_key, track, payload) VALUES ($1, 'academic', $2)`,
      [testWeekKey(), seeded]
    );
    const { json: genB } = await call("/api/practice-test/generate", { questId: readingQuestB, kind: "reading", track: "academic" });
    assert.strictEqual(genB.passage.title, "Seeded Weekly Topic");
    // Re-generate on the other open quest: same weekly content, same title.
    const { json: genA } = await call("/api/practice-test/generate", { questId: readingQuestA, kind: "reading", track: "academic" });
    assert.strictEqual(genA.passage.title, "Seeded Weekly Topic");
  });

  await atest("ON CONFLICT DO NOTHING keeps the first writer's content (race idiom)", async () => {
    const { rows } = await sql.query(
      `INSERT INTO weekly_reading_tests (week_key, track, payload) VALUES ($1, 'academic', $2)
       ON CONFLICT (week_key, track) DO NOTHING RETURNING payload`,
      [testWeekKey(), { passage: { title: "Loser Topic" } }]
    );
    assert.strictEqual(rows.length, 0, "second insert must be a no-op");
    const { rows: check } = await sql.query(`SELECT payload->'passage'->>'title' AS t FROM weekly_reading_tests WHERE week_key = $1 AND track = 'academic'`, [testWeekKey()]);
    assert.strictEqual(check[0].t, "Seeded Weekly Topic");
  });

  await atest("reading submit grades v2 (word limit enforced) and schedules a reading drill", async () => {
    // All-wrong sheet: every choice off-key, and q16-20 answered over the
    // word limit to prove the NO MORE THAN TWO WORDS rule grades server-side.
    const answers = {};
    for (let i = 1; i <= 5; i++) answers[`q${i}`] = "opt A";
    for (let i = 6; i <= 10; i++) answers[`q${i}`] = "False";
    for (let i = 11; i <= 15; i++) answers[`q${i}`] = "A";
    for (let i = 16; i <= 20; i++) answers[`q${i}`] = "yes two words"; // 3 words - over the limit, must be wrong
    const { json } = await call("/api/practice-test/submit", { questId: readingQuestB, answers });
    assert.strictEqual(json.score, 0, "every answer must grade wrong (incl. over-limit completions)");
    assert.strictEqual(json.assessment.trackKey, "reading");
    assert.strictEqual(json.wrong.length, 20);
    assert.ok(json.wrong.some((w) => w.section === "sentence_completion"), "wrong entries carry section");
    const { rows } = await sql.query("SELECT practice_test FROM character_state WHERE user_id = $1", [userId]);
    assert.ok(rows[0].practice_test["0"].tracks.reading.nextDrill, "weak reading sprint must schedule a drill");
  });

  await atest("reading drill stays per-attempt (flat payload, no weekly cache, no blocks)", async () => {
    const { json } = await call("/api/practice-test/generate", { questId: readingQuestA, kind: "reading", track: "academic" });
    assert.strictEqual(json.entryType, "drill");
    assert.ok(json.focusCategory, "drill focusCategory missing");
    assert.ok(json.questions.length <= 12, "drill must be 12 questions or fewer");
    assert.ok(!json.blocks, "drill must not carry sprint blocks");
  });

  // --- Round 43: weekly LISTENING sprint (diagnostic format + global cache) ---

  // Goal-less META-style quests: their track state is always empty, so these
  // generates are guaranteed sprints (the goal-0 listening track already has
  // a pending drill from the tests above).
  async function insertMetaQuest() {
    const quest = {
      mode: "quest", completionType: "practice-test", structuredKind: null,
      evidenceSchema: null, practiceTestSchema: null,
      title: "Practice Test Mandiri", description: "Sesi bebas.", statFocus: "growth", why: "test",
    };
    const { rows } = await sql.query(
      `INSERT INTO days (user_id, goal_index, date, quest, insight, reflection, is_side_quest, is_meta)
       VALUES ($1, NULL, '2026-08-12', $2, NULL, NULL, false, true) RETURNING id`,
      [userId, quest]
    );
    return rows[0].id;
  }

  await atest("keyless listening sprint serves the converted round-41 diagnostic, uncached", async () => {
    const questId = await insertMetaQuest();
    const { json } = await call("/api/practice-test/generate", { questId, kind: "listening", track: "academic" });
    assert.strictEqual(json.entryType, "sprint");
    assert.strictEqual(json.schemaVersion, 2);
    assert.strictEqual(json.recordings.length, 2);
    assert.strictEqual(json.recordings[0].title, "Riverside Leisure Centre");
    assert.strictEqual(json.matchingLegend.length, 5);
    assert.strictEqual(json.blocks.length, 4);
    assert.strictEqual(json.questions.length, 20);
    const s = JSON.stringify(json);
    assert.ok(!s.includes("correctAnswer") && !s.includes("acceptableAnswers"), "answer key must not leak");
    const { rows } = await sql.query("SELECT count(*)::int AS n FROM weekly_listening_tests");
    assert.strictEqual(rows[0].n, 0, "fallback must NOT be cached as the week's content");
  });

  await atest("seeded weekly listening content is served to every attempt that week", async () => {
    const seededListening = pt.cleanListeningSprintPayload(makeListeningRaw((r) => { r.recordings[0].title = "Seeded Listening Week"; }));
    assert.ok(seededListening, "listening seed fixture must pass the strict validator");
    await sql.query(`INSERT INTO weekly_listening_tests (week_key, payload) VALUES ($1, $2)`, [testWeekKey(), seededListening]);
    const questId = await insertMetaQuest();
    const { json } = await call("/api/practice-test/generate", { questId, kind: "listening", track: "academic" });
    assert.strictEqual(json.recordings[0].title, "Seeded Listening Week");
    // submit grades through the practice-test pipeline (band assessment)
    const answers = {};
    json.questions.forEach((q, i) => { answers[q.id] = q.type === "mc" ? "B" : q.type === "matching" ? "C" : "two words"; });
    const { json: sub } = await call("/api/practice-test/submit", { questId, answers });
    assert.ok(sub.assessment && sub.assessment.band, "band assessment missing");
    assert.strictEqual(sub.assessment.trackKey, "listening");
    // seed keys: notes "two words", mc "B", matching "C", sentences "one word" -> 15/20
    assert.strictEqual(sub.score, 15);
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
