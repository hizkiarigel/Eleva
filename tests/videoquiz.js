// Regression script for the Video Quest stack (video-quiz completionType,
// LABORA design handoff).
//
// Pure unit tests - no server, no Postgres, no network:
// - server/youtube.js parseVideoId URL forms
// - server/videoQuiz.js cleanVideoQuizPayload (strict all-or-null),
//   stripQuestions (answer-key isolation), gradeAnswers (set-equality,
//   all-or-nothing), conceptSplit (strong/weak chips), pass threshold
// - server/claude.js normalizeCompletionType/normalizeVideoQuizSchema
//   (the silent-downgrade-to-reflective regression class) and the
//   VIDEO_QUIZ_FALLBACK fixture surviving its own validator (asserted at
//   claude.js module load - requiring it here IS the test).
//
// Run: node tests/videoquiz.js

const assert = require("assert");
const vq = require("../server/videoQuiz");
const yt = require("../server/youtube");

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

console.log("Unit: parseVideoId");
test("watch?v= form", () => assert.strictEqual(yt.parseVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s"), "dQw4w9WgXcQ"));
test("youtu.be short form", () => assert.strictEqual(yt.parseVideoId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ"));
test("shorts form", () => assert.strictEqual(yt.parseVideoId("youtube.com/shorts/dQw4w9WgXcQ"), "dQw4w9WgXcQ"));
test("embed form", () => assert.strictEqual(yt.parseVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ"), "dQw4w9WgXcQ"));
test("mobile host", () => assert.strictEqual(yt.parseVideoId("https://m.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ"));
test("non-YouTube URL rejected", () => assert.strictEqual(yt.parseVideoId("https://vimeo.com/12345"), null));
test("garbage rejected", () => assert.strictEqual(yt.parseVideoId("not a url"), null));
test("empty rejected", () => assert.strictEqual(yt.parseVideoId(""), null));
test("bad id length rejected", () => assert.strictEqual(yt.parseVideoId("https://youtu.be/short"), null));

// --- helpers to build a valid raw payload the validator should accept ---
const STYLES = ["conceptual", "conceptual", "conceptual", "scenario", "scenario", "scenario", "scenario", "scenario",
  "error-identification", "error-identification", "error-identification", "best-practice", "best-practice", "best-practice", "multi"];
function makeQuestion(i) {
  const style = STYLES[i];
  if (style === "multi") {
    return {
      style, concept: "praktik terbaik", prompt: `Soal multi ${i + 1}`,
      options: ["a", "b", "c", "d", "e"].map((id) => ({ id, text: `Opsi ${id}` })),
      correct: ["a", "b", "c"], explanation: "Karena transkrip bilang begitu.",
    };
  }
  return {
    style, concept: i % 2 ? "verifikasi" : "prinsip dasar", prompt: `Soal ${i + 1}`,
    options: ["a", "b", "c", "d"].map((id) => ({ id, text: `Opsi ${id}` })),
    correct: ["b"], explanation: "Karena transkrip bilang begitu.",
  };
}
function makeRaw(mutate) {
  const raw = { questions: Array.from({ length: 15 }, (_, i) => makeQuestion(i)) };
  if (mutate) mutate(raw);
  return raw;
}

console.log("Unit: cleanVideoQuizPayload (strict all-or-null)");
test("valid 15-question set accepted, ids stamped q1..q15", () => {
  const cleaned = vq.cleanVideoQuizPayload(makeRaw());
  assert.ok(cleaned);
  assert.strictEqual(cleaned.questions.length, 15);
  assert.deepStrictEqual(cleaned.questions.map((q) => q.id), Array.from({ length: 15 }, (_, i) => `q${i + 1}`));
  assert.strictEqual(cleaned.questions.filter((q) => q.format === "multi").length, 1);
  assert.strictEqual(cleaned.questions[14].format, "multi");
});
test("14 questions rejected", () => assert.strictEqual(vq.cleanVideoQuizPayload(makeRaw((r) => r.questions.pop())), null));
test("16 questions rejected", () => assert.strictEqual(vq.cleanVideoQuizPayload(makeRaw((r) => r.questions.push(makeQuestion(0)))), null));
test("wrong style order rejected", () => assert.strictEqual(vq.cleanVideoQuizPayload(makeRaw((r) => { r.questions[0].style = "scenario"; })), null));
test("multi in a single slot rejected", () => assert.strictEqual(vq.cleanVideoQuizPayload(makeRaw((r) => { r.questions[3] = makeQuestion(14); })), null));
test("correct id not in options rejected", () => assert.strictEqual(vq.cleanVideoQuizPayload(makeRaw((r) => { r.questions[2].correct = ["f"]; })), null));
test("single with 2 correct rejected", () => assert.strictEqual(vq.cleanVideoQuizPayload(makeRaw((r) => { r.questions[2].correct = ["a", "b"]; })), null));
test("single with 5 options rejected", () => assert.strictEqual(vq.cleanVideoQuizPayload(makeRaw((r) => { r.questions[2].options.push({ id: "e", text: "Ekstra" }); })), null));
test("multi with 1 correct rejected", () => assert.strictEqual(vq.cleanVideoQuizPayload(makeRaw((r) => { r.questions[14].correct = ["a"]; })), null));
test("multi with all options correct rejected", () => assert.strictEqual(vq.cleanVideoQuizPayload(makeRaw((r) => { r.questions[14].correct = ["a", "b", "c", "d", "e"]; })), null));
test("missing concept rejected", () => assert.strictEqual(vq.cleanVideoQuizPayload(makeRaw((r) => { r.questions[5].concept = ""; })), null));
test("missing explanation rejected", () => assert.strictEqual(vq.cleanVideoQuizPayload(makeRaw((r) => { delete r.questions[9].explanation; })), null));
test("duplicate option ids rejected", () => assert.strictEqual(vq.cleanVideoQuizPayload(makeRaw((r) => { r.questions[1].options[1].id = "a"; })), null));

console.log("Unit: stripQuestions");
test("answer key never leaves", () => {
  const { questions } = vq.cleanVideoQuizPayload(makeRaw());
  const stripped = vq.stripQuestions(questions);
  assert.strictEqual(stripped.length, 15);
  stripped.forEach((q) => {
    assert.strictEqual(q.correct, undefined);
    assert.strictEqual(q.explanation, undefined);
    assert.ok(q.concept && q.prompt && q.options.length >= 4);
  });
});

console.log("Unit: gradeAnswers (set-equality, all-or-nothing)");
const { questions: QS } = vq.cleanVideoQuizPayload(makeRaw());
function allCorrectAnswers() {
  const answers = {};
  QS.forEach((q) => { answers[q.id] = [...q.correct]; });
  return answers;
}
test("perfect answers → 15/15", () => {
  const g = vq.gradeAnswers(QS, allCorrectAnswers());
  assert.strictEqual(g.score, 15);
  assert.strictEqual(g.total, 15);
});
test("multi order-insensitive", () => {
  const answers = allCorrectAnswers();
  answers.q15 = [...answers.q15].reverse();
  assert.strictEqual(vq.gradeAnswers(QS, answers).score, 15);
});
test("multi superset = wrong", () => {
  const answers = allCorrectAnswers();
  answers.q15 = [...answers.q15, "d"];
  assert.strictEqual(vq.gradeAnswers(QS, answers).score, 14);
});
test("multi subset = wrong", () => {
  const answers = allCorrectAnswers();
  answers.q15 = answers.q15.slice(0, 1);
  assert.strictEqual(vq.gradeAnswers(QS, answers).score, 14);
});
test("unanswered = wrong, never throws", () => {
  const g = vq.gradeAnswers(QS, {});
  assert.strictEqual(g.score, 0);
  assert.strictEqual(g.perQuestion.length, 15);
});
test("single wrong pick = wrong", () => {
  const answers = allCorrectAnswers();
  answers.q1 = ["a"]; // correct is b
  assert.strictEqual(vq.gradeAnswers(QS, answers).score, 14);
});
test("case/whitespace tolerant", () => {
  const answers = allCorrectAnswers();
  answers.q1 = [" B "];
  assert.strictEqual(vq.gradeAnswers(QS, answers).score, 15);
});

console.log("Unit: conceptSplit");
test("strong = all correct, weak = any wrong, never both", () => {
  const answers = allCorrectAnswers();
  answers.q2 = ["a"]; // q2 concept "verifikasi" (i=1 odd) - one wrong poisons the concept
  const g = vq.gradeAnswers(QS, answers);
  const split = vq.conceptSplit(g.perQuestion);
  assert.ok(split.weakConcepts.includes("verifikasi"));
  assert.ok(!split.strongConcepts.includes("verifikasi"));
  assert.ok(split.strongConcepts.includes("prinsip dasar"));
  assert.ok(split.strongConcepts.includes("praktik terbaik"));
});
test("all wrong → no strong concepts", () => {
  const g = vq.gradeAnswers(QS, {});
  const split = vq.conceptSplit(g.perQuestion);
  assert.strictEqual(split.strongConcepts.length, 0);
  assert.ok(split.weakConcepts.length >= 2);
});

console.log("Unit: pass threshold boundary");
test("11/15 passes at default threshold, 10/15 fails", () => {
  assert.strictEqual(vq.DEFAULT_PASS_THRESHOLD, 11);
  assert.ok(11 >= vq.DEFAULT_PASS_THRESHOLD);
  assert.ok(!(10 >= vq.DEFAULT_PASS_THRESHOLD));
});

console.log("Unit: parseTimedTextXml (caption XML fallback)");
test("joins <text> bodies, strips inner tags, decodes entities", () => {
  const xml = `<transcript><text start="0" dur="2">hello &amp; welcome</text><text start="2">it&#39;s <i>great</i> &#x27;fun&#x27;</text></transcript>`;
  assert.strictEqual(yt.parseTimedTextXml(xml), "hello & welcome it's great 'fun'");
});
test("empty/garbage xml -> empty string", () => {
  assert.strictEqual(yt.parseTimedTextXml(""), "");
  assert.strictEqual(yt.parseTimedTextXml("<transcript></transcript>"), "");
  assert.strictEqual(yt.parseTimedTextXml(null), "");
});

console.log("Unit: selectCaptionTrack priority ladder");
const trk = (languageCode, kind) => ({ languageCode, ...(kind ? { kind } : {}), baseUrl: "u" });
test("manual id beats everything", () => {
  assert.strictEqual(yt.selectCaptionTrack([trk("en"), trk("id", "asr"), trk("id")]).languageCode, "id");
  assert.strictEqual(yt.selectCaptionTrack([trk("en"), trk("id", "asr"), trk("id")]).kind, undefined);
});
test("manual en beats asr id", () => {
  const t = yt.selectCaptionTrack([trk("id", "asr"), trk("en")]);
  assert.strictEqual(t.languageCode, "en");
  assert.strictEqual(t.kind, undefined);
});
test("asr id beats asr en; anything beats nothing", () => {
  assert.strictEqual(yt.selectCaptionTrack([trk("en", "asr"), trk("id", "asr")]).languageCode, "id");
  assert.strictEqual(yt.selectCaptionTrack([trk("fr")]).languageCode, "fr");
  assert.strictEqual(yt.selectCaptionTrack([]), null);
});

console.log("Unit: sanitizeManualTranscript");
const LONG = "kalimat materi pembelajaran yang cukup panjang untuk dianggap transkrip valid ".repeat(5);
test("strips standalone timestamps (0:00, 12:34, 1:02:34)", () => {
  const out = yt.sanitizeManualTranscript(`0:00 halo semua 12:34 ini materi 1:02:34 penutup ${LONG}`);
  assert.ok(out && !/\d{1,2}:\d{2}/.test(out));
  assert.ok(out.includes("halo semua") && out.includes("ini materi"));
});
test("too short -> null", () => assert.strictEqual(yt.sanitizeManualTranscript("materi singkat 0:00"), null));
test("caps at TRANSCRIPT_CHAR_CAP", () => {
  const out = yt.sanitizeManualTranscript("a".repeat(20000) + " b");
  assert.ok(out.length <= yt.TRANSCRIPT_CHAR_CAP);
});
test("collapses whitespace/newlines", () => {
  const out = yt.sanitizeManualTranscript(`baris satu\n\nbaris   dua\t${LONG}`);
  assert.ok(out.includes("baris satu baris dua"));
});

console.log("Unit: claude.js normalization + fallback fixture");
// Requiring claude.js also runs the VIDEO_QUIZ_FALLBACK module-load
// assertion (it throws if the fixture stops passing cleanVideoQuizPayload).
const ai = require("../server/claude");
test("video-quiz survives normalizeCompletionType (no reflective downgrade)", () => {
  const q = { completionType: "video-quiz", structuredKind: "gym" };
  ai.normalizeCompletionType(q);
  assert.strictEqual(q.completionType, "video-quiz");
  assert.strictEqual(q.structuredKind, null);
});
test("normalizeVideoQuizSchema clamps + defaults", () => {
  const q = { completionType: "video-quiz", title: "T", videoQuiz: { topic: "  Data Entry  ", passThreshold: 99, estimatedMinutes: 1 } };
  ai.normalizeVideoQuizSchema(q);
  assert.deepStrictEqual(q.videoQuiz, { topic: "Data Entry", passThreshold: 14, estimatedMinutes: 5 });
});
test("missing topic falls back to quest title, never null", () => {
  const q = { completionType: "video-quiz", title: "Belajar Data Entry", videoQuiz: null };
  ai.normalizeVideoQuizSchema(q);
  assert.strictEqual(q.videoQuiz.topic, "Belajar Data Entry");
  assert.strictEqual(q.videoQuiz.passThreshold, 11);
  assert.strictEqual(q.videoQuiz.estimatedMinutes, 25);
});
test("non-video-quiz gets videoQuiz nulled", () => {
  const q = { completionType: "reflective", videoQuiz: { topic: "x" } };
  ai.normalizeVideoQuizSchema(q);
  assert.strictEqual(q.videoQuiz, null);
});
// Async tests kept out of the sync test() helper so their assertions still
// count toward `failures` before the summary prints.
async function atest(name, fn) {
  try {
    await fn();
    console.log(`  ok - ${name}`);
  } catch (e) {
    failures += 1;
    console.error(`  FAIL - ${name}: ${e.message}`);
  }
}

// Monkey-patched global fetch for the error-taxonomy tests (no network).
// handler(url, opts) returns { status?, json?, text? }.
async function withFakeFetch(handler, fn) {
  const real = global.fetch;
  global.fetch = async (url, opts) => {
    const r = handler(String(url), opts) || {};
    return {
      ok: (r.status || 200) < 400,
      status: r.status || 200,
      json: async () => { if (r.json === undefined) throw new Error("not json"); return r.json; },
      text: async () => r.text ?? "",
      headers: { getSetCookie: () => [] },
    };
  };
  try { await fn(); } finally { global.fetch = real; }
}
const playerBody = (opts) => JSON.parse(opts?.body || "{}");

(async () => {
  console.log("Unit: fetchVideoData error taxonomy (fake fetch)");
  await atest("all strategies bot-checked -> YT_BLOCKED", () => withFakeFetch((url) => {
    if (url.includes("oembed")) return { json: { title: "T", author_name: "A" } };
    if (url.includes("youtubei/v1/player")) return { json: { playabilityStatus: { status: "LOGIN_REQUIRED", reason: "Sign in to confirm" } } };
    if (url.includes("/watch")) return { text: "<html>nothing useful</html>" };
    return { status: 404 };
  }, async () => {
    await assert.rejects(() => yt.fetchVideoData("https://youtu.be/dQw4w9WgXcQ"), (e) => e.code === "YT_BLOCKED");
  }));
  await atest("playable response with zero tracks -> NO_CAPTIONS", () => withFakeFetch((url) => {
    if (url.includes("oembed")) return { json: { title: "T", author_name: "A" } };
    if (url.includes("youtubei/v1/player")) return { json: { playabilityStatus: { status: "OK" }, videoDetails: { lengthSeconds: "100" } } };
    if (url.includes("/watch")) return { text: "<html></html>" };
    return { status: 404 };
  }, async () => {
    await assert.rejects(() => yt.fetchVideoData("https://youtu.be/dQw4w9WgXcQ"), (e) => e.code === "NO_CAPTIONS");
  }));
  await atest("empty json3 body falls back to timedtext XML", () => withFakeFetch((url, opts) => {
    if (url.includes("oembed")) return { json: { title: "Judul Video", author_name: "Kanal" } };
    if (url.includes("youtubei/v1/player")) {
      const client = playerBody(opts)?.context?.client?.clientName;
      if (client === "ANDROID") {
        return { json: { playabilityStatus: { status: "OK" }, videoDetails: { lengthSeconds: "300", title: "Judul", author: "Kanal" }, captions: { playerCaptionsTracklistRenderer: { captionTracks: [{ languageCode: "id", baseUrl: "https://cap.example/track" }] } } } };
      }
      return { json: { playabilityStatus: { status: "LOGIN_REQUIRED" } } };
    }
    if (url.startsWith("https://cap.example/track&fmt=json3")) return { json: { events: [] } };
    if (url.startsWith("https://cap.example/track")) return { text: `<transcript><text start="0">materi dari xml &amp; lainnya</text></transcript>` };
    return { status: 404 };
  }, async () => {
    const data = await yt.fetchVideoData("https://youtu.be/dQw4w9WgXcQ");
    assert.strictEqual(data.transcript, "materi dari xml & lainnya");
    assert.strictEqual(data.videoMeta.title, "Judul Video");
    assert.strictEqual(data.videoMeta.durationSec, 300);
  }));
  await atest("first strategy with tracks wins (winner had transcript via json3)", () => withFakeFetch((url, opts) => {
    if (url.includes("oembed")) return { status: 500 }; // oEmbed failure must be non-fatal now
    if (url.includes("youtubei/v1/player")) {
      const client = playerBody(opts)?.context?.client?.clientName;
      if (client === "ANDROID") return { json: { playabilityStatus: { status: "LOGIN_REQUIRED" } } };
      return { json: { playabilityStatus: { status: "OK" }, videoDetails: { lengthSeconds: "60", title: "Fallback Title", author: "Ch" }, captions: { playerCaptionsTracklistRenderer: { captionTracks: [{ languageCode: "en", baseUrl: "https://cap.example/web" }] } } } };
    }
    if (url.startsWith("https://cap.example/web&fmt=json3")) return { json: { events: [{ segs: [{ utf8: "hello" }, { utf8: "world" }] }] } };
    return { status: 404 };
  }, async () => {
    const data = await yt.fetchVideoData("https://youtu.be/dQw4w9WgXcQ");
    assert.strictEqual(data.transcript, "hello world");
    assert.strictEqual(data.videoMeta.title, "Fallback Title"); // from player, oEmbed dead
  }));

  // Async test kept out of the sync test() helper so its assertions still
  // count toward `failures` before the summary prints.
  try {
    process.env.ELEVA_YOUTUBE_STUB = "1";
    const data = await yt.fetchVideoData("https://youtu.be/dQw4w9WgXcQ");
    delete process.env.ELEVA_YOUTUBE_STUB;
    assert.strictEqual(data.videoId, "dQw4w9WgXcQ");
    assert.ok(data.videoMeta.title && data.transcript.length > 100);
    console.log("  ok - ELEVA_YOUTUBE_STUB returns fixture without network");
  } catch (e) {
    failures += 1;
    console.error(`  FAIL - ELEVA_YOUTUBE_STUB returns fixture without network: ${e.message}`);
  }

  if (failures) {
    console.error(`\n${failures} test(s) failed`);
    process.exit(1);
  }
  console.log("\nall videoquiz tests passed");
})();
