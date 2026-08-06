import React, { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, ChevronRight, RotateCcw } from "lucide-react";

const STAT_ORDER = [
  ["body", "Body"],
  ["mind", "Mind"],
  ["career", "Career"],
  ["finance", "Finance"],
  ["emotional", "Emotional Stability"],
  ["explorer", "Explorer"],
  ["social", "Social"],
  ["purpose", "Purpose"],
];

const PATHWAY_PRESETS = [
  { key: "Builder", desc: "Membangun sesuatu dari nol, butuh konsistensi untuk menyelesaikannya." },
  { key: "Guardian", desc: "Belajar stabil secara emosi, jadi sandaran diri sendiri dulu." },
  { key: "Explorer", desc: "Keluar dari rutinitas lama, mencoba arah yang belum pernah dijalani." },
  { key: "Connector", desc: "Membangun ulang relasi/koneksi sosial yang sempat renggang." },
  { key: "Seeker", desc: "Belum tahu arah pastinya, dan sedang aktif mencari." },
  { key: "Specialist", desc: "Nggak cocok ke lima di atas — tulis sendiri spesialisasimu." },
];

const MATURITY_TIERS = ["Emerging", "Practicing", "Reliable", "System", "Master"];
function maturityTier(growthSessions) {
  return MATURITY_TIERS[Math.min(MATURITY_TIERS.length - 1, Math.floor((growthSessions || 0) / 3))];
}

const todayKey = () => {
  const d = new Date();
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD, local time
};

const dayLabel = (key) => {
  try {
    const d = new Date(key + "T00:00:00");
    return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
  } catch {
    return key;
  }
};

function wordCount(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

async function callClaude(system, userContent) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  const data = await response.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  return JSON.parse(clean);
}

const MENTOR_SYSTEM = `Kamu adalah mentor AI di dalam produk bernama Eleva — sebuah AI Character Growth System.

Prinsip yang WAJIB kamu pegang:
- Kamu mentor, bukan mesin jawaban. Kamu mengarahkan, bukan menggurui.
- Quest/Acting yang kamu buat harus personal untuk situasi hidup pengguna saat ini, BUKAN checklist generik ("minum air", "bangun jam 5"). Ambil dari cerita, values, ketakutan, DAN Pathway yang mereka pilih.
- Satu instruksi utama per hari — bentuknya bisa "Quest" (aksi konkret yang dikerjakan, cocok untuk progress yang terlihat) atau "Acting Method" (praktik cara bersikap sepanjang hari, cocok untuk melatih identitas Pathway yang dipilih, mis. pathway "Sales": "sebelum menjawab, ajukan tiga pertanyaan dulu"). Kamu yang memilih framing mana yang lebih relevan hari itu berdasarkan Pathway dan chapter pengguna — jangan berikan dua-duanya sekaligus.
- Acting Method HARUS berbasis perilaku ("tahan dulu, tanya dulu"), BUKAN berbasis target hasil ("closing 3 deal") — itu akan menggeser Eleva jadi productivity app, bukan character growth app.
- Nada bicara: hangat, jujur, tidak menghakimi, tidak sok tahu, seperti teman yang paham tapi tetap jujur ("Bukan malas. Kamu kehilangan tujuan.") — bukan motivator generik.
- Fokus pada pembentukan identitas ("menjadi seseorang yang reliable"), bukan produktivitas semata.
- Balas HANYA dengan JSON valid. Tidak ada teks, tidak ada backtick, tidak ada penjelasan di luar JSON.`;

async function generateQuest(ctx) {
  const user = `Konteks pengguna (JSON):\n${JSON.stringify(ctx)}\n\nTugas: buatkan satu instruksi hari ini untuk pengguna ini. Balas JSON dengan bentuk persis:\n{"chapterNumber": number, "chapterTitle": string, "insight": string, "pathwayNoun": string|null, "quest": {"mode": "quest"|"acting", "title": string, "description": string, "statFocus": one of [body,mind,career,finance,emotional,explorer,social,purpose], "why": string}}\n\nAturan: "insight" adalah 2-3 kalimat cara kamu memahami kondisi mereka sekarang (Understand phase), bukan nasihat. "quest.description" harus bisa dikerjakan/dilatih hari ini, konkret, maksimal 2 kalimat. Jika ctx.recentDays kosong, chapterNumber mulai dari 1 dan chapterTitle mencerminkan fase awal mereka. Jika ctx.recentDays ada isinya, pertahankan chapterNumber/chapterTitle yang sama kecuali ada pergeseran besar. Untuk "pathwayNoun": jika ctx.pathway ada isinya dan ctx.pathwayNoun bernilai null, turunkan SATU kata benda peran dari pathway itu (mis. pathway "Sales" → "Closer", pathway "Builder" → "Builder"); kalau ctx.pathwayNoun sudah terisi, kembalikan nilai yang sama persis (jangan diganti-ganti tiap hari). Kalau ctx.pathway kosong, pathwayNoun harus null.`;
  return callClaude(MENTOR_SYSTEM, user);
}

async function processReflection(ctx) {
  const user = `Konteks (JSON):\n${JSON.stringify(ctx)}\n\nPengguna baru saja merefleksikan quest hari ini. Balas JSON dengan bentuk persis:\n{"statDeltas": {"<stat>": number}, "mentorReply": string, "chapterAdvance": boolean, "newChapterTitle": string|null}\n\nAturan: statDeltas hanya untuk stat yang benar-benar tersentuh oleh refleksi ini, nilai integer 1-5, JANGAN beri nilai jika refleksinya kosong/dangkal. mentorReply singkat (1-3 kalimat), merespons ISI refleksi mereka secara spesifik, bukan template. chapterAdvance hanya true jika refleksi ini menunjukkan pergeseran pola hidup yang nyata dan signifikan, bukan sekadar satu hari baik.`;
  return callClaude(MENTOR_SYSTEM, user);
}

const FALLBACK_QUESTS = [
  { title: "Satu langkah kecil, bukan lompatan", description: "Pilih satu hal yang selama ini kamu tunda karena terasa besar. Kerjakan bagian terkecilnya saja, hari ini.", statFocus: "purpose", why: "Kadang arah nggak butuh keputusan besar, cuma butuh gerakan pertama." },
  { title: "Cerita ke satu orang", description: "Hubungi satu orang yang kamu percaya. Bukan basa-basi — ceritakan satu hal nyata tentang kondisimu sekarang.", statFocus: "social", why: "Isolasi terasa aman, tapi diam-diam menguras." },
];

function fallbackQuest(ctx) {
  const q = FALLBACK_QUESTS[Math.floor(Math.random() * FALLBACK_QUESTS.length)];
  return {
    chapterNumber: ctx.chapterNumber || 1,
    chapterTitle: ctx.chapterTitle || "Mencari Arah",
    insight: "Koneksi ke mentor lagi tersendat — tapi ini quest yang tetap relevan buat kebanyakan orang di fase seperti ini.",
    pathwayNoun: ctx.pathwayNoun || (ctx.pathway ? ctx.pathway : null),
    quest: { mode: "quest", ...q },
  };
}

async function loadJSON(key) {
  try {
    const r = await window.storage.get(key, false);
    return r ? JSON.parse(r.value) : null;
  } catch {
    return null;
  }
}
async function saveJSON(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value), false);
  } catch (e) {
    console.error("storage set failed", e);
  }
}

const emptyStats = () => ({ body: 20, mind: 20, career: 20, finance: 20, emotional: 20, explorer: 20, social: 20, purpose: 20 });

export default function ElevaApp() {
  const [phase, setPhase] = useState("boot"); // boot | onboarding | analyzing | dashboard | reflecting | saving
  const [profile, setProfile] = useState(null);
  const [state, setState] = useState(null); // { stats, chapterNumber, chapterTitle, growthSessions, days:{} }
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", situation: "", values: "", fear: "", pathway: null, pathwayCustom: "", stats: { body: 5, mind: 5, career: 5, finance: 5, emotional: 5, explorer: 5, social: 5, purpose: 5 } });
  const [errorMsg, setErrorMsg] = useState(null);
  const [reflectStatus, setReflectStatus] = useState("done");
  const [reflectText, setReflectText] = useState("");
  const [resetArmed, setResetArmed] = useState(false);
  const bootRan = useRef(false);

  useEffect(() => {
    if (bootRan.current) return;
    bootRan.current = true;
    (async () => {
      const p = await loadJSON("eleva:profile");
      const s = await loadJSON("eleva:state");
      if (p && s) {
        setProfile(p);
        setState(s);
        setPhase("dashboard");
      } else {
        setPhase("onboarding");
      }
    })();
  }, []);

  // fetch today's quest if missing once on dashboard
  useEffect(() => {
    if (phase !== "dashboard" || !state || !profile) return;
    const tk = todayKey();
    if (!state.days[tk]) {
      ensureTodayQuest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, state, profile]);

  const ensureTodayQuest = useCallback(async () => {
    setErrorMsg(null);
    const tk = todayKey();
    setPhase("questLoading");
    const recentDays = Object.entries(state.days)
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .slice(0, 3)
      .map(([date, d]) => ({
        date,
        quest: d.quest?.title,
        status: d.reflection?.status,
        reflection: d.reflection?.text?.slice(0, 200),
      }));
    const ctx = {
      profile: { name: profile.name, situation: profile.situation, values: profile.values, fear: profile.fear },
      pathway: profile.pathway || null,
      pathwayNoun: state.pathwayNoun || null,
      stats: state.stats,
      chapterNumber: state.chapterNumber,
      chapterTitle: state.chapterTitle,
      recentDays,
      today: tk,
    };
    let result;
    try {
      result = await generateQuest(ctx);
      if (!result?.quest?.title) throw new Error("bad shape");
    } catch (e) {
      result = fallbackQuest(ctx);
    }
    const newState = {
      ...state,
      chapterNumber: result.chapterNumber || state.chapterNumber,
      chapterTitle: result.chapterTitle || state.chapterTitle,
      pathwayNoun: state.pathwayNoun || result.pathwayNoun || null,
      days: {
        ...state.days,
        [tk]: { quest: result.quest, insight: result.insight, reflection: null },
      },
    };
    setState(newState);
    await saveJSON("eleva:state", newState);
    setPhase("dashboard");
  }, [state, profile]);

  async function submitOnboarding() {
    setPhase("analyzing");
    const pathwayValue = form.pathway === "Specialist" ? (form.pathwayCustom.trim() || "Specialist") : form.pathway;
    const p = {
      name: form.name.trim() || "Kamu",
      situation: form.situation.trim(),
      values: form.values.trim(),
      fear: form.fear.trim(),
      pathway: pathwayValue,
      createdAt: new Date().toISOString(),
    };
    const initialStats = Object.fromEntries(
      Object.entries(form.stats).map(([k, v]) => [k, Math.round(v * 10)])
    );
    const ctx = {
      profile: { name: p.name, situation: p.situation, values: p.values, fear: p.fear },
      pathway: pathwayValue,
      pathwayNoun: null,
      stats: initialStats,
      chapterNumber: null,
      chapterTitle: null,
      recentDays: [],
      today: todayKey(),
    };
    let result;
    try {
      result = await generateQuest(ctx);
      if (!result?.quest?.title) throw new Error("bad shape");
    } catch (e) {
      result = fallbackQuest({ chapterNumber: 1, chapterTitle: "Mencari Arah", pathway: pathwayValue });
    }
    const s = {
      stats: initialStats,
      chapterNumber: result.chapterNumber || 1,
      chapterTitle: result.chapterTitle || "Mencari Arah",
      pathwayNoun: result.pathwayNoun || pathwayValue || null,
      growthSessions: 0,
      days: {
        [todayKey()]: { quest: result.quest, insight: result.insight, reflection: null },
      },
    };
    await saveJSON("eleva:profile", p);
    await saveJSON("eleva:state", s);
    setProfile(p);
    setState(s);
    setPhase("dashboard");
  }

  async function submitReflection() {
    const tk = todayKey();
    const day = state.days[tk];
    const eligible = (reflectStatus === "done" || reflectStatus === "partial") && wordCount(reflectText) >= 12;
    setPhase("saving");
    const ctx = {
      profile: { name: profile.name, situation: profile.situation },
      quest: day.quest,
      status: reflectStatus,
      reflectionText: reflectText.trim(),
      stats: state.stats,
      growthSessions: state.growthSessions,
    };
    let result;
    try {
      result = await processReflection(ctx);
    } catch (e) {
      result = { statDeltas: {}, mentorReply: "Makasih udah cerita — ini kesimpan, dan kelihatan di perjalanan chapter kamu.", chapterAdvance: false, newChapterTitle: null };
    }
    const deltas = eligible ? (result.statDeltas || {}) : {};
    const newStats = { ...state.stats };
    Object.entries(deltas).forEach(([k, v]) => {
      if (newStats[k] !== undefined && typeof v === "number") {
        newStats[k] = Math.max(0, Math.min(100, newStats[k] + Math.max(0, Math.min(5, Math.round(v)))));
      }
    });
    const newGrowthSessions = state.growthSessions + (eligible && Object.keys(deltas).length > 0 ? 1 : 0);
    const allowAdvance = result.chapterAdvance && newGrowthSessions > 0 && newGrowthSessions % 5 === 0;

    const newState = {
      ...state,
      stats: newStats,
      growthSessions: newGrowthSessions,
      chapterNumber: allowAdvance ? state.chapterNumber + 1 : state.chapterNumber,
      chapterTitle: allowAdvance && result.newChapterTitle ? result.newChapterTitle : state.chapterTitle,
      days: {
        ...state.days,
        [tk]: {
          ...day,
          reflection: {
            status: reflectStatus,
            text: reflectText.trim(),
            deltas,
            mentorReply: eligible
              ? result.mentorReply
              : "Coba ceritain lebih banyak apa yang sebenarnya terjadi — segelintir kata belum cukup buat pertumbuhan kelihatan nyata (dan itu memang sengaja begitu).",
            timestamp: new Date().toISOString(),
          },
        },
      },
    };
    setState(newState);
    await saveJSON("eleva:state", newState);
    setReflectText("");
    setPhase("dashboard");
  }

  async function resetAll() {
    await saveJSON("eleva:profile", null);
    await saveJSON("eleva:state", null);
    setProfile(null);
    setState(null);
    setForm({ name: "", situation: "", values: "", fear: "", pathway: null, pathwayCustom: "", stats: { body: 5, mind: 5, career: 5, finance: 5, emotional: 5, explorer: 5, social: 5, purpose: 5 } });
    setStep(0);
    setPhase("onboarding");
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "Inter, sans-serif" }}>
      <GlobalStyle />
      {phase === "boot" && <Centered><Spinner label="Membuka Eleva..." /></Centered>}
      {phase === "onboarding" && (
        <Onboarding form={form} setForm={setForm} step={step} setStep={setStep} onSubmit={submitOnboarding} />
      )}
      {phase === "analyzing" && (
        <Centered>
          <Spinner label="AI sedang membaca ceritamu..." />
        </Centered>
      )}
      {(phase === "dashboard" || phase === "questLoading" || phase === "reflecting" || phase === "saving") && state && profile && (
        <Dashboard
          profile={profile}
          state={state}
          phase={phase}
          setPhase={setPhase}
          reflectStatus={reflectStatus}
          setReflectStatus={setReflectStatus}
          reflectText={reflectText}
          setReflectText={setReflectText}
          onSubmitReflection={submitReflection}
          resetArmed={resetArmed}
          setResetArmed={setResetArmed}
          onReset={resetAll}
        />
      )}
    </div>
  );
}

const BG = "#14141c";
const SURFACE = "#1d1d28";
const SURFACE2 = "#23212e";
const TEXT = "#edeae3";
const MUTED = "#8b8a99";
const ACCENT = "#e8a33d";
const GROWTH = "#7fa98f";
const RUST = "#b5544a";
const HAIR = "rgba(255,255,255,0.08)";

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,500&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
      * { box-sizing: border-box; }
      body { margin: 0; }
      .fr { font-family: 'Fraunces', serif; }
      .mono { font-family: 'IBM Plex Mono', monospace; }
      input, textarea { font-family: 'Inter', sans-serif; }
      input[type=range] { accent-color: ${ACCENT}; width: 100%; }
      ::selection { background: ${ACCENT}55; }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      .fadeUp { animation: fadeUp 0.35s ease both; }
      @keyframes breathe { 0%,100% { opacity: .5; } 50% { opacity: 1; } }
      .breathe { animation: breathe 1.6s ease-in-out infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      button { cursor: pointer; }
      textarea:focus, input:focus, button:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 2px; }
    `}</style>
  );
}

function Centered({ children }) {
  return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>;
}

function Spinner({ label }) {
  return (
    <div style={{ textAlign: "center", color: MUTED }}>
      <Loader2 size={28} style={{ animation: "spin 1s linear infinite" }} />
      <div className="mono" style={{ marginTop: 14, fontSize: 13, letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

function Shell({ children, width = 520 }) {
  return (
    <div style={{ maxWidth: width, margin: "0 auto", padding: "48px 24px 80px" }}>{children}</div>
  );
}

function StepDots({ count, active }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i <= active ? ACCENT : HAIR, transition: "background .3s" }} />
      ))}
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled, full }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "#3a3730" : ACCENT,
        color: "#1a1409",
        border: "none",
        borderRadius: 8,
        padding: "13px 22px",
        fontSize: 15,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        width: full ? "100%" : "auto",
        justifyContent: "center",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, color = MUTED }) {
  return (
    <button onClick={onClick} style={{ background: "transparent", border: "none", color, fontSize: 13, padding: "8px 4px" }}>
      {children}
    </button>
  );
}

function TextField({ value, onChange, placeholder, textarea, autoFocus }) {
  const common = {
    value,
    onChange: (e) => onChange(e.target.value),
    placeholder,
    autoFocus,
    style: {
      width: "100%",
      background: SURFACE,
      border: `1px solid ${HAIR}`,
      borderRadius: 8,
      padding: "13px 14px",
      color: TEXT,
      fontSize: 15,
      resize: "vertical",
    },
  };
  return textarea ? <textarea rows={4} {...common} /> : <input type="text" {...common} />;
}

function Onboarding({ form, setForm, step, setStep, onSubmit }) {
  const steps = [
    {
      q: "Siapa namamu?",
      body: <TextField value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Nama panggilan" autoFocus />,
      valid: form.name.trim().length > 0,
    },
    {
      q: "Lagi di fase hidup yang gimana sekarang?",
      sub: "Nggak perlu rapi. Tulis aja apa adanya.",
      body: <TextField textarea value={form.situation} onChange={(v) => setForm({ ...form, situation: v })} placeholder="Ceritakan singkat kondisimu sekarang..." autoFocus />,
      valid: form.situation.trim().length > 3,
    },
    {
      q: "Apa yang paling kamu pegang teguh sekarang?",
      sub: "Nilai, prinsip, atau hal yang penting buat kamu.",
      body: <TextField textarea value={form.values} onChange={(v) => setForm({ ...form, values: v })} placeholder="Misalnya: kejujuran, keluarga, kebebasan..." autoFocus />,
      valid: form.values.trim().length > 2,
    },
    {
      q: "Apa yang paling kamu hindari atau takutkan sekarang?",
      body: <TextField textarea value={form.fear} onChange={(v) => setForm({ ...form, fear: v })} placeholder="Boleh jujur, ini cuma buat kamu dan mentor AI-mu." autoFocus />,
      valid: form.fear.trim().length > 2,
    },
    {
      q: "Nilai dirimu sekarang, jujur aja",
      sub: "1 = jauh dari yang kamu mau, 10 = sudah sesuai.",
      body: (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 4 }}>
          {STAT_ORDER.map(([key, label]) => (
            <div key={key}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span className="mono" style={{ color: MUTED }}>{label}</span>
                <span className="mono" style={{ color: ACCENT }}>{form.stats[key]}</span>
              </div>
              <input
                type="range" min={1} max={10} value={form.stats[key]}
                onChange={(e) => setForm({ ...form, stats: { ...form.stats, [key]: Number(e.target.value) } })}
              />
            </div>
          ))}
        </div>
      ),
      valid: true,
    },
    {
      q: "Sekarang, pilih jalanmu",
      sub: "Dari yang barusan kamu ceritain — ini enam arah yang bisa kamu latih sengaja, mulai sekarang. Bisa diganti kapan aja nanti.",
      body: (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PATHWAY_PRESETS.map((pw) => (
              <button
                key={pw.key}
                onClick={() => setForm({ ...form, pathway: pw.key })}
                style={{
                  textAlign: "left", padding: "12px 14px", borderRadius: 8,
                  border: `1px solid ${form.pathway === pw.key ? ACCENT : HAIR}`,
                  background: form.pathway === pw.key ? `${ACCENT}18` : SURFACE,
                  color: TEXT,
                }}
              >
                <div className="fr" style={{ fontWeight: 600, fontSize: 15, color: form.pathway === pw.key ? ACCENT : TEXT }}>{pw.key}</div>
                <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>{pw.desc}</div>
              </button>
            ))}
          </div>
          {form.pathway === "Specialist" && (
            <div style={{ marginTop: 12 }}>
              <TextField value={form.pathwayCustom} onChange={(v) => setForm({ ...form, pathwayCustom: v })} placeholder="Spesialisasi kamu apa? (mis. Sales, Public Speaking...)" autoFocus />
            </div>
          )}
        </div>
      ),
      valid: Boolean(form.pathway) && (form.pathway !== "Specialist" || form.pathwayCustom.trim().length > 1),
    },
  ];
  const cur = steps[step];
  const last = step === steps.length - 1;

  return (
    <Shell>
      <div className="mono" style={{ color: MUTED, fontSize: 12, letterSpacing: 1.5, marginBottom: 8 }}>ELEVA · ONBOARDING</div>
      <StepDots count={steps.length} active={step} />
      <div key={step} className="fadeUp">
        <h1 className="fr" style={{ fontSize: 28, fontWeight: 600, margin: "0 0 6px" }}>{cur.q}</h1>
        {cur.sub && <p style={{ color: MUTED, fontSize: 14, margin: "0 0 20px" }}>{cur.sub}</p>}
        {!cur.sub && <div style={{ height: 20 }} />}
        {cur.body}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28 }}>
        {step > 0 ? <GhostButton onClick={() => setStep(step - 1)}>Kembali</GhostButton> : <span />}
        <PrimaryButton disabled={!cur.valid} onClick={() => (last ? onSubmit() : setStep(step + 1))}>
          {last ? "Mulai perjalanan" : "Lanjut"} <ChevronRight size={16} />
        </PrimaryButton>
      </div>
    </Shell>
  );
}

function StatBar({ label, value }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
        <span style={{ color: MUTED }}>{label}</span>
        <span className="mono" style={{ color: TEXT }}>{value}</span>
      </div>
      <div style={{ height: 7, borderRadius: 4, background: HAIR, overflow: "hidden", position: "relative" }}>
        <div
          style={{
            width: `${value}%`,
            height: "100%",
            background: `repeating-linear-gradient(115deg, ${GROWTH}, ${GROWTH} 6px, ${GROWTH}dd 6px, ${GROWTH}dd 9px)`,
            borderRadius: 4,
            transition: "width .6s ease",
          }}
        />
      </div>
    </div>
  );
}

function ChapterHeader({ number, title, insight, pathwayNoun, growthSessions }) {
  return (
    <div style={{ marginBottom: 30 }}>
      <div className="mono" style={{ color: ACCENT, fontSize: 12, letterSpacing: 2, marginBottom: 6 }}>BAB {number}</div>
      <h1 className="fr" style={{ fontSize: 34, fontWeight: 600, margin: "0 0 10px" }}>{title}</h1>
      <div style={{ width: 46, height: 2, background: ACCENT, marginBottom: 14 }} />
      {pathwayNoun && (
        <div className="mono" style={{ fontSize: 12, color: GROWTH, marginBottom: 12, letterSpacing: 0.5 }}>
          {maturityTier(growthSessions)} {pathwayNoun}
        </div>
      )}
      {insight && <p className="fr" style={{ fontStyle: "italic", color: MUTED, fontSize: 15, lineHeight: 1.6, margin: 0 }}>{insight}</p>}
    </div>
  );
}

function Dashboard(props) {
  const { profile, state, phase, setPhase, reflectStatus, setReflectStatus, reflectText, setReflectText, onSubmitReflection, resetArmed, setResetArmed, onReset } = props;
  const tk = todayKey();
  const today = state.days[tk];
  const history = Object.entries(state.days).filter(([d]) => d !== tk).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 8);

  if (phase === "reflecting") {
    return (
      <Shell>
        <GhostButton onClick={() => setPhase("dashboard")}>← Batal</GhostButton>
        <h1 className="fr" style={{ fontSize: 26, fontWeight: 600, margin: "14px 0 4px" }}>{today.quest.title}</h1>
        <p style={{ color: MUTED, fontSize: 14, margin: "0 0 24px" }}>{today.quest.description}</p>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 8 }}>Gimana progressnya?</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[["done", "Selesai"], ["partial", "Sebagian"], ["skipped", "Nggak sempat"]].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setReflectStatus(k)}
                style={{
                  flex: 1, padding: "10px 8px", borderRadius: 8, fontSize: 13,
                  border: `1px solid ${reflectStatus === k ? ACCENT : HAIR}`,
                  background: reflectStatus === k ? `${ACCENT}22` : SURFACE,
                  color: reflectStatus === k ? ACCENT : TEXT,
                }}
              >{l}</button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 13, color: MUTED, marginBottom: 8 }}>
          Ceritakan apa yang sebenarnya terjadi
          <span style={{ display: "block", fontSize: 12, marginTop: 2, color: wordCount(reflectText) >= 12 ? GROWTH : MUTED }}>
            {wordCount(reflectText)} kata {wordCount(reflectText) < 12 ? "· minimal ~12 kata biar stat bisa naik (bukan checklist)" : "· cukup buat dianalisis"}
          </span>
        </div>
        <TextField textarea value={reflectText} onChange={setReflectText} placeholder="Apa yang kamu lakukan, apa yang kerasa, apa yang berubah..." autoFocus />

        <div style={{ marginTop: 20 }}>
          <PrimaryButton full disabled={phase === "saving"} onClick={onSubmitReflection}>
            {phase === "saving" ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Menyimpan...</> : "Simpan refleksi"}
          </PrimaryButton>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <div className="mono" style={{ color: MUTED, fontSize: 12, letterSpacing: 1.5 }}>ELEVA</div>
        <div className="mono" style={{ color: MUTED, fontSize: 12 }}>{dayLabel(tk)}</div>
      </div>

      <ChapterHeader number={state.chapterNumber} title={state.chapterTitle} insight={today?.insight} pathwayNoun={state.pathwayNoun} growthSessions={state.growthSessions} />

      {/* Today's quest */}
      <div style={{ background: SURFACE2, border: `1px solid ${HAIR}`, borderRadius: 12, padding: 22, marginBottom: 28, position: "relative" }}>
        <div style={{ position: "absolute", top: 20, right: 20, width: 10, height: 10, borderRadius: "50%", background: today?.reflection ? GROWTH : ACCENT, boxShadow: today?.reflection ? "none" : `0 0 0 4px ${ACCENT}22` }} />
        {phase === "questLoading" || !today ? (
          <Spinner label="AI sedang menyusun quest hari ini..." />
        ) : (
          <>
            <div className="mono" style={{ fontSize: 11, color: MUTED, letterSpacing: 1, marginBottom: 8 }}>
              {today.quest.mode === "acting" ? "ACTING METHOD HARI INI" : "QUEST HARI INI"}
            </div>
            <h2 className="fr" style={{ fontSize: 21, fontWeight: 600, margin: "0 0 8px" }}>{today.quest.title}</h2>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: TEXT, margin: "0 0 10px" }}>{today.quest.description}</p>
            <p style={{ fontSize: 13, color: MUTED, margin: "0 0 16px", fontStyle: "italic" }}>{today.quest.why}</p>

            {!today.reflection ? (
              <PrimaryButton onClick={() => setPhase("reflecting")}>Tandai & refleksi</PrimaryButton>
            ) : (
              <div style={{ borderTop: `1px solid ${HAIR}`, paddingTop: 14, marginTop: 4 }}>
                <div className="mono" style={{ fontSize: 11, color: GROWTH, letterSpacing: 1, marginBottom: 6 }}>
                  {today.reflection.status === "done" ? "SELESAI" : today.reflection.status === "partial" ? "SEBAGIAN" : "DILEWATI"}
                </div>
                <p className="fr" style={{ fontStyle: "italic", fontSize: 14.5, color: TEXT, margin: 0, lineHeight: 1.6 }}>{today.reflection.mentorReply}</p>
                {Object.keys(today.reflection.deltas || {}).length > 0 && (
                  <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {Object.entries(today.reflection.deltas).map(([k, v]) => (
                      <span key={k} className="mono" style={{ fontSize: 11, background: `${GROWTH}22`, color: GROWTH, padding: "3px 8px", borderRadius: 20 }}>
                        {STAT_ORDER.find((s) => s[0] === k)?.[1] || k} +{v}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Stats */}
      <div style={{ marginBottom: 28 }}>
        <div className="mono" style={{ fontSize: 11, color: MUTED, letterSpacing: 1, marginBottom: 14 }}>CHARACTER STATS</div>
        {STAT_ORDER.map(([k, label]) => (
          <StatBar key={k} label={label} value={state.stats[k]} />
        ))}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div className="mono" style={{ fontSize: 11, color: MUTED, letterSpacing: 1, marginBottom: 12 }}>RIWAYAT</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {history.map(([date, d]) => (
              <div key={date} style={{ borderLeft: `2px solid ${d.reflection ? GROWTH : HAIR}`, paddingLeft: 12 }}>
                <div className="mono" style={{ fontSize: 11, color: MUTED }}>{date}</div>
                <div style={{ fontSize: 13.5, color: TEXT }}>{d.quest?.title}</div>
                {d.reflection?.text && <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>{d.reflection.text.slice(0, 90)}{d.reflection.text.length > 90 ? "…" : ""}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ borderTop: `1px solid ${HAIR}`, paddingTop: 16, textAlign: "center" }}>
        {resetArmed ? (
          <GhostButton color={RUST} onClick={onReset}>Yakin? Tap sekali lagi buat reset semua data</GhostButton>
        ) : (
          <GhostButton onClick={() => setResetArmed(true)}><RotateCcw size={12} style={{ verticalAlign: -2, marginRight: 4 }} />Reset data</GhostButton>
        )}
      </div>
    </Shell>
  );
}
