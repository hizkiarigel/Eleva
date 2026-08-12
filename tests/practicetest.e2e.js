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

  console.log("E2E: picker auto-skip per practiceTestSchema");
  await test("full schema (kind+track) skips both pickers straight to the questions", async () => {
    await openDashboard();
    await page.click(`[data-reflect-id="${fullQuest}"]`);
    await page.waitForSelector("#ptSubmit", { timeout: 20000 });
    assert.strictEqual(await page.locator('text=Mau latihan apa dulu?').count(), 0, "kind picker must not appear");
    assert.strictEqual(await page.locator('text=Academic atau General Training?').count(), 0, "track picker must not appear");
  });

  await test("kind-only schema skips the kind picker but still asks for track", async () => {
    await openDashboard();
    await page.click(`[data-reflect-id="${kindQuest}"]`);
    await page.waitForSelector('text=Academic atau General Training?', { timeout: 20000 });
    assert.strictEqual(await page.locator('text=Mau latihan apa dulu?').count(), 0, "kind picker must not appear");
    await page.click("#ptCancel");
  });

  await test("no schema falls back to the full picker flow (regression)", async () => {
    await openDashboard();
    await page.click(`[data-reflect-id="${bareQuest}"]`);
    await page.waitForSelector('text=Mau latihan apa dulu?', { timeout: 20000 });
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

  await browser.close();
  await sql.end();
  server.kill();
  console.log(failures ? `\n${failures} E2E FAILURE(S)` : "\nALL E2E TESTS PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error("E2E run crashed:", e);
  process.exit(1);
});
