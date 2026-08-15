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

  console.log("E2E: refresh while an already-loaded question is on screen restores it exactly - no bridge replay, no question swap (round 23)");
  await test("a card with a scenario already loaded restores in place, picks intact, never through a bridge", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await signUpAndFillName(page, "Same Card Resume");
    await page.click("#next");
    await page.waitForSelector(".poly-svg", { timeout: 10000 });
    await page.click('[data-lock-hit="body"]');
    await page.click("#next");
    await page.waitForSelector(".qcard-card", { timeout: 10000 });
    await page.waitForTimeout(700); // let the debounced draft save (question + picks) land
    const questionBefore = await page.locator(".qcard-question").textContent();
    const opts = await page.locator(".qcard-answer").all();
    await opts[0].click(); // partial pick only - "most preferred", deliberately not confirmed
    await page.waitForTimeout(700); // debounced save of the pick
    await page.reload();
    await page.waitForSelector(".qcard-card, .bridge-root", { timeout: 15000 });
    assert.strictEqual(await page.locator(".bridge-root").count(), 0, "an already-loaded card must restore directly, never through the bridge animation");
    await page.waitForSelector(".qcard-card", { timeout: 10000 });
    const questionAfter = await page.locator(".qcard-question").textContent();
    assert.strictEqual(questionAfter, questionBefore, "the question must be byte-identical after refresh, never re-generated");
    assert.strictEqual(await page.locator(".qcard-answer.positive").count(), 1, "the in-progress pick must survive the refresh too");
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
    await page.waitForSelector(".chapter-headline", { timeout: 15000 });
    await page.click("#toPathway");
    await page.waitForSelector(".ppick-col", { timeout: 15000 });
    await page.locator(".ppick-col").first().click();
    await page.click("#confirmPathway");
    await page.waitForSelector(".goal-input", { timeout: 10000 });
    await page.fill('[data-goal="0"]', "Target uji coba");
    await page.click("#confirmGoals");
    await page.waitForSelector("[data-tab]", { timeout: 15000 }); // real dashboard
    await page.reload();
    await page.waitForSelector("[data-tab]", { timeout: 15000 });
    assert.strictEqual(await page.locator("text=Siapa namamu?").count(), 0, "a completed account must never resume a stale onboarding draft");
    await context.close();
  });

  console.log("E2E: refreshing on the pathway screen (round 28) resumes directly there, no bridge replay, no chapter-analysis re-fetch");
  await test("adaptivePhase 'pathway' is in restoreOnboardingDraft()'s allowed-resume list, so a mid-flow refresh after tapping through the Chapter Analysis summary lands back on the pathway screen, not a fresh scenario-bridge fetch", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await signUpAndFillName(page, "Pathway Resume");
    await page.click("#next");
    await page.waitForSelector(".poly-svg", { timeout: 10000 });
    await page.click('[data-lock-hit="body"]');
    await page.click("#next");
    for (let i = 0; i < 2; i++) {
      await page.waitForSelector(".qcard-card", { timeout: 15000 });
      const opts = await page.locator(".qcard-answer").all();
      await opts[0].click();
      await opts[1].click();
      await page.click("#confirmCard");
    }
    await page.waitForSelector(".chapter-headline", { timeout: 15000 });
    await page.click("#toPathway");
    await page.waitForSelector(".ppick-cards", { timeout: 10000 });
    await page.waitForTimeout(700); // let the debounced draft save land
    await page.reload();
    await page.waitForSelector(".ppick-cards", { timeout: 15000 });
    assert.strictEqual(await page.locator(".bridge-root").count(), 0, "an already-reached pathway screen must restore directly, never through the bridge animation");
    assert.strictEqual(await page.locator(".chapter-headline").count(), 0, "must resume straight to the pathway screen, not back to the chapter-analysis summary");
    await context.close();
  });

  console.log("E2E: refreshing after selecting (but not confirming) a pathway card restores that same selection (round 32 - tap now selects, not confirms)");
  await test("a mid-screen card tap persists via the debounced draft save, so reloading before hitting the CTA still shows the tapped card as DIPILIH, not the default card 1", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await signUpAndFillName(page, "Pathway Selection Resume");
    await page.click("#next");
    await page.waitForSelector(".poly-svg", { timeout: 10000 });
    await page.click('[data-lock-hit="body"]');
    await page.click("#next");
    for (let i = 0; i < 2; i++) {
      await page.waitForSelector(".qcard-card", { timeout: 15000 });
      const opts = await page.locator(".qcard-answer").all();
      await opts[0].click();
      await opts[1].click();
      await page.click("#confirmCard");
    }
    await page.waitForSelector(".chapter-headline", { timeout: 15000 });
    await page.click("#toPathway");
    await page.waitForSelector(".ppick-cards", { timeout: 10000 });
    await page.locator(".ppick-col").nth(1).click(); // select card 2, do NOT tap the CTA
    await page.waitForTimeout(700); // let the debounced draft save land
    await page.reload();
    await page.waitForSelector(".ppick-cards", { timeout: 15000 });
    assert.strictEqual(await page.locator(".bridge-root").count(), 0, "restoring a mid-selection pathway screen must never replay the bridge");
    assert.strictEqual(await page.locator(".ppick-col").nth(1).locator(".ppick-dipilih").count(), 1, "the previously-tapped card (card 2) must still show DIPILIH after reload");
    assert.strictEqual(await page.locator(".ppick-col").nth(0).locator(".ppick-dipilih").count(), 0, "card 1 (the default) must not have reasserted itself over the user's actual tap");
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
