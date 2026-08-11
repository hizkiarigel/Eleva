const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;
const isLocal = !connectionString || /localhost|127\.0\.0\.1/.test(connectionString);

const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("Unexpected Postgres pool error:", err);
});

const DEFAULT_STATS = {
  body: 20, mind: 20, career: 20, finance: 20,
  emotional: 20, explorer: 20, social: 20, purpose: 20,
};

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS character_state (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      profile JSONB,
      stats JSONB,
      chapter_number INTEGER NOT NULL DEFAULT 1,
      chapter_title TEXT NOT NULL DEFAULT 'Mencari Arah',
      growth_sessions INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS days (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      quest JSONB,
      insight TEXT,
      reflection JSONB,
      PRIMARY KEY (user_id, date)
    );

    ALTER TABLE character_state ADD COLUMN IF NOT EXISTS pathway TEXT;
    ALTER TABLE character_state ADD COLUMN IF NOT EXISTS pathway_noun TEXT;
    ALTER TABLE character_state ADD COLUMN IF NOT EXISTS growth_focus JSONB;
    ALTER TABLE character_state ADD COLUMN IF NOT EXISTS pathway_status TEXT DEFAULT 'trial';
    ALTER TABLE character_state ADD COLUMN IF NOT EXISTS pathway_trial_started_at TIMESTAMPTZ;
    ALTER TABLE character_state ADD COLUMN IF NOT EXISTS secondary_trait TEXT;
    ALTER TABLE character_state ADD COLUMN IF NOT EXISTS radar_snapshot JSONB;
    ALTER TABLE character_state ADD COLUMN IF NOT EXISTS radar_raw JSONB;
    ALTER TABLE character_state ADD COLUMN IF NOT EXISTS goals JSONB;
    ALTER TABLE character_state ADD COLUMN IF NOT EXISTS goal_targets JSONB DEFAULT '{}'::jsonb;
    -- Task 9 (Practice Test, PRD bagian 13): per-goal difficulty level +
    -- score history, keyed by goalIndex like goal_targets - deliberately
    -- SEPARATE from goal_targets (that column is a "target to reach and
    -- replace"; this one is a level that only ever increments, never resets).
    ALTER TABLE character_state ADD COLUMN IF NOT EXISTS practice_test JSONB DEFAULT '{}'::jsonb;
  `);

  // Per-goal quest model (founder-reported regression: a goal's quest was
  // being replaced before the user ever marked it done). A goal can now
  // have its own open quest sitting untouched indefinitely - up to 3
  // simultaneously (one per active goal) - so the old (user_id, date)
  // primary key is wrong: it assumed exactly one quest row per calendar
  // day, but several goals can each get a fresh quest on the same day.
  // Switched to a plain serial id. Guarded by a column-existence check
  // since this must run exactly once - re-running ADD COLUMN id SERIAL a
  // second time would try to create a duplicate sequence and fail.
  // issued_at (the now-retired 24h-rolling-window timestamp) is dropped:
  // nothing times a quest out anymore, only completion ever replaces one,
  // so there's no remaining logic that reads it.
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='days' AND column_name='id') THEN
        ALTER TABLE days DROP CONSTRAINT IF EXISTS days_pkey;
        ALTER TABLE days ADD COLUMN id SERIAL PRIMARY KEY;
      END IF;
    END $$;
    ALTER TABLE days ADD COLUMN IF NOT EXISTS goal_index INTEGER;
    ALTER TABLE days DROP COLUMN IF EXISTS issued_at;
    UPDATE days SET goal_index = (quest->>'goalIndex')::integer
      WHERE goal_index IS NULL AND quest->>'goalIndex' ~ '^[0-9]+$';
  `);

  // Provisional 24h countdown (founder request, 10 Agustus, explicitly
  // "sementara" while a real next solution gets figured out later): unlike
  // the old issued_at, this column NEVER triggers replacing/regenerating a
  // quest - it's read-only display + client-side button lockout past 24h.
  // A goal whose quest locks out this way has no automatic recovery yet
  // (known, accepted gap - the founder deferred that decision).
  await pool.query(`
    ALTER TABLE days ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
  `);

  // Task 9 (Practice Test): the generated passage/script + answer key lives
  // HERE, not inside the `quest` jsonb column - `quest` flows to the client
  // verbatim on every GET /api/state (via rowToQuest), so putting the answer
  // key there would leak it to the browser between generate and submit.
  // This column is never selected by rowToQuest, only read directly by the
  // submit route for server-side grading.
  await pool.query(`
    ALTER TABLE days ADD COLUMN IF NOT EXISTS practice_test_payload JSONB;
  `);
}

// --- users ---

async function createUser({ email, passwordHash }) {
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at`,
    [email, passwordHash]
  );
  return rows[0];
}

async function getUserByEmail(email) {
  const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  return rows[0] || null;
}

async function getUserById(id) {
  const { rows } = await pool.query(`SELECT id, email, created_at FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

// --- character state (per user) ---

async function getState(userId) {
  const { rows } = await pool.query(`SELECT * FROM character_state WHERE user_id = $1`, [userId]);
  const row = rows[0];
  if (!row) return null;
  return {
    profile: row.profile,
    stats: row.stats || DEFAULT_STATS,
    chapterNumber: row.chapter_number,
    chapterTitle: row.chapter_title,
    growthSessions: row.growth_sessions,
    pathway: row.pathway,
    pathwayNoun: row.pathway_noun,
    growthFocus: row.growth_focus,
    pathwayStatus: row.pathway_status,
    pathwayTrialStartedAt: row.pathway_trial_started_at,
    secondaryTrait: row.secondary_trait,
    // radarSnapshot is the CALIBRATED radar (post Adaptive Scenario Cards) -
    // what daily quest generation and Pathway logic read. radarRaw is the
    // pre-calibration manual-drag result, kept only for audit/transparency
    // (v3/v4/pre-calibration v5 accounts have radarSnapshot but no radarRaw -
    // that's expected, not an error).
    radarSnapshot: row.radar_snapshot,
    radarRaw: row.radar_raw,
    // v13: 1-3 free-text First Trial goals captured right after Pathway
    // confirmation (the WHAT; pathway is the constant HOW). Array of strings.
    // Pre-v13 accounts have null - callers treat that as [].
    goals: row.goals || [],
    // Fokus 2.2/2.3: persistent "Target Berikutnya" per goal, keyed by
    // goalIndex as a string (jsonb object keys are always strings). Empty
    // object for every account until a target is first picked - never null,
    // callers index into it directly without an extra guard.
    goalTargets: row.goal_targets || {},
    // Task 9: per-goal Practice Test progress, keyed by goalIndex as a
    // string like goalTargets - {level, history: [{ts,testKind,track,score,total}]}.
    // Empty object until a goal's first Practice Test is submitted.
    practiceTest: row.practice_test || {},
  };
}

// growthFocus is v2-era (pre-radar-chart) and no longer written for new users,
// but stays a readable/writable param here so a caller could still pass it if
// ever needed - createState just never sends it for v3 signups (radarSnapshot
// is passed instead). Both columns stay on the table; see getState's fallback
// comment at the call sites in index.js for why v2 rows aren't backfilled.
async function createState(userId, {
  profile, stats, chapterNumber, chapterTitle, pathway, pathwayNoun,
  growthFocus, secondaryTrait, radarSnapshot, radarRaw, goals,
}) {
  await pool.query(
    `INSERT INTO character_state
       (user_id, profile, stats, chapter_number, chapter_title, growth_sessions,
        pathway, pathway_noun, growth_focus, pathway_status, pathway_trial_started_at, secondary_trait, radar_snapshot, radar_raw, goals)
     VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, 'trial', now(), $9, $10, $11, $12)
     ON CONFLICT (user_id) DO UPDATE SET
       profile = EXCLUDED.profile, stats = EXCLUDED.stats,
       chapter_number = EXCLUDED.chapter_number, chapter_title = EXCLUDED.chapter_title, growth_sessions = 0,
       pathway = EXCLUDED.pathway, pathway_noun = EXCLUDED.pathway_noun,
       growth_focus = EXCLUDED.growth_focus, pathway_status = 'trial', pathway_trial_started_at = now(),
       secondary_trait = EXCLUDED.secondary_trait, radar_snapshot = EXCLUDED.radar_snapshot, radar_raw = EXCLUDED.radar_raw,
       goals = EXCLUDED.goals`,
    // goals is an ARRAY going into a jsonb column - must be JSON.stringify'd
    // explicitly (pg doesn't auto-encode JS arrays to jsonb correctly; same
    // lesson as growth_focus in v2, documented in PRD).
    [userId, profile, stats, chapterNumber, chapterTitle, pathway || null, pathwayNoun || null, growthFocus ? JSON.stringify(growthFocus) : null, secondaryTrait || null, radarSnapshot || null, radarRaw || null, goals && goals.length ? JSON.stringify(goals) : null]
  );
}

// Every field here is written unconditionally, including pathwayNoun - callers
// must pass the existing value through (e.g. state.pathwayNoun) if unchanged,
// or it gets cleared.
async function updateState(userId, { stats, chapterNumber, chapterTitle, growthSessions, pathwayNoun }) {
  await pool.query(
    `UPDATE character_state SET stats = $2, chapter_number = $3, chapter_title = $4, growth_sessions = $5, pathway_noun = $6
     WHERE user_id = $1`,
    [userId, stats, chapterNumber, chapterTitle, growthSessions, pathwayNoun || null]
  );
}

// Fokus 2.2/2.3: sets (or replaces) the persistent target for one goal.
// jsonb_build_object + `||` merge so this never clobbers other goals'
// targets already stored in the same column.
async function setGoalTarget(userId, goalIndex, target) {
  await pool.query(
    `UPDATE character_state SET goal_targets = COALESCE(goal_targets, '{}'::jsonb) || jsonb_build_object($2::text, $3::jsonb) WHERE user_id = $1`,
    [userId, String(goalIndex), JSON.stringify(target)]
  );
}

// Task 9: sets (or replaces) one goal's Practice Test level+history. Same
// jsonb_build_object merge as setGoalTarget - never clobbers another goal's
// entry in the same column. Level only ever increments (see the submit
// route); this function just persists whatever the caller already computed.
async function setPracticeTestState(userId, goalIndex, data) {
  await pool.query(
    `UPDATE character_state SET practice_test = COALESCE(practice_test, '{}'::jsonb) || jsonb_build_object($2::text, $3::jsonb) WHERE user_id = $1`,
    [userId, String(goalIndex), JSON.stringify(data)]
  );
}

// Task 9: the generated test's answer key (passage/script + questions with
// correctAnswer/explanation) - a full replace, not a merge (each generate
// call produces a brand-new test). See the column comment in init() for why
// this is a separate column from `quest`.
async function setPracticeTestPayload(userId, dayId, payload) {
  await pool.query(`UPDATE days SET practice_test_payload = $3 WHERE user_id = $1 AND id = $2`, [userId, dayId, payload]);
}
async function getPracticeTestPayload(userId, dayId) {
  const { rows } = await pool.query(`SELECT practice_test_payload FROM days WHERE user_id = $1 AND id = $2`, [userId, dayId]);
  return rows[0]?.practice_test_payload || null;
}

async function activatePathway(userId) {
  await pool.query(`UPDATE character_state SET pathway_status = 'active' WHERE user_id = $1`, [userId]);
}

async function resetUser(userId) {
  await pool.query(`DELETE FROM character_state WHERE user_id = $1`, [userId]);
  await pool.query(`DELETE FROM days WHERE user_id = $1`, [userId]);
}

// --- days (per user; one row per QUEST INSTANCE, not one row per calendar
// day - a user can have up to one open quest per active goal open at once,
// so several rows can legitimately share the same date) ---

function rowToQuest(r) {
  return { id: r.id, goalIndex: r.goal_index, date: r.date, quest: r.quest, insight: r.insight, reflection: r.reflection, createdAt: r.created_at };
}

// Every quest still open (not yet marked done) across the user's goals -
// at most one per goal, so at most 3 total. This literally IS the set of
// quest cards the dashboard shows - nothing here was ever silently
// replaced (founder-reported regression this whole model exists to fix):
// a goal only loses its open quest when the user completes it.
async function getOpenQuests(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM days WHERE user_id = $1 AND reflection IS NULL ORDER BY goal_index ASC NULLS LAST, id ASC`,
    [userId]
  );
  return rows.map(rowToQuest);
}

// A single quest by id, open or already completed - the path for
// submitting a reflection to whichever goal's card the user tapped.
async function getQuestById(userId, id) {
  const { rows } = await pool.query(`SELECT * FROM days WHERE user_id = $1 AND id = $2`, [userId, id]);
  return rows[0] ? rowToQuest(rows[0]) : null;
}

// Issues a brand-new quest for one goal (goalIndex null for legacy
// pre-goal-capture accounts, a single ungoaled slot). Always a fresh
// insert - id is a plain serial, there's nothing to collide with, unlike
// the old (user_id, date) key that forced awkward upsert/conflict logic.
async function createQuest(userId, goalIndex, date, { quest, insight }) {
  const { rows } = await pool.query(
    `INSERT INTO days (user_id, goal_index, date, quest, insight, reflection) VALUES ($1, $2, $3, $4, $5, NULL) RETURNING *`,
    [userId, goalIndex, date, quest, insight]
  );
  return rowToQuest(rows[0]);
}

async function saveReflection(userId, id, reflection) {
  await pool.query(`UPDATE days SET reflection = $3 WHERE user_id = $1 AND id = $2`, [userId, id, reflection]);
}

// Recent quests for AI context, newest first. Scoped to one goal
// (goalIndex) for a structured-physical progressive baseline - "last time
// THIS goal's cardio was 15 reps" shouldn't mix in a different goal's
// numbers. Omitted for broad cross-goal context (chapter continuity).
async function recentDays(userId, { goalIndex, excludeId, limit = 3 } = {}) {
  const conds = ["user_id = $1"];
  const params = [userId];
  if (goalIndex !== undefined) {
    if (goalIndex === null) {
      conds.push("goal_index IS NULL");
    } else {
      params.push(goalIndex);
      conds.push(`goal_index = $${params.length}`);
    }
  }
  if (excludeId != null) {
    params.push(excludeId);
    conds.push(`id != $${params.length}`);
  }
  params.push(limit);
  const { rows } = await pool.query(
    `SELECT * FROM days WHERE ${conds.join(" AND ")} ORDER BY id DESC LIMIT $${params.length}`,
    params
  );
  return rows.map(rowToQuest);
}

// Completed quests only, most recent first - Riwayat. There is no more
// "missed" state to label: a quest that isn't here is still sitting open
// (see getOpenQuests), however long that takes.
async function allHistory(userId, limit = 8) {
  const { rows } = await pool.query(
    `SELECT * FROM days WHERE user_id = $1 AND reflection IS NOT NULL ORDER BY id DESC LIMIT $2`,
    [userId, limit]
  );
  return rows.map(rowToQuest);
}

module.exports = {
  DEFAULT_STATS, init,
  createUser, getUserByEmail, getUserById,
  getState, createState, updateState, setGoalTarget, activatePathway, resetUser,
  getOpenQuests, getQuestById, createQuest, saveReflection, recentDays, allHistory,
  setPracticeTestState, setPracticeTestPayload, getPracticeTestPayload,
};
