// Multi-Domain Quest Hub (design handoff, 19 Agustus): deterministic
// validation for a quest that requires completing BOTH a Recovery AND a
// Nutrition sub-flow, in either order, before it resolves - "evidence, not
// checkboxes" per the handoff, same code-enforced-completeness principle as
// structured.js/nutritionEntry.js. This module is the first (and for now
// only) template the pattern ships with: BODY domain, primaryFeature
// RECOVERY, supportingFeatures [NUTRITION]. Kept as its own module so the
// requirement/completion rules are unit-testable without booting the HTTP
// server, same rationale as every other deterministic-validation module in
// this codebase.
//
// Deliberately its own field vocabulary (sleep/energy/soreness/
// recovery_session, protein/hydration/meals) - NOT the same fields as the
// pre-existing single-domain recovery form (durasiTidurJam/asupanAirGelas/
// makanProtein/levelNyeri, server/structured.js) or the pre-existing
// nutrition-log PROGRESSIVE system (calories/protein/carbohydrates/fat,
// server/nutrition.js). Those two systems stay exactly as they are, used by
// their own quest types; this Hub is a parallel, simpler surface built
// specifically for this design's screens, not a wrapper around either.

const RECOVERY_REQUIREMENTS = [
  { id: "sleep", required: true },
  { id: "energy", required: true },
  { id: "soreness", required: true },
  { id: "recovery_session", required: true },
];
const NUTRITION_REQUIREMENTS = [
  { id: "protein", required: true },
  { id: "hydration", required: true },
  { id: "meals", required: true },
];

const SLEEP_OPTIONS = ["Kurang", "Cukup", "Baik"];
const ENERGY_OPTIONS = ["Rendah", "Normal", "Tinggi"];
const SORENESS_OPTIONS = ["Tidak ada", "Ringan", "Berat"];
const RECOVERY_SESSION_OPTIONS = ["Jalan pemulihan", "Stretching", "Mobility", "Meditasi"];

// Fixed targets (handoff screenshots: "0 / 80g", "0 / 2.5L", "0 / 3") - not
// AI-set, unlike nutrition-log's AI-chosen primaryMetric/targetValue.
const NUTRITION_TARGETS = { protein: 80, hydration: 2.5, meals: 3 };

// Canonical hand-authored content for the one use case this pattern ships
// with. generateQuest may propose a multi-domain quest, but its
// title/description/featureRequirements are always coerced back to this
// exact shape server-side (server/claude.js's normalizeMultiDomainQuest) -
// never trusted verbatim - since the ids below must match this module's
// validation exactly or Hub completion can never be computed.
const RECOVERY_NUTRITION_TEMPLATE = {
  title: "Hari Bayar Balik Tubuh",
  description: "Hari ini fokus pulih. Lengkapi kebutuhan recovery dan nutrition yang relevan untuk tubuhmu.",
  why: "Growth fisik bukan cuma soal gerak - tubuh yang nggak pernah dikasih waktu pulih dan nggak pernah dikasih bahan bakar yang cukup akan mentok duluan sebelum progresnya kelihatan.",
  statFocus: "body",
  domain: "BODY",
  primaryFeature: "RECOVERY",
  supportingFeatures: ["NUTRITION"],
  featureRequirements: { RECOVERY: RECOVERY_REQUIREMENTS, NUTRITION: NUTRITION_REQUIREMENTS },
  // Short 2-3 word phrase for the Home screen's "Tujuan" preview tile
  // (design handoff's 01-01-home.png) - kept as template-owned content,
  // same reasoning as title/description/why above, rather than hardcoded
  // client-side where it'd be disconnected from this template.
  tujuanSingkat: "Pulih & bertenaga",
};

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Partial saves allowed (brief: "Saves whatever is filled") - only the
// fields actually present in the payload are validated/returned, never
// require all 4 at once. An unknown key is silently dropped, not errored.
function validateRecoveryPatch(data) {
  if (!data || typeof data !== "object") return { ok: false, error: "Data recovery kosong." };
  const clean = {};
  if (data.sleep != null && data.sleep !== "") {
    if (!SLEEP_OPTIONS.includes(data.sleep)) return { ok: false, error: "Pilih tidur semalam: Kurang, Cukup, atau Baik." };
    clean.sleep = data.sleep;
  }
  if (data.energy != null && data.energy !== "") {
    if (!ENERGY_OPTIONS.includes(data.energy)) return { ok: false, error: "Pilih energi: Rendah, Normal, atau Tinggi." };
    clean.energy = data.energy;
  }
  if (data.soreness != null && data.soreness !== "") {
    if (!SORENESS_OPTIONS.includes(data.soreness)) return { ok: false, error: "Pilih soreness: Tidak ada, Ringan, atau Berat." };
    clean.soreness = data.soreness;
  }
  if (data.recovery_session != null && data.recovery_session !== "") {
    if (!RECOVERY_SESSION_OPTIONS.includes(data.recovery_session)) return { ok: false, error: "Pilih jenis recovery session yang valid." };
    clean.recovery_session = data.recovery_session;
  }
  if (!Object.keys(clean).length) return { ok: false, error: "Isi minimal satu field dulu." };
  return { ok: true, clean };
}

function validateNutritionPatch(data) {
  if (!data || typeof data !== "object") return { ok: false, error: "Data nutrition kosong." };
  const clean = {};
  if (data.protein != null && data.protein !== "") {
    const n = num(data.protein);
    if (n == null || n < 0 || n > 300) return { ok: false, error: "Protein di luar rentang wajar (0-300g) - cek lagi angkanya." };
    clean.protein = n;
  }
  if (data.hydration != null && data.hydration !== "") {
    const n = num(data.hydration);
    if (n == null || n < 0 || n > 10) return { ok: false, error: "Hidrasi di luar rentang wajar (0-10L) - cek lagi angkanya." };
    clean.hydration = n;
  }
  if (data.meals != null && data.meals !== "") {
    const n = num(data.meals);
    if (n == null || !Number.isInteger(n) || n < 0 || n > 10) return { ok: false, error: "Meals dicatat wajib angka bulat 0-10." };
    clean.meals = n;
  }
  if (!Object.keys(clean).length) return { ok: false, error: "Isi minimal satu field dulu." };
  return { ok: true, clean };
}

// "Evidence, not checkboxes" (handoff): a feature is COMPLETE only when
// every REQUIRED id for it has a recorded (non-null/undefined) value -
// derived fresh from the recorded data every time, never an independently-
// settable flag that could drift out of sync with what's actually there.
function computeFeatureState(requirements, recordedData) {
  const data = recordedData || {};
  const requiredIds = requirements.filter((r) => r.required).map((r) => r.id);
  const recordedCount = requiredIds.filter((id) => data[id] != null).length;
  if (recordedCount === 0) return "NOT_STARTED";
  if (recordedCount === requiredIds.length) return "COMPLETE";
  return "IN_PROGRESS";
}

// "N dari M tercatat" - the exact fraction the Hub card's bukti-ring shows.
function countRecorded(requirements, recordedData) {
  const data = recordedData || {};
  const requiredIds = requirements.filter((r) => r.required).map((r) => r.id);
  return { recorded: requiredIds.filter((id) => data[id] != null).length, total: requiredIds.length };
}

// Quest-level status, same "always derived, never independently settable"
// rule as computeFeatureState - order-independent by construction (just
// checks that every feature in [primary, ...supporting] is COMPLETE,
// doesn't care which one got there first).
function computeQuestStatus(featureStateByKey, primaryFeature, supportingFeatures) {
  const keys = [primaryFeature, ...supportingFeatures];
  if (keys.every((k) => featureStateByKey[k] === "COMPLETE")) return "READY_TO_COMPLETE";
  if (keys.some((k) => featureStateByKey[k] && featureStateByKey[k] !== "NOT_STARTED")) return "IN_PROGRESS";
  return "NOT_STARTED";
}

module.exports = {
  RECOVERY_REQUIREMENTS, NUTRITION_REQUIREMENTS,
  SLEEP_OPTIONS, ENERGY_OPTIONS, SORENESS_OPTIONS, RECOVERY_SESSION_OPTIONS,
  NUTRITION_TARGETS, RECOVERY_NUTRITION_TEMPLATE,
  validateRecoveryPatch, validateNutritionPatch,
  computeFeatureState, countRecorded, computeQuestStatus,
};
