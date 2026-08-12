// META Inner Realm target-recommendation flow (12 Agustus follow-up to the
// world-map redesign). Founder feedback: the map should show WHAT the user
// is chasing (a target derived from their real goals), not WHICH tool they'd
// use to chase it - "World Map shows Target. Realm page shows Tools." A
// realm's card is one of three states:
//   - "active"     - the user has explicitly approved a goalIndex as this
//                     realm's target (see db.setMetaActiveTarget). Never set
//                     automatically just because a goal/target exists.
//   - "recommend"  - a goal already exists whose target/practice-test data
//                     clearly belongs to this realm, but hasn't been
//                     approved for META yet - shown as "Eleva menyarankan..."
//                     with an approve action (POST /api/meta/target/confirm).
//   - "empty"      - no goal in this domain at all - shown as "No active
//                     target" with a CTA to add one (POST /api/goals).
// This module never invents a target's numbers - it only reads what
// server/targets.js (goalTargets) and server/practiceTest.js (band
// estimates) already computed and stored.

const practiceTestLib = require("./practiceTest");

const REALMS = ["soma", "lingua", "labora"];

// A goal's realm is inferred from the KIND of data that already exists for
// its goalIndex - goals don't carry an explicit domain tag anywhere in this
// app today, so this is a read of existing signal, not a new field.
function domainForGoalIndex(state, goalIndex) {
  const gt = (state.goalTargets || {})[String(goalIndex)];
  if (gt?.kind === "cardio" || gt?.kind === "gym") return "soma";
  if (gt?.kind === "qualified-applications" || gt?.kind === "livelihood-funnel") return "labora";
  const pt = (state.practiceTest || {})[String(goalIndex)];
  if (pt && (pt.tracks || (Array.isArray(pt.history) && pt.history.length))) return "lingua";
  return null;
}

function goalCardTitle(goalText) {
  const t = String(goalText || "").trim();
  return t.length > 42 ? `${t.slice(0, 41)}…` : t;
}

function clampPct(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// SOMA's cardio/gym targets are a fixed number to reach, not a running
// total the way Livelihood's qualified-applications/livelihood-funnel are
// (see targets.js's own comment on targetReached) - this app has never
// tracked a persistent "current" for them anywhere else either. The closest
// real, non-invented approximation is the goal's most recent structured-
// physical submission, compared against the stored target.
async function somaProgress(db, userId, goalIndex, target) {
  const recent = await db.recentDays(userId, { goalIndex, limit: 5 });
  const last = recent.find((d) => d.reflection?.structuredData?.kind === target.kind);
  if (!last) return { subtitle: target.label, pct: 0 };
  const sd = last.reflection.structuredData;
  if (target.kind === "cardio" && sd.jarakKm != null) {
    return { subtitle: `${sd.jarakKm} / ${target.metrics.jarakKm} km`, pct: clampPct((sd.jarakKm / target.metrics.jarakKm) * 100) };
  }
  if (target.kind === "gym" && sd.set != null && sd.repetisi != null) {
    const actualVolume = sd.set * sd.repetisi;
    const targetVolume = target.metrics.set * target.metrics.repetisi;
    return { subtitle: `${actualVolume} / ${targetVolume} volume`, pct: clampPct((actualVolume / targetVolume) * 100) };
  }
  return { subtitle: target.label, pct: 0 };
}

function laboraProgress(target) {
  const m = target.metrics || {};
  if (target.kind === "qualified-applications") {
    return { subtitle: target.label, pct: clampPct((m.currentCount / m.targetCount) * 100) };
  }
  if (target.kind === "livelihood-funnel") {
    return { subtitle: target.label, pct: clampPct((m.currentValue / m.targetValue) * 100) };
  }
  return { subtitle: target.label, pct: 0 };
}

function linguaProgress(state, goalIndex, goalText) {
  const pt = (state.practiceTest || {})[String(goalIndex)];
  const ct = practiceTestLib.currentTargetFor(pt, goalText);
  return { subtitle: ct ? ct.label : "Belum ada data", pct: 0 };
}

async function progressFor(db, userId, state, realm, goalIndex) {
  const goalText = (state.goals || [])[goalIndex];
  if (realm === "lingua") return linguaProgress(state, goalIndex, goalText);
  const target = (state.goalTargets || {})[String(goalIndex)];
  if (!target) return { subtitle: "Belum ada target tersimpan", pct: 0 };
  if (realm === "soma") return somaProgress(db, userId, goalIndex, target);
  return laboraProgress(target);
}

// Composes the world-map card data for one realm. `db` is passed in (not
// required at module scope) purely so tests/nutrition-style unit tests can
// stub it without booting Postgres.
async function cardForRealm(db, userId, state, realm) {
  const goals = state.goals || [];
  const activeIndex = (state.metaActiveTargets || {})[realm];
  if (activeIndex != null && goals[activeIndex] != null && domainForGoalIndex(state, activeIndex) === realm) {
    const { subtitle, pct } = await progressFor(db, userId, state, realm, activeIndex);
    return { status: "active", goalIndex: activeIndex, title: goalCardTitle(goals[activeIndex]), subtitle, pct };
  }
  // Recommend the earliest goal whose inferred domain matches this realm and
  // isn't already claimed as another realm's active target.
  const claimed = new Set(Object.values(state.metaActiveTargets || {}));
  const candidateIndex = goals.findIndex((g, i) => domainForGoalIndex(state, i) === realm && !claimed.has(i));
  if (candidateIndex !== -1) {
    const { subtitle, pct } = await progressFor(db, userId, state, realm, candidateIndex);
    return { status: "recommend", goalIndex: candidateIndex, title: goalCardTitle(goals[candidateIndex]), subtitle, pct };
  }
  return { status: "empty" };
}

module.exports = { REALMS, domainForGoalIndex, cardForRealm };
