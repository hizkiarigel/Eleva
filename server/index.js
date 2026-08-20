require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieSession = require("cookie-session");
const db = require("./db");
const auth = require("./auth");
const ai = require("./claude");
const safety = require("./safety");
const structured = require("./structured");
const targets = require("./targets");
const practiceTestLib = require("./practiceTest");
const listeningDiagnostic = require("./listeningDiagnostic");
const videoQuizLib = require("./videoQuiz");
const youtube = require("./youtube");
const jobMatch = require("./jobMatch");
const jobApplication = require("./jobApplication");
const nutrition = require("./nutrition");
const nutritionEntry = require("./nutritionEntry");
const metaTargets = require("./metaTargets");
const exerciseCatalog = require("./exerciseCatalog");
const questHub = require("./questHub");
const crypto = require("crypto");

// Task 14 (Livelihood Milestone, PRD.md section 26): auto-creates the fixed
// "10 Qualified Applications" milestone the first time a Livelihood goal's
// job-match flow touches a goalIndex with no Livelihood-family target yet.
// Unlike cardio/gym (a target only exists once the user picks A/B/C after a
// completed quest), this one is fixed from the founder's own decision - no
// AI options, no user pick - so it's created eagerly rather than waiting for
// an evidence submission to trigger it. Must be PERSISTED (not just
// computed on read, the way practiceTestLib.currentTargetFor is) so it
// renders through the same .quest-context Milestone line Body goals already
// get (that line reads state.goalTargets only, see public/app.js
// questSummaryCard/milestoneLabel).
async function ensureQualifiedApplicationsMilestone(userId, state, goalIndex) {
  const existing = state.goalTargets?.[String(goalIndex)];
  if (existing && (existing.kind === "qualified-applications" || existing.kind === "livelihood-funnel")) return existing;
  const metrics = { targetCount: 10, currentCount: 0 };
  const target = {
    kind: "qualified-applications",
    label: targets.formatTargetLabel("qualified-applications", metrics),
    approach: "", metrics, source: "auto", createdAt: new Date().toISOString(),
  };
  await db.setGoalTarget(userId, goalIndex, target);
  state.goalTargets = { ...(state.goalTargets || {}), [String(goalIndex)]: target };
  return target;
}

const app = express();
app.set("trust proxy", 1);
// Default 100kb is far too small for base64-encoded CVs/screenshots (Task
// 10a/10b) - everything else in this app is small JSON, so the higher limit
// only matters for the artifacts/job-match routes.
app.use(express.json({ limit: "20mb" }));

app.use(
  cookieSession({
    name: "eleva.sid",
    secret: process.env.SESSION_SECRET,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  })
);

// Round 37: this app has no build step - public/app.js and public/styles.css
// are hand-served static files with no version query string/content hash.
// express.static()'s default headers (Cache-Control: public, max-age=0 +
// ETag) technically require revalidation on every load but don't guarantee
// it survives a flaky connection - a real mobile browser on weak signal can
// silently keep serving what's already on disk if the revalidation
// round-trip fails, which matched a real founder-reported symptom (a fix
// verified correct in this repo's own tests never showing up on their real
// device across multiple deploys). no-store removes that failure mode
// entirely for just these two files - other static assets keep default
// caching, they aren't the problem.
app.use(express.static(path.join(__dirname, "..", "public"), {
  setHeaders: (res, filePath) => {
    const base = path.basename(filePath);
    if (base === "app.js" || base === "styles.css") {
      res.setHeader("Cache-Control", "no-store");
    }
  },
}));

function todayKey(d) {
  return (d ? new Date(d) : new Date()).toLocaleDateString("en-CA"); // YYYY-MM-DD, server local time
}
// Meta Inner Realm redesign: date-key window starts for the world-map
// progress cards (db.countSessionsSince) - Monday-start calendar week for
// SOMA ("X sesi minggu ini" per the handoff's own prototype copy), calendar
// month for LINGUA/LABORA ("X sesi bulan ini"). Same todayKey day-key format
// so the plain string comparison in countSessionsSince stays correct.
function startOfWeekKey(d = new Date()) {
  const day = d.getDay(); // 0=Sun..6=Sat
  const monday = new Date(d);
  monday.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return todayKey(monday);
}
function startOfMonthKey(d = new Date()) {
  return todayKey(new Date(d.getFullYear(), d.getMonth(), 1));
}
function wordCount(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

// Task 11f (Context Update, formalized wording/set from Eleva_PRD.pdf): a
// real 6-chip enum, mirrored client-side in public/app.js (same hand-sync
// pattern as SUB_PATHWAY_NAMES - no shared module system between
// client/server here).
const KONDISI_LABELS = ["Capek/energi rendah", "Sakit/cedera", "Beban kerja tinggi", "Traveling", "Mentally drained", "Energi lebih"];

// Task 7c: auto-computed completion tier for a structured-physical quest,
// replacing the old client self-reported "Gimana progressnya?" picker -
// "selesai" vs "sebagian" is now a fact derived from evidence vs the
// quest's own evidenceSchema.target, not a self-report. Falls back to
// "COMPLETED" (submission = completion, the pre-Task-7c behavior) whenever
// there's no usable target to compare against - a quest without a clean
// numeric target can't be judged partial, so it isn't.
function computeEvidenceStatus(quest, structuredClean) {
  // BODY · MOVEMENT execution flow: Strength's multi-exercise submission is
  // compared against the QUEST'S OWN plannedExercises (server truth, never
  // a client-echoed target - same posture as cardio/gym's evidenceSchema
  // compare below), matched by index since the client always submits every
  // planned exercise in the same order it was seeded in (POST /attempt/
  // start). Aggregate ratio across all exercises, not per-exercise
  // all-or-nothing - consistent with cardio's own ratio-based approach.
  if (structuredClean?.kind === "strength-session") {
    const planned = quest?.plannedExercises || [];
    let totalPlannedSets = 0, metSets = 0;
    planned.forEach((pe, i) => {
      totalPlannedSets += pe.targetSets;
      const actualExercise = structuredClean.exercises[i];
      if (!actualExercise) return;
      actualExercise.sets.forEach((s) => {
        if (s.done && s.reps >= pe.targetReps && (pe.targetLoadKg == null || (s.weightKg || 0) >= pe.targetLoadKg)) metSets++;
      });
    });
    if (totalPlannedSets === 0) return "COMPLETED";
    return metSets / totalPlannedSets >= 0.95 ? "COMPLETED" : "PARTIAL";
  }
  const schema = quest?.evidenceSchema;
  if (!schema || schema.target == null || !structuredClean) return "COMPLETED";
  const actual = schema.metricType === "distance" ? structuredClean.jarakKm
    : schema.metricType === "reps" ? structuredClean.repetisi
    : null;
  if (actual == null) return "COMPLETED";
  return actual / schema.target >= 0.95 ? "COMPLETED" : "PARTIAL";
}

// Task 7d item 6: a separate shortfall-reason trigger, independent of the
// "Rasanya gimana?" difficulty rating - evidence can land far below the
// Milestone target even when the user rated it "Ringan" the whole time
// (founder's example: sudden rain cut a run short at 1.8km of a 3.2km
// target). Fires purely off evidence-vs-target ratio, never off the
// difficulty rating. The picked reason is a CONTEXT signal (stored on the
// reflection, read by the next day's generateQuest call) - never evidence,
// never touches growth.
const SHORTFALL_REASONS = ["Cuaca", "Cedera", "Gangguan/diinterupsi", "Kehabisan waktu", "Lainnya"];
const SHORTFALL_THRESHOLD = 0.8;

// Round 40 (founder feedback on the quest-hub redesign): a real server-side
// quest deadline. Rolling window off createdAt, NOT a calendar/midnight
// checkpoint - this app has no timezone-handling code anywhere and none
// should be introduced here. 24h nominal (keep in sync with public/app.js
// questUrgency's "Waktu habis" label threshold) + 4h invisible grace so
// minor daily schedule drift (gym at 4pm one day, 5pm the next) doesn't
// fail a quest - the grace is never surfaced as a countdown, only the
// label's nominal 24h is shown; the extra time only affects when the
// server actually closes+replaces the quest (see the expiry loop in
// GET /api/state) and when the client's CTA lockout kicks in.
const QUEST_NOMINAL_DEADLINE_MS = 24 * 60 * 60 * 1000;
const QUEST_GRACE_MS = 4 * 60 * 60 * 1000;
const QUEST_EXPIRY_MS = QUEST_NOMINAL_DEADLINE_MS + QUEST_GRACE_MS;
function computeShortfallPrompt(quest, structuredClean) {
  const schema = quest?.evidenceSchema;
  if (!schema || schema.target == null || !structuredClean) return null;
  const actual = schema.metricType === "distance" ? structuredClean.jarakKm
    : schema.metricType === "reps" ? structuredClean.repetisi
    : null;
  if (actual == null) return null;
  return actual / schema.target < SHORTFALL_THRESHOLD ? { reasons: SHORTFALL_REASONS } : null;
}

// SOMA Nutrition Part B item 8: shared resolution for a PROGRESSIVE
// nutrition quest reaching a terminal status - reuses the SAME
// ai.processReflection call every other completion type funnels growth
// through (Task 7d's "no arbitrary points" precedent - job-match-analysis
// was the one FLAT-bump holdout, Task 14 already closed that, this doesn't
// reopen it with a new one), fed a nutrition-shaped ctx instead of free
// text. Called from two places: POST /api/nutrition/log (the instant both
// evidenceComplete+targetMet go true, mid-day, brief item 8's "no manual
// confirm") and GET /api/state's lazy end-of-day check (a quest whose date
// has rolled past and never hit both booleans while ACTIVE).
async function resolveNutritionQuest(userId, dayId, quest, state) {
  const progressive = quest.progressive;
  const effectiveStatus = progressive.status === "COMPLETED" ? "COMPLETED" : progressive.status === "ATTEMPTED" ? "PARTIAL" : "ABANDONED";
  const ctx = {
    profile: { name: state.profile.name, originStory: state.profile.originStory || state.profile.situation },
    quest, status: effectiveStatus, nutritionResult: progressive,
    stats: state.stats, growthSessions: state.growthSessions,
  };
  const result = await ai.processReflection(ctx);
  // Compliance (evidenceComplete) and target-achievement (targetMet) stay
  // separate booleans (brief item 8) all the way down to the growth gate -
  // logged every required meal but missed the metric target still grows.
  const deltas = progressive.evidenceComplete ? (result.statDeltas || {}) : {};
  const newStats = { ...state.stats };
  Object.entries(deltas).forEach(([k, v]) => {
    if (newStats[k] !== undefined && typeof v === "number") {
      newStats[k] = Math.max(0, Math.min(100, newStats[k] + Math.max(0, Math.min(5, Math.round(v)))));
    }
  });
  const newGrowthSessions = state.growthSessions + (Object.keys(deltas).length > 0 ? 1 : 0);

  const reflection = {
    status: effectiveStatus, text: "",
    nutritionResult: progressive,
    deltas, mentorReply: result.mentorReply, interpretation: result.interpretation || null,
    // Brief item 9: fixed-option shortfall reason, ATTEMPTED/INCOMPLETE
    // only - reuses the SAME SHORTFALL_REASONS/setShortfallReason mechanism
    // Task 7d item 6 already built for structured-physical, surfaced on the
    // Nutrition page (public/app.js) since this resolution can happen lazily,
    // not always right after a user action there's a screen open for.
    shortfallPrompt: progressive.status !== "COMPLETED" ? { reasons: SHORTFALL_REASONS } : null,
    timestamp: new Date().toISOString(),
  };
  await db.saveReflection(userId, dayId, reflection);
  // SOMA Training feedback brief item 4: a Nutrition chain step (step 2)
  // resolves through THIS choke point, not POST /api/reflection's own -
  // both routes that can complete a nutrition-log quest (immediate, in
  // POST /api/nutrition/log, and the lazy end-of-day sweep in GET
  // /api/state) funnel through resolveNutritionQuest, so the chain-advance
  // hook belongs here rather than duplicated at both call sites.
  if (quest.chain) {
    await advanceChain(userId, state, { quest, id: dayId }, null);
  }
  await db.touchStatActivity(userId, Object.keys(deltas));
  await db.updateState(userId, {
    stats: newStats, chapterNumber: state.chapterNumber, chapterTitle: state.chapterTitle,
    growthSessions: newGrowthSessions, pathwayNoun: state.pathwayNoun,
  });
  return reflection;
}

// Round 40: closes a quest that missed its real 28h deadline (24h nominal +
// 4h invisible grace, QUEST_EXPIRY_MS) without the user ever completing it.
// Deterministic, no AI call - unlike resolveNutritionQuest above (a JUDGED
// outcome fed through ai.processReflection), this is a neutral no-op close:
// zero stat/streak penalty, per the founder's own explicit call ("dorong
// mulai lagi, bukan menghukum"). The minimal shape here (status/text/
// deltas/timestamp) matches every other reflection in this codebase closely
// enough that nothing reading old reflections elsewhere breaks - no reader
// assumes mentorReply/interpretation/etc. are always present.
async function resolveExpiredQuest(userId, id) {
  const reflection = { status: "EXPIRED", text: "", deltas: {}, timestamp: new Date().toISOString() };
  await db.saveReflection(userId, id, reflection);
}

// Kisahmu: archives the chapter that's about to be superseded, BEFORE the
// caller overwrites character_state with the new one - shared by both
// completion routes that can trigger a chapter advance (POST /api/reflection,
// POST /api/practice-test/submit). No-op when not actually advancing.
async function archiveChapterIfAdvancing(userId, state, allowAdvance) {
  if (!allowAdvance) return;
  await db.archiveChapter(userId, {
    chapterNumber: state.chapterNumber,
    chapterTitle: state.chapterTitle,
    narrative: state.chapterNarrative,
  });
}

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Belum login." });
  }
  req.userId = req.session.userId;
  next();
}

// --- Auth routes ---

app.post("/api/signup", async (req, res) => {
  try {
    const { email, password, betaCode } = req.body;
    const user = await auth.signup({ email, password, betaCode });
    req.session.userId = user.id;
    res.json({ ok: true });
  } catch (e) {
    if (e instanceof auth.AuthError) return res.status(400).json({ error: e.message });
    console.error(e);
    res.status(500).json({ error: "Gagal mendaftar." });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await auth.login({ email, password });
    req.session.userId = user.id;
    res.json({ ok: true });
  } catch (e) {
    if (e instanceof auth.AuthError) return res.status(400).json({ error: e.message });
    console.error(e);
    res.status(500).json({ error: "Gagal login." });
  }
});

app.post("/api/logout", (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

// Onboarding bridge dev-preview gate (round 19) - unauthenticated so the
// client can check it before/without a login, reporting nothing sensitive
// (same NODE_ENV read already used for the session cookie's secure flag
// above). The client only honors ?debug=bridges when this reports
// "development" - inert on the deployed production app either way.
app.get("/api/env", (req, res) => {
  res.json({ env: process.env.NODE_ENV === "production" ? "production" : "development" });
});

// --- Adaptive onboarding (stateless AI proxies; no character_state yet) ---

app.post("/api/onboarding/scenario-card", requireAuth, async (req, res) => {
  try {
    const { profile, radarSnapshot, lockedAxes, previousCards } = req.body;
    const result = await ai.generateScenarioCard({ profile, radarSnapshot, lockedAxes, previousCards });
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal membuat kartu." });
  }
});

app.post("/api/onboarding/chapter-analysis", requireAuth, async (req, res) => {
  try {
    const { profile, radarSnapshot, radarRaw, lockedAxes, lockedOriginalValue, cards } = req.body;
    const result = await ai.generateChapterAnalysis({ profile, radarSnapshot, radarRaw, lockedAxes, lockedOriginalValue, cards });
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal membuat Chapter Analysis." });
  }
});

// Goal Setting redesign - validates a single onboarding goal before it can
// be "Set" (approved). Thin proxy, same shape as the other onboarding AI
// routes above.
app.post("/api/onboarding/validate-goal", requireAuth, async (req, res) => {
  try {
    const { text, pathway, pathwayNoun } = req.body;
    if (typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "Goal kosong." });
    const result = await ai.generateGoalValidation({ text: text.trim().slice(0, 200), pathway, pathwayNoun });
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal memeriksa goal." });
  }
});

// Bug fix: refreshing mid-onboarding always dropped the user back to
// "Siapa namamu?", because nothing about in-progress onboarding (name/
// radar/the up-to-6-card AI question loop/pathway/goals) persisted anywhere
// until POST /api/profile at the very end. The client saves a snapshot here
// after every step/card, and GET /api/state (below) hands it back so a
// refresh resumes instead of restarting. Opaque JSON, shape owned entirely
// by the client (public/app.js's saveOnboardingDraft/restoreOnboardingDraft) -
// the server only stores/returns it, with a defensive size cap since it's
// otherwise unvalidated client input.
app.post("/api/onboarding/draft", requireAuth, async (req, res) => {
  try {
    const { draft } = req.body;
    if (draft != null) {
      if (typeof draft !== "object" || Array.isArray(draft)) return res.status(400).json({ error: "Draft tidak valid." });
      if (JSON.stringify(draft).length > 100000) return res.status(400).json({ error: "Draft terlalu besar." });
    }
    await db.saveOnboardingDraft(req.userId, draft ?? null);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal menyimpan progres onboarding." });
  }
});

// --- App routes (all require auth, all scoped by req.userId from session) ---

// Full app state for the frontend: profile, stats, chapter, today's day, aiActive flag
app.get("/api/state", requireAuth, async (req, res) => {
  try {
    const state = await db.getState(req.userId);
    if (!state || !state.profile) {
      const onboardingDraft = await db.getOnboardingDraft(req.userId);
      return res.json({ profile: null, onboardingDraft });
    }

    // Resonance check: after 14 days, a trial Pathway with enough real growth
    // sessions (same unit chapter-advance already uses) activates for good.
    // Traceable to real reflection data, not a hidden score - see PRD Task 5.
    if (state.pathway && state.pathwayStatus === "trial" && state.pathwayTrialStartedAt) {
      const daysSinceTrial = (Date.now() - new Date(state.pathwayTrialStartedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceTrial >= 14 && state.growthSessions >= 5) {
        await db.activatePathway(req.userId);
        state.pathwayStatus = "active";
      }
    }

    // Homepage redesign: "Kondisi Hari Ini" is scoped to TODAY - lazy reset
    // back to Normal the first time a new calendar day is seen, same idiom
    // as the resonance-check above (no cron job, just checked on read).
    if (state.kondisiStatus !== "Normal" && todayKey(state.kondisiUpdatedAt) !== todayKey()) {
      await db.resetKondisiToNormal(req.userId);
      state.kondisiStatus = "Normal";
      state.kondisiNote = null;
    }

    // Task 11e (Decay): lazy, at-most-once-per-day evaluation - see
    // db.applyDecayIfDue for the full rationale (mandatory pause while
    // kondisi != Normal, gradual not backlogged). Runs AFTER the kondisi
    // reset above so a condition that just lapsed back to Normal today
    // doesn't retroactively pause today's check too.
    state.stats = await db.applyDecayIfDue(req.userId);

    // Per-goal quest model (founder-reported regression this replaces: a
    // goal's quest used to get silently swapped out before the user marked
    // it done - first by a pure calendar-day rotation, then by a 24h
    // rolling window that was still time-based). Now: a goal's quest is
    // NEVER replaced by anything except that same goal being marked done.
    // One open quest per active goal, up to 3 simultaneously (goals.length
    // is capped at 3 at capture time) - every goal currently missing one
    // gets a fresh quest generated for it, right here, every state fetch.
    // Accounts from before goal capture existed (goals.length === 0) get a
    // single ungoaled slot (goalIndex null) instead, so they're never left
    // without any quest at all.
    const goals = state.goals || [];
    let openQuests = await db.getOpenQuests(req.userId);

    // SOMA Nutrition Part B item 8: lazy end-of-day evaluation, same idiom
    // as the kondisi/Decay lazy checks above - no cron infra in this app, so
    // a PROGRESSIVE quest only ever resolves the next time something reads
    // state after its `date` has rolled past. COMPLETED already resolves
    // itself synchronously in POST /api/nutrition/log the instant both
    // booleans go true; this only ever catches ATTEMPTED/INCOMPLETE (a quest
    // still ACTIVE once its day is over).
    let resolvedAnyNutrition = false;
    for (const q of openQuests) {
      if (q.quest?.lifecycleType !== "progressive" || q.quest?.progressive?.status !== "ACTIVE") continue;
      if (q.date === todayKey()) continue; // still today, not due yet
      const evaluated = nutrition.evaluateEndOfDay(q.quest.progressive);
      await resolveNutritionQuest(req.userId, q.id, { ...q.quest, progressive: evaluated }, state);
      resolvedAnyNutrition = true;
    }
    if (resolvedAnyNutrition) {
      openQuests = await db.getOpenQuests(req.userId); // re-fetch: resolved rows must drop out of "open"
    }

    // Round 40 (founder-reported regression): the 24h deadline shown to the
    // user was 100% client-side cosmetic - the server never closed an
    // unreflected quest, so a goal whose only open quest passed 24h could
    // get permanently stuck (needySlots below never saw that goalIndex as
    // empty, so it never regenerated). Same lazy-check shape as the
    // nutrition loop just above: a rolling window off createdAt (28h real
    // deadline, see QUEST_EXPIRY_MS), checked here on every GET /api/state.
    // Resolution is neutral (no AI call, no stat impact) - see
    // resolveExpiredQuest's own comment for why.
    const expiredGoalIndexes = new Set();
    let resolvedAnyExpired = false;
    for (const q of openQuests) {
      if (q.isMeta) continue; // META rows have no user-facing deadline UI, never auto-expire
      if (q.quest?.lifecycleType === "progressive") continue; // handled by the nutrition loop above, its own clock
      if (!q.createdAt || Date.now() - new Date(q.createdAt).getTime() < QUEST_EXPIRY_MS) continue;
      await resolveExpiredQuest(req.userId, q.id);
      if (q.goalIndex != null) expiredGoalIndexes.add(q.goalIndex);
      resolvedAnyExpired = true;
      // SOMA Training feedback brief item 4: unlike META, a chain-step quest
      // DOES have a real deadline - a step nobody engaged with means the
      // chain cancels outright (safe default, never stalls the account
      // waiting for a step that's never coming). Clear the SAME request's
      // in-memory state too, not just the DB, so the needySlots/sideSlots
      // guards below immediately see rotation as unfrozen.
      if (q.isChain) {
        await db.clearActiveChain(req.userId);
        state.activeChain = null;
      }
    }
    if (resolvedAnyExpired) {
      openQuests = await db.getOpenQuests(req.userId); // re-fetch: resolved rows must drop out of "open" before needySlots below
    }

    const goalSlots = goals.length ? goals.map((_, i) => i) : [null];
    // Task 12 (META): a META row must never count as "this slot has an open
    // quest" - a goal_index-null META session would otherwise satisfy a
    // legacy ungoaled account's single slot check (both use goal_index NULL)
    // and silently block that account's real daily quest from generating.
    // SOMA Training feedback brief item 4: while a condition-triggered chain
    // (Recovery->Nutrition->Training) is active, normal goal-rotation quest
    // generation freezes - same "field-gated read-time check" idiom as
    // applyDecayIfDue's kondisi-status pause, not a separate suspend/resume
    // call. Already-open goal quests are completely untouched; only
    // generating NEW ones into empty slots stops. Resumes automatically the
    // instant db.clearActiveChain runs (chain completes or cancels/expires)
    // - the very next GET /api/state sees state.activeChain falsy again.
    const needySlots = state.activeChain ? [] : goalSlots.filter((gi) => !openQuests.some((q) => q.goalIndex === gi && !q.isMeta));
    if (needySlots.length) {
      // One shared context snapshot for every goal generated in this pass -
      // avoids a re-read per goal, and right after onboarding (the only
      // time more than one slot is typically needy at once) there's no new
      // reflection data between them anyway for it to miss.
      const recentAll = await db.recentDays(req.userId, { limit: 5 });
      const recentCtx = recentAll.map((d) => ({ date: d.date, quest: d.quest?.title, goalIndex: d.goalIndex, reflection: d.reflection }));
      for (const goalIndex of needySlots) {
        // Task 14 point 4: deterministic branching hint for the Livelihood
        // Milestone loop - computed in code (same defense-in-depth principle
        // as targetReached/qualified) rather than asked of the model from
        // raw recentDays, so a wrong AI read of old history can never
        // mis-route "just qualified" into a skill-building quest or vice
        // versa. Scoped to THIS goal only (recentAll above is cross-goal).
        // "Unresolved" = the most recent job-match-analysis for this goal
        // has no LATER job-application-submit for the same goal yet.
        let jobMatchHint = null;
        if (goalIndex != null) {
          const goalRecent = await db.recentDays(req.userId, { goalIndex, limit: 5 });
          const lastAnalysis = goalRecent.find((d) => d.reflection?.jobMatchResult);
          const lastSubmit = goalRecent.find((d) => d.reflection?.jobApplicationSubmit);
          if (lastAnalysis && (!lastSubmit || lastSubmit.id < lastAnalysis.id)) {
            const jm = lastAnalysis.reflection.jobMatchResult;
            jobMatchHint = jm.qualified
              ? { qualified: true, note: "Lowongan terakhir yang dianalisis LOLOS (qualified) untuk goal ini - quest hari ini WAJIB completionType job-application-submit untuk lowongan itu, JANGAN job-match-analysis baru dulu." }
              : {
                  qualified: false,
                  gap: (jm.matchTable || []).filter((r) => r.status !== "ada bukti").map((r) => r.skill),
                  note: "Lowongan terakhir yang dianalisis TIDAK lolos (not qualified) untuk goal ini - JANGAN pilih job-application-submit. Pilih quest skill-building yang menyasar gap-nya, ATAU job-match-analysis untuk lowongan LAIN.",
                };
          }
        }
        const ctx = {
          profile: state.profile,
          pathway: state.pathway,
          pathwayNoun: state.pathwayNoun,
          // Both passed when present - v3 accounts have radarSnapshot, pre-v3
          // accounts have growthFocus, MENTOR_SYSTEM knows to use whichever
          // exists so old accounts don't silently lose their "compass".
          growthFocus: state.growthFocus || undefined,
          radarSnapshot: state.radarSnapshot || undefined,
          // v13: goals = the user's 1-3 First Trial targets (the WHAT; pathway
          // stays the constant HOW). activeGoal = the one THIS quest targets.
          goals: goals.length ? goals : undefined,
          activeGoal: goalIndex != null ? goals[goalIndex] : undefined,
          // Fokus 2.2/2.3: once a goal has a persistent target, its next
          // quest is a step TOWARD that target, not a fresh assumption it's
          // already met - generateQuest's prompt references this instead of
          // treating every quest as a clean slate.
          // Task 13: a practice-test goal's target isn't a picked A/B/C
          // number but the bottleneck track+band, recomputed read-only from
          // its per-track history on every fetch (server-side, never the
          // AI's choice) - {track, targetBand} with a label/approach shaped
          // like the physical targets so generateQuest's prompt reads both
          // the same way.
          currentTarget: goalIndex != null
            ? (state.goalTargets?.[String(goalIndex)]
              || (state.practiceTest?.[String(goalIndex)]
                ? practiceTestLib.currentTargetFor(state.practiceTest[String(goalIndex)], goals[goalIndex])
                : undefined))
            : undefined,
          // Task 11f: Context Update feeds quest generation directly (the
          // WOOP-Obstacle tie-in from the PRD) - only passed when it's
          // actually saying something (Normal is the default, nothing to
          // moderate for).
          kondisiStatus: state.kondisiStatus !== "Normal" ? state.kondisiStatus : undefined,
          kondisiNote: state.kondisiStatus !== "Normal" ? state.kondisiNote : undefined,
          // Round 40: this goal's PREVIOUS quest just got auto-closed above
          // (28h rolling deadline, neutral resolution) - signal it so
          // generateQuest's prompt can make THIS replacement noticeably
          // easier, to rebuild momentum instead of the usual difficulty.
          previousQuestExpired: expiredGoalIndexes.has(goalIndex) ? true : undefined,
          jobMatchHint: jobMatchHint || undefined,
          stats: state.stats,
          chapterNumber: state.chapterNumber,
          chapterTitle: state.chapterTitle,
          recentDays: recentCtx,
          today: todayKey(),
        };
        const result = await ai.generateQuest(ctx);
        // Stamp which goal this quest belongs to server-side - deterministic,
        // never trusted from the model.
        if (goalIndex != null && result.quest) result.quest.goalIndex = goalIndex;
        state.chapterNumber = result.chapterNumber || state.chapterNumber;
        state.chapterTitle = result.chapterTitle || state.chapterTitle;
        state.pathwayNoun = state.pathwayNoun || result.pathwayNoun || null;
        // Homepage redesign "Eleva Observed" card - refreshed whenever a new
        // quest generates. If several goals are needy in the same pass (only
        // really happens right after onboarding), last one wins; they'd all
        // describe roughly the same recentDays anyway.
        if (result.observed) state.observed = result.observed;
        const created = await db.createQuest(req.userId, goalIndex, todayKey(), { quest: result.quest, insight: result.insight });
        openQuests.push(created);
      }
      await db.updateState(req.userId, {
        stats: state.stats,
        chapterNumber: state.chapterNumber,
        chapterTitle: state.chapterTitle,
        growthSessions: state.growthSessions,
        pathwayNoun: state.pathwayNoun,
        observed: state.observed,
      });
      openQuests.sort((a, b) => (a.goalIndex ?? -1) - (b.goalIndex ?? -1));
    }

    // Task 11c (Side Quest, real feature): fills the carousel's otherwise-
    // empty slots (3 minus active goal count) with an optional bonus quest
    // not tied to any goal. Only for accounts that actually have goal
    // capture (goals.length > 0) - legacy pre-goal-capture accounts keep
    // their single ungoaled Primary slot only, no Side Quest sprawl.
    // Chain suspension (see the needySlots comment above) also freezes Side
    // Quest generation - a fresh Side Quest appearing mid-chain would be a
    // confusing distraction while the user is mid-recovery.
    const sideSlots = state.activeChain ? 0 : (goals.length ? Math.max(0, 3 - goals.length) : 0);
    const openSideCount = openQuests.filter((q) => q.isSideQuest).length;
    for (let i = openSideCount; i < sideSlots; i++) {
      const result = await ai.generateSideQuest({ profile: state.profile, pathway: state.pathway, goals });
      const created = await db.createQuest(req.userId, null, todayKey(), { quest: result.quest, insight: null }, true);
      openQuests.push(created);
    }

    const fresh = await db.getState(req.userId);

    // Homepage redesign, Character screen: "trending down" is COSMETIC,
    // derived from real history - NOT an automatic stat decrease (stats here
    // only ever move via real reflection, that principle doesn't change).
    // Flagged only when a stat grew in the PRIOR 7 days but grew less (or not
    // at all) in the most RECENT 7 days - avoids flagging a stat that simply
    // hasn't had a chance to move yet.
    const recentForTrend = await db.allHistory(req.userId, 40);
    const now = Date.now();
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const recentSum = {}, priorSum = {};
    recentForTrend.forEach((d) => {
      const ts = d.reflection?.timestamp ? new Date(d.reflection.timestamp).getTime() : null;
      if (!ts) return;
      const age = now - ts;
      const bucket = age <= WEEK_MS ? recentSum : age <= WEEK_MS * 2 ? priorSum : null;
      if (!bucket) return;
      Object.entries(d.reflection?.deltas || {}).forEach(([k, v]) => { bucket[k] = (bucket[k] || 0) + (Number(v) || 0); });
    });
    const statTrends = {};
    Object.keys(fresh.stats || {}).forEach((k) => {
      statTrends[k] = (priorSum[k] || 0) > 0 && (recentSum[k] || 0) < (priorSum[k] || 0);
    });

    // Kisahmu: archived chapters (already-superseded) + the current
    // in-progress one appended at the end (never archived until IT gets
    // superseded), so the screen always shows the full autobiography.
    const chapters = [
      ...(await db.listChapters(req.userId)),
      { chapterNumber: fresh.chapterNumber, chapterTitle: fresh.chapterTitle, narrative: fresh.chapterNarrative, createdAt: null },
    ];

    res.json({
      profile: fresh.profile,
      stats: fresh.stats,
      statTrends,
      chapterNumber: fresh.chapterNumber,
      chapterTitle: fresh.chapterTitle,
      chapterNarrative: fresh.chapterNarrative,
      chapters,
      growthSessions: fresh.growthSessions,
      pathway: fresh.pathway,
      pathwayNoun: fresh.pathwayNoun,
      pathwayStatus: fresh.pathwayStatus,
      goals: fresh.goals,
      goalTargets: fresh.goalTargets,
      openQuests,
      observed: fresh.observed,
      kondisiStatus: fresh.kondisiStatus,
      kondisiNote: fresh.kondisiNote,
      history: await db.allHistory(req.userId, 8),
      pendingNutritionShortfalls: (await db.listPendingShortfalls(req.userId, "nutrition-log")).map((q) => ({
        id: q.id, title: q.quest.title, reasons: q.reflection.shortfallPrompt.reasons,
      })),
      // Meta Inner Realm redesign: real session counts backing the world-map
      // progress cards (public/app.js metaScreenHTML) - see
      // db.countSessionsSince/startOfWeekKey/startOfMonthKey above.
      metaSessionCounts: {
        // Round 41: LINGUA's Listening row now creates completionType
        // "listening-diagnostic" quests instead of "practice-test" - sum
        // both so the combined LINGUA session count (shown on both the
        // Reading and Listening rows) stays meaningful, not silently
        // degrading to a Reading-only count.
        lingua: (await db.countSessionsSince(req.userId, "practice-test", startOfMonthKey()))
          + (await db.countSessionsSince(req.userId, "listening-diagnostic", startOfMonthKey())),
        somaActivity: await db.countSessionsSince(req.userId, "structured-physical", startOfWeekKey()),
        somaNutrition: await db.countSessionsSince(req.userId, "nutrition-log", startOfWeekKey()),
        // Video Quest: LABORA now has two session-producing tools (Job
        // Match + Video Quest) - sum both, same reasoning as lingua above.
        labora: (await db.countSessionsSince(req.userId, "job-match-analysis", startOfMonthKey()))
          + (await db.countSessionsSince(req.userId, "video-quiz", startOfMonthKey())),
      },
      // META Inner Realm target-recommendation flow (12 Agustus follow-up):
      // "World Map shows Target, Realm page shows Tools" - each realm's card
      // is active/recommend/empty, see server/metaTargets.js.
      metaTargets: {
        soma: await metaTargets.cardForRealm(db, req.userId, fresh, "soma"),
        lingua: await metaTargets.cardForRealm(db, req.userId, fresh, "lingua"),
        labora: await metaTargets.cardForRealm(db, req.userId, fresh, "labora"),
      },
      aiActive: ai.hasKey(),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal memuat state." });
  }
});

// Create profile + first quest (single commit point at the end of adaptive onboarding)
app.post("/api/profile", requireAuth, async (req, res) => {
  try {
    const {
      name, radarSnapshot: rawRadar, radarRaw: rawRadarRaw, originStory,
      pathway: rawPathway, pathwayNoun: rawPathwayNoun, secondaryTrait,
      goals: rawGoals,
    } = req.body;
    if (!name) return res.status(400).json({ error: "Nama wajib diisi." });

    // v13: 1-3 free-text First Trial goals, captured right after Pathway
    // confirmation. Sanitized server-side: strings only, trimmed, empties
    // dropped, hard-capped at 3 entries / 200 chars each.
    const goals = (Array.isArray(rawGoals) ? rawGoals : [])
      .map((g) => String(g || "").trim().slice(0, 200))
      .filter(Boolean)
      .slice(0, 3);

    // radarSnapshot comes from the client-side radar chart, AFTER Adaptive
    // Scenario Card calibration (conservation-of-total redistribution
    // already applied there, 1-10 per axis) - clamp defensively, then derive
    // the 0-100 `stats` column from it (×10). radarSnapshot is what daily
    // quest generation and Pathway logic read; radarRaw is the pre-
    // calibration manual-drag result, kept only for audit/transparency.
    const radarSnapshot = {};
    Object.entries(rawRadar || {}).forEach(([k, v]) => {
      radarSnapshot[k] = Math.max(1, Math.min(10, Math.round(Number(v))));
    });
    const radarRaw = {};
    Object.entries(rawRadarRaw || {}).forEach(([k, v]) => {
      radarRaw[k] = Math.max(1, Math.min(10, Math.round(Number(v))));
    });
    const initialStats = {};
    Object.entries(radarSnapshot).forEach(([k, v]) => {
      initialStats[k] = Math.max(0, Math.min(100, v * 10));
    });

    const pathway = (rawPathway || "").trim() || null;
    const pathwayNoun = (rawPathwayNoun || "").trim() || pathway;

    // originStory replaces the old discrete situation/values/fear fields -
    // it's the Chapter Analysis insight (already generated from the adaptive
    // conversation), kept as the ongoing "who is this person" context for
    // daily quest generation. profile.insight would collide in meaning with
    // days.insight (the daily-rotating quest insight) - originStory avoids that.
    const profile = { name, originStory: originStory || null, createdAt: new Date().toISOString() };

    await db.createState(req.userId, {
      profile,
      stats: initialStats,
      // No prior history exists yet, so these are exactly what a
      // generateQuest call would have echoed back anyway ("Jika
      // ctx.recentDays kosong, chapterNumber mulai dari 1") - quest
      // generation itself (and with it the first real chapter title/
      // pathwayNoun refinement) now happens uniformly in GET /api/state,
      // the single place that ever creates a quest, one goal at a time.
      chapterNumber: 1,
      chapterTitle: "Mencari Arah",
      pathway,
      pathwayNoun,
      radarSnapshot,
      radarRaw: Object.keys(radarRaw).length ? radarRaw : null,
      secondaryTrait: secondaryTrait || null,
      goals,
    });
    await db.saveOnboardingDraft(req.userId, null);

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal membuat profil." });
  }
});

// Submit today's reflection
app.post("/api/reflection", requireAuth, async (req, res) => {
  try {
    const { status, text, structuredData, questId } = req.body;
    const state = await db.getState(req.userId);
    // questId identifies which of the user's (up to 3) simultaneously open
    // quests this reflects on - there's no single implicit "today's quest"
    // anymore, every goal's card is addressed explicitly. A quest never
    // expires on its own, so the only thing gating completion is whether
    // it's already been reflected on (checked below) - never how long it's
    // been open.
    const day = await db.getQuestById(req.userId, questId);
    if (!state || !day) return res.status(400).json({ error: "Quest tidak ditemukan." });
    if (day.reflection) return res.status(400).json({ error: "Quest ini sudah pernah direfleksikan.", alreadyReflected: true });

    const trimmedText = (text || "").trim();
    const inCrisis = safety.detectCrisis(trimmedText);

    // Task 7b + founder revision: physical quests complete via typed record
    // fields, not the free reflection box. Validation (required fields +
    // number plausibility) is deterministic code (server/structured.js) - a
    // completed record is growth-eligible WITHOUT the 12-word text gate,
    // because the narrative is explicitly optional there. WHICH form (kind)
    // is the user's pick sent in the payload - quests are often open-ended
    // about the activity, so the AI's structuredKind tag is only a fallback
    // for clients that don't send one. The tag still makes a record
    // REQUIRED for tagged quests; untagged quests may opt in by simply
    // sending structuredData (this is also how legacy physical quests from
    // before tagging get recorded properly). Skipped quests validate
    // nothing (there is nothing to certify, and no growth either way).
    const isStructuredQuest = day.quest?.completionType === "structured-physical";
    let structuredClean = null;
    if ((isStructuredQuest || structuredData) && (status === "COMPLETED" || status === "PARTIAL") && !inCrisis) {
      const kind = (structuredData && structuredData.kind) || day.quest?.structuredKind;
      const check = structured.validateStructuredData(kind, structuredData);
      if (!check.ok) return res.status(400).json({ error: check.error });
      structuredClean = check.clean;
    }
    // Task 7c: "selesai" vs "sebagian" for a structured-physical quest is
    // now a fact computed from evidence vs the quest's own
    // evidenceSchema.target - the client no longer self-reports it (the old
    // "Gimana progressnya?" picker is gone for this quest type). Every
    // other quest type keeps trusting the client's status as before.
    // BODY · MOVEMENT execution flow: "Akhiri & Simpan Progress" (Strength's
    // Active Session exit sheet) marks the in-progress attempt endedEarly
    // BEFORE submit - that user choice, not the evidence ratio, is what
    // makes this ADAPTED rather than COMPLETED/PARTIAL (spec: partial
    // evidence from an intentionally-shortened session still feeds the
    // analysis and adapts the next quest, distinct from simply falling
    // short of a full-length target).
    const effectiveStatus = isStructuredQuest && structuredClean
      ? (day.quest?.activeAttempt?.endedEarly ? "ADAPTED" : computeEvidenceStatus(day.quest, structuredClean))
      : status;

    let deltas = {};
    let mentorReply;
    let interpretation = null;
    let safetyNote = null;
    let chapterAdvance = false;
    let newChapterTitle = null;
    let newChapterNarrative = null;
    // Shared with the "Target Berikutnya" baseline below - one query, not two.
    const recentGoalDays = structuredClean ? await db.recentDays(req.userId, { goalIndex: day.goalIndex, excludeId: day.id, limit: 7 }) : undefined;

    if (inCrisis) {
      // Defense in depth: skip the AI mentor entirely and reply with a fixed
      // message. Independent of the crisis instruction in MENTOR_SYSTEM
      // (server/claude.js) — that stays in place too, this doesn't replace it.
      mentorReply = safety.CRISIS_RESOURCE_MESSAGE;
    } else {
      const eligible = structuredClean
        ? true // completeness+plausibility already code-verified above
        : (effectiveStatus === "COMPLETED" || effectiveStatus === "PARTIAL") && wordCount(text) >= 12;
      const ctx = {
        // originStory is v3; situation is the pre-v3 fallback for accounts
        // that onboarded before this field existed.
        profile: { name: state.profile.name, originStory: state.profile.originStory || state.profile.situation },
        quest: day.quest,
        status: effectiveStatus,
        reflectionText: trimmedText,
        structuredData: structuredClean || undefined,
        // Recent days give the AI the progressive baseline ("last time 15
        // reps") for its mentorReply on structured quests - scoped to this
        // SAME goal, so a different goal's numbers never bleed into it.
        recentDays: recentGoalDays,
        stats: state.stats,
        growthSessions: state.growthSessions,
      };
      const result = await ai.processReflection(ctx);
      deltas = eligible ? (result.statDeltas || {}) : {};
      mentorReply = eligible
        ? result.mentorReply
        : "Coba ceritain lebih banyak apa yang sebenarnya terjadi — segelintir kata belum cukup buat pertumbuhan kelihatan nyata (dan itu memang sengaja begitu).";
      // Task 7c "Eleva Response": shown even when growth was withheld (the
      // gate message above already explains why) - interpretation is a
      // read of the submitted numbers/text, not a growth verdict.
      interpretation = result.interpretation || null;
      // Task 7d item 4: a gentle caution note when the AI detected a
      // significant pain/injury signal - independent of eligible/growth,
      // shown even when growth was withheld (safety, not a reward).
      safetyNote = result.safetyNote || null;
      chapterAdvance = result.chapterAdvance;
      newChapterTitle = result.newChapterTitle;
      newChapterNarrative = result.newChapterNarrative;
    }

    const shortfallPrompt = computeShortfallPrompt(day.quest, structuredClean);

    const newStats = { ...state.stats };
    Object.entries(deltas).forEach(([k, v]) => {
      if (newStats[k] !== undefined && typeof v === "number") {
        newStats[k] = Math.max(0, Math.min(100, newStats[k] + Math.max(0, Math.min(5, Math.round(v)))));
      }
    });
    const newGrowthSessions = state.growthSessions + (Object.keys(deltas).length > 0 ? 1 : 0);
    const allowAdvance = chapterAdvance && newGrowthSessions > 0 && newGrowthSessions % 5 === 0 && Boolean(newChapterTitle && newChapterNarrative);

    const reflection = {
      status: effectiveStatus,
      text: trimmedText,
      // Stored inside the existing reflection jsonb - the PRD's "smallest
      // schema change" option (no new column). recentDays returns the full
      // reflection object, so this automatically reaches future quest
      // generation as the progressive baseline.
      ...(structuredClean ? { structuredData: structuredClean } : {}),
      deltas,
      mentorReply,
      interpretation,
      safetyNote,
      timestamp: new Date().toISOString(),
    };
    await db.saveReflection(req.userId, day.id, reflection);
    // BODY · MOVEMENT execution flow: Evidence's "Kirim Bukti" submits
    // through this SAME route (cardio's structured-physical validation
    // already IS what Movement's Review/Evidence screens need - effort-
    // gated required notes and all, see structured.js's cardio kind) - the
    // one genuinely new thing on completion is clearing the now-finished
    // in-progress attempt so a completed quest never carries stale attempt
    // data forward.
    if (day.quest?.primaryFeature === "MOVEMENT" && day.quest?.activeAttempt) {
      await db.updateQuestProgress(req.userId, day.id, { activeAttempt: null });
    }
    // SOMA Training feedback brief item 4: if this quest is a chain step,
    // generate the next one immediately. Gated on !inCrisis deliberately -
    // a crisis-detected reflection short-circuits normal processing already;
    // pushing straight into "here's your next quest" right after would be
    // wrong. The chain simply stalls at that step (safe default, same as
    // every other edge case here - never strands the account, just never
    // advances further without the user re-engaging normally).
    if (day.quest?.chain && !inCrisis) {
      await advanceChain(req.userId, state, day, structuredClean);
    }
    await archiveChapterIfAdvancing(req.userId, state, allowAdvance);
    // Task 11e (Decay): record which stats just grew for real, so the decay
    // clock resets for exactly those - and only those - stats.
    await db.touchStatActivity(req.userId, Object.keys(deltas));
    await db.updateState(req.userId, {
      stats: newStats,
      chapterNumber: allowAdvance ? state.chapterNumber + 1 : state.chapterNumber,
      chapterTitle: allowAdvance ? newChapterTitle : state.chapterTitle,
      chapterNarrative: allowAdvance ? newChapterNarrative : undefined,
      growthSessions: newGrowthSessions,
      pathwayNoun: state.pathwayNoun,
    });

    // Fokus 2.2/2.3: "Target Berikutnya" - only for structured-physical
    // completions tied to an actual goal (targets are a per-goal concept,
    // legacy ungoaled quests don't get one), and only when there's actually
    // a comparable number to target (targets.canTarget - e.g. a distance
    // activity with no jarakKm has no pace to aim for). Shown either as a
    // fresh A/B/C pick (no target yet, or the existing one was just reached/
    // exceeded) or as a quiet progress line toward the target already in
    // flight - never both, and never on every single quest once a target is
    // active (that's the exact ambiguity the founder's spec calls out).
    let targetScreen = null;
    if (structuredClean && day.goalIndex != null && !inCrisis && targets.canTarget(structuredClean.kind, structuredClean)) {
      const kind = structuredClean.kind;
      const existing = state.goalTargets?.[String(day.goalIndex)] || null;
      const reached = existing ? targets.targetReached(kind, existing.metrics, structuredClean) : false;
      if (!existing || reached) {
        const options = await ai.generateTargetOptions({
          kind, goalText: state.goals[day.goalIndex], actual: structuredClean,
          recentDays: recentGoalDays, pathway: state.pathway,
        });
        targetScreen = { mode: "options", reached: Boolean(existing && reached), kind, options };
      } else {
        targetScreen = { mode: "progress", kind, currentTarget: existing };
      }
    }

    // Client holds this in a "completedResult" acknowledgment card before
    // swapping to the next quest - under the per-goal model a completed
    // goal is instantly eligible for a new quest, so without this the
    // mentor's reply/deltas would flash away before the user could read them.
    res.json({ ok: true, status: effectiveStatus, mentorReply, interpretation, safetyNote, deltas, structuredData: structuredClean || undefined, targetScreen, shortfallPrompt, questId: day.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal menyimpan refleksi." });
  }
});

// Fokus 2.2/2.3: persist the user's pick from the "Target Berikutnya"
// screen (option A/B as generated, or "manual" as free-entered numbers -
// same validation either way, source is just a label for where it came
// from). Overwrites whatever target the goal had before, if any - by the
// time this is callable the client only shows the screen when the old
// target (if any) was already reached/exceeded, see POST /api/reflection.
app.post("/api/goal-target", requireAuth, async (req, res) => {
  try {
    const { goalIndex, source, label, approach, kind } = req.body;
    const state = await db.getState(req.userId);
    const gi = Number(goalIndex);
    if (!state || !Number.isInteger(gi) || gi < 0 || gi >= (state.goals || []).length) {
      return res.status(400).json({ error: "Goal tidak ditemukan." });
    }
    const metrics = targets.cleanTargetMetrics(kind, req.body.metrics);
    if (!metrics) return res.status(400).json({ error: "Angka target tidak valid — cek lagi." });
    const target = {
      kind, label: String(label || targets.formatTargetLabel(kind, metrics)).slice(0, 80),
      approach: String(approach || "").slice(0, 300),
      metrics, source: ["A", "B", "manual"].includes(source) ? source : "manual",
      createdAt: new Date().toISOString(),
    };
    await db.setGoalTarget(req.userId, gi, target);
    res.json({ ok: true, target });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal menyimpan target." });
  }
});

// SOMA Training feedback brief (20 Agustus) item 4: condition-triggered
// Recovery->Nutrition->Training(adapted) chain, fired when Context Update
// transitions INTO "Sakit/cedera" specifically. Fully code-authored quest
// builders for steps 1-2 (no AI judgment needed - same posture as
// POST /api/meta/start's body/recovery and nutrition branches above, which
// these deliberately mirror), step 3 goes through ai.generateQuest (needs
// real judgment - exercise selection) with forced context so it can't
// independently reinterpret the situation. Chain badge (quest.chain) is
// stamped by code on every step regardless of what the AI returns.
function buildRecoveryChainQuest(chainId) {
  return {
    completionType: "structured-physical",
    structuredKind: "recovery",
    evidenceSchema: null,
    statFocus: "body",
    title: "Fokus Pemulihan Hari Ini",
    description: "Kondisimu lagi sakit/cedera — hari ini fokus pemulihan: tidur, hidrasi, protein, dan level nyeri, bukan aktivitas aktif.",
    why: "Chain Recovery memastikan langkah berikutnya (Nutrisi, lalu Training yang disesuaikan) dibangun dari kondisi pemulihanmu yang sebenarnya.",
    chain: { id: chainId, step: 1, total: 3, label: "Recovery" },
  };
}
function buildNutritionChainQuest(chainId) {
  return {
    completionType: "nutrition-log",
    lifecycleType: "progressive",
    statFocus: "body",
    title: "Catat Nutrisi Pemulihan",
    description: "Lanjutan chain Recovery — catat makanmu hari ini biar asupan protein/kalori mendukung pemulihan.",
    why: "Nutrisi yang tercukupi adalah bagian dari pemulihan, bukan aktivitas terpisah.",
    progressive: nutrition.initProgressiveState({ requiredContributions: 3, primaryMetric: "protein", targetValue: 60 }),
    chain: { id: chainId, step: 2, total: 3, label: "Nutrition" },
  };
}
function buildTrainingChainCtx(state, chain) {
  return {
    profile: state.profile,
    pathway: state.pathway,
    pathwayNoun: state.pathwayNoun,
    goals: state.goals?.length ? state.goals : undefined,
    stats: state.stats,
    chapterNumber: state.chapterNumber,
    chapterTitle: state.chapterTitle,
    recentDays: [],
    // Chain continuity: forces the SAME de-intensify prompt clause
    // generateQuest already has for a live kondisiStatus (see the "Kondisi
    // terbaru pengguna" ternary) - the chain only exists because of this
    // exact transition, so it's always safe/correct to force it here rather
    // than re-reading the (possibly since-changed) live value.
    kondisiStatus: "Sakit/cedera",
    kondisiNote: chain.kondisiNoteSnapshot || undefined,
    chainTrainingContext: {
      levelNyeri: chain.levelNyeri,
      instruction: "Ini LANGKAH 3 dari chain Recovery -> Nutrition -> Training. Quest HARUS structured-physical (cardio/gym) yang KONKRET beradaptasi ke levelNyeri: fokus upper-body + kerja lower-body ringan kalau levelNyeri Sedang/Berat, boleh lebih standar (tapi tetap moderat, jangan intensitas normal) kalau Ringan/Tidak ada. JANGAN buat quest generik yang tidak menyebut adaptasi ini.",
    },
  };
}

// One active chain per user; the reflection-driven step-2/step-3 handoff
// lives in advanceChain (called from POST /api/reflection, right after
// db.saveReflection). Guarded by chain.id/chain.step matching the JUST-
// SUBMITTED quest's own chain metadata - protects against a stale/
// duplicate/multi-device double-submit ever generating the same step twice.
async function advanceChain(userId, state, day, structuredClean) {
  const chain = state.activeChain;
  if (!chain || !day.quest.chain || chain.id !== day.quest.chain.id || chain.step !== day.quest.chain.step) return;

  if (chain.step === 1) {
    const levelNyeri = structuredClean?.levelNyeri || null;
    const nextQuest = buildNutritionChainQuest(chain.id);
    const created = await db.createQuest(userId, null, todayKey(), { quest: nextQuest, insight: null }, false, false, true);
    await db.setActiveChain(userId, { ...chain, step: 2, levelNyeri, stepQuestIds: [...chain.stepQuestIds, created.id] });
  } else if (chain.step === 2) {
    const ctx = buildTrainingChainCtx(state, chain);
    const result = await ai.generateQuest(ctx);
    result.quest.chain = { id: chain.id, step: 3, total: 3, label: "Training" };
    const created = await db.createQuest(userId, null, todayKey(), { quest: result.quest, insight: result.insight }, false, false, true);
    await db.setActiveChain(userId, { ...chain, step: 3, stepQuestIds: [...chain.stepQuestIds, created.id] });
  } else if (chain.step === 3) {
    await db.clearActiveChain(userId);
  }
}

// Homepage redesign: "Kondisi Hari Ini" - light, not a quest, not mandatory.
// Single current value, reset lazily back to Normal by GET /api/state once a
// new calendar day starts (see the lazy-reset check there).
app.post("/api/kondisi", requireAuth, async (req, res) => {
  try {
    const { status, note } = req.body;
    if (status !== "Normal" && !KONDISI_LABELS.includes(status)) {
      return res.status(400).json({ error: "Status kondisi tidak dikenal." });
    }
    // Task 11f: note is always optional, capped to a sane length - this is
    // the same entry point Task 7c's "Aku nggak bisa quest ini" button uses
    // (a context signal, never evidence/growth), so it also carries
    // whatever short reason text the user typed there.
    const trimmedNote = typeof note === "string" ? note.trim().slice(0, 300) : null;

    // SOMA Training feedback brief item 4: db.updateKondisi is a blind write
    // with no prior read, so the OLD status has to be read here first to
    // detect an actual transition INTO "Sakit/cedera" (not just "being" in
    // it, and not any of the other 5 labels).
    const priorState = await db.getState(req.userId);
    const isTransitionIntoSakit = status === "Sakit/cedera" && priorState?.kondisiStatus !== "Sakit/cedera";
    const chainAlreadyActive = Boolean(priorState?.activeChain);

    await db.updateKondisi(req.userId, status, trimmedNote || null);

    let chainStarted = false;
    if (isTransitionIntoSakit && !chainAlreadyActive) {
      const chainId = `chain_${crypto.randomUUID()}`;
      const quest = buildRecoveryChainQuest(chainId);
      const created = await db.createQuest(req.userId, null, todayKey(), { quest, insight: null }, false, false, true);
      await db.setActiveChain(req.userId, {
        id: chainId, type: "sakit-cedera-recovery", step: 1, total: 3,
        startedAt: new Date().toISOString(), levelNyeri: null,
        kondisiNoteSnapshot: trimmedNote || null, stepQuestIds: [created.id],
      });
      chainStarted = true;
    } else if (status !== "Sakit/cedera" && chainAlreadyActive) {
      // Safe default: re-labeling Context Update to anything else mid-chain
      // cancels it outright rather than letting it keep running against a
      // status that no longer matches its own premise. The in-flight step
      // quest is left open/untouched (never force-closed) - it simply stops
      // advancing (advanceChain's stale-chain-id guard already protects
      // against it generating a next step even if reflected on later).
      await db.clearActiveChain(req.userId);
    }

    res.json({ ok: true, kondisiStatus: status, kondisiNote: trimmedNote || null, chainStarted });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal menyimpan kondisi." });
  }
});

// Task 7d item 6: attaches a shortfall reason to a quest that was JUST
// completed with evidence far below its Milestone target - a context
// signal (never evidence, never re-scores growth), read back by the next
// day's generateQuest call for that goal. Scoped to quests belonging to the
// caller that already have a reflection (db.setShortfallReason no-ops
// otherwise), so this can never be used to attach a reason to someone
// else's quest or to an unstarted one.
app.post("/api/quest/shortfall-reason", requireAuth, async (req, res) => {
  try {
    const { questId, reason } = req.body;
    if (!SHORTFALL_REASONS.includes(reason)) {
      return res.status(400).json({ error: "Alasan tidak dikenal." });
    }
    const day = await db.getQuestById(req.userId, questId);
    if (!day || !day.reflection) return res.status(400).json({ error: "Quest tidak ditemukan atau belum diselesaikan." });
    await db.setShortfallReason(req.userId, questId, reason);
    res.json({ ok: true, reason });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal menyimpan alasan." });
  }
});

// BODY · MOVEMENT execution flow (design handoff): in-progress-attempt
// persistence so a refresh, brief navigation away, or reopening the quest
// never silently loses Pre-Start/Active Session/Review progress. Reuses
// db.updateQuestProgress exactly as nutrition-log's `quest.progressive`
// field already does (see resolveNutritionQuest/POST /api/nutrition/log
// above) - the attempt lives inside the existing `quest` jsonb column as
// `activeAttempt`, so GET /api/state's normal openQuests payload already
// round-trips it back to the client on refresh, no new read endpoint
// needed. Scoped to primaryFeature==="MOVEMENT" quests only - every other
// completionType is untouched by these three routes.
function movementAttemptGuard(day) {
  if (!day) return { error: "Quest tidak ditemukan.", code: 404 };
  if (day.reflection) return { error: "Quest ini sudah selesai.", code: 400 };
  if (day.quest?.primaryFeature !== "MOVEMENT") return { error: "Quest ini bukan Body Movement.", code: 400 };
  return null;
}

// Idempotent by design: a double-tap on "Mulai"/"Mulai Latihan" or a
// refresh-triggered re-POST both just return the SAME existing attempt
// unchanged rather than creating a second one or erroring - the client
// can always safely call this on Pre-Start's primary CTA without first
// checking whether an attempt already exists.
app.post("/api/quest/:id/attempt/start", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const day = await db.getQuestById(req.userId, id);
    const guard = movementAttemptGuard(day);
    if (guard) return res.status(guard.code).json({ error: guard.error });
    if (day.quest.activeAttempt) {
      return res.json({ ok: true, activeAttempt: day.quest.activeAttempt });
    }
    const executionMode = day.quest.executionMode;
    // Kondisi (cardio's optional "Kondisi sekarang?" chips) is picked on
    // Pre-Start, before an attempt exists to hold it - the client sends
    // whatever was picked (or null) along with this call so it lands
    // straight in the new attempt's draftReview instead of being lost.
    const kondisi = ["Segar", "Cukup", "Capek", "Nyeri"].includes(req.body?.kondisi) ? req.body.kondisi : null;
    const activeAttempt = {
      attemptId: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      executionMode,
      // Cardio has no dedicated Active Session screen (design handoff, honest-
      // evidence-only posture) - Pre-Start's "Mulai" goes straight to Review.
      // Strength's real execution engine gets "active" instead.
      currentScreen: executionMode === "STRENGTH" ? "active" : "review",
      draftReview: { durationMin: "", durationSec: "", distanceKm: "", effort: null, notes: "", kondisi },
      strengthExercises: executionMode === "STRENGTH"
        ? (day.quest.plannedExercises || []).map((e) => ({
            ...e, sets: Array.from({ length: e.targetSets }, () => ({ reps: "", weightKg: "", done: false })), rpe: null,
          }))
        : null,
      evidenceChoice: null,
    };
    const quest = await db.updateQuestProgress(req.userId, id, { activeAttempt });
    res.json({ ok: true, activeAttempt: quest.activeAttempt });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal memulai sesi." });
  }
});

// Debounced incremental save (client-side ~500ms debounce + an immediate
// flush at screen-transition boundaries, same posture as the onboarding
// draft's saveOnboardingDraft/saveOnboardingDraftNow) - shallow-merges the
// patch onto the EXISTING activeAttempt only, never the whole quest, and
// strips attemptId/startedAt/executionMode from the incoming patch so a
// save call can never rewrite the attempt's own identity/mode mid-flight.
app.post("/api/quest/:id/attempt/save", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const day = await db.getQuestById(req.userId, id);
    const guard = movementAttemptGuard(day);
    if (guard) return res.status(guard.code).json({ error: guard.error });
    if (!day.quest.activeAttempt) return res.status(400).json({ error: "Belum ada sesi aktif untuk quest ini." });
    const patch = req.body?.patch;
    if (!patch || typeof patch !== "object") return res.status(400).json({ error: "Data patch tidak valid." });
    const { attemptId, startedAt, executionMode, ...safePatch } = patch;
    const activeAttempt = { ...day.quest.activeAttempt, ...safePatch };
    const quest = await db.updateQuestProgress(req.userId, id, { activeAttempt });
    res.json({ ok: true, activeAttempt: quest.activeAttempt });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal menyimpan progres." });
  }
});

// "Batalkan Quest" (Active Session's exit sheet, or Finish & Review) -
// discards the attempt entirely, no reflection written, quest returns to
// not-started and stays retryable. Distinct from "Akhiri & Simpan Progress"
// (client just navigates the SAME attempt to the review screen with
// whatever's logged so far - no server call needed for that, the attempt
// keeps living until Evidence's final submit clears it).
app.post("/api/quest/:id/attempt/abandon", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const day = await db.getQuestById(req.userId, id);
    const guard = movementAttemptGuard(day);
    if (guard) return res.status(guard.code).json({ error: guard.error });
    await db.updateQuestProgress(req.userId, id, { activeAttempt: null });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal membatalkan sesi." });
  }
});

// Task 9 (Practice Test): a third completionType, generic to any measurable
// learning goal - IELTS is the founder's example, not a hardcoded special
// case (PRD bagian 13). Split into its own generate/submit pair instead of
// folding into POST /api/reflection: the flow (pick Reading/Listening ->
// pick Academic/General -> generate -> answer -> grade) is different enough
// from the free-text/structured-physical flows that reusing that route's
// branching would cost more clarity than it saves. Both routes still reuse
// the same underlying db.js primitives (getQuestById, saveReflection,
// updateState) as /api/reflection, so quest-completion mechanics (growth,
// chapter advance, Riwayat) stay identical either way.
app.post("/api/practice-test/generate", requireAuth, async (req, res) => {
  try {
    const { questId, kind, track } = req.body;
    if (!["reading", "listening"].includes(kind)) return res.status(400).json({ error: "Pilih Reading atau Listening dulu." });
    if (!["academic", "general"].includes(track)) return res.status(400).json({ error: "Pilih Academic atau General Training dulu." });
    const state = await db.getState(req.userId);
    const day = await db.getQuestById(req.userId, questId);
    if (!state || !day) return res.status(400).json({ error: "Quest tidak ditemukan." });
    if (day.quest?.completionType !== "practice-test") return res.status(400).json({ error: "Quest ini bukan tipe Practice Test." });
    if (day.reflection) return res.status(400).json({ error: "Quest ini sudah pernah diselesaikan." });

    // Task 13: per-track state, migrated lazily from the old flat
    // {level,history} shape (persisted back only on submit - this route is
    // read-only toward practice_test). If the previous attempt on THIS track
    // flagged a weak category, this session becomes a focused 12-question
    // DRILL on it instead of a full 20-question sprint - evidence still
    // accumulates, but the sprint counter/level ratchet don't move (see the
    // submit route).
    const { tracks } = practiceTestLib.migrateState(day.goalIndex != null ? state.practiceTest?.[String(day.goalIndex)] : null);
    const trackState = tracks[kind];
    const nextDrill = trackState.nextDrill || null;

    let payload;
    if (kind === "reading" && !nextDrill) {
      // Reading Half Diagnostic (round 42): the 20-question reading sprint
      // is weekly-GLOBAL content (founder decision) - one generated
      // passage+question set per Monday-start week per track, shared by all
      // users, cached in weekly_reading_tests. Drills stay per-attempt.
      const weekKey = startOfWeekKey();
      let content = await db.getWeeklyReadingTest(weekKey, track);
      if (!content) {
        try {
          const avoidTitles = await db.recentWeeklyReadingTitles(track);
          const fresh = await ai.generateReadingSprintContent({ track, avoidTitles });
          // First insert wins under concurrency - everyone gets the winner.
          content = await db.insertWeeklyReadingTestIfAbsent(weekKey, track, fresh);
        } catch (e) {
          // Generation failed (or keyless): serve the static fallback for
          // THIS attempt only, never cache it as the week's content - a
          // transient API blip must not pin all users to the same static
          // passage for 7 days, and the fallback's fixed answer key would
          // corrupt band evidence if it repeated week after week.
          console.error("weekly reading sprint generation failed, serving uncached fallback:", e.message);
          content = null;
        }
      }
      const body = content || ai.fallbackPracticeTest({ kind, track, drill: null });
      payload = { kind, track, entryType: "sprint", schemaVersion: 2, weekKey, ...body };
    } else {
      const result = await ai.generatePracticeTest({
        kind, track, level: trackState.level || 1,
        history: (trackState.history || []).slice(-5),
        goalText: day.goalIndex != null ? state.goals?.[day.goalIndex] : undefined,
        pathway: state.pathway,
        drill: nextDrill ? { category: nextDrill.category } : null,
      });
      payload = { kind, track, entryType: nextDrill ? "drill" : "sprint", ...(nextDrill ? { focusCategory: nextDrill.category } : {}), ...result };
    }
    // The answer key lives in days.practice_test_payload, NOT in the `quest`
    // jsonb - see the column comment in db.js's init() for why (that column
    // ships to the client verbatim on every GET /api/state, this one never
    // does).
    await db.setPracticeTestPayload(req.userId, day.id, payload);
    res.json(practiceTestLib.stripAnswers(payload));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal membuat soal." });
  }
});

app.post("/api/practice-test/submit", requireAuth, async (req, res) => {
  try {
    const { questId, answers } = req.body;
    const state = await db.getState(req.userId);
    const day = await db.getQuestById(req.userId, questId);
    if (!state || !day) return res.status(400).json({ error: "Quest tidak ditemukan." });
    if (day.quest?.completionType !== "practice-test") return res.status(400).json({ error: "Quest ini bukan tipe Practice Test." });
    if (day.reflection) return res.status(400).json({ error: "Quest ini sudah pernah diselesaikan." });
    const payload = await db.getPracticeTestPayload(req.userId, day.id);
    if (!payload) return res.status(400).json({ error: "Belum ada soal — generate dulu sebelum submit." });

    const graded = practiceTestLib.gradeAnswers(payload.questions, answers || {});

    // Task 13 (Objective Assessment Engine): everything below is
    // deterministic - band, confidence, ladder, milestone, next-drill - the
    // AI is only ever asked for the mentorReply further down. Track totals
    // run separately from the display-capped history so band/confidence
    // never lose evidence past 20 sessions.
    const entryType = payload.entryType || "sprint";
    const trackKey = payload.kind === "listening" ? "listening" : "reading";
    const goalText = day.goalIndex != null ? state.goals?.[day.goalIndex] : undefined;
    const targetBand = practiceTestLib.parseTargetBand(goalText);
    const migrated = practiceTestLib.migrateState(day.goalIndex != null ? state.practiceTest?.[String(day.goalIndex)] : null);
    const trackState = migrated.tracks[trackKey];
    const statusBefore = practiceTestLib.trackStatus(trackState, targetBand);
    trackState.history = [...(trackState.history || []), {
      ts: new Date().toISOString(), testKind: payload.kind, track: payload.track,
      score: graded.correct, total: graded.total, entryType, categories: graded.categories,
    }].slice(-20);
    trackState.totalQuestions += graded.total;
    trackState.totalCorrect += graded.correct;
    // Progressive difficulty stays sprint-only: a focused drill is remedial
    // work on one category, not evidence the whole track got easier.
    if (entryType === "sprint") trackState.level = (trackState.level || 1) + 1;
    const statusAfter = practiceTestLib.trackStatus(trackState, targetBand);
    const milestoneAchieved = (statusAfter === "STABLE" || statusAfter === "MASTERED")
      && statusBefore !== "STABLE" && statusBefore !== "MASTERED";
    // Next Trial recommendation: weakest category of THIS attempt becomes
    // the track's pending drill; a clean attempt clears it (next session is
    // a fresh sprint).
    const weakest = practiceTestLib.weakestCategory(graded.categories);
    if (weakest) trackState.nextDrill = { category: weakest, questionCount: practiceTestLib.DRILL_QUESTIONS };
    else delete trackState.nextDrill;

    const recentGoalDays = day.goalIndex != null ? await db.recentDays(req.userId, { goalIndex: day.goalIndex, excludeId: day.id, limit: 7 }) : undefined;
    const ctx = {
      profile: { name: state.profile.name, originStory: state.profile.originStory || state.profile.situation },
      quest: day.quest,
      status: "COMPLETED",
      // Distinct from structuredData - see processReflection's evaluationRules
      // branch in claude.js. Objective evidence, no growth-gate needed.
      practiceTestResult: { kind: payload.kind, track: payload.track, score: graded.correct, total: graded.total, entryType },
      recentDays: recentGoalDays,
      stats: state.stats,
      growthSessions: state.growthSessions,
    };
    const result = await ai.processReflection(ctx);
    const deltas = result.statDeltas || {}; // always eligible - no 12-word/specificity gate for objective test evidence

    const newStats = { ...state.stats };
    Object.entries(deltas).forEach(([k, v]) => {
      if (newStats[k] !== undefined && typeof v === "number") {
        newStats[k] = Math.max(0, Math.min(100, newStats[k] + Math.max(0, Math.min(5, Math.round(v)))));
      }
    });
    const newGrowthSessions = state.growthSessions + (Object.keys(deltas).length > 0 ? 1 : 0);
    const allowAdvance = result.chapterAdvance && newGrowthSessions > 0 && newGrowthSessions % 5 === 0 && Boolean(result.newChapterTitle && result.newChapterNarrative);

    const reflection = {
      status: "COMPLETED", text: "",
      practiceTestResult: { kind: payload.kind, track: payload.track, score: graded.correct, total: graded.total, entryType },
      deltas, mentorReply: result.mentorReply, timestamp: new Date().toISOString(),
    };
    await db.saveReflection(req.userId, day.id, reflection);
    await archiveChapterIfAdvancing(req.userId, state, allowAdvance);
    await db.touchStatActivity(req.userId, Object.keys(deltas));
    await db.updateState(req.userId, {
      stats: newStats,
      chapterNumber: allowAdvance ? state.chapterNumber + 1 : state.chapterNumber,
      chapterTitle: allowAdvance ? result.newChapterTitle : state.chapterTitle,
      chapterNarrative: allowAdvance ? result.newChapterNarrative : undefined,
      growthSessions: newGrowthSessions,
      pathwayNoun: state.pathwayNoun,
    });

    // Task 13: persist the migrated per-track state (this write is also
    // what upgrades a legacy flat {level,history} row to the tracks shape
    // for good). META/legacy sessions (goalIndex null) have no per-goal row
    // to accumulate into - their assessment below still reflects this
    // session's own numbers, honestly at Low confidence.
    if (day.goalIndex != null) {
      await db.setPracticeTestState(req.userId, day.goalIndex, migrated);
    }

    // Task 13 result-card contract - all deterministic, computed AFTER the
    // update so band/confidence include this attempt. currentTargetFor also
    // re-picks the bottleneck track here, which is exactly the "Milestone
    // achieved → target shifts to the next weakest track" trigger (the next
    // GET /api/state reads the same function for quest generation).
    const band = practiceTestLib.estimateBand(trackState.totalCorrect, trackState.totalQuestions);
    const split = practiceTestLib.categorySplit(graded.categories);
    const currentTarget = day.goalIndex != null ? practiceTestLib.currentTargetFor(migrated, goalText) : null;
    const sprintNumber = trackState.history.filter((h) => (h.entryType || "sprint") === "sprint").length;
    const assessment = {
      trackKey, entryType, sprintNumber,
      band, confidence: practiceTestLib.confidenceLabel(trackState.totalQuestions),
      totalQuestions: trackState.totalQuestions,
      targetBand, status: statusAfter, milestoneAchieved,
      categories: { breakdown: graded.categories, strong: split.strong, unstable: split.unstable },
      decision: {
        primaryQuest: goalText || null,
        currentTarget: currentTarget ? currentTarget.label : null,
        nextTrial: weakest ? `${weakest} · Precision Drill · ${practiceTestLib.DRILL_QUESTIONS} soal` : null,
      },
    };

    res.json({ ok: true, score: graded.correct, total: graded.total, wrong: graded.wrong, mentorReply: result.mentorReply, interpretation: result.interpretation || null, deltas, assessment });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal menyimpan hasil tes." });
  }
});

// --- Video Quest (video-quiz) routes. Flow doc: docs/video-quiz-flow.md ---
// Step 1 of the flow: "Periksa Materi". Fetches the pasted video's
// transcript server-side, asks the AI whether it substantively teaches the
// quest's fixed topic, and stores the result as the CANDIDATE video. The
// user can re-run this with different URLs freely - swapping only becomes
// impossible once /start promotes a candidate to the locked video.
app.post("/api/video-quiz/validate", requireAuth, async (req, res) => {
  try {
    const { questId, videoUrl } = req.body;
    const state = await db.getState(req.userId);
    const day = await db.getQuestById(req.userId, questId);
    if (!state || !day) return res.status(400).json({ error: "Quest tidak ditemukan." });
    if (day.quest?.completionType !== "video-quiz") return res.status(400).json({ error: "Quest ini bukan tipe Video Quest." });
    if (day.reflection) return res.status(400).json({ error: "Quest ini sudah pernah diselesaikan." });
    if (day.quest?.videoQuizState?.lockedVideoUrl) {
      return res.status(400).json({ error: "Materi untuk quest ini sudah dikunci — selesaikan assessment dari video itu dulu." });
    }
    if (!youtube.parseVideoId(videoUrl)) {
      return res.status(400).json({ error: "Link YouTube tidak valid. Tempel link video YouTube (youtube.com atau youtu.be)." });
    }
    let video;
    try {
      video = await youtube.fetchVideoData(videoUrl);
    } catch (e) {
      if (e.code === "NO_CAPTIONS") {
        return res.status(422).json({ error: "Video ini nggak punya subtitle/transkrip yang bisa dibaca. Pilih video lain yang menyediakan subtitle (kebanyakan video edukasi punya)." });
      }
      console.error("video-quiz fetchVideoData failed:", e.message);
      return res.status(502).json({ error: "Gagal mengambil data video. Coba lagi." });
    }
    const topic = day.quest.videoQuiz?.topic || day.quest.title;
    const { relevant, rationale } = await ai.judgeVideoRelevance({
      topic, videoTitle: video.videoMeta.title, transcriptExcerpt: video.transcript.slice(0, 6000),
    });
    // Full replace: a re-check overwrites any previous candidate. There is
    // no lock yet (guarded above), so nothing here is worth preserving.
    await db.setVideoQuizPayload(req.userId, day.id, {
      candidate: {
        videoId: video.videoId, videoUrl: String(videoUrl).trim(), videoMeta: video.videoMeta,
        transcript: video.transcript, relevant, rationale, checkedAt: new Date().toISOString(),
      },
    });
    res.json({ relevant, rationale, videoMeta: { ...video.videoMeta, videoId: video.videoId } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal memeriksa materi. Coba lagi." });
  }
});

// Step 2: "Mulai Assessment". Three cases, in order:
// - RESUME: a locked video with a generated set already exists (page
//   reload / re-entry) - idempotent, returns the same stripped set without
//   regenerating or re-validating anything.
// - RETRY ({retry:true}, the fail screen's "Ulang Assessment"): fresh
//   question set from the SAME locked transcript, attempt counter +1.
// - FIRST START: promotes the validated candidate to the locked video.
//   Questions are generated BEFORE the lock is persisted, so a generation
//   failure leaves the video still swappable.
// The lock itself lives in quest.videoQuizState (client-visible via
// GET /api/state); transcript + answer key stay in video_quiz_payload.
app.post("/api/video-quiz/start", requireAuth, async (req, res) => {
  try {
    const { questId, retry } = req.body;
    const state = await db.getState(req.userId);
    const day = await db.getQuestById(req.userId, questId);
    if (!state || !day) return res.status(400).json({ error: "Quest tidak ditemukan." });
    if (day.quest?.completionType !== "video-quiz") return res.status(400).json({ error: "Quest ini bukan tipe Video Quest." });
    if (day.reflection) return res.status(400).json({ error: "Quest ini sudah pernah diselesaikan." });
    const topic = day.quest.videoQuiz?.topic || day.quest.title;
    const passThreshold = day.quest.videoQuiz?.passThreshold ?? videoQuizLib.DEFAULT_PASS_THRESHOLD;
    const payload = await db.getVideoQuizPayload(req.userId, day.id);

    const respond = (p) => res.json({
      locked: { videoUrl: p.locked.videoUrl, videoMeta: p.locked.videoMeta, videoId: p.locked.videoId },
      attempt: p.attempt, passThreshold,
      questions: videoQuizLib.stripQuestions(p.questions),
    });

    if (payload?.locked && payload.questions && !retry) return respond(payload);

    if (retry) {
      if (!payload?.locked) return res.status(400).json({ error: "Belum ada materi terkunci untuk diulang — mulai assessment dulu." });
      const attempt = (payload.attempt || 1) + 1;
      const { questions } = await ai.generateVideoQuizQuestions({ topic, transcript: payload.locked.transcript, attempt });
      const next = { locked: payload.locked, attempt, questions };
      await db.setVideoQuizPayload(req.userId, day.id, next);
      await db.updateQuestProgress(req.userId, day.id, {
        videoQuizState: { ...(day.quest.videoQuizState || {}), attempt, lastResult: null },
      });
      return respond(next);
    }

    if (!payload?.candidate?.relevant) {
      return res.status(400).json({ error: "Periksa materi dulu sebelum mulai assessment." });
    }
    const { candidate } = payload;
    const { questions } = await ai.generateVideoQuizQuestions({ topic, transcript: candidate.transcript, attempt: 1 });
    const locked = { videoId: candidate.videoId, videoUrl: candidate.videoUrl, videoMeta: candidate.videoMeta, transcript: candidate.transcript };
    const next = { locked, attempt: 1, questions };
    await db.setVideoQuizPayload(req.userId, day.id, next);
    // THE source lock: from here on /validate rejects new URLs and every
    // re-entry reuses this video until the quest is passed.
    await db.updateQuestProgress(req.userId, day.id, {
      videoQuizState: {
        phase: "locked", lockedVideoUrl: locked.videoUrl, lockedVideoId: locked.videoId,
        lockedVideoMeta: locked.videoMeta, attempt: 1, lastResult: null,
      },
    });
    return respond(next);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal menyusun soal dari materi ini. Coba lagi." });
  }
});

// Step 3: "Kirim Jawaban". Grading is fully deterministic (videoQuiz.js).
// FAIL (< passThreshold): quest stays open, lock carries over, NO answer
// key/explanations in the response (keeps "Ulang Assessment" honest) and no
// growth. PASS: the same completion pipeline as practice-test's submit -
// objective evidence, no specificity gate - plus the full pembahasan
// (per-question review), which only ever leaves the server here.
app.post("/api/video-quiz/submit", requireAuth, async (req, res) => {
  try {
    const { questId, answers } = req.body;
    const state = await db.getState(req.userId);
    const day = await db.getQuestById(req.userId, questId);
    if (!state || !day) return res.status(400).json({ error: "Quest tidak ditemukan." });
    if (day.quest?.completionType !== "video-quiz") return res.status(400).json({ error: "Quest ini bukan tipe Video Quest." });
    if (day.reflection) return res.status(400).json({ error: "Quest ini sudah pernah diselesaikan." });
    const payload = await db.getVideoQuizPayload(req.userId, day.id);
    if (!payload?.locked || !payload.questions) return res.status(400).json({ error: "Belum ada soal — mulai assessment dulu." });

    const topic = day.quest.videoQuiz?.topic || day.quest.title;
    const passThreshold = day.quest.videoQuiz?.passThreshold ?? videoQuizLib.DEFAULT_PASS_THRESHOLD;
    const graded = videoQuizLib.gradeAnswers(payload.questions, answers || {});
    const { strongConcepts, weakConcepts } = videoQuizLib.conceptSplit(graded.perQuestion);
    const passed = graded.score >= passThreshold;
    const lastResult = {
      score: graded.score, total: graded.total, passed,
      strongConcepts, weakConcepts, ts: new Date().toISOString(),
    };
    await db.updateQuestProgress(req.userId, day.id, {
      videoQuizState: { ...(day.quest.videoQuizState || {}), lastResult },
    });

    if (!passed) {
      return res.json({ passed: false, score: graded.score, total: graded.total, passThreshold, strongConcepts, weakConcepts });
    }

    const videoQuizResult = {
      topic, videoTitle: payload.locked.videoMeta?.title || "",
      score: graded.score, total: graded.total, passThreshold,
      attempt: payload.attempt || 1, strongConcepts, weakConcepts,
    };
    const recentGoalDays = day.goalIndex != null ? await db.recentDays(req.userId, { goalIndex: day.goalIndex, excludeId: day.id, limit: 7 }) : undefined;
    const ctx = {
      profile: { name: state.profile.name, originStory: state.profile.originStory || state.profile.situation },
      quest: day.quest,
      status: "COMPLETED",
      videoQuizResult,
      recentDays: recentGoalDays,
      stats: state.stats,
      growthSessions: state.growthSessions,
    };
    const result = await ai.processReflection(ctx);
    const deltas = result.statDeltas || {}; // objective code-graded evidence - no specificity gate

    const newStats = { ...state.stats };
    Object.entries(deltas).forEach(([k, v]) => {
      if (newStats[k] !== undefined && typeof v === "number") {
        newStats[k] = Math.max(0, Math.min(100, newStats[k] + Math.max(0, Math.min(5, Math.round(v)))));
      }
    });
    const newGrowthSessions = state.growthSessions + (Object.keys(deltas).length > 0 ? 1 : 0);
    const allowAdvance = result.chapterAdvance && newGrowthSessions > 0 && newGrowthSessions % 5 === 0 && Boolean(result.newChapterTitle && result.newChapterNarrative);

    const reflection = {
      status: "COMPLETED", text: "",
      videoQuizResult,
      deltas, mentorReply: result.mentorReply, timestamp: new Date().toISOString(),
    };
    await db.saveReflection(req.userId, day.id, reflection);
    await archiveChapterIfAdvancing(req.userId, state, allowAdvance);
    await db.touchStatActivity(req.userId, Object.keys(deltas));
    await db.updateState(req.userId, {
      stats: newStats,
      chapterNumber: allowAdvance ? state.chapterNumber + 1 : state.chapterNumber,
      chapterTitle: allowAdvance ? result.newChapterTitle : state.chapterTitle,
      chapterNarrative: allowAdvance ? result.newChapterNarrative : undefined,
      growthSessions: newGrowthSessions,
      pathwayNoun: state.pathwayNoun,
    });

    // Pembahasan: the only place the answer key ever reaches the client,
    // and only after a pass.
    const answerLookup = answers || {};
    const review = payload.questions.map((q) => {
      const yourAnswer = (Array.isArray(answerLookup[q.id]) ? answerLookup[q.id] : []).map((a) => String(a || "").trim().toLowerCase());
      return {
        id: q.id, format: q.format, concept: q.concept, prompt: q.prompt, options: q.options,
        yourAnswer, correct: q.correct,
        isCorrect: graded.perQuestion.find((p) => p.id === q.id)?.correct || false,
        explanation: q.explanation,
      };
    });
    res.json({
      passed: true, score: graded.score, total: graded.total, passThreshold,
      strongConcepts, weakConcepts, mentorReply: result.mentorReply, deltas, review,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal menyimpan hasil assessment." });
  }
});

// IELTS Listening Half Diagnostic (round 41): unlike practice-test's submit
// above, this content is fixed/server-code-defined (listeningDiagnostic.js),
// not per-attempt AI-generated - no band ladder, no per-track state, no AI
// call. Score IS stored (for future scoring-screen work) but deliberately
// NOT surfaced in the response - the design handoff's own "not yet built"
// list explicitly scopes this round's submitted screen to a plain answered-
// count confirmation, no correctness shown yet.
app.post("/api/listening-diagnostic/submit", requireAuth, async (req, res) => {
  try {
    const { questId, answers, runsCompleted } = req.body;
    const day = await db.getQuestById(req.userId, questId);
    if (!day) return res.status(400).json({ error: "Quest tidak ditemukan." });
    if (day.quest?.completionType !== "listening-diagnostic") return res.status(400).json({ error: "Quest ini bukan tipe Listening Diagnostic." });
    if (day.reflection) return res.status(400).json({ error: "Quest ini sudah pernah diselesaikan." });

    const graded = listeningDiagnostic.gradeAnswers(listeningDiagnostic.ASSESSMENT.questions, answers || {});
    const byTaskType = listeningDiagnostic.summarizeByTaskType(listeningDiagnostic.ASSESSMENT.questions, graded.wrong);
    const answeredCount = Object.keys(answers || {}).filter((k) => String(answers[k] || "").trim()).length;

    const reflection = {
      status: "COMPLETED", text: "",
      listeningDiagnosticResult: {
        answeredCount, totalQuestions: 20, correct: graded.correct, wrong: graded.wrong, byTaskType,
        runsCompleted: Math.max(0, Math.min(listeningDiagnostic.RUN_LIMIT, Number(runsCompleted) || 0)),
      },
      deltas: {}, timestamp: new Date().toISOString(),
    };
    await db.saveReflection(req.userId, day.id, reflection);
    res.json({ ok: true, answeredCount, totalQuestions: 20, correct: graded.correct, wrong: graded.wrong, byTaskType });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal menyimpan hasil diagnostik." });
  }
});

// --- Artifacts library (Task 10a): persistent per-user document store, not
// tied to any single quest - a user can view/add/replace an artifact any
// time via this icon, and any quest that needs one (job-match-analysis is
// the first) checks here first instead of asking to upload every time. ---

app.get("/api/artifacts", requireAuth, async (req, res) => {
  try {
    res.json({ artifacts: await db.listArtifacts(req.userId) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal memuat artifacts." });
  }
});

app.post("/api/artifacts", requireAuth, async (req, res) => {
  try {
    const { type, mimeType, dataBase64, filename, text } = req.body;
    if (!type) return res.status(400).json({ error: "Tipe artifact wajib diisi." });
    let content;
    if (mimeType) {
      const prepared = await jobMatch.prepareArtifactContent({ mimeType, dataBase64, filename });
      if (prepared.error) return res.status(400).json({ error: prepared.error });
      content = prepared.content;
    } else if (text && String(text).trim()) {
      content = { kind: "text", text: String(text).trim().slice(0, 20000), filename: filename || null };
    } else {
      return res.status(400).json({ error: "Isi file atau teks wajib diisi." });
    }
    const artifact = await db.createArtifact(req.userId, { type, content });
    res.json({ ok: true, artifact });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal menyimpan artifact." });
  }
});

// "Ganti" - same validation as create, but updates an existing artifact in
// place (same id) rather than adding a new one.
app.post("/api/artifacts/:id/replace", requireAuth, async (req, res) => {
  try {
    const { mimeType, dataBase64, filename, text } = req.body;
    let content;
    if (mimeType) {
      const prepared = await jobMatch.prepareArtifactContent({ mimeType, dataBase64, filename });
      if (prepared.error) return res.status(400).json({ error: prepared.error });
      content = prepared.content;
    } else if (text && String(text).trim()) {
      content = { kind: "text", text: String(text).trim().slice(0, 20000), filename: filename || null };
    } else {
      return res.status(400).json({ error: "Isi file atau teks wajib diisi." });
    }
    const artifact = await db.replaceArtifactContent(req.userId, Number(req.params.id), content);
    if (!artifact) return res.status(404).json({ error: "Artifact tidak ditemukan." });
    res.json({ ok: true, artifact });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal mengganti artifact." });
  }
});

// Task 10b: Job Match Analysis.
// Task 14 (PRD.md section 26, point 6): the flat "+3 to statFocus" bump this
// route used to apply on every analysis is REMOVED - it was the one
// completionType Task 7d's "no arbitrary points, only evidence-based growth"
// pass missed (job-match's growth was deterministic-but-arbitrary, not tied
// to any real gate, so it slipped past that cleanup). Nothing replaces it
// here: an analysis alone is just a READING of fit, not evidence of
// progress - the Livelihood Milestone counter (incremented only by a
// validated /api/job-application/submit, see below) is what now carries the
// "did something real happen" signal for this goal, same principle as
// structured-physical/practice-test already growing from evidence, not
// clicks. Chapter still never advances from this completion type alone.
app.post("/api/job-match/analyze", requireAuth, async (req, res) => {
  try {
    const { questId, cvArtifactId, images } = req.body;
    if (!Array.isArray(images) || !images.length) return res.status(400).json({ error: "Upload minimal satu screenshot lowongan." });
    const state = await db.getState(req.userId);
    const day = await db.getQuestById(req.userId, questId);
    if (!state || !day) return res.status(400).json({ error: "Quest tidak ditemukan." });
    if (day.quest?.completionType !== "job-match-analysis") return res.status(400).json({ error: "Quest ini bukan tipe Job Match Analysis." });
    if (day.reflection) return res.status(400).json({ error: "Quest ini sudah pernah diselesaikan." });
    const cvArtifact = await db.getArtifactById(req.userId, cvArtifactId);
    if (!cvArtifact) return res.status(400).json({ error: "CV tidak ditemukan — upload atau pilih CV dulu." });

    const result = await ai.generateJobMatchAnalysis({
      cvArtifact, images,
      goalText: day.goalIndex != null ? state.goals?.[day.goalIndex] : undefined,
      pathway: state.pathway,
    });

    const reflection = {
      status: "COMPLETED", text: "",
      jobMatchResult: result,
      deltas: {}, timestamp: new Date().toISOString(),
    };
    await db.saveReflection(req.userId, day.id, reflection);

    // Task 14 point 1/2: a Livelihood goal's Milestone line ("→ Milestone:
    // 10 Qualified Applications (X/10)") only renders once state.goalTargets
    // actually has an entry for this goalIndex (questSummaryCard reads that
    // column directly, see public/app.js) - auto-create it here on first
    // touch rather than waiting for a submit, so the FIRST analysis already
    // shows the counter, matching the founder's report that it never showed
    // up at all. META sessions (goalIndex null) have no goal to attach a
    // Milestone to, same guard the A/B/C structured-physical flow already uses.
    const target = day.goalIndex != null ? await ensureQualifiedApplicationsMilestone(req.userId, state, day.goalIndex) : null;

    res.json({ ok: true, result, target: target ? { mode: "progress", kind: target.kind, currentTarget: target } : null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal menganalisis kecocokan lowongan." });
  }
});

// Task 14 (PRD.md section 26, points 2/5): "Submit Application" - the
// evidence half of the Livelihood Milestone loop. Fully deterministic (no AI
// call at all, unlike job-match-analysis) - there's nothing to judge here,
// only structured evidence to validate and a counter to move, same
// philosophy as structured.js's cardio/gym forms. The "qualified" checklist
// (PRD point 2) is enforced here, server-side, from data already computed
// deterministically earlier in the loop:
//   - matchScore >= 70 / roleAligned / notRedFlag -> folded into the stored
//     jobMatchResult.qualified boolean (jobMatch.cleanJobMatchResult), never
//     re-trusted from a fresh AI claim here.
//   - cvVersionUsed -> a real artifact id, looked up same as job-match-analyze.
//   - applicationSubmittedEvidence -> the form fields themselves
//     (jobApplication.validateJobApplication).
// Only once ALL of those hold does current_count move - an unqualified
// analysis, a missing CV reference, or a thin/empty proof field never
// increments the Milestone, no matter how the form is filled.
app.post("/api/job-application/submit", requireAuth, async (req, res) => {
  try {
    const { questId, cvArtifactId } = req.body;
    const state = await db.getState(req.userId);
    const day = await db.getQuestById(req.userId, questId);
    if (!state || !day) return res.status(400).json({ error: "Quest tidak ditemukan." });
    if (day.quest?.completionType !== "job-application-submit") return res.status(400).json({ error: "Quest ini bukan tipe Submit Application." });
    if (day.reflection) return res.status(400).json({ error: "Quest ini sudah pernah diselesaikan." });
    if (day.goalIndex == null) return res.status(400).json({ error: "Quest ini tidak terikat ke goal manapun." });

    const validated = jobApplication.validateJobApplication(req.body);
    if (!validated.ok) return res.status(400).json({ error: validated.error });

    const cvArtifact = await db.getArtifactById(req.userId, cvArtifactId);
    if (!cvArtifact) return res.status(400).json({ error: "CV tidak ditemukan — pilih versi CV yang dipakai untuk lamaran ini." });

    // "qualified" gate: the most recent job-match-analysis for THIS goal
    // (not any goal) must have passed. Mirrors the jobMatchHint lookup in
    // GET /api/state, but re-checked here independently - a stale/replayed
    // client request must never increment the counter off an old hint.
    const goalRecent = await db.recentDays(req.userId, { goalIndex: day.goalIndex, excludeId: day.id, limit: 5 });
    const lastAnalysis = goalRecent.find((d) => d.reflection?.jobMatchResult);
    if (!lastAnalysis || !lastAnalysis.reflection.jobMatchResult.qualified) {
      return res.status(400).json({ error: "Belum ada Job Match Analysis yang LOLOS (qualified) untuk goal ini — selesaikan analisisnya dulu." });
    }

    const target = await ensureQualifiedApplicationsMilestone(req.userId, state, day.goalIndex);
    const metrics = { targetCount: target.metrics.targetCount, currentCount: target.metrics.currentCount + 1 };
    const updatedTarget = {
      ...target, metrics, label: targets.formatTargetLabel("qualified-applications", metrics),
      source: "evidence", createdAt: new Date().toISOString(),
    };
    await db.setGoalTarget(req.userId, day.goalIndex, updatedTarget);

    const jobApplicationSubmit = { ...validated.clean, cvArtifactId: cvArtifact.id };
    const reflection = {
      status: "COMPLETED", text: "",
      jobApplicationSubmit,
      mentorReply: `Lamaran ke ${validated.clean.companyName} untuk ${validated.clean.roleTitle} tercatat.`,
      deltas: {}, timestamp: new Date().toISOString(),
    };
    await db.saveReflection(req.userId, day.id, reflection);

    // Task 14 point 7: reached 10/10 -> generalize the existing "Target
    // Berikutnya" A/B/C mechanism (Fokus 2.2/2.3) to Livelihood goals, same
    // trigger shape cardio/gym already use, just a different kind/prompt.
    // cardio/gym's own trigger (line ~600 above) is untouched - this is a
    // parallel path, not a modification of it.
    let targetScreen;
    if (targets.targetReached("qualified-applications", updatedTarget.metrics)) {
      const options = await ai.generateTargetOptions({
        kind: "qualified-applications", goalText: state.goals[day.goalIndex], pathway: state.pathway,
      });
      targetScreen = { mode: "options", reached: true, kind: "livelihood-funnel", options };
    } else {
      targetScreen = { mode: "progress", kind: "qualified-applications", currentTarget: updatedTarget };
    }

    res.json({ ok: true, jobApplication: jobApplicationSubmit, target: targetScreen });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal menyimpan lamaran." });
  }
});

// Task 12 (META tab): on-demand access to the 3 structured tools (form
// evidence fisik/lari, Practice Test, Job Match) outside the daily
// per-goal rotation - "sesi bebas", not tied to any goal, never generated
// by generateQuest. Always goal_index NULL + is_meta true (see the column
// comment in db.js's init()), so it never competes for a goal's one-open-
// quest slot and POST /api/reflection's Milestone/current_target update
// (gated on day.goalIndex != null) never fires for it. The 3 completion
// routes below (/api/reflection, /api/practice-test/*, /api/job-match/
// analyze) are otherwise completely unmodified - a META quest completes
// through the exact same code as a Today's Trial quest of the same
// completionType, so growth-gate/Decay/Riwayat all apply identically.
// Training spec: the fixed exercise catalog for the multi-exercise workout
// log - static server data (see server/exerciseCatalog.js), fetched once by
// the client when the Training session form opens. Auth-gated like every
// other /api route, but user-independent content.
app.get("/api/exercise-catalog", requireAuth, (req, res) => {
  res.json({
    exercises: exerciseCatalog.EXERCISES,
    muscleGroups: exerciseCatalog.MUSCLE_GROUPS,
    muscleGroupLabels: exerciseCatalog.MUSCLE_GROUP_LABELS,
  });
});

app.post("/api/meta/start", requireAuth, async (req, res) => {
  try {
    const { tool, kind } = req.body;
    let quest;
    if (tool === "body") {
      if (!["cardio", "gym", "recovery"].includes(kind)) {
        return res.status(400).json({ error: "Pilih jenis aktivitas dulu." });
      }
      quest = {
        completionType: "structured-physical",
        structuredKind: kind,
        evidenceSchema: null, // no Milestone target to compare against - a free session
        // Training spec: NEW gym sessions started from META get the
        // multi-exercise workout log (client renders the gym-session form
        // off this flag). Legacy single-exercise gym quests already in
        // flight lack it and keep the old form - never force-migrated.
        ...(kind === "gym" ? { gymSession: true } : {}),
        statFocus: "body",
        title: "Latihan Mandiri",
        description: "Sesi latihan bebas dari META — catat aktivitasmu, tidak terikat ke goal atau Milestone manapun.",
        why: "Latihan bebas tetap dihitung sebagai bukti pertumbuhan longitudinal.",
      };
    } else if (tool === "practice-test") {
      quest = {
        completionType: "practice-test",
        statFocus: "growth",
        title: "Practice Test Mandiri",
        description: "Latihan soal bebas dari META, di luar rotasi goal harian.",
        why: "Latihan bebas tetap dihitung sebagai bukti pertumbuhan longitudinal.",
      };
    } else if (tool === "job-match") {
      quest = {
        completionType: "job-match-analysis",
        statFocus: "livelihood",
        title: "Job Match Analysis Mandiri",
        description: "Cek kecocokan lowongan bebas dari META, di luar rotasi goal harian.",
        why: "Latihan bebas tetap dihitung sebagai bukti pertumbuhan longitudinal.",
      };
    } else if (tool === "listening-diagnostic") {
      // Round 41: fixed 20-question IELTS Listening Half Diagnostic,
      // replaces LINGUA's old generic AI-quiz "Listening" row. Unlike
      // practice-test above, this tool's content is server-code-defined and
      // identical for every attempt (listeningDiagnostic.js), not
      // AI-generated - nothing about the quest itself needs to carry a
      // payload, the client fetches the (answer-stripped) package below.
      quest = {
        completionType: "listening-diagnostic",
        statFocus: "growth",
        title: "IELTS Listening Half Diagnostic",
        description: "Diagnostik Listening 20 soal dari META, di luar rotasi goal harian.",
        why: "Latihan bebas tetap dihitung sebagai bukti pertumbuhan longitudinal.",
      };
    } else if (tool === "video-quest") {
      // Video Quest from LABORA: the user types the topic themselves (a
      // META free session picks its own subject, same spirit as META Body's
      // kind picker). Once created the topic is STATIC for this quest -
      // that rule is what the source lock hangs off (the topic decides
      // which video is allowed).
      const topic = String(req.body?.topic || "").trim().slice(0, 160);
      if (topic.length < 3) return res.status(400).json({ error: "Tulis topik yang mau kamu pelajari dulu." });
      quest = {
        completionType: "video-quiz",
        statFocus: "growth",
        videoQuiz: { topic, passThreshold: videoQuizLib.DEFAULT_PASS_THRESHOLD, estimatedMinutes: 25 },
        title: `Video Quest: ${topic}`,
        description: `Pelajari "${topic}" dari satu video YouTube pilihanmu, lalu buktikan lewat 15 soal dari materi video itu.`,
        why: "Latihan bebas tetap dihitung sebagai bukti pertumbuhan longitudinal.",
      };
    } else if (tool === "nutrition") {
      // SOMA Nutrition Part B: a META Nutrition session has no goal-specific
      // target to derive a metric/count from (unlike a goal-generated
      // nutrition quest, see generateQuest's nutrition branch) - sensible
      // MVP defaults, same "free session, no Milestone" spirit as META Body.
      quest = {
        completionType: "nutrition-log",
        lifecycleType: "progressive",
        statFocus: "body",
        title: "Catat Nutrisi Mandiri",
        description: "Catat makanmu bebas dari META — tidak terikat ke goal atau Milestone manapun.",
        why: "Latihan bebas tetap dihitung sebagai bukti pertumbuhan longitudinal.",
        progressive: nutrition.initProgressiveState({ requiredContributions: 3, primaryMetric: "protein", targetValue: 60 }),
      };
    } else {
      return res.status(400).json({ error: "Tools tidak dikenal." });
    }
    const created = await db.createQuest(req.userId, null, todayKey(), { quest, insight: null }, false, true);
    // listening-diagnostic's package is static/identical for every user and
    // attempt (no per-user variance to protect, unlike an AI-generated
    // payload) - inlining the stripped package here avoids a second round
    // trip and a stale-questId race a separate fetch would risk.
    const extra = tool === "listening-diagnostic" ? { assessment: listeningDiagnostic.stripAnswers(listeningDiagnostic.ASSESSMENT) } : {};
    res.json({ ok: true, quest: created, ...extra });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal memulai sesi META." });
  }
});

// META Inner Realm target-recommendation flow: the user explicitly approves
// a "recommend" card (see server/metaTargets.js) as a realm's active target.
// domainForGoalIndex is re-derived server-side rather than trusted from the
// client - a stale/tampered request must never lock in a mismatched
// goalIndex (e.g. confirming a Livelihood goal as the SOMA target).
app.post("/api/meta/target/confirm", requireAuth, async (req, res) => {
  try {
    const { realm, goalIndex } = req.body;
    if (!metaTargets.REALMS.includes(realm)) return res.status(400).json({ error: "Realm tidak dikenal." });
    const state = await db.getState(req.userId);
    const gi = Number(goalIndex);
    if (!Number.isInteger(gi) || !state.goals?.[gi]) return res.status(400).json({ error: "Goal tidak ditemukan." });
    if (metaTargets.domainForGoalIndex(state, gi) !== realm) {
      return res.status(400).json({ error: "Goal ini belum punya data yang cocok untuk realm itu." });
    }
    await db.setMetaActiveTarget(req.userId, realm, gi);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal mengonfirmasi target." });
  }
});

// META Inner Realm: lets a user add a new First Trial goal after onboarding,
// from a realm's "No active target" empty-state CTA (server/metaTargets.js).
// Same cap/validation as onboarding's goal capture, just appending.
app.post("/api/goals", requireAuth, async (req, res) => {
  try {
    const result = await db.addGoal(req.userId, req.body?.text);
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json({ ok: true, goals: result.goals, goalIndex: result.goalIndex });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal menambahkan goal." });
  }
});

// SOMA Nutrition Part B item 5: food search MVP - plain substring match
// against the curated seed list, no external API this round.
app.get("/api/foods/search", requireAuth, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ foods: [] });
    res.json({ foods: await db.searchFoods(q) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal mencari makanan." });
  }
});

// Barcode lookup - the "architecture ready, scanning infra not wired" half
// of item 5: works today against a typed/pasted code, no camera capture UI.
app.get("/api/foods/barcode/:code", requireAuth, async (req, res) => {
  try {
    const food = await db.getFoodByBarcode(req.params.code);
    if (!food) return res.status(404).json({ error: "Barcode tidak ditemukan." });
    res.json({ food });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal mencari barcode." });
  }
});

// SOMA Nutrition Part B item 4/8: log one meal as durable evidence, and (if
// tied to an active PROGRESSIVE quest) fold it into that quest's running
// total - COMPLETED fires here, mid-day, the instant evidenceComplete AND
// targetMet both go true (brief: "no manual confirm").
app.post("/api/nutrition/log", requireAuth, async (req, res) => {
  try {
    const validated = nutritionEntry.validateFoodEntry(req.body);
    if (!validated.ok) return res.status(400).json({ error: validated.error });
    const source = ["search", "photo"].includes(req.body.source) ? req.body.source : "search";

    let quest = null;
    if (req.body.questId != null) {
      quest = await db.getQuestById(req.userId, req.body.questId);
      if (!quest) return res.status(400).json({ error: "Quest tidak ditemukan." });
      if (quest.quest?.completionType !== "nutrition-log") return res.status(400).json({ error: "Quest ini bukan tipe Nutrition." });
      if (quest.reflection) return res.status(400).json({ error: "Quest ini sudah selesai." });
    }

    const entry = await db.createFoodEntry(req.userId, {
      questId: quest ? quest.id : null, ...validated.clean, source, date: todayKey(),
    });

    let progressive = null;
    let resolved = null;
    if (quest) {
      progressive = nutrition.applyContribution(quest.quest.progressive, validated.clean);
      await db.updateQuestProgress(req.userId, quest.id, { progressive });
      if (progressive.status === "COMPLETED") {
        const state = await db.getState(req.userId);
        resolved = await resolveNutritionQuest(req.userId, quest.id, { ...quest.quest, progressive }, state);
      }
    }

    res.json({ ok: true, entry, progressive, resolved: resolved ? { status: resolved.status, mentorReply: resolved.mentorReply } : null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal menyimpan catatan makan." });
  }
});

// Entries for one quest (resuming an active session's log) or for a whole
// date (Nutrition page totals - not scoped to any one quest, a user's real
// intake counts regardless of whether a Nutrition Trial is running today).
app.get("/api/nutrition/entries", requireAuth, async (req, res) => {
  try {
    const { questId, date } = req.query;
    if (questId != null) return res.json({ entries: await db.listFoodEntriesForQuest(req.userId, Number(questId)) });
    res.json({ entries: await db.listFoodEntriesForDate(req.userId, date || todayKey()) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal memuat catatan makan." });
  }
});

// Photo-based entry (secondary/optional path alongside search, per founder
// decision) - AI only ever SUGGESTS, never persists; the client reviews/
// edits the suggestion, then submits it through the SAME /api/nutrition/log
// as a search-based entry (one evidence-writing path, two ways to arrive at
// the payload).
app.post("/api/nutrition/analyze-photo", requireAuth, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image || !image.mimeType || !image.dataBase64) return res.status(400).json({ error: "Foto wajib diupload." });
    const suggestion = await ai.analyzeNutritionPhoto({ image });
    res.json({ ok: true, suggestion });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal menganalisis foto." });
  }
});

// Multi-Domain Quest Hub (design handoff, 19 Agustus): a quest requiring
// BOTH a Recovery AND a Nutrition sub-flow, order-independent, before it
// resolves. Both save routes share this helper (real shared logic, not
// premature abstraction - the two differ only in which featureKey/validator
// they use) - fetch, ownership/type/not-already-completed checks, merge the
// patch into quest.featureData[featureKey] (partial saves allowed, brief:
// "saves whatever is filled"), recompute featureState/status fresh from the
// merged data (never trust a stored status independently - see
// questHub.computeFeatureState's own comment), persist via the existing
// generic updateQuestProgress read-modify-write.
async function saveQuestHubFeature(req, res, featureKey, validateFn) {
  try {
    const { questId } = req.body;
    const day = await db.getQuestById(req.userId, Number(questId));
    if (!day) return res.status(400).json({ error: "Quest tidak ditemukan." });
    if (day.quest?.completionType !== "multi-domain") return res.status(400).json({ error: "Quest ini bukan Multi-Domain Quest Hub." });
    if (day.reflection) return res.status(400).json({ error: "Quest ini sudah selesai." });

    const validated = validateFn(req.body);
    if (!validated.ok) return res.status(400).json({ error: validated.error });

    const requirements = day.quest.featureRequirements?.[featureKey] || [];
    const featureData = { ...(day.quest.featureData || {}), [featureKey]: { ...(day.quest.featureData?.[featureKey] || {}), ...validated.clean } };
    const featureState = { ...(day.quest.featureState || {}) };
    featureState[featureKey] = questHub.computeFeatureState(requirements, featureData[featureKey]);
    const status = questHub.computeQuestStatus(featureState, day.quest.primaryFeature, day.quest.supportingFeatures || []);

    const updated = await db.updateQuestProgress(req.userId, day.id, { featureData, featureState, status });
    res.json({ ok: true, featureData: updated.featureData, featureState: updated.featureState, status: updated.status });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal menyimpan data." });
  }
}

app.post("/api/quest-hub/recovery", requireAuth, (req, res) => saveQuestHubFeature(req, res, "RECOVERY", questHub.validateRecoveryPatch));
app.post("/api/quest-hub/nutrition", requireAuth, (req, res) => saveQuestHubFeature(req, res, "NUTRITION", questHub.validateNutritionPatch));

// Only reachable once every feature is COMPLETE (quest.status ===
// READY_TO_COMPLETE, recomputed fresh above on every patch save - never a
// client-trusted flag). Submits the already-saved featureData/featureState,
// never re-collects anything - same "objective evidence, one AI call for
// mentorReply/interpretation, no re-judging the raw data" pattern
// resolveNutritionQuest already established for nutrition-log. No
// chapterAdvance handling here, matching that same precedent (both are
// programmatic/lazy-style completions, distinct from the main interactive
// POST /api/reflection flow where chapter advance is the norm).
app.post("/api/quest-hub/complete", requireAuth, async (req, res) => {
  try {
    const { questId } = req.body;
    const day = await db.getQuestById(req.userId, Number(questId));
    if (!day) return res.status(400).json({ error: "Quest tidak ditemukan." });
    if (day.quest?.completionType !== "multi-domain") return res.status(400).json({ error: "Quest ini bukan Multi-Domain Quest Hub." });
    if (day.reflection) return res.status(400).json({ error: "Quest ini sudah selesai." });
    if (day.quest.status !== "READY_TO_COMPLETE") return res.status(400).json({ error: "Lengkapi Recovery dan Nutrition dulu." });

    const state = await db.getState(req.userId);
    const ctx = {
      profile: { name: state.profile.name, originStory: state.profile.originStory || state.profile.situation },
      quest: day.quest, status: "done",
      multiDomainResult: { status: day.quest.status, featureState: day.quest.featureState, featureData: day.quest.featureData },
      stats: state.stats, growthSessions: state.growthSessions,
    };
    const result = await ai.processReflection(ctx);
    const deltas = result.statDeltas || {};
    const newStats = { ...state.stats };
    Object.entries(deltas).forEach(([k, v]) => {
      if (newStats[k] !== undefined && typeof v === "number") {
        newStats[k] = Math.max(0, Math.min(100, newStats[k] + Math.max(0, Math.min(5, Math.round(v)))));
      }
    });
    const newGrowthSessions = state.growthSessions + (Object.keys(deltas).length > 0 ? 1 : 0);

    await db.updateQuestProgress(req.userId, day.id, { status: "COMPLETED" });
    const reflection = {
      status: "COMPLETED", text: "",
      multiDomainResult: { featureData: day.quest.featureData, featureState: day.quest.featureState },
      deltas, mentorReply: result.mentorReply, interpretation: result.interpretation || null,
      safetyNote: result.safetyNote || null,
      timestamp: new Date().toISOString(),
    };
    await db.saveReflection(req.userId, day.id, reflection);
    await db.touchStatActivity(req.userId, Object.keys(deltas));
    await db.updateState(req.userId, {
      stats: newStats, chapterNumber: state.chapterNumber, chapterTitle: state.chapterTitle,
      growthSessions: newGrowthSessions, pathwayNoun: state.pathwayNoun,
    });

    res.json({
      ok: true, questTitle: day.quest.title, mentorReply: result.mentorReply,
      interpretation: result.interpretation || null, safetyNote: result.safetyNote || null, deltas,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal menyelesaikan quest." });
  }
});

app.post("/api/reset", requireAuth, async (req, res) => {
  await db.resetUser(req.userId);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
db.init()
  .then(() => {
    app.listen(PORT, () => console.log(`Eleva jalan di http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error("Gagal inisialisasi database:", e);
    process.exit(1);
  });
