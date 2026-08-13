// Playwright e2e for the cinematic login screen v2 (design handoff 13
// Agustus, design_handoff_login_screen) - REPLACES the previous cinematic
// login (12 Agustus) wholesale. Covers: idle layout/copy, help modal,
// signup mode's beta-code + privacy-consent gating (not in the handoff's
// own reference, kept from the previous login for the same functional
// reasons), inline validation, the MASUK/DAFTAR button's 5-state machine
// (idle/loading/success/entering/complete) wired to the REAL /api/login
// //api/signup, and the crossfade into the REAL home/onboarding screen.
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
    assert.ok(await page.locator("#auth2BetaCode").count(), "beta code field missing");
    assert.ok(await page.locator("#auth2Consent").count(), "privacy consent (Task 4) missing from signup");
    assert.strictEqual(await page.locator("#auth2Submit").isDisabled(), true, "submit must be gated on consent");
    await page.click("#auth2ToggleMode");
    await page.waitForSelector("#auth2BetaCode", { state: "detached", timeout: 5000 });
    await page.click("#auth2ToggleMode"); // back to signup for the next tests
    await page.waitForSelector("#auth2BetaCode", { timeout: 5000 });
  });

  await test("beta code required: inline error before any request", async () => {
    await page.click("#auth2Consent");
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
  await test("reduced motion: state machine still runs but every hold is capped (~250ms), no full sequence delay", async () => {
    await page3.goto(BASE);
    await page3.waitForSelector("#auth2Submit", { timeout: 20000 });
    await page3.fill("#auth2Email", signupEmail);
    await page3.fill("#auth2Password", "password123");
    const t0 = Date.now();
    await page3.click("#auth2Submit");
    await page3.waitForSelector("[data-reflect-id]", { timeout: 30000 });
    const elapsed = Date.now() - t0;
    // Full-motion path is ~800(floor)+900(success)+900(entering) = 2600ms+;
    // reduced-motion caps each hold at 250ms, so total should land well under.
    assert.ok(elapsed < 2000, `reduced-motion path took ${elapsed}ms - holds not capped?`);
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
