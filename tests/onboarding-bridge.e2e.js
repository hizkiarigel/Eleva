// Playwright e2e for the onboarding "bridge" cinematic transitions (round
// 19) - full-screen art shown during the adaptive AI-generation wait,
// replacing the old generic spinner. Covers the state machine (bridge ->
// card, loop, early-confident -> pathway bridge -> analysis), full-screen
// isolation (no header/CTA/nav visible during a bridge), reduced motion,
// the scoped error overlay + retry, and the dev-preview mechanism's
// production/development gating.
//
// Keyless test mode (ANTHROPIC_API_KEY deleted below, same convention as
// every other onboarding e2e test) uses server/claude.js's deterministic
// fallback path: fallbackScenarioCard always confident:true after exactly
// 2 cards (SCENARIO_FALLBACK_FRAMES.length===2) - this is a REAL, not
// simulated, exercise of the "confident fires early" degrade-gracefully
// behavior (bridge sequence: intro -> quest -> pathway, never reaching
// evidence/character/adaptive/meta in the live flow - those are only
// reachable via the dev preview).
//
// Run: node tests/onboarding-bridge.e2e.js
// Requires: local Postgres (same TEST_DATABASE_URL convention as
// tests/practicetest.js) and the preinstalled Playwright Chromium at
// /opt/pw-browsers/chromium.

const assert = require("assert");
const { spawn } = require("child_process");
const { chromium } = require("playwright-core");

const PORT = 3977;
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
  const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  async function reachFirstBridge() {
    const email = `bridge-e2e-${Date.now()}@example.com`;
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
    await page.fill("#fld", "Bridge Tester");
    await page.click("#next");
    await page.waitForSelector(".poly-svg", { timeout: 10000 });
    await page.click('[data-lock-hit="body"]');
    await page.click("#next");
    await page.waitForSelector(".bridge-root", { timeout: 10000 });
  }
  await reachFirstBridge();

  console.log("E2E: bridge stage 1 (Journey) - full-screen isolation, correct asset");
  await test("the Journey bridge appears full-screen with no onboarding chrome (header/CTA/nav/help) visible on top of it", async () => {
    const src = await page.locator(".bridge-img").getAttribute("src");
    assert.strictEqual(src, "/onboarding/bridges/01-journey.webp", `expected the Journey stage's image, got ${src}`);
    for (const sel of [".radar-header-row", ".onboard-nav-row", ".btn-primary#next", ".btn-ghost#back", ".step-dots", ".qcard-answer"]) {
      assert.strictEqual(await page.locator(sel).count(), 0, `${sel} should not be present during a bridge`);
    }
    const rect = await page.locator(".bridge-root").boundingBox();
    assert.strictEqual(rect.x, 0, "bridge should be edge-to-edge (x=0), not inset like the onboarding step shells");
    assert.strictEqual(rect.y, 0, "bridge should be edge-to-edge (y=0)");
  });

  console.log("E2E: bridge -> card -> bridge loop, then early-confident -> pathway bridge -> analysis (no 3rd card)");
  await test("answering card 1 shows the Quest bridge, answering card 2 shows the Evidence bridge (checking for a 3rd card) which resolves confident (keyless fallback is confident after exactly 2 cards) and hands off to the Pathway bridge and then the pathway-selection screen - never an actual 3rd scenario card", async () => {
    // card 1 - re-skinned with the qcard visual language (round 20), same
    // real adaptiveScenario/adaptiveSelection data and axis-keyed tap
    // handler as before, only the markup/classes changed.
    await page.waitForSelector(".qcard-card", { timeout: 10000 });
    assert.strictEqual((await page.locator(".qcard-count").textContent()).trim(), "KARTU KE-1", "expected KARTU KE-1");
    const opts1 = await page.locator(".qcard-answer").all();
    await opts1[0].click();
    await opts1[1].click();
    await page.click("#confirmCard");

    // quest bridge
    await page.waitForSelector(".bridge-root", { timeout: 10000 });
    const src2 = await page.locator(".bridge-img").getAttribute("src");
    assert.strictEqual(src2, "/onboarding/bridges/02-quest.webp", `expected the Quest stage's image after card 1, got ${src2}`);

    // card 2
    await page.waitForSelector(".qcard-card", { timeout: 10000 });
    assert.strictEqual((await page.locator(".qcard-count").textContent()).trim(), "KARTU KE-2", "expected KARTU KE-2");
    const opts2 = await page.locator(".qcard-answer").all();
    await opts2[0].click();
    await opts2[1].click();
    await page.click("#confirmCard");

    // Evidence bridge: this is the "is a 3rd card needed" check - index
    // 2 in BRIDGE_LOADING_SEQUENCE, shown while requestScenarioCard is
    // in flight, exactly per the founder's "before question 3: Evidence"
    // mapping - it's showing while genuinely checking whether question 3
    // will happen, not asserting that it will.
    await page.waitForSelector(".bridge-root", { timeout: 10000 });
    const src3 = await page.locator(".bridge-img").getAttribute("src");
    assert.strictEqual(src3, "/onboarding/bridges/03-evidence.webp", `expected the Evidence stage's image while checking for card 3, got ${src3}`);

    // Once that check resolves confident (keyless fallback always is,
    // after exactly 2 previous cards), it hands off to the Pathway bridge
    // - never rendering an actual 3rd scenario card in between.
    await page.waitForFunction(
      () => document.querySelector(".bridge-img")?.getAttribute("src") === "/onboarding/bridges/07-pathway.webp",
      { timeout: 10000 },
    );
    assert.strictEqual(await page.locator(".qcard-card").count(), 0, "must not show a 3rd scenario card - confident:true should hand off to the pathway bridge instead");

    // chapter analysis summary (round 28: pulled out into its own screen,
    // ahead of the pathway carousel) - reach it, then tap through to the
    // carousel.
    await page.waitForSelector(".chapter-headline", { timeout: 10000 });
    assert.ok((await page.locator("text=Ada pola yang mulai kelihatan.").count()) > 0, "expected the Chapter Analysis summary screen after the Pathway bridge");
    await page.click("#toPathway");
    await page.waitForSelector(".tarot-carousel", { timeout: 10000 });
    assert.ok((await page.locator("text=PILIH PATHWAY").count()) > 0, "expected the pathway-selection screen after tapping through the summary");
  });

  console.log("E2E: hitting the 6-card cap goes straight to the Pathway bridge - no 'meta' flash first (round 24 bug fix)");
  await test("after the 6th card, the client already knows the next fetch is guaranteed confident (server's SCENARIO_MAX_CARDS) and skips the loading-sequence stage entirely", async () => {
    const capContext = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const capPage = await capContext.newPage();
    let scenarioCardCalls = 0;
    // Force exactly 6 non-confident cards (the keyless fallback confirms
    // after only 2, too fast to exercise this path) - a fixed valid
    // scenario+4 options every time, confident only if somehow called a
    // 7th time (which the fix must prevent).
    await capPage.route("**/api/onboarding/scenario-card", async (route) => {
      scenarioCardCalls += 1;
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          confident: scenarioCardCalls > 6,
          scenario: scenarioCardCalls > 6 ? null : `Skenario uji ke-${scenarioCardCalls}`,
          options: scenarioCardCalls > 6 ? null : [
            { axis: "body", text: "Opsi A" }, { axis: "growth", text: "Opsi B" },
            { axis: "livelihood", text: "Opsi C" }, { axis: "purpose", text: "Opsi D" },
          ],
        }),
      });
    });
    await capPage.route("**/api/onboarding/chapter-analysis", async (route) => {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          insight: "Insight uji.", pathway: "Architect", subPathway: "Architect", pathwayBlurb: "Blurb uji.",
          secondaryTrait: null, significantShifts: [], lockTension: [], rawPathwayTop2: [],
          insightRows: ["Baris insight uji 1.", "Baris insight uji 2."],
          pattern: { title: "Pola uji", description: "Deskripsi pola uji." },
        }),
      });
    });
    const email = `bridge-cap-${Date.now()}@example.com`;
    await capPage.goto(BASE);
    await capPage.waitForSelector("#auth2Submit", { timeout: 20000 });
    await capPage.click("#auth2ToggleMode");
    await capPage.waitForSelector("#auth2BetaCode", { timeout: 5000 });
    await capPage.fill("#auth2Email", email);
    await capPage.fill("#auth2Password", "password123");
    await capPage.fill("#auth2BetaCode", "TESTCODE");
    await capPage.click("#auth2ConsentBox");
    await capPage.click("#auth2Submit");
    await capPage.waitForSelector("text=Siapa namamu?", { timeout: 20000 });
    await capPage.fill("#fld", "Cap Tester");
    await capPage.click("#next");
    await capPage.waitForSelector(".poly-svg", { timeout: 10000 });
    await capPage.click('[data-lock-hit="body"]');
    await capPage.click("#next");
    for (let i = 1; i <= 6; i++) {
      await capPage.waitForSelector(".qcard-card", { timeout: 15000 });
      assert.strictEqual((await capPage.locator(".qcard-count").textContent()).trim(), `KARTU KE-${i}`);
      const opts = await capPage.locator(".qcard-answer").all();
      await opts[0].click();
      await opts[1].click();
      await capPage.click("#confirmCard");
      if (i < 6) {
        // between cards 1-5, the loading-sequence stage for the NEXT card is expected
        await capPage.waitForSelector(".bridge-root", { timeout: 10000 });
      }
    }
    // After card 6: must land directly on the Pathway bridge, never
    // re-showing "06-meta" - and the mocked scenario-card route must never
    // be called a 7th time (the fix skips that request entirely).
    await capPage.waitForSelector(".bridge-root", { timeout: 10000 });
    const src = await capPage.locator(".bridge-img").getAttribute("src");
    assert.strictEqual(src, "/onboarding/bridges/07-pathway.webp", `expected straight to the Pathway stage after card 6, got ${src}`);
    await capPage.waitForSelector(".chapter-headline", { timeout: 10000 });
    await capPage.click("#toPathway");
    await capPage.waitForSelector(".tarot-carousel", { timeout: 10000 });
    assert.strictEqual(scenarioCardCalls, 6, "must not fetch a 7th scenario card - the client already knows it would be confident");
    await capContext.close();
  });

  console.log("E2E: reduced motion - fade only, no zoom/drift, no breathing overlay");
  await test("prefers-reduced-motion:reduce disables the Ken-Burns transform and the breathing overlay, but the art still shows", async () => {
    const rmContext = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    const rmPage = await rmContext.newPage();
    const email = `bridge-rm-${Date.now()}@example.com`;
    await rmPage.goto(BASE);
    await rmPage.waitForSelector("#auth2Submit", { timeout: 20000 });
    await rmPage.click("#auth2ToggleMode");
    await rmPage.waitForSelector("#auth2BetaCode", { timeout: 5000 });
    await rmPage.fill("#auth2Email", email);
    await rmPage.fill("#auth2Password", "password123");
    await rmPage.fill("#auth2BetaCode", "TESTCODE");
    await rmPage.click("#auth2ConsentBox");
    await rmPage.click("#auth2Submit");
    await rmPage.waitForSelector("text=Siapa namamu?", { timeout: 20000 });
    await rmPage.fill("#fld", "RM Tester");
    await rmPage.click("#next");
    await rmPage.waitForSelector(".poly-svg", { timeout: 10000 });
    await rmPage.click('[data-lock-hit="body"]');
    await rmPage.click("#next");
    await rmPage.waitForSelector(".bridge-root", { timeout: 10000 });
    await rmPage.waitForTimeout(500);
    const transform = await rmPage.evaluate(() => getComputedStyle(document.querySelector(".bridge-img")).transform);
    assert.strictEqual(transform, "none", `expected no zoom/drift transform under reduced motion, got ${transform}`);
    const overlayDisplay = await rmPage.evaluate(() => getComputedStyle(document.querySelector(".bridge-overlay")).display);
    assert.strictEqual(overlayDisplay, "none", "the breathing light overlay should be hidden under reduced motion");
    const opacity = await rmPage.evaluate(() => getComputedStyle(document.querySelector(".bridge-root")).opacity);
    assert.strictEqual(opacity, "1", "the bridge art itself should still be visible under reduced motion");
    await rmContext.close();
  });

  console.log("E2E: scoped error overlay + retry (not the generic error screen, not a boot() restart)");
  await test("a failed scenario-card request shows the dark+gold bridge error overlay with the exact copy, and 'Coba lagi' re-issues only the failed request", async () => {
    const errContext = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const errPage = await errContext.newPage();
    let scenarioCardCalls = 0;
    await errPage.route("**/api/onboarding/scenario-card", async (route) => {
      scenarioCardCalls += 1;
      if (scenarioCardCalls === 1) {
        await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "forced failure" }) });
      } else {
        await route.continue();
      }
    });
    const email = `bridge-err-${Date.now()}@example.com`;
    await errPage.goto(BASE);
    await errPage.waitForSelector("#auth2Submit", { timeout: 20000 });
    await errPage.click("#auth2ToggleMode");
    await errPage.waitForSelector("#auth2BetaCode", { timeout: 5000 });
    await errPage.fill("#auth2Email", email);
    await errPage.fill("#auth2Password", "password123");
    await errPage.fill("#auth2BetaCode", "TESTCODE");
    await errPage.click("#auth2ConsentBox");
    await errPage.click("#auth2Submit");
    await errPage.waitForSelector("text=Siapa namamu?", { timeout: 20000 });
    await errPage.fill("#fld", "Err Tester");
    await errPage.click("#next");
    await errPage.waitForSelector(".poly-svg", { timeout: 10000 });
    await errPage.click('[data-lock-hit="body"]');
    await errPage.click("#next");
    await errPage.waitForSelector(".bridge-error", { timeout: 10000 });
    assert.strictEqual(await errPage.locator(".bridge-error-title").textContent(), "Belum berhasil menyiapkan langkah berikutnya.");
    assert.strictEqual(await errPage.locator(".bridge-error-sub").textContent(), "Coba lagi sebentar.");
    assert.strictEqual(await errPage.locator("#bridgeRetry").textContent(), "Coba lagi");
    assert.strictEqual(await errPage.locator(".shell").count(), 0, "must not fall back to the generic ui.view===\"error\" screen");
    await errPage.click("#bridgeRetry");
    await errPage.waitForSelector(".qcard-card", { timeout: 10000 });
    assert.strictEqual(scenarioCardCalls, 2, "retry should re-issue exactly one more scenario-card request, not restart the whole app");
    await errContext.close();
  });

  await browser.close();
  server.kill();

  console.log("E2E: dev preview - development gate");
  await test("/?debug=bridges works when /api/env reports development, and Next/Prev cycle through all 7 stages in order", async () => {
    const devPort = PORT + 1;
    const { server: devServer, log: devLog } = spawnServer(devPort, { NODE_ENV: "development" });
    await waitForServer(`http://localhost:${devPort}`, devLog);
    const devBrowser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
    const devContext = await devBrowser.newContext({ baseURL: `http://localhost:${devPort}`, viewport: { width: 390, height: 844 } });
    const devPage = await devContext.newPage();
    await devPage.goto(`http://localhost:${devPort}/?debug=bridges`);
    await devPage.waitForSelector(".bridge-dev-controls", { timeout: 10000 });
    const expectedOrder = ["01-journey", "02-quest", "03-evidence", "04-character", "05-adaptive", "06-meta", "07-pathway"];
    for (let i = 0; i < expectedOrder.length; i++) {
      const src = await devPage.locator(".bridge-img").getAttribute("src");
      assert.strictEqual(src, `/onboarding/bridges/${expectedOrder[i]}.webp`, `dev preview stage ${i + 1} should be ${expectedOrder[i]}, got ${src}`);
      if (i < expectedOrder.length - 1) await devPage.click("#bridgeDevNext");
    }
    assert.ok(await devPage.evaluate(() => document.getElementById("bridgeDevNext").disabled), "Next should be disabled on the last (7th) stage");
    await devPage.click("#bridgeDevPrev");
    const backSrc = await devPage.locator(".bridge-img").getAttribute("src");
    assert.strictEqual(backSrc, "/onboarding/bridges/06-meta.webp", "Prev from stage 7 should return to stage 6");
    await devBrowser.close();
    devServer.kill();
  });

  console.log("E2E: dev preview - inert on production");
  await test("/?debug=bridges falls through to the normal auth screen when /api/env reports production, even with the exact param", async () => {
    const prodPort = PORT + 2;
    const { server: prodServer, log: prodLog } = spawnServer(prodPort, { NODE_ENV: "production" });
    await waitForServer(`http://localhost:${prodPort}`, prodLog);
    const prodBrowser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
    const prodContext = await prodBrowser.newContext({ baseURL: `http://localhost:${prodPort}`, viewport: { width: 390, height: 844 } });
    const prodPage = await prodContext.newPage();
    const envResp = await (await fetch(`http://localhost:${prodPort}/api/env`)).json();
    assert.strictEqual(envResp.env, "production", "sanity check: /api/env should report production for this spawn");
    await prodPage.goto(`http://localhost:${prodPort}/?debug=bridges`);
    await prodPage.waitForSelector("#auth2Submit", { timeout: 20000 });
    assert.strictEqual(await prodPage.locator(".bridge-root").count(), 0, "the bridge dev preview must not activate on a production-reporting server");
    assert.strictEqual(await prodPage.locator(".bridge-dev-controls").count(), 0, "no dev-preview controls should render in production");
    await prodBrowser.close();
    prodServer.kill();
  });

  console.log(failures ? `\n${failures} E2E FAILURE(S)` : "\nALL E2E TESTS PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error("E2E run crashed:", e);
  process.exit(1);
});
