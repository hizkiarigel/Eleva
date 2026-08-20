// Video Quest (video-quiz): YouTube metadata + transcript fetching, no
// dependency - same hand-rolled global-fetch convention as callClaude in
// server/claude.js. Two public endpoints are used:
//
//   1. oEmbed (https://www.youtube.com/oembed) - stable, keyless, gives
//      title + channel name.
//   2. Innertube player API (POST /youtubei/v1/player with the public web
//      client context) - gives duration + the caption track list; each
//      track's baseUrl fetched with fmt=json3 returns timed text segments.
//
// The innertube surface is UNOFFICIAL and churns with YouTube changes -
// every YouTube library on npm wraps this same call and churns with it.
// Failures are mapped to coded errors so the route can show the right copy:
//   err.code === "NO_CAPTIONS"  -> video has no readable subtitle track
//   anything else               -> network/parse failure ("coba lagi")
//
// Test/keyless hook: ELEVA_YOUTUBE_STUB=1 makes fetchVideoData return a
// fixed fixture for any parseable URL (no network) - the e2e suite and
// keyless dev runs use this, same spirit as claude.js's hasKey() fallbacks.

const TRANSCRIPT_CHAR_CAP = 15000;

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

// -> { videoId, videoMeta: { title, channel, durationSec }, transcript }
// Throws codedError("...", "NO_CAPTIONS") when no readable track exists.
async function fetchVideoData(url) {
  const videoId = parseVideoId(url);
  if (!videoId) throw codedError("Link YouTube tidak valid.", "BAD_URL");

  if (process.env.ELEVA_YOUTUBE_STUB === "1") {
    return {
      videoId,
      videoMeta: { title: "Video Belajar (Stub)", channel: "Kanal Edukasi", durationSec: 754 },
      transcript: STUB_FIXTURE_TRANSCRIPT,
    };
  }

  // 1. oEmbed: title + channel (keyless, stable).
  const oembedRes = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent("https://www.youtube.com/watch?v=" + videoId)}&format=json`
  );
  if (!oembedRes.ok) throw codedError(`oEmbed gagal (${oembedRes.status})`, "FETCH_FAILED");
  const oembed = await oembedRes.json();

  // 2. Innertube player: duration + caption track list.
  const playerRes = await fetch("https://www.youtube.com/youtubei/v1/player", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      videoId,
      context: { client: { clientName: "WEB", clientVersion: "2.20240101.00.00" } },
    }),
  });
  if (!playerRes.ok) throw codedError(`Player API gagal (${playerRes.status})`, "FETCH_FAILED");
  const player = await playerRes.json();

  const durationSec = Number(player?.videoDetails?.lengthSeconds) || null;
  const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw codedError("Video ini tidak punya subtitle/transkrip.", "NO_CAPTIONS");
  }

  // Track priority: manual id -> manual en -> auto id/en -> first anything.
  const isAsr = (t) => t.kind === "asr";
  const lang = (t) => String(t.languageCode || "").toLowerCase();
  const track =
    tracks.find((t) => lang(t).startsWith("id") && !isAsr(t)) ||
    tracks.find((t) => lang(t).startsWith("en") && !isAsr(t)) ||
    tracks.find((t) => lang(t).startsWith("id")) ||
    tracks.find((t) => lang(t).startsWith("en")) ||
    tracks[0];
  if (!track?.baseUrl) throw codedError("Track subtitle tidak bisa diambil.", "NO_CAPTIONS");

  const capRes = await fetch(track.baseUrl + "&fmt=json3");
  if (!capRes.ok) throw codedError(`Subtitle gagal diambil (${capRes.status})`, "NO_CAPTIONS");
  const cap = await capRes.json().catch(() => null);
  const events = cap?.events || [];
  const transcript = events
    .flatMap((ev) => (ev.segs || []).map((s) => s.utf8 || ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TRANSCRIPT_CHAR_CAP);
  if (!transcript) throw codedError("Transkrip video kosong/tidak terbaca.", "NO_CAPTIONS");

  return {
    videoId,
    videoMeta: {
      title: String(oembed.title || player?.videoDetails?.title || "").slice(0, 200),
      channel: String(oembed.author_name || player?.videoDetails?.author || "").slice(0, 120),
      durationSec,
    },
    transcript,
  };
}

module.exports = { parseVideoId, fetchVideoData, TRANSCRIPT_CHAR_CAP };
