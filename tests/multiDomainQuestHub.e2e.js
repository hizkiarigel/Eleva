// Playwright e2e for the Multi-Domain Quest Hub (design handoff, 19
// Agustus). Boots the real server keyless against the scratch Postgres DB,
// seeds a Recovery+Nutrition multi-domain quest straight into `days` (the
// keyless AI path can never produce this completionType, same reason
// tests/nutrition.e2e.js seeds its own quest shapes), drives a real
// Chromium through both completion orders, refresh-restore, the back/
// cancel semantics, and a 390x844 viewport check.
//
// Deliberately named multiDomainQuestHub.e2e.js (NOT quest-hub.e2e.js,
// already taken by the unrelated Home compact multi-quest carousel).
//
// Run: node tests/multiDomainQuestHub.e2e.js
// Requires: local Postgres (TEST_DATABASE_URL) and the preinstalled
// Playwright Chromium at /opt/pw-browsers/chromium.

const assert = require("assert");
const { spawn } = require("child_process");
const { chromium } = require("playwright-core");
const { Client } = require("pg");
const questHub = require("../server/questHub");

const PORT = 3988;
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

  const email = `mdqhub-e2e-${Date.now()}@example.com`;
  let cookieHeader = "";
  async function call(path, body, method) {
    const res = await fetch(`${BASE}${path}`, {
      method: method || (body ? "POST" : "GET"), headers: { "Content-Type": "application/json", cookie: cookieHeader },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const setCookie = res.headers.getSetCookie?.() || [];
    if (setCookie.length) cookieHeader = setCookie.map((c) => c.split(";")[0]).join("; ");
    return res.json().catch(() => ({}));
  }
  await call("/api/signup", { email, password: "password123", betaCode: "TESTCODE" });
  await call("/api/profile", {
    name: "MDQ E2E",
    radarSnapshot: { body: 5, growth: 5, livelihood: 5, emotional: 5, social: 5, purpose: 5, autonomy: 5 },
    pathway: "Architect",
    goals: ["Pulih dan makan lebih baik"],
  });

  const sql = new Client({ connectionString: env.DATABASE_URL });
  await sql.connect();
  const { rows: userRows } = await sql.query("SELECT id FROM users WHERE email = $1", [email]);
  const userId = userRows[0].id;

  async function seedQuest() {
    const t = questHub.RECOVERY_NUTRITION_TEMPLATE;
    const quest = {
      mode: "quest", completionType: "multi-domain", structuredKind: null,
      title: t.title, description: t.description, why: t.why, statFocus: t.statFocus,
      domain: t.domain, primaryFeature: t.primaryFeature, supportingFeatures: t.supportingFeatures,
      featureRequirements: t.featureRequirements, tujuanSingkat: t.tujuanSingkat,
      featureData: { RECOVERY: {}, NUTRITION: {} },
      featureState: { RECOVERY: "NOT_STARTED", NUTRITION: "NOT_STARTED" },
      status: "NOT_STARTED", goalIndex: 0,
    };
    const todayKey = new Date().toLocaleDateString("en-CA");
    const { rows } = await sql.query(
      `INSERT INTO days (user_id, goal_index, date, quest, insight, reflection, is_side_quest, is_meta)
       VALUES ($1, 0, $3, $2, NULL, NULL, false, false) RETURNING id`,
      [userId, quest, todayKey]
    );
    return rows[0].id;
  }
  const questId = await seedQuest();

  const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
  const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
  const cookies = cookieHeader.split("; ").map((pair) => {
    const eq = pair.indexOf("=");
    return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: BASE };
  });
  await context.addCookies(cookies);
  const page = await context.newPage();

  async function openDashboard() {
    await page.goto(BASE);
    await page.waitForSelector("[data-reflect-id]", { timeout: 20000 });
  }

  console.log("E2E: Home screen enhanced preview (design handoff 01-01-home.png)");
  await test("compact carousel card shows 'Recovery + Nutrition', not a description snippet", async () => {
    await openDashboard();
    assert.ok(await page.locator(".qhub-summary:has-text(\"Recovery + Nutrition\")").count(), "carousel card summary must read 'Recovery + Nutrition'");
  });

  await test("detail panel eyebrow includes the feature suffix, and the 3-tile info row renders", async () => {
    const eyebrow = await page.locator(".qhub-eyebrow").first().innerText();
    assert.ok(/RECOVERY \+ NUTRITION/.test(eyebrow), `eyebrow must include the feature suffix, got: "${eyebrow}"`);
    const tiles = page.locator(".mdq-info-tile");
    assert.strictEqual(await tiles.count(), 3, "must render exactly 3 info tiles");
    assert.ok(await page.locator(".mdq-info-tile:has-text(\"2 area utama\")").count());
    assert.ok(await page.locator(".mdq-info-tile:has-text(\"Est. waktu\")").count());
    assert.ok(await page.locator(".mdq-info-tile:has-text(\"Tujuan\")").count());
    assert.ok(await page.locator(".mdq-info-tile:has-text(\"±30 menit\")").count());
    assert.ok(await page.locator(".mdq-info-tile:has-text(\"Pulih & bertenaga\")").count());
  });

  await test("'SELESAI KETIKA' shows a live per-area checklist, both unfilled before anything is recorded", async () => {
    assert.strictEqual(await page.locator(".mdq-home-check-item").count(), 2, "must show exactly 2 checklist items (Recovery + Nutrition)");
    assert.ok(await page.locator(".mdq-home-check-item:has-text(\"Recovery requirement terpenuhi\")").count());
    assert.ok(await page.locator(".mdq-home-check-item:has-text(\"Nutrition requirement terpenuhi\")").count());
    assert.strictEqual(await page.locator(".mdq-home-check-radio.done").count(), 0, "neither area is complete yet - no radio should be filled");
  });

  console.log("E2E: Home -> Hub routing (never straight into a sub-flow)");
  await test("tapping the quest card opens the Hub overview, not a feature module", async () => {
    await openDashboard();
    await page.click("[data-reflect-id]");
    await page.waitForSelector("#mdqComplete", { timeout: 10000 });
    assert.ok(await page.locator("text=Hari Bayar Balik Tubuh").count(), "Hub title must be visible");
    assert.ok(await page.locator("#mdqComplete").count(), "Hub's Selesaikan Quest CTA must be present");
    assert.strictEqual(await page.locator("#mdqComplete").isDisabled(), true, "CTA must start disabled - nothing recorded yet");
  });

  await test("no Primary/Support/internal vocabulary leaks into the Hub UI", async () => {
    const bodyText = await page.locator(".mdq-card").first().innerText();
    assert.ok(!/\bPrimary\b/i.test(bodyText), "must not show 'Primary'");
    assert.ok(!/\bSupport(ing)?\b/i.test(bodyText), "must not show 'Support'/'Supporting'");
    assert.ok(!/progressOwner|structuredKind/.test(bodyText), "must not leak internal field names");
    assert.ok(bodyText.includes("Recovery") && bodyText.includes("Nutrition"), "both feature names must be visible");
  });

  await test("both feature cards start as 'Belum lengkap' with an Isi CTA", async () => {
    assert.strictEqual(await page.locator(".mdq-pill-empty").count(), 2, "both features start empty");
    assert.strictEqual(await page.locator('.mdq-feature-cta:has-text("Isi")').count(), 2);
  });

  console.log("E2E: Recovery module (chip picks)");
  await test("opening Recovery from its card shows the chip fields", async () => {
    await page.click('[data-mdq-open="recovery"]');
    await page.waitForSelector("#mdqSaveFeature", { timeout: 10000 });
    assert.ok(await page.locator("text=TIDUR SEMALAM").count());
    assert.ok(await page.locator("text=RECOVERY SESSION").count());
  });

  await test("picking chips and saving a partial patch returns to the Hub with an updated pill", async () => {
    await page.click('[data-mdq-chip="sleep"][data-mdq-value="Cukup"]');
    await page.click('[data-mdq-chip="energy"][data-mdq-value="Normal"]');
    await page.click("#mdqSaveFeature");
    await page.waitForSelector("#mdqBackHome", { timeout: 10000 });
    assert.ok(await page.locator("text=2 dari 4 tercatat").count(), "partial fraction must show on the Hub card");
  });

  await test("re-opening Recovery resumes the previously-saved picks (not a blank form)", async () => {
    await page.click('[data-mdq-open="recovery"]');
    await page.waitForSelector("#mdqSaveFeature", { timeout: 10000 });
    assert.strictEqual(await page.locator('[data-mdq-chip="sleep"][data-mdq-value="Cukup"].active').count(), 1);
  });

  await test("Kembali from a feature module discards an unsaved change (cancel, not save)", async () => {
    await page.click('[data-mdq-chip="soreness"][data-mdq-value="Berat"]'); // unsaved
    await page.click("#mdqBackHub");
    await page.waitForSelector("#mdqComplete", { timeout: 10000 });
    await page.click('[data-mdq-open="recovery"]');
    await page.waitForSelector("#mdqSaveFeature", { timeout: 10000 });
    assert.strictEqual(await page.locator('[data-mdq-chip="soreness"][data-mdq-value="Berat"].active').count(), 0, "unsaved pick must not have persisted");
  });

  await test("finishing Recovery's remaining fields flips its status to Selesai", async () => {
    await page.click('[data-mdq-chip="soreness"][data-mdq-value="Ringan"]');
    await page.click('[data-mdq-chip="recovery_session"][data-mdq-value="Stretching"]');
    await page.click("#mdqSaveFeature");
    await page.waitForSelector("#mdqBackHome", { timeout: 10000 });
    assert.strictEqual(await page.locator(".mdq-pill-done").count(), 1, "Recovery card should show Selesai now");
    assert.strictEqual(await page.locator('.mdq-feature-cta:has-text("Lihat/Ubah")').count(), 1);
    assert.strictEqual(await page.locator("#mdqComplete").isDisabled(), true, "still gated - Nutrition not done");
  });

  await test("Home screen's checklist reflects REAL state, not a static preview: Recovery filled, Nutrition still empty", async () => {
    await page.click("#mdqBackHome");
    await page.waitForSelector("[data-reflect-id]", { timeout: 20000 });
    assert.strictEqual(await page.locator(".mdq-home-check-radio.done").count(), 1, "exactly one area (Recovery) must show filled on Home now");
    assert.ok(await page.locator(".mdq-home-check-item:has-text(\"Recovery requirement terpenuhi\") .mdq-home-check-radio.done").count(), "the filled radio must specifically be Recovery's, not Nutrition's");
    assert.strictEqual(await page.locator(".mdq-home-check-item:has-text(\"Nutrition requirement terpenuhi\") .mdq-home-check-radio.done").count(), 0, "Nutrition must still read unfilled");
  });

  console.log("E2E: refresh mid-attempt restores Hub state (persistence)");
  await test("a hard reload drops back to Home (questHubFlow is an in-memory view pointer, same as every other flow in this app - nutritionFlow/jobMatchFlow don't survive a reload either), but re-entering the Hub shows the underlying data correctly restored: Recovery still Selesai, Nutrition still empty", async () => {
    await page.reload();
    await page.waitForSelector("[data-reflect-id]", { timeout: 20000 });
    await page.click("[data-reflect-id]");
    await page.waitForSelector("#mdqComplete", { timeout: 10000 });
    assert.strictEqual(await page.locator(".mdq-pill-done").count(), 1, "Recovery's COMPLETE state must survive the reload (persisted server-side, not in questHubFlow)");
    assert.strictEqual(await page.locator(".mdq-pill-empty").count(), 1, "Nutrition must still read empty, not corrupted by the reload");
  });

  console.log("E2E: Nutrition module (numeric steppers)");
  await test("opening Nutrition shows the three stepper fields at their fixed targets", async () => {
    await page.click('[data-mdq-open="nutrition"]');
    await page.waitForSelector("#mdqSaveFeature", { timeout: 10000 });
    assert.ok(await page.locator("text=/ 80g").count(), "protein target must read 80g");
    assert.ok(await page.locator("text=/ 2.5L").count(), "hydration target must read 2.5L");
  });

  await test("stepping a value up moves the displayed number and never goes below 0", async () => {
    for (let i = 0; i < 3; i++) await page.click('[data-mdq-step="meals"][data-mdq-delta="1"]');
    assert.ok(await page.locator("text=3 / 3").count(), "meals stepper (decimals=0) should read '3 / 3', not '3.00 / 3'"); // meals uses toFixed(0) - only protein/hydration use non-zero decimals
    await page.click('[data-mdq-step="meals"][data-mdq-delta^="-"]');
    await page.click('[data-mdq-step="meals"][data-mdq-delta^="-"]');
    await page.click('[data-mdq-step="meals"][data-mdq-delta^="-"]');
    await page.click('[data-mdq-step="meals"][data-mdq-delta^="-"]'); // one extra decrement past 0
    assert.ok(await page.locator("text=0 / 3").count(), "must clamp at 0, never negative");
  });

  await test("filling all three Nutrition fields and saving reaches the Hub with both cards Selesai", async () => {
    for (let i = 0; i < 16; i++) await page.click('[data-mdq-step="protein"][data-mdq-delta="5"]'); // 80g
    for (let i = 0; i < 10; i++) await page.click('[data-mdq-step="hydration"][data-mdq-delta="0.25"]'); // 2.5L
    for (let i = 0; i < 3; i++) await page.click('[data-mdq-step="meals"][data-mdq-delta="1"]');
    await page.click("#mdqSaveFeature");
    await page.waitForSelector("#mdqBackHome", { timeout: 10000 });
    assert.strictEqual(await page.locator(".mdq-pill-done").count(), 2, "both features must show Selesai");
    assert.ok(await page.locator("text=2 / 2 area selesai").count());
  });

  console.log("E2E: gated final CTA + completion");
  await test("Selesaikan Quest is now enabled with no helper text", async () => {
    assert.strictEqual(await page.locator("#mdqComplete").isDisabled(), false);
    assert.strictEqual(await page.locator(".mdq-helper").count(), 0, "helper text must disappear once ready");
  });

  await test("completing shows the Recovery/Nutrition confirmation and returns to Home", async () => {
    await page.click("#mdqComplete");
    await page.waitForSelector("text=Recovery ✓ / Nutrition ✓", { timeout: 20000 });
    await page.click("#dismissCompleted");
    await page.waitForSelector("[data-reflect-id]", { timeout: 20000 });
  });

  console.log("E2E: viewport check (390x844, no horizontal scroll)");
  await test("no document-level horizontal overflow on the Hub screen", async () => {
    // Fresh, isolated 2nd account rather than seeding a 2nd multi-domain
    // quest onto the 1st account's goalIndex 0 - that goal already has an
    // open quest (dismissCompleted's GET /api/state already regenerated one
    // for it once the 1st quest resolved above), and this app's "at most
    // one open quest per goal" invariant means piling a 2nd one on top via
    // raw SQL produces an ambiguous pair with no defined ordering, not a
    // safe way to get a clean Hub screen to inspect.
    const email2 = `mdqhub-e2e-2-${Date.now()}@example.com`;
    let cookie2 = "";
    async function call2(path, body, method) {
      const res = await fetch(`${BASE}${path}`, {
        method: method || (body ? "POST" : "GET"), headers: { "Content-Type": "application/json", cookie: cookie2 },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const setCookie = res.headers.getSetCookie?.() || [];
      if (setCookie.length) cookie2 = setCookie.map((c) => c.split(";")[0]).join("; ");
      return res.json().catch(() => ({}));
    }
    await call2("/api/signup", { email: email2, password: "password123", betaCode: "TESTCODE" });
    await call2("/api/profile", {
      name: "MDQ E2E 2",
      radarSnapshot: { body: 5, growth: 5, livelihood: 5, emotional: 5, social: 5, purpose: 5, autonomy: 5 },
      pathway: "Architect",
      goals: ["Pulih dan makan lebih baik"],
    });
    const { rows: userRows2 } = await sql.query("SELECT id FROM users WHERE email = $1", [email2]);
    const t = questHub.RECOVERY_NUTRITION_TEMPLATE;
    const quest2 = {
      mode: "quest", completionType: "multi-domain", structuredKind: null,
      title: t.title, description: t.description, why: t.why, statFocus: t.statFocus,
      domain: t.domain, primaryFeature: t.primaryFeature, supportingFeatures: t.supportingFeatures,
      featureRequirements: t.featureRequirements, tujuanSingkat: t.tujuanSingkat,
      featureData: { RECOVERY: {}, NUTRITION: {} },
      featureState: { RECOVERY: "NOT_STARTED", NUTRITION: "NOT_STARTED" },
      status: "NOT_STARTED", goalIndex: 0,
    };
    const todayKey2 = new Date().toLocaleDateString("en-CA");
    await sql.query(
      `INSERT INTO days (user_id, goal_index, date, quest, insight, reflection, is_side_quest, is_meta)
       VALUES ($1, 0, $3, $2, NULL, NULL, false, false) RETURNING id`,
      [userRows2[0].id, quest2, todayKey2]
    );

    const context2 = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const cookies2 = cookie2.split("; ").map((pair) => {
      const eq = pair.indexOf("=");
      return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: BASE };
    });
    await context2.addCookies(cookies2);
    const page2 = await context2.newPage();
    await page2.goto(BASE);
    await page2.waitForSelector("[data-reflect-id]", { timeout: 20000 });
    await page2.click("[data-reflect-id]");
    await page2.waitForSelector("#mdqComplete", { timeout: 10000 });
    const overflow = await page2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.strictEqual(overflow, 0, `horizontal overflow detected: ${overflow}px`);
    await page2.click('[data-mdq-open="recovery"]');
    await page2.waitForSelector("#mdqSaveFeature", { timeout: 10000 });
    const overflow2 = await page2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.strictEqual(overflow2, 0, `horizontal overflow detected on feature module: ${overflow2}px`);
    await context2.close();
  });

  await browser.close();
  await sql.end();
  server.kill();
  console.log(failures ? `\n${failures} E2E FAILURE(S)` : "\nALL E2E TESTS PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error("E2E run crashed:", e);
  process.exit(1);
});
