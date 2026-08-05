require("dotenv").config();
const express = require("express");
const path = require("path");
const db = require("./db");
const ai = require("./claude");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

function todayKey() {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, server local time
}
function wordCount(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

// Full app state for the frontend: profile, stats, chapter, today's day, aiActive flag
app.get("/api/state", async (req, res) => {
  try {
    const state = db.getState();
    if (!state || !state.profile) return res.json({ profile: null });

    const tk = todayKey();
    let today = db.getDay(tk);
    if (!today) {
      const ctx = {
        profile: state.profile,
        stats: state.stats,
        chapterNumber: state.chapterNumber,
        chapterTitle: state.chapterTitle,
        recentDays: db.recentDays(tk, 3),
        today: tk,
      };
      const result = await ai.generateQuest(ctx);
      if (result.chapterNumber || result.chapterTitle) {
        db.updateState({
          stats: state.stats,
          chapterNumber: result.chapterNumber || state.chapterNumber,
          chapterTitle: result.chapterTitle || state.chapterTitle,
          growthSessions: state.growthSessions,
        });
      }
      db.upsertDay(tk, { quest: result.quest, insight: result.insight, reflection: null });
      today = db.getDay(tk);
    }

    const fresh = db.getState();
    res.json({
      profile: fresh.profile,
      stats: fresh.stats,
      chapterNumber: fresh.chapterNumber,
      chapterTitle: fresh.chapterTitle,
      growthSessions: fresh.growthSessions,
      today: { date: tk, ...today },
      history: db.allHistory(tk).slice(0, 8),
      aiActive: ai.hasKey(),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal memuat state." });
  }
});

// Create profile + first quest
app.post("/api/profile", async (req, res) => {
  try {
    const { name, situation, values, fear, stats: rawStats } = req.body;
    if (!name || !situation) return res.status(400).json({ error: "Nama dan situasi wajib diisi." });

    const initialStats = {};
    Object.entries(rawStats || {}).forEach(([k, v]) => {
      initialStats[k] = Math.round(Number(v) * 10);
    });
    const profile = { name, situation, values, fear, createdAt: new Date().toISOString() };
    const ctx = { profile, stats: initialStats, chapterNumber: null, chapterTitle: null, recentDays: [], today: todayKey() };
    const result = await ai.generateQuest(ctx);

    db.createState({
      profile,
      stats: initialStats,
      chapterNumber: result.chapterNumber || 1,
      chapterTitle: result.chapterTitle || "Mencari Arah",
    });
    db.upsertDay(todayKey(), { quest: result.quest, insight: result.insight, reflection: null });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal membuat profil." });
  }
});

// Submit today's reflection
app.post("/api/reflection", async (req, res) => {
  try {
    const { status, text } = req.body;
    const tk = todayKey();
    const state = db.getState();
    const day = db.getDay(tk);
    if (!state || !day) return res.status(400).json({ error: "Belum ada quest hari ini." });

    const eligible = (status === "done" || status === "partial") && wordCount(text) >= 12;
    const ctx = {
      profile: { name: state.profile.name, situation: state.profile.situation },
      quest: day.quest,
      status,
      reflectionText: (text || "").trim(),
      stats: state.stats,
      growthSessions: state.growthSessions,
    };
    const result = await ai.processReflection(ctx);
    const deltas = eligible ? (result.statDeltas || {}) : {};

    const newStats = { ...state.stats };
    Object.entries(deltas).forEach(([k, v]) => {
      if (newStats[k] !== undefined && typeof v === "number") {
        newStats[k] = Math.max(0, Math.min(100, newStats[k] + Math.max(0, Math.min(5, Math.round(v)))));
      }
    });
    const newGrowthSessions = state.growthSessions + (eligible && Object.keys(deltas).length > 0 ? 1 : 0);
    const allowAdvance = result.chapterAdvance && newGrowthSessions > 0 && newGrowthSessions % 5 === 0;

    const reflection = {
      status,
      text: (text || "").trim(),
      deltas,
      mentorReply: eligible
        ? result.mentorReply
        : "Coba ceritain lebih banyak apa yang sebenarnya terjadi — segelintir kata belum cukup buat pertumbuhan kelihatan nyata (dan itu memang sengaja begitu).",
      timestamp: new Date().toISOString(),
    };
    db.upsertDay(tk, { quest: day.quest, insight: day.insight, reflection });
    db.updateState({
      stats: newStats,
      chapterNumber: allowAdvance ? state.chapterNumber + 1 : state.chapterNumber,
      chapterTitle: allowAdvance && result.newChapterTitle ? result.newChapterTitle : state.chapterTitle,
      growthSessions: newGrowthSessions,
    });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Gagal menyimpan refleksi." });
  }
});

app.post("/api/reset", (req, res) => {
  db.resetAll();
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Eleva jalan di http://localhost:${PORT}`));
