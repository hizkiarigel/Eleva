// Regression script for the LABORA Chain stack (labora-chain
// completionType). Pure unit tests - no server, no Postgres, no network:
// - server/laboraChain.js normalizeChain / advanceChain (incl. the
//   auto-skip-submit rule) / inChainJobMatch / chainSummary
// - server/claude.js normalizeLaboraChain (malformed-chain downgrade, the
//   chain-aware videoQuiz retention in normalizeVideoQuizSchema)
//
// Run: node tests/laborachain.js

const assert = require("assert");
const lc = require("../server/laboraChain");

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

const step = (feature) => ({ feature });

console.log("Unit: normalizeChain");
test("full 3-step chain initializes in canonical order", () => {
  const c = lc.normalizeChain([step("job-match-analysis"), step("video-quiz"), step("job-application-submit")]);
  assert.deepStrictEqual(c.steps.map((s) => s.feature), ["video-quiz", "job-match-analysis", "job-application-submit"]);
  assert.strictEqual(c.currentIndex, 0);
  assert.deepStrictEqual(c.steps.map((s) => s.status), ["active", "pending", "pending"]);
  c.steps.forEach((s) => { assert.strictEqual(s.result, null); assert.strictEqual(s.note, null); });
});
test("duplicates deduped", () => {
  const c = lc.normalizeChain([step("video-quiz"), step("video-quiz"), step("job-match-analysis")]);
  assert.deepStrictEqual(c.steps.map((s) => s.feature), ["video-quiz", "job-match-analysis"]);
});
test("unknown features dropped", () => {
  const c = lc.normalizeChain([step("video-quiz"), step("nutrition-log"), step("job-match-analysis")]);
  assert.deepStrictEqual(c.steps.map((s) => s.feature), ["video-quiz", "job-match-analysis"]);
});
test("submit dropped without job-match and without qualified hint", () => {
  const c = lc.normalizeChain([step("video-quiz"), step("job-application-submit")]);
  assert.strictEqual(c, null); // only 1 step survives -> null
});
test("submit kept without job-match when hint qualified", () => {
  const c = lc.normalizeChain([step("video-quiz"), step("job-application-submit")], { jobMatchHintQualified: true });
  assert.deepStrictEqual(c.steps.map((s) => s.feature), ["video-quiz", "job-application-submit"]);
});
test("fewer than 2 steps -> null", () => {
  assert.strictEqual(lc.normalizeChain([step("job-match-analysis")]), null);
  assert.strictEqual(lc.normalizeChain([]), null);
  assert.strictEqual(lc.normalizeChain(null), null);
  assert.strictEqual(lc.normalizeChain("garbage"), null);
});

console.log("Unit: advanceChain");
function freshChain(features, opts) {
  return lc.normalizeChain(features.map(step), opts);
}
test("normal advance marks done + activates next", () => {
  const c = freshChain(["video-quiz", "job-match-analysis"]);
  const { chain, completed } = lc.advanceChain(c, { score: 12, total: 15 });
  assert.strictEqual(completed, false);
  assert.strictEqual(chain.currentIndex, 1);
  assert.strictEqual(chain.steps[0].status, "done");
  assert.strictEqual(chain.steps[0].result.score, 12);
  assert.strictEqual(chain.steps[1].status, "active");
  // original untouched (deep copy)
  assert.strictEqual(c.steps[0].status, "active");
});
test("last step completes the chain", () => {
  let c = freshChain(["video-quiz", "job-match-analysis"]);
  c = lc.advanceChain(c, { score: 12 }).chain;
  const { chain, completed } = lc.advanceChain(c, { qualified: true, matchScore: 80 });
  assert.strictEqual(completed, true);
  assert.strictEqual(chain.steps.every((s) => s.status === "done"), true);
});
test("unqualified job-match auto-skips the submit step and completes", () => {
  let c = freshChain(["job-match-analysis", "job-application-submit"]);
  const { chain, completed } = lc.advanceChain(c, { qualified: false, matchScore: 40 });
  assert.strictEqual(completed, true);
  assert.strictEqual(chain.steps[1].status, "skipped");
  assert.ok(chain.steps[1].note && /dilewati/.test(chain.steps[1].note));
});
test("qualified job-match does NOT skip the submit step", () => {
  let c = freshChain(["job-match-analysis", "job-application-submit"]);
  const { chain, completed } = lc.advanceChain(c, { qualified: true, matchScore: 82 });
  assert.strictEqual(completed, false);
  assert.strictEqual(chain.steps[1].status, "active");
});
test("3-step chain: vq pass -> unqualified jm -> submit skipped, chain done", () => {
  let c = freshChain(["video-quiz", "job-match-analysis", "job-application-submit"]);
  c = lc.advanceChain(c, { score: 13, total: 15, attempt: 1, topic: "x" }).chain;
  const { chain, completed } = lc.advanceChain(c, { qualified: false, matchScore: 30 });
  assert.strictEqual(completed, true);
  assert.deepStrictEqual(chain.steps.map((s) => s.status), ["done", "done", "skipped"]);
});

console.log("Unit: inChainJobMatch + chainSummary");
test("inChainJobMatch returns the stored analysis result", () => {
  let c = freshChain(["job-match-analysis", "job-application-submit"]);
  c = lc.advanceChain(c, { qualified: true, matchScore: 75 }).chain;
  assert.strictEqual(lc.inChainJobMatch(c).matchScore, 75);
  assert.strictEqual(lc.inChainJobMatch(freshChain(["video-quiz", "job-match-analysis"])), null);
});
test("chainSummary headlines per feature/status", () => {
  let c = freshChain(["video-quiz", "job-match-analysis", "job-application-submit"]);
  c = lc.advanceChain(c, { score: 13, total: 15, attempt: 2, topic: "data entry" }).chain;
  c = lc.advanceChain(c, { qualified: false, matchScore: 44 }).chain;
  const summary = lc.chainSummary(c);
  assert.strictEqual(summary.length, 3);
  assert.ok(summary[0].headline.includes("13/15") && summary[0].headline.includes("attempt 2"));
  assert.ok(summary[1].headline.includes("44") && summary[1].headline.includes("belum qualified"));
  assert.strictEqual(summary[2].status, "skipped");
});

console.log("Unit: claude.js normalizeLaboraChain");
const ai = require("../server/claude");
test("labora-chain survives normalizeCompletionType", () => {
  const q = { completionType: "labora-chain", structuredKind: "gym" };
  ai.normalizeCompletionType(q);
  assert.strictEqual(q.completionType, "labora-chain");
  assert.strictEqual(q.structuredKind, null);
});
test("valid chain normalized in place", () => {
  const q = {
    completionType: "labora-chain", title: "Percepat job hunt",
    laboraChain: { steps: [step("job-match-analysis"), step("video-quiz")] },
    videoQuiz: { topic: "Data Entry Fundamentals", passThreshold: 11, estimatedMinutes: 25 },
  };
  ai.normalizeLaboraChain(q, {});
  ai.normalizeVideoQuizSchema(q);
  assert.deepStrictEqual(q.laboraChain.steps.map((s) => s.feature), ["video-quiz", "job-match-analysis"]);
  assert.strictEqual(q.lifecycleType, "session");
  // chain with a video-quiz step KEEPS videoQuiz (the /api/video-quiz
  // routes read it top-level)
  assert.strictEqual(q.videoQuiz.topic, "Data Entry Fundamentals");
});
test("chain without a video-quiz step gets videoQuiz nulled", () => {
  const q = {
    completionType: "labora-chain", title: "T",
    laboraChain: { steps: [step("job-match-analysis"), step("job-application-submit")] },
    videoQuiz: { topic: "x" },
  };
  ai.normalizeLaboraChain(q, {});
  ai.normalizeVideoQuizSchema(q);
  assert.strictEqual(q.videoQuiz, null);
});
test("malformed chain downgrades to plain job-match-analysis", () => {
  const q = { completionType: "labora-chain", title: "T", laboraChain: { steps: [step("nonsense")] }, videoQuiz: { topic: "x" } };
  ai.normalizeLaboraChain(q, {});
  assert.strictEqual(q.completionType, "job-match-analysis");
  assert.strictEqual(q.laboraChain, null);
  assert.strictEqual(q.videoQuiz, null);
});
test("submit-only-with-hint chain allowed via ctx.jobMatchHint", () => {
  const q = { completionType: "labora-chain", title: "T", laboraChain: { steps: [step("video-quiz"), step("job-application-submit")] }, videoQuiz: { topic: "Data Entry", passThreshold: 11, estimatedMinutes: 20 } };
  ai.normalizeLaboraChain(q, { jobMatchHint: { qualified: true } });
  assert.strictEqual(q.completionType, "labora-chain");
  assert.deepStrictEqual(q.laboraChain.steps.map((s) => s.feature), ["video-quiz", "job-application-submit"]);
});
test("non-chain quests get laboraChain nulled", () => {
  const q = { completionType: "reflective", laboraChain: { steps: [] } };
  ai.normalizeLaboraChain(q, {});
  assert.strictEqual(q.laboraChain, null);
});

console.log("Unit: forceJobHuntingChain (founder feedback backstop - job-hunting quests always chain)");
test("standalone job-match-analysis upgrades to a valid 2-step labora-chain", () => {
  const q = { completionType: "job-match-analysis", title: "T" };
  ai.forceJobHuntingChain(q);
  assert.strictEqual(q.completionType, "labora-chain");
  assert.deepStrictEqual(q.laboraChain.steps.map((s) => s.feature), ["job-match-analysis", "job-application-submit"]);
  // the forced pair must survive real normalizeChain validation regardless
  // of jobMatchHint history - this is the whole point of the backstop.
  const withoutHint = lc.normalizeChain(q.laboraChain.steps, { jobMatchHintQualified: false });
  assert.ok(withoutHint, "must produce a valid chain even with no qualifying history");
  assert.strictEqual(withoutHint.steps.length, 2);
  const withHint = lc.normalizeChain(q.laboraChain.steps, { jobMatchHintQualified: true });
  assert.ok(withHint, "must also produce a valid chain when a prior match qualified");
});
test("forceJobHuntingChain composes with normalizeLaboraChain unchanged", () => {
  const q = { completionType: "job-match-analysis", title: "T" };
  ai.forceJobHuntingChain(q);
  ai.normalizeLaboraChain(q, {});
  assert.strictEqual(q.completionType, "labora-chain");
  assert.deepStrictEqual(q.laboraChain.steps.map((s) => s.feature), ["job-match-analysis", "job-application-submit"]);
  assert.strictEqual(q.lifecycleType, "session");
});
test("job-application-submit is left standalone (deliberately not chained)", () => {
  const q = { completionType: "job-application-submit", title: "T" };
  ai.forceJobHuntingChain(q);
  assert.strictEqual(q.completionType, "job-application-submit");
  assert.strictEqual(q.laboraChain, undefined);
});
test("a genuine model-proposed labora-chain is untouched", () => {
  const q = { completionType: "labora-chain", laboraChain: { steps: [step("video-quiz"), step("job-match-analysis")] } };
  ai.forceJobHuntingChain(q);
  assert.deepStrictEqual(q.laboraChain.steps.map((s) => s.feature), ["video-quiz", "job-match-analysis"]);
});
test("non-job-hunting completionTypes are untouched", () => {
  ["reflective", "structured-physical", "video-quiz", "nutrition-log", "practice-test"].forEach((ct) => {
    const q = { completionType: ct };
    ai.forceJobHuntingChain(q);
    assert.strictEqual(q.completionType, ct);
  });
});

if (failures) {
  console.error(`\n${failures} test(s) failed`);
  process.exit(1);
}
console.log("\nall laborachain tests passed");
