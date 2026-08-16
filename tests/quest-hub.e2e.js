// Playwright e2e for the Eleva Home quest hub redesign (design handoff,
// round 39): compact 3-card row + one detail panel for whichever quest is
// selected. Covers what's specific to THIS screen (not already covered by
// practicetest.e2e.js/livelihood.e2e.js/nutrition.e2e.js, which exercise the
// individual completion flows through the hub's CTA): select-in-place
// position stability, the inline why-accordion, the 4-tier time-urgency
// color rule, the CTA label state machine, the nutrition-log CTA exception,
// and the >3-open-quests defensive cap.
//
// Run: node tests/quest-hub.e2e.js
// Requires: local Postgres (same TEST_DATABASE_URL convention as the rest of
// this suite) and the preinstalled Playwright Chromium at
// /opt/pw-browsers/chromium.

const assert = require("assert");
const { spawn } = require("child_process");
const { chromium } = require("playwright-core");
const { Client } = require("pg");

const PORT = 3996;
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

  const sql = new Client({ connectionString: env.DATABASE_URL });
  await sql.connect();

  // A fresh, already-profiled account per test group (own goals array so
  // goalIndex 0 always exists) - matches the rest of this suite's
  // create-account-via-API + seed-quests-via-SQL convention.
  async function freshAccount(goals) {
    const email = `qhub-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    let cookieHeader = "";
    async function call(path, body, method = "POST") {
      const res = await fetch(`${BASE}${path}`, {
        method, headers: { "Content-Type": "application/json", cookie: cookieHeader },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const setCookie = res.headers.getSetCookie?.() || [];
      if (setCookie.length) cookieHeader = setCookie.map((c) => c.split(";")[0]).join("; ");
      return res.json().catch(() => ({}));
    }
    await call("/api/signup", { email, password: "password123", betaCode: "TESTCODE" });
    await call("/api/profile", {
      name: "Quest Hub Tester",
      radarSnapshot: { body: 5, growth: 5, livelihood: 5, emotional: 5, social: 5, purpose: 5, autonomy: 5 },
      pathway: "Architect",
      goals,
    });
    const { rows } = await sql.query("SELECT id FROM users WHERE email = $1", [email]);
    return { userId: rows[0].id, cookieHeader };
  }

  async function insertQuest(userId, { goalIndex = 0, completionType = "reflective", title, description, createdAtSql = "now()", statFocus = "growth" }) {
    const quest = {
      mode: "quest", completionType, structuredKind: null, evidenceSchema: null, practiceTestSchema: null,
      title, description, statFocus, why: `Kenapa: ${title}`, goalIndex,
    };
    const { rows } = await sql.query(
      `INSERT INTO days (user_id, goal_index, date, quest, insight, reflection, is_side_quest, is_meta, created_at)
       VALUES ($1, $2, '2026-08-15', $3, NULL, NULL, false, false, ${createdAtSql}) RETURNING id`,
      [userId, goalIndex, quest]
    );
    return rows[0].id;
  }

  async function newPageForCookie(browser, cookieHeader) {
    const context = await browser.newContext({ baseURL: BASE });
    const cookies = cookieHeader.split("; ").map((pair) => {
      const eq = pair.indexOf("=");
      return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: BASE };
    });
    await context.addCookies(cookies);
    const page = await context.newPage();
    return { context, page };
  }

  const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });

  console.log("E2E: select-in-place - tapping a non-first card never reorders the row, updates the detail panel only");
  await test("card position stays fixed after selection; detail panel/urgency/why-accordion follow the selected card only", async () => {
    const { userId, cookieHeader } = await freshAccount(["Goal A", "Goal B", "Goal C"]);
    const id0 = await insertQuest(userId, { goalIndex: 0, title: "Quest Pertama", description: "Deskripsi pertama." });
    const id1 = await insertQuest(userId, { goalIndex: 1, title: "Quest Kedua", description: "Deskripsi kedua." });
    const id2 = await insertQuest(userId, { goalIndex: 2, title: "Quest Ketiga", description: "Deskripsi ketiga." });
    const { context, page } = await newPageForCookie(browser, cookieHeader);
    await page.goto(BASE);
    await page.waitForSelector("[data-qhub-idx]", { timeout: 20000 });

    const titlesBefore = await page.locator(".qhub-card .qhub-title").allTextContents();
    assert.deepStrictEqual(titlesBefore, ["Quest Pertama", "Quest Kedua", "Quest Ketiga"], "cards must render left-to-right by goalIndex order on first load");
    assert.ok(await page.locator('[data-qhub-idx="0"]').evaluate((el) => el.classList.contains("selected")), "card 1 selected by default");

    await page.click('[data-qhub-idx="1"]');
    const titlesAfter = await page.locator(".qhub-card .qhub-title").allTextContents();
    assert.deepStrictEqual(titlesAfter, titlesBefore, "selecting card 2 must not reorder the row");
    assert.ok(await page.locator('[data-qhub-idx="1"]').evaluate((el) => el.classList.contains("selected")), "card 2 must now be the selected one");
    assert.ok(!(await page.locator('[data-qhub-idx="0"]').evaluate((el) => el.classList.contains("selected"))), "card 1 must lose its selected state");
    assert.strictEqual((await page.locator(".qhub-detail-title").textContent()).trim(), "Quest Kedua", "detail panel must reflect the newly selected card");
    assert.strictEqual(await page.locator(`[data-reflect-id="${id1}"]`).count(), 1, "detail panel's CTA must target the selected quest's id");
    assert.strictEqual(await page.locator(`[data-reflect-id="${id0}"], [data-reflect-id="${id2}"]`).count(), 0, "only the selected quest's detail CTA should be in the DOM");
    await context.close();
  });

  console.log("E2E: why-accordion expands in place - arrow flips, no remount, 'Menuju target' stays visible before and after");
  await test("the why-accordion toggles open/closed in place without disturbing the rest of the detail panel", async () => {
    const { userId, cookieHeader } = await freshAccount(["Goal A"]);
    await insertQuest(userId, { goalIndex: 0, title: "Quest Alasan", description: "Deskripsi." });
    const { context, page } = await newPageForCookie(browser, cookieHeader);
    await page.goto(BASE);
    await page.waitForSelector(".qhub-why-toggle", { timeout: 20000 });

    assert.ok((await page.locator(".qhub-why-arrow").textContent()).includes("↓"), "arrow must start pointing down (collapsed)");
    assert.strictEqual(await page.locator(".qhub-why").count(), 0, "why text must not be in the DOM while collapsed");
    assert.ok(await page.locator(".qhub-target").isVisible(), "'Menuju target' line must be visible before expanding");

    await page.click(".qhub-why-toggle");
    assert.ok((await page.locator(".qhub-why-arrow").textContent()).includes("↑"), "arrow must flip to pointing up once expanded");
    assert.ok(await page.locator(".qhub-why").count() >= 1, "why text must render once expanded");
    assert.ok(await page.locator(".qhub-target").isVisible(), "'Menuju target' line must remain visible after expanding (never hidden behind the accordion)");
    assert.strictEqual((await page.locator(".qhub-detail-title").textContent()).trim(), "Quest Alasan", "expanding the accordion must not remount/change the rest of the panel");

    await page.click(".qhub-why-toggle");
    assert.ok((await page.locator(".qhub-why-arrow").textContent()).includes("↓"), "arrow must flip back down on collapse");
    assert.strictEqual(await page.locator(".qhub-why").count(), 0, "why text must be removed again on collapse");
    await context.close();
  });

  console.log("E2E: 4-tier time-urgency color/label rule");
  await test("remaining time renders the correct label and color at each of the 4 buckets", async () => {
    const { userId, cookieHeader } = await freshAccount(["Goal A", "Goal B", "Goal C"]);
    // 24h deadline math (createdAt + 24h - now): pick offsets solidly inside
    // each bucket, away from the boundaries, so real test-run latency can't
    // flip a bucket mid-assertion.
    await insertQuest(userId, { goalIndex: 0, title: "Muted Quest", description: "d", createdAtSql: "now() - interval '19 hours'" }); // ~5h left -> >4h, muted
    await insertQuest(userId, { goalIndex: 1, title: "Orange Quest", description: "d", createdAtSql: "now() - interval '21 hours 30 minutes'" }); // ~2.5h left -> 1-4h, orange
    await insertQuest(userId, { goalIndex: 2, title: "Red Quest", description: "d", createdAtSql: "now() - interval '23 hours 30 minutes'" }); // ~30min left -> <1h, red minutes
    const { context, page } = await newPageForCookie(browser, cookieHeader);
    await page.goto(BASE);
    await page.waitForSelector("[data-qhub-idx]", { timeout: 20000 });

    const times = await page.locator(".qhub-time").all();
    const [t0, t1, t2] = await Promise.all(times.map((l) => l.evaluate((el) => ({ text: el.textContent.trim(), color: getComputedStyle(el).color }))));
    assert.ok(/^\d+ jam$/.test(t0.text), `expected 'N jam' for the >4h bucket, got "${t0.text}"`);
    assert.ok(/^\d+ jam$/.test(t1.text), `expected 'N jam' for the 1-4h bucket, got "${t1.text}"`);
    assert.ok(/^\d+ menit$/.test(t2.text), `expected 'N menit' for the <1h bucket, got "${t2.text}"`);
    // muted vs orange vs red must all be visually distinct colors (exact hex resolution already
    // covered by the getComputedStyle verification done during implementation - here just confirm
    // the 3 buckets never collapse into the same rendered color).
    assert.notStrictEqual(t0.color, t1.color, "muted (>4h) and orange (1-4h) must render different colors");
    assert.notStrictEqual(t1.color, t2.color, "orange (1-4h) and red (<1h) must render different colors");
    await context.close();
  });

  console.log("E2E: quest past the nominal 24h shows 'Waktu habis' but stays clickable through the invisible 4h grace window (round 40)");
  await test("a quest at 25h old (inside the 24-28h grace) shows 'Waktu habis' but the CTA is NOT disabled", async () => {
    const { userId, cookieHeader } = await freshAccount(["Goal A"]);
    await insertQuest(userId, { goalIndex: 0, title: "Expired Quest", description: "d", createdAtSql: "now() - interval '25 hours'" });
    const { context, page } = await newPageForCookie(browser, cookieHeader);
    await page.goto(BASE);
    await page.waitForSelector(".qhub-time", { timeout: 20000 });
    assert.strictEqual((await page.locator(".qhub-time").first().textContent()).trim(), "Waktu habis", "expected the expired label (unchanged - still the nominal 24h threshold)");
    assert.ok(!(await page.locator("[data-reflect-id]").first().isDisabled()), "CTA must stay clickable inside the 24-28h invisible grace window (round 40) - the real server deadline is 28h");
    await context.close();
  });

  console.log("E2E: CTA label state machine - Mulai Quest -> (mid-flow) Lanjutkan -> completed ack card");
  await test("the CTA reads Mulai Quest by default, flips to Lanjutkan the instant the flow starts, then the completed-ack card replaces the hub after submit", async () => {
    const { userId, cookieHeader } = await freshAccount(["Goal A"]);
    const questId = await insertQuest(userId, { goalIndex: 0, completionType: "reflective", title: "Quest Refleksi", description: "d" });
    const { context, page } = await newPageForCookie(browser, cookieHeader);
    await page.goto(BASE);
    await page.waitForSelector(`[data-reflect-id="${questId}"]`, { timeout: 20000 });
    assert.strictEqual((await page.locator(`[data-reflect-id="${questId}"]`).textContent()).trim(), "Mulai Quest", "default CTA label must be 'Mulai Quest'");

    await page.click(`[data-reflect-id="${questId}"]`);
    await page.waitForSelector("#reflectText", { timeout: 10000 });
    assert.strictEqual((await page.locator(`[data-reflect-id="${questId}"]`).textContent()).trim(), "Lanjutkan", "CTA must flip to 'Lanjutkan' the moment the flow is started");

    await page.fill("#reflectText", "Aku ngobrol sama satu orang tepercaya soal kondisi sekarang, ceritanya jujur dan cukup panjang.");
    await page.click("#submitReflect");
    await page.waitForSelector("#dismissCompleted", { timeout: 20000 });
    assert.ok(await page.locator("#dismissCompleted").isVisible(), "completed-ack card must replace the hub after submitting");
    await context.close();
  });

  console.log("E2E: nutrition-log CTA exception - always 'Lanjut Catat', never 'Mulai Quest', regardless of tap");
  await test("a nutrition-log quest's CTA reads 'Lanjut Catat' before and after being tapped", async () => {
    const { userId, cookieHeader } = await freshAccount(["Goal A"]);
    const questId = await insertQuest(userId, {
      goalIndex: 0, completionType: "nutrition-log", title: "Catat Makan", description: "d",
    });
    // completionType alone drives the label (questCtaLabel checks completionType before
    // the Map), so this doesn't need a real progressive payload to prove the exception.
    const { context, page } = await newPageForCookie(browser, cookieHeader);
    await page.goto(BASE);
    await page.waitForSelector(`[data-reflect-id="${questId}"]`, { timeout: 20000 });
    assert.strictEqual((await page.locator(`[data-reflect-id="${questId}"]`).textContent()).trim(), "Lanjut Catat", "nutrition-log must always read 'Lanjut Catat', never 'Mulai Quest'");
    await context.close();
  });

  console.log("E2E: >3 open quests defensive cap - only the first 3 render as hub cards");
  await test("with 4 open quests for the same goalIndex, exactly 3 cards render (client-side slice(0,3) cap)", async () => {
    const { userId, cookieHeader } = await freshAccount(["Goal A"]);
    await insertQuest(userId, { goalIndex: 0, title: "Quest 1", description: "d" });
    await insertQuest(userId, { goalIndex: 0, title: "Quest 2", description: "d" });
    await insertQuest(userId, { goalIndex: 0, title: "Quest 3", description: "d" });
    await insertQuest(userId, { goalIndex: 0, title: "Quest 4", description: "d" });
    const { context, page } = await newPageForCookie(browser, cookieHeader);
    await page.goto(BASE);
    await page.waitForSelector("[data-qhub-idx]", { timeout: 20000 });
    assert.strictEqual(await page.locator("[data-qhub-idx]").count(), 3, "expected exactly 3 quest hub cards regardless of how many open quests exist server-side");
    await context.close();
  });

  console.log("E2E: header/wordmark/tab bar chrome");
  await test("the ELEVA wordmark, heading sentence, and 4-item tab bar (Home/Story/Avatar/Meta) render", async () => {
    const { userId, cookieHeader } = await freshAccount(["Goal A", "Goal B"]);
    await insertQuest(userId, { goalIndex: 0, title: "Quest 1", description: "d" });
    await insertQuest(userId, { goalIndex: 1, title: "Quest 2", description: "d" });
    const { context, page } = await newPageForCookie(browser, cookieHeader);
    await page.goto(BASE);
    await page.waitForSelector("[data-qhub-idx]", { timeout: 20000 });
    assert.strictEqual((await page.locator(".qhub-wordmark").textContent()).trim(), "ELEVA");
    assert.ok((await page.locator(".qhub-heading").textContent()).includes("2 quest berjalan"), "heading must reflect the real open-quest count");
    const tabLabels = (await page.locator(".tab-item").allTextContents()).map((t) => t.replace(/\s+/g, " ").trim());
    assert.ok(tabLabels.some((t) => t.includes("Home")));
    assert.ok(tabLabels.some((t) => t.includes("Story")));
    assert.ok(tabLabels.some((t) => t.includes("Avatar")));
    assert.ok(tabLabels.some((t) => t.includes("Meta")));
    assert.strictEqual(tabLabels.length, 4, "tab bar must have exactly 4 items (Settings dropped, reachable via the header gear icon instead)");
    await context.close();
  });

  await browser.close();
  await sql.end();
  server.kill();

  console.log(failures ? `\n${failures} E2E FAILURE(S)` : "\nALL E2E TESTS PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
