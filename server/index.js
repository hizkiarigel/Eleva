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
const jobMatch = require("./jobMatch");
const jobApplication = require("./jobApplication");
const nutrition = require("./nutrition");
const nutritionEntry = require("./nutritionEntry");
const metaTargets = require("./metaTargets");

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
// "done" (submission = completion, the pre-Task-7c behavior) whenever
// there's no usable target to compare against - a quest without a clean
// numeric target can't be judged partial, so it isn't.
function computeEvidenceStatus(quest, structuredClean) {
  const schema = quest?.evidenceSchema;
  if (!schema || schema.target == null || !structuredClean) return "done";
  const actual = schema.metricType === "distance" ? structuredClean.jarakKm
    : schema.metricType === "reps" ? structuredClean.repetisi
    : null;
  if (actual == null) return "done";
  return actual / schema.target >= 0.95 ? "done" : "partial";
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
  const effectiveStatus = progressive.status === "COMPLETED" ? "done" : progressive.status === "ATTEMPTED" ? "partial" : "skipped";
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
  await db.touchStatActivity(userId, Object.keys(deltas));
  await db.updateState(userId, {
    stats: newStats, chapterNumber: state.chapterNumber, chapterTitle: state.chapterTitle,
    growthSessions: newGrowthSessions, pathwayNoun: state.pathwayNoun,
  });
  return reflection;
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
    const goalSlots = goals.length ? goals.map((_, i) => i) : [null];
    // Task 12 (META): a META row must never count as "this slot has an open
    // quest" - a goal_index-null META session would otherwise satisfy a
    // legacy ungoaled account's single slot check (both use goal_index NULL)
    // and silently block that account's real daily quest from generating.
    const needySlots = goalSlots.filter((gi) => !openQuests.some((q) => q.goalIndex === gi && !q.isMeta));
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
    const sideSlots = goals.length ? Math.max(0, 3 - goals.length) : 0;
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
        lingua: await db.countSessionsSince(req.userId, "practice-test", startOfMonthKey()),
        somaActivity: await db.countSessionsSince(req.userId, "structured-physical", startOfWeekKey()),
        somaNutrition: await db.countSessionsSince(req.userId, "nutrition-log", startOfWeekKey()),
        labora: await db.countSessionsSince(req.userId, "job-match-analysis", startOfMonthKey()),
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
    if (day.reflection) return res.status(400).json({ error: "Quest ini sudah pernah direfleksikan." });

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
    if ((isStructuredQuest || structuredData) && (status === "done" || status === "partial") && !inCrisis) {
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
    const effectiveStatus = isStructuredQuest && structuredClean
      ? computeEvidenceStatus(day.quest, structuredClean)
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
        : (effectiveStatus === "done" || effectiveStatus === "partial") && wordCount(text) >= 12;
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
    await db.updateKondisi(req.userId, status, trimmedNote || null);
    res.json({ ok: true, kondisiStatus: status, kondisiNote: trimmedNote || null });
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
    const result = await ai.generatePracticeTest({
      kind, track, level: trackState.level || 1,
      history: (trackState.history || []).slice(-5),
      goalText: day.goalIndex != null ? state.goals?.[day.goalIndex] : undefined,
      pathway: state.pathway,
      drill: nextDrill ? { category: nextDrill.category } : null,
    });
    const payload = { kind, track, entryType: nextDrill ? "drill" : "sprint", ...(nextDrill ? { focusCategory: nextDrill.category } : {}), ...result };
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
      status: "done",
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
      status: "done", text: "",
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
      status: "done", text: "",
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
      status: "done", text: "",
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
    res.json({ ok: true, quest: created });
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
