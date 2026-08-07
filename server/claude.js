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

// --- Adaptive onboarding (Task 5 v4 — radar self-assessment + statement cards) ---

const RADAR_AXIS_LABELS = {
  body: "Body", mind: "Mind", career: "Career", finance: "Finance",
  emotional: "Emotional Stability", explorer: "Explorer", social: "Social", purpose: "Purpose",
};

function highestRadarAxis(radarSnapshot) {
  const entries = Object.entries(radarSnapshot || {});
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

// Fallback-mode statements (no API key). Real cards MUST be AI-generated per
// user (see generateStatementCard) - a static statement bank identical for
// everyone is exactly the generic "personality test" the PRD rejects. These
// four exist only so onboarding stays completable keyless, same spirit as
// fallbackQuest/fallbackReflection: deterministic and honest about it, not a
// fake-intelligence attempt. They cover the same rough ground the removed
// static Situasi/Values/Fear steps did (life context, values, obstacle,
// non-negotiable), phrased as agree/disagree statements.
const ADAPTIVE_FALLBACK_STATEMENTS = [
  (radarSnapshot) => {
    const axis = highestRadarAxis(radarSnapshot);
    return axis
      ? `Akhir-akhir ini, ${RADAR_AXIS_LABELS[axis] || axis} adalah area yang paling banyak menyita pikiranku.`
      : "Akhir-akhir ini ada satu area hidup yang jauh lebih menyita pikiranku daripada yang lain.";
  },
  () => "Aku sebenarnya tahu apa yang penting buatku — yang berat itu konsisten menjalaninya.",
  () => "Aku lebih sering menunda karena takut hasilnya mengecewakan, bukan karena malas.",
  () => "Kalau harus memilih, aku lebih pilih tumbuh pelan tapi jujur daripada cepat tapi kosong.",
];
// Card+swipe format is founder-confirmed. The 4-10 RANGE is still Claude's
// own recommended default (founder hasn't confirmed it vs a fixed count) -
// change these two constants if that decision changes.
const ADAPTIVE_MIN_CARDS = 4;
const ADAPTIVE_MAX_CARDS = 10;

// ctx: {profile: {name}, radarSnapshot: {body,mind,...}, previousCards: [{statement, response:"up"|"down"}]}
// Returns {statement: string|null, confident: boolean}. When confident is
// true, statement may be null - the caller should stop and move to Chapter
// Analysis. The user never types anything: they thumb each statement up
// ("ini aku") or down ("bukan aku"), and that swipe history is the whole
// conversational signal. The 4-minimum/10-maximum bound is enforced here in
// code, not trusted purely from the model's own "confident" self-report -
// same defense-in-depth principle as the crisis-detection phrase list and
// the 12-word growth-gate elsewhere in this codebase.
async function generateStatementCard(ctx) {
  const cardCount = (ctx.previousCards || []).length;
  if (cardCount >= ADAPTIVE_MAX_CARDS) return { statement: null, confident: true };

  if (!hasKey()) {
    if (cardCount >= ADAPTIVE_FALLBACK_STATEMENTS.length) return { statement: null, confident: true };
    return { statement: ADAPTIVE_FALLBACK_STATEMENTS[cardCount](ctx.radarSnapshot), confident: false };
  }
  try {
    const stageGuidance =
      cardCount === 0
        ? "Ini kartu PERTAMA, belum ada respons sebelumnya. Bangun pernyataan dari pola ctx.radarSnapshot (sumbu yang paling menonjol ATAU paling ditekan) — tebakan hangat soal apa yang sedang paling menyita hidup mereka sekarang."
        : 'Baca arah swipe di ctx.previousCards: "up" berarti pernyataan itu resonan ("ini aku") — gali lebih spesifik ke arah itu; "down" berarti tidak resonan — geser ke sisi/area lain, jangan dipaksakan. Makin lanjut, arahkan pernyataan ke values, hambatan/ketakutan, atau non-negotiables mereka. JANGAN mengulang atau sekadar memparafrase pernyataan yang sudah pernah muncul.';
    const user = `Konteks pengguna (JSON):\n${JSON.stringify(ctx)}\n\nTugas: ini onboarding adaptif Eleva berformat KARTU PERNYATAAN — kamu menulis SATU pernyataan singkat orang-pertama ("Aku ..."), lalu pengguna merespons thumbs up ("ini aku") atau thumbs down ("bukan aku") tanpa mengetik apa pun. Pernyataan WAJIB personal untuk pengguna ini (diturunkan dari radar chart + histori swipe mereka), BUKAN diambil dari bank pernyataan tes kepribadian yang sama untuk semua orang. Sudah ada ${cardCount} kartu terjawab (minimal ${ADAPTIVE_MIN_CARDS}, maksimal ${ADAPTIVE_MAX_CARDS} sebelum wajib berhenti).\n\n${stageGuidance}\n\nBalas JSON dengan bentuk persis:\n{"statement": string|null, "confident": boolean}\n\nAturan: set "confident":true HANYA kalau pola swipe sejauh ini sudah cukup konsisten untuk membuat Chapter Analysis yang benar-benar personal (pemahaman soal arah hidup, values, DAN hambatan utama mereka) - kalau true, "statement" boleh null (sistem yang menjaga batas minimal/maksimal, kamu tidak perlu menghitung sendiri). Kalau belum, isi "statement" dengan SATU pernyataan baru: 1-2 kalimat, orang-pertama, cukup konkret untuk disetujui/ditolak dengan satu tap, nada hangat dan jujur seperti mentor.`;
    const result = await callClaude(user);
    if (typeof result?.confident !== "boolean") throw new Error("bad shape");
    if (!result.confident && !result.statement) throw new Error("bad shape");
    // A too-early confident:true is treated as a policy violation and falls
    // through to the deterministic fallback statement below, rather than
    // retried (another API call for no real benefit).
    if (result.confident && cardCount < ADAPTIVE_MIN_CARDS) throw new Error("confident too early");
    return result;
  } catch (e) {
    console.error("generateStatementCard failed, using fallback:", e.message);
    if (cardCount >= ADAPTIVE_FALLBACK_STATEMENTS.length) return { statement: null, confident: true };
    return { statement: ADAPTIVE_FALLBACK_STATEMENTS[cardCount](ctx.radarSnapshot), confident: false };
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
    const user = `Konteks pengguna (JSON):\n${JSON.stringify(ctx)}\n\nTugas: ini akhir dari onboarding adaptif. ctx.radarSnapshot adalah self-assessment 8-sumbu yang mereka gambar sendiri (skala 1-10), dan ctx.cards adalah kartu-kartu pernyataan yang sudah mereka respons — "response":"up" berarti pernyataan itu resonan ("ini aku"), "down" berarti tidak ("bukan aku"). Pola swipe ini + bentuk radar adalah seluruh sinyal yang kamu punya (tidak ada teks bebas dari pengguna). Rangkum semuanya jadi Chapter Analysis. Balas JSON dengan bentuk persis:\n{"insight": string, "pathway": "Builder"|"Guardian"|"Explorer"|"Connector"|"Seeker"|"Specialist", "pathwayNoun": string, "secondaryTrait": string|null}\n\nAturan: "insight" adalah rangkuman naratif 2-4 kalimat (nilai utama, gesekan/tantangan utama, arah transformasi) — personal, bukan generik, dan harus berdiri sendiri sebagai pemahaman tentang orang ini (akan dipakai sebagai konteks mentor setiap hari setelahnya, bukan cuma ditampilkan sekali). "pathway" satu rekomendasi dari 6 nama itu berdasarkan pola dari SELURUH konteks (radar + arah swipe semua kartu, termasuk yang di-thumbs-down — penolakan juga informasi), bukan cuma sumbu radar tertinggi. "pathwayNoun" satu kata benda peran spesifik buat pengguna ini (mis. kalau pathway Specialist dan konteksnya soal sales → "Closer"; kalau Builder → "Builder"). "secondaryTrait" opsional, satu frasa pendek trait tambahan yang terlihat tapi bukan fokus utama (null kalau tidak ada yang jelas) — informasional saja, bukan pathway kedua. Nada hangat, personal, seperti mentor yang benar-benar mendengarkan.`;
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
  generateStatementCard, generateChapterAnalysis,
};
