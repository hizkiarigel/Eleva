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
    ALTER TABLE days ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ NOT NULL DEFAULT now();
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

async function activatePathway(userId) {
  await pool.query(`UPDATE character_state SET pathway_status = 'active' WHERE user_id = $1`, [userId]);
}

async function resetUser(userId) {
  await pool.query(`DELETE FROM character_state WHERE user_id = $1`, [userId]);
  await pool.query(`DELETE FROM days WHERE user_id = $1`, [userId]);
}

// --- days (per user) ---

// The user's currently live quest is whichever row was issued most recently
// - completable for a full rolling 24h from issuance, not "until local
// midnight" (founder call: a quest issued at 11pm shouldn't evaporate at
// 00:00 just because the calendar flipped). date DESC is a tiebreaker for
// legacy rows that all share one issued_at (the moment this column was
// backfilled) - without it, "most recent" would be ambiguous among them.
async function getActiveDay(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM days WHERE user_id = $1 ORDER BY issued_at DESC, date DESC LIMIT 1`,
    [userId]
  );
  const row = rows[0];
  if (!row) return null;
  const expiresAt = new Date(row.issued_at.getTime() + 24 * 60 * 60 * 1000);
  return {
    date: row.date,
    quest: row.quest,
    insight: row.insight,
    reflection: row.reflection,
    expiresAt,
    active: expiresAt.getTime() > Date.now(),
  };
}

// Issues a quest, always with a fresh clock - even on conflict. The
// (user_id, date) collision path only fires if a stale row's date label
// happens to match today's (shouldn't happen in real usage: 24h always
// crosses at least one calendar date, so a regenerated quest is always
// dated later than whatever it's replacing) - but if it ever did fire
// without forcing issued_at here, the "new" quest would silently inherit
// the old expired timestamp, read as already-expired itself, and send
// getActiveDay's caller straight back into regeneration forever.
async function createQuest(userId, date, { quest, insight }) {
  await pool.query(
    `INSERT INTO days (user_id, date, quest, insight, reflection, issued_at)
     VALUES ($1, $2, $3, $4, NULL, now())
     ON CONFLICT (user_id, date) DO UPDATE SET
       quest = EXCLUDED.quest, insight = EXCLUDED.insight, reflection = NULL, issued_at = now()`,
    [userId, date, quest, insight]
  );
}

// Attaches a reflection to an already-issued quest - deliberately leaves
// issued_at untouched so completing early doesn't reset the 24h window
// (the next quest still arrives a full rolling day after this one was
// issued, not a full day after whenever the user happened to finish it).
async function saveReflection(userId, date, reflection) {
  await pool.query(`UPDATE days SET reflection = $3 WHERE user_id = $1 AND date = $2`, [userId, date, reflection]);
}

async function recentDays(userId, excludeDate, limit = 3) {
  const { rows } = await pool.query(
    `SELECT * FROM days WHERE user_id = $1 AND date != $2 ORDER BY date DESC LIMIT $3`,
    [userId, excludeDate, limit]
  );
  return rows.map((r) => ({
    date: r.date,
    quest: r.quest?.title, // title only - keeps AI context lean
    // v13: which of the user's goals that day's quest was assigned to -
    // surfaced as a sibling (quest above is a flattened string) because the
    // goal-rotation selector in index.js reads it; caught by the multi-day
    // simulation, where rotation silently stuck on goal #1 without this.
    goalIndex: r.quest?.goalIndex,
    reflection: r.reflection,
  }));
}

async function allHistory(userId, excludeDate) {
  const { rows } = await pool.query(
    `SELECT * FROM days WHERE user_id = $1 AND date != $2 ORDER BY date DESC`,
    [userId, excludeDate]
  );
  return rows.map((r) => ({
    date: r.date,
    quest: r.quest,
    insight: r.insight,
    reflection: r.reflection,
  }));
}

module.exports = {
  DEFAULT_STATS, init,
  createUser, getUserByEmail, getUserById,
  getState, createState, updateState, activatePathway, resetUser,
  getActiveDay, createQuest, saveReflection, recentDays, allHistory,
};
