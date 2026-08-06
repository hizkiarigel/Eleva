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
  };
}

async function createState(userId, { profile, stats, chapterNumber, chapterTitle, pathway, pathwayNoun }) {
  await pool.query(
    `INSERT INTO character_state (user_id, profile, stats, chapter_number, chapter_title, growth_sessions, pathway, pathway_noun)
     VALUES ($1, $2, $3, $4, $5, 0, $6, $7)
     ON CONFLICT (user_id) DO UPDATE SET
       profile = EXCLUDED.profile, stats = EXCLUDED.stats,
       chapter_number = EXCLUDED.chapter_number, chapter_title = EXCLUDED.chapter_title, growth_sessions = 0,
       pathway = EXCLUDED.pathway, pathway_noun = EXCLUDED.pathway_noun`,
    [userId, profile, stats, chapterNumber, chapterTitle, pathway || null, pathwayNoun || null]
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

async function resetUser(userId) {
  await pool.query(`DELETE FROM character_state WHERE user_id = $1`, [userId]);
  await pool.query(`DELETE FROM days WHERE user_id = $1`, [userId]);
}

// --- days (per user) ---

async function getDay(userId, date) {
  const { rows } = await pool.query(`SELECT * FROM days WHERE user_id = $1 AND date = $2`, [userId, date]);
  const row = rows[0];
  if (!row) return null;
  return { quest: row.quest, insight: row.insight, reflection: row.reflection };
}

async function upsertDay(userId, date, { quest, insight, reflection }) {
  await pool.query(
    `INSERT INTO days (user_id, date, quest, insight, reflection)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, date) DO UPDATE SET
       quest = EXCLUDED.quest, insight = EXCLUDED.insight, reflection = EXCLUDED.reflection`,
    [userId, date, quest, insight, reflection || null]
  );
}

async function recentDays(userId, excludeDate, limit = 3) {
  const { rows } = await pool.query(
    `SELECT * FROM days WHERE user_id = $1 AND date != $2 ORDER BY date DESC LIMIT $3`,
    [userId, excludeDate, limit]
  );
  return rows.map((r) => ({
    date: r.date,
    quest: r.quest?.title,
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
  getState, createState, updateState, resetUser,
  getDay, upsertDay, recentDays, allHistory,
};
