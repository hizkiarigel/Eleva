require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieSession = require("cookie-session");
const db = require("./db");
const auth = require("./auth");
const ai = require("./claude");
const safety = require("./safety");

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

// --- App routes (all require auth, all scoped by req.userId from session) ---

// Full app state for the frontend: profile, stats, chapter, today's day, aiActive flag
app.get("/api/state", requireAuth, async (req, res) => {
  try {
    const state = await db.getState(req.userId);
    if (!state || !state.profile) return res.json({ profile: null });

    const tk = todayKey();
    let today = await db.getDay(req.userId, tk);
    if (!today) {
      const ctx = {
        profile: state.profile,
        pathway: state.pathway,
        pathwayNoun: state.pathwayNoun,
        stats: state.stats,
        chapterNumber: state.chapterNumber,
        chapterTitle: state.chapterTitle,
        recentDays: await db.recentDays(req.userId, tk, 3),
        today: tk,
      };
      const result = await ai.generateQuest(ctx);
      await db.updateState(req.userId, {
        stats: state.stats,
        chapterNumber: result.chapterNumber || state.chapterNumber,
        chapterTitle: result.chapterTitle || state.chapterTitle,
        growthSessions: state.growthSessions,
        pathwayNoun: state.pathwayNoun || result.pathwayNoun || null,
      });
      await db.upsertDay(req.userId, tk, { quest: result.quest, insight: result.insight, reflection: null });
      today = await db.getDay(req.userId, tk);
    }

    const fresh = await db.getState(req.userId);
    res.json({
      profile: fresh.profile,
      stats: fresh.stats,
      chapterNumber: fresh.chapterNumber,
      chapterTitle: fresh.chapterTitle,
      growthSessions: fresh.growthSessions,
      pathwayNoun: fresh.pathwayNoun,
      today: { date: tk, ...today },
      history: (await db.allHistory(req.userId, tk)).slice(0, 8),
      aiActive: ai.hasKey(),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal memuat state." });
  }
});

// Create profile + first quest
app.post("/api/profile", requireAuth, async (req, res) => {
  try {
    const { name, situation, values, fear, stats: rawStats, pathway: rawPathway, pathwayCustom } = req.body;
    if (!name || !situation) return res.status(400).json({ error: "Nama dan situasi wajib diisi." });

    const pathway = rawPathway === "Specialist" ? ((pathwayCustom || "").trim() || "Specialist") : rawPathway || null;

    const initialStats = {};
    Object.entries(rawStats || {}).forEach(([k, v]) => {
      initialStats[k] = Math.round(Number(v) * 10);
    });
    const profile = { name, situation, values, fear, createdAt: new Date().toISOString() };
    const ctx = { profile, pathway, pathwayNoun: null, stats: initialStats, chapterNumber: null, chapterTitle: null, recentDays: [], today: todayKey() };
    const result = await ai.generateQuest(ctx);

    await db.createState(req.userId, {
      profile,
      stats: initialStats,
      chapterNumber: result.chapterNumber || 1,
      chapterTitle: result.chapterTitle || "Mencari Arah",
      pathway,
      pathwayNoun: result.pathwayNoun || pathway || null,
    });
    await db.upsertDay(req.userId, todayKey(), { quest: result.quest, insight: result.insight, reflection: null });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal membuat profil." });
  }
});

// Submit today's reflection
app.post("/api/reflection", requireAuth, async (req, res) => {
  try {
    const { status, text } = req.body;
    const tk = todayKey();
    const state = await db.getState(req.userId);
    const day = await db.getDay(req.userId, tk);
    if (!state || !day) return res.status(400).json({ error: "Belum ada quest hari ini." });

    const trimmedText = (text || "").trim();
    const inCrisis = safety.detectCrisis(trimmedText);

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
      const eligible = (status === "done" || status === "partial") && wordCount(text) >= 12;
      const ctx = {
        profile: { name: state.profile.name, situation: state.profile.situation },
        quest: day.quest,
        status,
        reflectionText: trimmedText,
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
      deltas,
      mentorReply,
      timestamp: new Date().toISOString(),
    };
    await db.upsertDay(req.userId, tk, { quest: day.quest, insight: day.insight, reflection });
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
