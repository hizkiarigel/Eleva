// Playwright e2e for Task 14 (Livelihood Milestone, PRD.md section 26).
// Boots the real server keyless against the scratch Postgres DB, seeds
// Livelihood quests/Milestone state straight into `days`/`character_state`
// (same reason tests/practicetest.e2e.js does - the keyless AI path can't
// produce these completionTypes or a "qualified" verdict on its own), drives
// a real Chromium through the quest-context Milestone line, the Job Match
// Analysis result card, and the Submit Application form.
//
// Run: node tests/livelihood.e2e.js
// Requires: local Postgres (same TEST_DATABASE_URL convention as
// tests/practicetest.js) and the preinstalled Playwright Chromium at
// /opt/pw-browsers/chromium (no download - PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD).

const assert = require("assert");
const { spawn } = require("child_process");
const { chromium } = require("playwright-core");
const { Client } = require("pg");

const PORT = 3996;
const BASE = `http://localhost:${PORT}`;
const CHROMIUM = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";

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

  const email = `liv-e2e-${Date.now()}@example.com`;
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
    name: "Livelihood E2E",
    radarSnapshot: { body: 5, growth: 5, livelihood: 5, emotional: 5, social: 5, purpose: 5, autonomy: 5 },
    pathway: "Architect",
    goals: ["Dapat kerja remote sebagai Data Analyst atau setara"],
  });
  const cv = await call("/api/artifacts", { type: "cv", text: "Pengalaman 3 tahun data analyst, SQL, Python, Tableau." });
  const cvArtifactId = cv.artifact.id;

  const sql = new Client({ connectionString: env.DATABASE_URL });
  await sql.connect();
  const { rows: userRows } = await sql.query("SELECT id FROM users WHERE email = $1", [email]);
  const userId = userRows[0].id;

  async function insertQuest(completionType, title) {
    const quest = {
      mode: "quest", completionType, structuredKind: null, evidenceSchema: null, practiceTestSchema: null,
      title, description: "Cek lowongan atau catat lamaranmu.", statFocus: "livelihood", why: "test", goalIndex: 0,
    };
    const { rows } = await sql.query(
      `INSERT INTO days (user_id, goal_index, date, quest, insight, reflection, is_side_quest, is_meta)
       VALUES ($1, 0, '2026-08-12', $2, NULL, NULL, false, false) RETURNING id`,
      [userId, quest]
    );
    return rows[0].id;
  }
  async function seedQualifiedAnalysis() {
    const dayId = await insertQuest("job-match-analysis", "Cek Lowongan Data Analyst");
    const jobMatchResult = {
      matchTable: [{ skill: "SQL", status: "ada bukti", note: "n" }],
      matchScore: 85, qualified: true, verdict: "Siap apply sekarang", relevanceNote: "", nextStep: "n",
    };
    await sql.query(`UPDATE days SET reflection = $2 WHERE id = $1`, [
      dayId, { status: "COMPLETED", text: "", jobMatchResult, deltas: {}, timestamp: new Date().toISOString() },
    ]);
  }

  const jmQuest = await insertQuest("job-match-analysis", "Cek Lowongan Data Analyst");

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

  console.log("E2E: Job Match Analysis - no more badge, matchScore block instead");
  await test("running the analysis shows MATCH SCORE, no delta chip, and auto-creates the Milestone", async () => {
    await openDashboard();
    await page.click(`[data-reflect-id="${jmQuest}"]`);
    await page.waitForSelector("#jmJobFiles", { timeout: 20000 });
    // Fake a tiny 1x1 PNG upload via setInputFiles with an in-memory buffer.
    await page.setInputFiles("#jmJobFiles", {
      name: "posting.png", mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
    });
    await page.click("#jmAnalyze");
    await page.waitForSelector("text=MATCH SCORE", { timeout: 20000 });
    assert.strictEqual(await page.locator("text=Livelihood +3").count(), 0, "old badge must be gone");
    assert.strictEqual(await page.locator(".delta-chip").count(), 0, "no delta chip for job-match-analysis anymore");
    assert.ok(await page.locator("text=Qualified Applications").count(), "Milestone progress line missing");
    await page.click("#dismissCompleted");
  });

  await test("Livelihood quest still renders in the quest hub after the Home redesign (Milestone line is no longer shown on Home - dropped per the quest-hub design handoff, round 39)", async () => {
    await openDashboard();
    assert.ok(await page.locator("[data-qhub-idx]").count() >= 1, "expected at least one quest hub card to render");
  });

  console.log("E2E: Submit Application - structured form, Milestone increments");
  await test("submitting a validated application increments the counter and shows a summary line", async () => {
    await seedQualifiedAnalysis();
    const submitQuest = await insertQuest("job-application-submit", "Siapkan & Submit Application");
    await openDashboard();
    // Select the quest hub card by its title text rather than position - the
    // GET /api/state needy-slot auto-refill (server/index.js) may have
    // already generated a filler quest for this same goalIndex between the
    // previous test's dashboard load and this one, so submitQuest is not
    // guaranteed to land at card index 0 anymore now that only the selected
    // card's detail panel exposes [data-reflect-id].
    await page.click('.qhub-card:has-text("Siapkan & Submit Application")');
    await page.click(`[data-reflect-id="${submitQuest}"]`);
    await page.waitForSelector("#jaSubmit", { timeout: 20000 });
    await page.fill('[data-jaf="companyName"]', "Acme Corp");
    await page.fill('[data-jaf="roleTitle"]', "Data Analyst");
    await page.fill('[data-jaf="dateApplied"]', "2026-08-10");
    await page.fill('[data-jaf="submissionProof"]', "Email konfirmasi dari HR pukul 10:00");
    await page.click("#jaSubmit");
    await page.waitForSelector("text=Acme Corp", { timeout: 20000 });
    assert.ok(await page.locator("text=Qualified Applications").count(), "Milestone progress line missing after submit");
    await page.click("#dismissCompleted");
  });

  await browser.close();
  await sql.end();
  server.kill();
  console.log(failures ? `\n${failures} E2E FAILURE(S)` : "\nALL E2E TESTS PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error("E2E run crashed:", e);
  process.exit(1);
});
