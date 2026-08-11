const MENTOR_SYSTEM = `Kamu adalah mentor AI di dalam produk bernama Eleva — sebuah AI Character Growth System.

Prinsip yang WAJIB kamu pegang:
- Kamu mentor, bukan mesin jawaban. Kamu mengarahkan, bukan menggurui.
- Quest/Acting yang kamu buat harus personal untuk situasi hidup pengguna saat ini, BUKAN checklist generik ("minum air", "bangun jam 5"). Ambil dari ctx.profile.originStory (ringkasan naratif tentang siapa mereka, hasil sintesis dari onboarding — cerita, values, dan ketakutan mereka semua tercermin di situ, bukan field terpisah), Pathway, dan sinyal minat/fokus mereka: ctx.radarSnapshot (bentuk radar self-assessment mereka — 7 sumbu MECE: Body, Growth, Livelihood, Emotional Stability, Social, Purpose, Autonomy; akun lama mungkin masih membawa 8 sumbu era sebelumnya — baca kunci yang ada apa adanya; sumbu yang menonjol menandakan area yang sedang paling mereka pedulikan) dan/atau ctx.growthFocus (kategori pilihan eksplisit, cuma ada di akun yang onboarding sebelum radar chart diperkenalkan — pakai kalau ada, radarSnapshot kalau tidak). Ini semua kompas yang mengarahkan Quest/Acting/reflection sepanjang perjalanan, bukan data onboarding yang dilupakan setelah dipakai sekali.
- Satu instruksi utama per hari — bentuknya bisa "Quest" (aksi konkret yang dikerjakan, cocok untuk progress yang terlihat) atau "Acting Method" (praktik cara bersikap sepanjang hari, cocok untuk melatih identitas Pathway yang dipilih, mis. pathway "Sales": "sebelum menjawab, ajukan tiga pertanyaan dulu"). Kamu yang memilih framing mana yang lebih relevan hari itu berdasarkan Pathway dan chapter pengguna — jangan berikan dua-duanya sekaligus.
- **Quest yang menyasar goal WAJIB memakai kerangka WOOP (Wish-Outcome-Obstacle-Plan, Oettingen) secara IMPLISIT — bukan field terpisah, bukan pertanyaan tambahan ke pengguna.** ctx.activeGoal SUDAH mewakili Wish+Outcome-nya (goal itu sendiri, tidak perlu ditulis ulang). Sebelum menulis instruksi hari ini, pikirkan secara internal (TIDAK perlu ditulis eksplisit berformat "Obstacle: ... Plan: ..." ke pengguna) Obstacle yang paling mungkin bikin goal INI gagal buat ORANG INI SPESIFIK — infer dari radar+profile mereka (mis. Autonomy rendah + goal ambisius → obstacle "gampang menyerah begitu tidak ada struktur eksternal yang memaksa"; Emotional Stability rendah + goal sosial → obstacle "gampang mundur begitu ada penolakan kecil"), lalu rancang quest/acting hari ini supaya SECARA DESAIN mengantisipasi obstacle spesifik itu (Plan) — bukan instruksi generik yang mengabaikan risiko gagalnya. "why" boleh menyinggung alasan ini secara natural kalau relevan, tapi tetap sebagai kalimat mentor biasa, bukan template berlabel.
- **Goal menentukan APA, Pathway menentukan BAGAIMANA — dua sumbu independen, jangan dicampur.** ctx.goals (kalau ada) adalah 1-3 target yang mau dicapai pengguna selama First Trial (mis. "Punya badan sehat", "IELTS band 6.5", "Dapat kerja remote sebagai data analyst" — tiga area beda sekaligus itu WAJAR, bukan kasus aneh); ctx.activeGoal adalah goal yang jadi fokus quest HARI INI (sudah dipilih sistem lewat rotasi — jangan kamu ganti sendiri). Pathway KONSTAN sepanjang First Trial dan TIDAK ikut berubah saat goal yang digarap berganti hari ke hari — gaya Pathway harus konsisten LINTAS goal, bukan cuma lintas hari untuk goal yang sama. Contoh acuan WAJIB: goal "IELTS band 6.5" dengan Pathway Pilgrim → "coba 3 metode belajar berbeda minggu ini sebelum komit ke satu silabus" (eksploratif), BUKAN "ikuti jadwal belajar terstruktur 2 jam/hari" (itu gaya Architect); goal yang sama dengan Pathway Architect harus menghasilkan framing berbeda — bukan konten goal yang berubah, tapi cara mendekatinya. Berlaku sama untuk goal Livelihood (Pilgrim: "eksplor 3 jenis role dulu sebelum fokus lamar" vs Architect: "susun rencana lamar 10 posisi terstruktur") dan goal Body (Pilgrim: "coba 2-3 olahraga beda dulu" vs Architect: "ikuti program fix 12 minggu"). Radar boleh menunjukkan pola berbeda dari area goal (mis. radar dominan di area lain sementara goal-goalnya di area yang radarnya rendah) — itu BUKAN kontradiksi yang perlu kamu koreksi atau komentari sebagai masalah: radar = kondisi/fondasi saat ini, goal = target yang dikejar (boleh di luar area kuat radar, wajar), Pathway = gaya konstan untuk mengejar goal APA PUN.
- Acting Method HARUS berbasis perilaku ("tahan dulu, tanya dulu"), BUKAN berbasis target hasil ("closing 3 deal") — itu akan menggeser Eleva jadi productivity app, bukan character growth app.
- Nada bicara: hangat, jujur, tidak menghakimi, tidak sok tahu, seperti teman yang paham tapi tetap jujur ("Bukan malas. Kamu kehilangan tujuan.") — bukan motivator generik.
- Fokus pada pembentukan identitas ("menjadi seseorang yang reliable"), bukan produktivitas semata.
- **Pathway ≠ Chapter — jangan sampai tercampur (Bible v1.7).** Chapter menjawab "lagi di fase/masalah hidup apa" — sifatnya TEMPORAL, berubah seiring waktu (mis. "Lost", "Healing"). Pathway menjawab "bagaimana gaya orang ini berinteraksi dengan dunia" — sifatnya lebih TAHAN LAMA, soal gaya perilaku, BUKAN soal masalah/fase hidup yang sedang dihadapi. SEMUA teks yang kamu tulis soal Pathway (insight, pathwayBlurb, pathwayNoun, quest yang menyebut Pathway) WAJIB berbicara gaya perilaku. Contoh benar: "sebagai Pilgrim, kamu cenderung menjelajah dulu sebelum berkomitmen." Contoh SALAH (itu tugas Chapter, bukan Pathway): "Pathway-mu adalah menyembuhkan luka" atau "kamu belum tahu arah".
- **Jangan sebut nama sumbu radar secara harfiah** (Body/Growth/Livelihood/Emotional Stability/Social/Purpose/Autonomy) di teks bebas mana pun (insight, pathwayBlurb, secondaryTrait, dsb) — itu label internal buat sistem, bukan bahasa yang manusiawi. Terjemahkan jadi kecenderungan nyata orangnya: bukan "kamu fokus pada Livelihood dan Autonomy", tapi mis. "kamu bergerak paling kuat kalau soal penghasilan dan keputusan yang benar-benar kamu pegang sendiri kendalinya" — deskripsikan PERILAKU/KECENDERUNGAN di dunia nyata, bukan nama kategori.
- **Semua teks bebas WAJIB Bahasa Indonesia natural** (insight, pathwayBlurb, secondaryTrait, mentorReply, quest.description/why, dsb) — jangan tiba-tiba beralih ke Inggris di tengah-tengah, kecuali istilah yang memang bagian dari produk dan tidak diterjemahkan (nama Pathway seperti "Architect", "Pilgrim").
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

// Task 7b: the model self-reports which completion flow a quest uses, but
// the pair is normalized here in code (defense in depth, same principle as
// every other AI-shaped field): structured-physical REQUIRES a valid
// structuredKind, anything malformed downgrades to the safe "reflective"
// path rather than rendering a broken form.
function normalizeCompletionType(quest) {
  if (!quest) return quest;
  if (quest.completionType === "structured-physical" && ["cardio", "gym"].includes(quest.structuredKind)) {
    return quest;
  }
  // Task 9: a third completionType, for goals with an objectively-gradeable
  // learning component (IELTS-style reading/listening comprehension is the
  // founder's first example, not a hardcoded special case). No structuredKind
  // of its own - that field only ever distinguishes cardio/gym.
  if (quest.completionType === "practice-test") {
    quest.structuredKind = null;
    return quest;
  }
  // Task 10b: a fourth completionType, for job-search goals - completed by
  // comparing an uploaded CV against a real job posting, not a text/number
  // form. Same "no structuredKind of its own" rule as practice-test.
  if (quest.completionType === "job-match-analysis") {
    quest.structuredKind = null;
    return quest;
  }
  quest.completionType = "reflective";
  delete quest.structuredKind;
  return quest;
}

async function generateQuest(ctx) {
  if (!hasKey()) return fallbackQuest(ctx);
  try {
    const user = `Konteks pengguna (JSON):\n${JSON.stringify(ctx)}\n\nTugas: buatkan satu instruksi hari ini untuk pengguna ini.${ctx.activeGoal ? ` Quest/Acting hari ini WAJIB diarahkan ke ctx.activeGoal ("${ctx.activeGoal}") — itu goal yang dapat giliran hari ini dari rotasi sistem (ctx.goals berisi semua goal mereka sebagai konteks, tapi fokus hari ini cuma satu itu; ingat aturan Goal-vs-Pathway di system prompt: goal ini yang menentukan APA, Pathway pengguna yang menentukan BAGAIMANA pendekatannya). Rancang lewat kerangka WOOP implisit (lihat aturan di system prompt) — pikirkan dulu Obstacle paling mungkin bikin goal ini gagal buat orang ini spesifik, baru tulis instruksi yang secara desain mengantisipasi itu, bukan instruksi generik.` : ""}${ctx.currentTarget ? ` Goal ini SUDAH punya target berikutnya yang tersimpan: "${ctx.currentTarget.label}" (pendekatan yang dipilih: "${ctx.currentTarget.approach}") — quest hari ini adalah SATU LANGKAH MENUJU target itu, BUKAN asumsi target itu langsung tercapai hari ini juga (butuh berapa quest untuk sampai ke sana tergantung orangnya, jangan dipaksakan).` : ""} Balas JSON dengan bentuk persis:\n{"chapterNumber": number, "chapterTitle": string, "insight": string, "pathwayNoun": string|null, "observed": {"yesterday": string, "noticed": string, "today": string}|null, "quest": {"mode": "quest"|"acting", "completionType": "structured-physical"|"reflective"|"practice-test"|"job-match-analysis", "structuredKind": "cardio"|"gym"|null, "title": string, "description": string, "statFocus": one of [body,growth,livelihood,emotional,social,purpose,autonomy] (pakai kunci yang benar-benar ada di ctx.stats kalau akunnya masih membawa kunci era lama), "why": string}}\n\nAturan: "observed" (redesign homepage, "Eleva Observed") adalah jejak penalaran singkat SEBELUM quest hari ini — null kalau ctx.recentDays kosong (belum ada apa pun untuk diamati, jangan mengarang). Kalau ada: "yesterday" 1 kalimat ringkas apa yang terjadi di reflection/structuredData PALING BARU (angka nyata kalau ada, mis. "3.21 km, pace tidak stabil"), "noticed" 1 kalimat pola yang kamu amati dari itu (observasi, bukan instruksi), "today" 1 kalimat keputusan/fokus quest hari ini SEBAGAI AKIBAT dari observasi itu — ketiganya harus benar-benar berantai (today harus terasa seperti konsekuensi logis dari noticed, noticed dari yesterday), bukan tiga kalimat lepas-lepas. "insight" adalah 2-3 kalimat cara kamu memahami kondisi mereka sekarang, bukan nasihat. "quest.description" harus bisa dikerjakan/dilatih hari ini, konkret, maksimal 2 kalimat. "completionType": pilih "structured-physical" HANYA untuk quest fisik/terukur (cardio, gym, gerakan — biasanya area Body): penyelesaiannya lewat field angka terstruktur, bukan kotak refleksi; "structuredKind" wajib "cardio" (lari/jalan/sepeda/lompat tali) atau "gym" (beban/set×rep) kalau structured-physical, null kalau reflective/practice-test/job-match-analysis. Pilih "practice-test" HANYA kalau ctx.activeGoal SECARA EKSPLISIT soal ujian/tes/sertifikasi terukur dengan komponen reading/listening comprehension (mis. "IELTS band 6.5", persiapan TOEFL, ujian bahasa lain) — kalau ragu atau goal-nya bukan soal itu, JANGAN pilih ini, pakai reflective/structured-physical seperti biasa (practice-test seharusnya jarang muncul). Pilih "job-match-analysis" HANYA kalau ctx.activeGoal SECARA EKSPLISIT soal mencari/melamar kerja (mis. "dapat kerja remote sebagai data analyst", goal Livelihood yang jelas-jelas soal job hunting) — quest-nya minta pengguna cek lowongan nyata yang mereka temukan dibanding CV mereka, bukan quest generik "cari lowongan". Kalau ragu, JANGAN pilih ini (job-match-analysis seharusnya jarang muncul, sama seperti practice-test). Quest kualitatif/emosional/sosial lain → "reflective". Ini dimensi TERPISAH dari "mode" (quest vs acting). Kalau ctx.recentDays ada reflection.structuredData dari quest fisik sebelumnya, pakai sebagai BASELINE PROGRESIF di description/why (mis. "minggu lalu push-up 15, sekarang coba 18") — angka nyata mereka, bukan karangan. "statFocus" mengikuti area yang paling tersentuh instruksi hari ini${ctx.activeGoal ? " (secara alami biasanya area goal aktifnya)" : ""}. Jika ctx.recentDays kosong, chapterNumber mulai dari 1. Jika ctx.recentDays ada isinya, pertahankan chapterNumber/chapterTitle yang sama seperti ctx.chapterNumber/ctx.chapterTitle kecuali ada pergeseran besar. Untuk "pathwayNoun": jika ctx.pathway ada isinya dan ctx.pathwayNoun bernilai null, turunkan SATU kata benda peran dari pathway itu (mis. pathway Specialist dengan konteks "Sales" → "Closer", pathway "Architect" → "Architect"); kalau ctx.pathwayNoun sudah terisi, kembalikan nilai yang sama persis (jangan diganti-ganti tiap hari). Kalau ctx.pathway kosong, pathwayNoun harus null.`;
    const result = await callClaude(user);
    if (!result?.quest?.title) throw new Error("bad shape");
    normalizeCompletionType(result.quest);
    // "observed" is a bonus display field (Eleva Observed card), not
    // structurally critical like quest.title - a malformed shape gets
    // patched to null (card just doesn't render) instead of discarding an
    // otherwise-good quest, same two-tier pattern as normalizeCompletionType.
    const o = result.observed;
    result.observed = (o && typeof o.yesterday === "string" && typeof o.noticed === "string" && typeof o.today === "string") ? o : null;
    return result;
  } catch (e) {
    console.error("generateQuest failed, using fallback:", e.message);
    return fallbackQuest(ctx);
  }
}

async function processReflection(ctx) {
  if (!hasKey()) return fallbackReflection();
  try {
    // Task 7 (specificity gate) / Task 7b (structured path) / Task 9
    // (practice-test): three evaluation modes, chosen by which ctx field is
    // present. All feed the same response shape - the route still hard-gates
    // deltas independently where relevant (defense in depth), this prompt is
    // the semantic layer on top.
    const evaluationRules = ctx.practiceTestResult
      ? `Quest hari ini bertipe PRACTICE TEST: pengguna baru menyelesaikan sesi latihan ${ctx.practiceTestResult.kind === "listening" ? "Listening" : "Reading"} (${ctx.practiceTestResult.track === "general" ? "General Training" : "Academic"}) dengan skor ${ctx.practiceTestResult.score}/${ctx.practiceTestResult.total} — ini bukti OBJEKTIF (dinilai otomatis benar/salah oleh kode, bukan olehmu), lebih kuat dari growth-gate kespesifikan Task 7, jadi statDeltas WAJIB diisi wajar berapa pun skornya (menyelesaikan tesnya sendiri sudah bukti keterlibatan nyata — jangan menahan growth cuma karena skornya rendah, itu tetap evidence sah). mentorReply: komentari skornya secara spesifik dan hangat (jangan cuma "kerja bagus" generik), dan kalau ctx.recentDays punya practiceTestResult sebelumnya, sebut progresnya secara konkret.`
      : ctx.structuredData
      ? `Quest hari ini bertipe TERSTRUKTUR-FISIK: pengguna mengisi ctx.structuredData (field angka/pilihan yang kelengkapan & kewajarannya SUDAH divalidasi kode sebelum sampai ke kamu — jangan menolak karena format). Nilai statDeltas dari data terstruktur itu (plus ctx.reflectionText kalau diisi — itu OPSIONAL, ketiadaannya BUKAN alasan menolak growth). mentorReply: komentari angkanya secara spesifik (durasi/jarak/titik mulai berat — Ringan/Cukup/Berat, atau set×rep×beban), dan kalau ctx.recentDays punya structuredData sebelumnya, sebut baseline progresnya secara konkret (mis. "minggu lalu 15 repetisi, sekarang 18").`
      : `GROWTH-GATE KESPESIFIKAN (WAJIB, Task 7 - ini alasan gate panjang-kata saja tidak cukup): bandingkan ctx.reflectionText dengan ctx.quest.description/title. KALAU deskripsi quest hari ini secara eksplisit meminta detail konkret (angka, ukuran, jumlah, durasi, nama orang/tempat, observasi spesifik - mis. "catat repetisi, jarak, dan titik menyerah"), maka refleksi yang TIDAK menyebut SATU PUN detail yang diminta itu WAJIB ditolak growth-nya (statDeltas = {} kosong), TIDAK PEDULI seberapa panjang teksnya - refleksi generik panjang ("udah olahraga tadi, capek tapi enak, seneng bisa konsisten") adalah persis celah Goodhart yang gate ini tutup, dan mentorReply-nya menyebutkan dengan hangat detail spesifik apa yang kurang supaya besok bisa diterima. Sebaliknya, refleksi SINGKAT tapi menyebut detail spesifik yang diminta = SAH, beri growth yang pantas. KALAU quest hari ini bertipe kualitatif/emosional dan deskripsinya TIDAK meminta detail terukur apa pun, JANGAN memaksakan standar angka - refleksi jujur yang wajar dan menyentuh isi quest-nya tetap layak growth (gate ini soal kespesifikan YANG DIMINTA, bukan soal semua refleksi harus berisi angka).`;
    const user = `Konteks (JSON):\n${JSON.stringify(ctx)}\n\nPengguna baru saja merefleksikan quest hari ini. Balas JSON dengan bentuk persis:\n{"statDeltas": {"<stat>": number}, "mentorReply": string, "chapterAdvance": boolean, "newChapterTitle": string|null, "newChapterNarrative": string|null}\n\n${evaluationRules}\n\nAturan umum: statDeltas hanya untuk stat yang benar-benar tersentuh, nilai integer 1-5, JANGAN beri nilai jika kosong/dangkal. mentorReply singkat (1-3 kalimat), merespons ISI konkret mereka secara spesifik. chapterAdvance hanya true jika ada pergeseran pola hidup yang nyata dan signifikan. "newChapterNarrative" WAJIB diisi (2-4 kalimat, paragraf naratif Bahasa Indonesia) HANYA kalau chapterAdvance true - ini masuk ke layar "Kisahmu" (autobiografi Chapter demi Chapter), jadi ceritakan kenapa Chapter ini bergeser dari sebelumnya (pola nyata apa yang berubah), bukan cuma mengulang newChapterTitle. null kalau chapterAdvance false.`;
    return await callClaude(user);
  } catch (e) {
    console.error("processReflection failed, using fallback:", e.message);
    return fallbackReflection();
  }
}

// Fokus 2.2/2.3: "Target Berikutnya" - after a structured-physical quest is
// saved, offer 2 genuinely different AI progression directions (a 3rd,
// free-text option is the user's own manual override, handled entirely
// client/route-side - this function only ever produces A and B). Reuses the
// same anti-Goodhart principle as everywhere else numeric: the two options
// must be real numbers a later quest can be checked against
// (targets.targetReached), not just a vibe.
const targets = require("./targets");

function fallbackTargetOptions(ctx) {
  const { kind, actual } = ctx;
  if (kind === "cardio") {
    const pace = actual.durasiMenit / actual.jarakKm;
    const jarakA = Math.round(actual.jarakKm * 10) / 10;
    const paceA = Math.round(pace * 0.93 * 100) / 100;
    const jarakB = Math.round(Math.max(actual.jarakKm + 0.5, actual.jarakKm * 1.2) * 10) / 10;
    const paceB = Math.round(pace * 1.03 * 100) / 100;
    return {
      optionA: { label: targets.formatTargetLabel("cardio", { jarakKm: jarakA, paceMinPerKm: paceA }), approach: "Jarak serupa, tapi coba tempo yang sedikit lebih cepat dari biasanya di setiap sesi.", metrics: { jarakKm: jarakA, paceMinPerKm: paceA } },
      optionB: { label: targets.formatTargetLabel("cardio", { jarakKm: jarakB, paceMinPerKm: paceB }), approach: "Tempo santai seperti biasa, tapi tambah jarak sedikit demi sedikit tiap minggu.", metrics: { jarakKm: jarakB, paceMinPerKm: paceB } },
    };
  }
  // gym
  const hasBeban = actual.bebanKg != null;
  const repA = actual.repetisi + Math.max(1, Math.round(actual.repetisi * (hasBeban ? 0.15 : 0.2)));
  const metricsA = { set: actual.set, repetisi: repA, ...(hasBeban ? { bebanKg: actual.bebanKg } : {}) };
  const metricsB = hasBeban
    ? { set: actual.set, repetisi: actual.repetisi, bebanKg: Math.round((actual.bebanKg + Math.max(2.5, actual.bebanKg * 0.1)) * 2) / 2 }
    : { set: actual.set + 1, repetisi: actual.repetisi };
  return {
    optionA: { label: targets.formatTargetLabel("gym", metricsA), approach: hasBeban ? "Beban sama, tambah repetisi tiap set secara bertahap." : "Tambah repetisi tiap set secara bertahap.", metrics: metricsA },
    optionB: { label: targets.formatTargetLabel("gym", metricsB), approach: hasBeban ? "Repetisi sama, naikkan beban sedikit demi sedikit." : "Repetisi sama, tambah satu set lagi.", metrics: metricsB },
  };
}

async function generateTargetOptions(ctx) {
  if (!hasKey()) return fallbackTargetOptions(ctx);
  try {
    const user = `Konteks (JSON):\n${JSON.stringify(ctx)}\n\nPengguna baru saja menyelesaikan quest fisik untuk goal "${ctx.goalText}" dengan angka: ${JSON.stringify(ctx.actual)}. Buatkan 2 opsi "target berikutnya" untuk goal ini - dua ARAH progresi yang BENAR-BENAR BEDA (bukan dua variasi mirip), dihitung dari angka hari ini. Balas JSON persis:\n{"optionA": {"label": string, "approach": string, "metrics": ${ctx.kind === "cardio" ? '{"jarakKm": number, "paceMinPerKm": number}' : '{"set": number, "repetisi": number, "bebanKg": number|null}'}}, "optionB": {sama seperti optionA}}\n\nContoh arah berbeda untuk cardio: opsi A "kejar kecepatan" (jarak serupa, pace lebih cepat), opsi B "kejar jarak" (pace serupa/sedikit lebih santai, jarak nambah). Untuk gym: opsi A tambah repetisi, opsi B tambah beban (atau tambah set kalau bodyweight). "label" singkat format angka (mis. "3km @ 5:50/km" atau "4×15 @ 22kg"). "approach" 1 kalimat pendekatan/latihan buat nyampe ke situ, bukan cuma angka kosong. metrics harus angka nyata yang bisa dibandingkan ke hasil quest berikutnya, jangan dikosongkan.`;
    const result = await callClaude(user);
    const a = targets.cleanTargetMetrics(ctx.kind, result?.optionA?.metrics);
    const b = targets.cleanTargetMetrics(ctx.kind, result?.optionB?.metrics);
    if (!a || !b || !result.optionA.label || !result.optionB.label) throw new Error("bad shape");
    return {
      optionA: { label: String(result.optionA.label).slice(0, 80), approach: String(result.optionA.approach || "").slice(0, 300), metrics: a },
      optionB: { label: String(result.optionB.label).slice(0, 80), approach: String(result.optionB.approach || "").slice(0, 300), metrics: b },
    };
  } catch (e) {
    console.error("generateTargetOptions failed, using fallback:", e.message);
    return fallbackTargetOptions(ctx);
  }
}

// Task 9 (Practice Test): generic to any measurable learning goal - IELTS is
// the founder's example, not a hardcoded special case, so nothing here
// mentions IELTS by name in code, only in the prompt as a format reference.
const practiceTest = require("./practiceTest");

// Keyless mode is honestly generic here too, same principle as every other
// fallback in this file (fallbackQuest, fallbackChapterAnalysis) - static
// content, clearly not pretending to read the user's actual level/history.
function fallbackPracticeTest(ctx) {
  if (ctx.kind === "listening") {
    return {
      script: `Presenter: Welcome back. Today we're talking about a visit to the local library. The library opens at nine in the morning and closes at eight in the evening on weekdays, but on weekends it closes earlier, at five. There is a small reading room upstairs, and a computer area on the ground floor. Visitors need a card to borrow books, but reading inside doesn't require one.`,
      questions: [
        { id: "q1", type: "mc", text: "What time does the library close on weekdays?", options: ["Five", "Eight", "Nine", "Six"], correctAnswer: "Eight", explanation: "Skrip menyebut tutup jam delapan malam di hari kerja." },
        { id: "q2", type: "tf", text: "The library is closed on weekends.", options: ["True", "False", "Not Given"], correctAnswer: "False", explanation: "Skrip bilang tetap buka di akhir pekan, cuma tutup lebih awal (jam lima)." },
        { id: "q3", type: "mc", text: "Where is the reading room?", options: ["Ground floor", "Upstairs", "Basement", "Outside"], correctAnswer: "Upstairs", explanation: "Skrip menyebut ruang baca ada di lantai atas." },
        { id: "q4", type: "fill", text: "Visitors need a ____ to borrow books.", correctAnswer: "card", explanation: "Skrip menyebut butuh kartu untuk meminjam buku." },
      ],
    };
  }
  return {
    passage: `Working from home has become common for many people. It offers flexibility, since employees can arrange their own schedule around personal commitments. However, some workers report feeling isolated without daily contact with colleagues. Companies have responded by introducing regular video meetings and occasional in-person gatherings to keep teams connected.`,
    questions: [
      { id: "q1", type: "mc", text: "What is one benefit of working from home mentioned in the passage?", options: ["Higher salary", "Flexibility", "Free lunch", "Shorter hours"], correctAnswer: "Flexibility", explanation: "Paragraf menyebut fleksibilitas sebagai manfaatnya." },
      { id: "q2", type: "tf", text: "All workers prefer working from home, according to the passage.", options: ["True", "False", "Not Given"], correctAnswer: "False", explanation: "Sebagian pekerja melaporkan merasa terisolasi." },
      { id: "q3", type: "fill", text: "Companies introduced regular video ____ to keep teams connected.", correctAnswer: "meetings", explanation: "Paragraf menyebut rapat video rutin." },
    ],
  };
}

async function generatePracticeTest(ctx) {
  if (!hasKey()) return fallbackPracticeTest(ctx);
  try {
    const bodyKey = ctx.kind === "listening" ? "script" : "passage";
    const lengthGuide = ctx.kind === "listening"
      ? `panjang skrip dan jumlah soal naik seiring level: level 1-2 sekitar 8-10 soal, level 3+ boleh sampai 15-20 soal (mendekati format IELTS asli) — level saat ini: ${ctx.level}.`
      : `panjang bacaan naik seiring level: level 1-2 sekitar 150-250 kata, level 3+ bisa 250-400 kata dan makin kompleks — level saat ini: ${ctx.level}, dengan 5-8 soal pemahaman.`;
    const historyNote = ctx.history && ctx.history.length
      ? ` Materi sesi-sesi sebelumnya (JANGAN ulang topik/kontennya persis, buat yang baru): ${ctx.history.map((h) => `${h.testKind}/${h.track} skor ${h.score}/${h.total}`).join("; ")}.`
      : "";
    const user = `Konteks pengguna (JSON):\n${JSON.stringify({ goalText: ctx.goalText, pathway: ctx.pathway, level: ctx.level })}\n\nTugas: buatkan SATU sesi latihan "${ctx.kind === "listening" ? "Listening" : "Reading"}" gaya ${ctx.track === "general" ? "General Training" : "Academic"} format IELTS, untuk goal belajar terukur pengguna ini${ctx.goalText ? ` ("${ctx.goalText}")` : ""} — bentuk soal ini GENERIK untuk goal belajar apa pun (IELTS cuma contoh format, JANGAN dihardcode ke konten IELTS spesifik). ${lengthGuide}${historyNote}\n\nBalas JSON dengan bentuk PERSIS:\n{"${bodyKey}": string, "questions": [{"id": string, "type": "mc"|"tf"|"fill", "text": string, "options": [string]|null, "correctAnswer": string, "explanation": string}]}\n\nAturan: "${bodyKey}" berisi ${ctx.kind === "listening" ? "skrip percakapan/monolog natural dalam Bahasa Inggris (ini akan DIBACAKAN lewat text-to-speech browser, jadi tulis kalimat yang enak dibacakan keras, bukan format daftar/bullet)" : "satu bacaan Bahasa Inggris gaya IELTS"}, ${ctx.track === "general" ? "gaya umum sehari-hari (surat, iklan, artikel, percakapan/kuliah non-akademik)" : "gaya akademik"}. Campur tipe soal: "mc" (pilihan ganda, WAJIB isi "options" 3-4 pilihan), "tf" (True/False/Not Given, "options" WAJIB persis ["True","False","Not Given"]), "fill" (isian singkat, "options" null, "correctAnswer" satu kata/frasa pendek). "correctAnswer" WAJIB persis salah satu isi "options" untuk tipe mc/tf. "explanation" satu kalimat pendek pembahasan (Bahasa Indonesia) kenapa itu jawabannya — WAJIB diisi untuk SEMUA soal (dipakai kalau user salah, bukan cuma yang benar). JANGAN ulang topik/konten yang sama dengan materi sebelumnya di atas kalau ada.`;
    const result = await callClaude(user);
    const cleaned = practiceTest.cleanPayload(ctx.kind, result);
    if (!cleaned) throw new Error("bad shape");
    return cleaned;
  } catch (e) {
    console.error("generatePracticeTest failed, using fallback:", e.message);
    return fallbackPracticeTest(ctx);
  }
}

// Task 10b (Job Match Analysis): the only multimodal generate* function in
// this file - content is an ARRAY of blocks (instruction text + the CV +
// one or more job-posting screenshots), not a JSON-stringified text prompt
// like every other caller here. callClaude passes whatever it's given
// straight through as the message content, so no change was needed there.
const jobMatch = require("./jobMatch");

function fallbackJobMatchAnalysis() {
  return {
    matchTable: [{ skill: "Analisis belum tersedia", status: "tidak ada", note: "Mode tanpa API key: skill di lowongan tidak bisa dibaca dari gambar tanpa mentor AI aktif." }],
    verdict: hasKey()
      ? "Analisis sempat gagal — coba upload ulang sebentar lagi."
      : "Mode tanpa API key: analisis job-match butuh ANTHROPIC_API_KEY aktif untuk membaca screenshot lowongan dan CV-mu.",
    relevanceNote: "",
    nextStep: "Tambahkan ANTHROPIC_API_KEY di .env, lalu coba lagi.",
  };
}

async function generateJobMatchAnalysis(ctx) {
  if (!hasKey()) return fallbackJobMatchAnalysis();
  try {
    const cvBlocks = jobMatch.buildCvContentBlocks(ctx.cvArtifact);
    const imageBlocks = jobMatch.buildImageBlocks(ctx.images);
    if (!imageBlocks) throw new Error("bad images");
    const instruction = `Konteks pengguna: goal Livelihood mereka adalah "${ctx.goalText || "mencari kerja/karier yang cocok"}"${ctx.pathway ? `, gaya Pathway mereka "${ctx.pathway}"` : ""}.\n\nTugas: dokumen/gambar pertama adalah CV pengguna. Gambar-gambar setelahnya adalah screenshot SATU lowongan kerja (bisa lebih dari satu screenshot untuk lowongan yang sama karena postingan asli sering kepanjangan buat satu layar — gabungkan jadi satu pemahaman utuh). Ekstrak dari lowongan itu: peran/judul, skill wajib (mandatory), skill nice-to-have, level pengalaman, konteks lain yang relevan. Bandingkan ke CV, lalu balas JSON dengan bentuk PERSIS:\n{"matchTable": [{"skill": string, "status": "ada bukti"|"disebut tapi lemah"|"tidak ada", "note": string}], "verdict": string, "relevanceNote": string, "nextStep": string}\n\nAturan WAJIB (prinsip anti-sycophancy — JUJUR, bukan menyenangkan pengguna):\n- "matchTable": satu baris per skill yang diminta lowongan (wajib maupun nice-to-have), "status" HARUS salah satu dari 3 nilai itu persis, "note" satu kalimat pendek alasan/bukti dari CV (atau kenapa tidak ada).\n- "verdict" maknanya HARUS salah satu dari ini (boleh disesuaikan kata-katanya, tapi jujur sesuai datanya): match kuat → semacam "Siap apply sekarang"; match sedang → semacam "Bisa apply, tapi perkuat [skill] dulu biar kompetitif"; gap besar → semacam "Gap masih besar — fokus bangun [skill] dulu sebelum apply ke role sejenis". JANGAN asal optimis kalau datanya tidak mendukung.\n- "relevanceNote": WAJIB cek apakah lowongan yang di-screenshot ini benar-benar nyambung ke GOAL pengguna ("${ctx.goalText || ""}"), BUKAN cuma nyambung ke isi CV. Kalau TIDAK nyambung (mis. goal "data analyst" tapi lowongan "data entry" — bertetangga tapi beda), WAJIB bilang jujur di sini, jangan diam-diam dianggap sama. Kalau memang nyambung, boleh singkat saja menyebut itu.\n- "nextStep": SATU langkah konkret sebagai penutup (apply sekarang / perkuat skill X minggu ini / cari lowongan yang lebih relevan) — satu fokus, bukan daftar panjang.\n- Bahasa Indonesia natural, nada mentor hangat tapi jujur (lihat aturan system prompt) — kejujuran lebih penting daripada bikin pengguna senang.`;
    const content = [{ type: "text", text: instruction }, ...cvBlocks, ...imageBlocks];
    const result = await callClaude(content);
    const cleaned = jobMatch.cleanJobMatchResult(result);
    if (!cleaned) throw new Error("bad shape");
    return cleaned;
  } catch (e) {
    console.error("generateJobMatchAnalysis failed, using fallback:", e.message);
    return fallbackJobMatchAnalysis();
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
    // Keyless mode has no real reasoning to show - null, not a fabricated
    // observation. app.js simply skips the Eleva Observed card when null.
    observed: null,
    // Fallback quests are qualitative by construction - always the
    // reflective completion flow, never the structured-physical form.
    quest: { mode: "quest", completionType: "reflective", ...q },
  };
}

function fallbackReflection() {
  return {
    statDeltas: {},
    mentorReply: "Refleksinya kesimpan. AI mentor belum aktif penuh (API key belum diisi), jadi belum bisa menilai stat growth secara personal untuk sesi ini.",
    chapterAdvance: false,
    newChapterTitle: null,
    newChapterNarrative: null,
  };
}

// --- Adaptive onboarding (Task 5 v7 — radar self-assessment + Adaptive
// Scenario Cards + radar calibration + lock tension + 3-card Pathway) ---

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
function topAxes(radar, n) {
  return Object.entries(radar || {}).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}

// v6 replaced the v4/v5 thumbs-up/down statement cards entirely: one
// scenario, 4 options, each option mapped to ONE axis. The user must pick a
// favorite AND a least-favorite (never just one) - both signals feed the
// calibration engine (see applyCalibrationCard in public/app.js). v7
// revision: locked axes CAN now be offered as options too (axis selection
// below draws from ALL 7 axes, not just unlocked) - a locked axis's NUMBER
// never moves regardless of what gets picked (public/app.js skips the
// numeric application entirely for locked axes), but picking one still
// produces a narrative-only "lock tension" signal (see computeLockTension)
// used as Chapter Analysis context, never to change the value.
const SCENARIO_MIN_CARDS = 2;
const SCENARIO_MAX_CARDS = 6;
const AXES_PER_CARD = 4;

// Deterministic coverage logic (code-enforced, not trusted from the model):
// each card must test exactly 4 axes (locked or unlocked - v7 widened this
// from unlocked-only), preferring whichever axes have appeared LEAST often
// so far, so full coverage (every one of the 7 axes tested at least once)
// completes within ceil(7/4) = 2 cards regardless of how many are locked.
function selectCardAxes(radarSnapshot, lockedAxes, previousCards) {
  const allAxes = Object.keys(radarSnapshot || {});
  const seenCount = {};
  allAxes.forEach((k) => { seenCount[k] = 0; });
  (previousCards || []).forEach((card) => {
    (card.options || []).forEach((opt) => {
      if (opt.axis in seenCount) seenCount[opt.axis] += 1;
    });
  });
  return [...allAxes]
    .sort((a, b) => seenCount[a] - seenCount[b] || allAxes.indexOf(a) - allAxes.indexOf(b))
    .slice(0, AXES_PER_CARD);
}

function coverageComplete(radarSnapshot, lockedAxes, previousCards) {
  const allAxes = Object.keys(radarSnapshot || {});
  const seen = new Set();
  (previousCards || []).forEach((card) => (card.options || []).forEach((opt) => seen.add(opt.axis)));
  return allAxes.every((k) => seen.has(k));
}

// Reconstructed from the answered cards + which axes are locked. "Contrary"
// means the pick pulls against what the lock already declared: favoriting
// an axis locked LOW (<5, user deliberately deprioritized it), or
// least-favoriting one locked HIGH (>5, user deliberately prioritized it).
// A lock sitting exactly at the default (5) carries no directional claim,
// so it can never register tension. Returns the raw per-pick entries;
// flaggedTensionAxes below reduces that to "worth surfacing to the user."
//
// v12: judged against lockedOriginalValue (the value AT THE MOMENT OF
// LOCKING, tracked client-side in public/app.js), NOT radarSnapshot - the
// number itself can now erode when contradicted (see applyCalibrationCard,
// public/app.js), so using the post-erosion radarSnapshot value here would
// let an axis that already crossed the 5-midpoint flip what counts as
// "contrary" partway through the same session. Falls back to radarSnapshot
// only if lockedOriginalValue wasn't sent (older client, defensive only -
// this codebase's standing pattern for schema/field additions).
function computeLockTension(cards, lockedAxes, radarSnapshot, lockedOriginalValue) {
  const locked = new Set(lockedAxes || []);
  const entries = [];
  (cards || []).forEach((card, cardIndex) => {
    [["mostPreferred", "favorite"], ["leastPreferred", "least"]].forEach(([field, direction]) => {
      const axis = card[field];
      if (!axis || !locked.has(axis)) return;
      const original = lockedOriginalValue?.[axis] ?? radarSnapshot?.[axis];
      if (original == null) return;
      const contrary = (original > 5 && direction === "least") || (original < 5 && direction === "favorite");
      entries.push({ axis, cardIndex, direction, value: original, contrary });
    });
  });
  return entries;
}
// Threshold of 2+ contrary picks on the SAME locked axis before it's worth
// interrupting the user with a reflective question - one contrary pick
// could just be a scenario that didn't fit well, not a real signal.
function flaggedTensionAxes(tensionEntries) {
  const counts = {};
  (tensionEntries || []).filter((t) => t.contrary).forEach((t) => { counts[t.axis] = (counts[t.axis] || 0) + 1; });
  return Object.keys(counts).filter((k) => counts[k] >= 2);
}

// Fallback-mode scenarios (no API key). Real cards MUST be AI-generated per
// user (see generateScenarioCard) - a static scenario bank identical for
// everyone is exactly the generic "personality test" the PRD rejects. These
// exist only so onboarding stays completable keyless, same spirit as
// fallbackQuest/fallbackReflection: deterministic and honest about it, not a
// fake-intelligence attempt. Two frames comfortably cover all 7 axes at 4
// per card (matching SCENARIO_MIN_CARDS).
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
    // Founder bug report from production: without this, the model latched
    // onto work/project scenarios card after card, which misreads anyone
    // whose actual goal is e.g. fitness or learning a language. Onboarding
    // has no free-text goal field (deliberately - Situasi/Values/Fear were
    // removed in v3), so scenario variety across life domains is the ONLY
    // way these cards can catch a non-work-shaped life.
    const usedDomains = (ctx.previousCards || []).map((c) => c.scenario).filter(Boolean);
    const domainGuidance = `\n\nVARIASI RANAH (WAJIB): skenario TIDAK BOLEH terus-menerus soal kerjaan/proyek - itu cuma SATU ranah kehidupan, dan pengguna Eleva bisa saja tujuannya nge-gym, belajar bahasa, memperbaiki relasi, atau apa pun. Pilih ranah yang BERBEDA dari kartu-kartu sebelumnya${usedDomains.length ? ` (yang sudah terpakai: ${JSON.stringify(usedDomains)})` : ""} - rotasikan antara ranah seperti: kesehatan/olahraga, belajar hal baru (skill/bahasa), relasi & keluarga, waktu luang/akhir pekan, uang & kebutuhan, kerjaan/studi, momen sendirian. Situasinya harus tetap sehari-hari dan netral-tujuan (jangan mengasumsikan pengguna sedang mengejar karier/proyek), dan keempat opsinya tetap satu per sumbu axesToTest di dalam ranah situasi itu.`;
    const user = `Konteks pengguna (JSON):\n${JSON.stringify({ ...ctx, axesToTest: axes })}\n\nTugas: ini onboarding adaptif Eleva berformat SKENARIO - kamu menulis SATU situasi singkat ("Kamu ...", "Ketika ..."), lalu memberi TEPAT 4 opsi respons, masing-masing mewakili SATU sumbu dari axesToTest (satu opsi per sumbu, urutan bebas tapi harus mencakup PERSIS keempat sumbu itu - jangan pakai sumbu lain, dan jangan sampai ada axesToTest yang tidak terwakili). Pengguna nanti memilih SATU opsi paling disukai DAN SATU dari sisanya paling tidak disukai - kamu tidak perlu memikirkan itu, cukup tulis skenario+opsinya senatural mungkin. Skenario+opsi WAJIB personal untuk pengguna ini (dari radar chart + histori kartu di ctx.previousCards), BUKAN template generik yang sama untuk semua orang. Sudah ada ${cardCount} kartu terjawab (minimal ${SCENARIO_MIN_CARDS}, maksimal ${SCENARIO_MAX_CARDS} sebelum wajib berhenti - dan baru boleh berhenti kalau SEMUA 7 sumbu radar sudah pernah muncul sebagai opsi minimal sekali, itu dicek di kode, bukan olehmu).\n\n${stageGuidance}${domainGuidance}\n\nSoal ctx.lockedAxes: sumbu yang SENGAJA dikunci pengguna (maksimal 3) - axesToTest BOLEH termasuk sumbu terkunci (itu disengaja, memberi sinyal narasi tanpa mengubah angkanya), tulis opsinya sama natural seperti sumbu lain, jangan diberi perlakuan khusus di teksnya.\n\nBalas JSON dengan bentuk persis:\n{"scenario": string|null, "options": [{"axis": string, "text": string}]|null, "confident": boolean}\n\nAturan: set "confident":true HANYA kalau pola pilihan sejauh ini sudah cukup konsisten untuk Chapter Analysis yang personal - kalau true, "scenario"/"options" boleh null. Kalau belum, isi "scenario" (1-2 kalimat, situasi konkret sehari-hari) dan "options" (TEPAT 4 entri, masing-masing "axis" persis salah satu dari axesToTest dan "text" 1 frasa pendek tindakan/pilihan konkret, natural buat dipilih tanpa berpikir lama). Nada hangat, personal, seperti mentor yang benar-benar memperhatikan.`;
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

// Bible v1.7: Pathway renamed+reframed from life-problem framing to pure
// interaction-style framing (Builder/Guardian/Connector/Seeker -> Architect/
// Warden/Weaver/Pilgrim, 1:1 rename). Explorer (formerly mapped from growth)
// was dropped in v1.6 - its territory is already covered by the Growth stat,
// so it's not carried forward as a Pathway target here either.
const PATHWAY_NAMES = ["Architect", "Warden", "Weaver", "Pilgrim", "Specialist"];

// Task 9 (founder spec, 10 Agustus): fixed catalog of 15 sub-pathway
// archetypes (5 Pathway x 3 each), replacing free-text pathwayNoun
// generation on the carousel path only - manual override stays free text,
// untouched. English names are intentional (product terminology, same
// treatment as the Pathway names themselves). MUST stay byte-for-byte
// identical to the copy in public/app.js - no shared module system between
// client/server in this codebase, same hand-synced pattern already used for
// PATHWAY_NAMES/PATHWAY_DESC.
const SUB_PATHWAY_NAMES = {
  Architect: ["Engineer of Foundations", "Strategist of Blueprints", "Craftsman of Precision"],
  Warden: ["Sentinel of Discipline", "Keeper of Boundaries", "Guardian of Consistency"],
  Weaver: ["Connector of Circles", "Anchor of Belonging", "Bridge of Empathy"],
  Pilgrim: ["Wanderer of Meaning", "Seeker of Horizons", "Nomad of Discovery"],
  Specialist: ["Architect of Mastery", "Artisan of Depth", "Virtuoso of Precision"],
};
// Same principle as normalizeCompletionType above, but for subPathway: a
// wrong/malformed pick here is a much smaller mistake than a bad pathway/
// pathwayBlurb/rawPathwayTop2 (those still fail the whole response, see
// generateChapterAnalysis below) - so an invalid, out-of-enum, or
// wrong-pathway subPathway gets PATCHED to that pathway's first archetype
// instead of discarding an otherwise-good Chapter Analysis. Never throws,
// never blank.
function normalizeSubPathway(pathway, subPathway) {
  const options = SUB_PATHWAY_NAMES[pathway] || [];
  if (options.includes(subPathway)) return subPathway;
  return options[0] || null;
}
// Cheap, traceable fallback heuristic (no API key) - not meant to approximate
// real AI judgment, just a reasonable non-random default. Real generateChapterAnalysis
// below reads the whole conversation, not just the radar shape.
// growth -> Pilgrim inherits the old growth->Explorer slot (Pilgrim's "explore
// broadly before committing" is the closest surviving analog). purpose no
// longer has a direct 1:1 target since Seeker's old framing ("belum tahu
// arah") was exactly the emotional/life-phase framing v1.7 banned for
// Pathway - reassigned to Architect (working methodically toward what
// matters), my call where the PRD only fixed the axis renames, not this one.
const RADAR_AXIS_TO_PATHWAY = {
  livelihood: "Architect", purpose: "Architect",
  emotional: "Warden", body: "Warden",
  growth: "Pilgrim",
  social: "Weaver",
  autonomy: "Specialist", // wants their own self-directed path
  // Legacy 8-element keys (pre-MECE snapshots, until those accounts reset):
  career: "Architect", finance: "Architect", explorer: "Pilgrim", mind: "Specialist",
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
  const tension = computeLockTension(ctx.cards, ctx.lockedAxes, ctx.radarSnapshot, ctx.lockedOriginalValue);
  const flaggedTension = flaggedTensionAxes(tension);
  // v12: a flagged axis's locked number may have already ERODED (see
  // applyCalibrationCard, public/app.js - every contrary pick nudges it,
  // capped at +/-3 net like normal calibration) - report both the original
  // declaration and where it landed, instead of claiming a fixed number.
  const erodedLocks = flaggedTension
    .map((a) => ({ axis: a, from: ctx.lockedOriginalValue?.[a], to: ctx.radarSnapshot?.[a] }))
    .filter((e) => e.from != null && e.to != null && e.from !== e.to);
  if (!hasKey()) return fallbackChapterAnalysis(ctx, shifts, flaggedTension, erodedLocks);
  try {
    const shiftNote = shifts.length
      ? `\n\nKALIBRASI: radar awal pengguna (ctx.radarRaw, hasil drag manual mentah) bergeser signifikan (≥2 poin) di sumbu berikut setelah reaksi mereka ke skenario: ${shifts.map((s) => `${RADAR_AXIS_LABELS[s.axis] || s.axis} (${s.from}→${s.to})`).join(", ")}. WAJIB sebutkan pergeseran ini secara eksplisit di "insight" - jangan diam-diam pakai radar terkalibrasi tanpa memberi tahu pengguna bahwa persepsi awal mereka bergeser dari pilihan-pilihan konkret mereka, bukan cuma dari drag manual mereka sendiri (mis. "Kamu awalnya menandai Livelihood sangat tinggi, tapi dari beberapa hal yang kamu pilih, itu terasa tidak sekuat itu - atau memang segitu, dan aku salah baca?").`
      : "";
    const tensionNote = flaggedTension.length
      ? `\n\nKETEGANGAN LOCK: sumbu berikut dikunci pengguna tapi berulang kali dipilih BERLAWANAN dari nilai kuncinya (mis. dikunci tinggi tapi berulang jadi paling-tidak-disukai, atau dikunci rendah tapi berulang jadi favorit): ${flaggedTension.map((a) => RADAR_AXIS_LABELS[a] || a).join(", ")}.${erodedLocks.length ? ` Angkanya SUDAH BERGESER akibat ini (v12 - kontradiksi berulang mengikis angka locked, bukan cuma dicatat): ${erodedLocks.map((e) => `${RADAR_AXIS_LABELS[e.axis] || e.axis} (${e.from}→${e.to})`).join(", ")}. WAJIB sebutkan pergeseran ANGKA ini secara eksplisit dan konkret di "insight", bukan cuma isyarat samar.` : ""} WAJIB munculkan ini di "insight" sebagai OBSERVASI JUJUR ke pengguna (bukan pernyataan final soal siapa yang benar), mis. "Kamu kunci Body di 10, tapi pilihan-pilihanmu di kartu beberapa kali condong ke arah lain, jadi sekarang turun ke 7 - masih relevan segitu, atau ini layak dipikir ulang?" Kamu TIDAK perlu menyarankan pengguna mengubah apa pun secara manual - sistem sudah menyesuaikan angkanya sendiri berdasarkan pola pilihan mereka; kalau pengguna tidak setuju dengan hasil itu, jalur override manual yang sudah ada tetap tersedia.`
      : "";
    // Task 9: pathway and subPathway are decided together in this SAME call,
    // so the prompt can't pre-filter to "the 3 that match whichever pathway
    // gets picked" - the model doesn't know its own pick yet. Inject the
    // full 15-entry catalog (built from SUB_PATHWAY_NAMES itself, never
    // hand-typed twice so the prompt can't drift from what normalizeSubPathway
    // actually validates against) and constrain the choice after the fact.
    const subPathwayCatalogText = Object.entries(SUB_PATHWAY_NAMES)
      .map(([p, names]) => `${p}: ${names.map((n) => `"${n}"`).join(", ")}`)
      .join("; ");
    const user = `Konteks pengguna (JSON):\n${JSON.stringify(ctx)}\n\nTugas: ini akhir dari onboarding adaptif. ctx.radarSnapshot adalah radar TERKALIBRASI (skala 1-10, total 35: Body, Growth, Livelihood, Emotional Stability, Social, Purpose, Autonomy) - hasil drag manual pengguna (ctx.radarRaw) yang sudah dikoreksi halus berdasarkan reaksi mereka ke Adaptive Scenario Cards (ctx.cards), karena self-report di skala 1-10 rawan bias yang diuji ulang lewat pilihan konkret. ctx.lockedAxes adalah sumbu yang SENGAJA mereka kunci (maksimal 3) dan BOLEH tetap muncul sebagai opsi kartu - angkanya TETAP KEBAL dari pilihan yang MENDUKUNG kuncinya, tapi (v12) BOLEH terkikis kalau pilihan berulang kali BERLAWANAN dari kuncinya (lihat KETEGANGAN LOCK di bawah kalau relevan) - jadi jangan berasumsi nilai di ctx.radarSnapshot untuk sumbu locked itu pasti sama dengan saat pertama dikunci. ctx.cards masing-masing berisi {scenario, options, mostPreferred, leastPreferred} - mostPreferred sumbu yang mereka pilih paling disukai, leastPreferred yang paling tidak disukai dari sisanya; dua sumbu yang tidak dipilih sama sekali di kartu itu netral. Pola pilihan ini + radar terkalibrasi + sumbu terkunci adalah seluruh sinyal yang kamu punya (tidak ada teks bebas dari pengguna). PENTING: kalau ada 2-3 sumbu terkunci di nilai tinggi sekaligus (kombinasi ekstrem, mis. Body dan Social dua-duanya dikunci tinggi), interpretasi kombinasi itu WAJIB dikaitkan ke pola pilihan aktual mereka - jangan mengarang generalisasi sendiri soal apa "arti" kombinasi itu.${shiftNote}${tensionNote}\n\nRangkum semuanya jadi Chapter Analysis. Balas JSON dengan bentuk persis:\n{"insight": string, "pathway": "Architect"|"Warden"|"Weaver"|"Pilgrim"|"Specialist", "subPathway": string, "pathwayBlurb": string, "secondaryTrait": string|null, "rawPathwayTop2": [{"pathway": string, "blurb": string}, {"pathway": string, "blurb": string}]}\n\nAturan: "insight" adalah rangkuman naratif 2-4 kalimat (nilai utama, gesekan/tantangan utama, arah transformasi) — personal, bukan generik, dan harus berdiri sendiri sebagai pemahaman tentang orang ini (akan dipakai sebagai konteks mentor setiap hari setelahnya, bukan cuma ditampilkan sekali) — ini bagian Chapter, boleh bicara soal fase/masalah hidup yang sedang dijalani. "pathway" satu rekomendasi UTAMA dari 5 nama itu berdasarkan pola dari SELURUH konteks (radar terkalibrasi + pola favorit/tidak-favorit semua kartu, termasuk yang paling-tidak-disukai — penolakan juga informasi), bukan cuma sumbu radar tertinggi. "subPathway" WAJIB salah satu dari 3 arketipe TETAP milik "pathway" yang kamu pilih di atas - BUKAN teks bebas, BUKAN mengarang nama baru, BUKAN pilih dari pathway lain. Daftar lengkap 15 arketipe (5 pathway x 3, tulis PERSIS sama termasuk huruf besar/kecil dan spasi): ${subPathwayCatalogText}. Setelah kamu tentukan "pathway", pilih SATU nama dari daftar milik pathway itu saja yang paling cocok dengan pola pengguna ini (dari radar terkalibrasi + pola pilihan kartu skenario). "pathwayBlurb" SATU kalimat pendek kenapa "pathway" ini relevan SECARA GAYA PERILAKU (ingat aturan Pathway≠Chapter di system prompt — bukan soal masalah/fase hidup yang sedang dijalani, itu sudah tugas "insight" di atas) - dipakai sebagai label kartu terpisah, jangan mengulang kalimat "insight" persis sama. "rawPathwayTop2": DUA kandidat pathway TERKUAT kalau kamu HANYA melihat ctx.radarRaw (radar SEBELUM kalibrasi) - untuk field ini SAJA, abaikan ctx.cards sepenuhnya, murni bentuk radar mentahnya; urutkan dari paling kuat, masing-masing dengan "blurb" satu kalimat (gaya perilaku, sama aturan dengan pathwayBlurb) kenapa radar mentah itu mengarah ke sana. Ini bukan rekomendasi utama - tujuannya menunjukkan ke pengguna bagaimana radar AWAL saja (sebelum bukti dari pilihan konkret) akan mengarahkan mereka, sebagai pembanding; boleh sama atau beda dengan "pathway". "secondaryTrait" opsional, satu frasa pendek trait tambahan yang terlihat tapi bukan fokus utama (null kalau tidak ada yang jelas) — informasional saja, bukan pathway kedua. Nada hangat, personal, seperti mentor yang benar-benar mendengarkan.`;
    const result = await callClaude(user);
    if (!result?.pathway || !PATHWAY_NAMES.includes(result.pathway)) throw new Error("bad shape");
    if (typeof result.pathwayBlurb !== "string") throw new Error("bad shape: pathwayBlurb");
    if (
      !Array.isArray(result.rawPathwayTop2) || result.rawPathwayTop2.length !== 2 ||
      !result.rawPathwayTop2.every((c) => c && PATHWAY_NAMES.includes(c.pathway) && typeof c.blurb === "string")
    ) {
      throw new Error("bad shape: rawPathwayTop2");
    }
    // Unlike the three checks above (any failure discards the WHOLE
    // response), an invalid subPathway is patched in place - a good Chapter
    // Analysis shouldn't be thrown away over one fumbled constrained field.
    result.subPathway = normalizeSubPathway(result.pathway, result.subPathway);
    delete result.pathwayNoun; // superseded by subPathway - drop any stray legacy field the model might still emit out of habit
    return { ...result, significantShifts: shifts, lockTension: flaggedTension };
  } catch (e) {
    console.error("generateChapterAnalysis failed, using fallback:", e.message);
    return fallbackChapterAnalysis(ctx, shifts, flaggedTension, erodedLocks);
  }
}

function fallbackChapterAnalysis(ctx, shifts, flaggedTension, erodedLocks) {
  const axis = highestRadarAxis(ctx.radarSnapshot);
  const pathway = RADAR_AXIS_TO_PATHWAY[axis] || "Pilgrim";
  const rawPathwayTop2 = topAxes(ctx.radarRaw || ctx.radarSnapshot, 2).map((a) => ({
    pathway: RADAR_AXIS_TO_PATHWAY[a] || "Pilgrim",
    blurb: "Berdasarkan radar awal sebelum kalibrasi.",
  }));
  const shiftText = (shifts && shifts.length)
    ? " Catatan kalibrasi: " + shifts.map((s) => `${RADAR_AXIS_LABELS[s.axis] || s.axis} bergeser dari ${s.from} ke ${s.to} setelah pilihan-pilihanmu di skenario`).join("; ") + "."
    : "";
  const erodedByAxis = new Map((erodedLocks || []).map((e) => [e.axis, e]));
  const tensionText = (flaggedTension && flaggedTension.length)
    ? " Catatan kunci: " + flaggedTension.map((a) => {
        const e = erodedByAxis.get(a);
        return e
          ? `kamu mengunci ${RADAR_AXIS_LABELS[a] || a} di ${e.from}, tapi beberapa pilihanmu condong ke arah lain, jadi sekarang turun ke ${e.to} — masih relevan segitu, atau ini layak dipikir ulang?`
          : `kamu mengunci ${RADAR_AXIS_LABELS[a] || a}, tapi beberapa pilihanmu condong ke arah lain — masih yakin, atau ini layak dipikir ulang?`;
      }).join(" ")
    : "";
  return {
    insight: (hasKey()
      ? "Koneksi ke mentor lagi tersendat — tapi dari yang kamu ceritakan, ini arah yang tetap relevan buat dicoba."
      : "Mode tanpa API key: analisis di bawah ini masih berbasis pola sederhana dari radar-mu, belum benar-benar membaca ceritamu. Tambahkan ANTHROPIC_API_KEY di .env supaya mentor beneran personal.") + shiftText + tensionText,
    pathway,
    subPathway: normalizeSubPathway(pathway, null),
    pathwayBlurb: "Direkomendasikan dari pola radar dan pilihan-pilihanmu selama onboarding.",
    rawPathwayTop2,
    secondaryTrait: null,
    significantShifts: shifts || [],
    lockTension: flaggedTension || [],
  };
}

module.exports = {
  generateQuest, processReflection, hasKey,
  generateScenarioCard, generateChapterAnalysis,
  generateTargetOptions, generatePracticeTest, generateJobMatchAnalysis,
  PATHWAY_NAMES, SUB_PATHWAY_NAMES, fallbackChapterAnalysis, normalizeSubPathway,
};
