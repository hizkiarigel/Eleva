// Playwright e2e for Item 1 (practiceTestSchema picker auto-skip) + Task 13
// (rebuilt result card blocks). Boots the real server keyless against the
// scratch Postgres DB, seeds practice-test quests with the three schema
// variants straight into `days`, drives a real Chromium through the flows.
//
// Run: node tests/practicetest.e2e.js
// Requires: local Postgres (same TEST_DATABASE_URL convention as
// tests/practicetest.js) and the preinstalled Playwright Chromium at
// /opt/pw-browsers/chromium (no download - PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD).

const assert = require("assert");
const { spawn } = require("child_process");
const { chromium } = require("playwright-core");
const { Client } = require("pg");

const PORT = 3997;
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

  // Account + profile via API, session cookie captured for the browser.
  const email = `e2e-${Date.now()}@example.com`;
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
    name: "E2E Tester",
    radarSnapshot: { body: 5, growth: 5, livelihood: 5, emotional: 5, social: 5, purpose: 5, autonomy: 5 },
    pathway: "Architect",
    goals: ["IELTS Academic band 6.5"],
  });

  const sql = new Client({ connectionString: env.DATABASE_URL });
  await sql.connect();
  const { rows: userRows } = await sql.query("SELECT id FROM users WHERE email = $1", [email]);
  const userId = userRows[0].id;

  async function insertQuest(title, practiceTestSchema) {
    const quest = {
      mode: "quest", completionType: "practice-test", structuredKind: null,
      evidenceSchema: null, practiceTestSchema,
      title, description: "Latihan terarah.", statFocus: "growth", why: "test",
    };
    const { rows } = await sql.query(
      `INSERT INTO days (user_id, goal_index, date, quest, insight, reflection, is_side_quest, is_meta)
       VALUES ($1, 0, '2026-08-12', $2, NULL, NULL, false, false) RETURNING id`,
      [userId, quest]
    );
    return rows[0].id;
  }
  const fullQuest = await insertQuest("Full Schema Quest", { kind: "listening", track: "academic" });
  const kindQuest = await insertQuest("Kind Only Quest", { kind: "listening", track: null });
  const bareQuest = await insertQuest("Bare Quest", null);

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

  console.log("E2E: Today's Trial practice-test quests always skip the picker (12 Agustus follow-up)");
  await test("full schema (kind+track) goes straight to the questions", async () => {
    await openDashboard();
    await page.click(`[data-reflect-id="${fullQuest}"]`);
    await page.waitForSelector("#ptSubmit", { timeout: 20000 });
    assert.strictEqual(await page.locator('text=Mau latihan apa dulu?').count(), 0, "kind picker must not appear");
    assert.strictEqual(await page.locator('text=Academic atau General Training?').count(), 0, "track picker must not appear");
  });

  await test("kind-only schema also goes straight to the questions (track defaults to academic)", async () => {
    await openDashboard();
    await page.click('[data-qhub-idx="1"]'); // select the 2nd quest hub card (kindQuest) before its detail-panel CTA exists
    await page.click(`[data-reflect-id="${kindQuest}"]`);
    await page.waitForSelector("#ptSubmit", { timeout: 20000 });
    assert.strictEqual(await page.locator('text=Academic atau General Training?').count(), 0, "track picker must not appear");
    await page.click("#ptCancel");
  });

  await test("no schema defaults to reading/academic and opens the Round 42 test-shell intro (not the flat quiz)", async () => {
    await openDashboard();
    await page.click('[data-qhub-idx="2"]'); // select the 3rd quest hub card (bareQuest) before its detail-panel CTA exists
    await page.click(`[data-reflect-id="${bareQuest}"]`);
    await page.waitForSelector("#rdgStart", { timeout: 20000 });
    assert.strictEqual(await page.locator('text=Mau latihan apa dulu?').count(), 0, "kind picker must not appear");
    assert.ok(await page.locator('text=IELTS Academic Reading').count(), "intro title missing");
    assert.strictEqual(await page.locator("#ptSubmit").count(), 0, "old flat quiz must not render for reading");
    await page.click("#rdgCancel");
  });

  await test("META Inner Realm's LINGUA detail page starts Reading/Listening directly, presetting kind (12 Agustus target-recommendation follow-up)", async () => {
    // Superseded scenario: META's old generic "Practice Test" tool (which
    // showed a Reading/Listening kind-picker) was replaced by two direct
    // rows on LINGUA's realm detail page - each presets its kind and skips
    // straight to the track step, same as a goal quest with a full schema.
    await openDashboard();
    await page.click('[data-tab="meta"]');
    await page.waitForSelector('.meta-realm-card-tools-link', { timeout: 20000 });
    await page.click('[data-meta-realm-open="lingua"]');
    await page.waitForSelector('[data-lingua-track="reading"]', { timeout: 20000 });
    assert.ok(await page.locator('[data-lingua-track="listening"]').count(), "Listening row must also be present");
    await page.click('[data-lingua-track="reading"]');
    await page.waitForSelector('text=Reading Academic atau General Training?', { timeout: 20000 });
    assert.strictEqual(await page.locator('text=Mau latihan apa dulu?').count(), 0, "kind picker must be skipped - Reading is already preset");
    await page.click("#ptCancel");
  });

  console.log("E2E: Task 13 result card blocks");
  await test("submitting a sprint renders SPRINT #, ESTIMATED LEVEL, ELEVA OBSERVED, ELEVA DECISION", async () => {
    await openDashboard();
    await page.click(`[data-reflect-id="${fullQuest}"]`);
    await page.waitForSelector("#ptSubmit", { timeout: 20000 });
    // Answer every question: first option for choice questions, text for fills.
    const choiceIds = await page.$$eval("[data-pt-choice]", (els) => [...new Set(els.map((e) => e.dataset.ptChoice))]);
    for (const qid of choiceIds) {
      await page.click(`[data-pt-choice="${qid}"]`); // first match = first option
    }
    const fillIds = await page.$$eval("[data-pt-fill]", (els) => els.map((e) => e.dataset.ptFill));
    for (const qid of fillIds) {
      await page.fill(`[data-pt-fill="${qid}"]`, "eight");
    }
    await page.click("#ptSubmit");
    await page.waitForSelector('text=ESTIMATED LEVEL', { timeout: 20000 });
    assert.ok(await page.locator('text=LISTENING SPRINT #01').count(), "sprint header missing");
    assert.ok(await page.locator('text=ELEVA OBSERVED').count(), "observed block missing");
    assert.ok(await page.locator('text=ELEVA DECISION').count(), "decision block missing");
    assert.ok(await page.locator('text=Confidence:').count(), "confidence line missing");
    assert.ok(await page.locator('text=Primary Quest').count(), "primary quest line missing");
    // Band must render as a range, never a single score
    const bandText = await page.locator(".pt-band").innerText();
    assert.ok(/IELTS \d(\.5)?–\d(\.5)?/.test(bandText), `band not a range: ${bandText}`);
  });

  console.log("E2E: Round 42 Reading Half Diagnostic test shell");
  // Hub-card indices shift as earlier tests complete quests - walk the cards
  // until the wanted quest's detail-panel CTA appears.
  async function openQuestCta(questId) {
    await openDashboard();
    for (let idx = 0; idx < 5; idx++) {
      if (await page.locator(`[data-reflect-id="${questId}"]`).count()) break;
      const card = page.locator(`[data-qhub-idx="${idx}"]`);
      if (await card.count()) await card.click();
    }
    await page.click(`[data-reflect-id="${questId}"]`);
  }

  await test("Start Test enters chrome-free test mode with a single timer and the Passage tab", async () => {
    await openQuestCta(bareQuest);
    await page.waitForSelector("#rdgStart", { timeout: 20000 });
    await page.click("#rdgStart");
    await page.waitForSelector(".rdg-shell", { timeout: 20000 });
    assert.strictEqual(await page.locator(".app-shell").count(), 0, "app chrome must be hidden");
    assert.strictEqual(await page.locator(".tab-bar").count(), 0, "bottom nav must be hidden");
    assert.strictEqual(await page.locator("#rdgTimer").count(), 1, "exactly one timer");
    assert.ok(await page.locator("#rdgPassagePane:not(.rdg-hidden)").count(), "Passage tab active by default");
    assert.ok(await page.locator('text=Paragraph A').count(), "paragraph labels missing");
  });

  await test("answers + flag update surgically (footer count, no flat re-render)", async () => {
    await page.click('[data-rdg-tab="questions"]');
    await page.waitForSelector('text=QUESTIONS 1–5');
    const qids = await page.$$eval("#rdgQuestionsPane [data-rdg-opt]", (els) => [...new Set(els.map((e) => e.dataset.rdgOpt))]);
    for (const qid of qids) await page.click(`[data-rdg-opt="${qid}"] >> nth=0`);
    assert.ok((await page.locator("#rdgFootCount").innerText()).startsWith("5/20"), "footer count must update");
    await page.click('[data-rdg-flag="q1"]');
    await page.click("#rdgOverviewBtn");
    await page.waitForSelector("#rdgOverviewOverlay");
    assert.ok(await page.locator('text=1 ditandai').count(), "flag count missing in overview");
    await page.click("#rdgOverviewClose");
    await page.waitForSelector("#rdgQuestionsPane");
  });

  await test("tab scroll positions survive switches (per-tab scroll memory)", async () => {
    await page.evaluate(() => { document.getElementById("rdgQuestionsPane").scrollTop = 150; });
    await page.click('[data-rdg-tab="passage"]');
    await page.click('[data-rdg-tab="questions"]');
    const st = await page.evaluate(() => document.getElementById("rdgQuestionsPane").scrollTop);
    assert.ok(st >= 140, `questions scroll position lost on tab switch: ${st}`);
  });

  await test("Next steps through blocks (resetting only Questions scroll) to Review", async () => {
    await page.click("#rdgFootNext");
    await page.waitForSelector('text=QUESTIONS 6–10');
    const st = await page.evaluate(() => document.getElementById("rdgQuestionsPane").scrollTop);
    assert.strictEqual(st, 0, "block change must reset Questions scroll to top");
    await page.click("#rdgFootNext");
    await page.waitForSelector('text=QUESTIONS 11–15');
    await page.click("#rdgFootNext");
    await page.waitForSelector('text=QUESTIONS 16–20');
    await page.click("#rdgFootNext"); // last block -> Review
    await page.waitForSelector('text=Periksa sebelum submit', { timeout: 20000 });
    const stats = await page.$$eval(".rdg-review-stat-num", (els) => els.map((e) => e.textContent.trim()));
    assert.deepStrictEqual(stats, ["5", "15", "1"], `review stats wrong: ${stats}`);
  });

  await test("submit with unanswered warns but never blocks; result renders in-shell with a band RANGE", async () => {
    await page.click("#rdgReviewSubmit");
    await page.waitForSelector("#rdgSubmitAnyway", { timeout: 20000 });
    assert.ok(await page.locator('text=15 soal belum dijawab').count(), "unanswered warning missing");
    await page.click("#rdgSubmitAnyway");
    await page.waitForSelector('text=READING RESULT', { timeout: 30000 });
    assert.strictEqual(await page.locator(".app-shell").count(), 0, "result must render in the shell");
    const band = await page.locator(".rdg-result-band").innerText();
    assert.ok(/\d(\.5)?–\d(\.5)?/.test(band), `band must be a range: ${band}`);
    assert.ok(await page.locator('text=NEEDS WORK').count(), "needs-work block missing");
    await page.click("#rdgExit");
    await page.waitForSelector(".tab-bar", { timeout: 20000 });
  });

  await test("a follow-up reading drill also opens in the shell (Reading Drill intro)", async () => {
    const drillQuest = await insertQuest("Reading Drill Quest", { kind: "reading", track: "academic" });
    await openQuestCta(drillQuest);
    await page.waitForSelector("#rdgStart", { timeout: 20000 });
    assert.ok(await page.locator('text=Reading Drill').count(), "drill intro title missing");
    await page.click("#rdgCancel");
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
