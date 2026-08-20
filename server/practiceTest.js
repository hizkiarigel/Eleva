// Task 9 (PROMPT_PRACTICE_TEST.pdf / PRD.md bagian 13): deterministic
// shape-checking + grading for the "practice-test" completionType. The AI
// generates content (a passage/script + questions + an answer key in the
// SAME call - no second call needed for grading), but WHETHER a given
// answer is correct is decided here in code, not asked of the model again.
// Same anti-Goodhart split as server/structured.js and server/targets.js:
// the model produces the material, code is the only thing that scores it.
//
// Task 13 (Objective Assessment Engine, approved 12 Agustus): this module
// also owns everything deterministic about ASSESSMENT - band estimation,
// confidence, the per-track schema (+ migration from the old flat shape),
// the EXPOSED→EMERGING→STABLE→MASTERED status ladder, and bottleneck-first
// current-target selection. None of it ever calls the AI.

// "matching" added by Task 13 (headings/features matching - answers still
// resolve to one exact option string, so grading stays the same exact-match).
const QUESTION_TYPES = ["mc", "tf", "fill", "matching"];

// Task 13: every question carries a category tag for the Eleva Observed
// breakdown. A model that forgets the tag shouldn't nuke the whole payload -
// fall back to a type-derived label so the breakdown still groups sensibly.
const TYPE_CATEGORY_FALLBACK = { mc: "multiple choice", tf: "true/false/not given", fill: "completion", matching: "matching" };

// Sprint = full 20-question diagnostic; drill = 12-question single-category
// focus (Task 13 default decision: drills feed totalQuestions/totalCorrect
// but never the SPRINT # count). Minimum-surviving-questions thresholds
// scale proportionally (was 3 when sprints were 3-4 questions).
const SPRINT_QUESTIONS = 20;
const DRILL_QUESTIONS = 12;
const MIN_QUESTIONS_SPRINT = 12;
const MIN_QUESTIONS_DRILL = 8;

// The objective tracks this engine can actually measure today.
// writing/speaking slots exist in the schema (see emptyTrack/migrateState)
// so they can be filled later WITHOUT another migration, but they need a
// rubric-graded completionType that is explicitly out of scope - nothing
// here ever selects them as a target or accepts a submission for them.
const OBJECTIVE_TRACKS = ["reading", "listening"];
const ALL_TRACKS = ["reading", "listening", "writing", "speaking"];

// Reading Half Diagnostic (design handoff, round 42): the 20-question
// reading sprint is no longer a flat mixed-type list but an exact 4-block
// IELTS structure - 5 questions per block, in this order. Each block maps
// onto an existing QUESTION_TYPES code so grading/band/drill selection stay
// untouched; `section` and `blocks` are additive metadata on top of the
// same flat `questions` array. The `category` per block is stamped
// server-side (never trusted from the model) so the result screen's
// per-block breakdown falls straight out of gradeAnswers' categories.
const READING_SPRINT_BLOCKS = [
  {
    blockType: "multiple_choice", type: "mc", label: "Multiple Choice",
    category: "multiple choice",
    instruction: "Choose the correct letter, A, B, C or D.",
  },
  {
    blockType: "true_false_not_given", type: "tf", label: "True / False / Not Given",
    category: "true/false/not given",
    instruction: "Do the following statements agree with the information in the passage? Write TRUE, FALSE or NOT GIVEN.",
  },
  {
    blockType: "matching_information", type: "matching", label: "Matching Information",
    category: "matching information",
    instruction: "Which paragraph contains the following information? Choose the correct letter, A–D. NB You may use any letter more than once.",
  },
  {
    blockType: "sentence_completion", type: "fill", label: "Sentence Completion",
    category: "sentence completion",
    instruction: "Complete the sentences below. Write NO MORE THAN TWO WORDS from the passage for each answer.",
    maxWords: 2,
  },
];
const READING_BLOCK_SIZE = 5;
const PARAGRAPH_LABELS = ["A", "B", "C", "D"];

// Round 43 (founder feedback on round 42's deploy): the quest-driven
// LISTENING sprint adopts the round-41 Listening Half Diagnostic format -
// 2 TTS-spoken recordings + the same 4 task types, 5 each, in this order
// (deliberately NO True/False, per that design). Same flat-questions
// contract as reading: each block maps to an existing QUESTION_TYPES code
// so gradeAnswers/band/drill work unchanged. mc/matching answers are the
// LETTER (grading never needs the label), matching legend is shared
// context like the fixed diagnostic's MATCHING_LEGEND.
const LISTENING_SPRINT_BLOCKS = [
  {
    blockType: "note_completion", type: "fill", label: "Note Completion",
    category: "note completion", recordingId: 1, maxWords: 2,
    instruction: "Complete the notes below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
  },
  {
    blockType: "multiple_choice", type: "mc", label: "Multiple Choice",
    category: "multiple choice", recordingId: 1,
    instruction: "Choose the correct letter, A, B or C.",
  },
  {
    blockType: "matching", type: "matching", label: "Matching",
    category: "matching", recordingId: 2,
    instruction: "Choose FIVE answers from the box, A–E.",
  },
  {
    blockType: "sentence_completion", type: "fill", label: "Sentence Completion",
    category: "sentence completion", recordingId: 2, maxWords: 2,
    instruction: "Complete the sentences below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
  },
];
const MC_LETTERS = ["A", "B", "C"];
const LEGEND_LETTERS = ["A", "B", "C", "D", "E"];
// Each recording script is spoken via browser TTS; bounds keep a script
// long enough to carry 10 answer points but short enough to sit through
// twice (the 2-run cap). The hand-authored round-41 scripts are ~330 and
// ~430 words - the generated ones should land in the same range.
const SCRIPT_MIN_WORDS = 150;
const SCRIPT_MAX_WORDS = 650;
// The prompt asks for 650-900 words; validation bounds are deliberately
// looser because model word counts drift - a 620-word passage is still a
// perfectly usable diagnostic, a 300-word one is not.
const PASSAGE_MIN_WORDS = 550;
const PASSAGE_MAX_WORDS = 1000;

function norm(v) {
  return String(v ?? "").trim().toLowerCase();
}

// Word-limit check for sentence-completion answers ("NO MORE THAN TWO
// WORDS"). Hand-copied from server/listeningDiagnostic.js (same repo
// convention as KONDISI_LABELS - no shared-module layer). A numeral counts
// as one word.
function checkWordLimit(answer, maxWords) {
  const words = String(answer || "").trim().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.length <= maxWords;
}

// Defends against a malformed/incomplete AI response the same way
// normalizeCompletionType/normalizeSubPathway do in claude.js - drops
// individual bad questions rather than discarding an otherwise-fine
// passage/script over one fumbled field. Returns null (forcing the caller
// to fall back) only if too little survives to be a usable test.
// minQuestions: MIN_QUESTIONS_SPRINT for a 20-question sprint,
// MIN_QUESTIONS_DRILL for a 12-question drill (Task 13 - proportional to
// the new sizes; the old flat 3 let a heavily-dropped sprint silently
// become too short for a valid band estimate).
function cleanPayload(kind, raw, { minQuestions = MIN_QUESTIONS_SPRINT } = {}) {
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
      } else if (type === "matching") {
        // Matching (headings/features): the option list is the shared set of
        // headings; each question item picks exactly one. More options than
        // MC is normal (a heading bank), cap stays generous.
        options = Array.isArray(q.options) ? q.options.map(String).slice(0, 8) : null;
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
        category: String(q.category || "").trim().toLowerCase() || TYPE_CATEGORY_FALLBACK[type],
      };
    })
    .filter(Boolean)
    .slice(0, SPRINT_QUESTIONS);
  if (questions.length < minQuestions) return null;
  return { [bodyKey]: body, questions };
}

// Reading Half Diagnostic sprint validator - STRICT all-or-null, unlike
// the lenient cleanPayload above. Rationale: sprint content is cached for a
// whole week and served to every user (see weekly_reading_tests), so a
// payload with one silently-dropped question would ship a broken diagnostic
// to everyone for 7 days. Fail fast instead (same philosophy as
// listeningDiagnostic.js's validateAssessment) and let the route fall back
// without caching. Accepts the raw model JSON, returns a normalized
// { passage, blocks, questions } or null.
// opts.minPassageWords: 0 for the static fallback fixture (an honest
// keyless artifact, deliberately shorter than real generated content).
function cleanReadingSprintPayload(raw, { minPassageWords = PASSAGE_MIN_WORDS } = {}) {
  if (!raw || typeof raw !== "object") return null;

  // Passage: {title, paragraphs:[{label:"A", text}, ...]} - exactly 4
  // paragraphs labelled A-D in order, total word count within bounds.
  const p = raw.passage;
  if (!p || typeof p !== "object") return null;
  const title = String(p.title || "").trim();
  if (!title) return null;
  const rawParas = Array.isArray(p.paragraphs) ? p.paragraphs : [];
  if (rawParas.length !== PARAGRAPH_LABELS.length) return null;
  const paragraphs = [];
  for (let i = 0; i < PARAGRAPH_LABELS.length; i++) {
    const para = rawParas[i];
    const label = String(para?.label || "").trim().toUpperCase();
    const text = String(para?.text || "").trim();
    if (label !== PARAGRAPH_LABELS[i] || !text) return null;
    paragraphs.push({ label, text });
  }
  const wordCount = paragraphs.map((x) => x.text).join(" ").split(/\s+/).filter(Boolean).length;
  if (wordCount < minPassageWords || wordCount > PASSAGE_MAX_WORDS) return null;

  // Questions: exactly 20, ids q1-q20 in order, exact 5/5/5/5 block
  // structure. Type/options/answer rules are per block, stricter than
  // cleanPayload (correctAnswer must actually be answerable).
  const rawQs = Array.isArray(raw.questions) ? raw.questions : [];
  if (rawQs.length !== SPRINT_QUESTIONS) return null;
  const questions = [];
  for (let i = 0; i < SPRINT_QUESTIONS; i++) {
    const q = rawQs[i];
    if (!q || typeof q !== "object") return null;
    const block = READING_SPRINT_BLOCKS[Math.floor(i / READING_BLOCK_SIZE)];
    const id = `q${i + 1}`;
    if (String(q.id ?? id).trim() !== id) return null;
    const text = String(q.text || "").trim();
    if (!text) return null;
    const correctAnswer = String(q.correctAnswer ?? "").trim();
    if (!correctAnswer) return null;
    const out = {
      id, type: block.type, section: block.blockType, text, correctAnswer,
      explanation: String(q.explanation || "").trim().slice(0, 300),
      category: block.category,
    };
    if (block.type === "mc") {
      const options = Array.isArray(q.options) ? q.options.map((o) => String(o).trim()).filter(Boolean) : [];
      if (options.length < 3 || options.length > 4) return null;
      if (!options.some((o) => norm(o) === norm(correctAnswer))) return null;
      out.options = options;
    } else if (block.type === "tf") {
      out.options = ["True", "False", "Not Given"];
      if (!out.options.some((o) => norm(o) === norm(correctAnswer))) return null;
    } else if (block.type === "matching") {
      out.options = [...PARAGRAPH_LABELS];
      if (!out.options.some((o) => norm(o) === norm(correctAnswer))) return null;
    } else {
      // sentence_completion: the key (and every acceptable variant) must
      // itself respect the stated word limit - enforcing "NO MORE THAN TWO
      // WORDS" server-side, not just in the prompt.
      const maxWords = block.maxWords;
      if (!checkWordLimit(correctAnswer, maxWords)) return null;
      const acceptable = (Array.isArray(q.acceptableAnswers) ? q.acceptableAnswers : [])
        .map((a) => String(a).trim()).filter(Boolean);
      if (acceptable.some((a) => !checkWordLimit(a, maxWords))) return null;
      out.maxWords = maxWords;
      if (acceptable.length) out.acceptableAnswers = acceptable.slice(0, 4);
    }
    questions.push(out);
  }

  // blocks[] is always recomputed here (never trusted from the model):
  // instruction defaults live in READING_SPRINT_BLOCKS.
  const blocks = READING_SPRINT_BLOCKS.map((b, bi) => ({
    blockType: b.blockType,
    label: b.label,
    range: `${bi * READING_BLOCK_SIZE + 1}-${(bi + 1) * READING_BLOCK_SIZE}`,
    instruction: b.instruction,
    ...(b.maxWords ? { maxWords: b.maxWords } : {}),
    questionIds: questions.slice(bi * READING_BLOCK_SIZE, (bi + 1) * READING_BLOCK_SIZE).map((q) => q.id),
  }));

  return { passage: { title, paragraphs }, blocks, questions };
}

// Round 43: weekly LISTENING sprint validator - same strict all-or-null
// philosophy as cleanReadingSprintPayload above (content is cached for a
// whole week, one bad question ships to everyone). Normalizes to:
//   { recordings: [{recordingId, title, announcement, script}],
//     matchingLegend: [{letter, label} x5],
//     blocks, questions }
// opts.minScriptWords: 0 only for the module-load fallback conversion.
function cleanListeningSprintPayload(raw, { minScriptWords = SCRIPT_MIN_WORDS } = {}) {
  if (!raw || typeof raw !== "object") return null;

  const rawRecs = Array.isArray(raw.recordings) ? raw.recordings : [];
  if (rawRecs.length !== 2) return null;
  const recordings = [];
  for (let i = 0; i < 2; i++) {
    const r = rawRecs[i];
    const title = String(r?.title || "").trim();
    const announcement = String(r?.announcement || "").trim();
    const script = String(r?.script || "").trim();
    if (!title || !announcement || !script) return null;
    const words = script.split(/\s+/).filter(Boolean).length;
    if (words < minScriptWords || words > SCRIPT_MAX_WORDS) return null;
    recordings.push({ recordingId: i + 1, title, announcement, script });
  }

  const rawLegend = Array.isArray(raw.matchingLegend) ? raw.matchingLegend : [];
  if (rawLegend.length !== LEGEND_LETTERS.length) return null;
  const matchingLegend = [];
  for (let i = 0; i < LEGEND_LETTERS.length; i++) {
    const label = String(rawLegend[i]?.label || "").trim();
    if (String(rawLegend[i]?.letter || "").trim().toUpperCase() !== LEGEND_LETTERS[i] || !label) return null;
    matchingLegend.push({ letter: LEGEND_LETTERS[i], label });
  }

  const rawQs = Array.isArray(raw.questions) ? raw.questions : [];
  if (rawQs.length !== SPRINT_QUESTIONS) return null;
  const questions = [];
  for (let i = 0; i < SPRINT_QUESTIONS; i++) {
    const q = rawQs[i];
    if (!q || typeof q !== "object") return null;
    const block = LISTENING_SPRINT_BLOCKS[Math.floor(i / READING_BLOCK_SIZE)];
    const id = `q${i + 1}`;
    if (String(q.id ?? id).trim() !== id) return null;
    const text = String(q.text ?? q.prompt ?? "").trim();
    if (!text) return null;
    const correctAnswer = String(q.correctAnswer ?? "").trim();
    if (!correctAnswer) return null;
    const out = {
      id, type: block.type, section: block.blockType, recordingId: block.recordingId,
      text, correctAnswer,
      explanation: String(q.explanation || "").trim().slice(0, 300),
      category: block.category,
    };
    if (block.blockType === "multiple_choice") {
      // options are {letter, label} pairs (the lstn UI's own shape); the
      // stored correctAnswer is the LETTER, so grading stays a plain
      // norm-compare with no option lookup.
      const opts = Array.isArray(q.options) ? q.options : [];
      if (opts.length !== MC_LETTERS.length) return null;
      const options = [];
      for (let j = 0; j < MC_LETTERS.length; j++) {
        const label = String(opts[j]?.label || "").trim();
        if (String(opts[j]?.letter || "").trim().toUpperCase() !== MC_LETTERS[j] || !label) return null;
        options.push({ letter: MC_LETTERS[j], label });
      }
      if (!MC_LETTERS.includes(correctAnswer.toUpperCase())) return null;
      out.correctAnswer = correctAnswer.toUpperCase();
      out.options = options;
    } else if (block.blockType === "matching") {
      if (!LEGEND_LETTERS.includes(correctAnswer.toUpperCase())) return null;
      out.correctAnswer = correctAnswer.toUpperCase();
    } else {
      const maxWords = block.maxWords;
      if (!checkWordLimit(correctAnswer, maxWords)) return null;
      const acceptable = (Array.isArray(q.acceptableAnswers) ? q.acceptableAnswers : [])
        .map((a) => String(a).trim()).filter(Boolean);
      if (acceptable.some((a) => !checkWordLimit(a, maxWords))) return null;
      out.maxWords = maxWords;
      if (acceptable.length) out.acceptableAnswers = acceptable.slice(0, 4);
    }
    questions.push(out);
  }

  const blocks = LISTENING_SPRINT_BLOCKS.map((b, bi) => ({
    blockType: b.blockType,
    label: b.label,
    range: `${bi * READING_BLOCK_SIZE + 1}-${(bi + 1) * READING_BLOCK_SIZE}`,
    recordingId: b.recordingId,
    instruction: b.instruction,
    ...(b.maxWords ? { maxWords: b.maxWords } : {}),
    questionIds: questions.slice(bi * READING_BLOCK_SIZE, (bi + 1) * READING_BLOCK_SIZE).map((q) => q.id),
  }));

  return { recordings, matchingLegend, blocks, questions };
}

// What the client is allowed to see before submitting - the correctAnswer
// and explanation stay server-side (in days.practice_test_payload) until
// grading happens, so a curious look at the network tab can't just hand
// over the answer key. entryType/focusCategory ride along so the UI can
// label a DRILL differently from a SPRINT (Task 13).
function stripAnswers(payload) {
  const { questions, kind, track, passage, script, entryType, focusCategory, schemaVersion, weekKey, blocks, recordings, matchingLegend } = payload;
  return {
    kind, track,
    ...(entryType ? { entryType } : {}),
    ...(focusCategory ? { focusCategory } : {}),
    ...(schemaVersion ? { schemaVersion } : {}),
    ...(weekKey ? { weekKey } : {}),
    ...(passage != null ? { passage } : {}),
    ...(script != null ? { script } : {}),
    ...(blocks ? { blocks } : {}),
    // Listening v2: recordings (scripts are the content itself, spoken via
    // TTS - same "scripts are safe to ship" rule as listeningDiagnostic's
    // own stripAnswers) and the shared matching legend.
    ...(recordings ? { recordings } : {}),
    ...(matchingLegend ? { matchingLegend } : {}),
    // section/maxWords/recordingId ride along (v2 sprints) so the client can
    // render block chips, word-limit hints, and per-recording grouping;
    // correctAnswer/acceptableAnswers/explanation/category still never
    // leave the server pre-grading.
    questions: questions.map(({ id, type, text, options, section, maxWords, recordingId }) => ({
      id, type, text,
      ...(options ? { options } : {}),
      ...(section ? { section } : {}),
      ...(maxWords ? { maxWords } : {}),
      ...(recordingId ? { recordingId } : {}),
    })),
  };
}

// Case/whitespace-insensitive exact match for all question types - tolerant
// of minor typing differences on fill-in-the-blank, and harmless for
// mc/tf/matching since those compare against one of a small fixed option
// set. Task 13: also aggregates a per-category breakdown for Eleva Observed
// (deterministic - the AI never regroups its own grading).
function gradeAnswers(questions, answers) {
  const wrong = [];
  const categories = {};
  let correct = 0;
  for (const q of questions) {
    const given = (answers && answers[q.id]) ?? "";
    const cat = q.category || TYPE_CATEGORY_FALLBACK[q.type] || "lainnya";
    if (!categories[cat]) categories[cat] = { correct: 0, total: 0 };
    categories[cat].total += 1;
    // v2 additions, both no-ops for payloads that don't carry the fields:
    // acceptableAnswers widens the key (same convention as the listening
    // diagnostic), maxWords enforces the stated word limit - an over-limit
    // answer is wrong even if its words happen to contain the key.
    const keys = [q.correctAnswer, ...(Array.isArray(q.acceptableAnswers) ? q.acceptableAnswers : [])].map(norm);
    const withinLimit = !q.maxWords || checkWordLimit(given, q.maxWords);
    if (norm(given) !== "" && withinLimit && keys.includes(norm(given))) {
      correct += 1;
      categories[cat].correct += 1;
    } else {
      wrong.push({
        id: q.id, text: q.text,
        ...(q.section ? { section: q.section } : {}),
        yourAnswer: String(given || "").slice(0, 200),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || "",
      });
    }
  }
  return { correct, total: questions.length, wrong, categories };
}

// --- Task 13: band estimation (deterministic, never the AI) ---

// Public raw-score→band reference points for a 40-question test. Sprints
// are 20 questions (half of a real test), so the running score is projected
// to the 40 scale first. Linear interpolation between anchors; the same
// slope extends past the outer anchors, clamped to the 1-9 band scale.
const BAND_ANCHORS = [[15, 5], [23, 6], [30, 7], [35, 8]];

function estimateBand(totalCorrect, totalQuestions) {
  if (!totalQuestions || totalQuestions <= 0) return null;
  const ratio = Math.max(0, Math.min(1, totalCorrect / totalQuestions));
  const projectedRaw = Math.round(ratio * 40 * 10) / 10;
  let band;
  if (projectedRaw <= BAND_ANCHORS[0][0]) {
    const [r0, b0] = BAND_ANCHORS[0];
    const slope = (BAND_ANCHORS[1][1] - b0) / (BAND_ANCHORS[1][0] - r0);
    band = b0 - (r0 - projectedRaw) * slope;
  } else if (projectedRaw >= BAND_ANCHORS[BAND_ANCHORS.length - 1][0]) {
    const [rn, bn] = BAND_ANCHORS[BAND_ANCHORS.length - 1];
    const [rp, bp] = BAND_ANCHORS[BAND_ANCHORS.length - 2];
    const slope = (bn - bp) / (rn - rp);
    band = bn + (projectedRaw - rn) * slope;
  } else {
    for (let i = 0; i < BAND_ANCHORS.length - 1; i++) {
      const [r0, b0] = BAND_ANCHORS[i];
      const [r1, b1] = BAND_ANCHORS[i + 1];
      if (projectedRaw >= r0 && projectedRaw <= r1) {
        band = b0 + ((projectedRaw - r0) / (r1 - r0)) * (b1 - b0);
        break;
      }
    }
  }
  // Mid rounded to the nearest half-band, range ±0.5 - NEVER surfaced as a
  // single "IELTS Band Score: X.X" (Task 13 hard rule): callers must always
  // render rangeLow-rangeHigh + confidence together.
  const mid = Math.max(1, Math.min(9, Math.round(band * 2) / 2));
  return {
    mid,
    rangeLow: Math.max(1, Math.round((mid - 0.5) * 2) / 2),
    rangeHigh: Math.min(9, Math.round((mid + 0.5) * 2) / 2),
    projectedRaw,
  };
}

// Confidence purely from evidence volume - thresholds are deliberately
// standalone constants (retunable without migration, same pattern as the
// Decay/shortfall thresholds).
function confidenceLabel(totalQuestions) {
  if (totalQuestions >= 100) return "High";
  if (totalQuestions >= 20) return "Moderate";
  return "Low";
}

// Task 13: targetBand parsed deterministically from the goal's own text
// ("IELTS band 6.5" → 6.5). First number in the 1-9 range wins (with an
// optional .5). Falls back to 6.5 when the goal names no band - a default
// decision recorded in PRD section 25, overridable by the founder.
function parseTargetBand(goalText) {
  const matches = String(goalText || "").match(/\d(?:[.,]5)?/g) || [];
  for (const m of matches) {
    const v = parseFloat(m.replace(",", "."));
    if (v >= 1 && v <= 9) return v;
  }
  return 6.5;
}

// --- Task 13: per-track schema + migration ---

function emptyTrack() {
  return { level: 1, history: [], totalQuestions: 0, totalCorrect: 0 };
}

// Old flat shape ({level, history}) → {tracks:{reading,listening,writing,
// speaking}}. Old history entries are backfilled into their track from each
// entry's own testKind field (the entry field named `track` is
// academic/general - a different axis than Task 13's skill tracks).
// Already-migrated state passes through untouched. Never mutates its input.
function migrateState(practiceState) {
  if (practiceState && practiceState.tracks && typeof practiceState.tracks === "object") {
    const tracks = {};
    ALL_TRACKS.forEach((t) => {
      tracks[t] = { ...emptyTrack(), ...(practiceState.tracks[t] || {}) };
    });
    return { tracks };
  }
  const tracks = {};
  ALL_TRACKS.forEach((t) => { tracks[t] = emptyTrack(); });
  const oldHistory = Array.isArray(practiceState?.history) ? practiceState.history : [];
  for (const entry of oldHistory) {
    const t = OBJECTIVE_TRACKS.includes(entry?.testKind) ? entry.testKind : "reading";
    tracks[t].history.push({ ...entry, entryType: entry.entryType || "sprint" });
    tracks[t].totalQuestions += Number(entry?.total) || 0;
    tracks[t].totalCorrect += Number(entry?.score) || 0;
  }
  const oldLevel = Number(practiceState?.level) || 1;
  OBJECTIVE_TRACKS.forEach((t) => {
    if (tracks[t].history.length) tracks[t].level = oldLevel;
  });
  return { tracks };
}

// --- Task 13: status ladder (read-only compute from history, no new state,
// same principle as statTrends) ---
//
// Per-attempt band uses that attempt's own score/total. Window = last 4
// attempts. STABLE: ≥3 of the last 4 ≥ targetBand. MASTERED: the last two
// overlapping 4-attempt windows both STABLE (needs ≥5 attempts). EMERGING:
// at least one recent attempt reached the target. EXPOSED: attempts exist
// but none of the recent ones reached it (or fewer than a full window with
// nothing at target yet).
function windowStable(attempts, targetBand) {
  if (attempts.length < 4) return false;
  const hits = attempts.filter((a) => {
    const b = estimateBand(a.score, a.total);
    return b && b.mid >= targetBand;
  }).length;
  return hits >= 3;
}

function trackStatus(trackState, targetBand) {
  const history = trackState?.history || [];
  if (!history.length) return null; // untested - no ladder position yet
  const last4 = history.slice(-4);
  const prev4 = history.slice(-5, -1);
  if (windowStable(last4, targetBand) && windowStable(prev4, targetBand)) return "MASTERED";
  if (windowStable(last4, targetBand)) return "STABLE";
  const anyHit = last4.some((a) => {
    const b = estimateBand(a.score, a.total);
    return b && b.mid >= targetBand;
  });
  return anyHit ? "EMERGING" : "EXPOSED";
}

// --- Task 13: bottleneck-first current-target selection ---
//
// Among the objective tracks: an untested track is always the weakest
// (baseline must be established before anything can be stabilized);
// otherwise the lowest running band-estimate that isn't already
// STABLE/MASTERED wins; if every tested track is STABLE+, the lowest band
// among them stays the target (raising targetBand itself is a founder
// decision, not automatic). Returns null only when nothing is actionable
// (shouldn't happen for a practice-test goal).
function currentTargetFor(practiceState, goalText) {
  const { tracks } = migrateState(practiceState);
  const targetBand = parseTargetBand(goalText);
  const candidates = OBJECTIVE_TRACKS.map((t) => {
    const ts = tracks[t];
    const band = ts.totalQuestions > 0 ? estimateBand(ts.totalCorrect, ts.totalQuestions) : null;
    return { track: t, band, status: trackStatus(ts, targetBand) };
  });
  const untested = candidates.find((c) => !c.band);
  const pick = untested
    || candidates.filter((c) => c.status !== "STABLE" && c.status !== "MASTERED").sort((a, b) => a.band.mid - b.band.mid)[0]
    || candidates.sort((a, b) => a.band.mid - b.band.mid)[0];
  if (!pick) return null;
  const trackLabel = pick.track.charAt(0).toUpperCase() + pick.track.slice(1);
  // "Establish baseline" only while a track has no data at all - once any
  // attempt exists (even an EXPOSED one far below target), the goal is
  // stabilizing at the target band, not measuring from scratch.
  const establishing = !pick.band;
  return {
    track: pick.track,
    targetBand,
    label: establishing ? `Establish ${trackLabel} baseline` : `Stabilize ${trackLabel} at Band ${targetBand}`,
    approach: establishing
      ? `Kumpulkan cukup sprint ${trackLabel} dulu supaya baseline band-nya kebaca — belum soal ngejar angka.`
      : `Konsisten di sprint/drill ${trackLabel} sampai ≥3 dari 4 attempt terakhir mencapai band ${targetBand}.`,
  };
}

// Task 13: category strength split for Eleva Observed - pure aggregation
// over this attempt's grading breakdown. Thresholds standalone/retunable
// like the confidence ones.
const STRONG_ACCURACY = 0.8;
const UNSTABLE_ACCURACY = 0.6;
function categorySplit(categories) {
  const strong = [], unstable = [];
  for (const [cat, { correct, total }] of Object.entries(categories || {})) {
    if (!total) continue;
    const acc = correct / total;
    if (acc >= STRONG_ACCURACY) strong.push(cat);
    else if (acc <= UNSTABLE_ACCURACY) unstable.push(cat);
  }
  return { strong, unstable };
}

// Weakest category of THIS attempt (lowest accuracy at/below the unstable
// threshold) - becomes the track's nextDrill recommendation, or null when
// nothing qualifies (a clean sprint earns a fresh sprint next time).
function weakestCategory(categories) {
  let worst = null;
  for (const [cat, { correct, total }] of Object.entries(categories || {})) {
    if (!total) continue;
    const acc = correct / total;
    if (acc <= UNSTABLE_ACCURACY && (!worst || acc < worst.acc)) worst = { category: cat, acc };
  }
  return worst ? worst.category : null;
}

module.exports = {
  cleanPayload, cleanReadingSprintPayload, cleanListeningSprintPayload, checkWordLimit, stripAnswers, gradeAnswers,
  READING_SPRINT_BLOCKS, LISTENING_SPRINT_BLOCKS, READING_BLOCK_SIZE, PARAGRAPH_LABELS,
  estimateBand, confidenceLabel, parseTargetBand,
  migrateState, trackStatus, currentTargetFor, categorySplit, weakestCategory,
  SPRINT_QUESTIONS, DRILL_QUESTIONS, MIN_QUESTIONS_SPRINT, MIN_QUESTIONS_DRILL,
  OBJECTIVE_TRACKS,
};
