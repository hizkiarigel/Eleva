// Playwright e2e for the Goal Setting screen (round 33 design handoff
// redesign): replaces the old plain 3-input "manuscript" (zero validation,
// any non-empty text shipped) with 3 stateful cards, each gated by real AI
// goal-validation before it can count. Covers: default expand/collapse
// state, the Set Goal -> approved/needs_improvement paths, one-click
// recommendation approval, Edit/Ubah-sendiri reverts, CTA gating on Goal 1
// alone, the Ganti Pathway discard-confirm gate, and - the single highest-
// value regression here - that only APPROVED goals ship on submit (an
// explicit behavior change from the old screen's "any non-empty text
// ships").
//
// Keyless test mode (ANTHROPIC_API_KEY deleted below, same convention as
// every other onboarding e2e test) exercises server/claude.js's
// fallbackGoalValidation() - the SAME deterministic heuristic as the design
// handoff's own mockValidate() (length>=20 + timeframe keyword + a digit),
// reused as a real, honest keyless fallback rather than a fake always-pass.
//
// Run: node tests/onboarding-goal-setting.e2e.js
// Requires: local Postgres (same TEST_DATABASE_URL convention as
// tests/practicetest.js) and the preinstalled Playwright Chromium at
// /opt/pw-browsers/chromium.

const assert = require("assert");
const { spawn } = require("child_process");
const { chromium } = require("playwright-core");

const PORT = 3994;
const BASE = `http://localhost:${PORT}`;
const CHROMIUM = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";

// A goal string engineered to pass fallbackGoalValidation()'s heuristic:
// length >= 20 chars, a timeframe keyword (minggu/bulan/etc), and a digit.
const PASSING_GOAL = "Latihan public speaking 2x seminggu selama 3 bulan";
// Fails all 3 checks - short, no timeframe keyword, no digit.
const FAILING_GOAL = "olahraga";

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

function spawnServer(port, extraEnv) {
  const env = {
    ...process.env,
    DATABASE_URL: process.env.TEST_DATABASE_URL || "postgres://postgres:testpass@localhost:5432/eleva_test",
    SESSION_SECRET: "testsecret", BETA_CODE: "TESTCODE", PORT: String(port),
    ...extraEnv,
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

(async () => {
  const { server, log } = spawnServer(PORT, {});
  await waitForServer(BASE, log);

  const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });

  // Drives a fresh account through signup -> name -> radar -> 2 scenario
  // cards -> Chapter Analysis -> Pilih Pathway -> the Goal Setting screen.
  async function reachGoalSetting(page, name) {
    const email = `goalset-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
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
    await page.click("#next");
    await page.waitForSelector(".poly-svg", { timeout: 10000 });
    await page.click('[data-lock-hit="body"]');
    await page.click("#next");
    await page.waitForSelector(".bridge-root", { timeout: 10000 });
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
    await page.click("#confirmPathway");
    await page.waitForSelector(".gset-cards", { timeout: 10000 });
  }

  console.log("E2E: default state - Goal 1 expanded/no chevron, Goal 2/3 collapsed with chevrons, CTA disabled");
  await test("Goal 1 renders required/expanded with no toggle; Goal 2/3 render optional/collapsed by default; CTA is disabled until Goal 1 is approved", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await reachGoalSetting(page, "Default State Tester");

    assert.strictEqual(await page.locator("[data-goal-text='0']").count(), 1, "Goal 1's textarea must be visible (always expanded)");
    assert.strictEqual(await page.locator("[data-goal-head='0'] .gset-chevron").count(), 0, "Goal 1 must have no chevron - it can never be collapsed");
    for (const i of [1, 2]) {
      assert.strictEqual(await page.locator(`[data-goal-text='${i}']`).count(), 0, `Goal ${i + 1}'s textarea must be hidden while collapsed`);
      assert.strictEqual(await page.locator(`[data-goal-head='${i}'] .gset-chevron`).count(), 1, `Goal ${i + 1} must show a chevron (optional, collapsible)`);
    }
    assert.ok(await page.locator("#startFirstTrial").isDisabled(), "CTA must start disabled - Goal 1 isn't approved yet");
    await context.close();
  });

  console.log("E2E: Set Goal on a short/unclear text -> needs_improvement, feedback + exactly 2 Pilih recommendations, one-click approval");
  await test("a heuristic-failing goal shows a feedback sentence and exactly 2 lettered recommendations; clicking Pilih on one approves immediately, no second Set Goal press", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await reachGoalSetting(page, "Needs Improvement Tester");

    await page.fill("[data-goal-text='0']", FAILING_GOAL);
    await page.click("[data-goal-set='0']");
    await page.waitForSelector(".gset-feedback-box", { timeout: 10000 });

    const feedback = (await page.locator(".gset-feedback-text").first().textContent()).trim();
    assert.ok(feedback.length > 0, "expected a non-empty feedback sentence");
    const recoRows = await page.locator("[data-goal-pick='0']").count();
    assert.strictEqual(recoRows, 2, "expected exactly 2 recommendation rows");
    const letters = await page.locator(".gset-reco-letter").allTextContents();
    assert.deepStrictEqual(letters, ["A.", "B."], "recommendation rows must be lettered A./B.");

    await page.click("[data-goal-pick='0'][data-reco-idx='0']");
    await page.waitForSelector(".gset-check", { timeout: 10000 });
    assert.strictEqual(await page.locator(".gset-feedback-box").count(), 0, "feedback panel must be gone once a recommendation is picked");
    assert.ok(!(await page.locator("#startFirstTrial").isDisabled()), "CTA must enable once Goal 1 is approved");
    await context.close();
  });

  console.log("E2E: Set Goal on a clear/measurable text -> approved directly (green, check, Edit link)");
  await test("a heuristic-passing goal goes straight to approved - green border, checkmark, Edit link, CTA enabled", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await reachGoalSetting(page, "Approved Tester");

    await page.fill("[data-goal-text='0']", PASSING_GOAL);
    await page.click("[data-goal-set='0']");
    await page.waitForSelector(".gset-check", { timeout: 10000 });
    assert.strictEqual((await page.locator(".gset-approved-text").first().textContent()).trim(), PASSING_GOAL, "approved body must show the exact goal text in place");
    assert.strictEqual(await page.locator("[data-goal-edit='0']").count(), 1, "expected an Edit link on the approved card");
    assert.ok(!(await page.locator("#startFirstTrial").isDisabled()), "CTA must be enabled");
    await context.close();
  });

  console.log("E2E: Edit reverts an approved goal to draft (orange), keeping the text; CTA re-disables");
  await test("clicking Edit on an approved Goal 1 reverts it to draft/orange and re-disables the CTA, without losing the typed text", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await reachGoalSetting(page, "Edit Revert Tester");

    await page.fill("[data-goal-text='0']", PASSING_GOAL);
    await page.click("[data-goal-set='0']");
    await page.waitForSelector(".gset-check", { timeout: 10000 });
    await page.click("[data-goal-edit='0']");
    await page.waitForSelector("[data-goal-text='0']", { timeout: 5000 });
    assert.strictEqual(await page.locator("[data-goal-text='0']").inputValue(), PASSING_GOAL, "reverting to draft must keep the previously-approved text");
    assert.ok(await page.locator("#startFirstTrial").isDisabled(), "CTA must re-disable once Goal 1 is no longer approved");
    await context.close();
  });

  console.log("E2E: Ubah sendiri reverts needs_improvement to plain draft editing, dropping the feedback/recommendations");
  await test("'Ubah sendiri' returns to plain editing with the feedback panel gone", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await reachGoalSetting(page, "Ubah Sendiri Tester");

    await page.fill("[data-goal-text='0']", FAILING_GOAL);
    await page.click("[data-goal-set='0']");
    await page.waitForSelector(".gset-feedback-box", { timeout: 10000 });
    await page.click("[data-goal-own='0']");
    await page.waitForSelector(".gset-feedback-box", { state: "detached", timeout: 5000 }).catch(() => {});
    assert.strictEqual(await page.locator(".gset-feedback-box").count(), 0, "feedback panel must be gone after Ubah sendiri");
    assert.strictEqual(await page.locator("[data-goal-text='0']").inputValue(), FAILING_GOAL, "the user's own text must still be there to edit");
    await context.close();
  });

  console.log("E2E: Goal 2/3 chevron expand/collapse");
  await test("clicking Goal 2's head row expands it (textarea appears); clicking again collapses it back", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await reachGoalSetting(page, "Chevron Tester");

    await page.click("[data-goal-head='1']");
    await page.waitForSelector("[data-goal-text='1']", { timeout: 5000 });
    await page.click("[data-goal-head='1']");
    await page.waitForSelector("[data-goal-text='1']", { state: "detached", timeout: 5000 });
    assert.strictEqual(await page.locator("[data-goal-text='1']").count(), 0, "Goal 2 must collapse back on a second click");
    await context.close();
  });

  console.log("E2E: CTA gated on Goal 1 alone - Goal 2/3 emptiness never blocks it");
  await test("approving only Goal 1 enables the CTA even with Goal 2/3 left completely empty", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await reachGoalSetting(page, "CTA Gate Tester");

    await page.fill("[data-goal-text='0']", PASSING_GOAL);
    await page.click("[data-goal-set='0']");
    await page.waitForSelector(".gset-check", { timeout: 10000 });
    assert.ok(!(await page.locator("#startFirstTrial").isDisabled()), "CTA must be enabled with only Goal 1 approved and Goal 2/3 untouched");
    await context.close();
  });

  console.log("E2E: Ganti Pathway - immediate discard when Goal 1 is unapproved, confirm gate when it's approved");
  await test("Ganti Pathway discards immediately with no approved Goal 1; shows a confirm sheet (Batal/Ya) once Goal 1 is approved", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await reachGoalSetting(page, "Ganti Pathway Tester");

    // No approved goal yet - immediate discard, no confirm overlay.
    await page.click("#gantiPathway");
    await page.waitForSelector(".ppick-cards", { timeout: 5000 });

    // Go back through, approve Goal 1 this time.
    await page.click("#confirmPathway");
    await page.waitForSelector(".gset-cards", { timeout: 10000 });
    await page.fill("[data-goal-text='0']", PASSING_GOAL);
    await page.click("[data-goal-set='0']");
    await page.waitForSelector(".gset-check", { timeout: 10000 });

    await page.click("#gantiPathway");
    await page.waitForSelector("#gantiConfirmOverlay", { timeout: 5000 });
    await page.click("#gantiConfirmCancel");
    assert.strictEqual(await page.locator(".gset-cards").count(), 1, "Batal must cancel and stay on the Goal Setting screen");

    await page.click("#gantiPathway");
    await page.waitForSelector("#gantiConfirmOverlay", { timeout: 5000 });
    await page.click("#gantiConfirmOk");
    await page.waitForSelector(".ppick-cards", { timeout: 10000 });
    await context.close();
  });

  console.log("E2E: submit ships only APPROVED goals - unapproved draft text in Goal 2/3 is silently dropped (round 33 behavior change)");
  await test("submitting with Goal 1 approved + Goal 2 typed-but-unapproved + Goal 3 empty sends only Goal 1's text to /api/profile", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await reachGoalSetting(page, "Approved Only Submit Tester");

    await page.fill("[data-goal-text='0']", PASSING_GOAL);
    await page.click("[data-goal-set='0']");
    await page.waitForSelector(".gset-check", { timeout: 10000 });

    await page.click("[data-goal-head='1']");
    await page.waitForSelector("[data-goal-text='1']", { timeout: 5000 });
    await page.fill("[data-goal-text='1']", "goal kedua belum di-set, tidak boleh ikut submit");

    let profileBody = null;
    await page.route("**/api/profile", (route) => {
      profileBody = JSON.parse(route.request().postData());
      route.continue();
    });
    await page.click("#startFirstTrial");
    await page.waitForSelector("[data-tab]", { timeout: 15000 }); // real dashboard, confirms the submit actually completed

    assert.ok(profileBody, "expected /api/profile to have been called");
    assert.deepStrictEqual(profileBody.goals, [PASSING_GOAL], "only the approved Goal 1 text should be submitted - unapproved Goal 2 draft text must be dropped");
    await context.close();
  });

  await browser.close();
  server.kill();

  console.log(failures ? `\n${failures} E2E FAILURE(S)` : "\nALL E2E TESTS PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
