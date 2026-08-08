const MENTOR_SYSTEM = `Kamu adalah mentor AI di dalam produk bernama Eleva — sebuah AI Character Growth System.

Prinsip yang WAJIB kamu pegang:
- Kamu mentor, bukan mesin jawaban. Kamu mengarahkan, bukan menggurui.
- Quest/Acting yang kamu buat harus personal untuk situasi hidup pengguna saat ini, BUKAN checklist generik ("minum air", "bangun jam 5"). Ambil dari ctx.profile.originStory (ringkasan naratif tentang siapa mereka, hasil sintesis dari onboarding — cerita, values, dan ketakutan mereka semua tercermin di situ, bukan field terpisah), Pathway, dan sinyal minat/fokus mereka: ctx.radarSnapshot (bentuk radar self-assessment mereka — 7 sumbu MECE: Body, Growth, Livelihood, Emotional Stability, Social, Purpose, Autonomy; akun lama mungkin masih membawa 8 sumbu era sebelumnya — baca kunci yang ada apa adanya; sumbu yang menonjol menandakan area yang sedang paling mereka pedulikan) dan/atau ctx.growthFocus (kategori pilihan eksplisit, cuma ada di akun yang onboarding sebelum radar chart diperkenalkan — pakai kalau ada, radarSnapshot kalau tidak). Ini semua kompas yang mengarahkan Quest/Acting/reflection sepanjang perjalanan, bukan data onboarding yang dilupakan setelah dipakai sekali.
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
    const user = `Konteks pengguna (JSON):\n${JSON.stringify(ctx)}\n\nTugas: buatkan satu instruksi hari ini untuk pengguna ini. Balas JSON dengan bentuk persis:\n{"chapterNumber": number, "chapterTitle": string, "insight": string, "pathwayNoun": string|null, "quest": {"mode": "quest"|"acting", "title": string, "description": string, "statFocus": one of [body,growth,livelihood,emotional,social,purpose,autonomy] (pakai kunci yang benar-benar ada di ctx.stats kalau akunnya masih membawa kunci era lama), "why": string}}\n\nAturan: "insight" adalah 2-3 kalimat cara kamu memahami kondisi mereka sekarang, bukan nasihat. "quest.description" harus bisa dikerjakan/dilatih hari ini, konkret, maksimal 2 kalimat. Jika ctx.recentDays kosong, chapterNumber mulai dari 1. Jika ctx.recentDays ada isinya, pertahankan chapterNumber/chapterTitle yang sama seperti ctx.chapterNumber/ctx.chapterTitle kecuali ada pergeseran besar. Untuk "pathwayNoun": jika ctx.pathway ada isinya dan ctx.pathwayNoun bernilai null, turunkan SATU kata benda peran dari pathway itu (mis. pathway "Sales" → "Closer", pathway "Builder" → "Builder"); kalau ctx.pathwayNoun sudah terisi, kembalikan nilai yang sama persis (jangan diganti-ganti tiap hari). Kalau ctx.pathway kosong, pathwayNoun harus null.`;
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

// --- Adaptive onboarding (Task 5 v6 — radar self-assessment + Adaptive
// Scenario Cards + radar calibration) ---

// 7 MECE axes (Bible v1.5). Legacy 8-element keys kept as extra labels only,
// for pre-MECE accounts whose stored snapshots still carry them.
const RADAR_AXIS_LABELS = {
  body: "Body", growth: "Growth", livelihood: "Livelihood",
  emotional: "Emotional Stability", social: "Social", purpose: "Purpose", autonomy: "Autonomy",
  mind: "Mind", career: "Career", finance: "Finance", explorer: "Explorer",
};

function highestRadarAxis(radarSnapshot) {
  const entries = Object.entries(radarSnapshot || {});
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

// v6 replaces the v4/v5 thumbs-up/down statement cards entirely: one
// scenario, 4 options, each option mapped to ONE unlocked axis. The user
// must pick a favorite AND a least-favorite (never just one) - both signals
// feed the calibration engine below (see attachPolygonHandlers-adjacent
// logic in public/app.js for how the +1/-1 deltas actually get applied
// through the existing redistribution engine, capped at ±3 cumulative per
// axis). Locked axes structurally can never be chosen: axis selection below
// only ever draws from the unlocked set.
const SCENARIO_MIN_CARDS = 2;
const SCENARIO_MAX_CARDS = 6;
const AXES_PER_CARD = 4;

// Deterministic coverage logic (code-enforced, not trusted from the model):
// each card must test exactly 4 unlocked axes, preferring whichever unlocked
// axes have appeared LEAST often so far, so full coverage (every unlocked
// axis tested at least once) completes within ceil(unlocked/4) cards - at
// most 2 given the max is 7 axes total and locks cap at 3 (>=4 unlocked
// always). Locked-axis exclusion happens here, structurally - not left to
// the prompt.
function selectCardAxes(radarSnapshot, lockedAxes, previousCards) {
  const locked = new Set(lockedAxes || []);
  const allAxes = Object.keys(radarSnapshot || {});
  const unlocked = allAxes.filter((k) => !locked.has(k));
  const seenCount = {};
  unlocked.forEach((k) => { seenCount[k] = 0; });
  (previousCards || []).forEach((card) => {
    (card.options || []).forEach((opt) => {
      if (opt.axis in seenCount) seenCount[opt.axis] += 1;
    });
  });
  return [...unlocked]
    .sort((a, b) => seenCount[a] - seenCount[b] || allAxes.indexOf(a) - allAxes.indexOf(b))
    .slice(0, AXES_PER_CARD);
}

function coverageComplete(radarSnapshot, lockedAxes, previousCards) {
  const locked = new Set(lockedAxes || []);
  const unlocked = Object.keys(radarSnapshot || {}).filter((k) => !locked.has(k));
  const seen = new Set();
  (previousCards || []).forEach((card) => (card.options || []).forEach((opt) => seen.add(opt.axis)));
  return unlocked.every((k) => seen.has(k));
}

// Fallback-mode scenarios (no API key). Real cards MUST be AI-generated per
// user (see generateScenarioCard) - a static scenario bank identical for
// everyone is exactly the generic "personality test" the PRD rejects. These
// exist only so onboarding stays completable keyless, same spirit as
// fallbackQuest/fallbackReflection: deterministic and honest about it, not a
// fake-intelligence attempt. Two frames comfortably cover up to 7 unlocked
// axes at 4 per card (matching SCENARIO_MIN_CARDS).
const AXIS_ACTIVITY_PHRASE = {
  body: "Urus fisik/istirahat dulu",
  growth: "Belajar atau coba hal baru",
  livelihood: "Beresin kerjaan/urusan penghasilan",
  emotional: "Proses perasaan sendiri dulu",
  social: "Hubungi atau temui seseorang",
  purpose: "Mikirin arah besar hidup",
  autonomy: "Putuskan sendiri, jalan sendiri",
};
const SCENARIO_FALLBACK_FRAMES = [
  () => "Tiba-tiba ada waktu luang sore ini, bebas mau dipakai buat apa.",
  () => "Lagi kewalahan dan cuma sanggup fokus ke satu hal dulu sebelum yang lain.",
];
function fallbackScenarioCard(radarSnapshot, lockedAxes, previousCards) {
  const cardCount = (previousCards || []).length;
  if (cardCount >= SCENARIO_FALLBACK_FRAMES.length) return { scenario: null, options: null, confident: true };
  const axes = selectCardAxes(radarSnapshot, lockedAxes, previousCards);
  return {
    scenario: SCENARIO_FALLBACK_FRAMES[cardCount](),
    options: axes.map((axis) => ({ axis, text: AXIS_ACTIVITY_PHRASE[axis] || axis })),
    confident: false,
  };
}

// ctx: {profile: {name}, radarSnapshot: {body,growth,...}, lockedAxes: [axisKey],
//       previousCards: [{scenario, options:[{axis,text}], mostPreferred, leastPreferred}]}
// Returns {scenario: string|null, options: [{axis,text}]|null, confident: boolean}.
// When confident is true, scenario/options may be null - the caller stops
// and moves to Chapter Analysis. The min-2/max-6 bound AND the full-coverage
// requirement are enforced here in code, not trusted purely from the
// model's own "confident" self-report - same defense-in-depth principle as
// the crisis-detection phrase list and the 12-word growth-gate elsewhere.
async function generateScenarioCard(ctx) {
  const cardCount = (ctx.previousCards || []).length;
  if (cardCount >= SCENARIO_MAX_CARDS) return { scenario: null, options: null, confident: true };

  const axes = selectCardAxes(ctx.radarSnapshot, ctx.lockedAxes, ctx.previousCards);
  const coverageDone = coverageComplete(ctx.radarSnapshot, ctx.lockedAxes, ctx.previousCards);

  if (!hasKey()) return fallbackScenarioCard(ctx.radarSnapshot, ctx.lockedAxes, ctx.previousCards);
  try {
    const stageGuidance =
      cardCount === 0
        ? "Ini kartu PERTAMA, belum ada histori pilihan. Bangun skenario dari pola ctx.radarSnapshot pada axesToTest (sumbu yang menonjol/ditekan) - situasi umum yang masuk akal buat siapa saja, tapi opsinya dipersonalisasi ke radar mereka."
        : "Baca pola pilihan di ctx.previousCards (mostPreferred = favorit, leastPreferred = paling tidak disukai, tiap kartu): sumbu yang berulang jadi favorit menandakan minat kuat, yang berulang jadi paling-tidak-disukai menandakan area yang dihindari. Bangun skenario baru yang menggali lebih spesifik ke pola itu. JANGAN mengulang skenario yang sudah pernah muncul.";
    const user = `Konteks pengguna (JSON):\n${JSON.stringify({ ...ctx, axesToTest: axes })}\n\nTugas: ini onboarding adaptif Eleva berformat SKENARIO - kamu menulis SATU situasi singkat ("Kamu ...", "Ketika ..."), lalu memberi TEPAT 4 opsi respons, masing-masing mewakili SATU sumbu dari axesToTest (satu opsi per sumbu, urutan bebas tapi harus mencakup PERSIS keempat sumbu itu - jangan pakai sumbu lain, dan jangan sampai ada axesToTest yang tidak terwakili). Pengguna nanti memilih SATU opsi paling disukai DAN SATU dari sisanya paling tidak disukai - kamu tidak perlu memikirkan itu, cukup tulis skenario+opsinya senatural mungkin. Skenario+opsi WAJIB personal untuk pengguna ini (dari radar chart + histori kartu di ctx.previousCards), BUKAN template generik yang sama untuk semua orang. Sudah ada ${cardCount} kartu terjawab (minimal ${SCENARIO_MIN_CARDS}, maksimal ${SCENARIO_MAX_CARDS} sebelum wajib berhenti - dan baru boleh berhenti kalau SEMUA sumbu radar yang unlocked sudah pernah muncul sebagai opsi minimal sekali, itu dicek di kode, bukan olehmu).\n\n${stageGuidance}\n\nSoal ctx.lockedAxes: sumbu yang SENGAJA dikunci pengguna (maksimal 3) - axesToTest sudah menjamin sumbu itu TIDAK termasuk, jangan menyimpang darinya.\n\nBalas JSON dengan bentuk persis:\n{"scenario": string|null, "options": [{"axis": string, "text": string}]|null, "confident": boolean}\n\nAturan: set "confident":true HANYA kalau pola pilihan sejauh ini sudah cukup konsisten untuk Chapter Analysis yang personal - kalau true, "scenario"/"options" boleh null. Kalau belum, isi "scenario" (1-2 kalimat, situasi konkret sehari-hari) dan "options" (TEPAT 4 entri, masing-masing "axis" persis salah satu dari axesToTest dan "text" 1 frasa pendek tindakan/pilihan konkret, natural buat dipilih tanpa berpikir lama). Nada hangat, personal, seperti mentor yang benar-benar memperhatikan.`;
    const result = await callClaude(user);
    if (typeof result?.confident !== "boolean") throw new Error("bad shape");
    if (!result.confident) {
      if (!result.scenario || !Array.isArray(result.options) || result.options.length !== axes.length) {
        throw new Error("bad shape");
      }
      const gotAxes = new Set(result.options.map((o) => o.axis));
      if (axes.some((a) => !gotAxes.has(a))) throw new Error("bad shape: axis mismatch");
      // Defense-in-depth: rebuild options in a fixed, guaranteed order/axis
      // set rather than trusting the model's array verbatim.
      result.options = axes.map((a) => {
        const found = result.options.find((o) => o.axis === a);
        return { axis: a, text: (found && found.text) || AXIS_ACTIVITY_PHRASE[a] || a };
      });
    }
    // A too-early confident:true (before the minimum card count, or before
    // every unlocked axis has been tested) is a policy violation - falls
    // through to the deterministic fallback for this round rather than
    // being retried (another API call for no real benefit).
    if (result.confident && (cardCount < SCENARIO_MIN_CARDS || !coverageDone)) throw new Error("confident too early");
    return result;
  } catch (e) {
    console.error("generateScenarioCard failed, using fallback:", e.message);
    return fallbackScenarioCard(ctx.radarSnapshot, ctx.lockedAxes, ctx.previousCards);
  }
}

const PATHWAY_NAMES = ["Builder", "Guardian", "Explorer", "Connector", "Seeker", "Specialist"];
// Cheap, traceable fallback heuristic (no API key) - not meant to approximate
// real AI judgment, just a reasonable non-random default. Real generateChapterAnalysis
// below reads the whole conversation, not just the radar shape.
const RADAR_AXIS_TO_PATHWAY = {
  livelihood: "Builder",
  emotional: "Guardian", body: "Guardian",
  growth: "Explorer",
  social: "Connector",
  purpose: "Seeker",
  autonomy: "Specialist", // wants their own self-directed path
  // Legacy 8-element keys (pre-MECE snapshots, until those accounts reset):
  career: "Builder", finance: "Builder", explorer: "Explorer", mind: "Specialist",
};

// Axes whose calibrated value (post Adaptive Scenario Cards) landed ≥2 away
// from the raw manual-drag value - the founder's hard requirement is that
// this NEVER happens silently: Chapter Analysis must call it out by name.
function significantShifts(radarRaw, radarSnapshot) {
  if (!radarRaw || !radarSnapshot) return [];
  return Object.keys(radarSnapshot)
    .filter((k) => k in radarRaw && Math.abs(radarSnapshot[k] - radarRaw[k]) >= 2)
    .map((k) => ({ axis: k, from: radarRaw[k], to: radarSnapshot[k] }));
}

async function generateChapterAnalysis(ctx) {
  const shifts = significantShifts(ctx.radarRaw, ctx.radarSnapshot);
  if (!hasKey()) return fallbackChapterAnalysis(ctx, shifts);
  try {
    const shiftNote = shifts.length
      ? `\n\nKALIBRASI: radar awal pengguna (ctx.radarRaw, hasil drag manual mentah) bergeser signifikan (≥2 poin) di sumbu berikut setelah reaksi mereka ke skenario: ${shifts.map((s) => `${RADAR_AXIS_LABELS[s.axis] || s.axis} (${s.from}→${s.to})`).join(", ")}. WAJIB sebutkan pergeseran ini secara eksplisit di "insight" - jangan diam-diam pakai radar terkalibrasi tanpa memberi tahu pengguna bahwa persepsi awal mereka bergeser dari pilihan-pilihan konkret mereka, bukan cuma dari drag manual mereka sendiri (mis. "Kamu awalnya menandai Livelihood sangat tinggi, tapi dari beberapa hal yang kamu pilih, itu terasa tidak sekuat itu - atau memang segitu, dan aku salah baca?").`
      : "";
    const user = `Konteks pengguna (JSON):\n${JSON.stringify(ctx)}\n\nTugas: ini akhir dari onboarding adaptif. ctx.radarSnapshot adalah radar TERKALIBRASI (skala 1-10, total 35: Body, Growth, Livelihood, Emotional Stability, Social, Purpose, Autonomy) - hasil drag manual pengguna (ctx.radarRaw) yang sudah dikoreksi halus berdasarkan reaksi mereka ke Adaptive Scenario Cards (ctx.cards), karena self-report di skala 1-10 rawan bias yang diuji ulang lewat pilihan konkret. ctx.lockedAxes adalah sumbu yang SENGAJA mereka kunci (maksimal 3, tidak pernah ikut kalibrasi). ctx.cards masing-masing berisi {scenario, options, mostPreferred, leastPreferred} - mostPreferred sumbu yang mereka pilih paling disukai, leastPreferred yang paling tidak disukai dari sisanya; dua sumbu yang tidak dipilih sama sekali di kartu itu netral. Pola pilihan ini + radar terkalibrasi + sumbu terkunci adalah seluruh sinyal yang kamu punya (tidak ada teks bebas dari pengguna). PENTING: kalau ada 2-3 sumbu terkunci di nilai tinggi sekaligus (kombinasi ekstrem, mis. Body dan Social dua-duanya dikunci tinggi), interpretasi kombinasi itu WAJIB dikaitkan ke pola pilihan aktual mereka - jangan mengarang generalisasi sendiri soal apa "arti" kombinasi itu.${shiftNote}\n\nRangkum semuanya jadi Chapter Analysis. Balas JSON dengan bentuk persis:\n{"insight": string, "pathway": "Builder"|"Guardian"|"Explorer"|"Connector"|"Seeker"|"Specialist", "pathwayNoun": string, "secondaryTrait": string|null}\n\nAturan: "insight" adalah rangkuman naratif 2-4 kalimat (nilai utama, gesekan/tantangan utama, arah transformasi) — personal, bukan generik, dan harus berdiri sendiri sebagai pemahaman tentang orang ini (akan dipakai sebagai konteks mentor setiap hari setelahnya, bukan cuma ditampilkan sekali). "pathway" satu rekomendasi dari 6 nama itu berdasarkan pola dari SELURUH konteks (radar terkalibrasi + pola favorit/tidak-favorit semua kartu, termasuk yang paling-tidak-disukai — penolakan juga informasi), bukan cuma sumbu radar tertinggi. "pathwayNoun" satu kata benda peran spesifik buat pengguna ini (mis. kalau pathway Specialist dan konteksnya soal sales → "Closer"; kalau Builder → "Builder"). "secondaryTrait" opsional, satu frasa pendek trait tambahan yang terlihat tapi bukan fokus utama (null kalau tidak ada yang jelas) — informasional saja, bukan pathway kedua. Nada hangat, personal, seperti mentor yang benar-benar mendengarkan.`;
    const result = await callClaude(user);
    if (!result?.pathway || !PATHWAY_NAMES.includes(result.pathway)) throw new Error("bad shape");
    return { ...result, significantShifts: shifts };
  } catch (e) {
    console.error("generateChapterAnalysis failed, using fallback:", e.message);
    return fallbackChapterAnalysis(ctx, shifts);
  }
}

function fallbackChapterAnalysis(ctx, shifts) {
  const axis = highestRadarAxis(ctx.radarSnapshot);
  const pathway = RADAR_AXIS_TO_PATHWAY[axis] || "Seeker";
  const shiftText = (shifts && shifts.length)
    ? " Catatan kalibrasi: " + shifts.map((s) => `${RADAR_AXIS_LABELS[s.axis] || s.axis} bergeser dari ${s.from} ke ${s.to} setelah pilihan-pilihanmu di skenario`).join("; ") + "."
    : "";
  return {
    insight: (hasKey()
      ? "Koneksi ke mentor lagi tersendat — tapi dari yang kamu ceritakan, ini arah yang tetap relevan buat dicoba."
      : "Mode tanpa API key: analisis di bawah ini masih berbasis pola sederhana dari radar-mu, belum benar-benar membaca ceritamu. Tambahkan ANTHROPIC_API_KEY di .env supaya mentor beneran personal.") + shiftText,
    pathway,
    pathwayNoun: pathway,
    secondaryTrait: null,
    significantShifts: shifts || [],
  };
}

module.exports = {
  generateQuest, processReflection, hasKey,
  generateScenarioCard, generateChapterAnalysis,
};
