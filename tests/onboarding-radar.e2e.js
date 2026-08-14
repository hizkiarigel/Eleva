// Playwright e2e for the Growth Focus Radar onboarding screen (design
// handoff, "Eleva Onboarding — Growth Focus Radar"). This handoff redesigned
// the screen's visual layout/copy (header row, progress bar, trade-off
// strip, lock-instructions row, separate lock buttons, per-axis label
// placement, detail card, counter pill, toast, warning bubble, bottom
// sheets) while EXPLICITLY keeping the pre-existing evidence-weighted
// "synergy" drag-redistribution engine (applySynergyDrag) and its fixed
// zero-sum total (35, POLY_MIN=1/POLY_MAX=10) untouched - confirmed with
// the founder via AskUserQuestion before implementing, since the handoff's
// own written algorithm description was a simpler model that would have
// been a real regression against the tuned/cited production engine and its
// downstream applyCalibrationCard dependency.
//
// Covers: lock/unlock via the separate lock button, the max-3 cap warning
// bubble, Continue-button gating (>=1 lock required), drag + synergy
// redistribution + the >=2 toast, and the Help/axis-info bottom sheets
// (shared state slot, mutually exclusive).
//
// Run: node tests/onboarding-radar.e2e.js
// Requires: local Postgres (same TEST_DATABASE_URL convention as
// tests/practicetest.js) and the preinstalled Playwright Chromium at
// /opt/pw-browsers/chromium.

const assert = require("assert");
const { spawn } = require("child_process");
const { chromium } = require("playwright-core");

const PORT = 3999;
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

  async function reachRadar() {
    const email = `radar-e2e-${Date.now()}@example.com`;
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
    await page.fill("#fld", "Radar Tester");
    await page.click("#next");
    await page.waitForSelector(".poly-svg", { timeout: 10000 });
    await page.waitForTimeout(450); // let the .fadeUp entrance settle before measuring
  }
  await reachRadar();

  console.log("E2E: round 4 (repeated real-device report) - real JS-measured viewport height, not CSS dvh");
  await test("--vh is measured from the real viewport and stays correct (and the layout keeps fitting) even when visualViewport under-reports height, mimicking Safari's toolbar-visible state", async () => {
    const vh1 = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--vh"));
    assert.ok(/^8\.4\d*px$/.test(vh1.trim()), `--vh should be ~8.44px at 844px viewport height, got ${vh1}`);
    // Simulate the exact real-device bug: visualViewport.height under-reporting
    // the true available space (a visible toolbar eating real pixels) - CSS
    // dvh alone doesn't reliably reflect this on real Safari, which is why
    // --vh is measured in JS from visualViewport/innerHeight directly instead.
    await page.evaluate(() => {
      Object.defineProperty(window, "visualViewport", {
        value: { height: window.innerHeight - 120, addEventListener: () => {}, removeEventListener: () => {} },
        configurable: true,
      });
      window.dispatchEvent(new Event("resize"));
    });
    await page.waitForTimeout(150);
    const vh2 = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--vh"));
    assert.ok(/^7\.2\d*px$/.test(vh2.trim()), `--vh should drop to ~7.24px after a simulated 120px toolbar undercount, got ${vh2}`);
    const overflow = await page.evaluate(() => { const s = document.querySelector(".shell-radar"); return s.scrollHeight - s.clientHeight; });
    assert.strictEqual(overflow, 0, `layout must still fit with zero overflow under the simulated undercount, got ${overflow}px`);
    // Restore the real visualViewport for the rest of the suite.
    await page.evaluate(() => {
      delete window.visualViewport;
      window.dispatchEvent(new Event("resize"));
    });
    await page.waitForTimeout(150);
  });

  console.log("E2E: round 6 (founder: round 5's flat scale() caused NEW horizontal scrolling and wasn't needed - round 4's visual was already right, only the clipping itself was real) - height (not min-height), so position:fixed's large-viewport auto-stretch can't out-size the real small-viewport toolbar-aware box");
  await test("`.shell-radar` has no scale() transform (round 5 fully reverted) and its rendered box height tracks the real small-viewport --vh, not the large/toolbar-collapsed viewport a bare inset:0 stretch would produce", async () => {
    assert.strictEqual(await page.locator(".radar-scale-wrap").count(), 0, "round 5's scale wrapper must be fully removed");
    const transform = await page.evaluate(() => getComputedStyle(document.querySelector(".shell-radar")).transform);
    assert.strictEqual(transform, "none", ".shell-radar itself must carry no transform (was the containing-block bug for fixed-position sheets/warning bubble)");

    // Simulate a visible Safari toolbar: visualViewport under-reports the
    // true available height by 120px, but window.innerHeight (the "large"
    // viewport a bare `inset:0` stretch would use) stays unchanged. Round 4
    // already proved --vh itself tracks the smaller number; this round's
    // fix is that `.shell-radar`'s own box now has to shrink to match it
    // (via explicit `height`, not `min-height`) instead of silently
    // stretching to the larger, toolbar-ignorant containing-block height.
    await page.evaluate(() => {
      Object.defineProperty(window, "visualViewport", {
        value: { height: window.innerHeight - 120, addEventListener: () => {}, removeEventListener: () => {} },
        configurable: true,
      });
      window.dispatchEvent(new Event("resize"));
    });
    await page.waitForTimeout(150);
    const { shellHeight, innerHeight, nextBottom, overflow } = await page.evaluate(() => {
      const s = document.querySelector(".shell-radar");
      return {
        shellHeight: s.getBoundingClientRect().height,
        innerHeight: window.innerHeight,
        nextBottom: document.getElementById("next").getBoundingClientRect().bottom,
        overflow: s.scrollHeight - s.clientHeight,
      };
    });
    assert.ok(shellHeight < innerHeight - 100, `.shell-radar's box must shrink with the real small viewport, not stretch to the large one (shellHeight=${shellHeight}, innerHeight=${innerHeight})`);
    assert.ok(nextBottom <= shellHeight + 1, `Lanjut must sit inside .shell-radar's own (correctly shrunk) box (bottom=${nextBottom}, shellHeight=${shellHeight})`);
    assert.strictEqual(overflow, 0, `content must still fit with zero internal overflow under the simulated undercount, got ${overflow}px`);

    await page.evaluate(() => {
      delete window.visualViewport;
      window.dispatchEvent(new Event("resize"));
    });
    await page.waitForTimeout(150);
  });

  console.log("E2E: round 7/7b (founder feedback) - breathing margin on all sides, widened to 4px on left/right");
  await test("`.shell-radar` sits 2px in from the top/bottom real viewport edges and 4px in from the left/right edges", async () => {
    const { rect, viewportW, viewportH } = await page.evaluate(() => {
      const r = document.querySelector(".shell-radar").getBoundingClientRect();
      return { rect: { top: r.top, left: r.left, right: r.right, bottom: r.bottom }, viewportW: window.innerWidth, viewportH: window.innerHeight };
    });
    assert.strictEqual(rect.top, 2, `top margin should be exactly 2px, got ${rect.top}`);
    assert.strictEqual(rect.left, 4, `left margin should be exactly 4px, got ${rect.left}`);
    assert.strictEqual(viewportW - rect.right, 4, `right margin should be exactly 4px, got ${viewportW - rect.right}`);
    assert.ok(Math.abs(viewportH - rect.bottom - 2) < 1, `bottom margin should be ~2px, got ${viewportH - rect.bottom}`);
  });

  console.log("E2E: revision 1 (founder feedback) - fixed viewport frame, compressed to avoid scrolling, with a scroll safety net");
  await test("the screen fills the real viewport edge-to-edge and needs no scrolling at any realistic height, but the safety net keeps Continue reachable if it ever doesn't fit", async () => {
    // Round 3 (repeated real-device report): overflow:hidden + an exact
    // height:100dvh STILL bottom-clipped Kembali/Lanjut on the founder's
    // real device even after that fix - real mobile browser toolbar/zoom
    // states are too varied to guarantee a hard "never scrollable" fit
    // purely by CSS sizing math. Reverted to overflow-y:auto (matching
    // .auth2-root's already-proven pattern) as a SAFETY NET, not the
    // primary mechanism: the compression below still means scrolling is
    // essentially never needed at any realistic height, but a forced
    // impossibly-short viewport (400px - shorter than any real phone)
    // must still be scrollable so the button can never become truly
    // unreachable, whatever the real device's exact viewport turns out to be.
    for (const height of [932, 844, 736, 667, 600]) {
      await page.setViewportSize({ width: 390, height });
      await page.waitForTimeout(120);
      const { position, overflow } = await page.evaluate(() => {
        const shell = document.querySelector(".shell-radar");
        return { position: getComputedStyle(shell).position, overflow: shell.scrollHeight - shell.clientHeight };
      });
      assert.strictEqual(position, "fixed", `.shell-radar must be position:fixed at height=${height}`);
      assert.strictEqual(overflow, 0, `content must fit with zero overflow at any realistic height=${height}, got ${overflow}px`);
    }
    const hOverflow390 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.strictEqual(hOverflow390, 0, `must not overflow horizontally at 390px width, got ${hOverflow390}px`);
    await page.setViewportSize({ width: 360, height: 780 });
    await page.waitForTimeout(120);
    const hOverflow360 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.strictEqual(hOverflow360, 0, `must not overflow horizontally at 360px width (bigger heptagon, revision 1 follow-up), got ${hOverflow360}px`);

    // The safety net itself: an impossibly short viewport must still let
    // the user reach Continue by scrolling, rather than being permanently
    // stuck (the actual bug being fixed this round).
    await page.setViewportSize({ width: 390, height: 400 });
    await page.waitForTimeout(120);
    const canScrollWhenForced = await page.evaluate(() => {
      const s = document.querySelector(".shell-radar");
      const before = s.scrollTop;
      s.scrollTop = 9999;
      const after = s.scrollTop;
      return after !== before;
    });
    assert.strictEqual(canScrollWhenForced, true, "at an impossibly short viewport, the safety net must allow scrolling to reach Continue");
    const nextReachable = await page.locator("#next").isVisible();
    assert.strictEqual(nextReachable, true, "Continue must be reachable (scrolled into view) even at an impossibly short viewport");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(120);
  });

  console.log("E2E: round 8/9 (founder feedback) - heptagon grown further (POLY_MAXR 128->136->148), value numbers drop the trailing '.0', scale-guide numbers now light gray");
  await test("default axis values render as bare '5' (no '.0'), and the enlarged heptagon still fits inside the SVG's own viewBox with no clipping/overflow at the narrowest supported width", async () => {
    const bodyValueText = await page.locator('text[data-value-for="body"]').textContent();
    assert.strictEqual(bodyValueText, "5", `whole-number values must render as bare "5", not "5.0" - got "${bodyValueText}"`);

    const scaleNumFill = await page.evaluate(() => {
      const el = document.querySelector(".poly-scale-num");
      return getComputedStyle(el).fill;
    });
    assert.strictEqual(scaleNumFill, "rgb(201, 201, 201)", `scale-guide numbers (7.5/5/2.5/10) should be light gray (#c9c9c9), got ${scaleNumFill}`);

    await page.setViewportSize({ width: 360, height: 780 });
    await page.waitForTimeout(150);
    const { overflowsViewBox, hOverflow, margins } = await page.evaluate(() => {
      const svg = document.getElementById("polySvg");
      const vb = svg.viewBox.baseVal;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      svg.querySelectorAll(".poly-label, .axis-info-hit, .lock-btn-hit, .poly-outer").forEach((el) => {
        const b = el.getBBox();
        minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.width); maxY = Math.max(maxY, b.y + b.height);
      });
      const margins = { left: minX - vb.x, top: minY - vb.y, right: (vb.x + vb.width) - maxX, bottom: (vb.y + vb.height) - maxY };
      return {
        overflowsViewBox: margins.left < 0 || margins.top < 0 || margins.right < 0 || margins.bottom < 0,
        hOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        margins,
      };
    });
    assert.strictEqual(overflowsViewBox, false, `every label/icon/outer-ring must stay inside the SVG viewBox at 360px width, got margins ${JSON.stringify(margins)}`);
    assert.strictEqual(hOverflow, 0, `must not overflow the page horizontally at 360px width, got ${hOverflow}px`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
  });

  console.log("E2E: layout + copy (handoff v5, 'Growth Focus Radar')");
  await test("header row, progress bar, trade-off strip, and lock-instructions row all render with the exact handoff copy", async () => {
    assert.ok(await page.locator("text=Ke mana kamu mau").count(), "heading missing");
    assert.ok(await page.locator("text=fokus sekarang?").count(), "heading second line missing");
    assert.ok(await page.locator(".radar-help-btn").count(), "circular help button missing from header row");
    assert.ok(await page.locator(".radar-progress-fill").count(), "progress bar fill missing");
    assert.ok(await page.locator("text=Kamu tidak bisa membuat semua area jadi").count(), "trade-off strip copy missing");
    assert.ok(await page.locator(".radar-lock-instr-item", { hasText: "maksimal 3" }).count(), "lock-instructions 'maksimal 3' item missing");
    assert.ok(await page.locator(".radar-lock-instr-item", { hasText: "mengunci" }).count(), "lock-instructions 'mengunci' item missing");
    // All 7 axes, correctly labeled (including the 2-line "Emotional Stability" wrap).
    for (const label of ["Body", "Growth", "Livelihood", "Emotional", "Stability", "Social", "Purpose", "Autonomy"]) {
      assert.ok(await page.locator(`text=${label}`).count(), `axis label "${label}" missing`);
    }
    assert.strictEqual(await page.locator(".lock-btn").count(), 7, "expected 7 separate lock buttons");
  });

  console.log("E2E: lock/unlock + max-3 cap + Continue gating");
  await test("Continue starts disabled, locking an axis enables it, and the counter pill updates (no detail card - removed as redundant, revision 1 follow-up)", async () => {
    assert.strictEqual(await page.locator("#next").isDisabled(), true, "Continue must start disabled with 0 locks (handoff: 'until at least 1 axis is locked')");
    await page.click('[data-lock-hit="body"]');
    await page.waitForTimeout(120);
    assert.ok(await page.evaluate(() => document.querySelector('[data-lock-btn-for="body"]').classList.contains("locked")), "body lock button did not toggle locked");
    assert.strictEqual(await page.locator("#next").isDisabled(), false, "Continue must enable once >=1 axis is locked");
    assert.strictEqual(await page.locator(".radar-detail-card").count(), 0, "the 'Name / Bebas|Dikunci / X/10' detail card was removed - it must never appear");
    const counter = await page.locator(".radar-counter-pill").textContent();
    assert.ok(/1\s*\/\s*3/.test(counter), `counter pill wrong: ${counter}`);
  });

  await test("locking a 4th axis at the cap does not lock it and shows the exact warning bubble", async () => {
    await page.click('[data-lock-hit="growth"]');
    await page.waitForTimeout(80);
    await page.click('[data-lock-hit="livelihood"]');
    await page.waitForTimeout(80);
    assert.ok(/3\s*\/\s*3/.test(await page.locator(".radar-counter-pill").textContent()), "counter should read 3/3 at the cap");
    await page.click('[data-lock-hit="social"]');
    await page.waitForTimeout(100);
    assert.strictEqual(
      await page.evaluate(() => document.querySelector('[data-lock-btn-for="social"]').classList.contains("locked")),
      false, "a 4th axis must not lock at the cap"
    );
    assert.ok(await page.evaluate(() => document.getElementById("radarMaxLockWarning").classList.contains("visible")), "max-lock warning bubble must show");
    // <br/> between the two sentences produces no textContent whitespace of
    // its own (that's the visual line break) - the assertion reflects that.
    const warnText = (await page.locator("#radarMaxLockWarning").textContent()).replace(/\s+/g, " ").trim();
    assert.strictEqual(warnText, "Maksimal 3 prioritas.Buka salah satu prioritas dulu.", `warning copy wrong: ${warnText}`);
    // Unlocking one frees a slot back up for a later test.
    await page.click('[data-lock-hit="livelihood"]');
    await page.waitForTimeout(100);
    assert.strictEqual(
      await page.evaluate(() => document.querySelector('[data-lock-btn-for="livelihood"]').classList.contains("locked")),
      false, "unlocking must clear the locked state"
    );
  });

  console.log("E2E: drag redistribution (synergy engine, unchanged)");
  await test("dragging an axis by >=2 redistributes via the existing synergy engine, with no toast (revision 1: removed as redundant with the counter pill)", async () => {
    const svgBox = await page.locator(".poly-svg").boundingBox();
    const handleBox = await page.locator('[data-stat="autonomy"]').boundingBox();
    const beforeSum = await page.evaluate(() =>
      ["body", "growth", "livelihood", "emotional", "social", "purpose", "autonomy"]
        .reduce((s, k) => s + Number(document.querySelector(`text[data-value-for="${k}"]`).textContent), 0)
    );
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(svgBox.x + svgBox.width * 0.15, svgBox.y + svgBox.height * 0.35, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(120);
    const afterSum = await page.evaluate(() =>
      ["body", "growth", "livelihood", "emotional", "social", "purpose", "autonomy"]
        .reduce((s, k) => s + Number(document.querySelector(`text[data-value-for="${k}"]`).textContent), 0)
    );
    // The engine's fixed zero-sum budget (POLY_TOTAL=35) must survive the
    // redesign untouched - this is the whole point of keeping applySynergyDrag.
    assert.strictEqual(Math.round(afterSum), Math.round(beforeSum), `total must stay zero-sum: ${beforeSum} -> ${afterSum}`);
    const autonomyVal = Number(await page.locator('text[data-value-for="autonomy"]').textContent());
    assert.ok(autonomyVal > 5, `autonomy should have grown from a drag toward the edge, got ${autonomyVal}`);
    assert.strictEqual(await page.locator("#radarToast").count(), 0, "the drag toast was removed (founder feedback: redundant with the counter pill)");
  });

  console.log("E2E: Help sheet + per-axis info sheet (shared state slot)");
  await test("Help sheet shows the exact 'Tentang Fokus' copy, and an axis info sheet shows that axis's definition", async () => {
    await page.click(".radar-help-btn");
    await page.waitForTimeout(350);
    assert.strictEqual(await page.locator(".radar-sheet-title").textContent(), "Tentang Fokus");
    assert.strictEqual(await page.locator(".radar-sheet-body").count(), 3, "Help sheet must have exactly 3 body paragraphs");
    assert.strictEqual(await page.locator(".radar-sheet-close").textContent(), "Mengerti");
    await page.click("#helpOverlay");
    await page.waitForTimeout(350);
    assert.strictEqual(await page.locator(".radar-sheet").count(), 0, "sheet must close on backdrop tap");

    await page.click('[data-axis-info="purpose"]');
    await page.waitForTimeout(350);
    assert.strictEqual(await page.locator(".radar-sheet-title").textContent(), "Purpose");
    assert.ok((await page.locator(".radar-sheet-body").textContent()).length > 10, "axis info body missing");
    assert.strictEqual(await page.locator(".radar-sheet-close").textContent(), "Tutup");
    assert.strictEqual(await page.locator(".radar-sheet").count(), 1, "only one sheet open at a time");
    await page.click(".radar-sheet-close");
    await page.waitForTimeout(350);
    assert.strictEqual(await page.locator(".radar-sheet").count(), 0, "sheet must close on its own close button");
  });

  console.log("E2E: Continue navigates on to the adaptive phase with the locked/radar state carried over");
  await test("tapping Continue (with locks in place) advances past the radar step", async () => {
    await page.waitForSelector("#next:not([disabled])", { timeout: 5000 });
    await page.click("#next");
    await page.waitForFunction(() => !document.querySelector(".poly-svg"), null, { timeout: 10000 });
    assert.strictEqual(await page.locator(".poly-svg").count(), 0, "radar screen should be gone after Continue");
  });

  await browser.close();
  server.kill();
  console.log(failures ? `\n${failures} E2E FAILURE(S)` : "\nALL E2E TESTS PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error("E2E run crashed:", e);
  process.exit(1);
});
