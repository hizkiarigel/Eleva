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

function norm(v) {
  return String(v ?? "").trim().toLowerCase();
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

// What the client is allowed to see before submitting - the correctAnswer
// and explanation stay server-side (in days.practice_test_payload) until
// grading happens, so a curious look at the network tab can't just hand
// over the answer key. entryType/focusCategory ride along so the UI can
// label a DRILL differently from a SPRINT (Task 13).
function stripAnswers(payload) {
  const { questions, kind, track, passage, script, entryType, focusCategory } = payload;
  return {
    kind, track,
    ...(entryType ? { entryType } : {}),
    ...(focusCategory ? { focusCategory } : {}),
    ...(passage != null ? { passage } : {}),
    ...(script != null ? { script } : {}),
    questions: questions.map(({ id, type, text, options }) => ({ id, type, text, ...(options ? { options } : {}) })),
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
    if (norm(given) === norm(q.correctAnswer)) {
      correct += 1;
      categories[cat].correct += 1;
    } else {
      wrong.push({
        id: q.id, text: q.text,
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
  cleanPayload, stripAnswers, gradeAnswers,
  estimateBand, confidenceLabel, parseTargetBand,
  migrateState, trackStatus, currentTargetFor, categorySplit, weakestCategory,
  SPRINT_QUESTIONS, DRILL_QUESTIONS, MIN_QUESTIONS_SPRINT, MIN_QUESTIONS_DRILL,
  OBJECTIVE_TRACKS,
};
