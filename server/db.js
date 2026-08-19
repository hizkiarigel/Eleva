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
    -- META Inner Realm target-recommendation flow (12 Agustus): which
    -- goalIndex is the CONFIRMED active target for each realm (soma/lingua/
    -- labora), keyed by realm name as a string. A goal having a target/
    -- practice-test history does NOT imply it's active here - the founder
    -- explicitly wants a separate approve step (see server/metaTargets.js),
    -- this column IS that approval record.
    ALTER TABLE character_state ADD COLUMN IF NOT EXISTS meta_active_targets JSONB DEFAULT '{}'::jsonb;
    -- Founder-reported bug: refreshing mid-onboarding (name/radar/the up-to-6
    -- card AI question loop/pathway/goals) always dropped the user back to
    -- "Siapa namamu?", because nothing about onboarding progress persisted
    -- anywhere until the very end (character_state doesn't exist until
    -- POST /api/profile). Lives on users, not character_state, since it must
    -- be readable/writable before a profile exists at all. Cleared once the
    -- real profile is created, or on account reset - see resetUser/index.js.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_draft JSONB;
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

  // Video Quest (video-quiz): same answer-key isolation rule as
  // practice_test_payload - the locked video's transcript, the candidate
  // video under validation, and the generated 15-question set (with correct
  // ids + explanations) live HERE, never inside `quest` (which ships to the
  // browser verbatim via rowToQuest). Only the /api/video-quiz routes read
  // this column; the client sees questions only through stripQuestions and
  // the answer key only in the pass response (pembahasan).
  await pool.query(`
    ALTER TABLE days ADD COLUMN IF NOT EXISTS video_quiz_payload JSONB;
  `);

  // Reading Half Diagnostic (round 42): ONE reading sprint per Monday-start
  // week per track, shared GLOBALLY across users (founder decision - a
  // diagnostic stays comparable within the week; the Listening diagnostic
  // uses the same consistency reasoning with fully fixed content). The
  // payload here INCLUDES the answer key, same isolation rule as
  // days.practice_test_payload: it is only ever sent to the client through
  // stripAnswers. The static keyless fallback is deliberately never cached
  // here (see the generate route). Invalidation = delete the row; the next
  // generate recreates it.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS weekly_reading_tests (
      week_key TEXT NOT NULL,
      track TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (week_key, track)
    );
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

  // SOMA Nutrition (Part B, 12 Agustus): a small curated searchable food
  // database - MVP per the brief ("search -> serving size -> computed
  // macros"), not an external API integration. barcode is a real column
  // (exact-match lookup works today, see server/nutrition.js) but nothing
  // populates it from camera hardware yet - "build the interface/
  // architecture now even if scanning infra isn't wired" per the brief.
  // Values are PER the stated serving_amount/serving_unit (e.g. "100" +
  // "gram"), not per-100g normalized - keeps the serving-size UI a direct
  // read of one row, no client-side scaling math to get wrong.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS foods (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      serving_amount NUMERIC NOT NULL,
      serving_unit TEXT NOT NULL,
      calories NUMERIC NOT NULL,
      protein NUMERIC NOT NULL,
      carbohydrates NUMERIC NOT NULL,
      fat NUMERIC NOT NULL,
      barcode TEXT UNIQUE
    );
  `);

  // SOMA Nutrition (Part B): each logged meal is durable EVIDENCE (brief
  // item 4), not just transient UI state feeding a running total - reusable
  // by AI analysis / character progression / next-quest generation, same
  // "evidence persisted, not just displayed" principle as every other
  // completion type. quest_id nullable: a META nutrition session (no goal,
  // like the existing META body/practice-test/job-match tools) still logs
  // real entries. Raw photo bytes are NEVER persisted here (same principle
  // as job-match screenshots, server/jobMatch.js) - a photo-sourced entry
  // only keeps the AI's resulting food_name/macros plus source='photo', not
  // the image itself.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS food_entries (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      quest_id INTEGER REFERENCES days(id) ON DELETE SET NULL,
      food_name TEXT NOT NULL,
      serving_amount NUMERIC NOT NULL,
      serving_unit TEXT NOT NULL,
      calories NUMERIC NOT NULL,
      protein NUMERIC NOT NULL,
      carbohydrates NUMERIC NOT NULL,
      fat NUMERIC NOT NULL,
      meal_type TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'search',
      date TEXT NOT NULL,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await seedFoods();
}

// SOMA Nutrition (Part B): MVP seed data, not exhaustive - a modest curated
// list of common Indonesian foods/drinks so search has real results to
// return. INSERT ... ON CONFLICT DO NOTHING keyed by name so this is safe to
// call on every boot (idempotent, same idiom as the ALTER TABLE IF NOT
// EXISTS calls above).
const FOOD_SEED = [
  ["Nasi putih", 100, "gram", 130, 2.7, 28, 0.3, "8992761111017"],
  ["Nasi merah", 100, "gram", 111, 2.6, 23, 0.9, null],
  ["Telur ayam rebus", 1, "butir", 78, 6.3, 0.6, 5.3, null],
  ["Telur ayam goreng", 1, "butir", 92, 6.8, 0.6, 6.9, null],
  ["Ayam goreng (dada, tanpa kulit)", 100, "gram", 165, 31, 0, 3.6, null],
  ["Ayam goreng tepung", 100, "gram", 260, 17, 12, 16, null],
  ["Tempe goreng", 100, "gram", 195, 15, 12, 11, null],
  ["Tahu goreng", 100, "gram", 150, 11, 5, 10, null],
  ["Ikan lele goreng", 100, "gram", 210, 18, 4, 14, null],
  ["Sayur bayam bening", 100, "gram", 23, 2.9, 3.6, 0.4, null],
  ["Tumis kangkung", 100, "gram", 60, 2.6, 4.3, 4, null],
  ["Pisang", 1, "buah sedang", 105, 1.3, 27, 0.4, "8992388111013"],
  ["Apel", 1, "buah sedang", 95, 0.5, 25, 0.3, null],
  ["Susu sapi cair", 250, "ml", 149, 8, 12, 8, "8992772111015"],
  ["Yogurt plain", 100, "gram", 61, 3.5, 4.7, 3.3, null],
  ["Roti tawar putih", 1, "lembar", 66, 2.3, 12.5, 0.9, null],
  ["Oatmeal (masak air)", 100, "gram", 71, 2.5, 12, 1.5, null],
  ["Mie instan goreng", 1, "bungkus", 380, 8, 52, 15, "8996001600016"],
  ["Kopi hitam tanpa gula", 250, "ml", 2, 0.3, 0, 0, null],
  ["Air putih", 250, "ml", 0, 0, 0, 0, null],
  ["Kacang tanah rebus", 100, "gram", 180, 8, 13, 12, null],
  ["Tumis tahu tempe", 100, "gram", 170, 12, 8, 10, null],
  ["Sup ayam sayur", 250, "ml", 120, 12, 8, 4, null],
  ["Gado-gado (tanpa lontong)", 250, "gram", 300, 12, 20, 20, null],
  ["Bubur ayam", 250, "gram", 220, 10, 30, 6, null],
];
async function seedFoods() {
  for (const [name, servingAmount, servingUnit, calories, protein, carbohydrates, fat, barcode] of FOOD_SEED) {
    await pool.query(
      `INSERT INTO foods (name, serving_amount, serving_unit, calories, protein, carbohydrates, fat, barcode)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (name) DO NOTHING`,
      [name, servingAmount, servingUnit, calories, protein, carbohydrates, fat, barcode]
    );
  }
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

// In-progress onboarding snapshot (name/radar/adaptive-card-loop/pathway/
// goals) - see the onboarding_draft column comment in init() for why this
// lives on users rather than character_state. draft is a plain JS object
// (or null to clear); server/index.js is the only caller and owns its shape.
async function getOnboardingDraft(userId) {
  const { rows } = await pool.query(`SELECT onboarding_draft FROM users WHERE id = $1`, [userId]);
  return rows[0]?.onboarding_draft || null;
}
async function saveOnboardingDraft(userId, draft) {
  await pool.query(`UPDATE users SET onboarding_draft = $2 WHERE id = $1`, [userId, draft]);
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
    // META Inner Realm: {soma: goalIndex, lingua: goalIndex, labora: goalIndex}
    // - only the realms the user has actually approved a target for are
    // present as keys. See server/metaTargets.js for how this is composed
    // into what the world-map card shows.
    metaActiveTargets: row.meta_active_targets || {},
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

// META Inner Realm: records the user's explicit approval of goalIndex as
// realm's active target. Same jsonb_build_object merge idiom as
// setGoalTarget/setPracticeTestState - never clobbers another realm's entry.
async function setMetaActiveTarget(userId, realm, goalIndex) {
  await pool.query(
    `UPDATE character_state SET meta_active_targets = COALESCE(meta_active_targets, '{}'::jsonb) || jsonb_build_object($2::text, $3::int) WHERE user_id = $1`,
    [userId, realm, goalIndex]
  );
}

// META Inner Realm: appends a new First Trial goal post-onboarding, from the
// empty-state "no active target yet" CTA on a realm with no matching goal.
// Same 1-3 cap / 200-char trim already enforced at onboarding (POST
// /api/profile) - this just appends instead of replacing the whole array.
async function addGoal(userId, goalText) {
  const trimmed = String(goalText || "").trim().slice(0, 200);
  if (!trimmed) return { ok: false, error: "Goal tidak boleh kosong." };
  const { rows } = await pool.query(`SELECT goals FROM character_state WHERE user_id = $1`, [userId]);
  const goals = (rows[0]?.goals || []).slice();
  if (goals.length >= 3) return { ok: false, error: "Sudah ada 3 goal aktif — maksimal 3." };
  goals.push(trimmed);
  await pool.query(`UPDATE character_state SET goals = $2::jsonb WHERE user_id = $1`, [userId, JSON.stringify(goals)]);
  return { ok: true, goals, goalIndex: goals.length - 1 };
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

// Video Quest: candidate/locked video + transcript + generated question set
// (with answer key). Full replace like setPracticeTestPayload - each save
// writes the whole attempt state. See the column comment in init().
async function setVideoQuizPayload(userId, dayId, payload) {
  await pool.query(`UPDATE days SET video_quiz_payload = $3 WHERE user_id = $1 AND id = $2`, [userId, dayId, payload]);
}
async function getVideoQuizPayload(userId, dayId) {
  const { rows } = await pool.query(`SELECT video_quiz_payload FROM days WHERE user_id = $1 AND id = $2`, [userId, dayId]);
  return rows[0]?.video_quiz_payload || null;
}

// --- Reading Half Diagnostic: weekly global content cache ---

async function getWeeklyReadingTest(weekKey, track) {
  const { rows } = await pool.query(`SELECT payload FROM weekly_reading_tests WHERE week_key = $1 AND track = $2`, [weekKey, track]);
  return rows[0]?.payload || null;
}

// Race-safe first-writer-wins: two simultaneous fresh-week generates may
// both call the AI, but ON CONFLICT DO NOTHING means exactly one insert
// lands and BOTH callers are served the winning row (re-SELECT on conflict).
async function insertWeeklyReadingTestIfAbsent(weekKey, track, payload) {
  const { rows } = await pool.query(
    `INSERT INTO weekly_reading_tests (week_key, track, payload) VALUES ($1, $2, $3)
     ON CONFLICT (week_key, track) DO NOTHING RETURNING payload`,
    [weekKey, track, payload]
  );
  if (rows[0]) return rows[0].payload;
  return getWeeklyReadingTest(weekKey, track);
}

// Recent weekly passage titles (newest first) - the global topic-dedup list
// fed to the generator so a new week doesn't repeat a recent topic.
async function recentWeeklyReadingTitles(track, limit = 8) {
  const { rows } = await pool.query(
    `SELECT payload->'passage'->>'title' AS title FROM weekly_reading_tests
     WHERE track = $1 ORDER BY week_key DESC LIMIT $2`,
    [track, limit]
  );
  return rows.map((r) => r.title).filter(Boolean);
}

async function activatePathway(userId) {
  await pool.query(`UPDATE character_state SET pathway_status = 'active' WHERE user_id = $1`, [userId]);
}

async function resetUser(userId) {
  await pool.query(`DELETE FROM character_state WHERE user_id = $1`, [userId]);
  await pool.query(`DELETE FROM days WHERE user_id = $1`, [userId]);
  await pool.query(`UPDATE users SET onboarding_draft = NULL WHERE id = $1`, [userId]);
}

// --- days (per user; one row per QUEST INSTANCE, not one row per calendar
// day - a user can have up to one open quest per active goal open at once,
// so several rows can legitimately share the same date) ---

// BODY·MOVEMENT outcome-vocabulary migration: reflection.status moved from
// lowercase done/partial/skipped/expired to COMPLETED/PARTIAL/ABANDONED/
// EXPIRED app-wide. Historical rows written before this migration still
// carry the old lowercase strings - translated here, the one choke point
// every read path (getOpenQuests/getQuestById/recentDays/allHistory) already
// funnels through via rowToQuest, so no call site needs its own translation.
// New writes always use the new vocabulary directly; this only exists for
// pre-migration data.
const LEGACY_STATUS_MAP = { done: "COMPLETED", partial: "PARTIAL", skipped: "ABANDONED", expired: "EXPIRED" };
function normalizeLegacyStatus(reflection) {
  if (!reflection || typeof reflection.status !== "string") return reflection;
  const mapped = LEGACY_STATUS_MAP[reflection.status];
  return mapped ? { ...reflection, status: mapped } : reflection;
}

function rowToQuest(r) {
  return { id: r.id, goalIndex: r.goal_index, date: r.date, quest: r.quest, insight: r.insight, reflection: normalizeLegacyStatus(r.reflection), createdAt: r.created_at, isSideQuest: r.is_side_quest, isMeta: r.is_meta };
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

// Meta Inner Realm redesign (12 Agustus): real per-realm session counts for
// the world-map progress cards - a "session" is any resolved (reflection
// saved) quest of that completionType, META free-session OR Today's Trial
// goal-tied alike (the brief's own wording is "real practice-test/run/
// job-match session count", not scoped to META-only). sinceDateKey is a
// YYYY-MM-DD string computed by the caller (see startOfWeekKey/
// startOfMonthKey in index.js) - `date` is a TEXT column in that same
// server-local day-key format everywhere else in this file, so a plain
// string >= comparison is correct and avoids a second date dialect.
async function countSessionsSince(userId, completionType, sinceDateKey) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM days
     WHERE user_id = $1 AND quest->>'completionType' = $2
       AND reflection IS NOT NULL AND date >= $3`,
    [userId, completionType, sinceDateKey]
  );
  return rows[0].n;
}

// SOMA Nutrition Part B item 9: nutrition-log quests resolve LAZILY (GET
// /api/state's end-of-day check, see resolveNutritionQuest in index.js) -
// there's no synchronous moment right after completion for the user to pick
// a shortfall reason the way structured-physical's flow has one, so GET
// /api/state surfaces any still-unpicked ones here instead (reusing the
// SAME reflection.shortfallPrompt/shortfallReason fields and the SAME
// POST /api/quest/shortfall-reason route Task 7d item 6 already built).
async function listPendingShortfalls(userId, completionType, limit = 5) {
  // JSONB gotcha: reflection->'shortfallPrompt' returns the jsonb literal
  // `null` (not SQL NULL) when the key is present with a JSON null value
  // (the COMPLETED case, see resolveNutritionQuest) - "IS NOT NULL" alone
  // would incorrectly match those rows too, so this also excludes the
  // jsonb null literal explicitly.
  const { rows } = await pool.query(
    `SELECT * FROM days WHERE user_id = $1 AND reflection IS NOT NULL
     AND quest->>'completionType' = $2
     AND reflection->'shortfallPrompt' IS NOT NULL AND reflection->'shortfallPrompt' <> 'null'::jsonb
     AND reflection->>'shortfallReason' IS NULL
     ORDER BY id DESC LIMIT $3`,
    [userId, completionType, limit]
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

// --- SOMA Nutrition (Part B, 12 Agustus) ---

// PROGRESSIVE quests (brief item 3) keep their running state INSIDE the
// `quest` jsonb column itself ("extend existing quest schema minimally"),
// mutated across many contribution submissions over one day rather than
// written once at generation time like every SESSION quest. Whole-column
// read-modify-write (same idiom as setPracticeTestPayload/goal_targets'
// jsonb_build_object merges) rather than SQL jsonb path surgery - simplest
// correct thing for a column that's only ever touched by one user's own
// requests, never concurrently from two places at once.
async function updateQuestProgress(userId, dayId, questPatch) {
  const { rows } = await pool.query(`SELECT quest FROM days WHERE user_id = $1 AND id = $2`, [userId, dayId]);
  if (!rows.length) return null;
  const quest = { ...rows[0].quest, ...questPatch };
  await pool.query(`UPDATE days SET quest = $3 WHERE user_id = $1 AND id = $2`, [userId, dayId, quest]);
  return quest;
}

function rowToFoodEntry(r) {
  return {
    id: r.id, questId: r.quest_id, foodName: r.food_name,
    servingAmount: Number(r.serving_amount), servingUnit: r.serving_unit,
    calories: Number(r.calories), protein: Number(r.protein),
    carbohydrates: Number(r.carbohydrates), fat: Number(r.fat),
    mealType: r.meal_type, source: r.source, date: r.date, recordedAt: r.recorded_at,
  };
}

// Each submission is durable evidence (brief item 4) - persisted here
// regardless of which entry path produced it (search-based or the optional
// photo-based path, server/nutritionEntry.js normalizes both to this same
// shape first).
async function createFoodEntry(userId, entry) {
  const { rows } = await pool.query(
    `INSERT INTO food_entries (user_id, quest_id, food_name, serving_amount, serving_unit, calories, protein, carbohydrates, fat, meal_type, source, date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [userId, entry.questId ?? null, entry.foodName, entry.servingAmount, entry.servingUnit,
      entry.calories, entry.protein, entry.carbohydrates, entry.fat, entry.mealType, entry.source, entry.date]
  );
  return rowToFoodEntry(rows[0]);
}

async function listFoodEntriesForQuest(userId, questId) {
  const { rows } = await pool.query(
    `SELECT * FROM food_entries WHERE user_id = $1 AND quest_id = $2 ORDER BY recorded_at ASC`,
    [userId, questId]
  );
  return rows.map(rowToFoodEntry);
}

// Today's Nutrition page totals - not scoped to one quest_id, since a user
// can eat outside of any active quest too (the page shows real intake
// regardless of whether a Nutrition Trial happens to be running today).
async function listFoodEntriesForDate(userId, date) {
  const { rows } = await pool.query(
    `SELECT * FROM food_entries WHERE user_id = $1 AND date = $2 ORDER BY recorded_at ASC`,
    [userId, date]
  );
  return rows.map(rowToFoodEntry);
}

function rowToFood(r) {
  return {
    id: r.id, name: r.name, servingAmount: Number(r.serving_amount), servingUnit: r.serving_unit,
    calories: Number(r.calories), protein: Number(r.protein), carbohydrates: Number(r.carbohydrates),
    fat: Number(r.fat), barcode: r.barcode,
  };
}

// Food search MVP (brief item 5): plain case-insensitive substring match
// against the curated seed list - no external nutrition API in this round.
async function searchFoods(query) {
  const { rows } = await pool.query(
    `SELECT * FROM foods WHERE name ILIKE $1 ORDER BY name ASC LIMIT 20`,
    [`%${query}%`]
  );
  return rows.map(rowToFood);
}

// Barcode lookup - the interface/architecture the brief asks for even
// though nothing wires up camera scanning hardware yet; this works today
// against any barcode present in the seed data via a typed/pasted code.
async function getFoodByBarcode(barcode) {
  const { rows } = await pool.query(`SELECT * FROM foods WHERE barcode = $1`, [barcode]);
  return rows[0] ? rowToFood(rows[0]) : null;
}

module.exports = {
  DEFAULT_STATS, init,
  createUser, getUserByEmail, getUserById, getOnboardingDraft, saveOnboardingDraft,
  getState, createState, updateState, setGoalTarget, activatePathway, resetUser,
  getOpenQuests, getQuestById, createQuest, saveReflection, recentDays, allHistory,
  setPracticeTestState, setPracticeTestPayload, getPracticeTestPayload,
  setVideoQuizPayload, getVideoQuizPayload,
  getWeeklyReadingTest, insertWeeklyReadingTestIfAbsent, recentWeeklyReadingTitles,
  listArtifacts, getArtifactById, createArtifact, replaceArtifactContent,
  updateKondisi, resetKondisiToNormal, archiveChapter, listChapters,
  touchStatActivity, applyDecayIfDue, setShortfallReason, listPendingShortfalls,
  updateQuestProgress, createFoodEntry, listFoodEntriesForQuest, listFoodEntriesForDate,
  searchFoods, getFoodByBarcode, countSessionsSince, setMetaActiveTarget, addGoal,
};
