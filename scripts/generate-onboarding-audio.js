// Onboarding bridge voice narration - Phase 3 (round 25): one-off DEV-ONLY
// script to generate the 7 static mp3 files that public/app.js's
// ONBOARDING_BRIDGES config points at (see the `audio` field on each stage
// there). This script is NEVER called by the app at runtime - production
// only ever plays pre-generated static files, never a live TTS API call for
// a real user. See public/app.js's startBridgeAudio()/ONBOARDING_BRIDGES
// for the playback side.
//
// NO TTS PROVIDER IS WIRED UP YET. This is a template: synthesize() below
// is a deliberate throwing stub. A human must choose a provider, install
// its SDK, and fill synthesize() in before --apply can do anything.
//
// Why the 7 {stageKey, file, voiceText} tuples below are a LOCAL COPY of
// ONBOARDING_BRIDGES instead of importing it: public/app.js is a browser-
// only script (top-level `document.getElementById(...)`, a self-invoking
// boot() at the bottom, no module.exports) - requiring it under plain Node
// throws immediately. Keep these 7 lines byte-identical to
// ONBOARDING_BRIDGES[stage].voiceText/.audio in public/app.js if either
// ever changes - this is a one-off script run a handful of times and
// reviewed by a human each time, not a second runtime source of truth.
//
// Usage:
//   node scripts/generate-onboarding-audio.js              # dry run - prints the 7 mappings + voice text, calls nothing
//   node scripts/generate-onboarding-audio.js --apply       # actually synthesizes + writes the mp3 files
//   node scripts/generate-onboarding-audio.js --apply --only=intro,quest   # regenerate a subset only
//
// ONBOARDING_TTS_API_KEY must be set in the environment for --apply once a
// provider is wired into synthesize() (see .env.example). Not read at all
// in dry-run mode.
//
// Output: public/audio/onboarding/<file> for each stage (directory created
// if missing). These become normal static assets served by the existing
// express.static(public/) mount - server/index.js needs no changes.
//
// IMPORTANT: always listen to every generated file before committing - TTS
// output needs a human QA pass, especially for Indonesian pronunciation,
// pacing, and tone (warm/calm/conversational per the founder's spec, not a
// robotic or overly dramatic read).

const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(__dirname, "..", "public", "audio", "onboarding");

const BRIDGE_VOICE_LINES = [
  { stageKey: "intro", file: "01-journey.mp3", voiceText: "Selamat datang di Eleva. Di sini, kamu tumbuh sambil jalan." },
  { stageKey: "quest", file: "02-quest.mp3", voiceText: "Targetmu kita ubah jadi quest, biar lebih enak dijalani." },
  { stageKey: "evidence", file: "03-evidence.mp3", voiceText: "Bukan cuma checklist. Yang dihitung itu bukti nyata dari langkahmu." },
  { stageKey: "character", file: "04-character.mp3", voiceText: "Kamu jadi versi baru bukan karena niat, tapi karena apa yang kamu lakukan." },
  { stageKey: "adaptive", file: "05-adaptive.mp3", voiceText: "Kalau kondisi kamu berubah, langkah berikutnya ikut menyesuaikan." },
  { stageKey: "meta", file: "06-meta.mp3", voiceText: "Makin kamu jalan, makin banyak bagian Eleva yang kebuka." },
  { stageKey: "pathway", file: "07-pathway.mp3", voiceText: "Setiap orang punya cara tumbuh yang beda. Itu yang jadi pathway-mu." },
];

const APPLY = process.argv.includes("--apply");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const ONLY = onlyArg ? new Set(onlyArg.slice("--only=".length).split(",")) : null;

// Voice character (per the founder's spec): Indonesian native, warm, calm,
// intimate, conversational, slightly mysterious, confident but gentle,
// relatively young adult, premium, natural pacing - like Eleva speaking
// directly to the user. Avoid: epic game narrator, movie trailer voice,
// robotic TTS cadence, corporate/instructional tone, overly cheerful ad
// voice, slang-heavy delivery. Target ~3-5s per clip where natural - do not
// artificially speed speech just to hit a duration.
//
// Fill this in once a provider is chosen: call that provider's SDK here,
// passing voiceText and whatever voice/style parameters match the
// character above, and return the resulting audio as a Buffer (mp3 bytes).
async function synthesize(voiceText) {
  throw new Error(
    "No TTS provider wired up yet. To use --apply:\n" +
    "  1. npm install <the chosen provider's SDK>\n" +
    "  2. Replace this function's body with the real API call, returning an mp3 Buffer\n" +
    "  3. Read the credential from process.env.ONBOARDING_TTS_API_KEY (see .env.example)\n" +
    `(voiceText was: "${voiceText}")`
  );
}

async function main() {
  const targets = ONLY ? BRIDGE_VOICE_LINES.filter((l) => ONLY.has(l.stageKey)) : BRIDGE_VOICE_LINES;
  if (!targets.length) {
    console.error(`--only matched no known stage keys. Known: ${BRIDGE_VOICE_LINES.map((l) => l.stageKey).join(", ")}`);
    process.exit(1);
  }

  console.log(`${APPLY ? "Generating" : "Dry run -"} ${targets.length} onboarding bridge voice clip(s):\n`);
  for (const t of targets) {
    console.log(`  ${t.stageKey.padEnd(10)} -> public/audio/onboarding/${t.file}`);
    console.log(`  ${" ".repeat(10)}    "${t.voiceText}"\n`);
  }

  if (!APPLY) {
    console.log("Dry run only - rerun with --apply to actually synthesize and write these files.");
    return;
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const t of targets) {
    console.log(`Synthesizing ${t.stageKey}...`);
    const audioBuffer = await synthesize(t.voiceText);
    fs.writeFileSync(path.join(OUTPUT_DIR, t.file), audioBuffer);
    console.log(`  wrote public/audio/onboarding/${t.file}`);
  }
  console.log(`\nDone - ${targets.length} file(s) written to public/audio/onboarding/.`);
  console.log("Listen to every file before committing - TTS output always needs a human QA pass.");
}

main().catch((e) => {
  console.error("Script failed:", e.message);
  process.exit(1);
});
