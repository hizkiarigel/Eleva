// Playwright e2e for the Video Quest (video-quiz) completionType. Boots the
// real server keyless (so /start serves VIDEO_QUIZ_FALLBACK, whose answer
// key this test knows) with ELEVA_YOUTUBE_STUB=1 (no YouTube traffic - the
// validate route gets a fixed transcript fixture), against the scratch
// Postgres DB, and drives a real Chromium through: intro → pilih materi →
// periksa → materi siap → lock+assessment → review gating → fail (no key
// leak) → reload/resume on the locked view → Ulang Assessment → pass →
// pembahasan → quest complete. Plus the META LABORA "Video Quest" row.
//
// Run: node tests/videoquiz.e2e.js
// Requires: local Postgres (same TEST_DATABASE_URL convention as
// tests/practicetest.js) and the preinstalled Playwright Chromium.

const assert = require("assert");
const { spawn } = require("child_process");
const { chromium } = require("playwright-core");
const { Client } = require("pg");

const PORT = 3996;
const BASE = `http://localhost:${PORT}`;
const CHROMIUM = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";
const VIDEO_URL = "https://youtu.be/dQw4w9WgXcQ";

// The keyless VIDEO_QUIZ_FALLBACK's answer key (server/claude.js) - if the
// fixture changes, update this map (the pass-path test will fail loudly).
const FALLBACK_KEY = {
  q1: ["a"], q2: ["b"], q3: ["b"], q4: ["b"], q5: ["b"], q6: ["b"], q7: ["b"],
  q8: ["b"], q9: ["b"], q10: ["a"], q11: ["b"], q12: ["b"], q13: ["b"], q14: ["b"],
  q15: ["a", "b", "c"],
};

let failures = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`  ok - ${name}`);
  } catch (e) {
    failures += 1;
    console.error(`  FAIL - ${name}: ${e.message}`);
  }
}

(async () => {
  const env = {
    ...process.env,
    DATABASE_URL: process.env.TEST_DATABASE_URL || "postgres://postgres:testpass@localhost:5432/eleva_test",
    SESSION_SECRET: "testsecret", BETA_CODE: "TESTCODE", PORT: String(PORT),
    ELEVA_YOUTUBE_STUB: "1",
  };
  delete env.ANTHROPIC_API_KEY;

  const server = spawn("node", ["server/index.js"], { env, stdio: ["ignore", "pipe", "pipe"] });
  let serverLog = "";
  server.stdout.on("data", (d) => { serverLog += d; });
  server.stderr.on("data", (d) => { serverLog += d; });
  await new Promise((resolve, reject) => {
    const deadline = Date.now() + 15000;
    (function poll() {
      fetch(`${BASE}/`).then(() => resolve()).catch(() => {
        if (Date.now() > deadline) return reject(new Error(`server never came up:\n${serverLog}`));
        setTimeout(poll, 300);
      });
    })();
  });

  const email = `vq-e2e-${Date.now()}@example.com`;
  let cookieHeader = "";
  async function call(path, body, method = "POST") {
    const res = await fetch(`${BASE}${path}`, {
      method, headers: { "Content-Type": "application/json", cookie: cookieHeader },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const setCookie = res.headers.getSetCookie?.() || [];
    if (setCookie.length) cookieHeader = setCookie.map((c) => c.split(";")[0]).join("; ");
    return res.json().catch(() => ({}));
  }
  await call("/api/signup", { email, password: "password123", betaCode: "TESTCODE" });
  await call("/api/profile", {
    name: "VQ Tester",
    radarSnapshot: { body: 5, growth: 5, livelihood: 5, emotional: 5, social: 5, purpose: 5, autonomy: 5 },
    pathway: "Architect",
    goals: ["paham dasar data entry"],
  });

  const sql = new Client({ connectionString: env.DATABASE_URL });
  await sql.connect();
  const { rows: userRows } = await sql.query("SELECT id FROM users WHERE email = $1", [email]);
  const userId = userRows[0].id;

  const quest = {
    mode: "quest", completionType: "video-quiz", structuredKind: null,
    evidenceSchema: null, practiceTestSchema: null,
    videoQuiz: { topic: "Data Entry Fundamentals", passThreshold: 11, estimatedMinutes: 25 },
    title: "Video Quest: Data Entry", description: "Belajar dari satu video pilihanmu.",
    statFocus: "growth", why: "test",
  };
  const { rows: dayRows } = await sql.query(
    `INSERT INTO days (user_id, goal_index, date, quest, insight, reflection, is_side_quest, is_meta)
     VALUES ($1, 0, '2026-08-19', $2, NULL, NULL, false, false) RETURNING id`,
    [userId, quest]
  );
  const questId = dayRows[0].id;

  const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
  const context = await browser.newContext({ baseURL: BASE });
  const cookies = cookieHeader.split("; ").map((pair) => {
    const eq = pair.indexOf("=");
    return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: BASE };
  });
  await context.addCookies(cookies);
  const page = await context.newPage();

  async function openDashboard() {
    await page.goto(BASE);
    await page.waitForSelector("[data-reflect-id]", { timeout: 20000 });
  }
  async function openQuestCta(id) {
    await openDashboard();
    for (let idx = 0; idx < 5; idx++) {
      if (await page.locator(`[data-reflect-id="${id}"]`).count()) break;
      const card = page.locator(`[data-qhub-idx="${idx}"]`);
      if (await card.count()) await card.click();
    }
    await page.click(`[data-reflect-id="${id}"]`);
  }
  // Answer the CURRENT question by option ids, then advance.
  async function answerCurrentAndNext(optionIds) {
    for (const oid of optionIds) {
      await page.click(`.vq-option[data-vq-value="${oid}"]`);
    }
    await page.click("#vqNext");
  }
  async function runAssessment(answerFor) {
    await page.waitForSelector(".vq-option", { timeout: 20000 });
    for (let i = 1; i <= 15; i++) {
      await page.waitForSelector(`text=Soal ${i} dari 15`, { timeout: 20000 });
      await answerCurrentAndNext(answerFor(`q${i}`));
    }
    await page.waitForSelector("#vqSubmit", { timeout: 20000 });
  }

  console.log("E2E: intro → pilih materi → periksa → materi siap → lock");
  await test("CTA opens the intro with topic + pass bar, inside normal chrome", async () => {
    await openQuestCta(questId);
    await page.waitForSelector("#vqStart", { timeout: 20000 });
    assert.ok(await page.locator("text=Data Entry Fundamentals").count(), "topic missing");
    assert.ok(await page.locator("text=≥11").count(), "pass bar missing");
    assert.ok(await page.locator(".app-shell").count(), "intro must render inside chrome");
  });

  await test("pilih materi validates the link and reaches materi siap (stubbed YouTube, keyless-permissive relevance)", async () => {
    await page.click("#vqStart");
    await page.waitForSelector("#vqUrlInput", { timeout: 20000 });
    assert.strictEqual(await page.locator(".app-shell").count(), 0, "pick step must be chrome-free");
    await page.fill("#vqUrlInput", VIDEO_URL);
    await page.click("#vqCheckBtn");
    await page.waitForSelector("#vqBeginAssessment", { timeout: 20000 });
    assert.ok(await page.locator("text=Materi siap").count(), "materi siap missing");
    assert.ok(await page.locator("#vqSwap").count(), "Ganti Video must still be offered pre-lock");
  });

  await test("an invalid link is rejected with the Indonesian error copy", async () => {
    await page.click("#vqSwap");
    await page.waitForSelector("#vqUrlInput", { timeout: 20000 });
    await page.fill("#vqUrlInput", "https://vimeo.com/12345");
    await page.click("#vqCheckBtn");
    await page.waitForSelector("text=Link YouTube tidak valid", { timeout: 20000 });
    // restore the good candidate for the rest of the run
    await page.fill("#vqUrlInput", VIDEO_URL);
    await page.click("#vqCheckBtn");
    await page.waitForSelector("#vqBeginAssessment", { timeout: 20000 });
  });

  await test("manual transcript is accepted, sanitized, and marked source:manual", async () => {
    const manual = "0:00 halo semua selamat datang 0:07 di materi data entry kali ini kita membahas dasar-dasar spreadsheet 0:15 mulai dari format sel validasi data sampai kebiasaan verifikasi " +
      "12:34 praktik terbaiknya adalah mulai dari kasus kecil verifikasi hasil di setiap langkah dan dokumentasikan prosesnya supaya bisa ditelusuri ulang oleh siapa pun di tim kamu";
    const resp = await call("/api/video-quiz/validate", { questId, videoUrl: VIDEO_URL, manualTranscript: manual });
    assert.strictEqual(resp.relevant, true, JSON.stringify(resp));
    const { rows } = await sql.query("SELECT video_quiz_payload FROM days WHERE id = $1", [questId]);
    const cand = rows[0].video_quiz_payload.candidate;
    assert.strictEqual(cand.source, "manual");
    assert.ok(!/\d{1,2}:\d{2}/.test(cand.transcript), "timestamps must be stripped");
    assert.ok(cand.transcript.includes("dasar-dasar spreadsheet"));
  });

  await test("a too-short manual transcript is rejected with 400", async () => {
    const resp = await call("/api/video-quiz/validate", { questId, videoUrl: VIDEO_URL, manualTranscript: "0:00 terlalu pendek" });
    assert.ok(/terlalu pendek/.test(resp.error || ""), JSON.stringify(resp));
    // restore the stubbed auto candidate for the rest of the run
    const auto = await call("/api/video-quiz/validate", { questId, videoUrl: VIDEO_URL });
    assert.strictEqual(auto.relevant, true);
  });

  await test("Mulai Assessment locks the source and serves 15 stripped questions", async () => {
    await page.click("#vqBeginAssessment");
    await page.waitForSelector(".vq-option", { timeout: 20000 });
    assert.ok(await page.locator("text=Soal 1 dari 15").count(), "question header missing");
    assert.ok(await page.locator("#vqLockBtn").count(), "lock icon missing");
    // Server-side: lock persisted to videoQuizState, answer key NOT in quest.
    const state = await call("/api/state", null, "GET");
    const day = (state.openQuests || []).find((q) => q.id === questId);
    assert.ok(day.quest.videoQuizState?.lockedVideoUrl, "lock not persisted");
    assert.strictEqual(JSON.stringify(day.quest).includes("correct"), false, "quest jsonb must not carry answers");
    assert.strictEqual(JSON.stringify(day.quest).includes("transcript"), false, "quest jsonb must not carry the transcript");
    // /start (resume) responses are stripped of the key.
    const resume = await call("/api/video-quiz/start", { questId });
    assert.strictEqual(resume.questions.length, 15);
    resume.questions.forEach((q) => {
      assert.strictEqual(q.correct, undefined, "resume leaked correct");
      assert.strictEqual(q.explanation, undefined, "resume leaked explanation");
    });
  });

  console.log("E2E: locked re-validation rejection + reload resume");
  await test("a new URL is rejected once locked", async () => {
    const resp = await call("/api/video-quiz/validate", { questId, videoUrl: "https://youtu.be/aaaaaaaaaaa" });
    assert.ok(/sudah dikunci/.test(resp.error || ""), `expected lock rejection, got: ${JSON.stringify(resp)}`);
  });

  await test("reload mid-assessment lands on the locked view and resumes the same set (no re-validation)", async () => {
    await openQuestCta(questId);
    await page.waitForSelector("#vqResume", { timeout: 20000 });
    assert.strictEqual(await page.locator("#vqUrlInput").count(), 0, "must never return to pick once locked");
    assert.ok(await page.locator("text=Materi dikunci untuk quest ini").count(), "locked copy missing");
    await page.click("#vqResume");
    await page.waitForSelector("text=Soal 1 dari 15", { timeout: 20000 });
  });

  console.log("E2E: navigator + review gating");
  await test("navigator jumps and Kirim Jawaban stays disabled until 15/15", async () => {
    // Answer only q1, then jump to the last question and try to review.
    await answerCurrentAndNext(["d"]); // q1 answered (wrong on purpose), now at q2
    await page.click("#vqNavBtn");
    await page.waitForSelector("[data-vq-jump]", { timeout: 20000 });
    await page.click('[data-vq-jump="14"]');
    await page.waitForSelector("text=Soal 15 dari 15", { timeout: 20000 });
    assert.ok(await page.locator("text=PILIH SEMUA JAWABAN YANG BENAR").count(), "q15 must be the multi-select");
    await page.click("#vqNext");
    await page.waitForSelector("#vqSubmit", { timeout: 20000 });
    assert.ok(await page.locator("#vqSubmit[disabled]").count(), "Kirim must be disabled below 15/15");
    assert.ok(await page.locator("text=1 dari 15 soal telah dijawab").count(), "answered count wrong");
  });

  console.log("E2E: fail path (no key leak) → Ulang Assessment");
  await test("all-wrong answers fail with FOKUS ULANG chips and no answer leak", async () => {
    // Jump back to q1 and answer everything wrong ("d" singles, "e" multi).
    await page.click('[data-vq-jump="0"]');
    await runAssessment((qid) => (qid === "q15" ? ["e"] : ["d"]));
    assert.strictEqual(await page.locator("#vqSubmit[disabled]").count(), 0, "Kirim must enable at 15/15");
    await page.click("#vqSubmit");
    await page.click("#vqSubmitConfirm");
    await page.waitForSelector("text=BELUM LULUS", { timeout: 20000 });
    assert.ok(await page.locator("text=FOKUS ULANG").count(), "weak-concept chips missing");
    assert.ok(await page.locator("#vqStudyAgain").count() && await page.locator("#vqRetry").count(), "fail CTAs missing");
    assert.strictEqual(await page.locator("text=Pembahasan").count(), 0, "pembahasan must not exist pre-pass");
    // The fail response must not have leaked the key - re-check via API.
    const resp = await call("/api/video-quiz/submit", { questId, answers: { q1: ["d"] } });
    assert.strictEqual(resp.passed, false);
    assert.strictEqual(resp.review, undefined, "fail response leaked review");
    assert.strictEqual(JSON.stringify(resp).includes("explanation"), false, "fail response leaked explanations");
  });

  await test("Pelajari Lagi returns to the locked video, same source", async () => {
    await page.click("#vqStudyAgain");
    await page.waitForSelector("text=Materi dikunci untuk quest ini", { timeout: 20000 });
    assert.ok(await page.locator("text=FOKUS ULANG").count(), "locked view should surface the weak concepts after a fail");
    assert.ok(await page.locator("#vqRetry").count(), "Ulang Assessment missing on locked view");
  });

  await test("Ulang Assessment starts attempt 2 with reset answers on the same video", async () => {
    await page.click("#vqRetry");
    await page.waitForSelector("text=Soal 1 dari 15", { timeout: 20000 });
    assert.strictEqual(await page.locator(".vq-option.active").count(), 0, "answers must reset on retry");
    const state = await call("/api/state", null, "GET");
    const day = (state.openQuests || []).find((q) => q.id === questId);
    assert.strictEqual(day.quest.videoQuizState.attempt, 2, "attempt counter must increment");
    assert.ok(day.quest.videoQuizState.lockedVideoUrl, "lock must survive the retry");
  });

  console.log("E2E: pass path → pembahasan → quest complete");
  await test("answering with the fallback key passes and unlocks pembahasan", async () => {
    await runAssessment((qid) => FALLBACK_KEY[qid]);
    await page.click("#vqSubmit");
    await page.click("#vqSubmitConfirm");
    await page.waitForSelector("text=LULUS", { timeout: 30000 });
    assert.ok(await page.locator("text=15").count(), "score missing");
    assert.ok(await page.locator("text=KONSEP KUAT").count(), "strong-concept chips missing");
    await page.click("#vqPembahasan");
    await page.waitForSelector("text=Pembahasan", { timeout: 20000 });
    assert.strictEqual(await page.locator(".rdg-wrong").count(), 15, "pembahasan must review all 15");
  });

  await test("Selesaikan Quest closes the quest (reflection saved with videoQuizResult)", async () => {
    await page.click("#vqFinish");
    await page.waitForSelector(".app-shell", { timeout: 20000 });
    const state = await call("/api/state", null, "GET");
    assert.ok(!(state.openQuests || []).some((q) => q.id === questId), "quest must be closed after pass");
    const { rows } = await sql.query("SELECT reflection FROM days WHERE id = $1", [questId]);
    assert.strictEqual(rows[0].reflection.status, "COMPLETED");
    assert.strictEqual(rows[0].reflection.videoQuizResult.score, 15);
    assert.ok(rows[0].reflection.videoQuizResult.passThreshold >= 5);
  });

  console.log("E2E: META LABORA Video Quest row");
  await test("LABORA's Video Quest row asks for a topic, then opens the intro", async () => {
    await page.goto(BASE);
    await page.waitForSelector('[data-tab="meta"]', { timeout: 20000 });
    await page.click('[data-tab="meta"]');
    await page.waitForSelector(".meta-realm-card-tools-link", { timeout: 20000 });
    await page.click('[data-meta-realm-open="labora"]');
    await page.waitForSelector('[data-meta-tool="video-quest"]', { timeout: 20000 });
    await page.click('[data-meta-tool="video-quest"]');
    await page.waitForSelector("#metaVideoQuestTopic", { timeout: 20000 });
    await page.fill("#metaVideoQuestTopic", "Excel dasar untuk kerja");
    await page.click("#metaVideoQuestStart");
    await page.waitForSelector("#vqStart", { timeout: 20000 });
    assert.ok(await page.locator("text=Excel dasar untuk kerja").count(), "typed topic missing on intro");
  });

  await browser.close();
  await sql.end();
  server.kill();

  if (failures) {
    console.error(`\n${failures} e2e test(s) failed`);
    process.exit(1);
  }
  console.log("\nall videoquiz e2e tests passed");
})().catch((e) => {
  console.error("e2e harness crashed:", e);
  process.exit(1);
});
