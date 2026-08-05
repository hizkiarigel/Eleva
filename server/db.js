const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "..", "eleva.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    profile_json TEXT,
    stats_json TEXT,
    chapter_number INTEGER DEFAULT 1,
    chapter_title TEXT DEFAULT 'Mencari Arah',
    growth_sessions INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS days (
    date TEXT PRIMARY KEY,
    quest_json TEXT,
    insight TEXT,
    reflection_json TEXT
  );
`);

const DEFAULT_STATS = {
  body: 20, mind: 20, career: 20, finance: 20,
  emotional: 20, explorer: 20, social: 20, purpose: 20,
};

function getState() {
  const row = db.prepare("SELECT * FROM state WHERE id = 1").get();
  if (!row) return null;
  return {
    profile: row.profile_json ? JSON.parse(row.profile_json) : null,
    stats: row.stats_json ? JSON.parse(row.stats_json) : DEFAULT_STATS,
    chapterNumber: row.chapter_number,
    chapterTitle: row.chapter_title,
    growthSessions: row.growth_sessions,
  };
}

function createState({ profile, stats, chapterNumber, chapterTitle }) {
  db.prepare(
    `INSERT INTO state (id, profile_json, stats_json, chapter_number, chapter_title, growth_sessions)
     VALUES (1, ?, ?, ?, ?, 0)
     ON CONFLICT(id) DO UPDATE SET
       profile_json=excluded.profile_json, stats_json=excluded.stats_json,
       chapter_number=excluded.chapter_number, chapter_title=excluded.chapter_title, growth_sessions=0`
  ).run(JSON.stringify(profile), JSON.stringify(stats), chapterNumber, chapterTitle);
}

function updateState({ stats, chapterNumber, chapterTitle, growthSessions }) {
  db.prepare(
    `UPDATE state SET stats_json = ?, chapter_number = ?, chapter_title = ?, growth_sessions = ? WHERE id = 1`
  ).run(JSON.stringify(stats), chapterNumber, chapterTitle, growthSessions);
}

function resetAll() {
  db.prepare("DELETE FROM state").run();
  db.prepare("DELETE FROM days").run();
}

function getDay(date) {
  const row = db.prepare("SELECT * FROM days WHERE date = ?").get(date);
  if (!row) return null;
  return {
    quest: JSON.parse(row.quest_json),
    insight: row.insight,
    reflection: row.reflection_json ? JSON.parse(row.reflection_json) : null,
  };
}

function upsertDay(date, { quest, insight, reflection }) {
  const existing = db.prepare("SELECT date FROM days WHERE date = ?").get(date);
  if (existing) {
    db.prepare("UPDATE days SET quest_json = ?, insight = ?, reflection_json = ? WHERE date = ?")
      .run(JSON.stringify(quest), insight, reflection ? JSON.stringify(reflection) : null, date);
  } else {
    db.prepare("INSERT INTO days (date, quest_json, insight, reflection_json) VALUES (?, ?, ?, ?)")
      .run(date, JSON.stringify(quest), insight, reflection ? JSON.stringify(reflection) : null);
  }
}

function recentDays(excludeDate, limit = 3) {
  const rows = db.prepare("SELECT * FROM days WHERE date != ? ORDER BY date DESC LIMIT ?").all(excludeDate, limit);
  return rows.map((r) => ({
    date: r.date,
    quest: JSON.parse(r.quest_json)?.title,
    reflection: r.reflection_json ? JSON.parse(r.reflection_json) : null,
  }));
}

function allHistory(excludeDate) {
  const rows = db.prepare("SELECT * FROM days WHERE date != ? ORDER BY date DESC").all(excludeDate);
  return rows.map((r) => ({
    date: r.date,
    quest: JSON.parse(r.quest_json),
    insight: r.insight,
    reflection: r.reflection_json ? JSON.parse(r.reflection_json) : null,
  }));
}

module.exports = {
  DEFAULT_STATS, getState, createState, updateState, resetAll,
  getDay, upsertDay, recentDays, allHistory,
};
