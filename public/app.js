// 7 MECE stats (Bible v1.5): Mind+Explorer merged into Growth (Openness &
// Intellect are one Big Five factor), Career+Finance merged into Livelihood
// (salary is core to the research definition of career success), Autonomy
// added (SDT - the Collectively-Exhaustive gap for an audience that lost
// direction).
const STAT_ORDER = [
  ["body", "Body"], ["growth", "Growth"], ["livelihood", "Livelihood"],
  ["emotional", "Emotional Stability"], ["social", "Social"], ["purpose", "Purpose"], ["autonomy", "Autonomy"],
];
// Pre-MECE accounts (8-element era) keep their stored stats keys until they
// reset & re-onboard - display labels only, deliberately NOT a data
// migration (per PRD: founder resets, nobody else has real data).
const LEGACY_STAT_LABELS = { mind: "Mind", career: "Career", finance: "Finance", explorer: "Explorer" };
function statLabel(key) {
  return STAT_ORDER.find((s) => s[0] === key)?.[1] || LEGACY_STAT_LABELS[key] || key;
}

// Bible v1.7: Pathway = gaya berinteraksi dengan dunia (tahan lama, soal
// perilaku), BUKAN fase/masalah hidup (itu tugas Chapter, lihat PRD riwayat
// v8/Bible v1.7 Bab 13) - deskripsi di bawah sengaja tidak menyebut apa pun
// soal pemulihan emosional/"belum tahu arah", itu pattern lama yang direvisi.
const PATHWAY_DESC = {
  Architect: "Membangun & menyusun sesuatu secara metodis, langkah demi langkah terlihat.",
  Warden: "Menjaga & mempertahankan — fokus ke konsistensi, jadi fondasi yang bisa diandalkan.",
  Weaver: "Menghubungkan orang & ide — fokus ke jaringan dan memfasilitasi koneksi.",
  Pilgrim: "Menjelajah luas secara sengaja sebelum berkomitmen — gaya eksploratif, bukan tersesat.",
  Specialist: "Menyelam dalam ke satu domain spesifik yang tidak masuk kategori umum.",
};
const PATHWAY_NAMES = Object.keys(PATHWAY_DESC);

// v14 bug fix: the goal-input placeholders were the founder's OWN literal
// examples from the PRD ("Punya badan sehat", "IELTS band 6.5", ...) -
// those were illustration for writing the PRD, never meant to be hardcoded
// verbatim into the app for every single user (founder caught this in
// testing - the placeholder was identical to their own real goal). Fixed
// with per-Pathway generic placeholders instead - static/hardcoded, no new
// API call, matching the gaya of each Pathway.
const PATHWAY_GOAL_PLACEHOLDER = {
  Architect: "mis. Selesaikan portofolio 5 proyek dalam 3 bulan",
  Warden: "mis. Konsisten olahraga 4x seminggu tanpa putus",
  Weaver: "mis. Bangun ulang koneksi dengan 5 teman lama",
  Pilgrim: "mis. Coba 3 jalur karier berbeda sebelum memutuskan satu",
};
// Specialist has no fixed placeholder by design (the whole point is a
// user-defined domain) - PRD's own worked example: "Sales" -> a sales-shaped
// placeholder. Tiny static hint table, NOT an AI call; anything unmatched
// falls through to the neutral template using the user's own words.
const SPECIALIST_GOAL_HINTS = {
  sales: "mis. Closing 5 klien baru bulan ini",
  desain: "mis. Selesaikan 3 project desain untuk portofolio",
  "desain grafis": "mis. Selesaikan 3 project desain untuk portofolio",
  coding: "mis. Rilis 1 proyek pribadi yang bisa dipakai orang lain",
  programming: "mis. Rilis 1 proyek pribadi yang bisa dipakai orang lain",
  marketing: "mis. Jalankan 3 campaign kecil dan bandingkan hasilnya",
  konten: "mis. Konsisten posting konten 3x seminggu selama sebulan",
};
function goalPlaceholder(pendingPathway) {
  if (!pendingPathway) return "mis. Target konkret 14 hari ke depan";
  const { pathway, pathwayNoun } = pendingPathway;
  if (PATHWAY_GOAL_PLACEHOLDER[pathway]) return PATHWAY_GOAL_PLACEHOLDER[pathway];
  // Specialist (canonical, from a carousel card) or a free-typed override -
  // probe whichever text actually names the domain (override: pathway IS
  // the custom text; canonical Specialist card: pathwayNoun is the AI's
  // inferred role, e.g. "Closer" for a sales context).
  const probe = (pathway !== "Specialist" ? pathway : pathwayNoun || "").toLowerCase().trim();
  if (SPECIALIST_GOAL_HINTS[probe]) return SPECIALIST_GOAL_HINTS[probe];
  const label = pathway && pathway !== "Specialist" ? pathway : (pathwayNoun && pathwayNoun !== "Specialist" ? pathwayNoun : "spesialisasimu");
  return `mis. ${label}, target konkret 14 hari ke depan`;
}

// Task 8: contextual help - one small "?" top-right on the four listed
// onboarding screens + the daily dashboard. Copy is STATIC per screen
// (written once, plain language, no unexplained RPG jargon) - deliberately
// not AI-generated: mechanics are the same for everyone, so a fixed human-
// written text is cheaper and more controllable than a per-call generation.
// The radar/card/carousel/dashboard texts are the PRD's own examples.
const HELP_TEXT = {
  radar: "Ini cara Eleva kenalan sama fokus hidupmu sekarang. Tarik titik-titiknya sesuai porsi yang kamu rasa — nggak ada jawaban benar/salah. Kalau ada sisi yang kamu yakin banget dan nggak mau ikut bergeser, tap titiknya untuk mengunci (maksimal 3).",
  card: "Beberapa skenario singkat. Pilih yang paling & paling nggak kamu banget — dari situ Eleva mulai ngerti pola kamu. Jawab jujur aja, nggak ada jawaban salah.",
  analysis: "3 gaya yang mungkin cocok buat kamu, berdasarkan yang barusan kamu isi. Pilih salah satu, atau tulis sendiri kalau ngerasa nggak ada yang pas — bisa diganti nanti.",
  goals: "Tulis 1-3 hal yang mau kamu capai selama 14 hari ke depan — boleh dari area mana pun (badan, belajar, kerjaan, relasi). Tugas harianmu nanti diarahkan ke sini, gantian tiap harinya.",
  dashboard: "Quest hari ini dari Eleva, disesuaikan sama fokusmu. Selesaikan lalu tandai/isi datanya buat lihat progresmu.",
};
let helpOpen = null; // screen key whose help sheet is showing, or null
function helpBtnHTML(key) {
  return `<button class="help-btn" data-help="${key}" aria-label="Bantuan layar ini">?</button>`;
}
function helpSheetHTML(key) {
  if (helpOpen !== key) return "";
  return `
    <div class="help-overlay" id="helpOverlay">
      <div class="help-sheet fadeUp">
        <p>${esc(HELP_TEXT[key] || "")}</p>
        <button class="btn-primary full" id="closeHelp">Oke, ngerti</button>
      </div>
    </div>`;
}
// One delegated listener for open/close - survives every innerHTML re-render,
// so no per-screen wiring needed. Clicking the dimmed backdrop closes too
// (light, non-blocking, per the PRD's DoD).
document.addEventListener("click", (e) => {
  const btn = e.target.closest?.("[data-help]");
  if (btn) { helpOpen = btn.dataset.help; render(); return; }
  if (e.target.id === "helpOverlay" || e.target.id === "closeHelp") { helpOpen = null; render(); }
});

const MATURITY_TIERS = ["Emerging", "Practicing", "Reliable", "System", "Master"];
function maturityTier(growthSessions) {
  return MATURITY_TIERS[Math.min(MATURITY_TIERS.length - 1, Math.floor((growthSessions || 0) / 3))];
}

// --- Radar self-assessment (7 MECE axes, 1-10 each, always sums to exactly
// 35 - see applySynergyDrag/roundPreservingTotal below for how that's
// guaranteed) ---
const POLY_ORDER = ["body", "growth", "livelihood", "emotional", "social", "purpose", "autonomy"];
const POLY_TOTAL = 35; // 7 axes x default 5 - the fixed zero-sum budget
const POLY_MIN = 1, POLY_MAX = 10, POLY_CENTER = 150, POLY_MAXR = 110, POLY_MINR = 15;
const POLY_STEP_DEG = 360 / POLY_ORDER.length; // heptagon: ~51.43deg per axis
// Square viewBox with padding so axis-name labels (anchored outward) never
// clip; kept square so pointer->viewBox mapping stays a uniform scale.
// Wider than the 8-axis era: the heptagon puts "Livelihood" at a
// near-horizontal angle where it needs the full word to the right.
// Center invariant: POLY_VIEW_MIN + POLY_VIEW_SIZE/2 === POLY_CENTER.
const POLY_VIEW_MIN = -34, POLY_VIEW_SIZE = 368;
const DEFAULT_RADAR = { body: 5, growth: 5, livelihood: 5, emotional: 5, social: 5, purpose: 5, autonomy: 5 };

function polyRadius(value) {
  const v = Math.max(POLY_MIN, Math.min(POLY_MAX, value));
  return POLY_MINR + ((v - POLY_MIN) / (POLY_MAX - POLY_MIN)) * (POLY_MAXR - POLY_MINR);
}
// Returns a FLOAT value - rounding happens once, at the end of the whole
// redistribution (largest-remainder across all 7 axes), never per-point.
function polyValueFromRadius(r) {
  const clamped = Math.max(POLY_MINR, Math.min(POLY_MAXR, r));
  return POLY_MIN + ((clamped - POLY_MINR) / (POLY_MAXR - POLY_MINR)) * (POLY_MAX - POLY_MIN);
}
function polyPoint(index, value) {
  const angle = ((-90 + index * POLY_STEP_DEG) * Math.PI) / 180;
  const r = polyRadius(value);
  return [POLY_CENTER + r * Math.cos(angle), POLY_CENTER + r * Math.sin(angle)];
}
// --- Synergy evidence (v5, 7 MECE elements = 21 pairs) ---
// 14 pairs have directed evidence (below); 3 are "campuran" (component
// evidence collides after the merges - no directed nudge, treated as plain
// non-partners); 4 have no direct study found. Full per-pair citations:
// reference/Eleva_Correlation_Matrix.html (open in a browser, tap a cell).
//
// weight: kuat=6, sedang(-kuat)=4, lemah=2. direction: 1=searah, -1=berlawanan.
// No negative pair survives the MECE merge (the two old ones dissolved into
// "campuran") - direction:-1 stays supported in the math for future evidence.
//
// Scale doubled from the original 3/2/1 (v5-v8) to 6/4/2 (v9) - founder found
// the synergy effect visually unreadable: non-partner pull uses the axis's
// CURRENT VALUE (~5 near the default), which was routinely stronger than a
// weak (1) or even a strong (3) partner's pull, so evidence-linked axes often
// moved LESS than unrelated ones - backwards from what the radar is supposed
// to communicate. Doubling only the partner side (non-partner pull is still
// literally the current value, unchanged) makes a strong partner (6) reliably
// outweigh a mid-range non-partner (~5), while ratios between partners of
// different strength are preserved exactly (6:4:2 = 3:2:1).
const SYNERGY = {
  "body|growth": { weight: 2, direction: 1 },       // lemah - olahraga & kognisi, g=0.13 dewasa muda (meta-analisis Bayesian)
  "body|emotional": { weight: 6, direction: 1 },    // kuat - olahraga vs depresi/cemas, RCT (meta-meta 92 studi)
  "body|purpose": { weight: 4, direction: 1 },      // sedang-kuat - meaning & kesehatan fisik r~0.26 (meta 66 studi)
  "body|autonomy": { weight: 2, direction: 1 },     // lemah - perceived control & keluhan fisik rendah (Spector)
  "growth|livelihood": { weight: 6, direction: 1 }, // kuat - GMA prediktor terkuat performa kerja (Schmidt & Hunter 1998; Sackett 2022)
  "growth|autonomy": { weight: 4, direction: 1 },   // sedang - autonomy support -> engagement belajar (SDT edukasi, Bureau 2022)
  "livelihood|social": { weight: 4, direction: 1 }, // sedang-kuat - social capital -> career success (Seibert 2001; diencerkan, Finance-Social tanpa evidence)
  "livelihood|purpose": { weight: 4, direction: 1 },// sedang-kuat - calling -> job satisfaction (Duffy & Dik; diencerkan, Finance-Purpose unresolved)
  "livelihood|autonomy": { weight: 6, direction: 1 },// kuat - job autonomy -> job satisfaction (Humphrey 2007, 259 studi, 219rb partisipan)
  "emotional|social": { weight: 6, direction: 1 },  // kuat - loneliness (Holt-Lunstad)
  "emotional|purpose": { weight: 6, direction: 1 }, // kuat - purpose vs depresi r=-0.49, cemas r=-0.36 (Boreham 2023)
  "emotional|autonomy": { weight: 6, direction: 1 },// kuat - SDT need satisfaction -> wellbeing (192 studi); perceived control
  "social|purpose": { weight: 6, direction: 1 },    // kuat - dua arah (Stavrova & Luhmann, longitudinal)
  "purpose|autonomy": { weight: 4, direction: 1 },  // sedang - autonomy -> experienced meaningfulness (mediator, Humphrey 2007)
};
// CAMPURAN (komponen bertabrakan - non-partner, menyerap netral tanpa arah):
//   body|livelihood      - financial strain (positif) VS overwork (negatif)
//   emotional|livelihood - stres finansial (positif) VS burnout (negatif)
//   body|social          - cuma olahraga BERKELOMPOK yang terbukti
// BELUM KETEMU (non-partner biasa): growth|emotional, growth|social,
//   growth|purpose, social|autonomy
function synergyFor(a, b) {
  return SYNERGY[a + "|" + b] || SYNERGY[b + "|" + a] || null;
}

const MAX_LOCKS = 3; // deliberate cap, per founder: forces real priorities, "nggak bisa mau semuanya"

// Largest-remainder rounding across ALL 7 axes at once so the total stays
// exactly POLY_TOTAL (35) - never naive per-point rounding. Locked axes are
// already exact integers and are excluded from remainder bumps entirely.
function roundPreservingTotal(floats, lockedKeys) {
  const locked = new Set(lockedKeys || []);
  const out = {};
  let sumFloor = 0;
  const fracs = [];
  POLY_ORDER.forEach((k, i) => {
    const v = Math.max(POLY_MIN, Math.min(POLY_MAX, floats[k]));
    if (locked.has(k)) { out[k] = v; sumFloor += v; return; }
    const f = Math.floor(v + 1e-9);
    out[k] = f;
    sumFloor += f;
    fracs.push({ k, frac: v - f, i });
  });
  let remainder = Math.round(POLY_TOTAL - sumFloor);
  fracs.sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { k } of fracs) {
    if (remainder <= 0) break;
    if (out[k] < POLY_MAX) { out[k] += 1; remainder -= 1; }
  }
  return out;
}

// The core drag computation, run against the gesture-start snapshot (not
// incrementally) so it's stable and reversible mid-drag.
//
// v5 unified re-normalization (per PRD 7-element revision, replacing the
// old two-stage "partners pulled along + non-partners absorb 2x delta"
// formula). When the user moves axis X by delta, ALL unlocked other axes
// form ONE shared pool and together change by EXACTLY -delta (that is the
// whole zero-sum budget, no more), split proportionally to each axis's pull
// strength:
//   - evidence partner Y of X: pull = weight(Y) * direction(Y) - stronger
//     evidence shares more of the movement;
//   - non-partner Z (including "campuran" pairs - they absorb neutrally):
//     pull = current value of Z (the old v1 proportional rule).
// Same formula for every axis, no topology special-casing - this is what
// keeps the system safe even for a hyper-connected axis (Autonomy: 5
// evidence partners, only Social as a pure non-partner) and for any future
// evidence additions (the old formula demanded 2x delta from non-partners
// alone, which starved axes with few of them - documented in the PRD as the
// reason for this re-normalization).
//
// On top of the shares:
//   1. Saturation pass: a pool member already sitting exactly at the bound
//      its share would push it past is excluded and the pool re-normalizes
//      among the rest (still exactly -delta in total) - repeat until stable.
//      Without this, one axis parked at its floor by an earlier drag would
//      force the global scale factor to zero and freeze the whole gesture
//      (bug filed by founder, twice).
//   2. Constraint solving: if any surviving member (or X itself) would still
//      leave [1,10] at full delta, the WHOLE delta is scaled down uniformly
//      (closed-form, every change is linear in delta) - never one point
//      clamped in isolation.
//   3. Largest-remainder rounding to POLY_TOTAL at the very end.
// Locked axes are untouched at every step: not pool members, not constraint
// participants.
//
// direction:-1 note: no negative pair survives the MECE merge, so today all
// pulls are positive. The sign math below follows the PRD pseudocode
// (pull = weight * direction) literally; if research later adds a negative
// pair, revisit how a negative pull should interact with the shared pool
// before shipping it.
function applySynergyDrag(base, key, targetValue, lockedKeys) {
  const locked = new Set(lockedKeys || []);
  const target = Math.max(POLY_MIN, Math.min(POLY_MAX, targetValue));
  const delta = target - base[key];
  if (Math.abs(delta) < 1e-9) return { values: { ...base }, limited: false };

  const others = POLY_ORDER.filter((k) => k !== key && !locked.has(k));
  // v10: non-partner pull damped to half its current value. Two reasons,
  // both from founder testing on production:
  //   1. Readable synergy gradient on a single drag - undamped, a mid-range
  //      non-partner (value ~5) out-pulled even a strong evidence partner,
  //      so the per-axis spread came out near-uniform and the whole synergy
  //      concept was invisible on the chart. Damped, one Body drag now reads
  //      strong partner (-2) > mid partner/non-partner (-1) > weak (0).
  //   2. Calibration retention - the scenario-card signals reuse this exact
  //      engine, and an axis the user consistently favorites grows tall,
  //      which undamped made it the BIGGEST collateral absorber of every
  //      later signal (pull = its own value) - actively cancelling the very
  //      gains the user's picks just built. Halving non-partner pull halves
  //      that drain, so consistent answers accumulate instead of washing
  //      out, and the before/after comparison actually shows them.
  // Still proportional to current value (low axes keep absorbing less, the
  // natural floor protection), still normalized to exactly -delta in total.
  const NONPARTNER_DAMP = 0.5;
  const pullOf = (k) => {
    const syn = synergyFor(key, k);
    return syn ? syn.weight * syn.direction : base[k] * NONPARTNER_DAMP;
  };

  const excluded = new Set();
  let change = {};
  for (let iter = 0; iter <= others.length; iter++) {
    const active = others.filter((k) => !excluded.has(k));
    const totalPull = active.reduce((s, k) => s + pullOf(k), 0);
    change = { [key]: delta };
    if (totalPull > 1e-9) {
      active.forEach((k) => { change[k] = -delta * (pullOf(k) / totalPull); });
    } else {
      // Degenerate pool (empty, or net-nonpositive pull from a future
      // negative pair): nothing can absorb - the constraint step below
      // resolves this to a frozen, feedback-giving stop, not a silent one.
      active.forEach((k) => { change[k] = 0; });
    }

    // Anyone already exactly at the bound its own share would push it past
    // gets excluded, not scaled - the rest re-absorb its share, which is
    // what lets a floored axis stop blocking everyone else.
    let newlySaturated = false;
    active.forEach((k) => {
      if (Math.abs(change[k]) < 1e-9) return;
      const room = change[k] > 0 ? POLY_MAX - base[k] : base[k] - POLY_MIN;
      if (room <= 1e-9) { excluded.add(k); newlySaturated = true; }
    });
    if (!newlySaturated) break;
  }

  const absorbing = others.filter((k) => Math.abs(change[k] || 0) > 1e-9);

  // No absorber left for a nonzero delta => nothing can move at all.
  let s = absorbing.length === 0 ? 0 : 1;
  Object.entries(change).forEach(([k, c]) => {
    if (Math.abs(c) < 1e-9) return;
    const room = c > 0 ? POLY_MAX - base[k] : base[k] - POLY_MIN;
    s = Math.min(s, room / Math.abs(c));
  });
  s = Math.max(0, s);

  const floats = { ...base };
  Object.entries(change).forEach(([k, c]) => { floats[k] = base[k] + s * c; });
  return { values: roundPreservingTotal(floats, lockedKeys), limited: s < 1 - 1e-9 };
}

const root = document.getElementById("root");

let onboardForm = {
  name: "",
  privacyChecked: false,
  radar: { ...DEFAULT_RADAR },
  radarRaw: null, // frozen snapshot at the moment the radar step is left, before any calibration
  calibrationSum: {}, // {axisKey: cumulative direct calibration delta so far, capped [-3,3]}
  locked: [], // axis keys pinned by the user, max MAX_LOCKS
  lockedOriginalValue: {}, // {axisKey: value at the moment it was locked} - see applyCalibrationCard v12
};
let onboardStep = 0;
let ui = { view: "loading", label: "Membuka Eleva..." };
let appState = null;
let reflectOpen = false;
// null = the reflect flow targets today's active quest; a date string
// targets a specific missed quest reopened from the carousel (founder
// call: a missed day should stay completable, not just visible - the
// growth-gate content checks (specificity, word count, structured-data
// plausibility) are identical either way, so lateness doesn't loosen
// anything, it's purely a timing allowance).
let reflectTarget = null;
let reflectStatus = "done";
let reflectText = "";
// Task 7b: structured-physical quests complete via typed fields instead of
// the free reflection box - values keyed by field name, kept across
// re-renders; narrative text stays optional for those quests.
let structForm = {};
let reflectError = "";
let resetArmed = false;
let authMode = "login";
let authForm = { email: "", password: "", betaCode: "" };
let privacyChecked = false;
let authError = "";

// --- Adaptive onboarding phase (Radar chart -> Adaptive Scenario Cards ->
// Chapter Analysis). v6: cards are one scenario + 4 options (one per
// unlocked axis); each choice also calibrates the radar via the SAME
// redistribution engine as manual dragging - see applyCalibrationCard. ---
let adaptivePhase = "card"; // "loading" | "card" | "thinking" | "analysis" | "goals"
let adaptiveCards = []; // [{scenario, options:[{axis,text}], mostPreferred, leastPreferred}, ...] - length also serves as the card counter
let adaptiveScenario = null; // {scenario, options} for the card currently on screen
let adaptiveSelection = { mostPreferred: null, leastPreferred: null }; // in-progress picks for the current card
let chapterAnalysis = null; // {insight, pathway, pathwayNoun, pathwayBlurb, secondaryTrait, significantShifts, lockTension, rawPathwayTop2}
let pathwayOptions = []; // 3 swipeable candidate cards, computed once when chapterAnalysis loads - see buildPathwayOptions
let selectedPathwayIndex = null;
let overrideMode = false;
let overrideText = "";
// v13 goal capture - deliberately NOT an onboarding card: it's the bridge
// into First Trial, shown right after the Pathway is confirmed (either a
// carousel card or the manual override), before the first daily quest.
let goalInputs = ["", "", ""]; // 1-3 free-text goals, min 1 required
let pendingPathway = null; // {pathway, pathwayNoun} held while the goals screen is up
let onboardError = "";

function wordCount(t) { return (t || "").trim().split(/\s+/).filter(Boolean).length; }
function esc(s) { return (s ?? "").toString().replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function todayLabel() {
  return new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
}

async function api(path, opts) {
  const res = await fetch(path, {
    method: opts?.method || "GET",
    headers: opts?.body ? { "Content-Type": "application/json" } : undefined,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Request gagal");
    err.status = res.status;
    throw err;
  }
  return data;
}

function resetOnboardState() {
  onboardStep = 0;
  onboardForm = {
    name: "",
    privacyChecked: false,
    radar: { ...DEFAULT_RADAR },
    radarRaw: null, // frozen snapshot at the moment the radar step is left, before any calibration
    calibrationSum: {}, // {axisKey: cumulative direct calibration delta so far, capped [-3,3]}
    locked: [],
    lockedOriginalValue: {},
  };
  adaptivePhase = "card";
  adaptiveCards = [];
  adaptiveScenario = null;
  adaptiveSelection = { mostPreferred: null, leastPreferred: null };
  chapterAnalysis = null;
  pathwayOptions = [];
  selectedPathwayIndex = null;
  overrideMode = false;
  overrideText = "";
  goalInputs = ["", "", ""];
  pendingPathway = null;
  onboardError = "";
}

// Applies one card's two signals (favorite = +1, least-favorite = -1) to the
// radar through the EXISTING zero-sum + synergy engine (applySynergyDrag) -
// per PRD, calibration reuses the manual-drag mechanism rather than a
// separate system that could break the total=35 invariant. Each axis's
// cumulative DIRECT signal (i.e. only when that axis itself was picked as
// favorite/least-favorite, not collateral movement from redistribution) is
// capped at ±3 net across the whole session; once an axis hits its cap,
// further direct signals toward the same side are silently absorbed to 0 -
// the axis can still appear in later cards for coverage, its own delta just
// stops moving it further.
//
// v7-v11: a locked axis's NUMBER never moved here at all, even if it was
// picked as favorite/least-favorite - only a narrative "lock tension" signal
// (computeLockTension, server-side). v12 REVERSES that for the specific case
// of a CONTRARY pick (the pick pulls against what the lock declared - see
// isContraryPick below): the founder's own test run showed a lock repeatedly
// contradicted by real answers just sat there immune, with contradiction
// surfacing only as a reflective question at the very end - too weak. A
// pick that AGREES with the lock (reinforcing it) still does nothing, since
// there's no new information in confirming what was already declared.
function clampCalibrationDelta(axis, rawDelta) {
  const current = onboardForm.calibrationSum[axis] || 0;
  const next = Math.max(-3, Math.min(3, current + rawDelta));
  const effective = next - current;
  onboardForm.calibrationSum[axis] = next;
  return effective;
}
// v11: per-pick magnitude doubled (±1 -> ±2) per founder request - after
// running onboarding themselves, one or two consistent picks on an axis
// felt too weak to "prove" real intent, and 6 cards' worth of answers
// barely moved the before/after comparison. The ±3 cumulative cap (v6) is
// UNCHANGED - this just means ~2 consistent picks reach it instead of 3,
// so the calibrated radar responds faster to a clear pattern without
// widening how far any single axis can drift from the manual-drag radar.
const CALIBRATION_PICK_MAGNITUDE = 2;

// v12: mirrors computeLockTension's server-side "contrary" definition
// (server/claude.js) exactly, but must run client-side, live, per pick -
// not just reconstructed afterward for a narrative blurb. Judged against
// lockedOriginalValue (the value AT THE MOMENT OF LOCKING), never the live
// radar value - otherwise an axis eroding past the 5-midpoint would flip
// what counts as "contrary" partway through the same session, corrupting
// its own erosion direction.
function isContraryPick(axis, sign) {
  const original = onboardForm.lockedOriginalValue[axis];
  if (original == null) return false; // shouldn't happen for a locked axis, but never treat as contrary if untracked
  return (original > 5 && sign === -1) || (original < 5 && sign === 1);
}

function applyCalibrationCard(card) {
  [[card.mostPreferred, 1], [card.leastPreferred, -1]].forEach(([axis, sign]) => {
    if (onboardForm.locked.includes(axis) && !isContraryPick(axis, sign)) return; // locked + agrees with the lock: no new info, no movement
    const delta = clampCalibrationDelta(axis, sign * CALIBRATION_PICK_MAGNITUDE);
    // A locked axis that IS eroding needs to be excluded from its OWN
    // lockedKeys for this one drag call (it's the key being dragged), while
    // every other still-locked axis stays fully immune to the redistribution
    // this triggers - that's what .filter((k) => k !== axis) does; for an
    // unlocked axis this is a no-op (axis was never in the list).
    const dragLocks = onboardForm.locked.filter((k) => k !== axis);
    onboardForm.radar = applySynergyDrag(
      onboardForm.radar, axis, onboardForm.radar[axis] + delta, dragLocks
    ).values;
  });
}

async function boot() {
  ui = { view: "loading", label: "Membuka Eleva..." };
  render();
  try {
    appState = await api("/api/state");
  } catch (e) {
    if (e.status === 401) {
      ui = { view: "auth" };
      render();
      return;
    }
    ui = { view: "error", message: e.message };
    render();
    return;
  }
  ui = { view: appState.profile ? "dashboard" : "onboarding" };
  render();
}

function spinnerHTML(label) {
  return `<div class="centered"><div style="text-align:center;color:var(--muted)">
    <div class="spin mono" style="font-size:22px">◐</div>
    <div class="mono" style="margin-top:14px;font-size:13px;letter-spacing:.5px">${esc(label)}</div>
  </div></div>`;
}

function renderAuth() {
  const isSignup = authMode === "signup";
  root.innerHTML = `
    <div class="shell">
      <div class="eyebrow mono">ELEVA</div>
      <h1 class="fr" style="font-size:28px;font-weight:600;margin:0 0 20px">${isSignup ? "Daftar beta" : "Masuk"}</h1>
      ${authError ? `<p style="color:var(--rust);font-size:13.5px;margin:0 0 16px">${esc(authError)}</p>` : ""}
      <div class="field">
        <label>Email</label>
        <input type="email" id="authEmail" value="${esc(authForm.email)}" placeholder="kamu@email.com" autocomplete="email" />
      </div>
      <div class="field">
        <label>Password</label>
        <input type="password" id="authPassword" value="" placeholder="minimal 8 karakter" autocomplete="${isSignup ? "new-password" : "current-password"}" />
      </div>
      ${isSignup ? `
      <div class="field">
        <label>Kode beta</label>
        <input type="text" id="authBetaCode" value="${esc(authForm.betaCode)}" placeholder="dari founder Eleva" />
      </div>
      <div class="field" style="display:flex;gap:10px;align-items:flex-start">
        <input type="checkbox" id="authPrivacy" ${privacyChecked ? "checked" : ""} style="margin-top:3px" />
        <label for="authPrivacy" style="margin:0;font-size:12.5px;line-height:1.5;color:var(--muted)">
          Saya mengerti: refleksi saya diproses AI (Claude/Anthropic) untuk membuat quest & analisis, disimpan di
          database yang bisa diakses founder selama masa beta, dan ini bukan pengganti layanan kesehatan mental
          profesional.
        </label>
      </div>` : ""}
      <button class="btn-primary full" id="authSubmit" ${isSignup && !privacyChecked ? "disabled" : ""}>${isSignup ? "Daftar" : "Masuk"}</button>
      <div style="text-align:center;margin-top:16px">
        <button class="btn-ghost" id="authToggle">${isSignup ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar (butuh kode beta)"}</button>
      </div>
    </div>`;

  document.getElementById("authEmail").addEventListener("input", (e) => { authForm.email = e.target.value; });
  document.getElementById("authPassword").addEventListener("input", (e) => { authForm.password = e.target.value; });
  document.getElementById("authBetaCode")?.addEventListener("input", (e) => { authForm.betaCode = e.target.value; });
  document.getElementById("authPrivacy")?.addEventListener("change", (e) => {
    privacyChecked = e.target.checked;
    document.getElementById("authSubmit").disabled = isSignup && !privacyChecked;
  });
  document.getElementById("authToggle").addEventListener("click", () => {
    authMode = isSignup ? "login" : "signup";
    authError = "";
    renderAuth();
  });
  document.getElementById("authSubmit").addEventListener("click", async () => {
    authError = "";
    root.innerHTML = spinnerHTML(isSignup ? "Mendaftar..." : "Masuk...");
    try {
      await api(isSignup ? "/api/signup" : "/api/login", { method: "POST", body: authForm });
      authForm = { email: "", password: "", betaCode: "" };
      privacyChecked = false;
      await boot();
    } catch (e) {
      authError = e.message;
      renderAuth();
    }
  });
}

// Just 2 static steps now - Situasi/Values/Fear and Growth Focus (v2) are both
// gone, folded into the adaptive conversation and the radar chart itself.
const ONBOARD_STEPS = [
  { type: "namePromise", q: "Siapa namamu?", promiseText: "Semua yang kamu ceritakan di sini hanya untuk kamu dan Eleva." },
  { type: "radar", q: "Gambarkan dirimu sekarang", sub: "Tarik titik-titiknya. Menonjolkan satu sisi bikin sisi lain sedikit mengecil — bukan ke nol, cuma menyesuaikan, karena kamu (kayak semua orang) punya waktu & energi yang terbatas. Kalau ada sisi yang nggak boleh ikut bergeser, tap titiknya untuk mengunci (maksimal 3)." },
];

function isStepValid(step) {
  const s = ONBOARD_STEPS[step];
  if (s.type === "radar") return true;
  return onboardForm.name.trim().length > 0 && onboardForm.privacyChecked;
}

function lockHintText() {
  return `Tap titik untuk mengunci prioritas (maks ${MAX_LOCKS}) — ${onboardForm.locked.length}/${MAX_LOCKS} terkunci`;
}

// Lock glyph sits tangentially (perpendicular to the axis) next to the
// handle, so it collides with neither the center nor the axis-name labels
// at any value.
function lockGlyphPos(index, value) {
  const angle = ((-90 + index * POLY_STEP_DEG) * Math.PI) / 180;
  const [x, y] = polyPoint(index, value);
  return [x - 16 * Math.sin(angle), y + 16 * Math.cos(angle) + 3];
}

function renderPolygonSVG() {
  const radar = onboardForm.radar;
  const points = POLY_ORDER.map((k, i) => polyPoint(i, radar[k]));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + "Z";
  const rings = [0.33, 0.66, 1].map((f) => {
    const pts = POLY_ORDER.map((k, i) => polyPoint(i, POLY_MIN + f * (POLY_MAX - POLY_MIN)));
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + "Z";
    return `<path d="${d}" class="poly-ring" />`;
  }).join("");
  const axisLines = POLY_ORDER.map((k, i) => {
    const [x, y] = polyPoint(i, POLY_MAX);
    return `<line x1="${POLY_CENTER}" y1="${POLY_CENTER}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="poly-axis" />`;
  }).join("");
  const labels = POLY_ORDER.map((k, i) => {
    // Names sit beyond the handles' max radius, anchored AWAY from the chart
    // (left labels extend leftward, right ones rightward, top/bottom stay
    // centered) so a handle at value 10 (r=11 circle with the number inside)
    // never covers its axis name.
    const angle = ((-90 + i * POLY_STEP_DEG) * Math.PI) / 180;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const x = POLY_CENTER + (POLY_MAXR + 12) * dx;
    const y = POLY_CENTER + (POLY_MAXR + 12) * dy + (dy > 0.35 ? 9 : dy < -0.35 ? -2 : 3.5);
    const anchor = dx > 0.35 ? "start" : dx < -0.35 ? "end" : "middle";
    const label = statLabel(k);
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="poly-label" text-anchor="${anchor}">${esc(label)}</text>`;
  }).join("");
  // Value number lives INSIDE each handle (so the exact 1-10 is always
  // visible, not just the visual position); the circle stays the only
  // pointer target - texts are pointer-events:none via CSS.
  const handles = POLY_ORDER.map((k, i) => {
    const [x, y] = polyPoint(i, radar[k]);
    const isLocked = onboardForm.locked.includes(k);
    const [lx, ly] = lockGlyphPos(i, radar[k]);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11" class="poly-handle ${isLocked ? "locked" : ""}" data-stat="${k}" />
      <text x="${x.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" class="poly-value" data-value-for="${k}" text-anchor="middle">${radar[k]}</text>
      <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" class="poly-lock" data-lock-for="${k}" text-anchor="middle"${isLocked ? "" : ' style="display:none"'}>🔒</text>`;
  }).join("");
  return `<svg viewBox="${POLY_VIEW_MIN} ${POLY_VIEW_MIN} ${POLY_VIEW_SIZE} ${POLY_VIEW_SIZE}" class="poly-svg" id="polySvg">${rings}${axisLines}<path d="${pathD}" class="poly-shape" id="polyShape" />${labels}${handles}</svg>`;
}

// Read-only before/after comparison for Chapter Analysis (v7, WAJIB tampil):
// two outlines overlaid on one chart (raw = dashed/muted, calibrated =
// solid/accent) sharing the same rings/axis-label chrome as the interactive
// radar, so the user sees the SHAPE change directly rather than reading text
// that just says "it changed." No handles, no drag - purely a picture.
function renderRadarComparisonSVG(radarRaw, radarCalibrated) {
  const pathFor = (radar) => {
    const points = POLY_ORDER.map((k, i) => polyPoint(i, radar[k]));
    return points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + "Z";
  };
  const rings = [0.33, 0.66, 1].map((f) => {
    const pts = POLY_ORDER.map((k, i) => polyPoint(i, POLY_MIN + f * (POLY_MAX - POLY_MIN)));
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + "Z";
    return `<path d="${d}" class="poly-ring" />`;
  }).join("");
  const axisLines = POLY_ORDER.map((k, i) => {
    const [x, y] = polyPoint(i, POLY_MAX);
    return `<line x1="${POLY_CENTER}" y1="${POLY_CENTER}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="poly-axis" />`;
  }).join("");
  const labels = POLY_ORDER.map((k, i) => {
    const angle = ((-90 + i * POLY_STEP_DEG) * Math.PI) / 180;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const x = POLY_CENTER + (POLY_MAXR + 12) * dx;
    const y = POLY_CENTER + (POLY_MAXR + 12) * dy + (dy > 0.35 ? 9 : dy < -0.35 ? -2 : 3.5);
    const anchor = dx > 0.35 ? "start" : dx < -0.35 ? "end" : "middle";
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="poly-label" text-anchor="${anchor}">${esc(statLabel(k))}</text>`;
  }).join("");
  return `<svg viewBox="${POLY_VIEW_MIN} ${POLY_VIEW_MIN} ${POLY_VIEW_SIZE} ${POLY_VIEW_SIZE}" class="poly-svg poly-compare" id="polyCompareSvg">
    ${rings}${axisLines}
    <path d="${pathFor(radarRaw)}" class="poly-shape-raw" id="polyShapeRaw" />
    <path d="${pathFor(radarCalibrated)}" class="poly-shape-calibrated" id="polyShapeCalibrated" />
    ${labels}
  </svg>
  <div class="poly-compare-legend">
    <span class="legend-item"><span class="legend-dot raw"></span>Radar awal (sebelum kartu)</span>
    <span class="legend-item"><span class="legend-dot calibrated"></span>Radar terkalibrasi</span>
  </div>`;
}

function updatePolygonDOM() {
  const svg = document.getElementById("polySvg");
  if (!svg) return;
  POLY_ORDER.forEach((k, i) => {
    const [x, y] = polyPoint(i, onboardForm.radar[k]);
    const isLocked = onboardForm.locked.includes(k);
    const handle = svg.querySelector(`circle[data-stat="${k}"]`);
    if (handle) {
      handle.setAttribute("cx", x.toFixed(1));
      handle.setAttribute("cy", y.toFixed(1));
      handle.classList.toggle("locked", isLocked);
    }
    const valueText = svg.querySelector(`text[data-value-for="${k}"]`);
    if (valueText) {
      valueText.setAttribute("x", x.toFixed(1));
      valueText.setAttribute("y", (y + 3.5).toFixed(1));
      valueText.textContent = onboardForm.radar[k];
    }
    const lockText = svg.querySelector(`text[data-lock-for="${k}"]`);
    if (lockText) {
      const [lx, ly] = lockGlyphPos(i, onboardForm.radar[k]);
      lockText.setAttribute("x", lx.toFixed(1));
      lockText.setAttribute("y", ly.toFixed(1));
      lockText.style.display = isLocked ? "" : "none";
    }
  });
  const points = POLY_ORDER.map((k, i) => polyPoint(i, onboardForm.radar[k]));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + "Z";
  document.getElementById("polyShape")?.setAttribute("d", pathD);
  const hint = document.getElementById("lockHint");
  if (hint) hint.textContent = lockHintText();
}

function toggleLock(key) {
  const i = onboardForm.locked.indexOf(key);
  if (i >= 0) {
    onboardForm.locked.splice(i, 1);
    delete onboardForm.lockedOriginalValue[key]; // re-locking later re-captures fresh
  } else if (onboardForm.locked.length < MAX_LOCKS) {
    onboardForm.locked.push(key);
    // Snapshot the value AT THE MOMENT OF LOCKING - this is what "contrary"
    // erosion (applyCalibrationCard) measures against for the rest of the
    // session, not the live/possibly-already-eroded radar value. Without
    // this, an axis eroding past the 5-midpoint would flip what counts as
    // "contrary" partway through calibration (see v12 riwayat in PRD.md).
    onboardForm.lockedOriginalValue[key] = onboardForm.radar[key];
  }
  // At the cap, tapping a 4th point deliberately does nothing - the user has
  // to unlock one first (founder-specified trade-off, the caption shows 3/3).
  updatePolygonDOM();
}

function attachPolygonHandlers() {
  const svg = document.getElementById("polySvg");
  if (!svg) return;
  let draggingKey = null;
  let dragBase = null; // radar snapshot at gesture start - each move recomputes from it
  let downX = 0, downY = 0, moved = false, wasLimited = false;
  const TAP_THRESHOLD = 8; // px of pointer travel: below = tap (toggle lock), above = drag
  function setLimitHint(key) {
    const el = document.getElementById("limitHint");
    if (!el) return;
    if (key) {
      el.textContent = `${statLabel(key)} udah di titik paling jauh yang bisa dicapai bareng kombinasi sekarang.`;
      el.style.display = "";
      // Subtle haptic on the rising edge only, where the device supports it.
      if (!wasLimited && navigator.vibrate) navigator.vibrate(15);
      wasLimited = true;
    } else {
      el.style.display = "none";
      wasLimited = false;
    }
  }
  function moveTo(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    const px = POLY_VIEW_MIN + ((clientX - rect.left) / rect.width) * POLY_VIEW_SIZE;
    const py = POLY_VIEW_MIN + ((clientY - rect.top) / rect.height) * POLY_VIEW_SIZE;
    const dist = Math.hypot(px - POLY_CENTER, py - POLY_CENTER);
    const res = applySynergyDrag(dragBase, draggingKey, polyValueFromRadius(dist), onboardForm.locked);
    onboardForm.radar = res.values;
    setLimitHint(res.limited ? draggingKey : null);
    updatePolygonDOM();
  }
  svg.querySelectorAll(".poly-handle").forEach((handle) => {
    handle.addEventListener("pointerdown", (e) => {
      draggingKey = handle.dataset.stat;
      dragBase = { ...onboardForm.radar };
      downX = e.clientX; downY = e.clientY; moved = false; wasLimited = false;
      const el = document.getElementById("limitHint");
      if (el) el.style.display = "none";
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
  });
  svg.addEventListener("pointermove", (e) => {
    if (!draggingKey) return;
    if (!moved && Math.hypot(e.clientX - downX, e.clientY - downY) > TAP_THRESHOLD) moved = true;
    // A locked axis can't be dragged - but it can still be tapped to unlock.
    if (moved && !onboardForm.locked.includes(draggingKey)) moveTo(e.clientX, e.clientY);
  });
  svg.addEventListener("pointerup", () => {
    if (draggingKey && !moved) toggleLock(draggingKey);
    draggingKey = null;
    dragBase = null;
  });
  svg.addEventListener("pointercancel", () => { draggingKey = null; dragBase = null; });
}

function renderOnboarding() {
  const step = ONBOARD_STEPS[onboardStep];
  const last = onboardStep === ONBOARD_STEPS.length - 1;

  let bodyHTML = "";
  if (step.type === "namePromise") {
    bodyHTML = `
      <input type="text" id="fld" value="${esc(onboardForm.name)}" placeholder="Nama panggilan" autofocus />
      <p class="fr" style="font-size:15.5px;line-height:1.6;font-style:italic;color:var(--muted);margin:18px 0">${esc(step.promiseText)}</p>
      <div style="display:flex;gap:10px;align-items:flex-start">
        <input type="checkbox" id="promiseCheck" ${onboardForm.privacyChecked ? "checked" : ""} style="margin-top:3px" />
        <label for="promiseCheck" style="margin:0;font-size:13px;line-height:1.5;color:var(--muted)">Aku mengerti dan siap mulai.</label>
      </div>`;
  } else if (step.type === "radar") {
    bodyHTML = `<div class="poly-wrap">${renderPolygonSVG()}</div>
      <p class="mono" id="limitHint" style="font-size:12px;color:var(--accent);margin-top:10px;text-align:center;display:none"></p>
      <p class="mono" id="lockHint" style="font-size:12px;color:var(--muted);margin-top:6px;text-align:center">${esc(lockHintText())}</p>`;
  }

  root.innerHTML = `
    <div class="shell">
      ${step.type === "radar" ? helpBtnHTML("radar") + helpSheetHTML("radar") : ""}
      <div class="eyebrow mono">ELEVA · ONBOARDING</div>
      <div class="step-dots">
        ${ONBOARD_STEPS.map((_, i) => `<div class="dot-seg ${i <= onboardStep ? "active" : ""}"></div>`).join("")}
      </div>
      <div class="fadeUp">
        <h1 class="fr" style="font-size:28px;font-weight:600;margin:0 0 6px">${esc(step.q)}</h1>
        ${step.sub ? `<p style="color:var(--muted);font-size:14px;margin:0 0 20px">${esc(step.sub)}</p>` : `<div style="height:20px"></div>`}
        <div class="field">${bodyHTML}</div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:28px">
        <button class="btn-ghost" id="back" style="visibility:${onboardStep > 0 ? "visible" : "hidden"}">Kembali</button>
        <button class="btn-primary" id="next" ${isStepValid(onboardStep) ? "" : "disabled"}>Lanjut →</button>
      </div>
    </div>`;

  const fld = document.getElementById("fld");
  if (fld) fld.addEventListener("input", (e) => {
    onboardForm.name = e.target.value;
    document.getElementById("next").disabled = !isStepValid(onboardStep);
  });
  document.getElementById("promiseCheck")?.addEventListener("change", (e) => {
    onboardForm.privacyChecked = e.target.checked;
    document.getElementById("next").disabled = !isStepValid(onboardStep);
  });
  if (step.type === "radar") attachPolygonHandlers();
  document.getElementById("back")?.addEventListener("click", () => { onboardStep = Math.max(0, onboardStep - 1); renderOnboarding(); });
  document.getElementById("next").addEventListener("click", () => {
    if (!isStepValid(onboardStep)) return;
    if (!last) { onboardStep++; renderOnboarding(); return; }
    // Static steps done - freeze the pre-calibration radar for audit, then
    // hand off to the adaptive AI-driven phase.
    onboardForm.radarRaw = { ...onboardForm.radar };
    adaptivePhase = "loading";
    adaptiveCards = [];
    ui = { view: "adaptive" };
    render();
    fetchScenarioCard();
  });
}

async function fetchScenarioCard() {
  onboardError = "";
  try {
    const result = await api("/api/onboarding/scenario-card", {
      method: "POST",
      body: {
        profile: { name: onboardForm.name },
        radarSnapshot: onboardForm.radar,
        lockedAxes: onboardForm.locked,
        previousCards: adaptiveCards,
      },
    });
    // Server decides when the choice pattern is consistent enough AND every
    // unlocked axis has been tested at least once (min 2, max 6 - enforced
    // server-side, not just requested here) - confident:true means stop and
    // move straight to Chapter Analysis instead of showing another card.
    if (result.confident) {
      await fetchChapterAnalysis();
      return;
    }
    adaptiveScenario = { scenario: result.scenario, options: result.options };
    adaptiveSelection = { mostPreferred: null, leastPreferred: null };
    adaptivePhase = "card";
    render();
  } catch (e) {
    onboardError = e.message;
    adaptivePhase = "card";
    adaptiveScenario = null;
    render();
  }
}

// 3 candidate Pathway cards (v7, replaces the single fixed recommendation):
// #1 calibrated (from chapterAnalysis.pathway - the full-context AI pick),
// #2 raw-radar (from rawPathwayTop2, falling back to the 2nd-strongest if
// the strongest collides with #1), #3 a random wildcard from whatever's
// left. Computed ONCE per analysis (not on every re-render) so the wildcard
// doesn't shuffle out from under the user while they're looking at it.
function buildPathwayOptions(analysis) {
  const option1 = {
    pathway: analysis.pathway, pathwayNoun: analysis.pathwayNoun,
    blurb: analysis.pathwayBlurb, source: "calibrated",
  };
  const rawTop2 = analysis.rawPathwayTop2 || [];
  let rawPick = rawTop2[0];
  if (!rawPick || rawPick.pathway === option1.pathway) rawPick = rawTop2[1];
  if (!rawPick || rawPick.pathway === option1.pathway) {
    rawPick = { pathway: PATHWAY_NAMES.find((p) => p !== option1.pathway) || option1.pathway, blurb: "Berdasarkan radar awal sebelum kalibrasi." };
  }
  const option2 = { pathway: rawPick.pathway, pathwayNoun: rawPick.pathway, blurb: rawPick.blurb, source: "raw" };
  const remaining = PATHWAY_NAMES.filter((p) => p !== option1.pathway && p !== option2.pathway);
  const wildcard = remaining[Math.floor(Math.random() * remaining.length)] || option1.pathway;
  const option3 = { pathway: wildcard, pathwayNoun: wildcard, blurb: "Coba lihat arah yang beda.", source: "wildcard" };
  return [option1, option2, option3];
}

async function fetchChapterAnalysis() {
  onboardError = "";
  adaptivePhase = "thinking";
  render();
  try {
    chapterAnalysis = await api("/api/onboarding/chapter-analysis", {
      method: "POST",
      body: {
        profile: { name: onboardForm.name },
        radarSnapshot: onboardForm.radar,
        radarRaw: onboardForm.radarRaw,
        lockedAxes: onboardForm.locked,
        lockedOriginalValue: onboardForm.lockedOriginalValue,
        cards: adaptiveCards,
      },
    });
    pathwayOptions = buildPathwayOptions(chapterAnalysis);
    selectedPathwayIndex = null;
    adaptivePhase = "analysis";
    render();
  } catch (e) {
    onboardError = e.message;
    // Fall back to the card phase with no current scenario, so the retry
    // button re-asks the server - which re-evaluates confidence and routes
    // straight back here once satisfied. No dead end, no stale card shown.
    adaptivePhase = "card";
    adaptiveScenario = null;
    render();
  }
}

async function submitOnboarding(pathway, pathwayNoun, goals) {
  root.innerHTML = spinnerHTML("AI sedang membaca ceritamu...");
  try {
    await api("/api/profile", {
      method: "POST",
      body: {
        name: onboardForm.name, radarSnapshot: onboardForm.radar, radarRaw: onboardForm.radarRaw,
        originStory: chapterAnalysis?.insight || null,
        pathway, pathwayNoun, secondaryTrait: chapterAnalysis?.secondaryTrait || null,
        goals: goals || [],
      },
    });
    await boot();
  } catch (e) {
    ui = { view: "error", message: e.message };
    render();
  }
}

function renderAdaptive() {
  if (adaptivePhase === "loading" || adaptivePhase === "thinking") {
    root.innerHTML = spinnerHTML(adaptivePhase === "thinking" ? "Aku sedang mencoba memahami ceritamu..." : "Menyiapkan pertanyaan...");
    return;
  }

  if (adaptivePhase === "card") {
    const sel = adaptiveSelection;
    const bothPicked = sel.mostPreferred && sel.leastPreferred;
    const instruction = !sel.mostPreferred
      ? "Tap opsi yang paling kamu suka."
      : !sel.leastPreferred
        ? "Sekarang tap satu dari sisanya yang paling nggak kamu suka."
        : "Siap lanjut, atau tap ulang buat ganti pilihan.";
    root.innerHTML = `
      <div class="shell">
        ${helpBtnHTML("card")}${helpSheetHTML("card")}
        <div class="eyebrow mono">ELEVA · ONBOARDING</div>
        <div class="mono" style="font-size:11px;color:var(--muted);letter-spacing:1px;margin-bottom:20px">KARTU KE-${adaptiveCards.length + 1}</div>
        ${onboardError ? `<p style="color:var(--rust);font-size:13.5px;margin:0 0 16px">${esc(onboardError)}</p>` : ""}
        ${!adaptiveScenario ? `<button class="btn-primary" id="retryCard">Coba lagi</button>` : `
        <div class="fadeUp">
          <div class="quest-card" style="margin-bottom:14px">
            <p class="fr" style="font-size:19px;line-height:1.65;margin:0;font-weight:500">${esc(adaptiveScenario.scenario)}</p>
          </div>
          <p style="color:var(--muted);font-size:13px;margin:0 0 14px;text-align:center">${esc(instruction)}</p>
          <div class="scenario-options">
            ${adaptiveScenario.options.map((opt) => {
              const isFav = sel.mostPreferred === opt.axis;
              const isLeast = sel.leastPreferred === opt.axis;
              const cls = isFav ? "favorite" : isLeast ? "least" : "";
              const tag = isFav ? "👍" : isLeast ? "👎" : "";
              return `<button class="scenario-opt ${cls}" data-axis="${opt.axis}">${tag ? `<span class="opt-tag">${tag}</span>` : ""}${esc(opt.text)}</button>`;
            }).join("")}
          </div>
          <button class="btn-primary full" id="confirmCard" style="margin-top:18px" ${bothPicked ? "" : "disabled"}>Lanjut →</button>
        </div>`}
      </div>`;
    document.getElementById("retryCard")?.addEventListener("click", fetchScenarioCard);
    document.querySelectorAll(".scenario-opt").forEach((btn) => {
      btn.addEventListener("click", () => {
        const axis = btn.dataset.axis;
        if (adaptiveSelection.mostPreferred === axis) {
          adaptiveSelection = { mostPreferred: null, leastPreferred: null };
        } else if (adaptiveSelection.leastPreferred === axis) {
          adaptiveSelection.leastPreferred = null;
        } else if (!adaptiveSelection.mostPreferred) {
          adaptiveSelection.mostPreferred = axis;
        } else if (!adaptiveSelection.leastPreferred) {
          adaptiveSelection.leastPreferred = axis;
        } else {
          adaptiveSelection = { mostPreferred: axis, leastPreferred: null };
        }
        renderAdaptive();
      });
    });
    document.getElementById("confirmCard")?.addEventListener("click", async () => {
      const card = {
        scenario: adaptiveScenario.scenario, options: adaptiveScenario.options,
        mostPreferred: adaptiveSelection.mostPreferred, leastPreferred: adaptiveSelection.leastPreferred,
      };
      try {
        applyCalibrationCard(card);
      } catch (e) {
        onboardError = "Gagal menerapkan kalibrasi: " + e.message;
        renderAdaptive();
        return;
      }
      adaptiveCards.push(card);
      adaptivePhase = "loading";
      render();
      // fetchScenarioCard re-evaluates choice-pattern consistency AND axis
      // coverage with the updated card list, and internally redirects to
      // fetchChapterAnalysis once satisfied (min 2/max 6, full unlocked-axis
      // coverage - all enforced server-side) - no fixed-count loop needed here.
      await fetchScenarioCard();
    });
    return;
  }

  if (adaptivePhase === "analysis") {
    const flaggedLock = chapterAnalysis?.lockTension || [];
    root.innerHTML = `
      <div class="shell">
        ${helpBtnHTML("analysis")}${helpSheetHTML("analysis")}
        <div class="eyebrow mono">ELEVA · CHAPTER ANALYSIS</div>
        <div style="height:20px"></div>
        <p class="fr" style="font-size:17px;line-height:1.7;margin:0 0 20px">${esc(chapterAnalysis?.insight || "")}</p>
        <div class="poly-wrap" style="flex-direction:column;align-items:center;margin-bottom:14px">
          ${renderRadarComparisonSVG(onboardForm.radarRaw || onboardForm.radar, onboardForm.radar)}
        </div>
        ${chapterAnalysis?.significantShifts?.length ? `
        <p class="mono" style="font-size:11.5px;color:var(--muted);margin:0 0 12px;line-height:1.6">
          Kalibrasi radar: ${chapterAnalysis.significantShifts.map((s) => `${esc(statLabel(s.axis))} ${s.from}→${s.to}`).join(", ")} — bergeser dari radar awalmu berdasarkan pilihan-pilihanmu barusan.
        </p>` : ""}
        ${flaggedLock.length ? `
        <p class="mono" style="font-size:11.5px;color:var(--accent);margin:0 0 20px;line-height:1.6">
          Ketegangan kunci: pilihan-pilihanmu di kartu beberapa kali condong berlawanan dari sumbu yang kamu kunci (${flaggedLock.map((a) => esc(statLabel(a))).join(", ")}) — angkanya tetap seperti kamu kunci, tapi layak dipikir ulang kalau mau, lihat insight di atas.
        </p>` : ""}
        ${chapterAnalysis?.secondaryTrait ? `<p class="why" style="margin:0 0 16px">Trait tambahan yang kelihatan: ${esc(chapterAnalysis.secondaryTrait)}</p>` : ""}
        <div class="eyebrow mono" style="margin-top:4px">PILIH PATHWAY</div>
        <div class="pathway-carousel">
          ${pathwayOptions.map((opt, i) => `
            <div class="pathway-card ${selectedPathwayIndex === i ? "selected" : ""}" data-idx="${i}">
              <div class="qlabel mono">${opt.source === "calibrated" ? "REKOMENDASI UTAMA" : opt.source === "raw" ? "DARI RADAR AWAL" : "COBA ARAH LAIN"}</div>
              <h2 class="fr">${esc(opt.pathway)}${opt.pathwayNoun && opt.pathwayNoun !== opt.pathway ? `: ${esc(opt.pathwayNoun)}` : ""}</h2>
              <p class="desc">${esc(PATHWAY_DESC[opt.pathway] || "")}</p>
              <p class="why">${esc(opt.blurb || "")}</p>
            </div>`).join("")}
        </div>
        ${!overrideMode ? `
        <button class="btn-primary full" id="acceptPathway" ${selectedPathwayIndex === null ? "disabled" : ""}>Mulai First Trial (14 hari)</button>
        <div style="text-align:center;margin-top:16px">
          <button class="btn-ghost" id="openOverride">Bukan ini — aku tahu persis mau melatih apa</button>
        </div>` : `
        <div class="field">
          <label>Pathway yang mau kamu latih</label>
          <input type="text" id="overrideInput" value="${esc(overrideText)}" placeholder="Tulis sendiri, mis. Sales, Public Speaking..." autofocus />
        </div>
        <button class="btn-primary full" id="confirmOverride" ${overrideText.trim().length > 1 ? "" : "disabled"}>Mulai First Trial dengan ini</button>
        <div style="text-align:center;margin-top:16px">
          <button class="btn-ghost" id="cancelOverride">Batal, pakai rekomendasi AI</button>
        </div>`}
      </div>`;
    document.querySelectorAll(".pathway-card").forEach((card) => {
      card.addEventListener("click", () => {
        selectedPathwayIndex = Number(card.dataset.idx);
        renderAdaptive();
      });
    });
    document.getElementById("acceptPathway")?.addEventListener("click", () => {
      if (selectedPathwayIndex === null) return;
      const chosen = pathwayOptions[selectedPathwayIndex];
      // v13: Pathway confirmed (the HOW) -> capture 1-3 goals (the WHAT)
      // before anything is persisted or the first quest is generated.
      pendingPathway = { pathway: chosen.pathway, pathwayNoun: chosen.pathwayNoun };
      adaptivePhase = "goals";
      renderAdaptive();
    });
    document.getElementById("openOverride")?.addEventListener("click", () => { overrideMode = true; overrideText = ""; renderAdaptive(); });
    document.getElementById("cancelOverride")?.addEventListener("click", () => { overrideMode = false; renderAdaptive(); });
    document.getElementById("overrideInput")?.addEventListener("input", (e) => {
      overrideText = e.target.value;
      document.getElementById("confirmOverride").disabled = overrideText.trim().length <= 1;
    });
    document.getElementById("confirmOverride")?.addEventListener("click", () => {
      const v = overrideText.trim();
      pendingPathway = { pathway: v, pathwayNoun: v };
      adaptivePhase = "goals";
      renderAdaptive();
    });
    return;
  }

  if (adaptivePhase === "goals") {
    const filled = goalInputs.map((g) => g.trim()).filter(Boolean);
    root.innerHTML = `
      <div class="shell">
        ${helpBtnHTML("goals")}${helpSheetHTML("goals")}
        <div class="eyebrow mono">ELEVA · FIRST TRIAL</div>
        <div style="height:16px"></div>
        <div class="chapter-header">
          <h1 class="fr" style="font-size:28px">Apa yang mau kamu capai selama masa ini?</h1>
          <div class="rule"></div>
          <p class="insight">Tulis 1-3 hal — boleh dari area yang beda-beda sekaligus. Pathway-mu (${esc(pendingPathway?.pathway || "")}) yang menentukan GAYA mengejarnya; ini soal APA yang dikejar.</p>
        </div>
        ${[0, 1, 2].map((i) => `
        <div class="field">
          <label>Goal ${i + 1}${i === 0 ? "" : " (opsional)"}</label>
          <input type="text" data-goal="${i}" maxlength="200" value="${esc(goalInputs[i])}" placeholder="${esc(goalPlaceholder(pendingPathway))}" />
        </div>`).join("")}
        <button class="btn-primary full" id="confirmGoals" ${filled.length ? "" : "disabled"}>Mulai First Trial (14 hari)</button>
        <div style="text-align:center;margin-top:16px">
          <button class="btn-ghost" id="backToPathway">← Balik pilih Pathway</button>
        </div>
      </div>`;
    document.querySelectorAll("input[data-goal]").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        goalInputs[Number(inp.dataset.goal)] = e.target.value;
        const any = goalInputs.some((g) => g.trim());
        document.getElementById("confirmGoals").disabled = !any;
      });
    });
    document.getElementById("backToPathway")?.addEventListener("click", () => {
      pendingPathway = null;
      adaptivePhase = "analysis";
      renderAdaptive();
    });
    document.getElementById("confirmGoals")?.addEventListener("click", () => {
      const goals = goalInputs.map((g) => g.trim()).filter(Boolean).slice(0, 3);
      if (!goals.length || !pendingPathway) return;
      submitOnboarding(pendingPathway.pathway, pendingPathway.pathwayNoun, goals);
    });
  }
}

// Compact one-line summary of a day's structured completion data - shown on
// the finished quest card and in history, so the numbers stay visible as the
// progressive baseline they are.
function structSummary(sd) {
  if (!sd) return "";
  if (sd.kind === "gym") {
    return `${sd.gerakan} · ${sd.set}×${sd.repetisi}${sd.bebanKg != null ? ` @ ${sd.bebanKg}kg` : ""} · RPE ${sd.rpe} · berat di ${sd.titikGagal}`;
  }
  const jenis = sd.jenisAktivitas === "Lainnya" ? (sd.jenisLainnya || "Lainnya") : sd.jenisAktivitas;
  return `${jenis} · ${sd.durasiMenit} menit${sd.jarakKm != null ? ` · ${sd.jarakKm} km` : ""} · RPE ${sd.rpe} · berat di ${sd.titikBerat}`;
}

let countdownTimer = null;

function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const sec = String(totalSec % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

// Ticks the quest card's 24h countdown by writing straight to the DOM node
// (never calling renderDashboard() from the tick itself) so a reflection
// draft mid-typing elsewhere on the page is never disturbed by this timer.
// Reads the absolute expiresAt on every tick rather than counting down a
// local duration, so re-renders triggered by something else (a status-
// button click, etc.) can restart this and stay perfectly in sync instead
// of drifting. When it actually hits zero, today's quest has expired
// server-side too - refetch so the app picks up whatever quest is next.
function startCountdown(expiresAtISO) {
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  if (!expiresAtISO) return;
  const expiresAt = new Date(expiresAtISO).getTime();
  const tick = () => {
    const el = document.getElementById("questCountdown");
    if (!el) { clearInterval(countdownTimer); countdownTimer = null; return; }
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      boot();
      return;
    }
    el.textContent = formatCountdown(remaining);
    document.getElementById("questCountdownRow")?.classList.toggle("urgent", remaining < 60 * 60 * 1000);
  };
  tick();
  countdownTimer = setInterval(tick, 1000);
}

// Renders any single day's quest as a card - today's active one (with
// countdown + the #openReflect id existing tests/handlers rely on) or a
// missed one reopened from the carousel (TERLEWAT label, data-reflect-date
// instead, no countdown - a lapsed quest has no meaningful time-remaining).
// dimmed only applies the muted carousel styling, never to the card
// currently focused for reflection - once it's the one thing on screen it
// should read as fully live, not like a passive history glance.
function questSummaryCard(day, isToday, dimmed) {
  if (!day) return `<div class="quest-card"><div class="dot pending"></div>${spinnerHTML("AI sedang menyusun quest hari ini...")}</div>`;
  const hasRefl = Boolean(day.reflection);
  const label = isToday
    ? (day.quest.mode === "acting" ? "ACTING METHOD HARI INI" : "QUEST HARI INI")
    : `TERLEWAT · ${esc(day.date)}`;
  return `
    <div class="quest-card ${dimmed ? "missed-card" : ""}">
      ${isToday ? `<div class="dot ${hasRefl ? "done" : "pending"}"></div>` : ""}
      <div class="qlabel mono">${label}</div>
      <h2 class="fr">${esc(day.quest.title)}</h2>
      <p class="desc">${esc(day.quest.description)}</p>
      <p class="why">${esc(day.quest.why)}</p>
      ${!hasRefl ? `
        ${isToday && day.expiresAt ? `<div class="mono countdown" id="questCountdownRow">⏳ <span id="questCountdown">--:--:--</span> tersisa</div>` : ""}
        ${isToday
          ? `<button class="btn-primary" id="openReflect">Tandai & refleksi</button>`
          : `<button class="btn-primary" data-reflect-date="${esc(day.date)}">Tandai & refleksi</button>`}` : `
        <div style="border-top:1px solid var(--hair);padding-top:14px;margin-top:4px">
          <div class="mono" style="font-size:11px;color:var(--growth);letter-spacing:1px;margin-bottom:6px">
            ${day.reflection.status === "done" ? "SELESAI" : day.reflection.status === "partial" ? "SEBAGIAN" : "DILEWATI"}
          </div>
          ${day.reflection.structuredData ? `<div class="mono" style="font-size:12px;color:var(--muted);margin:0 0 8px">${esc(structSummary(day.reflection.structuredData))}</div>` : ""}
          <p class="fr" style="font-style:italic;font-size:14.5px;margin:0;line-height:1.6">${esc(day.reflection.mentorReply)}</p>
          ${Object.keys(day.reflection.deltas || {}).length ? `<div class="deltas">${Object.entries(day.reflection.deltas).map(([k, v]) => `<span class="delta-chip">${statLabel(k)} +${v}</span>`).join("")}</div>` : ""}
        </div>`}
    </div>`;
}

function renderDashboard() {
  const s = appState;
  const today = s.today;
  // Which day the (possibly open) reflect flow targets - today by default,
  // or a specific missed day reopened from the carousel. Looked up fresh
  // from appState every render, never cached, so a just-refreshed state
  // after a submit is always the source of truth.
  const targetIsToday = !reflectTarget || reflectTarget === today?.date;
  const targetDay = targetIsToday ? today : (s.history || []).find((d) => d.date === reflectTarget) || null;
  const hasReflection = Boolean(targetDay?.reflection);

  // Task 7b: structured-physical quests swap the free reflection box for
  // typed fields (numbers are far harder to fabricate convincingly than a
  // paragraph). Narrative becomes optional there. Skipped = nothing to
  // certify, so the fields hide and no growth applies either way.
  const isStructuredQuest = targetDay?.quest?.completionType === "structured-physical";
  const showStructFields = isStructuredQuest && reflectStatus !== "skipped";
  const sf = (k) => esc(structForm[k] ?? "");
  const structFieldsHTML = !showStructFields ? "" : targetDay.quest.structuredKind === "gym" ? `
      <div class="field">
        <label>Gerakan</label>
        <input type="text" data-sf="gerakan" maxlength="200" value="${sf("gerakan")}" placeholder="mis. push-up, squat, bench press" />
      </div>
      <div class="struct-grid">
        <div class="field"><label>Set</label><input type="number" min="1" data-sf="set" value="${sf("set")}" placeholder="3" /></div>
        <div class="field"><label>Repetisi / set</label><input type="number" min="1" data-sf="repetisi" value="${sf("repetisi")}" placeholder="12" /></div>
      </div>
      <div class="struct-grid">
        <div class="field"><label>Beban (kg) <span class="opt-note">opsional (bodyweight: kosongkan)</span></label><input type="number" min="0" step="0.5" data-sf="bebanKg" value="${sf("bebanKg")}" placeholder="20" /></div>
        <div class="field"><label>Tingkat usaha (RPE 1-10)</label><select data-sf="rpe">${["", ...Array.from({ length: 10 }, (_, i) => String(i + 1))].map((v) => `<option value="${v}" ${String(structForm.rpe ?? "") === v ? "selected" : ""}>${v || "Pilih..."}</option>`).join("")}</select></div>
      </div>
      <div class="field">
        <label>Titik gagal/berat</label>
        <input type="text" data-sf="titikGagal" maxlength="200" value="${sf("titikGagal")}" placeholder="mis. set 3 rep 8, atau set terakhir" />
      </div>` : `
      <div class="field">
        <label>Jenis aktivitas</label>
        <select data-sf="jenisAktivitas">${["", "Lari", "Jalan cepat", "Sepeda", "Lompat tali", "Lainnya"].map((v) => `<option value="${v}" ${String(structForm.jenisAktivitas ?? "") === v ? "selected" : ""}>${v || "Pilih..."}</option>`).join("")}</select>
      </div>
      ${structForm.jenisAktivitas === "Lainnya" ? `
      <div class="field">
        <label>Aktivitasnya apa?</label>
        <input type="text" data-sf="jenisLainnya" maxlength="200" value="${sf("jenisLainnya")}" placeholder="mis. renang, hiking" />
      </div>` : ""}
      <div class="struct-grid">
        <div class="field"><label>Durasi (menit)</label><input type="number" min="1" data-sf="durasiMenit" value="${sf("durasiMenit")}" placeholder="30" /></div>
        <div class="field"><label>Jarak (km) <span class="opt-note">opsional</span></label><input type="number" min="0" step="0.1" data-sf="jarakKm" value="${sf("jarakKm")}" placeholder="5" /></div>
      </div>
      <div class="struct-grid">
        <div class="field"><label>Tingkat usaha (RPE 1-10)</label><select data-sf="rpe">${["", ...Array.from({ length: 10 }, (_, i) => String(i + 1))].map((v) => `<option value="${v}" ${String(structForm.rpe ?? "") === v ? "selected" : ""}>${v || "Pilih..."}</option>`).join("")}</select></div>
        <div class="field"><label>Titik mulai berat</label><input type="text" data-sf="titikBerat" maxlength="200" value="${sf("titikBerat")}" placeholder="mis. menit ke-12, atau tengah" /></div>
      </div>`;

  const reflectFormHTML = reflectOpen && !hasReflection ? `
    <div class="quest-card fadeUp" style="margin-top:-14px">
      <div class="field">
        <label>Gimana progressnya?</label>
        <div class="status-row">
          ${[["done", "Selesai"], ["partial", "Sebagian"], ["skipped", "Nggak sempat"]].map(([k, l]) =>
            `<button class="status-btn ${reflectStatus === k ? "active" : ""}" data-status="${k}">${l}</button>`).join("")}
        </div>
      </div>
      ${structFieldsHTML}
      <div class="field">
        <label>${showStructFields ? `Refleksi <span class="opt-note">opsional — angka di atas yang jadi bukti utamanya</span>` : `Ceritakan apa yang sebenarnya terjadi
          <span class="mono" style="display:block;font-size:12px;margin-top:2px;color:${wordCount(reflectText) >= 12 ? "var(--growth)" : "var(--muted)"}">
            <span id="wc">${wordCount(reflectText)}</span> kata · minimal ~12 kata biar stat bisa naik — dan sebut detail konkret yang diminta quest-nya (bukan checklist)
          </span>`}
        </label>
        <textarea id="reflectText" rows="${showStructFields ? 2 : 4}" placeholder="${showStructFields ? "Ada yang kerasa beda hari ini? (boleh dikosongkan)" : "Apa yang kamu lakukan, apa yang kerasa, apa yang berubah..."}">${esc(reflectText)}</textarea>
      </div>
      ${reflectError ? `<p style="color:var(--rust);font-size:13px;margin:0 0 12px">${esc(reflectError)}</p>` : ""}
      <button class="btn-primary full" id="submitReflect">${showStructFields ? "Simpan data & selesaikan quest" : "Simpan refleksi"}</button>
    </div>` : "";

  // Missed days stay reachable from the main quest-card area, not just
  // noted in Riwayat below - founder feedback: seeing "terlewat" only in
  // history read as buried/passive. Genuinely completable too (founder
  // follow-up after seeing the read-only version: "tolong ini dibuka lagi")
  // via the same reflect flow as today's quest, just targeting a different
  // date - see questSummaryCard's data-reflect-date buttons below.
  // s.history is already DESC by date, so missed entries come out most-
  // recent-first, continuing naturally backward from today.
  const missedRecent = (s.history || []).filter((d) => !d.reflection);
  // Collapses to the single card actually being reflected on while
  // reflectOpen (today's or a reopened missed one - never always today's,
  // or reopening a missed card would show the wrong quest above its own
  // form) so typing a reflection never fights a horizontal swipe for the
  // same touch gesture.
  const questSectionHTML = (!reflectOpen && missedRecent.length) ? `
    <div class="quest-carousel">
      ${questSummaryCard(today, true, false)}
      ${missedRecent.map((d) => questSummaryCard(d, false, true)).join("")}
    </div>
    <div class="eyebrow mono swipe-hint">← geser untuk lihat ${missedRecent.length} quest yang terlewat</div>` : questSummaryCard(targetDay, targetIsToday, false);

  root.innerHTML = `
    <div class="shell">
      ${helpBtnHTML("dashboard")}${helpSheetHTML("dashboard")}
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;padding-right:34px">
        <div class="eyebrow mono" style="margin:0">ELEVA</div>
        <div class="mono" style="color:var(--muted);font-size:12px">${todayLabel()}</div>
      </div>
      ${s.aiActive ? "" : `<div class="banner-warn">Mode tanpa API key — quest masih generik. Tambahkan ANTHROPIC_API_KEY di .env supaya mentor beneran personal.</div>`}
      <div class="chapter-header">
        <div class="bab mono">BAB ${s.chapterNumber}</div>
        <h1 class="fr">${esc(s.chapterTitle)}</h1>
        <div class="rule"></div>
        ${s.pathwayNoun ? `<div class="pathway-badge mono">${esc(maturityTier(s.growthSessions))} ${esc(s.pathwayNoun)}${s.pathwayStatus === "trial" ? ` <span class="trial-tag">(hipotesis — First Trial)</span>` : ""}</div>` : ""}
        ${today?.insight ? `<p class="insight fr">${esc(today.insight)}</p>` : ""}
      </div>
      ${questSectionHTML}
      ${reflectFormHTML}
      <div style="margin-bottom:28px">
        <div class="eyebrow mono">CHARACTER STATS</div>
        ${(() => {
          // Render whatever stats this account actually has: new accounts get
          // the 7 MECE keys in STAT_ORDER order; pre-MECE accounts (8-element
          // era) keep showing their stored keys with legacy labels until they
          // reset & re-onboard - display tolerance, deliberately not a data
          // migration.
          const keys = STAT_ORDER.map(([k]) => k).filter((k) => k in (s.stats || {}));
          Object.keys(s.stats || {}).forEach((k) => { if (!keys.includes(k)) keys.push(k); });
          return keys.map((k) => `
          <div class="stat-bar">
            <div class="row-top"><span class="label">${statLabel(k)}</span><span class="mono">${s.stats[k]}</span></div>
            <div class="track"><div class="fill" style="width:${s.stats[k]}%"></div></div>
          </div>`).join("");
        })()}
      </div>
      ${s.history?.length ? `
      <div style="margin-bottom:28px">
        <div class="eyebrow mono">RIWAYAT</div>
        ${s.history.map((d) => `
          <div class="history-item ${d.reflection ? "done" : "missed"}">
            <div class="date mono">${d.date}</div>
            <div class="title">${esc(d.quest?.title || "")}</div>
            ${d.reflection?.text ? `<div class="snippet">${esc(d.reflection.text.slice(0, 90))}${d.reflection.text.length > 90 ? "…" : ""}</div>` : d.reflection?.structuredData ? `<div class="snippet mono">${esc(structSummary(d.reflection.structuredData))}</div>` : `<div class="snippet missed-tag">Terlewat — belum dikerjakan</div>`}
          </div>`).join("")}
      </div>` : ""}
      <div class="footer-bar">
        ${resetArmed
          ? `<button class="btn-ghost rust" id="doReset">Yakin? Tap sekali lagi buat reset semua data</button>`
          : `<button class="btn-ghost" id="armReset">↺ Reset data</button>`}
        <button class="btn-ghost" id="doLogout">Keluar</button>
      </div>
    </div>`;

  startCountdown(targetIsToday ? today?.expiresAt : null);
  document.getElementById("openReflect")?.addEventListener("click", () => { reflectTarget = null; reflectOpen = true; reflectStatus = "done"; reflectText = ""; structForm = {}; reflectError = ""; renderDashboard(); });
  document.querySelectorAll("[data-reflect-date]").forEach((b) => b.addEventListener("click", () => {
    reflectTarget = b.dataset.reflectDate; reflectOpen = true; reflectStatus = "done"; reflectText = ""; structForm = {}; reflectError = ""; renderDashboard();
  }));
  document.querySelectorAll(".status-btn").forEach((b) => b.addEventListener("click", () => { reflectStatus = b.dataset.status; reflectError = ""; renderDashboard(); }));
  const rtxt = document.getElementById("reflectText");
  if (rtxt) rtxt.addEventListener("input", (e) => {
    reflectText = e.target.value;
    const wc = document.getElementById("wc");
    if (wc) wc.textContent = wordCount(reflectText);
  });
  document.querySelectorAll("[data-sf]").forEach((el) => {
    const evt = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evt, (e) => {
      structForm[el.dataset.sf] = e.target.value;
      // Only the "Lainnya" toggle needs a re-render (it adds/removes a field);
      // plain typing must NOT re-render or the input would lose focus.
      if (el.dataset.sf === "jenisAktivitas") renderDashboard();
    });
  });
  document.getElementById("submitReflect")?.addEventListener("click", async () => {
    root.innerHTML = spinnerHTML("Menyimpan refleksi...");
    try {
      const body = { status: reflectStatus, text: reflectText, date: targetDay.date };
      if (isStructuredQuest && reflectStatus !== "skipped") body.structuredData = { ...structForm };
      await api("/api/reflection", { method: "POST", body });
      reflectOpen = false; reflectTarget = null; reflectText = ""; structForm = {}; reflectError = "";
      appState = await api("/api/state");
      renderDashboard();
    } catch (e) {
      // Validation errors (implausible numbers, missing fields) come back as
      // 400s with a concrete message - show them inline with the entered
      // values intact, never a dead-end error screen.
      reflectError = e.message;
      renderDashboard();
    }
  });
  document.getElementById("armReset")?.addEventListener("click", () => { resetArmed = true; renderDashboard(); });
  document.getElementById("doReset")?.addEventListener("click", async () => {
    await api("/api/reset", { method: "POST" });
    resetArmed = false;
    resetOnboardState();
    await boot();
  });
  document.getElementById("doLogout")?.addEventListener("click", async () => {
    await api("/api/logout", { method: "POST" });
    resetOnboardState();
    await boot();
  });
}

function render() {
  if (ui.view === "loading") { root.innerHTML = spinnerHTML(ui.label); return; }
  if (ui.view === "error") {
    root.innerHTML = `<div class="centered"><div class="shell" style="text-align:center">
      <p style="color:var(--rust)">${esc(ui.message)}</p>
      <button class="btn-primary" id="retry">Coba lagi</button>
    </div></div>`;
    document.getElementById("retry").addEventListener("click", boot);
    return;
  }
  if (ui.view === "auth") return renderAuth();
  if (ui.view === "onboarding") return renderOnboarding();
  if (ui.view === "adaptive") return renderAdaptive();
  if (ui.view === "dashboard") return renderDashboard();
}

boot();
