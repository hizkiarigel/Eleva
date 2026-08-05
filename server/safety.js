// Defense-in-depth crisis detection for reflections — independent of the AI
// mentor's own instructions (see MENTOR_SYSTEM in server/claude.js). This
// check runs even if the AI ignores its prompt, forgets, or is unreachable.
// It does NOT replace the prompt instruction; both stay in place.
//
// Keep this list SHORT and SPECIFIC to explicit self-harm/suicide intent.
// Ordinary distress words ("capek", "sedih", "pengen nyerah") must stay out —
// they're common in venting and would false-positive constantly, silently
// replacing a real mentor reply with the crisis message. When unsure whether
// a phrase belongs here, leave it for the AI mentor to handle contextually.
const CRISIS_PHRASES = [
  "bunuh diri",
  "mengakhiri hidup",
  "mengakhiri hidupku",
  "mengakhiri hidup saya",
  "mengakhiri semuanya",
  "akhiri hidupku",
  "akhiri hidup saya",
  "pengen mati aja",
  "pengen mati saja",
  "ingin mati saja",
  "mau mati aja",
  "mau mati saja",
  "lebih baik aku mati",
  "lebih baik saya mati",
  "gak pengen hidup lagi",
  "nggak pengen hidup lagi",
  "tidak ingin hidup lagi",
  "gak mau hidup lagi",
  "nggak mau hidup lagi",
  "menyakiti diri sendiri",
  "melukai diri sendiri",
  "menyayat diri",
  "menyilet diri",
  "nyilet diri",
];

const CRISIS_RESOURCE_MESSAGE =
  "Apa yang kamu tulis terdengar berat, dan ini di luar yang bisa dibantu oleh quest atau AI mentor mana pun. " +
  "Tolong hubungi Layanan Sejiwa/Healing119 — telepon 119 ekstensi 8, atau kunjungi www.healing119.id. " +
  "Layanan ini gratis, 24 jam, dan dikelola oleh Kemenkes RI. Kamu tidak harus melalui ini sendirian.";

function detectCrisis(text) {
  if (!text) return false;
  const normalized = text.toLowerCase();
  return CRISIS_PHRASES.some((phrase) => normalized.includes(phrase));
}

module.exports = { detectCrisis, CRISIS_RESOURCE_MESSAGE, CRISIS_PHRASES };
