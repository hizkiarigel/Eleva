// Regression script for the Video Quest stack (video-quiz completionType,
// LABORA design handoff).
//
// Pure unit tests - no server, no Postgres, no network:
// - server/youtube.js parseVideoId URL forms
// - server/videoQuiz.js cleanVideoQuizPayload (strict all-or-null),
//   stripQuestions (answer-key isolation), gradeAnswers (set-equality,
//   all-or-nothing), conceptSplit (strong/weak chips), pass threshold
// - server/claude.js normalizeCompletionType/normalizeVideoQuizSchema
//   (the silent-downgrade-to-reflective regression class) and the
//   VIDEO_QUIZ_FALLBACK fixture surviving its own validator (asserted at
//   claude.js module load - requiring it here IS the test).
//
// Run: node tests/videoquiz.js

const assert = require("assert");
const vq = require("../server/videoQuiz");
const yt = require("../server/youtube");

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

console.log("Unit: parseVideoId");
test("watch?v= form", () => assert.strictEqual(yt.parseVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s"), "dQw4w9WgXcQ"));
test("youtu.be short form", () => assert.strictEqual(yt.parseVideoId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ"));
test("shorts form", () => assert.strictEqual(yt.parseVideoId("youtube.com/shorts/dQw4w9WgXcQ"), "dQw4w9WgXcQ"));
test("embed form", () => assert.strictEqual(yt.parseVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ"), "dQw4w9WgXcQ"));
test("mobile host", () => assert.strictEqual(yt.parseVideoId("https://m.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ"));
test("non-YouTube URL rejected", () => assert.strictEqual(yt.parseVideoId("https://vimeo.com/12345"), null));
test("garbage rejected", () => assert.strictEqual(yt.parseVideoId("not a url"), null));
test("empty rejected", () => assert.strictEqual(yt.parseVideoId(""), null));
test("bad id length rejected", () => assert.strictEqual(yt.parseVideoId("https://youtu.be/short"), null));

// --- helpers to build a valid raw payload the validator should accept ---
const STYLES = ["conceptual", "conceptual", "conceptual", "scenario", "scenario", "scenario", "scenario", "scenario",
  "error-identification", "error-identification", "error-identification", "best-practice", "best-practice", "best-practice", "multi"];
function makeQuestion(i) {
  const style = STYLES[i];
  if (style === "multi") {
    return {
      style, concept: "praktik terbaik", prompt: `Soal multi ${i + 1}`,
      options: ["a", "b", "c", "d", "e"].map((id) => ({ id, text: `Opsi ${id}` })),
      correct: ["a", "b", "c"], explanation: "Karena transkrip bilang begitu.",
    };
  }
  return {
    style, concept: i % 2 ? "verifikasi" : "prinsip dasar", prompt: `Soal ${i + 1}`,
    options: ["a", "b", "c", "d"].map((id) => ({ id, text: `Opsi ${id}` })),
    correct: ["b"], explanation: "Karena transkrip bilang begitu.",
  };
}
function makeRaw(mutate) {
  const raw = { questions: Array.from({ length: 15 }, (_, i) => makeQuestion(i)) };
  if (mutate) mutate(raw);
  return raw;
}

console.log("Unit: cleanVideoQuizPayload (strict all-or-null)");
test("valid 15-question set accepted, ids stamped q1..q15", () => {
  const cleaned = vq.cleanVideoQuizPayload(makeRaw());
  assert.ok(cleaned);
  assert.strictEqual(cleaned.questions.length, 15);
  assert.deepStrictEqual(cleaned.questions.map((q) => q.id), Array.from({ length: 15 }, (_, i) => `q${i + 1}`));
  assert.strictEqual(cleaned.questions.filter((q) => q.format === "multi").length, 1);
  assert.strictEqual(cleaned.questions[14].format, "multi");
});
test("14 questions rejected", () => assert.strictEqual(vq.cleanVideoQuizPayload(makeRaw((r) => r.questions.pop())), null));
test("16 questions rejected", () => assert.strictEqual(vq.cleanVideoQuizPayload(makeRaw((r) => r.questions.push(makeQuestion(0)))), null));
test("wrong style order rejected", () => assert.strictEqual(vq.cleanVideoQuizPayload(makeRaw((r) => { r.questions[0].style = "scenario"; })), null));
test("multi in a single slot rejected", () => assert.strictEqual(vq.cleanVideoQuizPayload(makeRaw((r) => { r.questions[3] = makeQuestion(14); })), null));
test("correct id not in options rejected", () => assert.strictEqual(vq.cleanVideoQuizPayload(makeRaw((r) => { r.questions[2].correct = ["f"]; })), null));
test("single with 2 correct rejected", () => assert.strictEqual(vq.cleanVideoQuizPayload(makeRaw((r) => { r.questions[2].correct = ["a", "b"]; })), null));
test("single with 5 options rejected", () => assert.strictEqual(vq.cleanVideoQuizPayload(makeRaw((r) => { r.questions[2].options.push({ id: "e", text: "Ekstra" }); })), null));
test("multi with 1 correct rejected", () => assert.strictEqual(vq.cleanVideoQuizPayload(makeRaw((r) => { r.questions[14].correct = ["a"]; })), null));
test("multi with all options correct rejected", () => assert.strictEqual(vq.cleanVideoQuizPayload(makeRaw((r) => { r.questions[14].correct = ["a", "b", "c", "d", "e"]; })), null));
test("missing concept rejected", () => assert.strictEqual(vq.cleanVideoQuizPayload(makeRaw((r) => { r.questions[5].concept = ""; })), null));
test("missing explanation rejected", () => assert.strictEqual(vq.cleanVideoQuizPayload(makeRaw((r) => { delete r.questions[9].explanation; })), null));
test("duplicate option ids rejected", () => assert.strictEqual(vq.cleanVideoQuizPayload(makeRaw((r) => { r.questions[1].options[1].id = "a"; })), null));

console.log("Unit: stripQuestions");
test("answer key never leaves", () => {
  const { questions } = vq.cleanVideoQuizPayload(makeRaw());
  const stripped = vq.stripQuestions(questions);
  assert.strictEqual(stripped.length, 15);
  stripped.forEach((q) => {
    assert.strictEqual(q.correct, undefined);
    assert.strictEqual(q.explanation, undefined);
    assert.ok(q.concept && q.prompt && q.options.length >= 4);
  });
});

console.log("Unit: gradeAnswers (set-equality, all-or-nothing)");
const { questions: QS } = vq.cleanVideoQuizPayload(makeRaw());
function allCorrectAnswers() {
  const answers = {};
  QS.forEach((q) => { answers[q.id] = [...q.correct]; });
  return answers;
}
test("perfect answers → 15/15", () => {
  const g = vq.gradeAnswers(QS, allCorrectAnswers());
  assert.strictEqual(g.score, 15);
  assert.strictEqual(g.total, 15);
});
test("multi order-insensitive", () => {
  const answers = allCorrectAnswers();
  answers.q15 = [...answers.q15].reverse();
  assert.strictEqual(vq.gradeAnswers(QS, answers).score, 15);
});
test("multi superset = wrong", () => {
  const answers = allCorrectAnswers();
  answers.q15 = [...answers.q15, "d"];
  assert.strictEqual(vq.gradeAnswers(QS, answers).score, 14);
});
test("multi subset = wrong", () => {
  const answers = allCorrectAnswers();
  answers.q15 = answers.q15.slice(0, 1);
  assert.strictEqual(vq.gradeAnswers(QS, answers).score, 14);
});
test("unanswered = wrong, never throws", () => {
  const g = vq.gradeAnswers(QS, {});
  assert.strictEqual(g.score, 0);
  assert.strictEqual(g.perQuestion.length, 15);
});
test("single wrong pick = wrong", () => {
  const answers = allCorrectAnswers();
  answers.q1 = ["a"]; // correct is b
  assert.strictEqual(vq.gradeAnswers(QS, answers).score, 14);
});
test("case/whitespace tolerant", () => {
  const answers = allCorrectAnswers();
  answers.q1 = [" B "];
  assert.strictEqual(vq.gradeAnswers(QS, answers).score, 15);
});

console.log("Unit: conceptSplit");
test("strong = all correct, weak = any wrong, never both", () => {
  const answers = allCorrectAnswers();
  answers.q2 = ["a"]; // q2 concept "verifikasi" (i=1 odd) - one wrong poisons the concept
  const g = vq.gradeAnswers(QS, answers);
  const split = vq.conceptSplit(g.perQuestion);
  assert.ok(split.weakConcepts.includes("verifikasi"));
  assert.ok(!split.strongConcepts.includes("verifikasi"));
  assert.ok(split.strongConcepts.includes("prinsip dasar"));
  assert.ok(split.strongConcepts.includes("praktik terbaik"));
});
test("all wrong → no strong concepts", () => {
  const g = vq.gradeAnswers(QS, {});
  const split = vq.conceptSplit(g.perQuestion);
  assert.strictEqual(split.strongConcepts.length, 0);
  assert.ok(split.weakConcepts.length >= 2);
});

console.log("Unit: pass threshold boundary");
test("11/15 passes at default threshold, 10/15 fails", () => {
  assert.strictEqual(vq.DEFAULT_PASS_THRESHOLD, 11);
  assert.ok(11 >= vq.DEFAULT_PASS_THRESHOLD);
  assert.ok(!(10 >= vq.DEFAULT_PASS_THRESHOLD));
});

console.log("Unit: claude.js normalization + fallback fixture");
// Requiring claude.js also runs the VIDEO_QUIZ_FALLBACK module-load
// assertion (it throws if the fixture stops passing cleanVideoQuizPayload).
const ai = require("../server/claude");
test("video-quiz survives normalizeCompletionType (no reflective downgrade)", () => {
  const q = { completionType: "video-quiz", structuredKind: "gym" };
  ai.normalizeCompletionType(q);
  assert.strictEqual(q.completionType, "video-quiz");
  assert.strictEqual(q.structuredKind, null);
});
test("normalizeVideoQuizSchema clamps + defaults", () => {
  const q = { completionType: "video-quiz", title: "T", videoQuiz: { topic: "  Data Entry  ", passThreshold: 99, estimatedMinutes: 1 } };
  ai.normalizeVideoQuizSchema(q);
  assert.deepStrictEqual(q.videoQuiz, { topic: "Data Entry", passThreshold: 14, estimatedMinutes: 5 });
});
test("missing topic falls back to quest title, never null", () => {
  const q = { completionType: "video-quiz", title: "Belajar Data Entry", videoQuiz: null };
  ai.normalizeVideoQuizSchema(q);
  assert.strictEqual(q.videoQuiz.topic, "Belajar Data Entry");
  assert.strictEqual(q.videoQuiz.passThreshold, 11);
  assert.strictEqual(q.videoQuiz.estimatedMinutes, 25);
});
test("non-video-quiz gets videoQuiz nulled", () => {
  const q = { completionType: "reflective", videoQuiz: { topic: "x" } };
  ai.normalizeVideoQuizSchema(q);
  assert.strictEqual(q.videoQuiz, null);
});
(async () => {
  // Async test kept out of the sync test() helper so its assertions still
  // count toward `failures` before the summary prints.
  try {
    process.env.ELEVA_YOUTUBE_STUB = "1";
    const data = await yt.fetchVideoData("https://youtu.be/dQw4w9WgXcQ");
    delete process.env.ELEVA_YOUTUBE_STUB;
    assert.strictEqual(data.videoId, "dQw4w9WgXcQ");
    assert.ok(data.videoMeta.title && data.transcript.length > 100);
    console.log("  ok - ELEVA_YOUTUBE_STUB returns fixture without network");
  } catch (e) {
    failures += 1;
    console.error(`  FAIL - ELEVA_YOUTUBE_STUB returns fixture without network: ${e.message}`);
  }

  if (failures) {
    console.error(`\n${failures} test(s) failed`);
    process.exit(1);
  }
  console.log("\nall videoquiz tests passed");
})();
