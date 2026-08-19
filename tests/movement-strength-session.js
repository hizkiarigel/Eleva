// BODY · MOVEMENT execution flow (design handoff): unit coverage for the new
// "strength-session" structured kind - deliberately distinct from META's
// "gym-session" (server/structured.js), because its source of truth is the
// quest's own AI-authored plannedExercises (matched by index in
// server/index.js's computeEvidenceStatus), never a catalog lookup. This
// file covers validateStructuredData's plausibility/shape rules; the
// index-matched evidence-ratio computation and the ADAPTED-on-endedEarly
// override live in server/index.js (not exported) and are exercised
// end-to-end instead, via tests/movement-flow.e2e.js's DB assertions.
//
// Run: node tests/movement-strength-session.js (no DB/server needed - pure unit).

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

console.log("Movement: strength-session validation");

test("a valid multi-exercise submission passes, names/rpe pass through as-is", () => {
  const r = validateStructuredData("strength-session", {
    exercises: [
      { name: "Squat", rpe: 7, sets: [{ reps: 10, weightKg: 40, done: true }, { reps: 10, weightKg: 40, done: true }] },
      { name: "Calf Raise", rpe: 6, sets: [{ reps: 12, weightKg: null, done: true }] },
    ],
  });
  assert.ok(r.ok, r.error);
  assert.strictEqual(r.clean.kind, "strength-session");
  assert.strictEqual(r.clean.exercises[0].name, "Squat");
  assert.strictEqual(r.clean.exercises[0].rpe, 7);
  assert.strictEqual(r.clean.exercises[0].sets.length, 2);
});

test("an unchecked (not-done) set may be left blank - it's a plan row, not evidence", () => {
  const r = validateStructuredData("strength-session", {
    exercises: [{ name: "Squat", sets: [{ reps: 10, weightKg: 40, done: true }, { done: false }] }],
  });
  assert.ok(r.ok, r.error);
  assert.strictEqual(r.clean.exercises[0].sets[1].done, false);
});

test("an out-of-range RPE (e.g. 4 or 11) is dropped to null rather than rejecting the submission", () => {
  const r = validateStructuredData("strength-session", {
    exercises: [{ name: "Squat", rpe: 11, sets: [{ reps: 10, weightKg: 40, done: true }] }],
  });
  assert.ok(r.ok, r.error);
  assert.strictEqual(r.clean.exercises[0].rpe, null);
});

test("rejects: no exercises, an exercise with no name, an exercise with no sets, no done set anywhere", () => {
  assert.strictEqual(validateStructuredData("strength-session", { exercises: [] }).ok, false);
  assert.strictEqual(validateStructuredData("strength-session", { exercises: [{ name: "", sets: [{ reps: 10, done: true }] }] }).ok, false);
  assert.strictEqual(validateStructuredData("strength-session", { exercises: [{ name: "Squat", sets: [] }] }).ok, false);
  assert.strictEqual(validateStructuredData("strength-session", {
    exercises: [{ name: "Squat", sets: [{ weightKg: 40, done: false }] }],
  }).ok, false);
});

test("rejects implausible numbers on done sets (reps > 500, weight > 500kg), same caps as the legacy single-exercise 'gym' kind", () => {
  assert.strictEqual(validateStructuredData("strength-session", {
    exercises: [{ name: "Squat", sets: [{ reps: 501, weightKg: 40, done: true }] }],
  }).ok, false);
  assert.strictEqual(validateStructuredData("strength-session", {
    exercises: [{ name: "Squat", sets: [{ reps: 10, weightKg: 501, done: true }] }],
  }).ok, false);
});

test("a done set without reps is rejected", () => {
  assert.strictEqual(validateStructuredData("strength-session", {
    exercises: [{ name: "Squat", sets: [{ weightKg: 40, done: true }] }],
  }).ok, false);
});

test("scope guard: 'gym-session' (META) and legacy 'gym' kinds are untouched, both still validate as before", () => {
  const catalog = require("../server/exerciseCatalog");
  const gymSession = validateStructuredData("gym-session", {
    exercises: [{ exerciseId: "squat", sets: [{ weightKg: 60, reps: 5, done: true }] }],
  });
  assert.ok(gymSession.ok, gymSession.error);
  assert.strictEqual(gymSession.clean.kind, "gym-session");
  assert.ok(catalog.EXERCISES_BY_ID.has("squat"), "sanity: catalog still resolves ids the old way");

  const legacyGym = validateStructuredData("gym", { gerakan: "bench press", set: 3, repetisi: 10, bebanKg: 40, titikGagal: "set 3 rep 8" });
  assert.ok(legacyGym.ok, legacyGym.error);
  assert.strictEqual(legacyGym.clean.kind, "gym");
});

process.exit(failures ? 1 : 0);
