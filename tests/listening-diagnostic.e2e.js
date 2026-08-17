// Playwright e2e for the IELTS Listening Half Diagnostic (round 41, META:
// LINGUA feature). Mirrors tests/practicetest.e2e.js's server-boot pattern
// and the speechSynthesis mock technique from
// tests/onboarding-bridge-audio.e2e.js, extended here to give test code
// full manual control over each utterance's onend/onerror (rather than
// auto-firing on a timer) so the race-safety (lstnGen) and failure-handling
// paths can be exercised deterministically.
//
// Run: node tests/listening-diagnostic.e2e.js
// Requires: local Postgres (TEST_DATABASE_URL) + the preinstalled
// Playwright Chromium at /opt/pw-browsers/chromium.
//
// Not wired into package.json's "test" script - matches this repo's actual
// convention (only 2 of 15+ e2e files are wired there).

const assert = require("assert");
const { spawn } = require("child_process");
const { chromium } = require("playwright-core");

const PORT = 3982;
const BASE = `http://localhost:${PORT}`;
const CHROMIUM = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";

let failures = 0;
// A fresh Chromium instance per test (not one shared instance reused across
// all 10) - each test body already reads `browser` via closure at call
// time, so relaunching it here needs no changes to any test's own code.
// Found necessary during this round's work: 10 sequential full-onboarding
// contexts in one long-lived browser process reliably crashed the browser
// right around the 9th context (not random - same point both times,
// plenty of free memory/`/dev/shm`), even though the original 8-test file
// never hit this. Slightly slower (~1-2s extra launch time per test), but
// removes a whole class of accumulated-instability flakiness in this
// sandboxed environment.
let browser = null;
async function test(name, fn) {
  try {
    if (browser) {
      await browser.close().catch(() => {});
      await new Promise((r) => setTimeout(r, 1000)); // let the OS fully reap the old Chromium process before relaunching
    }
    browser = await chromium.launch({ executablePath: CHROMIUM, headless: true, args: ["--disable-dev-shm-usage", "--no-sandbox"] });
    await fn();
    console.log(`  ok - ${name}`);
  } catch (e) {
    failures += 1;
    console.error(`  FAIL - ${name}: ${e.message}`);
  }
}

function spawnServer(port) {
  const env = {
    ...process.env,
    DATABASE_URL: process.env.TEST_DATABASE_URL || "postgres://postgres:testpass@localhost:5432/eleva_test",
    SESSION_SECRET: "testsecret", BETA_CODE: "TESTCODE", PORT: String(port),
  };
  delete env.ANTHROPIC_API_KEY;
  // detached: true - puts the server child in its OWN process group, not
  // this script's. Found necessary during this round's work: relaunching a
  // fresh Chromium per test (see the `test()` helper above) occasionally
  // triggers a hard Chromium crash under sustained sequential load in this
  // sandboxed environment, and without `detached`, that crash was somehow
  // taking the server child down too (observed via a bare SIGTERM on the
  // server, no server-side error/exception logged) - consistent with an
  // OS-level signal hitting the whole shared process group rather than a
  // bug in either the server or the app code being tested.
  const server = spawn("node", ["server/index.js"], { env, stdio: ["ignore", "pipe", "pipe"], detached: true });
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

// Gives test code full manual control over each speak() call's callbacks -
// unlike onboarding-bridge-audio.e2e.js's auto-firing mock, the race-safety
// (lstnGen) and error-handling paths here need to fire onend/onerror at a
// precise moment, not on a timer.
async function installLstnSpeechMock(page) {
  await page.addInitScript(() => {
    window.__speakLog = [];
    window.__lastUtterance = null;
    window.speechSynthesis = window.speechSynthesis || {};
    window.speechSynthesis.cancel = () => {};
    window.speechSynthesis.speak = (utterance) => {
      window.__speakLog.push({ text: String(utterance.text || "").slice(0, 40), t: Date.now() });
      window.__lastUtterance = utterance;
    };
  });
}
async function fireLastOnend(page) {
  await page.evaluate(() => { window.__lastUtterance?.onend && window.__lastUtterance.onend(); });
}
async function fireLastOnerror(page) {
  await page.evaluate(() => { window.__lastUtterance?.onerror && window.__lastUtterance.onerror(); });
}
async function clearSpeakLog(page) {
  await page.evaluate(() => { window.__speakLog = []; window.__lastUtterance = null; });
}
async function speakLog(page) {
  return page.evaluate(() => window.__speakLog || []);
}
// Round-feedback: each full run now speaks 5 utterances in sequence
// (announce rec1 -> rec1 script -> spoken transition -> announce rec2 ->
// rec2 script), all chained via onend with no fixed-duration timer left in
// the chain - so walking a run to completion in a test is just firing
// onend N times in a row, no waitForTimeout needed anywhere.
async function fireOnendTimes(page, n) {
  for (let i = 0; i < n; i++) await fireLastOnend(page);
}

// Full signup -> onboarding -> dashboard -> META -> LINGUA -> Listening row
// -> intro screen. Reuses the exact keyless-fallback path proven in the
// manual verification run (verify_listening_tmp.js) this test formalizes.
// force:true / evaluate-click on the two META world-map taps works around a
// PRE-EXISTING, unrelated layout bug: LINGUA's cluster visually overlaps
// SOMA's on the (very tall) world map, so a real-coordinate click lands on
// the wrong cluster's body. Not something this round's feature caused or is
// in scope to fix - flagged in PRD.md instead.
async function reachListeningIntro(page, emailPrefix) {
  const email = `${emailPrefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
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
  await page.fill("#fld", "Verifier");
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
  await page.click("#toPathway");
  await page.waitForSelector(".ppick-cards", { timeout: 10000 });
  await page.click("#confirmPathway");
  await page.waitForSelector(".gset-cards", { timeout: 10000 });
  await page.fill("[data-goal-text='0']", "Sprint Listening IELTS Academic band 6.5 dalam 2 bulan");
  await page.click("[data-goal-set='0']");
  await page.waitForSelector(".gset-check, .gset-feedback-box", { timeout: 15000 });
  if (await page.locator("[data-goal-pick='0']").count()) await page.click("[data-goal-pick='0'][data-reco-idx='0']");
  await page.waitForSelector(".gset-check", { timeout: 10000 });
  await page.click("#startFirstTrial");
  await page.waitForSelector("[data-tab]", { timeout: 20000 });

  await page.click('[data-tab="meta"]');
  await page.waitForSelector('.meta-realm-card-tools-link, [data-meta-realm-open="lingua"]', { timeout: 20000 });
  await page.locator('[data-meta-realm-open="lingua"]').first().evaluate((el) => el.click());
  await page.waitForSelector('[data-lingua-track="listening"]', { timeout: 20000 });
  await page.locator('[data-lingua-track="listening"]').evaluate((el) => el.click());
  await page.waitForSelector("#lstnStart", { timeout: 20000 });
}

async function startActiveTest(page, emailPrefix) {
  await reachListeningIntro(page, emailPrefix);
  await clearSpeakLog(page); // onboarding bridge narration already used speechSynthesis
  await page.click("#lstnStart");
  await page.waitForSelector(".lstn-shell", { timeout: 10000 });
}

async function answerAllQuestions(page) {
  const textInputs = await page.locator("[data-lstn-text]").all();
  for (const inp of textInputs) await inp.fill("test answer");
  const mcSeen = new Set();
  for (const btn of await page.locator("[data-lstn-mc]").all()) {
    const qid = await btn.getAttribute("data-lstn-mc");
    if (!mcSeen.has(qid)) { await btn.click(); mcSeen.add(qid); }
  }
  const matchSeen = new Set();
  for (const btn of await page.locator("[data-lstn-match]").all()) {
    const qid = await btn.getAttribute("data-lstn-match");
    if (!matchSeen.has(qid)) { await btn.click(); matchSeen.add(qid); }
  }
}

(async () => {
  const { server, log } = spawnServer(PORT);
  try {
    await waitForServer(BASE, log);
    // browser itself is now launched fresh inside test() (module scope, see above).

    await test("intro screen keeps normal chrome; active step hides it, submitted stays hidden, results screen renders (Item 4), Kembali ke META restores it", async () => {
      const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      const pageErrors = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));
      await installLstnSpeechMock(page);

      await reachListeningIntro(page, "lstn-chrome");
      const introChrome = await page.evaluate(() => ({ header: !!document.querySelector(".app-header"), tabbar: !!document.querySelector(".tab-bar") }));
      assert.ok(introChrome.header && introChrome.tabbar, "intro must keep normal chrome");

      await clearSpeakLog(page);
      await page.click("#lstnStart");
      await page.waitForSelector(".lstn-shell", { timeout: 10000 });
      const activeChrome = await page.evaluate(() => ({ header: !!document.querySelector(".app-header"), tabbar: !!document.querySelector(".tab-bar"), shell: !!document.querySelector(".lstn-shell") }));
      assert.deepStrictEqual(activeChrome, { header: false, tabbar: false, shell: true });

      await answerAllQuestions(page);
      await page.click("#lstnFootSubmit"); // all answered - submits directly, no confirm sheet
      await page.waitForSelector("#lstnBackToMeta", { timeout: 10000 });
      const submittedChrome = await page.evaluate(() => ({ header: !!document.querySelector(".app-header"), tabbar: !!document.querySelector(".tab-bar") }));
      assert.deepStrictEqual(submittedChrome, { header: false, tabbar: false });

      // Round-feedback Item 4: the results screen shows score, per-task-type
      // breakdown, and wrong-answer list (folded into this test - not a
      // separate one - to keep the total number of fresh Chromium launches
      // in this file bounded; see the `browser`/`test()` comment above).
      // answerAllQuestions() fills every text field with "test answer"
      // (always wrong) and picks the FIRST option/letter for every MC/
      // matching question - against the real answer key this reliably
      // produces a mix of right (Q11 matching happens to be "A") and wrong
      // answers, enough to exercise both the breakdown and the wrong-list
      // rendering without the test itself needing the server-side-only
      // answer key.
      const result = await page.evaluate(() => ({
        score: document.querySelector(".lstn-result-score")?.textContent || "",
        breakdownText: document.querySelector(".lstn-result-types")?.textContent || "",
        wrongRows: document.querySelectorAll(".lstn-result-wrong-row").length,
        wrongRowSample: document.querySelector(".lstn-result-wrong-row")?.textContent || "",
      }));
      assert.ok(/\/ 20/.test(result.score), `score line must show "X / 20", got "${result.score}"`);
      assert.ok(/Note Completion|Multiple Choice|Matching|Sentence Completion/.test(result.breakdownText), "per-task-type breakdown must render type labels");
      assert.ok(result.wrongRows > 0, "the mixed answer set must produce at least one wrong-answer row");
      assert.ok(/Jawabanmu:/.test(result.wrongRowSample) && /Benar:/.test(result.wrongRowSample), "each wrong row must show both the given and correct answer");

      await page.click("#lstnBackToMeta");
      await page.waitForSelector(".app-header", { timeout: 10000 });
      const afterBackChrome = await page.evaluate(() => ({ header: !!document.querySelector(".app-header"), tabbar: !!document.querySelector(".tab-bar") }));
      assert.deepStrictEqual(afterBackChrome, { header: true, tabbar: true });

      assert.deepStrictEqual(pageErrors, [], "no page errors expected");
      await context.close();
    });

    await test("sequential auto-chain: 5 spoken utterances per run (announce->script->transition->announce->script), in order", async () => {
      const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await installLstnSpeechMock(page);
      await startActiveTest(page, "lstn-chain");

      let log = await speakLog(page);
      assert.strictEqual(log.length, 1, "the Recording 1 announcement should start immediately");
      assert.ok(/Recording 1\. You will hear/.test(log[0].text), "first call should be the spoken Recording 1 announcement");

      await fireLastOnend(page); // announcement finishes -> recording 1 script starts
      log = await speakLog(page);
      assert.strictEqual(log.length, 2);
      assert.ok(/Riverside Leisure Centre/.test(log[1].text), "second call should be recording 1's script");

      await fireLastOnend(page); // script finishes -> spoken transition starts (no more fixed timer - purely onend-chained)
      log = await speakLog(page);
      assert.strictEqual(log.length, 3);
      assert.ok(/end of Recording 1/.test(log[2].text), "third call should be the spoken transition, not just visual text");

      await fireLastOnend(page); // transition finishes -> recording 2 announcement starts
      log = await speakLog(page);
      assert.strictEqual(log.length, 4);
      assert.ok(/Recording 2\. You will hear/.test(log[3].text), "fourth call should be the spoken Recording 2 announcement");

      await fireLastOnend(page); // announcement finishes -> recording 2 script starts
      log = await speakLog(page);
      assert.strictEqual(log.length, 5);
      assert.ok(/Bright Start Community Garden|Hello everyone/.test(log[4].text), "fifth call should be recording 2's script");

      await context.close();
    });

    await test("run-count cap at 2: replay button disables after 2 full runs, a 3rd never starts", async () => {
      const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await installLstnSpeechMock(page);
      await startActiveTest(page, "lstn-cap");

      // Run 1 - 5 spoken steps (announce1, script1, transition, announce2, script2)
      await fireOnendTimes(page, 5);
      await page.waitForSelector("#lstnReplay", { timeout: 5000 });

      // Run 2
      await clearSpeakLog(page);
      await page.click("#lstnReplay");
      await page.waitForTimeout(100);
      await fireOnendTimes(page, 5);
      const log = await speakLog(page);
      assert.strictEqual(log.length, 5, "run 2 should also produce exactly 5 speak calls");

      const replayDisabled = await page.evaluate(() => {
        const btn = document.querySelector(".lstn-replay-btn");
        return { present: !!btn, disabled: btn?.disabled, text: btn?.textContent };
      });
      assert.strictEqual(replayDisabled.disabled, true, "replay button must be disabled after 2 runs");
      assert.ok(/2 kali/.test(replayDisabled.text || ""), "disabled label should mention the 2-run cap");

      await context.close();
    });

    await test("a forced onerror does NOT increment runsCompleted and shows a retry state", async () => {
      const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await installLstnSpeechMock(page);
      await startActiveTest(page, "lstn-error");

      await fireLastOnerror(page); // fails on the very first utterance (Recording 1's spoken announcement)
      await page.waitForSelector(".lstn-audio-error", { timeout: 5000 });
      const errorState = await page.evaluate(() => ({
        errorVisible: !!document.querySelector(".lstn-audio-error"),
        retryBtn: !!document.getElementById("lstnRetryPlay"),
      }));
      assert.ok(errorState.errorVisible && errorState.retryBtn, "error state + retry button must show");

      // Retry re-attempts recording 1's announcement (not treated as a consumed
      // run) and completing a full run afterward should still land on
      // runsCompleted === 1, not 2 - i.e. the earlier failure never silently counted.
      await clearSpeakLog(page);
      await page.click("#lstnRetryPlay");
      let log = await speakLog(page);
      assert.strictEqual(log.length, 1, "retry should re-issue exactly one speak call");
      assert.ok(/Recording 1\. You will hear/.test(log[0].text), "retry must re-announce the SAME recording that failed (recording 1)");

      // Walk the rest of the chain to completion: announce(already speaking)
      // -> script -> transition -> announce2 -> script2 = 5 onend fires total.
      await fireOnendTimes(page, 5);
      await page.waitForSelector("#lstnReplay", { timeout: 5000 });
      // Only 1 run should be marked complete overall (the failed attempt never counted) -
      // replay must still be enabled (only 1/2 used), not disabled.
      const replayEnabled = await page.evaluate(() => !document.querySelector(".lstn-replay-btn")?.disabled);
      assert.strictEqual(replayEnabled, true, "only 1 run should have counted - replay must still be enabled");

      await context.close();
    });

    await test("a stale onend fired after lstnStop() (via submit) has no effect - no crash, no stray state change", async () => {
      const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      const pageErrors = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));
      await installLstnSpeechMock(page);
      await startActiveTest(page, "lstn-race");

      // Recording 1's announcement is "playing" (never fired onend). Answer
      // everything so the footer submit skips the confirm sheet and calls
      // lstnDoSubmit() directly, which calls lstnStop() first thing - bumping
      // lstnGen out from under the still-pending utterance captured above.
      await answerAllQuestions(page);
      await page.click("#lstnFootSubmit");
      await page.waitForSelector("#lstnBackToMeta", { timeout: 10000 });

      // Now fire the STALE recording-1 utterance's onend - it belongs to a
      // superseded generation, so it must no-op rather than mutate a flow
      // that has already moved on to "submitted".
      await fireLastOnend(page);
      await page.waitForTimeout(300);
      const stillSubmitted = await page.evaluate(() => !!document.getElementById("lstnBackToMeta"));
      assert.ok(stillSubmitted, "stale onend must not knock the screen out of the submitted state");
      assert.deepStrictEqual(pageErrors, [], "stale callback must not throw");

      await context.close();
    });

    await test("all 4 task types are answerable and reflected in the live footer count; MC/matching taps don't scroll-jump (Item 1)", async () => {
      const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await installLstnSpeechMock(page);
      await startActiveTest(page, "lstn-answer");

      let count = await page.locator("#lstnFootCount").textContent();
      assert.ok(/^0 \/ 20/.test(count.trim()), `expected 0/20 before answering, got "${count}"`);

      // Round-feedback Item 1: tapping an MC/matching answer must not
      // scroll .lstn-scroll back to the top (previously called
      // renderDashboard(), a full re-render). Folded into this test - not
      // a separate one - to keep the total fresh-Chromium-launch count in
      // this file bounded; see the `browser`/`test()` comment above.
      await page.evaluate(() => { document.querySelector(".lstn-scroll").scrollTop = 400; });
      const scrollBefore = await page.evaluate(() => document.querySelector(".lstn-scroll").scrollTop);
      assert.ok(scrollBefore > 0, "scroll setup should have actually moved the scroll position");
      // Raw JS .click() via evaluate, not Playwright's page.click()/
      // locator.click() - those auto-scroll their target into view before
      // clicking (a real Playwright actionability feature), which would
      // itself move scrollTop and defeat the point of this exact check.
      await page.evaluate(() => document.querySelector("[data-lstn-mc]").click());
      const scrollAfterMc = await page.evaluate(() => document.querySelector(".lstn-scroll").scrollTop);
      assert.strictEqual(scrollAfterMc, scrollBefore, "tapping an MC answer must not reset scroll position");
      await page.evaluate(() => document.querySelector("[data-lstn-match]").click());
      const scrollAfterMatch = await page.evaluate(() => document.querySelector(".lstn-scroll").scrollTop);
      assert.strictEqual(scrollAfterMatch, scrollBefore, "tapping a matching answer must not reset scroll position");

      await answerAllQuestions(page);
      await page.waitForTimeout(150);
      count = await page.locator("#lstnFootCount").textContent();
      assert.ok(/^20 \/ 20/.test(count.trim()), `expected 20/20 after answering all, got "${count}"`);

      // Spot-check one of each task type actually persisted a real value.
      const state = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll("[data-lstn-text]")).map((el) => el.value);
        const activeMc = document.querySelector("[data-lstn-mc].active, .status-btn.active[data-lstn-mc]");
        const activeMatch = document.querySelector("[data-lstn-match].active");
        return { textFilled: inputs.every((v) => v === "test answer"), hasActiveMc: !!activeMc, hasActiveMatch: !!activeMatch };
      });
      assert.ok(state.textFilled, "note/sentence completion inputs must hold the typed value");
      assert.ok(state.hasActiveMc, "at least one multiple_choice option must show active state");
      assert.ok(state.hasActiveMatch, "at least one matching letter badge must show active state");

      await context.close();
    });

    await test("submit-confirm sheet appears only when questions are unanswered, skipped when all 20 are answered", async () => {
      const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await installLstnSpeechMock(page);
      await startActiveTest(page, "lstn-confirm");

      // Nothing answered yet - submit must open the confirm sheet, not submit directly.
      await page.click("#lstnFootSubmit");
      await page.waitForSelector("#lstnSubmitBack, #lstnSubmitAnyway", { timeout: 5000 });
      const stillActive = await page.evaluate(() => !!document.querySelector(".lstn-shell") && !document.getElementById("lstnBackToMeta"));
      assert.ok(stillActive, "an unanswered submit must show the confirm sheet, not submit immediately");

      await page.click("#lstnSubmitBack");
      await page.waitForTimeout(200);
      const sheetClosed = await page.evaluate(() => !document.getElementById("lstnSubmitAnyway"));
      assert.ok(sheetClosed, "Kembali cek must close the sheet without submitting");

      await answerAllQuestions(page);
      await page.click("#lstnFootSubmit"); // now fully answered - must submit directly, no sheet
      await page.waitForSelector("#lstnBackToMeta", { timeout: 10000 });

      await context.close();
    });

    await test("REGRESSION: session-count fix - lingua sessions sum both practice-test and listening-diagnostic completions", async () => {
      const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await installLstnSpeechMock(page);
      await startActiveTest(page, "lstn-count");
      await answerAllQuestions(page);
      await page.click("#lstnFootSubmit");
      await page.waitForSelector("#lstnBackToMeta", { timeout: 10000 });
      await page.click("#lstnBackToMeta");
      await page.waitForSelector(".app-header", { timeout: 10000 });

      const counts = await page.evaluate(async () => {
        const res = await fetch("/api/state");
        const json = await res.json();
        return json.metaSessionCounts;
      });
      assert.strictEqual(counts.lingua, 1, "one completed listening-diagnostic session must count toward metaSessionCounts.lingua");

      await context.close();
    });

    console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL TESTS PASSED");
  } catch (e) {
    console.error("FATAL", e);
    failures += 1;
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
  process.exit(failures ? 1 : 0);
})();
