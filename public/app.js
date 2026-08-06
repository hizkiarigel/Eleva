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

const GROWTH_FOCUS_OPTIONS = [
  "Career", "Purpose", "Relationship", "Leadership", "Confidence",
  "Communication", "Wealth", "Health", "Adventure", "Contribution",
];

const MATURITY_TIERS = ["Emerging", "Practicing", "Reliable", "System", "Master"];
function maturityTier(growthSessions) {
  return MATURITY_TIERS[Math.min(MATURITY_TIERS.length - 1, Math.floor((growthSessions || 0) / 3))];
}

// --- Polygon stats picker (conservation-of-total redistribution) ---
const POLY_ORDER = ["mind", "career", "finance", "purpose", "emotional", "explorer", "social", "body"];
const POLY_MIN = 5, POLY_MAX = 100, POLY_CENTER = 150, POLY_MAXR = 110, POLY_MINR = 15;
function polyRadius(value) {
  const v = Math.max(POLY_MIN, Math.min(POLY_MAX, value));
  return POLY_MINR + (v / 100) * (POLY_MAXR - POLY_MINR);
}
function polyValueFromRadius(r) {
  const clamped = Math.max(POLY_MINR, Math.min(POLY_MAXR, r));
  return Math.round(((clamped - POLY_MINR) / (POLY_MAXR - POLY_MINR)) * 100);
}
function polyPoint(index, value) {
  const angle = ((-90 + index * 45) * Math.PI) / 180;
  const r = polyRadius(value);
  return [POLY_CENTER + r * Math.cos(angle), POLY_CENTER + r * Math.sin(angle)];
}
function redistributeStats(stats, changedKey, rawNewValue) {
  const newValue = Math.max(POLY_MIN, Math.min(POLY_MAX, rawNewValue));
  const oldValue = stats[changedKey];
  const delta = newValue - oldValue;
  if (Math.abs(delta) < 0.01) return stats;
  const others = Object.keys(stats).filter((k) => k !== changedKey);
  const othersTotal = others.reduce((s, k) => s + stats[k], 0) || 1;
  const next = { ...stats, [changedKey]: newValue };
  others.forEach((k) => {
    const share = stats[k] / othersTotal;
    next[k] = Math.round(Math.max(POLY_MIN, stats[k] - delta * share));
  });
  return next;
}

const root = document.getElementById("root");

let onboardForm = {
  name: "", situation: "", values: "", fear: "", growthFocus: [],
  stats: { body: 50, mind: 50, career: 50, finance: 50, emotional: 50, explorer: 50, social: 50, purpose: 50 },
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

// --- Adaptive onboarding phase (Growth Focus -> Adaptive Q1-3 -> Chapter Analysis) ---
let adaptivePhase = "question"; // "loading" | "question" | "thinking" | "analysis"
let adaptiveQuestionIndex = 1; // 1, 2, or 3
let adaptiveAnswers = []; // [{question, answer}, ...]
let adaptiveCurrentQuestion = "";
let adaptiveAnswerText = "";
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
    name: "", situation: "", values: "", fear: "", growthFocus: [],
    stats: { body: 50, mind: 50, career: 50, finance: 50, emotional: 50, explorer: 50, social: 50, purpose: 50 },
  };
  adaptivePhase = "question";
  adaptiveQuestionIndex = 1;
  adaptiveAnswers = [];
  adaptiveCurrentQuestion = "";
  adaptiveAnswerText = "";
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

const ONBOARD_STEPS = [
  { key: "name", q: "Siapa namamu?", type: "text", placeholder: "Nama panggilan" },
  { type: "promise", q: "Sebelum lanjut...", promiseText: "Semua yang kamu ceritakan di sini hanya untuk kamu dan Eleva." },
  { key: "situation", q: "Lagi di fase hidup yang gimana sekarang?", sub: "Nggak perlu rapi. Tulis aja apa adanya.", type: "textarea", placeholder: "Ceritakan singkat kondisimu sekarang..." },
  { key: "values", q: "Apa yang paling kamu pegang teguh sekarang?", sub: "Nilai, prinsip, atau hal yang penting buat kamu.", type: "textarea", placeholder: "Misalnya: kejujuran, keluarga, kebebasan..." },
  { key: "fear", q: "Apa yang paling kamu hindari atau takutkan sekarang?", type: "textarea", placeholder: "Boleh jujur, ini cuma buat kamu dan mentor AI-mu." },
  { key: "stats", q: "Gambarkan dirimu sekarang", sub: "Tarik titik-titiknya. Menonjolkan satu sisi bikin sisi lain sedikit mengecil — bukan ke nol, cuma menyesuaikan, karena kamu (kayak semua orang) punya waktu & energi yang terbatas.", type: "stats" },
  { key: "growthFocus", q: "Mau bangun apa dulu?", sub: "Pilih 1-3 area yang paling ingin kamu kembangkan bareng Eleva sekarang.", type: "growthFocus" },
];

function isStepValid(step) {
  const s = ONBOARD_STEPS[step];
  if (s.type === "stats" || s.type === "promise") return true;
  if (s.type === "growthFocus") {
    return onboardForm.growthFocus.length >= 1 && onboardForm.growthFocus.length <= 3;
  }
  return (onboardForm[s.key] || "").trim().length > (s.key === "name" ? 0 : 2);
}

function renderPolygonSVG() {
  const stats = onboardForm.stats;
  const points = POLY_ORDER.map((k, i) => polyPoint(i, stats[k]));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + "Z";
  const rings = [0.33, 0.66, 1].map((f) => {
    const pts = POLY_ORDER.map((k, i) => polyPoint(i, f * 100));
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + "Z";
    return `<path d="${d}" class="poly-ring" />`;
  }).join("");
  const axisLines = POLY_ORDER.map((k, i) => {
    const [x, y] = polyPoint(i, 100);
    return `<line x1="${POLY_CENTER}" y1="${POLY_CENTER}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="poly-axis" />`;
  }).join("");
  const labels = POLY_ORDER.map((k, i) => {
    const [x, y] = polyPoint(i, 122);
    const label = STAT_ORDER.find((s) => s[0] === k)[1];
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="poly-label" text-anchor="middle">${esc(label)}</text>`;
  }).join("");
  const handles = POLY_ORDER.map((k, i) => {
    const [x, y] = polyPoint(i, stats[k]);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" class="poly-handle" data-stat="${k}" />`;
  }).join("");
  return `<svg viewBox="0 0 300 300" class="poly-svg" id="polySvg">${rings}${axisLines}<path d="${pathD}" class="poly-shape" id="polyShape" />${labels}${handles}</svg>`;
}

function updatePolygonDOM() {
  const svg = document.getElementById("polySvg");
  if (!svg) return;
  POLY_ORDER.forEach((k, i) => {
    const [x, y] = polyPoint(i, onboardForm.stats[k]);
    const handle = svg.querySelector(`circle[data-stat="${k}"]`);
    if (handle) { handle.setAttribute("cx", x.toFixed(1)); handle.setAttribute("cy", y.toFixed(1)); }
  });
  const points = POLY_ORDER.map((k, i) => polyPoint(i, onboardForm.stats[k]));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + "Z";
  document.getElementById("polyShape")?.setAttribute("d", pathD);
}

function attachPolygonHandlers() {
  const svg = document.getElementById("polySvg");
  if (!svg) return;
  let draggingKey = null;
  function moveTo(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * 300;
    const py = ((clientY - rect.top) / rect.height) * 300;
    const dist = Math.hypot(px - POLY_CENTER, py - POLY_CENTER);
    onboardForm.stats = redistributeStats(onboardForm.stats, draggingKey, polyValueFromRadius(dist));
    updatePolygonDOM();
  }
  svg.querySelectorAll(".poly-handle").forEach((handle) => {
    handle.addEventListener("pointerdown", (e) => {
      draggingKey = handle.dataset.stat;
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
  });
  svg.addEventListener("pointermove", (e) => { if (draggingKey) moveTo(e.clientX, e.clientY); });
  svg.addEventListener("pointerup", () => { draggingKey = null; });
  svg.addEventListener("pointercancel", () => { draggingKey = null; });
}

function renderOnboarding() {
  const step = ONBOARD_STEPS[onboardStep];
  const last = onboardStep === ONBOARD_STEPS.length - 1;

  let bodyHTML = "";
  if (step.type === "text") {
    bodyHTML = `<input type="text" id="fld" value="${esc(onboardForm[step.key])}" placeholder="${esc(step.placeholder)}" autofocus />`;
  } else if (step.type === "textarea") {
    bodyHTML = `<textarea id="fld" rows="4" placeholder="${esc(step.placeholder)}" autofocus>${esc(onboardForm[step.key])}</textarea>`;
  } else if (step.type === "stats") {
    bodyHTML = `<div class="poly-wrap">${renderPolygonSVG()}</div>`;
  } else if (step.type === "promise") {
    bodyHTML = `<p class="fr" style="font-size:17px;line-height:1.6;font-style:italic">${esc(step.promiseText)}</p>`;
  } else if (step.type === "growthFocus") {
    bodyHTML = `<div class="chip-row">${GROWTH_FOCUS_OPTIONS.map((f) => `
      <button class="chip ${onboardForm.growthFocus.includes(f) ? "active" : ""}" data-focus="${f}">${f}</button>
    `).join("")}</div>
    <p class="mono" id="focusCount" style="font-size:12px;color:var(--muted);margin-top:12px">${onboardForm.growthFocus.length}/3 dipilih</p>`;
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
        <button class="btn-primary" id="next" ${isStepValid(onboardStep) ? "" : "disabled"}>${last ? "Lanjut" : "Lanjut"} →</button>
      </div>
    </div>`;

  const fld = document.getElementById("fld");
  if (fld) fld.addEventListener("input", (e) => { onboardForm[step.key] = e.target.value; document.getElementById("next").disabled = !isStepValid(onboardStep); });
  if (step.type === "stats") attachPolygonHandlers();
  document.querySelectorAll(".chip").forEach((b) => {
    b.addEventListener("click", () => {
      const f = b.dataset.focus;
      const i = onboardForm.growthFocus.indexOf(f);
      if (i >= 0) onboardForm.growthFocus.splice(i, 1);
      else if (onboardForm.growthFocus.length < 3) onboardForm.growthFocus.push(f);
      // Targeted DOM update (not a full renderOnboarding()) so the fadeUp
      // animation doesn't restart and flicker on every chip tap.
      document.querySelectorAll(".chip").forEach((el) => {
        el.classList.toggle("active", onboardForm.growthFocus.includes(el.dataset.focus));
      });
      const counter = document.getElementById("focusCount");
      if (counter) counter.textContent = `${onboardForm.growthFocus.length}/3 dipilih`;
      document.getElementById("next").disabled = !isStepValid(onboardStep);
    });
  });
  document.getElementById("back")?.addEventListener("click", () => { onboardStep = Math.max(0, onboardStep - 1); renderOnboarding(); });
  document.getElementById("next").addEventListener("click", () => {
    if (!isStepValid(onboardStep)) return;
    if (!last) { onboardStep++; renderOnboarding(); return; }
    // Static steps done - hand off to the adaptive AI-driven phase.
    adaptivePhase = "loading";
    adaptiveQuestionIndex = 1;
    adaptiveAnswers = [];
    ui = { view: "adaptive" };
    render();
    fetchAdaptiveQuestion();
  });
}

async function fetchAdaptiveQuestion() {
  onboardError = "";
  try {
    const result = await api("/api/onboarding/adaptive-question", {
      method: "POST",
      body: {
        profile: { name: onboardForm.name, situation: onboardForm.situation, values: onboardForm.values, fear: onboardForm.fear },
        growthFocus: onboardForm.growthFocus,
        questionIndex: adaptiveQuestionIndex,
        previousAnswers: adaptiveAnswers,
      },
    });
    adaptiveCurrentQuestion = result.question;
    adaptiveAnswerText = "";
    adaptivePhase = "question";
    render();
  } catch (e) {
    onboardError = e.message;
    adaptivePhase = "question";
    adaptiveCurrentQuestion = "";
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
        profile: { name: onboardForm.name, situation: onboardForm.situation, values: onboardForm.values, fear: onboardForm.fear },
        growthFocus: onboardForm.growthFocus,
        answers: adaptiveAnswers,
      },
    });
    adaptivePhase = "analysis";
    render();
  } catch (e) {
    onboardError = e.message;
    adaptivePhase = "question"; // fall back so there's a retry path, not a dead end
    render();
  }
}

async function submitOnboarding(pathway, pathwayNoun) {
  root.innerHTML = spinnerHTML("AI sedang membaca ceritamu...");
  try {
    await api("/api/profile", {
      method: "POST",
      body: {
        name: onboardForm.name, situation: onboardForm.situation, values: onboardForm.values, fear: onboardForm.fear,
        stats: onboardForm.stats, growthFocus: onboardForm.growthFocus,
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

  if (adaptivePhase === "question") {
    root.innerHTML = `
      <div class="shell">
        <div class="eyebrow mono">ELEVA · ONBOARDING</div>
        <div class="step-dots">${[0, 1, 2].map((i) => `<div class="dot-seg ${i < adaptiveQuestionIndex ? "active" : ""}"></div>`).join("")}</div>
        ${onboardError ? `<p style="color:var(--rust);font-size:13.5px;margin:0 0 16px">${esc(onboardError)}</p>` : ""}
        ${!adaptiveCurrentQuestion ? `<button class="btn-primary" id="retryQ">Coba lagi</button>` : `
        <div class="fadeUp">
          <h1 class="fr" style="font-size:26px;font-weight:600;margin:0 0 20px">${esc(adaptiveCurrentQuestion)}</h1>
          <div class="field"><textarea id="adaptiveAnswer" rows="4" placeholder="Jawab apa adanya..." autofocus>${esc(adaptiveAnswerText)}</textarea></div>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:24px">
          <button class="btn-primary" id="adaptiveNext" ${adaptiveAnswerText.trim().length > 2 ? "" : "disabled"}>Lanjut →</button>
        </div>`}
      </div>`;
    document.getElementById("retryQ")?.addEventListener("click", fetchAdaptiveQuestion);
    document.getElementById("adaptiveAnswer")?.addEventListener("input", (e) => {
      adaptiveAnswerText = e.target.value;
      document.getElementById("adaptiveNext").disabled = adaptiveAnswerText.trim().length <= 2;
    });
    document.getElementById("adaptiveNext")?.addEventListener("click", async () => {
      adaptiveAnswers.push({ question: adaptiveCurrentQuestion, answer: adaptiveAnswerText.trim() });
      if (adaptiveQuestionIndex < 3) {
        adaptiveQuestionIndex++;
        adaptivePhase = "loading";
        render();
        await fetchAdaptiveQuestion();
      } else {
        await fetchChapterAnalysis();
      }
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
