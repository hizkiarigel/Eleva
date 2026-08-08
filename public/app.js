const STAT_ORDER = [
  ["body", "Body"], ["mind", "Mind"], ["career", "Career"], ["finance", "Finance"],
  ["emotional", "Emotional Stability"], ["explorer", "Explorer"], ["social", "Social"], ["purpose", "Purpose"],
];

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

// --- Radar self-assessment (8 axes, 1-10 each, always sums to exactly 40 - see
// applySynergyDrag/roundPreservingTotal below for how that's guaranteed) ---
const POLY_ORDER = ["mind", "career", "finance", "purpose", "emotional", "explorer", "social", "body"];
const POLY_MIN = 1, POLY_MAX = 10, POLY_CENTER = 150, POLY_MAXR = 110, POLY_MINR = 15;
// Square viewBox with padding so axis-name labels (anchored outward) never
// clip; kept square so pointer->viewBox mapping stays a uniform scale.
const POLY_VIEW_MIN = -16, POLY_VIEW_SIZE = 332;
const DEFAULT_RADAR = { body: 5, mind: 5, career: 5, finance: 5, emotional: 5, explorer: 5, social: 5, purpose: 5 };

function polyRadius(value) {
  const v = Math.max(POLY_MIN, Math.min(POLY_MAX, value));
  return POLY_MINR + ((v - POLY_MIN) / (POLY_MAX - POLY_MIN)) * (POLY_MAXR - POLY_MINR);
}
// Returns a FLOAT value - rounding happens once, at the end of the whole
// redistribution (largest-remainder across all 8 axes), never per-point.
function polyValueFromRadius(r) {
  const clamped = Math.max(POLY_MINR, Math.min(POLY_MAXR, r));
  return POLY_MIN + ((clamped - POLY_MINR) / (POLY_MAXR - POLY_MINR)) * (POLY_MAX - POLY_MIN);
}
function polyPoint(index, value) {
  const angle = ((-90 + index * 45) * Math.PI) / 180;
  const r = polyRadius(value);
  return [POLY_CENTER + r * Math.cos(angle), POLY_CENTER + r * Math.sin(angle)];
}
// --- Redistribution v2: evidence-based synergy (per PRD) ---
// History: v0 shipped to production moved points to/from the most extreme
// axis, which in practice equalized everything ("equal-split" - founder
// flagged it as a bug); v1 was plain value-proportional; v2 (this) uses
// actual research evidence for the 15 axis pairs that have it, and stays
// value-proportional for pairs that don't.
//
// weight: kuat=3, sedang(-kuat)=2, lemah=1. direction: 1=searah, -1=berlawanan.
// Full per-pair citations live in reference/Eleva_Correlation_Matrix.html per
// the PRD (file not yet in this repo - rationale summaries below come from
// the PRD itself; do not invent citations here).
const SYNERGY = {
  "body|emotional": { weight: 3, direction: 1 },   // kuat - exercise & depresi
  "body|finance": { weight: 3, direction: 1 },     // kuat - financial strain
  "body|mind": { weight: 1, direction: 1 },        // lemah - g=0.13, dewasa
  "body|purpose": { weight: 2, direction: 1 },     // sedang-kuat - r~0.26
  "body|career": { weight: 2, direction: -1 },     // sedang, negatif - overwork
  "mind|career": { weight: 3, direction: 1 },      // kuat - GMA prediktor
  "mind|explorer": { weight: 3, direction: 1 },    // kuat - nyaris definisional
  "career|social": { weight: 3, direction: 1 },    // kuat - social capital
  "career|purpose": { weight: 3, direction: 1 },   // kuat - calling & kepuasan
  "career|explorer": { weight: 1, direction: 1 },  // lemah - openness bantu
  "career|emotional": { weight: 2, direction: -1 },// sedang, negatif - burnout
  "finance|emotional": { weight: 3, direction: 1 },// kuat - stres finansial
  "emotional|social": { weight: 3, direction: 1 }, // kuat - loneliness
  "emotional|purpose": { weight: 3, direction: 1 },// kuat - r=-0.49 depresi
  "social|purpose": { weight: 3, direction: 1 },   // kuat - dua arah
};
function synergyFor(a, b) {
  return SYNERGY[a + "|" + b] || SYNERGY[b + "|" + a] || null;
}

const MAX_LOCKS = 3; // deliberate cap, per founder: forces real priorities, "nggak bisa mau semuanya"

// Largest-remainder rounding across ALL 8 axes at once so the total stays
// exactly 40 - never naive per-point rounding. Locked axes are already exact
// integers and are excluded from remainder bumps entirely.
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
  let remainder = Math.round(40 - sumFloor);
  fracs.sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { k } of fracs) {
    if (remainder <= 0) break;
    if (out[k] < POLY_MAX) { out[k] += 1; remainder -= 1; }
  }
  return out;
}

// The core drag computation, run against the gesture-start snapshot (not
// incrementally) so it's stable and reversible mid-drag. When the user moves
// axis X by delta:
//   1. Unlocked partners of X (pairs present in SYNERGY) share a pull equal
//      to delta itself, split by weight and signed by direction - explicitly
//      DIVIDED, not summed per partner (summing independently would let one
//      small nudge demand a dozen points from the rest; the PRD documents
//      that failure mode).
//   2. Unlocked non-partners absorb the negated total burden proportionally
//      to their current values (the v1 formula).
//   3. Saturation pass: a partner or non-partner already sitting exactly at
//      the bound its own uncapped share would push it past gets excluded
//      from the pool - pinned to zero change, and (partners only) its
//      forgone jatah dropped from totalBurden - then the pool is recomputed
//      and rechecked until nothing new saturates. Without this, one axis
//      already at its floor/ceiling (left there by an earlier drag) forced
//      the single scale factor below to zero and rejected the WHOLE
//      gesture, even with other axes still having room (bug filed by
//      founder: Social pinned at 1 blocked Explorer outright, when Explorer
//      should still reach ~8.5 by drawing on Finance/Emotional/Purpose).
//   4. Constraint solving: if ANY surviving axis would still leave [1,10],
//      the WHOLE delta is scaled down uniformly (closed-form, since every
//      change is linear in delta) - never clamp a single point in isolation.
//   5. Largest-remainder rounding at the very end.
// Locked axes are untouched at every step: not partners, not absorbers, not
// constraint participants. Emergent consequence the PRD demands verified:
// Career (evidence with all 6 others except Finance, its only absorber) tops
// out around 7.8 and can NEVER reach 10 - if it does, this is implemented
// wrong.
function applySynergyDrag(base, key, targetValue, lockedKeys) {
  const locked = new Set(lockedKeys || []);
  const target = Math.max(POLY_MIN, Math.min(POLY_MAX, targetValue));
  const delta = target - base[key];
  if (Math.abs(delta) < 1e-9) return { values: { ...base }, limited: false };

  const others = POLY_ORDER.filter((k) => k !== key && !locked.has(k));
  const partnerKeys = others.filter((k) => synergyFor(key, k));
  const nonPartnerKeys = others.filter((k) => !synergyFor(key, k));
  const fullWeight = partnerKeys.reduce((s, k) => s + synergyFor(key, k).weight, 0);

  const excludedPartners = new Set();
  const excludedNonPartners = new Set();
  let partnerChange = {};
  let nonPartnerChange = {};
  let totalBurden = delta;
  for (let iter = 0; iter <= others.length; iter++) {
    partnerChange = {};
    totalBurden = delta;
    partnerKeys.forEach((k) => {
      if (excludedPartners.has(k)) return;
      const { weight, direction } = synergyFor(key, k);
      const jatah = fullWeight ? delta * (weight / fullWeight) * direction : 0;
      partnerChange[k] = jatah;
      totalBurden += jatah;
    });

    const activeNonPartners = nonPartnerKeys.filter((k) => !excludedNonPartners.has(k));
    const npBase = activeNonPartners.reduce((s, k) => s + base[k], 0);
    nonPartnerChange = {};
    activeNonPartners.forEach((k) => {
      nonPartnerChange[k] = npBase ? -totalBurden * (base[k] / npBase) : 0;
    });

    // Anyone already exactly at the bound their own uncapped share would
    // push them past gets excluded, not scaled - that's what lets the rest
    // of the pool keep absorbing instead of freezing the whole gesture.
    let newlySaturated = false;
    partnerKeys.forEach((k) => {
      if (excludedPartners.has(k) || Math.abs(partnerChange[k]) < 1e-9) return;
      const room = partnerChange[k] > 0 ? POLY_MAX - base[k] : base[k] - POLY_MIN;
      if (room <= 1e-9) { excludedPartners.add(k); newlySaturated = true; }
    });
    activeNonPartners.forEach((k) => {
      if (Math.abs(nonPartnerChange[k]) < 1e-9) return;
      const room = nonPartnerChange[k] > 0 ? POLY_MAX - base[k] : base[k] - POLY_MIN;
      if (room <= 1e-9) { excludedNonPartners.add(k); newlySaturated = true; }
    });
    if (!newlySaturated) break;
  }

  const change = { [key]: delta, ...partnerChange, ...nonPartnerChange };
  const activeNonPartnerCount = nonPartnerKeys.length - excludedNonPartners.size;

  // No absorber left for a nonzero burden => nothing can move at all.
  let s = activeNonPartnerCount === 0 && Math.abs(totalBurden) > 1e-9 ? 0 : 1;
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

// --- Adaptive onboarding phase (Radar chart -> statement cards -> Chapter Analysis) ---
let adaptivePhase = "card"; // "loading" | "card" | "thinking" | "analysis"
let adaptiveCards = []; // [{statement, response: "up"|"down"}, ...] - length also serves as the card counter
let adaptiveCurrentStatement = "";
let chapterAnalysis = null; // {insight, pathway, pathwayNoun, secondaryTrait}
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
    locked: [],
  };
  adaptivePhase = "card";
  adaptiveCards = [];
  adaptiveCurrentStatement = "";
  chapterAnalysis = null;
  overrideMode = false;
  overrideText = "";
  onboardError = "";
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
  const angle = ((-90 + index * 45) * Math.PI) / 180;
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
    const angle = ((-90 + i * 45) * Math.PI) / 180;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const x = POLY_CENTER + (POLY_MAXR + 12) * dx;
    const y = POLY_CENTER + (POLY_MAXR + 12) * dy + (dy > 0.35 ? 9 : dy < -0.35 ? -2 : 3.5);
    const anchor = dx > 0.35 ? "start" : dx < -0.35 ? "end" : "middle";
    const label = STAT_ORDER.find((s) => s[0] === k)[1];
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
      const label = STAT_ORDER.find((s) => s[0] === key)[1];
      el.textContent = `${label} udah di titik paling jauh yang bisa dicapai bareng kombinasi sekarang.`;
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
    // Static steps done - hand off to the adaptive AI-driven phase.
    adaptivePhase = "loading";
    adaptiveCards = [];
    ui = { view: "adaptive" };
    render();
    fetchStatementCard();
  });
}

async function fetchStatementCard() {
  onboardError = "";
  try {
    const result = await api("/api/onboarding/statement-card", {
      method: "POST",
      body: {
        profile: { name: onboardForm.name },
        radarSnapshot: onboardForm.radar,
        lockedAxes: onboardForm.locked,
        previousCards: adaptiveCards,
      },
    });
    // Server decides when the swipe pattern is consistent enough (min 4,
    // max 10 - enforced server-side, not just requested here) -
    // confident:true means stop and move straight to Chapter Analysis
    // instead of showing another card.
    if (result.confident) {
      await fetchChapterAnalysis();
      return;
    }
    adaptiveCurrentStatement = result.statement;
    adaptivePhase = "card";
    render();
  } catch (e) {
    onboardError = e.message;
    adaptivePhase = "card";
    adaptiveCurrentStatement = "";
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
        lockedAxes: onboardForm.locked,
        cards: adaptiveCards,
      },
    });
    adaptivePhase = "analysis";
    render();
  } catch (e) {
    onboardError = e.message;
    // Fall back to the card phase with no current statement, so the retry
    // button re-asks the server - which re-evaluates confidence and routes
    // straight back here once satisfied. No dead end, no stale card shown.
    adaptivePhase = "card";
    adaptiveCurrentStatement = "";
    render();
  }
}

async function submitOnboarding(pathway, pathwayNoun) {
  root.innerHTML = spinnerHTML("AI sedang membaca ceritamu...");
  try {
    await api("/api/profile", {
      method: "POST",
      body: {
        name: onboardForm.name, radarSnapshot: onboardForm.radar,
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
    root.innerHTML = `
      <div class="shell">
        <div class="eyebrow mono">ELEVA · ONBOARDING</div>
        <div class="mono" style="font-size:11px;color:var(--muted);letter-spacing:1px;margin-bottom:20px">KARTU KE-${adaptiveCards.length + 1}</div>
        ${onboardError ? `<p style="color:var(--rust);font-size:13.5px;margin:0 0 16px">${esc(onboardError)}</p>` : ""}
        ${!adaptiveCurrentStatement ? `<button class="btn-primary" id="retryCard">Coba lagi</button>` : `
        <div class="fadeUp">
          <div class="quest-card" style="margin-bottom:14px">
            <p class="fr" style="font-size:20px;line-height:1.65;margin:0;font-weight:500">${esc(adaptiveCurrentStatement)}</p>
          </div>
          <p style="color:var(--muted);font-size:13px;margin:0 0 18px;text-align:center">Seberapa "kamu banget" pernyataan ini? Tap salah satu.</p>
          <div class="swipe-row">
            <button class="swipe-btn down" id="swipeDown">👎 Bukan aku</button>
            <button class="swipe-btn up" id="swipeUp">👍 Ini aku</button>
          </div>
        </div>`}
      </div>`;
    document.getElementById("retryCard")?.addEventListener("click", fetchStatementCard);
    const respond = async (response) => {
      adaptiveCards.push({ statement: adaptiveCurrentStatement, response });
      adaptivePhase = "loading";
      render();
      // fetchStatementCard re-evaluates swipe-pattern consistency with the
      // updated card list, and internally redirects to fetchChapterAnalysis
      // once satisfied (min 4/max 10 enforced server-side) - no fixed-count
      // loop needed here.
      await fetchStatementCard();
    };
    document.getElementById("swipeUp")?.addEventListener("click", () => respond("up"));
    document.getElementById("swipeDown")?.addEventListener("click", () => respond("down"));
    return;
  }

  if (adaptivePhase === "analysis") {
    const pw = chapterAnalysis?.pathway;
    root.innerHTML = `
      <div class="shell">
        <div class="eyebrow mono">ELEVA · CHAPTER ANALYSIS</div>
        <div style="height:20px"></div>
        <p class="fr" style="font-size:17px;line-height:1.7;margin:0 0 28px">${esc(chapterAnalysis?.insight || "")}</p>
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
        ${Object.keys(today.reflection.deltas || {}).length ? `<div class="deltas">${Object.entries(today.reflection.deltas).map(([k, v]) => `<span class="delta-chip">${STAT_ORDER.find(x => x[0] === k)?.[1] || k} +${v}</span>`).join("")}</div>` : ""}
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
        ${STAT_ORDER.map(([k, label]) => `
          <div class="stat-bar">
            <div class="row-top"><span class="label">${label}</span><span class="mono">${s.stats[k]}</span></div>
            <div class="track"><div class="fill" style="width:${s.stats[k]}%"></div></div>
          </div>`).join("")}
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
