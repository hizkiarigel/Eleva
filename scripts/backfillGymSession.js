// One-off backfill: stamps gymSession:true onto already-open META gym
// quests created BEFORE the Training multi-exercise workout log shipped.
// server/index.js's POST /api/meta/start only sets gymSession:true on NEW
// "body"/"gym" META quests going forward - an already-open quest is never
// silently reshaped mid-session, same "no force-migration" principle the
// BODY·MOVEMENT backfill (scripts/backfillMovementFields.js) already
// documents. Without this, resuming an old open META gym quest keeps
// showing the legacy single-exercise Gerakan/Set/Repetisi/Beban form
// forever, since beginStructuredOrReflectiveFlow's `if (quest?.gymSession)`
// check in public/app.js never finds the flag on that row.
//
// Safe by default: prints what WOULD change and writes nothing unless
// --apply is passed. Idempotent - only touches rows missing gymSession.
//
// Run inside the deployed environment (DATABASE_URL already set there) via
// Railway's Console tab on the Eleva service:
//   node scripts/backfillGymSession.js            (dry run)
//   node scripts/backfillGymSession.js --apply    (writes)

const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set - refusing to run.");
  process.exit(1);
}
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
const pool = new Pool({ connectionString, ssl: isLocal ? false : { rejectUnauthorized: false } });

const APPLY = process.argv.includes("--apply");

async function main() {
  const { rows } = await pool.query(
    `SELECT id, user_id, quest FROM days
     WHERE reflection IS NULL
       AND is_meta = true
       AND quest->>'completionType' = 'structured-physical'
       AND quest->>'structuredKind' = 'gym'
       AND quest->>'gymSession' IS NULL`
  );

  if (rows.length === 0) {
    console.log("Nothing to backfill - every open META gym quest already has gymSession.");
    await pool.end();
    return;
  }

  console.log(`${APPLY ? "APPLYING" : "DRY RUN (pass --apply to write)"} - ${rows.length} quest(s) found:\n`);
  for (const row of rows) {
    console.log(`  #${row.id} (user ${row.user_id}) "${row.quest.title}"`);
    if (APPLY) {
      const merged = { ...row.quest, gymSession: true };
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
