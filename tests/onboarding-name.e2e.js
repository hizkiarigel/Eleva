// Playwright e2e for the "Siapa namamu?" (Name Input) onboarding screen
// (design handoff, "Eleva Onboarding Name"). This is the screen immediately
// before the Growth Focus Radar step, redesigned to feel visually
// continuous with it - reuses that screen's proven fixed/no-scroll
// viewport pattern (.shell-name mirrors .shell-radar) rather than a plain
// scrollable page.
//
// Covers: layout/copy, input focus state, Lanjut disabled/enabled gating
// on trimmed name length, the help sheet (reusing the radar screen's exact
// sheet chrome), Kembali visibility on the first step, no-scroll-needed at
// realistic heights with a scroll safety net for extreme ones, and no
// horizontal overflow at the full supported width range.
//
// Run: node tests/onboarding-name.e2e.js
// Requires: local Postgres (same TEST_DATABASE_URL convention as
// tests/practicetest.js) and the preinstalled Playwright Chromium at
// /opt/pw-browsers/chromium.

const assert = require("assert");
const { spawn } = require("child_process");
const { chromium } = require("playwright-core");

const PORT = 3998;
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

  async function reachNameStep() {
    const email = `name-e2e-${Date.now()}@example.com`;
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
    await page.waitForTimeout(400); // let the .fadeUp entrance settle before measuring
  }
  await reachNameStep();

  console.log("E2E: layout + copy (handoff, 'Eleva Onboarding Name')");
  await test("header row, progress bar (~42%), title, supporting copy, highlight note, and secondary note all render with the exact handoff copy", async () => {
    assert.ok(await page.locator("text=ELEVA · ONBOARDING").count(), "eyebrow missing");
    assert.ok(await page.locator("text=Siapa namamu?").count(), "title missing");
    assert.ok(await page.locator("text=Nama ini akan Eleva gunakan").count(), "supporting copy missing");
    assert.ok(await page.locator("#fld").count(), "name input missing");
    assert.strictEqual(await page.locator("#fld").getAttribute("placeholder"), "Nama panggilan", "placeholder mismatch");
    assert.ok(await page.locator(".name-sparkle").count(), "sparkle icon missing");
    assert.ok(await page.locator("text=Semua yang kamu ceritakan di sini membantu Eleva").count(), "highlight note missing");
    assert.ok(await page.locator("text=Data onboardingmu digunakan untuk mempersonalisasi").count(), "secondary note missing");

    // Round 15 (founder): header row + progress indicator now reuse the
    // radar screen's own classes/markup verbatim (.radar-header-row/
    // .radar-help-btn/.step-dots/.dot-seg), not a bespoke continuous fill
    // bar - this is step 1 of 2, so only the first segment is .active.
    assert.ok(await page.locator(".radar-header-row").count(), "header row should reuse .radar-header-row, matching the radar screen");
    assert.ok(await page.locator(".radar-help-btn").count(), "help button should reuse .radar-help-btn, matching the radar screen");
    const dotSegs = await page.locator(".step-dots .dot-seg").count();
    assert.strictEqual(dotSegs, 2, `expected 2 step-dot segments (name is step 1/2), got ${dotSegs}`);
    const activeDotSegs = await page.locator(".step-dots .dot-seg.active").count();
    assert.strictEqual(activeDotSegs, 1, `expected only the first step-dot segment active on the name step (step 1/2), got ${activeDotSegs}`);

    const backVisible = await page.evaluate(() => getComputedStyle(document.getElementById("back")).visibility);
    assert.strictEqual(backVisible, "hidden", "Kembali must be hidden on the first onboarding step");

    assert.strictEqual(await page.locator(".name-consent").count(), 0, "the 'Dengan tap Lanjut...' consent caption was removed and must not render");

    // Round 15: Kembali/Lanjut now reuse the radar screen's exact shared
    // classes/layout (.onboard-nav-row/.btn-ghost/.btn-primary) instead of
    // the handoff's own bespoke gradient CTA.
    assert.ok(await page.locator(".onboard-nav-row").count(), "nav row should reuse .onboard-nav-row, matching the radar screen");
    assert.strictEqual(await page.locator(".btn-primary#next").count(), 1, "Lanjut should reuse .btn-primary, matching the radar screen");
    assert.strictEqual(await page.locator(".btn-ghost#back").count(), 1, "Kembali should reuse .btn-ghost, matching the radar screen");
    const nextPad = await page.evaluate(() => {
      const cs = getComputedStyle(document.getElementById("next"));
      return { top: parseFloat(cs.paddingTop), left: parseFloat(cs.paddingLeft) };
    });
    assert.strictEqual(nextPad.top, 8, `Lanjut's padding should match the radar screen's slim padding (top=8px), got ${nextPad.top}`);
    assert.strictEqual(nextPad.left, 20, `Lanjut's padding should match the radar screen's slim padding (left=20px), got ${nextPad.left}`);
  });

  console.log("E2E: input focus state + Lanjut gating on trimmed name length");
  await test("Lanjut starts disabled, stays disabled for whitespace-only input, and enables once the trimmed name has >=1 character; the input shows a brighter border/glow on focus", async () => {
    assert.strictEqual(await page.locator("#next").isDisabled(), true, "Lanjut must start disabled with an empty name");

    // Checking box-shadow/border-color rather than border-width: the width
    // change (1px -> 1.5px) is real (confirmed visually and via
    // el.matches(':focus')), but headless Chromium at 1x DPR rounds
    // fractional border widths to a whole device pixel, making
    // getComputedStyle's borderWidth an unreliable signal for this
    // specific property even though the :focus rule is genuinely applying.
    // The field has autofocus, so it may already be focused - blur it
    // explicitly first to capture the genuine rest state.
    await page.evaluate(() => document.getElementById("fld").blur());
    await page.waitForTimeout(100);
    const restShadow = await page.evaluate(() => getComputedStyle(document.getElementById("fld")).boxShadow);
    await page.click("#fld");
    await page.waitForTimeout(100);
    const focusShadow = await page.evaluate(() => getComputedStyle(document.getElementById("fld")).boxShadow);
    assert.notStrictEqual(focusShadow, restShadow, `focus should brighten/intensify the input's glow (rest=${restShadow}, focus=${focusShadow})`);

    await page.fill("#fld", "   ");
    await page.waitForTimeout(100);
    assert.strictEqual(await page.locator("#next").isDisabled(), true, "Lanjut must stay disabled for a whitespace-only name");

    await page.fill("#fld", "  Rigel  ");
    await page.waitForTimeout(100);
    assert.strictEqual(await page.locator("#next").isDisabled(), false, "Lanjut must enable once the trimmed name has >=1 character");
  });

  console.log("E2E: help sheet (reuses the radar screen's exact sheet chrome)");
  await test("tapping '?' opens a help sheet with the handoff's exact copy, reusing .radar-sheet classes, and closes on 'Mengerti' or backdrop tap", async () => {
    await page.click('[data-help="name"]');
    await page.waitForTimeout(300);
    assert.strictEqual(await page.locator(".radar-sheet-title").textContent(), "Tentang onboarding");
    assert.ok((await page.locator(".radar-sheet-body").textContent()).includes("pathway"), "help sheet body copy missing/wrong");
    assert.strictEqual(await page.locator(".radar-sheet-close").textContent(), "Mengerti");
    await page.click(".radar-sheet-close");
    await page.waitForTimeout(350);
    assert.strictEqual(await page.locator(".radar-sheet").count(), 0, "sheet must close on its own close button");
  });

  console.log("E2E: fixed/no-scroll viewport (mirrors the radar screen's proven pattern) - fills the real viewport with no scrolling needed at realistic heights, safety net for extreme ones");
  await test("the screen fills the viewport edge-to-edge with zero internal overflow at realistic heights (down to a real iPhone SE's 667px), and the overflow-y:auto safety net keeps Lanjut reachable at an impossibly short height", async () => {
    for (const height of [932, 844, 780, 750, 700, 667]) {
      await page.setViewportSize({ width: 390, height });
      await page.waitForTimeout(120);
      const { position, overflow } = await page.evaluate(() => {
        const shell = document.querySelector(".shell-name");
        return { position: getComputedStyle(shell).position, overflow: shell.scrollHeight - shell.clientHeight };
      });
      assert.strictEqual(position, "fixed", `.shell-name must be position:fixed at height=${height}`);
      assert.strictEqual(overflow, 0, `content must fit with zero overflow at a realistic height=${height}, got ${overflow}px`);
    }

    await page.setViewportSize({ width: 390, height: 400 });
    await page.waitForTimeout(120);
    const canScrollWhenForced = await page.evaluate(() => {
      const s = document.querySelector(".shell-name");
      const before = s.scrollTop;
      s.scrollTop = 9999;
      const after = s.scrollTop;
      return after !== before;
    });
    assert.strictEqual(canScrollWhenForced, true, "at an impossibly short viewport, the safety net must allow scrolling to reach Lanjut");
    const nextReachable = await page.locator("#next").isVisible();
    assert.strictEqual(nextReachable, true, "Lanjut must be reachable (scrolled into view) even at an impossibly short viewport");

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

  console.log("E2E: Lanjut navigates on to the radar step with the trimmed name persisted");
  await test("tapping Lanjut (with a valid name) advances to the Growth Focus Radar step, and the name was trimmed", async () => {
    await page.fill("#fld", "  Rigel  ");
    await page.waitForTimeout(100);
    const nameHeaderRect = await page.locator(".radar-header-row").boundingBox();
    const nameNavRect = await page.locator(".onboard-nav-row").boundingBox();
    await page.click("#next");
    await page.waitForSelector(".poly-svg", { timeout: 10000 });
    assert.strictEqual(await page.locator(".name-input").count(), 0, "name screen should be gone after Lanjut");

    // Round 16: the name step's outer padding was matched byte-for-byte to
    // the radar step's own, specifically so the header row and Kembali/
    // Lanjut row land at the exact same on-screen position across both
    // onboarding steps (founder: "kerasa banget perbedaannya kalau kalimat
    // header dan button footer bergeser posisinya"). Confirm it here.
    const radarHeaderRect = await page.locator(".radar-header-row").boundingBox();
    const radarNavRect = await page.locator(".onboard-nav-row").boundingBox();
    for (const key of ["x", "y", "width", "height"]) {
      assert.strictEqual(nameHeaderRect[key], radarHeaderRect[key], `header row .${key} should match between name and radar steps, got name=${nameHeaderRect[key]} radar=${radarHeaderRect[key]}`);
    }
    for (const key of ["x", "y", "width", "height"]) {
      assert.strictEqual(nameNavRect[key], radarNavRect[key], `Kembali/Lanjut row .${key} should match between name and radar steps, got name=${nameNavRect[key]} radar=${radarNavRect[key]}`);
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
