// 7 MECE stats (Bible v1.5): Mind+Explorer merged into Growth (Openness &
// Intellect are one Big Five factor), Career+Finance merged into Livelihood
// (salary is core to the research definition of career success), Autonomy
// added (SDT - the Collectively-Exhaustive gap for an audience that lost
// direction).
const STAT_ORDER = [
  ["body", "Body"], ["growth", "Growth"], ["livelihood", "Livelihood"],
  ["emotional", "Emotional Stability"], ["social", "Social"], ["purpose", "Purpose"], ["autonomy", "Autonomy"],
];
// Pre-MECE accounts (8-element era) keep their stored stats keys until they
// reset & re-onboard - display labels only, deliberately NOT a data
// migration (per PRD: founder resets, nobody else has real data).
const LEGACY_STAT_LABELS = { mind: "Mind", career: "Career", finance: "Finance", explorer: "Explorer" };
function statLabel(key) {
  return STAT_ORDER.find((s) => s[0] === key)?.[1] || LEGACY_STAT_LABELS[key] || key;
}

// Bible v1.7: Pathway = gaya berinteraksi dengan dunia (tahan lama, soal
// perilaku), BUKAN fase/masalah hidup (itu tugas Chapter, lihat PRD riwayat
// v8/Bible v1.7 Bab 13) - deskripsi di bawah sengaja tidak menyebut apa pun
// soal pemulihan emosional/"belum tahu arah", itu pattern lama yang direvisi.
const PATHWAY_DESC = {
  Architect: "Membangun & menyusun sesuatu secara metodis, langkah demi langkah terlihat.",
  Warden: "Menjaga & mempertahankan — fokus ke konsistensi, jadi fondasi yang bisa diandalkan.",
  Weaver: "Menghubungkan orang & ide — fokus ke jaringan dan memfasilitasi koneksi.",
  Pilgrim: "Menjelajah luas secara sengaja sebelum berkomitmen — gaya eksploratif, bukan tersesat.",
  Specialist: "Menyelam dalam ke satu domain spesifik yang tidak masuk kategori umum.",
};
const PATHWAY_NAMES = Object.keys(PATHWAY_DESC);
// Design handoff Screen 2: short style phrase for the wildcard tarot card's
// "why" line ("Arah alternatif kalau kamu ingin ...") - static template
// copy, the Weaver phrasing is verbatim from the design mockup.
const PATHWAY_ALT_PHRASE = {
  Architect: "membangun sesuatu langkah demi langkah",
  Warden: "menjaga konsistensi & fondasi yang stabil",
  Weaver: "membangun koneksi & kolaborasi",
  Pilgrim: "menjelajah dulu sebelum berkomitmen",
  Specialist: "menyelam dalam di satu bidang",
};
// Task 9 (founder spec, 10 Agustus): fixed catalog of 15 sub-pathway
// archetypes - MUST stay byte-for-byte identical to the copy in
// server/claude.js (no shared module system between client/server here).
const SUB_PATHWAY_NAMES = {
  Architect: ["Engineer of Foundations", "Strategist of Blueprints", "Craftsman of Precision"],
  Warden: ["Sentinel of Discipline", "Keeper of Boundaries", "Guardian of Consistency"],
  Weaver: ["Connector of Circles", "Anchor of Belonging", "Bridge of Empathy"],
  Pilgrim: ["Wanderer of Meaning", "Seeker of Horizons", "Nomad of Discovery"],
  Specialist: ["Architect of Mastery", "Artisan of Depth", "Virtuoso of Precision"],
};

// v14 bug fix: the goal-input placeholders were the founder's OWN literal
// examples from the PRD ("Punya badan sehat", "IELTS band 6.5", ...) -
// those were illustration for writing the PRD, never meant to be hardcoded
// verbatim into the app for every single user (founder caught this in
// testing - the placeholder was identical to their own real goal). Fixed
// with per-Pathway generic placeholders instead - static/hardcoded, no new
// API call, matching the gaya of each Pathway.
// Design-handoff usability round (10 Agustus): every example must read as
// realistically achievable within the 14-day First Trial - the old copy
// ("5 proyek dalam 3 bulan", "closing 5 klien") quietly taught users to
// write goals the trial could never contain.
const PATHWAY_GOAL_PLACEHOLDER = {
  Architect: "mis. Rapikan 1 bagian portofolio yang paling ketinggalan",
  Warden: "mis. Olahraga 3x minggu ini, konsisten dulu",
  Weaver: "mis. Hubungi lagi 2 teman lama yang udah jarang ngobrol",
  Pilgrim: "mis. Coba 1 hal baru di luar rutinitas biasamu",
};
// Specialist has no fixed placeholder by design (the whole point is a
// user-defined domain) - PRD's own worked example: "Sales" -> a sales-shaped
// placeholder. Tiny static hint table, NOT an AI call; anything unmatched
// falls through to the neutral template using the user's own words.
const SPECIALIST_GOAL_HINTS = {
  sales: "mis. Closing 2 klien baru dalam 14 hari ke depan",
  desain: "mis. Selesaikan 1 project desain buat portofolio",
  "desain grafis": "mis. Selesaikan 1 project desain buat portofolio",
  coding: "mis. Rilis versi kecil (MVP) dari 1 proyek pribadi",
  programming: "mis. Rilis versi kecil (MVP) dari 1 proyek pribadi",
  marketing: "mis. Jalankan 1 campaign kecil dan lihat hasilnya",
  konten: "mis. Konsisten posting konten 3x seminggu selama 14 hari",
};
function goalPlaceholder(pendingPathway) {
  if (!pendingPathway) return "mis. Target konkret 14 hari ke depan";
  const { pathway, pathwayNoun } = pendingPathway;
  if (PATHWAY_GOAL_PLACEHOLDER[pathway]) return PATHWAY_GOAL_PLACEHOLDER[pathway];
  // Since Task 9, a carousel-picked Specialist carries a fixed ARCHETYPE as
  // its pathwayNoun ("Architect of Mastery", ...), not a user-domain noun
  // like the pre-catalog "Closer" - probing/embedding it would produce
  // nonsense placeholders ("mis. Architect of Mastery, target konkret...").
  // Those cards get the neutral placeholder; the domain-probe below now
  // only ever applies to free-typed override text.
  if ((SUB_PATHWAY_NAMES[pathway] || []).includes(pathwayNoun)) return "mis. Target konkret 14 hari ke depan";
  const probe = (pathway !== "Specialist" ? pathway : pathwayNoun || "").toLowerCase().trim();
  if (SPECIALIST_GOAL_HINTS[probe]) return SPECIALIST_GOAL_HINTS[probe];
  const label = pathway && pathway !== "Specialist" ? pathway : (pathwayNoun && pathwayNoun !== "Specialist" ? pathwayNoun : "spesialisasimu");
  return `mis. ${label}, target konkret 14 hari ke depan`;
}

// Task 8: contextual help - one small "?" top-right on the four listed
// onboarding screens + the daily dashboard. Copy is STATIC per screen
// (written once, plain language, no unexplained RPG jargon) - deliberately
// not AI-generated: mechanics are the same for everyone, so a fixed human-
// written text is cheaper and more controllable than a per-call generation.
// The radar/card/carousel/dashboard texts are the PRD's own examples.
const HELP_TEXT = {
  radar: "Ini cara Eleva kenalan sama fokus hidupmu sekarang. Tarik titik-titiknya sesuai porsi yang kamu rasa — nggak ada jawaban benar/salah. Kalau ada sisi yang kamu yakin banget dan nggak mau ikut bergeser, tap titiknya untuk mengunci (maksimal 3).",
  card: "Beberapa skenario singkat. Pilih yang paling & paling nggak kamu banget — dari situ Eleva mulai ngerti pola kamu. Jawab jujur aja, nggak ada jawaban salah.",
  analysis: "3 gaya yang mungkin cocok buat kamu, berdasarkan yang barusan kamu isi. Pilih salah satu, atau tulis sendiri kalau ngerasa nggak ada yang pas — bisa diganti nanti.",
  goals: "Tulis 1-3 hal yang mau kamu capai selama 14 hari ke depan — boleh dari area mana pun (badan, belajar, kerjaan, relasi). Tugas harianmu nanti diarahkan ke sini, gantian tiap harinya.",
  dashboard: "Quest hari ini dari Eleva, disesuaikan sama fokusmu. Kerjakan, lalu tap Mulai — aktivitas fisik dicatat sebagai record singkat (pilih jenisnya: cardio atau gym), sisanya lewat refleksi teks.",
};
// Founder feedback (10 Agustus, live screenshot dari layar radar): "orang
// awam" nggak otomatis tahu apa arti nama sumbu ini secara istilah - butuh
// keterangan konkret per elemen, bukan cuma nama. Teks persis dari founder,
// dipasang di sheet bantuan yang sudah ada (radar + dashboard - dua-duanya
// menampilkan ketujuh nama sumbu/stat yang sama) daripada menumpuk teks di
// chart itu sendiri, yang sudah padat dengan titik+angka+garis.
const AXIS_DEFINITIONS = {
  body: "Kondisi fisik dan energi harianmu (tidur, olahraga, stamina).",
  growth: "Seberapa aktif kamu belajar dan berkembang (skill baru, wawasan, rasa ingin tahu).",
  livelihood: "Arah karier dan kestabilan keuanganmu (pekerjaan, penghasilan, tabungan).",
  emotional: "Seberapa tenang kamu menghadapi tekanan (kontrol emosi, ketenangan, daya tahan).",
  social: "Kualitas hubunganmu dengan orang lain (teman, keluarga, koneksi berarti).",
  purpose: "Seberapa jelas alasan di balik yang kamu jalani (makna, arah hidup, tujuan).",
  autonomy: "Seberapa besar hidupmu dijalani dengan caramu sendiri (kebebasan, kemandirian, kontrol atas keputusan).",
};
function axisDefinitionsHTML() {
  return `<div class="axis-defs">${STAT_ORDER.map(([k, label]) => `
    <div class="axis-def"><span class="axis-def-name">${esc(label)}</span><span class="axis-def-text">${esc(AXIS_DEFINITIONS[k] || "")}</span></div>`).join("")}</div>`;
}
let helpOpen = null; // screen key whose help sheet is showing, or null
function helpBtnHTML(key) {
  return `<button class="help-btn" data-help="${key}" aria-label="Bantuan layar ini">?</button>`;
}
function helpSheetHTML(key) {
  if (helpOpen !== key) return "";
  return `
    <div class="help-overlay" id="helpOverlay">
      <div class="help-sheet fadeUp">
        <p>${esc(HELP_TEXT[key] || "")}</p>
        ${key === "dashboard" ? axisDefinitionsHTML() : ""}
        <button class="btn-primary full" id="closeHelp">Oke, ngerti</button>
      </div>
    </div>`;
}
// One delegated listener for open/close - survives every innerHTML re-render,
// so no per-screen wiring needed. Clicking the dimmed backdrop closes too
// (light, non-blocking, per the PRD's DoD).
document.addEventListener("click", (e) => {
  const btn = e.target.closest?.("[data-help]");
  if (btn) { helpOpen = btn.dataset.help; render(); return; }
  if (e.target.id === "helpOverlay" || e.target.id === "closeHelp") { helpOpen = null; render(); }
});

const MATURITY_TIERS = ["Emerging", "Practicing", "Reliable", "System", "Master"];
function maturityTier(growthSessions) {
  return MATURITY_TIERS[Math.min(MATURITY_TIERS.length - 1, Math.floor((growthSessions || 0) / 3))];
}

// --- Radar self-assessment (7 MECE axes, 1-10 each, always sums to exactly
// 35 - see applySynergyDrag/roundPreservingTotal below for how that's
// guaranteed) ---
const POLY_ORDER = ["body", "growth", "livelihood", "emotional", "social", "purpose", "autonomy"];
const POLY_TOTAL = 35; // 7 axes x default 5 - the fixed zero-sum budget
const POLY_MIN = 1, POLY_MAX = 10, POLY_CENTER = 150, POLY_MAXR = 110, POLY_MINR = 15;
const POLY_STEP_DEG = 360 / POLY_ORDER.length; // heptagon: ~51.43deg per axis
// Square viewBox with padding so axis-name labels (anchored outward) never
// clip; kept square so pointer->viewBox mapping stays a uniform scale.
// Wider than the 8-axis era: the heptagon puts "Livelihood" at a
// near-horizontal angle where it needs the full word to the right - and
// since the design handoff, the per-axis (i) info icon sits past the label
// text, so the padding widened again (Livelihood's icon was clipping at
// the old -34/368 bounds).
// Center invariant: POLY_VIEW_MIN + POLY_VIEW_SIZE/2 === POLY_CENTER.
const POLY_VIEW_MIN = -46, POLY_VIEW_SIZE = 392;
const DEFAULT_RADAR = { body: 5, growth: 5, livelihood: 5, emotional: 5, social: 5, purpose: 5, autonomy: 5 };

function polyRadius(value) {
  const v = Math.max(POLY_MIN, Math.min(POLY_MAX, value));
  return POLY_MINR + ((v - POLY_MIN) / (POLY_MAX - POLY_MIN)) * (POLY_MAXR - POLY_MINR);
}
// Returns a FLOAT value - rounding happens once, at the end of the whole
// redistribution (largest-remainder across all 7 axes), never per-point.
function polyValueFromRadius(r) {
  const clamped = Math.max(POLY_MINR, Math.min(POLY_MAXR, r));
  return POLY_MIN + ((clamped - POLY_MINR) / (POLY_MAXR - POLY_MINR)) * (POLY_MAX - POLY_MIN);
}
function polyPoint(index, value) {
  const angle = ((-90 + index * POLY_STEP_DEG) * Math.PI) / 180;
  const r = polyRadius(value);
  return [POLY_CENTER + r * Math.cos(angle), POLY_CENTER + r * Math.sin(angle)];
}
// --- Synergy evidence (v5, 7 MECE elements = 21 pairs) ---
// 14 pairs have directed evidence (below); 3 are "campuran" (component
// evidence collides after the merges - no directed nudge, treated as plain
// non-partners); 4 have no direct study found. Full per-pair citations:
// reference/Eleva_Correlation_Matrix.html (open in a browser, tap a cell).
//
// weight: kuat=6, sedang(-kuat)=4, lemah=2. direction: 1=searah, -1=berlawanan.
// No negative pair survives the MECE merge (the two old ones dissolved into
// "campuran") - direction:-1 stays supported in the math for future evidence.
//
// Scale doubled from the original 3/2/1 (v5-v8) to 6/4/2 (v9) - founder found
// the synergy effect visually unreadable: non-partner pull uses the axis's
// CURRENT VALUE (~5 near the default), which was routinely stronger than a
// weak (1) or even a strong (3) partner's pull, so evidence-linked axes often
// moved LESS than unrelated ones - backwards from what the radar is supposed
// to communicate. Doubling only the partner side (non-partner pull is still
// literally the current value, unchanged) makes a strong partner (6) reliably
// outweigh a mid-range non-partner (~5), while ratios between partners of
// different strength are preserved exactly (6:4:2 = 3:2:1).
const SYNERGY = {
  "body|growth": { weight: 2, direction: 1 },       // lemah - olahraga & kognisi, g=0.13 dewasa muda (meta-analisis Bayesian)
  "body|emotional": { weight: 6, direction: 1 },    // kuat - olahraga vs depresi/cemas, RCT (meta-meta 92 studi)
  "body|purpose": { weight: 4, direction: 1 },      // sedang-kuat - meaning & kesehatan fisik r~0.26 (meta 66 studi)
  "body|autonomy": { weight: 2, direction: 1 },     // lemah - perceived control & keluhan fisik rendah (Spector)
  "growth|livelihood": { weight: 6, direction: 1 }, // kuat - GMA prediktor terkuat performa kerja (Schmidt & Hunter 1998; Sackett 2022)
  "growth|autonomy": { weight: 4, direction: 1 },   // sedang - autonomy support -> engagement belajar (SDT edukasi, Bureau 2022)
  "livelihood|social": { weight: 4, direction: 1 }, // sedang-kuat - social capital -> career success (Seibert 2001; diencerkan, Finance-Social tanpa evidence)
  "livelihood|purpose": { weight: 4, direction: 1 },// sedang-kuat - calling -> job satisfaction (Duffy & Dik; diencerkan, Finance-Purpose unresolved)
  "livelihood|autonomy": { weight: 6, direction: 1 },// kuat - job autonomy -> job satisfaction (Humphrey 2007, 259 studi, 219rb partisipan)
  "emotional|social": { weight: 6, direction: 1 },  // kuat - loneliness (Holt-Lunstad)
  "emotional|purpose": { weight: 6, direction: 1 }, // kuat - purpose vs depresi r=-0.49, cemas r=-0.36 (Boreham 2023)
  "emotional|autonomy": { weight: 6, direction: 1 },// kuat - SDT need satisfaction -> wellbeing (192 studi); perceived control
  "social|purpose": { weight: 6, direction: 1 },    // kuat - dua arah (Stavrova & Luhmann, longitudinal)
  "purpose|autonomy": { weight: 4, direction: 1 },  // sedang - autonomy -> experienced meaningfulness (mediator, Humphrey 2007)
};
// CAMPURAN (komponen bertabrakan - non-partner, menyerap netral tanpa arah):
//   body|livelihood      - financial strain (positif) VS overwork (negatif)
//   emotional|livelihood - stres finansial (positif) VS burnout (negatif)
//   body|social          - cuma olahraga BERKELOMPOK yang terbukti
// BELUM KETEMU (non-partner biasa): growth|emotional, growth|social,
//   growth|purpose, social|autonomy
function synergyFor(a, b) {
  return SYNERGY[a + "|" + b] || SYNERGY[b + "|" + a] || null;
}

const MAX_LOCKS = 3; // deliberate cap, per founder: forces real priorities, "nggak bisa mau semuanya"

// Largest-remainder rounding across ALL 7 axes at once so the total stays
// exactly POLY_TOTAL (35) - never naive per-point rounding. Locked axes are
// already exact integers and are excluded from remainder bumps entirely.
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
  let remainder = Math.round(POLY_TOTAL - sumFloor);
  fracs.sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { k } of fracs) {
    if (remainder <= 0) break;
    if (out[k] < POLY_MAX) { out[k] += 1; remainder -= 1; }
  }
  return out;
}

// The core drag computation, run against the gesture-start snapshot (not
// incrementally) so it's stable and reversible mid-drag.
//
// v5 unified re-normalization (per PRD 7-element revision, replacing the
// old two-stage "partners pulled along + non-partners absorb 2x delta"
// formula). When the user moves axis X by delta, ALL unlocked other axes
// form ONE shared pool and together change by EXACTLY -delta (that is the
// whole zero-sum budget, no more), split proportionally to each axis's pull
// strength:
//   - evidence partner Y of X: pull = weight(Y) * direction(Y) - stronger
//     evidence shares more of the movement;
//   - non-partner Z (including "campuran" pairs - they absorb neutrally):
//     pull = current value of Z (the old v1 proportional rule).
// Same formula for every axis, no topology special-casing - this is what
// keeps the system safe even for a hyper-connected axis (Autonomy: 5
// evidence partners, only Social as a pure non-partner) and for any future
// evidence additions (the old formula demanded 2x delta from non-partners
// alone, which starved axes with few of them - documented in the PRD as the
// reason for this re-normalization).
//
// On top of the shares:
//   1. Saturation pass: a pool member already sitting exactly at the bound
//      its share would push it past is excluded and the pool re-normalizes
//      among the rest (still exactly -delta in total) - repeat until stable.
//      Without this, one axis parked at its floor by an earlier drag would
//      force the global scale factor to zero and freeze the whole gesture
//      (bug filed by founder, twice).
//   2. Constraint solving: if any surviving member (or X itself) would still
//      leave [1,10] at full delta, the WHOLE delta is scaled down uniformly
//      (closed-form, every change is linear in delta) - never one point
//      clamped in isolation.
//   3. Largest-remainder rounding to POLY_TOTAL at the very end.
// Locked axes are untouched at every step: not pool members, not constraint
// participants.
//
// direction:-1 note: no negative pair survives the MECE merge, so today all
// pulls are positive. The sign math below follows the PRD pseudocode
// (pull = weight * direction) literally; if research later adds a negative
// pair, revisit how a negative pull should interact with the shared pool
// before shipping it.
function applySynergyDrag(base, key, targetValue, lockedKeys) {
  const locked = new Set(lockedKeys || []);
  const target = Math.max(POLY_MIN, Math.min(POLY_MAX, targetValue));
  const delta = target - base[key];
  if (Math.abs(delta) < 1e-9) return { values: { ...base }, limited: false };

  const others = POLY_ORDER.filter((k) => k !== key && !locked.has(k));
  // v10: non-partner pull damped to half its current value. Two reasons,
  // both from founder testing on production:
  //   1. Readable synergy gradient on a single drag - undamped, a mid-range
  //      non-partner (value ~5) out-pulled even a strong evidence partner,
  //      so the per-axis spread came out near-uniform and the whole synergy
  //      concept was invisible on the chart. Damped, one Body drag now reads
  //      strong partner (-2) > mid partner/non-partner (-1) > weak (0).
  //   2. Calibration retention - the scenario-card signals reuse this exact
  //      engine, and an axis the user consistently favorites grows tall,
  //      which undamped made it the BIGGEST collateral absorber of every
  //      later signal (pull = its own value) - actively cancelling the very
  //      gains the user's picks just built. Halving non-partner pull halves
  //      that drain, so consistent answers accumulate instead of washing
  //      out, and the before/after comparison actually shows them.
  // Still proportional to current value (low axes keep absorbing less, the
  // natural floor protection), still normalized to exactly -delta in total.
  const NONPARTNER_DAMP = 0.5;
  const pullOf = (k) => {
    const syn = synergyFor(key, k);
    return syn ? syn.weight * syn.direction : base[k] * NONPARTNER_DAMP;
  };

  const excluded = new Set();
  let change = {};
  for (let iter = 0; iter <= others.length; iter++) {
    const active = others.filter((k) => !excluded.has(k));
    const totalPull = active.reduce((s, k) => s + pullOf(k), 0);
    change = { [key]: delta };
    if (totalPull > 1e-9) {
      active.forEach((k) => { change[k] = -delta * (pullOf(k) / totalPull); });
    } else {
      // Degenerate pool (empty, or net-nonpositive pull from a future
      // negative pair): nothing can absorb - the constraint step below
      // resolves this to a frozen, feedback-giving stop, not a silent one.
      active.forEach((k) => { change[k] = 0; });
    }

    // Anyone already exactly at the bound its own share would push it past
    // gets excluded, not scaled - the rest re-absorb its share, which is
    // what lets a floored axis stop blocking everyone else.
    let newlySaturated = false;
    active.forEach((k) => {
      if (Math.abs(change[k]) < 1e-9) return;
      const room = change[k] > 0 ? POLY_MAX - base[k] : base[k] - POLY_MIN;
      if (room <= 1e-9) { excluded.add(k); newlySaturated = true; }
    });
    if (!newlySaturated) break;
  }

  const absorbing = others.filter((k) => Math.abs(change[k] || 0) > 1e-9);

  // No absorber left for a nonzero delta => nothing can move at all.
  let s = absorbing.length === 0 ? 0 : 1;
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
  radar: { ...DEFAULT_RADAR },
  radarRaw: null, // frozen snapshot at the moment the radar step is left, before any calibration
  calibrationSum: {}, // {axisKey: cumulative direct calibration delta so far, capped [-3,3]}
  locked: [], // axis keys pinned by the user, max MAX_LOCKS
  lockedOriginalValue: {}, // {axisKey: value at the moment it was locked} - see applyCalibrationCard v12
};
let onboardStep = 0;
let ui = { view: "loading", label: "Membuka Eleva..." };
let appState = null;
let reflectOpen = false;
// Which open quest (by id) the reflect flow targets - there's no single
// implicit "today's quest" anymore under the per-goal model (up to 3
// quests, one per active goal, can be open at once), so this is always
// set explicitly when a card's own button is tapped, never defaulted.
let reflectTarget = null;
let reflectStatus = "done";
let reflectText = "";
// Task 7b: structured-physical quests complete via typed fields instead of
// the free reflection box - values keyed by field name, kept across
// re-renders; narrative text stays optional for those quests.
let structForm = {};
// Founder revision to the record flow: WHICH record form applies is the
// user's pick at completion time, not the AI's guess at generation time -
// quests are often open-ended about the activity ("push-up, jalan cepat,
// atau latihan apapun"), so a single pre-baked structuredKind can't know
// what the user actually did. recordMode = completing via physical record
// (auto-on for AI-tagged physical quests, where the server still requires
// record data; opt-in via a link for everything else - which also covers
// legacy physical quests that predate tagging). structKind = the user's
// pick: "cardio" | "gym-badan" (bodyweight) | "gym-alat" (with equipment);
// the two gym variants share one server validation, they differ only in
// which fields render.
let recordMode = false;
let structKind = null;
let reflectError = "";
// Set right after a successful submit, cleared once the user dismisses the
// brief "here's what happened" acknowledgment - see completedResultCardHTML.
let completedResult = null;
// Fokus 2.2/2.3: "Target Berikutnya" picker state, live only while
// completedResult.target is present (mode "options") - reset alongside it.
let targetChoice = null; // null | "A" | "B" | "manual"
let targetManualForm = {}; // cardio: {jarakKm, durasiMenit} - gym: {set, repetisi, bebanKg}
let targetError = "";
let resetArmed = false;
let authMode = "login";
let authForm = { email: "", password: "", betaCode: "" };
let privacyChecked = false;
let authError = "";

// --- Adaptive onboarding phase (Radar chart -> Adaptive Scenario Cards ->
// Chapter Analysis). v6: cards are one scenario + 4 options (one per
// unlocked axis); each choice also calibrates the radar via the SAME
// redistribution engine as manual dragging - see applyCalibrationCard. ---
let adaptivePhase = "card"; // "loading" | "card" | "thinking" | "analysis" | "goals"
let adaptiveCards = []; // [{scenario, options:[{axis,text}], mostPreferred, leastPreferred}, ...] - length also serves as the card counter
let adaptiveScenario = null; // {scenario, options} for the card currently on screen
let adaptiveSelection = { mostPreferred: null, leastPreferred: null }; // in-progress picks for the current card
let chapterAnalysis = null; // {insight, pathway, subPathway, pathwayBlurb, secondaryTrait, significantShifts, lockTension, rawPathwayTop2}
let pathwayOptions = []; // 3 swipeable candidate cards, computed once when chapterAnalysis loads - see buildPathwayOptions
let selectedPathwayIndex = null;
let overrideMode = false;
let overrideText = "";
// v13 goal capture - deliberately NOT an onboarding card: it's the bridge
// into First Trial, shown right after the Pathway is confirmed (either a
// carousel card or the manual override), before the first daily quest.
let goalInputs = ["", "", ""]; // 1-3 free-text goals, min 1 required
let pendingPathway = null; // {pathway, pathwayNoun} held while the goals screen is up
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
    radar: { ...DEFAULT_RADAR },
    radarRaw: null, // frozen snapshot at the moment the radar step is left, before any calibration
    calibrationSum: {}, // {axisKey: cumulative direct calibration delta so far, capped [-3,3]}
    locked: [],
    lockedOriginalValue: {},
  };
  adaptivePhase = "card";
  adaptiveCards = [];
  adaptiveScenario = null;
  adaptiveSelection = { mostPreferred: null, leastPreferred: null };
  chapterAnalysis = null;
  pathwayOptions = [];
  selectedPathwayIndex = null;
  overrideMode = false;
  overrideText = "";
  goalInputs = ["", "", ""];
  pendingPathway = null;
  onboardError = "";
  openAxisInfo = null;
  lockExplainerShown = false;
}

// Applies one card's two signals (favorite = +1, least-favorite = -1) to the
// radar through the EXISTING zero-sum + synergy engine (applySynergyDrag) -
// per PRD, calibration reuses the manual-drag mechanism rather than a
// separate system that could break the total=35 invariant. Each axis's
// cumulative DIRECT signal (i.e. only when that axis itself was picked as
// favorite/least-favorite, not collateral movement from redistribution) is
// capped at ±3 net across the whole session; once an axis hits its cap,
// further direct signals toward the same side are silently absorbed to 0 -
// the axis can still appear in later cards for coverage, its own delta just
// stops moving it further.
//
// v7-v11: a locked axis's NUMBER never moved here at all, even if it was
// picked as favorite/least-favorite - only a narrative "lock tension" signal
// (computeLockTension, server-side). v12 REVERSES that for the specific case
// of a CONTRARY pick (the pick pulls against what the lock declared - see
// isContraryPick below): the founder's own test run showed a lock repeatedly
// contradicted by real answers just sat there immune, with contradiction
// surfacing only as a reflective question at the very end - too weak. A
// pick that AGREES with the lock (reinforcing it) still does nothing, since
// there's no new information in confirming what was already declared.
function clampCalibrationDelta(axis, rawDelta) {
  const current = onboardForm.calibrationSum[axis] || 0;
  const next = Math.max(-3, Math.min(3, current + rawDelta));
  const effective = next - current;
  onboardForm.calibrationSum[axis] = next;
  return effective;
}
// v11: per-pick magnitude doubled (±1 -> ±2) per founder request - after
// running onboarding themselves, one or two consistent picks on an axis
// felt too weak to "prove" real intent, and 6 cards' worth of answers
// barely moved the before/after comparison. The ±3 cumulative cap (v6) is
// UNCHANGED - this just means ~2 consistent picks reach it instead of 3,
// so the calibrated radar responds faster to a clear pattern without
// widening how far any single axis can drift from the manual-drag radar.
const CALIBRATION_PICK_MAGNITUDE = 2;

// v12: mirrors computeLockTension's server-side "contrary" definition
// (server/claude.js) exactly, but must run client-side, live, per pick -
// not just reconstructed afterward for a narrative blurb. Judged against
// lockedOriginalValue (the value AT THE MOMENT OF LOCKING), never the live
// radar value - otherwise an axis eroding past the 5-midpoint would flip
// what counts as "contrary" partway through the same session, corrupting
// its own erosion direction.
function isContraryPick(axis, sign) {
  const original = onboardForm.lockedOriginalValue[axis];
  if (original == null) return false; // shouldn't happen for a locked axis, but never treat as contrary if untracked
  return (original > 5 && sign === -1) || (original < 5 && sign === 1);
}

function applyCalibrationCard(card) {
  [[card.mostPreferred, 1], [card.leastPreferred, -1]].forEach(([axis, sign]) => {
    if (onboardForm.locked.includes(axis) && !isContraryPick(axis, sign)) return; // locked + agrees with the lock: no new info, no movement
    const delta = clampCalibrationDelta(axis, sign * CALIBRATION_PICK_MAGNITUDE);
    // A locked axis that IS eroding needs to be excluded from its OWN
    // lockedKeys for this one drag call (it's the key being dragged), while
    // every other still-locked axis stays fully immune to the redistribution
    // this triggers - that's what .filter((k) => k !== axis) does; for an
    // unlocked axis this is a no-op (axis was never in the list).
    const dragLocks = onboardForm.locked.filter((k) => k !== axis);
    onboardForm.radar = applySynergyDrag(
      onboardForm.radar, axis, onboardForm.radar[axis] + delta, dragLocks
    ).values;
  });
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
  // Design-handoff usability round: question reframed from "describe yourself
  // now" to "where do you want to focus" - user-tested copy, keep verbatim.
  { type: "radar", q: "Ke mana kamu mau fokus sekarang?", sub: "Ini bukan soal gimana kondisimu sekarang — tapi area mana yang mau kamu prioritaskan ke depan. Tarik titik-titiknya buat nunjukin porsi fokusnya. Menonjolkan satu sisi bikin sisi lain sedikit mengecil, karena waktu & energimu terbatas." },
];

function isStepValid(step) {
  const s = ONBOARD_STEPS[step];
  if (s.type === "radar") return true;
  // Privacy consent moved from a separate checkbox to a caption under the
  // primary button (design-handoff round) - tapping Lanjut IS the consent,
  // so only the name gates this step now.
  return onboardForm.name.trim().length > 0;
}

// Point at a RAW radius (not value-space) along axis i - the instrument
// chrome (bezel, scale rings, ticks) is drawn in radius-space per the design
// spec ("~36%, ~68%, 100% of max radius"), unlike the data polygon which
// stays in value-space via polyPoint.
function radiusPoint(index, r) {
  const angle = ((-90 + index * POLY_STEP_DEG) * Math.PI) / 180;
  return [POLY_CENTER + r * Math.cos(angle), POLY_CENTER + r * Math.sin(angle)];
}
function heptagonPath(r) {
  return POLY_ORDER.map((_, i) => {
    const [x, y] = radiusPoint(i, r);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + "Z";
}
// Axis label layout shared by render + updatePolygonDOM: 8px mono, wrapped
// to two lines when the name is two words (Emotional Stability), locked
// axis's label tinted accent. Returns {x, y, anchor, lines, dx, dy}.
function axisLabelLayout(i) {
  const angle = ((-90 + i * POLY_STEP_DEG) * Math.PI) / 180;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const x = POLY_CENTER + (POLY_MAXR + 18) * dx;
  const y = POLY_CENTER + (POLY_MAXR + 18) * dy + (dy > 0.35 ? 9 : dy < -0.35 ? -4 : 3.5);
  const anchor = dx > 0.35 ? "start" : dx < -0.35 ? "end" : "middle";
  const label = statLabel(POLY_ORDER[i]);
  const lines = label.includes(" ") ? label.split(" ") : [label];
  return { x, y, anchor, lines, dx, dy };
}
function renderPolygonSVG() {
  const radar = onboardForm.radar;
  const points = POLY_ORDER.map((k, i) => polyPoint(i, radar[k]));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + "Z";
  // Instrument chrome (design handoff Screen 1): a faint outer bezel, three
  // DASHED dim scale rings, SOLID brighter axis lines - the key hierarchy
  // fix, axis and scale ring are no longer two same-opacity hairlines - and
  // small open tick circles at the outer vertices.
  const bezel = `<path d="${heptagonPath(POLY_MAXR + 7)}" class="poly-bezel" />`;
  const rings = [0.36, 0.68, 1].map((f) => `<path d="${heptagonPath(f * POLY_MAXR)}" class="poly-ring" />`).join("");
  const axisLines = POLY_ORDER.map((_, i) => {
    const [x, y] = radiusPoint(i, POLY_MAXR);
    return `<line x1="${POLY_CENTER}" y1="${POLY_CENTER}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="poly-axis" />`;
  }).join("");
  const ticks = POLY_ORDER.map((_, i) => {
    const [x, y] = radiusPoint(i, POLY_MAXR);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" class="poly-tick" />`;
  }).join("");
  const MONO_CHAR_W = 4.9; // IBM Plex Mono advance width at 8px, for icon placement
  const labels = POLY_ORDER.map((k, i) => {
    const L = axisLabelLayout(i);
    const isLocked = onboardForm.locked.includes(k);
    const tspans = L.lines.map((line, li) => `<tspan x="${L.x.toFixed(1)}" dy="${li === 0 ? 0 : 8.5}">${esc(line)}</tspan>`).join("");
    // The (i) info icon sits just past the label text (which grows toward
    // anchor direction), with an oversized invisible hit circle - r=6 visual
    // alone is too small a touch target.
    const maxChars = Math.max(...L.lines.map((l) => l.length));
    const w = maxChars * MONO_CHAR_W;
    const iconX = L.anchor === "start" ? L.x + w + 10 : L.anchor === "end" ? L.x - w - 10 : L.x + w / 2 + 11;
    const iconY = L.y - 3;
    return `<text x="${L.x.toFixed(1)}" y="${L.y.toFixed(1)}" class="poly-label ${isLocked ? "locked" : ""}" data-label-for="${k}" text-anchor="${L.anchor}">${tspans}</text>
      <g class="axis-info-btn" data-axis-info="${k}">
        <circle cx="${iconX.toFixed(1)}" cy="${iconY.toFixed(1)}" r="12" class="axis-info-hit" />
        <circle cx="${iconX.toFixed(1)}" cy="${iconY.toFixed(1)}" r="6" class="axis-info-bg" />
        <text x="${iconX.toFixed(1)}" y="${(iconY + 2.8).toFixed(1)}" class="axis-info-glyph" text-anchor="middle">i</text>
      </g>`;
  }).join("");
  // Visual dot (small, per design: outlined when free, SOLID accent when
  // locked - never green, never a 🔒 glyph) is separate from the invisible
  // oversized hit circle that keeps drag/tap usable on touch. The numeric
  // value sits just inside each dot, 1-decimal per the instrument spec,
  // with a bg-colored stroke so it stays legible over the dashed rings.
  const handles = POLY_ORDER.map((k, i) => {
    const [x, y] = polyPoint(i, radar[k]);
    const isLocked = onboardForm.locked.includes(k);
    const angle = ((-90 + i * POLY_STEP_DEG) * Math.PI) / 180;
    const vx = x - 14 * Math.cos(angle), vy = y - 14 * Math.sin(angle);
    return `<text x="${vx.toFixed(1)}" y="${(vy + 2.8).toFixed(1)}" class="poly-value ${isLocked ? "locked" : ""}" data-value-for="${k}" text-anchor="middle">${Number(radar[k]).toFixed(1)}</text>
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${isLocked ? 6.5 : 5}" class="poly-dot ${isLocked ? "locked" : ""}" data-dot-for="${k}" />
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="14" class="poly-handle" data-stat="${k}" />`;
  }).join("");
  const centerDot = `<circle cx="${POLY_CENTER}" cy="${POLY_CENTER}" r="3" class="poly-center" />`;
  return `<svg viewBox="${POLY_VIEW_MIN} ${POLY_VIEW_MIN} ${POLY_VIEW_SIZE} ${POLY_VIEW_SIZE}" class="poly-svg" id="polySvg">${bezel}${rings}${axisLines}${ticks}<path d="${pathD}" class="poly-shape" id="polyShape" />${centerDot}${labels}${handles}</svg>`;
}

// Read-only before/after comparison for Chapter Analysis (v7, WAJIB tampil):
// two outlines overlaid on one chart (raw = dashed/muted, calibrated =
// solid/accent) sharing the same rings/axis-label chrome as the interactive
// radar, so the user sees the SHAPE change directly rather than reading text
// that just says "it changed." No handles, no drag - purely a picture.
function renderRadarComparisonSVG(radarRaw, radarCalibrated) {
  const pathFor = (radar) => {
    const points = POLY_ORDER.map((k, i) => polyPoint(i, radar[k]));
    return points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + "Z";
  };
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
    const angle = ((-90 + i * POLY_STEP_DEG) * Math.PI) / 180;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const x = POLY_CENTER + (POLY_MAXR + 12) * dx;
    const y = POLY_CENTER + (POLY_MAXR + 12) * dy + (dy > 0.35 ? 9 : dy < -0.35 ? -2 : 3.5);
    const anchor = dx > 0.35 ? "start" : dx < -0.35 ? "end" : "middle";
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="poly-label" text-anchor="${anchor}">${esc(statLabel(k))}</text>`;
  }).join("");
  return `<svg viewBox="${POLY_VIEW_MIN} ${POLY_VIEW_MIN} ${POLY_VIEW_SIZE} ${POLY_VIEW_SIZE}" class="poly-svg poly-compare" id="polyCompareSvg">
    ${rings}${axisLines}
    <path d="${pathFor(radarRaw)}" class="poly-shape-raw" id="polyShapeRaw" />
    <path d="${pathFor(radarCalibrated)}" class="poly-shape-calibrated" id="polyShapeCalibrated" />
    ${labels}
  </svg>
  <div class="poly-compare-legend">
    <span class="legend-item"><span class="legend-dot raw"></span>Radar awal</span>
    <span class="legend-item"><span class="legend-dot calibrated"></span>Terkalibrasi</span>
  </div>`;
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
    }
    const dot = svg.querySelector(`circle[data-dot-for="${k}"]`);
    if (dot) {
      dot.setAttribute("cx", x.toFixed(1));
      dot.setAttribute("cy", y.toFixed(1));
      dot.setAttribute("r", isLocked ? "6.5" : "5");
      dot.classList.toggle("locked", isLocked);
    }
    const valueText = svg.querySelector(`text[data-value-for="${k}"]`);
    if (valueText) {
      const angle = ((-90 + i * POLY_STEP_DEG) * Math.PI) / 180;
      const vx = x - 14 * Math.cos(angle), vy = y - 14 * Math.sin(angle);
      valueText.setAttribute("x", vx.toFixed(1));
      valueText.setAttribute("y", (vy + 2.8).toFixed(1));
      valueText.textContent = Number(onboardForm.radar[k]).toFixed(1);
      valueText.classList.toggle("locked", isLocked);
    }
    const labelText = svg.querySelector(`text[data-label-for="${k}"]`);
    if (labelText) labelText.classList.toggle("locked", isLocked);
  });
  const points = POLY_ORDER.map((k, i) => polyPoint(i, onboardForm.radar[k]));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + "Z";
  document.getElementById("polyShape")?.setAttribute("d", pathD);
}

// One-time hint the first time a user locks any axis this session - a
// transient teaching moment, deliberately NOT a persistent badge (the
// persistent "TERKUNCI" badge pattern was tried and rejected in the
// design-handoff usability round).
let lockExplainerShown = false;
// Which axis's definition panel is expanded below the radar chart (null =
// none, zero height, no placeholder). Local UI state only - never persisted,
// never touches onboarding data.
let openAxisInfo = null;
function toggleLock(key) {
  const i = onboardForm.locked.indexOf(key);
  if (i >= 0) {
    onboardForm.locked.splice(i, 1);
    delete onboardForm.lockedOriginalValue[key]; // re-locking later re-captures fresh
  } else if (onboardForm.locked.length < MAX_LOCKS) {
    onboardForm.locked.push(key);
    // Snapshot the value AT THE MOMENT OF LOCKING - this is what "contrary"
    // erosion (applyCalibrationCard) measures against for the rest of the
    // session, not the live/possibly-already-eroded radar value. Without
    // this, an axis eroding past the 5-midpoint would flip what counts as
    // "contrary" partway through calibration (see v12 riwayat in PRD.md).
    onboardForm.lockedOriginalValue[key] = onboardForm.radar[key];
    if (!lockExplainerShown) {
      lockExplainerShown = true;
      const el = document.getElementById("lockExplainer");
      if (el) {
        el.textContent = "Terkunci — axis ini nggak akan ikut bergeser walau axis lain kamu ubah. Tap lagi buat buka kuncinya.";
        el.style.display = "";
      }
    }
  }
  // At the cap, tapping a 4th point deliberately does nothing - the user has
  // to unlock one first (the "maksimal 3 axis" bullet above the chart says so).
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
      el.textContent = `${statLabel(key)} udah di titik paling jauh yang bisa dicapai bareng kombinasi sekarang.`;
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
      <p class="fr" style="font-size:15.5px;line-height:1.6;font-style:italic;color:var(--muted);margin:18px 0">${esc(step.promiseText)}</p>`;
  } else if (step.type === "radar") {
    // Design handoff Screen 1: the two bullets below are the ONLY
    // always-visible explanatory copy on this screen - the old persistent
    // "N/3 terkunci" counter line and any "tap the icon" prompt were
    // explicitly rejected in usability testing. Locking feedback is the
    // solid-gold dot itself plus a one-time #lockExplainer reveal.
    bodyHTML = `
      <ul style="font-size:11px;line-height:1.6;color:var(--muted);padding-left:16px;margin:0 0 22px">
        <li>Tap titik di sudut radar untuk mengunci axis itu — <span style="color:var(--accent);font-weight:600">maksimal 3 axis</span> boleh dikunci.</li>
        <li>Tap ikon <span class="axis-info-chip mono">i</span> untuk lihat penjelasan axis-nya.</li>
      </ul>
      <div class="poly-wrap">${renderPolygonSVG()}</div>
      <p class="mono" id="limitHint" style="font-size:12px;color:var(--accent);margin-top:10px;text-align:center;display:none"></p>
      <p class="mono" id="lockExplainer" style="font-size:12px;color:var(--accent);margin-top:6px;text-align:center;display:none"></p>
      ${openAxisInfo ? `
      <div style="background:#1a1724;border:1px solid rgba(216,163,85,.3);border-radius:10px;padding:12px 14px;margin-top:12px">
        <div class="mono" style="font-size:10px;letter-spacing:1px;color:var(--accent);margin-bottom:4px">${esc(statLabel(openAxisInfo).toUpperCase())}</div>
        <div style="font-size:12.5px;line-height:1.5;color:var(--text)">${esc(AXIS_DEFINITIONS[openAxisInfo] || "")}</div>
      </div>` : ""}`;
  }

  root.innerHTML = `
    <div class="shell">
      ${step.type === "radar" ? helpBtnHTML("radar") + helpSheetHTML("radar") : ""}
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
      ${step.type === "namePromise" ? `<p style="font-size:12px;line-height:1.6;color:var(--muted);text-align:center;margin:14px 0 0">Dengan tap Lanjut, kamu setuju dengan pesan privasi di atas.</p>` : ""}
    </div>`;

  const fld = document.getElementById("fld");
  if (fld) fld.addEventListener("input", (e) => {
    onboardForm.name = e.target.value;
    document.getElementById("next").disabled = !isStepValid(onboardStep);
  });
  if (step.type === "radar") attachPolygonHandlers();
  // Per-axis (i) info icons live inside the SVG - tapping one toggles which
  // axis's definition panel shows below the chart. Full re-render is safe
  // here: no text input on this screen, no drag in progress during a tap.
  document.querySelectorAll("[data-axis-info]").forEach((el) => el.addEventListener("click", (e) => {
    e.stopPropagation();
    const axis = el.dataset.axisInfo;
    openAxisInfo = openAxisInfo === axis ? null : axis;
    renderOnboarding();
  }));
  document.getElementById("back")?.addEventListener("click", () => { onboardStep = Math.max(0, onboardStep - 1); renderOnboarding(); });
  document.getElementById("next").addEventListener("click", () => {
    if (!isStepValid(onboardStep)) return;
    if (!last) { onboardStep++; renderOnboarding(); return; }
    // Static steps done - freeze the pre-calibration radar for audit, then
    // hand off to the adaptive AI-driven phase.
    onboardForm.radarRaw = { ...onboardForm.radar };
    adaptivePhase = "loading";
    adaptiveCards = [];
    ui = { view: "adaptive" };
    render();
    fetchScenarioCard();
  });
}

async function fetchScenarioCard() {
  onboardError = "";
  try {
    const result = await api("/api/onboarding/scenario-card", {
      method: "POST",
      body: {
        profile: { name: onboardForm.name },
        radarSnapshot: onboardForm.radar,
        lockedAxes: onboardForm.locked,
        previousCards: adaptiveCards,
      },
    });
    // Server decides when the choice pattern is consistent enough AND every
    // unlocked axis has been tested at least once (min 2, max 6 - enforced
    // server-side, not just requested here) - confident:true means stop and
    // move straight to Chapter Analysis instead of showing another card.
    if (result.confident) {
      await fetchChapterAnalysis();
      return;
    }
    adaptiveScenario = { scenario: result.scenario, options: result.options };
    adaptiveSelection = { mostPreferred: null, leastPreferred: null };
    adaptivePhase = "card";
    render();
  } catch (e) {
    onboardError = e.message;
    adaptivePhase = "card";
    adaptiveScenario = null;
    render();
  }
}

// Task 9: sub-pathway archetype for a given pathway, from the fixed 15-name
// catalog - same randomness idiom as the wildcard Pathway pick just below.
function pickRandomSubPathway(pathway) {
  const options = SUB_PATHWAY_NAMES[pathway] || [];
  return options[Math.floor(Math.random() * options.length)] || pathway;
}
// 3 candidate Pathway cards (v7, replaces the single fixed recommendation):
// #1 calibrated (from chapterAnalysis.pathway - the full-context AI pick),
// #2 raw-radar (from rawPathwayTop2, falling back to the 2nd-strongest if
// the strongest collides with #1), #3 a random wildcard from whatever's
// left. Computed ONCE per analysis (not on every re-render) so the wildcard
// (and, since Task 9, the sub-pathway archetype for #2/#3) doesn't shuffle
// out from under the user while they're looking at it.
function buildPathwayOptions(analysis) {
  const option1 = {
    // Task 9: server already validated/patched this to a member of
    // SUB_PATHWAY_NAMES[analysis.pathway] (normalizeSubPathway) - client
    // trusts it directly, same as it already trusts analysis.pathway.
    pathway: analysis.pathway, pathwayNoun: analysis.subPathway,
    blurb: analysis.pathwayBlurb, source: "calibrated",
  };
  const rawTop2 = analysis.rawPathwayTop2 || [];
  let rawPick = rawTop2[0];
  if (!rawPick || rawPick.pathway === option1.pathway) rawPick = rawTop2[1];
  if (!rawPick || rawPick.pathway === option1.pathway) {
    rawPick = { pathway: PATHWAY_NAMES.find((p) => p !== option1.pathway) || option1.pathway, blurb: "Berdasarkan radar awal sebelum kalibrasi." };
  }
  // Task 9: #2/#3 never get full-context AI reasoning (raw ignores the
  // scenario cards; wildcard is pure random), so their archetype is ALSO
  // client-random - matches the existing levels-of-curation already in this
  // function (#1 = full AI, #2-3 = lighter-touch), not a new inconsistency.
  const option2 = { pathway: rawPick.pathway, pathwayNoun: pickRandomSubPathway(rawPick.pathway), blurb: rawPick.blurb, source: "raw" };
  const remaining = PATHWAY_NAMES.filter((p) => p !== option1.pathway && p !== option2.pathway);
  const wildcard = remaining[Math.floor(Math.random() * remaining.length)] || option1.pathway;
  const option3 = { pathway: wildcard, pathwayNoun: pickRandomSubPathway(wildcard), blurb: "Coba lihat arah yang beda.", source: "wildcard" };
  return [option1, option2, option3];
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
        radarRaw: onboardForm.radarRaw,
        lockedAxes: onboardForm.locked,
        lockedOriginalValue: onboardForm.lockedOriginalValue,
        cards: adaptiveCards,
      },
    });
    pathwayOptions = buildPathwayOptions(chapterAnalysis);
    selectedPathwayIndex = null;
    adaptivePhase = "analysis";
    render();
  } catch (e) {
    onboardError = e.message;
    // Fall back to the card phase with no current scenario, so the retry
    // button re-asks the server - which re-evaluates confidence and routes
    // straight back here once satisfied. No dead end, no stale card shown.
    adaptivePhase = "card";
    adaptiveScenario = null;
    render();
  }
}

async function submitOnboarding(pathway, pathwayNoun, goals) {
  root.innerHTML = spinnerHTML("AI sedang membaca ceritamu...");
  try {
    await api("/api/profile", {
      method: "POST",
      body: {
        name: onboardForm.name, radarSnapshot: onboardForm.radar, radarRaw: onboardForm.radarRaw,
        originStory: chapterAnalysis?.insight || null,
        pathway, pathwayNoun, secondaryTrait: chapterAnalysis?.secondaryTrait || null,
        goals: goals || [],
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
    const sel = adaptiveSelection;
    const bothPicked = sel.mostPreferred && sel.leastPreferred;
    const instruction = !sel.mostPreferred
      ? "Tap opsi yang paling kamu suka."
      : !sel.leastPreferred
        ? "Sekarang tap satu dari sisanya yang paling nggak sesuai sama kamu."
        : "Siap lanjut, atau tap ulang buat ganti pilihan.";
    root.innerHTML = `
      <div class="shell">
        ${helpBtnHTML("card")}${helpSheetHTML("card")}
        <div class="eyebrow mono">ELEVA · ONBOARDING</div>
        <div class="mono" style="font-size:11px;color:var(--muted);letter-spacing:1px;margin-bottom:20px">KARTU KE-${adaptiveCards.length + 1}</div>
        ${onboardError ? `<p style="color:var(--rust);font-size:13.5px;margin:0 0 16px">${esc(onboardError)}</p>` : ""}
        ${!adaptiveScenario ? `<button class="btn-primary" id="retryCard">Coba lagi</button>` : `
        <div class="fadeUp">
          <div class="quest-card" style="margin-bottom:14px">
            <p class="fr" style="font-size:19px;line-height:1.65;margin:0;font-weight:500">${esc(adaptiveScenario.scenario)}</p>
          </div>
          <p style="color:var(--muted);font-size:13px;margin:0 0 14px;text-align:center">${esc(instruction)}</p>
          <div class="scenario-options">
            ${adaptiveScenario.options.map((opt) => {
              const isFav = sel.mostPreferred === opt.axis;
              const isLeast = sel.leastPreferred === opt.axis;
              const cls = isFav ? "favorite" : isLeast ? "least" : "";
              const tag = isFav ? "👍" : isLeast ? "👎" : "";
              return `<button class="scenario-opt ${cls}" data-axis="${opt.axis}">${tag ? `<span class="opt-tag">${tag}</span>` : ""}${esc(opt.text)}</button>`;
            }).join("")}
          </div>
          <button class="btn-primary full" id="confirmCard" style="margin-top:18px" ${bothPicked ? "" : "disabled"}>Lanjut →</button>
        </div>`}
      </div>`;
    document.getElementById("retryCard")?.addEventListener("click", fetchScenarioCard);
    document.querySelectorAll(".scenario-opt").forEach((btn) => {
      btn.addEventListener("click", () => {
        const axis = btn.dataset.axis;
        if (adaptiveSelection.mostPreferred === axis) {
          adaptiveSelection = { mostPreferred: null, leastPreferred: null };
        } else if (adaptiveSelection.leastPreferred === axis) {
          adaptiveSelection.leastPreferred = null;
        } else if (!adaptiveSelection.mostPreferred) {
          adaptiveSelection.mostPreferred = axis;
        } else if (!adaptiveSelection.leastPreferred) {
          adaptiveSelection.leastPreferred = axis;
        } else {
          adaptiveSelection = { mostPreferred: axis, leastPreferred: null };
        }
        renderAdaptive();
      });
    });
    document.getElementById("confirmCard")?.addEventListener("click", async () => {
      const card = {
        scenario: adaptiveScenario.scenario, options: adaptiveScenario.options,
        mostPreferred: adaptiveSelection.mostPreferred, leastPreferred: adaptiveSelection.leastPreferred,
      };
      try {
        applyCalibrationCard(card);
      } catch (e) {
        onboardError = "Gagal menerapkan kalibrasi: " + e.message;
        renderAdaptive();
        return;
      }
      adaptiveCards.push(card);
      adaptivePhase = "loading";
      render();
      // fetchScenarioCard re-evaluates choice-pattern consistency AND axis
      // coverage with the updated card list, and internally redirects to
      // fetchChapterAnalysis once satisfied (min 2/max 6, full unlocked-axis
      // coverage - all enforced server-side) - no fixed-count loop needed here.
      await fetchScenarioCard();
    });
    return;
  }

  if (adaptivePhase === "analysis") {
    const flaggedLock = chapterAnalysis?.lockTension || [];
    // Design handoff Screen 2: tarot-card footers carry a short templated
    // "why this fits" line instead of the pathway's display name - built
    // purely from data already on the client (radar top-axes / a static
    // per-pathway phrase), no new scoring, per the handoff's hard
    // "copy/template work only" constraint.
    const top2 = (radar) => Object.entries(radar || {}).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => statLabel(k));
    const whyLine = (opt) => {
      if (opt.source === "calibrated") return `Cocok karena radarmu condong ke ${top2(onboardForm.radar).join(" & ")}.`;
      if (opt.source === "raw") return `Sebelum kalibrasi, kamu condong ke ${top2(onboardForm.radarRaw || onboardForm.radar).join(" & ")}.`;
      return `Arah alternatif kalau kamu ingin ${PATHWAY_ALT_PHRASE[opt.pathway] || "mencoba gaya yang beda"}.`;
    };
    const numerals = ["I", "II", "III"];
    root.innerHTML = `
      <div class="shell">
        ${helpBtnHTML("analysis")}${helpSheetHTML("analysis")}
        <div class="eyebrow mono">ELEVA · CHAPTER ANALYSIS</div>
        <div style="height:20px"></div>
        <p class="fr" style="font-size:17px;line-height:1.7;margin:0 0 20px">${esc(chapterAnalysis?.insight || "")}</p>
        <div class="poly-wrap" style="flex-direction:column;align-items:center;margin-bottom:14px">
          ${renderRadarComparisonSVG(onboardForm.radarRaw || onboardForm.radar, onboardForm.radar)}
        </div>
        ${chapterAnalysis?.significantShifts?.length ? `
        <p class="mono" style="font-size:11.5px;color:var(--muted);margin:0 0 12px;line-height:1.6">
          Kalibrasi radar: ${chapterAnalysis.significantShifts.map((s) => `${esc(statLabel(s.axis))} ${s.from}→${s.to}`).join(", ")} — bergeser dari radar awalmu berdasarkan pilihan-pilihanmu barusan.
        </p>` : ""}
        ${flaggedLock.length ? `
        <p class="mono" style="font-size:11.5px;color:var(--accent);margin:0 0 20px;line-height:1.6">
          Ketegangan kunci: pilihan-pilihanmu di kartu beberapa kali condong berlawanan dari sumbu yang kamu kunci (${flaggedLock.map((a) => esc(statLabel(a))).join(", ")}) — angkanya tetap seperti kamu kunci, tapi layak dipikir ulang kalau mau, lihat insight di atas.
        </p>` : ""}
        ${chapterAnalysis?.secondaryTrait ? `<p class="why" style="margin:0 0 16px">Trait tambahan yang kelihatan: ${esc(chapterAnalysis.secondaryTrait)}</p>` : ""}
        <div class="eyebrow mono" style="margin-top:4px;color:var(--accent)">PILIH PATHWAY</div>
        <p style="font-size:11.5px;line-height:1.65;color:var(--muted);margin:0 0 16px">Pathway adalah <span style="color:var(--accent);font-weight:600">cara</span> kamu ngerjain quest sehari-hari — bukan tujuannya. Tujuannya (<span style="color:var(--text);font-weight:600">goal kamu sendiri</span>) dipilih di step berikutnya. Tap salah satu kartu buat lanjut.</p>
        <div class="tarot-carousel">
          ${pathwayOptions.map((opt, i) => {
            const primary = opt.source === "calibrated";
            return `
            <div class="tarot-card ${primary ? "primary" : ""}" data-idx="${i}">
              <div class="tarot-art">
                <div class="tarot-numeral mono">${numerals[i] || ""}</div>
                ${primary ? `<div class="tarot-stars"></div>` : ""}
              </div>
              <div class="tarot-footer">
                <div class="tarot-label mono">${opt.source === "calibrated" ? "REKOMENDASI UTAMA" : opt.source === "raw" ? "DARI RADAR AWAL" : "COBA ARAH LAIN"}</div>
                <div class="tarot-why">${esc(whyLine(opt))}</div>
              </div>
            </div>`;
          }).join("")}
        </div>
      </div>`;
    // Tap = confirm (design handoff): no separate CTA under the carousel
    // anymore - tapping a card IS the confirmation, straight into Goal
    // Capture. This also sidesteps the old bug where confirming re-rendered
    // this same carousel in place and reset its scroll position (most
    // visible when picking the rightmost/wildcard card) - the screen changes
    // entirely now instead. The free-text override entry moved to the Goal
    // Capture screen (founder decision, 10 Agustus - the handoff flagged
    // "confirm with product" and the answer was relocate, not cut).
    document.querySelectorAll(".tarot-card").forEach((card) => {
      card.addEventListener("click", () => {
        const idx = Number(card.dataset.idx);
        const chosen = pathwayOptions[idx];
        selectedPathwayIndex = idx;
        pendingPathway = { pathway: chosen.pathway, pathwayNoun: chosen.pathwayNoun };
        adaptivePhase = "goals";
        renderAdaptive();
      });
    });
    return;
  }

  if (adaptivePhase === "goals") {
    const filled = goalInputs.map((g) => g.trim()).filter(Boolean);
    const pw = pendingPathway?.pathway || "";
    // "The Warden" style heading per the mockup - the "The" prefix only fits
    // the 5 canonical names; a free-text override shows the user's own words.
    const heading = PATHWAY_NAMES.includes(pw) ? `The ${pw}` : pw;
    const numerals = ["i.", "ii.", "iii."];
    root.innerHTML = `
      <div class="shell">
        ${helpBtnHTML("goals")}${helpSheetHTML("goals")}
        <div class="eyebrow mono">PATHWAY TERPILIH</div>
        <h1 class="fr" style="font-size:26px;font-weight:600;color:var(--accent);margin:10px 0 4px">${esc(heading)}</h1>
        <div class="ornament-divider"><div class="line l"></div><div class="diamond"></div><div class="line r"></div></div>
        <p style="font-size:12.5px;line-height:1.65;color:var(--muted);margin:0 0 26px">${esc(pw)} adalah gaya kerjamu (HOW). Tiga niat di bawah ini adalah tujuan konkretmu (WHAT) untuk 14 hari pertama.</p>
        <div class="goal-manuscript">
          ${[0, 1, 2].map((i) => `
          <div class="goal-entry">
            <div class="goal-numeral mono${i === 2 && !goalInputs[2].trim() ? " dim" : ""}" id="goalNum${i}">${numerals[i]}</div>
            <input type="text" class="goal-input" data-goal="${i}" maxlength="200" value="${esc(goalInputs[i])}" placeholder="${i === 2 ? "Opsional" : esc(goalPlaceholder(pendingPathway))}" />
          </div>`).join("")}
        </div>
        <button class="btn-primary full" id="confirmGoals" style="margin-top:26px" ${filled.length ? "" : "disabled"}>Mulai First Trial (14 hari)</button>
        <div style="text-align:center;margin-top:14px">
          <button class="btn-ghost" id="backToPathway">← Balik pilih Pathway</button>
          ${!overrideMode ? `<button class="btn-ghost" id="openOverride" style="display:block;margin:4px auto 0">Bukan salah satu dari kartu tadi? Tulis pathway-mu sendiri</button>` : ""}
        </div>
        ${overrideMode ? `
        <div class="field" style="margin-top:14px">
          <label>Pathway yang mau kamu latih</label>
          <input type="text" id="overrideInput" value="${esc(overrideText)}" placeholder="Tulis sendiri, mis. Sales, Public Speaking..." autofocus />
        </div>
        <div style="display:flex;gap:10px">
          <button class="btn-ghost" id="cancelOverride" style="flex:1">Batal</button>
          <button class="btn-primary" id="confirmOverride" style="flex:2" ${overrideText.trim().length > 1 ? "" : "disabled"}>Pakai ini</button>
        </div>` : ""}
      </div>`;
    document.querySelectorAll("input[data-goal]").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        goalInputs[Number(inp.dataset.goal)] = e.target.value;
        const any = goalInputs.some((g) => g.trim());
        document.getElementById("confirmGoals").disabled = !any;
        // The optional third numeral brightens the moment it has content -
        // direct DOM write, no re-render (typing must never lose focus).
        if (inp.dataset.goal === "2") document.getElementById("goalNum2")?.classList.toggle("dim", !goalInputs[2].trim());
      });
    });
    document.getElementById("backToPathway")?.addEventListener("click", () => {
      pendingPathway = null;
      overrideMode = false;
      adaptivePhase = "analysis";
      renderAdaptive();
    });
    // Free-text pathway override, relocated here from the carousel screen
    // (founder decision after the design handoff removed its old entry
    // point). End state is identical to the old flow: pendingPathway
    // becomes the typed text verbatim, never coerced into the 15-archetype
    // catalog - the heading/recap/placeholders just re-render around it.
    document.getElementById("openOverride")?.addEventListener("click", () => { overrideMode = true; overrideText = ""; renderAdaptive(); });
    document.getElementById("cancelOverride")?.addEventListener("click", () => { overrideMode = false; renderAdaptive(); });
    document.getElementById("overrideInput")?.addEventListener("input", (e) => {
      overrideText = e.target.value;
      document.getElementById("confirmOverride").disabled = overrideText.trim().length <= 1;
    });
    document.getElementById("confirmOverride")?.addEventListener("click", () => {
      const v = overrideText.trim();
      pendingPathway = { pathway: v, pathwayNoun: v };
      overrideMode = false;
      renderAdaptive();
    });
    document.getElementById("confirmGoals")?.addEventListener("click", () => {
      const goals = goalInputs.map((g) => g.trim()).filter(Boolean).slice(0, 3);
      if (!goals.length || !pendingPathway) return;
      submitOnboarding(pendingPathway.pathway, pendingPathway.pathwayNoun, goals);
    });
  }
}

// Compact one-line summary of a day's structured completion data - shown on
// the finished quest card and in history, so the numbers stay visible as the
// progressive baseline they are.
// Fokus 0: durasi is typed as MM:SS (mis. "20:01"), not a bare integer -
// internally still tracked as decimal minutes (durasiMenit) everywhere else
// (pace calc, target metrics, server validation) so only the input/display
// layer changes. Accepts a bare number too ("20" -> 20:00) for tolerance.
function parseDurasiMenit(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,3}):([0-5]?\d)$/);
  if (m) return Number(m[1]) + Number(m[2]) / 60;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function mmss(decimalMinutes) {
  const m = Math.floor(decimalMinutes);
  const s = Math.round((decimalMinutes - m) * 60);
  const mm = s === 60 ? m + 1 : m;
  const ss = s === 60 ? 0 : s;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}
// Fokus 2.1: pace (min/km) is pure display, derived live from Durasi+Jarak
// as the user types - not a field of its own, nothing new to fill in or
// validate, matches what a device like Strava would show while running.
function paceLabel(durasiMenit, jarakKm) {
  const dur = Number(durasiMenit), jarak = Number(jarakKm);
  if (!dur || !jarak || dur <= 0 || jarak <= 0) return null;
  return `${mmss(dur / jarak)} /km`;
}

function structSummary(sd) {
  if (!sd) return "";
  if (sd.kind === "gym") {
    return `${sd.gerakan} · ${sd.set}×${sd.repetisi}${sd.bebanKg != null ? ` @ ${sd.bebanKg}kg` : ""} · titik gagal di ${sd.titikGagal}`;
  }
  const jenis = sd.jenisAktivitas === "Lainnya" ? (sd.jenisLainnya || "Lainnya") : sd.jenisAktivitas;
  return `${jenis} · ${mmss(sd.durasiMenit)}${sd.jarakKm != null ? ` · ${sd.jarakKm} km` : ""} · ${sd.titikBerat}${sd.titikBeratDetail ? ` (${sd.titikBeratDetail})` : ""}`;
}

// Renders one open quest as a card - every card is equally "current" now
// (per-goal model: nothing ever expires or goes stale, a quest just sits
// open until its own goal's button is tapped), so there's no more today-
// vs-missed distinction to style differently. goalLabel names which of the
// user's (up to 3) goals this specific card is working toward - essential
// once more than one card can be on screen at once.
// Provisional 24h countdown (founder request, 10 Agustus - explicitly
// "sementara" while the real next solution gets figured out later): unlike
// the old rolling-window countdown this fix's Fokus 1 removed, this one
// NEVER causes the quest to be silently replaced/regenerated - the quest
// stays exactly where it is, only the "Mulai" button locks out past 24h.
// A goal whose only open quest locks out this way has no automatic
// recovery yet (known, accepted gap per the founder's own words).
function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function questSummaryCard(q, goalLabel) {
  if (!q) return `<div class="quest-card"><div class="dot pending"></div>${spinnerHTML("AI sedang menyusun quest...")}</div>`;
  const label = q.quest.mode === "acting" ? "ACTING METHOD" : "QUEST";
  const remaining = q.createdAt ? new Date(q.createdAt).getTime() + 24 * 60 * 60 * 1000 - Date.now() : null;
  const expired = remaining != null && remaining <= 0;
  return `
    <div class="quest-card">
      <div class="dot pending"></div>
      <div class="qlabel mono">${label}${goalLabel ? ` · ${esc(goalLabel)}` : ""}${q.quest.statFocus ? ` · ${esc(statLabel(q.quest.statFocus))}` : ""}</div>
      <h2 class="fr">${esc(q.quest.title)}</h2>
      <p class="desc">${esc(q.quest.description)}</p>
      <p class="why">${esc(q.quest.why)}</p>
      ${remaining != null ? `<p class="countdown mono${expired ? " urgent" : ""}" data-quest-countdown="${q.id}" data-created="${esc(q.createdAt)}">${expired ? "⏳ Waktu buat mulai quest ini udah lewat 24 jam." : `⏳ ${formatCountdown(remaining)}`}</p>` : ""}
      <button class="btn-primary" data-reflect-id="${q.id}" ${expired ? "disabled" : ""}>${expired ? "Waktu habis" : "Mulai"}</button>
    </div>`;
}
// Single ticker shared across every visible countdown - writes straight to
// the DOM every second, deliberately NOT through renderDashboard() (same
// reasoning as the pace/word-count live displays: a full re-render would
// interrupt a reflection draft being typed elsewhere on the same screen).
// Re-queries [data-quest-countdown] fresh each tick, so it stays correct
// across renders without needing to be re-armed.
let countdownTimer = null;
function tickCountdowns() {
  const now = Date.now();
  document.querySelectorAll("[data-quest-countdown]").forEach((el) => {
    const created = new Date(el.dataset.created).getTime();
    const remaining = created + 24 * 60 * 60 * 1000 - now;
    const btn = document.querySelector(`[data-reflect-id="${el.dataset.questCountdown}"]`);
    if (remaining <= 0) {
      el.textContent = "⏳ Waktu buat mulai quest ini udah lewat 24 jam.";
      el.classList.add("urgent");
      if (btn && !btn.disabled) { btn.disabled = true; btn.textContent = "Waktu habis"; }
    } else {
      el.textContent = `⏳ ${formatCountdown(remaining)}`;
      el.classList.toggle("urgent", remaining < 60 * 60 * 1000);
    }
  });
}
function ensureCountdownTicking() {
  tickCountdowns();
  if (countdownTimer) return;
  countdownTimer = setInterval(tickCountdowns, 1000);
}

// Fokus 2.2/2.3: manual override ("Opsi C") fields for the target picker -
// same numbers the auto-computed pace display already teaches the user to
// think in (durasi+jarak, not raw pace), so the target-setting mental model
// matches the record-entry mental model instead of introducing a new one.
function targetManualFormHTML(kind) {
  const tf = (k) => esc(targetManualForm[k] ?? "");
  if (kind === "cardio") {
    return `
      <div class="struct-grid">
        <div class="field"><label>Jarak target (km)</label><input type="number" min="0.1" step="0.1" data-tf="jarakKm" value="${tf("jarakKm")}" placeholder="5" /></div>
        <div class="field"><label>Durasi target (menit)</label><input type="number" min="1" data-tf="durasiMenit" value="${tf("durasiMenit")}" placeholder="28" /></div>
      </div>`;
  }
  return `
    <div class="struct-grid">
      <div class="field"><label>Set</label><input type="number" min="1" data-tf="set" value="${tf("set")}" placeholder="4" /></div>
      <div class="field"><label>Repetisi</label><input type="number" min="1" data-tf="repetisi" value="${tf("repetisi")}" placeholder="15" /></div>
    </div>
    <div class="field"><label>Beban (kg) <span class="opt-note">opsional</span></label><input type="number" min="0" step="0.5" data-tf="bebanKg" value="${tf("bebanKg")}" placeholder="22" /></div>`;
}

// Reuses the Pathway-carousel visual pattern (.pathway-carousel/.pathway-card)
// per the founder spec - same "2 AI directions + 1 manual override" shape as
// picking a Pathway at onboarding. Only rendered in "options" mode (no target
// yet, or the existing one was just reached/exceeded); "progress" mode is a
// quiet one-liner instead, deliberately NOT re-asking every single quest.
function targetPickerHTML(t) {
  if (!t) return "";
  if (t.mode === "progress") {
    return `<p class="mono" style="font-size:12.5px;color:var(--muted);margin:16px 0 0">Target: ${esc(t.currentTarget.label)} — masih menuju ke sana.</p>`;
  }
  const opts = [["A", t.options.optionA], ["B", t.options.optionB]];
  return `
    <div style="margin-top:20px">
      <div class="eyebrow mono" style="margin:0 0 10px">${t.reached ? "TARGET TERCAPAI — TARGET BERIKUTNYA" : "TARGET BERIKUTNYA"}</div>
      <div class="pathway-carousel">
        ${opts.map(([key, o]) => `
          <div class="pathway-card ${targetChoice === key ? "selected" : ""}" data-tkey="${key}">
            <div class="qlabel mono">OPSI ${key}</div>
            <h2 class="fr" style="font-size:19px">${esc(o.label)}</h2>
            <p class="why">${esc(o.approach)}</p>
          </div>`).join("")}
        <div class="pathway-card ${targetChoice === "manual" ? "selected" : ""}" data-tkey="manual">
          <div class="qlabel mono">TULIS SENDIRI</div>
          ${targetChoice === "manual" ? targetManualFormHTML(t.kind) : `<p class="why">Udah tahu persis target-mu? Tap buat isi sendiri.</p>`}
        </div>
      </div>
      ${targetError ? `<p style="color:var(--rust);font-size:13px;margin:10px 0 0">${esc(targetError)}</p>` : ""}
      ${targetChoice ? `<button class="btn-primary full" id="saveTarget" style="margin-top:14px">Simpan target</button>` : ""}
    </div>`;
}

// Brief acknowledgment shown right after a submit, before the dashboard
// refreshes - the per-goal model regenerates that goal's next quest the
// instant this one is marked done (no more "linger a day" grace period a
// calendar-based or 24h-based model gave for free), so without this the
// mentor's reply/deltas would flash by and vanish before the user ever
// saw them.
function completedResultCardHTML(r) {
  return `
    <div class="quest-card fadeUp">
      <div class="qlabel mono">${esc(r.questTitle)}</div>
      <div class="mono" style="font-size:11px;color:var(--growth);letter-spacing:1px;margin-bottom:6px">
        ${r.status === "done" ? "SELESAI" : r.status === "partial" ? "SEBAGIAN" : "DILEWATI"}
      </div>
      ${r.structuredData ? `<div class="mono" style="font-size:12px;color:var(--muted);margin:0 0 8px">${esc(structSummary(r.structuredData))}</div>` : ""}
      <p class="fr" style="font-style:italic;font-size:14.5px;margin:0 0 16px;line-height:1.6">${esc(r.mentorReply)}</p>
      ${Object.keys(r.deltas || {}).length ? `<div class="deltas" style="margin-bottom:18px">${Object.entries(r.deltas).map(([k, v]) => `<span class="delta-chip">${statLabel(k)} +${v}</span>`).join("")}</div>` : ""}
      ${targetPickerHTML(r.target)}
      <button class="btn-primary full" id="dismissCompleted" style="margin-top:18px">Lanjut</button>
    </div>`;
}

function renderDashboard() {
  const s = appState;
  const openQuests = s.openQuests || [];
  const goals = s.goals || [];
  const goalLabel = (goalIndex) => (goalIndex != null && goals[goalIndex] ? goals[goalIndex] : null);
  // Which open quest the reflect flow targets - looked up fresh from
  // appState every render (never cached), so a just-refreshed state after
  // a submit is always the source of truth. No implicit default: every
  // card's own button sets this explicitly, since there's no longer a
  // single privileged "today's quest" among up to 3 simultaneously open.
  const targetDay = openQuests.find((q) => q.id === reflectTarget) || null;
  const hasReflection = Boolean(targetDay?.reflection);

  // Task 7b + founder revision: physical quests complete via typed record
  // fields (numbers are far harder to fabricate convincingly than a
  // paragraph), and WHICH fields is the user's pick (structKind), not the
  // AI's structuredKind tag - the tag now only decides that a record is
  // REQUIRED (mustRecord, still enforced server-side). Untagged quests can
  // opt in via a toggle link, which is also the path for legacy physical
  // quests that predate tagging. Skipped = nothing to certify, so picker
  // and fields hide and no growth applies either way.
  const mustRecord = targetDay?.quest?.completionType === "structured-physical";
  const showPicker = recordMode && reflectStatus !== "skipped";
  const showStructFields = showPicker && structKind != null;
  // No fields until a kind is picked - submitting a kindless record would
  // just bounce off validation with a confusing "missing field" message.
  const formReady = !showPicker || structKind != null;
  const sf = (k) => esc(structForm[k] ?? "");
  // Fokus 0 (founder revision, 10 Agustus): RPE removed from both forms -
  // not used anymore. Cardio's free-text "titik mulai berat" is replaced by
  // a Ringan/Cukup/Berat picker, with a conditional reflection field that
  // only appears for "Berat" - Ringan/Cukup need no further explanation,
  // asking for one anyway would just invite padding. Gym's "titik
  // gagal/berat" is a different concept (which specific set/rep failed) and
  // stays free text - the founder's revision only named cardio's field.
  const structFieldsHTML = !showStructFields ? "" : structKind !== "cardio" ? `
      <div class="field">
        <label>Gerakan</label>
        <input type="text" data-sf="gerakan" maxlength="200" value="${sf("gerakan")}" placeholder="${structKind === "gym-alat" ? "mis. bench press, lat pulldown, leg press" : "mis. push-up, squat, plank"}" />
      </div>
      <div class="struct-grid">
        <div class="field"><label>Set</label><input type="number" min="1" data-sf="set" value="${sf("set")}" placeholder="3" /></div>
        <div class="field"><label>Repetisi / set</label><input type="number" min="1" data-sf="repetisi" value="${sf("repetisi")}" placeholder="12" /></div>
      </div>
      ${structKind === "gym-alat" ? `<div class="field"><label>Beban (kg) <span class="opt-note">opsional</span></label><input type="number" min="0" step="0.5" data-sf="bebanKg" value="${sf("bebanKg")}" placeholder="20" /></div>` : ""}
      <div class="field">
        <label>Titik gagal/berat</label>
        <input type="text" data-sf="titikGagal" maxlength="200" value="${sf("titikGagal")}" placeholder="mis. set 3 rep 8, atau set terakhir" />
      </div>` : `
      <div class="field">
        <label>Jenis aktivitas</label>
        <select data-sf="jenisAktivitas">${["", "Lari", "Jalan cepat", "Sepeda", "Lompat tali", "Lainnya"].map((v) => `<option value="${v}" ${String(structForm.jenisAktivitas ?? "") === v ? "selected" : ""}>${v || "Pilih..."}</option>`).join("")}</select>
      </div>
      ${structForm.jenisAktivitas === "Lainnya" ? `
      <div class="field">
        <label>Aktivitasnya apa?</label>
        <input type="text" data-sf="jenisLainnya" maxlength="200" value="${sf("jenisLainnya")}" placeholder="mis. renang, hiking" />
      </div>` : ""}
      <div class="struct-grid">
        <div class="field"><label>Durasi (MM:SS)</label><input type="text" inputmode="numeric" data-sf="durasiMenit" value="${sf("durasiMenit")}" placeholder="20:01" /></div>
        <div class="field"><label>Jarak (km) <span class="opt-note">opsional</span></label><input type="number" min="0" step="0.1" data-sf="jarakKm" value="${sf("jarakKm")}" placeholder="5" /></div>
      </div>
      <p class="mono" id="paceDisplay" style="font-size:12px;color:var(--muted);margin:-8px 0 14px">${(() => { const p = paceLabel(parseDurasiMenit(structForm.durasiMenit), structForm.jarakKm); return p ? `Pace: ${p}` : ""; })()}</p>
      <div class="field">
        <label>Titik mulai berat</label>
        <div class="status-row">
          ${["Ringan", "Cukup", "Berat"].map((v) => `<button class="status-btn ${structForm.titikBerat === v ? "active" : ""}" data-tberat="${v}">${v}</button>`).join("")}
        </div>
      </div>
      ${structForm.titikBerat === "Berat" ? `
      <div class="field">
        <label>Apa yang bikin berat?</label>
        <textarea data-sf="titikBeratDetail" rows="2" placeholder="Ceritain singkat...">${sf("titikBeratDetail")}</textarea>
      </div>` : ""}`;

  const kindPickerHTML = !showPicker ? "" : `
      <div class="field">
        <label>Aktivitasnya jenis apa?</label>
        <div class="status-row">
          ${[["cardio", "Cardio"], ["gym-badan", "Gym tanpa alat"], ["gym-alat", "Gym dengan alat"]].map(([k, l]) =>
            `<button class="status-btn ${structKind === k ? "active" : ""}" data-skind="${k}">${l}</button>`).join("")}
        </div>
        ${structKind == null ? `<p style="color:var(--muted);font-size:12.5px;margin:8px 0 0">Pilih satu dulu — form record-nya nyesuain jenis aktivitasmu.</p>` : ""}
      </div>`;

  const reflectFormHTML = reflectOpen && !hasReflection ? `
    <div class="quest-card fadeUp" style="margin-top:-14px">
      <div class="field">
        <label>Gimana progressnya?</label>
        <div class="status-row">
          ${[["done", "Selesai"], ["partial", "Sebagian"], ["skipped", "Nggak sempat"]].map(([k, l]) =>
            `<button class="status-btn ${reflectStatus === k ? "active" : ""}" data-status="${k}">${l}</button>`).join("")}
        </div>
      </div>
      ${kindPickerHTML}
      ${structFieldsHTML}
      ${formReady ? `
      <div class="field">
        <label>${showStructFields ? `Refleksi <span class="opt-note">opsional — angka di atas yang jadi bukti utamanya</span>` : `Ceritakan apa yang sebenarnya terjadi
          <span class="mono" style="display:block;font-size:12px;margin-top:2px;color:${wordCount(reflectText) >= 12 ? "var(--growth)" : "var(--muted)"}">
            <span id="wc">${wordCount(reflectText)}</span> kata · minimal ~12 kata biar stat bisa naik — dan sebut detail konkret yang diminta quest-nya (bukan checklist)
          </span>`}
        </label>
        <textarea id="reflectText" rows="${showStructFields ? 2 : 4}" placeholder="${showStructFields ? "Ada yang kerasa beda hari ini? (boleh dikosongkan)" : "Apa yang kamu lakukan, apa yang kerasa, apa yang berubah..."}">${esc(reflectText)}</textarea>
      </div>
      ${reflectError ? `<p style="color:var(--rust);font-size:13px;margin:0 0 12px">${esc(reflectError)}</p>` : ""}
      <button class="btn-primary full" id="submitReflect">${showStructFields ? "Simpan record & selesaikan quest" : "Simpan refleksi"}</button>` : ""}
      ${!mustRecord && reflectStatus !== "skipped" ? `
      <button class="btn-ghost" id="toggleRecord" style="margin-top:${formReady ? "10px" : "4px"}">${recordMode ? "← Balik ke refleksi teks aja" : "Aktivitas fisik? Catat sebagai record →"}</button>` : ""}
    </div>` : "";

  // Per-goal model: up to 3 quests can be open at once (one per active
  // goal), none of them ever silently swapped out - the founder-reported
  // regression this whole rewrite fixes. All shown as a swipeable carousel
  // so the user can work whichever goal they feel like, in their own order.
  // Collapses to the single card actually being reflected on while
  // reflectOpen, so typing a reflection never fights a horizontal swipe
  // for the same touch gesture - and to the "just completed" acknowledgment
  // card when one is pending dismissal.
  const questSectionHTML = completedResult ? completedResultCardHTML(completedResult)
    : reflectOpen ? questSummaryCard(targetDay, goalLabel(targetDay?.goalIndex))
    : openQuests.length > 1 ? `
    <div class="quest-carousel">
      ${openQuests.map((q) => questSummaryCard(q, goalLabel(q.goalIndex))).join("")}
    </div>
    <div class="eyebrow mono swipe-hint">← geser untuk lihat ${openQuests.length} quest yang lagi terbuka</div>`
    : questSummaryCard(openQuests[0] || null, goalLabel(openQuests[0]?.goalIndex));

  root.innerHTML = `
    <div class="shell">
      ${helpBtnHTML("dashboard")}${helpSheetHTML("dashboard")}
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;padding-right:34px">
        <div class="eyebrow mono" style="margin:0">ELEVA</div>
        <div class="mono" style="color:var(--muted);font-size:12px">${todayLabel()}</div>
      </div>
      ${s.aiActive ? "" : `<div class="banner-warn">Mode tanpa API key — quest masih generik. Tambahkan ANTHROPIC_API_KEY di .env supaya mentor beneran personal.</div>`}
      <div class="chapter-header">
        <div class="bab mono">BAB ${s.chapterNumber}</div>
        <h1 class="fr">${esc(s.chapterTitle)}</h1>
        <div class="rule"></div>
        ${s.pathwayNoun ? `<div class="pathway-badge mono">${esc(maturityTier(s.growthSessions))} ${esc(s.pathwayNoun)}${s.pathwayStatus === "trial" ? ` <span class="trial-tag">(hipotesis — First Trial)</span>` : ""}</div>` : ""}
        ${openQuests[0]?.insight ? `<p class="insight fr">${esc(openQuests[0].insight)}</p>` : ""}
      </div>
      ${questSectionHTML}
      ${reflectFormHTML}
      <div style="margin-bottom:28px">
        <div class="eyebrow mono">CHARACTER STATS</div>
        ${(() => {
          // Render whatever stats this account actually has: new accounts get
          // the 7 MECE keys in STAT_ORDER order; pre-MECE accounts (8-element
          // era) keep showing their stored keys with legacy labels until they
          // reset & re-onboard - display tolerance, deliberately not a data
          // migration.
          const keys = STAT_ORDER.map(([k]) => k).filter((k) => k in (s.stats || {}));
          Object.keys(s.stats || {}).forEach((k) => { if (!keys.includes(k)) keys.push(k); });
          return keys.map((k) => `
          <div class="stat-bar">
            <div class="row-top"><span class="label">${statLabel(k)}</span><span class="mono">${s.stats[k]}</span></div>
            <div class="track"><div class="fill" style="width:${s.stats[k]}%"></div></div>
          </div>`).join("");
        })()}
      </div>
      ${s.history?.length ? `
      <div style="margin-bottom:28px">
        <div class="eyebrow mono">RIWAYAT</div>
        ${s.history.map((d) => `
          <div class="history-item done">
            <div class="date mono">${d.date}</div>
            <div class="title">${esc(d.quest?.title || "")}</div>
            ${d.reflection?.text ? `<div class="snippet">${esc(d.reflection.text.slice(0, 90))}${d.reflection.text.length > 90 ? "…" : ""}</div>` : d.reflection?.structuredData ? `<div class="snippet mono">${esc(structSummary(d.reflection.structuredData))}</div>` : ""}
          </div>`).join("")}
      </div>` : ""}
      <div class="footer-bar">
        ${resetArmed
          ? `<button class="btn-ghost rust" id="doReset">Yakin? Tap sekali lagi buat reset semua data</button>`
          : `<button class="btn-ghost" id="armReset">↺ Reset data</button>`}
        <button class="btn-ghost" id="doLogout">Keluar</button>
      </div>
    </div>`;

  // recordMode starts on for AI-tagged physical quests (record required
  // server-side, mustRecord) - also defaulted on for untagged Body-focus
  // quests (founder feedback 10 Agustus, live screenshot: a quest whose
  // description explicitly asked for reps/jarak/titik-menyerah still opened
  // into the reflection box, record picker hidden behind a secondary tap -
  // the AI's completionType tag isn't perfectly reliable, statFocus is a
  // cheap deterministic backstop for the same "this is obviously physical"
  // signal). NOT folded into mustRecord itself - this is a smarter DEFAULT,
  // not a requirement, so the "← Balik ke refleksi teks aja" toggle still
  // renders and can back out of it if the guess is wrong for a given quest.
  // structKind always starts unpicked - the user declares what they
  // actually did each time, never inherited.
  document.querySelectorAll("[data-reflect-id]").forEach((b) => b.addEventListener("click", () => {
    const id = Number(b.dataset.reflectId);
    const quest = openQuests.find((q) => q.id === id)?.quest;
    reflectTarget = id; reflectOpen = true; reflectStatus = "done"; reflectText = "";
    structForm = {}; reflectError = "";
    recordMode = quest?.completionType === "structured-physical" || quest?.statFocus === "body";
    structKind = null;
    renderDashboard();
  }));
  document.getElementById("dismissCompleted")?.addEventListener("click", async () => {
    completedResult = null;
    targetChoice = null; targetManualForm = {}; targetError = "";
    root.innerHTML = spinnerHTML("Memuat quest berikutnya...");
    appState = await api("/api/state");
    renderDashboard();
  });
  // Fokus 2.2/2.3: target picker - same pathway-carousel click pattern as
  // onboarding (tap a card to select it), plus a manual-entry variant whose
  // numbers get validated/derived the same way the record form's numbers do.
  document.querySelectorAll("[data-tkey]").forEach((card) => card.addEventListener("click", () => {
    targetChoice = card.dataset.tkey;
    targetError = "";
    renderDashboard();
  }));
  document.querySelectorAll("[data-tf]").forEach((el) => el.addEventListener("input", (e) => {
    targetManualForm[el.dataset.tf] = e.target.value;
  }));
  document.getElementById("saveTarget")?.addEventListener("click", async () => {
    const t = completedResult?.target;
    if (!t || !targetChoice) return;
    let payload;
    if (targetChoice === "manual") {
      if (t.kind === "cardio") {
        const jarakKm = Number(targetManualForm.jarakKm);
        const durasiMenit = Number(targetManualForm.durasiMenit);
        if (!jarakKm || jarakKm <= 0 || !durasiMenit || durasiMenit <= 0) {
          targetError = "Isi jarak dan durasi target dulu, keduanya lebih dari 0.";
          renderDashboard();
          return;
        }
        payload = { kind: "cardio", metrics: { jarakKm, paceMinPerKm: durasiMenit / jarakKm } };
      } else {
        const set = Number(targetManualForm.set);
        const repetisi = Number(targetManualForm.repetisi);
        const bebanKg = targetManualForm.bebanKg === "" || targetManualForm.bebanKg == null ? null : Number(targetManualForm.bebanKg);
        if (!set || set <= 0 || !repetisi || repetisi <= 0) {
          targetError = "Isi set dan repetisi target dulu, keduanya lebih dari 0.";
          renderDashboard();
          return;
        }
        payload = { kind: "gym", metrics: { set, repetisi, ...(bebanKg != null ? { bebanKg } : {}) } };
      }
      // label/approach omitted - server derives a label from metrics
      // (targets.formatTargetLabel) when none is sent.
    } else {
      const opt = targetChoice === "A" ? t.options.optionA : t.options.optionB;
      payload = { kind: t.kind, label: opt.label, approach: opt.approach, metrics: opt.metrics };
    }
    try {
      await api("/api/goal-target", { method: "POST", body: { goalIndex: completedResult.goalIndex, source: targetChoice, ...payload } });
      completedResult.target = null;
      targetChoice = null; targetManualForm = {}; targetError = "";
      renderDashboard();
    } catch (e) {
      targetError = e.message;
      renderDashboard();
    }
  });
  document.querySelectorAll("[data-skind]").forEach((b) => b.addEventListener("click", () => { structKind = b.dataset.skind; reflectError = ""; renderDashboard(); }));
  // Fokus 0: Ringan/Cukup only need the pick itself; Berat reveals a
  // conditional reflection field, so unlike plain typed fields this needs a
  // re-render (new element appearing), not just a live DOM write.
  document.querySelectorAll("[data-tberat]").forEach((b) => b.addEventListener("click", () => {
    structForm.titikBerat = b.dataset.tberat;
    if (structForm.titikBerat !== "Berat") delete structForm.titikBeratDetail;
    reflectError = "";
    renderDashboard();
  }));
  document.getElementById("toggleRecord")?.addEventListener("click", () => { recordMode = !recordMode; structKind = null; reflectError = ""; renderDashboard(); });
  // Bound by data attribute, not the shared .status-btn styling class -
  // the activity-kind picker reuses that class for its look, and a
  // class-bound handler would also fire there, silently blanking
  // reflectStatus (data-status is undefined on kind buttons).
  document.querySelectorAll("[data-status]").forEach((b) => b.addEventListener("click", () => { reflectStatus = b.dataset.status; reflectError = ""; renderDashboard(); }));
  const rtxt = document.getElementById("reflectText");
  if (rtxt) rtxt.addEventListener("input", (e) => {
    reflectText = e.target.value;
    const wc = document.getElementById("wc");
    if (wc) wc.textContent = wordCount(reflectText);
  });
  document.querySelectorAll("[data-sf]").forEach((el) => {
    const evt = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evt, (e) => {
      structForm[el.dataset.sf] = e.target.value;
      // Only the "Lainnya" toggle needs a re-render (it adds/removes a field);
      // plain typing must NOT re-render or the input would lose focus. Pace
      // is a derived read of the same two fields, so it updates the same
      // way word count does - write straight to the DOM, no render.
      if (el.dataset.sf === "jenisAktivitas") renderDashboard();
      if (el.dataset.sf === "durasiMenit" || el.dataset.sf === "jarakKm") {
        const paceEl = document.getElementById("paceDisplay");
        if (paceEl) {
          const p = paceLabel(parseDurasiMenit(structForm.durasiMenit), structForm.jarakKm);
          paceEl.textContent = p ? `Pace: ${p}` : "";
        }
      }
    });
  });
  document.getElementById("submitReflect")?.addEventListener("click", async () => {
    root.innerHTML = spinnerHTML("Menyimpan refleksi...");
    try {
      const body = { status: reflectStatus, text: reflectText, questId: targetDay.id };
      if (recordMode && structKind && reflectStatus !== "skipped") {
        // kind is the user's pick (both gym variants validate as "gym" -
        // they only differ in which fields rendered); a bodyweight session
        // never sends a weight, even one left over from switching variants.
        body.structuredData = { ...structForm, kind: structKind === "cardio" ? "cardio" : "gym" };
        if (structKind === "gym-badan") delete body.structuredData.bebanKg;
        // durasi is typed as MM:SS - convert to decimal minutes here, at the
        // one edge where it leaves the client, so the server (and every
        // other consumer: pace calc, target metrics) keeps working with a
        // plain number same as before.
        if (structKind === "cardio") body.structuredData.durasiMenit = parseDurasiMenit(structForm.durasiMenit);
      }
      const resp = await api("/api/reflection", { method: "POST", body });
      // The per-goal model regenerates this goal's next quest the instant
      // it's marked done - no more free "linger a day" grace period a
      // calendar/24h-based model gave the mentor's reply to be seen. Hold
      // it here until the user dismisses it, instead of refetching state
      // immediately (which could otherwise swap this card out from under
      // them before they ever read it).
      completedResult = {
        questTitle: targetDay.quest.title, status: reflectStatus, goalIndex: targetDay.goalIndex,
        mentorReply: resp.mentorReply, deltas: resp.deltas, structuredData: resp.structuredData,
        target: resp.targetScreen || null,
      };
      reflectOpen = false; reflectTarget = null; reflectText = ""; structForm = {}; reflectError = "";
      recordMode = false; structKind = null;
      targetChoice = null; targetManualForm = {}; targetError = "";
      renderDashboard();
    } catch (e) {
      // Validation errors (implausible numbers, missing fields) come back as
      // 400s with a concrete message - show them inline with the entered
      // values intact, never a dead-end error screen.
      reflectError = e.message;
      renderDashboard();
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
  ensureCountdownTicking();
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
