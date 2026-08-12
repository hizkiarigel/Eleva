// Fokus 2.2/2.3 (UPDATE_PROMPT 10 Agustus): "Target Berikutnya" for
// structured-physical goals. A target is a persistent (per-goal, not
// per-quest) numeric milestone - deliberately kept as plain comparable
// numbers (same shape as server/structured.js's clean output), not a free
// label alone, so "sudah tercapai?" can be checked deterministically
// instead of asking the AI to judge it fresh every time.

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Validates/cleans a target's numeric metrics - used both for AI-generated
// options (A/B) and the user's manual override (C), same rules either way.
function cleanTargetMetrics(kind, m) {
  if (!m || typeof m !== "object") return null;
  if (kind === "cardio") {
    const jarakKm = num(m.jarakKm);
    const paceMinPerKm = num(m.paceMinPerKm);
    if (jarakKm == null || jarakKm <= 0 || jarakKm > 200) return null;
    if (paceMinPerKm == null || paceMinPerKm <= 0 || paceMinPerKm > 60) return null;
    return { jarakKm, paceMinPerKm };
  }
  if (kind === "gym") {
    const set = num(m.set);
    const repetisi = num(m.repetisi);
    const bebanKg = m.bebanKg === "" || m.bebanKg == null ? null : num(m.bebanKg);
    if (set == null || set <= 0 || set > 50) return null;
    if (repetisi == null || repetisi <= 0 || repetisi > 500) return null;
    if (bebanKg != null && (bebanKg < 0 || bebanKg > 500)) return null;
    return { set, repetisi, ...(bebanKg != null ? { bebanKg } : {}) };
  }
  // Task 14: Livelihood Milestone #1 - a fixed count target (always 10, per
  // founder decision), unlike cardio/gym's user-picked numbers. currentCount
  // only ever moves via the job-application-submit route's server-side
  // increment, never client-supplied directly - but this function still
  // validates the shape (used both for the initial auto-created target and
  // for re-validating it on every read).
  if (kind === "qualified-applications") {
    const targetCount = num(m.targetCount);
    const currentCount = num(m.currentCount);
    if (targetCount == null || targetCount <= 0 || targetCount > 1000) return null;
    if (currentCount == null || currentCount < 0) return null;
    return { targetCount, currentCount };
  }
  // Task 14 point 7: Livelihood Milestone #2+ - once 10 qualified
  // applications is reached, the next milestone is a funnel metric (response
  // rate, interview->offer conversion, or a manual write-in), not another
  // fixed count. Kept generic (label + target/current value) rather than
  // enumerating specific funnel stages in code.
  if (kind === "livelihood-funnel") {
    const metricLabel = String(m.metricLabel || "").trim();
    const targetValue = num(m.targetValue);
    const currentValue = m.currentValue == null ? 0 : num(m.currentValue);
    if (!metricLabel) return null;
    if (targetValue == null || targetValue <= 0 || targetValue > 100000) return null;
    if (currentValue == null || currentValue < 0) return null;
    return { metricLabel: metricLabel.slice(0, 80), targetValue, currentValue };
  }
  return null;
}

function formatTargetLabel(kind, m) {
  if (kind === "cardio") {
    const mm = Math.floor(m.paceMinPerKm);
    const ss = Math.round((m.paceMinPerKm - mm) * 60);
    return `${m.jarakKm}km @ ${mm}:${String(ss).padStart(2, "0")}/km`;
  }
  if (kind === "qualified-applications") {
    return `${m.targetCount} Qualified Applications (${m.currentCount}/${m.targetCount})`;
  }
  if (kind === "livelihood-funnel") {
    return `${m.metricLabel} (${m.currentValue}/${m.targetValue})`;
  }
  return `${m.set}×${m.repetisi}${m.bebanKg != null ? ` @ ${m.bebanKg}kg` : ""}`;
}

// A goal's quest for a distance activity without jarakKm has no pace to
// target against - the whole A/B/C screen has nothing meaningful to offer,
// so callers skip it entirely rather than force a target on a numberless day.
function canTarget(kind, actual) {
  if (kind === "cardio") return actual && actual.jarakKm != null && actual.durasiMenit > 0;
  if (kind === "gym") return Boolean(actual);
  return false;
}

// 2% pace tolerance absorbs rounding in the derived pace display, not a
// deliberate leniency toward the target itself.
// Task 14: cardio/gym compare a fixed target against a FRESH daily
// submission (`actual`, a separate object) - Livelihood's count/funnel
// targets carry their own running total INSIDE the target itself (updated in
// place by the job-application-submit route), so there's no separate
// `actual` to pass; `actual` is simply omitted/ignored for those two kinds.
// No rounding tolerance for the count kind (unlike cardio's 2% pace
// leniency) - a count either reached 10 or it didn't.
function targetReached(kind, target, actual) {
  if (!target) return false;
  if (kind === "qualified-applications") return target.currentCount >= target.targetCount;
  if (kind === "livelihood-funnel") return target.currentValue >= target.targetValue;
  if (!actual) return false;
  if (kind === "cardio") {
    if (actual.jarakKm == null || !actual.durasiMenit) return false;
    const actualPace = actual.durasiMenit / actual.jarakKm;
    return actual.jarakKm >= target.jarakKm && actualPace <= target.paceMinPerKm * 1.02;
  }
  if (kind === "gym") {
    const actualVolume = (actual.set || 0) * (actual.repetisi || 0);
    const targetVolume = target.set * target.repetisi;
    const bebanOk = target.bebanKg == null || (actual.bebanKg || 0) >= target.bebanKg;
    return actualVolume >= targetVolume && bebanOk;
  }
  return false;
}

module.exports = { cleanTargetMetrics, formatTargetLabel, canTarget, targetReached };
