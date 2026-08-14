// Playwright e2e for the onboarding draft-resume bug fix (round 22) -
// founder-reported: refreshing at any point mid-onboarding (name/radar/the
// up-to-6-card AI question loop/pathway/goals) always dropped the user back
// to "Siapa namamu?", because nothing about in-progress onboarding persisted
// anywhere until POST /api/profile at the very end. Fixed by saving a draft
// snapshot to users.onboarding_draft (server/db.js) at every meaningful
// checkpoint and restoring it in boot() (public/app.js) whenever GET
// /api/state reports no profile yet.
//
// Run: node tests/onboarding-draft-resume.e2e.js
// Requires: local Postgres (same TEST_DATABASE_URL convention as
// tests/practicetest.js) and the preinstalled Playwright Chromium at
// /opt/pw-browsers/chromium.

const assert = require("assert");
const { spawn } = require("child_process");
const { chromium } = require("playwright-core");

const PORT = 3979;
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

function spawnServer(port) {
  const env = {
    ...process.env,
    DATABASE_URL: process.env.TEST_DATABASE_URL || "postgres://postgres:testpass@localhost:5432/eleva_test",
    SESSION_SECRET: "testsecret", BETA_CODE: "TESTCODE", PORT: String(port),
  };
  delete env.ANTHROPIC_API_KEY;
  const server = spawn("node", ["server/index.js"], { env, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  server.stdout.on("data", (d) => { log += d; });
  server.stderr.on("data", (d) => { log += d; });
  return { server, log: () => log };
}

async function waitForServer(base, log) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try { await fetch(`${base}/`); return; } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`server never came up:\n${log()}`);
}

async function signUpAndFillName(page, name) {
  const email = `draft-resume-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  await page.goto(BASE);
  await page.waitForSelector("#auth2Submit", { timeout: 20000 });
  await page.click("#auth2ToggleMode");
  await page.waitForSelector("#auth2BetaCode", { timeout: 5000 });
  await page.fill("#auth2Email", email);
  await page.fill("#auth2Password", "password123");
  await page.fill("#auth2BetaCode", "TESTCODE");
  await page.click("#auth2ConsentBox");
  await page.click("#auth2Submit");
  await page.waitForSelector("text=Siapa namamu?", { timeout: 20000 });
  await page.fill("#fld", name);
}

(async () => {
  const { server, log } = spawnServer(PORT);
  await waitForServer(BASE, log);

  const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });

  console.log("E2E: refresh right after the name step resumes at the radar step, not 'Siapa namamu?' again");
  await test("draft saved on the radar step survives a hard reload", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await signUpAndFillName(page, "Radar Resume");
    await page.click("#next");
    await page.waitForSelector(".poly-svg", { timeout: 10000 });
    // renderOnboarding()'s debounced save (500ms) needs a moment to land.
    await page.waitForTimeout(700);
    await page.reload();
    await page.waitForSelector(".poly-svg", { timeout: 10000 });
    assert.strictEqual(await page.locator("text=Siapa namamu?").count(), 0, "must not fall back to the name step");
    await context.close();
  });

  console.log("E2E: refresh mid AI-question loop resumes into the adaptive flow, never the name step");
  await test("radar Continue's immediate draft save survives a reload during the very first bridge", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await signUpAndFillName(page, "First Bridge Resume");
    await page.click("#next");
    await page.waitForSelector(".poly-svg", { timeout: 10000 });
    await page.click('[data-lock-hit="body"]');
    await page.click("#next"); // fires beginScenarioBridge() - the immediate saveOnboardingDraftNow() must have already landed
    await page.reload();
    await page.waitForSelector(".qcard-card, .bridge-root", { timeout: 15000 });
    assert.strictEqual(await page.locator("text=Siapa namamu?").count(), 0, "must not fall back to the name step");
    await context.close();
  });

  console.log("E2E: refresh right after confirming a card resumes at the NEXT card, not the same one again");
  await test("confirmCard's immediate draft save survives a reload before the next card's bridge resolves", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await signUpAndFillName(page, "Card Resume");
    await page.click("#next");
    await page.waitForSelector(".poly-svg", { timeout: 10000 });
    await page.click('[data-lock-hit="body"]');
    await page.click("#next");
    await page.waitForSelector(".qcard-card", { timeout: 10000 });
    assert.strictEqual((await page.locator(".qcard-count").textContent()).trim(), "KARTU KE-1");
    const opts = await page.locator(".qcard-answer").all();
    await opts[0].click();
    await opts[1].click();
    await page.click("#confirmCard");
    await page.waitForTimeout(300); // reload while the next card's bridge/fetch is still in flight
    await page.reload();
    await page.waitForSelector(".qcard-card", { timeout: 15000 });
    assert.strictEqual(await page.locator("text=Siapa namamu?").count(), 0, "must not fall back to the name step");
    assert.strictEqual((await page.locator(".qcard-count").textContent()).trim(), "KARTU KE-2", "must resume at the next card, not re-ask the one just answered");
    await context.close();
  });

  console.log("E2E: completing onboarding clears the draft (no stale resume after a real profile exists)");
  await test("a completed onboarding never restores a draft on a later refresh", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await signUpAndFillName(page, "Complete Flow");
    await page.click("#next");
    await page.waitForSelector(".poly-svg", { timeout: 10000 });
    await page.click('[data-lock-hit="body"]');
    await page.click("#next");
    // keyless fallback resolves confident:true after exactly 2 cards (see onboarding-bridge.e2e.js)
    for (let i = 0; i < 2; i++) {
      await page.waitForSelector(".qcard-card", { timeout: 15000 });
      const opts = await page.locator(".qcard-answer").all();
      await opts[0].click();
      await opts[1].click();
      await page.click("#confirmCard");
    }
    await page.waitForSelector(".tarot-card", { timeout: 15000 });
    await page.locator(".tarot-card").first().click();
    await page.waitForSelector(".goal-input", { timeout: 10000 });
    await page.fill('[data-goal="0"]', "Target uji coba");
    await page.click("#confirmGoals");
    await page.waitForSelector("[data-tab]", { timeout: 15000 }); // real dashboard
    await page.reload();
    await page.waitForSelector("[data-tab]", { timeout: 15000 });
    assert.strictEqual(await page.locator("text=Siapa namamu?").count(), 0, "a completed account must never resume a stale onboarding draft");
    await context.close();
  });

  await browser.close();
  server.kill();

  console.log(failures ? `\n${failures} E2E FAILURE(S)` : "\nALL E2E TESTS PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error("E2E run crashed:", e);
  process.exit(1);
});
