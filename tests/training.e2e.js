// Playwright e2e for the Movement→Training spec (SOMA):
//   1. the SOMA tool row reads "Training" (Movement rename),
//   2. Recovery gets a confirm/cancel interstitial BEFORE any quest is
//      created server-side (same pattern as Training's own kind picker),
//   3. the "selecting Gym drops back to Home" regression: after the kind
//      picker creates the quest, the record form must actually render
//      (appState refreshed before renderDashboard - the stale-state bug),
//   4. the multi-exercise workout log: catalog picker (search + muscle
//      group filter), per-exercise sets grid, one primary submit, and the
//      server-computed end-of-session evaluation (volume / calories /
//      dominant muscle group) persisted as reflection structuredData,
//   5. scope guard: a legacy in-flight single-exercise gym quest still
//      opens the OLD single-movement form, never the multi-exercise log.
//
// Run: node tests/training.e2e.js
// Requires: local Postgres (same TEST_DATABASE_URL convention as the rest
// of this suite) and the preinstalled Playwright Chromium at
// /opt/pw-browsers/chromium. Keyless (no ANTHROPIC_API_KEY): reflection
// processing takes server/claude.js's deterministic fallback path.

const assert = require("assert");
const { spawn } = require("child_process");
const { chromium } = require("playwright-core");
const { Client } = require("pg");

const PORT = 3995;
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

  const email = `training-e2e-${Date.now()}@example.com`;
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
    name: "Training E2E",
    radarSnapshot: { body: 5, growth: 5, livelihood: 5, emotional: 5, social: 5, purpose: 5, autonomy: 5 },
    pathway: "Architect",
    goals: ["Latihan gym rutin tiap minggu"],
  });

  const sql = new Client({ connectionString: env.DATABASE_URL });
  await sql.connect();
  const { rows: userRows } = await sql.query("SELECT id FROM users WHERE email = $1", [email]);
  const userId = userRows[0].id;
  const metaCount = async () =>
    Number((await sql.query("SELECT count(*) FROM days WHERE user_id = $1 AND is_meta", [userId])).rows[0].count);

  const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
  const context = await browser.newContext({ baseURL: BASE });
  const cookies = cookieHeader.split("; ").map((pair) => {
    const eq = pair.indexOf("=");
    return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: BASE };
  });
  await context.addCookies(cookies);
  const page = await context.newPage();

  async function openSomaTools() {
    await page.goto(BASE);
    await page.waitForSelector('[data-tab="meta"]', { timeout: 20000 });
    await page.click('[data-tab="meta"]');
    await page.waitForSelector('[data-meta-realm-open="soma"]', { timeout: 20000 });
    await page.click('[data-meta-realm-open="soma"]');
    await page.waitForSelector("#metaRealmBack", { timeout: 20000 });
  }

  console.log("E2E: Movement→Training rename + Recovery confirm interstitial");
  await test("SOMA tool row reads 'Training' with the 'Cardio & gym' subtitle (no 'Movement' left)", async () => {
    await openSomaTools();
    assert.ok(await page.locator('[data-soma-mode="activity"]:has-text("Training")').count(), "Training row must be present");
    assert.ok(await page.locator('[data-soma-mode="activity"]:has-text("Cardio & gym")').count(), "subtitle copy must stay 'Cardio & gym · ...'");
    assert.strictEqual(await page.locator('text=Movement').count(), 0, "the old Movement label must be gone");
  });

  await test("tapping Recovery shows a confirm card first - nothing created server-side - and Batal backs out cleanly", async () => {
    await page.click('[data-soma-mode="recovery"]');
    await page.waitForSelector("#metaSomaConfirmBtn", { timeout: 20000 });
    assert.ok(await page.locator("text=Mulai sesi Recovery?").count(), "confirm copy must render");
    assert.strictEqual(await metaCount(), 0, "no META quest may exist before the confirm tap");
    await page.click("#metaSomaCancel");
    await page.waitForSelector('[data-soma-mode="recovery"]', { timeout: 20000 });
    assert.strictEqual(await page.locator("#metaSomaConfirmBtn").count(), 0, "confirm card must close on Batal");
    assert.strictEqual(await metaCount(), 0, "Batal must never have created a quest");
  });

  await test("confirming Recovery creates the quest and lands on the recovery record form (not Home) - the stale-appState regression", async () => {
    await page.click('[data-soma-mode="recovery"]');
    await page.waitForSelector("#metaSomaConfirmBtn", { timeout: 20000 });
    await page.click("#metaSomaConfirmBtn");
    // The regression symptom was a silent bounce to Home: quest created but
    // the record form's allOpenQuests lookup missed it. The fields are the
    // proof the reflect form actually rendered for the new quest.
    await page.waitForSelector('[data-sf="durasiTidurJam"]', { timeout: 20000 });
    assert.strictEqual(await metaCount(), 1, "exactly one META quest after confirm");
    // Complete the recovery session so it doesn't stay open - an open
    // structured-physical META quest would otherwise (correctly) RESUME
    // under the Training row below instead of opening the kind picker.
    await page.fill('[data-sf="durasiTidurJam"]', "7");
    await page.fill('[data-sf="asupanAirGelas"]', "8");
    await page.fill('[data-sf="makanProtein"]', "2");
    await page.click('[data-nyeri="Tidak ada"]');
    await page.click("#submitReflect");
    await page.waitForSelector("#dismissCompleted", { timeout: 30000 });
    await page.click("#dismissCompleted");
  });

  console.log("E2E: Training multi-exercise session (gym)");
  await test("Training → Gym opens the multi-exercise workout log, not Home and not the legacy single-exercise form", async () => {
    await openSomaTools();
    await page.click('[data-soma-mode="activity"]');
    await page.waitForSelector('[data-meta-body-kind="gym"]', { timeout: 20000 });
    await page.click('[data-meta-body-kind="gym"]');
    await page.waitForSelector("#gsAddExercise", { timeout: 20000 });
    assert.strictEqual(await page.locator('[data-sf="gerakan"]').count(), 0, "legacy single-exercise Gerakan field must NOT render for a new Training session");
    assert.strictEqual(await metaCount(), 2, "gym quest created (plus the recovery one above)");
  });

  await test("picker: search finds Bench Press from the fixed catalog and adds it with one set row", async () => {
    await page.click("#gsAddExercise");
    await page.waitForSelector("#gsSearch", { timeout: 20000 });
    await page.waitForSelector("[data-gs-pick]", { timeout: 20000 }); // catalog fetch landed
    await page.fill("#gsSearch", "bench press");
    await page.waitForSelector('[data-gs-pick="bench-press"]', { timeout: 20000 });
    await page.click('[data-gs-pick="bench-press"]');
    await page.waitForSelector('[data-gs-w="0:0"]', { timeout: 20000 });
    assert.ok(await page.locator('.gs-ex-name:has-text("Bench Press")').count(), "exercise card must appear");
    assert.strictEqual(await page.locator("#gsSearch").count(), 0, "picker closes after picking");
  });

  await test("sets grid: log 40kg×10 done, '+ Tambah set' prefills from the previous row", async () => {
    await page.fill('[data-gs-w="0:0"]', "40");
    await page.fill('[data-gs-r="0:0"]', "10");
    await page.click('[data-gs-done="0:0"]');
    await page.click('[data-gs-addset="0"]');
    await page.waitForSelector('[data-gs-w="0:1"]', { timeout: 20000 });
    assert.strictEqual(await page.inputValue('[data-gs-w="0:1"]'), "40", "new set prefills weight from previous row");
    assert.strictEqual(await page.inputValue('[data-gs-r="0:1"]'), "10", "new set prefills reps from previous row");
    await page.fill('[data-gs-r="0:1"]', "8");
    await page.click('[data-gs-done="0:1"]');
  });

  await test("picker: muscle-group filter (Punggung) narrows the list, second exercise gets its own card", async () => {
    await page.click("#gsAddExercise");
    await page.waitForSelector("[data-gs-pick]", { timeout: 20000 });
    await page.click('[data-gs-group="back"]');
    await page.waitForSelector('[data-gs-pick="lat-pulldown"]', { timeout: 20000 });
    assert.strictEqual(await page.locator('[data-gs-pick="bench-press"]').count(), 0, "chest exercise must be filtered out under Punggung");
    await page.click('[data-gs-pick="lat-pulldown"]');
    await page.waitForSelector('[data-gs-w="1:0"]', { timeout: 20000 });
    await page.fill('[data-gs-w="1:0"]', "35");
    await page.fill('[data-gs-r="1:0"]', "12");
    await page.click('[data-gs-done="1:0"]');
  });

  await test("single primary submit finishes the session and shows the evaluation: volume 1140, calories 30, Dada dominant", async () => {
    await page.click("#submitReflect");
    await page.waitForSelector(".gs-eval", { timeout: 30000 });
    // volume = 40*10 + 40*8 + 35*12 = 1140; calories = 11+11+8 = 30;
    // chest 2 done sets vs back 1 -> Dada dominates alone.
    assert.ok(await page.locator('.gs-eval-num:has-text("1140")').count(), "total volume must render");
    assert.ok(await page.locator('.gs-eval-num:has-text("30")').count(), "estimated calories must render");
    assert.ok(await page.locator('.gs-eval-muscle:has-text("Dada")').count(), "dominant muscle group must render");
    const { rows } = await sql.query(
      "SELECT reflection FROM days WHERE user_id = $1 AND is_meta AND reflection IS NOT NULL", [userId]);
    const withSession = rows.map((r) => r.reflection).find((r) => r.structuredData?.kind === "gym-session");
    assert.ok(withSession, "gym-session structuredData must be persisted on the reflection");
    assert.strictEqual(withSession.structuredData.exercises.length, 2, "both exercise entries persisted");
    assert.deepStrictEqual(withSession.structuredData.evaluation, { totalVolumeKg: 1140, estimatedCalories: 30, dominantMuscleGroups: ["chest"] });
  });

  console.log("E2E: scope guard - legacy single-exercise gym quest untouched");
  await test("an in-flight legacy gym META quest (no gymSession flag) still opens the old single-movement form", async () => {
    const legacyQuest = {
      completionType: "structured-physical", structuredKind: "gym", evidenceSchema: null,
      statFocus: "body", title: "Latihan Mandiri", description: "legacy", why: "test",
    };
    const todayKey = new Date().toLocaleDateString("en-CA");
    await sql.query(
      `INSERT INTO days (user_id, goal_index, date, quest, insight, reflection, is_side_quest, is_meta)
       VALUES ($1, NULL, $3, $2, NULL, NULL, false, true)`,
      [userId, legacyQuest, todayKey]);
    await openSomaTools();
    // The Training row resumes the active gym quest directly (either
    // sub-kind counts as the same "activity" domain).
    await page.click('[data-soma-mode="activity"]');
    await page.waitForSelector('[data-sf="gerakan"]', { timeout: 20000 });
    assert.strictEqual(await page.locator("#gsAddExercise").count(), 0, "multi-exercise log must NOT hijack a legacy quest");
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
