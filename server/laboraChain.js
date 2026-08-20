// LABORA Chain (labora-chain completionType, founder request 19 Agustus):
// one daily LIVELIHOOD quest carries 2-3 LABORA feature steps completed in
// sequence (Video Quest -> Job Match -> Submit Application) so goal
// progress moves faster than one-feature-per-day. Pure deterministic
// module, same anti-Goodhart split as practiceTest.js/videoQuiz.js: the AI
// only ever proposes WHICH steps; everything about ordering, gating,
// advancing, and skipping is decided here in code.
//
// Persisted shape (quest.laboraChain, patched via db.updateQuestProgress -
// the same client-visible mid-quest channel as quest.videoQuizState):
// {
//   currentIndex: 0,
//   steps: [{ feature: "video-quiz"|"job-match-analysis"|"job-application-submit",
//             status: "active"|"pending"|"done"|"skipped",
//             result: <small per-feature summary>|null, note: string|null }]
// }
// Step results are small honest summaries: video-quiz = the pass summary
// (topic/score/concepts), job-match-analysis = the full clean result (the
// qualified gate and the final reflection both need it), submit = the
// clean jobApplicationSubmit object. The chain quest's days.reflection
// stays NULL until the LAST step - only completeLaboraChain (index.js)
// ever calls saveReflection for a chain.

// Canonical order = array order: learn first, prove match second, apply
// third. normalizeChain re-sorts whatever the model emitted into this.
const CHAIN_FEATURES = ["video-quiz", "job-match-analysis", "job-application-submit"];
const MIN_STEPS = 2;
const MAX_STEPS = 3;

// Defense-in-depth over the model's proposed steps (same philosophy as
// normalizePracticeTestSchema): unknown features dropped, duplicates
// deduped, canonical order enforced, submit dropped unless it can ever be
// legitimately completed (an in-chain job-match precedes it, or the
// system-computed jobMatchHint already marked the last analysis qualified).
// Returns an initialized chain, or null when fewer than MIN_STEPS survive
// (caller downgrades the quest to a plain single-feature type).
function normalizeChain(rawSteps, { jobMatchHintQualified = false } = {}) {
  const seen = new Set();
  for (const s of Array.isArray(rawSteps) ? rawSteps : []) {
    const feature = String(s?.feature || "").trim();
    if (CHAIN_FEATURES.includes(feature)) seen.add(feature);
  }
  let features = CHAIN_FEATURES.filter((f) => seen.has(f));
  if (features.includes("job-application-submit")
    && !features.includes("job-match-analysis")
    && jobMatchHintQualified !== true) {
    features = features.filter((f) => f !== "job-application-submit");
  }
  features = features.slice(0, MAX_STEPS);
  if (features.length < MIN_STEPS) return null;
  return {
    currentIndex: 0,
    steps: features.map((feature, i) => ({
      feature, status: i === 0 ? "active" : "pending", result: null, note: null,
    })),
  };
}

function currentStep(chain) {
  return chain?.steps?.[chain.currentIndex] || null;
}

function inChainJobMatch(chain) {
  return (chain?.steps || []).find((s) => s.feature === "job-match-analysis")?.result || null;
}

// Marks the current step done with its result, advances, and auto-skips a
// submit step whose in-chain job-match came out unqualified - the user
// must never be stuck on a step that can't be completed (the next daily
// quest steers skill-building via jobMatchHint instead). Returns a NEW
// chain object plus whether the whole chain is finished.
function advanceChain(chain, stepResult) {
  const next = {
    currentIndex: chain.currentIndex,
    steps: chain.steps.map((s) => ({ ...s })),
  };
  const cur = next.steps[next.currentIndex];
  if (cur) {
    cur.status = "done";
    cur.result = stepResult ?? null;
  }
  next.currentIndex += 1;
  while (next.currentIndex < next.steps.length) {
    const step = next.steps[next.currentIndex];
    const jm = inChainJobMatch(next);
    if (step.feature === "job-application-submit" && jm && jm.qualified !== true) {
      step.status = "skipped";
      step.note = "Job Match belum lolos (qualified=false) — langkah submit dilewati otomatis supaya quest tidak macet.";
      next.currentIndex += 1;
      continue;
    }
    step.status = "active";
    break;
  }
  return { chain: next, completed: next.currentIndex >= next.steps.length };
}

// Compact per-step lines for processReflection's ctx and the persisted
// reflection.laboraChainResult - one human-readable headline per step.
function chainSummary(chain) {
  return (chain?.steps || []).map((s) => {
    let headline = "";
    if (s.status === "skipped") headline = s.note || "dilewati";
    else if (s.status !== "done") headline = "belum dikerjakan";
    else if (s.feature === "video-quiz") headline = `lulus ${s.result?.score}/${s.result?.total} (attempt ${s.result?.attempt || 1}) topik "${s.result?.topic || ""}"`;
    else if (s.feature === "job-match-analysis") headline = `matchScore ${s.result?.matchScore ?? "?"}, ${s.result?.qualified ? "qualified" : "belum qualified"}`;
    else if (s.feature === "job-application-submit") headline = `lamaran ke ${s.result?.companyName || "?"} untuk ${s.result?.roleTitle || "?"}`;
    return { feature: s.feature, status: s.status, headline };
  });
}

module.exports = {
  CHAIN_FEATURES, MIN_STEPS, MAX_STEPS,
  normalizeChain, currentStep, inChainJobMatch, advanceChain, chainSummary,
};
