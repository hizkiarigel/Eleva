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

const PATHWAY_DESC = {
  Builder: "Membangun sesuatu dari nol, butuh konsistensi untuk menyelesaikannya.",
  Guardian: "Belajar stabil secara emosi, jadi sandaran diri sendiri dulu.",
  Explorer: "Keluar dari rutinitas lama, mencoba arah yang belum pernah dijalani.",
  Connector: "Membangun ulang relasi/koneksi sosial yang sempat renggang.",
  Seeker: "Belum tahu arah pastinya, dan sedang aktif mencari.",
  Specialist: "Arah yang khusus buat kamu, di luar lima pola umum lainnya.",
};

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
// weight: kuat=3, sedang(-kuat)=2, lemah=1. direction: 1=searah, -1=berlawanan.
// No negative pair survives the MECE merge (the two old ones dissolved into
// "campuran") - direction:-1 stays supported in the math for future evidence.
const SYNERGY = {
  "body|growth": { weight: 1, direction: 1 },       // lemah - olahraga & kognisi, g=0.13 dewasa muda (meta-analisis Bayesian)
  "body|emotional": { weight: 3, direction: 1 },    // kuat - olahraga vs depresi/cemas, RCT (meta-meta 92 studi)
  "body|purpose": { weight: 2, direction: 1 },      // sedang-kuat - meaning & kesehatan fisik r~0.26 (meta 66 studi)
  "body|autonomy": { weight: 1, direction: 1 },     // lemah - perceived control & keluhan fisik rendah (Spector)
  "growth|livelihood": { weight: 3, direction: 1 }, // kuat - GMA prediktor terkuat performa kerja (Schmidt & Hunter 1998; Sackett 2022)
  "growth|autonomy": { weight: 2, direction: 1 },   // sedang - autonomy support -> engagement belajar (SDT edukasi, Bureau 2022)
  "livelihood|social": { weight: 2, direction: 1 }, // sedang-kuat - social capital -> career success (Seibert 2001; diencerkan, Finance-Social tanpa evidence)
  "livelihood|purpose": { weight: 2, direction: 1 },// sedang-kuat - calling -> job satisfaction (Duffy & Dik; diencerkan, Finance-Purpose unresolved)
  "livelihood|autonomy": { weight: 3, direction: 1 },// kuat - job autonomy -> job satisfaction (Humphrey 2007, 259 studi, 219rb partisipan)
  "emotional|social": { weight: 3, direction: 1 },  // kuat - loneliness (Holt-Lunstad)
  "emotional|purpose": { weight: 3, direction: 1 }, // kuat - purpose vs depresi r=-0.49, cemas r=-0.36 (Boreham 2023)
  "emotional|autonomy": { weight: 3, direction: 1 },// kuat - SDT need satisfaction -> wellbeing (192 studi); perceived control
  "social|purpose": { weight: 3, direction: 1 },    // kuat - dua arah (Stavrova & Luhmann, longitudinal)
  "purpose|autonomy": { weight: 2, direction: 1 },  // sedang - autonomy -> experienced meaningfulness (mediator, Humphrey 2007)
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
  const pullOf = (k) => {
    const syn = synergyFor(key, k);
    return syn ? syn.weight * syn.direction : base[k];
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
};
let onboardStep = 0;
let ui = { view: "loading", label: "Membuka Eleva..." };
let appState = null;
let reflectOpen = false;
let reflectStatus = "done";
let reflectText = "";
let resetArmed = false;
let authMode = "login";
let authForm = { email: "", password: "", betaCode: "" };
let privacyChecked = false;
let authError = "";

// --- Adaptive onboarding phase (Radar chart -> Adaptive Scenario Cards ->
// Chapter Analysis). v6: cards are one scenario + 4 options (one per
// unlocked axis); each choice also calibrates the radar via the SAME
// redistribution engine as manual dragging - see applyCalibrationCard. ---
let adaptivePhase = "card"; // "loading" | "card" | "thinking" | "analysis"
let adaptiveCards = []; // [{scenario, options:[{axis,text}], mostPreferred, leastPreferred}, ...] - length also serves as the card counter
let adaptiveScenario = null; // {scenario, options} for the card currently on screen
let adaptiveSelection = { mostPreferred: null, leastPreferred: null }; // in-progress picks for the current card
let chapterAnalysis = null; // {insight, pathway, pathwayNoun, secondaryTrait, significantShifts}
let overrideMode = false;
let overrideText = "";
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
  };
  adaptivePhase = "card";
  adaptiveCards = [];
  adaptiveScenario = null;
  adaptiveSelection = { mostPreferred: null, leastPreferred: null };
  chapterAnalysis = null;
  overrideMode = false;
  overrideText = "";
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
function clampCalibrationDelta(axis, rawDelta) {
  const current = onboardForm.calibrationSum[axis] || 0;
  const next = Math.max(-3, Math.min(3, current + rawDelta));
  const effective = next - current;
  onboardForm.calibrationSum[axis] = next;
  return effective;
}
function applyCalibrationCard(card) {
  const favDelta = clampCalibrationDelta(card.mostPreferred, 1);
  onboardForm.radar = applySynergyDrag(
    onboardForm.radar, card.mostPreferred, onboardForm.radar[card.mostPreferred] + favDelta, onboardForm.locked
  ).values;
  const leastDelta = clampCalibrationDelta(card.leastPreferred, -1);
  onboardForm.radar = applySynergyDrag(
    onboardForm.radar, card.leastPreferred, onboardForm.radar[card.leastPreferred] + leastDelta, onboardForm.locked
  ).values;
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
  if (i >= 0) onboardForm.locked.splice(i, 1);
  else if (onboardForm.locked.length < MAX_LOCKS) onboardForm.locked.push(key);
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
        cards: adaptiveCards,
      },
    });
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

async function submitOnboarding(pathway, pathwayNoun) {
  root.innerHTML = spinnerHTML("AI sedang membaca ceritamu...");
  try {
    await api("/api/profile", {
      method: "POST",
      body: {
        name: onboardForm.name, radarSnapshot: onboardForm.radar, radarRaw: onboardForm.radarRaw,
        originStory: chapterAnalysis?.insight || null,
        pathway, pathwayNoun, secondaryTrait: chapterAnalysis?.secondaryTrait || null,
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
    const pw = chapterAnalysis?.pathway;
    root.innerHTML = `
      <div class="shell">
        <div class="eyebrow mono">ELEVA · CHAPTER ANALYSIS</div>
        <div style="height:20px"></div>
        <p class="fr" style="font-size:17px;line-height:1.7;margin:0 0 28px">${esc(chapterAnalysis?.insight || "")}</p>
        ${chapterAnalysis?.significantShifts?.length ? `
        <p class="mono" style="font-size:11.5px;color:var(--muted);margin:-18px 0 20px;line-height:1.6">
          Kalibrasi radar: ${chapterAnalysis.significantShifts.map((s) => `${esc(statLabel(s.axis))} ${s.from}→${s.to}`).join(", ")} — bergeser dari radar awalmu berdasarkan pilihan-pilihanmu barusan.
        </p>` : ""}
        <div class="quest-card" style="margin-bottom:20px">
          <div class="qlabel mono">PATHWAY REKOMENDASI</div>
          <h2 class="fr">${esc(pw || "")}${chapterAnalysis?.pathwayNoun && chapterAnalysis.pathwayNoun !== pw ? `: ${esc(chapterAnalysis.pathwayNoun)}` : ""}</h2>
          <p class="desc">${esc(PATHWAY_DESC[pw] || "")}</p>
          ${chapterAnalysis?.secondaryTrait ? `<p class="why">Trait tambahan yang kelihatan: ${esc(chapterAnalysis.secondaryTrait)}</p>` : ""}
        </div>
        ${!overrideMode ? `
        <button class="btn-primary full" id="acceptPathway">Mulai First Trial (14 hari)</button>
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
    document.getElementById("acceptPathway")?.addEventListener("click", () => submitOnboarding(chapterAnalysis.pathway, chapterAnalysis.pathwayNoun));
    document.getElementById("openOverride")?.addEventListener("click", () => { overrideMode = true; overrideText = ""; renderAdaptive(); });
    document.getElementById("cancelOverride")?.addEventListener("click", () => { overrideMode = false; renderAdaptive(); });
    document.getElementById("overrideInput")?.addEventListener("input", (e) => {
      overrideText = e.target.value;
      document.getElementById("confirmOverride").disabled = overrideText.trim().length <= 1;
    });
    document.getElementById("confirmOverride")?.addEventListener("click", () => {
      const v = overrideText.trim();
      submitOnboarding(v, v);
    });
  }
}

function renderDashboard() {
  const s = appState;
  const today = s.today;
  const hasReflection = Boolean(today?.reflection);

  const questInner = !today ? spinnerHTML("AI sedang menyusun quest hari ini...") : `
    <div class="qlabel mono">${today.quest.mode === "acting" ? "ACTING METHOD HARI INI" : "QUEST HARI INI"}</div>
    <h2 class="fr">${esc(today.quest.title)}</h2>
    <p class="desc">${esc(today.quest.description)}</p>
    <p class="why">${esc(today.quest.why)}</p>
    ${!hasReflection ? `<button class="btn-primary" id="openReflect">Tandai & refleksi</button>` : `
      <div style="border-top:1px solid var(--hair);padding-top:14px;margin-top:4px">
        <div class="mono" style="font-size:11px;color:var(--growth);letter-spacing:1px;margin-bottom:6px">
          ${today.reflection.status === "done" ? "SELESAI" : today.reflection.status === "partial" ? "SEBAGIAN" : "DILEWATI"}
        </div>
        <p class="fr" style="font-style:italic;font-size:14.5px;margin:0;line-height:1.6">${esc(today.reflection.mentorReply)}</p>
        ${Object.keys(today.reflection.deltas || {}).length ? `<div class="deltas">${Object.entries(today.reflection.deltas).map(([k, v]) => `<span class="delta-chip">${statLabel(k)} +${v}</span>`).join("")}</div>` : ""}
      </div>`}
  `;

  const reflectFormHTML = reflectOpen && !hasReflection ? `
    <div class="quest-card fadeUp" style="margin-top:-14px">
      <div class="field">
        <label>Gimana progressnya?</label>
        <div class="status-row">
          ${[["done", "Selesai"], ["partial", "Sebagian"], ["skipped", "Nggak sempat"]].map(([k, l]) =>
            `<button class="status-btn ${reflectStatus === k ? "active" : ""}" data-status="${k}">${l}</button>`).join("")}
        </div>
      </div>
      <div class="field">
        <label>Ceritakan apa yang sebenarnya terjadi
          <span class="mono" style="display:block;font-size:12px;margin-top:2px;color:${wordCount(reflectText) >= 12 ? "var(--growth)" : "var(--muted)"}">
            <span id="wc">${wordCount(reflectText)}</span> kata · minimal ~12 kata biar stat bisa naik (bukan checklist)
          </span>
        </label>
        <textarea id="reflectText" rows="4" placeholder="Apa yang kamu lakukan, apa yang kerasa, apa yang berubah...">${esc(reflectText)}</textarea>
      </div>
      <button class="btn-primary full" id="submitReflect">Simpan refleksi</button>
    </div>` : "";

  root.innerHTML = `
    <div class="shell">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
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
      <div class="quest-card">
        <div class="dot ${hasReflection ? "done" : "pending"}"></div>
        ${questInner}
      </div>
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
          <div class="history-item ${d.reflection ? "done" : ""}">
            <div class="date mono">${d.date}</div>
            <div class="title">${esc(d.quest?.title || "")}</div>
            ${d.reflection?.text ? `<div class="snippet">${esc(d.reflection.text.slice(0, 90))}${d.reflection.text.length > 90 ? "…" : ""}</div>` : ""}
          </div>`).join("")}
      </div>` : ""}
      <div class="footer-bar">
        ${resetArmed
          ? `<button class="btn-ghost rust" id="doReset">Yakin? Tap sekali lagi buat reset semua data</button>`
          : `<button class="btn-ghost" id="armReset">↺ Reset data</button>`}
        <button class="btn-ghost" id="doLogout">Keluar</button>
      </div>
    </div>`;

  document.getElementById("openReflect")?.addEventListener("click", () => { reflectOpen = true; reflectStatus = "done"; reflectText = ""; renderDashboard(); });
  document.querySelectorAll(".status-btn").forEach((b) => b.addEventListener("click", () => { reflectStatus = b.dataset.status; renderDashboard(); }));
  const rtxt = document.getElementById("reflectText");
  if (rtxt) rtxt.addEventListener("input", (e) => {
    reflectText = e.target.value;
    document.getElementById("wc").textContent = wordCount(reflectText);
  });
  document.getElementById("submitReflect")?.addEventListener("click", async () => {
    root.innerHTML = spinnerHTML("Menyimpan refleksi...");
    try {
      await api("/api/reflection", { method: "POST", body: { status: reflectStatus, text: reflectText } });
      reflectOpen = false; reflectText = "";
      appState = await api("/api/state");
      renderDashboard();
    } catch (e) {
      ui = { view: "error", message: e.message };
      render();
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
