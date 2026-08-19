// SOMA Training (Movement→Training spec): fixed exercise catalog for the
// multi-exercise workout-log session. Founder decision: a FIXED catalog,
// not AI-estimated per entry - caloriesPerSet is a rough static number per
// exercise (deliberately ignores bodyweight/duration for MVP; precision
// isn't the point, directional feedback is). Grouped by muscle region so
// the picker can be filtered the way the reference app does. Static data,
// no DB table needed - served read-only via GET /api/exercise-catalog and
// consulted server-side for the end-of-session evaluation, so the client
// can never inflate a calorie estimate by sending its own numbers.

const MUSCLE_GROUPS = ["chest", "back", "legs", "shoulders", "arms", "core"];

// Indonesian display labels for the picker's filter chips and result screen
// (the app's UI language throughout) - ids stay English/stable.
const MUSCLE_GROUP_LABELS = {
  chest: "Dada",
  back: "Punggung",
  legs: "Kaki",
  shoulders: "Bahu",
  arms: "Lengan",
  core: "Core",
};

// equipment: "barbell" | "dumbbell" | "machine" | "bodyweight"
// caloriesPerSet: rough kcal per completed set.
const EXERCISES = [
  // Chest
  { id: "bench-press", name: "Bench Press", equipment: "barbell", primaryMuscleGroup: "chest", secondaryMuscleGroup: "arms", caloriesPerSet: 11 },
  { id: "incline-bench-press", name: "Incline Bench Press", equipment: "barbell", primaryMuscleGroup: "chest", secondaryMuscleGroup: "shoulders", caloriesPerSet: 11 },
  { id: "dumbbell-bench-press", name: "Dumbbell Bench Press", equipment: "dumbbell", primaryMuscleGroup: "chest", secondaryMuscleGroup: "arms", caloriesPerSet: 10 },
  { id: "incline-dumbbell-press", name: "Incline Dumbbell Press", equipment: "dumbbell", primaryMuscleGroup: "chest", secondaryMuscleGroup: "shoulders", caloriesPerSet: 10 },
  { id: "dumbbell-fly", name: "Dumbbell Fly", equipment: "dumbbell", primaryMuscleGroup: "chest", caloriesPerSet: 7 },
  { id: "chest-press-machine", name: "Chest Press Machine", equipment: "machine", primaryMuscleGroup: "chest", secondaryMuscleGroup: "arms", caloriesPerSet: 8 },
  { id: "cable-crossover", name: "Cable Crossover", equipment: "machine", primaryMuscleGroup: "chest", caloriesPerSet: 7 },
  { id: "push-up", name: "Push-Up", equipment: "bodyweight", primaryMuscleGroup: "chest", secondaryMuscleGroup: "arms", caloriesPerSet: 6 },
  { id: "dips-chest", name: "Dips", equipment: "bodyweight", primaryMuscleGroup: "chest", secondaryMuscleGroup: "arms", caloriesPerSet: 7 },

  // Back
  { id: "deadlift", name: "Deadlift", equipment: "barbell", primaryMuscleGroup: "back", secondaryMuscleGroup: "legs", caloriesPerSet: 13 },
  { id: "barbell-row", name: "Barbell Row", equipment: "barbell", primaryMuscleGroup: "back", secondaryMuscleGroup: "arms", caloriesPerSet: 10 },
  { id: "dumbbell-row", name: "Dumbbell Row", equipment: "dumbbell", primaryMuscleGroup: "back", secondaryMuscleGroup: "arms", caloriesPerSet: 9 },
  { id: "lat-pulldown", name: "Lat Pulldown", equipment: "machine", primaryMuscleGroup: "back", secondaryMuscleGroup: "arms", caloriesPerSet: 8 },
  { id: "seated-cable-row", name: "Seated Cable Row", equipment: "machine", primaryMuscleGroup: "back", secondaryMuscleGroup: "arms", caloriesPerSet: 8 },
  { id: "pull-up", name: "Pull-Up", equipment: "bodyweight", primaryMuscleGroup: "back", secondaryMuscleGroup: "arms", caloriesPerSet: 8 },
  { id: "chin-up", name: "Chin-Up", equipment: "bodyweight", primaryMuscleGroup: "back", secondaryMuscleGroup: "arms", caloriesPerSet: 8 },
  { id: "back-extension", name: "Back Extension", equipment: "bodyweight", primaryMuscleGroup: "back", secondaryMuscleGroup: "core", caloriesPerSet: 5 },
  { id: "t-bar-row", name: "T-Bar Row", equipment: "machine", primaryMuscleGroup: "back", secondaryMuscleGroup: "arms", caloriesPerSet: 9 },

  // Legs
  { id: "squat", name: "Squat", equipment: "barbell", primaryMuscleGroup: "legs", secondaryMuscleGroup: "core", caloriesPerSet: 12 },
  { id: "front-squat", name: "Front Squat", equipment: "barbell", primaryMuscleGroup: "legs", secondaryMuscleGroup: "core", caloriesPerSet: 12 },
  { id: "leg-press", name: "Leg Press", equipment: "machine", primaryMuscleGroup: "legs", caloriesPerSet: 10 },
  { id: "romanian-deadlift", name: "Romanian Deadlift", equipment: "barbell", primaryMuscleGroup: "legs", secondaryMuscleGroup: "back", caloriesPerSet: 11 },
  { id: "leg-extension", name: "Leg Extension", equipment: "machine", primaryMuscleGroup: "legs", caloriesPerSet: 7 },
  { id: "leg-curl", name: "Leg Curl", equipment: "machine", primaryMuscleGroup: "legs", caloriesPerSet: 7 },
  { id: "walking-lunge", name: "Walking Lunge", equipment: "dumbbell", primaryMuscleGroup: "legs", secondaryMuscleGroup: "core", caloriesPerSet: 9 },
  { id: "bodyweight-squat", name: "Bodyweight Squat", equipment: "bodyweight", primaryMuscleGroup: "legs", caloriesPerSet: 6 },
  { id: "calf-raise", name: "Calf Raise", equipment: "machine", primaryMuscleGroup: "legs", caloriesPerSet: 5 },
  { id: "hip-thrust", name: "Hip Thrust", equipment: "barbell", primaryMuscleGroup: "legs", secondaryMuscleGroup: "core", caloriesPerSet: 9 },
  { id: "goblet-squat", name: "Goblet Squat", equipment: "dumbbell", primaryMuscleGroup: "legs", secondaryMuscleGroup: "core", caloriesPerSet: 9 },

  // Shoulders
  { id: "overhead-press", name: "Overhead Press", equipment: "barbell", primaryMuscleGroup: "shoulders", secondaryMuscleGroup: "arms", caloriesPerSet: 10 },
  { id: "dumbbell-shoulder-press", name: "Dumbbell Shoulder Press", equipment: "dumbbell", primaryMuscleGroup: "shoulders", secondaryMuscleGroup: "arms", caloriesPerSet: 9 },
  { id: "lateral-raise", name: "Lateral Raise", equipment: "dumbbell", primaryMuscleGroup: "shoulders", caloriesPerSet: 6 },
  { id: "front-raise", name: "Front Raise", equipment: "dumbbell", primaryMuscleGroup: "shoulders", caloriesPerSet: 6 },
  { id: "rear-delt-fly", name: "Rear Delt Fly", equipment: "dumbbell", primaryMuscleGroup: "shoulders", secondaryMuscleGroup: "back", caloriesPerSet: 6 },
  { id: "shoulder-press-machine", name: "Shoulder Press Machine", equipment: "machine", primaryMuscleGroup: "shoulders", secondaryMuscleGroup: "arms", caloriesPerSet: 8 },
  { id: "upright-row", name: "Upright Row", equipment: "barbell", primaryMuscleGroup: "shoulders", secondaryMuscleGroup: "arms", caloriesPerSet: 8 },
  { id: "shrug", name: "Shrug", equipment: "dumbbell", primaryMuscleGroup: "shoulders", secondaryMuscleGroup: "back", caloriesPerSet: 6 },
  { id: "pike-push-up", name: "Pike Push-Up", equipment: "bodyweight", primaryMuscleGroup: "shoulders", secondaryMuscleGroup: "arms", caloriesPerSet: 6 },

  // Arms
  { id: "barbell-curl", name: "Barbell Curl", equipment: "barbell", primaryMuscleGroup: "arms", caloriesPerSet: 6 },
  { id: "dumbbell-curl", name: "Dumbbell Curl", equipment: "dumbbell", primaryMuscleGroup: "arms", caloriesPerSet: 6 },
  { id: "hammer-curl", name: "Hammer Curl", equipment: "dumbbell", primaryMuscleGroup: "arms", caloriesPerSet: 6 },
  { id: "preacher-curl", name: "Preacher Curl", equipment: "machine", primaryMuscleGroup: "arms", caloriesPerSet: 6 },
  { id: "tricep-pushdown", name: "Tricep Pushdown", equipment: "machine", primaryMuscleGroup: "arms", caloriesPerSet: 6 },
  { id: "overhead-tricep-extension", name: "Overhead Tricep Extension", equipment: "dumbbell", primaryMuscleGroup: "arms", caloriesPerSet: 6 },
  { id: "skull-crusher", name: "Skull Crusher", equipment: "barbell", primaryMuscleGroup: "arms", caloriesPerSet: 6 },
  { id: "close-grip-bench-press", name: "Close-Grip Bench Press", equipment: "barbell", primaryMuscleGroup: "arms", secondaryMuscleGroup: "chest", caloriesPerSet: 9 },
  { id: "bench-dip", name: "Bench Dip", equipment: "bodyweight", primaryMuscleGroup: "arms", secondaryMuscleGroup: "chest", caloriesPerSet: 6 },

  // Core
  { id: "plank", name: "Plank", equipment: "bodyweight", primaryMuscleGroup: "core", caloriesPerSet: 5 },
  { id: "crunch", name: "Crunch", equipment: "bodyweight", primaryMuscleGroup: "core", caloriesPerSet: 4 },
  { id: "hanging-leg-raise", name: "Hanging Leg Raise", equipment: "bodyweight", primaryMuscleGroup: "core", caloriesPerSet: 6 },
  { id: "russian-twist", name: "Russian Twist", equipment: "bodyweight", primaryMuscleGroup: "core", caloriesPerSet: 5 },
  { id: "cable-crunch", name: "Cable Crunch", equipment: "machine", primaryMuscleGroup: "core", caloriesPerSet: 5 },
  { id: "ab-wheel-rollout", name: "Ab Wheel Rollout", equipment: "bodyweight", primaryMuscleGroup: "core", secondaryMuscleGroup: "arms", caloriesPerSet: 6 },
  { id: "mountain-climber", name: "Mountain Climber", equipment: "bodyweight", primaryMuscleGroup: "core", secondaryMuscleGroup: "legs", caloriesPerSet: 6 },
  { id: "side-plank", name: "Side Plank", equipment: "bodyweight", primaryMuscleGroup: "core", caloriesPerSet: 5 },
];

const EXERCISES_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

module.exports = { EXERCISES, EXERCISES_BY_ID, MUSCLE_GROUPS, MUSCLE_GROUP_LABELS };
