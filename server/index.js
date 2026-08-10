require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieSession = require("cookie-session");
const db = require("./db");
const auth = require("./auth");
const ai = require("./claude");
const safety = require("./safety");
const structured = require("./structured");

const app = express();
app.set("trust proxy", 1);
app.use(express.json());

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

app.use(express.static(path.join(__dirname, "..", "public")));

function todayKey() {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, server local time
}
function wordCount(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

// v13 goal rotation: the AI decides HOW to chase a goal, but WHICH of the
// user's 1-3 First Trial goals today's quest targets is decided HERE,
// deterministically - prioritize the goal that has gone LONGEST without a
// quest (same coverage principle as scenario-card axis selection), never
// random and never always goal #1. days must be newest-first (recentDays
// order); a day whose quest carries no goalIndex (pre-v13, or malformed)
// simply doesn't count as touching any goal.
function pickActiveGoalIndex(goals, days) {
  if (!Array.isArray(goals) || goals.length === 0) return null;
  const lastSeen = goals.map(() => Infinity); // Infinity = never targeted -> highest priority
  (days || []).forEach((d, i) => {
    // recentDays flattens quest to its title and lifts goalIndex to a
    // sibling field; raw day rows carry it inside quest - accept both.
    const gi = d?.goalIndex ?? d?.quest?.goalIndex;
    if (Number.isInteger(gi) && gi >= 0 && gi < goals.length && lastSeen[gi] === Infinity) {
      lastSeen[gi] = i; // i grows with age; smallest i = most recently targeted
    }
  });
  let best = 0;
  for (let i = 1; i < goals.length; i++) {
    if (lastSeen[i] > lastSeen[best]) best = i; // strict > keeps lowest index on ties
  }
  return best;
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

// --- App routes (all require auth, all scoped by req.userId from session) ---

// Full app state for the frontend: profile, stats, chapter, today's day, aiActive flag
app.get("/api/state", requireAuth, async (req, res) => {
  try {
    const state = await db.getState(req.userId);
    if (!state || !state.profile) return res.json({ profile: null });

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

    // The active quest is keyed by issuance time (rolling 24h), not by
    // today's calendar date - a quest issued last night is still today's
    // quest until its own 24h is up, even after midnight has passed.
    let today = await db.getActiveDay(req.userId);
    if (!today || !today.active) {
      const tk = todayKey();
      // One 14-day fetch serves both goal rotation (needs the fuller window
      // to know which goal has waited longest) and the 3-day AI context.
      const recent = await db.recentDays(req.userId, tk, 14);
      const goals = state.goals || [];
      const activeGoalIndex = pickActiveGoalIndex(goals, recent);
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
        // stays the constant HOW). activeGoal = the one today's quest must
        // aim at, chosen deterministically above - not left to the model.
        goals: goals.length ? goals : undefined,
        activeGoal: activeGoalIndex != null ? goals[activeGoalIndex] : undefined,
        stats: state.stats,
        chapterNumber: state.chapterNumber,
        chapterTitle: state.chapterTitle,
        recentDays: recent.slice(0, 3),
        today: tk,
      };
      const result = await ai.generateQuest(ctx);
      // Stamp which goal this quest was assigned to server-side (rotation
      // input for future days) - deterministic, never trusted from the model.
      if (activeGoalIndex != null && result.quest) result.quest.goalIndex = activeGoalIndex;
      await db.updateState(req.userId, {
        stats: state.stats,
        chapterNumber: result.chapterNumber || state.chapterNumber,
        chapterTitle: result.chapterTitle || state.chapterTitle,
        growthSessions: state.growthSessions,
        pathwayNoun: state.pathwayNoun || result.pathwayNoun || null,
      });
      await db.createQuest(req.userId, tk, { quest: result.quest, insight: result.insight });
      today = await db.getActiveDay(req.userId);
    }

    const fresh = await db.getState(req.userId);
    res.json({
      profile: fresh.profile,
      stats: fresh.stats,
      chapterNumber: fresh.chapterNumber,
      chapterTitle: fresh.chapterTitle,
      growthSessions: fresh.growthSessions,
      pathwayNoun: fresh.pathwayNoun,
      pathwayStatus: fresh.pathwayStatus,
      today,
      history: (await db.allHistory(req.userId, today.date)).slice(0, 8),
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
    // Day one of the First Trial: no history yet, so rotation trivially
    // starts at the first listed goal (same pickActiveGoalIndex the daily
    // route uses - one code path for the rule, not two).
    const activeGoalIndex = pickActiveGoalIndex(goals, []);
    const ctx = {
      profile, pathway, pathwayNoun, radarSnapshot,
      goals: goals.length ? goals : undefined,
      activeGoal: activeGoalIndex != null ? goals[activeGoalIndex] : undefined,
      stats: initialStats, chapterNumber: null, chapterTitle: null, recentDays: [], today: todayKey(),
    };
    const result = await ai.generateQuest(ctx);
    if (activeGoalIndex != null && result.quest) result.quest.goalIndex = activeGoalIndex;

    await db.createState(req.userId, {
      profile,
      stats: initialStats,
      chapterNumber: result.chapterNumber || 1,
      chapterTitle: result.chapterTitle || "Mencari Arah",
      pathway,
      pathwayNoun: result.pathwayNoun || pathwayNoun,
      radarSnapshot,
      radarRaw: Object.keys(radarRaw).length ? radarRaw : null,
      secondaryTrait: secondaryTrait || null,
      goals,
    });
    await db.createQuest(req.userId, todayKey(), { quest: result.quest, insight: result.insight });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal membuat profil." });
  }
});

// Submit today's reflection
app.post("/api/reflection", requireAuth, async (req, res) => {
  try {
    const { status, text, structuredData } = req.body;
    const state = await db.getState(req.userId);
    const day = await db.getActiveDay(req.userId);
    if (!state || !day) return res.status(400).json({ error: "Belum ada quest hari ini." });
    // Server-side enforcement of the same 24h window the client shows as a
    // countdown - a client can't be trusted to self-block a late submit
    // right at the buzzer, and an expired quest already has a successor
    // waiting behind it (getActiveDay would return that one, not this).
    if (!day.active) return res.status(400).json({ error: "Waktu 24 jam quest ini sudah habis, sudah nggak bisa direfleksikan lagi." });

    const trimmedText = (text || "").trim();
    const inCrisis = safety.detectCrisis(trimmedText);

    // Task 7b: structured-physical quests complete via typed fields, not the
    // free reflection box. Validation (required fields + number plausibility)
    // is deterministic code (server/structured.js) - a completed structured
    // quest is growth-eligible WITHOUT the 12-word text gate, because the
    // narrative is explicitly optional there. Skipped quests validate nothing
    // (there is nothing to certify, and no growth either way).
    const isStructuredQuest = day.quest?.completionType === "structured-physical";
    let structuredClean = null;
    if (isStructuredQuest && (status === "done" || status === "partial") && !inCrisis) {
      const check = structured.validateStructuredData(day.quest.structuredKind, structuredData);
      if (!check.ok) return res.status(400).json({ error: check.error });
      structuredClean = check.clean;
    }

    let deltas = {};
    let mentorReply;
    let chapterAdvance = false;
    let newChapterTitle = null;

    if (inCrisis) {
      // Defense in depth: skip the AI mentor entirely and reply with a fixed
      // message. Independent of the crisis instruction in MENTOR_SYSTEM
      // (server/claude.js) — that stays in place too, this doesn't replace it.
      mentorReply = safety.CRISIS_RESOURCE_MESSAGE;
    } else {
      const eligible = structuredClean
        ? true // completeness+plausibility already code-verified above
        : (status === "done" || status === "partial") && wordCount(text) >= 12;
      const ctx = {
        // originStory is v3; situation is the pre-v3 fallback for accounts
        // that onboarded before this field existed.
        profile: { name: state.profile.name, originStory: state.profile.originStory || state.profile.situation },
        quest: day.quest,
        status,
        reflectionText: trimmedText,
        structuredData: structuredClean || undefined,
        // Recent days give the AI the progressive baseline ("last time 15
        // reps") for its mentorReply on structured quests.
        recentDays: structuredClean ? await db.recentDays(req.userId, day.date, 7) : undefined,
        stats: state.stats,
        growthSessions: state.growthSessions,
      };
      const result = await ai.processReflection(ctx);
      deltas = eligible ? (result.statDeltas || {}) : {};
      mentorReply = eligible
        ? result.mentorReply
        : "Coba ceritain lebih banyak apa yang sebenarnya terjadi — segelintir kata belum cukup buat pertumbuhan kelihatan nyata (dan itu memang sengaja begitu).";
      chapterAdvance = result.chapterAdvance;
      newChapterTitle = result.newChapterTitle;
    }

    const newStats = { ...state.stats };
    Object.entries(deltas).forEach(([k, v]) => {
      if (newStats[k] !== undefined && typeof v === "number") {
        newStats[k] = Math.max(0, Math.min(100, newStats[k] + Math.max(0, Math.min(5, Math.round(v)))));
      }
    });
    const newGrowthSessions = state.growthSessions + (Object.keys(deltas).length > 0 ? 1 : 0);
    const allowAdvance = chapterAdvance && newGrowthSessions > 0 && newGrowthSessions % 5 === 0;

    const reflection = {
      status,
      text: trimmedText,
      // Stored inside the existing reflection jsonb - the PRD's "smallest
      // schema change" option (no new column). recentDays returns the full
      // reflection object, so this automatically reaches future quest
      // generation as the progressive baseline.
      ...(structuredClean ? { structuredData: structuredClean } : {}),
      deltas,
      mentorReply,
      timestamp: new Date().toISOString(),
    };
    await db.saveReflection(req.userId, day.date, reflection);
    await db.updateState(req.userId, {
      stats: newStats,
      chapterNumber: allowAdvance ? state.chapterNumber + 1 : state.chapterNumber,
      chapterTitle: allowAdvance && newChapterTitle ? newChapterTitle : state.chapterTitle,
      growthSessions: newGrowthSessions,
      pathwayNoun: state.pathwayNoun,
    });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal menyimpan refleksi." });
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
