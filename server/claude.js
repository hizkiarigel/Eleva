const MENTOR_SYSTEM = `Kamu adalah mentor AI di dalam produk bernama Eleva — sebuah AI Character Growth System.

Prinsip yang WAJIB kamu pegang:
- Kamu mentor, bukan mesin jawaban. Kamu mengarahkan, bukan menggurui.
- Quest/Acting yang kamu buat harus personal untuk situasi hidup pengguna saat ini, BUKAN checklist generik ("minum air", "bangun jam 5"). Ambil dari cerita, values, ketakutan, Pathway, DAN Growth Focus mereka (ctx.growthFocus) — Growth Focus itu kompas yang mengarahkan Quest/Acting/reflection sepanjang perjalanan, bukan data onboarding yang dilupakan setelah dipakai sekali.
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
      system: MENTOR_SYSTEM,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Anthropic API error ${response.status}: ${errText.slice(0, 300)}`);
  }
  const data = await response.json();
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

// --- Adaptive onboarding (Task 5) ---

const ADAPTIVE_FALLBACK_QUESTIONS = [
  (growthFocus) => `Kenapa ${(growthFocus || []).join(", ") || "ini"} yang paling kerasa penting buat kamu sekarang?`,
  () => "Apa yang paling sering bikin kamu belum berani melangkah ke arah itu?",
  () => "Kalau harus memilih, hal apa yang nggak ingin kamu korbankan dalam prosesnya?",
];

async function generateAdaptiveQuestion(ctx) {
  if (!hasKey()) {
    const idx = Math.min(3, Math.max(1, ctx.questionIndex || 1)) - 1;
    return { question: ADAPTIVE_FALLBACK_QUESTIONS[idx](ctx.growthFocus) };
  }
  try {
    const stageInstruction =
      ctx.questionIndex === 1
        ? 'Ini pertanyaan pertama dari 3. Gali lebih dalam dari Growth Focus yang mereka pilih (ctx.growthFocus) dan cerita awal mereka (situasi/values/fear) — buat mereka merasa "mulai dimengerti", bukan sekadar mengisi field berikutnya.'
        : ctx.questionIndex === 2
        ? "Ini pertanyaan kedua dari 3, mengarah ke obstacle/fear yang menghalangi Growth Focus mereka — berdasarkan jawaban pertama mereka (ctx.previousAnswers[0])."
        : 'Ini pertanyaan ketiga dari 3, mengarah ke values/non-negotiables mereka — framing TIDAK LANGSUNG (mis. "Saat harus memilih... hal apa yang tidak ingin kamu korbankan?", BUKAN "apa nilai hidupmu?"), berdasarkan jawaban-jawaban sebelumnya.';
    const user = `Konteks pengguna (JSON):\n${JSON.stringify(ctx)}\n\nTugas: buatkan SATU pertanyaan lanjutan untuk pengguna ini, sebagai bagian dari onboarding adaptif Eleva (percakapan bercabang, bukan daftar pertanyaan statis).\n\n${stageInstruction}\n\nBalas JSON dengan bentuk persis:\n{"question": string}\n\nAturan: pertanyaan singkat (1-2 kalimat), personal ke konteks mereka, nada hangat dan jujur seperti mentor — bukan form generik.`;
    const result = await callClaude(user);
    if (!result?.question) throw new Error("bad shape");
    return result;
  } catch (e) {
    console.error("generateAdaptiveQuestion failed, using fallback:", e.message);
    const idx = Math.min(3, Math.max(1, ctx.questionIndex || 1)) - 1;
    return { question: ADAPTIVE_FALLBACK_QUESTIONS[idx](ctx.growthFocus) };
  }
}

const PATHWAY_NAMES = ["Builder", "Guardian", "Explorer", "Connector", "Seeker", "Specialist"];
const GROWTH_FOCUS_TO_PATHWAY = {
  Career: "Builder", Leadership: "Builder", Wealth: "Builder",
  Confidence: "Guardian", Health: "Guardian",
  Adventure: "Explorer",
  Relationship: "Connector", Communication: "Connector", Contribution: "Connector",
  Purpose: "Seeker",
};

async function generateChapterAnalysis(ctx) {
  if (!hasKey()) return fallbackChapterAnalysis(ctx);
  try {
    const user = `Konteks pengguna (JSON):\n${JSON.stringify(ctx)}\n\nTugas: ini akhir dari onboarding adaptif. Rangkum semua yang sudah mereka ceritakan (situasi/values/fear + growth focus + jawaban-jawaban adaptive) jadi Chapter Analysis. Balas JSON dengan bentuk persis:\n{"insight": string, "pathway": "Builder"|"Guardian"|"Explorer"|"Connector"|"Seeker"|"Specialist", "pathwayNoun": string, "secondaryTrait": string|null}\n\nAturan: "insight" adalah rangkuman naratif 2-4 kalimat (nilai utama, gesekan/tantangan utama, arah transformasi) — personal, bukan generik. "pathway" satu rekomendasi dari 6 nama itu berdasarkan pola dari SELURUH konteks, bukan cuma growthFocus. "pathwayNoun" satu kata benda peran spesifik buat pengguna ini (mis. kalau pathway Specialist dan konteksnya soal sales → "Closer"; kalau Builder → "Builder"). "secondaryTrait" opsional, satu frasa pendek trait tambahan yang terlihat tapi bukan fokus utama (null kalau tidak ada yang jelas) — informasional saja, bukan pathway kedua. Nada hangat, personal, seperti mentor yang benar-benar mendengarkan.`;
    const result = await callClaude(user);
    if (!result?.pathway || !PATHWAY_NAMES.includes(result.pathway)) throw new Error("bad shape");
    return result;
  } catch (e) {
    console.error("generateChapterAnalysis failed, using fallback:", e.message);
    return fallbackChapterAnalysis(ctx);
  }
}

function fallbackChapterAnalysis(ctx) {
  const counts = {};
  (ctx.growthFocus || []).forEach((f) => {
    const p = GROWTH_FOCUS_TO_PATHWAY[f];
    if (p) counts[p] = (counts[p] || 0) + 1;
  });
  const pathway = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || "Seeker";
  return {
    insight: hasKey()
      ? "Koneksi ke mentor lagi tersendat — tapi dari yang kamu ceritakan, ini arah yang tetap relevan buat dicoba."
      : "Mode tanpa API key: analisis di bawah ini masih berbasis pola sederhana dari Growth Focus-mu, belum benar-benar membaca ceritamu. Tambahkan ANTHROPIC_API_KEY di .env supaya mentor beneran personal.",
    pathway,
    pathwayNoun: pathway,
    secondaryTrait: null,
  };
}

module.exports = {
  generateQuest, processReflection, hasKey,
  generateAdaptiveQuestion, generateChapterAnalysis,
};
