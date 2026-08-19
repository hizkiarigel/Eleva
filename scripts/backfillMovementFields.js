// One-off backfill: stamps domain/primaryFeature/executionMode/evidenceMode
// (and, for gym quests, a plannedExercises fallback) onto Today's Trial
// cardio/gym quests that were created BEFORE the BODY·MOVEMENT execution
// flow shipped - server/claude.js's normalizeMovementFields/
// normalizePlannedExercises only stamp NEW quests at generation time, by
// design (never silently reshape a quest someone might already be mid-
// session on). This script applies the exact same stamping logic to
// already-open (reflection IS NULL) legacy rows, so they pick up the new
// Preview -> Pre-Start -> ... flow immediately instead of waiting for the
// next natural regeneration.
//
// Safe by default: prints what WOULD change and writes nothing unless
// --apply is passed. Idempotent - only touches rows missing primaryFeature,
// so running it twice is a no-op the second time.
//
// Run inside the deployed environment (so DATABASE_URL is already set) via
// Railway's Console tab on the Eleva service:
//   node scripts/backfillMovementFields.js            (dry run)
//   node scripts/backfillMovementFields.js --apply    (writes)

const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set - refusing to run.");
  process.exit(1);
}
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
const pool = new Pool({ connectionString, ssl: isLocal ? false : { rejectUnauthorized: false } });

const APPLY = process.argv.includes("--apply");

function movementPatch(quest) {
  const executionMode = quest.structuredKind === "cardio" ? "CARDIO" : "STRENGTH";
  const patch = {
    domain: "BODY",
    primaryFeature: "MOVEMENT",
    supportingFeatures: [],
    executionMode,
    evidenceMode: executionMode === "CARDIO" ? "MANUAL_ACTIVITY" : "SET_REP_LOAD",
  };
  // Same fallback normalizePlannedExercises (server/claude.js) already uses
  // for a STRENGTH quest with no usable AI-authored plan - a legacy gym
  // quest never had one at all, so every gym row needs this fallback.
  if (executionMode === "STRENGTH" && !Array.isArray(quest.plannedExercises)) {
    patch.plannedExercises = [{
      name: "Latihan Utama", targetSets: 3,
      targetReps: quest.evidenceSchema?.target || 10,
      targetLoadKg: quest.evidenceSchema?.hasWeight ? 20 : null,
    }];
  }
  return patch;
}

async function main() {
  // is_meta excluded deliberately: the BODY·MOVEMENT redesign's own scope
  // (design handoff) never touched META's on-demand sessions - a META
  // cardio/gym quest (e.g. "Latihan Mandiri") has no goalIndex/"Menuju
  // target" concept the new Preview screen assumes, and META's gym quests
  // may already carry the separate gymSession:true flag from the earlier
  // Training feature. Only Today's Trial (goal-tied) quests get backfilled.
  const { rows } = await pool.query(
    `SELECT id, user_id, quest FROM days
     WHERE reflection IS NULL
       AND is_meta = false
       AND quest->>'completionType' = 'structured-physical'
       AND quest->>'structuredKind' IN ('cardio', 'gym')
       AND quest->>'primaryFeature' IS NULL`
  );

  if (rows.length === 0) {
    console.log("Nothing to backfill - every open cardio/gym quest already has primaryFeature.");
    await pool.end();
    return;
  }

  console.log(`${APPLY ? "APPLYING" : "DRY RUN (pass --apply to write)"} - ${rows.length} quest(s) found:\n`);
  for (const row of rows) {
    const patch = movementPatch(row.quest);
    console.log(`  #${row.id} (user ${row.user_id}) "${row.quest.title}" [${row.quest.structuredKind}] -> ${JSON.stringify(patch)}`);
    if (APPLY) {
      const merged = { ...row.quest, ...patch };
      await pool.query(`UPDATE days SET quest = $2 WHERE id = $1`, [row.id, merged]);
    }
  }
  console.log(APPLY ? "\nDone - all rows updated." : "\nNo changes written (dry run). Re-run with --apply to commit.");
  await pool.end();
}

main().catch((e) => {
  console.error("Backfill failed:", e);
  process.exit(1);
});
