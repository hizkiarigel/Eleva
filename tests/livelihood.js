// Regression script for the Livelihood Milestone stack (Task 14, PRD.md
// section 26): count-based Milestone ("10 Qualified Applications"), a
// deterministic matchScore/qualified verdict for Job Match Analysis, the
// structured Submit Application evidence form, and the generalized "Target
// Berikutnya" A/B/C trigger for the funnel-metric Milestone #2.
//
// Part 1: unit tests against server/targets.js, server/jobMatch.js,
// server/jobApplication.js directly (no server, no DB).
// Part 2: API-level tests via fetch against a locally-booted server (keyless
// mode - fallbackJobMatchAnalysis always returns matchScore 0/qualified
// false, so the "qualified" and "10/10 reached" paths are exercised by
// seeding days.reflection/character_state.goal_targets directly via SQL,
// same precedent as tests/practicetest.js seeding practice-test quests the
// keyless fallbackQuest can never produce on its own).
//
// Run: node tests/livelihood.js
// Requires: local Postgres reachable via TEST_DATABASE_URL (same convention
// as tests/practicetest.js).

const assert = require("assert");
const targets = require("../server/targets");
const jobMatch = require("../server/jobMatch");
const jobApplication = require("../server/jobApplication");

let failures = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ok - ${name}`);
  } catch (e) {
    failures += 1;
    console.error(`  FAIL - ${name}: ${e.message}`);
  }
}

console.log("Unit: targets.js qualified-applications");
test("cleanTargetMetrics accepts a valid count", () => {
  const m = targets.cleanTargetMetrics("qualified-applications", { targetCount: 10, currentCount: 3 });
  assert.deepStrictEqual(m, { targetCount: 10, currentCount: 3 });
});
test("cleanTargetMetrics rejects negative currentCount", () => {
  assert.strictEqual(targets.cleanTargetMetrics("qualified-applications", { targetCount: 10, currentCount: -1 }), null);
});
test("cleanTargetMetrics rejects zero/negative targetCount", () => {
  assert.strictEqual(targets.cleanTargetMetrics("qualified-applications", { targetCount: 0, currentCount: 0 }), null);
});
test("formatTargetLabel renders the X/10 counter", () => {
  assert.strictEqual(targets.formatTargetLabel("qualified-applications", { targetCount: 10, currentCount: 3 }), "10 Qualified Applications (3/10)");
});
test("targetReached true only at/after the count (no rounding tolerance)", () => {
  assert.strictEqual(targets.targetReached("qualified-applications", { targetCount: 10, currentCount: 9 }), false);
  assert.strictEqual(targets.targetReached("qualified-applications", { targetCount: 10, currentCount: 10 }), true);
  assert.strictEqual(targets.targetReached("qualified-applications", { targetCount: 10, currentCount: 11 }), true);
});

console.log("Unit: targets.js livelihood-funnel (Milestone #2)");
test("cleanTargetMetrics requires a metricLabel and positive targetValue", () => {
  assert.strictEqual(targets.cleanTargetMetrics("livelihood-funnel", { metricLabel: "", targetValue: 50 }), null);
  assert.strictEqual(targets.cleanTargetMetrics("livelihood-funnel", { metricLabel: "Response Rate", targetValue: 0 }), null);
  const m = targets.cleanTargetMetrics("livelihood-funnel", { metricLabel: "Response Rate", targetValue: 50 });
  assert.deepStrictEqual(m, { metricLabel: "Response Rate", targetValue: 50, currentValue: 0 });
});
test("formatTargetLabel + targetReached", () => {
  const m = { metricLabel: "Response Rate", targetValue: 50, currentValue: 20 };
  assert.strictEqual(targets.formatTargetLabel("livelihood-funnel", m), "Response Rate (20/50)");
  assert.strictEqual(targets.targetReached("livelihood-funnel", m), false);
  assert.strictEqual(targets.targetReached("livelihood-funnel", { ...m, currentValue: 50 }), true);
});
test("cardio/gym untouched by the new branches (non-goal: don't touch existing logic)", () => {
  assert.ok(targets.cleanTargetMetrics("cardio", { jarakKm: 5, paceMinPerKm: 6 }));
  assert.strictEqual(targets.targetReached("cardio", { jarakKm: 5, paceMinPerKm: 6 }, { jarakKm: 5, durasiMenit: 30 }), true);
});

console.log("Unit: jobMatch.js deterministic qualified verdict");
function rawResult(overrides) {
  return {
    matchTable: [{ skill: "SQL", status: "ada bukti", note: "n" }],
    verdict: "v", relevanceNote: "r", nextStep: "n",
    matchScore: 80,
    ...overrides,
  };
}
test("matchScore >= 70 -> qualified true", () => {
  const c = jobMatch.cleanJobMatchResult(rawResult({ matchScore: 70 }));
  assert.strictEqual(c.qualified, true);
  assert.strictEqual(c.matchScore, 70);
});
test("matchScore < 70 -> qualified false", () => {
  const c = jobMatch.cleanJobMatchResult(rawResult({ matchScore: 69 }));
  assert.strictEqual(c.qualified, false);
});
test("qualified is never trusted from a raw AI-claimed boolean", () => {
  // Even if the raw payload smuggled a `qualified: true` claim alongside a
  // low matchScore, cleanJobMatchResult must recompute it from the score.
  const c = jobMatch.cleanJobMatchResult({ ...rawResult({ matchScore: 10 }), qualified: true });
  assert.strictEqual(c.qualified, false);
});
test("missing/malformed matchScore -> null (forces the caller's fallback, same as missing verdict)", () => {
  assert.strictEqual(jobMatch.cleanJobMatchResult(rawResult({ matchScore: undefined })), null);
  assert.strictEqual(jobMatch.cleanJobMatchResult(rawResult({ matchScore: "high" })), null);
});
test("matchScore clamped to 0-100 and rounded", () => {
  assert.strictEqual(jobMatch.cleanJobMatchResult(rawResult({ matchScore: 142 })).matchScore, 100);
  assert.strictEqual(jobMatch.cleanJobMatchResult(rawResult({ matchScore: -5 })).matchScore, 0);
  assert.strictEqual(jobMatch.cleanJobMatchResult(rawResult({ matchScore: 70.6 })).matchScore, 71);
});
test("bad matchTable rows still dropped individually (Task 10b behavior preserved)", () => {
  const c = jobMatch.cleanJobMatchResult(rawResult({ matchTable: [{ skill: "SQL", status: "ada bukti" }, { skill: "", status: "ada bukti" }] }));
  assert.strictEqual(c.matchTable.length, 1);
});

console.log("Unit: jobApplication.js structured evidence validation");
function validApp(overrides) {
  return {
    companyName: "Acme Corp", roleTitle: "Data Analyst", dateApplied: "2026-08-01",
    submissionProof: "Email konfirmasi dari HR pukul 10:00",
    ...overrides,
  };
}
test("valid submission passes", () => {
  const r = jobApplication.validateJobApplication(validApp());
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.clean.companyName, "Acme Corp");
});
test("missing companyName rejected", () => {
  assert.strictEqual(jobApplication.validateJobApplication(validApp({ companyName: "" })).ok, false);
});
test("future dateApplied rejected", () => {
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  assert.strictEqual(jobApplication.validateJobApplication(validApp({ dateApplied: future })).ok, false);
});
test("invalid date format rejected", () => {
  assert.strictEqual(jobApplication.validateJobApplication(validApp({ dateApplied: "not-a-date" })).ok, false);
});
test("thin submissionProof rejected (< 8 chars, anti-fabrication gate)", () => {
  assert.strictEqual(jobApplication.validateJobApplication(validApp({ submissionProof: "ok" })).ok, false);
});
test("empty submissionProof rejected", () => {
  assert.strictEqual(jobApplication.validateJobApplication(validApp({ submissionProof: "" })).ok, false);
});

// ---------------------------------------------------------------------------
// Part 2: API-level tests (needs a running Postgres; boots the app itself).
// ---------------------------------------------------------------------------

async function apiTests() {
  const { spawn } = require("child_process");
  const PORT = 3999;
  const BASE = `http://localhost:${PORT}`;
  const env = {
    ...process.env,
    DATABASE_URL: process.env.TEST_DATABASE_URL || "postgres://postgres:testpass@localhost:5432/eleva_test",
    SESSION_SECRET: "testsecret", BETA_CODE: "TESTCODE", PORT: String(PORT),
  };
  delete env.ANTHROPIC_API_KEY; // keyless on purpose - fallbacks are the contract under test

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

  let cookie = "";
  async function call(path, body, method = "POST") {
    const res = await fetch(`${BASE}${path}`, {
      method, headers: { "Content-Type": "application/json", cookie },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const setCookie = res.headers.getSetCookie?.() || [];
    if (setCookie.length) cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  }

  async function atest(name, fn) {
    try {
      await fn();
      console.log(`  ok - ${name}`);
    } catch (e) {
      failures += 1;
      console.error(`  FAIL - ${name}: ${e.message}`);
    }
  }

  const { Client } = require("pg");
  const sql = new Client({ connectionString: env.DATABASE_URL });
  await sql.connect();

  console.log("API: setup account + Livelihood goal");
  const email = `liv-${Date.now()}@example.com`;
  await call("/api/signup", { email, password: "password123", betaCode: "TESTCODE" });
  await call("/api/profile", {
    name: "Livelihood Tester",
    radarSnapshot: { body: 5, growth: 5, livelihood: 5, emotional: 5, social: 5, purpose: 5, autonomy: 5 },
    pathway: "Architect",
    goals: ["Dapat kerja remote sebagai Data Analyst atau setara"],
  });
  const { rows: userRows } = await sql.query("SELECT id FROM users WHERE email = $1", [email]);
  const userId = userRows[0].id;

  const { json: cvResp } = await call("/api/artifacts", { type: "cv", text: "Pengalaman 3 tahun data analyst, SQL, Python, Tableau." });
  const cvArtifactId = cvResp.artifact.id;

  // Keyless fallbackQuest never emits job-match-analysis/job-application-
  // submit (same reason tests/practicetest.js seeds quests directly) - insert
  // the quest shapes generateQuest would produce.
  async function insertQuest(completionType) {
    const quest = {
      mode: "quest", completionType, structuredKind: null, evidenceSchema: null, practiceTestSchema: null,
      title: completionType === "job-match-analysis" ? "Cek Lowongan Data Analyst" : "Siapkan & Submit Application",
      description: "test", statFocus: "livelihood", why: "test", goalIndex: 0,
    };
    const { rows } = await sql.query(
      `INSERT INTO days (user_id, goal_index, date, quest, insight, reflection, is_side_quest, is_meta)
       VALUES ($1, 0, '2026-08-12', $2, NULL, NULL, false, false) RETURNING id`,
      [userId, quest]
    );
    return rows[0].id;
  }
  // Directly marks a job-match-analysis quest as already completed with a
  // given qualified verdict - simulates what a real (non-keyless) analysis
  // would have produced, since the keyless fallback always returns qualified
  // false and this test needs to exercise BOTH branches.
  async function seedCompletedAnalysis(qualified, matchTable) {
    const dayId = await insertQuest("job-match-analysis");
    const jobMatchResult = {
      matchTable: matchTable || [{ skill: "SQL", status: qualified ? "ada bukti" : "tidak ada", note: "n" }],
      matchScore: qualified ? 85 : 40, qualified,
      verdict: qualified ? "Siap apply sekarang" : "Gap masih besar",
      relevanceNote: "", nextStep: "n",
    };
    await sql.query(
      `UPDATE days SET reflection = $2 WHERE id = $1`,
      [dayId, { status: "done", text: "", jobMatchResult, deltas: {}, timestamp: new Date().toISOString() }]
    );
    return dayId;
  }

  await atest("first job-match/analyze auto-creates the fixed 10-count Milestone at 0/10", async () => {
    const questId = await insertQuest("job-match-analysis");
    const { json, status } = await call("/api/job-match/analyze", { questId, cvArtifactId, images: [{ mimeType: "image/png", dataBase64: "AAAA" }] });
    assert.strictEqual(status, 200, JSON.stringify(json));
    assert.strictEqual(json.result.qualified, false); // keyless fallback
    assert.strictEqual(json.target.mode, "progress");
    assert.strictEqual(json.target.kind, "qualified-applications");
    assert.deepStrictEqual(json.target.currentTarget.metrics, { targetCount: 10, currentCount: 0 });
    assert.strictEqual(json.target.currentTarget.label, "10 Qualified Applications (0/10)");
  });

  await atest("job-match/analyze never applies a stat delta anymore (Task 14 point 6)", async () => {
    const { json: state } = await call("/api/state", null, "GET");
    // No way to have grown from job-match-analyze alone - livelihood stat
    // should sit exactly where it started (profile default), not bumped.
    assert.strictEqual(state.stats.livelihood, 50);
  });

  await atest("quest-context Milestone line is now populated (goalTargets exposed to client)", async () => {
    const { json: state } = await call("/api/state", null, "GET");
    const target = state.goalTargets["0"];
    assert.ok(target, "goalTargets[0] missing - Milestone would never render in questSummaryCard");
    assert.strictEqual(target.kind, "qualified-applications");
  });

  await atest("job-application/submit rejects when the goal's last analysis was NOT qualified", async () => {
    await seedCompletedAnalysis(false);
    const submitQuestId = await insertQuest("job-application-submit");
    const { status, json } = await call("/api/job-application/submit", {
      questId: submitQuestId, cvArtifactId,
      companyName: "Acme Corp", roleTitle: "Data Analyst", dateApplied: "2026-08-01",
      submissionProof: "Email konfirmasi dari HR",
    });
    assert.strictEqual(status, 400);
    assert.ok(/LOLOS/.test(json.error));
  });

  await atest("job-application/submit increments currentCount when the last analysis WAS qualified", async () => {
    await seedCompletedAnalysis(true);
    const submitQuestId = await insertQuest("job-application-submit");
    const { status, json } = await call("/api/job-application/submit", {
      questId: submitQuestId, cvArtifactId,
      companyName: "Acme Corp", roleTitle: "Data Analyst", dateApplied: "2026-08-01",
      submissionProof: "Email konfirmasi dari HR pukul 10:00",
    });
    assert.strictEqual(status, 200, JSON.stringify(json));
    assert.strictEqual(json.jobApplication.companyName, "Acme Corp");
    assert.strictEqual(json.target.mode, "progress");
    assert.strictEqual(json.target.currentTarget.metrics.currentCount, 1);
  });

  await atest("job-application/submit rejects malformed evidence (validateJobApplication gate)", async () => {
    await seedCompletedAnalysis(true);
    const submitQuestId = await insertQuest("job-application-submit");
    const { status } = await call("/api/job-application/submit", {
      questId: submitQuestId, cvArtifactId,
      companyName: "", roleTitle: "Data Analyst", dateApplied: "2026-08-01", submissionProof: "short",
    });
    assert.strictEqual(status, 400);
  });

  await atest("reaching 10/10 triggers the generalized Target Berikutnya options (livelihood-funnel)", async () => {
    // Fast-forward the counter to 9 directly (avoids 9 redundant round trips
    // through the same code path already covered above).
    await sql.query(
      `UPDATE character_state SET goal_targets = goal_targets || jsonb_build_object('0', jsonb_build_object(
         'kind', 'qualified-applications', 'label', '10 Qualified Applications (9/10)', 'approach', '',
         'metrics', jsonb_build_object('targetCount', 10, 'currentCount', 9), 'source', 'evidence', 'createdAt', now()::text
       )) WHERE user_id = $1`,
      [userId]
    );
    await seedCompletedAnalysis(true);
    const submitQuestId = await insertQuest("job-application-submit");
    const { status, json } = await call("/api/job-application/submit", {
      questId: submitQuestId, cvArtifactId,
      companyName: "Acme Corp", roleTitle: "Data Analyst", dateApplied: "2026-08-01",
      submissionProof: "Email konfirmasi dari HR pukul 10:00",
    });
    assert.strictEqual(status, 200, JSON.stringify(json));
    assert.strictEqual(json.target.mode, "options");
    assert.strictEqual(json.target.reached, true);
    assert.strictEqual(json.target.kind, "livelihood-funnel");
    assert.ok(json.target.options.optionA.metrics.metricLabel, "funnel optionA metricLabel missing");
    assert.ok(json.target.options.optionB.metrics.metricLabel, "funnel optionB metricLabel missing");

    // Picking one of the generated options reuses the existing generic
    // /api/goal-target mechanism unmodified (Task 14 point 7).
    const { status: pickStatus, json: pickJson } = await call("/api/goal-target", {
      goalIndex: 0, source: "A", kind: "livelihood-funnel",
      label: json.target.options.optionA.label, approach: json.target.options.optionA.approach,
      metrics: json.target.options.optionA.metrics,
    });
    assert.strictEqual(pickStatus, 200, JSON.stringify(pickJson));
    const { json: state } = await call("/api/state", null, "GET");
    assert.strictEqual(state.goalTargets["0"].kind, "livelihood-funnel");
  });

  await atest("second submit for the SAME unresolved analysis is blocked by the quest-already-completed guard", async () => {
    // Re-use the analysis seeded in the previous test - submitting again on
    // a FRESH quest row is allowed by the qualified-gate (nothing stops a
    // second application to a different posting from the same qualified
    // read), but resubmitting the SAME quest row is not.
    const submitQuestId = await insertQuest("job-application-submit");
    await call("/api/job-application/submit", {
      questId: submitQuestId, cvArtifactId,
      companyName: "Beta LLC", roleTitle: "Data Analyst", dateApplied: "2026-08-02",
      submissionProof: "Konfirmasi via portal karir",
    });
    const { status, json } = await call("/api/job-application/submit", {
      questId: submitQuestId, cvArtifactId,
      companyName: "Beta LLC", roleTitle: "Data Analyst", dateApplied: "2026-08-02",
      submissionProof: "Konfirmasi via portal karir",
    });
    assert.strictEqual(status, 400);
    assert.ok(/sudah pernah/.test(json.error));
  });

  await atest("regression: cardio/gym Target Berikutnya untouched (non-goal)", async () => {
    // Smoke check only - full cardio/gym coverage already lives outside this
    // file; this just confirms the route still responds for that kind.
    const { status } = await call("/api/goal-target", { goalIndex: 0, source: "manual", kind: "cardio", metrics: { jarakKm: 5, paceMinPerKm: 6 } });
    assert.strictEqual(status, 200);
  });

  await sql.end();
  server.kill();
}

(async () => {
  if (process.env.SKIP_API_TESTS === "1") {
    console.log("(API tests skipped: SKIP_API_TESTS=1)");
  } else {
    console.log("API: booting server (keyless, scratch Postgres)");
    await apiTests();
  }
  console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL TESTS PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error("Test run crashed:", e);
  process.exit(1);
});
