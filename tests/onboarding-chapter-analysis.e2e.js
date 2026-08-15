// Playwright e2e for the Chapter Analysis summary screen (round 28 design
// handoff redesign): the old combined analysis+pathway-carousel screen was
// split into 3 sequential screens - Chapter Analysis summary (this file's
// focus) -> Pathway carousel -> Goal Capture - each with a shared 3-segment
// progress bar. Covers the summary screen's own markup (radar SVG IDs,
// insightRows, pattern trait card, conditional lock-tension line), the
// 3-segment progress bar across all three screens, the CTA not re-fetching
// chapter-analysis, and the Goal Capture "back" target regression
// (must return to the pulled-out carousel, not the summary two steps back).
//
// Keyless test mode (ANTHROPIC_API_KEY deleted below, same convention as
// every other onboarding e2e test) exercises server/claude.js's
// fallbackChapterAnalysis(), whose insightRows/pattern fields are always
// present and deterministic (see AXIS_PATTERN_PHRASE/PATHWAY_PATTERN_TITLE).
//
// Run: node tests/onboarding-chapter-analysis.e2e.js
// Requires: local Postgres (same TEST_DATABASE_URL convention as
// tests/practicetest.js) and the preinstalled Playwright Chromium at
// /opt/pw-browsers/chromium.

const assert = require("assert");
const { spawn } = require("child_process");
const { chromium } = require("playwright-core");

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
  // cards (keyless fallback resolves confident:true after exactly 2, see
  // onboarding-bridge.e2e.js) -> the Chapter Analysis summary screen.
  async function reachChapterAnalysis(page, name) {
    const email = `chapter-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
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
  }

  console.log("E2E: Chapter Analysis summary screen renders headline, radar, insight rows, trait card");
  await test("the summary screen shows the exact headline/subcopy, the radar comparison SVG's IDs (PRD.md's own hard requirement), exactly 2 insight rows, and a trait card with a title+description", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await reachChapterAnalysis(page, "Summary Tester");

    assert.strictEqual((await page.locator(".chapter-headline").textContent()).trim(), "Ada pola yang mulai kelihatan.");
    assert.strictEqual((await page.locator(".chapter-subcopy").textContent()).trim(), "Dari jawabanmu, Eleva melihat beberapa hal yang menonjol.");
    for (const id of ["polyCompareSvg", "polyShapeRaw", "polyShapeCalibrated"]) {
      assert.strictEqual(await page.locator(`#${id}`).count(), 1, `expected #${id} to be present (PRD.md's existing DoD requirement)`);
    }
    assert.strictEqual(await page.locator(".chapter-insight-row").count(), 2, "expected exactly 2 insight rows");
    const rowTexts = await page.locator(".chapter-insight-text").allTextContents();
    assert.ok(rowTexts.every((t) => t.trim().length > 0), "every insight row must have non-empty text");
    const traitTitle = (await page.locator(".chapter-trait-title").textContent()).trim();
    const traitDesc = (await page.locator(".chapter-trait-desc").textContent()).trim();
    assert.ok(traitTitle.length > 0, "trait title must not be empty");
    assert.ok(traitDesc.length > 0, "trait description must not be empty");
    await context.close();
  });

  console.log("E2E: 3-segment progress bar advances correctly across analysis -> pathway -> goals");
  await test("exactly 1 segment is active on the summary, 2 on the pathway carousel, 3 on Goal Capture", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await reachChapterAnalysis(page, "Progress Tester");

    assert.strictEqual(await page.locator(".step-dots .dot-seg.active").count(), 1, "expected 1 active segment on the chapter-analysis summary");
    await page.click("#toPathway");
    await page.waitForSelector(".tarot-carousel", { timeout: 10000 });
    assert.strictEqual(await page.locator(".step-dots .dot-seg.active").count(), 2, "expected 2 active segments on the pathway carousel");
    await page.locator(".tarot-card").first().click();
    await page.waitForSelector(".goal-manuscript", { timeout: 10000 });
    assert.strictEqual(await page.locator(".step-dots .dot-seg.active").count(), 3, "expected 3 active segments on Goal Capture");
    await context.close();
  });

  console.log("E2E: the CTA navigates client-side, without re-fetching Chapter Analysis");
  await test("tapping 'Lihat Pathway-ku' just flips the screen, no extra /api/onboarding/chapter-analysis call", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    let chapterAnalysisCalls = 0;
    await page.route("**/api/onboarding/chapter-analysis", (route) => { chapterAnalysisCalls += 1; route.continue(); });
    await reachChapterAnalysis(page, "NoRefetch Tester");
    assert.strictEqual(chapterAnalysisCalls, 1, "expected exactly 1 chapter-analysis fetch to reach the summary screen");
    await page.click("#toPathway");
    await page.waitForSelector(".tarot-carousel", { timeout: 10000 });
    assert.strictEqual(chapterAnalysisCalls, 1, "tapping the CTA must not trigger a second chapter-analysis fetch");
    await context.close();
  });

  console.log("E2E: lock-tension note only renders when lockTension has entries");
  await test("no repeated contrary picks on the locked axis -> no 'Ketegangan kunci' line (keyless fallback never flags tension without real contrary signals)", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await reachChapterAnalysis(page, "NoTension Tester");
    // The keyless fallback path always returns lockTension:[] unless the
    // real computeLockTension() finds >=2 contrary picks against a locked
    // axis - this flow only answers 2 cards with arbitrary picks, not
    // deliberately contrary ones, so the note should be absent.
    assert.strictEqual(await page.locator(".chapter-lock-tension").count(), 0, "expected no lock-tension note for a flow with no deliberate contrary picks");
    await context.close();
  });

  console.log("E2E: Goal Capture's Kembali returns to the pulled-out pathway carousel, not the chapter-analysis summary");
  await test("backToPathway targets 'pathway' (round 28 fix), not 'analysis' two screens back", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await reachChapterAnalysis(page, "BackNav Tester");
    await page.click("#toPathway");
    await page.waitForSelector(".tarot-carousel", { timeout: 10000 });
    await page.locator(".tarot-card").first().click();
    await page.waitForSelector(".goal-manuscript", { timeout: 10000 });
    await page.click("#backToPathway");
    await page.waitForSelector(".tarot-carousel", { timeout: 10000 });
    assert.strictEqual(await page.locator(".chapter-headline").count(), 0, "Kembali must land on the pathway carousel, not back on the chapter-analysis summary");
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
