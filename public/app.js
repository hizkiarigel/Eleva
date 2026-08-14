// 7 MECE stats (Bible v1.5): Mind+Explorer merged into Growth (Openness &
// Intellect are one Big Five factor), Career+Finance merged into Livelihood
// (salary is core to the research definition of career success), Autonomy
// added (SDT - the Collectively-Exhaustive gap for an audience that lost
// direction).
const STAT_ORDER = [
  ["body", "Body"], ["growth", "Growth"], ["livelihood", "Livelihood"],
  ["emotional", "Emotional Stability"], ["social", "Social"], ["purpose", "Purpose"], ["autonomy", "Autonomy"],
];

// Task 11f (Context Update, formalized wording/emoji from Eleva_PRD.pdf):
// mirrors server's KONDISI_LABELS exactly (same hand-sync pattern as
// SUB_PATHWAY_NAMES - no shared module system client/server here).
const KONDISI_LABELS = ["Capek/energi rendah", "Sakit/cedera", "Beban kerja tinggi", "Traveling", "Mentally drained", "Energi lebih"];
const KONDISI_EMOJI = { "Capek/energi rendah": "🥵", "Sakit/cedera": "😷", "Beban kerja tinggi": "💼", "Traveling": "✈️", "Mentally drained": "🧠", "Energi lebih": "🔥" };

// Character screen: 5-tier naming per stat level, "Vigil" set (the
// handoff's own prototype default) - the other two drafted sets (Ember,
// Depth) are recorded in PRD.md but not wired up, picking one was explicitly
// left to implementation.
const TIER_NAMES = ["Initiate", "Wanderer", "Adept", "Sentinel", "Sovereign"];
// Stats are stored 0-100 (see DEFAULT_STATS) - 5 levels of 20 points each.
// Level N's progress bar fills with how far INTO that level the stat is
// (not raw 0-100), which is the whole point of the redesign: "how close to
// leveling" instead of "% of some absolute total".
function statLevelInfo(value) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const level = Math.min(5, Math.floor(v / 20) + 1);
  const intoLevel = v - (level - 1) * 20;
  const progressPct = level === 5 ? Math.min(100, (intoLevel / 20) * 100) : (intoLevel / 20) * 100;
  return { level, tierName: TIER_NAMES[level - 1], progressPct };
}
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
  meta: "Latihan mandiri, kapan aja — nggak perlu nunggu Eleva kasih quest-nya. Sesi di sini tetap dihitung sebagai bukti pertumbuhan, tapi nggak menggerakkan Milestone goal manapun.",
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
// POLY_MAXR: 110 -> 128 (round 2) -> 136 (round 8) -> 148 (round 9) -> 144
// (round 10). Verified empirically (Playwright getBBox() of every label/
// icon vs the SVG's own viewBox, at 360/390px - the narrowest supported
// phones) at every step. Round 10's REAL lever wasn't POLY_MAXR itself: the
// SVG box's CSS max-width (--rd-svg-max, styles.css) used to clamp its
// PREFERRED size to var(--vh)*40 - tying box WIDTH to viewport HEIGHT,
// which on a normal ~780-844px-tall phone capped the box at ~310-330px
// CSS px even though ~320-355px was genuinely free horizontally. Dropping
// that height-derived term let the box actually fill the available width
// (.poly-svg's own width:100% does the rest) - the founder's real device
// jumped from ~312px to ~354px of box width alone, before POLY_MAXR even
// changed. On top of that, round 9's label x-shift/icon trims were pushed
// further (icon gap 5->3, hit radius 12->11) to afford growing the axis
// label font 12->16 (see .poly-label, founder feedback) without eating
// all the reclaimed room - POLY_MAXR net settled at 144 (down slightly
// from round 9's 148 in raw viewBox units, but the bigger box means it's
// PHYSICALLY LARGER on screen at every width >= 360px). A literal 1.8x
// remains physically impossible on a phone-width screen: the heptagon
// vertex plus its label/icon overhang already uses nearly the SVG box's
// full width; 180% would mean the heptagon ALONE exceeds the box, leaving
// zero space for any label anywhere.
const POLY_MIN = 1, POLY_MAX = 10, POLY_CENTER = 150, POLY_MAXR = 144, POLY_MINR = 15;
const POLY_STEP_DEG = 360 / POLY_ORDER.length; // heptagon: ~51.43deg per axis
// Square viewBox with padding so axis-name labels (anchored outward) never
// clip; kept square so pointer->viewBox mapping stays a uniform scale.
// Wider than the 8-axis era: the heptagon puts "Livelihood" at a
// near-horizontal angle where it needs the full word to the right - and
// since the design handoff, the per-axis (i) info icon sits past the label
// text, so the padding widened again (Livelihood's icon was clipping at
// the old -34/368 bounds).
// Center invariant: POLY_VIEW_MIN + POLY_VIEW_SIZE/2 === POLY_CENTER.
// Widened alongside POLY_MAXR's increase (110->128) so labels/icons keep
// the same clearance from the viewBox edge as before, just further out.
const POLY_VIEW_MIN = -60, POLY_VIEW_SIZE = 420;
const DEFAULT_RADAR = { body: 5, growth: 5, livelihood: 5, emotional: 5, social: 5, purpose: 5, autonomy: 5 };

// Founder feedback: no trailing ".0" clutter on whole numbers in the value
// nodes - "5" not "5.0" - but a genuinely fractional value (mid-drag, e.g.
// 5.8) still needs its one decimal place.
function formatRadarValue(value) {
  const s = Number(value).toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

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
  questionCard: { most: null, least: null }, // "Kartu ke-1" onboarding question card - local-only for now, not yet fed into radar/pathway scoring
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
// Task 7c (evidenceSchema): true when structKind above was auto-derived
// from the quest's own evidenceSchema rather than picked by the user -
// suppresses the redundant "Aktivitasnya jenis apa?" picker in that case.
let structKindAuto = false;
let reflectError = "";
// Set right after a successful submit, cleared once the user dismisses the
// brief "here's what happened" acknowledgment - see completedResultCardHTML.
let completedResult = null;
// Task 7d.6: which shortfall reason (if any) the user already picked for
// the CURRENT completedResult - reset alongside it, never persisted client-
// side beyond this one acknowledgment card.
let shortfallReasonPicked = null;
// Fokus 2.2/2.3: "Target Berikutnya" picker state, live only while
// completedResult.target is present (mode "options") - reset alongside it.
let targetChoice = null; // null | "A" | "B" | "manual"
let targetManualForm = {}; // cardio: {jarakKm, durasiMenit} - gym: {set, repetisi, bebanKg}
let targetError = "";
// Task 9 (Practice Test): a completely separate flow from reflectOpen/
// recordMode - tapping "Mulai" on a practice-test quest goes here instead.
// null when inactive; {questId, step, kind, track, payload, answers, plays,
// error} while active. step: "kind" -> "track" -> "test" (generate happens
// as a full-screen await between "track" and "test", same pattern as
// dismissCompleted below - no separate "loading" step needed for that).
let practiceTestFlow = null;
// Task 10b (Job Match Analysis): same "separate flow, not reflectOpen"
// pattern as practiceTestFlow. {questId, step, cvArtifact, images, error}.
// step: "upload-cv" (skipped straight to "upload-job" if a CV artifact
// already exists in the library) -> "upload-job".
let jobMatchFlow = null;
// Task 14 (Livelihood Milestone, PRD.md section 26 point 5): "Submit
// Application" flow - same "separate flow, not reflectOpen" pattern as
// jobMatchFlow. {questId, step, cvArtifact, form:{companyName,roleTitle,
// dateApplied,submissionProof}, error}. step: "cv" (skipped straight to
// "form" if a CV artifact already exists) -> "form".
let jobApplicationFlow = null;
// Task 12 (META): true while the inline Cardio/Gym/Recovery picker for the
// "Body" META box is showing (tapped but no kind chosen yet). Reset after
// /api/meta/start succeeds or the user backs out.
let metaBodyPicking = false;
let metaError = "";
// Hint-card dismissal persistence: this app has no localStorage precedent
// anywhere else (help sheets are pure in-memory, reset on reload) - the
// handoff explicitly allows "localStorage or backend flag, whichever this
// app already uses" and there is no existing one, so localStorage is the
// simplest option that needs no schema change.
let metaHintDismissed = false;
try { metaHintDismissed = localStorage.getItem("elevaMetaHintDismissed") === "1"; } catch (e) { /* private mode etc - just stays visible every load */ }
// META target-recommendation flow (12 Agustus follow-up, founder feedback):
// "World Map shows Target, Realm page shows Tools" - each realm's
// world-map card now shows the user's real target (server/metaTargets.js),
// tapping an ACTIVE one opens that realm's tool list instead of jumping
// straight into a flow. metaRealmOpen replaces the old direct-tap routing
// SOMA had (its 2-card layout is retired - SOMA is back to one card, same
// as LINGUA/LABORA, since it's a target card now, not a tool picker).
let metaRealmOpen = null; // null | "soma" | "lingua" | "labora"
let metaGoalDraft = { soma: "", lingua: "", labora: "" }; // empty-state "add a goal" input drafts, per realm
let metaTargetBusy = false; // guards the confirm/add-goal buttons while a request is in flight
// SOMA Nutrition Part B: "Log Meal" flow state - same "separate flow, not
// reflectOpen" pattern as jobMatchFlow/jobApplicationFlow.
// {questId, step, mealType, entries, search:{query,results,error},
//  picked:null|{foodName,servingAmount,servingUnit,calories,protein,
//  carbohydrates,fat,source}, photo:{step,image,suggested,error}, error}
// step: "log" (meal-type + search/photo entry) -> "confirm" (review a
// picked/suggested item, servingAmount editable, before it's saved as
// evidence).
let nutritionFlow = null;
let nfSearchTimer = null; // debounce handle for the Nutrition page's live food search
// Task 10a (Artifacts library): sheet state, independent of any quest flow -
// reachable any time via its own icon, not just from job-match-analysis.
let artifactsOpen = false;
let artifactsList = null; // fetched lazily on first open, refetched after add/replace
let artifactsError = "";
// Homepage redesign (design handoff, 11 Agustus): persistent nav shell +
// restructured Home. activeScreen drives which screen body renders inside
// the shared header/tab-bar shell (renderDashboard stays the single entry
// point - it just branches on this now instead of always rendering Home).
let activeScreen = "home"; // "home" | "kisahmu" | "character" | "settings"
// Per-Primary-Quest-card progressive disclosure ("Kenapa Eleva kasih quest
// ini →") - keyed by quest id, independent per card per spec.
let reasonOpenIds = new Set();
let sideQuestsOpen = false;
let kondisiOpen = false;
let kondisiError = "";
let kondisiNoteDraft = "";
// Task 7c: "Aku nggak bisa quest ini" - a separate context-signal entry
// point (reuses the Context Update mechanism, see kondisiRowHTML/
// unableFormHTML) that never touches the quest itself. Set to the quest id
// currently showing this picker, or null.
let unableQuestId = null;
let resetArmed = false;
let authMode = "login";
let authForm = { email: "", password: "", betaCode: "" };
let privacyChecked = false;
let authError = "";
// Cinematic login v2 (design_handoff_login_screen, 13 Agustus) - replaces
// the previous cinematic login wholesale (founder confirmed via
// AskUserQuestion: this new handoff supersedes it, not a second screen).
// authUiState is the button/panel state machine (idle → loading → success →
// entering → zooming → flash → complete), names matching the handoff's own
// authState. All transitions after the initial render are direct DOM class
// toggles, never re-renders — a re-render mid-animation would restart the
// CSS animations from zero (same reasoning as the previous login, kept).
let authUiState = "idle";
let authShowPassword = false;
let authHelpOpen = false; // bottom-sheet "Tentang Eleva" modal
let authConsentInfoOpen = false; // bottom-sheet "Tentang data selama Beta" (Sign Up consent)
let authTimers = [];
function clearAuthTimers() { authTimers.forEach(clearTimeout); authTimers = []; }
// Handoff's own timing table (README "Total sequence ≈ 4.9s"): loading→
// success is a REAL request with an 800ms floor (translated from the static
// prototype's fixed 800ms mock timer - a real network call shouldn't get
// cut short on a slow connection, same floor pattern the previous login
// already used); success/entering hold ~900ms each, zooming ~1600ms (the
// full-bleed gate's scale/brightness transition), flash ~700ms (fast fade-
// in then a hold).
const AUTH_LOADING_FLOOR = 800, AUTH_SUCCESS_HOLD = 900, AUTH_ENTERING_HOLD = 900, AUTH_ZOOMING_HOLD = 1600, AUTH_FLASH_HOLD = 700;
// Reduced-motion collapses to idle → loading(300ms) → success(200ms) →
// flash(250ms) → complete, skipping entering/zooming ENTIRELY (no gate
// zoom, no parallax) - these are the handoff's own distinct per-phase
// numbers, not a uniform "cap every hold at 250ms".
const AUTH_RM_LOADING_FLOOR = 300, AUTH_RM_SUCCESS_HOLD = 200, AUTH_RM_FLASH_HOLD = 250;
function authReducedMotion() {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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
    questionCard: { most: null, least: null },
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

// Cinematic login v2 (design_handoff_login_screen, 13 Agustus) - REPLACES
// the previous cinematic login screen wholesale (confirmed via
// AskUserQuestion: the founder wanted this new handoff to supersede it, not
// coexist as a second screen). Full-bleed pre-cropped background + vignette
// stack, MASUK/DAFTAR button with 7 states (idle/loading/success/entering/
// zooming/flash/complete, the handoff's own state names) wired to the REAL
// /api/login and /api/signup. Deviations from the handoff, all deliberate
// and flagged:
// - The handoff's own reference only implements a LOGIN screen ("DAFTAR" at
//   the bottom has no onClick, no signup state anywhere in its component).
//   Signup reuses every visual token verbatim, adding only what the
//   PREVIOUS login handoff already needed for the identical reason: a beta
//   code field (functionally required - BETA_CODE gates account creation
//   server-side) and privacy consent (Task 4, a compliance feature no
//   visual redesign can drop) - styled to match this screen's palette, not
//   invented from scratch.
// - "Lupa password?" is inert (no reset route exists in this backend) - the
//   reference itself has no onClick for it either, so this isn't a new
//   deviation, just confirming the non-functionality is intentional.
// - The 800ms "loading" wait is a FLOOR around the real request, not the
//   reference's fixed mock timer - same real-network translation the
//   previous login already made (a slow connection must not get cut short).

function authHelpModalHTML() {
  if (!authHelpOpen) return "";
  return `
    <div class="auth2-help-backdrop" id="auth2HelpBackdrop"></div>
    <div class="auth2-help-sheet fadeUp">
      <div class="auth2-help-title">Tentang Eleva</div>
      <p class="auth2-help-body">Eleva adalah aplikasi pertumbuhan diri berbasis pathway dan quest.</p>
      <p class="auth2-help-body">Kamu bertumbuh lewat bukti nyata, bukan sekadar checklist.</p>
      <p class="auth2-help-focus-label mono">FOKUS AWAL ELEVA</p>
      <div class="auth2-help-focus-row">
        <span class="auth2-help-focus-item">SOMA — Body</span>
        <span class="auth2-help-focus-item">LINGUA — Growth</span>
        <span class="auth2-help-focus-item">LABORA — Livelihood</span>
      </div>
      <button class="auth2-help-primary" id="auth2HelpClose">Mengerti</button>
    </div>`;
}

// Sign Up consent's info sheet (handoff v4: "the data-info sheet") - reuses
// the SAME bottom-sheet component/classes as the "Tentang Eleva" help sheet
// above (same visual pattern, different content), reachable from two tap
// points in the consent row (the bold "Ketentuan Beta & Privasi" text and
// the "Lihat bagaimana data saya digunakan" link below it) - one sheet, two
// entry points, not two separate sheets.
function authConsentInfoModalHTML() {
  if (!authConsentInfoOpen) return "";
  return `
    <div class="auth2-help-backdrop" id="auth2ConsentInfoBackdrop"></div>
    <div class="auth2-help-sheet fadeUp">
      <div class="auth2-help-title">Tentang data selama Beta</div>
      <p class="auth2-help-body">Refleksi dan bukti yang kamu kirim dapat diproses oleh model AI untuk membuat quest dan analisis personal.</p>
      <p class="auth2-help-body">Selama masa beta, data dapat diakses secara terbatas untuk pengembangan Eleva.</p>
      <p class="auth2-help-body">Eleva bukan pengganti layanan kesehatan mental profesional.</p>
      <button class="auth2-help-primary" id="auth2ConsentInfoClose">Saya mengerti</button>
    </div>`;
}

function renderAuth() {
  clearAuthTimers();
  authUiState = "idle";
  const isSignup = authMode === "signup";
  root.innerHTML = `
    <div class="auth2-root" id="auth2Root">
      <div class="auth2-bg-wrap">
        <img src="/assets/eleva-login-bg-crop.png" alt="" class="auth2-bg-img" id="auth2BgImg" />
        <div class="auth2-bg-fade"></div>
      </div>
      <div class="auth2-top-vignette"></div>
      <div class="auth2-radial-vignette"></div>
      <div class="auth2-portal-glow" id="auth2PortalGlow"></div>

      <div class="auth2-content" id="auth2Content">
        <div class="auth2-brand-row">
          <span></span>
          <span class="auth2-brand-mark">
            <img src="/assets/eleva-diamond.png" alt="" class="auth2-diamond" />
            <span class="auth2-wordmark">ELEVA</span>
          </span>
          <button class="auth2-help-btn" id="auth2HelpBtn" aria-label="Bantuan">?</button>
        </div>
        <div class="auth2-title-block">
          <h1 class="auth2-headline">${isSignup ? "MULAI<br/>PERJALANANMU" : "SELAMAT<br/>DATANG KEMBALI"}</h1>
          <p class="auth2-tagline">${isSignup ? "Bentuk karakter melalui<br/>langkah yang nyata." : "Kembali pada jalan yang<br/>sedang membentukmu."}</p>
        </div>
        <div class="auth2-spacer"></div>
        <div class="auth2-form-col ${isSignup ? "auth2-form-col-signup" : ""}">
          <p class="auth2-error" id="auth2Error">${esc(authError)}</p>
          <div class="auth2-field">
            <label class="auth2-label mono">EMAIL</label>
            <input type="email" id="auth2Email" placeholder="kamu@email.com" autocomplete="email" />
          </div>
          <div class="auth2-field auth2-field-pw">
            <label class="auth2-label mono">PASSWORD</label>
            <div class="auth2-pw-row">
              <input type="password" id="auth2Password" placeholder="••••••••" autocomplete="${isSignup ? "new-password" : "current-password"}" />
              <span class="auth2-pw-toggle mono" id="auth2PwToggle">SHOW</span>
            </div>
          </div>
          ${isSignup ? `
          <div class="auth2-field auth2-field-pw">
            <label class="auth2-label mono">KODE UNDANGAN</label>
            <input type="text" id="auth2BetaCode" placeholder="Masukkan kode beta" />
          </div>
          <div class="auth2-consent" id="auth2Consent">
            <span class="auth2-checkbox ${privacyChecked ? "on" : ""}" id="auth2ConsentBox">${privacyChecked ? "✓" : ""}</span>
            <span class="auth2-consent-text">Saya setuju dengan <span class="auth2-consent-link" id="auth2ConsentTerms">Ketentuan Beta &amp; Privasi</span></span>
          </div>
          <div class="auth2-consent-datalink-row">
            <span class="auth2-consent-datalink" id="auth2DataLink">Lihat bagaimana data saya digunakan</span>
          </div>` : ""}
          <button class="auth2-cta ${isSignup && !privacyChecked ? "auth2-cta-disabled" : ""}" id="auth2Submit" ${isSignup && !privacyChecked ? "disabled" : ""}>
            <span class="auth2-cta-label">${isSignup ? "DAFTAR" : "MASUK"}</span>
            <span class="auth2-icon-group">
              <img src="/assets/eleva-stickman.png" alt="" class="auth2-stickman" id="auth2Stickman" />
              <img src="/assets/eleva-portal-icon.png" alt="" class="auth2-portal-icon" id="auth2PortalIcon" />
            </span>
          </button>
          <div class="auth2-helper" id="auth2Helper"></div>
          ${isSignup ? "" : `<div class="auth2-link-row auth2-link-row-forgot"><span class="auth2-forgot">Lupa password?</span></div>`}
        </div>
        <!-- Fix (handoff v4): the footer (hairline + mode-switch link) is a
             SEPARATE flex child from .auth2-form-col, not nested inside it -
             this is what keeps it pinned in place while Sign Up's form
             column above shifts up via translateY, instead of moving with it. -->
        <div class="auth2-footer-col">
          <div class="auth2-hair"></div>
          <div class="auth2-link-row auth2-link-row-signup">
            <button class="auth2-toggle-mode" id="auth2ToggleMode"><span class="auth2-muted">${isSignup ? "Sudah punya akun? " : "Baru di sini? "}</span><span class="auth2-accent">${isSignup ? "MASUK" : "DAFTAR"}</span></button>
          </div>
        </div>
      </div>

      <div class="auth2-zoom-wrap" id="auth2ZoomWrap">
        <img src="/assets/eleva-portal-zoom.png" alt="" class="auth2-zoom-img" id="auth2ZoomImg" />
      </div>
      <div class="auth2-flash" id="auth2Flash"></div>
      ${authHelpModalHTML()}
      ${authConsentInfoModalHTML()}
    </div>`;

  const emailInput = document.getElementById("auth2Email");
  const pwInput = document.getElementById("auth2Password");
  const betaInput = document.getElementById("auth2BetaCode");
  // Values restored via JS, not baked into the markup — keeps the password
  // out of the HTML string and survives mode-toggle/error re-renders.
  emailInput.value = authForm.email;
  pwInput.value = authForm.password;
  pwInput.type = authShowPassword ? "text" : "password";
  if (betaInput) betaInput.value = authForm.betaCode;

  emailInput.addEventListener("input", (e) => { authForm.email = e.target.value; });
  pwInput.addEventListener("input", (e) => { authForm.password = e.target.value; });
  betaInput?.addEventListener("input", (e) => { authForm.betaCode = e.target.value; });

  document.getElementById("auth2PwToggle").addEventListener("click", () => {
    authShowPassword = !authShowPassword;
    pwInput.type = authShowPassword ? "text" : "password";
    document.getElementById("auth2PwToggle").textContent = authShowPassword ? "SEMBUNYIKAN" : "SHOW";
  });
  document.getElementById("auth2Consent")?.addEventListener("click", () => {
    privacyChecked = !privacyChecked;
    const box = document.getElementById("auth2ConsentBox");
    box.classList.toggle("on", privacyChecked);
    box.textContent = privacyChecked ? "✓" : "";
    const btn = document.getElementById("auth2Submit");
    btn.disabled = !privacyChecked;
    btn.classList.toggle("auth2-cta-disabled", !privacyChecked);
  });
  // The bold "Ketentuan Beta & Privasi" tap target opens the info sheet
  // instead of toggling consent - stopPropagation so it doesn't also bubble
  // up to the row's own click-to-toggle handler above.
  document.getElementById("auth2ConsentTerms")?.addEventListener("click", (e) => {
    e.stopPropagation();
    authConsentInfoOpen = true;
    renderAuth();
  });
  document.getElementById("auth2DataLink")?.addEventListener("click", () => { authConsentInfoOpen = true; renderAuth(); });
  document.getElementById("auth2ConsentInfoBackdrop")?.addEventListener("click", () => { authConsentInfoOpen = false; renderAuth(); });
  document.getElementById("auth2ConsentInfoClose")?.addEventListener("click", () => { authConsentInfoOpen = false; renderAuth(); });
  document.getElementById("auth2ToggleMode").addEventListener("click", () => {
    if (authUiState !== "idle") return;
    authMode = isSignup ? "login" : "signup";
    authError = "";
    renderAuth();
  });
  document.getElementById("auth2HelpBtn").addEventListener("click", () => { authHelpOpen = true; renderAuth(); });
  document.getElementById("auth2HelpBackdrop")?.addEventListener("click", () => { authHelpOpen = false; renderAuth(); });
  document.getElementById("auth2HelpClose")?.addEventListener("click", () => { authHelpOpen = false; renderAuth(); });

  // Ambient pointer-follow parallax on the background image only (handoff:
  // "optional polish, low priority... skip if it adds complexity") - a
  // single translate, not the previous login's multi-layer depth scene.
  // Disabled once the submit sequence starts and under reduced motion.
  const bgImg = document.getElementById("auth2BgImg");
  let plxQueued = false;
  document.getElementById("auth2Root").addEventListener("mousemove", (e) => {
    if (authUiState !== "idle" || authReducedMotion() || plxQueued) return;
    plxQueued = true;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    requestAnimationFrame(() => {
      plxQueued = false;
      if (authUiState !== "idle") return;
      bgImg.style.transform = `translate(${(-px * 12).toFixed(1)}px, ${(-py * 6).toFixed(1)}px)`;
    });
  });

  const showError = (msg) => {
    authError = msg;
    document.getElementById("auth2Error").textContent = msg;
  };
  const submit = async () => {
    if (authUiState !== "idle") return;
    // Inline validation, copy per handoff. Beta code correctness itself is
    // server-side only (BETA_CODE is a secret) — client checks presence.
    if (isSignup && !privacyChecked) return;
    if (isSignup && !authForm.betaCode.trim()) return showError("Kode beta wajib diisi untuk daftar beta tester.");
    if (!authForm.email.trim() || !authForm.password.trim()) return showError("Email dan password wajib diisi.");
    showError("");
    authUiState = "loading";
    const btn = document.getElementById("auth2Submit");
    const helper = document.getElementById("auth2Helper");
    btn.disabled = true;
    btn.classList.add("auth2-loading");
    helper.textContent = "Masuk...";
    const floor = new Promise((r) => setTimeout(r, authReducedMotion() ? AUTH_RM_LOADING_FLOOR : AUTH_LOADING_FLOOR));
    try {
      await Promise.all([
        api(isSignup ? "/api/signup" : "/api/login", { method: "POST", body: authForm }),
        floor,
      ]);
    } catch (e) {
      await floor;
      authUiState = "idle";
      btn.disabled = false;
      btn.classList.remove("auth2-loading");
      helper.textContent = "";
      showError(e.message);
      return;
    }
    authForm = { email: "", password: "", betaCode: "" };
    privacyChecked = false;
    authUiState = "success";
    btn.classList.remove("auth2-loading");
    btn.classList.add("auth2-success");
    document.getElementById("auth2PortalGlow").classList.add("lit");
    // Signup's helper deliberately differs from the handoff's login-only
    // copy ("Selamat datang kembali!" reads wrong for a brand-new account) -
    // same deviation the previous login already made, kept for the same reason.
    helper.textContent = isSignup ? "Selamat datang di Eleva!" : "Selamat datang kembali!";
    // The real /api/state is prefetched during the success/entering/zooming
    // hold so the final crossfade lands on the real home/onboarding screen,
    // not a placeholder (handoff: "replace with the actual navigation").
    const statePrefetch = api("/api/state").catch(() => null);
    authTimers.push(setTimeout(() => {
      // Reduced motion skips entering/zooming ENTIRELY (no gate zoom, no
      // parallax) - straight from success to the flash beat.
      document.getElementById("auth2PortalGlow").classList.add("hidden");
      if (authReducedMotion()) {
        runAuthReducedFlash(statePrefetch);
      } else {
        authUiState = "entering";
        runAuthEntering(statePrefetch);
      }
    }, authReducedMotion() ? AUTH_RM_SUCCESS_HOLD : AUTH_SUCCESS_HOLD));
  };
  document.getElementById("auth2Submit").addEventListener("click", submit);
  [emailInput, pwInput, betaInput].forEach((el) => el?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submit();
  }));
}

// Resolves the real /api/state prefetch (or falls back to a normal boot) and
// renders the destination screen - shared by both the full-motion and
// reduced-motion completion paths below.
async function authFinish(statePrefetch) {
  const s = await statePrefetch;
  if (s) {
    appState = s;
    ui = { view: appState.profile ? "dashboard" : "onboarding" };
    render();
  } else {
    await boot(); // prefetch failed — fall back to the normal boot path
  }
}

// Flash beat shared by both completion paths: fast fade-in (.25s, CSS),
// hold, then reparent to <body> (survives the root.innerHTML swap while
// still opaque), resolve the real screen underneath, and fade back out
// (.6s full-motion, collapsed under reduced motion's global CSS override).
function runAuthFlash(statePrefetch, holdMs) {
  authUiState = "flash";
  const flash = document.getElementById("auth2Flash");
  flash.classList.add("lit");
  authTimers.push(setTimeout(async () => {
    authUiState = "complete";
    document.body.appendChild(flash);
    await authFinish(statePrefetch);
    flash.classList.add("auth2-flash-out"); // switch to the slower fade-OUT duration before toggling opacity back
    flash.classList.remove("lit");
    authTimers.push(setTimeout(() => flash.remove(), authReducedMotion() ? 200 : 700));
  }, holdMs));
}

function runAuthReducedFlash(statePrefetch) {
  runAuthFlash(statePrefetch, AUTH_RM_FLASH_HOLD);
}

// Post-success sequence: stickman "walks" into the portal and fades, the
// login content column fades out while the full-bleed zoom-gate image
// crossfades in (same window, so it reads as one continuous handoff, not a
// jump cut) - "entering". The gate then scales up + brightens further -
// "zooming", the only gate visual in the whole sequence, already visible
// from "entering". Then the flash beat, then the REAL boot-style render
// happens under it while still opaque, before fading back out into the
// real home/onboarding screen.
async function runAuthEntering(statePrefetch) {
  document.getElementById("auth2Content").classList.add("auth2-fade-out");
  document.getElementById("auth2Stickman").classList.add("auth2-stickman-walk");
  document.getElementById("auth2ZoomWrap").classList.add("visible");
  authTimers.push(setTimeout(() => {
    authUiState = "zooming";
    document.getElementById("auth2ZoomWrap").classList.add("zooming");
    authTimers.push(setTimeout(() => {
      runAuthFlash(statePrefetch, AUTH_FLASH_HOLD);
    }, AUTH_ZOOMING_HOLD));
  }, AUTH_ENTERING_HOLD));
}

// Just 2 static steps now - Situasi/Values/Fear and Growth Focus (v2) are both
// gone, folded into the adaptive conversation and the radar chart itself.
// Growth Focus Radar handoff (v5) and the "Eleva Onboarding Name" handoff:
// both steps' copy is hardcoded directly in renderOnboarding (needs
// explicit <br/> line breaks, not just an escaped string) - q/sub fields
// here would be dead weight.
const ONBOARD_STEPS = [
  { type: "namePromise" },
  { type: "questionCard" },
  { type: "radar" },
];

// "Eleva Onboarding Question Card" handoff ("Kartu ke-1") - fixed scenario
// question, static/local-only for now (no relation to the AI-generated
// "Kartu ke-N" scenario cards in the later adaptive phase, see
// renderAdaptive - same most/least naming, unrelated system). Order matters
// (answer indices are what onboardForm.questionCard.{most,least} store).
const QCARD_QUESTION = "Hari Sabtu pagi, kamu bangun tanpa alarm dan tidak ada rencana apa-apa. Hari ini sepenuhnya milikmu — mau kamu isi dengan apa?";
const QCARD_ANSWERS = [
  "Keluar jalan-jalan atau olahraga ringan, biarkan tubuh bergerak bebas",
  "Buka sesuatu yang ingin dipelajari tapi selalu tertunda — podcast, buku, atau kursus singkat",
  "Cek kondisi keuangan atau beresin hal-hal yang kalau diabaikan bikin kepala penuh",
  "Duduk santai, tidak melakukan apa-apa dulu — nikmati tenang sebelum hari mulai",
];
// Tap state machine (handoff "Interactions & Behavior"): tap 1 -> most; tap
// 2 on a different card -> least; tapping a selected card again clears it;
// tapping a 3rd new card while both slots are filled replaces "most" (most-
// recently-tapped new card becomes "most", "least" untouched).
function qcardSelect(i) {
  const qc = onboardForm.questionCard;
  if (qc.most === i) { qc.most = null; return; }
  if (qc.least === i) { qc.least = null; return; }
  if (qc.most === null) { qc.most = i; return; }
  if (qc.least === null) { qc.least = i; return; }
  qc.most = i;
}
function qcardInstructionText() {
  const { most, least } = onboardForm.questionCard;
  if (most !== null && least !== null) return "Pilihanmu sudah lengkap. Tap lagi jika ingin mengubah.";
  if (most !== null) return "Sekarang pilih 1 yang paling tidak menggambarkanmu.";
  return "Pilih 1 yang paling menggambarkanmu.\nLalu pilih 1 yang paling tidak menggambarkanmu.";
}

function isStepValid(step) {
  const s = ONBOARD_STEPS[step];
  // Growth Focus Radar handoff: "Continue button: Disabled... until at
  // least 1 axis is locked" - the screen's whole purpose is picking and
  // locking priorities before moving on.
  if (s.type === "radar") return onboardForm.locked.length >= 1;
  // "Eleva Onboarding Question Card" handoff: CTA disabled until both a
  // "most like me" and a "least like me" answer are selected.
  if (s.type === "questionCard") return onboardForm.questionCard.most !== null && onboardForm.questionCard.least !== null;
  // Privacy consent moved from a separate checkbox to a caption under the
  // primary button (design-handoff round) - tapping Lanjut IS the consent,
  // so only the name gates this step now.
  return onboardForm.name.trim().length > 0;
}

// Point at a RAW radius (not value-space) along axis i - the instrument
// chrome (scale rings, lock buttons) is drawn in radius-space, unlike the
// data polygon which stays in value-space via polyPoint.
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
// Per-axis label placement (Growth Focus Radar handoff, "Per-axis label
// placement" - pixel-exact, all 7 axes special-cased, no generic
// diagonal/radial fallback). Body/Growth/Autonomy sit ABOVE their lock
// button (the upper half of the heptagon); Livelihood/Purpose/Emotional/
// Social sit BELOW. Growth+Livelihood shift right of the lock button's own
// x; Autonomy+Purpose shift left; Body/Emotional/Social stay centered on
// it - a deliberate asymmetry for visual rhythm, not derived from angle.
// Magnitude trimmed 16->10 in round 9 to reclaim margin for a bigger
// heptagon (see POLY_MAXR) - still visually asymmetric, just less so.
const AXIS_LABEL_RULES = {
  body: { above: true, shift: 0 },
  growth: { above: true, shift: 10 },
  autonomy: { above: true, shift: -10 },
  livelihood: { above: false, shift: 10 },
  purpose: { above: false, shift: -10 },
  emotional: { above: false, shift: 0 },
  social: { above: false, shift: 0 },
};
// Round 14 (founder): +0.5 line's worth of extra clearance between the
// label text and the lock circle, alongside shrinking the label font
// (see .poly-label) - was 25/30.
const AXIS_LABEL_GAP_ABOVE = 33, AXIS_LABEL_GAP_BELOW = 38;
// Axis label layout shared by render + updatePolygonDOM: Inter 12px,
// wrapped to two lines when the name is two words (Emotional Stability),
// locked axis's label tinted accent. Returns {x, y, anchor, lines}.
function axisLabelLayout(i) {
  const key = POLY_ORDER[i];
  const rule = AXIS_LABEL_RULES[key];
  const [lockX, lockY] = radiusPoint(i, POLY_MAXR);
  const x = lockX + rule.shift;
  const y = rule.above ? lockY - AXIS_LABEL_GAP_ABOVE : lockY + AXIS_LABEL_GAP_BELOW;
  const label = statLabel(key);
  const lines = label.includes(" ") ? label.split(" ") : [label];
  return { x, y, anchor: "middle", lines, above: rule.above };
}
// 24x24 padlock (Growth Focus Radar handoff, "Lock button states"): body =
// rounded rect, shackle path swaps between the closed and open-swung-away
// variant. Sized/positioned as a nested <svg> centered on (x,y).
function lockIconSVG(x, y, size, locked) {
  const shackle = locked ? "M8 10V7a4 4 0 018 0v3" : "M8 10V7a4 4 0 017.4-2.3";
  return `<svg x="${(x - size / 2).toFixed(1)}" y="${(y - size / 2).toFixed(1)}" width="${size}" height="${size}" viewBox="0 0 24 24" class="lock-icon-svg" fill="none">
    <rect x="5" y="10" width="14" height="11" rx="2" /><path d="${shackle}" />
  </svg>`;
}
function renderPolygonSVG() {
  const radar = onboardForm.radar;
  const points = POLY_ORDER.map((k, i) => polyPoint(i, radar[k]));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + "Z";
  // Instrument chrome (Growth Focus Radar handoff, "Radar geometry"): 3
  // DASHED inner guide rings at 25/50/75%, thin radial spokes, and a SOLID
  // outer heptagon at 100% (faint gold fill + solid gold stroke) - the
  // outer ring is a distinct visual weight from the dashed guides, not one
  // more ring in the same style.
  const rings = [0.25, 0.5, 0.75].map((f) => `<path d="${heptagonPath(f * POLY_MAXR)}" class="poly-ring" />`).join("");
  const outerHeptagon = `<path d="${heptagonPath(POLY_MAXR)}" class="poly-outer" />`;
  const axisLines = POLY_ORDER.map((_, i) => {
    const [x, y] = radiusPoint(i, POLY_MAXR);
    return `<line x1="${POLY_CENTER}" y1="${POLY_CENTER}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="poly-axis" />`;
  }).join("");
  // Scale guide numbers along the vertical (Body) spoke, above center -
  // decreasing opacity outward-to-inward per the handoff.
  const scaleNums = [
    { v: 10, op: 0.5 }, { v: 7.5, op: 0.44 }, { v: 5, op: 0.4 }, { v: 2.5, op: 0.35 },
  ].map(({ v, op }) => {
    const y = POLY_CENTER - polyRadius(v);
    return `<text x="${POLY_CENTER + 5}" y="${(y + 2.5).toFixed(1)}" class="poly-scale-num" style="opacity:${op}">${v}</text>`;
  }).join("");
  const MONO_CHAR_W = 6.9; // Inter ~10px advance width at base scale (round 14, font shrunk 16->13.3), for the initial pre-measurement placeholder icon placement
  const labels = POLY_ORDER.map((k, i) => {
    const L = axisLabelLayout(i);
    const isLocked = onboardForm.locked.includes(k);
    const tspans = L.lines.map((line, li) => `<tspan x="${L.x.toFixed(1)}" dy="${li === 0 ? 0 : 13}">${esc(line)}</tspan>`).join("");
    // The (i) info icon sits just right of the (always centered) label text,
    // with an oversized invisible hit circle - r=6 visual alone is too
    // small a touch target. This is a rough placeholder position (Inter is
    // a proportional font, a flat per-character estimate consistently
    // undershoots real width and used to land the icon on top of the text
    // tail) - layoutAxisInfoIcons() corrects it with a real DOM
    // measurement immediately after this markup is in the DOM, before the
    // browser gets a chance to paint.
    const maxChars = Math.max(...L.lines.map((l) => l.length));
    const w = maxChars * MONO_CHAR_W;
    const iconX = L.x + w / 2 + 3;
    const iconY = L.y - 3.5;
    return `<text x="${L.x.toFixed(1)}" y="${L.y.toFixed(1)}" class="poly-label ${isLocked ? "locked" : ""}" data-label-for="${k}" text-anchor="${L.anchor}">${tspans}</text>
      <g class="axis-info-btn" data-axis-info="${k}">
        <circle cx="${iconX.toFixed(1)}" cy="${iconY.toFixed(1)}" r="11" class="axis-info-hit" />
        <circle cx="${iconX.toFixed(1)}" cy="${iconY.toFixed(1)}" r="7.5" class="axis-info-bg" />
        <text x="${iconX.toFixed(1)}" y="${(iconY + 3).toFixed(1)}" class="axis-info-glyph" text-anchor="middle">i</text>
      </g>`;
  }).join("");
  // Lock buttons sit FIXED on the outer heptagon vertex (radius-space, like
  // the old tick marks they replace) - unlike the value node below, their
  // position never moves with the axis's value.
  const lockBtns = POLY_ORDER.map((k, i) => {
    const [x, y] = radiusPoint(i, POLY_MAXR);
    const isLocked = onboardForm.locked.includes(k);
    const disabled = !isLocked && onboardForm.locked.length >= MAX_LOCKS;
    return `<g class="lock-btn ${isLocked ? "locked" : ""} ${disabled ? "disabled" : ""}" data-lock-btn-for="${k}">
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="15.75" class="lock-btn-bg" />
      ${lockIconSVG(x, y, 14, isLocked)}
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="18.75" class="lock-btn-hit" data-lock-hit="${k}" />
    </g>`;
  }).join("");
  // Value node: unlocked-inactive / unlocked-active (just dragged or its
  // lock was just tapped) / locked - 3 states, not 2. The numeric value
  // sits centered inside the node (white on unlocked, navy on locked, per
  // the handoff's contrast rule), with a background-colored halo behind it
  // so it stays legible over the dashed rings even where node fill is dark.
  const handles = POLY_ORDER.map((k, i) => {
    const [x, y] = polyPoint(i, radar[k]);
    const isLocked = onboardForm.locked.includes(k);
    const isActive = !isLocked && activeAxisKey === k;
    const dotClass = isLocked ? "locked" : isActive ? "active" : "";
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13.5" class="poly-dot ${dotClass}" data-dot-for="${k}" />
      <text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" class="poly-value ${isLocked ? "locked" : ""}" data-value-for="${k}" text-anchor="middle">${formatRadarValue(radar[k])}</text>
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="20.5" class="poly-handle" data-stat="${k}" />`;
  }).join("");
  const centerDot = `<circle cx="${POLY_CENTER}" cy="${POLY_CENTER}" r="3" class="poly-center" />`;
  return `<svg viewBox="${POLY_VIEW_MIN} ${POLY_VIEW_MIN} ${POLY_VIEW_SIZE} ${POLY_VIEW_SIZE}" class="poly-svg" id="polySvg">${rings}${outerHeptagon}${axisLines}${scaleNums}<path d="${pathD}" class="poly-shape" id="polyShape" />${centerDot}${labels}${lockBtns}${handles}</svg>`;
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
  const atCap = onboardForm.locked.length >= MAX_LOCKS;
  POLY_ORDER.forEach((k, i) => {
    const [x, y] = polyPoint(i, onboardForm.radar[k]);
    const isLocked = onboardForm.locked.includes(k);
    const isActive = !isLocked && activeAxisKey === k;
    const handle = svg.querySelector(`circle[data-stat="${k}"]`);
    if (handle) {
      handle.setAttribute("cx", x.toFixed(1));
      handle.setAttribute("cy", y.toFixed(1));
    }
    const dot = svg.querySelector(`circle[data-dot-for="${k}"]`);
    if (dot) {
      dot.setAttribute("cx", x.toFixed(1));
      dot.setAttribute("cy", y.toFixed(1));
      dot.classList.toggle("locked", isLocked);
      dot.classList.toggle("active", isActive);
    }
    const valueText = svg.querySelector(`text[data-value-for="${k}"]`);
    if (valueText) {
      valueText.setAttribute("x", x.toFixed(1));
      valueText.setAttribute("y", (y + 3).toFixed(1));
      valueText.textContent = formatRadarValue(onboardForm.radar[k]);
      valueText.classList.toggle("locked", isLocked);
    }
    const labelText = svg.querySelector(`text[data-label-for="${k}"]`);
    if (labelText) labelText.classList.toggle("locked", isLocked);
    const lockBtn = svg.querySelector(`[data-lock-btn-for="${k}"]`);
    if (lockBtn) {
      lockBtn.classList.toggle("locked", isLocked);
      lockBtn.classList.toggle("disabled", !isLocked && atCap);
      const iconWrap = lockBtn.querySelector(".lock-icon-svg");
      const shackle = iconWrap?.querySelector("path");
      if (shackle) shackle.setAttribute("d", isLocked ? "M8 10V7a4 4 0 018 0v3" : "M8 10V7a4 4 0 017.4-2.3");
    }
  });
  const points = POLY_ORDER.map((k, i) => polyPoint(i, onboardForm.radar[k]));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + "Z";
  document.getElementById("polyShape")?.setAttribute("d", pathD);
}

// Which axis is "active" - just dragged, or its lock was just toggled -
// shows a gold label + a brighter node stroke for 3.2s, then auto-clears
// (Growth Focus Radar handoff). Distinct from "locked": an unlocked axis
// can be active too, right after a drag or a tap on its (now separate)
// lock button. DOM-patched, never a full renderOnboarding(), so it can
// never interrupt an in-progress drag gesture.
// Revision 1 follow-up (founder feedback): the separate "Name / Bebas /
// X/10" detail-card row this used to also show was removed as redundant -
// the gold label + counter pill already carry that information.
let activeAxisKey = null;
let activeAxisTimer = null;
function setActiveAxis(key) {
  activeAxisKey = key;
  clearTimeout(activeAxisTimer);
  activeAxisTimer = setTimeout(() => { activeAxisKey = null; updatePolygonDOM(); }, 3200);
  updatePolygonDOM();
}
function clearActiveAxisNow() {
  if (!activeAxisKey) return;
  activeAxisKey = null;
  clearTimeout(activeAxisTimer);
  updatePolygonDOM();
}
function counterPillHTML() {
  const n = onboardForm.locked.length;
  return `<div class="radar-counter-pill">
    <svg width="13" height="13" viewBox="0 0 24 24" class="radar-counter-icon" fill="none"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 018 0v3" /></svg>
    <span><span class="radar-counter-count mono">${n} / ${MAX_LOCKS}</span> <span class="radar-counter-label">prioritas dikunci</span></span>
  </div>`;
}
function renderCounterPillDOM() {
  const slot = document.getElementById("radarCounterSlot");
  if (slot) slot.innerHTML = counterPillHTML();
  const nextBtn = document.getElementById("next");
  if (nextBtn) nextBtn.disabled = !isStepValid(onboardStep);
}
// Warning bubble: tapping a 4th lock while 3 are already locked doesn't
// lock it - a centered bubble explains why instead of a silent no-op.
let radarWarningTimer = null;
function showRadarMaxLockWarning() {
  const el = document.getElementById("radarMaxLockWarning");
  if (!el) return;
  el.classList.add("visible");
  clearTimeout(radarWarningTimer);
  radarWarningTimer = setTimeout(() => el.classList.remove("visible"), 2400);
}

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
  } else {
    // At the cap: tapping a 4th lock button does NOT lock it - explain why
    // instead of a silent no-op (Growth Focus Radar handoff). That lock
    // button's 40% opacity is already always-on at the cap via the
    // .disabled CSS class - this bubble is just the transient explanation.
    showRadarMaxLockWarning();
    return;
  }
  setActiveAxis(key); // toggling a lock also marks the axis active
  updatePolygonDOM();
  renderCounterPillDOM();
}

// Round 13 (founder: the "i" info icon overlaps the label text on all 7
// axes) - the estimate in renderPolygonSVG() above is necessarily rough
// (Inter is proportional, not monospace), so this corrects every icon's
// position with a real getBBox() measurement of its label's actual
// rendered text, right after the radar step's HTML is in the DOM. Axis
// labels never move after initial render (only value nodes do, via
// updatePolygonDOM() during drag/lock), so this only needs to run once
// per full render, not per frame.
function layoutAxisInfoIcons() {
  const svg = document.getElementById("polySvg");
  if (!svg) return;
  POLY_ORDER.forEach((k) => {
    const textEl = svg.querySelector(`text[data-label-for="${k}"]`);
    const group = svg.querySelector(`.axis-info-btn[data-axis-info="${k}"]`);
    if (!textEl || !group) return;
    const bbox = textEl.getBBox();
    const iconX = bbox.x + bbox.width + 10; // gap past the real last character, clear of the visual icon's own radius (7.5)
    const iconY = bbox.y + bbox.height / 2; // vertically centered on the real (possibly 2-line) text block
    const hit = group.querySelector(".axis-info-hit");
    const bg = group.querySelector(".axis-info-bg");
    const glyph = group.querySelector(".axis-info-glyph");
    if (hit) { hit.setAttribute("cx", iconX.toFixed(1)); hit.setAttribute("cy", iconY.toFixed(1)); }
    if (bg) { bg.setAttribute("cx", iconX.toFixed(1)); bg.setAttribute("cy", iconY.toFixed(1)); }
    if (glyph) { glyph.setAttribute("x", iconX.toFixed(1)); glyph.setAttribute("y", (iconY + 3).toFixed(1)); }
  });
}

function attachPolygonHandlers() {
  const svg = document.getElementById("polySvg");
  if (!svg) return;
  let draggingKey = null;
  let dragBase = null; // radar snapshot at gesture start - each move recomputes from it
  let downX = 0, downY = 0, moved = false, wasLimited = false;
  const TAP_THRESHOLD = 8; // px of pointer travel: below = tap, above = drag
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
      const key = handle.dataset.stat;
      e.stopPropagation();
      if (onboardForm.locked.includes(key)) {
        // Locked node: mark active only, per handoff - never starts a drag,
        // never changes the value. Unlocking is the separate lock button's job.
        setActiveAxis(key);
        return;
      }
      draggingKey = key;
      dragBase = { ...onboardForm.radar };
      downX = e.clientX; downY = e.clientY; moved = false; wasLimited = false;
      const el = document.getElementById("limitHint");
      if (el) el.style.display = "none";
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
  });
  svg.querySelectorAll(".lock-btn-hit").forEach((hit) => {
    hit.addEventListener("pointerdown", (e) => e.stopPropagation());
    hit.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleLock(hit.dataset.lockHit);
    });
  });
  svg.addEventListener("pointermove", (e) => {
    if (!draggingKey) return;
    if (!moved && Math.hypot(e.clientX - downX, e.clientY - downY) > TAP_THRESHOLD) moved = true;
    if (moved) moveTo(e.clientX, e.clientY);
  });
  svg.addEventListener("pointerup", () => {
    if (draggingKey) setActiveAxis(draggingKey); // both a tap and a drag-release mark it active
    draggingKey = null;
    dragBase = null;
  });
  svg.addEventListener("pointercancel", () => { draggingKey = null; dragBase = null; });
  // Tapping anywhere else in the radar (not a node or lock button) while
  // not dragging clears the active axis immediately.
  svg.addEventListener("pointerdown", (e) => {
    if (draggingKey) return;
    if (e.target.closest(".poly-handle, .lock-btn-hit, .axis-info-btn")) return;
    clearActiveAxisNow();
  });
}

// Growth Focus Radar handoff: Help sheet ("Tentang Fokus") and per-axis
// info sheets share ONE state slot (helpOpen) - opening either closes the
// other, same as the handoff's "only one sheet open at a time" rule. Reuses
// the app-wide #helpOverlay/#closeHelp ids so the existing delegated click
// handler (backdrop tap, close-button tap -> helpOpen=null; render()) keeps
// working with zero new wiring - only the inner content is bespoke here.
function radarSheetsHTML() {
  if (helpOpen === "radar") {
    return `
      <div class="help-overlay" id="helpOverlay">
        <div class="help-sheet radar-sheet fadeUp">
          <div class="radar-sheet-title">Tentang Fokus</div>
          <p class="radar-sheet-body">Radar ini menunjukkan arah yang ingin kamu prioritaskan, bukan nilai dirimu saat ini.</p>
          <p class="radar-sheet-body">Waktu dan energimu terbatas. Karena itu, saat satu area diperbesar, area lain perlu berbagi ruang.</p>
          <p class="radar-sheet-body">Kamu bisa mengunci maksimal 3 prioritas utama.</p>
          <button class="radar-sheet-close" id="closeHelp">Mengerti</button>
        </div>
      </div>`;
  }
  if (typeof helpOpen === "string" && helpOpen.startsWith("axis:")) {
    const key = helpOpen.slice(5);
    return `
      <div class="help-overlay" id="helpOverlay">
        <div class="help-sheet radar-sheet fadeUp">
          <div class="radar-sheet-title">${esc(statLabel(key))}</div>
          <p class="radar-sheet-body">${esc(AXIS_DEFINITIONS[key] || "")}</p>
          <button class="radar-sheet-close" id="closeHelp">Tutup</button>
        </div>
      </div>`;
  }
  return "";
}

// "Eleva Onboarding Name" handoff: help sheet reuses the exact same shell
// AND inner content classes as the radar screen's own sheets
// (.help-sheet.radar-sheet, .radar-sheet-title/-body/-close) per the
// handoff's explicit "same shell as the radar screen's sheets" note -
// deliberately not a parallel near-duplicate set of classes. Same
// #helpOverlay/#closeHelp id reuse as radarSheetsHTML(), so the existing
// app-wide delegated click handler needs zero new wiring here either.
function nameSheetHTML() {
  if (helpOpen !== "name") return "";
  return `
    <div class="help-overlay" id="helpOverlay">
      <div class="help-sheet radar-sheet fadeUp">
        <div class="radar-sheet-title">Tentang onboarding</div>
        <p class="radar-sheet-body">Jawabanmu membantu Eleva menyesuaikan pathway, quest, dan arah perkembanganmu.</p>
        <button class="radar-sheet-close" id="closeHelp">Mengerti</button>
      </div>
    </div>`;
}

function renderOnboarding() {
  const step = ONBOARD_STEPS[onboardStep];
  const last = onboardStep === ONBOARD_STEPS.length - 1;

  if (step.type === "namePromise") {
    // "Eleva Onboarding Name" handoff: bespoke shell (.shell-name) mirroring
    // .shell-radar's fixed/no-scroll viewport pattern so this screen feels
    // continuous with the one right after it - see .shell-name in
    // styles.css for why that specific pattern (not a plain scrollable
    // page) was chosen. Help sheet reuses the radar screen's exact sheet
    // classes (nameSheetHTML) per the handoff's own "same shell as the
    // radar screen's sheets" instruction.
    root.innerHTML = `
      <div class="shell shell-name">
        <div class="radar-header-row">
          <div class="eyebrow mono radar-header-eyebrow">ELEVA · ONBOARDING</div>
          <button class="radar-help-btn" data-help="name" aria-label="Bantuan">?</button>
        </div>
        <div class="step-dots">
          ${ONBOARD_STEPS.map((_, i) => `<div class="dot-seg ${i <= onboardStep ? "active" : ""}"></div>`).join("")}
        </div>
        <h1 class="fr name-title">Siapa namamu?</h1>
        <p class="name-explain">Nama ini akan Eleva gunakan untuk menyapamu sepanjang perjalananmu.</p>
        <input type="text" id="fld" class="name-input" value="${esc(onboardForm.name)}" placeholder="Nama panggilan" autofocus />
        <div class="name-highlight-row">
          <svg width="17" height="17" viewBox="0 0 24 24" class="name-sparkle"><path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2L12 2z" fill="currentColor" /></svg>
          <p class="fr name-highlight-text">Semua yang kamu ceritakan di sini membantu Eleva mengenal perjalananmu.</p>
        </div>
        <p class="name-secondary-note">Data onboardingmu digunakan untuk mempersonalisasi pengalaman Eleva.</p>
        <div class="onboard-nav-row">
          <button class="btn-ghost" id="back" style="visibility:${onboardStep > 0 ? "visible" : "hidden"}">← Kembali</button>
          <button class="btn-primary" id="next" ${isStepValid(onboardStep) ? "" : "disabled"}>Lanjut →</button>
        </div>
      </div>
      ${nameSheetHTML()}`;
  } else if (step.type === "questionCard") {
    // "Eleva Onboarding Question Card" handoff ("Kartu ke-1"): reuses the
    // shared .radar-header-row/.step-dots/.onboard-nav-row frame (round 18,
    // matching the founder's byte-matched-shell direction from rounds
    // 16-17) but has no help sheet/button of its own - the right side of
    // the header is a plain "KARTU KE-1" label, not a "?" button.
    const qc = onboardForm.questionCard;
    root.innerHTML = `
      <div class="shell shell-qcard">
        <div class="radar-header-row">
          <div class="eyebrow mono radar-header-eyebrow">ELEVA · ONBOARDING</div>
          <div class="qcard-count mono">KARTU KE-1</div>
        </div>
        <div class="step-dots">
          ${ONBOARD_STEPS.map((_, i) => `<div class="dot-seg ${i <= onboardStep ? "active" : ""}"></div>`).join("")}
        </div>
        <div class="qcard-card">
          <svg class="qcard-ornament" viewBox="0 0 100 100" fill="none">
            <path d="M78 20 Q92 40 82 70 Q75 90 88 98" stroke="#c9963f" stroke-width="0.6" opacity="0.35" />
            <path d="M85 30 Q95 55 80 80" stroke="#c9963f" stroke-width="0.5" opacity="0.25" />
            <circle cx="80" cy="12" r="1.4" fill="#e5aa50" opacity="0.8" />
            <circle cx="90" cy="24" r="0.8" fill="#e5aa50" opacity="0.5" />
          </svg>
          <svg class="qcard-star" width="12" height="12" viewBox="0 0 20 20" fill="#e5aa50">
            <path d="M10 0 L11.5 8.5 L20 10 L11.5 11.5 L10 20 L8.5 11.5 L0 10 L8.5 8.5 Z" />
          </svg>
          <p class="qcard-question">${esc(QCARD_QUESTION)}</p>
        </div>
        <p class="qcard-instruction">${esc(qcardInstructionText())}</p>
        <div class="qcard-answers">
          ${QCARD_ANSWERS.map((label, i) => {
            const isMost = qc.most === i, isLeast = qc.least === i;
            const cls = isMost ? "positive" : isLeast ? "negative" : "";
            const icon = isMost
              ? `<svg width="24" height="24" viewBox="0 0 24 24" class="qcard-answer-icon" fill="none"><circle cx="12" cy="12" r="10" stroke="#6fd39a" stroke-width="1.4" /><path d="M7.5 12.5L10.3 15.3L16.5 8.5" stroke="#6fd39a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>`
              : isLeast
                ? `<svg width="24" height="24" viewBox="0 0 24 24" class="qcard-answer-icon" fill="none"><circle cx="12" cy="12" r="10" stroke="#d97a7a" stroke-width="1.4" /><path d="M7.5 12H16.5" stroke="#d97a7a" stroke-width="1.6" stroke-linecap="round" /></svg>`
                : "";
            return `<button class="qcard-answer ${cls}" data-qcard-idx="${i}">
              <p class="qcard-answer-text">${esc(label)}</p>
              ${icon}
            </button>`;
          }).join("")}
        </div>
        <div class="onboard-nav-row">
          <button class="btn-ghost" id="back" style="visibility:${onboardStep > 0 ? "visible" : "hidden"}">← Kembali</button>
          <button class="btn-primary" id="next" ${isStepValid(onboardStep) ? "" : "disabled"}>Lanjut →</button>
        </div>
      </div>`;
  } else if (step.type === "radar") {
    // Growth Focus Radar handoff: exact copy, explicit 2-line breaks (not
    // browser auto-wrap) - raw HTML is safe here, both strings are fixed
    // literals, never user input.
    const headingHTML = `<h1 class="fr radar-heading">Ke mana kamu mau<br/>fokus sekarang?</h1>
      <p class="radar-explainer">Ini tentang prioritasmu ke depan, bukan menilai kondisimu saat ini.<br/>Tarik titik untuk menentukan porsi fokus yang paling penting bagimu.</p>`;
    const bodyHTML = `
      <div class="radar-tradeoff-strip">
        <span class="radar-tradeoff-icon">✦</span>
        <span class="radar-tradeoff-text">Kamu tidak bisa membuat semua area jadi <span class="radar-accent-strong">10/10</span> sekaligus.</span>
      </div>
      <div class="radar-lock-instructions">
        <span class="radar-lock-instr-item">
          <svg width="12" height="12" viewBox="0 0 12 12" class="radar-target-icon" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" /><circle cx="6" cy="6" r="1.5" fill="currentColor" /></svg>
          Pilih <span class="radar-accent-strong">maksimal 3</span> prioritas
        </span>
        <span class="radar-lock-instr-divider">|</span>
        <span class="radar-lock-instr-item">
          <svg width="12" height="12" viewBox="0 0 24 24" class="radar-lock-instr-icon" fill="none"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 018 0v3" /></svg>
          Ketuk titik untuk <span class="radar-accent-strong">mengunci</span>
        </span>
      </div>
      <div class="poly-wrap">${renderPolygonSVG()}</div>
      <p class="mono" id="limitHint" style="font-size:12px;color:var(--accent);margin-top:10px;text-align:center;display:none"></p>
      <div id="radarCounterSlot" class="radar-counter-slot">${counterPillHTML()}</div>
      <div class="radar-max-lock-warning" id="radarMaxLockWarning">Maksimal 3 prioritas.<br/>Buka salah satu prioritas dulu.</div>`;

    root.innerHTML = `
      <div class="shell shell-radar">
        <div class="radar-header-row">
          <div class="eyebrow mono radar-header-eyebrow">ELEVA · ONBOARDING</div>
          <button class="radar-help-btn" data-help="radar" aria-label="Bantuan">?</button>
        </div>
        <div class="step-dots">
          ${ONBOARD_STEPS.map((_, i) => `<div class="dot-seg ${i <= onboardStep ? "active" : ""}"></div>`).join("")}
        </div>
        ${radarSheetsHTML()}
        <div class="fadeUp">
          ${headingHTML}
          <div class="field">${bodyHTML}</div>
        </div>
        <div class="onboard-nav-row">
          <button class="btn-ghost" id="back" style="visibility:${onboardStep > 0 ? "visible" : "hidden"}">← Kembali</button>
          <button class="btn-primary" id="next" ${isStepValid(onboardStep) ? "" : "disabled"}>Lanjut →</button>
        </div>
      </div>`;
  }

  const fld = document.getElementById("fld");
  if (fld) fld.addEventListener("input", (e) => {
    onboardForm.name = e.target.value;
    document.getElementById("next").disabled = !isStepValid(onboardStep);
  });
  if (step.type === "radar") { attachPolygonHandlers(); layoutAxisInfoIcons(); }
  // Per-axis (i) info icons live inside the SVG - tapping one toggles the
  // shared helpOpen slot to that axis's info sheet (see radarSheetsHTML).
  document.querySelectorAll("[data-axis-info]").forEach((el) => el.addEventListener("click", (e) => {
    e.stopPropagation();
    const axis = "axis:" + el.dataset.axisInfo;
    helpOpen = helpOpen === axis ? null : axis;
    renderOnboarding();
  }));
  document.querySelectorAll("[data-qcard-idx]").forEach((el) => el.addEventListener("click", () => {
    qcardSelect(Number(el.dataset.qcardIdx));
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
// Task 7c (P1 item 6, real bug found in testing): a single MM:SS text field
// was ambiguous ("2211" - 22 min 11 sec? 2211 minutes?) - replaced with two
// separate MENIT/DETIK number inputs, combined here to the same decimal-
// minutes shape every other consumer (pace calc, server validation, target
// metrics) already expects, so only this one conversion edge changes.
function durasiMenitFromFields(sf) {
  const min = Number(sf.durasiMin) || 0;
  const sec = Math.min(59, Number(sf.durasiSec) || 0);
  const total = min + sec / 60;
  return total > 0 ? total : null;
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

// Task 9 (Practice Test): browser-native TTS only, per founder spec - free,
// no paid TTS/native app needed for the pilot. Robotic/inconsistent voice
// quality across devices is a known, accepted limitation of this choice
// (see PRD bagian 13), not a bug - upgrading to a paid TTS is an explicit
// later-phase option, not a blocker to shipping this.
function speakScript(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

const PRACTICE_LABELS = { reading: "Reading", listening: "Listening", academic: "Academic", general: "General Training" };

function practiceQuestionHTML(q, idx) {
  const chosen = practiceTestFlow.answers[q.id];
  if (q.type === "fill") {
    return `
      <div class="field">
        <label>${idx + 1}. ${esc(q.text)}</label>
        <input type="text" data-pt-fill="${esc(q.id)}" value="${esc(chosen || "")}" placeholder="Jawabanmu..." />
      </div>`;
  }
  return `
    <div class="field">
      <label>${idx + 1}. ${esc(q.text)}</label>
      <div class="status-row" style="flex-wrap:wrap">
        ${(q.options || []).map((o) => `<button class="status-btn ${chosen === o ? "active" : ""}" data-pt-choice="${esc(q.id)}" data-pt-value="${esc(o)}">${esc(o)}</button>`).join("")}
      </div>
    </div>`;
}

// Task 9: the practice-test flow is entirely separate from reflectOpen/
// recordMode (see the click handler below that branches on completionType) -
// it renders in questSectionHTML's place, not alongside it.
function practiceTestFlowHTML() {
  const f = practiceTestFlow;
  if (!f) return "";
  if (f.step === "error") {
    return `
      <div class="quest-card fadeUp">
        <div class="qlabel mono">PRACTICE TEST</div>
        <h2 class="fr">Gagal menyusun soal</h2>
        <p style="color:var(--rust);font-size:13px;margin:8px 0 14px">${esc(f.error || "Terjadi kesalahan.")}</p>
        <button class="btn-primary full" id="ptRetry">Coba lagi</button>
        <button class="btn-ghost" id="ptCancel" style="margin-top:10px">← Batal</button>
      </div>`;
  }
  if (f.step === "kind") {
    return `
      <div class="quest-card fadeUp">
        <div class="qlabel mono">PRACTICE TEST</div>
        <h2 class="fr">Mau latihan apa dulu?</h2>
        <div class="status-row" style="margin-top:14px">
          <button class="status-btn" data-pt-kind="reading">Reading</button>
          <button class="status-btn" data-pt-kind="listening">Listening</button>
        </div>
        <button class="btn-ghost" id="ptCancel" style="margin-top:14px">← Batal</button>
      </div>`;
  }
  if (f.step === "track") {
    return `
      <div class="quest-card fadeUp">
        <div class="qlabel mono">PRACTICE TEST · ${PRACTICE_LABELS[f.kind]}</div>
        <h2 class="fr">Academic atau General Training?</h2>
        <div class="status-row" style="margin-top:14px">
          <button class="status-btn" data-pt-track="academic">Academic</button>
          <button class="status-btn" data-pt-track="general">General Training</button>
        </div>
        ${f.error ? `<p style="color:var(--rust);font-size:13px;margin:12px 0 0">${esc(f.error)}</p>` : ""}
        <button class="btn-ghost" id="ptCancel" style="margin-top:14px">← Batal</button>
      </div>`;
  }
  if (f.step === "test") {
    const p = f.payload;
    const body = f.kind === "listening" ? p.script : p.passage;
    return `
      <div class="quest-card fadeUp">
        <div class="qlabel mono">${p.entryType === "drill" ? `DRILL${p.focusCategory ? ` · ${esc(p.focusCategory).toUpperCase()}` : ""}` : "PRACTICE TEST"} · ${PRACTICE_LABELS[f.kind]} · ${PRACTICE_LABELS[f.track]}</div>
        ${p.entryType === "drill" ? `<p class="why">Drill terfokus ${p.questions.length} soal — latihan kategori terlemahmu dari attempt sebelumnya, bukan pengukuran ulang penuh.</p>` : ""}
        ${f.kind === "listening" ? `
          <p class="why">Skrip dibacakan lewat suara browser — kualitasnya bisa terdengar robotic tergantung device, ini batasan versi pilot, bukan bug.</p>
          <button class="btn-ghost" id="ptPlay" ${f.plays >= 2 ? "disabled" : ""}>${f.plays >= 2 ? "Sudah diputar 2x" : `▶ Putar (${f.plays}/2 terpakai)`}</button>
        ` : `<p class="desc" style="white-space:pre-wrap;line-height:1.7">${esc(body)}</p>`}
        <div style="margin-top:18px">
          ${p.questions.map((q, i) => practiceQuestionHTML(q, i)).join("")}
        </div>
        ${f.error ? `<p style="color:var(--rust);font-size:13px;margin:0 0 12px">${esc(f.error)}</p>` : ""}
        <button class="btn-primary full" id="ptSubmit">Submit jawaban</button>
        <button class="btn-ghost" id="ptCancel" style="margin-top:10px">← Batal</button>
      </div>`;
  }
  return "";
}

// Reads a File into {mimeType, dataBase64, filename} - shared by the CV
// upload, job-posting screenshots, and the Artifacts sheet's add/replace
// forms. readAsDataURL gives "data:<mime>;base64,<data>" - only the part
// after the comma goes to the server.
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result || "";
      const comma = result.indexOf(",");
      resolve({ mimeType: file.type, dataBase64: comma >= 0 ? result.slice(comma + 1) : "", filename: file.name });
    };
    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.readAsDataURL(file);
  });
}

// Task 10b: entirely separate from reflectOpen/practiceTestFlow, same
// precedence pattern in questSectionHTML below. step "upload-cv" is skipped
// straight to "upload-job" by the click handler if the Artifacts library
// already has a CV - a returning user never has to re-upload one.
function jobMatchFlowHTML() {
  const f = jobMatchFlow;
  if (!f) return "";
  if (f.step === "upload-cv") {
    return `
      <div class="quest-card fadeUp">
        <div class="qlabel mono">JOB MATCH ANALYSIS</div>
        <h2 class="fr">Upload CV dulu</h2>
        <p class="why">Belum ada CV tersimpan di Artifacts. Upload sekali di sini, dipakai lagi otomatis buat quest serupa berikutnya — bisa diganti kapan pun lewat icon Artifacts. Format: PDF, DOCX, atau foto/gambar CV.</p>
        <input type="file" id="jmCvFile" accept=".pdf,.docx,image/png,image/jpeg,image/webp" />
        ${f.error ? `<p style="color:var(--rust);font-size:13px;margin:12px 0 0">${esc(f.error)}</p>` : ""}
        <button class="btn-ghost" id="jmCancel" style="margin-top:14px">← Batal</button>
      </div>`;
  }
  if (f.step === "upload-job") {
    return `
      <div class="quest-card fadeUp">
        <div class="qlabel mono">JOB MATCH ANALYSIS</div>
        <h2 class="fr">Upload lowongan yang mau dicek</h2>
        <p class="why">CV: ${esc(f.cvArtifact?.content?.filename || "tersimpan")} ✓ — Screenshot lowongan kerjanya, boleh lebih dari satu sekaligus kalau postingannya kepanjangan buat satu layar.</p>
        <input type="file" id="jmJobFiles" accept="image/png,image/jpeg,image/webp" multiple />
        ${f.images.length ? `<p class="mono" style="font-size:12px;color:var(--muted);margin:8px 0 0">${f.images.length} gambar dipilih</p>` : ""}
        ${f.error ? `<p style="color:var(--rust);font-size:13px;margin:12px 0 0">${esc(f.error)}</p>` : ""}
        <button class="btn-primary full" id="jmAnalyze" style="margin-top:14px" ${f.images.length ? "" : "disabled"}>Analisis kecocokan</button>
        <button class="btn-ghost" id="jmChangeCv" style="margin-top:10px">Ganti CV</button>
        <button class="btn-ghost" id="jmCancel">← Batal</button>
      </div>`;
  }
  return "";
}

// Task 14 point 5: "Submit Application" - structured evidence FORM (not
// free text), same "separate flow" pattern as jobMatchFlowHTML. Reuses the
// Artifacts library for cvVersionUsed exactly like Job Match Analysis does
// (a returning user's default CV is pre-selected, "Ganti CV" reopens the
// picker) - no new CV-upload UI needed, this step always follows a
// job-match-analysis quest that already required one.
function jobApplicationFlowHTML() {
  const f = jobApplicationFlow;
  if (!f) return "";
  if (f.step === "cv") {
    return `
      <div class="quest-card fadeUp">
        <div class="qlabel mono">SUBMIT APPLICATION</div>
        <h2 class="fr">Upload CV dulu</h2>
        <p class="why">Belum ada CV tersimpan di Artifacts. Upload sekali di sini sebagai versi CV yang dipakai untuk lamaran ini.</p>
        <input type="file" id="jaCvFile" accept=".pdf,.docx,image/png,image/jpeg,image/webp" />
        ${f.error ? `<p style="color:var(--rust);font-size:13px;margin:12px 0 0">${esc(f.error)}</p>` : ""}
        <button class="btn-ghost" id="jaCancel" style="margin-top:14px">← Batal</button>
      </div>`;
  }
  if (f.step === "form") {
    const ff = (k) => esc(f.form[k] ?? "");
    return `
      <div class="quest-card fadeUp">
        <div class="qlabel mono">SUBMIT APPLICATION</div>
        <h2 class="fr">Catat lamaran yang barusan disubmit</h2>
        <p class="why">CV: ${esc(f.cvArtifact?.content?.filename || "tersimpan")} ✓ — Bukti submit wajib diisi supaya tercatat sebagai Qualified Application beneran, bukan klaim kosong.</p>
        <div class="field"><label>Nama perusahaan</label><input type="text" maxlength="200" data-jaf="companyName" value="${ff("companyName")}" placeholder="mis. Acme Corp" /></div>
        <div class="field"><label>Judul role</label><input type="text" maxlength="200" data-jaf="roleTitle" value="${ff("roleTitle")}" placeholder="mis. Data Analyst" /></div>
        <div class="field"><label>Tanggal apply</label><input type="date" data-jaf="dateApplied" value="${ff("dateApplied")}" /></div>
        <div class="field"><label>Bukti submit</label><textarea rows="3" maxlength="500" data-jaf="submissionProof" placeholder="Link konfirmasi, isi email dari HR/portal, atau nomor referensi aplikasi">${ff("submissionProof")}</textarea></div>
        ${f.error ? `<p style="color:var(--rust);font-size:13px;margin:12px 0 0">${esc(f.error)}</p>` : ""}
        <button class="btn-primary full" id="jaSubmit" style="margin-top:14px">Simpan lamaran</button>
        <button class="btn-ghost" id="jaChangeCv" style="margin-top:10px">Ganti CV</button>
        <button class="btn-ghost" id="jaCancel">← Batal</button>
      </div>`;
  }
  return "";
}

// SOMA Nutrition Part B: "Log Meal" flow / Nutrition page. Doubles as both
// per the brief's item 6 (a dedicated screen showing today's totals, meal
// recorded/not-recorded rows, primary-target emphasis) and the entry UI
// itself - same "dedicated flow screen reached by tapping Mulai" pattern as
// jobMatchFlowHTML/practiceTestFlowHTML, not a new permanent nav tab (no nav
// redesign was asked for). primaryMetric's row is visually emphasized
// (accent color) per item 6 - "Eleva visual language, not Yazio's" means
// plain bars/mono numbers matching this app's existing aesthetic, not
// skeuomorphic rings/icons.
const MEAL_TYPE_LABEL = { sarapan: "Sarapan", makan_siang: "Makan Siang", makan_malam: "Makan Malam", camilan: "Camilan" };
const NUTRITION_METRIC_LABEL = { calories: "Kalori", protein: "Protein", carbohydrates: "Karbo", fat: "Lemak" };
const NUTRITION_METRIC_UNIT = { calories: "kkal", protein: "g", carbohydrates: "g", fat: "g" };
function nutritionProgressLabel(p) {
  return `Meals ${p.completedContributions}/${p.requiredContributions} · ${NUTRITION_METRIC_LABEL[p.primaryMetric]} ${Math.round(p.currentValue)}/${p.targetValue}${NUTRITION_METRIC_UNIT[p.primaryMetric]}`;
}
function nutritionTotalsHTML(entries, primaryMetric) {
  const totals = entries.reduce((acc, e) => {
    acc.calories += e.calories; acc.protein += e.protein; acc.carbohydrates += e.carbohydrates; acc.fat += e.fat;
    return acc;
  }, { calories: 0, protein: 0, carbohydrates: 0, fat: 0 });
  return `
    <div class="struct-grid" style="margin:0 0 16px">
      ${["calories", "protein", "carbohydrates", "fat"].map((m) => `
        <div class="field" style="margin-bottom:0${m === primaryMetric ? ";color:var(--accent)" : ""}">
          <label style="${m === primaryMetric ? "color:var(--accent)" : ""}">${NUTRITION_METRIC_LABEL[m]}${m === primaryMetric ? " ★" : ""}</label>
          <div class="mono" style="font-size:16px;font-weight:600">${Math.round(totals[m])}${NUTRITION_METRIC_UNIT[m]}</div>
        </div>`).join("")}
    </div>`;
}
function nutritionFlowHTML() {
  const f = nutritionFlow;
  if (!f) return "";
  const p = f.quest.progressive;
  const recordedMeals = new Set(f.entries.map((e) => e.mealType));

  if (f.step === "completed") {
    return `
      <div class="quest-card fadeUp">
        <div class="qlabel mono">NUTRITION</div>
        <h2 class="fr">Milestone hari ini selesai</h2>
        <p class="fr" style="font-style:italic;font-size:14.5px;line-height:1.6">${esc(f.completedMessage || "")}</p>
        <button class="btn-primary full" id="nfClose" style="margin-top:14px">Lanjut</button>
      </div>`;
  }

  if (f.step === "confirm") {
    const it = f.pending;
    const nf = (k) => esc(it[k] ?? "");
    return `
      <div class="quest-card fadeUp">
        <div class="qlabel mono">NUTRITION — ${esc(MEAL_TYPE_LABEL[f.mealType])}</div>
        <h2 class="fr">Konfirmasi makanan</h2>
        ${it.source === "photo" ? `<p class="why">Perkiraan dari foto — koreksi dulu kalau kurang tepat sebelum disimpan.</p>` : ""}
        <div class="field"><label>Nama makanan</label><input type="text" maxlength="200" data-nf="foodName" value="${nf("foodName")}" /></div>
        <div class="struct-grid">
          <div class="field"><label>Jumlah porsi</label><input type="number" min="0.1" step="0.1" data-nf="servingAmount" value="${nf("servingAmount")}" /></div>
          <div class="field"><label>Satuan</label><input type="text" maxlength="40" data-nf="servingUnit" value="${nf("servingUnit")}" /></div>
        </div>
        <div class="struct-grid">
          <div class="field"><label>Kalori (kkal)</label><input type="number" min="0" data-nf="calories" value="${nf("calories")}" /></div>
          <div class="field"><label>Protein (g)</label><input type="number" min="0" step="0.1" data-nf="protein" value="${nf("protein")}" /></div>
        </div>
        <div class="struct-grid">
          <div class="field"><label>Karbohidrat (g)</label><input type="number" min="0" step="0.1" data-nf="carbohydrates" value="${nf("carbohydrates")}" /></div>
          <div class="field"><label>Lemak (g)</label><input type="number" min="0" step="0.1" data-nf="fat" value="${nf("fat")}" /></div>
        </div>
        ${f.error ? `<p style="color:var(--rust);font-size:13px;margin:12px 0 0">${esc(f.error)}</p>` : ""}
        <button class="btn-primary full" id="nfSave" style="margin-top:14px">Simpan</button>
        <button class="btn-ghost" id="nfBackToLog" style="margin-top:10px">← Batal</button>
      </div>`;
  }

  if (f.step === "photo") {
    return `
      <div class="quest-card fadeUp">
        <div class="qlabel mono">NUTRITION — ${esc(MEAL_TYPE_LABEL[f.mealType])}</div>
        <h2 class="fr">Upload foto makanan</h2>
        <p class="why">Eleva coba tebak isi & perkiraan gizinya dari foto — tetap bisa kamu koreksi sebelum disimpan (opsional, cara lebih cepat dibanding cari manual).</p>
        <input type="file" id="nfPhotoFile" accept="image/png,image/jpeg,image/webp" />
        ${f.photoError ? `<p style="color:var(--rust);font-size:13px;margin:12px 0 0">${esc(f.photoError)}</p>` : ""}
        <button class="btn-ghost" id="nfBackToLog" style="margin-top:14px">← Batal</button>
      </div>`;
  }

  // step "log" (default): the Nutrition page itself.
  return `
    <div class="quest-card fadeUp">
      <div class="qlabel mono">NUTRITION</div>
      <h2 class="fr">${esc(f.quest.title)}</h2>
      ${p ? `<p class="mono" style="font-size:12.5px;color:var(--muted);margin:0 0 14px">${esc(nutritionProgressLabel(p))}</p>` : ""}
      ${nutritionTotalsHTML(f.entries, p?.primaryMetric)}
      <div class="field">
        <label>Waktu makan</label>
        <div class="status-row">
          ${Object.entries(MEAL_TYPE_LABEL).map(([k, l]) =>
            `<button class="status-btn ${f.mealType === k ? "active" : ""}" data-nf-meal="${k}">${l}${recordedMeals.has(k) ? " ✓" : ""}</button>`).join("")}
        </div>
      </div>
      ${f.mealType ? `
      <div class="field">
        <label>Cari makanan</label>
        <input type="text" id="nfSearchInput" value="${esc(f.search.query)}" placeholder="mis. nasi putih, telur rebus" />
      </div>
      ${f.search.results.map((r) => `
        <div class="quest-card" style="margin-bottom:8px;padding:14px" data-nf-pick="${r.id}">
          <div style="display:flex;justify-content:space-between;gap:10px"><b style="font-size:14px">${esc(r.name)}</b><span class="mono" style="color:var(--muted);white-space:nowrap">${r.calories} kkal</span></div>
          <div class="mono" style="font-size:11.5px;color:var(--muted)">${r.servingAmount}${esc(r.servingUnit)} · P${r.protein} K${r.carbohydrates} L${r.fat}</div>
        </div>`).join("")}
      ${f.search.error ? `<p style="color:var(--rust);font-size:13px">${esc(f.search.error)}</p>` : ""}
      <button class="btn-ghost" id="nfPhotoStart" style="margin-top:6px">📷 atau upload foto</button>
      ` : `<p class="why">Pilih waktu makan dulu.</p>`}
      ${f.entries.length ? `
      <div class="eyebrow mono" style="margin-top:20px">TERCATAT HARI INI</div>
      ${f.entries.map((e) => `<div class="mono" style="font-size:12px;color:var(--muted);padding:6px 0;border-bottom:1px solid var(--hair)">${esc(MEAL_TYPE_LABEL[e.mealType])} · ${esc(e.foodName)} · ${Math.round(e.calories)} kkal</div>`).join("")}` : ""}
      ${f.error ? `<p style="color:var(--rust);font-size:13px;margin:12px 0 0">${esc(f.error)}</p>` : ""}
      <button class="btn-primary full" id="nfDone" style="margin-top:18px">Selesai untuk sekarang</button>
    </div>`;
}

// Task 10a: Artifacts library sheet - reachable any time via its own icon,
// independent of any quest flow (spec: "lihat, tambah, ATAU GANTI artifact
// kapan saja"). artifactsList is metadata-only (no file bytes - see
// db.js stripArtifactPreview), fetched lazily on first open.
const ARTIFACT_TYPE_LABEL = { cv: "CV", portfolio: "Portfolio", certificate: "Sertifikat", other: "Lainnya" };
function artifactsSheetHTML() {
  if (!artifactsOpen) return "";
  const list = artifactsList || [];
  return `
    <div class="help-overlay" id="artifactsOverlay">
      <div class="help-sheet fadeUp" style="max-height:82vh;overflow-y:auto">
        <div class="eyebrow mono" style="margin:0 0 12px">ARTIFACTS</div>
        <p class="why" style="margin:0 0 16px">Dokumenmu tersimpan di sini — CV, portfolio, sertifikat. Sekali upload, dipakai lagi otomatis di quest yang butuh, tanpa nanya ulang.</p>
        ${list.length ? list.map((a) => `
          <div class="quest-card" style="margin-bottom:10px">
            <div class="qlabel mono">${esc(ARTIFACT_TYPE_LABEL[a.type] || a.type)}</div>
            <p class="desc" style="margin:4px 0 10px">${esc(a.content?.kind === "text" ? (a.content.text || "").slice(0, 120) + "…" : a.content?.filename || "file")}</p>
            <button class="btn-ghost" data-artifact-replace="${a.id}">Ganti</button>
          </div>`).join("") : `<p class="why" style="margin:0 0 16px">Belum ada artifact tersimpan.</p>`}
        <div class="field" style="margin-top:10px">
          <label>+ Tambah CV baru</label>
          <input type="file" id="artifactAddFile" accept=".pdf,.docx,image/png,image/jpeg,image/webp" />
        </div>
        ${artifactsError ? `<p style="color:var(--rust);font-size:13px;margin:8px 0 0">${esc(artifactsError)}</p>` : ""}
        <button class="btn-primary full" id="artifactsClose" style="margin-top:16px">Tutup</button>
      </div>
    </div>`;
}

// Task 9: score + per-wrong-answer explanation, folded into the same
// completedResultCardHTML acknowledgment used for every other quest type -
// same "Lanjut" dismiss/refetch flow, no separate results screen to build.
// Task 13 (Objective Assessment Engine): rebuilt around the founder-approved
// block structure - header "{TRACK} SPRINT #n" (or DRILL), score+metadata,
// ESTIMATED LEVEL (band range + confidence, NEVER a single "IELTS Band
// Score: X.X"), ELEVA OBSERVED (deterministic per-category Strong/Unstable
// from the grading breakdown - the Time bucket is a known gap until the
// 30-minute active timer exists), and ELEVA DECISION (Primary Quest /
// Current Target / Next Trial, reusing the Task 7d hierarchy labels).
// The generic 3-line Eleva Response interpretation is intentionally NOT
// rendered for practice-test results - these blocks replace it (see
// completedResultCardHTML).
function practiceTestResultHTML(pt) {
  const a = pt.assessment || null;
  const trackName = PRACTICE_LABELS[pt.kind] || pt.kind;
  const header = a
    ? (a.entryType === "drill" ? `${trackName.toUpperCase()} DRILL` : `${trackName.toUpperCase()} SPRINT #${String(a.sprintNumber || 1).padStart(2, "0")}`)
    : `${trackName.toUpperCase()} PRACTICE`;
  const catRow = (cats) => cats.map((c) => {
    const b = a.categories.breakdown[c];
    return `${esc(c)}${b ? ` (${b.correct}/${b.total})` : ""}`;
  }).join(" · ");
  return `
    <div class="eyebrow mono" style="margin:0 0 6px">${header}</div>
    <div class="mono" style="font-size:12px;color:var(--muted);margin:0 0 12px">
      Skor ${pt.score}/${pt.total} · ${PRACTICE_LABELS[pt.track]} ${trackName}
    </div>
    ${a && a.band ? `
    <div class="pt-block">
      <div class="eyebrow mono">ESTIMATED LEVEL</div>
      <p class="pt-band mono">IELTS ${a.band.rangeLow}–${a.band.rangeHigh}</p>
      <p class="mono pt-band-meta">Projected raw ≈ ${a.band.projectedRaw}/40</p>
      <p class="mono pt-band-meta">Confidence: ${esc(a.confidence)} · ${a.totalQuestions} questions observed</p>
    </div>` : ""}
    ${a ? `
    <div class="pt-block">
      <div class="eyebrow mono">ELEVA OBSERVED</div>
      ${a.categories.strong.length ? `<p class="pt-obs"><span class="pt-obs-label strong">Strong</span> ${catRow(a.categories.strong)}</p>` : ""}
      ${a.categories.unstable.length ? `<p class="pt-obs"><span class="pt-obs-label unstable">Unstable</span> ${catRow(a.categories.unstable)}</p>` : ""}
      ${!a.categories.strong.length && !a.categories.unstable.length ? `<p class="pt-obs" style="color:var(--muted)">Semua kategori di rentang tengah — belum ada yang menonjol kuat atau lemah.</p>` : ""}
    </div>
    <div class="pt-block">
      <div class="eyebrow mono">ELEVA DECISION</div>
      ${a.milestoneAchieved ? `<p class="pt-obs" style="color:var(--growth)">Milestone achieved — ${esc(PRACTICE_LABELS[a.trackKey] || a.trackKey)} baseline established: ~${a.band ? `${a.band.rangeLow}–${a.band.rangeHigh}` : ""}</p>` : ""}
      ${a.decision.primaryQuest ? `<p class="pt-obs"><span class="pt-obs-label">Primary Quest</span> ${esc(a.decision.primaryQuest)}</p>` : ""}
      ${a.decision.currentTarget ? `<p class="pt-obs"><span class="pt-obs-label">Current Target</span> ${esc(a.decision.currentTarget)}</p>` : ""}
      ${a.decision.nextTrial ? `<p class="pt-obs"><span class="pt-obs-label">Next Trial</span> ${esc(a.decision.nextTrial)}</p>` : `<p class="pt-obs"><span class="pt-obs-label">Next Trial</span> Sprint penuh berikutnya — tidak ada kategori lemah yang butuh drill khusus.</p>`}
    </div>` : ""}
    ${pt.wrong.length ? `
    <div style="margin:0 0 16px">
      <div class="eyebrow mono" style="margin:0 0 8px">PEMBAHASAN SOAL YANG SALAH</div>
      ${pt.wrong.map((w) => `
        <div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--hair)">
          <p style="font-size:13.5px;margin:0 0 4px">${esc(w.text)}</p>
          <p class="mono" style="font-size:12px;color:var(--muted);margin:0">Jawabanmu: ${esc(w.yourAnswer || "-")} · Benar: ${esc(w.correctAnswer)}</p>
          ${w.explanation ? `<p style="font-size:12.5px;color:var(--muted);margin:4px 0 0">${esc(w.explanation)}</p>` : ""}
        </div>`).join("")}
    </div>` : `<p class="why" style="margin:0 0 16px">Semua benar — mantap.</p>`}`;
}

// Task 10b: Job Match Analysis results - match table + honest verdict +
// relevance-to-goal + one next step. No AI mentorReply here (see index.js
// route comment), so this card's "verdict" text stands in for it.
// Task 14 (PRD.md section 26): matchScore + qualified are new - qualified is
// COMPUTED SERVER-SIDE from matchScore>=70 (jobMatch.cleanJobMatchResult),
// never the AI's free claim, so this block is the honest pass/fail line the
// old flat "Livelihood +3" badge used to stand in for. verdict/relevanceNote/
// nextStep/matchTable are UNCHANGED from Task 10b (PRD section 26 point 3:
// "existing narrative stays").
const JOB_MATCH_STATUS_COLOR = { "ada bukti": "var(--growth)", "disebut tapi lemah": "var(--accent)", "tidak ada": "var(--rust)" };
function jobMatchResultHTML(jm) {
  const qualified = jm.qualified === true;
  return `
    ${typeof jm.matchScore === "number" ? `
    <div class="pt-block">
      <div class="eyebrow mono">MATCH SCORE</div>
      <p class="pt-band mono">${jm.matchScore}/100</p>
      <p class="mono pt-band-meta" style="color:${qualified ? "var(--growth)" : "var(--rust)"}">${qualified ? "LOLOS — lanjut ke Submit Application" : "BELUM LOLOS — belum masuk hitungan Milestone"}</p>
    </div>` : ""}
    <div style="margin:0 0 16px">
      <div class="eyebrow mono" style="margin:0 0 8px">KECOCOKAN SKILL</div>
      ${jm.matchTable.map((row) => `
        <div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid var(--hair)">
          <span style="font-size:13.5px">${esc(row.skill)}</span>
          <span class="mono" style="font-size:11.5px;color:${JOB_MATCH_STATUS_COLOR[row.status] || "var(--muted)"};white-space:nowrap">${esc(row.status)}</span>
        </div>`).join("")}
    </div>
    <p class="fr" style="font-style:italic;font-size:14.5px;margin:0 0 12px;line-height:1.6">${esc(jm.verdict)}</p>
    ${jm.relevanceNote ? `<p class="why" style="margin:0 0 12px">${esc(jm.relevanceNote)}</p>` : ""}
    <div class="mono" style="font-size:12px;color:var(--muted);margin:0 0 16px">LANGKAH BERIKUTNYA: ${esc(jm.nextStep)}</div>`;
}

// Task 14 point 5: confirmation summary for a completed Submit Application
// Trial - same "quiet mono line above the deltas" slot structuredData
// already uses (structSummary), not a new component.
function jobApplicationSummary(ja) {
  return `${ja.companyName} · ${ja.roleTitle} · Applied ${ja.dateApplied}`;
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
// Task 7d.1: formal hierarchy - Primary Quest (the goal itself, stated once
// at goal capture, never changes day to day) and Milestone (the persistent
// current_target from Task 7b, changes only when reached) are shown as a
// small persistent context header ABOVE the card. What used to be labeled
// "PRIMARY QUEST" on the card itself is renamed "TODAY'S TRIAL" - this is
// the thing that's allowed to change topic completely day to day (mis. from
// running to recovery) WITHOUT that reading as Eleva "forgetting" the
// user's actual goal, because the goal/milestone context line above it
// hasn't moved. Side Quest is explicitly NOT part of this hierarchy (not
// goal-tied), so it never gets the context header.
function questSummaryCard(q, goalLabel, milestone) {
  if (!q) return `<div class="quest-card"><div class="dot pending"></div>${spinnerHTML("AI sedang menyusun quest...")}</div>`;
  const label = q.isSideQuest ? "SIDE QUEST" : q.quest.mode === "acting" ? "TODAY'S ACTING METHOD" : "TODAY'S TRIAL";
  const remaining = q.createdAt ? new Date(q.createdAt).getTime() + 24 * 60 * 60 * 1000 - Date.now() : null;
  const expired = remaining != null && remaining <= 0;
  // "Kenapa Eleva kasih quest ini →" progressive disclosure - independent
  // per card (reasonOpenIds keyed by quest id), replaces the old always-
  // visible `why` paragraph so the card leads with the instruction, not the
  // reasoning behind it.
  const reasonOpen = reasonOpenIds.has(q.id);
  const contextHeader = (goalLabel && !q.isSideQuest) ? `
    <div class="quest-context mono">
      <span class="quest-context-primary">◆ Primary Quest: ${esc(goalLabel)}</span>
      ${milestone ? `<span class="quest-context-milestone">→ Milestone: ${esc(milestone)}</span>` : ""}
    </div>` : "";
  // SOMA Nutrition Part B item 7: a nutrition-log quest never has a single
  // "Selesai" moment the button triggers (it resolves on its own once both
  // booleans go true, or lazily at day-end) - the button always reads
  // "Lanjut Catat", tapping it always means "go add another meal", never
  // "mark done" (brief: "no completion CTA while unmet"), and a live
  // progress line shows real state from the persisted quest.progressive.
  const isNutrition = q.quest?.completionType === "nutrition-log" && !q.isSideQuest;
  const nutritionProgress = isNutrition && q.quest.progressive ? nutritionProgressLabel(q.quest.progressive) : null;
  return `
    <div class="quest-card">
      ${contextHeader}
      <div class="dot pending"></div>
      <div class="qlabel mono">${label}${q.quest.statFocus ? ` · ${esc(statLabel(q.quest.statFocus))}` : ""}</div>
      <h2 class="fr">${esc(q.quest.title)}</h2>
      <p class="desc">${esc(q.quest.description)}</p>
      ${nutritionProgress ? `<p class="mono" style="font-size:12.5px;color:var(--accent);margin:8px 0 0">${esc(nutritionProgress)}</p>` : ""}
      ${remaining != null && !isNutrition ? `<p class="countdown mono${expired ? " urgent" : ""}" data-quest-countdown="${q.id}" data-created="${esc(q.createdAt)}">${expired ? "⏳ Waktu buat mulai quest ini udah lewat 24 jam." : `⏳ ${formatCountdown(remaining)}`}</p>` : ""}
      <button class="btn-primary" data-reflect-id="${q.id}" ${expired && !isNutrition ? "disabled" : ""}>${isNutrition ? "Lanjut Catat" : expired ? "Waktu habis" : "Mulai"}</button>
      <button class="reason-toggle" data-reason-toggle="${q.id}">${reasonOpen ? "Sembunyikan alasan" : "Kenapa Eleva kasih quest ini →"}</button>
      ${reasonOpen ? `<p class="why fadeUp">${esc(q.quest.why)}</p>` : ""}
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
  // Task 14 point 7: Livelihood Milestone #2+ manual override - a named
  // funnel metric + target value, same "still numeric/measurable, not free
  // text" rule as every other Opsi C.
  if (kind === "livelihood-funnel") {
    return `
      <div class="field"><label>Nama metrik</label><input type="text" maxlength="80" data-tf="metricLabel" value="${tf("metricLabel")}" placeholder="mis. Response Rate" /></div>
      <div class="field"><label>Target angka</label><input type="number" min="1" step="1" data-tf="targetValue" value="${tf("targetValue")}" placeholder="50" /></div>`;
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
// Task 7d.3: "interpretation" is now a 3-layer Observed/Hypothesis/Decision
// object, not a bare sentence - rendered as 3 labeled lines so the hedge on
// Hypothesis stays visually distinct from the more confident Decision line.
// Old string-shaped interpretation (shouldn't happen post-deploy, but a
// quest completed mid-deploy could still have one in flight) degrades to a
// single unlabeled line rather than crashing.
function elevaResponseHTML(interpretation) {
  if (!interpretation) return "";
  if (typeof interpretation === "string") {
    return `<div class="observed-card" style="margin-bottom:14px"><div class="eyebrow mono">ELEVA RESPONSE</div><p class="observed-line">${esc(interpretation)}</p></div>`;
  }
  const { observed, hypothesis, decision } = interpretation;
  return `
    <div class="observed-card" style="margin-bottom:14px">
      <div class="eyebrow mono">ELEVA RESPONSE</div>
      ${observed ? `<p class="observed-line"><span class="er-tag">Diamati</span> ${esc(observed)}</p>` : ""}
      ${hypothesis ? `<p class="observed-line dim"><span class="er-tag">Kemungkinan</span> ${esc(hypothesis)}</p>` : ""}
      ${decision ? `<p class="observed-line"><span class="er-tag">Keputusan</span> ${esc(decision)}</p>` : ""}
    </div>`;
}

function completedResultCardHTML(r) {
  return `
    <div class="quest-card fadeUp">
      <div class="qlabel mono">${esc(r.questTitle)}</div>
      ${r.practiceTest ? "" : elevaResponseHTML(r.interpretation)}
      ${r.safetyNote ? `<p class="safety-note">⚠ ${esc(r.safetyNote)}</p>` : ""}
      <div class="mono" style="font-size:11px;color:var(--growth);letter-spacing:1px;margin-bottom:6px">
        ${r.status === "done" ? "SELESAI" : r.status === "partial" ? "SEBAGIAN" : "DILEWATI"}
      </div>
      ${r.structuredData ? `<div class="mono" style="font-size:12px;color:var(--muted);margin:0 0 8px">${esc(structSummary(r.structuredData))}</div>` : ""}
      ${r.jobApplication ? `<div class="mono" style="font-size:12px;color:var(--muted);margin:0 0 8px">${esc(jobApplicationSummary(r.jobApplication))}</div>` : ""}
      ${r.practiceTest ? practiceTestResultHTML(r.practiceTest) : ""}
      ${r.jobMatch ? jobMatchResultHTML(r.jobMatch) : ""}
      ${r.mentorReply ? `<p class="fr" style="font-style:italic;font-size:14.5px;margin:0 0 16px;line-height:1.6">${esc(r.mentorReply)}</p>` : ""}
      ${Object.keys(r.deltas || {}).length ? `<div class="deltas" style="margin-bottom:18px">${Object.entries(r.deltas).map(([k]) => `<span class="delta-chip">${statLabel(k)} · Evidence tercatat</span>`).join("")}</div>` : ""}
      ${shortfallPromptHTML(r)}
      ${targetPickerHTML(r.target)}
      <button class="btn-primary full" id="dismissCompleted" style="margin-top:18px">Lanjut</button>
    </div>`;
}

// Task 7d.6: shortfall-reason chip picker, independent of the "Rasanya
// gimana?" difficulty rating - only rendered when the server detected
// evidence far below the quest's Milestone target (computeShortfallPrompt).
// Single-tap-commits (same pattern as Kondisi Hari Ini): tapping a chip
// posts immediately and the row just shows a small confirmation in place,
// it never blocks "Lanjut".
function shortfallPromptHTML(r) {
  if (!r.shortfallPrompt) return "";
  if (shortfallReasonPicked) {
    return `<p class="mono" style="font-size:11.5px;color:var(--muted);margin:0 0 16px">Dicatat: ${esc(shortfallReasonPicked)} — bukan masalah, ini cuma konteks buat Eleva.</p>`;
  }
  return `
    <div style="margin:0 0 18px">
      <div class="kondisi-label mono">KENAPA HARI INI DI BAWAH TARGET?</div>
      <div class="kondisi-chips">
        ${r.shortfallPrompt.reasons.map((reason) => `<button class="kondisi-chip" data-shortfall-reason="${esc(reason)}">${esc(reason)}</button>`).join("")}
      </div>
    </div>`;
}

// Homepage redesign: persistent header (date + avatar + settings gear) and
// bottom tab bar, shared across all 4 screens (Home/Kisahmu/Character/
// Settings). Avatar and gear both route to Settings, per the handoff
// ("Both currently route to Settings in the prototype; profile may get its
// own screen later").
function appHeaderHTML(s, extraIconsHTML) {
  const initial = (s.profile?.name || "?").trim().charAt(0).toUpperCase() || "?";
  return `
    <div class="app-header">
      <div class="mono header-date">${todayLabel().toUpperCase()}</div>
      <div class="header-icons">
        ${extraIconsHTML || ""}
        <button class="header-icon-btn" id="headerAvatar" aria-label="Profil">${esc(initial)}</button>
        <button class="header-icon-btn" id="headerSettings" aria-label="Settings">⚙</button>
      </div>
    </div>`;
}
// Task 12: 5th tab, extensible grid of on-demand tools - see metaScreenHTML.
const TAB_ITEMS = [
  { key: "home", icon: "◆", label: "Home" },
  { key: "kisahmu", icon: "📖", label: "Kisahmu" },
  { key: "character", icon: "◈", label: "Character" },
  { key: "meta", icon: "▦", label: "META" },
  { key: "settings", icon: "⚙", label: "Settings" },
];
function tabBarHTML() {
  return `
    <div class="tab-bar">
      ${TAB_ITEMS.map((t) => `
        <button class="tab-item ${activeScreen === t.key ? "active" : ""}" data-tab="${t.key}">
          <span class="tab-icon">${t.icon}</span>
          <span class="tab-label">${t.label}</span>
        </button>`).join("")}
    </div>`;
}

// "Eleva Observed" reasoning-trace card - null when there's nothing yet to
// observe (very first quest ever, or keyless fallback mode - see claude.js).
function observedCardHTML(observed) {
  if (!observed) return "";
  return `
    <div class="observed-card">
      <div class="eyebrow mono" style="color:var(--accent);margin:0 0 8px">ELEVA OBSERVED</div>
      <p class="observed-line">${esc(observed.yesterday)}</p>
      <p class="observed-line dim">↓ Diamati: ${esc(observed.noticed)}</p>
      <p class="observed-line">↓ Hari ini: ${esc(observed.today)}</p>
    </div>`;
}

// Task 11c: Side Quest is now a REAL AI-generated bonus quest (not tied to
// any goal) filling the carousel's otherwise-empty slots - the server
// already generates/persists them (see GET /api/state), this just renders
// whatever's currently open. Collapsed by default (a quick "→ N tersedia"
// teaser) per the handoff's progressive-disclosure principle, expands to
// full quest cards (reusing questSummaryCard, same "Mulai" flow as any
// other quest) on tap.
function sideQuestRowHTML(sideQuests) {
  if (!sideQuests.length) return "";
  return sideQuestsOpen
    ? `<div class="side-quest-row open">
        <button class="side-quest-toggle" data-toggle-sidequest>↑ Sembunyikan side quest</button>
        ${sideQuests.map((q) => questSummaryCard(q, null)).join("")}
      </div>`
    : `<button class="side-quest-row" data-toggle-sidequest>→ ${sideQuests.length} Side Quest tersedia</button>`;
}

// Task 11f (Context Update): light, not a quest, not mandatory - a chip tap
// commits immediately (no separate confirm step), the note is genuinely
// optional and only shown as an expandable "Ceritakan lebih →" link so it
// never blocks the one-tap path.
function kondisiRowHTML(status, note) {
  const isNormal = status === "Normal";
  return `
    <div class="kondisi-block">
      ${kondisiOpen ? `
        <div class="kondisi-label mono">GIMANA KONDISIMU HARI INI?</div>
        <div class="kondisi-chips">
          ${KONDISI_LABELS.map((l) => `<button class="kondisi-chip ${status === l ? "selected" : ""}" data-kondisi="${esc(l)}">${KONDISI_EMOJI[l]} ${esc(l)}</button>`).join("")}
        </div>
        <textarea class="kondisi-note-input" id="kondisiNoteInput" rows="2" placeholder="Ceritakan lebih (opsional)...">${esc(kondisiNoteDraft)}</textarea>
        ${kondisiError ? `<p style="color:var(--rust);font-size:12.5px;margin:8px 0 0">${esc(kondisiError)}</p>` : ""}
        <button class="kondisi-done" id="kondisiDone">Selesai</button>
      ` : `
        <div class="kondisi-summary">
          <span><span class="kondisi-dot" style="color:${isNormal ? "var(--growth)" : "var(--accent)"}">●</span> Kondisi hari ini: <span class="kondisi-value">${isNormal ? "" : KONDISI_EMOJI[status] || ""} ${esc(status)}</span>${note ? ` <span class="kondisi-note-preview">— ${esc(note)}</span>` : ""}</span>
          <button class="kondisi-update" id="kondisiUpdateBtn">Update</button>
        </div>`}
    </div>`;
}

// Task 7c ("Aku nggak bisa quest ini"): same Context Update chip set minus
// "Energi lebih" (a positive state, doesn't fit "can't do this") - reuses
// POST /api/kondisi directly, a context signal that never touches the
// quest's own completion/growth. Rendered instead of the evidence form when
// unableQuestId matches the quest being reflected on.
function unableFormHTML() {
  const chips = KONDISI_LABELS.filter((l) => l !== "Energi lebih");
  return `
    <div class="quest-card fadeUp" style="margin-top:-14px">
      <div class="kondisi-label mono">KENAPA NGGAK BISA SEKARANG?</div>
      <div class="kondisi-chips">
        ${chips.map((l) => `<button class="kondisi-chip" data-unable-kondisi="${esc(l)}">${KONDISI_EMOJI[l]} ${esc(l)}</button>`).join("")}
      </div>
      <textarea class="kondisi-note-input" id="unableNoteInput" rows="2" placeholder="Ceritakan lebih (opsional)...">${esc(kondisiNoteDraft)}</textarea>
      ${kondisiError ? `<p style="color:var(--rust);font-size:12.5px;margin:8px 0 0">${esc(kondisiError)}</p>` : ""}
      <p class="mono" style="font-size:11.5px;color:var(--muted);margin:8px 0 0">Quest ini tetap terbuka — lanjutkan kapan pun kamu siap. Ini bukan evidence, jadi tidak memengaruhi growth.</p>
      <button class="btn-ghost" id="cancelUnable" style="margin-top:10px">← Batal, balik ke quest</button>
    </div>`;
}

// Character screen: 7 stat rows with level/tier progress (not raw 0-100),
// a cosmetic trend-down tag, and a Decay-paused banner while Kondisi Hari
// Ini isn't Normal. No stat here ever decreases automatically - see PRD.md
// bagian 22 for why (founder decision: cosmetic-derived, not real decay).
function characterScreenHTML(s) {
  const keys = STAT_ORDER.map(([k]) => k).filter((k) => k in (s.stats || {}));
  Object.keys(s.stats || {}).forEach((k) => { if (!keys.includes(k)) keys.push(k); });
  const decayPaused = s.kondisiStatus && s.kondisiStatus !== "Normal";
  return `
    <div class="eyebrow mono" style="margin:0 0 18px">CHARACTER DEVELOPMENT</div>
    ${decayPaused ? `<div class="decay-banner">⏸ Decay dijeda — kamu lagi ${esc(s.kondisiStatus.toLowerCase())}</div>` : ""}
    ${keys.map((k) => {
      const { level, tierName, progressPct } = statLevelInfo(s.stats[k]);
      const trendDown = s.statTrends?.[k];
      return `
      <div class="level-row">
        <div class="row-top">
          <span class="label">${statLabel(k)}${trendDown ? ` <span class="trend-down">↘ menurun</span>` : ""}</span>
          <span class="mono level-tag">Lv.${level} · ${tierName}</span>
        </div>
        <div class="track"><div class="fill" style="width:${progressPct}%"></div></div>
      </div>`;
    }).join("")}`;
}

// Kisahmu: full autobiography, chronological, one entry per Chapter (archived
// ones + the current in-progress one appended by GET /api/state).
function kisahmuScreenHTML(s) {
  const chapters = s.chapters || [];
  if (!chapters.length) return `<p class="why">Belum ada Chapter tercatat.</p>`;
  return chapters.map((c) => `
    <div class="kisah-entry">
      <div class="mono kisah-tag">BAB ${c.chapterNumber} · ${esc(c.chapterTitle).toUpperCase()}</div>
      <p class="kisah-body">${esc(c.narrative)}</p>
    </div>`).join("");
}

// Settings: minimal placeholder per handoff ("not fully specced") - Profil/
// Notifikasi/Privasi are honest non-interactive rows (no fake destination),
// Reset data + Keluar are the real account actions relocated here from
// Home's old footer-bar.
function settingsScreenHTML() {
  return `
    <div class="eyebrow mono" style="margin:0 0 18px">SETTINGS</div>
    ${["Profil", "Notifikasi", "Privasi & Data"].map((label) => `
      <div class="settings-row disabled">
        <span>${label}</span>
        <span class="mono settings-soon">segera hadir</span>
      </div>`).join("")}
    <div class="settings-row" id="doLogout" style="cursor:pointer">
      <span>Keluar</span><span>→</span>
    </div>
    <div style="margin-top:24px">
      ${resetArmed
        ? `<button class="btn-ghost rust" id="doReset">Yakin? Tap sekali lagi buat reset semua data</button>`
        : `<button class="btn-ghost" id="armReset">↺ Reset data</button>`}
    </div>`;
}

// SOMA Nutrition Part B item 2: an "active" SOMA quest is an open (no
// reflection yet) META quest in either domain - Activity quests are USUALLY
// resolved the instant they're submitted (SESSION lifecycle), but one can
// still sit open between being started and actually filled in; Nutrition
// quests (PROGRESSIVE lifecycle) routinely stay open all day.
function activeSomaQuest(allOpenQuests, mode) {
  return allOpenQuests.find((q) => q.isMeta && !q.reflection && (
    mode === "activity" ? q.quest?.completionType === "structured-physical" : q.quest?.completionType === "nutrition-log"
  )) || null;
}

// Meta Inner Realm redesign (design_handoff_meta_inner_realm, 12 Agustus) +
// META target-recommendation follow-up (same day, founder feedback): world
// map on a scrollable RPG map, visual tokens copied verbatim from the
// handoff's README.md + prototype - but the CONTENT of each realm's card
// was rebuilt per the follow-up's own framing, "World Map shows Target,
// Realm page shows Tools": a card shows the user's real approved target
// (server/metaTargets.js), not the tool name/session count it used to.
// Pathway → label/line/glow, copied verbatim from the prototype's PATHWAYS
// table (final palette per the README's "final, per latest request" note).
const PATHWAY_META = {
  Architect: { label: "THE ARCHITECT", line: "Setiap langkah tersusun. Yang kau bangun, tetap berdiri.", glow: "#3b6fd6" },
  Warden: { label: "THE WARDEN", line: "Konsistensimu adalah fondasi. Eleva menjaga bersamamu.", glow: "#b8253f" },
  Weaver: { label: "THE WEAVER", line: "Setiap koneksi kau rajut. Dunia ini tumbuh lewat kamu.", glow: "#2f9e5c" },
  Pilgrim: { label: "THE PILGRIM", line: "Perjalananmu adalah bukti. Eleva berjalan bersamamu.", glow: "#9b6fd1" },
  Specialist: { label: "THE SPECIALIST", line: "Kedalaman adalah jalanmu. Satu bidang, dikuasai penuh.", glow: "#d4a72c" },
};
// Per-realm constants shared between the world-map cluster and the realm
// detail sub-page (tap target), so the two never drift out of sync.
const REALM_INFO = {
  lingua: { accent: "#6EA8FF", icon: "lingua", iconSize: 24, name: "LINGUA", statLabel: "The Growth", desc: "Asah kemampuanmu. Uji, pahami, dan tingkatkan.", left: "50%", top: "14.5%", goalPlaceholder: "IELTS Academic 6.5" },
  soma: { accent: "#63E38B", icon: "soma", iconSize: 24, name: "SOMA", statLabel: "The Body", desc: "Bangun, jaga, dan kuatkan tubuhmu setiap hari.", left: "22%", top: "39%", goalPlaceholder: "Lari 10K dalam 60 menit" },
  labora: { accent: "#FFC46E", icon: "labora", iconSize: 22, name: "LABORA", statLabel: "The Livelihood", desc: "Uji dirimu terhadap dunia. Bangun masa depanmu.", left: "79%", top: "40%", goalPlaceholder: "Dapat kerja remote sebagai data analyst" },
};
// Custom SVG icon paths, copied verbatim from the prototype (no emoji/icon
// fonts per the handoff's DO NOT list).
function realmIconSVG(key, size, color) {
  if (key === "lingua") return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" style="flex:none"><path d="M12 5.5c-1.8-1.4-4.6-2-7.5-2-.3 0-.5.2-.5.5v12.6c0 .3.2.5.5.5 2.6 0 5.3.5 7.2 1.9.2.1.4.1.6 0 1.9-1.4 4.6-1.9 7.2-1.9.3 0 .5-.2.5-.5V4c0-.3-.2-.5-.5-.5-2.9 0-5.7.6-7.5 2z"></path><path d="M12 5.5v13" stroke-width="1.3"></path><path d="M6.5 6.7c1.6.2 3.2.7 4 1.3M6.5 10c1.6.2 3.2.6 4 1.1M17.5 6.7c-1.6.2-3.2.7-4 1.3M17.5 10c-1.6.2-3.2.6-4 1.1" stroke-width="1.1" stroke-linecap="round"></path></svg>`;
  if (key === "labora") return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" style="flex:none"><rect x="3" y="7.5" width="18" height="12.5" rx="2"></rect><path d="M8 7.5V6a2.5 2.5 0 0 1 2.5-2.5h3A2.5 2.5 0 0 1 16 6v1.5"></path><path d="M3 12.5h18" stroke-width="1.3"></path><rect x="10.3" y="11.2" width="3.4" height="2.6" rx="0.5" fill="#0d0c12" stroke-width="1.2"></rect></svg>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" style="flex:none"><path d="M12 21c0-5.5 0-9 0-11"></path><path d="M12 12c0-4 2.5-6.5 7-7 .3 4.3-2 7-7 7z"></path><path d="M12 15c0-3.2-2-5.2-5.5-5.6-.3 3.4 1.6 5.6 5.5 5.6z"></path></svg>`;
}
// Generic tappable row (icon + title + subtitle + progress bar + chevron) -
// used both for the realm detail sub-page's tool rows AND (before the
// target-recommendation follow-up) the world-map cards themselves. Kept
// generic/reusable rather than duplicated per screen.
function realmProgressCardHTML(accent, icon, iconSize, title, sessionsLabel, pct, attrs) {
  return `
    <button class="meta-realm-card" style="border:1px solid ${accent}66" ${attrs}>
      ${realmIconSVG(icon, iconSize, accent)}
      <div class="meta-realm-card-content">
        <div class="meta-realm-card-title">${esc(title)}</div>
        <div class="meta-realm-card-sessions">${esc(sessionsLabel)}</div>
        <div class="meta-realm-card-track"><div class="meta-realm-card-fill" style="width:${pct}%;background:${accent}"></div></div>
      </div>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2" style="flex:none"><path d="M9 18l6-6-6-6"></path></svg>
    </button>`;
}
// Non-interactive row for a tool that doesn't exist yet (Writing/Speaking,
// CV/Skill Gap/Interview) - visible-but-unrevealed, same spirit as the
// world map's locked realm, rather than silently omitted.
function comingSoonRowHTML(accent, icon, iconSize, label) {
  return `
    <div class="meta-realm-card meta-realm-card-soon" style="border:1px solid ${accent}33">
      ${realmIconSVG(icon, iconSize, `${accent}88`)}
      <div class="meta-realm-card-content">
        <div class="meta-realm-card-title">${esc(label)}</div>
        <div class="meta-realm-card-sessions">Segera hadir</div>
      </div>
    </div>`;
}
function realmClusterHTML({ left, top, accent, icon, name, statLabel, desc, cardsHTML }) {
  return `
    <div class="meta-realm-cluster" style="left:${left};top:${top}">
      <div class="meta-realm-vignette"></div>
      <div class="meta-realm-cluster-body">
        <div class="meta-realm-sigil" style="border:1px solid ${accent}88;box-shadow:0 0 14px ${accent}33">${realmIconSVG(icon, 24, accent)}</div>
        <div class="meta-realm-name" style="color:${accent}">${esc(name)}</div>
        <div class="meta-realm-stat">${esc(statLabel)}</div>
        <div class="meta-realm-desc">${esc(desc)}</div>
        ${cardsHTML}
      </div>
    </div>`;
}
// SOMA/LABORA's progress bar (goalTargets-derived) fill = sessions/7
// clamped, copied as-is from the prototype's placeholder formula (the
// handoff explicitly allows "adjust the denominator if there's a better
// real target, but keep it simple, no fake milestone data").
function metaSessionPct(n) {
  return Math.max(0, Math.min(100, Math.round((n / 7) * 100)));
}
// The world-map card itself - one of three states from
// server/metaTargets.js. "active": the user's approved target, tapping
// opens the realm's tool list. "recommend": a matching goal exists but
// needs one explicit approve tap (founder: a NEW approve step, distinct
// from the existing "Target Berikutnya" A/B/C picker). "empty": no matching
// goal at all yet - inline CTA to add one (reuses the existing goals array,
// POST /api/goals).
function targetCardHTML(realm, card, info) {
  const accent = info.accent;
  // A realm's tools (Movement/Nutrition/... - the sub-page) must stay
  // reachable even without an approved target - the target is motivational
  // framing, not a gate on the underlying functionality. Every state gets a
  // "Lihat tools →" link into the same detail page an active card opens.
  const toolsLink = `<button class="meta-realm-card-tools-link" data-meta-realm-open="${realm}" style="color:${accent}">Lihat tools ${esc(info.name)} →</button>`;
  if (!card || card.status === "empty") {
    return `
      <div class="meta-realm-card meta-realm-card-empty" style="border:1px dashed ${accent}44">
        <div class="meta-realm-card-content" style="flex:1">
          <div class="meta-realm-card-title">Belum ada perjalanan aktif</div>
          <div class="meta-realm-card-sessions">Set target ${esc(info.name)} dulu buat mulai perjalanan.</div>
          <div class="meta-goal-add-row">
            <input type="text" class="meta-goal-add-input" id="metaGoalInput-${realm}" placeholder="Mis. ${esc(info.goalPlaceholder)}" value="${esc(metaGoalDraft[realm] || "")}" maxlength="200" />
            <button class="meta-goal-add-btn" data-meta-goal-submit="${realm}" style="color:${accent};border-color:${accent}66" ${metaTargetBusy ? "disabled" : ""}>Set</button>
          </div>
          ${toolsLink}
        </div>
      </div>`;
  }
  if (card.status === "recommend") {
    return `
      <div class="meta-realm-card meta-realm-card-recommend" style="border:1px solid ${accent}66">
        <div class="meta-realm-card-content" style="flex:1">
          <div class="meta-realm-card-recommend-tag" style="color:${accent}">ELEVA MENYARANKAN</div>
          <div class="meta-realm-card-title">${esc(card.title)}</div>
          <div class="meta-realm-card-sessions">${esc(card.subtitle)}</div>
          <button class="meta-realm-card-approve" data-meta-target-confirm="${realm}" data-meta-target-goal="${card.goalIndex}" style="background:${accent}" ${metaTargetBusy ? "disabled" : ""}>Jadikan target aktif</button>
          ${toolsLink}
        </div>
      </div>`;
  }
  return `
    <button class="meta-realm-card" style="border:1px solid ${accent}66" data-meta-realm-open="${realm}">
      ${realmIconSVG(info.icon, info.iconSize, accent)}
      <div class="meta-realm-card-content">
        <div class="meta-realm-card-title">${esc(card.title)}</div>
        <div class="meta-realm-card-sessions">${esc(card.subtitle)}</div>
        <div class="meta-realm-card-track"><div class="meta-realm-card-fill" style="width:${card.pct}%;background:${accent}"></div></div>
      </div>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2" style="flex:none"><path d="M9 18l6-6-6-6"></path></svg>
    </button>`;
}
// Realm page's tool list - "Realm page shows Tools" (founder framing).
// Real, startable tools use the SAME entry points the world map used to
// (data-soma-mode/data-meta-tool, unmodified underneath); coming-soon rows
// mark what this app doesn't build yet rather than omitting them silently.
function metaRealmToolsHTML(realm, s) {
  const counts = s.metaSessionCounts || { lingua: 0, somaActivity: 0, somaNutrition: 0, labora: 0 };
  if (realm === "soma") {
    return [
      realmProgressCardHTML("#63E38B", "soma", 24, "Movement", `Cardio & gym · ${counts.somaActivity} sesi minggu ini`, metaSessionPct(counts.somaActivity), `data-soma-mode="activity"`),
      realmProgressCardHTML("#63E38B", "soma", 24, "Recovery", `Tidur, hidrasi, pemulihan · ${counts.somaActivity} sesi minggu ini`, metaSessionPct(counts.somaActivity), `data-soma-mode="recovery"`),
      realmProgressCardHTML("#63E38B", "soma", 24, "Nutrition", `${counts.somaNutrition} sesi minggu ini`, metaSessionPct(counts.somaNutrition), `data-soma-mode="nutrition"`),
    ].join("");
  }
  if (realm === "lingua") {
    return [
      realmProgressCardHTML("#6EA8FF", "lingua", 24, "Reading", `Practice Test · ${counts.lingua} sesi bulan ini`, metaSessionPct(counts.lingua), `data-lingua-track="reading"`),
      realmProgressCardHTML("#6EA8FF", "lingua", 24, "Listening", `Practice Test · ${counts.lingua} sesi bulan ini`, metaSessionPct(counts.lingua), `data-lingua-track="listening"`),
      comingSoonRowHTML("#6EA8FF", "lingua", 24, "Writing"),
      comingSoonRowHTML("#6EA8FF", "lingua", 24, "Speaking"),
    ].join("");
  }
  return [
    realmProgressCardHTML("#FFC46E", "labora", 22, "Job Match", `${counts.labora} sesi bulan ini`, metaSessionPct(counts.labora), `data-meta-tool="job-match"`),
    `<div class="meta-realm-card meta-realm-card-info" style="border:1px solid #FFC46E44">
      ${realmIconSVG("labora", 22, "#FFC46E")}
      <div class="meta-realm-card-content">
        <div class="meta-realm-card-title">Applications</div>
        <div class="meta-realm-card-sessions">Muncul otomatis setelah Job Match Analysis lolos (qualified).</div>
      </div>
    </div>`,
    comingSoonRowHTML("#FFC46E", "labora", 22, "CV"),
    comingSoonRowHTML("#FFC46E", "labora", 22, "Skill Gap"),
    comingSoonRowHTML("#FFC46E", "labora", 22, "Interview"),
  ].join("");
}
function metaRealmDetailHTML(realm, s) {
  const info = REALM_INFO[realm];
  const card = s.metaTargets?.[realm];
  return `
    <div class="meta-realm-detail">
      <button class="meta-realm-back" id="metaRealmBack">← Kembali ke peta</button>
      <div class="meta-realm-detail-header">
        <div class="meta-realm-sigil" style="border:1px solid ${info.accent}88;box-shadow:0 0 14px ${info.accent}33">${realmIconSVG(info.icon, 24, info.accent)}</div>
        <div>
          <div class="meta-realm-name" style="color:${info.accent};margin-top:0">${info.name}</div>
          <div class="meta-realm-stat">${info.statLabel}</div>
        </div>
      </div>
      ${card && card.status === "active" ? `
      <div class="meta-realm-detail-target">
        <div class="meta-realm-detail-target-label mono">MENUJU</div>
        <div class="meta-realm-card-title">${esc(card.title)}</div>
        <div class="meta-realm-card-sessions">${esc(card.subtitle)}</div>
      </div>` : ""}
      ${metaError ? `<p style="color:var(--rust);font-size:13px;margin:12px 0 0">${esc(metaError)}</p>` : ""}
      <div class="meta-realm-tools">
        ${metaRealmToolsHTML(realm, s)}
      </div>
      ${metaBodyPicking ? `
      <div class="quest-card fadeUp" style="margin-top:16px">
        <div class="field">
          <label>Jenis latihannya apa?</label>
          <div class="status-row">
            ${[["cardio", "Cardio"], ["gym", "Gym"]].map(([k, l]) =>
              `<button class="status-btn" data-meta-body-kind="${k}">${l}</button>`).join("")}
          </div>
        </div>
        <button class="btn-ghost" id="metaBodyCancel">← Batal</button>
      </div>` : ""}
    </div>`;
}
function metaScreenHTML(s, allOpenQuests) {
  if (metaRealmOpen) return metaRealmDetailHTML(metaRealmOpen, s);
  const pw = PATHWAY_META[s.pathway] || PATHWAY_META.Pilgrim;
  const targets = s.metaTargets || {};
  const bigVignette = `background:radial-gradient(ellipse at center, rgba(3,5,8,.72) 0%, rgba(3,5,8,.44) 40%, rgba(3,5,8,.16) 70%, transparent 100%);width:130%;height:135%`;
  return `
    <div class="meta-realm-wrap">
      <div class="meta-realm-map">
        <img src="/assets/meta-world-map.png" alt="Peta dunia Eleva" />
        <div class="meta-realm-map-shade"></div>
        <div class="meta-realm-header">
          <div class="meta-realm-title">META</div>
          <div class="meta-realm-subtitle-row">
            <span class="meta-realm-rule"></span>
            <span class="meta-realm-subtitle">The Inner Realm</span>
            <span class="meta-realm-rule"></span>
          </div>
        </div>
        <p class="meta-realm-intro">Latihan mandiri di luar Quest. Semua bukti di sini membentuk dirimu, dan memengaruhi langkah Eleva.</p>

        ${realmClusterHTML({ ...REALM_INFO.lingua, cardsHTML: targetCardHTML("lingua", targets.lingua, REALM_INFO.lingua) })}
        ${realmClusterHTML({ ...REALM_INFO.soma, cardsHTML: targetCardHTML("soma", targets.soma, REALM_INFO.soma) })}
        ${realmClusterHTML({ ...REALM_INFO.labora, cardsHTML: targetCardHTML("labora", targets.labora, REALM_INFO.labora) })}

        <div class="meta-realm-avatar-ring">
          <div class="meta-realm-avatar-glow" style="background:radial-gradient(circle, ${pw.glow}40, transparent 70%)"></div>
          <div class="meta-realm-avatar-inner" style="border:1px solid ${pw.glow}70"></div>
        </div>
        <div class="meta-realm-avatar-label-wrap">
          <div class="meta-realm-vignette" style="${bigVignette}"></div>
          <div style="position:relative;z-index:1">
            <div class="meta-realm-avatar-label" style="color:${pw.glow}">${esc(pw.label)}</div>
            <div class="meta-realm-avatar-line">${esc(pw.line)}</div>
          </div>
        </div>

        <div class="meta-realm-locked">
          <div class="meta-realm-vignette" style="${bigVignette}"></div>
          <div style="position:relative;z-index:1">
            <div class="meta-realm-locked-mark mono">???</div>
            <div class="meta-realm-locked-caption">Belum terungkap. Terus bertumbuh.</div>
          </div>
        </div>
      </div>

      <div style="padding:0 24px">
        ${metaError ? `<p style="color:var(--rust);font-size:13px;margin:12px 0 0">${esc(metaError)}</p>` : ""}
        ${metaHintDismissed ? "" : `
        <div class="meta-realm-hint fadeUp">
          <div>
            <div class="meta-realm-hint-title">Geser peta untuk menjelajahi dunia Eleva.</div>
            <div class="meta-realm-hint-sub">Ketuk wilayah untuk melihat detail.</div>
          </div>
          <button class="meta-realm-hint-close" id="metaHintClose" aria-label="Tutup">×</button>
        </div>`}
      </div>
    </div>`;
}

// Extracted from the [data-reflect-id] handler (Task 7c/7d cascade) so the
// SOMA "resume an active Activity quest directly" path (item 2) can reuse
// the exact same evidenceSchema/structuredKind auto-detection instead of
// duplicating it - the underlying Activity flow is completely unmodified.
function beginStructuredOrReflectiveFlow(id, quest) {
  reflectTarget = id; reflectOpen = true; reflectStatus = "done"; reflectText = "";
  structForm = {}; reflectError = ""; unableQuestId = null;
  recordMode = quest?.completionType === "structured-physical" || quest?.statFocus === "body";
  const schema = quest?.evidenceSchema;
  if (schema?.metricType === "distance") {
    structKind = "cardio";
    structKindAuto = true;
    if (schema.activityType) structForm.jenisAktivitas = schema.activityType;
  } else if (schema?.metricType === "reps") {
    structKind = schema.hasWeight ? "gym-alat" : "gym-badan";
    structKindAuto = true;
  } else if (schema?.metricType === "recovery") {
    structKind = "recovery";
    structKindAuto = true;
  } else if (quest?.structuredKind === "cardio" || quest?.structuredKind === "gym" || quest?.structuredKind === "recovery") {
    structKind = quest.structuredKind === "gym" ? "gym-alat" : quest.structuredKind;
    structKindAuto = true;
  } else if (quest?.completionType === "structured-physical") {
    // Structured-physical but no usable tag at all (pre-Task-7b quest,
    // vanishingly rare by now) - default silently rather than asking.
    structKind = "cardio";
    structKindAuto = true;
  } else {
    structKind = null;
    structKindAuto = false;
  }
}

// SOMA Nutrition Part B: opens the Log Meal / Nutrition flow for a given
// nutrition-log quest (fresh or resumed) - fetches today's entries for it
// so a resumed session shows real prior progress, not an empty slate.
// `day` is the DB-row wrapper shape ({id, quest: {...title/progressive/etc}})
// every call site already has on hand - allOpenQuests entries and
// /api/meta/start's response both look like this, so this function is the
// one place that unpacks it, rather than each caller re-flattening it
// slightly differently (a real bug this fixed: two call sites used to pass
// an already-flattened shape and two passed the wrapper, so nutritionFlow.
// quest.progressive was undefined half the time).
async function openNutritionFlow(day) {
  nutritionFlow = {
    questId: day.id, quest: day.quest, step: "log", mealType: null, entries: [],
    search: { query: "", results: [], error: "" }, pending: null, photoError: "", error: "", completedMessage: "",
  };
  try {
    const { entries } = await api(`/api/nutrition/entries?questId=${day.id}`);
    nutritionFlow.entries = entries;
  } catch (e) { /* non-critical - resume with an empty list rather than block the flow */ }
}

function renderDashboard() {
  const s = appState;
  // Task 11c: server now mixes real Side Quests into openQuests (flagged
  // isSideQuest) alongside Primary Quests - split here once so the
  // carousel/reflect-target logic below only ever sees Primary Quests, and
  // Side Quests render separately via sideQuestRowHTML.
  const allOpenQuests = s.openQuests || [];
  // Task 12: META rows stay findable in allOpenQuests (so the reflect form
  // can look one up by id while a META session is in progress via
  // targetDay/reflectTarget below), but never join the Primary Quest
  // carousel - see the is_meta column comment in db.js's init().
  const openQuests = allOpenQuests.filter((q) => !q.isSideQuest && !q.isMeta);
  const sideQuests = allOpenQuests.filter((q) => q.isSideQuest);
  const goals = s.goals || [];
  const goalLabel = (goalIndex) => (goalIndex != null && goals[goalIndex] ? goals[goalIndex] : null);
  // Task 7d.1: Milestone = the persistent current_target (Task 7b), shown
  // alongside Primary Quest in the context header - null until a goal has
  // one (before the first "Target Berikutnya" pick, or right after a fresh
  // target replaces a reached one).
  const goalTargets = s.goalTargets || {};
  const milestoneLabel = (goalIndex) => (goalIndex != null && goalTargets[String(goalIndex)] ? goalTargets[String(goalIndex)].label : null);
  // Which open quest the reflect flow targets - looked up fresh from
  // appState every render (never cached), so a just-refreshed state after
  // a submit is always the source of truth. No implicit default: every
  // card's own button sets this explicitly, since there's no longer a
  // single privileged "today's quest" among up to 3 simultaneously open.
  const targetDay = allOpenQuests.find((q) => q.id === reflectTarget) || null;
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
  const gymFieldsHTML = `
      ${targetDay?.quest?.evidenceSchema?.metricType === "reps" && targetDay.quest.evidenceSchema.target != null
        ? `<p class="mono" style="font-size:12px;color:var(--accent-bright);margin:0 0 10px">TARGET ${targetDay.quest.evidenceSchema.target} repetisi/set</p>` : ""}
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
      </div>`;
  const cardioFieldsHTML = `
      <div class="field">
        <label>Jenis aktivitas</label>
        <select data-sf="jenisAktivitas">${["", "Lari", "Jalan cepat", "Sepeda", "Lompat tali", "Lainnya"].map((v) => `<option value="${v}" ${String(structForm.jenisAktivitas ?? "") === v ? "selected" : ""}>${v || "Pilih..."}</option>`).join("")}</select>
      </div>
      ${structForm.jenisAktivitas === "Lainnya" ? `
      <div class="field">
        <label>Aktivitasnya apa?</label>
        <input type="text" data-sf="jenisLainnya" maxlength="200" value="${sf("jenisLainnya")}" placeholder="mis. renang, hiking" />
      </div>` : ""}
      ${targetDay?.quest?.evidenceSchema?.metricType === "distance" && targetDay.quest.evidenceSchema.target != null
        ? `<p class="mono" style="font-size:12px;color:var(--accent-bright);margin:0 0 10px">TARGET ${targetDay.quest.evidenceSchema.target} km</p>` : ""}
      <div class="struct-grid">
        <div class="field"><label>Menit</label><input type="number" min="0" max="600" inputmode="numeric" data-sf="durasiMin" value="${sf("durasiMin")}" placeholder="20" /></div>
        <div class="field"><label>Detik</label><input type="number" min="0" max="59" inputmode="numeric" data-sf="durasiSec" value="${sf("durasiSec")}" placeholder="01" /></div>
      </div>
      <div class="field"><label>Jarak (km) <span class="opt-note">opsional</span></label><input type="number" min="0" step="0.1" data-sf="jarakKm" value="${sf("jarakKm")}" placeholder="5" /></div>
      <p class="mono" id="paceDisplay" style="font-size:12px;color:var(--muted);margin:-8px 0 14px">${(() => { const p = paceLabel(durasiMenitFromFields(structForm), structForm.jarakKm); return p ? `Pace: ${p}` : ""; })()}</p>
      <div class="field">
        <label>Rasanya gimana?</label>
        <div class="status-row">
          ${["Ringan", "Cukup", "Berat", "Terlalu berat"].map((v) => `<button class="status-btn ${structForm.titikBerat === v ? "active" : ""}" data-tberat="${v}">${v}</button>`).join("")}
        </div>
      </div>
      ${["Berat", "Terlalu berat"].includes(structForm.titikBerat) ? `
      <div class="field">
        <label>Apa yang bikin berat?</label>
        <textarea data-sf="titikBeratDetail" rows="2" placeholder="Ceritain singkat...">${sf("titikBeratDetail")}</textarea>
      </div>` : ""}`;
  // Task 7d item 5: recovery/rest quests get their own structured fields
  // (sleep, water, protein meals, pain level) instead of ever falling back
  // to a free-text journal prompt - closes the exact regression the founder
  // found (a post-cramp "Audit Fondasi Pemulihan" quest reverting to "buat
  // catatan jujur tentang apa yang kamu makan..."). No single target number
  // here (evidenceSchema.target is always null for recovery, see
  // server/claude.js's normalizeEvidenceSchema) - completion is just
  // "did you record it", same as before Task 7c's auto-status computation
  // existed for cardio/gym.
  const recoveryFieldsHTML = `
      <div class="struct-grid">
        <div class="field"><label>Durasi tidur (jam)</label><input type="number" min="0" max="24" step="0.5" data-sf="durasiTidurJam" value="${sf("durasiTidurJam")}" placeholder="7" /></div>
        <div class="field"><label>Asupan air (gelas)</label><input type="number" min="0" max="30" data-sf="asupanAirGelas" value="${sf("asupanAirGelas")}" placeholder="8" /></div>
      </div>
      <div class="field"><label>Makan berprotein (jumlah hari ini)</label><input type="number" min="0" max="10" data-sf="makanProtein" value="${sf("makanProtein")}" placeholder="2" /></div>
      <div class="field">
        <label>Level nyeri saat ini</label>
        <div class="status-row">
          ${["Tidak ada", "Ringan", "Sedang", "Berat"].map((v) => `<button class="status-btn ${structForm.levelNyeri === v ? "active" : ""}" data-nyeri="${v}">${v}</button>`).join("")}
        </div>
      </div>`;
  const structFieldsHTML = !showStructFields ? "" : structKind === "cardio" ? cardioFieldsHTML : structKind === "recovery" ? recoveryFieldsHTML : gymFieldsHTML;

  // Task 7d DoD is about structured-physical quests specifically: since
  // normalizeEvidenceSchema now guarantees every such quest carries a usable
  // evidenceSchema/structuredKind, the [data-reflect-id] handler's cascade
  // always sets structKindAuto=true for them - this picker can never reach a
  // structured-physical quest anymore. It's still needed for the OTHER path
  // through recordMode: the founder's manual "Aktivitas fisik? Catat sebagai
  // record ->" opt-in toggle on an ordinary reflective quest (or a legacy
  // quest that predates structuredKind tagging entirely), where there's no
  // AI-declared kind to auto-derive from at all - #toggleRecord's handler
  // resets structKindAuto=false specifically so this stays reachable there.
  const kindPickerHTML = !showPicker || structKindAuto ? "" : `
      <div class="field">
        <label>Aktivitasnya jenis apa?</label>
        <div class="status-row">
          ${[["cardio", "Cardio"], ["gym-badan", "Gym tanpa alat"], ["gym-alat", "Gym dengan alat"]].map(([k, l]) =>
            `<button class="status-btn ${structKind === k ? "active" : ""}" data-skind="${k}">${l}</button>`).join("")}
        </div>
        ${structKind == null ? `<p style="color:var(--muted);font-size:12.5px;margin:8px 0 0">Pilih satu dulu — form record-nya nyesuain jenis aktivitasmu.</p>` : ""}
      </div>`;

  // Task 7c: "Aku nggak bisa quest ini" swaps the whole form for the
  // context-signal picker instead - checked before anything else so it
  // takes over the same card slot the evidence form would otherwise use.
  const reflectFormHTML = unableQuestId != null && unableQuestId === targetDay?.id ? unableFormHTML()
    : reflectOpen && !hasReflection ? `
    <div class="quest-card fadeUp" style="margin-top:-14px">
      ${mustRecord ? "" : `
      <div class="field">
        <label>Gimana progressnya?</label>
        <div class="status-row">
          ${[["done", "Selesai"], ["partial", "Sebagian"], ["skipped", "Nggak sempat"]].map(([k, l]) =>
            `<button class="status-btn ${reflectStatus === k ? "active" : ""}" data-status="${k}">${l}</button>`).join("")}
        </div>
      </div>`}
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
      ${mustRecord ? `<button class="btn-ghost" id="unableQuestBtn" data-unable-quest="${targetDay.id}" style="margin-top:${formReady ? "10px" : "4px"}">Aku nggak bisa quest ini →</button>` : ""}
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
    : practiceTestFlow ? practiceTestFlowHTML()
    : jobMatchFlow ? jobMatchFlowHTML()
    : jobApplicationFlow ? jobApplicationFlowHTML()
    : nutritionFlow ? nutritionFlowHTML()
    : reflectOpen ? questSummaryCard(targetDay, goalLabel(targetDay?.goalIndex), milestoneLabel(targetDay?.goalIndex))
    : openQuests.length > 1 ? `
    <div class="quest-carousel">
      ${openQuests.map((q) => questSummaryCard(q, goalLabel(q.goalIndex), milestoneLabel(q.goalIndex))).join("")}
    </div>
    <div class="eyebrow mono swipe-hint">← geser untuk lihat ${openQuests.length} quest yang lagi terbuka</div>`
    : questSummaryCard(openQuests[0] || null, goalLabel(openQuests[0]?.goalIndex), milestoneLabel(openQuests[0]?.goalIndex));

  // Homepage redesign: Home body is everything that used to be the whole
  // dashboard (minus Character Stats, which moved to its own screen) -
  // compact chapter context, Eleva Observed, quests, Side Quest placeholder,
  // Kondisi Hari Ini, Riwayat. Kept as a local const (not a top-level
  // function) since it closes over a dozen already-computed locals above
  // (questSectionHTML, reflectFormHTML, goals, openQuests, etc.) that aren't
  // worth threading through a separate function signature.
  // SOMA Nutrition Part B item 9: nutrition-log quests resolve LAZILY (see
  // resolveNutritionQuest, server/index.js) - there's no synchronous submit
  // moment for the shortfall picker Task 7d item 6 built for structured-
  // physical, so GET /api/state surfaces any still-unpicked ones and this
  // banner shows them here instead. Same fixed-option/no-word-count/no-
  // reflection-as-proof shape, one small card per pending quest.
  const nutritionShortfallHTML = (s.pendingNutritionShortfalls || []).map((p) => `
    <div class="quest-card" style="margin-bottom:10px">
      <div class="kondisi-label mono">KENAPA TARGET NUTRISI "${esc(p.title)}" BELUM TERCAPAI?</div>
      <div class="kondisi-chips">
        ${p.reasons.map((r) => `<button class="kondisi-chip" data-nutrition-shortfall-quest="${p.id}" data-nutrition-shortfall-reason="${esc(r)}">${esc(r)}</button>`).join("")}
      </div>
    </div>`).join("");

  const homeBodyHTML = `
    ${s.aiActive ? "" : `<div class="banner-warn">Mode tanpa API key — quest masih generik. Tambahkan ANTHROPIC_API_KEY di .env supaya mentor beneran personal.</div>`}
    ${nutritionShortfallHTML}
    <div class="chapter-header compact">
      <div class="bab mono">BAB ${s.chapterNumber} · ${esc(s.chapterTitle).toUpperCase()}</div>
      <div class="rule"></div>
      ${s.pathwayNoun ? `<div class="pathway-badge mono">${esc(maturityTier(s.growthSessions))} ${esc(s.pathwayNoun)}${s.pathwayStatus === "trial" ? ` <span class="trial-tag">(hipotesis — First Trial)</span>` : ""}</div>` : ""}
    </div>
    ${observedCardHTML(s.observed)}
    ${questSectionHTML}
    ${reflectFormHTML}
    ${sideQuestRowHTML(reflectOpen ? sideQuests.filter((q) => q.id !== reflectTarget) : sideQuests)}
    ${kondisiRowHTML(s.kondisiStatus || "Normal", s.kondisiNote)}
    ${s.history?.length ? `
    <div style="margin:20px 0 28px">
      <div class="eyebrow mono">RIWAYAT</div>
      ${s.history.map((d) => `
        <div class="history-item done">
          <div class="date mono">${d.date}</div>
          <div class="title">${esc(d.quest?.title || "")}</div>
          ${d.reflection?.text ? `<div class="snippet">${esc(d.reflection.text.slice(0, 90))}${d.reflection.text.length > 90 ? "…" : ""}</div>` : d.reflection?.structuredData ? `<div class="snippet mono">${esc(structSummary(d.reflection.structuredData))}</div>` : ""}
        </div>`).join("")}
    </div>` : ""}`;

  const screenBodyHTML = activeScreen === "kisahmu" ? kisahmuScreenHTML(s)
    : activeScreen === "character" ? characterScreenHTML(s)
    : activeScreen === "settings" ? settingsScreenHTML()
    : activeScreen === "meta" ? metaScreenHTML(s, allOpenQuests)
    : homeBodyHTML;

  // Help "?" and Artifacts icons now sit INLINE in the header's icon row
  // (not absolute-positioned floating over the body anymore) - the old
  // top:96px placement started overlapping .banner-warn/.observed-card once
  // Home's content grew taller than the fixed offset assumed.
  const homeExtraIconsHTML = activeScreen === "home"
    ? `<button class="header-icon-btn" id="openArtifacts" aria-label="Artifacts">🗎</button>${helpBtnHTML("dashboard")}`
    : activeScreen === "meta" ? helpBtnHTML("meta")
    : "";

  root.innerHTML = `
    <div class="shell app-shell">
      ${appHeaderHTML(s, homeExtraIconsHTML)}
      ${activeScreen === "home" ? `${helpSheetHTML("dashboard")}${artifactsSheetHTML()}` : ""}
      ${activeScreen === "meta" ? helpSheetHTML("meta") : ""}
      <div class="screen-body">${screenBodyHTML}</div>
      ${tabBarHTML()}
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
  document.querySelectorAll("[data-reflect-id]").forEach((b) => b.addEventListener("click", async () => {
    const id = Number(b.dataset.reflectId);
    const quest = allOpenQuests.find((q) => q.id === id)?.quest;
    // Task 9: practice-test quests skip the reflectOpen form entirely - they
    // get their own flow (answer, submit) instead of a text/structured-
    // fields box.
    if (quest?.completionType === "practice-test") {
      // Item 1 (12 Agustus) + follow-up (12 Agustus, founder request from
      // production): tapping "Mulai" on a Today's Trial practice-test quest
      // NEVER shows the Reading/Listening or Academic/General pickers
      // anymore - it goes straight to the questions. quest.practiceTestSchema
      // supplies kind/track when the quest itself was explicit about them;
      // otherwise this defaults to Reading/Academic (a fixed default, not an
      // AI guess - simplest predictable behavior). The picker UI itself
      // (practiceTestFlowHTML's "kind"/"track" steps) still exists and is
      // still used by the META tab's practice-test tool, where the user is
      // deliberately choosing to start a session and picking what to
      // practice IS the point.
      const pts = quest.practiceTestSchema || {};
      const kind = pts.kind || "reading";
      const track = pts.track || "academic";
      practiceTestFlow = { questId: id, kind, track, answers: {} };
      root.innerHTML = spinnerHTML("Menyusun soal...");
      try {
        const resp = await api("/api/practice-test/generate", { method: "POST", body: { questId: id, kind, track } });
        practiceTestFlow.payload = resp;
        practiceTestFlow.plays = 0;
        practiceTestFlow.step = "test";
        practiceTestFlow.error = "";
      } catch (e) {
        // Rare (generatePracticeTest already falls back to static content on
        // any AI failure - this only fires on a real server/network error).
        // No picker to fall back to anymore, so a dedicated retry step.
        practiceTestFlow.step = "error";
        practiceTestFlow.error = e.message;
      }
      renderDashboard();
      return;
    }
    // Task 10b: job-match-analysis quests check the Artifacts library first -
    // a returning user with a CV already on file skips straight to the job
    // posting upload step, never asked to re-upload the same CV.
    if (quest?.completionType === "job-match-analysis") {
      root.innerHTML = spinnerHTML("Memeriksa CV tersimpan...");
      let cv = null;
      try {
        const { artifacts } = await api("/api/artifacts");
        cv = artifacts.find((a) => a.type === "cv") || null;
      } catch (e) { /* fall through to upload-cv either way */ }
      jobMatchFlow = { questId: id, step: cv ? "upload-job" : "upload-cv", cvArtifact: cv, images: [], error: "" };
      renderDashboard();
      return;
    }
    // Task 14 point 5: job-application-submit quests check the Artifacts
    // library first, same pattern as job-match-analysis just above.
    if (quest?.completionType === "job-application-submit") {
      root.innerHTML = spinnerHTML("Memeriksa CV tersimpan...");
      let cv = null;
      try {
        const { artifacts } = await api("/api/artifacts");
        cv = artifacts.find((a) => a.type === "cv") || null;
      } catch (e) { /* fall through to cv step either way */ }
      jobApplicationFlow = {
        questId: id, step: cv ? "form" : "cv", cvArtifact: cv,
        form: { companyName: "", roleTitle: "", dateApplied: "", submissionProof: "" }, error: "",
      };
      renderDashboard();
      return;
    }
    // SOMA Nutrition Part B: a nutrition-log quest opens the Log Meal flow
    // directly, same "own flow, not reflectOpen" pattern as every other
    // non-reflective completionType above.
    if (quest?.completionType === "nutrition-log") {
      await openNutritionFlow({ id, quest });
      renderDashboard();
      return;
    }
    beginStructuredOrReflectiveFlow(id, quest);
    renderDashboard();
  }));
  // Meta Inner Realm: tapping LABORA's Job Match tool row starts a
  // standalone session via POST /api/meta/start, then hands off into the
  // EXACT SAME flow state a Today's Trial job-match-analysis quest would use
  // (jobMatchFlow, including the CV-check - see the [data-reflect-id]
  // handler above) - no duplicated UI, just a different entry point. Only
  // "job-match" reaches this handler now - SOMA/LINGUA's tool rows route
  // through [data-soma-mode]/[data-lingua-track] below instead (they need a
  // resume-if-active check or a preset kind first), and the old generic
  // "practice-test" tool (kind-picker) was replaced by LINGUA's direct
  // Reading/Listening rows.
  document.querySelectorAll("[data-meta-tool]").forEach((b) => b.addEventListener("click", async () => {
    const tool = b.dataset.metaTool;
    metaError = "";
    root.innerHTML = spinnerHTML("Menyiapkan sesi...");
    try {
      const { quest } = await api("/api/meta/start", { method: "POST", body: { tool } });
      let cv = null;
      try {
        const { artifacts } = await api("/api/artifacts");
        cv = artifacts.find((a) => a.type === "cv") || null;
      } catch (e) { /* fall through to upload-cv either way */ }
      jobMatchFlow = { questId: quest.id, step: cv ? "upload-job" : "upload-cv", cvArtifact: cv, images: [], error: "" };
      activeScreen = "home";
    } catch (e) {
      metaError = e.message;
    }
    renderDashboard();
  }));
  // Meta Inner Realm: SOMA's Movement/Recovery/Nutrition tool rows call
  // straight into here - "activity"/"recovery" resume the existing quest if
  // one is active (either sub-kind counts as the same "activity" domain),
  // else "activity" falls through to the cardio/gym kind picker, "recovery"
  // skips the picker entirely (its kind is already known), "nutrition"
  // resumes or starts a brand-new PROGRESSIVE quest directly.
  document.querySelectorAll("[data-soma-mode]").forEach((b) => b.addEventListener("click", async () => {
    const mode = b.dataset.somaMode;
    const active = activeSomaQuest(allOpenQuests, mode === "recovery" ? "activity" : mode);
    if (active) {
      if (mode === "nutrition") await openNutritionFlow(active);
      else beginStructuredOrReflectiveFlow(active.id, active.quest);
      activeScreen = "home";
      renderDashboard();
      return;
    }
    if (mode === "activity") {
      metaBodyPicking = true;
      renderDashboard();
      return;
    }
    root.innerHTML = spinnerHTML("Menyiapkan sesi...");
    try {
      if (mode === "recovery") {
        const { quest } = await api("/api/meta/start", { method: "POST", body: { tool: "body", kind: "recovery" } });
        reflectTarget = quest.id; reflectOpen = true; reflectStatus = "done"; reflectText = "";
        structForm = {}; reflectError = ""; unableQuestId = null;
        recordMode = true; structKind = "recovery"; structKindAuto = true;
      } else {
        const { quest } = await api("/api/meta/start", { method: "POST", body: { tool: "nutrition" } });
        await openNutritionFlow(quest);
      }
      activeScreen = "home";
    } catch (e) {
      metaError = e.message;
    }
    renderDashboard();
  }));
  // META target-recommendation follow-up: LINGUA's Reading/Listening tool
  // rows start a META practice-test session with the track PRESET (skips
  // straight to practiceTestFlow's "track" step instead of asking kind
  // first) - Writing/Speaking have no row here at all yet (coming-soon).
  document.querySelectorAll("[data-lingua-track]").forEach((b) => b.addEventListener("click", async () => {
    const kind = b.dataset.linguaTrack;
    metaError = "";
    root.innerHTML = spinnerHTML("Menyiapkan sesi...");
    try {
      const { quest } = await api("/api/meta/start", { method: "POST", body: { tool: "practice-test" } });
      practiceTestFlow = { questId: quest.id, step: "track", kind, answers: {} };
      activeScreen = "home";
    } catch (e) {
      metaError = e.message;
    }
    renderDashboard();
  }));
  // META target-recommendation follow-up: tapping an ACTIVE target card
  // opens that realm's tool list ("World Map shows Target, Realm page shows
  // Tools" - founder framing) instead of jumping straight into a flow.
  document.querySelectorAll("[data-meta-realm-open]").forEach((b) => b.addEventListener("click", () => {
    metaRealmOpen = b.dataset.metaRealmOpen;
    metaError = "";
    renderDashboard();
  }));
  document.getElementById("metaRealmBack")?.addEventListener("click", () => {
    metaRealmOpen = null;
    metaBodyPicking = false;
    renderDashboard();
  });
  // META target-recommendation follow-up: the founder explicitly wants a
  // dedicated approve step here, separate from the existing "Target
  // Berikutnya" A/B/C picker - a "recommend" card only becomes "active" (and
  // shows up as a real target on the map) after this tap.
  document.querySelectorAll("[data-meta-target-confirm]").forEach((b) => b.addEventListener("click", async () => {
    if (metaTargetBusy) return;
    metaTargetBusy = true;
    metaError = "";
    renderDashboard();
    try {
      await api("/api/meta/target/confirm", { method: "POST", body: { realm: b.dataset.metaTargetConfirm, goalIndex: Number(b.dataset.metaTargetGoal) } });
      appState = await api("/api/state");
    } catch (e) {
      metaError = e.message;
    }
    metaTargetBusy = false;
    renderDashboard();
  }));
  // META target-recommendation follow-up: the empty-state CTA appends a new
  // First Trial goal (POST /api/goals) - once it exists, domain inference
  // (server/metaTargets.js) picks it up as a fresh "recommend" candidate on
  // the next state refresh, no extra wiring needed for that step.
  document.querySelectorAll("[data-meta-goal-submit]").forEach((b) => b.addEventListener("click", async () => {
    if (metaTargetBusy) return;
    const realm = b.dataset.metaGoalSubmit;
    const input = document.getElementById(`metaGoalInput-${realm}`);
    const text = (input?.value || "").trim();
    metaGoalDraft[realm] = text;
    if (!text) { metaError = "Tulis target dulu."; renderDashboard(); return; }
    metaTargetBusy = true;
    metaError = "";
    renderDashboard();
    try {
      await api("/api/goals", { method: "POST", body: { text } });
      metaGoalDraft[realm] = "";
      appState = await api("/api/state");
    } catch (e) {
      metaError = e.message;
    }
    metaTargetBusy = false;
    renderDashboard();
  }));
  // Meta Inner Realm: hint-card dismissal persists via localStorage (see the
  // metaHintDismissed declaration up top for why - no existing backend flag
  // pattern in this app to reuse instead).
  document.getElementById("metaHintClose")?.addEventListener("click", () => {
    metaHintDismissed = true;
    try { localStorage.setItem("elevaMetaHintDismissed", "1"); } catch (e) { /* private mode etc - just won't persist across reloads */ }
    renderDashboard();
  });
  document.querySelectorAll("[data-meta-body-kind]").forEach((b) => b.addEventListener("click", async () => {
    const kind = b.dataset.metaBodyKind;
    root.innerHTML = spinnerHTML("Menyiapkan sesi...");
    try {
      const { quest } = await api("/api/meta/start", { method: "POST", body: { tool: "body", kind } });
      reflectTarget = quest.id; reflectOpen = true; reflectStatus = "done"; reflectText = "";
      structForm = {}; reflectError = ""; unableQuestId = null;
      recordMode = true;
      // Mirrors the [data-reflect-id] handler's structuredKind fallback cascade.
      structKind = kind === "gym" ? "gym-alat" : kind;
      structKindAuto = true;
      metaBodyPicking = false;
      activeScreen = "home";
    } catch (e) {
      metaBodyPicking = false;
      metaError = e.message;
    }
    renderDashboard();
  }));
  document.getElementById("metaBodyCancel")?.addEventListener("click", () => { metaBodyPicking = false; renderDashboard(); });
  document.querySelectorAll("[data-pt-kind]").forEach((b) => b.addEventListener("click", () => {
    practiceTestFlow.kind = b.dataset.ptKind;
    practiceTestFlow.step = "track";
    practiceTestFlow.error = "";
    renderDashboard();
  }));
  document.querySelectorAll("[data-pt-track]").forEach((b) => b.addEventListener("click", async () => {
    practiceTestFlow.track = b.dataset.ptTrack;
    root.innerHTML = spinnerHTML("Menyusun soal...");
    try {
      const resp = await api("/api/practice-test/generate", { method: "POST", body: { questId: practiceTestFlow.questId, kind: practiceTestFlow.kind, track: practiceTestFlow.track } });
      practiceTestFlow.payload = resp;
      practiceTestFlow.answers = {};
      practiceTestFlow.plays = 0;
      practiceTestFlow.step = "test";
      practiceTestFlow.error = "";
    } catch (e) {
      practiceTestFlow.step = "track";
      practiceTestFlow.error = e.message;
    }
    renderDashboard();
  }));
  document.getElementById("ptPlay")?.addEventListener("click", () => {
    if (practiceTestFlow.plays >= 2) return;
    speakScript(practiceTestFlow.payload.script);
    practiceTestFlow.plays += 1;
    renderDashboard();
  });
  document.querySelectorAll("[data-pt-choice]").forEach((b) => b.addEventListener("click", () => {
    practiceTestFlow.answers[b.dataset.ptChoice] = b.dataset.ptValue;
    practiceTestFlow.error = "";
    renderDashboard();
  }));
  // Fill-in-the-blank inputs write straight to state without re-rendering,
  // same reasoning as reflectText/structForm elsewhere - a re-render mid-
  // type would drop focus.
  document.querySelectorAll("[data-pt-fill]").forEach((el) => el.addEventListener("input", (e) => {
    practiceTestFlow.answers[el.dataset.ptFill] = e.target.value;
  }));
  document.getElementById("ptSubmit")?.addEventListener("click", async () => {
    const p = practiceTestFlow.payload;
    const missing = p.questions.some((q) => !String(practiceTestFlow.answers[q.id] || "").trim());
    if (missing) { practiceTestFlow.error = "Jawab semua soal dulu."; renderDashboard(); return; }
    root.innerHTML = spinnerHTML("Menilai jawaban...");
    try {
      const resp = await api("/api/practice-test/submit", { method: "POST", body: { questId: practiceTestFlow.questId, answers: practiceTestFlow.answers } });
      const qd = openQuests.find((q) => q.id === practiceTestFlow.questId);
      completedResult = {
        questTitle: qd?.quest?.title || "", status: "done", goalIndex: qd?.goalIndex,
        mentorReply: resp.mentorReply, interpretation: resp.interpretation, deltas: resp.deltas,
        // Task 13: assessment carries the deterministic band/observed/decision
        // blocks the rebuilt practiceTestResultHTML renders.
        practiceTest: { kind: practiceTestFlow.kind, track: practiceTestFlow.track, score: resp.score, total: resp.total, wrong: resp.wrong, assessment: resp.assessment || null },
        target: null,
      };
      practiceTestFlow = null;
    } catch (e) {
      practiceTestFlow.step = "test";
      practiceTestFlow.error = e.message;
    }
    renderDashboard();
  });
  document.getElementById("ptCancel")?.addEventListener("click", () => { practiceTestFlow = null; renderDashboard(); });
  document.getElementById("ptRetry")?.addEventListener("click", async () => {
    const f = practiceTestFlow;
    root.innerHTML = spinnerHTML("Menyusun soal...");
    try {
      const resp = await api("/api/practice-test/generate", { method: "POST", body: { questId: f.questId, kind: f.kind, track: f.track } });
      f.payload = resp;
      f.plays = 0;
      f.step = "test";
      f.error = "";
    } catch (e) {
      f.step = "error";
      f.error = e.message;
    }
    renderDashboard();
  });
  // Task 10b: job-match-analysis flow.
  document.getElementById("jmCvFile")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    root.innerHTML = spinnerHTML("Mengunggah & memproses CV...");
    try {
      const { mimeType, dataBase64, filename } = await fileToBase64(file);
      const resp = await api("/api/artifacts", { method: "POST", body: { type: "cv", mimeType, dataBase64, filename } });
      jobMatchFlow.cvArtifact = resp.artifact;
      jobMatchFlow.step = "upload-job";
      jobMatchFlow.error = "";
    } catch (err) {
      jobMatchFlow.error = err.message;
    }
    renderDashboard();
  });
  document.getElementById("jmJobFiles")?.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
      jobMatchFlow.images = await Promise.all(files.map(fileToBase64));
      jobMatchFlow.error = "";
    } catch (err) {
      jobMatchFlow.error = "Gagal membaca gambar.";
    }
    renderDashboard();
  });
  document.getElementById("jmChangeCv")?.addEventListener("click", () => {
    jobMatchFlow.step = "upload-cv";
    jobMatchFlow.error = "";
    renderDashboard();
  });
  document.getElementById("jmAnalyze")?.addEventListener("click", async () => {
    if (!jobMatchFlow.images.length) return;
    root.innerHTML = spinnerHTML("Menganalisis kecocokan...");
    try {
      const resp = await api("/api/job-match/analyze", {
        method: "POST",
        body: { questId: jobMatchFlow.questId, cvArtifactId: jobMatchFlow.cvArtifact.id, images: jobMatchFlow.images },
      });
      const qd = openQuests.find((q) => q.id === jobMatchFlow.questId);
      completedResult = {
        // Task 14 point 6: no more delta chip (deltas always empty here) -
        // resp.target is the Milestone progress line instead (reuses
        // targetPickerHTML, same component the structured-physical flow
        // uses for its own Target Berikutnya line).
        questTitle: qd?.quest?.title || "", status: "done", goalIndex: qd?.goalIndex,
        mentorReply: "", deltas: {}, jobMatch: resp.result, target: resp.target,
      };
      jobMatchFlow = null;
    } catch (e) {
      jobMatchFlow.step = "upload-job";
      jobMatchFlow.error = e.message;
    }
    renderDashboard();
  });
  document.getElementById("jmCancel")?.addEventListener("click", () => { jobMatchFlow = null; renderDashboard(); });
  // Task 14 point 5: job-application-submit flow.
  document.getElementById("jaCvFile")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    root.innerHTML = spinnerHTML("Mengunggah & memproses CV...");
    try {
      const { mimeType, dataBase64, filename } = await fileToBase64(file);
      const resp = await api("/api/artifacts", { method: "POST", body: { type: "cv", mimeType, dataBase64, filename } });
      jobApplicationFlow.cvArtifact = resp.artifact;
      jobApplicationFlow.step = "form";
      jobApplicationFlow.error = "";
    } catch (err) {
      jobApplicationFlow.error = err.message;
    }
    renderDashboard();
  });
  document.querySelectorAll("[data-jaf]").forEach((el) => el.addEventListener("input", (e) => {
    jobApplicationFlow.form[el.dataset.jaf] = e.target.value;
  }));
  document.getElementById("jaChangeCv")?.addEventListener("click", () => {
    jobApplicationFlow.step = "cv";
    jobApplicationFlow.error = "";
    renderDashboard();
  });
  document.getElementById("jaSubmit")?.addEventListener("click", async () => {
    const f = jobApplicationFlow.form;
    if (!f.companyName.trim() || !f.roleTitle.trim() || !f.dateApplied || f.submissionProof.trim().length < 8) {
      jobApplicationFlow.error = "Isi semua field dulu — bukti submit minimal 8 karakter.";
      renderDashboard();
      return;
    }
    root.innerHTML = spinnerHTML("Menyimpan lamaran...");
    try {
      const resp = await api("/api/job-application/submit", {
        method: "POST",
        body: { questId: jobApplicationFlow.questId, cvArtifactId: jobApplicationFlow.cvArtifact.id, ...jobApplicationFlow.form },
      });
      const qd = openQuests.find((q) => q.id === jobApplicationFlow.questId);
      completedResult = {
        questTitle: qd?.quest?.title || "", status: "done", goalIndex: qd?.goalIndex,
        mentorReply: resp.jobApplication ? `Lamaran ke ${resp.jobApplication.companyName} untuk ${resp.jobApplication.roleTitle} tercatat.` : "",
        deltas: {}, jobApplication: resp.jobApplication, target: resp.target,
      };
      jobApplicationFlow = null;
    } catch (e) {
      jobApplicationFlow.step = "form";
      jobApplicationFlow.error = e.message;
    }
    renderDashboard();
  });
  document.getElementById("jaCancel")?.addEventListener("click", () => { jobApplicationFlow = null; renderDashboard(); });
  // SOMA Nutrition Part B: Log Meal / Nutrition page flow.
  document.querySelectorAll("[data-nf-meal]").forEach((b) => b.addEventListener("click", () => {
    nutritionFlow.mealType = b.dataset.nfMeal;
    nutritionFlow.search = { query: "", results: [], error: "" };
    renderDashboard();
  }));
  document.getElementById("nfSearchInput")?.addEventListener("input", (e) => {
    nutritionFlow.search.query = e.target.value;
    clearTimeout(nfSearchTimer);
    const query = e.target.value.trim();
    if (!query) { nutritionFlow.search.results = []; return; }
    // Debounced live search - re-renders only once results actually land,
    // never on every keystroke (same reason [data-tf]/[data-jaf] inputs
    // don't re-render: would blow away focus/cursor position mid-type).
    nfSearchTimer = setTimeout(async () => {
      try {
        const { foods } = await api(`/api/foods/search?q=${encodeURIComponent(query)}`);
        if (nutritionFlow && nutritionFlow.search.query === query) {
          nutritionFlow.search.results = foods;
          nutritionFlow.search.error = foods.length ? "" : "Tidak ditemukan — coba kata lain atau upload foto.";
          renderDashboard();
        }
      } catch (e) { /* leave prior results showing rather than flash an error mid-type */ }
    }, 300);
  });
  document.querySelectorAll("[data-nf-pick]").forEach((b) => b.addEventListener("click", () => {
    const food = nutritionFlow.search.results.find((r) => String(r.id) === b.dataset.nfPick);
    if (!food) return;
    nutritionFlow.pending = {
      foodName: food.name, servingAmount: food.servingAmount, servingUnit: food.servingUnit,
      calories: food.calories, protein: food.protein, carbohydrates: food.carbohydrates, fat: food.fat,
      source: "search",
    };
    nutritionFlow.step = "confirm";
    nutritionFlow.error = "";
    renderDashboard();
  }));
  document.getElementById("nfPhotoStart")?.addEventListener("click", () => {
    nutritionFlow.step = "photo";
    nutritionFlow.photoError = "";
    renderDashboard();
  });
  document.getElementById("nfPhotoFile")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    root.innerHTML = spinnerHTML("Menganalisis foto...");
    try {
      const { mimeType, dataBase64 } = await fileToBase64(file);
      const { suggestion } = await api("/api/nutrition/analyze-photo", { method: "POST", body: { image: { mimeType, dataBase64 } } });
      nutritionFlow.pending = { ...suggestion, source: "photo" };
      nutritionFlow.step = "confirm";
      nutritionFlow.error = "";
    } catch (e2) {
      nutritionFlow.step = "photo";
      nutritionFlow.photoError = e2.message;
    }
    renderDashboard();
  });
  document.querySelectorAll("[data-nf]").forEach((el) => el.addEventListener("input", (e) => {
    const key = el.dataset.nf;
    nutritionFlow.pending[key] = key === "foodName" || key === "servingUnit" ? e.target.value : Number(e.target.value);
  }));
  document.getElementById("nfBackToLog")?.addEventListener("click", () => {
    nutritionFlow.step = "log";
    nutritionFlow.pending = null;
    nutritionFlow.error = "";
    nutritionFlow.photoError = "";
    renderDashboard();
  });
  document.getElementById("nfSave")?.addEventListener("click", async () => {
    const it = nutritionFlow.pending;
    if (!it.foodName?.trim() || !it.servingAmount || !it.servingUnit?.trim()) {
      nutritionFlow.error = "Lengkapi nama makanan, jumlah, dan satuan porsi dulu.";
      renderDashboard();
      return;
    }
    root.innerHTML = spinnerHTML("Menyimpan...");
    try {
      const resp = await api("/api/nutrition/log", {
        method: "POST",
        body: { questId: nutritionFlow.questId, mealType: nutritionFlow.mealType, ...it },
      });
      nutritionFlow.entries = [...nutritionFlow.entries, resp.entry];
      if (resp.progressive) nutritionFlow.quest.progressive = resp.progressive;
      if (resp.resolved) {
        nutritionFlow.step = "completed";
        nutritionFlow.completedMessage = resp.resolved.mentorReply || "";
      } else {
        nutritionFlow.step = "log";
        nutritionFlow.pending = null;
        nutritionFlow.mealType = null;
        nutritionFlow.search = { query: "", results: [], error: "" };
      }
      nutritionFlow.error = "";
    } catch (e) {
      nutritionFlow.error = e.message;
    }
    renderDashboard();
  });
  document.getElementById("nfDone")?.addEventListener("click", async () => {
    nutritionFlow = null;
    root.innerHTML = spinnerHTML("Memuat...");
    appState = await api("/api/state");
    renderDashboard();
  });
  document.getElementById("nfClose")?.addEventListener("click", async () => {
    nutritionFlow = null;
    root.innerHTML = spinnerHTML("Memuat...");
    appState = await api("/api/state");
    renderDashboard();
  });
  // Task 10a: Artifacts sheet.
  document.getElementById("openArtifacts")?.addEventListener("click", async () => {
    artifactsOpen = true; artifactsError = "";
    renderDashboard();
    try {
      const { artifacts } = await api("/api/artifacts");
      artifactsList = artifacts;
    } catch (e) {
      artifactsError = e.message;
    }
    renderDashboard();
  });
  document.getElementById("artifactsOverlay")?.addEventListener("click", (e) => {
    if (e.target.id === "artifactsOverlay" || e.target.id === "artifactsClose") { artifactsOpen = false; renderDashboard(); }
  });
  document.getElementById("artifactAddFile")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { mimeType, dataBase64, filename } = await fileToBase64(file);
      const resp = await api("/api/artifacts", { method: "POST", body: { type: "cv", mimeType, dataBase64, filename } });
      artifactsList = [resp.artifact, ...(artifactsList || [])];
      artifactsError = "";
    } catch (err) {
      artifactsError = err.message;
    }
    renderDashboard();
  });
  document.querySelectorAll("[data-artifact-replace]").forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.artifactReplace;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.docx,image/png,image/jpeg,image/webp";
    input.addEventListener("change", async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const { mimeType, dataBase64, filename } = await fileToBase64(file);
        const resp = await api(`/api/artifacts/${id}/replace`, { method: "POST", body: { mimeType, dataBase64, filename } });
        artifactsList = (artifactsList || []).map((a) => (String(a.id) === String(id) ? resp.artifact : a));
        artifactsError = "";
      } catch (err) {
        artifactsError = err.message;
      }
      renderDashboard();
    });
    input.click();
  }));
  document.getElementById("dismissCompleted")?.addEventListener("click", async () => {
    completedResult = null;
    shortfallReasonPicked = null;
    targetChoice = null; targetManualForm = {}; targetError = "";
    root.innerHTML = spinnerHTML("Memuat quest berikutnya...");
    appState = await api("/api/state");
    renderDashboard();
  });
  // Task 7d.6: shortfall-reason chip - single tap commits immediately (same
  // pattern as Kondisi Hari Ini), never blocks "Lanjut" either way.
  document.querySelectorAll("[data-shortfall-reason]").forEach((b) => b.addEventListener("click", async () => {
    const reason = b.dataset.shortfallReason;
    shortfallReasonPicked = reason;
    renderDashboard();
    try {
      await api("/api/quest/shortfall-reason", { method: "POST", body: { questId: completedResult.questId, reason } });
    } catch (e) { /* context signal, not critical - silently keep the optimistic UI state */ }
  }));
  // SOMA Nutrition Part B item 9: same single-tap-commits pattern as the
  // structured-physical shortfall chips above, but a LIST of pending quests
  // (nutrition resolves lazily, several could pile up) - optimistically
  // drops the tapped quest's card from the banner, doesn't wait for the
  // POST round trip either.
  document.querySelectorAll("[data-nutrition-shortfall-reason]").forEach((b) => b.addEventListener("click", async () => {
    const questId = Number(b.dataset.nutritionShortfallQuest);
    const reason = b.dataset.nutritionShortfallReason;
    appState.pendingNutritionShortfalls = (appState.pendingNutritionShortfalls || []).filter((p) => p.id !== questId);
    renderDashboard();
    try {
      await api("/api/quest/shortfall-reason", { method: "POST", body: { questId, reason } });
    } catch (e) { /* context signal, not critical - silently keep the optimistic UI state */ }
  }));
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
      } else if (t.kind === "livelihood-funnel") {
        const metricLabel = String(targetManualForm.metricLabel || "").trim();
        const targetValue = Number(targetManualForm.targetValue);
        if (!metricLabel || !targetValue || targetValue <= 0) {
          targetError = "Isi nama metrik dan target angka dulu, target lebih dari 0.";
          renderDashboard();
          return;
        }
        payload = { kind: "livelihood-funnel", metrics: { metricLabel, targetValue, currentValue: 0 } };
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
  // Fokus 0: Ringan/Cukup only need the pick itself; Berat reveals a
  // conditional reflection field, so unlike plain typed fields this needs a
  // re-render (new element appearing), not just a live DOM write.
  document.querySelectorAll("[data-tberat]").forEach((b) => b.addEventListener("click", () => {
    structForm.titikBerat = b.dataset.tberat;
    if (!["Berat", "Terlalu berat"].includes(structForm.titikBerat)) delete structForm.titikBeratDetail;
    reflectError = "";
    renderDashboard();
  }));
  // Task 7d.5: recovery Trial's pain-level chip picker - same active-class
  // re-render pattern as data-tberat above, just no conditional field to reveal.
  document.querySelectorAll("[data-nyeri]").forEach((b) => b.addEventListener("click", () => {
    structForm.levelNyeri = b.dataset.nyeri;
    reflectError = "";
    renderDashboard();
  }));
  // Manual opt-in record-mode path (kindPickerHTML above) - still needed for
  // an ordinary reflective/legacy quest the AI never tagged with a
  // structuredKind at all, so there's nothing to auto-derive from.
  document.querySelectorAll("[data-skind]").forEach((b) => b.addEventListener("click", () => { structKind = b.dataset.skind; reflectError = ""; renderDashboard(); }));
  document.getElementById("toggleRecord")?.addEventListener("click", () => { recordMode = !recordMode; structKind = null; structKindAuto = false; reflectError = ""; renderDashboard(); });
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
      if (["durasiMin", "durasiSec", "jarakKm"].includes(el.dataset.sf)) {
        const paceEl = document.getElementById("paceDisplay");
        if (paceEl) {
          const p = paceLabel(durasiMenitFromFields(structForm), structForm.jarakKm);
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
        // Task 7d: "recovery" is its own third kind (rest/hydration/nutrition
        // fields, see structFieldsHTML) - not a gym variant.
        const kind = structKind === "cardio" ? "cardio" : structKind === "recovery" ? "recovery" : "gym";
        body.structuredData = { ...structForm, kind };
        if (structKind === "gym-badan") delete body.structuredData.bebanKg;
        // Task 7c: durasi is typed as separate Menit/Detik fields - combined
        // to decimal minutes here, at the one edge where it leaves the
        // client, so the server (and every other consumer: pace calc,
        // target metrics) keeps working with a plain number same as before.
        if (structKind === "cardio") {
          body.structuredData.durasiMenit = durasiMenitFromFields(structForm);
          delete body.structuredData.durasiMin;
          delete body.structuredData.durasiSec;
        }
      }
      const resp = await api("/api/reflection", { method: "POST", body });
      // The per-goal model regenerates this goal's next quest the instant
      // it's marked done - no more free "linger a day" grace period a
      // calendar/24h-based model gave the mentor's reply to be seen. Hold
      // it here until the user dismisses it, instead of refetching state
      // immediately (which could otherwise swap this card out from under
      // them before they ever read it).
      completedResult = {
        // Task 7c: server computes the real status for structured-physical
        // quests (evidence vs target) - resp.status is authoritative, not
        // the client's reflectStatus (which for those quests is just a
        // fixed "done" now that the self-report picker is gone).
        questTitle: targetDay.quest.title, status: resp.status, goalIndex: targetDay.goalIndex,
        questId: resp.questId, mentorReply: resp.mentorReply, interpretation: resp.interpretation,
        safetyNote: resp.safetyNote, deltas: resp.deltas, structuredData: resp.structuredData,
        target: resp.targetScreen || null, shortfallPrompt: resp.shortfallPrompt || null,
      };
      shortfallReasonPicked = null;
      reflectOpen = false; reflectTarget = null; reflectText = ""; structForm = {}; reflectError = "";
      recordMode = false; structKind = null; structKindAuto = false;
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
  // Homepage redesign: nav shell + Home-specific new interactions.
  document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => {
    activeScreen = b.dataset.tab;
    // META target-recommendation follow-up: re-selecting the META tab
    // always starts back at the world map, same "tab reselect goes to root"
    // convention as a native tab bar - metaRealmOpen is a navigational
    // position, not an in-progress flow with data at stake (unlike
    // jobMatchFlow/nutritionFlow, which deliberately DON'T reset on tab
    // switches - see the [data-reflect-id] handler's own comment on that).
    if (activeScreen === "meta") metaRealmOpen = null;
    renderDashboard();
  }));
  document.getElementById("headerAvatar")?.addEventListener("click", () => { activeScreen = "settings"; renderDashboard(); });
  document.getElementById("headerSettings")?.addEventListener("click", () => { activeScreen = "settings"; renderDashboard(); });
  document.querySelectorAll("[data-reason-toggle]").forEach((b) => b.addEventListener("click", () => {
    const id = Number(b.dataset.reasonToggle);
    if (reasonOpenIds.has(id)) reasonOpenIds.delete(id); else reasonOpenIds.add(id);
    renderDashboard();
  }));
  document.querySelectorAll("[data-toggle-sidequest]").forEach((b) => b.addEventListener("click", () => {
    sideQuestsOpen = !sideQuestsOpen;
    renderDashboard();
  }));
  document.getElementById("kondisiUpdateBtn")?.addEventListener("click", () => { kondisiOpen = true; kondisiError = ""; kondisiNoteDraft = ""; renderDashboard(); });
  document.getElementById("kondisiDone")?.addEventListener("click", () => { kondisiOpen = false; renderDashboard(); });
  document.getElementById("kondisiNoteInput")?.addEventListener("input", (e) => { kondisiNoteDraft = e.target.value; });
  // Single tap on a chip = commit immediately, no separate confirm step
  // (per handoff interaction spec) - closes back to the summary row itself.
  // Whatever's already typed in the (optional) note field at tap-time rides
  // along in the same request.
  document.querySelectorAll("[data-kondisi]").forEach((b) => b.addEventListener("click", async () => {
    const status = b.dataset.kondisi;
    const note = document.getElementById("kondisiNoteInput")?.value || kondisiNoteDraft;
    try {
      const r = await api("/api/kondisi", { method: "POST", body: { status, note } });
      appState.kondisiStatus = status;
      appState.kondisiNote = r.kondisiNote;
      kondisiOpen = false;
      kondisiError = "";
      kondisiNoteDraft = "";
    } catch (e) {
      kondisiError = e.message;
    }
    renderDashboard();
  }));
  // Task 7c "Aku nggak bisa quest ini" - same mechanism, but never closes
  // back into the completed-quest flow: the quest stays exactly where it
  // was, only the context signal gets saved.
  document.querySelectorAll("[data-unable-kondisi]").forEach((b) => b.addEventListener("click", async () => {
    const status = b.dataset.unableKondisi;
    const note = document.getElementById("unableNoteInput")?.value || kondisiNoteDraft;
    try {
      const r = await api("/api/kondisi", { method: "POST", body: { status, note } });
      appState.kondisiStatus = status;
      appState.kondisiNote = r.kondisiNote;
      unableQuestId = null;
      kondisiError = "";
      kondisiNoteDraft = "";
    } catch (e) {
      kondisiError = e.message;
    }
    renderDashboard();
  }));
  document.getElementById("cancelUnable")?.addEventListener("click", () => { unableQuestId = null; kondisiError = ""; renderDashboard(); });
  document.querySelectorAll("[data-unable-quest]").forEach((b) => b.addEventListener("click", () => {
    unableQuestId = Number(b.dataset.unableQuest);
    kondisiError = ""; kondisiNoteDraft = "";
    renderDashboard();
  }));
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

// Real viewport-height unit (Growth Focus Radar, round 4 - repeated
// real-device report of Kembali/Lanjut still clipping even with an
// explicit height:100dvh). CSS dvh has proven unreliable across real
// mobile Safari's various toolbar/zoom states - the browser's own
// window.innerHeight/visualViewport.height is the actual ground truth,
// so --vh is measured directly from that instead of trusted from CSS,
// and every "Ndvh" in .shell-radar's compression clamp()s is replaced
// with calc(var(--vh, 1dvh) * N). Kept live via resize/orientationchange/
// visualViewport listeners so it tracks the toolbar showing/hiding.
function setRealVH() {
  const h = (window.visualViewport ? window.visualViewport.height : window.innerHeight) * 0.01;
  document.documentElement.style.setProperty("--vh", h + "px");
}
setRealVH();
window.addEventListener("resize", setRealVH);
window.addEventListener("orientationchange", setRealVH);
window.visualViewport?.addEventListener("resize", setRealVH);

boot();
