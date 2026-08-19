// Bug fix (bugreportkirimbuktiaktivitas.pdf): unit coverage for the "cardio"
// structured kind's new evidenceChoice/evidencePhoto validation - a photo is
// required once "Screenshot tracker"/"Foto treadmill" is picked, validated
// against jobMatch's existing image mime/size caps, and always dropped from
// the returned `clean` object (founder chose "buang setelah submit" -
// validate, then discard, never persist the bytes).
//
// Run: node tests/movement-evidence-photo.js (no DB/server needed - pure unit).

const assert = require("assert");
const { validateStructuredData } = require("../server/structured");

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

console.log("Movement: cardio evidence photo validation");

const BASE = { jenisAktivitas: "Lari", durasiMenit: 30, jarakKm: 5, titikBerat: "Ringan" };

test("activity-data choice needs no photo", () => {
  const r = validateStructuredData("cardio", { ...BASE, evidenceChoice: "activity-data" });
  assert.ok(r.ok, r.error);
  assert.strictEqual(r.clean.evidenceChoice, "activity-data");
});

test("tracker-screenshot with no photo attached is rejected", () => {
  const r = validateStructuredData("cardio", { ...BASE, evidenceChoice: "tracker-screenshot" });
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /Lampirkan/);
});

test("treadmill-photo with no photo attached is rejected", () => {
  const r = validateStructuredData("cardio", { ...BASE, evidenceChoice: "treadmill-photo" });
  assert.strictEqual(r.ok, false);
});

test("valid image is accepted and NOT echoed back in clean (discard-after-validate)", () => {
  const r = validateStructuredData("cardio", {
    ...BASE, evidenceChoice: "tracker-screenshot",
    evidencePhoto: { mimeType: "image/png", dataBase64: "AAAA", filename: "tracker.png" },
  });
  assert.ok(r.ok, r.error);
  assert.strictEqual(r.clean.evidenceChoice, "tracker-screenshot");
  assert.strictEqual(r.clean.evidencePhoto, undefined, "photo bytes must never reach the persisted structuredData");
});

test("unsupported mime type is rejected", () => {
  const r = validateStructuredData("cardio", {
    ...BASE, evidenceChoice: "treadmill-photo",
    evidencePhoto: { mimeType: "application/pdf", dataBase64: "AAAA", filename: "x.pdf" },
  });
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /Format foto/);
});

test("empty/oversized base64 payload is rejected", () => {
  const oversized = "A".repeat(20 * 1024 * 1024);
  const r1 = validateStructuredData("cardio", {
    ...BASE, evidenceChoice: "treadmill-photo",
    evidencePhoto: { mimeType: "image/jpeg", dataBase64: "", filename: "x.jpg" },
  });
  assert.strictEqual(r1.ok, false);
  const r2 = validateStructuredData("cardio", {
    ...BASE, evidenceChoice: "treadmill-photo",
    evidencePhoto: { mimeType: "image/jpeg", dataBase64: oversized, filename: "x.jpg" },
  });
  assert.strictEqual(r2.ok, false);
});

test("an invalid evidenceChoice value is rejected", () => {
  const r = validateStructuredData("cardio", { ...BASE, evidenceChoice: "made-up-choice" });
  assert.strictEqual(r.ok, false);
});

console.log(failures ? `${failures} failure(s)` : "all passed");
if (failures) process.exit(1);
