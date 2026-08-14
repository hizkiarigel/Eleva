// Playwright e2e for the "Kartu ke-1" Question Card onboarding screen
// (design handoff, "Eleva Onboarding Question Card"). Sits between the
// "Siapa namamu?" and Growth Focus Radar steps - reuses the same shared
// fixed/no-scroll shell (.radar-header-row/.step-dots/.onboard-nav-row) as
// both, byte-matched outer padding per the founder's round-16/17 direction,
// but has its own new content (question card, instruction copy, 4 answer
// cards) and no help sheet of its own.
//
// Covers: layout/copy, the tap state machine (most -> least -> clear ->
// replace-on-3rd-tap), the 3-state instruction copy, CTA disabled/enabled
// gating, Kembali back to the name step, Lanjut on to the radar step, no
// horizontal overflow, fixed/no-scroll viewport, and position-matching
// against the radar step (same shared shell).
//
// Run: node tests/onboarding-questioncard.e2e.js
// Requires: local Postgres (same TEST_DATABASE_URL convention as
// tests/practicetest.js) and the preinstalled Playwright Chromium at
// /opt/pw-browsers/chromium.

const assert = require("assert");
const { spawn } = require("child_process");
const { chromium } = require("playwright-core");

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

  const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
  const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  async function reachQuestionCard() {
    const email = `qcard-e2e-${Date.now()}@example.com`;
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
    await page.fill("#fld", "Kartu Tester");
    await page.click("#next");
    await page.waitForSelector(".qcard-card", { timeout: 10000 });
    await page.waitForTimeout(400); // let the .fadeUp/entrance settle before measuring
  }
  await reachQuestionCard();

  console.log("E2E: layout + copy (handoff, 'Eleva Onboarding Question Card')");
  await test("header row, 3-segment progress bar (step 2/3), question card with the exact handoff copy, and all 4 answer labels render", async () => {
    assert.ok(await page.locator(".radar-header-row").count(), "header row missing");
    assert.strictEqual((await page.locator(".qcard-count").textContent()).trim(), "KARTU KE-1", "right-side header label should read KARTU KE-1");
    const dotSegs = await page.locator(".step-dots .dot-seg").count();
    assert.strictEqual(dotSegs, 3, `expected 3 step-dot segments (question card is step 2/3), got ${dotSegs}`);
    const activeDotSegs = await page.locator(".step-dots .dot-seg.active").count();
    assert.strictEqual(activeDotSegs, 2, `expected the first 2 step-dot segments active on the question card step (step 2/3), got ${activeDotSegs}`);
    assert.ok((await page.locator(".qcard-question").textContent()).includes("Hari Sabtu pagi"), "question text missing/wrong");
    const answerTexts = await page.locator(".qcard-answer-text").allTextContents();
    assert.strictEqual(answerTexts.length, 4, `expected 4 answer cards, got ${answerTexts.length}`);
    assert.ok(answerTexts[0].includes("Keluar jalan-jalan"), "answer 1 copy wrong/out of order");
    assert.ok(answerTexts[1].includes("Buka sesuatu"), "answer 2 copy wrong/out of order");
    assert.ok(answerTexts[2].includes("Cek kondisi keuangan"), "answer 3 copy wrong/out of order");
    assert.ok(answerTexts[3].includes("Duduk santai"), "answer 4 copy wrong/out of order");
    const backVisible = await page.evaluate(() => getComputedStyle(document.getElementById("back")).visibility);
    assert.strictEqual(backVisible, "visible", "Kembali must be visible on the question card step (not the first onboarding step)");
  });

  console.log("E2E: tap state machine + 3-state instruction copy + CTA gating");
  await test("tap 1 -> most (green+check), tap 2 on a different card -> least (red+minus), tapping a selected card again clears it, tapping a 3rd new card while both are filled replaces 'most', instruction text and Lanjut track every step", async () => {
    const answers = page.locator(".qcard-answer");
    const instructionText = () => page.locator(".qcard-instruction").textContent();
    const nextDisabled = () => page.evaluate(() => document.getElementById("next").disabled);

    assert.ok((await instructionText()).includes("Pilih 1 yang paling menggambarkanmu"), "initial instruction copy wrong");
    assert.strictEqual(await nextDisabled(), true, "Lanjut should start disabled");

    // tap 1 -> most
    await answers.nth(0).click();
    assert.ok(await answers.nth(0).evaluate((el) => el.classList.contains("positive")), "card 0 should be positive (most) after tap 1");
    assert.ok(await answers.nth(0).locator("svg").count(), "card 0 should show the check icon");
    assert.ok((await instructionText()).includes("Sekarang pilih 1 yang paling tidak menggambarkanmu"), "instruction should update to 'now pick least' after only most is set");
    assert.strictEqual(await nextDisabled(), true, "Lanjut should stay disabled with only 'most' selected");

    // tap 2 (different card) -> least
    await answers.nth(1).click();
    assert.ok(await answers.nth(1).evaluate((el) => el.classList.contains("negative")), "card 1 should be negative (least) after tap 2");
    assert.ok(await answers.nth(1).locator("svg").count(), "card 1 should show the minus icon");
    assert.ok((await instructionText()).includes("Pilihanmu sudah lengkap"), "instruction should show the 'complete' copy once both are set");
    assert.strictEqual(await nextDisabled(), false, "Lanjut should be enabled once both most and least are set");

    // tapping a selected card again clears it
    await answers.nth(1).click();
    assert.ok(await answers.nth(1).evaluate((el) => !el.classList.contains("negative") && !el.classList.contains("positive")), "card 1 should clear back to neutral on a 2nd tap");
    assert.ok((await instructionText()).includes("Sekarang pilih 1 yang paling tidak menggambarkanmu"), "instruction should revert to 'now pick least' after clearing least");
    assert.strictEqual(await nextDisabled(), true, "Lanjut should be disabled again after clearing least");

    // re-fill least, then tap a 3rd new card while both are filled -> replaces "most"
    await answers.nth(1).click();
    assert.strictEqual(await nextDisabled(), false, "Lanjut should be enabled again once both are re-filled");
    await answers.nth(2).click();
    assert.ok(await answers.nth(2).evaluate((el) => el.classList.contains("positive")), "card 2 (a 3rd new card) should become the new 'most'");
    assert.ok(await answers.nth(0).evaluate((el) => !el.classList.contains("positive") && !el.classList.contains("negative")), "card 0 (previous 'most') should be cleared back to neutral");
    assert.ok(await answers.nth(1).evaluate((el) => el.classList.contains("negative")), "card 1 ('least') should be untouched by the 3rd-tap replacement");
    assert.ok((await instructionText()).includes("Pilihanmu sudah lengkap"), "instruction should still read 'complete' after the replacement (both slots remain filled)");
    assert.strictEqual(await nextDisabled(), false, "Lanjut should stay enabled after the replacement");
  });

  console.log("E2E: Kembali returns to the name step");
  await test("tapping Kembali returns to the 'Siapa namamu?' step", async () => {
    await page.click("#back");
    await page.waitForSelector(".name-input", { timeout: 10000 });
    assert.strictEqual(await page.locator(".qcard-card").count(), 0, "question card screen should be gone after Kembali");
    // back to the question card step for the remaining tests
    await page.click("#next");
    await page.waitForSelector(".qcard-card", { timeout: 10000 });
  });

  console.log("E2E: fixed/no-scroll viewport at realistic heights, safety net for shorter ones");
  await test("the screen fills the viewport edge-to-edge with zero internal overflow at realistic heights (a real iPhone 12/13/14's 844px and up), and the overflow-y:auto safety net keeps Lanjut reachable at shorter heights (a real iPhone SE's 667px and an impossibly short 400px)", async () => {
    // Unlike the name/radar screens, this one has 4 answer cards (min-height
    // + font-size are both width-scaled only, per the handoff's "never
    // shrink tap targets/readability" - they do NOT compress with viewport
    // HEIGHT) plus the full question paragraph, so its floor content height
    // is genuinely taller than either of those two screens'. Measured
    // crossover to zero overflow is ~823px even with gaps compressed to
    // their floor - 844px+ (the vast majority of real phones) is verified
    // zero-overflow here; shorter devices rely on the same overflow-y:auto
    // safety net the other two onboarding screens already established.
    for (const height of [844, 900, 926]) {
      await page.setViewportSize({ width: 390, height });
      await page.waitForTimeout(120);
      const overflow = await page.evaluate(() => {
        const shell = document.querySelector(".shell-qcard");
        return shell.scrollHeight - shell.clientHeight;
      });
      assert.strictEqual(overflow, 0, `expected zero internal overflow at height=${height}, got ${overflow}px`);
    }
    for (const height of [780, 667, 400]) {
      await page.setViewportSize({ width: 390, height });
      await page.waitForTimeout(120);
      await page.locator("#next").scrollIntoViewIfNeeded();
      const nextBox = await page.locator("#next").boundingBox();
      assert.ok(nextBox, `Lanjut should still be reachable (scrolled into view) at height=${height}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(120);
  });

  console.log("E2E: no horizontal overflow at any supported width (360-430px)");
  await test("no document-level horizontal scroll at any width from 360px to 430px", async () => {
    for (const width of [360, 375, 390, 393, 414, 428, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await page.waitForTimeout(100);
      const docOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.strictEqual(docOverflow, 0, `document must not scroll horizontally at width=${width}, got ${docOverflow}px`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(120);
  });

  console.log("E2E: Lanjut navigates on to the radar step, and position-matches the shared shell");
  await test("tapping Lanjut (with both selections made) advances to the Growth Focus Radar step, and the header/step-dots/nav row land at the same position as the question card step", async () => {
    // both slots are already filled from the earlier state-machine test
    const qcardHeaderRect = await page.locator(".radar-header-row").boundingBox();
    const qcardStepDotsRect = await page.locator(".step-dots").boundingBox();
    const qcardNavRect = await page.locator(".onboard-nav-row").boundingBox();
    await page.click("#next");
    await page.waitForSelector(".poly-svg", { timeout: 10000 });
    assert.strictEqual(await page.locator(".qcard-card").count(), 0, "question card screen should be gone after Lanjut");

    const radarHeaderRect = await page.locator(".radar-header-row").boundingBox();
    const radarStepDotsRect = await page.locator(".step-dots").boundingBox();
    const radarNavRect = await page.locator(".onboard-nav-row").boundingBox();
    for (const key of ["x", "y", "width", "height"]) {
      assert.strictEqual(qcardHeaderRect[key], radarHeaderRect[key], `header row .${key} should match between question card and radar steps, got qcard=${qcardHeaderRect[key]} radar=${radarHeaderRect[key]}`);
    }
    for (const key of ["x", "y", "width", "height"]) {
      assert.strictEqual(qcardStepDotsRect[key], radarStepDotsRect[key], `step-dots .${key} should match between question card and radar steps, got qcard=${qcardStepDotsRect[key]} radar=${radarStepDotsRect[key]}`);
    }
    for (const key of ["x", "y", "width", "height"]) {
      assert.strictEqual(qcardNavRect[key], radarNavRect[key], `Kembali/Lanjut row .${key} should match between question card and radar steps, got qcard=${qcardNavRect[key]} radar=${radarNavRect[key]}`);
    }
  });

  await browser.close();
  server.kill();
  console.log(failures ? `\n${failures} E2E FAILURE(S)` : "\nALL E2E TESTS PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error("E2E run crashed:", e);
  process.exit(1);
});
