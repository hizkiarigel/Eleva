// Playwright e2e for the onboarding bridge voice narration (round 25,
// "Phase 3") - short pre-generated clips played once per bridge stage. A
// separate file from tests/onboarding-bridge.e2e.js (which covers the
// visual/state-machine behavior, untouched by this phase) matching this
// repo's existing per-feature granularity.
//
// No real mp3 files exist yet (no TTS provider is wired up - see
// scripts/generate-onboarding-audio.js) - tests that need to verify actual
// playback behavior mock /audio/onboarding/*.mp3 to a tiny local silent
// fixture (tests/fixtures/bridge-voice.wav, served with an audio/wav
// Content-Type regardless of the mocked URL's .mp3 extension - Chromium
// decodes by the response header, not the URL suffix). The "missing audio
// asset" case deliberately does NOT mock the route, since an unmocked
// request is already a genuine 404 via express.static (no production files
// exist), which is exactly the scenario that test needs.
//
// Instrumentation: page.addInitScript() wraps HTMLMediaElement.prototype.
// play/pause to log every call (with src + timestamp) into
// window.__bridgeAudioLog, installed before any navigation. This needs
// zero production code changes and lets every test assert on the exact
// play/pause sequence instead of racing wall-clock timing.
//
// Run: node tests/onboarding-bridge-audio.e2e.js
// Requires: local Postgres (same TEST_DATABASE_URL convention as
// tests/practicetest.js) and the preinstalled Playwright Chromium at
// /opt/pw-browsers/chromium.

const assert = require("assert");
const path = require("path");
const { spawn } = require("child_process");
const { chromium } = require("playwright-core");

const PORT = 3981;
const BASE = `http://localhost:${PORT}`;
const CHROMIUM = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";
const FIXTURE_PATH = path.join(__dirname, "fixtures", "bridge-voice.wav");

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

// Installed before goto() - logs every play()/pause() call on any
// <audio>/<video> element into window.__bridgeAudioLog. rejectPlay forces
// play() to reject like a real autoplay-policy rejection (genuine Chromium
// under Playwright generally allows autoplay by the time a bridge appears,
// since prior clicks already satisfy the user-gesture heuristic - forcing
// it is the standard, deterministic way to exercise that path).
async function installAudioInstrumentation(page, { rejectPlay = false } = {}) {
  await page.addInitScript((rejectPlay) => {
    window.__bridgeAudioLog = [];
    const origPlay = HTMLMediaElement.prototype.play;
    const origPause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.play = function () {
      window.__bridgeAudioLog.push({ type: "play", src: this.src, t: Date.now() });
      if (rejectPlay) return Promise.reject(new DOMException("simulated", "NotAllowedError"));
      return origPlay.apply(this, arguments);
    };
    HTMLMediaElement.prototype.pause = function () {
      window.__bridgeAudioLog.push({ type: "pause", src: this.src, t: Date.now() });
      return origPause.apply(this, arguments);
    };
  }, rejectPlay);
}

async function mockBridgeAudio(page) {
  await page.route("**/audio/onboarding/*.mp3", (route) =>
    route.fulfill({ path: FIXTURE_PATH, contentType: "audio/wav" }));
}

// Round 26: mocks window.speechSynthesis.speak() to log every call into
// window.__speakLog and simulate a real backend firing utterance.onstart
// (headless Chromium's own speechSynthesis backend doesn't reliably fire
// onstart in this environment - confirmed by hand - so tests that need to
// assert the icon's "playing" state force it deterministically here rather
// than depending on a real TTS backend being present).
async function installSpeechSynthesisMock(page) {
  await page.addInitScript(() => {
    window.__speakLog = [];
    if (!window.speechSynthesis) window.speechSynthesis = { cancel() {} };
    window.speechSynthesis.speak = (utterance) => {
      window.__speakLog.push({ text: utterance.text, lang: utterance.lang, volume: utterance.volume, t: Date.now() });
      setTimeout(() => utterance.onstart && utterance.onstart(), 0);
    };
    window.speechSynthesis.cancel = () => {};
  });
}

async function speakLog(page) {
  return page.evaluate(() => window.__speakLog || []);
}

async function audioLog(page) {
  return page.evaluate(() => window.__bridgeAudioLog || []);
}

async function fillNameAndReachRadar(page, name) {
  const email = `bridge-audio-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
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
  await page.fill("#fld", name);
  await page.click("#next");
  await page.waitForSelector(".poly-svg", { timeout: 10000 });
}

async function reachFirstBridge(page, name) {
  await fillNameAndReachRadar(page, name);
  await page.click('[data-lock-hit="body"]');
  await page.click("#next");
  await page.waitForSelector(".bridge-root", { timeout: 10000 });
}

(async () => {
  const { server, log } = spawnServer(PORT, {});
  await waitForServer(BASE, log);
  const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });

  console.log("E2E: unlockBridgeVoiceFallback fires synchronously on the radar Continue click (round 27)");
  await test("a silent unlock utterance is already in the speechSynthesis log immediately after the click, with no wait needed - the fix for iOS Safari silently dropping deferred speak() calls", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await installSpeechSynthesisMock(page);
    await fillNameAndReachRadar(page, "Unlock Tester");
    await page.click('[data-lock-hit="body"]');
    await page.click("#next"); // radar Continue - the earliest point a bridge can appear
    // No waitForTimeout here on purpose - the unlock call must be synchronous
    // with the click itself, not deferred through any async chain.
    const speaks = await speakLog(page);
    const unlockCalls = speaks.filter((s) => s.text === " " && s.volume === 0);
    assert.strictEqual(unlockCalls.length, 1, `expected exactly 1 silent unlock call immediately after the click, got ${unlockCalls.length}`);
    await context.close();
  });

  console.log("E2E: normal playback - voice starts once per bridge appearance");
  await test("the Journey bridge's voice plays exactly once, shortly after it mounts", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e));
    await installAudioInstrumentation(page);
    await mockBridgeAudio(page);
    await reachFirstBridge(page, "Audio Tester 1");
    await page.waitForTimeout(700); // past BRIDGE_AUDIO_START_DELAY_MS (350ms) + buffer
    const plays = (await audioLog(page)).filter((e) => e.type === "play");
    assert.strictEqual(plays.length, 1, `expected exactly 1 play, got ${plays.length}`);
    assert.ok(plays[0].src.endsWith("01-journey.mp3"), `expected 01-journey.mp3, got ${plays[0].src}`);
    assert.strictEqual(pageErrors.length, 0, `expected no page errors, got ${pageErrors.map(String)}`);
    await context.close();
  });

  console.log("E2E: AI-ready-before-narration-ends transitions cleanly, no delay from audio");
  await test("the bridge advances to the next screen on its own timing (2300ms floor) well before the 5s fixture ends, fading audio instead of waiting for it", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e));
    await installAudioInstrumentation(page);
    await mockBridgeAudio(page);
    await reachFirstBridge(page, "Audio Tester 2");
    // keyless fallback resolves well under the 5s fixture; BRIDGE_MIN_DURATION_MS
    // (2300ms) is the real floor here - no scenario-card mocking needed.
    await page.waitForSelector(".qcard-card", { timeout: 10000 });
    const entries = await audioLog(page);
    assert.ok(entries.some((e) => e.type === "pause"), "expected the Journey clip to be stopped/faded on transition");
    assert.strictEqual(pageErrors.length, 0, `expected no page errors, got ${pageErrors.map(String)}`);
    await context.close();
  });

  console.log("E2E: narration-ends-before-AI-ready does not replay");
  await test("if the clip finishes naturally before the fetch resolves, it never plays a second time while still waiting", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await installAudioInstrumentation(page);
    await mockBridgeAudio(page);
    // Artificial delay past the fixture's 5s natural end, so the clip
    // finishes on its own while the bridge is still genuinely waiting.
    await page.route("**/api/onboarding/scenario-card", async (route) => {
      await new Promise((r) => setTimeout(r, 7000));
      await route.continue();
    });
    await reachFirstBridge(page, "Audio Tester 3");
    await page.waitForTimeout(5500); // past the fixture's natural end, still well before the mocked 7s fetch resolves
    const plays = (await audioLog(page)).filter((e) => e.type === "play");
    assert.strictEqual(plays.length, 1, `expected no replay - still exactly 1 play, got ${plays.length}`);
    await context.close();
  });

  console.log("E2E: rapid stage changes (dev preview) never leave stale audio playing");
  await test("clicking through all 7 dev-preview stages with no waits ends with audio in sync with whichever stage is actually shown", async () => {
    const devPort = PORT + 1;
    const { server: devServer, log: devLog } = spawnServer(devPort, { NODE_ENV: "development" });
    await waitForServer(`http://localhost:${devPort}`, devLog);
    const devBrowser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
    const devContext = await devBrowser.newContext({ baseURL: `http://localhost:${devPort}`, viewport: { width: 390, height: 844 } });
    const devPage = await devContext.newPage();
    const pageErrors = [];
    devPage.on("pageerror", (e) => pageErrors.push(e));
    await installAudioInstrumentation(devPage);
    await mockBridgeAudio(devPage);
    await devPage.goto(`http://localhost:${devPort}/?debug=bridges`);
    await devPage.waitForSelector(".bridge-dev-controls", { timeout: 10000 });
    for (let i = 0; i < 6; i++) await devPage.click("#bridgeDevNext"); // no waits between clicks
    await devPage.waitForTimeout(600); // let any still-pending start-delay timers resolve or get superseded
    const currentSrc = await devPage.locator(".bridge-img").getAttribute("src");
    assert.strictEqual(currentSrc, "/onboarding/bridges/07-pathway.webp", "should have landed on the final stage");
    const plays = (await audioLog(devPage)).filter((e) => e.type === "play");
    const lastPlay = plays[plays.length - 1];
    assert.ok(lastPlay?.src.endsWith("07-pathway.mp3"), `expected the last play to be for the currently-shown stage (07-pathway), got ${lastPlay?.src}`);
    assert.strictEqual(pageErrors.length, 0, `expected no page errors, got ${pageErrors.map(String)}`);
    await devBrowser.close();
    devServer.kill();
  });

  console.log("E2E: autoplay rejection doesn't break the bridge, and falls over to the speechSynthesis voice (round 26)");
  await test("a forced play() rejection is swallowed silently, onboarding still progresses, and the fallback voice speaks the stage's exact voiceText", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e));
    await installAudioInstrumentation(page, { rejectPlay: true });
    await installSpeechSynthesisMock(page);
    await mockBridgeAudio(page);
    await reachFirstBridge(page, "Audio Tester 5");
    await page.waitForTimeout(700); // past the start delay
    // Round 27: a real click (radar Continue, inside reachFirstBridge) also
    // fires a one-time silent " " unlock utterance (unlockBridgeVoiceFallback) -
    // filter it out to isolate the actual fallback voice call.
    const speaks = (await speakLog(page)).filter((s) => s.text !== " ");
    assert.strictEqual(speaks.length, 1, `expected exactly 1 fallback speak() call, got ${speaks.length}`);
    assert.strictEqual(speaks[0].text, "Selamat datang di Eleva. Di sini, kamu tumbuh sambil jalan.", "fallback must speak the exact same voiceText as the real clip");
    assert.strictEqual(speaks[0].lang, "id-ID", "fallback must speak in Bahasa Indonesia, not the unrelated Practice Test feature's en-US");
    await page.waitForSelector(".qcard-card", { timeout: 10000 });
    assert.strictEqual(pageErrors.length, 0, `expected no page errors even with play() rejecting, got ${pageErrors.map(String)}`);
    await context.close();
  });

  console.log("E2E: missing audio asset (404) doesn't break the bridge, and falls over to the speechSynthesis voice (round 26)");
  await test("with no audio files on disk (real 404 via express.static), onboarding still progresses normally and the fallback voice speaks", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e));
    await installAudioInstrumentation(page); // no mockBridgeAudio() - genuine 404
    await installSpeechSynthesisMock(page);
    await reachFirstBridge(page, "Audio Tester 6");
    await page.waitForTimeout(700); // past the start delay
    const speaks = (await speakLog(page)).filter((s) => s.text !== " "); // exclude the round 27 unlock call
    assert.strictEqual(speaks.length, 1, `expected exactly 1 fallback speak() call on a 404, got ${speaks.length}`);
    await page.waitForSelector(".qcard-card", { timeout: 10000 });
    assert.strictEqual(pageErrors.length, 0, `expected no page errors on a missing audio asset, got ${pageErrors.map(String)}`);
    await context.close();
  });

  console.log("E2E: speaker icon (round 26) is present on all 7 dev-preview stages");
  await test("the top-right speaker icon renders on every one of the 7 bridge stages", async () => {
    const devPort = PORT + 2;
    const { server: devServer, log: devLog } = spawnServer(devPort, { NODE_ENV: "development" });
    await waitForServer(`http://localhost:${devPort}`, devLog);
    const devBrowser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
    const devContext = await devBrowser.newContext({ baseURL: `http://localhost:${devPort}`, viewport: { width: 390, height: 844 } });
    const devPage = await devContext.newPage();
    await devPage.goto(`http://localhost:${devPort}/?debug=bridges`);
    await devPage.waitForSelector(".bridge-dev-controls", { timeout: 10000 });
    for (let i = 0; i < 7; i++) {
      assert.strictEqual(await devPage.locator("#bridgeAudioIcon").count(), 1, `expected the speaker icon on stage ${i + 1}/7`);
      if (i < 6) await devPage.click("#bridgeDevNext");
    }
    await devBrowser.close();
    devServer.kill();
  });

  console.log("E2E: speaker icon animates while audio is actually playing, stops when it isn't (round 26)");
  await test("the icon gains bridge-audio-icon-playing while the mocked clip is playing and loses it once the bridge is stopped/exited", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await installAudioInstrumentation(page);
    await mockBridgeAudio(page);
    await reachFirstBridge(page, "Audio Tester 9");
    await page.waitForTimeout(700); // past the start delay - the mocked fixture should now be "playing"
    const playingWhileActive = await page.evaluate(() => document.getElementById("bridgeAudioIcon")?.classList.contains("bridge-audio-icon-playing"));
    assert.strictEqual(playingWhileActive, true, "expected the icon to be marked playing while the mocked clip is actively playing");
    await page.waitForSelector(".qcard-card", { timeout: 10000 }); // bridge exits (stopBridgeAudio fires)
    const iconAfterExit = await page.locator("#bridgeAudioIcon").count();
    assert.strictEqual(iconAfterExit, 0, "the icon (part of .bridge-root) should be gone once the bridge itself has exited to the question card");
    await context.close();
  });

  console.log("E2E: Journey -> Quest transition never overlaps voices");
  await test("the Journey clip is stopped before the Quest clip starts playing", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await installAudioInstrumentation(page);
    await mockBridgeAudio(page);
    await reachFirstBridge(page, "Audio Tester 7");
    await page.waitForSelector(".qcard-card", { timeout: 10000 });
    const opts = await page.locator(".qcard-answer").all();
    await opts[0].click();
    await opts[1].click();
    await page.click("#confirmCard");
    await page.waitForSelector(".qcard-card", { timeout: 15000 }); // card 2, after the Quest bridge
    const entries = await audioLog(page);
    const journeyPlayTimes = entries.filter((e) => e.type === "play" && e.src.endsWith("01-journey.mp3")).map((e) => e.t);
    const questPlayTimes = entries.filter((e) => e.type === "play" && e.src.endsWith("02-quest.mp3")).map((e) => e.t);
    const journeyPauseTimes = entries.filter((e) => e.type === "pause" && e.src.endsWith("01-journey.mp3")).map((e) => e.t);
    assert.ok(journeyPlayTimes.length > 0, "expected the Journey clip to have played");
    assert.ok(questPlayTimes.length > 0, "expected the Quest clip to have played");
    assert.ok(journeyPauseTimes.some((pt) => pt <= Math.min(...questPlayTimes)), "the Journey clip must be paused before (or at) the Quest clip starting - never overlapping");
    await context.close();
  });

  console.log("E2E: Pathway stage plays once, then navigates to pathway selection (not another question)");
  await test("after the confident-after-2-cards keyless flow reaches the Pathway bridge, its voice plays exactly once and the next screen is pathway selection", async () => {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await installAudioInstrumentation(page);
    await mockBridgeAudio(page);
    await reachFirstBridge(page, "Audio Tester 8");
    for (let i = 0; i < 2; i++) {
      await page.waitForSelector(".qcard-card", { timeout: 15000 });
      const opts = await page.locator(".qcard-answer").all();
      await opts[0].click();
      await opts[1].click();
      await page.click("#confirmCard");
    }
    await page.waitForSelector(".tarot-carousel", { timeout: 15000 });
    const plays = (await audioLog(page)).filter((e) => e.type === "play" && e.src.endsWith("07-pathway.mp3"));
    assert.strictEqual(plays.length, 1, `expected exactly 1 play for the Pathway clip, got ${plays.length}`);
    assert.strictEqual(await page.locator(".qcard-card").count(), 0, "must be on pathway selection, not another question card");
    assert.ok((await page.locator("text=PILIH PATHWAY").count()) > 0, "expected the pathway-selection screen");
    await context.close();
  });

  await browser.close();
  server.kill();

  console.log(failures ? `\n${failures} E2E FAILURE(S)` : "\nALL E2E TESTS PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error("E2E run crashed:", e);
  process.exit(1);
});
