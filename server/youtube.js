// Video Quest (video-quiz): YouTube metadata + transcript fetching, no
// dependency - same hand-rolled global-fetch convention as callClaude in
// server/claude.js.
//
// Production bug (19 Agustus, Railway): the original single innertube WEB
// call, sent without a User-Agent, gets bot-check responses from datacenter
// IPs - YouTube answers with playabilityStatus LOGIN_REQUIRED (or similar)
// and NO captions object even for caption-ful videos, which the old code
// misread as "video has no subtitles". Fix: three strategies tried in
// order, an honest error taxonomy, and per-strategy diagnostics logged so
// production failures are debuggable:
//
//   1. Innertube player API, ANDROID client (historically the most
//      reliable for captionTracks from server IPs).
//   2. Innertube player API, WEB client with browser-like headers.
//   3. Watch-page scrape: GET /watch?v=ID and extract
//      ytInitialPlayerResponse from the HTML.
//
// Caption bodies are fetched as fmt=json3 first; an empty/unparseable body
// falls back to the bare timedtext XML (<text ...> elements).
//
// Error codes the routes map to user copy:
//   err.code === "NO_CAPTIONS" -> a PLAYABLE response listed zero caption
//     tracks: the video genuinely has no readable subtitles.
//   err.code === "YT_BLOCKED"  -> no strategy got a playable response with
//     tracks (bot-check / IP block): NOT the video's fault - the client
//     offers the manual paste-transcript fallback.
//   anything else              -> network/parse failure ("coba lagi").
//
// All innertube/watch-page surfaces are UNOFFICIAL and churn with YouTube
// changes - every YouTube library on npm wraps these same calls.
//
// Test/keyless hook: ELEVA_YOUTUBE_STUB=1 makes fetchVideoData and
// fetchVideoMetaOnly return a fixed fixture for any parseable URL (no
// network) - the e2e suite and keyless dev runs use this, same spirit as
// claude.js's hasKey() fallbacks.

const TRANSCRIPT_CHAR_CAP = 15000;
// Manual transcripts shorter than this can't support a 15-question HOTS
// set - reject early with actionable copy instead of generating garbage.
const MANUAL_TRANSCRIPT_MIN = 200;

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const ANDROID_UA = "com.google.android.youtube/19.09.37 (Linux; U; Android 14) gzip";

// Accepts watch?v=, youtu.be/, /shorts/, /embed/ and bare 11-char ids in
// those positions. Returns the 11-char video id or null.
function parseVideoId(url) {
  const raw = String(url || "").trim();
  if (!raw) return null;
  let u;
  try {
    u = new URL(raw.includes("://") ? raw : "https://" + raw);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  const isId = (s) => /^[A-Za-z0-9_-]{11}$/.test(s || "");
  if (host === "youtu.be") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    return isId(id) ? id : null;
  }
  if (host === "youtube.com" || host === "music.youtube.com") {
    const v = u.searchParams.get("v");
    if (isId(v)) return v;
    const parts = u.pathname.split("/").filter(Boolean);
    if ((parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") && isId(parts[1])) return parts[1];
  }
  return null;
}

function codedError(message, code) {
  const err = new Error(message);
  err.code = code;
  return err;
}

const STUB_FIXTURE_TRANSCRIPT = [
  "Selamat datang di video pembelajaran ini. Hari ini kita membahas dasar-dasar topik ini secara menyeluruh.",
  "Konsep pertama adalah memahami definisi dan tujuan utamanya. Banyak pemula salah paham di bagian ini.",
  "Kesalahan umum yang sering terjadi adalah melompat ke praktik tanpa memahami prinsip dasarnya terlebih dahulu.",
  "Praktik terbaiknya: mulai dari kasus kecil, verifikasi hasil di setiap langkah, dan dokumentasikan prosesnya.",
  "Sebagai contoh skenario: bayangkan kamu menghadapi data yang tidak konsisten - langkah pertama selalu memeriksa sumbernya.",
].join(" ");
const STUB_VIDEO_META = { title: "Video Belajar (Stub)", channel: "Kanal Edukasi", durationSec: 754 };

// ---- pure helpers (exported for unit tests) ----

// Track priority: manual id -> manual en -> auto id -> auto en -> first.
function selectCaptionTrack(tracks) {
  const list = Array.isArray(tracks) ? tracks : [];
  if (!list.length) return null;
  const isAsr = (t) => t.kind === "asr";
  const lang = (t) => String(t.languageCode || "").toLowerCase();
  return (
    list.find((t) => lang(t).startsWith("id") && !isAsr(t)) ||
    list.find((t) => lang(t).startsWith("en") && !isAsr(t)) ||
    list.find((t) => lang(t).startsWith("id")) ||
    list.find((t) => lang(t).startsWith("en")) ||
    list[0]
  );
}

function decodeXmlEntities(s) {
  return String(s || "")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// Fallback parser for the bare timedtext XML (used when fmt=json3 comes
// back empty): join every <text ...>body</text>, strip inner tags, decode
// entities. Returns "" when nothing matched.
function parseTimedTextXml(xml) {
  const bodies = [];
  const re = /<text[^>]*>([\s\S]*?)<\/text>/g;
  let m;
  while ((m = re.exec(String(xml || ""))) !== null) {
    const clean = decodeXmlEntities(m[1].replace(/<[^>]+>/g, " "));
    if (clean.trim()) bodies.push(clean.trim());
  }
  return bodies.join(" ").replace(/\s+/g, " ").trim();
}

// User-pasted transcript from YouTube's own transcript panel: strip the
// standalone timestamp tokens ("0:00", "12:34", "1:02:34") the panel
// copies along, collapse whitespace, enforce min length + cap.
// Returns the cleaned string, or null when too short to be usable.
function sanitizeManualTranscript(raw) {
  const cleaned = String(raw || "")
    .replace(/(^|\s)\d{1,2}:\d{2}(?::\d{2})?(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TRANSCRIPT_CHAR_CAP);
  return cleaned.length >= MANUAL_TRANSCRIPT_MIN ? cleaned : null;
}

// ---- fetch strategies ----

// Normalized per-strategy result shape:
// { playability, reason, tracks, durationSec, title, author }
function normalizePlayerResponse(player) {
  return {
    playability: player?.playabilityStatus?.status || "UNKNOWN",
    reason: player?.playabilityStatus?.reason || "",
    tracks: player?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [],
    durationSec: Number(player?.videoDetails?.lengthSeconds) || null,
    title: player?.videoDetails?.title || "",
    author: player?.videoDetails?.author || "",
  };
}

async function fetchPlayerViaInnertube(videoId, variant) {
  const isAndroid = variant === "android";
  const context = isAndroid
    ? { client: { clientName: "ANDROID", clientVersion: "19.09.37", androidSdkVersion: 34, hl: "id" } }
    : { client: { clientName: "WEB", clientVersion: "2.20240101.00.00", hl: "id" } };
  const headers = isAndroid
    ? { "Content-Type": "application/json", "User-Agent": ANDROID_UA, "X-YouTube-Client-Name": "3", "X-YouTube-Client-Version": "19.09.37" }
    : { "Content-Type": "application/json", "User-Agent": BROWSER_UA, "Accept-Language": "id,en;q=0.8" };
  const res = await fetch("https://www.youtube.com/youtubei/v1/player", {
    method: "POST", headers,
    body: JSON.stringify({ videoId, context }),
  });
  if (!res.ok) throw new Error(`player ${variant} HTTP ${res.status}`);
  return normalizePlayerResponse(await res.json());
}

async function fetchPlayerViaWatchPage(videoId) {
  const res = await fetch(
    `https://www.youtube.com/watch?v=${videoId}&bpctr=9999999999&has_verified=1`,
    { headers: { "User-Agent": BROWSER_UA, "Accept-Language": "id,en;q=0.8" } }
  );
  if (!res.ok) throw new Error(`watch page HTTP ${res.status}`);
  const html = await res.text();
  const big = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;\s*(?:var\s|const\s|let\s|<\/script)/s);
  if (big) {
    try {
      return normalizePlayerResponse(JSON.parse(big[1]));
    } catch { /* fall through to the narrow extraction */ }
  }
  const tracksMatch = html.match(/"captionTracks":(\[.*?\])(?=,")/);
  const statusMatch = html.match(/"playabilityStatus":\{"status":"(\w+)"/);
  let tracks = [];
  if (tracksMatch) {
    try { tracks = JSON.parse(tracksMatch[1]); } catch { tracks = []; }
  }
  return {
    playability: statusMatch ? statusMatch[1] : "UNKNOWN", reason: "",
    tracks, durationSec: null, title: "", author: "",
  };
}

// json3 first; empty/unparseable body -> bare XML fallback. Returns the
// raw joined transcript string ("" if both come back empty).
async function fetchCaptionBody(baseUrl) {
  try {
    const res = await fetch(baseUrl + "&fmt=json3", { headers: { "User-Agent": BROWSER_UA } });
    if (res.ok) {
      const cap = await res.json().catch(() => null);
      const text = (cap?.events || [])
        .flatMap((ev) => (ev.segs || []).map((s) => s.utf8 || ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (text) return text;
    }
  } catch { /* fall through to XML */ }
  try {
    const res = await fetch(baseUrl, { headers: { "User-Agent": BROWSER_UA } });
    if (!res.ok) return "";
    return parseTimedTextXml(await res.text());
  } catch {
    return "";
  }
}

// Best-effort metadata only - used by the manual-transcript path, where
// caption fetching is skipped entirely. Never throws.
async function fetchVideoMetaOnly(videoId) {
  if (process.env.ELEVA_YOUTUBE_STUB === "1") return { ...STUB_VIDEO_META };
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent("https://www.youtube.com/watch?v=" + videoId)}&format=json`,
      { headers: { "User-Agent": BROWSER_UA } }
    );
    if (res.ok) {
      const oembed = await res.json();
      return {
        title: String(oembed.title || "").slice(0, 200) || "Video YouTube",
        channel: String(oembed.author_name || "").slice(0, 120),
        durationSec: null,
      };
    }
  } catch { /* fall through */ }
  return { title: "Video YouTube", channel: "", durationSec: null };
}

// -> { videoId, videoMeta: { title, channel, durationSec }, transcript }
// Throws codedError NO_CAPTIONS / YT_BLOCKED per the taxonomy in the
// header comment.
async function fetchVideoData(url) {
  const videoId = parseVideoId(url);
  if (!videoId) throw codedError("Link YouTube tidak valid.", "BAD_URL");

  if (process.env.ELEVA_YOUTUBE_STUB === "1") {
    return { videoId, videoMeta: { ...STUB_VIDEO_META }, transcript: STUB_FIXTURE_TRANSCRIPT };
  }

  // oEmbed is best-effort metadata only - never fatal (the old code 502'd
  // the whole validate when oEmbed hiccuped).
  let oembed = null;
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent("https://www.youtube.com/watch?v=" + videoId)}&format=json`,
      { headers: { "User-Agent": BROWSER_UA } }
    );
    if (res.ok) oembed = await res.json();
  } catch { oembed = null; }

  const strategies = [
    ["android", () => fetchPlayerViaInnertube(videoId, "android")],
    ["web", () => fetchPlayerViaInnertube(videoId, "web")],
    ["watch-page", () => fetchPlayerViaWatchPage(videoId)],
  ];
  const diagnostics = [];
  let winner = null;
  let sawPlayableNoCaptions = false;
  for (const [name, run] of strategies) {
    try {
      const r = await run();
      diagnostics.push({ strategy: name, playability: r.playability, reason: r.reason.slice(0, 120), trackCount: r.tracks.length });
      if (r.tracks.length > 0) { winner = r; break; }
      if (r.playability === "OK") sawPlayableNoCaptions = true;
    } catch (e) {
      diagnostics.push({ strategy: name, error: e.message });
    }
  }

  if (!winner) {
    console.error("video-quiz fetch diagnostics:", JSON.stringify({ videoId, diagnostics }));
    if (sawPlayableNoCaptions) throw codedError("Video ini tidak punya subtitle/transkrip.", "NO_CAPTIONS");
    throw codedError("YouTube membatasi akses dari server ini.", "YT_BLOCKED");
  }

  const track = selectCaptionTrack(winner.tracks);
  const transcript = track?.baseUrl ? (await fetchCaptionBody(track.baseUrl)).slice(0, TRANSCRIPT_CHAR_CAP) : "";
  if (!transcript) {
    console.error("video-quiz fetch diagnostics:", JSON.stringify({ videoId, diagnostics, note: "track found but caption body empty" }));
    // A bot-checked track URL also returns empty bodies - only a playable
    // winner justifies blaming the video itself.
    if (winner.playability === "OK") throw codedError("Transkrip video kosong/tidak terbaca.", "NO_CAPTIONS");
    throw codedError("YouTube membatasi akses dari server ini.", "YT_BLOCKED");
  }

  return {
    videoId,
    videoMeta: {
      title: String(oembed?.title || winner.title || "").slice(0, 200) || "Video YouTube",
      channel: String(oembed?.author_name || winner.author || "").slice(0, 120),
      durationSec: winner.durationSec,
    },
    transcript,
  };
}

module.exports = {
  parseVideoId, fetchVideoData, fetchVideoMetaOnly,
  selectCaptionTrack, parseTimedTextXml, sanitizeManualTranscript,
  TRANSCRIPT_CHAR_CAP, MANUAL_TRANSCRIPT_MIN,
};
