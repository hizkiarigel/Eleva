// Playwright + API e2e for the labora-chain completionType. Boots the real
// server keyless (job-match falls back to qualified:false - exactly what
// the auto-skip path needs) with ELEVA_YOUTUBE_STUB=1, against the scratch
// Postgres DB. Covers: chain checklist/CTA/eyebrow on the dashboard, step 1
// video-quiz pass advancing WITHOUT a reflection, step 2 job-match
// (unqualified) auto-skipping the submit step and completing the chain with
// ONE reflection, the qualified-submit path incrementing the Milestone, and
// the wrong-step / unqualified-gate guards.
//
// Run: node tests/laborachain.e2e.js

const assert = require("assert");
const { spawn } = require("child_process");
const { chromium } = require("playwright-core");
const { Client } = require("pg");

const PORT = 3995;
const BASE = `http://localhost:${PORT}`;
const CHROMIUM = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";
const VIDEO_URL = "https://youtu.be/dQw4w9WgXcQ";

// Keyless VIDEO_QUIZ_FALLBACK answer key (server/claude.js) - same map as
// tests/videoquiz.e2e.js.
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

  const email = `chain-e2e-${Date.now()}@example.com`;
  let cookieHeader = "";
  async function call(path, body, method = "POST") {
    const res = await fetch(`${BASE}${path}`, {
      method, headers: { "Content-Type": "application/json", cookie: cookieHeader },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const setCookie = res.headers.getSetCookie?.() || [];
    if (setCookie.length) cookieHeader = setCookie.map((c) => c.split(";")[0]).join("; ");
    const data = await res.json().catch(() => ({}));
    data._status = res.status;
    return data;
  }
  await call("/api/signup", { email, password: "password123", betaCode: "TESTCODE" });
  await call("/api/profile", {
    name: "Chain Tester",
    radarSnapshot: { body: 5, growth: 5, livelihood: 5, emotional: 5, social: 5, purpose: 5, autonomy: 5 },
    pathway: "Architect",
    goals: ["dapat kerja remote sebagai data analyst"],
  });

  const sql = new Client({ connectionString: env.DATABASE_URL });
  await sql.connect();
  const { rows: userRows } = await sql.query("SELECT id FROM users WHERE email = $1", [email]);
  const userId = userRows[0].id;

  const chainStep = (feature, extra) => ({ feature, status: "pending", result: null, note: null, ...extra });
  async function seedChainQuest(laboraChain, title) {
    const quest = {
      mode: "quest", completionType: "labora-chain", structuredKind: null,
      evidenceSchema: null, practiceTestSchema: null,
      videoQuiz: { topic: "Data Entry Fundamentals", passThreshold: 11, estimatedMinutes: 25 },
      laboraChain,
      title, description: "Rantai LABORA hari ini.", statFocus: "livelihood", why: "test",
    };
    const { rows } = await sql.query(
      `INSERT INTO days (user_id, goal_index, date, quest, insight, reflection, is_side_quest, is_meta)
       VALUES ($1, 0, '2026-08-19', $2, NULL, NULL, false, false) RETURNING id`,
      [userId, quest]
    );
    return rows[0].id;
  }

  const chain1 = {
    currentIndex: 0,
    steps: [
      chainStep("video-quiz", { status: "active" }),
      chainStep("job-match-analysis"),
      chainStep("job-application-submit"),
    ],
  };
  const questId = await seedChainQuest(chain1, "Percepat Job Hunt: 3 langkah");

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
  }

  console.log("E2E: chain dashboard (checklist, CTA, eyebrow)");
  await test("detail panel shows step checklist, step CTA, and the feature-named eyebrow", async () => {
    await openQuestCta(questId);
    assert.ok(await page.locator("text=LIVELIHOOD: VIDEO QUEST · LANGKAH 1/3").count(), "eyebrow must name the current feature + step");
    assert.ok(await page.locator(`[data-reflect-id="${questId}"]:has-text("Mulai: Video Quest")`).count(), "CTA must name step 1");
    assert.ok(await page.locator("text=Langkah 1: Video Quest").count(), "checklist step 1 missing");
    assert.ok(await page.locator("text=Langkah 2: Job Match").count(), "checklist step 2 missing");
    assert.ok(await page.locator("text=Langkah 3: Submit Application").count(), "checklist step 3 missing");
  });

  console.log("E2E: step 1 - video-quiz pass advances the chain, no reflection yet");
  await test("vq validate/start/submit under a chain: pass = step done, quest stays open", async () => {
    const v = await call("/api/video-quiz/validate", { questId, videoUrl: VIDEO_URL });
    assert.strictEqual(v.relevant, true, JSON.stringify(v));
    const s = await call("/api/video-quiz/start", { questId });
    assert.strictEqual(s.questions.length, 15, JSON.stringify(s).slice(0, 200));
    const sub = await call("/api/video-quiz/submit", { questId, answers: FALLBACK_KEY });
    assert.strictEqual(sub.passed, true);
    assert.strictEqual(sub.chain.completed, false);
    assert.strictEqual(sub.chain.nextFeature, "job-match-analysis");
    assert.deepStrictEqual(sub.deltas, {}, "no growth until the chain finishes");
    const { rows } = await sql.query("SELECT reflection, quest FROM days WHERE id = $1", [questId]);
    assert.strictEqual(rows[0].reflection, null, "chain must NOT write a reflection mid-way");
    assert.strictEqual(rows[0].quest.laboraChain.currentIndex, 1);
    assert.strictEqual(rows[0].quest.laboraChain.steps[0].status, "done");
    assert.strictEqual(rows[0].quest.laboraChain.steps[0].result.score, 15);
  });

  await test("dashboard now shows step 2 CTA + eyebrow LANGKAH 2/3", async () => {
    await openQuestCta(questId);
    assert.ok(await page.locator("text=LIVELIHOOD: JOB MATCH · LANGKAH 2/3").count(), "eyebrow must advance to step 2");
    assert.ok(await page.locator(`[data-reflect-id="${questId}"]:has-text("Lanjut: Job Match")`).count(), "CTA must read Lanjut: Job Match");
    assert.ok(await page.locator("text=✓ Langkah 1: Video Quest — lulus 15/15").count(), "done step must show its score");
  });

  console.log("E2E: step 2 - unqualified job-match auto-skips submit and completes the chain");
  let cvArtifactId = null;
  await test("job-match under a chain (keyless => qualified:false) completes with ONE reflection, submit skipped", async () => {
    const art = await call("/api/artifacts", { type: "cv", text: "CV data analyst: SQL, Excel, Tableau, pengalaman 2 tahun mengelola data entry dan dashboard." });
    cvArtifactId = art.artifact.id;
    const resp = await call("/api/job-match/analyze", { questId, cvArtifactId, images: [{ mimeType: "image/png", dataBase64: "aGVsbG8=" }] });
    assert.strictEqual(resp.ok, true, JSON.stringify(resp).slice(0, 300));
    assert.strictEqual(resp.result.qualified, false, "keyless fallback must be unqualified");
    assert.strictEqual(resp.chain.completed, true, "unqualified jm + submit next => auto-skip completes the chain");
    const { rows } = await sql.query("SELECT reflection, quest FROM days WHERE id = $1", [questId]);
    const refl = rows[0].reflection;
    assert.ok(refl, "final reflection must exist");
    assert.strictEqual(refl.status, "COMPLETED");
    assert.ok(Array.isArray(refl.laboraChainResult) && refl.laboraChainResult.length === 3);
    assert.strictEqual(refl.videoQuizResult.score, 15);
    assert.strictEqual(refl.jobMatchResult.qualified, false);
    assert.strictEqual(refl.jobApplicationSubmit, undefined, "skipped submit must not fabricate an application");
    assert.strictEqual(rows[0].quest.laboraChain.steps[2].status, "skipped");
    // Milestone exists (auto-created on first analysis) but count untouched.
    const { rows: cs } = await sql.query("SELECT goal_targets FROM character_state WHERE user_id = $1", [userId]);
    assert.strictEqual(cs[0].goal_targets["0"].metrics.currentCount, 0, "skipped submit must not increment the Milestone");
    // Quest is closed.
    const state = await call("/api/state", null, "GET");
    assert.ok(!(state.openQuests || []).some((q) => q.id === questId), "chain quest must be closed");
  });

  console.log("E2E: qualified-submit path + guards");
  let questId2 = null;
  await test("chain at the submit step with a qualified in-chain job-match: submit completes + increments the Milestone", async () => {
    const chain2 = {
      currentIndex: 2,
      steps: [
        chainStep("video-quiz", { status: "done", result: { topic: "Data Entry Fundamentals", videoTitle: "Stub", score: 13, total: 15, passThreshold: 11, attempt: 1, strongConcepts: ["a"], weakConcepts: [] } }),
        chainStep("job-match-analysis", { status: "done", result: { matchTable: [], matchScore: 85, qualified: true, verdict: "lolos", relevanceNote: "", nextStep: "", ts: "2026-08-19T00:00:00Z" } }),
        chainStep("job-application-submit", { status: "active" }),
      ],
    };
    questId2 = await seedChainQuest(chain2, "Percepat Job Hunt: submit");
    const resp = await call("/api/job-application/submit", {
      questId: questId2, cvArtifactId,
      companyName: "PT Data Sejahtera", roleTitle: "Data Analyst", dateApplied: "2026-08-19",
      submissionProof: "Email konfirmasi dari HR: REF-2026-0819-DA",
    });
    assert.strictEqual(resp.ok, true, JSON.stringify(resp).slice(0, 300));
    assert.strictEqual(resp.chain.completed, true);
    const { rows } = await sql.query("SELECT reflection FROM days WHERE id = $1", [questId2]);
    const refl = rows[0].reflection;
    assert.strictEqual(refl.jobMatchResult.qualified, true);
    assert.strictEqual(refl.jobApplicationSubmit.companyName, "PT Data Sejahtera");
    const { rows: cs } = await sql.query("SELECT goal_targets FROM character_state WHERE user_id = $1", [userId]);
    assert.strictEqual(cs[0].goal_targets["0"].metrics.currentCount, 1, "qualified chain submit must increment the Milestone");
  });

  await test("guard: calling the wrong feature for the current step is a 400", async () => {
    const chain3 = {
      currentIndex: 0,
      steps: [chainStep("video-quiz", { status: "active" }), chainStep("job-match-analysis")],
    };
    const questId3 = await seedChainQuest(chain3, "Guard chain");
    const resp = await call("/api/job-match/analyze", { questId: questId3, cvArtifactId, images: [{ mimeType: "image/png", dataBase64: "aGVsbG8=" }] });
    assert.strictEqual(resp._status, 400, JSON.stringify(resp));
    assert.ok(/bukan tipe Job Match/.test(resp.error || ""));
  });

  await test("guard: submit with an UNQUALIFIED in-chain job-match is a 400", async () => {
    const chain4 = {
      currentIndex: 2,
      steps: [
        chainStep("video-quiz", { status: "done", result: { score: 12, total: 15 } }),
        chainStep("job-match-analysis", { status: "done", result: { matchTable: [], matchScore: 40, qualified: false, verdict: "", relevanceNote: "", nextStep: "" } }),
        chainStep("job-application-submit", { status: "active" }),
      ],
    };
    const questId4 = await seedChainQuest(chain4, "Guard unqualified");
    const resp = await call("/api/job-application/submit", {
      questId: questId4, cvArtifactId,
      companyName: "PT X", roleTitle: "Analyst", dateApplied: "2026-08-19",
      submissionProof: "REF-123456789",
    });
    assert.strictEqual(resp._status, 400, JSON.stringify(resp));
    assert.ok(/LOLOS \(qualified\)/.test(resp.error || ""));
  });

  await browser.close();
  await sql.end();
  server.kill();

  if (failures) {
    console.error(`\n${failures} e2e test(s) failed`);
    process.exit(1);
  }
  console.log("\nall laborachain e2e tests passed");
})().catch((e) => {
  console.error("e2e harness crashed:", e);
  process.exit(1);
});
