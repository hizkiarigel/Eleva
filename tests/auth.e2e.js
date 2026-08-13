// Playwright e2e for the cinematic login screen v2 (design handoff 13
// Agustus, design_handoff_login_screen) - REPLACES the previous cinematic
// login (12 Agustus) wholesale. Covers: idle layout/copy, help modal,
// signup mode's beta-code + privacy-consent gating (not in the handoff's
// own reference, kept from the previous login for the same functional
// reasons), inline validation, the MASUK/DAFTAR button's 7-state machine
// (idle/loading/success/entering/zooming/flash/complete) wired to the REAL
// /api/login //api/signup, the full-bleed zoom-gate crossfade, and the
// final crossfade into the REAL home/onboarding screen.
//
// Run: node tests/auth.e2e.js
// Requires: local Postgres (same TEST_DATABASE_URL convention as
// tests/practicetest.js) and the preinstalled Playwright Chromium at
// /opt/pw-browsers/chromium.

const assert = require("assert");
const { spawn } = require("child_process");
const { chromium } = require("playwright-core");

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

  const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });

  console.log("E2E: login screen layout & copy");
  const ctx1 = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
  const page = await ctx1.newPage();
  await page.goto(BASE);
  await page.waitForSelector("#auth2Submit", { timeout: 20000 });

  await test("login screen renders handoff copy, background art, and MASUK button", async () => {
    assert.ok(await page.locator("text=SELAMAT").count(), "headline missing");
    assert.ok(await page.locator("text=DATANG KEMBALI").count(), "headline missing");
    assert.ok(await page.locator("text=Kembali pada jalan yang").count(), "tagline missing");
    assert.ok(await page.locator(".auth2-bg-img").count(), "background art missing");
    assert.ok(await page.locator(".auth2-stickman").count(), "stickman icon missing");
    assert.ok(await page.locator(".auth2-portal-icon").count(), "portal icon missing");
    assert.ok(await page.locator("text=Lupa password?").count(), "forgot link missing");
    assert.strictEqual(await page.locator("text=Ingat saya").count(), 0, "no 'Ingat saya' row in this handoff");
    assert.strictEqual(await page.locator("text=ATAU").count(), 0, "no social-login separator in this handoff");
    assert.strictEqual((await page.locator("svg").count()), 0, "no OAuth icons in this handoff");
    const headlineFont = await page.locator(".auth2-headline").evaluate((el) => getComputedStyle(el).fontFamily);
    assert.ok(/Fraunces/.test(headlineFont), `headline font is ${headlineFont}`);
  });

  await test("help button opens the 'Tentang Eleva' bottom sheet with fixed copy", async () => {
    await page.click("#auth2HelpBtn");
    await page.waitForSelector("#auth2HelpClose", { timeout: 5000 });
    assert.ok(await page.locator("text=Tentang Eleva").count());
    assert.ok(await page.locator("text=SOMA — Body").count());
    assert.ok(await page.locator("text=LINGUA — Growth").count());
    assert.ok(await page.locator("text=LABORA — Livelihood").count());
    await page.click("#auth2HelpClose");
    await page.waitForSelector("#auth2HelpClose", { state: "detached", timeout: 5000 });
  });

  await test("password show/hide toggle flips input type + label without losing the value", async () => {
    await page.fill("#auth2Password", "password123");
    await page.click("#auth2PwToggle");
    assert.strictEqual(await page.locator("#auth2Password").getAttribute("type"), "text");
    assert.strictEqual(await page.inputValue("#auth2Password"), "password123");
    assert.ok(await page.locator("text=SEMBUNYIKAN").count(), "toggle label did not flip");
    await page.click("#auth2PwToggle");
    assert.strictEqual(await page.locator("#auth2Password").getAttribute("type"), "password");
    assert.ok(await page.locator("text=SHOW").count());
  });

  await test("empty-field validation shows the inline error, button stays idle-styled (no animation)", async () => {
    await page.fill("#auth2Email", "");
    await page.fill("#auth2Password", "");
    await page.click("#auth2Submit");
    assert.ok(await page.locator("text=Email dan password wajib diisi.").count(), "inline error missing");
    assert.strictEqual(await page.locator(".auth2-cta.auth2-loading").count(), 0, "button must not animate on validation error");
  });

  await test("wrong credentials: loading glow holds >=800ms floor then the server error lands inline", async () => {
    await page.fill("#auth2Email", `nobody-${Date.now()}@example.com`);
    await page.fill("#auth2Password", "wrongpass1");
    const t0 = Date.now();
    await page.click("#auth2Submit");
    await page.waitForSelector(".auth2-cta.auth2-loading", { timeout: 2000 });
    await page.waitForSelector("text=Email atau password salah.", { timeout: 10000 });
    const elapsed = Date.now() - t0;
    assert.ok(elapsed >= 800, `error landed too fast (${elapsed}ms) - 800ms floor not applied`);
    assert.strictEqual(await page.locator(".auth2-cta.auth2-loading").count(), 0, "button did not reset off loading state");
    assert.strictEqual(await page.locator("#auth2Submit").isDisabled(), false, "button still disabled after error");
  });

  console.log("E2E: signup mode (not in the handoff's own reference - ported from the previous login for the same functional reasons)");
  await test("toggle to DAFTAR shows beta code field + consent gate, hides on toggle back", async () => {
    await page.click("#auth2ToggleMode");
    await page.waitForSelector("text=MULAI", { timeout: 5000 });
    assert.ok(await page.locator("text=PERJALANANMU").count(), "signup headline missing");
    assert.ok(await page.locator("text=Bentuk karakter melalui").count(), "signup tagline missing");
    assert.ok(await page.locator("#auth2BetaCode").count(), "beta code field missing");
    assert.ok(await page.locator("text=KODE UNDANGAN").count(), "KODE UNDANGAN label missing");
    assert.ok(await page.locator("#auth2Consent").count(), "privacy consent (Task 4) missing from signup");
    assert.strictEqual(await page.locator("#auth2Submit").isDisabled(), true, "submit must be gated on consent");
    assert.strictEqual(await page.locator("text=Lupa password?").count(), 0, "Sign Up must have no forgot-password row (handoff v4)");
    await page.click("#auth2ToggleMode");
    await page.waitForSelector("#auth2BetaCode", { state: "detached", timeout: 5000 });
    assert.ok(await page.locator("text=Lupa password?").count(), "Login must keep its forgot-password row");
    await page.click("#auth2ToggleMode"); // back to signup for the next tests
    await page.waitForSelector("#auth2BetaCode", { timeout: 5000 });
  });

  await test("consent's bold link and the data-usage link both open the same info sheet without toggling consent; the footer stays put while the form column shifts (handoff v4)", async () => {
    assert.ok(await page.locator("#auth2ConsentTerms").count(), "bold 'Ketentuan Beta & Privasi' tap target missing");
    assert.ok(await page.locator("#auth2DataLink").count(), "'Lihat bagaimana data saya digunakan' link missing");
    await page.click("#auth2ConsentTerms");
    await page.waitForSelector("#auth2ConsentInfoClose", { timeout: 5000 });
    assert.ok(await page.locator("text=Tentang data selama Beta").count(), "consent info sheet title missing");
    assert.strictEqual(
      await page.evaluate(() => document.getElementById("auth2ConsentBox").classList.contains("on")),
      false, "clicking the bold link must not also toggle consent"
    );
    await page.click("#auth2ConsentInfoClose");
    await page.waitForSelector("#auth2ConsentInfoClose", { state: "detached", timeout: 5000 });
    await page.click("#auth2DataLink");
    await page.waitForSelector("#auth2ConsentInfoClose", { timeout: 5000 });
    await page.click("#auth2ConsentInfoBackdrop");
    await page.waitForSelector("#auth2ConsentInfoClose", { state: "detached", timeout: 5000 });
    // Form column shifts up (translateY) in Sign Up only; the footer is a
    // separate flex sibling and must stay untransformed.
    const transforms = await page.evaluate(() => ({
      formCol: getComputedStyle(document.querySelector(".auth2-form-col")).transform,
      footerCol: getComputedStyle(document.querySelector(".auth2-footer-col")).transform,
    }));
    assert.notStrictEqual(transforms.formCol, "none", "Sign Up's form column must be shifted via translateY");
    assert.strictEqual(transforms.footerCol, "none", "footer must stay pinned (no transform) regardless of the form column's shift");
  });

  await test("beta code required: inline error before any request", async () => {
    // The checkbox specifically, not the row - the row's own click-center
    // now lands inside the bold "Ketentuan Beta & Privasi" tap target
    // (handoff v4), which opens the info sheet instead of toggling consent.
    await page.click("#auth2ConsentBox");
    assert.strictEqual(await page.locator("#auth2Submit").isDisabled(), false, "consent click did not enable submit");
    await page.fill("#auth2Email", `cin-${Date.now()}@example.com`);
    await page.fill("#auth2Password", "password123");
    await page.click("#auth2Submit");
    assert.ok(await page.locator("text=Kode beta wajib diisi untuk daftar beta tester.").count(), "beta inline error missing");
  });

  let signupEmail;
  await test("real signup: loading -> success (green, 'Selamat datang di Eleva!') -> entering -> real onboarding", async () => {
    signupEmail = `cin-${Date.now()}@example.com`;
    await page.fill("#auth2Email", signupEmail);
    await page.fill("#auth2Password", "password123");
    await page.fill("#auth2BetaCode", "TESTCODE");
    await page.click("#auth2Submit");
    await page.waitForSelector(".auth2-cta.auth2-loading", { timeout: 2000 });
    await page.waitForSelector(".auth2-cta.auth2-success", { timeout: 10000 });
    assert.ok(await page.locator("text=Selamat datang di Eleva!").count(), "signup success helper wrong");
    await page.waitForSelector(".auth2-portal-glow.lit", { timeout: 5000 });
    await page.waitForSelector("text=Siapa namamu?", { timeout: 15000 });
    await page.waitForFunction(() => !document.querySelector(".auth2-flash"), null, { timeout: 5000 });
  });

  await ctx1.close();

  console.log("E2E: full-bleed zoom-gate transition (README 'entering -> zooming -> flash -> complete')");
  const ctxZoom = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
  const pageZoom = await ctxZoom.newPage();
  await test("entering hides the success glow before the zoom-gate crossfades in, zooms/brightens, then a warm-white flash carries the crossfade", async () => {
    await pageZoom.goto(BASE);
    await pageZoom.waitForSelector("#auth2Submit", { timeout: 20000 });
    await pageZoom.click("#auth2ToggleMode"); // to signup, so we can create a fresh account
    await pageZoom.waitForSelector("#auth2BetaCode", { timeout: 5000 });
    const zoomEmail = `zoom-${Date.now()}@example.com`;
    await pageZoom.fill("#auth2Email", zoomEmail);
    await pageZoom.fill("#auth2Password", "password123");
    await pageZoom.fill("#auth2BetaCode", "TESTCODE");
    await pageZoom.click("#auth2ConsentBox");
    await pageZoom.click("#auth2Submit");
    await pageZoom.waitForSelector(".auth2-cta.auth2-success", { timeout: 10000 });
    // Wait past the success hold into "entering": the glow must already be
    // display:none by the time the zoom-gate is visible, or it reads as two
    // overlapping gate animations (handoff explicit).
    await pageZoom.waitForFunction(() => {
      const glow = document.getElementById("auth2PortalGlow");
      const zw = document.getElementById("auth2ZoomWrap");
      return zw.classList.contains("visible") && getComputedStyle(glow).display === "none";
    }, null, { timeout: 5000 });
    assert.strictEqual(
      await pageZoom.evaluate(() => getComputedStyle(document.getElementById("auth2PortalGlow")).display),
      "none", "success glow must be hidden once the zoom-gate is visible"
    );
    // Zooming: the same image scales up + brightens, no new element.
    await pageZoom.waitForSelector(".auth2-zoom-wrap.zooming", { timeout: 3000 });
    await pageZoom.waitForFunction(() => {
      const img = document.getElementById("auth2ZoomImg");
      return new DOMMatrixReadOnly(getComputedStyle(img).transform).a > 2;
    }, null, { timeout: 3000 });
    // Flash: warm-white (#fff6e0), not the old amber (#f0c26a).
    await pageZoom.waitForSelector(".auth2-flash.lit", { timeout: 3000 });
    const flashBg = await pageZoom.evaluate(() => getComputedStyle(document.querySelector(".auth2-flash")).backgroundColor);
    assert.strictEqual(flashBg, "rgb(255, 246, 224)", `flash must be warm-white #fff6e0, got ${flashBg}`);
    await pageZoom.waitForSelector("text=Siapa namamu?", { timeout: 15000 });
    await pageZoom.waitForFunction(() => !document.querySelector(".auth2-flash"), null, { timeout: 5000 });
  });
  await ctxZoom.close();

  console.log("E2E: login with an existing profiled account lands on the real dashboard");
  // Profile the account via API so login leads to the dashboard branch.
  let cookieHeader = "";
  async function call(path, body) {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST", headers: { "Content-Type": "application/json", cookie: cookieHeader },
      body: JSON.stringify(body),
    });
    const setCookie = res.headers.getSetCookie?.() || [];
    if (setCookie.length) cookieHeader = setCookie.map((c) => c.split(";")[0]).join("; ");
    return res.json().catch(() => ({}));
  }
  await call("/api/login", { email: signupEmail, password: "password123" });
  await call("/api/profile", {
    name: "Login Tester",
    radarSnapshot: { body: 5, growth: 5, livelihood: 5, emotional: 5, social: 5, purpose: 5, autonomy: 5 },
    pathway: "Architect",
    goals: ["IELTS Academic band 6.5"],
  });

  const ctx2 = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
  const page2 = await ctx2.newPage();
  await test("login flow ends on the real dashboard, not a placeholder", async () => {
    await page2.goto(BASE);
    await page2.waitForSelector("#auth2Submit", { timeout: 20000 });
    await page2.fill("#auth2Email", signupEmail);
    await page2.fill("#auth2Password", "password123");
    await page2.click("#auth2Submit");
    await page2.waitForSelector(".auth2-cta.auth2-success", { timeout: 10000 });
    assert.ok(await page2.locator("text=Selamat datang kembali!").count(), "login success helper wrong");
    await page2.waitForSelector("[data-reflect-id]", { timeout: 30000 });
    await page2.waitForFunction(() => !document.querySelector(".auth2-flash"), null, { timeout: 5000 });
  });
  await ctx2.close();

  console.log("E2E: prefers-reduced-motion fallback");
  const ctx3 = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const page3 = await ctx3.newPage();
  await test("reduced motion: entering/zooming are skipped entirely (idle -> loading(300) -> success(200) -> flash(250) -> complete), no full sequence delay", async () => {
    await page3.goto(BASE);
    await page3.waitForSelector("#auth2Submit", { timeout: 20000 });
    await page3.fill("#auth2Email", signupEmail);
    await page3.fill("#auth2Password", "password123");
    const t0 = Date.now();
    await page3.click("#auth2Submit");
    // The zoom-gate must never appear under reduced motion - not just fast,
    // genuinely skipped (handoff: "no gate zoom, no parallax"). Watched
    // concurrently so its own (unmet) timeout never inflates `elapsed` below.
    let zoomWrapEverVisible = false;
    const watcher = page3.waitForFunction(
      () => document.getElementById("auth2ZoomWrap")?.classList.contains("visible"), null, { timeout: 4000 }
    ).then(() => { zoomWrapEverVisible = true; }).catch(() => {});
    await page3.waitForSelector("[data-reflect-id]", { timeout: 30000 });
    const elapsed = Date.now() - t0;
    await watcher;
    assert.strictEqual(zoomWrapEverVisible, false, "zoom-gate must never appear under reduced motion");
    // Full-motion path is ~800+900+900+1600+700 = 4900ms+; reduced-motion's
    // own distinct holds (300+200+250=750ms) plus real request latency land
    // well under that.
    assert.ok(elapsed < 2000, `reduced-motion path took ${elapsed}ms - holds not skipped/shortened?`);
  });
  await ctx3.close();

  console.log("E2E: mobile width constraint (handoff: 'must not overflow horizontally at 360-430px widths')");
  const ctx4 = await browser.newContext({ baseURL: BASE, viewport: { width: 360, height: 780 } });
  const page4 = await ctx4.newPage();
  await test("no horizontal overflow at 360px width", async () => {
    await page4.goto(BASE);
    await page4.waitForSelector("#auth2Submit", { timeout: 20000 });
    const overflow = await page4.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.strictEqual(overflow, 0, `horizontal overflow of ${overflow}px at 360px width`);
  });
  await ctx4.close();

  await browser.close();
  server.kill();
  console.log(failures ? `\n${failures} E2E FAILURE(S)` : "\nALL E2E TESTS PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error("E2E run crashed:", e);
  process.exit(1);
});
