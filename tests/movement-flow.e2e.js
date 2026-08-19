// Playwright e2e for the BODY · MOVEMENT execution flow (design handoff):
// Quest Preview -> Pre-Start -> (Strength: Active Session) -> Finish &
// Review -> Evidence -> Submitted, for Today's Trial cardio/gym quests.
// Built incrementally alongside the implementation stages - this file
// currently covers stage 4 (Preview + Pre-Start, both modes) and grows to
// cover stages 5-7 (Cardio's short path, Strength's Active Session, full
// submit + outcome) as those land.
//
// Run: node tests/movement-flow.e2e.js
// Requires: local Postgres (TEST_DATABASE_URL) and the preinstalled
// Playwright Chromium at /opt/pw-browsers/chromium. Movement quests are
// seeded directly via SQL - keyless generateQuest always falls back to
// "reflective" (same limitation every other AI-authored completionType has
// in this suite, see tests/nutrition.e2e.js's own comment on this).

const assert = require("assert");
const { spawn } = require("child_process");
const { chromium } = require("playwright-core");
const { Client } = require("pg");

const PORT = 3993;
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

  const email = `movement-flow-e2e-${Date.now()}@example.com`;
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
    name: "Movement Flow E2E",
    radarSnapshot: { body: 5, growth: 5, livelihood: 5, emotional: 5, social: 5, purpose: 5, autonomy: 5 },
    pathway: "Architect",
    goals: ["Lari 10 km", "Latihan gym rutin tiap minggu"],
  });

  const sql = new Client({ connectionString: env.DATABASE_URL });
  await sql.connect();
  const { rows: userRows } = await sql.query("SELECT id FROM users WHERE email = $1", [email]);
  const userId = userRows[0].id;
  const todayKey = new Date().toLocaleDateString("en-CA");

  async function seedQuest(goalIndex, quest) {
    const { rows } = await sql.query(
      `INSERT INTO days (user_id, goal_index, date, quest, insight, reflection, is_side_quest, is_meta)
       VALUES ($1, $4, $3, $2, NULL, NULL, false, false) RETURNING id`,
      [userId, quest, todayKey, goalIndex]
    );
    return rows[0].id;
  }

  const cardioQuest = {
    mode: "quest", completionType: "structured-physical", structuredKind: "cardio",
    domain: "BODY", primaryFeature: "MOVEMENT", supportingFeatures: [],
    executionMode: "CARDIO", evidenceMode: "MANUAL_ACTIVITY",
    evidenceSchema: { activityType: "Lari", hasWeight: null, metricType: "distance", target: 3.2 },
    plannedExercises: null,
    title: "Lari 3.2 km — Ritme Dulu, Bukan Kecepatan",
    description: "Lari 3.2 km dengan ritme stabil. Tidak perlu mengejar pace hari ini.",
    statFocus: "body", why: "Ritme yang stabil membangun kepercayaan pada tubuhmu sendiri.",
  };
  const strengthQuest = {
    mode: "quest", completionType: "structured-physical", structuredKind: "gym",
    domain: "BODY", primaryFeature: "MOVEMENT", supportingFeatures: [],
    executionMode: "STRENGTH", evidenceMode: "SET_REP_LOAD",
    evidenceSchema: { activityType: null, hasWeight: true, metricType: "reps", target: 10 },
    plannedExercises: [
      { name: "Squat", targetSets: 3, targetReps: 10, targetLoadKg: null },
      { name: "Calf Raise", targetSets: 3, targetReps: 12, targetLoadKg: null },
    ],
    title: "Lower Body Strength",
    description: "Kuatkan kaki dulu, baru lari.",
    statFocus: "body", why: "Kaki yang kuat adalah fondasi buat semua target larimu nanti.",
  };

  const cardioId = await seedQuest(0, cardioQuest);
  const strengthId = await seedQuest(1, strengthQuest);

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

  console.log("E2E: Quest Preview (both modes)");
  await test("Cardio quest opens Preview with BODY · MOVEMENT label, checklist, no bottom tab bar", async () => {
    await openDashboard();
    await page.click(`[data-reflect-id="${cardioId}"]`);
    await page.waitForSelector("#mvPreviewStart", { timeout: 20000 });
    assert.ok(await page.locator("text=BODY · MOVEMENT").count(), "domain label must render");
    assert.ok(await page.locator("text=Jarak minimal 3.2 km").count(), "cardio checklist must read off evidenceSchema.target");
    assert.strictEqual(await page.locator(".tab-bar").count(), 0, "Movement flow must hide the bottom tab bar");
  });

  await test("'Kenapa Eleva kasih quest ini?' expands inline without a page reload", async () => {
    assert.strictEqual(await page.locator(".mv-why-collapse.open").count(), 0, "why panel must be collapsed initially");
    assert.ok(await page.locator("text=Ritme yang stabil").count(), "why text is present in the DOM even collapsed (no scroll-jump technique)");
    await page.click("#mvWhyToggle");
    await page.waitForSelector(".mv-why-collapse.open", { timeout: 5000 });
  });

  await test("back arrow from Preview returns to Home, no attempt created", async () => {
    await page.click("#mvBackToHome");
    await page.waitForSelector("[data-reflect-id]", { timeout: 20000 });
    const { rows } = await sql.query("SELECT quest FROM days WHERE id = $1", [cardioId]);
    assert.ok(!rows[0].quest.activeAttempt, "no attempt may exist yet - Preview never calls /attempt/start");
  });

  console.log("E2E: Pre-Start (Cardio)");
  await test("Cardio Pre-Start shows evidence-to-be-recorded list + Kondisi chips, Batal returns to Preview with no attempt", async () => {
    await page.click(`[data-reflect-id="${cardioId}"]`);
    await page.waitForSelector("#mvPreviewStart", { timeout: 20000 });
    await page.click("#mvPreviewStart");
    await page.waitForSelector("#mvPreStartGo", { timeout: 20000 });
    assert.ok(await page.locator("text=BUKTI YANG AKAN DICATAT").count());
    assert.ok(await page.locator('[data-mv-kondisi="Segar"]').count(), "Kondisi chips must render for cardio");
    await page.click("#mvPreStartCancel");
    await page.waitForSelector("#mvPreviewStart", { timeout: 20000 });
    const { rows } = await sql.query("SELECT quest FROM days WHERE id = $1", [cardioId]);
    assert.ok(!rows[0].quest.activeAttempt, "Batal must never create an attempt");
  });

  await test("Cardio 'Mulai' creates the attempt server-side and goes straight to Review (no Active Session)", async () => {
    await page.click("#mvPreviewStart");
    await page.waitForSelector("#mvPreStartGo", { timeout: 20000 });
    await page.click("#mvPreStartGo");
    await page.waitForSelector("text=coming soon", { timeout: 20000 }); // Review is a stage-5 stub for now
    const { rows } = await sql.query("SELECT quest FROM days WHERE id = $1", [cardioId]);
    assert.ok(rows[0].quest.activeAttempt, "attempt must be created");
    assert.strictEqual(rows[0].quest.activeAttempt.currentScreen, "review");
  });

  console.log("E2E: Pre-Start (Strength)");
  await test("Strength Pre-Start shows today's exercises with target sets×reps, 'Mulai Latihan' creates attempt with a full sets grid", async () => {
    // The Cardio test above landed on Review (a stub screen for now, stage
    // 5) - its back arrow is #mvBackScreen, not #mvBackToHome (only Preview
    // uses that id); a soft nav home, the attempt itself keeps living
    // server-side either way.
    await page.click("#mvBackScreen");
    await page.waitForSelector("[data-reflect-id]", { timeout: 20000 });
    // The quest hub shows one detail panel (with its own [data-reflect-id])
    // at a time for whichever compact card is selected - the Strength
    // quest's card must be tapped first before its button exists in the DOM.
    await page.click('[data-qhub-idx="1"]');
    await page.waitForSelector(`[data-reflect-id="${strengthId}"]`, { timeout: 20000 });
    await page.click(`[data-reflect-id="${strengthId}"]`);
    await page.waitForSelector("#mvPreviewStart", { timeout: 20000 });
    await page.click("#mvPreviewStart");
    await page.waitForSelector("#mvPreStartGo", { timeout: 20000 });
    assert.ok(await page.locator("text=Squat").count());
    assert.ok(await page.locator("text=3×10").count());
    assert.strictEqual((await page.locator("text=Mulai Latihan").count()) > 0, true);
    await page.click("#mvPreStartGo");
    await page.waitForSelector("text=coming soon", { timeout: 20000 }); // Active Session is a stage-6 stub for now
    const { rows } = await sql.query("SELECT quest FROM days WHERE id = $1", [strengthId]);
    const a = rows[0].quest.activeAttempt;
    assert.strictEqual(a.currentScreen, "active");
    assert.strictEqual(a.strengthExercises.length, 2);
    assert.strictEqual(a.strengthExercises[0].sets.length, 3);
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
