// Unit tests for server/listeningDiagnostic.js (IELTS Listening Half
// Diagnostic, round 41 META: LINGUA feature). Mirrors tests/practicetest.js's
// pure-function-testing conventions - no server/DB needed, this module is
// deterministic content + grading, not an AI/API-backed system.
//
// Run: node tests/listeningDiagnostic.js

const assert = require("assert");
const ld = require("../server/listeningDiagnostic");

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

console.log("Unit: validateAssessment (real content)");
test("the real fixed ASSESSMENT passes validation", () => {
  const { valid, errors } = ld.validateAssessment(ld.ASSESSMENT);
  assert.deepStrictEqual(errors, []);
  assert.strictEqual(valid, true);
});
test("ASSESSMENT has exactly 20 questions and 2 recordings", () => {
  assert.strictEqual(ld.ASSESSMENT.questions.length, 20);
  assert.strictEqual(ld.ASSESSMENT.recordings.length, 2);
});
test("RUN_LIMIT is 2 and TIME_LIMIT_MS is 30 minutes", () => {
  assert.strictEqual(ld.RUN_LIMIT, 2);
  assert.strictEqual(ld.TIME_LIMIT_MS, 30 * 60 * 1000);
});
test("task types split exactly as the spec requires: 5 note, 5 mc, 5 matching, 5 sentence", () => {
  const byType = {};
  for (const q of ld.ASSESSMENT.questions) byType[q.taskType] = (byType[q.taskType] || 0) + 1;
  assert.deepStrictEqual(byType, { note_completion: 5, multiple_choice: 5, matching: 5, sentence_completion: 5 });
  assert.ok(!("true_false" in byType), "no True/False questions per spec");
});

console.log("Unit: validateAssessment (targeted mutations each independently flip validity)");
function cloneAssessment() {
  return JSON.parse(JSON.stringify(ld.ASSESSMENT));
}
test("duplicate questionNumber -> invalid", () => {
  const a = cloneAssessment();
  a.questions[5].questionNumber = a.questions[4].questionNumber;
  const { valid, errors } = ld.validateAssessment(a);
  assert.strictEqual(valid, false);
  assert.ok(errors.some((e) => /duplicate questionNumber/.test(e)));
});
test("missing questionNumber -> invalid", () => {
  const a = cloneAssessment();
  a.questions.splice(10, 1); // remove question 11, leaves 19 questions with a gap
  const { valid, errors } = ld.validateAssessment(a);
  assert.strictEqual(valid, false);
  assert.ok(errors.some((e) => /missing questionNumber/.test(e)) || errors.some((e) => /expected exactly 20/.test(e)));
});
test("wrong recording split at the 10/11 boundary -> invalid", () => {
  const a = cloneAssessment();
  const q11 = a.questions.find((q) => q.questionNumber === 11);
  q11.recordingId = 1; // should be 2
  const { valid, errors } = ld.validateAssessment(a);
  assert.strictEqual(valid, false);
  assert.ok(errors.some((e) => /should belong to recording/.test(e)));
});
test("empty correctAnswer -> invalid", () => {
  const a = cloneAssessment();
  a.questions[0].correctAnswer = "";
  const { valid, errors } = ld.validateAssessment(a);
  assert.strictEqual(valid, false);
  assert.ok(errors.some((e) => /no valid correctAnswer/.test(e)));
});
test("a maxWords violation on the question's own correctAnswer -> invalid", () => {
  const a = cloneAssessment();
  const q = a.questions.find((x) => x.taskType === "note_completion");
  q.correctAnswer = "this answer has way too many words";
  q.maxWords = 2;
  const { valid, errors } = ld.validateAssessment(a);
  assert.strictEqual(valid, false);
  assert.ok(errors.some((e) => /violates its maxWords limit/.test(e)));
});
test("wrong recording count -> invalid", () => {
  const a = cloneAssessment();
  a.recordings.pop();
  const { valid, errors } = ld.validateAssessment(a);
  assert.strictEqual(valid, false);
  assert.ok(errors.some((e) => /expected exactly 2 recordings/.test(e)));
});
test("wrong total question count -> invalid", () => {
  const a = cloneAssessment();
  a.questions.pop();
  const { valid, errors } = ld.validateAssessment(a);
  assert.strictEqual(valid, false);
  assert.ok(errors.some((e) => /expected exactly 20 questions/.test(e)));
});

console.log("Unit: gradeAnswers (case/whitespace-insensitive, per task type, alt-forms)");
test("exact match on note_completion (case/whitespace-insensitive)", () => {
  const qs = ld.ASSESSMENT.questions.filter((q) => q.questionId === "q1");
  const g = ld.gradeAnswers(qs, { q1: "  10PM  " });
  assert.strictEqual(g.correct, 1);
  assert.strictEqual(g.total, 1);
});
test("multiple_choice matches the letter", () => {
  const qs = ld.ASSESSMENT.questions.filter((q) => q.questionId === "q6");
  assert.strictEqual(ld.gradeAnswers(qs, { q6: "B" }).correct, 1);
  assert.strictEqual(ld.gradeAnswers(qs, { q6: "b" }).correct, 1);
  assert.strictEqual(ld.gradeAnswers(qs, { q6: "A" }).correct, 0);
});
test("matching matches the letter", () => {
  const qs = ld.ASSESSMENT.questions.filter((q) => q.questionId === "q11");
  assert.strictEqual(ld.gradeAnswers(qs, { q11: "A" }).correct, 1);
  assert.strictEqual(ld.gradeAnswers(qs, { q11: "D" }).correct, 0);
});
test("sentence_completion matches free text", () => {
  const qs = ld.ASSESSMENT.questions.filter((q) => q.questionId === "q16");
  assert.strictEqual(ld.gradeAnswers(qs, { q16: "tuesday" }).correct, 1);
});
test("Q19 accepts its acceptableAnswers alt-forms ('48' and 'forty-eight')", () => {
  const qs = ld.ASSESSMENT.questions.filter((q) => q.questionId === "q19");
  assert.strictEqual(ld.gradeAnswers(qs, { q19: "48" }).correct, 1);
  assert.strictEqual(ld.gradeAnswers(qs, { q19: "forty-eight" }).correct, 1);
  assert.strictEqual(ld.gradeAnswers(qs, { q19: "forty eight" }).correct, 1);
  assert.strictEqual(ld.gradeAnswers(qs, { q19: "FORTY-EIGHT" }).correct, 1);
  assert.strictEqual(ld.gradeAnswers(qs, { q19: "49" }).correct, 0);
});
test("empty/missing answer never counts as correct", () => {
  const qs = ld.ASSESSMENT.questions.filter((q) => q.questionId === "q1");
  assert.strictEqual(ld.gradeAnswers(qs, {}).correct, 0);
  assert.strictEqual(ld.gradeAnswers(qs, { q1: "" }).correct, 0);
  assert.strictEqual(ld.gradeAnswers(qs, { q1: "   " }).correct, 0);
});
test("full-set grading against the real answer key: all-correct scores 20/20", () => {
  const answers = {};
  ld.ASSESSMENT.questions.forEach((q) => { answers[q.questionId] = q.correctAnswer; });
  const g = ld.gradeAnswers(ld.ASSESSMENT.questions, answers);
  assert.strictEqual(g.correct, 20);
  assert.strictEqual(g.total, 20);
  assert.deepStrictEqual(g.wrong, []);
});
test("all-wrong scores 0/20 and lists every question in wrong[]", () => {
  const answers = {};
  ld.ASSESSMENT.questions.forEach((q) => { answers[q.questionId] = "___definitely_wrong___"; });
  const g = ld.gradeAnswers(ld.ASSESSMENT.questions, answers);
  assert.strictEqual(g.correct, 0);
  assert.strictEqual(g.wrong.length, 20);
});

console.log("Unit: checkWordLimit");
test("within limit passes", () => assert.strictEqual(ld.checkWordLimit("main building", 2), true));
test("over limit fails", () => assert.strictEqual(ld.checkWordLimit("way too many words here", 2), false));
test("no maxWords (null) always passes", () => assert.strictEqual(ld.checkWordLimit("anything at all really", null), true));
test("a single numeral token counts as satisfying the limit", () => assert.strictEqual(ld.checkWordLimit("48", 2), true));

console.log("Unit: stripAnswers never leaks the answer key");
test("stripped questions have no correctAnswer/acceptableAnswers fields", () => {
  const stripped = ld.stripAnswers(ld.ASSESSMENT);
  for (const q of stripped.questions) {
    assert.ok(!("correctAnswer" in q), `question ${q.questionId} leaked correctAnswer`);
    assert.ok(!("acceptableAnswers" in q), `question ${q.questionId} leaked acceptableAnswers`);
  }
});
test("stripped questions still carry everything the client needs to render", () => {
  const stripped = ld.stripAnswers(ld.ASSESSMENT);
  assert.strictEqual(stripped.questions.length, 20);
  for (const q of stripped.questions) {
    assert.ok(q.questionId && q.questionNumber && q.recordingId && q.taskType && q.prompt, `question ${q.questionId} missing a client-needed field`);
  }
  const mc = stripped.questions.find((q) => q.taskType === "multiple_choice");
  assert.ok(Array.isArray(mc.options) && mc.options.length > 0, "multiple_choice options must survive stripAnswers");
});
test("stripped recordings still carry the full script (content, not the answer key)", () => {
  const stripped = ld.stripAnswers(ld.ASSESSMENT);
  assert.strictEqual(stripped.recordings.length, 2);
  for (const r of stripped.recordings) {
    assert.ok(r.script && r.script.length > 100, `recording ${r.recordingId} missing its script`);
  }
});
test("stripAnswers passes the matchingLegend through unchanged", () => {
  const stripped = ld.stripAnswers(ld.ASSESSMENT);
  assert.deepStrictEqual(stripped.matchingLegend, ld.ASSESSMENT.matchingLegend);
});

console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL TESTS PASSED");
process.exit(failures ? 1 : 0);
