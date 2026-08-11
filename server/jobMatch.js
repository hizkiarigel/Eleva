// Task 10 (Artifacts library + Job Match Analysis, PRD.md bagian 14): the
// deterministic half of this feature - anything that can be checked/built in
// code instead of asked of the model. Same split as structured.js/targets.js/
// practiceTest.js: the AI reads documents and judges fit, code validates
// shapes, builds the exact bytes sent to Claude, and never trusts AI output
// blindly.

const mammoth = require("mammoth");

const MAX_FILE_BASE64_CHARS = 12 * 1024 * 1024; // ~9MB decoded, generous for a CV/screenshot
const MAX_IMAGES = 6; // a real job posting can span several screenshots (founder's Upwork example: 4)
const MATCH_STATUSES = ["ada bukti", "disebut tapi lemah", "tidak ada"];

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const ACCEPTED_CV_MIMES = ["application/pdf", DOCX_MIME, "image/png", "image/jpeg", "image/webp"];
const ACCEPTED_IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp"];

// Claude's API accepts PDF and image bytes directly (as document/image
// content blocks) but NOT .docx - that needs text extracted server-side
// first. Doing this once at UPLOAD time (not on every job-match analysis)
// means a CV only ever gets parsed once, not re-parsed per quest.
async function prepareArtifactContent({ mimeType, dataBase64, filename }) {
  if (!ACCEPTED_CV_MIMES.includes(mimeType)) return { error: "Format file tidak didukung — pakai PDF, DOCX, atau foto/gambar." };
  if (!dataBase64 || dataBase64.length > MAX_FILE_BASE64_CHARS) return { error: "File terlalu besar atau kosong." };

  if (mimeType === DOCX_MIME) {
    try {
      const buffer = Buffer.from(dataBase64, "base64");
      const { value: text } = await mammoth.extractRawText({ buffer });
      const trimmed = text.trim();
      if (!trimmed) return { error: "Tidak ada teks yang bisa diekstrak dari DOCX ini." };
      return { content: { kind: "text", text: trimmed, filename: filename || "CV.docx" } };
    } catch (e) {
      return { error: "Gagal membaca file DOCX — coba upload ulang atau pakai format PDF." };
    }
  }
  return { content: { kind: "file", mimeType, dataBase64, filename: filename || "file" } };
}

// Turns a stored CV artifact into the Claude content block(s) that carry it
// in the multimodal message - one block whichever shape it's in (extracted
// text, PDF document, or an image fallback).
function buildCvContentBlocks(artifact) {
  const c = artifact.content;
  if (c.kind === "text") {
    return [{ type: "text", text: `Isi CV pengguna (diekstrak dari ${c.filename || "dokumen"}):\n${c.text}` }];
  }
  if (c.mimeType === "application/pdf") {
    return [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: c.dataBase64 } }];
  }
  return [{ type: "image", source: { type: "base64", media_type: c.mimeType, data: c.dataBase64 } }];
}

// Job posting screenshots - one or several, all sent in the SAME call (per
// founder spec: a real posting is often too long for one screen).
function buildImageBlocks(images) {
  const list = Array.isArray(images) ? images : [];
  if (!list.length || list.length > MAX_IMAGES) return null;
  const blocks = [];
  for (const img of list) {
    if (!img || !ACCEPTED_IMAGE_MIMES.includes(img.mimeType)) return null;
    if (!img.dataBase64 || img.dataBase64.length > MAX_FILE_BASE64_CHARS) return null;
    blocks.push({ type: "image", source: { type: "base64", media_type: img.mimeType, data: img.dataBase64 } });
  }
  return blocks;
}

// Defends against malformed AI output the same way practiceTest.cleanPayload
// does: drop individual bad matchTable rows rather than discarding an
// otherwise-good analysis, fail to null only if too little survives to be
// useful (forces the caller's fallback).
function cleanJobMatchResult(raw) {
  if (!raw || typeof raw !== "object") return null;
  const verdict = String(raw.verdict || "").trim();
  const relevanceNote = String(raw.relevanceNote || "").trim();
  const nextStep = String(raw.nextStep || "").trim();
  if (!verdict || !nextStep) return null;
  const matchTable = (Array.isArray(raw.matchTable) ? raw.matchTable : [])
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const skill = String(row.skill || "").trim();
      const status = MATCH_STATUSES.includes(row.status) ? row.status : null;
      if (!skill || !status) return null;
      return { skill: skill.slice(0, 80), status, note: String(row.note || "").trim().slice(0, 200) };
    })
    .filter(Boolean)
    .slice(0, 20);
  if (matchTable.length < 1) return null;
  return { matchTable, verdict: verdict.slice(0, 500), relevanceNote: relevanceNote.slice(0, 500), nextStep: nextStep.slice(0, 300) };
}

module.exports = {
  MATCH_STATUSES, ACCEPTED_CV_MIMES, ACCEPTED_IMAGE_MIMES, DOCX_MIME,
  prepareArtifactContent, buildCvContentBlocks, buildImageBlocks, cleanJobMatchResult,
};
