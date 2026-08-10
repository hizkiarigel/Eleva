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
  return null;
}

function formatTargetLabel(kind, m) {
  if (kind === "cardio") {
    const mm = Math.floor(m.paceMinPerKm);
    const ss = Math.round((m.paceMinPerKm - mm) * 60);
    return `${m.jarakKm}km @ ${mm}:${String(ss).padStart(2, "0")}/km`;
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
function targetReached(kind, target, actual) {
  if (!target || !actual) return false;
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
