// Regression test for SOMA Nutrition Implementation Brief Part A (12
// Agustus): founder-reported quest "Audit Fondasi Pemulihan" persisted as
// completionType "reflective" (free-text/12-word growth-gate form) instead
// of structured-physical/recovery (structured sleep/water/protein/pain
// fields, server/structured.js + public/app.js recoveryFieldsHTML).
//
// Root cause (per the brief): completionType is decided ONCE at generation
// time by the model; normalizeCompletionType (server/claude.js) is the
// defense-in-depth safety net, but until this fix it only validated shape
// (does structuredKind match a known combo), never content - a model that
// picked "reflective" outright for a recovery-themed quest sailed straight
// through. This suite locks in the new keyword backstop (looksRecoveryThemed)
// that catches exactly that case, named after the reported quest per the
// brief's explicit instruction ("regression coverage").
//
// Run: node tests/recoveryregression.js (no DB/server needed - pure unit).

const assert = require("assert");
const claude = require("../server/claude");

let failures = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ok - ${name}`);
  } catch (e) {
    failures += 1;
    console.error(`  FAIL - ${name}: ${e.message}`);
  }
}

console.log("Regression: 'Audit Fondasi Pemulihan' no longer reclassifies to reflective");

test("the exact reported quest - model returns reflective for a recovery-themed title - gets forced to structured-physical/recovery", () => {
  const quest = {
    completionType: "reflective",
    title: "Audit Fondasi Pemulihan",
    description: "Buat catatan jujur tentang apa yang kamu makan, tidur, dan minum hari ini setelah cedera kemarin.",
  };
  claude.normalizeCompletionType(quest);
  assert.strictEqual(quest.completionType, "structured-physical");
  assert.strictEqual(quest.structuredKind, "recovery");
});

test("recovery keyword in description alone (title generic) still triggers the backstop", () => {
  const quest = { completionType: "reflective", title: "Cek Diri Hari Ini", description: "Catat asupan protein dan kualitas tidurmu semalam." };
  claude.normalizeCompletionType(quest);
  assert.strictEqual(quest.structuredKind, "recovery");
});

test("kram/hidrasi keywords also trigger the backstop", () => {
  const kram = { completionType: "reflective", title: "Pulihkan Kram Betis", description: "" };
  claude.normalizeCompletionType(kram);
  assert.strictEqual(kram.structuredKind, "recovery");

  const hidrasi = { completionType: "reflective", title: "", description: "Jaga hidrasi seharian, minum air teratur." };
  claude.normalizeCompletionType(hidrasi);
  assert.strictEqual(hidrasi.structuredKind, "recovery");
});

test("already-correct structured-physical/recovery quests pass through untouched", () => {
  const quest = { completionType: "structured-physical", structuredKind: "recovery", title: "Audit Fondasi Pemulihan", description: "..." };
  claude.normalizeCompletionType(quest);
  assert.strictEqual(quest.completionType, "structured-physical");
  assert.strictEqual(quest.structuredKind, "recovery");
});

test("cardio/gym quests are never overridden by a coincidental keyword match", () => {
  // "makan" appearing incidentally in a cardio quest's why-adjacent text
  // must not steal it away from its real cardio classification - the
  // backstop only ever fires on the FALLTHROUGH path (see normalizeCompletionType).
  const quest = { completionType: "structured-physical", structuredKind: "cardio", title: "Lari 5km", description: "Habis lari, makan yang cukup ya." };
  claude.normalizeCompletionType(quest);
  assert.strictEqual(quest.structuredKind, "cardio");
});

test("no recovery keywords present - genuinely reflective quests still downgrade to reflective as before", () => {
  const quest = { completionType: "banana", title: "Renungkan Minggu Ini", description: "Tulis satu hal yang bikin kamu bangga." };
  claude.normalizeCompletionType(quest);
  assert.strictEqual(quest.completionType, "reflective");
  assert.strictEqual(quest.structuredKind, undefined);
});

test("practice-test/job-match-analysis/job-application-submit are never hijacked by keyword coincidence", () => {
  const pt = { completionType: "practice-test", title: "Latihan Reading", description: "Baca dan jawab soal." };
  claude.normalizeCompletionType(pt);
  assert.strictEqual(pt.completionType, "practice-test");

  const jm = { completionType: "job-match-analysis", title: "Cek Lowongan Data Analyst", description: "Bandingkan CV dengan lowongan." };
  claude.normalizeCompletionType(jm);
  assert.strictEqual(jm.completionType, "job-match-analysis");
});

test("normalizeEvidenceSchema downstream builds the recovery form shape after the backstop fires", () => {
  const quest = { completionType: "reflective", title: "Audit Fondasi Pemulihan", description: "Catat pemulihan cedera: tidur, hidrasi, protein." };
  claude.normalizeCompletionType(quest);
  claude.normalizeEvidenceSchema(quest);
  assert.deepStrictEqual(quest.evidenceSchema, { activityType: null, hasWeight: null, metricType: "recovery", target: null });
});

console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL TESTS PASSED");
process.exit(failures ? 1 : 0);
