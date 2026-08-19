// Training multi-exercise session (Movement→Training spec): unit coverage
// for the new "gym-session" structured kind - catalog-id resolution, per-set
// plausibility, the at-least-one-done-set rule, and the server-computed
// end-of-session evaluation (volume / calories / dominant muscle group,
// including the ties-list-both rule). Also locks in that the legacy "gym"
// kind still validates exactly as before (scope guard: in-flight
// single-exercise quests are never force-migrated).
//
// Run: node tests/gymsession.js (no DB/server needed - pure unit).

const assert = require("assert");
const { validateStructuredData } = require("../server/structured");
const catalog = require("../server/exerciseCatalog");

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

console.log("Training: gym-session validation + evaluation");

test("catalog has 40-60 exercises, all fields present, ids unique, groups known", () => {
  assert.ok(catalog.EXERCISES.length >= 40 && catalog.EXERCISES.length <= 60, `got ${catalog.EXERCISES.length}`);
  const ids = new Set();
  for (const e of catalog.EXERCISES) {
    assert.ok(e.id && e.name && e.equipment && e.primaryMuscleGroup, `incomplete entry ${e.id}`);
    assert.ok(["barbell", "dumbbell", "machine", "bodyweight"].includes(e.equipment), `bad equipment ${e.id}`);
    assert.ok(catalog.MUSCLE_GROUPS.includes(e.primaryMuscleGroup), `bad group ${e.id}`);
    assert.ok(Number.isFinite(e.caloriesPerSet) && e.caloriesPerSet > 0, `bad calories ${e.id}`);
    assert.ok(!ids.has(e.id), `duplicate id ${e.id}`);
    ids.add(e.id);
  }
});

test("a valid two-exercise session passes and computes the evaluation", () => {
  const r = validateStructuredData("gym-session", {
    exercises: [
      { exerciseId: "bench-press", sets: [{ weightKg: 40, reps: 10, done: true }, { weightKg: 40, reps: 8, done: true }] },
      { exerciseId: "lat-pulldown", sets: [{ weightKg: 35, reps: 12, done: true }] },
    ],
  });
  assert.ok(r.ok, r.error);
  assert.strictEqual(r.clean.kind, "gym-session");
  // volume = 40*10 + 40*8 + 35*12 = 1140
  assert.strictEqual(r.clean.evaluation.totalVolumeKg, 1140);
  // calories = bench 11*2 + lat pulldown 8*1 = 30
  assert.strictEqual(r.clean.evaluation.estimatedCalories, 30);
  // chest has 2 done sets, back 1 -> chest dominates alone
  assert.deepStrictEqual(r.clean.evaluation.dominantMuscleGroups, ["chest"]);
});

test("name and muscle group come from the server catalog, not the client payload", () => {
  const r = validateStructuredData("gym-session", {
    exercises: [{ exerciseId: "squat", name: "Totally Fake", muscleGroup: "chest", sets: [{ weightKg: 60, reps: 5, done: true }] }],
  });
  assert.ok(r.ok, r.error);
  assert.strictEqual(r.clean.exercises[0].name, "Squat");
  assert.strictEqual(r.clean.exercises[0].muscleGroup, "legs");
});

test("dominant muscle group ties list both, never forced to one winner", () => {
  const r = validateStructuredData("gym-session", {
    exercises: [
      { exerciseId: "push-up", sets: [{ reps: 15, done: true }] },
      { exerciseId: "pull-up", sets: [{ reps: 8, done: true }] },
    ],
  });
  assert.ok(r.ok, r.error);
  assert.deepStrictEqual([...r.clean.evaluation.dominantMuscleGroups].sort(), ["back", "chest"]);
});

test("bodyweight-only session: volume 0, calories still counted", () => {
  const r = validateStructuredData("gym-session", {
    exercises: [{ exerciseId: "plank", sets: [{ reps: 1, done: true }, { reps: 1, done: true }] }],
  });
  assert.ok(r.ok, r.error);
  assert.strictEqual(r.clean.evaluation.totalVolumeKg, 0);
  assert.strictEqual(r.clean.evaluation.estimatedCalories, 10);
});

test("not-done sets do not count toward any evaluation number", () => {
  const r = validateStructuredData("gym-session", {
    exercises: [{ exerciseId: "bench-press", sets: [{ weightKg: 40, reps: 10, done: true }, { weightKg: 100, reps: 10, done: false }] }],
  });
  assert.ok(r.ok, r.error);
  assert.strictEqual(r.clean.evaluation.totalVolumeKg, 400);
  assert.strictEqual(r.clean.evaluation.estimatedCalories, 11);
});

test("rejects: empty session, unknown exercise id, no done sets", () => {
  assert.strictEqual(validateStructuredData("gym-session", { exercises: [] }).ok, false);
  assert.strictEqual(validateStructuredData("gym-session", {
    exercises: [{ exerciseId: "nonexistent", sets: [{ reps: 10, done: true }] }],
  }).ok, false);
  assert.strictEqual(validateStructuredData("gym-session", {
    exercises: [{ exerciseId: "squat", sets: [{ weightKg: 60, reps: 5, done: false }] }],
  }).ok, false);
});

test("rejects implausible numbers on done sets (reps > 500, weight > 500kg)", () => {
  assert.strictEqual(validateStructuredData("gym-session", {
    exercises: [{ exerciseId: "squat", sets: [{ weightKg: 60, reps: 501, done: true }] }],
  }).ok, false);
  assert.strictEqual(validateStructuredData("gym-session", {
    exercises: [{ exerciseId: "squat", sets: [{ weightKg: 501, reps: 5, done: true }] }],
  }).ok, false);
});

test("a done set without reps is rejected; an unchecked blank set is allowed", () => {
  assert.strictEqual(validateStructuredData("gym-session", {
    exercises: [{ exerciseId: "squat", sets: [{ weightKg: 60, done: true }] }],
  }).ok, false);
  const r = validateStructuredData("gym-session", {
    exercises: [{ exerciseId: "squat", sets: [{ weightKg: 60, reps: 5, done: true }, { done: false }] }],
  });
  assert.ok(r.ok, r.error);
});

test("scope guard: legacy single-exercise 'gym' kind validates exactly as before", () => {
  const r = validateStructuredData("gym", { gerakan: "bench press", set: 3, repetisi: 10, bebanKg: 40, titikGagal: "set 3 rep 8" });
  assert.ok(r.ok, r.error);
  assert.strictEqual(r.clean.kind, "gym");
  assert.strictEqual(r.clean.set, 3);
});

process.exit(failures ? 1 : 0);
