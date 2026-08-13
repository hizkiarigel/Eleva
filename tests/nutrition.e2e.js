// Playwright e2e for SOMA Nutrition Implementation Brief Part B (12
// Agustus). Boots the real server keyless against the scratch Postgres DB,
// seeds a goal-generated nutrition-log quest straight into `days` (the
// keyless AI path can never produce this completionType, same reason
// tests/practicetest.e2e.js seeds its own quest shapes), drives a real
// Chromium through the renamed SOMA META box, the mode picker, the Log Meal
// flow (search + confirm), and the home quest card's live progress line.
//
// Run: node tests/nutrition.e2e.js
// Requires: local Postgres (same TEST_DATABASE_URL convention as
// tests/practicetest.js) and the preinstalled Playwright Chromium at
// /opt/pw-browsers/chromium.

const assert = require("assert");
const { spawn } = require("child_process");
const { chromium } = require("playwright-core");
const { Client } = require("pg");

const PORT = 3991;
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

  const email = `nutri-e2e-${Date.now()}@example.com`;
  let cookieHeader = "";
  async function call(path, body, method) {
    const res = await fetch(`${BASE}${path}`, {
      method: method || (body ? "POST" : "GET"), headers: { "Content-Type": "application/json", cookie: cookieHeader },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const setCookie = res.headers.getSetCookie?.() || [];
    if (setCookie.length) cookieHeader = setCookie.map((c) => c.split(";")[0]).join("; ");
    return res.json().catch(() => ({}));
  }
  await call("/api/signup", { email, password: "password123", betaCode: "TESTCODE" });
  await call("/api/profile", {
    name: "SOMA E2E",
    radarSnapshot: { body: 5, growth: 5, livelihood: 5, emotional: 5, social: 5, purpose: 5, autonomy: 5 },
    pathway: "Architect",
    goals: ["Makan lebih sehat dan cukup protein"],
  });

  const sql = new Client({ connectionString: env.DATABASE_URL });
  await sql.connect();
  const { rows: userRows } = await sql.query("SELECT id FROM users WHERE email = $1", [email]);
  const userId = userRows[0].id;

  // Seed a goal-generated nutrition quest directly (keyless fallbackQuest
  // always returns "reflective", same limitation practicetest.e2e.js works
  // around for practice-test quests) so the home quest card's live-progress
  // rendering (item 7) has a real PROGRESSIVE quest to show.
  const nutritionQuest = {
    mode: "quest", completionType: "nutrition-log", lifecycleType: "progressive", structuredKind: null,
    title: "Catat 3 Kali Makan Hari Ini", description: "Catat sarapan, makan siang, dan makan malam.",
    statFocus: "body", why: "test", goalIndex: 0,
    progressive: { requiredContributions: 3, completedContributions: 0, primaryMetric: "protein", targetValue: 60, currentValue: 0, evidenceComplete: false, targetMet: false, status: "ACTIVE" },
  };
  // date must be TODAY (server-local, same format as index.js's todayKey) -
  // a hardcoded past date here would make the lazy end-of-day check
  // (GET /api/state) roll this quest to INCOMPLETE before the test ever
  // gets to interact with it, the instant the real calendar date moves on.
  const todayKey = new Date().toLocaleDateString("en-CA");
  const { rows } = await sql.query(
    `INSERT INTO days (user_id, goal_index, date, quest, insight, reflection, is_side_quest, is_meta)
     VALUES ($1, 0, $3, $2, NULL, NULL, false, false) RETURNING id`,
    [userId, nutritionQuest, todayKey]
  );
  const goalQuestId = rows[0].id;

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

  console.log("E2E: home quest card live progress (item 7)");
  await test("Today's Trial nutrition quest shows the progress line and 'Lanjut Catat' button, not 'Mulai'", async () => {
    await openDashboard();
    assert.ok(await page.locator("text=Meals 0/3").count(), "progress line missing");
    assert.ok(await page.locator("text=Lanjut Catat").count(), "button must read 'Lanjut Catat', not 'Mulai'");
    assert.strictEqual(await page.locator(`[data-reflect-id="${goalQuestId}"]:has-text("Mulai")`).count(), 0, "must never show a completion-style CTA while unmet");
  });

  console.log("E2E: Log Meal flow (search-based, item 4/5/6)");
  await test("tapping the quest opens the Nutrition page with meal-time picker and totals", async () => {
    await page.click(`[data-reflect-id="${goalQuestId}"]`);
    await page.waitForSelector('text=Waktu makan', { timeout: 20000 });
    assert.ok(await page.locator("text=Sarapan").count());
    assert.ok(await page.locator("text=Makan Siang").count());
    assert.ok(await page.locator("text=Makan Malam").count());
    assert.ok(await page.locator("text=Camilan").count());
  });

  await test("picking a meal time reveals search, and a search result can be picked into the confirm step", async () => {
    await page.click('[data-nf-meal="sarapan"]');
    await page.waitForSelector("#nfSearchInput", { timeout: 10000 });
    await page.fill("#nfSearchInput", "telur"); // substring match - "Telur ayam rebus" contains "telur", not "telur rebus"
    await page.waitForSelector("[data-nf-pick]", { timeout: 10000 });
    await page.click("[data-nf-pick]");
    await page.waitForSelector("#nfSave", { timeout: 10000 });
    assert.ok(await page.locator('text=Konfirmasi makanan').count());
  });

  await test("saving the confirmed entry updates the running progress and returns to the log step", async () => {
    await page.click("#nfSave");
    await page.waitForSelector('text=TERCATAT HARI INI', { timeout: 20000 });
    assert.ok(await page.locator("text=Meals 1/3").count(), "progress did not advance after logging");
  });

  await test("closing the flow returns to the dashboard with the updated progress line visible", async () => {
    await page.click("#nfDone");
    await page.waitForSelector("[data-reflect-id]", { timeout: 20000 });
    assert.ok(await page.locator("text=Meals 1/3").count(), "home card must reflect the persisted progress");
  });

  console.log("E2E: META - Inner Realm world map (12 Agustus) + target-recommendation follow-up");
  await test("META tab shows the world map with SOMA/LINGUA/LABORA realm names, each with a 'Lihat tools' link reachable with no active target", async () => {
    await page.click('[data-tab="meta"]');
    await page.waitForSelector('.meta-realm-card-empty', { timeout: 20000 });
    assert.ok(await page.locator("text=SOMA").count(), "SOMA realm name must be on the map");
    assert.ok(await page.locator("text=LINGUA").count(), "LINGUA realm name must be on the map");
    assert.ok(await page.locator("text=LABORA").count(), "LABORA realm name must be on the map");
    // World Map shows Target, Realm page shows Tools (founder feedback,
    // follow-up to the initial redesign) - with no goal in any domain yet,
    // every realm shows the empty state, but its tools stay reachable via
    // the "Lihat tools" link (target approval is motivational framing, not
    // a gate on the underlying functionality).
    assert.strictEqual(await page.locator(".meta-realm-card-empty").count(), 3, "all 3 realms start with no active target");
    assert.strictEqual(await page.locator(".meta-realm-card-tools-link").count(), 3, "every realm's tools stay reachable regardless of target state");
  });

  await test("opening SOMA's tool list from the empty state shows Movement/Recovery/Nutrition, and tapping Nutrition starts a fresh META session", async () => {
    await page.click('[data-meta-realm-open="soma"]');
    await page.waitForSelector("#metaRealmBack", { timeout: 20000 });
    assert.ok(await page.locator('[data-soma-mode="activity"]:has-text("Movement")').count(), "Movement row must be present");
    assert.ok(await page.locator('[data-soma-mode="recovery"]:has-text("Recovery")').count(), "Recovery row must be present");
    assert.ok(await page.locator('[data-soma-mode="nutrition"]:has-text("Nutrition")').count(), "Nutrition row must be present");
    await page.click('[data-soma-mode="nutrition"]');
    await page.waitForSelector('text=Waktu makan', { timeout: 20000 });
    assert.ok(await page.locator("text=Meals 0/3").count(), "fresh META nutrition quest should start at 0/3");
  });

  await test("re-opening META and drilling back into SOMA's tools resumes the same active Nutrition quest directly (no duplicate)", async () => {
    // Close out of the flow (without resolving it - the META quest stays
    // ACTIVE) via #nfDone, same as any other flow screen - tapping a nav
    // tab alone never dismisses an in-progress flow, matching jobMatchFlow/
    // jobApplicationFlow's existing behavior.
    await page.click("#nfDone");
    await page.waitForSelector("[data-reflect-id]", { timeout: 20000 });
    await page.click('[data-tab="meta"]');
    await page.waitForSelector('[data-meta-realm-open="soma"]', { timeout: 20000 });
    await page.click('[data-meta-realm-open="soma"]');
    await page.waitForSelector('[data-soma-mode="nutrition"]', { timeout: 20000 });
    await page.click('[data-soma-mode="nutrition"]');
    await page.waitForSelector('text=Waktu makan', { timeout: 20000 });
    assert.ok(await page.locator("text=Meals 0/3").count(), "resumed quest keeps its own progress, still 0/3 (only the confirm-and-save flow above advances it)");
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
