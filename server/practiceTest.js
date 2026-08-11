// Task 9 (PROMPT_PRACTICE_TEST.pdf / PRD.md bagian 13): deterministic
// shape-checking + grading for the "practice-test" completionType. The AI
// generates content (a passage/script + questions + an answer key in the
// SAME call - no second call needed for grading), but WHETHER a given
// answer is correct is decided here in code, not asked of the model again.
// Same anti-Goodhart split as server/structured.js and server/targets.js:
// the model produces the material, code is the only thing that scores it.

const QUESTION_TYPES = ["mc", "tf", "fill"];

function norm(v) {
  return String(v ?? "").trim().toLowerCase();
}

// Defends against a malformed/incomplete AI response the same way
// normalizeCompletionType/normalizeSubPathway do in claude.js - drops
// individual bad questions rather than discarding an otherwise-fine
// passage/script over one fumbled field. Returns null (forcing the caller
// to fall back) only if too little survives to be a usable test.
function cleanPayload(kind, raw) {
  if (!raw || typeof raw !== "object") return null;
  const bodyKey = kind === "listening" ? "script" : "passage";
  const body = String(raw[bodyKey] || "").trim();
  if (!body) return null;
  const questions = (Array.isArray(raw.questions) ? raw.questions : [])
    .map((q, i) => {
      if (!q || typeof q !== "object") return null;
      const type = QUESTION_TYPES.includes(q.type) ? q.type : null;
      const text = String(q.text || "").trim();
      const correctAnswer = String(q.correctAnswer ?? "").trim();
      if (!type || !text || !correctAnswer) return null;
      let options;
      if (type === "fill") {
        options = undefined;
      } else if (type === "tf") {
        options = Array.isArray(q.options) && q.options.length ? q.options.map(String) : ["True", "False", "Not Given"];
      } else {
        options = Array.isArray(q.options) ? q.options.map(String).slice(0, 6) : null;
      }
      if (type !== "fill" && (!options || options.length < 2)) return null;
      return {
        id: String(q.id ?? `q${i + 1}`),
        type,
        text,
        ...(options ? { options } : {}),
        correctAnswer,
        explanation: String(q.explanation || "").trim().slice(0, 300),
      };
    })
    .filter(Boolean)
    .slice(0, 20);
  if (questions.length < 3) return null;
  return { [bodyKey]: body, questions };
}

// What the client is allowed to see before submitting - the correctAnswer
// and explanation stay server-side (in days.practice_test_payload) until
// grading happens, so a curious look at the network tab can't just hand
// over the answer key.
function stripAnswers(payload) {
  const { questions, kind, track, passage, script } = payload;
  return {
    kind, track,
    ...(passage != null ? { passage } : {}),
    ...(script != null ? { script } : {}),
    questions: questions.map(({ id, type, text, options }) => ({ id, type, text, ...(options ? { options } : {}) })),
  };
}

// Case/whitespace-insensitive exact match for all three question types -
// tolerant of minor typing differences on fill-in-the-blank, and harmless
// for mc/tf since those compare against one of a small fixed option set.
function gradeAnswers(questions, answers) {
  const wrong = [];
  let correct = 0;
  for (const q of questions) {
    const given = (answers && answers[q.id]) ?? "";
    if (norm(given) === norm(q.correctAnswer)) {
      correct += 1;
    } else {
      wrong.push({
        id: q.id, text: q.text,
        yourAnswer: String(given || "").slice(0, 200),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || "",
      });
    }
  }
  return { correct, total: questions.length, wrong };
}

module.exports = { cleanPayload, stripAnswers, gradeAnswers };
