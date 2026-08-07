const MENTOR_SYSTEM = `Kamu adalah mentor AI di dalam produk bernama Eleva — sebuah AI Character Growth System.

Prinsip yang WAJIB kamu pegang:
- Kamu mentor, bukan mesin jawaban. Kamu mengarahkan, bukan menggurui.
- Quest/Acting yang kamu buat harus personal untuk situasi hidup pengguna saat ini, BUKAN checklist generik ("minum air", "bangun jam 5"). Ambil dari ctx.profile.originStory (ringkasan naratif tentang siapa mereka, hasil sintesis dari onboarding — cerita, values, dan ketakutan mereka semua tercermin di situ, bukan field terpisah), Pathway, dan sinyal minat/fokus mereka: ctx.radarSnapshot (bentuk radar 8-sumbu self-assessment mereka — sumbu yang menonjol menandakan area yang sedang paling mereka pedulikan) dan/atau ctx.growthFocus (kategori pilihan eksplisit, cuma ada di akun yang onboarding sebelum radar chart diperkenalkan — pakai kalau ada, radarSnapshot kalau tidak). Ini semua kompas yang mengarahkan Quest/Acting/reflection sepanjang perjalanan, bukan data onboarding yang dilupakan setelah dipakai sekali.
- Satu instruksi utama per hari — bentuknya bisa "Quest" (aksi konkret yang dikerjakan, cocok untuk progress yang terlihat) atau "Acting Method" (praktik cara bersikap sepanjang hari, cocok untuk melatih identitas Pathway yang dipilih, mis. pathway "Sales": "sebelum menjawab, ajukan tiga pertanyaan dulu"). Kamu yang memilih framing mana yang lebih relevan hari itu berdasarkan Pathway dan chapter pengguna — jangan berikan dua-duanya sekaligus.
- Acting Method HARUS berbasis perilaku ("tahan dulu, tanya dulu"), BUKAN berbasis target hasil ("closing 3 deal") — itu akan menggeser Eleva jadi productivity app, bukan character growth app.
- Nada bicara: hangat, jujur, tidak menghakimi, tidak sok tahu, seperti teman yang paham tapi tetap jujur ("Bukan malas. Kamu kehilangan tujuan.") — bukan motivator generik.
- Fokus pada pembentukan identitas ("menjadi seseorang yang reliable"), bukan produktivitas semata.
- Kamu BUKAN terapis. Kalau refleksi pengguna menunjukkan tanda krisis (menyakiti diri sendiri, distres berat, putus asa ekstrem), jangan lanjutkan alur quest seperti biasa — mentorReply/insight harus dengan lembut mengarahkan ke bantuan profesional atau layanan krisis, bukan mengabaikannya demi melanjutkan "cerita".
- Balas HANYA dengan JSON valid. Tidak ada teks, tidak ada backtick, tidak ada penjelasan di luar JSON.`;

const FALLBACK_QUESTS = [
  { title: "Satu langkah kecil, bukan lompatan", description: "Pilih satu hal yang selama ini kamu tunda karena terasa besar. Kerjakan bagian terkecilnya saja, hari ini.", statFocus: "purpose", why: "Kadang arah nggak butuh keputusan besar, cuma butuh gerakan pertama." },
  { title: "Cerita ke satu orang", description: "Hubungi satu orang yang kamu percaya. Bukan basa-basi — ceritakan satu hal nyata tentang kondisimu sekarang.", statFocus: "social", why: "Isolasi terasa aman, tapi diam-diam menguras." },
];

function hasKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

async function callClaude(userContent) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      // MENTOR_SYSTEM is identical on every call (onboarding and daily alike) -
      // cache_control lets repeated calls within the cache window pay ~10% for
      // this portion instead of full price. Below the model's minimum cacheable
      // prefix length this silently just never hits (no error) - see Task 6
      // verification notes, don't assume a hit is happening without checking
      // the logged usage below.
      system: [{ type: "text", text: MENTOR_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userContent }],
    }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Anthropic API error ${response.status}: ${errText.slice(0, 300)}`);
  }
  const data = await response.json();
  if (data.usage) {
    console.log(
      `[claude usage] input=${data.usage.input_tokens} output=${data.usage.output_tokens} ` +
      `cache_write=${data.usage.cache_creation_input_tokens || 0} cache_read=${data.usage.cache_read_input_tokens || 0}`
    );
  }
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  return JSON.parse(clean);
}

async function generateQuest(ctx) {
  if (!hasKey()) return fallbackQuest(ctx);
  try {
    const user = `Konteks pengguna (JSON):\n${JSON.stringify(ctx)}\n\nTugas: buatkan satu instruksi hari ini untuk pengguna ini. Balas JSON dengan bentuk persis:\n{"chapterNumber": number, "chapterTitle": string, "insight": string, "pathwayNoun": string|null, "quest": {"mode": "quest"|"acting", "title": string, "description": string, "statFocus": one of [body,mind,career,finance,emotional,explorer,social,purpose], "why": string}}\n\nAturan: "insight" adalah 2-3 kalimat cara kamu memahami kondisi mereka sekarang, bukan nasihat. "quest.description" harus bisa dikerjakan/dilatih hari ini, konkret, maksimal 2 kalimat. Jika ctx.recentDays kosong, chapterNumber mulai dari 1. Jika ctx.recentDays ada isinya, pertahankan chapterNumber/chapterTitle yang sama seperti ctx.chapterNumber/ctx.chapterTitle kecuali ada pergeseran besar. Untuk "pathwayNoun": jika ctx.pathway ada isinya dan ctx.pathwayNoun bernilai null, turunkan SATU kata benda peran dari pathway itu (mis. pathway "Sales" → "Closer", pathway "Builder" → "Builder"); kalau ctx.pathwayNoun sudah terisi, kembalikan nilai yang sama persis (jangan diganti-ganti tiap hari). Kalau ctx.pathway kosong, pathwayNoun harus null.`;
    const result = await callClaude(user);
    if (!result?.quest?.title) throw new Error("bad shape");
    return result;
  } catch (e) {
    console.error("generateQuest failed, using fallback:", e.message);
    return fallbackQuest(ctx);
  }
}

async function processReflection(ctx) {
  if (!hasKey()) return fallbackReflection();
  try {
    const user = `Konteks (JSON):\n${JSON.stringify(ctx)}\n\nPengguna baru saja merefleksikan quest hari ini. Balas JSON dengan bentuk persis:\n{"statDeltas": {"<stat>": number}, "mentorReply": string, "chapterAdvance": boolean, "newChapterTitle": string|null}\n\nAturan: statDeltas hanya untuk stat yang benar-benar tersentuh oleh refleksi ini, nilai integer 1-5, JANGAN beri nilai jika refleksinya kosong/dangkal. mentorReply singkat (1-3 kalimat), merespons ISI refleksi mereka secara spesifik. chapterAdvance hanya true jika refleksi ini menunjukkan pergeseran pola hidup yang nyata dan signifikan.`;
    return await callClaude(user);
  } catch (e) {
    console.error("processReflection failed, using fallback:", e.message);
    return fallbackReflection();
  }
}

function fallbackQuest(ctx) {
  const q = FALLBACK_QUESTS[Math.floor(Math.random() * FALLBACK_QUESTS.length)];
  return {
    chapterNumber: ctx.chapterNumber || 1,
    chapterTitle: ctx.chapterTitle || "Mencari Arah",
    insight: hasKey()
      ? "Koneksi ke mentor lagi tersendat — tapi ini quest yang tetap relevan buat kebanyakan orang di fase seperti ini."
      : "Mode tanpa API key: quest di bawah ini generik dulu. Tambahkan ANTHROPIC_API_KEY di .env supaya mentor beneran membaca konteksmu.",
    pathwayNoun: ctx.pathwayNoun || (ctx.pathway ? ctx.pathway : null),
    quest: { mode: "quest", ...q },
  };
}

function fallbackReflection() {
  return {
    statDeltas: {},
    mentorReply: "Refleksinya kesimpan. AI mentor belum aktif penuh (API key belum diisi), jadi belum bisa menilai stat growth secara personal untuk sesi ini.",
    chapterAdvance: false,
    newChapterTitle: null,
  };
}

// --- Adaptive onboarding (Task 5 v3 — radar self-assessment + open-ended Q&A) ---

const RADAR_AXIS_LABELS = {
  body: "Body", mind: "Mind", career: "Career", finance: "Finance",
  emotional: "Emotional Stability", explorer: "Explorer", social: "Social", purpose: "Purpose",
};

function highestRadarAxis(radarSnapshot) {
  const entries = Object.entries(radarSnapshot || {});
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

// Fallback-mode questions (no API key). These stand in for the static
// Situasi/Values/Fear steps that v3 removed in favor of the AI-driven
// conversation - since fallback mode has no real conversation, it covers
// the same rough ground (life context, values, fear/obstacle, non-negotiable)
// across exactly the 4-question minimum, same spirit as fallbackQuest/
// fallbackReflection: honest and deterministic, not a fake-intelligence attempt.
const ADAPTIVE_FALLBACK_QUESTIONS = [
  (radarSnapshot) => {
    const axis = highestRadarAxis(radarSnapshot);
    return axis
      ? `Dari radar yang kamu gambar, ${RADAR_AXIS_LABELS[axis] || axis} kelihatan paling menonjol — lagi di fase hidup yang gimana sekarang sampai itu jadi paling kerasa?`
      : "Lagi di fase hidup yang gimana sekarang?";
  },
  () => "Apa yang paling kamu pegang teguh sekarang, walau situasinya nggak gampang?",
  () => "Apa yang paling sering bikin kamu belum berani melangkah ke arah itu?",
  () => "Kalau harus memilih, hal apa yang nggak ingin kamu korbankan dalam prosesnya?",
];
const ADAPTIVE_MIN_QUESTIONS = 4;
const ADAPTIVE_MAX_QUESTIONS = 10;

// ctx: {profile: {name}, radarSnapshot: {body,mind,...}, previousAnswers: [{question,answer}]}
// Returns {question: string|null, confident: boolean}. When confident is true,
// question may be null - the caller should stop and move to Chapter Analysis.
// The 4-minimum/10-maximum bound is enforced here in code, not trusted purely
// from the model's own "confident" self-report - same defense-in-depth
// principle as the crisis-detection phrase list and the 12-word growth-gate
// elsewhere in this codebase (AI instructions are real, but never the only
// thing standing between a rule and its enforcement).
async function generateAdaptiveQuestion(ctx) {
  const answeredCount = (ctx.previousAnswers || []).length;
  if (answeredCount >= ADAPTIVE_MAX_QUESTIONS) return { question: null, confident: true };

  if (!hasKey()) {
    if (answeredCount >= ADAPTIVE_FALLBACK_QUESTIONS.length) return { question: null, confident: true };
    return { question: ADAPTIVE_FALLBACK_QUESTIONS[answeredCount](ctx.radarSnapshot), confident: false };
  }
  try {
    const stageGuidance =
      answeredCount === 0
        ? 'Ini pertanyaan PERTAMA, belum ada jawaban sebelumnya. Gali dari ctx.radarSnapshot (sumbu mana yang paling menonjol/paling rendah) untuk memahami apa yang sedang jadi perhatian besar mereka sekarang — semacam menanyakan "lagi di fase hidup yang gimana", tapi dipicu dari pola radar mereka, bukan generik.'
        : answeredCount < 3
        ? "Masih tahap awal membangun konteks - lanjut gali cerita/situasi hidup mereka lebih dalam dari jawaban sebelumnya, sebelum masuk ke obstacle/values."
        : 'Sudah cukup dalam - mulai arahkan ke obstacle/fear yang menghalangi (kalau belum tergali) atau values/non-negotiables mereka, framing TIDAK LANGSUNG (mis. "Kalau harus memilih... hal apa yang nggak ingin kamu korbankan?", BUKAN "apa nilai hidupmu?").';
    const user = `Konteks pengguna (JSON):\n${JSON.stringify(ctx)}\n\nTugas: ini bagian dari onboarding adaptif Eleva - percakapan bercabang, bukan daftar pertanyaan statis, yang menggantikan pertanyaan Situasi/Values/Fear yang dulu statis. Sudah ada ${answeredCount} jawaban terkumpul (minimal ${ADAPTIVE_MIN_QUESTIONS}, maksimal ${ADAPTIVE_MAX_QUESTIONS} sebelum wajib berhenti).\n\n${stageGuidance}\n\nBalas JSON dengan bentuk persis:\n{"question": string|null, "confident": boolean}\n\nAturan: set "confident":true HANYA kalau kamu sudah punya pemahaman cukup kaya soal cerita hidup, values, DAN hambatan utama mereka untuk bisa membuat Chapter Analysis yang benar-benar personal - kalau true, "question" boleh null (sistem yang menjaga batas minimal/maksimal, kamu tidak perlu menghitung sendiri). Kalau belum confident, isi "question" dengan SATU pertanyaan lanjutan singkat (1-2 kalimat), personal ke konteks mereka, nada hangat dan jujur seperti mentor - bukan form generik.`;
    const result = await callClaude(user);
    if (typeof result?.confident !== "boolean") throw new Error("bad shape");
    if (!result.confident && !result.question) throw new Error("bad shape");
    // Minimum enforced here, not trusted from the model's own self-report -
    // same defense-in-depth principle as crisis-detection and the growth-gate
    // elsewhere in this file/codebase. A too-early confident:true is treated
    // as a policy violation and falls through to the deterministic fallback
    // question below, rather than retried (costs another API call for no
    // real benefit - the fallback question is a perfectly fine substitute).
    if (result.confident && answeredCount < ADAPTIVE_MIN_QUESTIONS) throw new Error("confident too early");
    return result;
  } catch (e) {
    console.error("generateAdaptiveQuestion failed, using fallback:", e.message);
    if (answeredCount >= ADAPTIVE_FALLBACK_QUESTIONS.length) return { question: null, confident: true };
    return { question: ADAPTIVE_FALLBACK_QUESTIONS[answeredCount](ctx.radarSnapshot), confident: false };
  }
}

const PATHWAY_NAMES = ["Builder", "Guardian", "Explorer", "Connector", "Seeker", "Specialist"];
// Cheap, traceable fallback heuristic (no API key) - not meant to approximate
// real AI judgment, just a reasonable non-random default. Real generateChapterAnalysis
// below reads the whole conversation, not just the radar shape.
const RADAR_AXIS_TO_PATHWAY = {
  career: "Builder", finance: "Builder",
  emotional: "Guardian", body: "Guardian",
  explorer: "Explorer",
  social: "Connector",
  purpose: "Seeker",
  mind: "Specialist",
};

async function generateChapterAnalysis(ctx) {
  if (!hasKey()) return fallbackChapterAnalysis(ctx);
  try {
    const user = `Konteks pengguna (JSON):\n${JSON.stringify(ctx)}\n\nTugas: ini akhir dari onboarding adaptif. ctx.radarSnapshot adalah self-assessment 8-sumbu yang mereka gambar sendiri (skala 1-10), dan ctx.answers adalah seluruh percakapan Adaptive Questions yang sudah menggali cerita hidup, values, dan hambatan mereka (menggantikan pertanyaan Situasi/Values/Fear yang dulu statis). Rangkum semuanya jadi Chapter Analysis. Balas JSON dengan bentuk persis:\n{"insight": string, "pathway": "Builder"|"Guardian"|"Explorer"|"Connector"|"Seeker"|"Specialist", "pathwayNoun": string, "secondaryTrait": string|null}\n\nAturan: "insight" adalah rangkuman naratif 2-4 kalimat (nilai utama, gesekan/tantangan utama, arah transformasi) — personal, bukan generik, dan harus berdiri sendiri sebagai pemahaman tentang orang ini (akan dipakai sebagai konteks mentor setiap hari setelahnya, bukan cuma ditampilkan sekali). "pathway" satu rekomendasi dari 6 nama itu berdasarkan pola dari SELURUH konteks (radar + jawaban), bukan cuma sumbu radar tertinggi. "pathwayNoun" satu kata benda peran spesifik buat pengguna ini (mis. kalau pathway Specialist dan konteksnya soal sales → "Closer"; kalau Builder → "Builder"). "secondaryTrait" opsional, satu frasa pendek trait tambahan yang terlihat tapi bukan fokus utama (null kalau tidak ada yang jelas) — informasional saja, bukan pathway kedua. Nada hangat, personal, seperti mentor yang benar-benar mendengarkan.`;
    const result = await callClaude(user);
    if (!result?.pathway || !PATHWAY_NAMES.includes(result.pathway)) throw new Error("bad shape");
    return result;
  } catch (e) {
    console.error("generateChapterAnalysis failed, using fallback:", e.message);
    return fallbackChapterAnalysis(ctx);
  }
}

function fallbackChapterAnalysis(ctx) {
  const axis = highestRadarAxis(ctx.radarSnapshot);
  const pathway = RADAR_AXIS_TO_PATHWAY[axis] || "Seeker";
  return {
    insight: hasKey()
      ? "Koneksi ke mentor lagi tersendat — tapi dari yang kamu ceritakan, ini arah yang tetap relevan buat dicoba."
      : "Mode tanpa API key: analisis di bawah ini masih berbasis pola sederhana dari radar-mu, belum benar-benar membaca ceritamu. Tambahkan ANTHROPIC_API_KEY di .env supaya mentor beneran personal.",
    pathway,
    pathwayNoun: pathway,
    secondaryTrait: null,
  };
}

module.exports = {
  generateQuest, processReflection, hasKey,
  generateAdaptiveQuestion, generateChapterAnalysis,
};
