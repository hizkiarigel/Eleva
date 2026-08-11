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
          // Fokus 2.2/2.3: once a goal has a persistent target, its next
          // quest is a step TOWARD that target, not a fresh assumption it's
          // already met - generateQuest's prompt references this instead of
          // treating every quest as a clean slate.
          currentTarget: goalIndex != null ? state.goalTargets?.[String(goalIndex)] : undefined,
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
      goalTargets: fresh.goalTargets,
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
        recentDays: recentGoalDays,
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
    res.json({ ok: true, status, mentorReply, deltas, structuredData: structuredClean || undefined, targetScreen });
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

    const practiceState = (day.goalIndex != null && state.practiceTest?.[String(day.goalIndex)]) || { level: 1, history: [] };
    const result = await ai.generatePracticeTest({
      kind, track, level: practiceState.level || 1,
      history: (practiceState.history || []).slice(-5),
      goalText: day.goalIndex != null ? state.goals?.[day.goalIndex] : undefined,
      pathway: state.pathway,
    });
    const payload = { kind, track, ...result };
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

    const recentGoalDays = day.goalIndex != null ? await db.recentDays(req.userId, { goalIndex: day.goalIndex, excludeId: day.id, limit: 7 }) : undefined;
    const ctx = {
      profile: { name: state.profile.name, originStory: state.profile.originStory || state.profile.situation },
      quest: day.quest,
      status: "done",
      // Distinct from structuredData - see processReflection's evaluationRules
      // branch in claude.js. Objective evidence, no growth-gate needed.
      practiceTestResult: { kind: payload.kind, track: payload.track, score: graded.correct, total: graded.total },
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
    const allowAdvance = result.chapterAdvance && newGrowthSessions > 0 && newGrowthSessions % 5 === 0;

    const reflection = {
      status: "done", text: "",
      practiceTestResult: { kind: payload.kind, track: payload.track, score: graded.correct, total: graded.total },
      deltas, mentorReply: result.mentorReply, timestamp: new Date().toISOString(),
    };
    await db.saveReflection(req.userId, day.id, reflection);
    await db.updateState(req.userId, {
      stats: newStats,
      chapterNumber: allowAdvance ? state.chapterNumber + 1 : state.chapterNumber,
      chapterTitle: allowAdvance && result.newChapterTitle ? result.newChapterTitle : state.chapterTitle,
      growthSessions: newGrowthSessions,
      pathwayNoun: state.pathwayNoun,
    });

    // Progressive difficulty (founder spec): level always moves up by one on
    // completion, regardless of score - "quest berikutnya otomatis lebih
    // sulit sedikit dari level ini, TIDAK reset ke level dasar." History is
    // capped so the column can't grow unbounded over a long First Trial.
    if (day.goalIndex != null) {
      const practiceState = state.practiceTest?.[String(day.goalIndex)] || { level: 1, history: [] };
      const history = [...(practiceState.history || []), { ts: new Date().toISOString(), testKind: payload.kind, track: payload.track, score: graded.correct, total: graded.total }].slice(-20);
      await db.setPracticeTestState(req.userId, day.goalIndex, { level: (practiceState.level || 1) + 1, history });
    }

    res.json({ ok: true, score: graded.correct, total: graded.total, wrong: graded.wrong, mentorReply: result.mentorReply, deltas });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal menyimpan hasil tes." });
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
