// Playwright e2e for the cinematic login/signup screen (design handoff 12
// Agustus): panel layout/copy, signup beta-code + privacy-consent gating,
// inline validation, the door animation state machine wired to the REAL
// /api/login//api/signup (500ms authenticating floor, 900ms celebrating
// hold), and the post-login cinematic ending in the REAL home render.
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

  console.log("E2E: login panel layout & copy");
  const ctx1 = await browser.newContext({ baseURL: BASE });
  const page = await ctx1.newPage();
  await page.goto(BASE);
  await page.waitForSelector(".auth-panel", { timeout: 20000 });

  await test("login panel renders handoff copy, scene, and door button", async () => {
    assert.ok(await page.locator('text=Selamat datang kembali').count(), "headline missing");
    assert.ok(await page.locator('text=Masuk untuk lanjutkan ceritamu di Eleva.').count(), "subheadline missing");
    assert.ok(await page.locator(".auth-portal-arch").count(), "portal arch missing");
    assert.ok((await page.locator(".auth-star").count()) >= 30, "stars missing");
    assert.ok(await page.locator(".auth-door").count(), "door icon missing");
    assert.ok(await page.locator('text=Ingat saya').count(), "remember row missing");
    assert.ok(await page.locator('text=Lupa password?').count(), "forgot link missing");
    assert.ok(await page.locator('text=atau lanjutkan dengan').count(), "divider missing");
    assert.ok(await page.locator(".auth-oauth-btn").count() === 2, "oauth buttons missing");
    const hlFont = await page.locator(".auth-headline").evaluate((el) => getComputedStyle(el).fontFamily);
    assert.ok(/Instrument Serif/.test(hlFont), `headline font is ${hlFont}`);
  });

  await test("password show/hide toggle flips input type without losing the value", async () => {
    await page.fill("#authPassword", "password123");
    await page.click("#authEye");
    assert.strictEqual(await page.locator("#authPassword").getAttribute("type"), "text");
    assert.strictEqual(await page.inputValue("#authPassword"), "password123");
    assert.ok(await page.locator('text=Sembunyikan').count(), "toggle label did not flip");
    await page.click("#authEye");
    assert.strictEqual(await page.locator("#authPassword").getAttribute("type"), "password");
  });

  await test("empty-field validation shows the inline error above the fields", async () => {
    await page.fill("#authPassword", "");
    await page.click("#authSubmit");
    assert.ok(await page.locator('text=Email dan password wajib diisi.').count(), "inline error missing");
  });

  await test("wrong credentials: door animation holds >=500ms then the server error lands inline", async () => {
    await page.fill("#authEmail", `nobody-${Date.now()}@example.com`);
    await page.fill("#authPassword", "wrongpass1");
    const t0 = Date.now();
    await page.click("#authSubmit");
    await page.waitForSelector(".auth-submit.authenticating", { timeout: 2000 });
    await page.waitForSelector('text=Email atau password salah.', { timeout: 10000 });
    const elapsed = Date.now() - t0;
    assert.ok(elapsed >= 500, `error landed too fast (${elapsed}ms) - 500ms floor not applied`);
    assert.strictEqual(await page.locator(".auth-submit.authenticating").count(), 0, "button did not reset to idle");
    assert.strictEqual(await page.locator("#authSubmit").isDisabled(), false, "button still disabled after error");
  });

  console.log("E2E: signup mode");
  await test("toggle to signup shows beta code field + consent gate", async () => {
    await page.click("#authToggle");
    await page.waitForSelector('text=Mulai perjalananmu', { timeout: 5000 });
    assert.ok(await page.locator('text=Daftar beta tester Eleva.').count(), "signup subheadline missing");
    assert.ok(await page.locator("#authBetaCode").count(), "beta code field missing");
    assert.ok(await page.locator('text=Wajib diisi — daftar beta tester butuh kode dari founder.').count(), "beta caption missing");
    assert.strictEqual(await page.locator('text=Ingat saya').count(), 0, "remember row must not render in signup");
    assert.ok(await page.locator("#authConsent").count(), "privacy consent (Task 4) missing from signup");
    assert.strictEqual(await page.locator("#authSubmit").isDisabled(), true, "submit must be gated on consent");
  });

  await test("beta code required: inline error before any request", async () => {
    await page.click("#authConsent");
    assert.strictEqual(await page.locator("#authSubmit").isDisabled(), false, "consent click did not enable submit");
    await page.fill("#authEmail", `cin-${Date.now()}@example.com`);
    await page.fill("#authPassword", "password123");
    await page.click("#authSubmit");
    assert.ok(await page.locator('text=Kode beta wajib diisi untuk daftar beta tester.').count(), "beta inline error missing");
  });

  let signupEmail;
  await test("real signup: authenticating -> celebrating (green + check) -> cinematic -> real onboarding", async () => {
    signupEmail = `cin-${Date.now()}@example.com`;
    await page.fill("#authEmail", signupEmail);
    await page.fill("#authPassword", "password123");
    await page.fill("#authBetaCode", "TESTCODE");
    await page.click("#authSubmit");
    await page.waitForSelector(".auth-submit.authenticating", { timeout: 2000 });
    await page.waitForSelector(".auth-submit.celebrating", { timeout: 10000 });
    assert.ok(await page.locator('text=Selamat datang di Eleva!').count(), "signup celebrating helper wrong");
    // Cinematic phase spot-checks, then the REAL onboarding render at the end.
    await page.waitForSelector(".auth-portal-arch.lit", { timeout: 5000 });
    await page.waitForSelector(".auth-scene.camera-push", { timeout: 5000 });
    await page.waitForSelector('text=Siapa namamu?', { timeout: 15000 });
    await page.waitForFunction(() => !document.querySelector(".auth-flash"), null, { timeout: 5000 });
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
    name: "Cinematic Tester",
    radarSnapshot: { body: 5, growth: 5, livelihood: 5, emotional: 5, social: 5, purpose: 5, autonomy: 5 },
    pathway: "Architect",
    goals: ["IELTS Academic band 6.5"],
  });

  const ctx2 = await browser.newContext({ baseURL: BASE });
  const page2 = await ctx2.newPage();
  await test("login flow ends on the real dashboard, not a placeholder", async () => {
    await page2.goto(BASE);
    await page2.waitForSelector(".auth-panel", { timeout: 20000 });
    await page2.fill("#authEmail", signupEmail);
    await page2.fill("#authPassword", "password123");
    await page2.click("#authSubmit");
    await page2.waitForSelector(".auth-submit.celebrating", { timeout: 10000 });
    assert.ok(await page2.locator('text=Selamat datang kembali!').count(), "login celebrating helper wrong");
    await page2.waitForSelector("[data-reflect-id]", { timeout: 30000 });
    await page2.waitForFunction(() => !document.querySelector(".auth-flash"), null, { timeout: 5000 });
  });
  await ctx2.close();

  console.log("E2E: prefers-reduced-motion fallback");
  const ctx3 = await browser.newContext({ baseURL: BASE, reducedMotion: "reduce" });
  const page3 = await ctx3.newPage();
  await test("reduced motion: no phase cinematic, simple crossfade to the real screen", async () => {
    await page3.goto(BASE);
    await page3.waitForSelector(".auth-panel", { timeout: 20000 });
    await page3.fill("#authEmail", signupEmail);
    await page3.fill("#authPassword", "password123");
    const t0 = Date.now();
    await page3.click("#authSubmit");
    await page3.waitForSelector("[data-reflect-id]", { timeout: 30000 });
    // No camera push / lit portal should ever have appeared, and the whole
    // handover should be far quicker than the 3.5s phase table.
    assert.strictEqual(await page3.locator(".auth-scene.camera-push").count(), 0, "camera push must be skipped");
    const elapsed = Date.now() - t0;
    assert.ok(elapsed < 3400, `reduced-motion path took ${elapsed}ms - phase table not skipped?`);
  });
  await ctx3.close();

  await browser.close();
  server.kill();
  console.log(failures ? `\n${failures} E2E FAILURE(S)` : "\nALL E2E TESTS PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error("E2E run crashed:", e);
  process.exit(1);
});
