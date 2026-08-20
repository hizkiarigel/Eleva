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
// "Pilih Pathway" screen (round 32 handoff): per-Pathway color identity for
// this screen's card glow/DIPILIH tag/reasoning panel. Warden/Weaver/Pilgrim
// use the handoff's own exact new hex (screen-scoped, matching this app's
// established fidelity precedent for design handoffs). Specialist/Architect
// hex are NOT in the handoff (only described as "gold"/"sapphire") - these
// two literal values are copied from PATHWAY_META's existing glow (used on
// the dashboard elsewhere) so those 2 pathways' color identity stays
// consistent app-wide, not just on this one screen.
const PPICK_COLOR = {
  Warden: "#e0656a", Weaver: "#5fbf8f", Pilgrim: "#a78bd6",
  Specialist: "#d4a72c", Architect: "#3b6fd6",
};
// Fixed 3-reason copy per Pathway for the reasoning panel below the cards -
// static/hardcoded, NOT AI-generated (per founder instruction: use the
// handoff's own exact copy, don't genericize). Warden/Weaver/Pilgrim are
// verbatim from the design handoff (originally under "Warden"/"Waiver"/
// "Pilgrim" - Waiver == Weaver, confirmed with founder). Architect/
// Specialist are original copy (design handoff only covered 3 of 5
// Pathways) drafted to match that tone/length, informed by this codebase's
// own PATHWAY_DESC blurbs for those two.
const PATHWAY_REASONS = {
  Warden: [
    "Kamu cenderung kuat saat menjaga ritme dan konsistensi.",
    "Kamu cocok dengan quest yang bertumbuh lewat disiplin bertahap.",
    "Saat ada tekanan, kamu lebih nyaman bergerak daripada diam.",
  ],
  Weaver: [
    "Kamu berkembang lewat keterhubungan dan rasa saling percaya.",
    "Kamu lebih kuat saat punya tempat berpijak yang stabil.",
    "Hubungan di sekitarmu ikut memengaruhi caramu bertumbuh.",
  ],
  Pilgrim: [
    "Kamu banyak menunjukkan kebutuhan menemukan arah dan pengalaman baru.",
    "Kamu berkembang lebih natural lewat eksplorasi daripada pola yang kaku.",
    "Kamu cenderung mengubah discovery menjadi langkah nyata.",
  ],
  Architect: [
    "Kamu cenderung kuat saat menyusun langkah secara metodis dan terlihat.",
    "Kamu cocok dengan quest yang bertumbuh lewat struktur, bukan improvisasi.",
    "Kamu lebih nyaman bergerak begitu ada rencana yang jelas di depan.",
  ],
  Specialist: [
    "Kamu cenderung kuat saat bisa menyelam dalam ke satu fokus spesifik.",
    "Kamu cocok dengan quest yang bertumbuh lewat penguasaan, bukan cakupan luas.",
    "Kamu lebih puas menuntaskan satu hal sampai dalam daripada banyak hal sekilas.",
  ],
};
// Reasoning panel's circular sigil icon - mirrors the design handoff's own
// sigil(color,size) inline SVG verbatim, colored to match whichever card is
// currently selected.
function pathwaySigilSVG(color, size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="20" stroke="${color}" stroke-width="1.3" opacity=".6" />
    <circle cx="24" cy="24" r="13" stroke="${color}" stroke-width="1" opacity=".4" />
    <path d="M24 8l3.2 12.8L40 24l-12.8 3.2L24 40l-3.2-12.8L8 24l12.8-3.2L24 8z" fill="${color}" opacity=".85" />
    <circle cx="24" cy="24" r="2" fill="#1a1409" />
  </svg>`;
}
// Goal Setting screen (round 33 handoff): which literal sub-clause of each
// PATHWAY_DESC string to highlight in the Pathway's color - reuses the
// existing description text verbatim (don't fork a 3rd Pathway-description
// table alongside PATHWAY_DESC/PATHWAY_META.line), just marks which clause
// is the "highlight" the design calls for.
const PATHWAY_DESC_HIGHLIGHT = {
  Architect: "langkah demi langkah terlihat",
  Warden: "fondasi yang bisa diandalkan",
  Weaver: "memfasilitasi koneksi",
  Pilgrim: "gaya eksploratif, bukan tersesat",
  Specialist: "domain spesifik yang tidak masuk kategori umum",
};
function pathwayDescHTML(pathway, color) {
  const desc = PATHWAY_DESC[pathway] || "";
  const hl = PATHWAY_DESC_HIGHLIGHT[pathway];
  if (!hl || !desc.includes(hl)) return `<p class="gset-pathway-desc">${esc(desc)}</p>`;
  const [before, after] = desc.split(hl);
  return `<p class="gset-pathway-desc">${esc(before)}<span style="color:${color}">${esc(hl)}</span>${esc(after)}</p>`;
}
// "Acting Method" card (Goal Setting screen) - a phrase+description pair per
// Pathway describing its behavioral through-line. Distinct from the existing
// daily "Acting Method" quest-framing concept (server/claude.js MENTOR_SYSTEM
// line 6, surfaced at ~line 3320 as "TODAY'S ACTING METHOD" on quest cards) -
// that one is AI-chosen fresh per day; this is fixed identity copy per
// Pathway, same "static per-Pathway content table" pattern as
// PATHWAY_REASONS above. Named PATHWAY_ACTING_PHRASE (not ACTING_METHOD) to
// avoid colliding with that unrelated concept in code, even though the UI
// label is the same "ACTING METHOD" text per the design handoff.
// Warden/Weaver/Pilgrim verbatim from the design handoff's own PATHWAYS
// object (keyed "waiver" there - confirmed Weaver, "Anchor of Belonging"
// description matches exactly). Architect/Specialist are original copy
// (handoff only covered 3 of 5 Pathways), matching tone/structure
// (imperative English phrase + "Sebagai {Pathway}, kamu dilatih untuk..."),
// informed by PATHWAY_DESC - same gap-filling precedent as PATHWAY_REASONS'
// own Architect/Specialist entries (round 32).
const PATHWAY_ACTING_PHRASE = {
  Warden: { phrase: "Hold the line when it matters.", description: "Sebagai Warden, kamu dilatih untuk menjaga ritme, disiplin, dan konsistensi meski di bawah tekanan." },
  Weaver: { phrase: "Connect what is disconnected.", description: "Sebagai Weaver, kamu dilatih untuk melihat hubungan, membangun jembatan, dan menguatkan jaringan." },
  Pilgrim: { phrase: "Move toward what is unknown.", description: "Sebagai Pilgrim, kamu dilatih untuk menjelajah, mengambil langkah baru, dan mengubah discovery menjadi arah nyata." },
  Architect: { phrase: "Build the structure before you move.", description: "Sebagai Architect, kamu dilatih untuk menyusun langkah secara metodis dan membangun fondasi yang kokoh sebelum bergerak." },
  Specialist: { phrase: "Go deep before you go wide.", description: "Sebagai Specialist, kamu dilatih untuk menyelami satu bidang secara mendalam sebelum melebarkan cakupan." },
};
function actingMethodCardHTML(pathway) {
  const color = PPICK_COLOR[pathway] || "#e5aa50";
  const ap = PATHWAY_ACTING_PHRASE[pathway] || { phrase: "", description: "" };
  return `
    <div class="gset-acting-card">
      <div class="gset-acting-icon">${pathwaySigilSVG(color, 44)}</div>
      <div class="gset-acting-text">
        <div class="gset-acting-label mono">ACTING METHOD</div>
        <div class="gset-acting-phrase" style="color:${color}">${esc(ap.phrase)}</div>
        <p class="gset-acting-desc">${esc(ap.description)}</p>
      </div>
    </div>`;
}
function pathwayHeaderHTML(pathway, subPathwayNoun) {
  const color = PPICK_COLOR[pathway] || "#e5aa50";
  return `
    <div class="gset-pathway-line fr"><span style="color:${color}">${esc(pathway)}:</span> <span class="ivory">${esc(subPathwayNoun)}</span></div>
    ${pathwayDescHTML(pathway, color)}`;
}
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

// Goal Setting screen (round 33 handoff) - per-card render helpers. Card
// border/accent color reflects STATE (orange until approved, green once
// approved), never required/optional - Goal 2/3 are orange by default same
// as Goal 1.
function goalCardBorderColor(card) { return card.status === "approved" ? "rgba(95,191,143,.5)" : "rgba(216,163,85,.5)"; }
function goalCardAccentColor(card) { return card.status === "approved" ? "#5fbf8f" : "#e5aa50"; }
function goalCardHeadHTML(card, i) {
  const numerals = ["01", "02", "03"];
  const accent = goalCardAccentColor(card);
  const collapsedText = card.text.trim();
  return `
    <div class="gset-card-head" data-goal-head="${i}" style="cursor:${card.required ? "default" : "pointer"}">
      <span class="gset-card-numeral mono" style="color:${accent};border-color:${accent}">${numerals[i]}</span>
      <span class="gset-card-title">${card.required ? "GOAL UTAMA" : i === 1 ? "GOAL KEDUA" : "GOAL KETIGA"}</span>
      ${!card.required && !card.expanded && collapsedText ? `<span class="gset-card-preview">${esc(collapsedText)}</span>` : ""}
      <span class="gset-card-tag mono" style="color:${accent}">${card.required ? "WAJIB" : "OPSIONAL"}</span>
      ${!card.required ? `<span class="gset-chevron">${card.expanded ? "︿" : "﹀"}</span>` : ""}
    </div>`;
}
function goalCardFeedbackHTML(card, i) {
  return `
    <div class="gset-feedback-box">
      <p class="gset-feedback-text">${esc(card.feedback)}</p>
      <div class="gset-reco-label mono">ELEVA MENYARANKAN</div>
      ${card.recommendations.map((text, ri) => `
        <div class="gset-reco-row">
          <span class="gset-reco-letter">${ri === 0 ? "A." : "B."}</span>
          <span class="gset-reco-text">${esc(text)}</span>
          <button class="gset-reco-pick" data-goal-pick="${i}" data-reco-idx="${ri}">Pilih</button>
        </div>`).join("")}
      <span class="gset-own-change" data-goal-own="${i}">Ubah sendiri</span>
    </div>`;
}
function goalCardEditingBodyHTML(card, i) {
  return `
    <div class="gset-input-box">
      <textarea class="gset-textarea" data-goal-text="${i}" maxlength="200" placeholder="Tulis goal ${i === 0 ? "utamamu" : i === 1 ? "keduamu" : "ketigamu"}...">${esc(card.text)}</textarea>
      ${card.text ? `<span class="gset-clear-btn" data-goal-clear="${i}">✕</span>` : ""}
      <div class="gset-input-foot">
        <span class="gset-char-count mono">${card.text.length}/200</span>
        <button class="gset-set-btn" data-goal-set="${i}" ${(!card.text.trim() || card.status === "validating") ? "disabled" : ""}>${card.status === "validating" ? "Memeriksa…" : "✦ Set Goal"}</button>
      </div>
    </div>
    ${card.status === "needs_improvement" ? goalCardFeedbackHTML(card, i) : ""}`;
}
function goalCardApprovedHTML(card, i) {
  return `
    <div class="gset-approved-box">
      <p class="gset-approved-text">${esc(card.text)}</p>
      <div class="gset-approved-foot">
        <span class="gset-check">✓</span>
        <span class="gset-edit-link" data-goal-edit="${i}">Edit</span>
      </div>
    </div>`;
}
function goalCardHTML(card, i) {
  const showBody = card.required || card.expanded;
  return `
    <div class="gset-card" style="border-color:${goalCardBorderColor(card)}">
      ${goalCardHeadHTML(card, i)}
      ${showBody ? (card.status === "approved" ? goalCardApprovedHTML(card, i) : goalCardEditingBodyHTML(card, i)) : ""}
    </div>`;
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
  analysis: "Ini pola yang Eleva lihat dari radar dan pilihan-pilihanmu selama onboarding — sebelum kamu pilih pathway di langkah berikutnya.",
  pathway: "3 gaya yang mungkin cocok buat kamu, berdasarkan yang barusan kamu isi. Pilih salah satu, atau tulis sendiri kalau ngerasa nggak ada yang pas — bisa diganti nanti.",
  goals: "Goal utama wajib, dua lainnya opsional. Tulis, lalu tap Set Goal — Eleva bakal cek apakah goal-mu cukup jelas dan terukur. Kalau belum, kamu dapat saran perbaikan; kalau sudah pas, goal-nya disetujui dan siap jadi fondasi First Trial-mu.",
  dashboard: "Quest hari ini dari Eleva, disesuaikan sama fokusmu. Kerjakan, lalu tap Mulai — aktivitas fisik dicatat sebagai record singkat (pilih jenisnya: cardio atau gym), sisanya lewat refleksi teks.",
  meta: "Latihan mandiri, kapan aja — nggak perlu nunggu Eleva kasih quest-nya. Sesi di sini tetap dihitung sebagai bukti pertumbuhan, tapi nggak menggerakkan Milestone goal manapun.",
  movement: "Ikuti alurnya langkah demi langkah — progresmu kesimpan otomatis, jadi kalau ke-refresh atau ke-tab lain nggak hilang. Bukti aktivitasnya jujur aja, nggak perlu sempurna.",
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
// Design handoff's header info button: 26x26 circle, italic serif "i" (NOT
// the app's usual "?"), gold-tinted ring - opens the SAME helpSheetHTML(key)
// bottom sheet as every other screen's "?" (shared helpOpen state + the one
// delegated [data-help] listener below), just a different trigger visual
// for these two design-fidelity screens.
function chapterInfoBtnHTML(key) {
  return `<button class="chapter-info-btn fr" data-help="${key}" aria-label="Bantuan layar ini">i</button>`;
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
let reflectStatus = "COMPLETED";
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
// Round 41 (IELTS Listening Half Diagnostic, META: LINGUA): replaces
// LINGUA's old generic AI-quiz "Listening" row (practiceTestFlow's
// kind==="listening" path is now unreachable from there, left in place per
// this codebase's "don't delete, just unreachable" convention). Unlike
// every other *Flow object, "active"/"submitted" steps bypass the normal
// .app-shell chrome entirely (see renderDashboard's early-return) - the
// design's own "test mode" requirement (header+tab bar hidden during the
// exam). null when inactive.
// {
//   questId, step: "intro" | "active" | "submitted",
//   assessment: { recordings, questions, matchingLegend } | null,  // stripped package from POST /api/meta/start
//   answers: {},                 // { [questionId]: string } - NEVER reset by a replay
//   runsCompleted: 0,            // 0..2, only ever incremented by lstnFinishRun()
//   playback: { state: "idle" | "playing-rec1" | "transition" | "playing-rec2" | "run-complete" | "error", gen: 0, recordingId: null },
//   deadlineTs: null,            // Date.now() + 30min, set once on entering "active"
//   submitConfirmOpen: false,
//   error: "",
//   submittedResult: null,       // { correct, total, answeredCount, wrong, byTaskType } | null - set by lstnDoSubmit() on success, read by lstnSubmittedHTML()
// }
let listeningDiagnosticFlow = null;
// Round 42 (IELTS Reading Half Diagnostic): the Reading practice test's own
// chrome-free test mode - replaces the old flat one-card quiz for EVERY
// reading payload (sprint and drill alike, founder decision).
// practiceTestFlow now only carries the META track-picker/error steps and
// the unreachable listening-kind quiz (left in place per the "don't delete,
// just unreachable" convention). Like listeningDiagnosticFlow, every step
// except "intro" bypasses the normal .app-shell chrome entirely via
// renderDashboard's early-return.
// {
//   questId, origin: "home" | "meta",   // where exit/finish returns to
//   track: "academic" | "general",
//   step: "intro" | "active" | "review" | "result",
//   payload,                     // stripped payload from generate (v2 sprint: blocks + {title,paragraphs} passage; drill/legacy: flat questions, string passage)
//   blocks,                      // rdgDeriveBlocks(payload) - always present client-side
//   answers: {}, flags: {},      // flagged is a review marker, NEVER counts as unanswered; answers never erased (incl. timer expiry)
//   activeTab: "passage" | "questions",
//   blockIndex: 0,               // which block the Questions tab shows
//   scrollMem: { passage: 0, questions: 0 },  // per-tab scroll memory, survives tab switches AND re-renders
//   deadlineTs: null,            // set once by rdgStartCountdown (30min sprint / 20min drill)
//   timerExpired: false,
//   overviewOpen, exitConfirmOpen, submitConfirmOpen, timeUpOpen: false,
//   error: "", result: null,     // result: {score,total,wrong,assessment,mentorReply} from submit
// }
let readingTestFlow = null;
// Video Quest (video-quiz, LABORA design handoff): user learns from ONE
// self-picked YouTube video, then proves understanding through a
// source-locked 15-question HOTS assessment. Same chrome-free test-mode
// architecture as readingTestFlow: every step except "intro" bypasses the
// normal .app-shell via renderDashboard's early-return. In-flight answers
// are client-only (a reload restarts answering, same trade-off as rdg);
// the locked video + generated question set live server-side, so re-entry
// resumes with the SAME set via the idempotent /api/video-quiz/start.
// {
//   questId, origin: "home" | "meta",
//   topic, passThreshold, estimatedMinutes,   // from quest.videoQuiz
//   step: "intro" | "pick" | "ready" | "locked" | "assessment" | "review" | "result" | "pembahasan",
//   videoUrl: "",                // the pick step's input draft
//   checking: false,             // "Memeriksa materi..." in flight
//   checkError: "",              // validate-step error/not-relevant message
//   materi: null,                // { videoMeta, videoId, rationale } after a relevant check (pre-lock)
//   locked: null,                // { videoUrl, videoMeta, videoId } once the source lock exists
//   lastResult: null,            // quest.videoQuizState.lastResult mirror (fail landing on re-entry)
//   attempt: 1,
//   questions: null,             // stripped set from /start (no correct/explanation)
//   index: 0, answers: {},       // answers[qid] = array of option ids (even for single)
//   navOpen, sourceOpen, submitConfirmOpen, exitConfirmOpen: false,
//   result: null,                // submit response (pass: includes review[] for pembahasan)
//   error: "",
// }
let videoQuizFlow = null;
// Task 12 (META): true while the inline Cardio/Gym/Recovery picker for the
// "Body" META box is showing (tapped but no kind chosen yet). Reset after
// /api/meta/start succeeds or the user backs out.
let metaBodyPicking = false;
// Video Quest's LABORA row gets the same inline-card treatment as
// metaBodyPicking: true while the "what topic?" input card is showing.
let metaVideoQuestPicking = false;
// Movement→Training spec item 2: Recovery (and fresh-start Nutrition) get
// the same confirm-before-create step Movement's kind picker already gives -
// "recovery" | "nutrition" while the inline confirm card is showing, null
// otherwise. Reset after /api/meta/start succeeds or the user backs out -
// deliberately the same lifecycle pattern as metaBodyPicking above, not a
// new mechanism.
let metaSomaConfirm = null;
// Training spec: the fixed exercise catalog ({ exercises, muscleGroups,
// muscleGroupLabels } from GET /api/exercise-catalog), fetched lazily the
// first time a multi-exercise Training session form opens and cached for
// the rest of the page lifetime - static server data, no reason to refetch.
let exerciseCatalog = null;
// Training spec: in-progress multi-exercise workout log (client-side draft
// until the single submit persists it as reflection structuredData). null
// when no gym-session form is active. exercises[i].sets[j] keeps raw input
// strings while typing (same reason structForm does) - converted to numbers
// only at the submit edge.
// { exercises: [{ exerciseId, name, muscleGroup, collapsed, sets: [{ weightKg, reps, done }] }],
//   pickerOpen, pickerQuery, pickerGroup }
let gymSession = null;
// BODY · MOVEMENT execution flow (design handoff): the real multi-screen
// flow for Today's Trial cardio/gym quests (quest.primaryFeature ===
// "MOVEMENT") - Quest Preview -> Pre-Start -> (Strength: Active Session) ->
// Finish & Review -> Evidence -> Submitted. Deliberately isolated from
// gymSession/structKind/structForm/reflectOpen above - recovery and every
// other completionType keep calling beginStructuredOrReflectiveFlow
// untouched, this state machine is Movement's alone. `attempt` mirrors
// quest.activeAttempt (server/index.js's /api/quest/:id/attempt/* routes) -
// resumed directly from it on open/refresh, never reconstructed client-side.
// null when no Movement flow is active.
// { questId, quest, screen: "preview"|"prestart"|"active"|"review"|"evidence"|"submitted",
//   attempt, exitSheetOpen, whyOpen, reviewError, evidenceError, submittedResult, saving }
let movementFlow = null;
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
// Multi-Domain Quest Hub (design handoff, 19 Agustus) - same "separate flow,
// not reflectOpen" pattern as nutritionFlow/jobMatchFlow above. Purely a
// VIEW pointer, not a data cache - questHubFlowHTML always looks up the
// live quest fresh from appState.openQuests by questId every render, same
// "never cache, always re-derive from appState" convention used everywhere
// else in this file, so a save (which refreshes appState) is instantly
// reflected without questHubFlow needing to track the data itself.
// { questId, view: "hub"|"recovery"|"nutrition", draft, error, saving, completing }
let questHubFlow = null;
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
// Eleva Home redesign (design handoff, 15 Agustus): which of the up-to-3
// compact quest cards is selected - null defaults to index 0 at render
// time (same "?? 0" idiom as selectedPathwayIndex in Pilih Pathway) rather
// than writing a default into the var itself, so an unopened session isn't
// treated as if the user actually tapped card 1.
let selectedQuestIndex = null;
// Ephemeral, client-side-only CTA label state per quest id - resets on
// reload/refetch, since no started/completed status is persisted server-
// side (a quest is only ever "open" or "gone" once it has a reflection).
// This matches that even the design handoff's own interactive prototype
// only mocks this state client-side. "started" is a label only - the
// actual in-progress UI is still driven by the existing reflectOpen/
// reflectTarget vars (or one of the 4 special-flow vars) unchanged.
let questCtaState = new Map(); // id -> "started" | "completed"
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
let adaptivePhase = "card"; // "bridge" | "card" | "analysis" | "pathway" | "goals"
let adaptiveCards = []; // [{scenario, options:[{axis,text}], mostPreferred, leastPreferred}, ...] - length also serves as the card counter
let adaptiveScenario = null; // {scenario, options} for the card currently on screen
let adaptiveSelection = { mostPreferred: null, leastPreferred: null }; // in-progress picks for the current card
let chapterAnalysis = null; // {insight, pathway, subPathway, pathwayBlurb, secondaryTrait, significantShifts, lockTension, rawPathwayTop2}
let pathwayOptions = []; // 3 swipeable candidate cards, computed once when chapterAnalysis loads - see buildPathwayOptions
let selectedPathwayIndex = null;
// v13 goal capture - deliberately NOT an onboarding card: it's the bridge
// into First Trial, shown right after the Pathway is confirmed.
// Goal Setting redesign (round 33) - replaces the old goalInputs plain
// string array. One card per position; position 1 is fixed required/
// always-expanded, 2-3 optional/collapsible. Mirrors the design handoff's
// own data model ({id, position, text, required, status,
// validation_feedback, recommendations, approved_at, expanded}), camelCased
// to match this file's convention.
function freshGoalCard(position) {
  return {
    id: position, position, text: "", required: position === 1,
    status: "empty", // empty | draft | validating | needs_improvement | approved
    feedback: "", recommendations: [], approvedAt: null,
    expanded: position === 1,
  };
}
let goalCards = [freshGoalCard(1), freshGoalCard(2), freshGoalCard(3)];
let gantiConfirmOpen = false; // discard-confirm gate when leaving Goal Setting with an approved Goal 1
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
    err.data = data;
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
  goalCards = [freshGoalCard(1), freshGoalCard(2), freshGoalCard(3)];
  gantiConfirmOpen = false;
  pendingPathway = null;
  onboardError = "";
  openAxisInfo = null;
  lockExplainerShown = false;
  // Defensive - no current call site reaches resetOnboardState() mid-bridge,
  // but bumping bridgeGen here means any bridge instance somehow still in
  // flight (e.g. a stale promise from a torn-down session) can never mutate
  // the freshly-reset state below it.
  bridgeGen += 1;
  clearBridgeTimers();
  bridgeStageKey = null;
  bridgeErrorRetry = null;
}

// Bug fix: refreshing mid-onboarding always dropped the user back to "Siapa
// namamu?" - nothing about progress (name/radar/the up-to-6-card AI question
// loop/pathway/goals) persisted anywhere until POST /api/profile at the very
// end. Debounced save of everything needed to resume, POSTed to
// /api/onboarding/draft; GET /api/state hands it back (see boot()) whenever
// no profile exists yet. Fire-and-forget - a failed save just means the next
// refresh falls back to the last successfully saved point, never worse than
// today's "always restart" behavior.
let onboardingDraftSaveTimer = null;
// Debounced - fine for the frequent, non-critical saves fired from render()
// (typing, dragging, re-opening a help sheet).
function saveOnboardingDraft() {
  clearTimeout(onboardingDraftSaveTimer);
  onboardingDraftSaveTimer = setTimeout(saveOnboardingDraftNow, 500);
}
// Immediate - used at the specific moments a step/card is irreversibly
// completed (radar Continue, confirmCard) right before the client's own
// in-memory state is about to move on. A debounced save at those points can
// lose exactly the update that mattered if the user refreshes within the
// debounce window - confirmed by hand: refreshing ~300ms after confirming a
// card mid-flight re-asked the SAME card instead of resuming past it.
function saveOnboardingDraftNow() {
  clearTimeout(onboardingDraftSaveTimer);
  const draft = {
    onboardStep, onboardForm, adaptivePhase, adaptiveCards, adaptiveScenario, adaptiveSelection,
    chapterAnalysis, pathwayOptions, selectedPathwayIndex, pendingPathway, goalCards,
  };
  api("/api/onboarding/draft", { method: "POST", body: { draft } }).catch(() => {});
}

// Restores everything saveOnboardingDraft() persisted, then decides which
// screen to land on. onboardForm.radarRaw is only ever set the moment the
// radar step's Continue is clicked (see the "next" handler in
// renderOnboarding()) - its presence is what distinguishes "still on the
// static name/radar steps" from "radar is done, in the adaptive AI phase"
// without needing a separate resume-stage field.
//
// Round 23 fix: a saved "card" phase with a scenario present means the user
// was looking at an already-loaded question - restore it EXACTLY as shown
// (same question, same picks), no bridge, no re-fetch. Round 22 always
// re-fetched here, which both replayed the bridge animation unnecessarily
// AND could hand back a genuinely DIFFERENT question (generation isn't
// deterministic) - confusing and, worse, silently discarding whatever the
// user had already picked. Only fall back to beginScenarioBridge() (bridge +
// fresh fetch) when there's truly nothing to show - adaptiveScenario is
// null exactly when a fetch was still in flight at refresh time: either the
// very first card (radar Continue never sets it before the first success)
// or the gap right after confirmCard, which explicitly nulls it out (see
// that handler) for exactly this reason.
function restoreOnboardingDraft(draft) {
  resetOnboardState();
  onboardStep = draft.onboardStep || 0;
  if (draft.onboardForm) onboardForm = { ...onboardForm, ...draft.onboardForm };
  adaptiveCards = draft.adaptiveCards || [];
  chapterAnalysis = draft.chapterAnalysis || null;
  pathwayOptions = draft.pathwayOptions || [];
  selectedPathwayIndex = draft.selectedPathwayIndex ?? null;
  pendingPathway = draft.pendingPathway || null;
  // Restore defensively - patch onto a fresh shape rather than trusting the
  // stored blob blindly (same precedent as the chapterAnalysis shape-guard
  // below). A pre-redesign draft's old goalInputs shape fails the
  // Array.isArray check and falls through to fresh cards automatically.
  goalCards = Array.isArray(draft.goalCards) && draft.goalCards.length === 3
    ? draft.goalCards.map((c, i) => ({ ...freshGoalCard(i + 1), ...c }))
    : [freshGoalCard(1), freshGoalCard(2), freshGoalCard(3)];

  if (!onboardForm.radarRaw) {
    ui = { view: "onboarding" };
    return;
  }
  ui = { view: "adaptive" };
  // round 29: a chapterAnalysis blob saved by a pre-round-28 server lacks
  // insightRows/pattern (new fields, round 28) - restoring it straight into
  // the new "analysis" summary screen renders those two sections empty.
  // Same "validate stored shape before trusting it, re-fetch if stale"
  // precedent as the "card" branch's own beginScenarioBridge() fallback
  // right below - not a data migration (this app has never migrated old-
  // shape onboarding data, see LEGACY_STAT_LABELS/PRD.md's stale-shape
  // precedent), just don't trust an incomplete stored blob. "pathway"/
  // "goals" don't render insightRows/pattern, so no guard needed there.
  const hasFreshChapterAnalysis = (ca) => !!ca && Array.isArray(ca.insightRows) && ca.insightRows.length === 2 && !!ca.pattern?.title;
  if (draft.adaptivePhase === "analysis" && !hasFreshChapterAnalysis(chapterAnalysis)) {
    beginPathwayBridge(); // stale/incomplete chapterAnalysis - re-fetch fresh from the already-collected cards, shows the pathway bridge while it does
  } else if (["analysis", "pathway", "goals"].includes(draft.adaptivePhase)) {
    adaptivePhase = draft.adaptivePhase;
  } else if (draft.adaptivePhase === "card" && draft.adaptiveScenario) {
    adaptivePhase = "card";
    adaptiveScenario = draft.adaptiveScenario;
    adaptiveSelection = draft.adaptiveSelection || { mostPreferred: null, leastPreferred: null };
  } else {
    beginScenarioBridge();
  }
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
  if (appState.profile) {
    ui = { view: "dashboard" };
  } else if (appState.onboardingDraft) {
    restoreOnboardingDraft(appState.onboardingDraft);
  } else {
    ui = { view: "onboarding" };
  }
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

// Onboarding cinematic "bridge" screens - full-screen art shown during the
// adaptive AI-generation wait (in place of the old generic spinner), so a
// 3-5s delay reads as an intentional cinematic beat rather than a frozen
// app. Order: 1 Journey, 2 Quest, 3 Evidence, 4 Character, 5 Adaptive, 6
// META (all shown before a scenario card, one per card in sequence), 7
// Pathway (shown once, during chapter-analysis, leading to pathway
// selection rather than another question - see nextType below). Rendering/
// state-machine lives further down (runBridge() and friends), right after
// ONBOARD_STEPS.
const ONBOARDING_BRIDGE_BASE_PATH = "/onboarding/bridges/";
const ONBOARDING_BRIDGES = {
  intro: {
    order: 1,
    name: "Journey",
    image: "01-journey", // -> /onboarding/bridges/01-journey.webp
    audio: "/audio/onboarding/01-journey.mp3",
    headline: "Pertumbuhanmu adalah sebuah perjalanan.",
    voiceText: "Selamat datang di Eleva. Di sini, kamu tumbuh sambil jalan.",
    nextType: "personalized_question",
  },
  quest: {
    order: 2,
    name: "Quest — The Mission",
    image: "02-quest", // -> /onboarding/bridges/02-quest.webp
    audio: "/audio/onboarding/02-quest.mp3",
    headline: "Targetmu menjadi quest.",
    voiceText: "Targetmu kita ubah jadi quest, biar lebih enak dijalani.",
    nextType: "personalized_question",
  },
  evidence: {
    order: 3,
    name: "Evidence — The Proof",
    image: "03-evidence", // -> /onboarding/bridges/03-evidence.webp
    audio: "/audio/onboarding/03-evidence.mp3",
    headline: "Bukti nyata menggerakkan perjalananmu.",
    voiceText: "Bukan cuma checklist. Yang dihitung itu bukti nyata dari langkahmu.",
    nextType: "personalized_question",
  },
  character: {
    order: 4,
    name: "Character / Acting — The Becoming",
    image: "04-character", // -> /onboarding/bridges/04-character.webp
    audio: "/audio/onboarding/04-character.mp3",
    headline: "Karaktermu dibentuk oleh tindakan.",
    voiceText: "Kamu jadi versi baru bukan karena niat, tapi karena apa yang kamu lakukan.",
    nextType: "personalized_question",
  },
  adaptive: {
    order: 5,
    name: "Adaptive AI — The Guide",
    image: "05-adaptive", // -> /onboarding/bridges/05-adaptive.webp
    audio: "/audio/onboarding/05-adaptive.mp3",
    headline: "Quest berubah saat kamu berubah.",
    voiceText: "Kalau kondisi kamu berubah, langkah berikutnya ikut menyesuaikan.",
    nextType: "personalized_question",
  },
  meta: {
    order: 6,
    name: "META / World — The Expansion",
    image: "06-meta", // -> /onboarding/bridges/06-meta.webp
    audio: "/audio/onboarding/06-meta.mp3",
    headline: "Semua langkah membentuk duniamu.",
    voiceText: "Makin kamu jalan, makin banyak bagian Eleva yang kebuka.",
    nextType: "personalized_question",
    // Future parallax guidance only (NOT implemented yet) - preserve this
    // layer hierarchy when that pass happens: L1 stars/distant sky, L2
    // distant mountains/horizon, L3 golden central realm + blue/emerald
    // side realms, L4 fog/cloud atmosphere, L5 foreground traveler+platform.
  },
  // Final stage (7/7) - unlike stages 1-6, this does NOT lead to another
  // personalized question, hence nextType: "pathway_selection" (not
  // "personalized_question"). Its footer copy is also its own baked into
  // the artwork ("Membaca arah perjalananmu...", not "Menyiapkan
  // pertanyaan berikutnya...") - do not treat as interchangeable with the
  // other 6 stages' loading footer.
  pathway: {
    order: 7,
    name: "Pathway — The Route",
    image: "07-pathway", // -> /onboarding/bridges/07-pathway.webp
    audio: "/audio/onboarding/07-pathway.mp3",
    headline: "Cara bertumbuhmu membentuk pathway.",
    voiceText: "Setiap orang punya cara tumbuh yang beda. Itu yang jadi pathway-mu.",
    nextType: "pathway_selection",
  },
};

// Bridge state machine (round 19) - replaces the old generic spinner during
// the adaptive AI-generation wait. bridgeGen is a per-mount "instance
// token": every runBridge() call bumps it, and any earlier instance's
// pending .then() callbacks compare their captured gen against the current
// bridgeGen and no-op if they don't match - this is what stops a
// superseded bridge (e.g. one whose fetch is still resolving after a newer
// bridge has already taken over) from mutating state or double-firing.
// Mirrors the authTimers/clearAuthTimers idiom already proven in the auth
// zoom-gate flow, kept as a separate array since the two flows never run
// concurrently but sharing one array would be a latent bug waiting to happen.
let bridgeGen = 0;
let bridgeStageKey = null;
let bridgeTimers = [];
let bridgeErrorRetry = null;    // set only while the error overlay is showing
let bridgeDevPreviewIndex = 0;  // dev-preview only, see tryStartBridgeDevPreview
const bridgePreloadCache = new Set();
// Orders 1-6 - one bridge per scenario card, in sequence. Order 7 (pathway)
// isn't in this list: it's shown once, during chapter-analysis, not tied to
// a card index - see beginPathwayBridge.
const BRIDGE_LOADING_SEQUENCE = ["intro", "quest", "evidence", "character", "adaptive", "meta"];
const BRIDGE_PREVIEW_ORDER = [...BRIDGE_LOADING_SEQUENCE, "pathway"]; // all 7, dev preview only
const BRIDGE_MIN_DURATION_MS = 2300, BRIDGE_LONGWAIT_MS = 6000;
// Mirrors server/claude.js's SCENARIO_MAX_CARDS - once this many cards are
// answered, the server GUARANTEES confident:true on the next scenario-card
// call (a hard early-return there, no AI call needed) - see
// beginScenarioBridge()'s use of this below.
const SCENARIO_MAX_CARDS = 6;

// Bridge voice narration (round 25, "Phase 3") - short pre-generated clips
// per stage, played once when that stage's bridge appears. Static files
// only, no runtime TTS call ever - see ONBOARDING_BRIDGES[stage].audio and
// scripts/generate-onboarding-audio.js. onboardingVoiceEnabled is an
// internal flag only (no settings UI this phase) - flip to false to mute
// without touching the playback logic below.
let onboardingVoiceEnabled = true;
let bridgeAudioEl = null;          // single shared <audio>, lazily created, never mounted in the DOM
let bridgeAudioGen = 0;
let bridgeAudioStageKey = null;    // last stage that actually (re)started audio - the "did the stage change" gate
let bridgeAudioTimers = [];        // mirrors bridgeTimers, for the start-delay setTimeout
let bridgeAudioFadeToken = 0;      // cancels an in-flight fade rAF loop
const bridgeAudioPreloadCache = new Set();
const BRIDGE_AUDIO_START_DELAY_MS = 350, BRIDGE_AUDIO_FADE_MS = 200;

function clearBridgeTimers() {
  bridgeTimers.forEach(clearTimeout);
  bridgeTimers = [];
}

// Preload exactly the next stage in sequence, keyed off .order (not object-
// key iteration order) so it's correct regardless of literal key ordering
// in ONBOARDING_BRIDGES. At most 2 images resident at once this way (~250-
// 380KB compressed each) - no eager preload of all 7.
function preloadNextBridgeImage(stageKey) {
  const cfg = ONBOARDING_BRIDGES[stageKey];
  if (!cfg) return;
  const next = Object.values(ONBOARDING_BRIDGES).find((b) => b.order === cfg.order + 1);
  if (!next || bridgePreloadCache.has(next.image)) return;
  bridgePreloadCache.add(next.image);
  new Image().src = `${ONBOARDING_BRIDGE_BASE_PATH}${next.image}.webp`;
}

function clearBridgeAudioTimers() {
  bridgeAudioTimers.forEach(clearTimeout);
  bridgeAudioTimers = [];
}

// Lazily created, kept detached from the DOM on purpose - it doesn't need
// to be visible, so it's immune to renderBridge()'s root.innerHTML full
// replace (no reparenting trick needed, unlike e.g. auth2Flash).
function ensureBridgeAudioEl() {
  if (!bridgeAudioEl) {
    bridgeAudioEl = new Audio();
    bridgeAudioEl.preload = "auto";
    bridgeAudioEl.addEventListener("ended", () => setBridgeAudioIconPlaying(false));
  }
  return bridgeAudioEl;
}

// Toggles the pulsing wave-ring animation on the top-right speaker icon
// (round 26) - looked up fresh each call, not cached, since renderBridge()
// recreates the icon's DOM node on every mount.
function setBridgeAudioIconPlaying(isPlaying) {
  document.getElementById("bridgeAudioIcon")?.classList.toggle("bridge-audio-icon-playing", isPlaying);
}

// Round 26: temporary audible fallback while no real static mp3 files exist
// yet (public/audio/onboarding/ is empty - no TTS provider is configured,
// see scripts/generate-onboarding-audio.js). Speaks the SAME voiceText via
// the browser-native speechSynthesis API so testing/demoing isn't silent in
// the meantime. A dedicated function, not a reuse of speakScript() (Practice
// Test's own English-only, play-count-limited helper) - different language,
// different feature, out of scope to touch. Automatically superseded the
// moment real audio files exist - this only ever fires when the real
// <audio> element's load/play genuinely fails.
function speakBridgeVoiceFallback(text, gen) {
  if (!window.speechSynthesis || !text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "id-ID";
  // Round 38: without an explicit voice, each device picks its own default
  // Indonesian TTS voice - female on iOS ("Damayanti"), but male on some
  // other devices (founder-reported). There are no audio files in this repo
  // (public/audio/onboarding/ is empty, speechSynthesis IS the voice), so
  // the only lever is preferring a female Indonesian voice where the device
  // offers one - best-effort by nature, devices only expose what they have.
  try {
    const idVoices = window.speechSynthesis.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith("id"));
    const preferredVoice = idVoices.find((v) => /damayanti|female|wanita/i.test(v.name)) || idVoices[0];
    if (preferredVoice) utterance.voice = preferredVoice;
  } catch { /* voice preference is best-effort - never let it block the narration itself */ }
  utterance.onstart = () => { if (gen === bridgeAudioGen) setBridgeAudioIconPlaying(true); };
  utterance.onend = () => { if (gen === bridgeAudioGen) setBridgeAudioIconPlaying(false); };
  utterance.onerror = () => { if (gen === bridgeAudioGen) setBridgeAudioIconPlaying(false); };
  window.speechSynthesis.speak(utterance);
}

// Round 27: iOS Safari (and some other WebKit builds) silently drop
// speechSynthesis.speak() calls that aren't triggered directly,
// synchronously, inside a real user-gesture event handler - unlike
// <audio>.play(), which tolerates a short async gap after a gesture. Our
// real fallback call above happens deep inside an async chain (a fetch +
// a 350ms start delay), which fails that requirement on Safari - no
// error, no onstart, total silence (exactly what was reported: max
// volume, nothing heard, icon never animates because onstart never
// fires). Firing one throwaway, silent (volume 0) utterance synchronously
// from a real click handler satisfies WebKit's gesture requirement for
// the rest of the page session - documented WebKit workaround, not
// specific to this codebase. Module-level flag, never reset - this is a
// page-lifetime unlock, not an app/login-session concern.
let bridgeVoiceFallbackUnlocked = false;
function unlockBridgeVoiceFallback() {
  if (bridgeVoiceFallbackUnlocked || !window.speechSynthesis) return;
  bridgeVoiceFallbackUnlocked = true;
  const unlock = new SpeechSynthesisUtterance(" ");
  unlock.volume = 0;
  window.speechSynthesis.speak(unlock);
}

// Audio equivalent of preloadNextBridgeImage's new Image().src=... idiom.
// Unlike Image, a detached Audio() isn't reliably guaranteed to start
// fetching from just the .src assignment across browsers - .load() makes
// it explicit.
function warmBridgeAudio(url) {
  if (!url || bridgeAudioPreloadCache.has(url)) return;
  bridgeAudioPreloadCache.add(url);
  const a = new Audio();
  a.preload = "auto";
  a.src = url;
  a.load();
}

function preloadNextBridgeAudio(stageKey) {
  const cfg = ONBOARDING_BRIDGES[stageKey];
  if (!cfg) return;
  const next = Object.values(ONBOARDING_BRIDGES).find((b) => b.order === cfg.order + 1);
  if (next?.audio) warmBridgeAudio(next.audio);
}

// Stops whatever is currently playing. withFade=true prefers a short (~200ms)
// volume ramp over an abrupt cut when a clip is genuinely mid-playback;
// already-paused/-ended clips (or withFade=false) just hard-stop - no need
// to fade a clip that already finished naturally. Runs on its own
// rAF+token, deliberately NOT through the bridgeTimers/clearTimeout array
// (mixing interval/rAF ids through one clearer is fragile).
function stopBridgeAudio(withFade) {
  bridgeAudioFadeToken += 1;
  const token = bridgeAudioFadeToken;
  window.speechSynthesis?.cancel(); // abrupt cut, no fade support here - acceptable for the temporary fallback voice
  setBridgeAudioIconPlaying(false);
  const el = bridgeAudioEl;
  if (!el || el.paused || el.ended || !withFade) {
    if (el) { el.pause(); el.currentTime = 0; el.volume = 1; }
    return;
  }
  const start = performance.now();
  const from = el.volume;
  const step = (now) => {
    if (token !== bridgeAudioFadeToken) return; // superseded by a newer stop/start
    const t = Math.min(1, (now - start) / BRIDGE_AUDIO_FADE_MS);
    el.volume = from * (1 - t);
    if (t < 1) { requestAnimationFrame(step); return; }
    el.pause();
    el.currentTime = 0;
    el.volume = 1;
  };
  requestAnimationFrame(step);
}

// Entry point: "stage X is now the active bridge" - called from
// renderBridge() whenever bridgeStageKey actually changes (see the guard
// there). Fades out whatever the previous stage was playing, then starts
// this stage's clip after a short delay so it feels synced with the visual
// entrance rather than an instant jump-cut. Fails over to
// speakBridgeVoiceFallback() (round 26) on autoplay rejection OR a missing/
// broken asset - voice is an enhancement, never a dependency for onboarding
// to proceed, but "enhancement" no longer means "silence" now that a free
// fallback voice exists.
function startBridgeAudio(stageKey) {
  clearBridgeAudioTimers();
  stopBridgeAudio(true);
  bridgeAudioGen += 1;
  const gen = bridgeAudioGen;
  const cfg = ONBOARDING_BRIDGES[stageKey];
  if (!onboardingVoiceEnabled || !cfg?.audio) return;
  warmBridgeAudio(cfg.audio);
  bridgeAudioTimers.push(setTimeout(() => {
    if (gen !== bridgeAudioGen) return; // superseded before the delay elapsed
    // <audio>'s "error" event (load/decode failure, e.g. a 404) and
    // .play()'s promise rejection (autoplay policy, or NotSupportedError)
    // can both fire for the same failure, in either order - this guard
    // ensures the fallback voice only ever speaks once per attempt.
    let fallbackTried = false;
    const tryFallback = () => {
      if (fallbackTried || gen !== bridgeAudioGen) return;
      fallbackTried = true;
      speakBridgeVoiceFallback(cfg.voiceText, gen);
    };
    const el = ensureBridgeAudioEl();
    el.pause();
    el.currentTime = 0;
    el.volume = 1;
    el.onerror = tryFallback;
    el.src = cfg.audio;
    el.play().then(() => setBridgeAudioIconPlaying(true), tryFallback);
  }, BRIDGE_AUDIO_START_DELAY_MS));
}

// Not the generic ui.view==="error" dispatch (its retry calls the global
// boot(), which would restart the whole app) - this overlay's retry only
// re-invokes whichever fetch actually failed.
function showBridgeError(err, retryFn) {
  onboardError = err?.message || "Request gagal";
  bridgeErrorRetry = retryFn;
  render();
}

// Fades .bridge-root out (CSS transition, see .bridge-root.bridge-exit in
// styles.css) before handing off to the next screen, so the handoff never
// hard-cuts or flashes white.
function exitBridge(afterFn) {
  // The real cleanup point for most exits, not renderBridge()'s stage-change
  // guard alone: a non-confident scenario-card result or a chapter-analysis
  // success both hand off straight to a non-bridge screen (adaptivePhase
  // "card"/"analysis") and never call renderBridge() again for that
  // instance, so nothing else would ever stop the clip on those paths.
  stopBridgeAudio(true);
  const el = document.getElementById("bridgeRoot");
  if (!el) { afterFn(); return; }
  el.classList.remove("bridge-in");
  el.classList.add("bridge-exit");
  setTimeout(afterFn, 350); // matches .bridge-root.bridge-exit's CSS transition duration
}

// The core orchestrator: mounts a bridge stage, kicks off `work()`, and
// resolves onSuccess/onError only once BOTH the fetch has settled AND the
// minimum display duration has passed (whichever is later) - never forces
// a full 5s if content is ready sooner, never flashes if it's ready before
// the floor. `gen`/`settled` together guard against every race called out
// in the spec: a stale instance superseded mid-flight, the min-duration
// timer and the fetch resolving in either order for the SAME instance, and
// a rapid double-trigger only ever letting the first instance's outcome
// through (the second bumps bridgeGen, silently retiring the first).
function runBridge({ stageKey, work, onSuccess, onError }) {
  bridgeGen += 1;
  const gen = bridgeGen;
  clearBridgeTimers();
  bridgeStageKey = stageKey;
  bridgeErrorRetry = null;
  onboardError = "";
  adaptivePhase = "bridge";
  render();
  preloadNextBridgeImage(stageKey);
  preloadNextBridgeAudio(stageKey);

  const minDone = new Promise((resolve) => bridgeTimers.push(setTimeout(resolve, BRIDGE_MIN_DURATION_MS)));
  // Past ~6s: freeze at rest (the CSS transitions have already finished by
  // then anyway) rather than restart the push-in/fade cycle - .bridge-
  // longwait is a documented hook for this, no visual change today since
  // nothing is still animating at that point.
  bridgeTimers.push(setTimeout(() => {
    if (gen === bridgeGen) document.getElementById("bridgeRoot")?.classList.add("bridge-longwait");
  }, BRIDGE_LONGWAIT_MS));

  let settled = false;
  const finish = (fn) => {
    if (gen !== bridgeGen || settled) return;
    settled = true;
    clearBridgeTimers();
    fn();
  };
  const retry = () => runBridge({ stageKey, work, onSuccess, onError });

  Promise.resolve().then(work).then(
    (result) => minDone.then(() => finish(() => exitBridge(() => onSuccess(result)))),
    (err) => minDone.then(() => finish(() => showBridgeError(err, () => (onError ? onError(err, retry) : retry())))),
  );
}

function beginScenarioBridge() {
  // Founder-reported bug: after the 6th card, the "meta" loading-sequence
  // bridge flashed for ~1s before immediately swapping to "pathway" once
  // the (guaranteed-confident) fetch resolved - 2 visuals for what's really
  // one wait. The cap means the client already KNOWS this fetch can only
  // ever return confident:true, so skip the optimistic loading-sequence
  // stage entirely and go straight to pathway - also saves a wasted
  // scenario-card round trip (it would've returned confident with a null
  // scenario anyway).
  if (adaptiveCards.length >= SCENARIO_MAX_CARDS) { beginPathwayBridge(); return; }
  const stageKey = BRIDGE_LOADING_SEQUENCE[Math.min(adaptiveCards.length, BRIDGE_LOADING_SEQUENCE.length - 1)];
  runBridge({
    stageKey,
    work: requestScenarioCard,
    onSuccess: (result) => {
      if (result.confident) { beginPathwayBridge(); return; } // straight to the pathway bridge, no "card" flash - matches the old confident-skips-card behavior
      adaptiveScenario = { scenario: result.scenario, options: result.options };
      adaptiveSelection = { mostPreferred: null, leastPreferred: null };
      adaptivePhase = "card";
      render();
    },
  });
}

function beginPathwayBridge() {
  runBridge({
    stageKey: "pathway",
    work: requestChapterAnalysis,
    // Chapter-analysis failure re-asks scenario-card fresh (matches the
    // OLD inline catch-fallback exactly, app.js pre-round-19) rather than
    // blindly retrying chapter-analysis itself - re-fetching a scenario
    // card re-evaluates confidence server-side and can route straight
    // back here once satisfied, same as before.
    onError: () => beginScenarioBridge(),
    onSuccess: (analysis) => {
      chapterAnalysis = analysis;
      pathwayOptions = buildPathwayOptions(analysis);
      selectedPathwayIndex = null;
      adaptivePhase = "analysis";
      render();
    },
  });
}

function renderBridge() {
  const cfg = ONBOARDING_BRIDGES[bridgeStageKey];
  if (!cfg) return;
  // Guarded on the stage actually changing, not "renderBridge() ran again" -
  // runBridge()'s error path calls showBridgeError() -> render() ->
  // renderBridge() a SECOND time for the SAME bridgeStageKey (just to bolt
  // the .bridge-error overlay onto the same markup); without this guard a
  // scenario-card failure mid-narration would yank the clip back to 0:00
  // and restart it. Also what gives the dev preview voice for free - it
  // calls renderBridge() directly on every Prev/Next click, no separate
  // wiring needed there.
  if (bridgeStageKey !== bridgeAudioStageKey) {
    bridgeAudioStageKey = bridgeStageKey;
    startBridgeAudio(bridgeStageKey);
  }
  root.innerHTML = `
    <div class="bridge-root" id="bridgeRoot">
      <img class="bridge-img" src="${ONBOARDING_BRIDGE_BASE_PATH}${cfg.image}.webp" alt="${esc(cfg.headline)}" />
      <div class="bridge-overlay"></div>
      <div class="bridge-audio-icon" id="bridgeAudioIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M4 9v6h4l5 4V5L8 9H4z" fill="#f1eee8" />
          <path class="bridge-audio-wave bridge-audio-wave-1" d="M16 8.5c1.2 1 2 2.4 2 3.5s-.8 2.5-2 3.5" stroke="#f1eee8" stroke-width="1.6" stroke-linecap="round" fill="none" />
          <path class="bridge-audio-wave bridge-audio-wave-2" d="M18.5 6c2 1.7 3.3 4 3.3 6s-1.3 4.3-3.3 6" stroke="#f1eee8" stroke-width="1.6" stroke-linecap="round" fill="none" />
        </svg>
      </div>
      ${bridgeErrorRetry ? `
      <div class="bridge-error">
        <p class="bridge-error-title">Belum berhasil menyiapkan langkah berikutnya.</p>
        <p class="bridge-error-sub">Coba lagi sebentar.</p>
        <button class="btn-primary" id="bridgeRetry">Coba lagi</button>
      </div>` : ""}
    </div>`;
  document.getElementById("bridgeRetry")?.addEventListener("click", () => {
    const retryFn = bridgeErrorRetry;
    bridgeErrorRetry = null;
    retryFn?.();
  });
  // requestAnimationFrame so .bridge-in is added on the frame AFTER the
  // markup (with opacity:0 baseline) has painted - CSS transitions don't
  // fire if their target class is already present at first paint, same
  // reason the auth zoom-gate toggles .visible/.zooming a beat after mount.
  requestAnimationFrame(() => document.getElementById("bridgeRoot")?.classList.add("bridge-in"));
}

// Just 2 static steps now - Situasi/Values/Fear and Growth Focus (v2) are both
// gone, folded into the adaptive conversation and the radar chart itself.
// Growth Focus Radar handoff (v5) and the "Eleva Onboarding Name" handoff:
// both steps' copy is hardcoded directly in renderOnboarding (needs
// explicit <br/> line breaks, not just an escaped string) - q/sub fields
// here would be dead weight.
const ONBOARD_STEPS = [
  { type: "namePromise" },
  { type: "radar" },
];

function isStepValid(step) {
  const s = ONBOARD_STEPS[step];
  // Growth Focus Radar handoff: "Continue button: Disabled... until at
  // least 1 axis is locked" - the screen's whole purpose is picking and
  // locking priorities before moving on.
  if (s.type === "radar") return onboardForm.locked.length >= 1;
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

// Read-only before/after comparison for the Chapter Analysis summary screen
// (v7 PRD requirement, re-skinned round 28 to the design handoff's exact
// geometry/colors). Two outlines overlaid on one chart (raw = dashed/muted,
// calibrated = solid/gold-glow) - no handles, no drag, purely a picture.
// Deliberately its OWN local geometry constants below, NOT
// POLY_CENTER/POLY_MAXR/etc - those are the INTERACTIVE radar's tuned pixel
// budget for lock-button/handle hit targets and must not move; this chart
// has no touch targets at all. Emits its own .chapter-radar-* classes, NOT
// .poly-ring/.poly-axis/.poly-label (styles.css's own comment on those three
// says they're shared chrome with the interactive radar - reusing them here
// with different colors/ring-count would silently reskin that screen too).
// round 30: CH_MAXR/CH_LABELR/CH_VBH/CH_CY rescaled so the heptagon fills
// the SAME FRACTION of this viewBox's width as the interactive radar's
// heptagon fills of ITS viewBox (POLY_MAXR/POLY_VIEW_SIZE=144/420=68.6%) -
// matching just the outer SVG's rendered width (round 29's fix) was not
// enough, since the two viewBoxes have different aspect ratios. CH_LABELR
// keeps a 8-unit gap past CH_MAXR (founder ask: cut the old 24-unit gap to
// 1/3). CH_VBH/CH_CY grew to keep the now-larger heptagon's axis labels
// (esp. the 2-line "Emotional Stability") from clipping top/bottom.
const CH_VB = 380, CH_VBH = 304, CH_CX = 190, CH_CY = 152, CH_MAXR = 130.3, CH_LABELR = 131;
const CH_RING_FRACS = [0.2, 0.4, 0.6, 0.8, 1.0];
function chapterRadius(value) {
  const v = Math.max(0, Math.min(10, Number(value) || 0));
  return (v / 10) * CH_MAXR;
}
function chapterPoint(index, value) {
  const angle = ((-90 + index * POLY_STEP_DEG) * Math.PI) / 180; // POLY_STEP_DEG is a pure 360/7 constant, safe to share
  const r = chapterRadius(value);
  return [CH_CX + r * Math.cos(angle), CH_CY + r * Math.sin(angle)];
}
function renderRadarComparisonSVG(radarRaw, radarCalibrated) {
  const pathFrom = (pts) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + "Z";

  const rings = CH_RING_FRACS.map((f) => {
    const pts = POLY_ORDER.map((_, i) => chapterPoint(i, f * 10));
    return `<path d="${pathFrom(pts)}" class="chapter-radar-ring${f === 1 ? " outer" : ""}" />`;
  }).join("");
  const spokes = POLY_ORDER.map((_, i) => {
    const [x, y] = chapterPoint(i, 10);
    return `<line x1="${CH_CX}" y1="${CH_CY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="chapter-radar-axis" />`;
  }).join("");
  // Scale marks 0/2/4/6/8/10 along the top (Body, index 0) spoke only.
  const scaleNums = [0, 2, 4, 6, 8, 10].map((v) => {
    const y = CH_CY - chapterRadius(v);
    return `<text x="${CH_CX + 4}" y="${(y + 2.5).toFixed(1)}" class="chapter-radar-scale-num">${v}</text>`;
  }).join("");

  const beforePts = POLY_ORDER.map((k, i) => chapterPoint(i, radarRaw[k]));
  const afterPts = POLY_ORDER.map((k, i) => chapterPoint(i, radarCalibrated[k]));
  // round 30: dot radii rescaled to match .poly-dot(r=13.5)/.poly-value(9.5px)
  // in real onscreen pixels, using the same CH_VB/POLY_VIEW_SIZE=380/420
  // scale factor as the geometry rescale above. beforeDots wasn't directly
  // asked about, but rescaled to preserve its original 2.6:3 ratio to
  // afterDots (10.6:12.2) - leaving it at 2.6 next to a 12.2-radius
  // afterDot would look broken, not proportionate.
  const beforeDots = beforePts.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.1" class="chapter-radar-before-dot" />`).join("");
  const afterDots = afterPts.map(([x, y], i) => {
    const k = POLY_ORDER[i];
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12.2" class="chapter-radar-after-dot" />
      <text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" class="chapter-radar-after-value" text-anchor="middle">${formatRadarValue(radarCalibrated[k])}</text>`;
  }).join("");

  // Axis labels at CH_LABELR - same "is this axis on the left/right/center"
  // anchor-flip idea axisLabelLayout() (line ~1697) already uses for the
  // interactive radar, here directly from the point's own x-offset sign.
  // Emotional Stability gets the same 2-line wrap axisLabelLayout() does.
  const labels = POLY_ORDER.map((k, i) => {
    const angle = ((-90 + i * POLY_STEP_DEG) * Math.PI) / 180;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const x = CH_CX + CH_LABELR * dx, y = CH_CY + CH_LABELR * dy;
    const anchor = dx > 0.2 ? "start" : dx < -0.2 ? "end" : "middle";
    const label = statLabel(k);
    const lines = label.includes(" ") ? label.split(" ") : [label];
    const tspans = lines.map((line, li) => `<tspan x="${x.toFixed(1)}" dy="${li === 0 ? 0 : 11}">${esc(line)}</tspan>`).join("");
    return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" class="chapter-radar-label" text-anchor="${anchor}">${tspans}</text>`;
  }).join("");

  return `<svg viewBox="0 0 ${CH_VB} ${CH_VBH}" class="chapter-radar-svg" id="polyCompareSvg">
    ${rings}${spokes}${scaleNums}
    <path d="${pathFrom(beforePts)}" class="chapter-radar-before" id="polyShapeRaw" />${beforeDots}
    <path d="${pathFrom(afterPts)}" class="chapter-radar-after" id="polyShapeCalibrated" />${afterDots}
    ${labels}
  </svg>
  <div class="chapter-legend">
    <span class="chapter-legend-item"><span class="chapter-legend-line solid"></span>Setelah Kalibrasi</span>
    <span class="chapter-legend-item"><span class="chapter-legend-line dashed"></span>Sebelum Kalibrasi</span>
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
  saveOnboardingDraft();

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
  document.getElementById("back")?.addEventListener("click", () => { onboardStep = Math.max(0, onboardStep - 1); renderOnboarding(); });
  document.getElementById("next").addEventListener("click", () => {
    if (!isStepValid(onboardStep)) return;
    if (!last) { onboardStep++; renderOnboarding(); return; }
    // Round 27: unlock the speechSynthesis fallback voice HERE, synchronously
    // inside this real click - the earliest point a bridge can appear. See
    // unlockBridgeVoiceFallback()'s own comment for why this must happen
    // synchronously in a gesture handler, not anywhere in the async chain
    // beginScenarioBridge() kicks off below.
    unlockBridgeVoiceFallback();
    // Static steps done - freeze the pre-calibration radar for audit, then
    // hand off to the adaptive AI-driven phase. beginScenarioBridge() sets
    // adaptivePhase="bridge" and renders itself, no separate render() call
    // needed here first.
    onboardForm.radarRaw = { ...onboardForm.radar };
    adaptiveCards = [];
    ui = { view: "adaptive" };
    saveOnboardingDraftNow();
    beginScenarioBridge();
  });
}

// Pure fetch, no state/render side effects - orchestrated by
// beginScenarioBridge() (see the bridge state machine near
// ONBOARDING_BRIDGES) which owns the "bridge -> card | next bridge" state
// transitions instead. Server decides when the choice pattern is consistent
// enough AND every unlocked axis has been tested at least once (min 2, max
// 6 - enforced server-side, not just requested here) - confident:true means
// the caller should move straight to Chapter Analysis instead of showing
// another card.
async function requestScenarioCard() {
  return api("/api/onboarding/scenario-card", {
    method: "POST",
    body: {
      profile: { name: onboardForm.name },
      radarSnapshot: onboardForm.radar,
      lockedAxes: onboardForm.locked,
      previousCards: adaptiveCards,
    },
  });
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

// 3-segment progress bar for the post-adaptive-cards trio of screens
// (chapter-analysis summary -> pathway carousel -> goal capture) -
// deliberately its OWN array, not ONBOARD_STEPS (that's the earlier
// name/radar pair, a different, earlier part of the flow with its own
// 2-segment step-dots). Reuses the same bare .step-dots/.dot-seg classes,
// which are already just "N boxes, i<=index active" with no assumption
// baked in about which screens they belong to.
const CHAPTER_FLOW_PHASES = ["analysis", "pathway", "goals"];
function chapterProgressHTML(phase) {
  const idx = CHAPTER_FLOW_PHASES.indexOf(phase);
  return `<div class="step-dots">${CHAPTER_FLOW_PHASES.map((_, i) => `<div class="dot-seg ${i <= idx ? "active" : ""}"></div>`).join("")}</div>`;
}

// Pure fetch, no state/render side effects - orchestrated by
// beginPathwayBridge() (see the bridge state machine near
// ONBOARDING_BRIDGES), which shows the "pathway" bridge stage while this
// resolves, then applies the result on success or falls back to
// beginScenarioBridge() on failure (matching this function's old inline
// catch-fallback exactly, just moved to the orchestration layer).
async function requestChapterAnalysis() {
  return api("/api/onboarding/chapter-analysis", {
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
  if (adaptivePhase === "bridge") { renderBridge(); return; }
  saveOnboardingDraft();

  if (adaptivePhase === "card") {
    const sel = adaptiveSelection;
    const bothPicked = sel.mostPreferred && sel.leastPreferred;
    const instruction = !sel.mostPreferred
      ? "Tap opsi yang paling kamu suka."
      : !sel.leastPreferred
        ? "Sekarang tap satu dari sisanya yang paling nggak sesuai sama kamu."
        : "Siap lanjut, atau tap ulang buat ganti pilihan.";
    // adaptiveScenario is always populated here now (round 19) - the only
    // path into this phase is beginScenarioBridge()'s onSuccess, which sets
    // it right before adaptivePhase="card"; fetch failures surface through
    // the bridge's own error overlay instead, never by landing here with a
    // null scenario. onboardError still shown below, but now only for the
    // applyCalibrationCard try/catch further down, not a fetch failure.
    //
    // Round 20 (founder correction): this - not a 3rd static onboarding
    // step - is what the "Eleva Onboarding Question Card" handoff's visual
    // language (round 18) was actually meant for. Re-skinned with
    // .shell-qcard/.qcard-* (same fixed/no-scroll shell + ornamented
    // question card + check/minus answer states as round 18's build) wired
    // to this screen's OWN real data (adaptiveScenario/adaptiveSelection,
    // axis-keyed) instead of a fixed mock scenario. No behavior change -
    // same instruction copy, same axis-keyed tap state machine, same
    // confirmCard handler below - presentation only. No step-dots (the
    // real AI question count is a variable 2-6, not a fixed step count),
    // and no Kembali (no "back" concept mid-AI-loop) - single right-
    // aligned Lanjut instead.
    root.innerHTML = `
      <div class="shell shell-qcard">
        <div class="radar-header-row">
          <div class="eyebrow mono radar-header-eyebrow">ELEVA · ONBOARDING</div>
          <div class="qcard-header-right">
            <div class="qcard-count mono">KARTU KE-${adaptiveCards.length + 1}</div>
            <button class="radar-help-btn" data-help="card" aria-label="Bantuan layar ini">?</button>
          </div>
        </div>
        ${helpSheetHTML("card")}
        ${onboardError ? `<p style="color:var(--rust);font-size:13.5px;margin:0 0 16px">${esc(onboardError)}</p>` : ""}
        <div class="fadeUp">
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
            <p class="qcard-question">${esc(adaptiveScenario.scenario)}</p>
          </div>
          <p class="qcard-instruction">${esc(instruction)}</p>
          <div class="qcard-answers">
            ${adaptiveScenario.options.map((opt) => {
              const isFav = sel.mostPreferred === opt.axis;
              const isLeast = sel.leastPreferred === opt.axis;
              const cls = isFav ? "positive" : isLeast ? "negative" : "";
              const icon = isFav
                ? `<svg width="24" height="24" viewBox="0 0 24 24" class="qcard-answer-icon" fill="none"><circle cx="12" cy="12" r="10" stroke="#6fd39a" stroke-width="1.4" /><path d="M7.5 12.5L10.3 15.3L16.5 8.5" stroke="#6fd39a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>`
                : isLeast
                  ? `<svg width="24" height="24" viewBox="0 0 24 24" class="qcard-answer-icon" fill="none"><circle cx="12" cy="12" r="10" stroke="#d97a7a" stroke-width="1.4" /><path d="M7.5 12H16.5" stroke="#d97a7a" stroke-width="1.6" stroke-linecap="round" /></svg>`
                  : "";
              return `<button class="qcard-answer ${cls}" data-axis="${opt.axis}">
                <p class="qcard-answer-text">${esc(opt.text)}</p>
                ${icon}
              </button>`;
            }).join("")}
          </div>
        </div>
        <div class="onboard-nav-row" style="justify-content:flex-end">
          <button class="btn-primary" id="confirmCard" ${bothPicked ? "" : "disabled"}>Lanjut →</button>
        </div>
      </div>`;
    document.querySelectorAll(".qcard-answer").forEach((btn) => {
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
    document.getElementById("confirmCard")?.addEventListener("click", () => {
      unlockBridgeVoiceFallback(); // round 27 - defensive redundancy, idempotent (see the radar "next" handler's own call)
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
      // Round 23: null the just-answered scenario/picks out BEFORE the
      // checkpoint save below - without this, a refresh during the
      // between-cards fetch would restore straight back into the card just
      // confirmed (picks and all), letting the user hit "Lanjut" a second
      // time and double-push it into adaptiveCards. Nulling it makes that
      // window correctly fall into restoreOnboardingDraft()'s "nothing to
      // show yet, re-fetch" branch instead.
      adaptiveScenario = null;
      adaptiveSelection = { mostPreferred: null, leastPreferred: null };
      // beginScenarioBridge re-evaluates choice-pattern consistency AND axis
      // coverage with the updated card list (via requestScenarioCard), and
      // internally redirects to the pathway bridge once satisfied (min
      // 2/max 6, full unlocked-axis coverage - all enforced server-side) -
      // no fixed-count loop needed here. Sets adaptivePhase="bridge" and
      // renders itself.
      saveOnboardingDraftNow();
      beginScenarioBridge();
    });
    return;
  }

  // Chapter Analysis summary (round 28 design handoff redesign): before/
  // after radar + change-summary line + lock-tension note + 2 insightRows +
  // highlighted pattern card + CTA. Pulled apart from the old combined
  // analysis+carousel screen (see the "pathway" phase right below) - this
  // screen's own CTA just flips adaptivePhase, no new fetch. insight/
  // secondaryTrait are still sent at submit time (submitOnboarding) but no
  // longer displayed here, replaced visually by insightRows/pattern.
  if (adaptivePhase === "analysis") {
    const flaggedLock = chapterAnalysis?.lockTension || [];
    const shifts = chapterAnalysis?.significantShifts || [];
    const shiftLine = shifts.map((s) => {
      const positive = s.to > s.from;
      return `${esc(statLabel(s.axis))} ${s.from} <span class="chapter-shift-arrow">→</span> <span class="chapter-shift-to ${positive ? "positive" : "negative"}">${s.to}</span>`;
    }).join(' <span class="chapter-shift-sep">|</span> ');
    const icons = {
      spark: `<svg viewBox="0 0 24 24" fill="none"><path d="M13 2L5 13h5l-1 9 8-11h-5l1-9z" stroke="#e5aa50" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
      target: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="#e5aa50" stroke-width="1.5"/><circle cx="12" cy="12" r="3.4" stroke="#e5aa50" stroke-width="1.5"/><circle cx="12" cy="12" r="0.6" fill="#e5aa50"/></svg>`,
      compass: `<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" stroke="#e5aa50" stroke-width="1.5"/><circle cx="24" cy="24" r="14.5" stroke="rgba(229,170,80,.4)" stroke-width="1"/><path d="M24 6l3 5-3 2-3-2 3-5zM24 42l3-5-3-2-3 2 3 5zM6 24l5-3 2 3-2 3-5-3zM42 24l-5-3-2 3 2 3 5-3z" fill="#e5aa50" opacity=".35"/><path d="M24 12l3.5 8.5L36 24l-8.5 3.5L24 36l-3.5-8.5L12 24l8.5-3.5L24 12z" fill="#f0c274"/><circle cx="24" cy="24" r="2.2" fill="#1a1409"/></svg>`,
    };
    const rows = chapterAnalysis?.insightRows || [];
    root.innerHTML = `
      <div class="shell shell-chapter">
        <div class="radar-header-row">
          <div class="eyebrow mono radar-header-eyebrow">ELEVA · CHAPTER ANALYSIS</div>
          ${chapterInfoBtnHTML("analysis")}
        </div>
        ${chapterProgressHTML("analysis")}
        ${helpSheetHTML("analysis")}
        <div class="fadeUp">
          <h1 class="fr chapter-headline">Ada pola yang mulai kelihatan.</h1>
          <p class="chapter-subcopy">Dari jawabanmu, Eleva melihat beberapa hal yang menonjol.</p>
          <div class="chapter-radar-wrap">${renderRadarComparisonSVG(onboardForm.radarRaw || onboardForm.radar, onboardForm.radar)}</div>
          ${shifts.length ? `<p class="chapter-shift-line">${shiftLine}</p>` : ""}
          ${flaggedLock.length ? `
          <p class="chapter-lock-tension">Ketegangan kunci: pilihan-pilihanmu di kartu beberapa kali condong berlawanan dari sumbu yang kamu kunci (${flaggedLock.map((a) => esc(statLabel(a))).join(", ")}) — angkanya tetap seperti kamu kunci, tapi layak dipikir ulang kalau mau.</p>` : ""}
          <div class="chapter-section-label fr">Yang Eleva lihat</div>
          <div class="chapter-insight-rows">
            ${rows.map((r, i) => `
            <div class="chapter-insight-row">
              <div class="chapter-insight-icon">${i === 0 ? icons.spark : icons.target}</div>
              <p class="chapter-insight-text">${esc(r)}</p>
            </div>`).join("")}
          </div>
          <div class="chapter-section-label fr">Pola yang terlihat</div>
          <div class="chapter-trait-card">
            <div class="chapter-trait-icon">${icons.compass}</div>
            <div class="chapter-trait-text">
              <div class="chapter-trait-title fr">${esc(chapterAnalysis?.pattern?.title || "")}</div>
              <p class="chapter-trait-desc">${esc(chapterAnalysis?.pattern?.description || "")}</p>
            </div>
          </div>
          <p class="chapter-disclaimer">Ini label sementara - ini pola yang Eleva lihat dari pilihanmu.</p>
        </div>
        <button class="chapter-cta" id="toPathway">Lihat Pathway-ku →</button>
      </div>`;
    document.getElementById("toPathway")?.addEventListener("click", () => { adaptivePhase = "pathway"; renderAdaptive(); });
    return;
  }

  // "Pilih Pathway" screen (round 32 handoff): static 3-card row, tap
  // SELECTS a card (glow/DIPILIH tag + reasoning panel update) but does NOT
  // navigate - a separate CTA pinned to the bottom confirms and advances to
  // Goal Capture. Replaces the round-28 tarot carousel, where tapping a
  // card immediately confirmed it. Rank labels ("REKOMENDASI UTAMA" for
  // card 1, "ALTERNATIF" for cards 2-3) are fixed to card position and
  // never change with selection - only the glow/tag/reasoning panel react
  // to which card is currently selected. The free-text override entry
  // stays on the Goal Capture screen (founder decision, 10 Agustus,
  // unchanged by this redesign).
  if (adaptivePhase === "pathway") {
    const activeIdx = selectedPathwayIndex ?? 0; // default: card 1, matches the handoff's "default selected on load" - read at render time so an untapped screen doesn't pollute the saved draft with a selection the user never made
    const activeOpt = pathwayOptions[activeIdx];
    const activeColor = PPICK_COLOR[activeOpt.pathway] || PPICK_COLOR.Pilgrim;
    root.innerHTML = `
      <div class="shell shell-chapter">
        <div class="radar-header-row">
          <div class="eyebrow mono radar-header-eyebrow">ELEVA · PATHWAY</div>
          ${chapterInfoBtnHTML("pathway")}
        </div>
        ${chapterProgressHTML("pathway")}
        ${helpSheetHTML("pathway")}
        <div class="fadeUp">
          <div class="ppick-headline fr">Tiga jalan yang paling cocok mulai terlihat.</div>
          <p class="ppick-subcopy">Pathway adalah caramu menjalani quest — bukan tujuanmu. Tap satu kartu untuk lihat kenapa Eleva merekomendasikannya.</p>
          <div class="ppick-cards">
            ${pathwayOptions.map((opt, i) => {
              const isSel = i === activeIdx;
              const isMain = i === 0;
              const color = PPICK_COLOR[opt.pathway] || PPICK_COLOR.Pilgrim;
              return `
              <div class="ppick-col" data-idx="${i}">
                <div class="ppick-rank-row">
                  <span class="ppick-rank-label" style="color:${isMain ? "#e5aa50" : "#8a93b8"}">${isMain ? "REKOMENDASI UTAMA" : "ALTERNATIF"}</span>
                  <span class="ppick-rank-arrow" style="color:${isMain ? "#e5aa50" : "#8a93b8"}">▾</span>
                </div>
                <div class="ppick-card" style="${isSel ? `border-color:${color};box-shadow:0 0 16px ${color}66, 0 0 0 1px ${color}33 inset;` : ""}">
                  ${isSel ? `<span class="ppick-dipilih" style="background:${color}">DIPILIH</span>` : ""}
                  <div class="ppick-art" style="background:radial-gradient(circle at 30% 30%, ${color}33, transparent 60%), radial-gradient(circle at 70% 75%, ${color}1a, transparent 55%), #0a0a0d">
                    <div class="ppick-art-name">${esc(opt.pathway)}</div>
                    <div class="ppick-art-noun">${esc(opt.pathwayNoun)}</div>
                  </div>
                </div>
              </div>`;
            }).join("")}
          </div>
          <div class="ppick-reason" style="border-color:${activeColor}55">
            <div class="ppick-reason-header">
              <span class="ppick-reason-icon">${pathwaySigilSVG(activeColor, 30)}</span>
              <div>
                <div class="ppick-reason-pathway" style="color:${activeColor}">${esc(activeOpt.pathway.toUpperCase())}: ${esc(activeOpt.pathwayNoun)}</div>
                <div class="ppick-reason-title fr">Kenapa Eleva merekomendasikan ini</div>
              </div>
            </div>
            ${(PATHWAY_REASONS[activeOpt.pathway] || []).map((r) => `
              <div class="ppick-reason-row">
                <span class="ppick-reason-bullet" style="color:${activeColor}">◆</span>
                <span class="ppick-reason-text">${esc(r)}</span>
              </div>`).join("")}
          </div>
        </div>
        <button class="chapter-cta" id="confirmPathway">Lanjut dengan ${esc(activeOpt.pathway)} →</button>
      </div>`;
    document.querySelectorAll(".ppick-col").forEach((col) => {
      col.addEventListener("click", () => {
        selectedPathwayIndex = Number(col.dataset.idx);
        saveOnboardingDraft();
        renderAdaptive();
      });
    });
    document.getElementById("confirmPathway").addEventListener("click", () => {
      const chosen = pathwayOptions[selectedPathwayIndex ?? 0];
      pendingPathway = { pathway: chosen.pathway, pathwayNoun: chosen.pathwayNoun };
      adaptivePhase = "goals";
      saveOnboardingDraftNow();
      renderAdaptive();
    });
    return;
  }

  if (adaptivePhase === "goals") {
    const pw = pendingPathway?.pathway || "";
    const noun = pendingPathway?.pathwayNoun || "";
    const goal1Approved = goalCards[0].status === "approved";
    root.innerHTML = `
      <div class="shell shell-chapter">
        <div class="radar-header-row">
          <div class="eyebrow mono radar-header-eyebrow">ELEVA · SET YOUR GOAL</div>
          ${helpBtnHTML("goals")}
        </div>
        ${chapterProgressHTML("goals")}
        ${helpSheetHTML("goals")}
        <div class="fadeUp">
          ${pathwayHeaderHTML(pw, noun)}
          ${actingMethodCardHTML(pw)}
          <div class="gset-intro-row"><span>✨</span><span class="gset-intro-label">TENTUKAN GOAL-MU</span></div>
          <p class="gset-intro-copy">Tulis goal yang ingin kamu capai selama 1 tahun ke depan. Eleva akan memeriksa dan memastikan goal-mu jelas, terukur, realistis, dan bisa dicapai manusia normal dalam maksimal 1 tahun.</p>
          <div class="gset-cards">${goalCards.map((c, i) => goalCardHTML(c, i)).join("")}</div>
          <span class="gset-ganti-link" id="gantiPathway">← Ganti Pathway</span>
        </div>
        <button class="btn-primary full gset-cta" id="startFirstTrial" ${goal1Approved ? "" : "disabled"}>⚑ Mulai First Trial (14 hari)</button>
      </div>
      ${gantiConfirmOpen ? `
      <div class="help-overlay" id="gantiConfirmOverlay">
        <div class="help-sheet fadeUp">
          <p>Goal utamamu sudah disetujui. Ganti Pathway akan menghapus goal ini dan mulai ulang. Lanjut?</p>
          <div style="display:flex;gap:10px">
            <button class="btn-ghost" id="gantiConfirmCancel" style="flex:1">Batal</button>
            <button class="btn-primary" id="gantiConfirmOk" style="flex:1">Ya, ganti Pathway</button>
          </div>
        </div>
      </div>` : ""}`;
    wireGoalSettingHandlers();
  }
}

// Goal Setting screen (round 33 handoff) - event wiring, discard-and-back,
// and the AI validation call. Split out from renderAdaptive() itself since
// it's a substantial, self-contained chunk (mirrors how other adaptive
// sub-screens keep their own local helpers nearby rather than inline).
function wireGoalSettingHandlers() {
  document.querySelectorAll("[data-goal-head]").forEach((el) => {
    el.addEventListener("click", () => {
      const i = Number(el.dataset.goalHead);
      if (goalCards[i].required) return;
      goalCards[i].expanded = !goalCards[i].expanded;
      renderAdaptive();
    });
  });
  document.querySelectorAll("[data-goal-text]").forEach((ta) => {
    ta.addEventListener("focus", () => {
      // iOS keyboard covers the bottom of the (deliberately non-shrinking,
      // see vhFrozenForKeyboard) fixed shell without scrolling .fadeUp's own
      // internal scroll region to follow the focused field - the delay lets
      // the keyboard animation settle first. block:"start" targets the top
      // of the scroll container, guaranteed above the keyboard; "center"
      // could land under it now that the shell keeps its full height.
      setTimeout(() => ta.scrollIntoView({ block: "start", behavior: "smooth" }), 300);
    });
    ta.addEventListener("input", (e) => {
      const i = Number(ta.dataset.goalText);
      const card = goalCards[i];
      const hadText = !!card.text;
      card.text = e.target.value;
      card.status = card.text.trim() ? "draft" : "empty";
      if (!!card.text !== hadText) { renderAdaptive(); return; } // clear button appears/disappears - needs a real render
      const box = ta.closest(".gset-input-box");
      box.querySelector(".gset-char-count").textContent = `${card.text.length}/200`;
      box.querySelector("[data-goal-set]").disabled = !card.text.trim();
      saveOnboardingDraft();
    });
  });
  document.querySelectorAll("[data-goal-clear]").forEach((btn) => btn.addEventListener("click", () => {
    const i = Number(btn.dataset.goalClear);
    goalCards[i].text = "";
    goalCards[i].status = "empty";
    saveOnboardingDraft();
    renderAdaptive();
  }));
  document.querySelectorAll("[data-goal-set]").forEach((btn) => btn.addEventListener("click", () => submitGoalForValidation(Number(btn.dataset.goalSet))));
  document.querySelectorAll("[data-goal-edit]").forEach((btn) => btn.addEventListener("click", () => {
    const i = Number(btn.dataset.goalEdit);
    goalCards[i].status = "draft"; // keeps text, invalidates approval
    goalCards[i].approvedAt = null;
    saveOnboardingDraftNow();
    renderAdaptive();
  }));
  document.querySelectorAll("[data-goal-pick]").forEach((btn) => btn.addEventListener("click", () => {
    const i = Number(btn.dataset.goalPick);
    const ri = Number(btn.dataset.recoIdx);
    const card = goalCards[i];
    card.text = card.recommendations[ri];
    card.status = "approved";
    card.approvedAt = new Date().toISOString();
    card.feedback = "";
    card.recommendations = [];
    saveOnboardingDraftNow();
    renderAdaptive();
  }));
  document.querySelectorAll("[data-goal-own]").forEach((btn) => btn.addEventListener("click", () => {
    const i = Number(btn.dataset.goalOwn);
    goalCards[i].status = "draft";
    goalCards[i].feedback = "";
    goalCards[i].recommendations = [];
    saveOnboardingDraft();
    renderAdaptive();
  }));
  document.getElementById("gantiPathway")?.addEventListener("click", () => {
    if (goalCards[0].status === "approved") { gantiConfirmOpen = true; renderAdaptive(); return; }
    discardAndBackToPathway();
  });
  document.getElementById("gantiConfirmCancel")?.addEventListener("click", () => { gantiConfirmOpen = false; renderAdaptive(); });
  document.getElementById("gantiConfirmOk")?.addEventListener("click", discardAndBackToPathway);
  document.getElementById("startFirstTrial")?.addEventListener("click", () => {
    if (goalCards[0].status !== "approved") return;
    const goals = goalCards.filter((c) => c.status === "approved").map((c) => c.text.trim()).filter(Boolean);
    submitOnboarding(pendingPathway.pathway, pendingPathway.pathwayNoun, goals);
  });
}
function discardAndBackToPathway() {
  pendingPathway = null;
  goalCards = [freshGoalCard(1), freshGoalCard(2), freshGoalCard(3)];
  gantiConfirmOpen = false;
  adaptivePhase = "pathway"; // returns to the pulled-out carousel screen, not two screens back
  saveOnboardingDraftNow();
  renderAdaptive();
}
async function submitGoalForValidation(i) {
  const card = goalCards[i];
  if (!card.text.trim()) return;
  card.status = "validating";
  renderAdaptive();
  try {
    const result = await api("/api/onboarding/validate-goal", {
      method: "POST",
      body: { text: card.text.trim(), pathway: pendingPathway?.pathway, pathwayNoun: pendingPathway?.pathwayNoun },
    });
    if (result.approved) {
      card.status = "approved";
      card.approvedAt = new Date().toISOString();
      card.feedback = "";
      card.recommendations = [];
    } else {
      card.status = "needs_improvement";
      card.feedback = result.feedback || "";
      card.recommendations = Array.isArray(result.recommendations) ? result.recommendations.slice(0, 2) : [];
    }
  } catch (e) {
    card.status = "draft"; // don't strand the user on "Memeriksa..." forever - let them retry
  }
  saveOnboardingDraftNow();
  renderAdaptive();
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
  // Training multi-exercise session - compact one-liner for history rows;
  // the result screen adds the full evaluation block (gymSessionEvalHTML)
  // on top of this.
  if (sd.kind === "gym-session") {
    const exs = sd.exercises || [];
    const doneSets = exs.reduce((n, ex) => n + (ex.sets || []).filter((s) => s.done).length, 0);
    const names = exs.map((ex) => ex.name).slice(0, 3).join(", ");
    return `${exs.length} gerakan · ${doneSets} set selesai${names ? ` · ${names}${exs.length > 3 ? ", ..." : ""}` : ""}`;
  }
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

// Round 41 (IELTS Listening Half Diagnostic) TTS orchestration. Real
// speechSynthesis playback (founder's own confirmed choice - a real user
// can actually complete the test today, not just see an inert shell), NOT
// a reuse of speakScript() (different lifecycle: sequential multi-segment
// auto-chaining via utterance.onend, a hard 2-run cap that must NOT
// consume a run on failure). Race-safety mirrors the onboarding bridge
// audio system's bridgeAudioGen pattern (app.js:1541+) - lstnGen is bumped
// by lstnStop(), and every async callback below checks it before touching
// state, so a stop/replay/exit mid-utterance can never let a stale
// callback act on current state.
//
// Round-feedback update: each full run now speaks 5 utterances in
// sequence, not 2 - a short spoken announcement before each recording,
// the actual script, and a genuinely SPOKEN transition sentence between
// them (previously the transition was visual-text-only, timed by a fixed
// setTimeout). That fixed timer is gone entirely - chaining is now purely
// onend-driven end to end, so the visual "transition" state stays up for
// exactly as long as the transition sentence actually takes to speak, no
// guessing at a duration that has to match real speech length.
let lstnGen = 0;

const LSTN_ANNOUNCE_REC1 = "Recording 1. You will hear a telephone conversation between a woman and a staff member at a leisure centre. Questions 1 to 10.";
const LSTN_ANNOUNCE_TRANSITION = "That is the end of Recording 1. Now turn to questions 11 to 20.";
const LSTN_ANNOUNCE_REC2 = "Recording 2. You will hear a talk given by a volunteer coordinator at a community garden. Questions 11 to 20.";

function lstnStop() {
  lstnGen += 1;
  window.speechSynthesis?.cancel();
}

// "Start Listening" and "Putar sekali lagi" both call this. Never touches
// .answers - a replay must never reset what the user has already typed.
function lstnStartRun() {
  const f = listeningDiagnosticFlow;
  if (!f || f.runsCompleted >= 2) return;
  lstnStop();
  const gen = lstnGen;
  f.playback = { state: "playing-rec1", gen, recordingId: 1 };
  renderDashboard();
  lstnSpeakOne(LSTN_ANNOUNCE_REC1, gen, 1, () => lstnBeginScript(1, gen));
}

// One SpeechSynthesisUtterance - the single choke point every spoken step
// (announcement, script, or transition sentence) goes through. gen-guarded
// exactly like the rest of this chain; onDone only ever fires for the
// generation that's still current, so a stop()/replay/exit mid-utterance
// can't let a stale callback keep the chain going.
function lstnSpeakOne(text, gen, recordingId, onDone) {
  if (!window.speechSynthesis) { lstnFail(gen, recordingId); return; }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.95;
  utterance.onend = () => { if (gen === lstnGen) onDone(); };
  utterance.onerror = () => { if (gen === lstnGen) lstnFail(gen, recordingId); };
  window.speechSynthesis.speak(utterance);
}

// Speaks the actual recording script (after its announcement has already
// finished). recordingId===1 chains into the spoken transition;
// recordingId===2 finishes the run.
function lstnBeginScript(recordingId, gen) {
  const f = listeningDiagnosticFlow;
  if (gen !== lstnGen || !f) return;
  const rec = f.assessment?.recordings.find((r) => r.recordingId === recordingId);
  if (!rec) { lstnFail(gen, recordingId); return; }
  lstnSpeakOne(rec.script, gen, recordingId, () => {
    if (recordingId === 1) lstnBeginTransition(gen);
    else lstnFinishRun(gen);
  });
}

// Spec: a technical failure must NOT consume a run - runsCompleted is
// untouched here, only bumped inside lstnFinishRun (after recording 2's
// real completion).
function lstnFail(gen, recordingId) {
  if (gen !== lstnGen || !listeningDiagnosticFlow) return;
  listeningDiagnosticFlow.playback = { state: "error", gen, recordingId };
  renderDashboard();
}

// Retry redoes the announcement + script pair for whichever recording
// failed - simpler and more consistent than tracking which exact sub-step
// (announcement vs. script) errored.
function lstnRetry() {
  const f = listeningDiagnosticFlow;
  if (!f) return;
  const { recordingId } = f.playback;
  lstnStop();
  const gen = lstnGen;
  f.playback = { state: recordingId === 1 ? "playing-rec1" : "playing-rec2", gen, recordingId };
  renderDashboard();
  const announce = recordingId === 1 ? LSTN_ANNOUNCE_REC1 : LSTN_ANNOUNCE_REC2;
  lstnSpeakOne(announce, gen, recordingId, () => lstnBeginScript(recordingId, gen));
}

// The spoken (not just visual) transition between recordings. The
// "Now turn to questions 11 to 20…" banner stays up for exactly this
// utterance's real spoken duration - chains straight into Recording 2's
// own announcement+script pair on completion, no fixed timer involved.
function lstnBeginTransition(gen) {
  const f = listeningDiagnosticFlow;
  if (gen !== lstnGen || !f) return;
  f.playback = { state: "transition", gen, recordingId: 1 };
  renderDashboard();
  lstnSpeakOne(LSTN_ANNOUNCE_TRANSITION, gen, 1, () => lstnBeginRecording2(gen));
}

function lstnBeginRecording2(gen) {
  const f = listeningDiagnosticFlow;
  if (gen !== lstnGen || !f) return;
  f.playback = { state: "playing-rec2", gen, recordingId: 2 };
  renderDashboard();
  lstnSpeakOne(LSTN_ANNOUNCE_REC2, gen, 2, () => lstnBeginScript(2, gen));
}

// The ONE place runsCompleted changes - only reached after recording 2's
// real utterance.onend, i.e. a genuinely completed full run.
function lstnFinishRun(gen) {
  const f = listeningDiagnosticFlow;
  if (gen !== lstnGen || !f) return;
  f.runsCompleted += 1;
  f.playback = { state: "run-complete", gen, recordingId: 2 };
  renderDashboard();
}

// Dedicated countdown, NOT a reuse of the page-lifetime countdownTimer/
// tickCountdowns singleton (app.js ~3550+, used for quest-urgency chips
// elsewhere and never torn down) - this one is scoped precisely to the
// active-test step, explicitly started/stopped with it. Direct-DOM-write
// per tick, same rationale as tickCountdowns: never interrupt in-progress
// typing elsewhere on screen via a full re-render.
let lstnTimerInterval = null;
function lstnFormatMMSS(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
function lstnStartCountdown() {
  if (lstnTimerInterval || !listeningDiagnosticFlow) return;
  if (!listeningDiagnosticFlow.deadlineTs) listeningDiagnosticFlow.deadlineTs = Date.now() + 30 * 60 * 1000;
  lstnTimerInterval = setInterval(() => {
    const el = document.getElementById("lstnTimer");
    if (!el || !listeningDiagnosticFlow) return lstnStopCountdown();
    const remaining = Math.max(0, listeningDiagnosticFlow.deadlineTs - Date.now());
    el.textContent = lstnFormatMMSS(remaining);
    el.classList.toggle("lstn-timer-red", remaining <= 5 * 60 * 1000);
    // No auto-submit at 0:00 (undefined by the design spec) - display just
    // freezes at 00:00, matching this round's "no scoring/exit-confirm yet" scope.
  }, 1000);
}
function lstnStopCountdown() {
  clearInterval(lstnTimerInterval);
  lstnTimerInterval = null;
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

// Multi-Domain Quest Hub (design handoff, 19 Agustus): a quest requiring
// BOTH Recovery AND Nutrition sub-flows, completed in either order, routed
// through this dedicated 3-view screen (overview -> a feature module ->
// back to overview -> "Selesaikan Quest" once both are COMPLETE). Own field
// vocabulary (sleep/energy/soreness/recovery_session,
// protein/hydration/meals), deliberately NOT the pre-existing single-domain
// recovery form (recoveryFieldsHTML above) or nutrition-log's PROGRESSIVE
// system (nutritionFlow above) - see server/questHub.js's own comment for
// why these stay separate. Requirement ids/labels/targets are hand-synced
// with that module (no shared module system in this codebase, same
// established pattern as SUB_PATHWAY_NAMES/PATHWAY_DESC elsewhere in this
// file) - keep both in sync if either changes. CSS prefix deliberately
// .mdq- (not .qh-) to avoid any confusion with the pre-existing --qh-*
// custom properties/.qhub- classes belonging to the unrelated Home compact
// quest carousel feature (see styles.css's own comment on this).
const QH_FEATURE_META = {
  RECOVERY: { label: "Recovery", accent: "#63e38b", icon: "heart", desc: "Tidur, kondisi tubuh, atau recovery session." },
  NUTRITION: { label: "Nutrition", accent: "#c4d97a", icon: "droplet", desc: "Protein, hidrasi, dan asupan makan." },
};
const QH_SLEEP_OPTIONS = ["Kurang", "Cukup", "Baik"];
const QH_ENERGY_OPTIONS = ["Rendah", "Normal", "Tinggi"];
const QH_SORENESS_OPTIONS = ["Tidak ada", "Ringan", "Berat"];
const QH_RECOVERY_SESSION_OPTIONS = ["Jalan pemulihan", "Stretching", "Mobility", "Meditasi"];

function qhIconSVG(icon, color) {
  const common = `width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.6" style="flex:none"`;
  if (icon === "heart") return `<svg ${common}><path d="M12 20s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 5c-2.5 4.65-9.5 9-9.5 9z"></path></svg>`;
  return `<svg ${common}><path d="M12 2s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12z"></path></svg>`; // droplet (Nutrition)
}
// "N dari M tercatat" - mirrors server/questHub.js's countRecorded exactly
// (required-ids-with-a-recorded-value count), so the Hub card's bukti-ring
// and the server's own gating never disagree about what's "recorded".
function qhCountRecorded(requirements, data) {
  const d = data || {};
  const requiredIds = (requirements || []).filter((r) => r.required).map((r) => r.id);
  return { recorded: requiredIds.filter((id) => d[id] != null).length, total: requiredIds.length };
}
function qhCtaLabel(state) {
  return state === "COMPLETE" ? "Lihat/Ubah" : state === "IN_PROGRESS" ? "Lanjut" : "Isi";
}
function qhStatusPillHTML(state, recorded, total) {
  const cls = state === "COMPLETE" ? "done" : state === "IN_PROGRESS" ? "partial" : "empty";
  const text = state === "COMPLETE" ? "Selesai" : state === "IN_PROGRESS" ? `${recorded} dari ${total} tercatat` : "Belum lengkap";
  return `<span class="mdq-pill mdq-pill-${cls}">${esc(text)}</span>`;
}

// "Recovery + Nutrition" style short label for a multi-domain quest -
// generic over primaryFeature/supportingFeatures (not hardcoded to this
// one template) so a future 2nd multi-domain template stays correct here
// without a code change, same principle as questHub.js's own template
// design. Used by both the compact carousel card's summary line and the
// detail panel's eyebrow suffix (design handoff 01-01-home.png).
function mdqFeatureLabelJoin(quest, upper) {
  const keys = [quest.primaryFeature, ...(quest.supportingFeatures || [])].filter(Boolean);
  return keys.map((k) => {
    const label = QH_FEATURE_META[k]?.label || k;
    return upper ? label.toUpperCase() : label;
  }).join(" + ");
}

// Home screen's 3-tile info row (design handoff 01-01-home.png, sits
// between the description and "SELESAI KETIKA" on the detail panel) -
// "area utama"/"waktu"/"tujuan" at a glance. Originally multi-domain-only;
// widened to every quest type on founder request (20 Agustus) once a
// plain single-feature quest was compared side by side and the founder
// wanted one consistent card style everywhere, not just Recovery+Nutrition.
// For a multi-domain quest, "area" is the real primaryFeature+supportingFeatures
// count/labels and "tujuan" is the template's own tujuanSingkat. For every
// other completionType there's no such structured breakdown, so "area"
// falls back to the quest's single statFocus (still real data, just not
// multi-part) and "tujuan" falls back to the active goal text (goalLabel -
// user-supplied, must stay escaped same as every other use of it in this
// file) since there's no per-quest short-purpose field outside the Hub
// template.
function mdqHomeInfoRowHTML(quest, goalLabel) {
  const isMultiDomain = quest.completionType === "multi-domain";
  const keys = isMultiDomain ? [quest.primaryFeature, ...(quest.supportingFeatures || [])].filter(Boolean) : [];
  const areaCount = isMultiDomain ? keys.length : 1;
  const areaSub = isMultiDomain ? mdqFeatureLabelJoin(quest, false) : esc(statLabel(quest.statFocus) || "Umum");
  const tujuanSub = esc(quest.tujuanSingkat || goalLabel || "");
  const common = `width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.6" style="flex:none"`;
  const tiles = [
    { icon: `<svg ${common}><path d="M5 3v18M5 4h11l-2.5 3.5L16 11H5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`, label: `${areaCount} area utama`, sub: areaSub },
    { icon: `<svg ${common}><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3.5 2" stroke-linecap="round" stroke-linejoin="round"></path></svg>`, label: "Est. waktu", sub: "±30 menit" },
    { icon: `<svg ${common}><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="4"></circle><circle cx="12" cy="12" r="0.8" fill="var(--accent)"></circle></svg>`, label: "Tujuan", sub: tujuanSub },
  ];
  return `
    <div class="mdq-info-row">
      ${tiles.map((t) => `
        <div class="mdq-info-tile">
          ${t.icon}
          <div class="mdq-info-label">${esc(t.label)}</div>
          <div class="mdq-info-sub">${t.sub}</div>
        </div>`).join("")}
    </div>`;
}

// Home screen's "SELESAI KETIKA" checklist. For a multi-domain quest this
// replaces the generic bullet list with a per-area radio-style checklist
// reflecting REAL featureState - never a static preview that could drift
// from what the Hub itself shows, same "evidence, not checkboxes, always
// derived" rule as questHub.js's own computeFeatureState. Every other
// completionType has no per-requirement completion tracking at all (the
// quest resolves as one atomic event, not N independently-completable
// parts), so widening this to all quest types (founder request, 20
// Agustus) means the radios for those requirements stay permanently
// unfilled here by construction - same honesty rule, just nothing to
// report yet since there's no sub-state to read. That's still preferable
// to inventing fake partial-completion data: it's the same information
// the old bullet list carried, only visually unified with the Hub's style.
function mdqHomeChecklistHTML(quest, dod) {
  const isMultiDomain = quest.completionType === "multi-domain";
  if (isMultiDomain) {
    const keys = [quest.primaryFeature, ...(quest.supportingFeatures || [])].filter(Boolean);
    const featureState = quest.featureState || {};
    return `
      <div class="mdq-home-checklist">
        ${keys.map((k) => {
          const done = featureState[k] === "COMPLETE";
          const label = QH_FEATURE_META[k]?.label || k;
          return `
          <div class="mdq-home-check-item">
            <span class="mdq-home-check-radio ${done ? "done" : ""}"></span>
            <span>${esc(label)} requirement terpenuhi</span>
          </div>`;
        }).join("")}
      </div>`;
  }
  return `
    <div class="mdq-home-checklist">
      ${(dod || []).map((d) => `
        <div class="mdq-home-check-item">
          <span class="mdq-home-check-radio"></span>
          <span>${esc(d)}</span>
        </div>`).join("")}
    </div>`;
}

function questHubFlowHTML() {
  const f = questHubFlow;
  if (!f) return "";
  // Never cached in questHubFlow itself - always looked up fresh from
  // appState.openQuests (refreshed after every save), same "single source
  // of truth" convention every other flow in this file follows. This is
  // also what makes a save's effect show up immediately without
  // questHubFlow needing to track the data itself. Reads appState directly
  // (not the allOpenQuests local var renderDashboard computes) - this
  // function sits outside renderDashboard's scope, called from inside its
  // homeBodyHTML dispatch ternary, so allOpenQuests itself isn't reachable
  // here as a free variable.
  const day = (appState.openQuests || []).find((q) => q.id === f.questId);
  if (!day) {
    return `<div class="quest-card fadeUp"><p class="why">Quest ini sudah tidak tersedia lagi.</p><button class="btn-primary full" id="mdqBackHome" style="margin-top:14px">← Kembali ke Home</button></div>`;
  }
  if (f.view === "recovery") return questHubFeatureHTML(day, f, "RECOVERY");
  if (f.view === "nutrition") return questHubFeatureHTML(day, f, "NUTRITION");
  return questHubOverviewHTML(day, f);
}

function questHubOverviewHTML(day, f) {
  const quest = day.quest;
  const primary = quest.primaryFeature;
  const supporting = quest.supportingFeatures || [];
  const featureKeys = [primary, ...supporting].filter(Boolean);
  const featureState = quest.featureState || {};
  const requirements = quest.featureRequirements || {};
  const completeCount = featureKeys.filter((k) => featureState[k] === "COMPLETE").length;
  const ready = quest.status === "READY_TO_COMPLETE";

  return `
    <div class="quest-card fadeUp mdq-card">
      <button class="mdq-back" id="mdqBackHome">← Kembali</button>
      <div class="mdq-eyebrow mono">SESSION QUEST · ${esc(quest.domain || "BODY")} • ${esc(mdqFeatureLabelJoin(quest, false))}</div>
      <h2 class="fr mdq-title">${esc(quest.title)}</h2>
      <p class="mdq-desc">Lengkapi Recovery dan Nutrition kapan pun selama hari ini. Kamu bebas mulai dari mana.</p>
      <div class="mdq-meta mono">±30 menit · ${featureKeys.length} area perlu terpenuhi · Tujuan: Pulih &amp; bertenaga</div>

      <div class="mdq-section-label mono">LENGKAPI KEDUA AREA</div>
      ${featureKeys.map((key) => {
        const meta = QH_FEATURE_META[key] || { label: key, accent: "#e8a33d", icon: "heart", desc: "" };
        const reqs = requirements[key] || [];
        const data = (quest.featureData || {})[key] || {};
        const { recorded, total } = qhCountRecorded(reqs, data);
        const state = featureState[key] || "NOT_STARTED";
        return `
        <div class="mdq-feature-card" style="border-color:${meta.accent}33">
          <div class="mdq-feature-top">
            <div class="mdq-feature-icon" style="border-color:${meta.accent}55">${qhIconSVG(meta.icon, meta.accent)}</div>
            <div class="mdq-feature-info">
              <div class="mdq-feature-name fr">${esc(meta.label)}</div>
              <div class="mdq-feature-desc">${esc(meta.desc)}</div>
            </div>
            <div class="mdq-ring" style="--mdq-ring-color:${meta.accent};--mdq-ring-pct:${total ? Math.round((recorded / total) * 100) : 0}%">
              <span class="mdq-ring-frac">${total ? `${recorded}/${total}` : "–"}</span><span class="mdq-ring-label mono">BUKTI</span>
            </div>
          </div>
          ${qhStatusPillHTML(state, recorded, total)}
          <button class="btn-primary full mdq-feature-cta" style="background:${meta.accent}" data-mdq-open="${key.toLowerCase()}">${esc(qhCtaLabel(state))} ${esc(meta.label)} ›</button>
        </div>`;
      }).join("")}

      <div class="mdq-progress-label mono">${completeCount} / ${featureKeys.length} area selesai</div>
      <div class="mdq-progress-bar"><div class="mdq-progress-fill" style="width:${featureKeys.length ? (completeCount / featureKeys.length) * 100 : 0}%"></div></div>

      ${f.error ? `<p style="color:var(--rust);font-size:13px;margin:10px 0 0">${esc(f.error)}</p>` : ""}
      <button class="btn-primary full" id="mdqComplete" style="margin-top:16px" ${ready && !f.completing ? "" : "disabled"}>${f.completing ? "Menyelesaikan..." : "Selesaikan Quest"}</button>
      ${!ready ? `<p class="mdq-helper mono">Lengkapi Recovery dan Nutrition dulu.</p>` : ""}
    </div>`;
}

// Shared shell for both feature modules - RECOVERY's chip-pick fields and
// NUTRITION's numeric steppers are different enough in kind that they don't
// share field-rendering code, but the surrounding card/back-button/save-
// button/draft-init logic is identical, so that part is unified here rather
// than duplicated per feature.
function questHubFeatureHTML(day, f, featureKey) {
  const meta = QH_FEATURE_META[featureKey];
  const draft = f.draft || {};
  const chipRow = (label, key, options) => `
    <div class="field">
      <label class="mdq-field-label mono">${esc(label)}</label>
      <div class="status-row">
        ${options.map((v) => `<button class="status-btn ${draft[key] === v ? "active" : ""}" data-mdq-chip="${key}" data-mdq-value="${esc(v)}">${esc(v)}</button>`).join("")}
      </div>
    </div>`;
  const stepperRow = (label, key, target, unit, step, decimals) => {
    const val = typeof draft[key] === "number" ? draft[key] : 0;
    return `
    <div class="mdq-stepper-row">
      <div class="mdq-stepper-top"><span>${esc(label)}</span><span class="mono mdq-stepper-val">${val.toFixed(decimals)} / ${target}${unit}</span></div>
      <div class="mdq-stepper-controls">
        <button class="mdq-stepper-btn" data-mdq-step="${key}" data-mdq-delta="-${step}" data-mdq-max="999">−</button>
        <div class="mdq-stepper-track"><div class="mdq-stepper-fill" style="width:${Math.min(100, (val / target) * 100)}%;background:${meta.accent}"></div></div>
        <button class="mdq-stepper-btn" data-mdq-step="${key}" data-mdq-delta="${step}" data-mdq-max="999">+</button>
      </div>
    </div>`;
  };
  const bodyHTML = featureKey === "RECOVERY"
    ? `<h2 class="fr mdq-title">Body Check &amp; Recovery Session</h2>
       ${chipRow("TIDUR SEMALAM", "sleep", QH_SLEEP_OPTIONS)}
       ${chipRow("ENERGI", "energy", QH_ENERGY_OPTIONS)}
       ${chipRow("SORENESS", "soreness", QH_SORENESS_OPTIONS)}
       <div class="mdq-divider"></div>
       ${chipRow("RECOVERY SESSION", "recovery_session", QH_RECOVERY_SESSION_OPTIONS)}`
    : `<h2 class="fr mdq-title">Protein, Hidrasi &amp; Makan</h2>
       ${stepperRow("Protein", "protein", 80, "g", 5, 0)}
       ${stepperRow("Hidrasi", "hydration", 2.5, "L", 0.25, 2)}
       ${stepperRow("Meals dicatat", "meals", 3, "", 1, 0)}`;
  return `
    <div class="quest-card fadeUp mdq-card">
      <button class="mdq-back" id="mdqBackHub">← Kembali</button>
      <div class="mdq-eyebrow mono" style="color:${meta.accent}">${meta.label.toUpperCase()}</div>
      ${bodyHTML}
      ${f.error ? `<p style="color:var(--rust);font-size:13px;margin:12px 0 0">${esc(f.error)}</p>` : ""}
      <button class="btn-primary full" id="mdqSaveFeature" data-mdq-feature="${featureKey}" style="margin-top:18px;background:${meta.accent}">${f.saving ? "Menyimpan..." : `Simpan ${esc(meta.label)}`}</button>
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

// ==== Round 41: IELTS Listening Half Diagnostic ====================

function lstnAnsweredCount(f) {
  return Object.values(f.answers).filter((v) => String(v || "").trim()).length;
}

// Intro ("Test Ready") - renders WITH normal chrome present, same as
// Practice Test's own kind/track picker steps. Only "Start Listening"
// transitions into the chrome-hidden "active" step (renderDashboard's
// early-return bypass).
function listeningDiagnosticIntroHTML() {
  const f = listeningDiagnosticFlow;
  return `
    <div class="lstn-intro fadeUp">
      <div class="eyebrow mono" style="color:#6EA8FF">META · LINGUA</div>
      <h1 class="fr lstn-intro-title">IELTS Listening</h1>
      <p class="lstn-intro-subtitle">Academic · Half Diagnostic</p>
      <div class="lstn-intro-stats">
        <div class="lstn-intro-stat"><div class="lstn-intro-stat-num fr">20</div><div class="lstn-intro-stat-label">pertanyaan</div></div>
        <div class="lstn-intro-stat"><div class="lstn-intro-stat-num fr">2</div><div class="lstn-intro-stat-label">recording</div></div>
      </div>
      <div class="lstn-intro-instr-label mono">INSTRUKSI</div>
      <ul class="lstn-intro-instr-list">
        <li>Sekali Play memutar Recording 1 dan Recording 2 secara otomatis.</li>
        <li>Kamu bisa memutar seluruh tes maksimal 2 kali.</li>
        <li>Jawaban tetap tersimpan saat pemutaran kedua.</li>
        <li>Jawab sambil mendengarkan.</li>
      </ul>
      <div class="lstn-intro-plays mono">${f.runsCompleted}/2 diputar</div>
      <button class="btn-primary full lstn-intro-cta" id="lstnStart">Start Listening</button>
      <button class="btn-ghost full" id="lstnCancel" style="margin-top:10px">← Batal</button>
    </div>`;
}

// Status strip - replaces the app header entirely during the active test.
function lstnStripHTML(f) {
  const st = f.playback.state;
  let range = "Questions 1–20", rec = "Belum diputar";
  if (st === "playing-rec1") { range = "Questions 1–10 of 20"; rec = "Recording 1 of 2"; }
  else if (st === "transition") { range = "Questions 1–20"; rec = "Recording 1 of 2"; }
  else if (st === "playing-rec2") { range = "Questions 11–20 of 20"; rec = "Recording 2 of 2"; }
  else if (st === "run-complete" || st === "error") { range = "Questions 1–20"; rec = `Putaran ke-${f.runsCompleted} selesai`; }
  return `
    <div class="lstn-strip">
      <div class="lstn-strip-range mono">${esc(range)}</div>
      <div class="lstn-strip-rec mono">${esc(rec)}</div>
      <div class="lstn-timer mono" id="lstnTimer">30:00</div>
    </div>`;
}

function lstnAudioCardHTML(f) {
  const st = f.playback.state;
  const playing = st === "playing-rec1" || st === "playing-rec2";
  const disablePlay = playing || st === "transition" || f.runsCompleted >= 2;
  const title = playing ? "Sedang memutar..." : st === "run-complete" ? `Putaran ke-${f.runsCompleted} selesai` : st === "error" ? "Gagal memutar" : "Putar audio";
  const sub = `${f.runsCompleted} / 2 diputar`;
  const recLabel = st === "playing-rec2" ? "REC 2/2" : "REC 1/2";
  let footer = "";
  if (st === "transition") footer = `<p class="lstn-audio-transition">Now turn to questions 11 to 20…</p>`;
  else if (st === "run-complete") footer = f.runsCompleted < 2
    ? `<button class="lstn-replay-btn" id="lstnReplay">Putar sekali lagi</button>`
    : `<button class="lstn-replay-btn" disabled>Audio sudah diputar 2 kali</button>`;
  else if (st === "error") footer = `<p class="lstn-audio-error">Gagal memutar, coba lagi.</p><button class="lstn-replay-btn" id="lstnRetryPlay">Coba lagi</button>`;
  else if (st === "idle") footer = `<p class="lstn-audio-hint">Sekali Play memutar Recording 1 lalu Recording 2 secara berurutan.</p>`;
  return `
    <div class="lstn-audio-card ${playing ? "lstn-playing" : ""}">
      <div class="lstn-audio-row">
        <button class="lstn-play-btn" id="lstnPlayBtn" ${disablePlay ? "disabled" : ""} aria-label="Putar">${playing ? "❚❚" : "▶"}</button>
        <div style="flex:1;min-width:0">
          <div class="lstn-audio-title">${esc(title)}</div>
          <div class="lstn-audio-sub mono">${esc(sub)}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <span class="lstn-strip-rec mono">${recLabel}</span>
          <div class="lstn-eq"><span></span><span></span><span></span><span></span></div>
        </div>
      </div>
      ${footer ? `<div style="margin-top:10px">${footer}</div>` : ""}
    </div>`;
}

function lstnBlockHTML({ range, title, instruction, live, inner }) {
  return `
    <div class="lstn-block ${live ? "lstn-block-live" : ""}">
      <div class="lstn-block-label">
        <span>QUESTIONS ${range}</span>
        ${live ? `<span class="lstn-live-tag">SEDANG DIPUTAR</span>` : ""}
      </div>
      ${title ? `<div class="lstn-block-title fr">${esc(title)}</div>` : ""}
      <p class="lstn-instruction">${instruction}</p>
      ${inner}
    </div>`;
}

function lstnNoteCompletionBlockHTML(f) {
  const qs = f.assessment.questions.filter((q) => q.taskType === "note_completion");
  const live = f.playback.state === "playing-rec1";
  const rows = qs.map((q) => `
    <div class="lstn-note-row">
      <span class="lstn-note-label"><span class="mono lstn-qnum">${q.questionNumber}</span>${esc(q.prompt)}</span>
      <input type="text" class="lstn-input" data-lstn-text="${q.questionId}" maxlength="40" placeholder="Jawaban" value="${esc(f.answers[q.questionId] || "")}" />
    </div>`).join("");
  return lstnBlockHTML({
    range: "1–5", title: "Riverside Leisure Centre",
    instruction: "Complete the notes below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
    live, inner: rows,
  });
}

function lstnMultipleChoiceBlockHTML(f) {
  const qs = f.assessment.questions.filter((q) => q.taskType === "multiple_choice");
  const live = f.playback.state === "playing-rec1";
  const inner = qs.map((q) => `
    <div class="lstn-mc-item">
      <div class="lstn-note-label lstn-mc-prompt"><span class="mono lstn-qnum">${q.questionNumber}</span>${esc(q.prompt)}</div>
      <div class="lstn-mc-options">
        ${q.options.map((o) => `
          <button class="status-btn ${f.answers[q.questionId] === o.letter ? "active" : ""}" data-lstn-mc="${q.questionId}" data-lstn-letter="${o.letter}">
            <span class="lstn-letter-badge">${o.letter}</span> ${esc(o.label)}
          </button>`).join("")}
      </div>
    </div>`).join("");
  return lstnBlockHTML({ range: "6–10", title: null, instruction: "Choose the correct letter, A, B or C.", live, inner });
}

function lstnMatchingBlockHTML(f) {
  const qs = f.assessment.questions.filter((q) => q.taskType === "matching");
  const legend = f.assessment.matchingLegend;
  const live = f.playback.state === "playing-rec2";
  const legendHTML = `<div class="lstn-legend">${legend.map((o) => `<div class="lstn-legend-item"><b>${o.letter}</b> ${esc(o.label)}</div>`).join("")}</div>`;
  const rows = qs.map((q) => `
    <div class="lstn-match-row">
      <div class="lstn-match-statement"><span class="mono lstn-qnum">${q.questionNumber}</span>${esc(q.prompt)}</div>
      <div class="lstn-match-letters">
        ${legend.map((o) => `<button class="lstn-letter-badge ${f.answers[q.questionId] === o.letter ? "active" : ""}" data-lstn-match="${q.questionId}" data-lstn-letter="${o.letter}">${o.letter}</button>`).join("")}
      </div>
    </div>`).join("");
  return lstnBlockHTML({ range: "11–15", title: null, instruction: "Choose FIVE answers from the box, A–E.", live, inner: legendHTML + rows });
}

function lstnSentenceCompletionBlockHTML(f) {
  const qs = f.assessment.questions.filter((q) => q.taskType === "sentence_completion");
  const live = f.playback.state === "playing-rec2";
  const rows = qs.map((q) => `
    <div class="lstn-note-row lstn-sentence-row">
      <span class="lstn-note-label"><span class="mono lstn-qnum">${q.questionNumber}</span>${esc(q.prompt)}</span>
      <input type="text" class="lstn-input lstn-sentence-input" data-lstn-text="${q.questionId}" maxlength="40" placeholder="Jawaban" value="${esc(f.answers[q.questionId] || "")}" />
    </div>`).join("");
  return lstnBlockHTML({
    range: "16–20", title: null,
    instruction: "Complete the sentences below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
    live, inner: rows,
  });
}

function lstnActiveHTML() {
  const f = listeningDiagnosticFlow;
  return `
    ${lstnStripHTML(f)}
    <div class="lstn-scroll">
      ${lstnAudioCardHTML(f)}
      ${lstnNoteCompletionBlockHTML(f)}
      ${lstnMultipleChoiceBlockHTML(f)}
      ${lstnMatchingBlockHTML(f)}
      ${lstnSentenceCompletionBlockHTML(f)}
      ${f.error ? `<p class="lstn-audio-error" style="text-align:center;margin-top:8px">${esc(f.error)}</p>` : ""}
    </div>
    <div class="lstn-foot">
      <span class="lstn-foot-count mono" id="lstnFootCount">${lstnAnsweredCount(f)} / 20 dijawab</span>
      <button class="lstn-foot-submit" id="lstnFootSubmit">Submit jawaban</button>
    </div>`;
}

const LSTN_TASK_TYPE_LABEL = {
  note_completion: "Note Completion",
  multiple_choice: "Multiple Choice",
  matching: "Matching",
  sentence_completion: "Sentence Completion",
};

// Round-feedback: real results screen (score + a deterministic per-task-
// type breakdown + the wrong-answer list) - replaces the old bare
// "Diagnostik selesai" text. Everything here comes straight from the
// numbers the server already computed (listeningDiagnostic.gradeAnswers/
// summarizeByTaskType) - no AI narration, per the founder's own explicit
// scope for this screen. Breakdown wording/thresholds mirror the
// established "Strong/Unstable" pattern from practiceTestResultHTML's
// "ELEVA OBSERVED" block, but under this screen's own .lstn-result-*
// classes and a plainer label - this test screen is deliberately
// narrative-free (no game/AI framing mid-test, per round 41's own scope),
// so it doesn't borrow Practice Test's branded vocabulary.
function lstnSubmittedHTML() {
  const f = listeningDiagnosticFlow;
  const r = f.submittedResult || {};
  const byTaskType = r.byTaskType || {};
  const wrong = r.wrong || [];
  const types = Object.keys(LSTN_TASK_TYPE_LABEL).filter((t) => byTaskType[t]);
  const strong = types.filter((t) => byTaskType[t].correct >= 4);
  const weak = types.filter((t) => byTaskType[t].correct <= 2);
  const rowLabel = (t) => `${esc(LSTN_TASK_TYPE_LABEL[t])} (${byTaskType[t].correct}/${byTaskType[t].total})`;
  return `
    <div class="lstn-result">
      <div class="lstn-result-score fr">${r.correct ?? "–"} / 20</div>
      <p class="lstn-result-sub">${r.answeredCount ?? lstnAnsweredCount(f)} dari 20 soal terjawab.</p>
      <div class="lstn-result-block">
        <div class="lstn-result-label mono">RINGKASAN PER TIPE SOAL</div>
        ${strong.length ? `<p class="lstn-result-obs"><span class="lstn-result-obs-label strong">Kuat di</span> ${strong.map(rowLabel).join(" · ")}</p>` : ""}
        ${weak.length ? `<p class="lstn-result-obs"><span class="lstn-result-obs-label weak">Perlu latihan</span> ${weak.map(rowLabel).join(" · ")}</p>` : ""}
        ${!strong.length && !weak.length ? `<p class="lstn-result-obs lstn-result-obs-neutral">Semua tipe soal di rentang tengah — belum ada yang menonjol kuat atau lemah.</p>` : ""}
        <div class="lstn-result-types mono">${types.map(rowLabel).join(" · ")}</div>
      </div>
      <div class="lstn-result-block">
        <div class="lstn-result-label mono">SOAL YANG SALAH</div>
        ${wrong.length ? `
        <div class="lstn-result-wrong-scroll">
          ${wrong.map((w) => `
            <div class="lstn-result-wrong-row">
              <span class="mono lstn-qnum">${w.questionNumber}</span>
              <div style="min-width:0">
                <div class="lstn-result-wrong-yours">Jawabanmu: ${esc(w.yourAnswer || "-")}</div>
                <div class="lstn-result-wrong-correct">Benar: ${esc(w.correctAnswer)}</div>
              </div>
            </div>`).join("")}
        </div>` : `<p class="lstn-result-obs lstn-result-obs-perfect">Semua benar!</p>`}
      </div>
      <button class="btn-primary full" id="lstnBackToMeta">Kembali ke META</button>
    </div>`;
}

// "N soal belum dijawab / Kembali cek / Tetap submit" - reuses .help-overlay/
// .help-sheet verbatim (same precedent as the "Ganti Pathway" confirm sheet,
// app.js gantiConfirmOverlay), only shown when questions remain unanswered.
function lstnSubmitConfirmSheetHTML() {
  const f = listeningDiagnosticFlow;
  const unanswered = 20 - lstnAnsweredCount(f);
  return `
    <div class="help-overlay" id="lstnSubmitConfirmOverlay">
      <div class="help-sheet fadeUp">
        <p>${unanswered} soal belum dijawab. Kamu masih bisa kembali dan melengkapi jawabanmu.</p>
        <div style="display:flex;gap:10px">
          <button class="btn-ghost" id="lstnSubmitBack" style="flex:1">Kembali cek</button>
          <button class="btn-primary" id="lstnSubmitAnyway" style="flex:1">Tetap submit</button>
        </div>
      </div>
    </div>`;
}

// Full chrome bypass - no appHeaderHTML()/tabBarHTML() call at all, per the
// design's "test mode" requirement. Reached only from renderDashboard's
// early-return for step "active"/"submitted".
function renderListeningDiagnosticTest() {
  const f = listeningDiagnosticFlow;
  root.innerHTML = `
    <div class="lstn-shell">
      ${f.step === "submitted" ? lstnSubmittedHTML() : lstnActiveHTML()}
    </div>
    ${f.submitConfirmOpen ? lstnSubmitConfirmSheetHTML() : ""}`;
  wireListeningDiagnosticHandlers();
  if (f.step === "active") lstnStartCountdown();
}

function lstnUpdateFooterCount() {
  const el = document.getElementById("lstnFootCount");
  if (!el || !listeningDiagnosticFlow) return;
  el.textContent = `${lstnAnsweredCount(listeningDiagnosticFlow)} / 20 dijawab`;
}

async function lstnDoSubmit() {
  const f = listeningDiagnosticFlow;
  if (!f) return;
  lstnStop();
  lstnStopCountdown();
  f.submitConfirmOpen = false;
  f.error = "";
  try {
    const resp = await api("/api/listening-diagnostic/submit", { method: "POST", body: { questId: f.questId, answers: f.answers, runsCompleted: f.runsCompleted } });
    f.step = "submitted";
    f.submittedResult = { correct: resp.correct, total: resp.totalQuestions, answeredCount: resp.answeredCount, wrong: resp.wrong, byTaskType: resp.byTaskType };
  } catch (e) {
    f.error = e.message;
  }
  renderDashboard();
}

function wireListeningDiagnosticHandlers() {
  document.getElementById("lstnStart")?.addEventListener("click", () => {
    listeningDiagnosticFlow.step = "active";
    renderDashboard();
    lstnStartRun();
  });
  document.getElementById("lstnCancel")?.addEventListener("click", () => {
    // Same precedent as ptCancel: just clears client state, no API call -
    // the just-created META quest row is left open/unreflected, same
    // "orphaned META session is fine, never blocks anything" convention.
    listeningDiagnosticFlow = null;
    activeScreen = "meta";
    renderDashboard();
  });
  document.getElementById("lstnPlayBtn")?.addEventListener("click", () => lstnStartRun());
  document.getElementById("lstnReplay")?.addEventListener("click", () => lstnStartRun());
  document.getElementById("lstnRetryPlay")?.addEventListener("click", () => lstnRetry());

  document.querySelectorAll("[data-lstn-text]").forEach((input) => input.addEventListener("input", (e) => {
    if (!listeningDiagnosticFlow) return;
    listeningDiagnosticFlow.answers[e.target.dataset.lstnText] = e.target.value;
    lstnUpdateFooterCount();
  }));
  // Round-feedback fix: these used to call renderDashboard() (full re-render,
  // resets .lstn-scroll's scroll position to 0 - the "tap an answer, page
  // jumps to top" bug). Same lightweight pattern as the [data-lstn-text]
  // handler above: mutate state, toggle .active on just the tapped group's
  // buttons directly, update the footer count - no full re-render.
  document.querySelectorAll("[data-lstn-mc]").forEach((btn) => btn.addEventListener("click", () => {
    const qid = btn.dataset.lstnMc;
    listeningDiagnosticFlow.answers[qid] = btn.dataset.lstnLetter;
    document.querySelectorAll(`[data-lstn-mc="${qid}"]`).forEach((b) => b.classList.toggle("active", b === btn));
    lstnUpdateFooterCount();
  }));
  document.querySelectorAll("[data-lstn-match]").forEach((btn) => btn.addEventListener("click", () => {
    const qid = btn.dataset.lstnMatch;
    listeningDiagnosticFlow.answers[qid] = btn.dataset.lstnLetter;
    document.querySelectorAll(`[data-lstn-match="${qid}"]`).forEach((b) => b.classList.toggle("active", b === btn));
    lstnUpdateFooterCount();
  }));

  document.getElementById("lstnFootSubmit")?.addEventListener("click", () => {
    const f = listeningDiagnosticFlow;
    const unanswered = 20 - lstnAnsweredCount(f);
    if (unanswered > 0) { f.submitConfirmOpen = true; renderDashboard(); return; }
    lstnDoSubmit();
  });
  document.getElementById("lstnSubmitBack")?.addEventListener("click", () => {
    listeningDiagnosticFlow.submitConfirmOpen = false;
    renderDashboard();
  });
  document.getElementById("lstnSubmitAnyway")?.addEventListener("click", () => lstnDoSubmit());
  document.getElementById("lstnBackToMeta")?.addEventListener("click", () => {
    listeningDiagnosticFlow = null;
    activeScreen = "meta";
    renderDashboard();
  });
}

// ==== Round 42: IELTS Reading Half Diagnostic ======================
// Test-mode shell for the Reading practice test (sprint AND drill),
// mirroring the listening diagnostic's architecture: chrome bypass via
// renderDashboard early-return, direct-DOM timer, surgical answer updates
// (no full re-render on taps - the .lstn-scroll scroll-reset lesson), and
// .help-overlay confirm sheets. New here vs listening: Passage/Questions
// tabs with independent scroll memory, one block at a time, per-question
// flagging, an overview sheet, a Review screen before submit, and an
// in-shell structured result (band range + per-block breakdown).

const RDG_CATEGORY_LABEL = {
  "multiple choice": "Multiple Choice",
  "true/false/not given": "True / False / Not Given",
  "matching information": "Matching Information",
  "sentence completion": "Sentence Completion",
};
function rdgCategoryLabel(cat) {
  return RDG_CATEGORY_LABEL[cat] || (cat ? cat.replace(/\b\w/g, (c) => c.toUpperCase()) : "Lainnya");
}

// v2 sprints ship server-built blocks; drills/legacy payloads are flat, so
// derive 5-question groups client-side (a 12-question drill becomes 5/5/2)
// with the drill category as the label.
function rdgDeriveBlocks(payload) {
  if (Array.isArray(payload.blocks) && payload.blocks.length) return payload.blocks;
  const qs = payload.questions || [];
  const label = payload.focusCategory ? rdgCategoryLabel(payload.focusCategory) : "Drill";
  const blocks = [];
  for (let i = 0; i < qs.length; i += 5) {
    const group = qs.slice(i, i + 5);
    blocks.push({
      blockType: "drill", label,
      range: `${i + 1}-${i + group.length}`,
      instruction: "Jawab pertanyaan berikut berdasarkan bacaan.",
      questionIds: group.map((q) => q.id),
    });
  }
  return blocks;
}

// Single constructor for the flow - every reading payload (v2 sprint from
// the weekly cache, per-attempt drill, keyless fallback) enters the shell
// through here after a successful /api/practice-test/generate.
function startReadingTest(questId, track, payload, origin) {
  readingTestFlow = {
    questId, origin: origin || "home", track,
    step: "intro", payload,
    blocks: rdgDeriveBlocks(payload),
    answers: {}, flags: {},
    activeTab: "passage", blockIndex: 0,
    scrollMem: { passage: 0, questions: 0 },
    deadlineTs: null, timerExpired: false,
    overviewOpen: false, exitConfirmOpen: false, submitConfirmOpen: false, timeUpOpen: false,
    error: "", result: null,
  };
}

function rdgAnsweredCount(f) {
  return f.payload.questions.filter((q) => String(f.answers[q.id] || "").trim()).length;
}
function rdgFlaggedCount(f) {
  return f.payload.questions.filter((q) => f.flags[q.id]).length;
}
function rdgTotal(f) {
  return f.payload.questions.length;
}
function rdgDurationMs(f) {
  // 30:00 for the 20-question sprint (design spec); 20:00 for a 12-question
  // drill (same ~1.5 min/question pacing).
  return (f.payload.entryType === "drill" ? 20 : 30) * 60 * 1000;
}

// Same direct-DOM-write countdown pattern as lstnStartCountdown. At 0:00 the
// timer NEVER erases answers and NEVER auto-submits (founder decision):
// it stops, freezes at 00:00 and opens the "Time is up" sheet, whose only
// action is Review & Submit.
let rdgTimerInterval = null;
function rdgStartCountdown() {
  if (rdgTimerInterval || !readingTestFlow || readingTestFlow.timerExpired) return;
  const f = readingTestFlow;
  if (!f.deadlineTs) f.deadlineTs = Date.now() + rdgDurationMs(f);
  rdgTimerInterval = setInterval(() => {
    const el = document.getElementById("rdgTimer");
    if (!el || !readingTestFlow) return rdgStopCountdown();
    const remaining = Math.max(0, readingTestFlow.deadlineTs - Date.now());
    el.textContent = lstnFormatMMSS(remaining);
    el.classList.toggle("rdg-timer-red", remaining <= 5 * 60 * 1000);
    if (remaining <= 0) {
      rdgStopCountdown();
      readingTestFlow.timerExpired = true;
      readingTestFlow.timeUpOpen = true;
      rdgSaveScroll();
      renderDashboard();
    }
  }, 1000);
}
function rdgStopCountdown() {
  clearInterval(rdgTimerInterval);
  rdgTimerInterval = null;
}

// Scroll memory: both tab panes stay in the DOM (hidden via .rdg-hidden), so
// a tab switch is a pure class toggle. Any handler that DOES re-render must
// call rdgSaveScroll() first; renderReadingTest() restores from scrollMem.
function rdgSaveScroll() {
  const f = readingTestFlow;
  if (!f) return;
  const pp = document.getElementById("rdgPassagePane");
  const qp = document.getElementById("rdgQuestionsPane");
  // Only the visible pane has a real scrollTop - a display:none pane reads 0
  // and would clobber the position saved when it was last visible.
  if (pp && !pp.classList.contains("rdg-hidden")) f.scrollMem.passage = pp.scrollTop;
  if (qp && !qp.classList.contains("rdg-hidden")) f.scrollMem.questions = qp.scrollTop;
}

// Intro - renders INSIDE the normal chrome (same as the listening intro).
function readingTestIntroHTML() {
  const f = readingTestFlow;
  const p = f.payload;
  const drill = p.entryType === "drill";
  const total = rdgTotal(f);
  const minutes = rdgDurationMs(f) / 60000;
  return `
    <div class="rdg-intro fadeUp">
      <div class="eyebrow mono" style="color:#6EA8FF">META · LINGUA</div>
      <h1 class="fr rdg-intro-title">${drill ? "Reading Drill" : `IELTS ${esc(PRACTICE_LABELS[f.track] || "Academic")} Reading`}</h1>
      <p class="rdg-intro-subtitle">${drill ? `Drill Terfokus · ${total} Questions` : `Half Diagnostic · ${total} Questions`}</p>
      ${drill && p.focusCategory ? `<p class="why" style="margin:6px 0 0">Latihan kategori terlemahmu dari attempt sebelumnya: ${esc(rdgCategoryLabel(p.focusCategory))}.</p>` : ""}
      <div class="rdg-intro-stats">
        <div class="rdg-intro-stat"><div class="rdg-intro-stat-num fr">${total}</div><div class="rdg-intro-stat-label">pertanyaan</div></div>
        <div class="rdg-intro-stat"><div class="rdg-intro-stat-num fr">1</div><div class="rdg-intro-stat-label">passage</div></div>
        <div class="rdg-intro-stat"><div class="rdg-intro-stat-num fr">${minutes}</div><div class="rdg-intro-stat-label">menit</div></div>
      </div>
      <div class="rdg-intro-instr-label mono">KAMU AKAN MENJAWAB</div>
      <div class="rdg-intro-qlist">
        ${f.blocks.map((b) => `<div class="rdg-intro-qrow"><span class="mono rdg-intro-qrange">Q${esc(b.range)}</span><span>${esc(b.label)}</span></div>`).join("")}
      </div>
      <button class="btn-primary full rdg-intro-cta" id="rdgStart">Start Test</button>
      <button class="btn-ghost full" id="rdgCancel" style="margin-top:10px">← Batal</button>
    </div>`;
}

function rdgTopBarHTML(f) {
  return `
    <div class="rdg-topbar">
      <button class="rdg-back" id="rdgBack" aria-label="Keluar">‹</button>
      <div class="rdg-topbar-title">Reading Practice</div>
      <div class="rdg-timer mono" id="rdgTimer">${f.timerExpired ? "00:00" : lstnFormatMMSS(f.deadlineTs ? Math.max(0, f.deadlineTs - Date.now()) : rdgDurationMs(f))}</div>
    </div>`;
}

function rdgTabsHTML(f) {
  return `
    <div class="rdg-tabs">
      <button class="rdg-tab ${f.activeTab === "passage" ? "active" : ""}" data-rdg-tab="passage">Passage</button>
      <button class="rdg-tab ${f.activeTab === "questions" ? "active" : ""}" data-rdg-tab="questions">Questions</button>
    </div>`;
}

// Passage pane: paragraph-labelled long-form reading, no per-paragraph card
// chrome (design spec). Handles both the v2 {title, paragraphs} object and
// the flat string passages of drills/legacy payloads.
function rdgPassagePaneHTML(f) {
  const p = f.payload.passage;
  let inner;
  if (p && typeof p === "object" && Array.isArray(p.paragraphs)) {
    inner = `
      <div class="eyebrow mono rdg-passage-eyebrow">PASSAGE 1</div>
      <h2 class="fr rdg-passage-title">${esc(p.title)}</h2>
      ${p.paragraphs.map((par) => `
        <div class="rdg-para-label">Paragraph ${esc(par.label)}</div>
        <p class="rdg-para-text">${esc(par.text)}</p>`).join("")}`;
  } else {
    inner = `
      <div class="eyebrow mono rdg-passage-eyebrow">PASSAGE</div>
      <p class="rdg-para-text" style="white-space:pre-wrap">${esc(String(p || ""))}</p>`;
  }
  return `<div class="rdg-pane ${f.activeTab === "passage" ? "" : "rdg-hidden"}" id="rdgPassagePane">${inner}</div>`;
}

function rdgQuestionNumber(f, qid) {
  return f.payload.questions.findIndex((q) => q.id === qid) + 1;
}

function rdgQuestionHTML(f, q) {
  const num = rdgQuestionNumber(f, q.id);
  const chosen = f.answers[q.id];
  const flagged = !!f.flags[q.id];
  let answerHTML;
  if (q.type === "fill") {
    answerHTML = `
      <input type="text" class="rdg-input" data-rdg-fill="${esc(q.id)}" maxlength="60"
        placeholder="${q.maxWords ? `Maks. ${q.maxWords} kata` : "Jawabanmu..."}" value="${esc(chosen || "")}" />`;
  } else if (q.type === "matching") {
    answerHTML = `
      <div class="rdg-match-letters">
        ${(q.options || []).map((o) => `<button class="rdg-letter-badge ${chosen === o ? "active" : ""}" data-rdg-opt="${esc(q.id)}" data-rdg-value="${esc(o)}">${esc(o)}</button>`).join("")}
      </div>`;
  } else {
    const letters = ["A", "B", "C", "D", "E", "F"];
    answerHTML = `
      <div class="rdg-options">
        ${(q.options || []).map((o, i) => `
          <button class="rdg-option ${chosen === o ? "active" : ""}" data-rdg-opt="${esc(q.id)}" data-rdg-value="${esc(o)}">
            <span class="rdg-letter-badge">${q.type === "tf" ? esc(o[0]) : letters[i]}</span><span class="rdg-option-text">${esc(o)}</span>
          </button>`).join("")}
      </div>`;
  }
  return `
    <div class="rdg-question" id="rdgQ${num}">
      <div class="rdg-question-head">
        <span class="mono rdg-qnum">${num}</span>
        <p class="rdg-question-text">${esc(q.text)}</p>
        <button class="rdg-flag ${flagged ? "flagged" : ""}" data-rdg-flag="${esc(q.id)}" aria-label="Tandai untuk review">⚑</button>
      </div>
      ${answerHTML}
    </div>`;
}

// Questions pane: ONE block at a time (instruction header + its questions),
// "Question N of 20" + thin progress bar + overview icon at the top.
function rdgQuestionsPaneHTML(f) {
  const block = f.blocks[f.blockIndex];
  const total = rdgTotal(f);
  const answered = rdgAnsweredCount(f);
  const qs = block.questionIds.map((id) => f.payload.questions.find((q) => q.id === id)).filter(Boolean);
  const firstNum = rdgQuestionNumber(f, block.questionIds[0]);
  return `
    <div class="rdg-pane ${f.activeTab === "questions" ? "" : "rdg-hidden"}" id="rdgQuestionsPane">
      <div class="rdg-progress-row">
        <span class="rdg-progress-label">Question ${firstNum} of ${total}</span>
        <div class="rdg-progress-track"><div class="rdg-progress-fill" id="rdgProgressFill" style="width:${Math.round((answered / total) * 100)}%"></div></div>
        <button class="rdg-overview-btn" id="rdgOverviewBtn" aria-label="Ringkasan soal">▦</button>
      </div>
      <div class="rdg-block-head">
        <span class="mono rdg-block-eyebrow">QUESTIONS ${esc(block.range).replace("-", "–")}</span>
        <span class="rdg-block-chip">${esc(block.label)}</span>
      </div>
      <p class="rdg-instruction">${esc(block.instruction)}</p>
      ${qs.map((q) => rdgQuestionHTML(f, q)).join("")}
      ${f.error ? `<p class="rdg-error">${esc(f.error)}</p>` : ""}
    </div>`;
}

function rdgFooterHTML(f) {
  const total = rdgTotal(f);
  const last = f.blockIndex >= f.blocks.length - 1;
  return `
    <div class="rdg-foot">
      <span class="rdg-foot-count mono" id="rdgFootCount">${rdgAnsweredCount(f)}/${total} answered</span>
      <button class="rdg-foot-next" id="rdgFootNext">${last ? "Review Answers" : "Next →"}</button>
    </div>`;
}

// Overview sheet - compact per-block dot grid (answered/flagged/unanswered),
// tap a block to jump back to it. A sheet, not a permanent 20-circle grid
// (design spec).
function rdgOverviewSheetHTML(f) {
  return `
    <div class="help-overlay" id="rdgOverviewOverlay">
      <div class="help-sheet fadeUp rdg-sheet">
        <div class="eyebrow mono" style="margin:0 0 10px">RINGKASAN SOAL</div>
        ${f.blocks.map((b, bi) => `
          <button class="rdg-ov-block" data-rdg-jump="${bi}">
            <div class="rdg-ov-block-head">
              <span><b>Q${esc(b.range).replace("-", "–")}</b> ${esc(b.label)}</span>
              <span class="mono rdg-ov-count">${b.questionIds.filter((id) => String(f.answers[id] || "").trim()).length}/${b.questionIds.length}</span>
            </div>
            <div class="rdg-dots">
              ${b.questionIds.map((id) => `<span class="rdg-dot ${String(f.answers[id] || "").trim() ? "answered" : ""} ${f.flags[id] ? "flagged" : ""}">${rdgQuestionNumber(f, id)}</span>`).join("")}
            </div>
          </button>`).join("")}
        <p class="rdg-ov-legend mono">⚑ ${rdgFlaggedCount(f)} ditandai</p>
        <button class="btn-ghost full" id="rdgOverviewClose">Tutup</button>
      </div>
    </div>`;
}

// Review screen - the pre-submit step (design spec): answered/unanswered/
// flagged counts, per-block status dots, tap to jump back, then submit.
function rdgReviewHTML(f) {
  const total = rdgTotal(f);
  const answered = rdgAnsweredCount(f);
  const flagged = rdgFlaggedCount(f);
  return `
    <div class="rdg-review">
      <h1 class="fr rdg-review-title">Review Answers</h1>
      <p class="rdg-review-sub">Periksa sebelum submit. Kamu bisa kembali dan ubah jawaban.</p>
      ${f.timerExpired ? `<p class="rdg-error" style="margin:0 0 12px">Waktu habis — jawabanmu tetap tersimpan, cek lalu submit.</p>` : ""}
      <div class="rdg-review-stats">
        <div class="rdg-review-stat"><div class="rdg-review-stat-num fr" style="color:#8fbf9f">${answered}</div><div class="rdg-review-stat-label">Answered</div></div>
        <div class="rdg-review-stat"><div class="rdg-review-stat-num fr" style="color:#e8b768">${total - answered}</div><div class="rdg-review-stat-label">Unanswered</div></div>
        <div class="rdg-review-stat"><div class="rdg-review-stat-num fr" style="color:#c9564f">${flagged}</div><div class="rdg-review-stat-label">Flagged</div></div>
      </div>
      ${f.blocks.map((b, bi) => `
        <button class="rdg-ov-block" data-rdg-jump="${bi}">
          <div class="rdg-ov-block-head">
            <span><b>Q${esc(b.range).replace("-", "–")}</b> ${esc(b.label)}</span>
            <span class="mono rdg-ov-count">${b.questionIds.filter((id) => String(f.answers[id] || "").trim()).length}/${b.questionIds.length} dijawab</span>
          </div>
          <div class="rdg-dots">
            ${b.questionIds.map((id) => `<span class="rdg-dot ${String(f.answers[id] || "").trim() ? "answered" : ""} ${f.flags[id] ? "flagged" : ""}">${rdgQuestionNumber(f, id)}</span>`).join("")}
          </div>
        </button>`).join("")}
      ${f.error ? `<p class="rdg-error">${esc(f.error)}</p>` : ""}
    </div>
    <div class="rdg-foot">
      <button class="btn-ghost" id="rdgReviewBack" style="flex:0 0 auto">← Kembali</button>
      <button class="rdg-foot-next" id="rdgReviewSubmit">Submit jawaban</button>
    </div>`;
}

// In-shell structured result (design spec: score, band RANGE + confidence -
// never a point score - per-block strong/weak, Eleva note, collapsible
// wrong-answer review). Replaces the Home-chrome completedResult card for
// reading tests; the server-side reflection/Task 13 pipeline already ran.
function rdgResultHTML(f) {
  const r = f.result || {};
  const a = r.assessment || null;
  const cats = a?.categories?.breakdown || {};
  const catRow = (c) => {
    const b = cats[c];
    return `<div class="rdg-result-cat"><span>${esc(rdgCategoryLabel(c))}</span><span class="mono">${b ? `${b.correct}/${b.total}` : ""}</span></div>`;
  };
  const strong = a?.categories?.strong || [];
  const unstable = a?.categories?.unstable || [];
  const wrong = r.wrong || [];
  const note = r.mentorReply || a?.decision?.currentTarget || "";
  return `
    <div class="rdg-result">
      <div class="eyebrow mono rdg-result-eyebrow">READING RESULT</div>
      <div class="rdg-result-score fr">${r.score ?? "–"} / ${r.total ?? rdgTotal(f)}</div>
      ${a && a.band ? `
        <p class="rdg-result-band">Estimated Reading: <b>${a.band.rangeLow}–${a.band.rangeHigh}</b></p>
        <p class="rdg-result-band-meta mono">Confidence: ${esc(a.confidence || "Low")} · ${a.totalQuestions} questions observed</p>` : ""}
      <div class="rdg-result-block">
        <div class="eyebrow mono rdg-result-label" style="color:#8fbf9f">WHAT YOU DID WELL</div>
        ${strong.length ? strong.map(catRow).join("") : `<p class="rdg-result-neutral">Belum ada kategori yang menonjol di attempt ini.</p>`}
      </div>
      <div class="rdg-result-block">
        <div class="eyebrow mono rdg-result-label" style="color:#c9564f">NEEDS WORK</div>
        ${unstable.length ? unstable.map(catRow).join("") : `<p class="rdg-result-neutral">Tidak ada kategori yang jatuh di attempt ini.</p>`}
      </div>
      ${note ? `
      <div class="rdg-result-note">
        <div class="eyebrow mono" style="color:#e8a33d">YANG ELEVA LIHAT</div>
        <p>${esc(note)}</p>
        ${a?.decision?.nextTrial ? `<p class="rdg-result-next mono">Next: ${esc(a.decision.nextTrial)}</p>` : ""}
      </div>` : ""}
      ${wrong.length ? `
      <div class="rdg-result-block">
        <div class="eyebrow mono rdg-result-label">PEMBAHASAN SOAL YANG SALAH</div>
        ${wrong.map((w) => `
          <details class="rdg-wrong">
            <summary><span class="mono rdg-qnum">${rdgQuestionNumber(f, w.id) || ""}</span> ${esc(w.text.length > 80 ? w.text.slice(0, 80) + "…" : w.text)}</summary>
            <div class="rdg-wrong-body">
              <p class="mono">Jawabanmu: ${esc(w.yourAnswer || "-")} · Benar: ${esc(w.correctAnswer)}</p>
              ${w.explanation ? `<p>${esc(w.explanation)}</p>` : ""}
            </div>
          </details>`).join("")}
      </div>` : `<p class="rdg-result-neutral" style="text-align:center">Semua benar — mantap.</p>`}
      <button class="btn-primary full" id="rdgExit" style="margin-top:16px">Selesai</button>
    </div>`;
}

// Confirm sheets - same .help-overlay reuse as the listening diagnostic,
// with the same z-index override need (see styles.css #rdg*Overlay).
function rdgExitConfirmSheetHTML() {
  return `
    <div class="help-overlay" id="rdgExitConfirmOverlay">
      <div class="help-sheet fadeUp">
        <p>Keluar dari tes? Progres sesi ini tidak akan dinilai.</p>
        <div style="display:flex;gap:10px">
          <button class="btn-ghost" id="rdgExitStay" style="flex:1">Lanjutkan tes</button>
          <button class="btn-primary" id="rdgExitConfirm" style="flex:1">Keluar</button>
        </div>
      </div>
    </div>`;
}
function rdgSubmitConfirmSheetHTML(f) {
  const unanswered = rdgTotal(f) - rdgAnsweredCount(f);
  return `
    <div class="help-overlay" id="rdgSubmitConfirmOverlay">
      <div class="help-sheet fadeUp">
        <p>${unanswered} soal belum dijawab. Kamu masih bisa kembali dan melengkapinya.</p>
        <div style="display:flex;gap:10px">
          <button class="btn-ghost" id="rdgSubmitBack" style="flex:1">Kembali cek</button>
          <button class="btn-primary" id="rdgSubmitAnyway" style="flex:1">Submit anyway</button>
        </div>
      </div>
    </div>`;
}
function rdgTimeUpSheetHTML() {
  return `
    <div class="help-overlay" id="rdgTimeUpOverlay">
      <div class="help-sheet fadeUp">
        <p><b>Time is up.</b> Jawabanmu tetap tersimpan — lanjut ke review lalu submit.</p>
        <button class="btn-primary full" id="rdgTimeUpReview">Review & Submit</button>
      </div>
    </div>`;
}

// Full chrome bypass, same pattern as renderListeningDiagnosticTest. Both
// tab panes render together (hidden via .rdg-hidden) so tab switches are
// pure class toggles that keep each pane's scrollTop; after any re-render,
// scroll positions are restored from scrollMem.
function renderReadingTest() {
  const f = readingTestFlow;
  let inner;
  if (f.step === "result") inner = rdgResultHTML(f);
  else if (f.step === "review") inner = rdgReviewHTML(f);
  else inner = `${rdgTopBarHTML(f)}${rdgTabsHTML(f)}${rdgPassagePaneHTML(f)}${rdgQuestionsPaneHTML(f)}${rdgFooterHTML(f)}`;
  root.innerHTML = `
    <div class="rdg-shell">
      ${f.step === "review" ? rdgTopBarHTML(f) : ""}
      ${inner}
    </div>
    ${f.overviewOpen ? rdgOverviewSheetHTML(f) : ""}
    ${f.exitConfirmOpen ? rdgExitConfirmSheetHTML() : ""}
    ${f.submitConfirmOpen ? rdgSubmitConfirmSheetHTML(f) : ""}
    ${f.timeUpOpen ? rdgTimeUpSheetHTML() : ""}`;
  wireReadingTestHandlers();
  if (f.step === "active") {
    const pp = document.getElementById("rdgPassagePane");
    const qp = document.getElementById("rdgQuestionsPane");
    if (pp) pp.scrollTop = f.scrollMem.passage;
    if (qp) qp.scrollTop = f.scrollMem.questions;
    if (!f.timerExpired) rdgStartCountdown();
  }
}

function rdgUpdateFooterCount() {
  const f = readingTestFlow;
  if (!f) return;
  const el = document.getElementById("rdgFootCount");
  if (el) el.textContent = `${rdgAnsweredCount(f)}/${rdgTotal(f)} answered`;
  const fill = document.getElementById("rdgProgressFill");
  if (fill) fill.style.width = `${Math.round((rdgAnsweredCount(f) / rdgTotal(f)) * 100)}%`;
}

async function rdgDoSubmit() {
  const f = readingTestFlow;
  if (!f) return;
  rdgStopCountdown();
  f.submitConfirmOpen = false;
  f.error = "";
  root.innerHTML = spinnerHTML("Menilai jawaban...");
  try {
    const resp = await api("/api/practice-test/submit", { method: "POST", body: { questId: f.questId, answers: f.answers } });
    questCtaState.set(f.questId, "completed");
    // The structured result renders IN the shell (design spec) - do NOT set
    // completedResult, that would repeat the same data as a Home card. The
    // server already saved the reflection + Task 13 state; the exit button
    // refetches /api/state so Home/META reflect it.
    f.result = { score: resp.score, total: resp.total, wrong: resp.wrong || [], assessment: resp.assessment || null, mentorReply: resp.mentorReply || "" };
    f.step = "result";
  } catch (e) {
    f.error = e.message;
    f.step = "review";
  }
  renderDashboard();
}

function wireReadingTestHandlers() {
  const f = readingTestFlow;
  if (!f) return;

  // Intro (inside normal chrome)
  document.getElementById("rdgStart")?.addEventListener("click", () => {
    f.step = "active";
    renderDashboard();
  });
  document.getElementById("rdgCancel")?.addEventListener("click", () => {
    // Same convention as ptCancel/lstnCancel: client state only, the open
    // quest row stays open and never blocks anything.
    readingTestFlow = null;
    activeScreen = f.origin === "meta" ? "meta" : "home";
    renderDashboard();
  });

  // Top bar
  document.getElementById("rdgBack")?.addEventListener("click", () => {
    rdgSaveScroll();
    f.exitConfirmOpen = true;
    renderDashboard();
  });
  document.getElementById("rdgExitStay")?.addEventListener("click", () => {
    f.exitConfirmOpen = false;
    renderDashboard();
  });
  document.getElementById("rdgExitConfirm")?.addEventListener("click", () => {
    rdgStopCountdown();
    readingTestFlow = null;
    activeScreen = f.origin === "meta" ? "meta" : "home";
    renderDashboard();
  });

  // Tabs: pure class toggle - saves the outgoing pane's scrollTop, restores
  // the incoming one's. NO re-render, so neither pane loses its position.
  document.querySelectorAll("[data-rdg-tab]").forEach((btn) => btn.addEventListener("click", () => {
    const tab = btn.dataset.rdgTab;
    if (tab === f.activeTab) return;
    rdgSaveScroll();
    f.activeTab = tab;
    document.querySelectorAll("[data-rdg-tab]").forEach((b) => b.classList.toggle("active", b === btn));
    const pp = document.getElementById("rdgPassagePane");
    const qp = document.getElementById("rdgQuestionsPane");
    if (pp) { pp.classList.toggle("rdg-hidden", tab !== "passage"); pp.scrollTop = f.scrollMem.passage; }
    if (qp) { qp.classList.toggle("rdg-hidden", tab !== "questions"); qp.scrollTop = f.scrollMem.questions; }
  }));

  // Answers: surgical updates only (the listening scroll-reset lesson) -
  // mutate state, toggle .active in the tapped group, refresh counters.
  document.querySelectorAll("[data-rdg-opt]").forEach((btn) => btn.addEventListener("click", () => {
    const qid = btn.dataset.rdgOpt;
    f.answers[qid] = btn.dataset.rdgValue;
    document.querySelectorAll(`[data-rdg-opt="${qid}"]`).forEach((b) => b.classList.toggle("active", b === btn));
    rdgUpdateFooterCount();
  }));
  document.querySelectorAll("[data-rdg-fill]").forEach((input) => input.addEventListener("input", (e) => {
    f.answers[input.dataset.rdgFill] = e.target.value;
    rdgUpdateFooterCount();
  }));
  document.querySelectorAll("[data-rdg-flag]").forEach((btn) => btn.addEventListener("click", () => {
    const qid = btn.dataset.rdgFlag;
    f.flags[qid] = !f.flags[qid];
    btn.classList.toggle("flagged", !!f.flags[qid]);
  }));

  // Footer: next block (Questions scroll resets to top, Passage keeps its
  // position) or Review on the last block.
  document.getElementById("rdgFootNext")?.addEventListener("click", () => {
    rdgSaveScroll();
    if (f.blockIndex < f.blocks.length - 1) {
      f.blockIndex += 1;
      f.activeTab = "questions";
      f.scrollMem.questions = 0;
    } else {
      f.step = "review";
    }
    renderDashboard();
  });

  // Overview sheet
  document.getElementById("rdgOverviewBtn")?.addEventListener("click", () => {
    rdgSaveScroll();
    f.overviewOpen = true;
    renderDashboard();
  });
  document.getElementById("rdgOverviewClose")?.addEventListener("click", () => {
    f.overviewOpen = false;
    renderDashboard();
  });
  document.querySelectorAll("[data-rdg-jump]").forEach((btn) => btn.addEventListener("click", () => {
    rdgSaveScroll();
    f.blockIndex = Number(btn.dataset.rdgJump) || 0;
    f.activeTab = "questions";
    f.scrollMem.questions = 0;
    f.overviewOpen = false;
    f.step = "active";
    renderDashboard();
  }));

  // Review + submit
  document.getElementById("rdgReviewBack")?.addEventListener("click", () => {
    f.step = "active";
    f.activeTab = "questions";
    renderDashboard();
  });
  document.getElementById("rdgReviewSubmit")?.addEventListener("click", () => {
    if (rdgTotal(f) - rdgAnsweredCount(f) > 0) {
      f.submitConfirmOpen = true;
      renderDashboard();
      return;
    }
    rdgDoSubmit();
  });
  document.getElementById("rdgSubmitBack")?.addEventListener("click", () => {
    f.submitConfirmOpen = false;
    renderDashboard();
  });
  document.getElementById("rdgSubmitAnyway")?.addEventListener("click", () => rdgDoSubmit());

  // Timer expiry sheet - single path: review, never auto-submit.
  document.getElementById("rdgTimeUpReview")?.addEventListener("click", () => {
    f.timeUpOpen = false;
    f.step = "review";
    renderDashboard();
  });

  // Result exit: refetch state so Home/META reflect the saved reflection.
  document.getElementById("rdgExit")?.addEventListener("click", async () => {
    readingTestFlow = null;
    root.innerHTML = spinnerHTML("Memuat...");
    appState = await api("/api/state").catch(() => appState);
    activeScreen = f.origin === "meta" ? "meta" : "home";
    renderDashboard();
  });
}

// ==== Video Quest (video-quiz) =====================================
// Test-mode shell for the source-locked video assessment (LABORA design
// handoff), cloned from the rdg* family's architecture: chrome bypass via
// renderDashboard early-return, surgical answer updates, .help-overlay
// sheets (with the same z-index override need, see styles.css #vq*Overlay).
// One question per screen (design spec) instead of rdg's block panes.

function vqQuestionCount(f) {
  return f.questions ? f.questions.length : 15;
}
function vqAnswersFor(f, qid) {
  return Array.isArray(f.answers[qid]) ? f.answers[qid] : [];
}
function vqAnsweredCount(f) {
  return (f.questions || []).filter((q) => vqAnsweredCount.one(f, q.id)).length;
}
vqAnsweredCount.one = (f, qid) => vqAnswersFor(f, qid).length > 0;

// Flow constructor from an open quest day. A quest whose videoQuizState
// already carries a lock skips intro/pick entirely and lands on the locked
// view (design spec: re-entry never re-validates, never allows a swap).
function startVideoQuiz(day, origin) {
  const quest = day.quest || {};
  const vq = quest.videoQuiz || {};
  const st = quest.videoQuizState || null;
  videoQuizFlow = {
    questId: day.id, origin: origin || "home",
    topic: vq.topic || quest.title || "",
    passThreshold: vq.passThreshold ?? 11,
    estimatedMinutes: vq.estimatedMinutes ?? 25,
    step: st?.lockedVideoUrl ? "locked" : "intro",
    videoUrl: "", checking: false, checkError: "",
    materi: null,
    locked: st?.lockedVideoUrl ? { videoUrl: st.lockedVideoUrl, videoMeta: st.lockedVideoMeta || {}, videoId: st.lockedVideoId || null } : null,
    lastResult: st?.lastResult || null,
    attempt: st?.attempt || 1,
    questions: null, index: 0, answers: {},
    navOpen: false, sourceOpen: false, submitConfirmOpen: false, exitConfirmOpen: false,
    result: null, error: "",
  };
}

function vqVideoId(f) {
  const source = f.locked || f.materi;
  if (source?.videoId) return source.videoId;
  const m = String(source?.videoUrl || f.videoUrl || "").match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// The locked/candidate video card - thumbnail + title + external link (the
// design shows a thumbnail with "Buka Video", never an embedded player;
// closest existing precedent is the listening diagnostic's audio card).
function vqVideoCardHTML(f, videoMeta, videoUrl) {
  const vid = vqVideoId(f);
  const mins = videoMeta?.durationSec ? Math.round(videoMeta.durationSec / 60) : null;
  return `
    <div class="vq-video-card">
      <div class="vq-thumb">
        ${vid ? `<img src="https://img.youtube.com/vi/${esc(vid)}/hqdefault.jpg" alt="" loading="lazy" />` : ""}
        <span class="vq-thumb-play">▶</span>
      </div>
      <div class="vq-video-title">${esc(videoMeta?.title || "Video materi")}</div>
      ${videoMeta?.channel ? `<div class="vq-video-meta">${esc(videoMeta.channel)}${mins ? ` · ±${mins} menit` : ""}</div>` : ""}
      ${videoUrl ? `<a class="vq-video-link" href="${esc(videoUrl)}" target="_blank" rel="noopener noreferrer">Buka Video</a>` : ""}
    </div>`;
}

// Intro - renders INSIDE the normal chrome, same as the rdg/lstn intros.
function vqIntroHTML() {
  const f = videoQuizFlow;
  return `
    <div class="rdg-intro fadeUp">
      <div class="eyebrow mono" style="color:#FFC46E">META · LABORA</div>
      <h1 class="fr rdg-intro-title">Video Quest</h1>
      <p class="rdg-intro-subtitle">${esc(f.topic)}</p>
      <div class="rdg-intro-stats">
        <div class="rdg-intro-stat"><div class="rdg-intro-stat-num fr">15</div><div class="rdg-intro-stat-label">soal</div></div>
        <div class="rdg-intro-stat"><div class="rdg-intro-stat-num fr">≥${f.passThreshold}</div><div class="rdg-intro-stat-label">buat lulus</div></div>
        <div class="rdg-intro-stat"><div class="rdg-intro-stat-num fr">±${f.estimatedMinutes}</div><div class="rdg-intro-stat-label">menit</div></div>
      </div>
      <div class="rdg-intro-instr-label mono">CARA MAINNYA</div>
      <div class="rdg-intro-qlist">
        <div class="rdg-intro-qrow"><span class="mono rdg-intro-qrange">1</span><span>Cari satu video YouTube yang membahas topik ini</span></div>
        <div class="rdg-intro-qrow"><span class="mono rdg-intro-qrange">2</span><span>Pelajari videonya — setelah assessment dimulai, video dikunci sampai lulus</span></div>
        <div class="rdg-intro-qrow"><span class="mono rdg-intro-qrange">3</span><span>Jawab 15 soal dari isi video itu (${f.passThreshold}/15 buat lulus)</span></div>
      </div>
      <button class="btn-primary full rdg-intro-cta" id="vqStart">Mulai Quest</button>
      <button class="btn-ghost full" id="vqCancel" style="margin-top:10px">← Batal</button>
    </div>`;
}

function vqTopBarHTML(f, { lock = false, backId = "vqBack" } = {}) {
  return `
    <div class="vq-topbar">
      ${lock
        ? `<button class="vq-lock-btn" id="vqLockBtn" aria-label="Lihat materi terkunci">🔒</button>`
        : `<button class="rdg-back" id="${backId}" aria-label="Kembali">‹</button>`}
      <div class="vq-topbar-title">Assessment</div>
      <span style="width:34px;flex:none"></span>
    </div>`;
}

// "Pilih materi belajarmu" - URL input + Periksa Materi. A not-relevant
// verdict keeps the input so the user can paste a different link.
function vqPickHTML() {
  const f = videoQuizFlow;
  return `
    <div class="vq-topbar">
      <button class="rdg-back" id="vqPickBack" aria-label="Kembali">‹</button>
      <div class="vq-topbar-title"></div>
      <span style="width:34px;flex:none"></span>
    </div>
    <div class="vq-body">
      <h1 class="fr vq-h1">Pilih materi belajarmu</h1>
      <p class="vq-sub">Cari satu video YouTube yang membahas:</p>
      <p class="vq-topic">${esc(f.topic)}</p>
      <div class="eyebrow mono vq-field-label">LINK YOUTUBE</div>
      <input type="url" class="vq-input" id="vqUrlInput" placeholder="Tempel link YouTube..." value="${esc(f.videoUrl)}" ${f.checking ? "disabled" : ""} inputmode="url" autocomplete="off" />
      <div class="vq-note">Setelah assessment dimulai, video ini tidak dapat diganti sampai quest selesai.</div>
      ${f.checkError ? `<p class="vq-error">${esc(f.checkError)}</p>` : ""}
    </div>
    <div class="vq-foot-single">
      <button class="btn-primary full" id="vqCheckBtn" ${f.checking ? "disabled" : ""}>${f.checking ? "Memeriksa materi..." : "Periksa Materi"}</button>
    </div>`;
}

// "Materi siap" - relevance confirmed, one last chance to swap before the
// lock. Starting the assessment here is what locks the source server-side.
function vqReadyHTML() {
  const f = videoQuizFlow;
  return `
    <div class="vq-topbar">
      <button class="rdg-back" id="vqPickBack" aria-label="Kembali">‹</button>
      <div class="vq-topbar-title"></div>
      <span style="width:34px;flex:none"></span>
    </div>
    <div class="vq-body">
      <h1 class="fr vq-h1">Materi siap</h1>
      <p class="vq-sub vq-relevant">✓ Materi relevan dengan topik "${esc(f.topic)}"</p>
      ${f.materi?.rationale ? `<p class="vq-rationale">${esc(f.materi.rationale)}</p>` : ""}
      ${vqVideoCardHTML(f, f.materi?.videoMeta, f.videoUrl)}
      <div class="vq-note">Setelah assessment dimulai, video ini dikunci — tidak bisa diganti sampai kamu lulus.</div>
      ${f.error ? `<p class="vq-error">${esc(f.error)}</p>` : ""}
    </div>
    <div class="vq-foot-single">
      <button class="btn-primary full" id="vqBeginAssessment">Saya Sudah Belajar → Mulai Assessment</button>
      <button class="btn-ghost full" id="vqSwap" style="margin-top:10px">Ganti Video</button>
    </div>`;
}

// Source-locked landing: reachable on any re-entry while the quest is
// locked, and via "Pelajari Lagi" after a fail. Same video every time.
function vqLockedHTML() {
  const f = videoQuizFlow;
  const r = f.lastResult;
  return `
    <div class="vq-topbar">
      <button class="rdg-back" id="vqLockedBack" aria-label="Kembali">‹</button>
      <div class="vq-topbar-title"></div>
      <span style="width:34px;flex:none"></span>
    </div>
    <div class="vq-body vq-center">
      <div class="vq-lock-badge">🔒</div>
      <h1 class="fr vq-h1" style="text-align:center">Materi dikunci untuk quest ini</h1>
      <p class="vq-sub" style="text-align:center">Kamu akan menggunakan materi yang sama sampai lulus.</p>
      ${vqVideoCardHTML(f, f.locked?.videoMeta, f.locked?.videoUrl)}
      ${r && !r.passed && (r.weakConcepts || []).length ? `
        <div class="eyebrow mono vq-chips-label" style="color:var(--rust)">FOKUS ULANG</div>
        <div class="chip-row vq-chip-row">${r.weakConcepts.map((c) => `<span class="vq-chip vq-chip-weak">${esc(c)}</span>`).join("")}</div>` : ""}
      ${f.error ? `<p class="vq-error">${esc(f.error)}</p>` : ""}
      <p class="vq-muted">Materi bermasalah?</p>
    </div>
    <div class="vq-foot-single">
      ${r && !r.passed
        ? `<button class="btn-primary full" id="vqRetry">↻ Ulang Assessment</button>`
        : `<button class="btn-primary full" id="vqResume">Mulai Assessment</button>`}
    </div>`;
}

// One question per screen (design spec). format "single" renders radio-
// style rows; "multi" (exactly one per set) renders checkbox-style rows
// with a "pilih semua yang benar" helper - the app's first multi-select.
function vqAssessmentHTML() {
  const f = videoQuizFlow;
  const total = vqQuestionCount(f);
  const q = f.questions[f.index];
  const chosen = vqAnswersFor(f, q.id);
  const multi = q.format === "multi";
  return `
    ${vqTopBarHTML(f, { lock: true })}
    <div class="vq-progress-head">
      <button class="vq-progress-label" id="vqNavBtn">${esc(f.topic)} · <b>Soal ${f.index + 1} dari ${total}</b> ▾</button>
      <div class="rdg-progress-track vq-progress-track"><div class="rdg-progress-fill" style="width:${Math.round(((f.index + 1) / total) * 100)}%"></div></div>
    </div>
    <div class="vq-body" id="vqQuestionPane">
      <p class="vq-question-text">${esc(q.prompt)}</p>
      ${multi ? `<p class="vq-multi-hint mono">PILIH SEMUA JAWABAN YANG BENAR</p>` : ""}
      <div class="vq-options">
        ${q.options.map((o) => `
          <button class="vq-option ${chosen.includes(o.id) ? "active" : ""}" data-vq-opt="${esc(q.id)}" data-vq-value="${esc(o.id)}" data-vq-multi="${multi ? "1" : ""}">
            <span class="vq-indicator ${multi ? "vq-indicator-box" : ""}"></span>
            <span class="vq-option-text">${esc(o.text)}</span>
          </button>`).join("")}
      </div>
      ${f.error ? `<p class="vq-error">${esc(f.error)}</p>` : ""}
    </div>
    <div class="vq-foot">
      <button class="btn-ghost" id="vqPrev" style="flex:0 0 auto" ${f.index === 0 ? "disabled" : ""}>←</button>
      <button class="rdg-foot-next" id="vqNext">${f.index >= total - 1 ? "Review Jawaban" : "Lanjutkan"}</button>
    </div>`;
}

// Question navigator sheet - the rdg overview idea, flattened to one
// 15-dot grid (no blocks here).
function vqNavigatorSheetHTML(f) {
  return `
    <div class="help-overlay" id="vqNavOverlay">
      <div class="help-sheet fadeUp rdg-sheet">
        <div class="eyebrow mono" style="margin:0 0 10px">NAVIGASI SOAL</div>
        <div class="vq-grid">
          ${f.questions.map((q, i) => `<button class="vq-cell ${vqAnsweredCount.one(f, q.id) ? "answered" : ""} ${i === f.index ? "current" : ""}" data-vq-jump="${i}">${i + 1}</button>`).join("")}
        </div>
        <p class="rdg-ov-legend mono">${vqAnsweredCount(f)}/${vqQuestionCount(f)} dijawab</p>
        <button class="btn-ghost full" id="vqNavClose">Tutup</button>
      </div>
    </div>`;
}

// Source-locked bottom sheet: the lock icon's target during the assessment.
function vqSourceSheetHTML(f) {
  return `
    <div class="help-overlay" id="vqSourceOverlay">
      <div class="help-sheet fadeUp rdg-sheet">
        <div class="eyebrow mono" style="margin:0 0 10px">🔒 MATERI TERKUNCI</div>
        <p class="vq-sub" style="margin:0 0 12px">Kamu akan menggunakan materi yang sama sampai lulus.</p>
        ${vqVideoCardHTML(f, f.locked?.videoMeta, f.locked?.videoUrl)}
        <button class="btn-ghost full" id="vqSourceClose" style="margin-top:12px">Kembali ke soal</button>
      </div>
    </div>`;
}

function vqExitConfirmSheetHTML() {
  return `
    <div class="help-overlay" id="vqExitConfirmOverlay">
      <div class="help-sheet fadeUp">
        <p>Keluar dari assessment? Jawaban sesi ini tidak tersimpan, tapi materimu tetap terkunci untuk quest ini.</p>
        <div style="display:flex;gap:10px">
          <button class="btn-ghost" id="vqExitStay" style="flex:1">Lanjutkan</button>
          <button class="btn-primary" id="vqExitConfirm" style="flex:1">Keluar</button>
        </div>
      </div>
    </div>`;
}
function vqSubmitConfirmSheetHTML() {
  return `
    <div class="help-overlay" id="vqSubmitConfirmOverlay">
      <div class="help-sheet fadeUp">
        <p><b>Kirim jawaban?</b> Setelah dikirim, jawaban tidak dapat diubah.</p>
        <div style="display:flex;gap:10px">
          <button class="btn-ghost" id="vqSubmitBack" style="flex:1">Kembali cek</button>
          <button class="btn-primary" id="vqSubmitConfirm" style="flex:1">Kirim Jawaban</button>
        </div>
      </div>
    </div>`;
}

// "Review Jawaban" - answered-status grid, submit gated on 15/15 (design
// spec: no partial submits, unlike rdg's "Submit anyway").
function vqReviewHTML() {
  const f = videoQuizFlow;
  const total = vqQuestionCount(f);
  const answered = vqAnsweredCount(f);
  return `
    ${vqTopBarHTML(f, { lock: true })}
    <div class="vq-body">
      <h1 class="fr vq-h1">Review Jawaban</h1>
      <p class="vq-sub">${answered} dari ${total} soal telah dijawab.</p>
      <div class="vq-grid vq-grid-review">
        ${f.questions.map((q, i) => `<button class="vq-cell ${vqAnsweredCount.one(f, q.id) ? "answered" : ""}" data-vq-jump="${i}">${i + 1}</button>`).join("")}
      </div>
      <div class="vq-note">Setelah dikirim, jawaban tidak dapat diubah.</div>
      ${f.error ? `<p class="vq-error">${esc(f.error)}</p>` : ""}
    </div>
    <div class="vq-foot-single">
      <button class="btn-primary full" id="vqSubmit" ${answered < total ? "disabled" : ""}>Kirim Jawaban</button>
      <button class="btn-ghost full" id="vqReviewBack" style="margin-top:10px">← Kembali ke soal</button>
    </div>`;
}

// Result: pass (score, strong/weak chips, pembahasan, finish) or fail
// (BELUM LULUS, FOKUS ULANG chips, Pelajari Lagi / Ulang Assessment).
function vqResultHTML() {
  const f = videoQuizFlow;
  const r = f.result;
  const chips = (list, cls) => `<div class="chip-row vq-chip-row">${list.map((c) => `<span class="vq-chip ${cls}">${esc(c)}</span>`).join("")}</div>`;
  if (r.passed) {
    return `
      <div class="vq-body vq-result">
        <div class="vq-result-score"><span class="fr vq-score-big" style="color:var(--growth)">${r.score}</span><span class="fr vq-score-total"> / ${r.total}</span></div>
        <div class="eyebrow mono vq-verdict" style="color:var(--growth)">LULUS</div>
        ${r.mentorReply ? `<p class="vq-sub">${esc(r.mentorReply)}</p>` : `<p class="vq-sub">Kamu membuktikan pemahamanmu dari materi yang kamu pilih sendiri.</p>`}
        ${(r.strongConcepts || []).length ? `<div class="eyebrow mono vq-chips-label" style="color:var(--growth)">KONSEP KUAT</div>${chips(r.strongConcepts, "vq-chip-strong")}` : ""}
        ${(r.weakConcepts || []).length ? `<div class="eyebrow mono vq-chips-label" style="color:var(--rust)">MASIH BISA DIPERKUAT</div>${chips(r.weakConcepts, "vq-chip-weak")}` : ""}
      </div>
      <div class="vq-foot-single">
        <button class="btn-ghost full" id="vqPembahasan">Lihat Pembahasan</button>
        <button class="btn-primary full" id="vqFinish" style="margin-top:10px">Selesaikan Quest</button>
      </div>`;
  }
  return `
    <div class="vq-body vq-result">
      <div class="vq-result-score"><span class="fr vq-score-big" style="color:var(--rust)">${r.score}</span><span class="fr vq-score-total"> / ${r.total}</span></div>
      <div class="eyebrow mono vq-verdict" style="color:var(--rust)">BELUM LULUS</div>
      <p class="vq-sub">Kamu sudah dekat. Perkuat beberapa konsep sebelum mencoba lagi.</p>
      ${(r.weakConcepts || []).length ? `<div class="eyebrow mono vq-chips-label" style="color:var(--rust)">FOKUS ULANG</div>${chips(r.weakConcepts, "vq-chip-weak")}` : ""}
      ${f.error ? `<p class="vq-error">${esc(f.error)}</p>` : ""}
    </div>
    <div class="vq-foot-single">
      <button class="btn-ghost full" id="vqStudyAgain">▶ Pelajari Lagi</button>
      <button class="btn-primary full" id="vqRetry" style="margin-top:10px">↻ Ulang Assessment</button>
    </div>`;
}

// Pembahasan (pass only): per-question review from the submit response -
// same <details> treatment as rdg's wrong-answer review, but covering all
// 15 (correct ones collapsed too, the design's full answer review).
function vqPembahasanHTML() {
  const f = videoQuizFlow;
  const review = f.result?.review || [];
  const optText = (q, ids) => (ids || []).map((id) => {
    const o = (q.options || []).find((x) => x.id === id);
    return o ? o.text : id;
  }).join(" · ") || "-";
  return `
    ${vqTopBarHTML(f, { backId: "vqPembahasanBack" })}
    <div class="vq-body">
      <h1 class="fr vq-h1">Pembahasan</h1>
      <p class="vq-sub">${esc(f.topic)} · ${f.result.score}/${f.result.total}</p>
      ${review.map((w, i) => `
        <details class="rdg-wrong ${w.isCorrect ? "vq-correct" : ""}">
          <summary><span class="mono rdg-qnum" style="${w.isCorrect ? "color:var(--growth)" : "color:var(--rust)"}">${i + 1}</span> ${esc(w.prompt.length > 80 ? w.prompt.slice(0, 80) + "…" : w.prompt)}</summary>
          <div class="rdg-wrong-body">
            <p class="mono">Jawabanmu: ${esc(optText(w, w.yourAnswer))}</p>
            <p class="mono">Benar: ${esc(optText(w, w.correct))}</p>
            ${w.explanation ? `<p>${esc(w.explanation)}</p>` : ""}
          </div>
        </details>`).join("")}
    </div>
    <div class="vq-foot-single">
      <button class="btn-primary full" id="vqFinish">Selesaikan Quest</button>
    </div>`;
}

// Full chrome bypass, same pattern as renderReadingTest.
function renderVideoQuiz() {
  const f = videoQuizFlow;
  let inner;
  if (f.step === "pick") inner = vqPickHTML();
  else if (f.step === "ready") inner = vqReadyHTML();
  else if (f.step === "locked") inner = vqLockedHTML();
  else if (f.step === "review") inner = vqReviewHTML();
  else if (f.step === "result") inner = vqResultHTML();
  else if (f.step === "pembahasan") inner = vqPembahasanHTML();
  else inner = vqAssessmentHTML();
  root.innerHTML = `
    <div class="rdg-shell vq-shell">${inner}</div>
    ${f.navOpen ? vqNavigatorSheetHTML(f) : ""}
    ${f.sourceOpen ? vqSourceSheetHTML(f) : ""}
    ${f.submitConfirmOpen ? vqSubmitConfirmSheetHTML() : ""}
    ${f.exitConfirmOpen ? vqExitConfirmSheetHTML() : ""}`;
  wireVideoQuizHandlers();
}

// "Periksa Materi": server fetches the transcript + judges relevance. A
// not-relevant verdict keeps the pick step (rationale shown, input kept).
async function vqDoValidate() {
  const f = videoQuizFlow;
  if (!f || f.checking) return;
  const url = String(document.getElementById("vqUrlInput")?.value || "").trim();
  f.videoUrl = url;
  if (!url) {
    f.checkError = "Tempel link video YouTube dulu.";
    renderDashboard();
    return;
  }
  f.checking = true;
  f.checkError = "";
  renderDashboard();
  try {
    const resp = await api("/api/video-quiz/validate", { method: "POST", body: { questId: f.questId, videoUrl: url } });
    f.checking = false;
    if (!resp.relevant) {
      f.checkError = resp.rationale || `Video ini belum membahas "${f.topic}". Coba video lain.`;
    } else {
      f.materi = { videoMeta: resp.videoMeta, videoId: resp.videoMeta?.videoId || null, rationale: resp.rationale || "" };
      f.step = "ready";
    }
  } catch (e) {
    f.checking = false;
    f.checkError = e.message;
  }
  renderDashboard();
}

// /start: FIRST START locks the candidate video server-side; RESUME returns
// the same set idempotently; retry=true regenerates from the same locked
// transcript ("Ulang Assessment").
async function vqDoStart(retry) {
  const f = videoQuizFlow;
  if (!f) return;
  f.error = "";
  root.innerHTML = spinnerHTML(retry ? "Menyusun set soal baru dari materimu..." : "Menyusun soal dari materimu...");
  try {
    const resp = await api("/api/video-quiz/start", { method: "POST", body: { questId: f.questId, ...(retry ? { retry: true } : {}) } });
    f.locked = resp.locked;
    f.attempt = resp.attempt;
    f.passThreshold = resp.passThreshold ?? f.passThreshold;
    f.questions = resp.questions;
    f.index = 0;
    f.answers = {};
    f.result = null;
    f.step = "assessment";
  } catch (e) {
    f.error = e.message;
    // A failed FIRST start leaves the video unlocked server-side - stay
    // where the user was so they can retry or swap.
    if (f.step !== "locked" && f.step !== "result") f.step = f.materi ? "ready" : "pick";
  }
  renderDashboard();
}

async function vqDoSubmit() {
  const f = videoQuizFlow;
  if (!f) return;
  f.submitConfirmOpen = false;
  f.error = "";
  root.innerHTML = spinnerHTML("Menilai jawaban...");
  try {
    const resp = await api("/api/video-quiz/submit", { method: "POST", body: { questId: f.questId, answers: f.answers } });
    f.result = resp;
    f.lastResult = { score: resp.score, total: resp.total, passed: resp.passed, strongConcepts: resp.strongConcepts, weakConcepts: resp.weakConcepts };
    if (resp.passed) questCtaState.set(f.questId, "completed");
    f.step = "result";
  } catch (e) {
    f.error = e.message;
    f.step = "review";
  }
  renderDashboard();
}

function wireVideoQuizHandlers() {
  const f = videoQuizFlow;
  if (!f) return;

  // Intro (inside normal chrome)
  document.getElementById("vqStart")?.addEventListener("click", () => {
    f.step = f.locked ? "locked" : "pick";
    renderDashboard();
  });
  document.getElementById("vqCancel")?.addEventListener("click", () => {
    videoQuizFlow = null;
    activeScreen = f.origin === "meta" ? "meta" : "home";
    renderDashboard();
  });

  // Pick / ready / locked navigation. Backing out is client-state only -
  // the open quest row stays open (same convention as rdgCancel).
  document.getElementById("vqPickBack")?.addEventListener("click", () => {
    if (f.step === "ready") { f.step = "pick"; renderDashboard(); return; }
    f.step = "intro";
    renderDashboard();
  });
  document.getElementById("vqLockedBack")?.addEventListener("click", () => {
    videoQuizFlow = null;
    activeScreen = f.origin === "meta" ? "meta" : "home";
    renderDashboard();
  });
  document.getElementById("vqCheckBtn")?.addEventListener("click", () => vqDoValidate());
  document.getElementById("vqUrlInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") vqDoValidate();
  });
  document.getElementById("vqSwap")?.addEventListener("click", () => {
    f.materi = null;
    f.step = "pick";
    renderDashboard();
  });
  document.getElementById("vqBeginAssessment")?.addEventListener("click", () => vqDoStart(false));
  document.getElementById("vqResume")?.addEventListener("click", () => vqDoStart(false));
  document.getElementById("vqRetry")?.addEventListener("click", () => vqDoStart(true));

  // Assessment top bar: back = exit confirm, lock = source sheet.
  document.getElementById("vqBack")?.addEventListener("click", () => {
    f.exitConfirmOpen = true;
    renderDashboard();
  });
  document.getElementById("vqExitStay")?.addEventListener("click", () => {
    f.exitConfirmOpen = false;
    renderDashboard();
  });
  document.getElementById("vqExitConfirm")?.addEventListener("click", () => {
    videoQuizFlow = null;
    activeScreen = f.origin === "meta" ? "meta" : "home";
    renderDashboard();
  });
  document.getElementById("vqLockBtn")?.addEventListener("click", () => {
    f.sourceOpen = true;
    renderDashboard();
  });
  document.getElementById("vqSourceClose")?.addEventListener("click", () => {
    f.sourceOpen = false;
    renderDashboard();
  });

  // Answers: surgical updates only (the rdg scroll lesson). Single-select
  // replaces the choice; the multi question toggles membership.
  document.querySelectorAll("[data-vq-opt]").forEach((btn) => btn.addEventListener("click", () => {
    const qid = btn.dataset.vqOpt;
    const value = btn.dataset.vqValue;
    if (btn.dataset.vqMulti) {
      const current = vqAnswersFor(f, qid);
      f.answers[qid] = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      btn.classList.toggle("active", f.answers[qid].includes(value));
    } else {
      f.answers[qid] = [value];
      document.querySelectorAll(`[data-vq-opt="${qid}"]`).forEach((b) => b.classList.toggle("active", b === btn));
    }
  }));

  // Footer: prev/next; last question's next goes to Review.
  document.getElementById("vqPrev")?.addEventListener("click", () => {
    if (f.index > 0) { f.index -= 1; renderDashboard(); }
  });
  document.getElementById("vqNext")?.addEventListener("click", () => {
    if (f.index < vqQuestionCount(f) - 1) f.index += 1;
    else f.step = "review";
    renderDashboard();
  });

  // Navigator sheet + jump cells (also on the Review grid).
  document.getElementById("vqNavBtn")?.addEventListener("click", () => {
    f.navOpen = true;
    renderDashboard();
  });
  document.getElementById("vqNavClose")?.addEventListener("click", () => {
    f.navOpen = false;
    renderDashboard();
  });
  document.querySelectorAll("[data-vq-jump]").forEach((btn) => btn.addEventListener("click", () => {
    f.index = Number(btn.dataset.vqJump) || 0;
    f.navOpen = false;
    f.step = "assessment";
    renderDashboard();
  }));

  // Review + submit (gated on 15/15 via the disabled attribute).
  document.getElementById("vqReviewBack")?.addEventListener("click", () => {
    f.step = "assessment";
    renderDashboard();
  });
  document.getElementById("vqSubmit")?.addEventListener("click", () => {
    f.submitConfirmOpen = true;
    renderDashboard();
  });
  document.getElementById("vqSubmitBack")?.addEventListener("click", () => {
    f.submitConfirmOpen = false;
    renderDashboard();
  });
  document.getElementById("vqSubmitConfirm")?.addEventListener("click", () => vqDoSubmit());

  // Result paths.
  document.getElementById("vqStudyAgain")?.addEventListener("click", () => {
    f.step = "locked";
    renderDashboard();
  });
  document.getElementById("vqPembahasan")?.addEventListener("click", () => {
    f.step = "pembahasan";
    renderDashboard();
  });
  document.getElementById("vqPembahasanBack")?.addEventListener("click", () => {
    f.step = "result";
    renderDashboard();
  });
  document.getElementById("vqFinish")?.addEventListener("click", async () => {
    videoQuizFlow = null;
    root.innerHTML = spinnerHTML("Memuat...");
    appState = await api("/api/state").catch(() => appState);
    activeScreen = f.origin === "meta" ? "meta" : "home";
    renderDashboard();
  });
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

// Renders one open quest as a card - goalLabel names which of the user's
// (up to 3) goals this specific card is working toward - essential once
// more than one card can be on screen at once.
// Provisional 24h countdown (founder request, 10 Agustus - explicitly
// "sementara" while the real next solution gets figured out later): this
// client-side 24h math ONLY drives the cosmetic "Waktu habis" label/color
// (questUrgency) - it stays intentionally unchanged as the label threshold.
// UPDATE (round 40): the server now DOES auto-close+replace a quest, but
// only past a real 28h rolling deadline (server/index.js's expiry loop +
// resolveExpiredQuest) - the old "known, accepted gap, no automatic
// recovery" note above is now closed. The [data-quest-countdown]
// disable-at-24h branch below this comment stays dead/cosmetic (no
// template in the current quest-hub build ever emits that attribute) -
// the real CTA lockout lives in renderDashboard's selectedExpired, which
// now uses the 28h threshold to match the server, not this one.
function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
  // Compact quest-hub cards (Eleva Home redesign) - same live-tick idea,
  // different 4-tier label/color rule (questUrgency), extended onto the
  // same shared ticker rather than a second setInterval.
  document.querySelectorAll("[data-qh-countdown]").forEach((el) => {
    const created = new Date(el.dataset.created).getTime();
    const remaining = created + 24 * 60 * 60 * 1000 - now;
    const { label, colorVar } = questUrgency(remaining);
    el.textContent = label;
    el.style.color = colorVar;
  });
}
function ensureCountdownTicking() {
  tickCountdowns();
  if (countdownTimer) return;
  countdownTimer = setInterval(tickCountdowns, 1000);
}

// Eleva Home redesign (design handoff, 15 Agustus): 4-tier time-urgency
// rule for the compact quest hub's per-card remaining-time chip - distinct
// from formatCountdown's single HH:MM:SS/1h-threshold shape above (that one
// stays exactly as-is, still used wherever it's still called). Reuses the
// exact same createdAt+24h deadline math as questSummaryCard (line ~3550) -
// no new deadline source, this is purely a different label/color mapping
// of the same remaining-ms value.
function questUrgency(remainingMs) {
  if (remainingMs == null) return { label: "", colorVar: "var(--qh-muted)" };
  if (remainingMs <= 0) return { label: "Waktu habis", colorVar: "var(--qh-red)" };
  const hours = remainingMs / 3600000;
  if (hours > 4) return { label: `${Math.floor(hours)} jam`, colorVar: "var(--qh-muted)" };
  if (hours >= 1) return { label: `${Math.floor(hours)} jam`, colorVar: "var(--qh-orange)" };
  const mins = Math.max(1, Math.ceil(remainingMs / 60000));
  return { label: `${mins} menit`, colorVar: "var(--qh-red)" };
}

// Quest-category icons for the compact quest hub - covers every real
// completionType/structuredKind combination this app actually generates
// (not just the design handoff's own 3 mocked icons: headphones/utensils/
// heart), so no real quest type silently falls back to the generic default.
// Same switch-keyed size/color signature as realmIconSVG (line ~3946) -
// circle-outline treatment is applied by the caller's wrapping .qhub-icon,
// not baked into the SVG itself, same separation realmIconSVG uses.
function questCategoryIconSVG(quest, size, color) {
  const key = quest?.completionType === "structured-physical" ? (quest.structuredKind || "gym") : (quest?.completionType || "reflective");
  const common = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" style="flex:none"`;
  switch (key) {
    case "cardio":
      return `<svg ${common}><path d="M3 12h4l2-6 4 12 2-6h6" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
    case "gym":
      return `<svg ${common}><path d="M6 8v8M18 8v8" stroke-linecap="round"></path><rect x="3" y="9" width="3" height="6" rx="1"></rect><rect x="18" y="9" width="3" height="6" rx="1"></rect><line x1="6" y1="12" x2="18" y2="12"></line></svg>`;
    case "recovery":
      return `<svg ${common}><path d="M12 20s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 5c-2.5 4.65-9.5 9-9.5 9z"></path></svg>`;
    case "practice-test":
      return `<svg ${common}><path d="M4 14v-2a8 8 0 0 1 16 0v2"></path><rect x="2.5" y="13" width="4" height="7" rx="2"></rect><rect x="17.5" y="13" width="4" height="7" rx="2"></rect></svg>`;
    case "job-match-analysis":
      return `<svg ${common}><rect x="4" y="3" width="10" height="14" rx="1"></rect><line x1="7" y1="7" x2="11" y2="7"></line><line x1="7" y1="10" x2="11" y2="10"></line><circle cx="16" cy="16" r="4"></circle><line x1="19" y1="19" x2="22" y2="22"></line></svg>`;
    case "job-application-submit":
      return `<svg ${common}><path d="M22 2L11 13"></path><path d="M22 2l-7 20-4-9-9-4z"></path></svg>`;
    case "nutrition-log":
      return `<svg ${common}><path d="M6 2v6a2 2 0 0 0 4 0V2M7 2v6" stroke-linecap="round"></path><line x1="7" y1="8" x2="7" y2="22"></line><path d="M17 2v9c0 1.5-1 2-1 2v9" stroke-linecap="round"></path></svg>`;
    case "video-quiz":
      return `<svg ${common}><rect x="2.5" y="5" width="19" height="14" rx="2"></rect><path d="M10 9.5l5 2.5-5 2.5z" stroke-linejoin="round"></path></svg>`;
    case "multi-domain":
      return `<svg ${common}><path d="M12 20s-6-3.8-8.5-8A5 5 0 0 1 12 6a5 5 0 0 1 8.5 6c-2.5 4.2-8.5 8-8.5 8z"></path><path d="M9 11h6M12 8v6" stroke-linecap="round"></path></svg>`;
    case "reflective":
    default:
      return `<svg ${common}><circle cx="12" cy="12" r="9"></circle><path d="M15 9l-2 5-5 2 2-5z"></path></svg>`;
  }
}

// "Selesai ketika" checklist (design handoff) - derived from evidenceSchema/
// completionType since no dod:string[] field exists server-side. Always
// returns at least one bullet (falls back to the quest's own description)
// so the checklist section is never empty.
function deriveDoDChecklist(quest) {
  const items = [];
  const es = quest.evidenceSchema;
  if (quest.completionType === "structured-physical" && es) {
    if (es.activityType) items.push(`Aktivitas: ${es.activityType}`);
    if (es.metricType === "distance" && es.target) items.push(`Jarak minimal ${es.target} km`);
    if (es.metricType === "reps" && es.target) items.push(`${es.target} repetisi/set`);
    if (es.metricType === "recovery") items.push("Catat tidur, air, makan berprotein, dan level nyeri");
  } else if (quest.completionType === "practice-test") {
    items.push("Selesaikan seluruh set latihan dan submit jawaban");
  } else if (quest.completionType === "job-match-analysis") {
    items.push("Upload lowongan dan lihat hasil match score-nya");
  } else if (quest.completionType === "job-application-submit") {
    items.push("Lengkapi detail lamaran dan submit");
  } else if (quest.completionType === "nutrition-log") {
    items.push("Catat semua makan hari ini sampai target tercapai");
  } else if (quest.completionType === "video-quiz") {
    items.push("Pilih & kunci satu video YouTube yang relevan dengan topiknya");
    items.push(`Jawab 15 soal dari materi video itu (lulus ≥ ${quest.videoQuiz?.passThreshold ?? 11}/15)`);
  } else if (quest.completionType === "multi-domain") {
    items.push("2 area utama · Recovery + Nutrition");
  }
  if (!items.length) items.push(quest.description);
  return items;
}

// CTA label state machine (design handoff): "Mulai Quest" -> "Lanjutkan"
// -> "Lihat Hasil". nutrition-log keeps its existing always-open "Lanjut
// Catat" special case unchanged (SOMA Nutrition Part B item 7 - no single
// "Selesai" moment the button triggers), matching questSummaryCard's own
// isNutrition branch above.
function questCtaLabel(quest, id) {
  if (quest?.completionType === "nutrition-log") return "Lanjut Catat";
  const st = questCtaState.get(id);
  if (st === "completed") return "Lihat Hasil";
  if (st === "started") return "Lanjutkan";
  return "Mulai Quest";
}

// Compact quest-hub row (design handoff): up to 3 equal-width cards, tap
// selects in place - never reorders, matches the exact interaction shape
// already proven by Pilih Pathway's .ppick-col (onboarding, tap sets an
// index + re-render, selected card gets a glow, cards never move).
function questHubCardsHTML(quests) {
  const activeIdx = Math.min(selectedQuestIndex ?? 0, quests.length - 1);
  return `
    <div class="qhub-row">
      ${quests.map((q, i) => {
        const remaining = q.createdAt ? new Date(q.createdAt).getTime() + 24 * 60 * 60 * 1000 - Date.now() : null;
        const { label, colorVar } = questUrgency(remaining);
        // SOMA Nutrition Part B item 7: a PROGRESSIVE nutrition-log quest's
        // live "Meals X/Y" progress is more useful here than a static
        // description snippet - same info questSummaryCard used to surface
        // before the Home redesign, just relocated to the compact card.
        const summary = q.quest.completionType === "nutrition-log" && q.quest.progressive
          ? nutritionProgressLabel(q.quest.progressive)
          : q.quest.completionType === "multi-domain"
          ? mdqFeatureLabelJoin(q.quest, false)
          : (q.quest.description || "").split(/(?<=[.!?])\s/)[0];
        return `
        <button class="qhub-card ${i === activeIdx ? "selected" : ""}" data-qhub-idx="${i}">
          <div class="qhub-icon">${questCategoryIconSVG(q.quest, 18, "#e8a33d")}</div>
          <div class="qhub-title fr">${esc(q.quest.title)}</div>
          <div class="qhub-summary">${esc(summary)}</div>
          <div class="qhub-time mono" style="color:${colorVar}" data-qh-countdown="${q.id}" data-created="${esc(q.createdAt)}">${esc(label)}</div>
        </button>`;
      }).join("")}
    </div>`;
}

// Detail panel (design handoff) for whichever quest is currently selected.
// "Menuju target" stays visible above the why-accordion, never hidden
// behind it, per the spec's own explicit rule. The why-accordion reuses
// reasonOpenIds/[data-reason-toggle] unchanged - already keyed by quest id,
// already expands in place with no remount. The CTA keeps the exact
// data-reflect-id attribute and fires the existing click cascade
// (beginStructuredOrReflectiveFlow + the 4 special-flow branches) -
// nothing about quest completion itself changes, only what feeds the
// button's label/disabled state is new.
// SOMA Training feedback brief (20 Agustus), item 3: this eyebrow used to be
// built inline (questDetailPanelHTML only) with a separate, independently-
// added "Body: Training" SOMA sub-label and multi-domain feature suffix -
// every other Movement screen rolled its own separate/inconsistent header
// (or none at all). Extracted so questDetailPanelHTML/Preview/Pre-Start/
// Active Session/Evidence/Submitted all render the exact same string,
// keeping the multi-domain suffix and Training sub-label intact, with a
// chain-badge branch (quest.chain, set by the Recovery->Nutrition->Training
// chain feature) taking priority over all of it when present.
function questEyebrowHTML(quest) {
  const isMultiDomain = quest.completionType === "multi-domain";
  const somaSubLabel = quest.primaryFeature === "MOVEMENT" ? "Training" : "";
  const base = `QUEST HARI INI${quest.statFocus ? " · " + esc(statLabel(quest.statFocus)).toUpperCase() + (somaSubLabel ? ": " + esc(somaSubLabel).toUpperCase() : "") : ""}${isMultiDomain ? " • " + esc(mdqFeatureLabelJoin(quest, true)) : ""}`;
  const text = quest.chain ? `BODY · ${esc(quest.chain.label).toUpperCase()} · Langkah ${quest.chain.step}/${quest.chain.total}` : base;
  return `<div class="qhub-eyebrow mono">${text}</div>`;
}

function questDetailPanelHTML(q, goalLabel, ctaLabel, ctaDisabled) {
  const reasonOpen = reasonOpenIds.has(q.id);
  const dod = deriveDoDChecklist(q.quest);
  return `
    <div class="qhub-detail">
      ${questEyebrowHTML(q.quest)}
      ${goalLabel ? `<div class="qhub-target">Menuju target: <span class="qhub-target-value">${esc(goalLabel)}</span></div>` : ""}
      <h2 class="fr qhub-detail-title">${esc(q.quest.title)}</h2>
      <p class="qhub-detail-desc">${esc(q.quest.description)}</p>
      ${q.quest.completionType === "nutrition-log" && q.quest.progressive ? `<p class="qhub-target mono" style="color:var(--qh-gold)">${esc(nutritionProgressLabel(q.quest.progressive))}</p>` : ""}
      ${mdqHomeInfoRowHTML(q.quest, goalLabel)}
      <div class="qhub-dod-label mono">SELESAI KETIKA</div>
      ${mdqHomeChecklistHTML(q.quest, dod)}
      <div class="qhub-detail-foot">
        <span class="qhub-duration mono">±30 menit</span>
        <button class="btn-primary" data-reflect-id="${q.id}" ${ctaDisabled ? "disabled" : ""}>${esc(ctaLabel)}</button>
      </div>
      <button class="qhub-why-toggle" data-reason-toggle="${q.id}">Kenapa Eleva kasih quest ini? <span class="qhub-why-arrow">${reasonOpen ? "↑" : "↓"}</span></button>
      ${reasonOpen ? `<p class="qhub-why fadeUp">${esc(q.quest.why)}</p>` : ""}
    </div>`;
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
        ${r.status === "COMPLETED" ? "SELESAI" : r.status === "PARTIAL" ? "SEBAGIAN" : "DILEWATI"}
      </div>
      ${r.structuredData ? `<div class="mono" style="font-size:12px;color:var(--muted);margin:0 0 8px">${esc(structSummary(r.structuredData))}</div>` : ""}
      ${r.structuredData?.kind === "gym-session" ? gymSessionEvalHTML(r.structuredData.evaluation) : ""}
      ${r.jobApplication ? `<div class="mono" style="font-size:12px;color:var(--muted);margin:0 0 8px">${esc(jobApplicationSummary(r.jobApplication))}</div>` : ""}
      ${r.multiDomainSummary ? `<div class="mono" style="font-size:12px;color:var(--muted);margin:0 0 8px">Recovery ✓ / Nutrition ✓</div>` : ""}
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

// Eleva Home redesign (design handoff, 15 Agustus): header is now date
// (left) + centered "ELEVA" wordmark + help "?" and settings gear (right,
// circular orange-outline). Dropped the avatar-initial button - the new
// spec's header has no avatar slot; #headerSettings alone keeps routing to
// Settings (unchanged), which is also how Settings stays reachable now
// that its bottom-tab entry is gone (see TAB_ITEMS below).
function appHeaderHTML(s, extraIconsHTML) {
  return `
    <div class="app-header qhub-header">
      <div class="mono header-date">${todayLabel().toUpperCase()}</div>
      <div class="qhub-wordmark fr">ELEVA</div>
      <div class="header-icons">
        ${extraIconsHTML || ""}
        <button class="header-icon-btn qhub-icon-btn" id="headerSettings" aria-label="Settings">⚙</button>
      </div>
    </div>`;
}
// Eleva Home redesign: exactly 4 tabs per the spec (Home/Story/Avatar/
// Meta) - internal `key` values stay the OLD names (kisahmu/character)
// unchanged, only `label` changes, so activeScreen state and every
// existing data-tab="..." selector (including e2e tests) keep working
// untouched. Settings dropped from the tab bar entirely - the header's
// own gear icon already routes there (see appHeaderHTML above).
const TAB_ITEMS = [
  { key: "home", icon: "◆", label: "Home" },
  { key: "kisahmu", icon: "📖", label: "Story" },
  { key: "character", icon: "◈", label: "Avatar" },
  { key: "meta", icon: "▦", label: "Meta" },
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
      realmProgressCardHTML("#63E38B", "soma", 24, "Training", `Cardio & gym · ${counts.somaActivity} sesi minggu ini`, metaSessionPct(counts.somaActivity), `data-soma-mode="activity"`),
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
    realmProgressCardHTML("#FFC46E", "labora", 22, "Video Quest", `Belajar dari video pilihanmu · ${counts.labora} sesi bulan ini`, metaSessionPct(counts.labora), `data-meta-tool="video-quest"`),
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
      ${metaVideoQuestPicking ? `
      <div class="quest-card fadeUp" style="margin-top:16px">
        <div class="field">
          <label>Topik apa yang mau kamu pelajari?</label>
          <p style="color:var(--muted);font-size:13px;margin:6px 0 8px">Kamu akan cari satu video YouTube tentang topik ini, lalu diuji 15 soal dari materi video itu.</p>
          <input type="text" class="meta-goal-add-input" id="metaVideoQuestTopic" placeholder="Mis. Data Entry Fundamentals" maxlength="160" style="width:100%" />
        </div>
        <button class="btn-primary full" id="metaVideoQuestStart">Mulai Video Quest</button>
        <button class="btn-ghost" id="metaVideoQuestCancel" style="margin-top:10px">← Batal</button>
      </div>` : ""}
      ${metaSomaConfirm ? `
      <div class="quest-card fadeUp" style="margin-top:16px">
        <div class="field">
          <label>${metaSomaConfirm === "recovery" ? "Mulai sesi Recovery?" : "Mulai tracking Nutrition?"}</label>
          <p style="color:var(--muted);font-size:13px;margin:6px 0 0">${metaSomaConfirm === "recovery"
            ? "Catat tidur, hidrasi, dan pemulihanmu hari ini — sesi bebas, tidak terikat goal manapun."
            : "Catat makanmu hari ini — sesi bebas, tidak terikat goal manapun."}</p>
        </div>
        <button class="btn-primary full" id="metaSomaConfirmBtn">${metaSomaConfirm === "recovery" ? "Mulai sesi Recovery" : "Mulai tracking Nutrition"}</button>
        <button class="btn-ghost" id="metaSomaCancel" style="margin-top:10px">← Batal</button>
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
  reflectTarget = id; reflectOpen = true; reflectStatus = "COMPLETED"; reflectText = "";
  structForm = {}; reflectError = ""; unableQuestId = null;
  gymSession = null;
  recordMode = quest?.completionType === "structured-physical" || quest?.statFocus === "body";
  const schema = quest?.evidenceSchema;
  // Training spec: quests created with the gymSession flag (new META gym
  // sessions, see /api/meta/start) get the multi-exercise workout log.
  // Checked before every schema/structuredKind fallback so a flagged quest
  // can never drop into the legacy single-exercise form - while legacy
  // in-flight gym quests (no flag) keep taking the cascade below untouched.
  if (quest?.gymSession) {
    structKind = "gym-session";
    structKindAuto = true;
    gymSession = { exercises: [], pickerOpen: false, pickerQuery: "", pickerGroup: null };
    ensureExerciseCatalog();
    return;
  }
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

// Training spec: lazy one-time fetch of the fixed exercise catalog. Fire-
// and-forget from the sync flow-setup path - the workout log's picker shows
// a loading line until this lands, then the re-render picks the data up.
// Failure is non-fatal (retried on the next picker open), never blocks the
// session form itself.
async function ensureExerciseCatalog() {
  if (exerciseCatalog) return;
  try {
    exerciseCatalog = await api("/api/exercise-catalog");
    renderDashboard();
  } catch (e) { /* picker keeps showing the loading line; next open retries */ }
}

// ---- BODY · MOVEMENT execution flow (design handoff) --------------------
// Quest Preview -> Pre-Start -> (Strength: Active Session) -> Finish &
// Review -> Evidence -> Submitted, for Today's Trial cardio/gym quests
// (quest.primaryFeature === "MOVEMENT"). Entirely separate state machine
// from beginStructuredOrReflectiveFlow/structForm/gymSession above - see
// movementFlow's own declaration comment for why.

// Resumes an in-progress attempt directly from quest.activeAttempt (already
// round-tripped by GET /api/state - a refresh/reopen never loses it) or
// starts fresh at "preview" when none exists yet. No network call here -
// "preview"/"prestart" are pure client state until the user actually
// commits to starting (POST /attempt/start, see mvStartAttempt below).
function beginMovementFlow(id, quest, goalIndex) {
  movementFlow = {
    questId: id, quest, goalIndex,
    screen: quest.activeAttempt ? quest.activeAttempt.currentScreen : "preview",
    attempt: quest.activeAttempt || null,
    exitSheetOpen: false, whyOpen: false, reviewError: "", evidenceError: "",
    submittedResult: null, saving: false, rpeInfoOpen: new Set(),
    // Picked on Pre-Start, before any attempt exists to hold it - see
    // mvStartAttempt, which sends this along with /attempt/start so the
    // server seeds it straight into the new attempt's draftReview.
    preStartKondisi: null,
  };
}

// Bug fix (bugreportkirimbuktiaktivitas.pdf, issue 3): a graceful terminal
// state for a Movement quest that turns out to already be reflected - either
// caught proactively (the [data-reflect-id] handler's fresh-state check) or
// reactively (mvSubmitCardio/mvSubmitStrength's catch block, when the
// server's alreadyReflected flag comes back). No attempt/screens built, just
// enough of movementFlow's shape for renderMovementFlow to dispatch it.
function mvShowAlreadyReflected(id, quest) {
  movementFlow = {
    questId: id, quest, goalIndex: null,
    screen: "already-reflected",
    attempt: null,
    exitSheetOpen: false, whyOpen: false, reviewError: "", evidenceError: "",
    submittedResult: null, saving: false, rpeInfoOpen: new Set(),
    preStartKondisi: null,
  };
}

function movementAlreadyReflectedHTML() {
  return `
    <div style="text-align:center;padding:20px 0 0">
      <div style="width:56px;height:56px;border-radius:50%;border:1px solid var(--hair-strong);display:flex;align-items:center;justify-content:center;margin:0 auto 18px;color:var(--muted);font-size:24px">✓</div>
      <h2 class="fr" style="font-size:19px;margin:0 0 6px">Quest ini sudah selesai</h2>
      <p style="color:var(--muted);font-size:13.5px;margin:0 0 22px">Sepertinya kamu sudah menyelesaikan quest ini sebelumnya.</p>
    </div>
    <button class="btn-primary full" id="mvBackHomeSubmitted">Kembali ke Home</button>`;
}

// Debounced incremental save (design handoff's persistence requirement) -
// mirrors the onboarding draft's save/saveNow split (see its own comment
// near saveOnboardingDraft): plain typing debounces, screen-transition
// boundaries flush immediately so a refresh right after a boundary never
// loses it. A failed save is non-fatal - the next successful save or the
// next boundary flush catches up; the attempt already reflects the change
// client-side regardless.
let mvSaveTimer = null;
function mvSaveAttempt(patch, immediate) {
  if (!movementFlow) return;
  Object.assign(movementFlow.attempt, patch);
  const fire = async () => {
    try {
      await api(`/api/quest/${movementFlow.questId}/attempt/save`, { method: "POST", body: { patch } });
    } catch (e) { /* non-fatal - next save/boundary flush catches up */ }
  };
  if (mvSaveTimer) clearTimeout(mvSaveTimer);
  if (immediate) { fire(); return; }
  mvSaveTimer = setTimeout(fire, 500);
}

async function mvStartAttempt() {
  if (!movementFlow || movementFlow.saving) return;
  movementFlow.saving = true;
  renderDashboard();
  try {
    const { activeAttempt } = await api(`/api/quest/${movementFlow.questId}/attempt/start`, { method: "POST", body: { kondisi: movementFlow.preStartKondisi } });
    movementFlow.attempt = activeAttempt;
    movementFlow.screen = activeAttempt.currentScreen;
  } catch (e) {
    movementFlow.reviewError = e.message;
  }
  movementFlow.saving = false;
  renderDashboard();
}

async function mvAbandonAttempt() {
  if (!movementFlow) return;
  const id = movementFlow.questId;
  movementFlow = null;
  reflectTarget = null;
  try { await api(`/api/quest/${id}/attempt/abandon`, { method: "POST" }); } catch (e) { /* quest just stays open either way */ }
  appState = await api("/api/state").catch(() => appState);
  renderDashboard();
}


// SELESAI KETIKA checklist content - concrete minimum output, not a repeat
// of quest.description (design handoff's explicit rule). Cardio reads off
// evidenceSchema (single distance target); Strength reads off
// plannedExercises (the AI-authored multi-exercise plan, stage 1).
function movementChecklistHTML(quest) {
  if (quest.executionMode === "CARDIO") {
    const s = quest.evidenceSchema || {};
    const items = [s.activityType ? `Aktivitas: ${s.activityType}` : "Aktivitas fisik"];
    if (s.target != null) items.push(`Jarak minimal ${s.target} km`);
    return items;
  }
  return (quest.plannedExercises || []).map((e) => `${esc(e.name)}: ${e.targetSets} × ${e.targetReps}${e.targetLoadKg != null ? ` @ ${e.targetLoadKg}kg` : ""}`);
}

function movementEstimateLabel(quest) {
  if (quest.executionMode === "CARDIO") return "±30 menit";
  const totalSets = (quest.plannedExercises || []).reduce((n, e) => n + e.targetSets, 0);
  return `±${Math.max(10, totalSets * 3)} menit`;
}

// Minimal own header (back arrow / ELEVA wordmark / "?") - matches the
// design handoff's screens (no bottom tab bar during this flow), reusing
// the existing qhub-header/qhub-wordmark/qhub-icon-btn tokens rather than
// inventing a parallel visual system.
function movementHeaderHTML(showBack, onBackId) {
  return `
    <div class="app-header qhub-header">
      ${showBack ? `<button class="header-icon-btn qhub-icon-btn" id="${onBackId}" aria-label="Kembali">←</button>` : `<span></span>`}
      <div class="qhub-wordmark fr">ELEVA</div>
      ${helpBtnHTML("movement")}
    </div>`;
}

function movementPreviewHTML() {
  const quest = movementFlow.quest;
  const goalLabel = (appState.goals || [])[movementFlow.goalIndex] || quest.title;
  return `
    <div class="quest-card fadeUp">
      ${questEyebrowHTML(quest)}
      <p style="color:var(--muted);font-size:12.5px;margin:0 0 10px">Menuju target: <span style="color:var(--text)">${esc(goalLabel)}</span></p>
      <h2 class="fr" style="font-size:21px;margin:0 0 10px;line-height:1.3">${esc(quest.title)}</h2>
      <p style="color:var(--muted);font-size:14px;line-height:1.5;margin:0 0 16px">${esc(quest.description)}</p>
      <div class="mono" style="font-size:11px;color:var(--accent);letter-spacing:1px;margin-bottom:8px">SELESAI KETIKA</div>
      <div style="margin-bottom:16px">
        ${movementChecklistHTML(quest).map((item) => `
          <div style="display:flex;align-items:center;gap:10px;padding:6px 0">
            <span style="width:16px;height:16px;border-radius:50%;border:1px solid var(--hair-strong);flex:none"></span>
            <span style="font-size:13.5px">${item}</span>
          </div>`).join("")}
      </div>
      <p class="mono" style="font-size:12px;color:var(--muted);margin:0 0 18px">🕐 ${movementEstimateLabel(quest)}</p>
      <button class="btn-primary full" id="mvPreviewStart">Mulai Quest</button>
      <button class="btn-ghost" id="mvWhyToggle" style="margin-top:12px">${movementFlow.whyOpen ? "Tutup" : "Kenapa Eleva kasih quest ini?"} ${movementFlow.whyOpen ? "↑" : "↓"}</button>
      <div class="mv-why-collapse ${movementFlow.whyOpen ? "open" : ""}">
        <div class="mv-why-inner"><p style="color:var(--muted);font-size:13px;line-height:1.5;margin:10px 0 0">${esc(quest.why || "")}</p></div>
      </div>
    </div>`;
}

function movementPreStartHTML() {
  const quest = movementFlow.quest;
  const isStrength = quest.executionMode === "STRENGTH";
  return `
    <h2 class="fr" style="font-size:20px;margin:0 0 6px">Siap mulai quest?</h2>
    <p style="color:var(--muted);font-size:13.5px;margin:0 0 16px">Pastikan semua sudah siap sebelum mulai.</p>
    <div class="quest-card">
      ${questEyebrowHTML(quest)}
      <div style="font-size:16px;margin-bottom:14px">${esc(quest.title)}</div>
      ${isStrength ? `
      <div class="mono" style="font-size:10.5px;color:var(--muted-dim);letter-spacing:1px;margin-bottom:6px">HARI INI</div>
      ${(quest.plannedExercises || []).map((e) => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--hair)">
          <span style="font-size:14px">${esc(e.name)}</span>
          <span class="mono" style="font-size:12.5px;color:var(--muted)">${e.targetSets}×${e.targetReps}${e.targetLoadKg != null ? ` @ ${e.targetLoadKg}kg` : ""}</span>
        </div>`).join("")}
      ` : `
      <div class="mono" style="font-size:10.5px;color:var(--muted-dim);letter-spacing:1px;margin-bottom:6px">BUKTI YANG AKAN DICATAT</div>
      ${["Durasi", "Jarak", "Rasanya gimana", "Screenshot tracker (opsional)"].map((l) => `<div style="font-size:13.5px;padding:4px 0;color:var(--muted)">· ${l}</div>`).join("")}
      `}
      <p class="mono" style="font-size:12px;color:var(--muted);margin:14px 0 0">🕐 Estimasi ${movementEstimateLabel(quest)}</p>
    </div>
    ${!isStrength ? `
    <div class="field" style="margin-top:16px">
      <label>Kondisi sekarang? <span class="opt-note">opsional</span></label>
      <div class="status-row">
        ${["Segar", "Cukup", "Capek", "Nyeri"].map((k) => `<button class="status-btn ${movementFlow.preStartKondisi === k ? "active" : ""}" data-mv-kondisi="${k}">${k}</button>`).join("")}
      </div>
    </div>` : ""}
    <div style="display:flex;gap:12px;margin-top:18px">
      <button class="btn-ghost" id="mvPreStartCancel" style="flex:1">Batal</button>
      <button class="btn-primary" id="mvPreStartGo" style="flex:1" ${movementFlow.saving ? "disabled" : ""}>${isStrength ? "Mulai Latihan" : "Mulai"}</button>
    </div>
    ${movementFlow.reviewError ? `<p style="color:var(--rust);font-size:13px;margin-top:12px">${esc(movementFlow.reviewError)}</p>` : ""}`;
}

function movementScreenBodyHTML() {
  const screen = movementFlow.screen;
  if (screen === "preview") return movementPreviewHTML();
  if (screen === "prestart") return movementPreStartHTML();
  if (screen === "active") return movementActiveSessionHTML();
  if (screen === "review") return movementReviewHTML();
  if (screen === "evidence") return movementEvidenceHTML();
  if (screen === "submitted") return movementSubmittedHTML();
  if (screen === "already-reflected") return movementAlreadyReflectedHTML();
  return "";
}

function renderMovementFlow() {
  const screen = movementFlow.screen;
  // Submitted/already-reflected are terminal acks, same "no back arrow"
  // posture as every other completedResult-style screen in this app.
  const showBack = screen === "preview" || screen === "prestart" || screen === "review" || screen === "evidence";
  const backId = screen === "preview" ? "mvBackToHome" : "mvBackScreen";
  root.innerHTML = `
    <div class="shell app-shell qhub-shell">
      ${movementHeaderHTML(showBack, backId)}
      ${helpSheetHTML("movement")}
      <div class="screen-body qhub-scroll">${movementScreenBodyHTML()}</div>
      ${screen === "active" && movementFlow.exitSheetOpen ? movementExitSheetHTML() : ""}
    </div>`;
  wireMovementHandlers();
}

function wireMovementHandlers() {
  document.getElementById("mvBackToHome")?.addEventListener("click", () => {
    movementFlow = null;
    renderDashboard();
  });
  document.getElementById("mvBackScreen")?.addEventListener("click", () => {
    const screen = movementFlow.screen;
    if (screen === "prestart") { movementFlow.screen = "preview"; renderDashboard(); return; }
    if (screen === "review" || screen === "evidence") {
      // Mid-attempt back is a soft nav only (no data lost, attempt keeps
      // living) - exiting the flow entirely goes through the exit
      // sheet/Batalkan Quest action instead, never this arrow.
      movementFlow = null;
      renderDashboard();
      return;
    }
    movementFlow = null;
    renderDashboard();
  });
  document.getElementById("mvPreviewStart")?.addEventListener("click", () => {
    movementFlow.screen = "prestart";
    renderDashboard();
  });
  document.getElementById("mvWhyToggle")?.addEventListener("click", () => {
    movementFlow.whyOpen = !movementFlow.whyOpen;
    renderDashboard();
  });
  document.getElementById("mvPreStartCancel")?.addEventListener("click", () => {
    movementFlow.screen = "preview";
    renderDashboard();
  });
  document.getElementById("mvPreStartGo")?.addEventListener("click", mvStartAttempt);
  document.querySelectorAll("[data-mv-kondisi]").forEach((b) => b.addEventListener("click", () => {
    // Kondisi is picked on Pre-Start, BEFORE the attempt exists (it's only
    // created once "Mulai" is tapped, see mvStartAttempt) - held on
    // movementFlow itself until then, sent along with the /attempt/start
    // call so the server seeds it straight into the new attempt.
    movementFlow.preStartKondisi = movementFlow.preStartKondisi === b.dataset.mvKondisi ? null : b.dataset.mvKondisi;
    renderDashboard();
  }));
  document.getElementById("mvBackHomeSubmitted")?.addEventListener("click", async () => {
    movementFlow = null;
    appState = await api("/api/state").catch(() => appState);
    renderDashboard();
  });
  wireMovementActiveHandlers();
  wireMovementReviewHandlers();
  wireMovementEvidenceHandlers();
}

// ---- Active Session (Strength) -------------------------------------
// A real execution engine, not a generic timer: all exercises on one page
// as expand/collapse accordion cards (first expanded, rest collapsed by
// default - collapse state is client-only UI, reset on every fresh entry,
// never meaningfully persisted), directly-editable kg/reps per set, "+
// Tambah set", and a per-exercise RPE picker revealed once every set is
// checked. Visually reuses the .gs-* accordion/sets-grid classes META's
// Training gym-session already established (design handoff's own "Eleva's
// visual language, not the reference app's" rule, kept consistent across
// both features) - new data-ms-* attributes keep the handlers separate
// from gymSession's data-gs-* ones (different state object entirely).
const RPE_SCALE_INFO = "RPE = Rate of Perceived Exertion, seberapa berat set itu terasa. 5-6 ringan, 7-8 berat tapi terkontrol, 9 hampir gagal di rep terakhir, 10 gagal/nggak sanggup nambah rep.";

function mvEnsureCollapsedState() {
  const exs = movementFlow?.attempt?.strengthExercises;
  if (!exs) return;
  exs.forEach((e, i) => { if (e.collapsed == null) e.collapsed = i !== 0; });
}

function movementActiveSessionHTML() {
  mvEnsureCollapsedState();
  const quest = movementFlow.quest;
  const exs = movementFlow.attempt.strengthExercises;
  const cardsHTML = exs.map((ex, i) => {
    const doneSets = ex.sets.filter((s) => s.done).length;
    const allDone = doneSets === ex.sets.length;
    return `
    <div class="gs-ex-card">
      <div class="gs-ex-head">
        <button class="gs-ex-toggle" data-ms-collapse="${i}" aria-label="${ex.collapsed ? "Buka" : "Tutup"}">${ex.collapsed ? "▸" : "▾"}</button>
        <div class="gs-ex-titles" data-ms-collapse="${i}">
          <div class="gs-ex-name">${esc(ex.name)}</div>
          <div class="gs-ex-sub mono" style="${allDone ? "color:var(--growth)" : ""}">${doneSets}/${ex.sets.length} SET SELESAI</div>
        </div>
      </div>
      ${ex.collapsed ? "" : `
      <div class="gs-set-row gs-set-headrow mono"><span>SET</span><span>KG</span><span>REPS</span><span>✓</span></div>
      ${ex.sets.map((s, j) => `
      <div class="gs-set-row">
        <span class="mono gs-set-num">${j + 1}</span>
        <input type="number" min="0" step="0.5" inputmode="decimal" data-ms-w="${i}:${j}" value="${esc(s.weightKg)}" placeholder="${ex.targetLoadKg ?? 0}" />
        <input type="number" min="1" inputmode="numeric" data-ms-r="${i}:${j}" value="${esc(s.reps)}" placeholder="${ex.targetReps}" />
        <button class="gs-done-btn ${s.done ? "active" : ""}" data-ms-done="${i}:${j}" aria-label="Tandai set selesai">✓</button>
      </div>`).join("")}
      <button class="btn-ghost gs-addset" data-ms-addset="${i}">+ Tambah set</button>
      ${allDone ? `
      <div class="mv-rpe-block">
        <div class="mv-rpe-label">RPE <button class="mv-rpe-info" data-ms-rpe-info="${i}" aria-label="Apa itu RPE?">i</button></div>
        <div class="status-row">
          ${[5, 6, 7, 8, 9, 10].map((v) => `<button class="status-btn ${ex.rpe === v ? "active" : ""}" data-ms-rpe="${i}:${v}">${v}</button>`).join("")}
        </div>
        ${movementFlow.rpeInfoOpen?.has(i) ? `<p class="mv-rpe-explainer">${RPE_SCALE_INFO}</p>` : ""}
      </div>` : ""}
      `}
    </div>`;
  }).join("");
  return `
      ${questEyebrowHTML(quest)}
      <h2 class="fr" style="font-size:19px;margin:0 0 16px">${esc(quest.title)}</h2>
      ${cardsHTML}
      <div style="display:flex;gap:12px;margin-top:18px">
        <button class="btn-ghost rust" id="mvActiveAbandon" style="flex:1">Batalkan Quest</button>
        <button class="btn-primary" id="mvActiveDone" style="flex:1">Selesai Latihan</button>
      </div>`;
}

// Exit confirmation - a real decision (design handoff's own framing), not
// an overloaded Cancel: three distinct outcomes, three distinct code paths.
function movementExitSheetHTML() {
  return `
    <div class="help-overlay" id="mvExitOverlay">
      <div class="help-sheet fadeUp" style="text-align:left">
        <p style="margin:0 0 16px;font-size:14.5px">Mau apa dengan sesi ini?</p>
        <button class="btn-primary full" id="mvExitResume" style="margin-bottom:10px">Lanjutkan Quest</button>
        <button class="btn-ghost full" id="mvExitSave" style="margin-bottom:10px;border:1px solid var(--hair)">Akhiri &amp; Simpan Progress</button>
        <button class="btn-ghost rust full" id="mvExitAbandon" style="border:1px solid var(--rust)">Batalkan Quest</button>
      </div>
    </div>`;
}

function wireMovementActiveHandlers() {
  if (movementFlow?.screen !== "active") return;
  const setAt = (ref) => {
    const [i, j] = String(ref).split(":").map(Number);
    return movementFlow.attempt.strengthExercises[i]?.sets[j];
  };
  document.querySelectorAll("[data-ms-collapse]").forEach((b) => b.addEventListener("click", () => {
    const ex = movementFlow.attempt.strengthExercises[Number(b.dataset.msCollapse)];
    if (ex) ex.collapsed = !ex.collapsed;
    renderDashboard();
  }));
  document.querySelectorAll("[data-ms-w]").forEach((el) => el.addEventListener("input", (e) => {
    const s = setAt(el.dataset.msW);
    if (s) { s.weightKg = e.target.value; mvSaveAttempt({ strengthExercises: movementFlow.attempt.strengthExercises }); }
  }));
  document.querySelectorAll("[data-ms-r]").forEach((el) => el.addEventListener("input", (e) => {
    const s = setAt(el.dataset.msR);
    if (s) { s.reps = e.target.value; mvSaveAttempt({ strengthExercises: movementFlow.attempt.strengthExercises }); }
  }));
  document.querySelectorAll("[data-ms-done]").forEach((b) => b.addEventListener("click", () => {
    const s = setAt(b.dataset.msDone);
    if (s) s.done = !s.done;
    mvSaveAttempt({ strengthExercises: movementFlow.attempt.strengthExercises }, true);
    renderDashboard();
  }));
  document.querySelectorAll("[data-ms-addset]").forEach((b) => b.addEventListener("click", () => {
    const ex = movementFlow.attempt.strengthExercises[Number(b.dataset.msAddset)];
    if (ex) {
      // Seeded from the previous set's own numbers, not the plan's target -
      // the common case is repeating what you just actually did.
      const last = ex.sets[ex.sets.length - 1];
      ex.sets.push({ weightKg: last?.weightKg ?? "", reps: last?.reps ?? "", done: false });
    }
    mvSaveAttempt({ strengthExercises: movementFlow.attempt.strengthExercises }, true);
    renderDashboard();
  }));
  document.querySelectorAll("[data-ms-rpe]").forEach((b) => b.addEventListener("click", () => {
    const [i, v] = b.dataset.msRpe.split(":").map(Number);
    const ex = movementFlow.attempt.strengthExercises[i];
    if (ex) ex.rpe = v;
    mvSaveAttempt({ strengthExercises: movementFlow.attempt.strengthExercises }, true);
    renderDashboard();
  }));
  document.querySelectorAll("[data-ms-rpe-info]").forEach((b) => b.addEventListener("click", () => {
    const i = Number(b.dataset.msRpeInfo);
    if (!movementFlow.rpeInfoOpen) movementFlow.rpeInfoOpen = new Set();
    if (movementFlow.rpeInfoOpen.has(i)) movementFlow.rpeInfoOpen.delete(i); else movementFlow.rpeInfoOpen.add(i);
    renderDashboard();
  }));
  document.getElementById("mvActiveDone")?.addEventListener("click", () => {
    mvSaveAttempt({ currentScreen: "review" }, true);
    movementFlow.screen = "review";
    renderDashboard();
  });
  document.getElementById("mvActiveAbandon")?.addEventListener("click", () => {
    movementFlow.exitSheetOpen = true;
    renderDashboard();
  });
  document.getElementById("mvExitOverlay")?.addEventListener("click", (e) => {
    if (e.target.id === "mvExitOverlay") { movementFlow.exitSheetOpen = false; renderDashboard(); }
  });
  document.getElementById("mvExitResume")?.addEventListener("click", () => {
    movementFlow.exitSheetOpen = false;
    renderDashboard();
  });
  document.getElementById("mvExitSave")?.addEventListener("click", () => {
    // "Akhiri & Simpan Progress" - the attempt keeps living with whatever's
    // logged so far, just navigated forward to Review; endedEarly survives
    // to submit time (stage 7) to force the ADAPTED outcome regardless of
    // the usual ratio-based COMPLETED/PARTIAL computation.
    movementFlow.exitSheetOpen = false;
    movementFlow.attempt.endedEarly = true;
    mvSaveAttempt({ endedEarly: true, currentScreen: "review" }, true);
    movementFlow.screen = "review";
    renderDashboard();
  });
  document.getElementById("mvExitAbandon")?.addEventListener("click", () => {
    movementFlow.exitSheetOpen = false;
    mvAbandonAttempt();
  });
}

// Combines draftReview's separate Menit/Detik inputs to decimal minutes,
// same edge (client leaves the server) durasiMenitFromFields already
// converts at for the legacy cardio form - reused here via the same field-
// name shape rather than duplicating the conversion.
function mvDurasiMenit() {
  return durasiMenitFromFields({ durasiMin: movementFlow.attempt.draftReview.durationMin, durasiSec: movementFlow.attempt.draftReview.durationSec });
}

// Finish & Review. Cardio: mm:ss two-box duration + distance, pace derived
// live (never NaN - paceLabel itself already returns null on anything
// invalid, rendered as "—"). Strength: a READ-ONLY recap of what the
// execution engine already captured (sets completed/target, actual kg,
// RPE) - never make the user retype it. Both modes share the same effort
// chips + conditional-required-notes rule below (mirrored server-side by
// structured.js's cardio/strength-session kinds - see the reflection-
// submit comment further down).
function movementStrengthRecapHTML() {
  const exs = movementFlow.attempt.strengthExercises;
  return exs.map((ex) => {
    const done = ex.sets.filter((s) => s.done);
    return `
    <div style="padding:10px 0;border-bottom:1px solid var(--hair)">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <span style="font-size:14.5px">${esc(ex.name)}</span>
        <span class="mono" style="font-size:11.5px;color:${done.length === ex.sets.length ? "var(--growth)" : "var(--muted)"}">${done.length}/${ex.sets.length} SET</span>
      </div>
      ${done.length ? `<div style="color:var(--muted);font-size:12.5px;margin-top:4px">${done.map((s) => `${s.weightKg != null ? `${s.weightKg}kg×` : ""}${s.reps}`).join(", ")}${ex.rpe ? ` · RPE ${ex.rpe}` : ""}</div>` : ""}
    </div>`;
  }).join("");
}

function movementReviewHTML() {
  const quest = movementFlow.quest;
  const isStrength = quest.executionMode === "STRENGTH";
  const dr = movementFlow.attempt.draftReview;
  const heavy = ["Berat", "Terlalu berat"].includes(dr.effort);
  const notesMissing = heavy && !dr.notes.trim();
  return `
    <h2 class="fr" style="font-size:20px;margin:0 0 4px">Selesai! 🎉</h2>
    <p style="color:var(--muted);font-size:13.5px;margin:0 0 16px">Review hasil ${isStrength ? "latihanmu" : "aktivitasmu"}.</p>
    <div class="quest-card">
      ${isStrength ? movementStrengthRecapHTML() : `
      <div class="struct-grid">
        <div class="field">
          <label>Durasi</label>
          <div style="display:flex;align-items:center;gap:6px">
            <input type="number" min="0" inputmode="numeric" id="mvDurMin" value="${esc(dr.durationMin)}" placeholder="0" style="text-align:center" />
            <span class="mono" style="color:var(--muted)">:</span>
            <input type="number" min="0" max="59" inputmode="numeric" id="mvDurSec" value="${esc(dr.durationSec)}" placeholder="00" style="text-align:center" />
          </div>
        </div>
        <div class="field"><label>Jarak (km)</label><input type="number" min="0" step="0.1" id="mvDistance" value="${esc(dr.distanceKm)}" placeholder="0" /></div>
      </div>
      <p class="mono" id="mvPaceDisplay" style="font-size:12px;color:var(--muted);margin:-6px 0 14px">${(() => { const p = paceLabel(mvDurasiMenit(), dr.distanceKm); return `Pace estimasi: ${p || "—"}`; })()}</p>
      `}
      <div class="field" style="margin-top:${isStrength ? "14px" : "0"}">
        <label>Rasanya gimana?</label>
        <div class="status-row">
          ${["Ringan", "Cukup", "Berat", "Terlalu berat"].map((v) => `<button class="status-btn ${dr.effort === v ? "active" : ""}" data-mv-effort="${v}">${v}</button>`).join("")}
        </div>
      </div>
      <div class="field">
        <label>Catatan ${heavy ? "" : `<span class="opt-note">opsional</span>`}</label>
        <textarea id="mvNotes" rows="2" placeholder="Ada yang terasa beda hari ini?">${esc(dr.notes)}</textarea>
      </div>
      ${notesMissing ? `<p style="color:var(--rust);font-size:13px;margin:0 0 12px">Ceritakan singkat apa yang bikin berat sebelum lanjut.</p>` : ""}
    </div>
    <div style="display:flex;gap:12px;margin-top:16px">
      <button class="btn-ghost rust" id="mvReviewAbandon" style="flex:1">Batalkan Quest</button>
      <button class="btn-primary" id="mvReviewDone" style="flex:1">Selesai</button>
    </div>
    ${movementFlow.reviewError ? `<p style="color:var(--rust);font-size:13px;margin-top:12px">${esc(movementFlow.reviewError)}</p>` : ""}`;
}

function wireMovementReviewHandlers() {
  if (movementFlow?.screen !== "review") return;
  const isCardio = movementFlow.quest.executionMode === "CARDIO";
  const dr = movementFlow.attempt.draftReview;
  // Plain typing never re-renders (would drop focus mid-keystroke, same
  // constraint as every other form in this app) - writes straight into
  // attempt state + a debounced save, pace/derived reads update the DOM
  // directly instead. Cardio-only inputs (Strength shows a read-only recap).
  if (isCardio) {
    document.getElementById("mvDurMin")?.addEventListener("input", (e) => {
      dr.durationMin = e.target.value;
      mvSaveAttempt({ draftReview: dr });
      const el = document.getElementById("mvPaceDisplay");
      if (el) el.textContent = `Pace estimasi: ${paceLabel(mvDurasiMenit(), dr.distanceKm) || "—"}`;
    });
    document.getElementById("mvDurSec")?.addEventListener("input", (e) => {
      dr.durationSec = e.target.value;
      mvSaveAttempt({ draftReview: dr });
      const el = document.getElementById("mvPaceDisplay");
      if (el) el.textContent = `Pace estimasi: ${paceLabel(mvDurasiMenit(), dr.distanceKm) || "—"}`;
    });
    document.getElementById("mvDistance")?.addEventListener("input", (e) => {
      dr.distanceKm = e.target.value;
      mvSaveAttempt({ draftReview: dr });
      const el = document.getElementById("mvPaceDisplay");
      if (el) el.textContent = `Pace estimasi: ${paceLabel(mvDurasiMenit(), dr.distanceKm) || "—"}`;
    });
  }
  document.getElementById("mvNotes")?.addEventListener("input", (e) => {
    dr.notes = e.target.value;
    mvSaveAttempt({ draftReview: dr });
  });
  document.querySelectorAll("[data-mv-effort]").forEach((b) => b.addEventListener("click", () => {
    dr.effort = b.dataset.mvEffort;
    mvSaveAttempt({ draftReview: dr }, true);
    renderDashboard();
  }));
  document.getElementById("mvReviewAbandon")?.addEventListener("click", mvAbandonAttempt);
  document.getElementById("mvReviewDone")?.addEventListener("click", () => {
    const heavy = ["Berat", "Terlalu berat"].includes(dr.effort);
    if (!dr.effort) { movementFlow.reviewError = "Pilih dulu rasanya gimana."; renderDashboard(); return; }
    if (heavy && !dr.notes.trim()) { movementFlow.reviewError = "Ceritakan singkat apa yang bikin berat sebelum lanjut."; renderDashboard(); return; }
    movementFlow.reviewError = "";
    mvSaveAttempt({ draftReview: dr, currentScreen: "evidence" }, true);
    movementFlow.screen = "evidence";
    renderDashboard();
  });
}

// Evidence. Cardio: pick ONE primary source, inline error (not a modal -
// modals reserved for destructive actions per the design handoff) if none
// picked before submit. Strength shows a static confirmation instead - no
// picker, system-recorded sets/reps/load already IS the evidence.
function movementEvidenceHTML() {
  const quest = movementFlow.quest;
  const attempt = movementFlow.attempt;
  if (quest.executionMode === "STRENGTH") {
    return `
      ${questEyebrowHTML(quest)}
      <h2 class="fr" style="font-size:20px;margin:0 0 4px">Kirim bukti latihan</h2>
      <p style="color:var(--muted);font-size:13.5px;margin:0 0 16px">Data set/reps/beban yang barusan kamu catat sudah cukup jadi bukti.</p>
      <div class="quest-card" style="display:flex;align-items:center;gap:12px">
        <span style="color:var(--growth);font-size:20px">✓</span>
        <span style="font-size:13.5px">Sistem sudah mencatat sets, reps, dan beban dari sesi latihanmu — nggak perlu screenshot tambahan.</span>
      </div>
      ${movementFlow.evidenceError ? `<p style="color:var(--rust);font-size:13px;margin:8px 0 0">${esc(movementFlow.evidenceError)}</p>` : ""}
      <button class="btn-primary full" id="mvKirimBukti" style="margin-top:20px" ${movementFlow.saving ? "disabled" : ""}>${movementFlow.saving ? "Mengirim…" : "Kirim Bukti"}</button>`;
  }
  const choices = [
    ["activity-data", "Data aktivitas", "Durasi + jarak yang sudah dicatat"],
    ["tracker-screenshot", "Screenshot tracker", "Dari Strava, Apple Fitness, dll"],
    ["treadmill-photo", "Foto treadmill", "Jika lari di treadmill"],
  ];
  return `
    ${questEyebrowHTML(quest)}
    <h2 class="fr" style="font-size:20px;margin:0 0 4px">Kirim bukti aktivitas</h2>
    <p style="color:var(--muted);font-size:13.5px;margin:0 0 16px">Pilih bukti yang ingin kamu kirim.</p>
    <div class="mono" style="font-size:11px;color:var(--accent);letter-spacing:1px;margin-bottom:8px">BUKTI UTAMA (PILIH SALAH SATU)</div>
    ${choices.map(([k, label, sub]) => `
      <button class="mv-evidence-choice ${attempt.evidenceChoice === k ? "active" : ""}" data-mv-evidence="${k}">
        <span class="mv-evidence-radio"></span>
        <span><span class="mv-evidence-label">${label}</span><span class="mv-evidence-sub">${sub}</span></span>
      </button>`).join("")}
    ${["tracker-screenshot", "treadmill-photo"].includes(attempt.evidenceChoice) ? `
      <div class="field" style="margin-top:10px">
        <input type="file" accept="image/*" id="mvEvidencePhoto">
        ${attempt.evidencePhotoName ? `<p style="color:var(--muted);font-size:12px;margin:6px 0 0">✓ ${esc(attempt.evidencePhotoName)}</p>` : ""}
      </div>` : ""}
    ${movementFlow.evidenceError ? `<p style="color:var(--rust);font-size:13px;margin:8px 0 0">${esc(movementFlow.evidenceError)}</p>` : ""}
    <button class="btn-primary full" id="mvKirimBukti" style="margin-top:20px" ${movementFlow.saving ? "disabled" : ""}>${movementFlow.saving ? "Mengirim…" : "Kirim Bukti"}</button>`;
}

function wireMovementEvidenceHandlers() {
  if (movementFlow?.screen !== "evidence") return;
  document.querySelectorAll("[data-mv-evidence]").forEach((b) => b.addEventListener("click", () => {
    movementFlow.attempt.evidenceChoice = b.dataset.mvEvidence;
    // Switching away from a photo-based choice drops any previously
    // attached photo - it's client-only state (never saved via
    // /attempt/save) so there's nothing server-side to clean up.
    if (!["tracker-screenshot", "treadmill-photo"].includes(b.dataset.mvEvidence)) {
      movementFlow.attempt.evidencePhoto = null;
      movementFlow.attempt.evidencePhotoName = null;
    }
    movementFlow.evidenceError = "";
    mvSaveAttempt({ evidenceChoice: b.dataset.mvEvidence }, true);
    renderDashboard();
  }));
  document.getElementById("mvEvidencePhoto")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      movementFlow.evidenceError = "Pilih file gambar (PNG/JPEG/WebP).";
      renderDashboard();
      return;
    }
    try {
      const photo = await fileToBase64(file);
      movementFlow.attempt.evidencePhoto = photo;
      movementFlow.attempt.evidencePhotoName = file.name;
      movementFlow.evidenceError = "";
    } catch (err) {
      movementFlow.evidenceError = err.message;
    }
    renderDashboard();
  });
  document.getElementById("mvKirimBukti")?.addEventListener("click", () => {
    if (movementFlow.quest.executionMode === "STRENGTH") mvSubmitStrength(); else mvSubmitCardio();
  });
}

// Cardio's structuredData shape is EXACTLY what the legacy cardio form
// already sends (server/structured.js's "cardio" kind, unchanged) - jenis
// aktivitas is implicit from the quest itself (evidenceSchema.activityType,
// never re-asked in this flow, matching the design handoff's screens),
// falling back to "Lainnya" only if the AI never set one, same "safe
// default rather than fabricate" posture normalizeEvidenceSchema already
// uses server-side.
async function mvSubmitCardio() {
  if (!movementFlow || movementFlow.saving) return;
  const attempt = movementFlow.attempt;
  if (!attempt.evidenceChoice) {
    movementFlow.evidenceError = "Pilih bukti utama dulu.";
    renderDashboard();
    return;
  }
  if (["tracker-screenshot", "treadmill-photo"].includes(attempt.evidenceChoice) && !attempt.evidencePhoto) {
    movementFlow.evidenceError = "Lampirkan foto/screenshot dulu.";
    renderDashboard();
    return;
  }
  const quest = movementFlow.quest;
  const jenis = quest.evidenceSchema?.activityType || "Lainnya";
  const structuredData = {
    kind: "cardio",
    jenisAktivitas: jenis,
    ...(jenis === "Lainnya" ? { jenisLainnya: "Aktivitas fisik" } : {}),
    durasiMenit: mvDurasiMenit(),
    ...(attempt.draftReview.distanceKm !== "" && attempt.draftReview.distanceKm != null ? { jarakKm: Number(attempt.draftReview.distanceKm) } : {}),
    titikBerat: attempt.draftReview.effort,
    ...(["Berat", "Terlalu berat"].includes(attempt.draftReview.effort) ? { titikBeratDetail: attempt.draftReview.notes.slice(0, 300) } : {}),
    evidenceChoice: attempt.evidenceChoice,
    ...(attempt.evidencePhoto ? { evidencePhoto: attempt.evidencePhoto } : {}),
  };
  movementFlow.saving = true;
  movementFlow.evidenceError = "";
  renderDashboard();
  try {
    const resp = await api("/api/reflection", { method: "POST", body: { status: "COMPLETED", text: attempt.draftReview.notes, questId: movementFlow.questId, structuredData } });
    movementFlow.submittedResult = resp;
    movementFlow.screen = "submitted";
    appState = await api("/api/state").catch(() => appState);
  } catch (e) {
    // Bug fix (issue 3): "already reflected" is not a normal validation
    // error to show inline - it means the quest finished elsewhere while
    // this session was mid-flow (another device/tab, or the 28h expiry
    // sweep). Route to the graceful terminal state instead of a dead end.
    if (e.data?.alreadyReflected) mvShowAlreadyReflected(movementFlow.questId, movementFlow.quest);
    else movementFlow.evidenceError = e.message;
  }
  movementFlow.saving = false;
  renderDashboard();
}

// Strength's structuredData: the exact shape structured.js's new
// "strength-session" kind validates - each planned exercise's name/sets as
// actually logged during Active Session, matched by index server-side
// against quest.plannedExercises (never a client-echoed target). No
// evidence picker needed here (system-recorded data IS the evidence) - this
// only fires from Evidence's "Kirim Bukti", same submit pipeline cardio
// uses (POST /api/reflection), so growth-gate/deltas/Decay all apply
// identically; the ADAPTED-vs-COMPLETED/PARTIAL decision itself happens
// server-side off attempt.endedEarly, not anything sent here.
async function mvSubmitStrength() {
  if (!movementFlow || movementFlow.saving) return;
  const attempt = movementFlow.attempt;
  const structuredData = {
    kind: "strength-session",
    exercises: attempt.strengthExercises.map((ex) => ({
      name: ex.name, rpe: ex.rpe,
      sets: ex.sets.map((s) => ({
        reps: s.reps === "" || s.reps == null ? null : Number(s.reps),
        weightKg: s.weightKg === "" || s.weightKg == null ? null : Number(s.weightKg),
        done: Boolean(s.done),
      })),
    })),
  };
  movementFlow.saving = true;
  movementFlow.evidenceError = "";
  renderDashboard();
  try {
    const resp = await api("/api/reflection", { method: "POST", body: { status: "COMPLETED", text: attempt.draftReview.notes, questId: movementFlow.questId, structuredData } });
    movementFlow.submittedResult = resp;
    movementFlow.screen = "submitted";
    appState = await api("/api/state").catch(() => appState);
  } catch (e) {
    if (e.data?.alreadyReflected) mvShowAlreadyReflected(movementFlow.questId, movementFlow.quest);
    else movementFlow.evidenceError = e.message;
  }
  movementFlow.saving = false;
  renderDashboard();
}

// Submitted. No raw LLM essay (design handoff's explicit rule) - a
// confirmation state plus a static componentized list of what's coming;
// the real mentorReply/interpretation still get stored on the reflection
// and feed the next quest/Riwayat as usual, just not echoed verbatim here.
function movementSubmittedHTML() {
  return `
    ${questEyebrowHTML(movementFlow.quest)}
    <div style="text-align:center;padding:20px 0 0">
      <div style="width:56px;height:56px;border-radius:50%;border:1px solid var(--growth);display:flex;align-items:center;justify-content:center;margin:0 auto 18px;color:var(--growth);font-size:24px">✓</div>
      <h2 class="fr" style="font-size:19px;margin:0 0 6px">Bukti terkirim!</h2>
      <p style="color:var(--muted);font-size:13.5px;margin:0 0 6px">Eleva sedang menganalisis progresmu.</p>
      <p style="color:var(--muted);font-size:12.5px;margin:0 0 22px">Analisis lengkapnya akan muncul di quest berikutnya sebagai "Eleva Observed."</p>
    </div>
    <div class="quest-card" style="text-align:left">
      ${[
        ["Analisis progres", "Menilai konsistensi dan effort"],
        ["Insight & rekomendasi", "Tips agar kamu makin berkembang"],
        ["Quest berikutnya", "Akan disesuaikan dengan kondisimu"],
      ].map(([title, sub], i, arr) => `
        <div style="padding:12px 0${i < arr.length - 1 ? ";border-bottom:1px solid var(--hair)" : ""}">
          <div style="font-size:14.5px">${title}</div>
          <div style="color:var(--muted);font-size:12.5px;margin-top:2px">${sub}</div>
        </div>`).join("")}
    </div>
    <button class="btn-ghost full" id="mvBackHomeSubmitted" style="margin-top:18px">Kembali ke Home</button>`;
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

// ---- Training multi-exercise session (Movement→Training spec) ----------
// The workout-log form: multiple exercises per session, each with its own
// sets grid, one primary submit for the whole session (reflectFormHTML's
// existing #submitReflect - no per-exercise submit). Rendered through the
// same structFieldsHTML slot the single-exercise gym form uses, in Eleva's
// own visual language (the reference app is a flow reference, not a style
// reference - same rule as Nutrition/Yazio).
const MUSCLE_LABELS_FALLBACK = { chest: "Dada", back: "Punggung", legs: "Kaki", shoulders: "Bahu", arms: "Lengan", core: "Core" };
function muscleLabel(g) {
  return exerciseCatalog?.muscleGroupLabels?.[g] || MUSCLE_LABELS_FALLBACK[g] || g;
}
const EQUIPMENT_LABELS = { barbell: "Barbell", dumbbell: "Dumbbell", machine: "Mesin", bodyweight: "Tanpa alat" };

function gymPickListHTML() {
  if (!exerciseCatalog) return `<p style="color:var(--muted);font-size:13px;margin:8px 0 0">Memuat katalog gerakan...</p>`;
  const q = (gymSession.pickerQuery || "").trim().toLowerCase();
  const list = exerciseCatalog.exercises.filter((e) =>
    (!gymSession.pickerGroup || e.primaryMuscleGroup === gymSession.pickerGroup) &&
    (!q || e.name.toLowerCase().includes(q)));
  if (!list.length) return `<p style="color:var(--muted);font-size:13px;margin:8px 0 0">Tidak ada gerakan yang cocok.</p>`;
  return list.map((e) => `
    <button class="gs-pick-row" data-gs-pick="${esc(e.id)}">
      <span class="gs-pick-name">${esc(e.name)}</span>
      <span class="gs-pick-sub mono">${esc(muscleLabel(e.primaryMuscleGroup))} · ${esc(EQUIPMENT_LABELS[e.equipment] || e.equipment)}</span>
    </button>`).join("");
}

function addGymExercise(exerciseId) {
  const entry = exerciseCatalog?.exercises.find((e) => e.id === exerciseId);
  if (!entry || !gymSession) return;
  gymSession.exercises.push({
    exerciseId: entry.id, name: entry.name, muscleGroup: entry.primaryMuscleGroup,
    collapsed: false, sets: [{ weightKg: "", reps: "", done: false }],
  });
  gymSession.pickerOpen = false;
  gymSession.pickerQuery = "";
  gymSession.pickerGroup = null;
}

// The picker's search input filters without a full re-render (a re-render
// would drop keyboard focus mid-word - same constraint the data-sf inputs
// document) - only the list container is rewritten, then its fresh pick
// buttons are re-bound here. renderDashboard's own wiring uses this too so
// the binding logic exists exactly once.
function wireGymPickButtons() {
  document.querySelectorAll("[data-gs-pick]").forEach((b) => b.addEventListener("click", () => {
    addGymExercise(b.dataset.gsPick);
    renderDashboard();
  }));
}

function gymSessionCardsHTML() {
  const doneSets = (ex) => ex.sets.filter((s) => s.done).length;
  const cardsHTML = gymSession.exercises.map((ex, i) => `
    <div class="gs-ex-card">
      <div class="gs-ex-head">
        <button class="gs-ex-toggle" data-gs-collapse="${i}" aria-label="${ex.collapsed ? "Buka" : "Tutup"}">${ex.collapsed ? "▸" : "▾"}</button>
        <div class="gs-ex-titles" data-gs-collapse="${i}">
          <div class="gs-ex-name">${esc(ex.name)}</div>
          <div class="gs-ex-sub mono">${esc(muscleLabel(ex.muscleGroup).toUpperCase())} · ${doneSets(ex)}/${ex.sets.length} SET SELESAI</div>
        </div>
        <button class="gs-ex-remove" data-gs-remove="${i}" aria-label="Hapus gerakan">×</button>
      </div>
      ${ex.collapsed ? "" : `
      <div class="gs-set-row gs-set-headrow mono"><span>SET</span><span>KG</span><span>REPS</span><span>✓</span></div>
      ${ex.sets.map((s, j) => `
      <div class="gs-set-row">
        <span class="mono gs-set-num">${j + 1}</span>
        <input type="number" min="0" step="0.5" inputmode="decimal" data-gs-w="${i}:${j}" value="${esc(s.weightKg)}" placeholder="0" />
        <input type="number" min="1" inputmode="numeric" data-gs-r="${i}:${j}" value="${esc(s.reps)}" placeholder="12" />
        <button class="gs-done-btn ${s.done ? "active" : ""}" data-gs-done="${i}:${j}" aria-label="Tandai set selesai">✓</button>
      </div>`).join("")}
      <button class="btn-ghost gs-addset" data-gs-addset="${i}">+ Tambah set</button>`}
    </div>`).join("");

  const pickerHTML = !gymSession.pickerOpen ? "" : `
    <div class="gs-picker">
      <input type="text" id="gsSearch" placeholder="Cari gerakan..." value="${esc(gymSession.pickerQuery)}" maxlength="60" />
      <div class="gs-group-chips">
        <button class="kondisi-chip ${!gymSession.pickerGroup ? "selected" : ""}" data-gs-group="">Semua</button>
        ${(exerciseCatalog?.muscleGroups || Object.keys(MUSCLE_LABELS_FALLBACK)).map((g) =>
          `<button class="kondisi-chip ${gymSession.pickerGroup === g ? "selected" : ""}" data-gs-group="${esc(g)}">${esc(muscleLabel(g))}</button>`).join("")}
      </div>
      <div class="gs-pick-list" id="gsPickList">${gymPickListHTML()}</div>
      <button class="btn-ghost" id="gsPickerCancel">← Batal</button>
    </div>`;

  return `
      ${gymSession.exercises.length === 0 && !gymSession.pickerOpen
        ? `<p style="color:var(--muted);font-size:13px;margin:0 0 10px">Susun sesi latihanmu — tambah gerakan dari katalog, lalu catat set demi set.</p>` : ""}
      ${cardsHTML}
      ${pickerHTML}
      ${gymSession.pickerOpen ? "" : `<button class="btn-ghost gs-add-exercise" id="gsAddExercise">+ Tambah gerakan</button>`}`;
}

// End-of-session evaluation block for the result screen - the three
// numbers the server computed from the fixed catalog (structured.js's
// evaluateGymSession): total volume, estimated calories, dominant muscle
// group(s) (ties list both, per the spec - never forced to one winner).
function gymSessionEvalHTML(ev) {
  if (!ev) return "";
  return `
    <div class="gs-eval">
      <div class="gs-eval-item"><div class="gs-eval-num">${esc(ev.totalVolumeKg)}</div><div class="gs-eval-label mono">VOLUME (KG)</div></div>
      <div class="gs-eval-item"><div class="gs-eval-num">${esc(ev.estimatedCalories)}</div><div class="gs-eval-label mono">± KALORI</div></div>
      <div class="gs-eval-item"><div class="gs-eval-num gs-eval-muscle">${esc((ev.dominantMuscleGroups || []).map(muscleLabel).join(" + ") || "—")}</div><div class="gs-eval-label mono">OTOT DOMINAN</div></div>
    </div>`;
}

function renderDashboard() {
  // Round 41: the IELTS Listening Half Diagnostic's active exam/submitted
  // screens are the one flow in this app that hides the normal header+tab
  // bar entirely ("test mode", per the design handoff) - bypass the usual
  // .app-shell assembly completely rather than threading a flag through it.
  // The "intro" step does NOT bypass - it renders inside the normal chrome
  // below, exactly like Practice Test's own kind/track picker steps do.
  if (listeningDiagnosticFlow?.step === "active" || listeningDiagnosticFlow?.step === "submitted") {
    return renderListeningDiagnosticTest();
  }
  // Round 42: the Reading Half Diagnostic gets the same chrome bypass -
  // every step except "intro" (which renders inside the normal chrome
  // below, like the listening intro).
  if (readingTestFlow && readingTestFlow.step !== "intro") {
    return renderReadingTest();
  }
  // Video Quest: same chrome bypass for every step except "intro".
  if (videoQuizFlow && videoQuizFlow.step !== "intro") {
    return renderVideoQuiz();
  }
  // BODY · MOVEMENT execution flow: its own state machine, own shell (no
  // bottom tab bar, minimal header), same "bypass renderDashboard's normal
  // assembly entirely" pattern as the listening diagnostic's test mode
  // above - see movementFlow's own declaration comment for why it's kept
  // isolated from reflectOpen/structForm/gymSession rather than folded in.
  if (movementFlow) {
    return renderMovementFlow();
  }
  const s = appState;
  // Task 11c: server still mixes real Side Quests into openQuests (flagged
  // isSideQuest) alongside Primary Quests - filtered out here since the
  // Eleva Home redesign no longer surfaces Side Quests on this screen (per
  // the founder's own decision), but META rows still need allOpenQuests
  // findable below.
  const allOpenQuests = s.openQuests || [];
  // Task 12: META rows stay findable in allOpenQuests (so the reflect form
  // can look one up by id while a META session is in progress via
  // targetDay/reflectTarget below), but never join the Primary Quest row -
  // see the is_meta column comment in db.js's init().
  const openQuests = allOpenQuests.filter((q) => !q.isSideQuest && !q.isMeta && !q.isChain);
  // SOMA Training feedback brief item 4: a chain quest stays out of the
  // normal 3-slot goal/side-quest cap (server-side, see GET /api/state's
  // needySlots/sideSlots guards) but - unlike META - still needs to render
  // on Home through the SAME card/detail components as a normal quest, not
  // META's separate Inner Realm UI. At most one is ever open at a time.
  const chainQuest = allOpenQuests.find((q) => q.isChain) || null;
  const goals = s.goals || [];
  const goalLabel = (goalIndex) => (goalIndex != null && goals[goalIndex] ? goals[goalIndex] : null);
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
  const showPicker = recordMode && reflectStatus !== "ABANDONED";
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
  const structFieldsHTML = !showStructFields ? "" : structKind === "cardio" ? cardioFieldsHTML : structKind === "recovery" ? recoveryFieldsHTML : structKind === "gym-session" && gymSession ? gymSessionCardsHTML() : gymFieldsHTML;

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
          ${[["COMPLETED", "Selesai"], ["PARTIAL", "Sebagian"], ["ABANDONED", "Nggak sempat"]].map(([k, l]) =>
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
      ${!mustRecord && reflectStatus !== "ABANDONED" ? `
      <button class="btn-ghost" id="toggleRecord" style="margin-top:${formReady ? "10px" : "4px"}">${recordMode ? "← Balik ke refleksi teks aja" : "Aktivitas fisik? Catat sebagai record →"}</button>` : ""}
      ${mustRecord ? `<button class="btn-ghost" id="unableQuestBtn" data-unable-quest="${targetDay.id}" style="margin-top:${formReady ? "10px" : "4px"}">Aku nggak bisa quest ini →</button>` : ""}
    </div>` : "";

  // Eleva Home redesign (design handoff, 15 Agustus): up to 3 primary
  // quests render as a compact card row + one detail panel for whichever
  // is selected - selection never reorders the row (questHubCardsHTML,
  // same .ppick-col mechanic as Pilih Pathway). Defensive cap at 3 even
  // though generation already targets exactly that - getOpenQuests doesn't
  // enforce it at the DB level, only the generation gate does. Collapses
  // to the single quest actually being reflected on (detail panel + form,
  // no card row) while reflectOpen, same "one focus at a time" precedent
  // the old carousel used - and to the special-flow/completed-ack views
  // exactly as before.
  // The active chain quest always gets a guaranteed visible slot, pinned
  // first, rather than competing with goal quests for the existing
  // slice(0,3) cap - keeps the total displayed count at <= 3 without
  // growing the carousel past what the rest of this screen assumes.
  const homeQuests = chainQuest
    ? [chainQuest, ...openQuests.filter((q) => q.id !== chainQuest.id)].slice(0, 3)
    : openQuests.slice(0, 3);
  const activeIdx = Math.min(selectedQuestIndex ?? 0, Math.max(homeQuests.length - 1, 0));
  const selectedQuest = homeQuests[activeIdx] || null;
  // Round 40: CTA lockout now matches the REAL server deadline (24h nominal
  // + 4h invisible grace = 28h, server/index.js QUEST_EXPIRY_MS), not the
  // 24h nominal shown by questUrgency's label below - the button stays
  // clickable through the grace window (hour 24-28) so minor schedule
  // drift never locks someone out, while the label still flips to "Waktu
  // habis" at the nominal 24h exactly as before (questUrgency, unchanged).
  // In practice the server auto-resolves+replaces anything >=28h old on
  // every GET /api/state before the client ever sees it, so this mostly
  // guards a request that raced ahead of that resolution.
  const QHUB_CTA_LOCKOUT_MS = 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000;
  const selectedRemaining = selectedQuest?.createdAt ? new Date(selectedQuest.createdAt).getTime() + QHUB_CTA_LOCKOUT_MS - Date.now() : null;
  const selectedExpired = selectedRemaining != null && selectedRemaining <= 0;

  // Home body: per the founder's own decision (design handoff, 15 Agustus),
  // everything the OLD dashboard showed that isn't one of the new spec's 5
  // layout pieces - API-key banner, chapter header, Eleva Observed, Side
  // Quest row, Kondisi Hari Ini, RIWAYAT, nutrition-shortfall prompts - is
  // dropped from Home entirely (their underlying functions/mechanisms stay,
  // just unreachable from here now - same "not deleted, just unreachable"
  // treatment as artifactsSheetHTML below).
  const homeBodyHTML = completedResult ? completedResultCardHTML(completedResult)
    : listeningDiagnosticFlow ? listeningDiagnosticIntroHTML() // only reached for step==="intro" - "active"/"submitted" are already intercepted at the top of this function
    : readingTestFlow ? readingTestIntroHTML() // same: only "intro" reaches here
    : videoQuizFlow ? vqIntroHTML() // same: only "intro" reaches here
    : practiceTestFlow ? practiceTestFlowHTML()
    : jobMatchFlow ? jobMatchFlowHTML()
    : jobApplicationFlow ? jobApplicationFlowHTML()
    : nutritionFlow ? nutritionFlowHTML()
    : questHubFlow ? questHubFlowHTML()
    : reflectOpen && targetDay ? questDetailPanelHTML(targetDay, goalLabel(targetDay.goalIndex), questCtaLabel(targetDay.quest, targetDay.id), false) + reflectFormHTML
    : !homeQuests.length ? `<div class="quest-card">${spinnerHTML("AI sedang menyusun quest...")}</div>`
    : `
    <div class="qhub-heading mono">${homeQuests.length} quest berjalan, pilih satu untuk lihat detail.</div>
    ${questHubCardsHTML(homeQuests)}
    ${selectedQuest ? questDetailPanelHTML(selectedQuest, goalLabel(selectedQuest.goalIndex), questCtaLabel(selectedQuest.quest, selectedQuest.id), selectedExpired) : ""}`;

  const screenBodyHTML = activeScreen === "kisahmu" ? kisahmuScreenHTML(s)
    : activeScreen === "character" ? characterScreenHTML(s)
    : activeScreen === "settings" ? settingsScreenHTML()
    : activeScreen === "meta" ? metaScreenHTML(s, allOpenQuests)
    : homeBodyHTML;

  // Eleva Home redesign: header now shows exactly 2 icons (help + settings)
  // per spec - Artifacts dropped from Home's header (job-match-analysis/
  // job-application-submit flows already have their own inline "upload CV"
  // fallback when no Artifacts CV exists, so this only removes a "replace
  // anytime" shortcut, not core functionality; artifactsSheetHTML/its
  // handler stay in the file, unreachable, same treatment given other
  // dropped Home content above).
  const homeExtraIconsHTML = activeScreen === "home" ? helpBtnHTML("dashboard")
    : activeScreen === "meta" ? helpBtnHTML("meta")
    : "";

  root.innerHTML = `
    <div class="shell app-shell qhub-shell">
      ${appHeaderHTML(s, homeExtraIconsHTML)}
      ${activeScreen === "home" ? helpSheetHTML("dashboard") : ""}
      ${activeScreen === "meta" ? helpSheetHTML("meta") : ""}
      <div class="screen-body qhub-scroll">${screenBodyHTML}</div>
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
    // Eleva Home redesign: CTA label flips to "Lanjutkan" once tapped, for
    // every branch below (practice-test/job-match/job-application/
    // nutrition/default reflective all funnel through this one handler) -
    // one insertion point instead of five. Ephemeral/session-only, see
    // questCtaState's own comment near reasonOpenIds.
    questCtaState.set(id, "started");
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
      // (practiceTestFlowHTML's "track" step) still exists and is still used
      // by LINGUA's Reading row, where the user is deliberately choosing to
      // start a session and picking what to practice IS the point. The
      // "kind" step itself is unreachable from anywhere today (round 41:
      // LINGUA's Listening row now launches the Listening Half Diagnostic
      // instead of this generic AI quiz) - left in place, not deleted.
      const pts = quest.practiceTestSchema || {};
      const kind = pts.kind || "reading";
      const track = pts.track || "academic";
      practiceTestFlow = { questId: id, kind, track, answers: {}, origin: "home" };
      root.innerHTML = spinnerHTML("Menyusun soal...");
      try {
        const resp = await api("/api/practice-test/generate", { method: "POST", body: { questId: id, kind, track } });
        // Round 42: every reading payload (sprint AND drill) opens in the
        // dedicated test-mode shell; the old flat quiz card only remains for
        // the unreachable listening kind.
        if (kind === "reading") {
          startReadingTest(id, track, resp, "home");
          practiceTestFlow = null;
        } else {
          practiceTestFlow.payload = resp;
          practiceTestFlow.plays = 0;
          practiceTestFlow.step = "test";
          practiceTestFlow.error = "";
        }
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
    // Video Quest: same "own flow, not reflectOpen" pattern. One fresh
    // /api/state refresh first (the MOVEMENT staleness lesson) - the lock
    // in quest.videoQuizState may have been created on another tab/device,
    // and re-entry must land on the locked view, never back on pick.
    if (quest?.completionType === "video-quiz") {
      root.innerHTML = spinnerHTML("Memuat quest...");
      appState = await api("/api/state").catch(() => appState);
      const fresh = (appState.openQuests || []).find((q) => q.id === id);
      if (!fresh) {
        renderDashboard();
        return;
      }
      startVideoQuiz(fresh, "home");
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
    // BODY · MOVEMENT execution flow (design handoff): quests tagged
    // primaryFeature "MOVEMENT" (cardio/gym Today's Trial quests, stage 1's
    // normalizeMovementFields) get the real multi-screen flow instead of
    // the legacy single-form reflect flow - checked before the fallthrough
    // below, which stays exactly as-is for recovery and every other quest.
    if (quest?.primaryFeature === "MOVEMENT") {
      // Bug report (bugreportkirimbuktiaktivitas.pdf, issue 3): allOpenQuests
      // can be stale (quest already reflected on another device/tab, or
      // closed out by the 28h expiry sweep since the last GET /api/state) -
      // opening straight into Preview on a dead quest is what dead-ends the
      // user at submit time instead of here. One fresh refresh first, so the
      // graceful "sudah selesai" state (see mvShowAlreadyReflected) catches
      // it proactively rather than only in the /api/reflection catch block.
      root.innerHTML = spinnerHTML("Memuat quest...");
      appState = await api("/api/state").catch(() => appState);
      const fresh = (appState.openQuests || []).find((q) => q.id === id);
      if (!fresh) {
        mvShowAlreadyReflected(id, quest);
        renderDashboard();
        return;
      }
      beginMovementFlow(id, fresh.quest, fresh.goalIndex);
      renderDashboard();
      return;
    }
    // Multi-Domain Quest Hub: "Mulai Quest" always opens the Hub overview -
    // never jumps straight into Recovery or Nutrition, per the handoff's
    // explicit rule (the Hub is the only place quest-level status lives).
    // Keyed on completionType (not primaryFeature, unlike the MOVEMENT
    // check just above) - this quest's primaryFeature is "RECOVERY", never
    // the literal string "MOVEMENT", so the two checks can never collide
    // regardless of which runs first.
    if (quest?.completionType === "multi-domain") {
      questHubFlow = { questId: id, view: "hub", error: "", saving: false, completing: false };
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
    // Video Quest needs a topic first - show the inline topic card (same
    // confirm-before-create treatment as metaBodyPicking/metaSomaConfirm:
    // no quest exists server-side until the user actually starts).
    if (tool === "video-quest") {
      metaVideoQuestPicking = true;
      metaBodyPicking = false;
      metaSomaConfirm = null;
      renderDashboard();
      return;
    }
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
      metaSomaConfirm = null;
      renderDashboard();
      return;
    }
    // Movement→Training spec item 2: Recovery (and fresh-start Nutrition)
    // used to POST /api/meta/start right here on the first tap - a quest
    // existed server-side before the user saw any screen at all. Now they
    // get the same interstitial Movement's kind picker already provides:
    // show a confirm card first, create nothing until #metaSomaConfirmBtn.
    metaSomaConfirm = mode === "recovery" ? "recovery" : "nutrition";
    metaBodyPicking = false;
    renderDashboard();
  }));
  // The confirmed start - this is where the old [data-soma-mode] immediate-
  // start logic moved, unchanged except for the /api/state refresh (the
  // same stale-appState bug the gym kind picker had: renderDashboard()
  // without a refresh means the reflect form's allOpenQuests lookup misses
  // the just-created quest and silently renders nothing).
  document.getElementById("metaSomaConfirmBtn")?.addEventListener("click", async () => {
    const mode = metaSomaConfirm;
    if (!mode) return;
    root.innerHTML = spinnerHTML("Menyiapkan sesi...");
    try {
      if (mode === "recovery") {
        const { quest } = await api("/api/meta/start", { method: "POST", body: { tool: "body", kind: "recovery" } });
        reflectTarget = quest.id; reflectOpen = true; reflectStatus = "COMPLETED"; reflectText = "";
        structForm = {}; reflectError = ""; unableQuestId = null;
        recordMode = true; structKind = "recovery"; structKindAuto = true;
      } else {
        const { quest } = await api("/api/meta/start", { method: "POST", body: { tool: "nutrition" } });
        await openNutritionFlow(quest);
      }
      appState = await api("/api/state");
      metaSomaConfirm = null;
      activeScreen = "home";
    } catch (e) {
      metaSomaConfirm = null;
      metaError = e.message;
    }
    renderDashboard();
  });
  document.getElementById("metaSomaCancel")?.addEventListener("click", () => { metaSomaConfirm = null; renderDashboard(); });
  // Video Quest's confirmed start: create the META quest with the typed
  // topic, refresh state (the metaSomaConfirmBtn stale-appState lesson),
  // then hand into the same videoQuizFlow a Today's Trial quest would use.
  document.getElementById("metaVideoQuestStart")?.addEventListener("click", async () => {
    const topic = String(document.getElementById("metaVideoQuestTopic")?.value || "").trim();
    if (topic.length < 3) {
      metaError = "Tulis topik yang mau kamu pelajari dulu.";
      renderDashboard();
      return;
    }
    root.innerHTML = spinnerHTML("Menyiapkan sesi...");
    try {
      const { quest } = await api("/api/meta/start", { method: "POST", body: { tool: "video-quest", topic } });
      appState = await api("/api/state");
      metaVideoQuestPicking = false;
      startVideoQuiz(quest, "meta");
      activeScreen = "home";
    } catch (e) {
      metaError = e.message;
    }
    renderDashboard();
  });
  document.getElementById("metaVideoQuestCancel")?.addEventListener("click", () => { metaVideoQuestPicking = false; renderDashboard(); });
  // LINGUA's Reading row starts the generic AI-quiz Practice Test flow with
  // the track PRESET (skips straight to practiceTestFlow's "track" step
  // instead of asking kind first). The Listening row now launches the round
  // 41 IELTS Listening Half Diagnostic instead (a fixed, curated experience
  // - replaces that old generic AI-quiz destination entirely per the
  // founder's own confirmed decision; practiceTestFlow's kind==="listening"
  // path becomes unreachable from here, left in place, same "don't delete,
  // just unreachable" convention as elsewhere). Writing/Speaking have no row
  // here at all yet (coming-soon).
  document.querySelectorAll("[data-lingua-track]").forEach((b) => b.addEventListener("click", async () => {
    const kind = b.dataset.linguaTrack;
    metaError = "";
    root.innerHTML = spinnerHTML("Menyiapkan sesi...");
    try {
      if (kind === "listening") {
        const { quest, assessment } = await api("/api/meta/start", { method: "POST", body: { tool: "listening-diagnostic" } });
        listeningDiagnosticFlow = {
          questId: quest.id, step: "intro", assessment, answers: {}, runsCompleted: 0,
          playback: { state: "idle", gen: 0, recordingId: null }, deadlineTs: null, submitConfirmOpen: false, error: "",
        };
      } else {
        const { quest } = await api("/api/meta/start", { method: "POST", body: { tool: "practice-test" } });
        practiceTestFlow = { questId: quest.id, step: "track", kind, answers: {}, origin: "meta" };
      }
      activeScreen = "home";
    } catch (e) {
      metaError = e.message;
    }
    renderDashboard();
  }));
  // The listening-diagnostic "intro" step renders inside this normal chrome
  // (unlike "active"/"submitted", which bypass renderDashboard() entirely
  // above) - wireListeningDiagnosticHandlers() also binds lstnPlayBtn/
  // lstnReplay/etc., all safe no-ops here since those ids don't exist on
  // the intro screen, only lstnStart/lstnCancel do.
  if (listeningDiagnosticFlow?.step === "intro") wireListeningDiagnosticHandlers();
  // Same intro-in-chrome wiring for the Reading Half Diagnostic - only
  // rdgStart/rdgCancel exist on that screen, the rest are safe no-ops.
  if (readingTestFlow?.step === "intro") wireReadingTestHandlers();
  // And for the Video Quest intro - only vqStart/vqCancel exist there.
  if (videoQuizFlow?.step === "intro") wireVideoQuizHandlers();
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
    metaSomaConfirm = null;
    metaVideoQuestPicking = false;
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
      // The reflect form looks the quest up in appState.openQuests
      // (targetDay/reflectTarget) - without this refresh the just-created
      // quest isn't there yet, targetDay comes back null, and the record
      // form silently fails to render (looked like "selecting Gym drops
      // back to Home"). Same pattern data-meta-goal-submit already uses.
      appState = await api("/api/state");
      // beginStructuredOrReflectiveFlow reads quest.gymSession to route new
      // gym quests into the multi-exercise Training log (Training spec) -
      // cardio and legacy quests take the same single-form cascade as before.
      beginStructuredOrReflectiveFlow(quest.id, quest.quest);
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
      // Round 42: reading goes to the dedicated test shell (see the quest
      // handler above); only the unreachable listening kind still uses the
      // flat quiz card.
      if (practiceTestFlow.kind === "reading") {
        startReadingTest(practiceTestFlow.questId, practiceTestFlow.track, resp, practiceTestFlow.origin || "meta");
        practiceTestFlow = null;
      } else {
        practiceTestFlow.payload = resp;
        practiceTestFlow.answers = {};
        practiceTestFlow.plays = 0;
        practiceTestFlow.step = "test";
        practiceTestFlow.error = "";
      }
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
      questCtaState.set(practiceTestFlow.questId, "completed");
      completedResult = {
        questTitle: qd?.quest?.title || "", status: "COMPLETED", goalIndex: qd?.goalIndex,
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
      if (f.kind === "reading") {
        startReadingTest(f.questId, f.track, resp, f.origin || "home");
        practiceTestFlow = null;
      } else {
        f.payload = resp;
        f.plays = 0;
        f.step = "test";
        f.error = "";
      }
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
      questCtaState.set(jobMatchFlow.questId, "completed");
      completedResult = {
        // Task 14 point 6: no more delta chip (deltas always empty here) -
        // resp.target is the Milestone progress line instead (reuses
        // targetPickerHTML, same component the structured-physical flow
        // uses for its own Target Berikutnya line).
        questTitle: qd?.quest?.title || "", status: "COMPLETED", goalIndex: qd?.goalIndex,
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
      questCtaState.set(jobApplicationFlow.questId, "completed");
      completedResult = {
        questTitle: qd?.quest?.title || "", status: "COMPLETED", goalIndex: qd?.goalIndex,
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
  // Multi-Domain Quest Hub (design handoff, 19 Agustus).
  document.getElementById("mdqBackHome")?.addEventListener("click", async () => {
    questHubFlow = null;
    root.innerHTML = spinnerHTML("Memuat...");
    appState = await api("/api/state");
    renderDashboard();
  });
  // "Kembali" from a feature module is a pure cancel back to the Hub
  // overview, not a save - only what was already persisted via "Simpan"
  // survives; the in-progress draft is discarded, matching the handoff's
  // explicit "Back vs. cancel are separate" rule (this button never loses
  // ALREADY-SAVED progress, since that lives server-side, not in the draft).
  document.getElementById("mdqBackHub")?.addEventListener("click", () => {
    questHubFlow.view = "hub"; questHubFlow.draft = null; questHubFlow.error = "";
    renderDashboard();
  });
  // Opens a feature module, seeding the draft from whatever's already saved
  // server-side for that feature - so re-opening an in-progress or COMPLETE
  // feature shows the previous picks, not a blank form (brief: editing an
  // already-complete feature back to incomplete must be possible).
  document.querySelectorAll("[data-mdq-open]").forEach((b) => b.addEventListener("click", () => {
    const featureKey = b.dataset.mdqOpen.toUpperCase();
    const day = (appState.openQuests || []).find((q) => q.id === questHubFlow.questId);
    questHubFlow.view = featureKey.toLowerCase();
    questHubFlow.draft = { ...((day?.quest?.featureData || {})[featureKey] || {}) };
    questHubFlow.error = "";
    renderDashboard();
  }));
  document.querySelectorAll("[data-mdq-chip]").forEach((b) => b.addEventListener("click", () => {
    questHubFlow.draft = { ...(questHubFlow.draft || {}), [b.dataset.mdqChip]: b.dataset.mdqValue };
    questHubFlow.error = "";
    renderDashboard();
  }));
  document.querySelectorAll("[data-mdq-step]").forEach((b) => b.addEventListener("click", () => {
    const key = b.dataset.mdqStep;
    const delta = Number(b.dataset.mdqDelta);
    const current = typeof questHubFlow.draft?.[key] === "number" ? questHubFlow.draft[key] : 0;
    const next = Math.round(Math.max(0, current + delta) * 100) / 100; // avoid float drift on 0.25 steps
    questHubFlow.draft = { ...(questHubFlow.draft || {}), [key]: next };
    questHubFlow.error = "";
    renderDashboard();
  }));
  document.getElementById("mdqSaveFeature")?.addEventListener("click", async (e) => {
    if (questHubFlow.saving) return; // duplicate-submit guard
    const featureKey = e.currentTarget.dataset.mdqFeature;
    questHubFlow.saving = true; questHubFlow.error = "";
    renderDashboard();
    try {
      const path = featureKey === "RECOVERY" ? "/api/quest-hub/recovery" : "/api/quest-hub/nutrition";
      await api(path, { method: "POST", body: { questId: questHubFlow.questId, ...questHubFlow.draft } });
      appState = await api("/api/state");
      questHubFlow.saving = false; questHubFlow.view = "hub"; questHubFlow.draft = null;
    } catch (err) {
      questHubFlow.saving = false; questHubFlow.error = err.message;
    }
    renderDashboard();
  });
  document.getElementById("mdqComplete")?.addEventListener("click", async () => {
    if (!questHubFlow || questHubFlow.completing) return; // duplicate-submit guard
    questHubFlow.completing = true; questHubFlow.error = "";
    renderDashboard();
    try {
      const resp = await api("/api/quest-hub/complete", { method: "POST", body: { questId: questHubFlow.questId } });
      questHubFlow = null;
      completedResult = {
        questTitle: resp.questTitle, status: "COMPLETED", interpretation: resp.interpretation,
        safetyNote: resp.safetyNote, deltas: resp.deltas, mentorReply: resp.mentorReply,
        multiDomainSummary: true,
      };
    } catch (err) {
      questHubFlow.completing = false; questHubFlow.error = err.message;
    }
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
  // Training multi-exercise session wiring. Weight/reps inputs write straight
  // into gymSession state with NO re-render (focus would be lost mid-typing,
  // same constraint as the data-sf inputs above); structural taps (add/remove/
  // done/collapse/picker) re-render normally.
  if (gymSession) {
    const setAt = (ref) => {
      const [i, j] = String(ref).split(":").map(Number);
      return gymSession.exercises[i]?.sets[j];
    };
    document.getElementById("gsAddExercise")?.addEventListener("click", () => {
      gymSession.pickerOpen = true;
      ensureExerciseCatalog();
      renderDashboard();
    });
    document.getElementById("gsPickerCancel")?.addEventListener("click", () => {
      gymSession.pickerOpen = false;
      renderDashboard();
    });
    document.getElementById("gsSearch")?.addEventListener("input", (e) => {
      gymSession.pickerQuery = e.target.value;
      const listEl = document.getElementById("gsPickList");
      if (listEl) {
        listEl.innerHTML = gymPickListHTML();
        wireGymPickButtons();
      }
    });
    document.querySelectorAll("[data-gs-group]").forEach((b) => b.addEventListener("click", () => {
      gymSession.pickerGroup = b.dataset.gsGroup || null;
      renderDashboard();
    }));
    wireGymPickButtons();
    document.querySelectorAll("[data-gs-collapse]").forEach((b) => b.addEventListener("click", () => {
      const ex = gymSession.exercises[Number(b.dataset.gsCollapse)];
      if (ex) ex.collapsed = !ex.collapsed;
      renderDashboard();
    }));
    document.querySelectorAll("[data-gs-remove]").forEach((b) => b.addEventListener("click", () => {
      gymSession.exercises.splice(Number(b.dataset.gsRemove), 1);
      renderDashboard();
    }));
    document.querySelectorAll("[data-gs-addset]").forEach((b) => b.addEventListener("click", () => {
      const ex = gymSession.exercises[Number(b.dataset.gsAddset)];
      // A new set starts prefilled from the previous row - the common case
      // is same weight, same target reps (how the reference apps behave too).
      if (ex) {
        const last = ex.sets[ex.sets.length - 1];
        ex.sets.push({ weightKg: last?.weightKg ?? "", reps: last?.reps ?? "", done: false });
      }
      renderDashboard();
    }));
    document.querySelectorAll("[data-gs-done]").forEach((b) => b.addEventListener("click", () => {
      const s = setAt(b.dataset.gsDone);
      if (s) s.done = !s.done;
      renderDashboard();
    }));
    document.querySelectorAll("[data-gs-w]").forEach((el) => el.addEventListener("input", (e) => {
      const s = setAt(el.dataset.gsW);
      if (s) s.weightKg = e.target.value;
    }));
    document.querySelectorAll("[data-gs-r]").forEach((el) => el.addEventListener("input", (e) => {
      const s = setAt(el.dataset.gsR);
      if (s) s.reps = e.target.value;
    }));
  }
  document.getElementById("submitReflect")?.addEventListener("click", async () => {
    root.innerHTML = spinnerHTML("Menyimpan refleksi...");
    try {
      const body = { status: reflectStatus, text: reflectText, questId: targetDay.id };
      if (recordMode && structKind && reflectStatus !== "ABANDONED") {
        // kind is the user's pick (both gym variants validate as "gym" -
        // they only differ in which fields rendered); a bodyweight session
        // never sends a weight, even one left over from switching variants.
        // Task 7d: "recovery" is its own third kind (rest/hydration/nutrition
        // fields, see structFieldsHTML) - not a gym variant.
        // Training spec: "gym-session" carries the multi-exercise log from
        // gymSession state instead of structForm - raw input strings become
        // numbers here, at the one edge where they leave the client (same
        // convention as cardio's Menit/Detik combine below). Only ids and
        // raw set numbers are sent - names/muscle groups/calories all come
        // from the server's own catalog.
        const kind = structKind === "cardio" ? "cardio" : structKind === "recovery" ? "recovery" : structKind === "gym-session" ? "gym-session" : "gym";
        if (structKind === "gym-session") {
          body.structuredData = {
            kind,
            exercises: (gymSession?.exercises || []).map((ex) => ({
              exerciseId: ex.exerciseId,
              sets: ex.sets.map((s) => ({
                weightKg: s.weightKg === "" || s.weightKg == null ? null : Number(s.weightKg),
                reps: s.reps === "" || s.reps == null ? null : Number(s.reps),
                done: Boolean(s.done),
              })),
            })),
          };
        } else {
          body.structuredData = { ...structForm, kind };
        }
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
      questCtaState.set(targetDay.id, "completed");
      completedResult = {
        // Task 7c: server computes the real status for structured-physical
        // quests (evidence vs target) - resp.status is authoritative, not
        // the client's reflectStatus (which for those quests is just a
        // fixed "COMPLETED" now that the self-report picker is gone).
        questTitle: targetDay.quest.title, status: resp.status, goalIndex: targetDay.goalIndex,
        questId: resp.questId, mentorReply: resp.mentorReply, interpretation: resp.interpretation,
        safetyNote: resp.safetyNote, deltas: resp.deltas, structuredData: resp.structuredData,
        target: resp.targetScreen || null, shortfallPrompt: resp.shortfallPrompt || null,
      };
      shortfallReasonPicked = null;
      reflectOpen = false; reflectTarget = null; reflectText = ""; structForm = {}; reflectError = "";
      recordMode = false; structKind = null; structKindAuto = false; gymSession = null;
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
  document.getElementById("headerSettings")?.addEventListener("click", () => { activeScreen = "settings"; renderDashboard(); });
  // Eleva Home redesign: tap a compact quest card to select it in place -
  // same mechanic as Pilih Pathway's .ppick-col (index only, never
  // reorders, re-render reflects the new selection in the detail panel).
  document.querySelectorAll("[data-qhub-idx]").forEach((b) => b.addEventListener("click", () => {
    selectedQuestIndex = Number(b.dataset.qhubIdx);
    renderDashboard();
  }));
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
// Round 38: while the on-screen keyboard is open (an editable element is
// focused), visualViewport.height shrinks - if --vh tracked that shrink,
// every position:fixed shell sized off it would compress and its pinned
// bottom CTA would ride UP on top of the keyboard (founder-reported on the
// Goal Setting screen: "Ganti Pathway"/"Mulai First Trial" jumping above
// the keyboard). Freezing --vh during editing keeps the shell at its
// pre-keyboard height so the keyboard simply overlays the bottom, which is
// the behavior the founder asked for - the focused textarea itself stays
// visible via the focus scrollIntoView handler on the goal cards.
let vhFrozenForKeyboard = false;
function isEditableEl(el) {
  return !!el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT");
}
document.addEventListener("focusin", (e) => {
  if (isEditableEl(e.target)) vhFrozenForKeyboard = true;
});
document.addEventListener("focusout", (e) => {
  if (!isEditableEl(e.target)) return;
  vhFrozenForKeyboard = false;
  setTimeout(setRealVH, 250); // re-measure after the keyboard-close animation settles
});
function setRealVH() {
  if (vhFrozenForKeyboard) return;
  const h = (window.visualViewport ? window.visualViewport.height : window.innerHeight) * 0.01;
  document.documentElement.style.setProperty("--vh", h + "px");
}
setRealVH();
window.addEventListener("resize", setRealVH);
window.addEventListener("orientationchange", setRealVH);
window.visualViewport?.addEventListener("resize", setRealVH);

// Dev-only preview of all 7 onboarding bridge stages (round 19), so the
// founder can review the art/motion without redoing the whole onboarding
// flow or waiting on real AI generation. Gated server-side (GET /api/env,
// unauthenticated) rather than trusting the query param alone - inert on
// the deployed production app even if someone guesses the URL, since /api/env
// there always reports "production" and this bails out to the normal
// boot() path.
async function tryStartBridgeDevPreview() {
  if (new URLSearchParams(window.location.search).get("debug") !== "bridges") return false;
  let env;
  try { ({ env } = await api("/api/env")); } catch { return false; }
  if (env !== "development") return false;
  ui = { view: "adaptive" };
  bridgeDevPreviewIndex = 0;
  renderBridgeDevPreview();
  return true;
}
function renderBridgeDevPreview() {
  bridgeStageKey = BRIDGE_PREVIEW_ORDER[bridgeDevPreviewIndex];
  bridgeErrorRetry = null;
  renderBridge(); // identical markup/CSS to production - no separate preview-only rendering for the art itself
  document.getElementById("bridgeRoot")?.insertAdjacentHTML("beforeend", `
    <div class="bridge-dev-controls">
      <button id="bridgeDevPrev" ${bridgeDevPreviewIndex === 0 ? "disabled" : ""}>‹ Prev</button>
      <span class="mono">${bridgeDevPreviewIndex + 1}/${BRIDGE_PREVIEW_ORDER.length} · ${esc(ONBOARDING_BRIDGES[bridgeStageKey].name)}</span>
      <button id="bridgeDevNext" ${bridgeDevPreviewIndex === BRIDGE_PREVIEW_ORDER.length - 1 ? "disabled" : ""}>Next ›</button>
    </div>`);
  document.getElementById("bridgeDevPrev")?.addEventListener("click", () => { bridgeDevPreviewIndex--; renderBridgeDevPreview(); });
  document.getElementById("bridgeDevNext")?.addEventListener("click", () => { bridgeDevPreviewIndex++; renderBridgeDevPreview(); });
}

(async () => {
  if (await tryStartBridgeDevPreview()) return;
  boot();
})();
