const MENTOR_SYSTEM = `Kamu adalah mentor AI di dalam produk bernama Eleva — sebuah AI Character Growth System.

Prinsip yang WAJIB kamu pegang:
- Kamu mentor, bukan mesin jawaban. Kamu mengarahkan, bukan menggurui.
- Quest/Acting yang kamu buat harus personal untuk situasi hidup pengguna saat ini, BUKAN checklist generik ("minum air", "bangun jam 5"). Ambil dari ctx.profile.originStory (ringkasan naratif tentang siapa mereka, hasil sintesis dari onboarding — cerita, values, dan ketakutan mereka semua tercermin di situ, bukan field terpisah), Pathway, dan sinyal minat/fokus mereka: ctx.radarSnapshot (bentuk radar self-assessment mereka — 7 sumbu MECE: Body, Growth, Livelihood, Emotional Stability, Social, Purpose, Autonomy; akun lama mungkin masih membawa 8 sumbu era sebelumnya — baca kunci yang ada apa adanya; sumbu yang menonjol menandakan area yang sedang paling mereka pedulikan) dan/atau ctx.growthFocus (kategori pilihan eksplisit, cuma ada di akun yang onboarding sebelum radar chart diperkenalkan — pakai kalau ada, radarSnapshot kalau tidak). Ini semua kompas yang mengarahkan Quest/Acting/reflection sepanjang perjalanan, bukan data onboarding yang dilupakan setelah dipakai sekali.
- Satu instruksi utama per hari — bentuknya bisa "Quest" (aksi konkret yang dikerjakan, cocok untuk progress yang terlihat) atau "Acting Method" (praktik cara bersikap sepanjang hari, cocok untuk melatih identitas Pathway yang dipilih, mis. pathway "Sales": "sebelum menjawab, ajukan tiga pertanyaan dulu"). Kamu yang memilih framing mana yang lebih relevan hari itu berdasarkan Pathway dan chapter pengguna — jangan berikan dua-duanya sekaligus.
- **Quest yang menyasar goal WAJIB memakai kerangka WOOP (Wish-Outcome-Obstacle-Plan, Oettingen) secara IMPLISIT — bukan field terpisah, bukan pertanyaan tambahan ke pengguna.** ctx.activeGoal SUDAH mewakili Wish+Outcome-nya (goal itu sendiri, tidak perlu ditulis ulang). Sebelum menulis instruksi hari ini, pikirkan secara internal (TIDAK perlu ditulis eksplisit berformat "Obstacle: ... Plan: ..." ke pengguna) Obstacle yang paling mungkin bikin goal INI gagal buat ORANG INI SPESIFIK — infer dari radar+profile mereka (mis. Autonomy rendah + goal ambisius → obstacle "gampang menyerah begitu tidak ada struktur eksternal yang memaksa"; Emotional Stability rendah + goal sosial → obstacle "gampang mundur begitu ada penolakan kecil"), lalu rancang quest/acting hari ini supaya SECARA DESAIN mengantisipasi obstacle spesifik itu (Plan) — bukan instruksi generik yang mengabaikan risiko gagalnya. "why" boleh menyinggung alasan ini secara natural kalau relevan, tapi tetap sebagai kalimat mentor biasa, bukan template berlabel.
- **Goal menentukan APA, Pathway menentukan BAGAIMANA — dua sumbu independen, jangan dicampur.** ctx.goals (kalau ada) adalah 1-3 target yang mau dicapai pengguna selama First Trial (mis. "Punya badan sehat", "IELTS band 6.5", "Dapat kerja remote sebagai data analyst" — tiga area beda sekaligus itu WAJAR, bukan kasus aneh); ctx.activeGoal adalah goal yang jadi fokus quest HARI INI (sudah dipilih sistem lewat rotasi — jangan kamu ganti sendiri). Pathway KONSTAN sepanjang First Trial dan TIDAK ikut berubah saat goal yang digarap berganti hari ke hari — gaya Pathway harus konsisten LINTAS goal, bukan cuma lintas hari untuk goal yang sama. Contoh acuan WAJIB: goal "IELTS band 6.5" dengan Pathway Pilgrim → "coba 3 metode belajar berbeda minggu ini sebelum komit ke satu silabus" (eksploratif), BUKAN "ikuti jadwal belajar terstruktur 2 jam/hari" (itu gaya Architect); goal yang sama dengan Pathway Architect harus menghasilkan framing berbeda — bukan konten goal yang berubah, tapi cara mendekatinya. Berlaku sama untuk goal Livelihood (Pilgrim: "eksplor 3 jenis role dulu sebelum fokus lamar" vs Architect: "susun rencana lamar 10 posisi terstruktur") dan goal Body (Pilgrim: "coba 2-3 olahraga beda dulu" vs Architect: "ikuti program fix 12 minggu"). Radar boleh menunjukkan pola berbeda dari area goal (mis. radar dominan di area lain sementara goal-goalnya di area yang radarnya rendah) — itu BUKAN kontradiksi yang perlu kamu koreksi atau komentari sebagai masalah: radar = kondisi/fondasi saat ini, goal = target yang dikejar (boleh di luar area kuat radar, wajar), Pathway = gaya konstan untuk mengejar goal APA PUN.
- Acting Method HARUS berbasis perilaku ("tahan dulu, tanya dulu"), BUKAN berbasis target hasil ("closing 3 deal") — itu akan menggeser Eleva jadi productivity app, bukan character growth app.
- **Task 7d — hierarki resmi: Primary Quest ≠ Milestone ≠ Today's Trial, jangan campur istilahnya di teks bebas mana pun.** "Primary Quest" HANYA merujuk ke goal yang dinyatakan user sendiri (ctx.activeGoal, tidak berubah tiap hari). "Milestone" HANYA merujuk ke ctx.currentTarget (angka konkret yang sedang dikejar, berubah cuma saat tercapai). "Today's Trial" adalah instruksi/quest HARI INI yang kamu buat sekarang — boleh berubah topik total hari ke hari (mis. dari lari ke istirahat pemulihan) TANPA itu berarti Primary Quest/Milestone-nya berubah. Jangan pernah menulis kalimat yang menyiratkan Trial hari ini MENGGANTIKAN atau MELUPAKAN Primary Quest/Milestone — Trial cuma satu langkah di bawahnya.
- Nada bicara: hangat, jujur, tidak menghakimi, tidak sok tahu, seperti teman yang paham tapi tetap jujur ("Bukan malas. Kamu kehilangan tujuan.") — bukan motivator generik.
- **Tulis kayak ngobrol lewat chat, bukan draft surat resmi (feedback berulang dari pengguna: output kedengaran kaku).** HINDARI kata sambung/frasa formal-birokratis: "oleh karena itu", "maka dari itu", "sehingga", "terhadap", "adapun", "guna", "perihal", "hal tersebut", "dikarenakan" — ganti dengan kata sehari-hari ("makanya", "jadi", "soal", "buat", "karena"). HINDARI struktur kalimat pengumuman/formulir ("tidak ada agenda wajib", "kamu memiliki waktu luang") — tulis seperti orang beneran ngomong. Kalimat pendek-pendek lebih baik daripada satu kalimat majemuk panjang. Partikel percakapan wajar boleh dipakai kalau pas ("sih", "kok", "kayaknya", "banget", "nggak" bukan "tidak") — jangan berlebihan sampai norak, tapi juga jangan dihindari total sampai terasa kaku. Contoh SALAH (kaku): "Akhir pekan tiba dan kamu punya waktu kosong lebih dari biasanya — tidak ada agenda wajib. Kamu mau pakai waktu itu untuk apa?" Contoh BENAR (natural): "Weekend nih, tiba-tiba kosong. Mau dipakai buat apa?" Berlaku untuk SEMUA teks bebas yang kamu tulis — insight, quest.description/why, mentorReply, scenario, pathwayBlurb, insightRows, pattern.title/pattern.description, dsb — bukan cuma satu jenis output.
- Fokus pada pembentukan identitas ("menjadi seseorang yang reliable"), bukan produktivitas semata.
- **Pathway ≠ Chapter — jangan sampai tercampur (Bible v1.7).** Chapter menjawab "lagi di fase/masalah hidup apa" — sifatnya TEMPORAL, berubah seiring waktu (mis. "Lost", "Healing"). Pathway menjawab "bagaimana gaya orang ini berinteraksi dengan dunia" — sifatnya lebih TAHAN LAMA, soal gaya perilaku, BUKAN soal masalah/fase hidup yang sedang dihadapi. SEMUA teks yang kamu tulis soal Pathway (insight, pathwayBlurb, pathwayNoun, quest yang menyebut Pathway) WAJIB berbicara gaya perilaku. Contoh benar: "sebagai Pilgrim, kamu cenderung menjelajah dulu sebelum berkomitmen." Contoh SALAH (itu tugas Chapter, bukan Pathway): "Pathway-mu adalah menyembuhkan luka" atau "kamu belum tahu arah".
- **Jangan sebut nama sumbu radar secara harfiah** (Body/Growth/Livelihood/Emotional Stability/Social/Purpose/Autonomy) di teks bebas mana pun (insight, pathwayBlurb, secondaryTrait, insightRows, pattern.title/pattern.description, dsb) — itu label internal buat sistem, bukan bahasa yang manusiawi. Terjemahkan jadi kecenderungan nyata orangnya: bukan "kamu fokus pada Livelihood dan Autonomy", tapi mis. "kamu bergerak paling kuat kalau soal penghasilan dan keputusan yang benar-benar kamu pegang sendiri kendalinya" — deskripsikan PERILAKU/KECENDERUNGAN di dunia nyata, bukan nama kategori.
- **Semua teks bebas WAJIB Bahasa Indonesia natural** (insight, pathwayBlurb, secondaryTrait, insightRows, pattern.title/pattern.description, mentorReply, quest.description/why, dsb) — jangan tiba-tiba beralih ke Inggris di tengah-tengah, kecuali istilah yang memang bagian dari produk dan tidak diterjemahkan (nama Pathway seperti "Architect", "Pilgrim").
- Kamu BUKAN terapis. Kalau refleksi pengguna menunjukkan tanda krisis (menyakiti diri sendiri, distres berat, putus asa ekstrem), jangan lanjutkan alur quest seperti biasa — mentorReply/insight harus dengan lembut mengarahkan ke bantuan profesional atau layanan krisis, bukan mengabaikannya demi melanjutkan "cerita".
- Balas HANYA dengan JSON valid. Tidak ada teks, tidak ada backtick, tidak ada penjelasan di luar JSON.`;

const FALLBACK_QUESTS = [
  { title: "Satu langkah kecil, bukan lompatan", description: "Pilih satu hal yang selama ini kamu tunda karena terasa besar. Kerjakan bagian terkecilnya saja, hari ini.", statFocus: "purpose", why: "Kadang arah nggak butuh keputusan besar, cuma butuh gerakan pertama." },
  { title: "Cerita ke satu orang", description: "Hubungi satu orang yang kamu percaya. Bukan basa-basi — ceritakan satu hal nyata tentang kondisimu sekarang.", statFocus: "social", why: "Isolasi terasa aman, tapi diam-diam menguras." },
];

function hasKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// maxTokens: 1000 is enough for every conversational/JSON reply here EXCEPT
// the Reading Half Diagnostic sprint (a 650-900-word passage + 20 questions
// with options/explanations), which passes its own budget. A truncated
// response fails JSON.parse below and surfaces as a normal generation error.
async function callClaude(userContent, { maxTokens = 1000 } = {}) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
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

// SOMA Nutrition Implementation Brief Part A (12 Agustus): keyword backstop
// for the founder-reported regression where a recovery/rest/nutrition-
// themed quest ("Audit Fondasi Pemulihan" was the reported instance)
// classified as "reflective" instead of structured-physical/recovery, and
// therefore rendered the free-text 12-word growth-gate form instead of the
// structured sleep/water/protein/pain fields (server/structured.js,
// public/app.js recoveryFieldsHTML). The Task 7d prompt instruction (below,
// generateQuest) already tells the model to classify these correctly - this
// keyword match is a DEFENSE-IN-DEPTH backstop for when the model doesn't
// follow it, not a replacement for the instruction. Deliberately simple
// substring matching (not stemming/NLP) - false positives here just mean an
// extra quest gets the richer structured form instead of free text, which is
// never a worse outcome for a Body/recovery-themed Trial (Task 7d's own
// principle: "no Trial defaults to a free textarea").
const RECOVERY_KEYWORDS = ["tidur", "hidrasi", "protein", "pemulihan", "cedera", "kram", "makan", "nutrisi"];
function looksRecoveryThemed(quest) {
  const text = `${quest.title || ""} ${quest.description || ""}`.toLowerCase();
  return RECOVERY_KEYWORDS.some((kw) => text.includes(kw));
}

// Task 7b: the model self-reports which completion flow a quest uses, but
// the pair is normalized here in code (defense in depth, same principle as
// every other AI-shaped field): structured-physical REQUIRES a valid
// structuredKind, anything malformed downgrades to the safe "reflective"
// path rather than rendering a broken form.
function normalizeCompletionType(quest) {
  if (!quest) return quest;
  // Task 7d: "recovery" added alongside cardio/gym - rest/hydration/nutrition
  // Trials are evidence-driven the same way active exercise is (per the
  // "no Trial defaults to a free textarea" principle), not journaled.
  if (quest.completionType === "structured-physical" && ["cardio", "gym", "recovery"].includes(quest.structuredKind)) {
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
  // Task 14: a fifth completionType, the evidence-submission half of the
  // Livelihood Milestone loop - completed by a structured form (company,
  // role, date, CV version, submission proof), not a text/number form of
  // its own kind. Same "no structuredKind" rule as practice-test/job-match.
  if (quest.completionType === "job-application-submit") {
    quest.structuredKind = null;
    return quest;
  }
  // SOMA Nutrition Implementation Brief Part B item 10: a sixth
  // completionType, PROGRESSIVE lifecycle (accumulates several contribution
  // submissions across one day instead of one-and-done, see server/
  // nutrition.js) - no structuredKind of its own, same rule as practice-
  // test/job-match/job-application.
  if (quest.completionType === "nutrition-log") {
    quest.structuredKind = null;
    return quest;
  }
  // Video Quest (LABORA design handoff): a seventh completionType - user
  // picks ONE YouTube video for the quest's fixed topic, the video gets
  // locked on assessment start, and completion = passing a 15-question
  // HOTS set generated from that video's transcript (graded in
  // server/videoQuiz.js). No structuredKind of its own, same rule as
  // practice-test/job-match/job-application/nutrition-log. Without this
  // branch a model-emitted video-quiz would silently downgrade to
  // reflective (the exact regression tests/recoveryregression.js guards
  // against for recovery).
  if (quest.completionType === "video-quiz") {
    quest.structuredKind = null;
    return quest;
  }
  // LABORA Chain (19 Agustus): an eighth completionType - one LIVELIHOOD
  // daily quest carrying 2-3 LABORA feature steps done in sequence (see
  // server/laboraChain.js). Same "no structuredKind" rule; the steps
  // themselves are validated by normalizeLaboraChain below, which also
  // downgrades a malformed chain to plain job-match-analysis.
  if (quest.completionType === "labora-chain") {
    quest.structuredKind = null;
    return quest;
  }
  // Multi-Domain Quest Hub (design handoff, 19 Agustus): a ninth
  // completionType - a quest requiring completion of TWO independent
  // feature areas (primaryFeature + supportingFeatures) before it
  // resolves, order-independent. No structuredKind of its own, same rule
  // as practice-test/job-match/job-application/nutrition-log/video-quiz.
  // normalizeMultiDomainQuest (called before this function, in
  // generateQuest) already stamps completionType/primaryFeature/
  // supportingFeatures/featureRequirements onto the quest whenever the
  // model opts in via multiDomain.use - this branch just has to recognize
  // that shape and pass it through untouched rather than downgrading it.
  if (quest.completionType === "multi-domain" && quest.primaryFeature && Array.isArray(quest.supportingFeatures) && quest.featureRequirements) {
    quest.structuredKind = null;
    return quest;
  }
  // SOMA Nutrition Implementation Brief Part A: reached here means the model
  // didn't classify this as one of the known valid combos above - before
  // downgrading to reflective, check whether the quest itself reads as
  // recovery-themed and force the correct classification if so.
  if (looksRecoveryThemed(quest)) {
    quest.completionType = "structured-physical";
    quest.structuredKind = "recovery";
    return quest;
  }
  quest.completionType = "reflective";
  delete quest.structuredKind;
  return quest;
}

// Task 7c/7d: the model self-reports evidenceSchema (what field(s) the
// completion form should show, and what number counts as "done") the same
// way it self-reports completionType/structuredKind - normalized here in
// code before it ever reaches the client, same defense-in-depth pattern.
// Task 7d DoD explicitly retires the manual "Aktivitasnya jenis apa?" picker
// fallback entirely - so unlike Task 7c's version of this function, a
// malformed/missing evidenceSchema is NO LONGER patched to null (null is
// exactly what used to trigger that picker client-side). Every
// structured-physical quest now gets a non-null evidenceSchema with at
// least metricType set correctly for its structuredKind, even if the model
// didn't provide a usable activityType/target - those individual fields can
// still be null (the client just won't pre-fill/show a target line), but
// the client always knows which FORM to render without asking.
const CARDIO_ACTIVITY_TYPES = ["Lari", "Jalan cepat", "Sepeda", "Lompat tali", "Lainnya"];
function normalizeEvidenceSchema(quest) {
  if (!quest) return quest;
  if (quest.completionType !== "structured-physical") {
    quest.evidenceSchema = null;
    return quest;
  }
  const s = (quest.evidenceSchema && typeof quest.evidenceSchema === "object") ? quest.evidenceSchema : {};
  const target = typeof s.target === "number" && Number.isFinite(s.target) && s.target > 0 ? s.target : null;
  if (quest.structuredKind === "cardio") {
    const activityType = CARDIO_ACTIVITY_TYPES.includes(s.activityType) ? s.activityType : null;
    quest.evidenceSchema = { activityType, hasWeight: null, metricType: "distance", target: target != null && target <= 200 ? target : null };
  } else if (quest.structuredKind === "gym") {
    quest.evidenceSchema = { activityType: null, hasWeight: typeof s.hasWeight === "boolean" ? s.hasWeight : null, metricType: "reps", target: target != null && target <= 500 ? target : null };
  } else if (quest.structuredKind === "recovery") {
    // Recovery has no single target number to hit (sleep/water/protein/pain
    // are all collected together, see server/structured.js) - metricType
    // alone is enough for the client to pick the right form.
    quest.evidenceSchema = { activityType: null, hasWeight: null, metricType: "recovery", target: null };
  } else {
    // structuredKind itself was malformed - normalizeCompletionType already
    // downgraded completionType to "reflective" in that case, so this branch
    // is unreachable in practice, but kept as a safe default rather than null.
    quest.evidenceSchema = { activityType: null, hasWeight: null, metricType: null, target: null };
  }
  return quest;
}

// Item 1 (12 Agustus): practice-test's counterpart to evidenceSchema - the
// model self-reports which kind/track the quest already commits to, so the
// client can skip the redundant Reading/Listening + Academic/General pickers
// ("Tembus Blind Spot Listening" should never re-ask "Mau latihan apa
// dulu?"). Same defense-in-depth normalization as normalizeEvidenceSchema:
// anything not an exact enum value becomes null, and null simply means the
// picker still shows - the pre-Item-1 behavior, never a broken state.
function normalizePracticeTestSchema(quest) {
  if (!quest) return quest;
  if (quest.completionType !== "practice-test") {
    quest.practiceTestSchema = null;
    return quest;
  }
  const s = (quest.practiceTestSchema && typeof quest.practiceTestSchema === "object") ? quest.practiceTestSchema : {};
  quest.practiceTestSchema = {
    kind: ["reading", "listening"].includes(s.kind) ? s.kind : null,
    track: ["academic", "general"].includes(s.track) ? s.track : null,
  };
  return quest;
}

// LABORA Chain: the model proposes WHICH steps; laboraChain.normalizeChain
// enforces everything else (known features only, dedupe, canonical order
// video-quiz -> job-match-analysis -> job-application-submit, submit only
// when it can ever be completed, 2-3 steps). A chain that doesn't survive
// validation downgrades to a plain job-match-analysis quest - the existing
// single-feature flow, never a broken chain.
const laboraChainLib = require("./laboraChain");
function normalizeLaboraChain(quest, ctx) {
  if (!quest) return quest;
  if (quest.completionType !== "labora-chain") {
    quest.laboraChain = null;
    return quest;
  }
  const chain = laboraChainLib.normalizeChain(quest.laboraChain?.steps, {
    jobMatchHintQualified: ctx?.jobMatchHint?.qualified === true,
  });
  if (!chain) {
    quest.completionType = "job-match-analysis";
    quest.laboraChain = null;
    quest.videoQuiz = null;
    return quest;
  }
  quest.laboraChain = chain;
  quest.lifecycleType = "session";
  quest.evidenceSchema = null;
  return quest;
}

// Video Quest: the model self-reports which topic the quest tests (static
// per quest - the topic anchors which video the user is ALLOWED to pick, so
// it must never regenerate per attempt) plus pass threshold and a time
// estimate. Same defense-in-depth normalization as practiceTestSchema,
// with one difference: topic can never be null (the whole flow needs it),
// so a malformed/missing topic falls back to the quest title.
function normalizeVideoQuizSchema(quest) {
  if (!quest) return quest;
  // A labora-chain quest containing a video-quiz step needs quest.videoQuiz
  // too (the /api/video-quiz routes read it top-level regardless of which
  // completionType owns the quest) - normalizeLaboraChain runs BEFORE this
  // in the generateQuest chain so the check sees the cleaned steps.
  const chainHasVq = quest.completionType === "labora-chain"
    && (quest.laboraChain?.steps || []).some((s) => s.feature === "video-quiz");
  if (quest.completionType !== "video-quiz" && !chainHasVq) {
    quest.videoQuiz = null;
    return quest;
  }
  const s = (quest.videoQuiz && typeof quest.videoQuiz === "object") ? quest.videoQuiz : {};
  const rawTopic = String(s.topic || "").trim();
  const topic = rawTopic.length >= 3 ? rawTopic.slice(0, 160) : String(quest.title || "").trim().slice(0, 160);
  const passThreshold = Number.isInteger(s.passThreshold) ? Math.max(5, Math.min(14, s.passThreshold)) : 11;
  const estimatedMinutes = Number.isInteger(s.estimatedMinutes) ? Math.max(5, Math.min(120, s.estimatedMinutes)) : 25;
  quest.videoQuiz = { topic, passThreshold, estimatedMinutes };
  return quest;
}

// SOMA Nutrition Implementation Brief Part B item 10: same defense-in-depth
// normalization as evidenceSchema/practiceTestSchema - the model proposes
// requiredContributions/primaryMetric/targetValue, code validates/patches
// before it's trusted (nutrition.initProgressiveState already clamps to
// sane defaults). Also stamps lifecycleType, the field that tells the
// client/server this quest accumulates across the day instead of resolving
// on one submit (brief item 3) - "session" for every other completionType,
// completely unchanged.
function normalizeProgressiveSchema(quest) {
  if (!quest) return quest;
  if (quest.completionType !== "nutrition-log") {
    quest.lifecycleType = "session";
    quest.progressive = null;
    return quest;
  }
  quest.lifecycleType = "progressive";
  const p = (quest.progressive && typeof quest.progressive === "object") ? quest.progressive : {};
  quest.progressive = nutrition.initProgressiveState(p);
  return quest;
}

// BODY · MOVEMENT execution flow (design handoff): explicit domain
// ownership fields, stamped server-side only - never trusted from or asked
// of the model, pure derivation from completionType/structuredKind, same
// "code decides, AI doesn't" posture as normalizeCompletionType above.
// Scope: only cardio/gym Today's Trial quests become BODY·MOVEMENT;
// recovery and every other completionType stay domain:null (matches
// server/metaTargets.js's own "no domain tag anywhere today" comment for
// everything outside this). META's on-demand gym-session quests
// (server/index.js's /api/meta/start "body" tool) are NOT stamped here -
// this only runs inside generateQuest, META's quest object is built
// directly in the route handler and never passes through this function.
function normalizeMovementFields(quest) {
  if (!quest) return quest;
  // Multi-Domain Quest Hub (design handoff, 19 Agustus) already owns
  // domain/primaryFeature/supportingFeatures for this completionType
  // (server/questHub.js's RECOVERY_NUTRITION_TEMPLATE, stamped by
  // normalizeMultiDomainQuest earlier in generateQuest's pipeline) - this
  // function's else-branch below unconditionally nulls those same fields
  // for anything that isn't BODY·MOVEMENT, so multi-domain quests must be
  // excluded here explicitly or their Hub fields get silently wiped before
  // ever reaching the client.
  if (quest.completionType === "multi-domain") return quest;
  if (quest.completionType === "structured-physical" && (quest.structuredKind === "cardio" || quest.structuredKind === "gym")) {
    quest.domain = "BODY";
    quest.primaryFeature = "MOVEMENT";
    quest.supportingFeatures = [];
    quest.executionMode = quest.structuredKind === "cardio" ? "CARDIO" : "STRENGTH";
    quest.evidenceMode = quest.structuredKind === "cardio" ? "MANUAL_ACTIVITY" : "SET_REP_LOAD";
  } else {
    quest.domain = null;
    quest.primaryFeature = null;
    quest.supportingFeatures = [];
    quest.executionMode = null;
    quest.evidenceMode = null;
  }
  return quest;
}

// Strength's execution engine needs a real multi-exercise plan (e.g. "Squat
// 3x10, Calf Raise 3x12"), not the single evidenceSchema.target rep count
// the old one-exercise form used. The model proposes plannedExercises
// directly (see the prompt instruction above) - this clamps/validates it,
// same defense-in-depth posture as every other AI-shaped field. Caps
// (20 exercises/50 sets) mirror gym-session's existing plausibility caps
// (structured.js) for consistency, even though this is a distinct system:
// an AI-authored per-goal plan, not a user-built session from META's fixed
// catalog - deliberately not sharing exerciseCatalog.js (see PRD comment).
function normalizePlannedExercises(quest) {
  if (!quest) return quest;
  if (quest.executionMode !== "STRENGTH") {
    quest.plannedExercises = null;
    return quest;
  }
  const raw = Array.isArray(quest.plannedExercises) ? quest.plannedExercises : [];
  const clean = raw.slice(0, 20).map((e) => {
    const name = typeof e?.name === "string" ? e.name.trim().slice(0, 100) : "";
    const targetSets = Number.isInteger(e?.targetSets) && e.targetSets > 0 && e.targetSets <= 50 ? e.targetSets : null;
    const targetReps = Number.isInteger(e?.targetReps) && e.targetReps > 0 && e.targetReps <= 500 ? e.targetReps : null;
    const targetLoadKg = typeof e?.targetLoadKg === "number" && Number.isFinite(e.targetLoadKg) && e.targetLoadKg >= 0 && e.targetLoadKg <= 500 ? e.targetLoadKg : null;
    return name && targetSets && targetReps ? { name, targetSets, targetReps, targetLoadKg } : null;
  }).filter(Boolean);
  // A STRENGTH quest with no usable plan at all (model omitted it or it was
  // entirely malformed) falls back to one generic exercise derived from
  // evidenceSchema's existing target, so Preview/Pre-Start/Active Session
  // always have something to render rather than an empty plan.
  quest.plannedExercises = clean.length > 0 ? clean : [{
    name: "Latihan Utama", targetSets: 3,
    targetReps: quest.evidenceSchema?.target || 10,
    targetLoadKg: quest.evidenceSchema?.hasWeight ? 20 : null,
  }];
  return quest;
}

const questHub = require("./questHub");

// Multi-Domain Quest Hub (design handoff, 19 Agustus): unlike every other
// completionType above, the model is trusted for exactly ONE judgment call
// (multiDomain.use, a boolean) - the entire structural shape of the quest
// (title/description/why/domain/primaryFeature/supportingFeatures/
// featureRequirements) is unconditionally replaced with the one hand-
// authored canonical template this pattern ships with (server/questHub.js),
// never trusted from the model verbatim. Rationale: a wrong requirement id
// would silently break the Hub's completion-computation logic (exact
// string matching against featureData), so the content that matters for
// correctness is never AI-authored. Must run BEFORE normalizeCompletionType
// (so that function's own multi-domain branch recognizes the shape) and
// before normalizeMovementFields (which has its own explicit exemption for
// completionType "multi-domain" - see that function's comment - so field
// ownership never depends on pipeline order alone, but this is still the
// natural place for it: first, since everything else here inspects
// completionType/structuredKind that this function is what sets).
function normalizeMultiDomainQuest(result) {
  if (!result?.multiDomain?.use) return result;
  const t = questHub.RECOVERY_NUTRITION_TEMPLATE;
  result.quest = {
    ...result.quest,
    mode: "quest",
    title: t.title, description: t.description, why: t.why, statFocus: t.statFocus,
    completionType: "multi-domain", structuredKind: null,
    domain: t.domain, primaryFeature: t.primaryFeature, supportingFeatures: t.supportingFeatures,
    featureRequirements: t.featureRequirements, tujuanSingkat: t.tujuanSingkat,
    featureData: { RECOVERY: {}, NUTRITION: {} },
    featureState: { RECOVERY: "NOT_STARTED", NUTRITION: "NOT_STARTED" },
    status: "NOT_STARTED",
  };
  return result;
}

async function generateQuest(ctx) {
  if (!hasKey()) return fallbackQuest(ctx);
  try {
    const user = `Konteks pengguna (JSON):\n${JSON.stringify(ctx)}\n\nTugas: buatkan satu instruksi hari ini untuk pengguna ini.${ctx.activeGoal ? ` Quest/Acting hari ini WAJIB diarahkan ke ctx.activeGoal ("${ctx.activeGoal}") — itu goal yang dapat giliran hari ini dari rotasi sistem (ctx.goals berisi semua goal mereka sebagai konteks, tapi fokus hari ini cuma satu itu; ingat aturan Goal-vs-Pathway di system prompt: goal ini yang menentukan APA, Pathway pengguna yang menentukan BAGAIMANA pendekatannya). Rancang lewat kerangka WOOP implisit (lihat aturan di system prompt) — pikirkan dulu Obstacle paling mungkin bikin goal ini gagal buat orang ini spesifik, baru tulis instruksi yang secara desain mengantisipasi itu, bukan instruksi generik.` : ""}${ctx.currentTarget ? ` Goal ini SUDAH punya target berikutnya yang tersimpan: "${ctx.currentTarget.label}" (pendekatan yang dipilih: "${ctx.currentTarget.approach}") — quest hari ini adalah SATU LANGKAH MENUJU target itu, BUKAN asumsi target itu langsung tercapai hari ini juga (butuh berapa quest untuk sampai ke sana tergantung orangnya, jangan dipaksakan). Kalau quest ini structured-physical, "evidenceSchema.target" WAJIB sama persis dengan angka target ini (jarakKm untuk cardio, repetisi untuk gym) — jangan bikin target baru yang beda.` : ""}${ctx.kondisiStatus && ctx.kondisiStatus !== "Normal" ? ` Kondisi terbaru pengguna (Context Update): "${ctx.kondisiStatus}"${ctx.kondisiNote ? ` (catatan mereka: "${ctx.kondisiNote}")` : ""} — anggap ini bagian dari Obstacle di kerangka WOOP: turunkan intensitas/skala quest hari ini secara wajar (opsi lebih ringan, target lebih kecil, atau geser ke sesuatu yang tetap bisa dikerjakan dalam kondisi ini), JANGAN abaikan kondisi ini demi instruksi generik.` : ""}${ctx.previousQuestExpired ? ` PENTING: quest SEBELUMNYA untuk goal ini kelewat batas waktu tanpa sempat dikerjakan (bukan soal performa mereka — jangan disinggung sebagai kegagalan sama sekali) — anggap ini juga bagian dari Obstacle di kerangka WOOP: buat quest hari ini SECARA JELAS lebih kecil dan lebih ringan dari biasanya (durasi lebih singkat, target lebih kecil, langkah yang lebih sederhana) supaya momentumnya gampang balik lagi, BUKAN quest generik ukuran biasa.` : ""}${ctx.chainTrainingContext ? ` PENTING (Training chain step 3, WAJIB, dihitung sistem): ${ctx.chainTrainingContext.instruction} Level nyeri terakhir dari langkah Recovery: "${ctx.chainTrainingContext.levelNyeri || "Tidak ada"}".` : ""}${ctx.jobMatchHint ? ` PENTING (job-match hint, dihitung sistem, bukan tebakanmu): ${ctx.jobMatchHint.note}` : ""} Balas JSON dengan bentuk persis:\n{"chapterNumber": number, "chapterTitle": string, "insight": string, "pathwayNoun": string|null, "multiDomain": {"use": boolean}, "observed": {"yesterday": string, "noticed": string, "today": string}|null, "quest": {"mode": "quest"|"acting", "completionType": "structured-physical"|"reflective"|"practice-test"|"job-match-analysis"|"job-application-submit"|"nutrition-log"|"video-quiz"|"multi-domain"|"labora-chain", "structuredKind": "cardio"|"gym"|"recovery"|null, "evidenceSchema": {"activityType": "Lari"|"Jalan cepat"|"Sepeda"|"Lompat tali"|"Lainnya"|null, "hasWeight": boolean|null, "metricType": "distance"|"reps"|"recovery"|null, "target": number|null}|null, "plannedExercises": [{"name": string, "targetSets": number, "targetReps": number, "targetLoadKg": number|null}]|null, "practiceTestSchema": {"kind": "reading"|"listening"|null, "track": "academic"|"general"|null}|null, "videoQuiz": {"topic": string, "passThreshold": number, "estimatedMinutes": number}|null, "laboraChain": {"steps": [{"feature": "video-quiz"|"job-match-analysis"|"job-application-submit"}]}|null, "progressive": {"requiredContributions": number, "primaryMetric": "calories"|"protein"|"carbohydrates"|"fat", "targetValue": number}|null, "title": string, "description": string, "statFocus": one of [body,growth,livelihood,emotional,social,purpose,autonomy] (pakai kunci yang benar-benar ada di ctx.stats kalau akunnya masih membawa kunci era lama), "why": string}}\n\nAturan: "observed" (redesign homepage, "Eleva Observed") adalah jejak penalaran singkat SEBELUM quest hari ini — null kalau ctx.recentDays kosong (belum ada apa pun untuk diamati, jangan mengarang). Kalau ada: "yesterday" 1 kalimat ringkas apa yang terjadi di reflection/structuredData PALING BARU (angka nyata kalau ada, mis. "3.21 km, pace tidak stabil"), "noticed" 1 kalimat pola yang kamu amati dari itu (observasi, bukan instruksi), "today" 1 kalimat keputusan/fokus quest hari ini SEBAGAI AKIBAT dari observasi itu — ketiganya harus benar-benar berantai (today harus terasa seperti konsekuensi logis dari noticed, noticed dari yesterday), bukan tiga kalimat lepas-lepas. "insight" adalah 2-3 kalimat cara kamu memahami kondisi mereka sekarang, bukan nasihat. "quest.description" harus bisa dikerjakan/dilatih hari ini, konkret, maksimal 2 kalimat. "completionType": pilih "structured-physical" untuk quest fisik/terukur (cardio, gym, gerakan) MAUPUN quest istirahat/pemulihan/nutrisi (tidur, hidrasi, makan berprotein, level nyeri — biasanya area Body juga, TERMASUK quest lanjutan setelah cedera/kram/kondisi berat yang fokusnya pemulihan bukan aktivitas aktif): penyelesaiannya lewat field angka/pilihan terstruktur, BUKAN kotak refleksi/jurnal bebas — Task 7d menegaskan TIDAK ADA Trial bertema fisik/tubuh yang boleh default ke textarea bebas, apa pun temanya (aktif maupun pemulihan). "structuredKind" wajib "cardio" (lari/jalan/sepeda/lompat tali), "gym" (beban/set×rep), atau "recovery" (istirahat/hidrasi/nutrisi/pemulihan) kalau structured-physical, null kalau reflective/practice-test/job-match-analysis/job-application-submit/nutrition-log/video-quiz/labora-chain. Pilih "practice-test" HANYA kalau ctx.activeGoal SECARA EKSPLISIT soal ujian/tes/sertifikasi terukur dengan komponen reading/listening comprehension (mis. "IELTS band 6.5", persiapan TOEFL, ujian bahasa lain) — kalau ragu atau goal-nya bukan soal itu, JANGAN pilih ini, pakai reflective/structured-physical seperti biasa (practice-test seharusnya jarang muncul). Pilih "job-match-analysis" HANYA kalau ctx.activeGoal SECARA EKSPLISIT soal mencari/melamar kerja (mis. "dapat kerja remote sebagai data analyst", goal Livelihood yang jelas-jelas soal job hunting) — quest-nya minta pengguna cek lowongan nyata yang mereka temukan dibanding CV mereka, bukan quest generik "cari lowongan". Kalau ragu, JANGAN pilih ini (job-match-analysis seharusnya jarang muncul, sama seperti practice-test). Pilih "nutrition-log" HANYA kalau ctx.activeGoal SECARA EKSPLISIT soal pola makan/nutrisi terukur (mis. "makan lebih sehat", "cukupi protein harian", "turunkan berat badan lewat makan", target kalori/makro) — quest-nya minta pengguna MENCATAT beberapa kali makan hari ini (bukan satu submit tunggal seperti tipe lain: quest ini tetap terbuka sepanjang hari sampai jumlah makan yang diminta tercatat). "progressive" WAJIB diisi (bukan null) kalau completionType "nutrition-log", else null: "requiredContributions" jumlah kali makan yang diminta dicatat hari ini (wajar 2-4, mis. "catat 3 kali makan hari ini"), "primaryMetric" salah satu dari calories/protein/carbohydrates/fat sesuai apa yang paling relevan ke goal-nya (goal soal "cukupi protein" → "protein"; goal soal "turunkan berat badan"/umum → "calories"), "targetValue" angka target metrik itu untuk HARI INI yang wajar (mis. protein 60-100 gram, kalori 1500-2500) — kalau ctx.currentTarget dari goal ini sudah ada progressive sebelumnya, pertahankan primaryMetric yang sama kecuali ada alasan kuat berubah, jangan gonta-ganti metrik tiap hari. Pilih "job-application-submit" HANYA kalau ctx.jobMatchHint.qualified bernilai true (dihitung sistem — artinya analisis kecocokan lowongan TERAKHIR untuk goal ini baru saja LOLOS dan belum di-submit) — quest-nya minta pengguna menyiapkan lamaran dan submit ke lowongan yang barusan dianalisis itu, bukan analisis baru. JANGAN PERNAH pilih ini kalau ctx.jobMatchHint kosong atau qualified false — kalau analisis terakhir TIDAK lolos, pakai "reflective" atau "structured-physical" seperlunya yang menyasar gap dari ctx.jobMatchHint.gap (perkuat skill yang kurang), atau balik ke "job-match-analysis" untuk lowongan LAIN, TAPI JANGAN pernah mengarahkan submit ke lowongan yang baru saja dinyatakan tidak lolos. Pilih "video-quiz" HANYA kalau ctx.activeGoal SECARA EKSPLISIT soal menguasai satu topik pengetahuan/skill yang wajar dipelajari dari materi video (mis. "paham dasar data analysis", "belajar digital marketing", konsep coding/keuangan/skill kerja spesifik) DAN bentuk quest-nya memang minta pengguna belajar dari SATU video pilihan mereka sendiri lalu dibuktikan lewat assessment dari materi video itu — BUKAN untuk goal fisik, nutrisi, emosional, ujian reading/listening (itu practice-test), atau job hunting. Kalau ragu, JANGAN pilih ini (video-quiz seharusnya jarang muncul, sama seperti practice-test/job-match-analysis). "videoQuiz" WAJIB diisi (bukan null) kalau completionType "video-quiz", else null: "topic" SATU topik statis spesifik yang jadi bahan uji (mis. "Data Entry Fundamentals" — topik ini menentukan video apa yang boleh dipilih pengguna, JANGAN terlalu lebar), "passThreshold" 11 (dari 15 soal), "estimatedMinutes" estimasi wajar total belajar+assessment (biasanya 20-40). Pilih "labora-chain" untuk goal job-hunting (kondisi yang sama dengan job-match-analysis) KETIKA progres goal-nya butuh dipercepat: SATU quest harian berisi 2-3 langkah LABORA yang dikerjakan BERURUTAN dalam quest yang sama — urutan wajib video-quiz → job-match-analysis → job-application-submit (boleh subset 2 langkah). "laboraChain" WAJIB diisi kalau labora-chain ({"steps": daftar langkahnya}), null untuk tipe lain. Sertakan langkah video-quiz HANYA kalau ada skill-gap konkret yang layak dipelajari dulu (mis. dari ctx.jobMatchHint.gap) — dan kalau ada, "videoQuiz" WAJIB diisi seperti aturan video-quiz di atas. Sertakan job-application-submit HANYA kalau ada langkah job-match-analysis di chain yang sama ATAU ctx.jobMatchHint.qualified true (sistem otomatis melewati langkah submit kalau job-match di chain tidak lolos, jadi aman menyertakannya bersama job-match-analysis). JANGAN pakai labora-chain untuk goal non-job-hunting. "multiDomain.use" (Multi-Domain Quest Hub, design handoff 19 Agustus) HANYA true kalau ctx.activeGoal jelas-jelas soal domain Body DAN konteksnya (ctx.kondisiStatus, ctx.recentDays, riwayat cedera/kelelahan) mengarah ke butuh recovery/pemulihan sekaligus asupan nutrisi hari ini — bukan sekadar goal fisik biasa (itu tetap "structured-physical" seperti biasa), harus benar-benar terasa perlu DUA area sekaligus. Kalau true: JANGAN pilih completionType/structuredKind/evidenceSchema sendiri untuk kombinasi ini, sistem yang akan mengisi seluruh detail Recovery+Nutrition-nya secara otomatis dari template baku — cukup isi title/description/why/statFocus quest seperti biasa (bakal ditimpa sistem juga, tapi tetap isi wajar). Default false untuk hampir semua kasus (Quest Hub ini SENGAJA jarang muncul, bahkan lebih jarang dari practice-test/video-quiz/job-match-analysis). Quest kualitatif/emosional/sosial lain → "reflective". Ini dimensi TERPISAH dari "mode" (quest vs acting). "evidenceSchema" (Task 7c — WAJIB, dipakai supaya pengguna TIDAK perlu ditanya ulang "jenis aktivitasnya apa?" saat quest disubmit) hanya diisi (bukan null) kalau completionType "structured-physical", else null. Untuk cardio: "activityType" WAJIB salah satu dari 5 pilihan itu sesuai aktivitas yang diminta/tersirat quest-nya, "metricType" harus "distance", "target" = angka target jarak dalam km yang diminta/tersirat quest (mis. quest "Lari 3,2 km" → target 3.2), "hasWeight" null. Untuk gym: "hasWeight" true kalau quest menyebut alat/beban (dumbbell/barbell/mesin/kettlebell), false kalau bodyweight murni (push-up/squat/plank tanpa alat), "metricType" harus "reps", "target" = jumlah repetisi PER SET yang diminta/tersirat quest (mis. quest "push-up 3x20" → target 20), "activityType" null. "plannedExercises" WAJIB diisi (bukan null) kalau structuredKind "gym" — array 2-4 objek {"name","targetSets","targetReps","targetLoadKg"} mendeskripsikan rencana latihan konkret hari ini secara MULTI-GERAKAN, bukan cuma satu gerakan tunggal (mis. quest "kuatkan kaki: squat dan calf raise" → [{"name":"Squat","targetSets":3,"targetReps":10,"targetLoadKg":null},{"name":"Calf Raise","targetSets":3,"targetReps":12,"targetLoadKg":null}]); "targetLoadKg" diisi angka wajar kalau ada alat/beban (hasWeight true), null kalau bodyweight murni. null kalau bukan gym. Untuk recovery: "metricType" harus "recovery", "target" SELALU null (tidak ada satu angka tunggal buat dikejar — user isi 4 field sekaligus: durasi tidur, asupan air, jumlah makan berprotein, level nyeri), "activityType"/"hasWeight" null. Kalau angka target yang wajar/spesifik tidak bisa disimpulkan dari quest-nya, "target" boleh null (bukan mengarang angka). "practiceTestSchema" hanya diisi (bukan null) kalau completionType "practice-test" — dan HANYA field yang quest-nya sendiri SECARA EKSPLISIT sudah tentukan: quest "Tembus Blind Spot Listening" → {"kind":"listening","track":null} (track belum disebut, biarkan null supaya user tetap ditanya track-nya), quest yang eksplisit Academic Reading → {"kind":"reading","track":"academic"}, quest latihan generik tanpa arah spesifik → {"kind":null,"track":null}. JANGAN PERNAH mengarang kind/track yang tidak disebut jelas di title/description quest-nya — null berarti user ditanya seperti biasa, itu perilaku yang benar untuk quest generik. Kalau ctx.recentDays ada reflection.structuredData dari quest fisik sebelumnya, pakai sebagai BASELINE PROGRESIF di description/why (mis. "minggu lalu push-up 15, sekarang coba 18") — angka nyata mereka, bukan karangan. Kalau ctx.recentDays ada reflection.shortfallReason (Task 7d — alasan kenapa evidence sebelumnya jauh di bawah Milestone, mis. "Cuaca", "Cedera") itu CONTEXT, bukan pola stamina — JANGAN anggap itu tanda mereka "tidak sanggup", itu cuma faktor sekali kejadian, jangan turunkan target/intensitas cuma karena itu (beda dari ctx.kondisiStatus yang memang menandakan kondisi masih berlangsung). "statFocus" mengikuti area yang paling tersentuh instruksi hari ini${ctx.activeGoal ? " (secara alami biasanya area goal aktifnya)" : ""}. Jika ctx.recentDays kosong, chapterNumber mulai dari 1. Jika ctx.recentDays ada isinya, pertahankan chapterNumber/chapterTitle yang sama seperti ctx.chapterNumber/ctx.chapterTitle kecuali ada pergeseran besar. Untuk "pathwayNoun": jika ctx.pathway ada isinya dan ctx.pathwayNoun bernilai null, turunkan SATU kata benda peran dari pathway itu (mis. pathway Specialist dengan konteks "Sales" → "Closer", pathway "Architect" → "Architect"); kalau ctx.pathwayNoun sudah terisi, kembalikan nilai yang sama persis (jangan diganti-ganti tiap hari). Kalau ctx.pathway kosong, pathwayNoun harus null.`;
    const result = await callClaude(user);
    if (!result?.quest?.title) throw new Error("bad shape");
    normalizeMultiDomainQuest(result);
    normalizeCompletionType(result.quest);
    normalizeEvidenceSchema(result.quest);
    normalizePracticeTestSchema(result.quest);
    // Chain before videoQuiz: normalizeVideoQuizSchema's chain-has-vq-step
    // check must see the CLEANED chain (or the downgrade to job-match).
    normalizeLaboraChain(result.quest, ctx);
    normalizeVideoQuizSchema(result.quest);
    normalizeProgressiveSchema(result.quest);
    normalizeMovementFields(result.quest);
    normalizePlannedExercises(result.quest);
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

const SIDE_QUEST_FALLBACKS = [
  { title: "Regangkan badan 5 menit", description: "Berdiri, regangkan leher/bahu/punggung selama 5 menit. Tidak perlu sempurna, cuma gerak.", statFocus: "body", why: "Bonus kecil, bukan pengganti quest utamamu." },
  { title: "Tulis satu hal yang kamu syukuri", description: "Satu kalimat saja — hal kecil apa pun hari ini yang terasa baik.", statFocus: "emotional", why: "Bonus kecil, bukan pengganti quest utamamu." },
];

// Task 11c (Side Quest, real feature): fills empty carousel slots (3 minus
// active goal count) with an OPTIONAL bonus quest not tied to any specific
// goal - per Eleva_PRD.pdf section 16's explicit clarification this is a
// label/placement on the SAME Main Quest generation mechanism, not a new
// quest type, so it deliberately reuses MENTOR_SYSTEM/callClaude rather
// than inventing a parallel system. Kept intentionally lighter than
// generateQuest: no WOOP/Goal-vs-Pathway framing (nothing to anchor it to),
// always reflective (a bonus is low-stakes by design, never structured-
// physical/practice-test/job-match-analysis), no chapter/pathwayNoun/
// observed fields since it never touches chapter state.
async function generateSideQuest(ctx) {
  if (!hasKey()) return fallbackSideQuest();
  try {
    const user = `Konteks pengguna (JSON):\n${JSON.stringify(ctx)}\n\nTugas: buatkan SATU Side Quest opsional untuk pengguna ini - bonus kecil yang TIDAK terikat ke goal manapun mereka (mis. stretching ringan, refleksi bebas singkat, satu tindakan sosial kecil), rendah tekanan, bisa diselesaikan dalam hitungan menit. Balas JSON dengan bentuk persis:\n{"quest": {"title": string, "description": string, "statFocus": one of [body,growth,livelihood,emotional,social,purpose,autonomy], "why": string}}\n\nAturan: description maksimal 1-2 kalimat, benar-benar opsional/santai (bukan versi mini dari Primary Quest mereka), why singkat menjelaskan kenapa ini bonus yang layak dicoba. Jangan menyinggung goal spesifik mereka - ini murni tambahan, bukan turunan dari ctx.goals.`;
    const result = await callClaude(user);
    if (!result?.quest?.title) throw new Error("bad shape");
    return { quest: { mode: "quest", completionType: "reflective", evidenceSchema: null, ...result.quest } };
  } catch (e) {
    console.error("generateSideQuest failed, using fallback:", e.message);
    return fallbackSideQuest();
  }
}
function fallbackSideQuest() {
  const q = SIDE_QUEST_FALLBACKS[Math.floor(Math.random() * SIDE_QUEST_FALLBACKS.length)];
  return { quest: { mode: "quest", completionType: "reflective", evidenceSchema: null, ...q } };
}

async function processReflection(ctx) {
  if (!hasKey()) return fallbackReflection();
  try {
    // Task 7 (specificity gate) / Task 7b (structured path) / Task 9
    // (practice-test): three evaluation modes, chosen by which ctx field is
    // present. All feed the same response shape - the route still hard-gates
    // deltas independently where relevant (defense in depth), this prompt is
    // the semantic layer on top.
    const evaluationRules = ctx.laboraChainResult
      ? `Quest hari ini bertipe LABORA CHAIN: satu quest berisi ${ctx.laboraChainResult.length} langkah LABORA berurutan yang SEMUANYA sudah tuntas hari ini — ${ctx.laboraChainResult.map((s) => `${s.feature}: ${s.headline}`).join("; ")}. Semua hasil di atas bukti OBJEKTIF (dinilai/dihitung kode, bukan olehmu), jadi statDeltas WAJIB diisi wajar untuk langkah-langkah yang selesai (menuntaskan beberapa langkah nyata dalam satu hari adalah evidence kuat). Langkah berstatus "skipped" (submit dilewati karena job-match belum lolos) BUKAN kegagalan — jangan disinggung sebagai kegagalan, cukup arahkan fokus berikutnya ke gap-nya. mentorReply: sebut hasil TIAP langkah secara spesifik (skor video quest, matchScore/qualified job match, lamaran yang tercatat) — jangan pujian generik.`
      : ctx.multiDomainResult
      ? `Quest hari ini bertipe MULTI-DOMAIN (Quest Hub — Recovery + Nutrition, kedua area harus lengkap sebelum quest ini resolve, dikerjakan urutan bebas): status akhirnya "${ctx.multiDomainResult.status}" — Recovery ${ctx.multiDomainResult.featureState.RECOVERY}, Nutrition ${ctx.multiDomainResult.featureState.NUTRITION}. Kedua area COMPLETE lewat field yang BENAR-BENAR diisi user (bukti, bukan checklist kosong), sudah divalidasi kode sebelum sampai ke kamu. statDeltas WAJIB diisi wajar HANYA untuk stat "body" — primaryFeature quest ini RECOVERY, jadi growth SEMUA area (termasuk Nutrition) kredit ke stat itu SAJA, JANGAN split/tambahkan ke stat lain meskipun Nutrition-nya juga tersentuh, itu double-counting yang harus dihindari. mentorReply: sebut data konkret dari KEDUA area (mis. tidur/energi/soreness/jenis recovery session dari Recovery, protein/hidrasi/meals dari Nutrition) — jangan cuma bahas satu area dan abaikan yang lain.`
      : ctx.nutritionResult
      ? `Quest hari ini bertipe NUTRITION (PROGRESSIVE - dievaluasi otomatis oleh kode, bukan submit tunggal): status akhirnya "${ctx.nutritionResult.status}" — ${ctx.nutritionResult.completedContributions}/${ctx.nutritionResult.requiredContributions} makan tercatat (evidenceComplete=${ctx.nutritionResult.evidenceComplete}), ${ctx.nutritionResult.primaryMetric} ${ctx.nutritionResult.currentValue}/${ctx.nutritionResult.targetValue} (targetMet=${ctx.nutritionResult.targetMet}) — kedua angka ini bukti OBJEKTIF dari catatan makan sungguhan, dihitung kode, bukan klaim self-report. statDeltas: WAJIB diisi wajar kalau evidenceComplete true (mencatat SEMUA makan yang diminta sudah bukti keterlibatan nyata, TERLEPAS dari targetMet — jangan menahan growth cuma karena target metrik belum tercapai, itu evidence yang tetap sah, compliance dan pencapaian target adalah dua hal terpisah); KOSONGKAN statDeltas kalau evidenceComplete false (tidak cukup makan tercatat = tidak cukup evidence, terlepas seberapa dekat currentValue ke target). mentorReply: sebut progres nyatanya secara spesifik (jumlah makan tercatat, seberapa dekat ${ctx.nutritionResult.primaryMetric}-nya ke target) — jujur kalau targetMet false, tapi tetap hangat dan akui compliance-nya kalau evidenceComplete true.`
      : ctx.videoQuizResult
      ? `Quest hari ini bertipe VIDEO QUEST (video-quiz): pengguna memilih sendiri satu video YouTube untuk topik "${ctx.videoQuizResult.topic}" ("${ctx.videoQuizResult.videoTitle}"), video itu DIKUNCI saat assessment dimulai, lalu mereka LULUS assessment 15 soal HOTS yang dibuat dari transkrip video itu: skor ${ctx.videoQuizResult.score}/${ctx.videoQuizResult.total} (ambang lulus ${ctx.videoQuizResult.passThreshold}, attempt ke-${ctx.videoQuizResult.attempt}) — ini bukti OBJEKTIF (dinilai otomatis benar/salah oleh kode, bukan olehmu), jadi statDeltas WAJIB diisi wajar (lulus assessment terkunci-sumber adalah evidence belajar yang kuat; catatan: yang GAGAL tidak pernah sampai ke kamu, quest-nya tetap terbuka untuk attempt ulang). mentorReply: sebut topik dan skornya secara spesifik, plus SATU konsep kuat (${(ctx.videoQuizResult.strongConcepts || []).join(", ") || "-"}) dan SATU konsep yang tadinya lemah (${(ctx.videoQuizResult.weakConcepts || []).join(", ") || "-"}) secara konkret — jangan pujian generik.`
      : ctx.practiceTestResult
      ? `Quest hari ini bertipe PRACTICE TEST: pengguna baru menyelesaikan sesi latihan ${ctx.practiceTestResult.kind === "listening" ? "Listening" : "Reading"} (${ctx.practiceTestResult.track === "general" ? "General Training" : "Academic"}) dengan skor ${ctx.practiceTestResult.score}/${ctx.practiceTestResult.total} — ini bukti OBJEKTIF (dinilai otomatis benar/salah oleh kode, bukan olehmu), lebih kuat dari growth-gate kespesifikan Task 7, jadi statDeltas WAJIB diisi wajar berapa pun skornya (menyelesaikan tesnya sendiri sudah bukti keterlibatan nyata — jangan menahan growth cuma karena skornya rendah, itu tetap evidence sah). mentorReply: komentari skornya secara spesifik dan hangat (jangan cuma "kerja bagus" generik), dan kalau ctx.recentDays punya practiceTestResult sebelumnya, sebut progresnya secara konkret.`
      : ctx.structuredData
      ? `Quest hari ini bertipe TERSTRUKTUR-FISIK: pengguna mengisi ctx.structuredData (field angka/pilihan yang kelengkapan & kewajarannya SUDAH divalidasi kode sebelum sampai ke kamu — jangan menolak karena format). Nilai statDeltas dari data terstruktur itu (plus ctx.reflectionText kalau diisi — itu OPSIONAL, ketiadaannya BUKAN alasan menolak growth). mentorReply: komentari angkanya secara spesifik (durasi/jarak/titik mulai berat — Ringan/Cukup/Berat, atau set×rep×beban), dan kalau ctx.recentDays punya structuredData sebelumnya, sebut baseline progresnya secara konkret (mis. "minggu lalu 15 repetisi, sekarang 18").`
      : `GROWTH-GATE KESPESIFIKAN (WAJIB, Task 7 - ini alasan gate panjang-kata saja tidak cukup): bandingkan ctx.reflectionText dengan ctx.quest.description/title. KALAU deskripsi quest hari ini secara eksplisit meminta detail konkret (angka, ukuran, jumlah, durasi, nama orang/tempat, observasi spesifik - mis. "catat repetisi, jarak, dan titik menyerah"), maka refleksi yang TIDAK menyebut SATU PUN detail yang diminta itu WAJIB ditolak growth-nya (statDeltas = {} kosong), TIDAK PEDULI seberapa panjang teksnya - refleksi generik panjang ("udah olahraga tadi, capek tapi enak, seneng bisa konsisten") adalah persis celah Goodhart yang gate ini tutup, dan mentorReply-nya menyebutkan dengan hangat detail spesifik apa yang kurang supaya besok bisa diterima. Sebaliknya, refleksi SINGKAT tapi menyebut detail spesifik yang diminta = SAH, beri growth yang pantas. KALAU quest hari ini bertipe kualitatif/emosional dan deskripsinya TIDAK meminta detail terukur apa pun, JANGAN memaksakan standar angka - refleksi jujur yang wajar dan menyentuh isi quest-nya tetap layak growth (gate ini soal kespesifikan YANG DIMINTA, bukan soal semua refleksi harus berisi angka).`;
    const user = `Konteks (JSON):\n${JSON.stringify(ctx)}\n\nPengguna baru saja merefleksikan quest hari ini. Balas JSON dengan bentuk persis:\n{"statDeltas": {"<stat>": number}, "mentorReply": string, "interpretation": {"observed": string, "hypothesis": string, "decision": string}, "safetyNote": string|null, "chapterAdvance": boolean, "newChapterTitle": string|null, "newChapterNarrative": string|null}\n\n${evaluationRules}\n\nAturan umum: statDeltas hanya untuk stat yang benar-benar tersentuh, nilai integer 1-5, JANGAN beri nilai jika kosong/dangkal — TAPI ini murni angka internal buat dipakai kode, JANGAN disebut/dirujuk sebagai skor eksplisit di teks manapun (mentorReply/interpretation) karena UI tidak lagi menampilkan poin arbitrer, cukup penanda "evidence tercatat". mentorReply singkat (1-3 kalimat), merespons ISI konkret mereka secara spesifik. "interpretation" (Task 7c/7d, "Eleva Response") — pasangan simetris dari "Eleva Observed" (yang bicara soal KEMARIN sebelum quest dimulai; ini bicara soal HARI INI setelah evidence masuk) — WAJIB berstruktur 3 lapis, JANGAN pernyataan pasti tunggal: "observed" = 1 kalimat FAKTA MENTAH dari data yang baru disubmit (angka/isi apa adanya, tanpa tafsir, mis. "3.24 km dalam 20:05, km pertama 5:40/km lalu melambat ke 6:30/km"); "hypothesis" = 1 kalimat interpretasi TENTATIF yang di-hedge eksplisit dengan kata seperti "mungkin"/"bisa jadi"/"kelihatannya" (mis. "mungkin mulai terlalu cepat lalu kehabisan tenaga") — JANGAN yakin berlebih soal diagnosis dari satu data point; "decision" = 1 kalimat perubahan/fokus konkret untuk berikutnya, BOLEH tegas walau hypothesis-nya masih tentatif (Eleva boleh yakin soal TINDAKAN, tidak boleh yakin berlebih soal DIAGNOSIS). "safetyNote": WAJIB diisi (bukan null) kalau ctx.reflectionText/ctx.structuredData/ctx.status menyebut sinyal nyeri berat, cedera, kram signifikan, pincang, atau sejenisnya — satu kalimat pengingat wajar (BUKAN diagnosis, BUKAN alarm berlebihan): jangan dipaksa lanjut kalau masih terasa, dan pertimbangkan periksa ke profesional kalau gejalanya berat/menetap. null kalau tidak ada sinyal seperti itu (jangan mengarang-ngarang, kebanyakan hari ini harusnya null). chapterAdvance hanya true jika ada pergeseran pola hidup yang nyata dan signifikan. "newChapterNarrative" WAJIB diisi (2-4 kalimat, paragraf naratif Bahasa Indonesia) HANYA kalau chapterAdvance true - ini masuk ke layar "Kisahmu" (autobiografi Chapter demi Chapter), jadi ceritakan kenapa Chapter ini bergeser dari sebelumnya (pola nyata apa yang berubah), bukan cuma mengulang newChapterTitle. null kalau chapterAdvance false.`;
    const result = await callClaude(user);
    // Task 7d: interpretation is now a 3-layer object, not a bare string -
    // malformed shape patches to a neutral fallback string instead of
    // discarding the whole reflection result, same two-tier pattern used
    // elsewhere in this file.
    const interp = result.interpretation;
    if (!interp || typeof interp.observed !== "string" || typeof interp.hypothesis !== "string" || typeof interp.decision !== "string") {
      result.interpretation = fallbackReflection().interpretation;
    }
    if (typeof result.safetyNote !== "string") result.safetyNote = null;
    return result;
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

// Task 14 point 7: once a Livelihood goal's "10 Qualified Applications"
// milestone is reached, the next milestone is a FUNNEL metric, not another
// count - two genuinely different directions (response rate vs interview
// conversion), same "2 AI directions + manual override" shape as
// cardio/gym. ctx.kind is "qualified-applications" here (the milestone that
// was just reached), but the produced options are shaped for the new
// "livelihood-funnel" kind (targets.js) - a deliberate kind change on
// milestone advancement, same as how reaching one cardio target doesn't
// have to mean the next one is still cardio-shaped in principle, it just
// always has been because canTarget only ever offers cardio/gym so far.
function fallbackLivelihoodFunnelOptions() {
  return {
    optionA: {
      label: "Response Rate 50%",
      approach: "Fokus kualitas tiap lamaran (CV & cover letter ditarget ulang per lowongan) supaya lebih banyak dibalas recruiter, bukan cuma menambah jumlah kirim.",
      metrics: { metricLabel: "Response Rate", targetValue: 50, currentValue: 0 },
    },
    optionB: {
      label: "Convert Interview jadi Offer x2",
      approach: "Fokus performa interview & negosiasi dari lamaran yang sudah direspons, bukan menambah lamaran baru.",
      metrics: { metricLabel: "Interview → Offer", targetValue: 2, currentValue: 0 },
    },
  };
}

async function generateLivelihoodFunnelOptions(ctx) {
  if (!hasKey()) return fallbackLivelihoodFunnelOptions();
  try {
    const user = `Konteks (JSON):\n${JSON.stringify(ctx)}\n\nPengguna baru saja mencapai milestone "10 Qualified Applications" untuk goal Livelihood-nya ("${ctx.goalText}"). Buatkan 2 opsi "milestone berikutnya" - dua ARAH FUNNEL job-search yang BENAR-BENAR BEDA (bukan lanjutan "apply lebih banyak lagi"), fokus ke TAHAP SETELAH melamar (respons dari recruiter, performa interview, konversi jadi offer). Balas JSON persis:\n{"optionA": {"label": string, "approach": string, "metrics": {"metricLabel": string, "targetValue": number, "currentValue": 0}}, "optionB": {sama seperti optionA}}\n\nContoh arah berbeda: opsi A soal tingkat respons/balasan recruiter (mis. "Response Rate", target dalam persen), opsi B soal konversi interview jadi offer (mis. "Interview → Offer", target dalam jumlah offer). "label" singkat format angka (mis. "Response Rate 50%" atau "Interview → Offer x2"). "approach" 1 kalimat pendekatan konkret. "metricLabel" nama metrik singkat, "targetValue" angka target yang realistis, "currentValue" SELALU 0 (baru mulai dihitung dari milestone ini).`;
    const result = await callClaude(user);
    const a = targets.cleanTargetMetrics("livelihood-funnel", result?.optionA?.metrics);
    const b = targets.cleanTargetMetrics("livelihood-funnel", result?.optionB?.metrics);
    if (!a || !b || !result.optionA.label || !result.optionB.label) throw new Error("bad shape");
    return {
      optionA: { label: String(result.optionA.label).slice(0, 80), approach: String(result.optionA.approach || "").slice(0, 300), metrics: a },
      optionB: { label: String(result.optionB.label).slice(0, 80), approach: String(result.optionB.approach || "").slice(0, 300), metrics: b },
    };
  } catch (e) {
    console.error("generateLivelihoodFunnelOptions failed, using fallback:", e.message);
    return fallbackLivelihoodFunnelOptions();
  }
}

function fallbackTargetOptions(ctx) {
  const { kind, actual } = ctx;
  if (kind === "qualified-applications") return fallbackLivelihoodFunnelOptions();
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
  // Task 14: Livelihood's "milestone reached" case is shaped completely
  // differently (funnel metrics, not a fresh daily `actual` to progress
  // from) - dispatched to its own generator/prompt rather than shoehorned
  // into the cardio/gym prompt below.
  if (ctx.kind === "qualified-applications") return generateLivelihoodFunnelOptions(ctx);
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
// Task 13: expanded to a full 20-question sprint shape (varied types incl.
// matching, category tag per question) so keyless mode exercises the same
// band/breakdown pipeline the AI path does - a 3-question fallback would
// fail the new proportional minimum and starve the assessment of evidence.
function fallbackPracticeTest(ctx) {
  const drill = ctx.drill || null;
  let payload;
  if (ctx.kind === "listening") {
    payload = {
      script: `Welcome to the city community centre. Let me walk you through what we offer this season. The centre opens at eight in the morning and closes at nine in the evening from Monday to Friday. On Saturdays we close at six, and on Sundays we are closed entirely. The swimming pool is on the ground floor, right past the reception desk. The gym and the weights room are on the first floor, and the art studio is on the second floor, next to the small library corner. Classes need to be booked in advance, either at reception or through our website, and a booking is only confirmed once you receive an email. Pool entry costs four dollars for adults and two dollars for children, but gym access requires a monthly membership, which is thirty dollars. Members also get a ten percent discount in the cafe. If you lose your membership card, a replacement costs five dollars and takes about a week to arrive. Finally, please remember that lockers require a one dollar coin, which is returned to you when you bring the key back.`,
      questions: [
        { id: "q1", type: "mc", text: "What time does the centre close on weekdays?", options: ["Six", "Eight", "Nine", "Seven"], correctAnswer: "Nine", explanation: "Skrip menyebut tutup jam sembilan malam Senin-Jumat.", category: "detail retrieval" },
        { id: "q2", type: "mc", text: "How much is pool entry for children?", options: ["One dollar", "Two dollars", "Four dollars", "Free"], correctAnswer: "Two dollars", explanation: "Anak-anak membayar dua dolar.", category: "detail retrieval" },
        { id: "q3", type: "mc", text: "How is a class booking confirmed?", options: ["By phone call", "By email", "At the desk", "By text message"], correctAnswer: "By email", explanation: "Booking terkonfirmasi lewat email.", category: "detail retrieval" },
        { id: "q4", type: "mc", text: "How much does a replacement membership card cost?", options: ["One dollar", "Five dollars", "Ten dollars", "Thirty dollars"], correctAnswer: "Five dollars", explanation: "Kartu pengganti lima dolar.", category: "detail retrieval" },
        { id: "q5", type: "mc", text: "What do members get in the cafe?", options: ["Free coffee", "A ten percent discount", "A free meal", "Nothing"], correctAnswer: "A ten percent discount", explanation: "Anggota dapat diskon 10% di kafe.", category: "detail retrieval" },
        { id: "q6", type: "mc", text: "What is needed to use a locker?", options: ["A membership card", "A one dollar coin", "A booking", "A key deposit form"], correctAnswer: "A one dollar coin", explanation: "Loker butuh koin satu dolar yang dikembalikan.", category: "detail retrieval" },
        { id: "q7", type: "tf", text: "The centre is open on Sundays.", options: ["True", "False", "Not Given"], correctAnswer: "False", explanation: "Skrip bilang Minggu tutup total.", category: "true/false/not given" },
        { id: "q8", type: "tf", text: "Gym access is included in the pool ticket.", options: ["True", "False", "Not Given"], correctAnswer: "False", explanation: "Gym butuh keanggotaan bulanan terpisah.", category: "true/false/not given" },
        { id: "q9", type: "tf", text: "The centre has more than one swimming pool.", options: ["True", "False", "Not Given"], correctAnswer: "Not Given", explanation: "Jumlah kolam tidak pernah disebut.", category: "true/false/not given" },
        { id: "q10", type: "tf", text: "A replacement card arrives in about a week.", options: ["True", "False", "Not Given"], correctAnswer: "True", explanation: "Skrip menyebut sekitar seminggu.", category: "true/false/not given" },
        { id: "q11", type: "tf", text: "Classes can be booked through the website.", options: ["True", "False", "Not Given"], correctAnswer: "True", explanation: "Booking bisa di resepsionis atau website.", category: "true/false/not given" },
        { id: "q12", type: "matching", text: "Which floor is the swimming pool on?", options: ["Ground floor", "First floor", "Second floor"], correctAnswer: "Ground floor", explanation: "Kolam renang di lantai dasar dekat resepsionis.", category: "matching features" },
        { id: "q13", type: "matching", text: "Which floor is the gym on?", options: ["Ground floor", "First floor", "Second floor"], correctAnswer: "First floor", explanation: "Gym dan ruang beban di lantai satu.", category: "matching features" },
        { id: "q14", type: "matching", text: "Which floor is the art studio on?", options: ["Ground floor", "First floor", "Second floor"], correctAnswer: "Second floor", explanation: "Studio seni di lantai dua.", category: "matching features" },
        { id: "q15", type: "matching", text: "Which floor is the library corner on?", options: ["Ground floor", "First floor", "Second floor"], correctAnswer: "Second floor", explanation: "Pojok perpustakaan bersebelahan dengan studio seni di lantai dua.", category: "matching features" },
        { id: "q16", type: "fill", text: "On Saturdays the centre closes at ____.", correctAnswer: "six", explanation: "Sabtu tutup jam enam.", category: "completion" },
        { id: "q17", type: "fill", text: "A monthly gym membership costs ____ dollars.", correctAnswer: "thirty", explanation: "Keanggotaan gym tiga puluh dolar per bulan.", category: "completion" },
        { id: "q18", type: "fill", text: "Pool entry for adults costs ____ dollars.", correctAnswer: "four", explanation: "Dewasa membayar empat dolar.", category: "completion" },
        { id: "q19", type: "fill", text: "The locker coin is returned when you bring back the ____.", correctAnswer: "key", explanation: "Koin kembali saat kunci dikembalikan.", category: "completion" },
        { id: "q20", type: "fill", text: "The centre opens at ____ in the morning on weekdays.", correctAnswer: "eight", explanation: "Buka jam delapan pagi Senin-Jumat.", category: "completion" },
      ],
    };
  } else {
    // Shallow-clone the module-level fixture so drill mode below can swap
    // the questions array without corrupting the shared constant.
    payload = { ...READING_FALLBACK_V2, questions: [...READING_FALLBACK_V2.questions] };
  }
  // Drill mode: focus on the requested category when the static set has it,
  // padding with other questions up to the drill size - honest about being
  // generic (keyless), but shape-compatible with the real drill pipeline.
  if (drill) {
    const focused = payload.questions.filter((q) => q.category === drill.category);
    const rest = payload.questions.filter((q) => q.category !== drill.category);
    payload.questions = [...focused, ...rest].slice(0, practiceTest.DRILL_QUESTIONS);
    // A 12-question drill no longer matches the 4x5 sprint blocks - drop
    // them and let the client derive its own grouping.
    delete payload.blocks;
  }
  return payload;
}

// Reading Half Diagnostic (round 42): the reading fallback is a v2 payload -
// {title, paragraphs A-D} passage + the exact 5/5/5/5 block structure the
// real generator produces, so keyless mode exercises the same shell/grading
// path. Deliberately shorter than a real generated passage (honest keyless
// artifact - validated with minPassageWords: 0). Built and validated ONCE at
// module load, throwing on failure, same fail-fast guarantee as
// listeningDiagnostic.js: a broken fixture edit can never deploy silently.
const READING_FALLBACK_V2 = (() => {
  const rawV2 = {
      passage: {
        title: "Working from Home",
        paragraphs: [
          { label: "A", text: "Working from home has become common for many people since the early 2020s. It offers flexibility, since employees can arrange their own schedule around personal commitments, and it removes the daily commute, which surveys suggest saves the average worker close to an hour a day." },
          { label: "B", text: "However, the arrangement has clear drawbacks. Some workers report feeling isolated without daily contact with colleagues, and younger employees in particular say they miss the informal learning that happens in a shared office. A few studies also link long-term remote work with weaker professional networks." },
          { label: "C", text: "Companies have responded in practical ways. Many have introduced regular video meetings, occasional in-person gatherings, and shared online documents to keep teams connected. Others rotate teams through the office on fixed days, an approach usually called hybrid working." },
          { label: "D", text: "The long-term picture is still unsettled. Economists disagree about the effect of remote work on productivity, and governments are only beginning to study what widespread home working means for city centres, public transport, and the housing market." },
        ],
      },
      questions: [
        { id: "q1", text: "According to the passage, roughly how much time does removing the commute save per day?", options: ["Half an hour", "Close to an hour", "Two hours", "It is not mentioned"], correctAnswer: "Close to an hour", explanation: "Paragraf A menyebut hemat mendekati satu jam per hari." },
        { id: "q2", text: "Who especially misses informal learning in the office?", options: ["Managers", "Younger employees", "Economists", "Government workers"], correctAnswer: "Younger employees", explanation: "Paragraf B menyebut karyawan muda." },
        { id: "q3", text: "What is rotating teams through the office on fixed days called?", options: ["Flexible working", "Hybrid working", "Remote working", "Shift working"], correctAnswer: "Hybrid working", explanation: "Paragraf C menamainya hybrid working." },
        { id: "q4", text: "Which group disagrees about remote work's effect on productivity?", options: ["Employees", "Economists", "Companies", "City councils"], correctAnswer: "Economists", explanation: "Paragraf D menyebut ekonom belum sepakat." },
        { id: "q5", text: "What kind of professional effect do a few studies link to long-term remote work?", options: ["Stronger networks", "Weaker networks", "Higher salaries", "Faster promotion"], correctAnswer: "Weaker networks", explanation: "Paragraf B menyebut jejaring profesional melemah." },
        { id: "q6", text: "All workers prefer working from home, according to the passage.", correctAnswer: "False", explanation: "Sebagian pekerja melaporkan merasa terisolasi." },
        { id: "q7", text: "The passage says remote work became widespread for many people in the early 2020s.", correctAnswer: "True", explanation: "Paragraf A menyebut sejak awal 2020-an." },
        { id: "q8", text: "The passage states that most companies have banned remote work.", correctAnswer: "False", explanation: "Yang disebut justru cara perusahaan beradaptasi." },
        { id: "q9", text: "The passage mentions how remote work affects school schedules.", correctAnswer: "Not Given", explanation: "Sekolah tidak pernah disinggung." },
        { id: "q10", text: "Governments have finished studying the effects of home working on cities.", correctAnswer: "False", explanation: "Paragraf D bilang baru mulai mempelajari." },
        { id: "q11", text: "a mention of how much commuting time remote workers save each day", correctAnswer: "A", explanation: "Paragraf A menyebut penghematan hampir satu jam per hari." },
        { id: "q12", text: "examples of practical measures companies use to keep teams connected", correctAnswer: "C", explanation: "Paragraf C berisi rapat video, pertemuan tatap muka, dan dokumen bersama." },
        { id: "q13", text: "a claim linking long-term remote work with weaker professional networks", correctAnswer: "B", explanation: "Paragraf B menyebut beberapa studi soal jejaring yang melemah." },
        { id: "q14", text: "a reference to disagreement among experts about productivity", correctAnswer: "D", explanation: "Paragraf D menyebut ekonom belum sepakat." },
        { id: "q15", text: "a description of what younger employees feel they are missing", correctAnswer: "B", explanation: "Paragraf B menyebut pembelajaran informal yang hilang — satu paragraf boleh menjawab lebih dari satu soal." },
        { id: "q16", text: "Companies introduced regular video ____ to keep teams connected.", correctAnswer: "meetings", explanation: "Paragraf C menyebut rapat video rutin." },
        { id: "q17", text: "Remote work removes the daily ____.", correctAnswer: "commute", explanation: "Paragraf A menyebut perjalanan harian hilang." },
        { id: "q18", text: "Some workers feel ____ without daily contact with colleagues.", correctAnswer: "isolated", explanation: "Paragraf B menyebut isolasi." },
        { id: "q19", text: "Teams also stay connected through shared online ____.", correctAnswer: "documents", explanation: "Paragraf C menyebut dokumen online bersama." },
        { id: "q20", text: "Governments are studying what home working means for public ____ and housing.", correctAnswer: "transport", explanation: "Paragraf D menyebut transportasi publik." },
      ],
    };
  const cleaned = practiceTest.cleanReadingSprintPayload(rawV2, { minPassageWords: 0 });
  if (!cleaned) throw new Error("READING_FALLBACK_V2 failed cleanReadingSprintPayload - fix the fixture before deploying");
  return cleaned;
})();

async function generatePracticeTest(ctx) {
  if (!hasKey()) return fallbackPracticeTest(ctx);
  try {
    const bodyKey = ctx.kind === "listening" ? "script" : "passage";
    const drill = ctx.drill || null;
    const historyNote = ctx.history && ctx.history.length
      ? ` Materi sesi-sesi sebelumnya (JANGAN ulang topik/kontennya persis, buat yang baru): ${ctx.history.map((h) => `${h.testKind}/${h.track} skor ${h.score}/${h.total}`).join("; ")}.`
      : "";
    // Task 13: a full sprint is a 20-question diagnostic with an explicit
    // difficulty ramp and varied types; a drill is a shorter 12-question
    // set focused on ONE weak category from the previous attempt.
    const sizeGuide = drill
      ? `Ini DRILL TERFOKUS, bukan sprint diagnostik penuh: TEPAT ${practiceTest.DRILL_QUESTIONS} soal, SEMUANYA dari kategori "${drill.category}" (kategori paling lemah pengguna di attempt sebelumnya). Kesulitan menyesuaikan level ${ctx.level}, boleh sedikit lebih menantang dari biasanya karena fokusnya sempit.`
      : `TEPAT ${practiceTest.SPRINT_QUESTIONS} soal dengan kesulitan TERDISTRIBUSI eksplisit: soal 1-7 accessible (pemanasan, jawaban cukup jelas dari materi), soal 8-14 moderate (butuh inferensi ringan), soal 15-20 harder (parafrase/jebakan halus/inferensi lebih dalam) — BUKAN 20 soal yang secara substansi setara. Panjang ${bodyKey === "script" ? "skrip" : "bacaan"} menyesuaikan level ${ctx.level}: level 1-2 lebih pendek/sederhana, level 3+ lebih panjang dan kompleks.`;
    const user = `Konteks pengguna (JSON):\n${JSON.stringify({ goalText: ctx.goalText, pathway: ctx.pathway, level: ctx.level })}\n\nTugas: buatkan SATU sesi latihan "${ctx.kind === "listening" ? "Listening" : "Reading"}" gaya ${ctx.track === "general" ? "General Training" : "Academic"} format IELTS, untuk goal belajar terukur pengguna ini${ctx.goalText ? ` ("${ctx.goalText}")` : ""} — bentuk soal ini GENERIK untuk goal belajar apa pun (IELTS cuma contoh format, JANGAN dihardcode ke konten IELTS spesifik). ${sizeGuide}${historyNote}\n\nBalas JSON dengan bentuk PERSIS:\n{"${bodyKey}": string, "questions": [{"id": string, "type": "mc"|"tf"|"fill"|"matching", "text": string, "options": [string]|null, "correctAnswer": string, "explanation": string, "category": string}]}\n\nAturan: "${bodyKey}" berisi ${ctx.kind === "listening" ? "skrip percakapan/monolog natural dalam Bahasa Inggris (ini akan DIBACAKAN lewat text-to-speech browser, jadi tulis kalimat yang enak dibacakan keras, bukan format daftar/bullet)" : "satu bacaan Bahasa Inggris gaya IELTS — untuk soal matching headings, bagi bacaan jadi paragraf berlabel (Paragraph A, Paragraph B, dst)"}, ${ctx.track === "general" ? "gaya umum sehari-hari (surat, iklan, artikel, percakapan/kuliah non-akademik)" : "gaya akademik"}. ${drill ? "" : `WAJIB campur tipe soal dalam satu sesi (jangan satu tipe berulang semua): `}"mc" (pilihan ganda, WAJIB isi "options" 3-4 pilihan), "tf" (True/False/Not Given, "options" WAJIB persis ["True","False","Not Given"]), "fill" (isian/completion singkat, "options" null, "correctAnswer" satu kata/frasa pendek), "matching" (mencocokkan heading/fitur — "options" berisi bank pilihan bersama 3-8 item, mis. daftar Paragraph A-D atau daftar fitur, "correctAnswer" persis salah satu options). "correctAnswer" WAJIB persis salah satu isi "options" untuk tipe mc/tf/matching. "category" WAJIB diisi di SETIAP soal — label kategori skill pendek lowercase yang konsisten antar soal sejenis (contoh: "detail retrieval", "true/false/not given", "matching headings", "completion", "inference") — dipakai untuk breakdown kekuatan/kelemahan per kategori, jadi soal sejenis HARUS pakai label yang sama persis. "explanation" satu kalimat pendek pembahasan (Bahasa Indonesia) kenapa itu jawabannya — WAJIB diisi untuk SEMUA soal (dipakai kalau user salah, bukan cuma yang benar). JANGAN ulang topik/konten yang sama dengan materi sebelumnya di atas kalau ada.`;
    const result = await callClaude(user);
    const cleaned = practiceTest.cleanPayload(ctx.kind, result, {
      minQuestions: drill ? practiceTest.MIN_QUESTIONS_DRILL : practiceTest.MIN_QUESTIONS_SPRINT,
    });
    if (!cleaned) throw new Error("bad shape");
    return cleaned;
  } catch (e) {
    console.error("generatePracticeTest failed, using fallback:", e.message);
    return fallbackPracticeTest(ctx);
  }
}

// Reading Half Diagnostic (round 42): generates ONE weekly 20-question
// reading sprint in the exact 4-block IELTS structure. Unlike
// generatePracticeTest this THROWS on failure instead of self-falling-back:
// the caller (the generate route) caches successful content for the whole
// week and must never cache the static fallback, so it needs to know the
// difference. Content is weekly-GLOBAL (founder decision), so:
// - no per-user level shaping (fixed mid difficulty; the level ratchet still
//   runs for history/drills but no longer shapes sprint difficulty)
// - topic dedup is global too: ctx.avoidTitles = recent weekly passage
//   titles, not the per-user history note.
async function generateReadingSprintContent(ctx) {
  if (!hasKey()) throw new Error("no API key");
  const blocksSpec = practiceTest.READING_SPRINT_BLOCKS;
  const avoidNote = ctx.avoidTitles && ctx.avoidTitles.length
    ? `\n\nTopik minggu-minggu sebelumnya (JANGAN pakai topik yang sama atau mirip): ${ctx.avoidTitles.map((t) => `"${t}"`).join(", ")}.`
    : "";
  const user = `Tugas: buatkan SATU paket "IELTS Academic Reading Half Diagnostic" - 1 bacaan + TEPAT 20 soal dalam 4 blok berurutan. Paket ini dipakai semua pengguna selama seminggu, jadi kualitas dan ketepatan format WAJIB tinggi.

Balas JSON dengan bentuk PERSIS (tanpa teks lain):
{"passage": {"title": string, "paragraphs": [{"label": "A", "text": string}, {"label": "B", "text": string}, {"label": "C", "text": string}, {"label": "D", "text": string}]}, "questions": [{"id": "q1", "text": string, "options": [string], "correctAnswer": string, "acceptableAnswers": [string], "explanation": string}]}

BACAAN:
- Gaya ${ctx.track === "general" ? "IELTS General Training (teks sehari-hari yang lebih panjang: artikel majalah/koran populer)" : "akademik IELTS Academic"}: prosa ekspositori/faktual dalam Bahasa Inggris, netral dan informatif - berisi perbandingan, sebab-akibat, dan ketidakpastian ("some researchers argue...", "the evidence remains mixed") supaya bisa dibuat soal inferensi dan Not Given. TANPA nada motivasional, TANPA bahasa kekanak-kanakan, JANGAN menyalin materi IELTS asli.
- TEPAT 4 paragraf berlabel "A"-"D", total 650-900 kata (ideal 700-850). Tiap paragraf punya fokus ide sendiri tapi saling terhubung.
- Topik: satu topik akademik netral yang menarik (sains, sejarah, teknologi, lingkungan, masyarakat, dsb).${avoidNote}

SOAL - TEPAT 20, id "q1" sampai "q20" BERURUTAN, dalam 4 blok PERSIS:
${blocksSpec.map((b, i) => `- q${i * 5 + 1}-q${i * 5 + 5}: ${b.label}`).join("\n")}
- q1-q5 (Multiple Choice): "options" WAJIB 4 pilihan teks, "correctAnswer" persis salah satunya.
- q6-q10 (True/False/Not Given): TANPA "options". "correctAnswer" persis "True", "False", atau "Not Given". Disiplin ketat: True = didukung bacaan; False = JELAS bertentangan dengan bacaan; Not Given = tidak dibahas bacaan TAPI pernyataannya masih satu topik dan menuntut pembacaan cermat - JANGAN Not Given yang topiknya jelas-jelas tidak nyambung.
- q11-q15 (Matching Information): "text" berisi deskripsi informasi ("a mention of...", "an example of...", "a reason why..."), "correctAnswer" persis "A"/"B"/"C"/"D" (paragraf yang memuat informasinya). TANPA "options". Soal harus menuntut scanning/pencocokan ide, BUKAN sekadar mengulang topik utama paragraf. Satu paragraf BOLEH jadi jawaban lebih dari satu soal, dan boleh ada paragraf yang tidak terpakai.
- q16-q20 (Sentence Completion): "text" kalimat rumpang dengan ____, "correctAnswer" kata-kata PERSIS dari bacaan, MAKSIMAL 2 kata (aturan "NO MORE THAN TWO WORDS" - divalidasi kode, jawaban 3+ kata DITOLAK). "acceptableAnswers" opsional berisi variasi wajar (mis. dengan/tanpa artikel) - juga maksimal 2 kata. TANPA "options".
- SEMUA soal WAJIB parafrase dari bacaan (sinonim, transformasi gramatikal, inferensi terkontrol, resolusi referensi) - JANGAN mengutip kalimat bacaan kata-per-kata, tapi juga jangan inferensi terlalu jauh sampai jawabannya ambigu. Tiap soal punya TEPAT SATU jawaban benar yang tidak diperdebatkan.
- Ramp kesulitan DI DALAM urutan blok: q1-q5 accessible→moderate, q6-q10 moderate, q11-q15 moderate→hard, q16-q20 hard. Jangan tiap soal mekanis lebih sulit dari sebelumnya - yang penting arah keseluruhan naik.
- "explanation" WAJIB di semua soal: satu kalimat pendek Bahasa Indonesia kenapa itu jawabannya (menyebut paragraf mana).`;

  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await callClaude(user, { maxTokens: 6000 });
      const cleaned = practiceTest.cleanReadingSprintPayload(result);
      if (cleaned) return cleaned;
      lastError = new Error("reading sprint payload failed validation");
      console.error(`generateReadingSprintContent attempt ${attempt + 1}: payload rejected by cleanReadingSprintPayload`);
    } catch (e) {
      lastError = e;
      console.error(`generateReadingSprintContent attempt ${attempt + 1} failed:`, e.message);
    }
  }
  throw lastError || new Error("reading sprint generation failed");
}

// --- Video Quest (video-quiz) ---

const videoQuiz = require("./videoQuiz");

// Keyless fallback: a generic "belajar efektif dari materi video" set that
// matches server/youtube.js's stub transcript, so keyless dev + the e2e
// suite exercise the full flow with a known answer key. Asserted through
// the strict validator at module load, same pattern as READING_FALLBACK_V2.
const VIDEO_QUIZ_FALLBACK = (() => {
  const opt = (...texts) => texts.map((text, i) => ({ id: "abcdef"[i], text }));
  const raw = { questions: [
    { style: "conceptual", concept: "prinsip dasar", prompt: "Menurut materi, apa yang paling penting dipahami SEBELUM masuk ke praktik?", options: opt("Prinsip dan definisi dasarnya", "Alat yang paling mahal", "Kecepatan pengerjaan", "Jumlah jam menonton video"), correct: ["a"], explanation: "Materi menekankan memahami definisi dan prinsip dasar sebelum praktik." },
    { style: "conceptual", concept: "prinsip dasar", prompt: "Apa tujuan utama memahami definisi sebuah konsep menurut materi?", options: opt("Supaya terlihat pintar", "Supaya tidak salah paham saat praktik", "Supaya cepat selesai", "Supaya tidak perlu dokumentasi"), correct: ["b"], explanation: "Banyak pemula salah paham karena melompati bagian definisi/tujuan." },
    { style: "conceptual", concept: "verifikasi", prompt: "Dalam materi, verifikasi hasil dilakukan pada saat kapan?", options: opt("Hanya di akhir seluruh proses", "Di setiap langkah", "Hanya saat ada error", "Sebelum mulai bekerja"), correct: ["b"], explanation: "Praktik terbaiknya memverifikasi hasil di setiap langkah." },
    { style: "scenario", concept: "verifikasi", prompt: "Kamu menemukan data yang tidak konsisten di tengah pekerjaan. Menurut materi, langkah PERTAMA yang tepat adalah?", options: opt("Menghapus data yang aneh", "Memeriksa sumber datanya", "Melanjutkan dan memperbaiki nanti", "Mengulang semua dari awal"), correct: ["b"], explanation: "Contoh skenario di materi: langkah pertama selalu memeriksa sumbernya." },
    { style: "scenario", concept: "kasus kecil", prompt: "Kamu baru mempelajari teknik baru dari video ini. Cara memulai yang sesuai materi adalah?", options: opt("Langsung terapkan ke proyek besar", "Mulai dari kasus kecil dulu", "Tunggu sampai hafal semua teori", "Minta orang lain mengerjakan"), correct: ["b"], explanation: "Materi menyarankan mulai dari kasus kecil lalu naik bertahap." },
    { style: "scenario", concept: "dokumentasi", prompt: "Setelah menyelesaikan satu tahap penting, sesuai materi kamu sebaiknya?", options: opt("Langsung lanjut tanpa catatan", "Mendokumentasikan prosesnya", "Menghapus file sementara", "Mengulang tahap itu sekali lagi"), correct: ["b"], explanation: "Dokumentasi proses adalah bagian dari praktik terbaik di materi." },
    { style: "scenario", concept: "prinsip dasar", prompt: "Teman kerjamu langsung praktik tanpa memahami prinsip dasar dan hasilnya kacau. Menurut materi, akar masalahnya adalah?", options: opt("Kurang jam terbang", "Melompat ke praktik tanpa prinsip dasar", "Alatnya kurang bagus", "Terlalu banyak dokumentasi"), correct: ["b"], explanation: "Kesalahan umum di materi: melompat ke praktik tanpa prinsip dasar." },
    { style: "scenario", concept: "verifikasi", prompt: "Hasil akhirmu berbeda dari perkiraan padahal langkahnya terasa benar. Sesuai materi, yang paling masuk akal dilakukan adalah?", options: opt("Menerima hasilnya apa adanya", "Memeriksa ulang hasil tiap langkah satu per satu", "Mengganti topik belajar", "Menyalahkan datanya"), correct: ["b"], explanation: "Verifikasi per langkah memungkinkan menemukan di mana hasil mulai menyimpang." },
    { style: "error-identification", concept: "kesalahan umum", prompt: "Mana yang merupakan KESALAHAN menurut materi?", options: opt("Memverifikasi hasil di setiap langkah", "Melompat ke praktik tanpa memahami prinsip dasar", "Mulai dari kasus kecil", "Mendokumentasikan proses"), correct: ["b"], explanation: "Itu disebut eksplisit sebagai kesalahan umum pemula." },
    { style: "error-identification", concept: "kasus kecil", prompt: "Seorang pemula langsung mengerjakan kasus paling besar dan kompleks lebih dulu. Kesalahannya terletak pada?", options: opt("Urutan skala latihan yang terbalik", "Kurangnya alat", "Terlalu banyak verifikasi", "Terlalu rajin mencatat"), correct: ["a"], explanation: "Materi menyarankan mulai dari kasus kecil, bukan langsung yang besar." },
    { style: "error-identification", concept: "dokumentasi", prompt: "Proses kerja selesai tapi tidak ada yang bisa menjelaskan ulang langkahnya. Praktik yang TERLEWAT menurut materi adalah?", options: opt("Verifikasi", "Dokumentasi proses", "Memeriksa sumber", "Mulai dari kasus kecil"), correct: ["b"], explanation: "Tanpa dokumentasi, proses tidak bisa ditelusuri/diulang." },
    { style: "best-practice", concept: "praktik terbaik", prompt: "Urutan kerja yang paling sesuai dengan praktik terbaik di materi adalah?", options: opt("Praktik besar → teori → dokumentasi", "Prinsip dasar → kasus kecil → verifikasi tiap langkah", "Verifikasi → praktik → definisi", "Dokumentasi → praktik → teori"), correct: ["b"], explanation: "Materi: pahami prinsip, mulai kecil, verifikasi tiap langkah." },
    { style: "best-practice", concept: "verifikasi", prompt: "Kapan sebaiknya berhenti memverifikasi hasil menurut semangat materi ini?", options: opt("Setelah langkah pertama benar", "Tidak berhenti — verifikasi menyertai setiap langkah", "Saat deadline dekat", "Saat data terlihat rapi"), correct: ["b"], explanation: "Verifikasi bukan fase sekali jalan, melainkan kebiasaan di tiap langkah." },
    { style: "best-practice", concept: "dokumentasi", prompt: "Manfaat utama mendokumentasikan proses menurut materi adalah?", options: opt("Membuat laporan terlihat tebal", "Proses bisa ditelusuri dan diulang dengan benar", "Menambah waktu kerja", "Menggantikan kebutuhan verifikasi"), correct: ["b"], explanation: "Dokumentasi membuat proses bisa dipertanggungjawabkan dan direproduksi." },
    { style: "multi", concept: "praktik terbaik", prompt: "Pilih SEMUA yang termasuk praktik terbaik menurut materi.", options: opt("Mulai dari kasus kecil", "Verifikasi hasil di setiap langkah", "Dokumentasikan prosesnya", "Melompat langsung ke praktik", "Mengabaikan sumber data"), correct: ["a", "b", "c"], explanation: "Tiga praktik itu disebut eksplisit; dua lainnya justru kesalahan." },
  ] };
  const cleaned = videoQuiz.cleanVideoQuizPayload(raw);
  if (!cleaned) throw new Error("VIDEO_QUIZ_FALLBACK failed cleanVideoQuizPayload - fix the fixture before deploying");
  return cleaned;
})();

// Relevance judgment for the "Periksa Materi" step: does this video's
// transcript substantively TEACH the quest's fixed topic (not just mention
// it)? Boolean + one short user-facing Indonesian rationale. Keyless mode
// is permissive (same spirit as every other keyless fallback here) - the
// deterministic parts of the flow still hold, only the topical gate is off.
async function judgeVideoRelevance({ topic, videoTitle, transcriptExcerpt }) {
  if (!hasKey()) return { relevant: true, rationale: "Mode offline: relevansi materi tidak diperiksa." };
  const user = `Topik quest (tetap, tidak bisa diganti): "${topic}"\nJudul video yang diajukan pengguna: "${videoTitle}"\nCuplikan transkrip video (awal):\n"""\n${String(transcriptExcerpt || "").slice(0, 6000)}\n"""\n\nTugas: nilai apakah video ini SECARA SUBSTANTIF MENGAJARKAN topik quest di atas (bukan sekadar menyebut atau menyerempet). Video yang membahas topik lebih luas tapi jelas mencakup topik ini secara berarti tetap dihitung relevan. Balas JSON dengan bentuk persis:\n{"relevant": boolean, "rationale": string}\n\nAturan: "rationale" satu kalimat Bahasa Indonesia maksimal 200 karakter, ditampilkan langsung ke pengguna — kalau relevant false, sebut dengan hangat KENAPA materinya belum cocok (mis. topiknya beda arah) supaya mereka bisa cari video lain yang tepat.`;
  const result = await callClaude(user, { maxTokens: 300 });
  if (typeof result?.relevant !== "boolean") throw new Error("bad relevance shape");
  return { relevant: result.relevant, rationale: String(result.rationale || "").slice(0, 220) };
}

// Generates the 15-question HOTS set from the LOCKED video's transcript
// (never generic topic trivia - every question must be answerable from the
// transcript itself). Same contract as generateReadingSprintContent: strict
// validation, 2 attempts, THROWS when keyed instead of self-falling-back
// (the /start route must know generation failed so it doesn't lock the
// video against a broken set). Keyless -> static fallback.
async function generateVideoQuizQuestions({ topic, transcript, attempt = 1 }) {
  if (!hasKey()) return VIDEO_QUIZ_FALLBACK;
  const retryNote = attempt > 1
    ? `\n\nIni attempt ke-${attempt} pengguna (mereka belum lulus): buat set soal BARU dari transkrip yang SAMA — sudut pertanyaan, skenario, dan opsi harus berbeda secara substansi dari set sebelumnya, jangan parafrase tipis.`
    : "";
  const user = `Topik quest: "${topic}"\nTranskrip video materi (satu-satunya sumber soal):\n"""\n${String(transcript || "").slice(0, 15000)}\n"""${retryNote}\n\nTugas: buatkan TEPAT 15 soal assessment HOTS (Higher-Order Thinking Skills: aplikasi/analisis/evaluasi, BUKAN sekadar mengingat fakta) dari transkrip di atas. SEMUA soal WAJIB bisa dijawab HANYA dari isi transkrip itu (boleh parafrase/inferensi terkontrol) — JANGAN pakai pengetahuan umum di luar transkrip, dan tiap soal punya TEPAT SATU set jawaban benar yang tidak diperdebatkan.\n\nBalas JSON dengan bentuk PERSIS (tanpa teks lain):\n{"questions": [{"style": "conceptual"|"scenario"|"error-identification"|"best-practice"|"multi", "concept": string, "prompt": string, "options": [{"id": "a", "text": string}], "correct": [string], "explanation": string}]}\n\nStruktur WAJIB berurutan persis (divalidasi kode, urutan salah = DITOLAK):\n- Soal 1-3: style "conceptual" (pemahaman konsep inti dari transkrip).\n- Soal 4-8: style "scenario" (situasi konkret baru, pengguna menerapkan isi transkrip).\n- Soal 9-11: style "error-identification" (mengenali kesalahan/praktik keliru menurut transkrip).\n- Soal 12-14: style "best-practice" (menilai pilihan/urutan tindakan terbaik menurut transkrip).\n- Soal 15: style "multi" — SATU-SATUNYA soal pilih-semua-yang-benar: 4-6 "options", "correct" berisi 2-4 id, dan minimal satu opsi salah.\n\nAturan: soal 1-14 WAJIB tepat 4 "options" (id "a"-"d") dengan "correct" berisi TEPAT 1 id; soal 15 id opsi "a"-"f" secukupnya. "concept" label skill/konsep pendek lowercase Bahasa Indonesia yang KONSISTEN — soal yang menguji konsep sama HARUS pakai label sama persis (dipakai untuk chip kuat/lemah di layar hasil, idealnya total 4-6 concept unik di seluruh set). "prompt" dan semua "options" dalam Bahasa Indonesia yang jelas. "explanation" satu kalimat Bahasa Indonesia kenapa itu jawabannya, merujuk isi transkrip (ditampilkan di pembahasan setelah lulus). Distraktor harus masuk akal (kesalahpahaman yang plausible), bukan asal salah.`;
  let lastError = null;
  for (let tryNo = 0; tryNo < 2; tryNo++) {
    try {
      const result = await callClaude(user, { maxTokens: 6000 });
      const cleaned = videoQuiz.cleanVideoQuizPayload(result);
      if (cleaned) return cleaned;
      lastError = new Error("video quiz payload failed validation");
      console.error(`generateVideoQuizQuestions attempt ${tryNo + 1}: payload rejected by cleanVideoQuizPayload`);
    } catch (e) {
      lastError = e;
      console.error(`generateVideoQuizQuestions attempt ${tryNo + 1} failed:`, e.message);
    }
  }
  throw lastError || new Error("video quiz generation failed");
}

// Task 10b (Job Match Analysis): the only multimodal generate* function in
// this file - content is an ARRAY of blocks (instruction text + the CV +
// one or more job-posting screenshots), not a JSON-stringified text prompt
// like every other caller here. callClaude passes whatever it's given
// straight through as the message content, so no change was needed there.
const jobMatch = require("./jobMatch");
const nutritionEntry = require("./nutritionEntry");
const nutrition = require("./nutrition");

function fallbackJobMatchAnalysis() {
  // Task 14: matchScore 0 / qualified false - keyless mode can't actually
  // read the posting, so it must never claim a pass. Same "honestly generic,
  // not pretending to have read anything" principle as fallbackPracticeTest.
  return {
    matchTable: [{ skill: "Analisis belum tersedia", status: "tidak ada", note: "Mode tanpa API key: skill di lowongan tidak bisa dibaca dari gambar tanpa mentor AI aktif." }],
    matchScore: 0,
    qualified: false,
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
    const instruction = `Konteks pengguna: goal Livelihood mereka adalah "${ctx.goalText || "mencari kerja/karier yang cocok"}"${ctx.pathway ? `, gaya Pathway mereka "${ctx.pathway}"` : ""}.\n\nTugas: dokumen/gambar pertama adalah CV pengguna. Gambar-gambar setelahnya adalah screenshot SATU lowongan kerja (bisa lebih dari satu screenshot untuk lowongan yang sama karena postingan asli sering kepanjangan buat satu layar — gabungkan jadi satu pemahaman utuh). Ekstrak dari lowongan itu: peran/judul, skill wajib (mandatory), skill nice-to-have, level pengalaman, konteks lain yang relevan. Bandingkan ke CV, lalu balas JSON dengan bentuk PERSIS:\n{"matchTable": [{"skill": string, "status": "ada bukti"|"disebut tapi lemah"|"tidak ada", "note": string}], "matchScore": number, "verdict": string, "relevanceNote": string, "nextStep": string}\n\nAturan WAJIB (prinsip anti-sycophancy — JUJUR, bukan menyenangkan pengguna):\n- "matchTable": satu baris per skill yang diminta lowongan (wajib maupun nice-to-have), "status" HARUS salah satu dari 3 nilai itu persis, "note" satu kalimat pendek alasan/bukti dari CV (atau kenapa tidak ada).\n- "matchScore": angka 0-100, KESELURUHAN seberapa cocok kandidat untuk role INI SECARA JUJUR DAN KETAT — angka ini yang menentukan verdict lolos/tidak (ambang 70), jadi jangan asal tinggi biar pengguna senang. JANGAN cuma menghitung persentase skill yang match di matchTable — turunkan skornya kalau role-nya sendiri tidak sejalan dengan goal pengguna (lihat relevanceNote di bawah), atau kalau ada red flag (ekspektasi pengalaman/level jauh di atas CV, mismatch besar pada skill WAJIB, dsb), biarpun skill nice-to-have-nya banyak yang cocok.\n- "verdict" maknanya HARUS salah satu dari ini (boleh disesuaikan kata-katanya, tapi jujur sesuai datanya, dan HARUS konsisten dengan matchScore): match kuat (matchScore tinggi) → semacam "Siap apply sekarang"; match sedang → semacam "Bisa apply, tapi perkuat [skill] dulu biar kompetitif"; gap besar (matchScore rendah) → semacam "Gap masih besar — fokus bangun [skill] dulu sebelum apply ke role sejenis". JANGAN asal optimis kalau datanya tidak mendukung.\n- "relevanceNote": WAJIB cek apakah lowongan yang di-screenshot ini benar-benar nyambung ke GOAL pengguna ("${ctx.goalText || ""}"), BUKAN cuma nyambung ke isi CV. Kalau TIDAK nyambung (mis. goal "data analyst" tapi lowongan "data entry" — bertetangga tapi beda), WAJIB bilang jujur di sini DAN turunkan matchScore, jangan diam-diam dianggap sama. Kalau memang nyambung, boleh singkat saja menyebut itu.\n- "nextStep": SATU langkah konkret sebagai penutup (apply sekarang / perkuat skill X minggu ini / cari lowongan yang lebih relevan) — satu fokus, bukan daftar panjang.\n- Bahasa Indonesia natural, nada mentor hangat tapi jujur (lihat aturan system prompt) — kejujuran lebih penting daripada bikin pengguna senang.`;
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

// Goal Setting redesign - validates a single onboarding goal. "approved"/
// "feedback"/"recommendations" are ALL hard fields (any malformed field
// discards the whole response and falls back) - unlike generateChapterAnalysis's
// soft-patched insightRows/pattern (purely informational display text, a
// generic fallback phrase is harmless there), a fabricated/malformed
// recommendation here would put words in the user's own goal text they never
// chose to accept - a correctness/trust problem, not a cosmetic one, so this
// hard-fails to the deterministic fallback instead of trying to patch it.
function fallbackGoalValidation(text) {
  // Deterministic keyless/error fallback - the SAME heuristic as the design
  // handoff's own mockValidate(), reused as a real, honest fallback (not a
  // fake always-pass) per the same "keyless mode still does something real"
  // principle as fallbackChapterAnalysis/fallbackJobMatchAnalysis above.
  const t = (text || "").trim();
  const hasLength = t.length >= 20;
  const hasTimeframe = /(hari|minggu|bulan|tahun)/i.test(t);
  const hasNumber = /\d/.test(t);
  if (hasLength && hasTimeframe && hasNumber) return { approved: true };
  const feedback = "Mode tanpa API key: goal ini masih terlalu umum - coba tambahkan target yang bisa diukur dan jangka waktu yang jelas.";
  const rec1 = `${t}${hasTimeframe ? "" : ", dalam 8 bulan"}${hasNumber ? "" : ", dengan target yang bisa diukur"}.`;
  const rec2 = `${t}${hasTimeframe ? "" : ", dalam 6 bulan"}${hasNumber ? "" : ", dengan indikator keberhasilan yang jelas"}.`;
  return { approved: false, feedback, recommendations: [rec1, rec2] };
}
async function generateGoalValidation(ctx) {
  if (!hasKey()) return fallbackGoalValidation(ctx.text);
  try {
    const user = `Konteks: pengguna sedang menulis satu goal pribadi untuk 14 hari pertama First Trial di Eleva, dengan gaya Pathway "${ctx.pathway || ""}"${ctx.pathwayNoun ? ` (${ctx.pathwayNoun})` : ""}. Goal yang mereka tulis: "${ctx.text}"\n\nTugas: nilai goal ini lalu balas JSON dengan bentuk PERSIS SALAH SATU dari:\n{"approved": true}\natau\n{"approved": false, "feedback": string, "recommendations": [string, string]}\n\nDimensi penilaian (goal harus memenuhi SEMUA untuk approved:true): jelas dan spesifik, punya hasil yang bisa diverifikasi, bisa diukur, realistis dicapai orang biasa dalam <=1 tahun, bukan sekadar aktivitas/tugas tanpa hasil (mis. "olahraga" gagal, "olahraga 3x seminggu selama 2 bulan" lolos), punya jangka waktu (atau bisa dinormalisasi jadi satu tanpa mengubah maksud), tidak terlalu bergantung pada faktor eksternal di luar kendali pengguna (mis. "diterima kerja di Google" gagal, "melamar ke 10 posisi data analyst dalam sebulan" lolos).\n\nAturan WAJIB kalau approved:false:\n- "feedback": SATU kalimat jujur kenapa goal ini belum lolos, bahasa natural, bukan checklist.\n- "recommendations": TEPAT 2 versi tulis-ulang goal ini yang WAJIB mempertahankan maksud/niat asli pengguna - JANGAN mengarang angka/target/parameter yang tidak diisyaratkan pengguna sama sekali (boleh menambahkan jangka waktu wajar dan cara mengukur yang masuk akal kalau memang belum ada, tapi jangan mengubah SUBSTANSI goal mereka).\n- JANGAN pernah menulis feedback/recommendation yang terdengar seperti jaminan pasti tercapai - ini evaluasi kejelasan tujuan, bukan janji hasil.\n\nBahasa Indonesia natural, nada mentor hangat tapi jujur.`;
    const result = await callClaude(user);
    if (typeof result?.approved !== "boolean") throw new Error("bad shape: approved");
    if (result.approved) return { approved: true };
    if (typeof result.feedback !== "string" || !result.feedback.trim()) throw new Error("bad shape: feedback");
    if (!Array.isArray(result.recommendations) || result.recommendations.length !== 2 || !result.recommendations.every((r) => typeof r === "string" && r.trim())) {
      throw new Error("bad shape: recommendations");
    }
    return { approved: false, feedback: result.feedback, recommendations: result.recommendations };
  } catch (e) {
    console.error("generateGoalValidation failed, using fallback:", e.message);
    return fallbackGoalValidation(ctx.text);
  }
}

// SOMA Nutrition Part B (photo-optional entry, per user decision alongside
// search-based per the brief): a SECONDARY, faster way to arrive at the
// SAME food_entries evidence shape search does - the AI only ever produces
// a SUGGESTION here, the user reviews/edits it before it's actually saved
// (server/index.js's /api/nutrition/log, same validator either path,
// server/nutritionEntry.js). Single image, reuses jobMatch.buildImageBlocks
// (generic image-block builder, not job-match-specific despite the module
// name).
function fallbackNutritionPhoto() {
  return {
    foodName: hasKey() ? "Analisis gagal — coba lagi atau cari manual." : "Mode tanpa API key — cari manual.",
    servingAmount: 1, servingUnit: "porsi", calories: 0, protein: 0, carbohydrates: 0, fat: 0,
  };
}
async function analyzeNutritionPhoto(ctx) {
  if (!hasKey()) return fallbackNutritionPhoto();
  try {
    const imageBlocks = jobMatch.buildImageBlocks([ctx.image]);
    if (!imageBlocks) throw new Error("bad image");
    const instruction = `Tugas: gambar ini adalah foto makanan/minuman yang baru dimakan pengguna. Perkirakan secara wajar apa isinya dan estimasi nilai gizinya UNTUK PORSI YANG TERLIHAT di foto (bukan per 100g standar). Balas JSON dengan bentuk PERSIS:\n{"foodName": string, "servingAmount": number, "servingUnit": string, "calories": number, "protein": number, "carbohydrates": number, "fat": number}\n\nAturan: "foodName" nama makanan singkat Bahasa Indonesia (mis. "Nasi goreng ayam", boleh sebut komponen utama kalau campuran, mis. "Nasi + ayam goreng + sayur"). "servingAmount"+"servingUnit" perkiraan porsi yang terlihat (mis. 1 "piring", 250 "gram", 1 "mangkuk"). Angka gizi (calories/protein/carbohydrates/fat) HARUS estimasi wajar untuk porsi itu, boleh dibulatkan - ini perkiraan visual, bukan pengukuran presisi, tapi harus tetap masuk akal (jangan 0 semua kecuali fotonya memang cuma air putih). Kalau foto tidak jelas menunjukkan makanan/minuman, "foodName" boleh menyebutkan itu jujur dan angka gizi 0.`;
    const content = [{ type: "text", text: instruction }, ...imageBlocks];
    const result = await callClaude(content);
    const cleaned = nutritionEntry.validateFoodEntry({ ...result, servingUnit: result?.servingUnit, mealType: "sarapan" }); // mealType placeholder - caller supplies the real one before persisting
    if (!cleaned.ok) throw new Error("bad shape");
    const { mealType, ...suggestion } = cleaned.clean;
    return suggestion;
  } catch (e) {
    console.error("analyzeNutritionPhoto failed, using fallback:", e.message);
    return fallbackNutritionPhoto();
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
    // reflective completion flow, never the structured-physical form, so
    // there's no evidence schema to derive either. domain/primaryFeature
    // stay null (never BODY·MOVEMENT) for the same reason.
    quest: { mode: "quest", completionType: "reflective", evidenceSchema: null, domain: null, primaryFeature: null, supportingFeatures: [], executionMode: null, evidenceMode: null, plannedExercises: null, ...q },
  };
}

function fallbackReflection() {
  return {
    statDeltas: {},
    mentorReply: "Refleksinya kesimpan. AI mentor belum aktif penuh (API key belum diisi), jadi belum bisa menilai stat growth secara personal untuk sesi ini.",
    // Task 7d: interpretation is a 3-layer Observed/Hypothesis/Decision
    // object - keyless mode has nothing real to observe, so all three stay
    // honestly generic rather than fabricating a reading of the data.
    interpretation: {
      observed: "Mode tanpa API key: data yang barusan kamu submit belum dibaca secara personal.",
      hypothesis: "Belum ada hipotesis - butuh ANTHROPIC_API_KEY aktif dulu.",
      decision: "Lanjutkan seperti biasa; growth/insight personal akan aktif begitu API key terpasang.",
    },
    safetyNote: null,
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
    const user = `Konteks pengguna (JSON):\n${JSON.stringify(ctx)}\n\nTugas: ini akhir dari onboarding adaptif. ctx.radarSnapshot adalah radar TERKALIBRASI (skala 1-10, total 35: Body, Growth, Livelihood, Emotional Stability, Social, Purpose, Autonomy) - hasil drag manual pengguna (ctx.radarRaw) yang sudah dikoreksi halus berdasarkan reaksi mereka ke Adaptive Scenario Cards (ctx.cards), karena self-report di skala 1-10 rawan bias yang diuji ulang lewat pilihan konkret. ctx.lockedAxes adalah sumbu yang SENGAJA mereka kunci (maksimal 3) dan BOLEH tetap muncul sebagai opsi kartu - angkanya TETAP KEBAL dari pilihan yang MENDUKUNG kuncinya, tapi (v12) BOLEH terkikis kalau pilihan berulang kali BERLAWANAN dari kuncinya (lihat KETEGANGAN LOCK di bawah kalau relevan) - jadi jangan berasumsi nilai di ctx.radarSnapshot untuk sumbu locked itu pasti sama dengan saat pertama dikunci. ctx.cards masing-masing berisi {scenario, options, mostPreferred, leastPreferred} - mostPreferred sumbu yang mereka pilih paling disukai, leastPreferred yang paling tidak disukai dari sisanya; dua sumbu yang tidak dipilih sama sekali di kartu itu netral. Pola pilihan ini + radar terkalibrasi + sumbu terkunci adalah seluruh sinyal yang kamu punya (tidak ada teks bebas dari pengguna). PENTING: kalau ada 2-3 sumbu terkunci di nilai tinggi sekaligus (kombinasi ekstrem, mis. Body dan Social dua-duanya dikunci tinggi), interpretasi kombinasi itu WAJIB dikaitkan ke pola pilihan aktual mereka - jangan mengarang generalisasi sendiri soal apa "arti" kombinasi itu.${shiftNote}${tensionNote}\n\nRangkum semuanya jadi Chapter Analysis. Balas JSON dengan bentuk persis:\n{"insight": string, "pathway": "Architect"|"Warden"|"Weaver"|"Pilgrim"|"Specialist", "subPathway": string, "pathwayBlurb": string, "secondaryTrait": string|null, "rawPathwayTop2": [{"pathway": string, "blurb": string}, {"pathway": string, "blurb": string}], "insightRows": [string, string], "pattern": {"title": string, "description": string}}\n\nAturan: "insight" adalah rangkuman naratif 2-4 kalimat (nilai utama, gesekan/tantangan utama, arah transformasi) — personal, bukan generik, dan harus berdiri sendiri sebagai pemahaman tentang orang ini (akan dipakai sebagai konteks mentor setiap hari setelahnya, bukan cuma ditampilkan sekali) — ini bagian Chapter, boleh bicara soal fase/masalah hidup yang sedang dijalani. "pathway" satu rekomendasi UTAMA dari 5 nama itu berdasarkan pola dari SELURUH konteks (radar terkalibrasi + pola favorit/tidak-favorit semua kartu, termasuk yang paling-tidak-disukai — penolakan juga informasi), bukan cuma sumbu radar tertinggi. "subPathway" WAJIB salah satu dari 3 arketipe TETAP milik "pathway" yang kamu pilih di atas - BUKAN teks bebas, BUKAN mengarang nama baru, BUKAN pilih dari pathway lain. Daftar lengkap 15 arketipe (5 pathway x 3, tulis PERSIS sama termasuk huruf besar/kecil dan spasi): ${subPathwayCatalogText}. Setelah kamu tentukan "pathway", pilih SATU nama dari daftar milik pathway itu saja yang paling cocok dengan pola pengguna ini (dari radar terkalibrasi + pola pilihan kartu skenario). "pathwayBlurb" SATU kalimat pendek kenapa "pathway" ini relevan SECARA GAYA PERILAKU (ingat aturan Pathway≠Chapter di system prompt — bukan soal masalah/fase hidup yang sedang dijalani, itu sudah tugas "insight" di atas) - dipakai sebagai label kartu terpisah, jangan mengulang kalimat "insight" persis sama. "rawPathwayTop2": DUA kandidat pathway TERKUAT kalau kamu HANYA melihat ctx.radarRaw (radar SEBELUM kalibrasi) - untuk field ini SAJA, abaikan ctx.cards sepenuhnya, murni bentuk radar mentahnya; urutkan dari paling kuat, masing-masing dengan "blurb" satu kalimat (gaya perilaku, sama aturan dengan pathwayBlurb) kenapa radar mentah itu mengarah ke sana. Ini bukan rekomendasi utama - tujuannya menunjukkan ke pengguna bagaimana radar AWAL saja (sebelum bukti dari pilihan konkret) akan mengarahkan mereka, sebagai pembanding; boleh sama atau beda dengan "pathway". "secondaryTrait" opsional, satu frasa pendek trait tambahan yang terlihat tapi bukan fokus utama (null kalau tidak ada yang jelas) — informasional saja, bukan pathway kedua. "insightRows": TEPAT 2 baris observasi pola perilaku pendek (maks ~90 karakter tiap baris, satu kalimat, bukan daftar) — beda dari "insight" (itu rangkuman naratif 2-4 kalimat), ini dua kilasan momen-level yang lebih tajam tentang bagaimana orang ini cenderung bersikap (bukan tentang fase hidupnya — aturan Pathway≠Chapter tetap berlaku walau ini bukan field Pathway, karena ini juga soal gaya perilaku, bukan masalah hidup). Ambil dari pola radar + ctx.cards (favorit/tidak-favorit), JANGAN dari nama axis literal. Baris pertama observasi yang lebih "cepat kelihatan" (reaksi/insting), baris kedua lebih soal fokus/prioritas konkret — dua sudut berbeda, jangan mengulang kalimat yang sama dengan kata lain. "pattern": SATU trait-pattern pendek yang paling menonjol dari kombinasi radar+kartu — bukan Pathway, bukan pengulangan "secondaryTrait". "title" 2-5 kata, frasa padat Bahasa Indonesia natural (BUKAN terjemahan literal Inggris). "description" satu kalimat pendek menjelaskan trait itu secara perilaku konkret. Nada hangat, personal, seperti mentor yang benar-benar mendengarkan.`;
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
    // Same "patch, don't discard" precedent as normalizeSubPathway above -
    // insightRows/pattern are purely informational display fields (not
    // decision-gating like pathway/pathwayBlurb/rawPathwayTop2 above, whose
    // failures throw and discard the whole response), so a malformed shape
    // here shouldn't throw away an otherwise-good pathway recommendation.
    if (!Array.isArray(result.insightRows) || result.insightRows.length !== 2 || !result.insightRows.every((r) => typeof r === "string" && r.trim())) {
      console.error("generateChapterAnalysis: bad insightRows shape, patching with fallback");
      result.insightRows = fallbackInsightRows(ctx);
    }
    if (!result.pattern || typeof result.pattern.title !== "string" || !result.pattern.title.trim() || typeof result.pattern.description !== "string" || !result.pattern.description.trim()) {
      console.error("generateChapterAnalysis: bad pattern shape, patching with fallback");
      result.pattern = fallbackPattern(ctx, result.pathway);
    }
    return { ...result, significantShifts: shifts, lockTension: flaggedTension };
  } catch (e) {
    console.error("generateChapterAnalysis failed, using fallback:", e.message);
    return fallbackChapterAnalysis(ctx, shifts, flaggedTension, erodedLocks);
  }
}

// Deterministic, non-AI phrasing for the two new insight-row observations -
// same "describe the behavior, not the axis name" principle as
// AXIS_ACTIVITY_PHRASE above, just worded as an observation instead of an
// activity prompt. Used both as the keyless fallback AND to patch a
// malformed insightRows/pattern from a real AI response (see the soft-patch
// in generateChapterAnalysis above) - one implementation, two callers.
const AXIS_PATTERN_PHRASE = {
  body: "kamu paling gerak kalau kondisi fisik/energimu lagi jadi sorotan",
  growth: "kamu paling hidup kalau lagi belajar atau coba hal baru",
  livelihood: "fokusmu paling tajam soal penghasilan dan arah kerja",
  emotional: "kamu paling perhatian ke ketenangan diri sendiri saat tertekan",
  social: "koneksi ke orang lain jadi penggerak utamamu",
  purpose: "kamu paling terdorong kalau ada alasan besar di baliknya",
  autonomy: "kamu paling kuat kalau keputusannya benar-benar di tanganmu sendiri",
};
// Short trait-pattern title per Pathway (fallback only - real calls let the
// model synthesize something sharper from the actual pattern).
const PATHWAY_PATTERN_TITLE = {
  Architect: "Bangun dulu, baru gerak",
  Warden: "Jaga ritme, baru maju",
  Weaver: "Rangkul dulu, baru putuskan",
  Pilgrim: "Coba dulu, komit belakangan",
  Specialist: "Dalami dulu, baru meluas",
};
function fallbackInsightRows(ctx) {
  const [a1, a2] = topAxes(ctx.radarSnapshot, 2);
  const row1 = a1 ? `Dari pola radarmu, ${AXIS_PATTERN_PHRASE[a1] || "ada satu area yang paling menonjol"}.` : "Belum cukup pola yang kelihatan dari radar-mu.";
  const row2 = a2 ? `Selain itu, ${AXIS_PATTERN_PHRASE[a2] || "ada satu area lain yang cukup kuat"}.` : "Coba isi radar lebih lengkap supaya polanya makin jelas.";
  return [row1, row2];
}
function fallbackPattern(ctx, pathway) {
  const axis = highestRadarAxis(ctx.radarSnapshot);
  return {
    title: PATHWAY_PATTERN_TITLE[pathway] || "Pola yang masih terbentuk",
    description: axis
      ? `Polanya masih sederhana (mode tanpa API key): ${AXIS_PATTERN_PHRASE[axis] || "satu area radar lebih menonjol dari yang lain"}.`
      : "Belum ada pola yang cukup jelas untuk disimpulkan.",
  };
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
    insightRows: fallbackInsightRows(ctx),
    pattern: fallbackPattern(ctx, pathway),
    significantShifts: shifts || [],
    lockTension: flaggedTension || [],
  };
}

module.exports = {
  generateQuest, processReflection, hasKey,
  generateScenarioCard, generateChapterAnalysis,
  generateTargetOptions, generatePracticeTest, generateReadingSprintContent, fallbackPracticeTest, generateJobMatchAnalysis,
  judgeVideoRelevance, generateVideoQuizQuestions, normalizeVideoQuizSchema, normalizeLaboraChain,
  PATHWAY_NAMES, SUB_PATHWAY_NAMES, fallbackChapterAnalysis, normalizeSubPathway,
  normalizeEvidenceSchema, generateSideQuest,
  normalizeCompletionType, fallbackReflection, looksRecoveryThemed, analyzeNutritionPhoto,
  fallbackInsightRows, fallbackPattern, generateGoalValidation, fallbackGoalValidation,
  normalizeMovementFields, normalizePlannedExercises,
  normalizeMultiDomainQuest,
};
