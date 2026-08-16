// Unit test for the generateQuest() prompt addition (round 40): when a
// goal's previous quest just got auto-expired (server/index.js's new expiry
// loop), ctx.previousQuestExpired is set true for that goal's regeneration
// pass, and generateQuest()'s prompt must include the new "kelewat batas
// waktu... buat quest hari ini SECARA JELAS lebih kecil" marker language so
// the model actually makes the replacement easier - and must NOT include it
// when the field is absent (the normal case).
//
// Mocks global.fetch (Node's built-in fetch, what callClaude actually calls)
// to capture the outgoing prompt without hitting the real Anthropic API -
// same "no DB/server needed, pure unit" spirit as tests/recoveryregression.js,
// but this one needs ANTHROPIC_API_KEY set (hasKey() must be true) so
// generateQuest() builds the real prompt instead of short-circuiting to
// fallbackQuest().
//
// Run: node tests/quest-expiry-prompt.js (no DB/server needed).

const assert = require("assert");

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

const MOCK_QUEST_RESPONSE = {
  chapterNumber: 1, chapterTitle: "Bab Satu", insight: "insight", pathwayNoun: null, observed: null,
  quest: {
    mode: "quest", completionType: "reflective", structuredKind: null, evidenceSchema: null,
    practiceTestSchema: null, progressive: null,
    title: "Quest Ringan", description: "Deskripsi singkat.", statFocus: "growth", why: "why",
  },
};

function mockFetchCapturing(capturedBodies) {
  return async (url, opts) => {
    capturedBodies.push(JSON.parse(opts.body));
    return {
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: JSON.stringify(MOCK_QUEST_RESPONSE) }],
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
      text: async () => "",
    };
  };
}

(async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "test-key-for-mocked-fetch";
  // require AFTER setting the key so any module-level hasKey() snapshot (there
  // is none today, hasKey() reads process.env live - but this ordering is the
  // safe default regardless) reflects the keyed state.
  delete require.cache[require.resolve("../server/claude")];
  const claude = require("../server/claude");

  try {
    console.log("Unit: generateQuest() prompt includes the 'previous quest expired' marker only when ctx.previousQuestExpired is set");

    await test("ctx.previousQuestExpired: true adds the 'kelewat batas waktu' marker to the outgoing prompt", async () => {
      const captured = [];
      global.fetch = mockFetchCapturing(captured);
      await claude.generateQuest({ activeGoal: "Goal A", goals: ["Goal A"], stats: { growth: 50 }, previousQuestExpired: true });
      assert.strictEqual(captured.length, 1, "expected exactly one fetch call");
      const userMessage = captured[0].messages[0].content;
      assert.ok(userMessage.includes("kelewat batas waktu"), "prompt must contain the previousQuestExpired marker phrase");
      assert.ok(userMessage.includes("lebih kecil dan lebih ringan"), "prompt must instruct the model to make the replacement noticeably smaller");
    });

    await test("omitting ctx.previousQuestExpired leaves the marker phrase out of the prompt", async () => {
      const captured = [];
      global.fetch = mockFetchCapturing(captured);
      await claude.generateQuest({ activeGoal: "Goal A", goals: ["Goal A"], stats: { growth: 50 } });
      assert.strictEqual(captured.length, 1, "expected exactly one fetch call");
      const userMessage = captured[0].messages[0].content;
      assert.ok(!userMessage.includes("kelewat batas waktu"), "prompt must NOT contain the marker phrase when previousQuestExpired is absent");
    });

    await test("previousQuestExpired: false (falsy but present) also omits the marker", async () => {
      const captured = [];
      global.fetch = mockFetchCapturing(captured);
      await claude.generateQuest({ activeGoal: "Goal A", goals: ["Goal A"], stats: { growth: 50 }, previousQuestExpired: false });
      const userMessage = captured[0].messages[0].content;
      assert.ok(!userMessage.includes("kelewat batas waktu"), "a falsy previousQuestExpired must not trigger the marker");
    });

    console.log("Unit: keyless fallback path tolerates the extra ctx field harmlessly");
    await test("generateQuest() with previousQuestExpired: true in the KEYLESS path doesn't throw (fallbackQuest ignores it)", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete require.cache[require.resolve("../server/claude")];
      const keylessClaude = require("../server/claude");
      const result = await keylessClaude.generateQuest({ activeGoal: "Goal A", goals: ["Goal A"], stats: { growth: 50 }, previousQuestExpired: true });
      assert.ok(result?.quest?.title, "fallbackQuest must still return a valid quest shape");
      process.env.ANTHROPIC_API_KEY = "test-key-for-mocked-fetch";
    });
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
    delete require.cache[require.resolve("../server/claude")];
  }

  console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL TESTS PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
