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
    const goalSlots = goals.length ? goals.map((_, i) => i) : [null];
    const needySlots = goalSlots.filter((gi) => !openQuests.some((q) => q.goalIndex === gi));
    if (needySlots.length) {
      // One shared context snapshot for every goal generated in this pass -
      // avoids a re-read per goal, and right after onboarding (the only
      // time more than one slot is typically needy at once) there's no new
      // reflection data between them anyway for it to miss.
      const recentAll = await db.recentDays(req.userId, { limit: 5 });
      const recentCtx = recentAll.map((d) => ({ date: d.date, quest: d.quest?.title, goalIndex: d.goalIndex, reflection: d.reflection }));
      for (const goalIndex of needySlots) {
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
        const created = await db.createQuest(req.userId, goalIndex, todayKey(), { quest: result.quest, insight: result.insight });
        openQuests.push(created);
      }
      await db.updateState(req.userId, {
        stats: state.stats,
        chapterNumber: state.chapterNumber,
        chapterTitle: state.chapterTitle,
        growthSessions: state.growthSessions,
        pathwayNoun: state.pathwayNoun,
      });
      openQuests.sort((a, b) => (a.goalIndex ?? -1) - (b.goalIndex ?? -1));
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
      goals: fresh.goals,
      openQuests,
      history: await db.allHistory(req.userId, 8),
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
        // reps") for its mentorReply on structured quests - scoped to this
        // SAME goal, so a different goal's numbers never bleed into it.
        recentDays: structuredClean ? await db.recentDays(req.userId, { goalIndex: day.goalIndex, excludeId: day.id, limit: 7 }) : undefined,
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
    await db.saveReflection(req.userId, day.id, reflection);
    await db.updateState(req.userId, {
      stats: newStats,
      chapterNumber: allowAdvance ? state.chapterNumber + 1 : state.chapterNumber,
      chapterTitle: allowAdvance && newChapterTitle ? newChapterTitle : state.chapterTitle,
      growthSessions: newGrowthSessions,
      pathwayNoun: state.pathwayNoun,
    });

    // Client holds this in a "completedResult" acknowledgment card before
    // swapping to the next quest - under the per-goal model a completed
    // goal is instantly eligible for a new quest, so without this the
    // mentor's reply/deltas would flash away before the user could read them.
    res.json({ ok: true, status, mentorReply, deltas, structuredData: structuredClean || undefined });
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
