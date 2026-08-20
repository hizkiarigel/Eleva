// Video Quest (design handoff: LABORA video-quiz completionType):
// deterministic shape-checking + grading for the source-locked 15-question
// HOTS assessment. Same anti-Goodhart split as server/practiceTest.js and
// server/structured.js: the AI generates the question set (with the answer
// key in the SAME call), but WHETHER a given answer is correct is decided
// here in code, never asked of the model again. Same one-module-per-feature
// convention - nothing here is shared with practiceTest.js on purpose.

const QUESTION_COUNT = 15;

// The handoff's fixed content mix, enforced positionally so the validator
// can check it mechanically: q1-q3 conceptual, q4-q8 scenario, q9-q11
// error-identification, q12-q14 best-practice, q15 the single multi-select.
const STYLE_MIX = [
  ["conceptual", 3],
  ["scenario", 5],
  ["error-identification", 3],
  ["best-practice", 3],
  ["multi", 1],
];
const EXPECTED_STYLES = STYLE_MIX.flatMap(([style, n]) => Array(n).fill(style));

const DEFAULT_PASS_THRESHOLD = 11;
const SINGLE_OPTION_COUNT = 4;
// "3-5 correct-eligible options" from the handoff, made mechanical: the
// multi question offers 4-6 options of which 2-4 are correct (so there is
// always at least one wrong option and never a select-everything answer).
const MULTI_MIN_OPTIONS = 4;
const MULTI_MAX_OPTIONS = 6;
const MULTI_MIN_CORRECT = 2;
const MULTI_MAX_CORRECT = 4;

// STRICT all-or-null validation (the cleanReadingSprintPayload philosophy,
// not cleanPayload's drop-bad-questions leniency): the quest promises
// "15 soal" with an exact style mix, so a set that lost a question to a
// model fumble is not a smaller-but-fine test - it breaks the 11/15 pass
// contract. The generator retries; a still-bad response falls back or
// errors at the route.
// Returns { questions } normalized, or null.
function cleanVideoQuizPayload(raw) {
  if (!raw || typeof raw !== "object") return null;
  const list = Array.isArray(raw.questions) ? raw.questions : null;
  if (!list || list.length !== QUESTION_COUNT) return null;

  const questions = [];
  for (let i = 0; i < QUESTION_COUNT; i++) {
    const q = list[i];
    if (!q || typeof q !== "object") return null;
    const expectedStyle = EXPECTED_STYLES[i];
    const style = String(q.style || "").trim();
    if (style !== expectedStyle) return null;
    const format = expectedStyle === "multi" ? "multi" : "single";
    // Ids are stamped positionally (q1..q15) rather than trusted - the
    // model echoing a duplicate/missing id shouldn't kill grading.
    const id = "q" + (i + 1);
    const concept = String(q.concept || "").trim().toLowerCase().slice(0, 60);
    const prompt = String(q.prompt || "").trim();
    const explanation = String(q.explanation || "").trim();
    if (!concept || !prompt || !explanation) return null;

    const rawOptions = Array.isArray(q.options) ? q.options : [];
    const options = [];
    const seen = new Set();
    for (const opt of rawOptions) {
      if (!opt || typeof opt !== "object") return null;
      const oid = String(opt.id || "").trim().toLowerCase();
      const text = String(opt.text || "").trim();
      if (!/^[a-f]$/.test(oid) || !text || seen.has(oid)) return null;
      seen.add(oid);
      options.push({ id: oid, text });
    }
    const correct = Array.isArray(q.correct)
      ? [...new Set(q.correct.map((c) => String(c || "").trim().toLowerCase()))]
      : [];
    if (correct.some((c) => !seen.has(c))) return null;

    if (format === "single") {
      if (options.length !== SINGLE_OPTION_COUNT) return null;
      if (correct.length !== 1) return null;
    } else {
      if (options.length < MULTI_MIN_OPTIONS || options.length > MULTI_MAX_OPTIONS) return null;
      if (correct.length < MULTI_MIN_CORRECT || correct.length > MULTI_MAX_CORRECT) return null;
      if (correct.length >= options.length) return null;
    }

    questions.push({ id, format, style, concept, prompt, options, correct: correct.sort(), explanation });
  }
  return { questions };
}

// What the client is allowed to see pre-grading: everything EXCEPT the
// answer key. `concept` stays - it's what labels the navigator/chips and
// leaks nothing about which option is right.
function stripQuestions(questions) {
  return (questions || []).map((q) => ({
    id: q.id, format: q.format, style: q.style, concept: q.concept,
    prompt: q.prompt, options: q.options,
  }));
}

// Deterministic all-or-nothing grading. answers = { q1: ["b"], q15:
// ["a","c"] } (array even for single-select). A question is correct iff the
// selected id set EXACTLY equals the correct set - extra or missing
// selections are wrong, unanswered is wrong (the client gates Kirim on
// 15/15 answered, but the server never trusts that).
function gradeAnswers(questions, answers) {
  const perQuestion = (questions || []).map((q) => {
    const given = [...new Set((Array.isArray(answers?.[q.id]) ? answers[q.id] : []).map((a) => String(a || "").trim().toLowerCase()))];
    const want = q.correct;
    const correct = given.length === want.length && want.every((c) => given.includes(c));
    return { id: q.id, concept: q.concept, correct };
  });
  return {
    score: perQuestion.filter((p) => p.correct).length,
    total: (questions || []).length,
    perQuestion,
  };
}

// Result-screen chips: strong = every question of that concept correct,
// weak = any question of that concept wrong (the handoff's FOKUS ULANG
// list). A concept is never in both.
function conceptSplit(perQuestion) {
  const byConcept = new Map();
  for (const p of perQuestion || []) {
    if (!byConcept.has(p.concept)) byConcept.set(p.concept, true);
    if (!p.correct) byConcept.set(p.concept, false);
  }
  const strongConcepts = [];
  const weakConcepts = [];
  for (const [concept, allCorrect] of byConcept) {
    (allCorrect ? strongConcepts : weakConcepts).push(concept);
  }
  return { strongConcepts, weakConcepts };
}

module.exports = {
  QUESTION_COUNT, STYLE_MIX, DEFAULT_PASS_THRESHOLD,
  cleanVideoQuizPayload, stripQuestions, gradeAnswers, conceptSplit,
};
