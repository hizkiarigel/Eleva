const STAT_ORDER = [
  ["body", "Body"], ["mind", "Mind"], ["career", "Career"], ["finance", "Finance"],
  ["emotional", "Emotional Stability"], ["explorer", "Explorer"], ["social", "Social"], ["purpose", "Purpose"],
];

const root = document.getElementById("root");

const onboardForm = {
  name: "", situation: "", values: "", fear: "",
  stats: { body: 5, mind: 5, career: 5, finance: 5, emotional: 5, explorer: 5, social: 5, purpose: 5 },
};
let onboardStep = 0;
let ui = { view: "loading", label: "Membuka Eleva..." };
let appState = null;
let reflectOpen = false;
let reflectStatus = "done";
let reflectText = "";
let resetArmed = false;

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
  if (!res.ok) throw new Error(data.error || "Request gagal");
  return data;
}

async function boot() {
  ui = { view: "loading", label: "Membuka Eleva..." };
  render();
  try {
    appState = await api("/api/state");
  } catch (e) {
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

const ONBOARD_STEPS = [
  { key: "name", q: "Siapa namamu?", type: "text", placeholder: "Nama panggilan" },
  { key: "situation", q: "Lagi di fase hidup yang gimana sekarang?", sub: "Nggak perlu rapi. Tulis aja apa adanya.", type: "textarea", placeholder: "Ceritakan singkat kondisimu sekarang..." },
  { key: "values", q: "Apa yang paling kamu pegang teguh sekarang?", sub: "Nilai, prinsip, atau hal yang penting buat kamu.", type: "textarea", placeholder: "Misalnya: kejujuran, keluarga, kebebasan..." },
  { key: "fear", q: "Apa yang paling kamu hindari atau takutkan sekarang?", type: "textarea", placeholder: "Boleh jujur, ini cuma buat kamu dan mentor AI-mu." },
  { key: "stats", q: "Nilai dirimu sekarang, jujur aja", sub: "1 = jauh dari yang kamu mau, 10 = sudah sesuai.", type: "stats" },
];

function isStepValid(step) {
  const s = ONBOARD_STEPS[step];
  if (s.type === "stats") return true;
  return (onboardForm[s.key] || "").trim().length > (s.key === "name" ? 0 : 2);
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
    bodyHTML = STAT_ORDER.map(([k, label]) => `
      <div class="slider-row">
        <div class="row-top"><span class="label">${label}</span><span class="val" id="val-${k}">${onboardForm.stats[k]}</span></div>
        <input type="range" min="1" max="10" value="${onboardForm.stats[k]}" data-stat="${k}" />
      </div>`).join("");
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
        <button class="btn-primary" id="next" ${isStepValid(onboardStep) ? "" : "disabled"}>${last ? "Mulai perjalanan" : "Lanjut"} →</button>
      </div>
    </div>`;

  const fld = document.getElementById("fld");
  if (fld) fld.addEventListener("input", (e) => { onboardForm[step.key] = e.target.value; document.getElementById("next").disabled = !isStepValid(onboardStep); });
  document.querySelectorAll("input[type=range]").forEach((r) => {
    r.addEventListener("input", (e) => {
      const k = e.target.dataset.stat;
      onboardForm.stats[k] = Number(e.target.value);
      document.getElementById(`val-${k}`).textContent = e.target.value;
    });
  });
  document.getElementById("back")?.addEventListener("click", () => { onboardStep = Math.max(0, onboardStep - 1); renderOnboarding(); });
  document.getElementById("next").addEventListener("click", async () => {
    if (!isStepValid(onboardStep)) return;
    if (!last) { onboardStep++; renderOnboarding(); return; }
    root.innerHTML = spinnerHTML("AI sedang membaca ceritamu...");
    try {
      await api("/api/profile", { method: "POST", body: onboardForm });
      await boot();
    } catch (e) {
      ui = { view: "error", message: e.message };
      render();
    }
  });
}

function renderDashboard() {
  const s = appState;
  const today = s.today;
  const hasReflection = Boolean(today?.reflection);

  const questInner = !today ? spinnerHTML("AI sedang menyusun quest hari ini...") : `
    <div class="qlabel mono">QUEST HARI INI</div>
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
    resetArmed = false; onboardStep = 0;
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
  if (ui.view === "onboarding") return renderOnboarding();
  if (ui.view === "dashboard") return renderDashboard();
}

boot();
