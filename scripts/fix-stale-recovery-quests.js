// SOMA Nutrition Implementation Brief Part A, item 1 (12 Agustus): data-level
// fix for quests generated BEFORE the Task 7d recovery-classification prompt
// instruction existed, or from a generation call the model got wrong -
// regenerating the prompt (Task 7d) or adding the keyword backstop
// (normalizeCompletionType, server/claude.js) only fixes FUTURE generations,
// it can't retroactively fix a quest already sitting in `days` with
// completionType "reflective" (the founder's reported "Audit Fondasi
// Pemulihan" instance).
//
// Scope: only OPEN quests (reflection IS NULL). A quest the user already
// completed has real evidence/reflection data tied to whatever form was
// shown at the time - rewriting its completionType after the fact wouldn't
// change anything the user experienced and could make already-submitted
// Riwayat entries confusing to reconcile. This only fixes quests still
// sitting on someone's dashboard right now, which is the actual founder
// complaint ("still shows free-text form").
//
// Usage:
//   node scripts/fix-stale-recovery-quests.js            # dry run - lists what WOULD change
//   node scripts/fix-stale-recovery-quests.js --apply     # actually updates the rows
//
// DATABASE_URL must point at the target database (local scratch DB for a
// dry-run test of the script itself, or the real production connection
// string when actually applying the fix - this script does not know or
// assume which one it's pointed at).

const { Pool } = require("pg");
const { looksRecoveryThemed, normalizeEvidenceSchema } = require("../server/claude");

const APPLY = process.argv.includes("--apply");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL not set - point it at the target database first.");
    process.exit(1);
  }
  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
  const pool = new Pool({ connectionString, ssl: isLocal ? false : { rejectUnauthorized: false } });

  // is_meta excluded: META quests are never goal-tied structured-physical
  // candidates in the same sense (Task 12) - out of scope for this fix.
  const { rows } = await pool.query(
    `SELECT id, user_id, quest FROM days WHERE reflection IS NULL AND is_meta = false ORDER BY id ASC`
  );

  const stale = rows.filter((r) => {
    const q = r.quest;
    if (!q) return false;
    if (q.completionType === "structured-physical" && q.structuredKind === "recovery") return false; // already correct
    return looksRecoveryThemed(q);
  });

  if (!stale.length) {
    console.log("No stale recovery-themed open quests found.");
    await pool.end();
    return;
  }

  console.log(`${stale.length} open quest(s) read as recovery-themed but not classified structured-physical/recovery:\n`);
  for (const row of stale) {
    const q = row.quest;
    console.log(`  #${row.id} (user ${row.user_id}) completionType=${q.completionType} title="${q.title}"`);
  }

  if (!APPLY) {
    console.log(`\nDry run only - rerun with --apply to fix the ${stale.length} row(s) above.`);
    await pool.end();
    return;
  }

  console.log("\nApplying fixes...");
  for (const row of stale) {
    const q = { ...row.quest, completionType: "structured-physical", structuredKind: "recovery" };
    normalizeEvidenceSchema(q); // same code path a fresh generation goes through
    await pool.query(`UPDATE days SET quest = $2 WHERE id = $1`, [row.id, q]);
    console.log(`  fixed #${row.id}`);
  }
  console.log(`\nDone - ${stale.length} row(s) updated.`);
  await pool.end();
}

main().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
