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

  // Task 10a (Artifacts library): persistent per-user document library, not
  // tied to any single quest - "CV" is the first real type, schema stays
  // generic (portfolio/certificate/etc. can reuse the same table later
  // without a migration). content is either { kind:"text", text } (DOCX gets
  // extracted server-side at upload time, see server/jobMatch.js - Claude's
  // API doesn't accept .docx directly) or { kind:"file", mimeType,
  // dataBase64, filename } (PDF/image - sent to Claude as-is, PDF is
  // natively supported as a document content block).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS artifacts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      content JSONB NOT NULL,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Homepage redesign (design handoff, 11 Agustus): "Kondisi Hari Ini" is a
  // real feature (not a placeholder) - a single current value per user,
  // reset back to "Normal" lazily whenever a NEW calendar day is first seen
  // (see getState below), same lazy-check idiom as the pathway resonance-
  // check. chapter_narrative is the CURRENT chapter's paragraph body (Kisahmu
  // screen needs more than the short chapterTitle already had) - seeded with
  // a static Chapter-1 default at signup, same spirit as the static default
  // chapterTitle "Mencari Arah" already gets.
  await pool.query(`
    ALTER TABLE character_state ADD COLUMN IF NOT EXISTS kondisi_status TEXT NOT NULL DEFAULT 'Normal';
    ALTER TABLE character_state ADD COLUMN IF NOT EXISTS kondisi_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE character_state ADD COLUMN IF NOT EXISTS chapter_narrative TEXT NOT NULL DEFAULT 'Awal dari First Trial-mu — belum banyak pola yang kelihatan, tapi ini titik mulainya.';
    ALTER TABLE character_state ADD COLUMN IF NOT EXISTS observed JSONB;
  `);

  // Task 11f (Context Update, formalized from Eleva_PRD.pdf): the chip status
  // above already existed as "Kondisi Hari Ini" - this adds the optional
  // free-text note half of the {status, note, timestamp} schema the PRD
  // specifies, kept as its own nullable column (not folded into
  // kondisi_status) since it's genuinely optional and has its own lifecycle
  // (cleared implicitly whenever status changes again, see updateKondisi).
  await pool.query(`
    ALTER TABLE character_state ADD COLUMN IF NOT EXISTS kondisi_note TEXT;
  `);

  // Task 11e (Decay, real mechanism per Eleva_PRD.pdf - founder confirmed
  // via AskUserQuestion to build the actual stat-decrease version, not the
  // cosmetic-only one from the previous round). stat_activity tracks the
  // last time EACH stat received a positive growth delta (keyed by stat
  // name, ISO timestamp) - the decay clock per stat, separate from the
  // account-wide pathway_trial_started_at that's used as the fallback
  // anchor for a stat that has never once been touched. last_decay_check is
  // the lazy-evaluation gate (same idiom as kondisi's daily reset and the
  // pathway resonance-check): decay is only ever evaluated once per
  // calendar day, and application code applies at most ONE day's worth of
  // reduction per check regardless of how many days were actually missed -
  // a long absence is never backlogged into a big drop on return, per the
  // PRD's explicit "LAMBAT dan BERTAHAP, bukan drop tiba-tiba, terasa
  // sebagai konsekuensi wajar bukan hukuman."
  await pool.query(`
    ALTER TABLE character_state ADD COLUMN IF NOT EXISTS stat_activity JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE character_state ADD COLUMN IF NOT EXISTS last_decay_check TIMESTAMPTZ NOT NULL DEFAULT now();
  `);

  // Task 11c (Side Quest, real feature per Eleva_PRD.pdf - a label on the
  // SAME Main Quest mechanism, not a new quest type per section 16's
  // explicit clarification). Distinguishes an intentional goal-agnostic
  // bonus quest from a legacy pre-goal-capture account's single ungoaled
  // quest, both of which have goal_index NULL - without this flag the two
  // would be indistinguishable and a legacy account's only quest would
  // wrongly render in the Side Quest section instead of Primary.
  await pool.query(`
    ALTER TABLE days ADD COLUMN IF NOT EXISTS is_side_quest BOOLEAN NOT NULL DEFAULT false;
  `);

  // Task 12 (META tab): a standalone session started on-demand from the META
  // grid, not part of the daily per-goal rotation - always goal_index NULL
  // (never competes for a goal's one-open-quest slot) and explicitly flagged
  // (not just inferred from goal_index NULL, which legacy ungoaled accounts
  // also use - same reasoning as is_side_quest above) so GET /api/state's
  // needySlots check and the dashboard's Primary Quest carousel both know to
  // ignore it. Evidence from a META session still counts toward growth-gate
  // longitudinal evaluation and stat_activity (Decay) normally - only the
  // Milestone/current_target update in POST /api/reflection is skipped,
  // which it already is for any goal_index-NULL row.
  await pool.query(`
    ALTER TABLE days ADD COLUMN IF NOT EXISTS is_meta BOOLEAN NOT NULL DEFAULT false;
  `);

  // Kisahmu screen: full narrative per Chapter, chronological. Chapters are
  // archived HERE the moment chapter_number advances (before character_state
  // is overwritten with the new title/narrative) - see index.js's advance
  // logic. The row for the user's CURRENT (not-yet-archived) chapter always
  // lives only in character_state, never duplicated here until it's actually
  // superseded.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chapters (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      chapter_number INTEGER NOT NULL,
      chapter_title TEXT NOT NULL,
      narrative TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
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
    // Homepage redesign: current chapter's full narrative paragraph (Kisahmu
    // screen), and "Kondisi Hari Ini" - a single current value, reset to
    // Normal lazily by index.js whenever a new calendar day is first seen
    // (kondisiUpdatedAt is what that check compares against).
    chapterNarrative: row.chapter_narrative,
    kondisiStatus: row.kondisi_status,
    kondisiUpdatedAt: row.kondisi_updated_at,
    // Task 11f: optional free-text note attached to the current kondisi
    // status - null whenever the user didn't add one (never required).
    kondisiNote: row.kondisi_note,
    // Task 11e: per-stat last-active timestamps + the lazy decay
    // evaluation gate - see the column comment in init() for the full
    // rationale. statActivity defaults to {} for accounts predating Decay.
    statActivity: row.stat_activity || {},
    lastDecayCheck: row.last_decay_check,
    // "Eleva Observed" card content, refreshed whenever a new quest is
    // generated (see index.js) - null until the first quest with real
    // recentDays context to reason about exists.
    observed: row.observed,
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
async function updateState(userId, { stats, chapterNumber, chapterTitle, growthSessions, pathwayNoun, chapterNarrative, observed }) {
  await pool.query(
    `UPDATE character_state SET stats = $2, chapter_number = $3, chapter_title = $4, growth_sessions = $5, pathway_noun = $6,
       chapter_narrative = COALESCE($7, chapter_narrative), observed = COALESCE($8, observed)
     WHERE user_id = $1`,
    [userId, stats, chapterNumber, chapterTitle, growthSessions, pathwayNoun || null, chapterNarrative || null, observed || null]
  );
}

// Homepage redesign / Task 11f: "Kondisi Hari Ini" (Context Update) - a
// single current value, no history kept (the design only ever shows
// "today's" condition). note is optional free text (11f's schema), always
// replaced wholesale with the new status - an old note never lingers
// attached to a newer, different status. Bumps kondisi_updated_at so
// index.js's lazy daily-reset check has something to compare against.
async function updateKondisi(userId, status, note) {
  await pool.query(
    `UPDATE character_state SET kondisi_status = $2, kondisi_note = $3, kondisi_updated_at = now() WHERE user_id = $1`,
    [userId, status, note || null]
  );
}
// Called ONLY by the lazy daily-reset check (index.js) - resets back to
// Normal without bumping kondisi_updated_at to "now" a second time
// unnecessarily; the check already knows the date rolled over.
async function resetKondisiToNormal(userId) {
  await pool.query(`UPDATE character_state SET kondisi_status = 'Normal', kondisi_note = NULL, kondisi_updated_at = now() WHERE user_id = $1`, [userId]);
}

// Task 11e (Decay): records that a stat just received a REAL positive
// growth delta - called right after any route applies deltas to stats
// (POST /api/reflection, /api/practice-test/submit, /api/job-match/analyze).
// Only ever called with keys that actually grew - a stat with no entry yet
// falls back to pathway_trial_started_at as its decay anchor (see
// applyDecayIfDue), so this never needs a fake "day 0" backfill.
async function touchStatActivity(userId, statKeys) {
  if (!statKeys || !statKeys.length) return;
  const now = new Date().toISOString();
  await pool.query(
    `UPDATE character_state SET stat_activity = COALESCE(stat_activity, '{}'::jsonb) || $2::jsonb WHERE user_id = $1`,
    [userId, JSON.stringify(Object.fromEntries(statKeys.map((k) => [k, now])))]
  );
}

// Task 11e (Decay): lazy, at-most-once-per-calendar-day evaluation - same
// idiom as the kondisi daily reset and the pathway resonance-check, called
// from GET /api/state. MANDATORY pause while kondisi_status != 'Normal'
// (non-negotiable per the PRD - decaying someone who's sick/burned out
// would directly contradict why Context Update exists): the checkpoint
// still advances to "now" during a pause so the day is never retroactively
// decayed once the user's condition returns to Normal. When actually due,
// applies exactly ONE day's worth of reduction per stat that's past the
// inactivity threshold - never the full backlog for a long absence, so
// reopening the app after two weeks away costs at most 1 point per stat,
// not ten. Returns the (possibly unchanged) stats object so the caller can
// use the current numbers without a second read.
const DECAY_THRESHOLD_DAYS = 4;
const DECAY_RATE = 1;
async function applyDecayIfDue(userId) {
  const { rows } = await pool.query(
    `SELECT stats, stat_activity, kondisi_status, pathway_trial_started_at, last_decay_check FROM character_state WHERE user_id = $1`,
    [userId]
  );
  const row = rows[0];
  if (!row || !row.stats) return row?.stats || DEFAULT_STATS;

  const dayKey = (d) => new Date(d).toLocaleDateString("en-CA");
  const today = dayKey(new Date());
  if (dayKey(row.last_decay_check) === today) return row.stats; // already evaluated today

  if (row.kondisi_status !== "Normal") {
    await pool.query(`UPDATE character_state SET last_decay_check = now() WHERE user_id = $1`, [userId]);
    return row.stats;
  }

  const activity = row.stat_activity || {};
  const anchor = row.pathway_trial_started_at ? new Date(row.pathway_trial_started_at) : new Date();
  const newStats = { ...row.stats };
  let changed = false;
  for (const key of Object.keys(row.stats)) {
    const lastActive = activity[key] ? new Date(activity[key]) : anchor;
    const daysSince = Math.floor((Date.now() - lastActive.getTime()) / 86400000);
    if (daysSince >= DECAY_THRESHOLD_DAYS && newStats[key] > 0) {
      newStats[key] = Math.max(0, newStats[key] - DECAY_RATE);
      changed = true;
    }
  }
  await pool.query(
    `UPDATE character_state SET stats = $2, last_decay_check = now() WHERE user_id = $1`,
    [userId, changed ? newStats : row.stats]
  );
  return changed ? newStats : row.stats;
}

// Kisahmu: archives the OUTGOING chapter (current title+narrative, about to
// be overwritten) before character_state moves on to the new one - called
// from index.js's advance logic, never on its own.
async function archiveChapter(userId, { chapterNumber, chapterTitle, narrative }) {
  await pool.query(
    `INSERT INTO chapters (user_id, chapter_number, chapter_title, narrative) VALUES ($1, $2, $3, $4)`,
    [userId, chapterNumber, chapterTitle, narrative]
  );
}
async function listChapters(userId) {
  const { rows } = await pool.query(`SELECT chapter_number, chapter_title, narrative, created_at FROM chapters WHERE user_id = $1 ORDER BY chapter_number ASC`, [userId]);
  return rows.map((r) => ({ chapterNumber: r.chapter_number, chapterTitle: r.chapter_title, narrative: r.narrative, createdAt: r.created_at }));
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
  return { id: r.id, goalIndex: r.goal_index, date: r.date, quest: r.quest, insight: r.insight, reflection: r.reflection, createdAt: r.created_at, isSideQuest: r.is_side_quest, isMeta: r.is_meta };
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
// pre-goal-capture accounts, a single ungoaled slot - OR for a Task 11c
// Side Quest, distinguished from the legacy case by isSideQuest). Always a
// fresh insert - id is a plain serial, there's nothing to collide with,
// unlike the old (user_id, date) key that forced awkward upsert/conflict
// logic.
async function createQuest(userId, goalIndex, date, { quest, insight }, isSideQuest = false, isMeta = false) {
  const { rows } = await pool.query(
    `INSERT INTO days (user_id, goal_index, date, quest, insight, reflection, is_side_quest, is_meta) VALUES ($1, $2, $3, $4, $5, NULL, $6, $7) RETURNING *`,
    [userId, goalIndex, date, quest, insight, isSideQuest, isMeta]
  );
  return rowToQuest(rows[0]);
}

async function saveReflection(userId, id, reflection) {
  await pool.query(`UPDATE days SET reflection = $3 WHERE user_id = $1 AND id = $2`, [userId, id, reflection]);
}

// Task 7d item 6: attaches a shortfall reason to an ALREADY-completed quest's
// reflection (merge, not replace - never touches deltas/mentorReply/etc.
// already stored there). WHERE user_id scopes this so one user can never
// tag another's quest. Only meaningful on a row that already has a
// reflection (the picker only ever appears right after a submit); if
// reflection is somehow still NULL this is a silent no-op, matching the
// principle that this is a context signal layered onto evidence, never a
// substitute for it.
async function setShortfallReason(userId, dayId, reason) {
  await pool.query(
    `UPDATE days SET reflection = reflection || jsonb_build_object('shortfallReason', $3::text)
     WHERE user_id = $1 AND id = $2 AND reflection IS NOT NULL`,
    [userId, dayId, reason]
  );
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

// --- artifacts (Task 10a: persistent per-user document library) ---

function rowToArtifact(r) {
  return { id: r.id, type: r.type, content: r.content, uploadedAt: r.uploaded_at, updatedAt: r.updated_at };
}

// Metadata-only listing - strips dataBase64 out of file-kind content (a CV
// PDF/photo can be hundreds of KB, no reason to ship that on every routine
// "does a CV already exist?" check). getArtifactById below returns the full
// thing, for the one place that actually needs the bytes (job-match-analyze).
function stripArtifactPreview(a) {
  const { content, ...rest } = a;
  if (content?.kind === "file") {
    return { ...rest, content: { kind: "file", mimeType: content.mimeType, filename: content.filename } };
  }
  if (content?.kind === "text") {
    return { ...rest, content: { kind: "text", text: content.text.slice(0, 300) } };
  }
  return { ...rest, content };
}

async function listArtifacts(userId) {
  const { rows } = await pool.query(`SELECT * FROM artifacts WHERE user_id = $1 ORDER BY updated_at DESC`, [userId]);
  return rows.map(rowToArtifact).map(stripArtifactPreview);
}

async function getArtifactById(userId, id) {
  const { rows } = await pool.query(`SELECT * FROM artifacts WHERE user_id = $1 AND id = $2`, [userId, id]);
  return rows[0] ? rowToArtifact(rows[0]) : null;
}

async function createArtifact(userId, { type, content }) {
  const { rows } = await pool.query(
    `INSERT INTO artifacts (user_id, type, content) VALUES ($1, $2, $3) RETURNING *`,
    [userId, type, content]
  );
  return rowToArtifact(rows[0]);
}

// "Ganti" - replaces an existing artifact's content in place (same id, same
// type), per the founder spec's "lihat, tambah, ATAU GANTI artifact kapan
// saja". WHERE user_id scopes this to the caller's own artifacts, so one
// user can never overwrite another's by guessing an id.
async function replaceArtifactContent(userId, id, content) {
  const { rows } = await pool.query(
    `UPDATE artifacts SET content = $3, updated_at = now() WHERE user_id = $1 AND id = $2 RETURNING *`,
    [userId, id, content]
  );
  return rows[0] ? rowToArtifact(rows[0]) : null;
}

module.exports = {
  DEFAULT_STATS, init,
  createUser, getUserByEmail, getUserById,
  getState, createState, updateState, setGoalTarget, activatePathway, resetUser,
  getOpenQuests, getQuestById, createQuest, saveReflection, recentDays, allHistory,
  setPracticeTestState, setPracticeTestPayload, getPracticeTestPayload,
  listArtifacts, getArtifactById, createArtifact, replaceArtifactContent,
  updateKondisi, resetKondisiToNormal, archiveChapter, listChapters,
  touchStatActivity, applyDecayIfDue, setShortfallReason,
};
