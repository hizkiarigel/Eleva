// Task 14 (Livelihood Milestone, PRD.md section 26 point 5): deterministic
// validation for the "Submit Application" Trial - same split as
// structured.js/targets.js/jobMatch.js, code enforces the shape, AI never
// touches this step at all (there's nothing to judge, just evidence to
// record). A structured FORM, not free text, because a free-text "I applied"
// box is exactly the kind of unverifiable claim the Milestone counter is
// meant to close off (Job Match's badge removal, point 6, is the other half
// of that same principle).

function str(v) {
  return typeof v === "string" ? v.trim() : "";
}

// Returns { ok: true, clean } or { ok: false, error } - cvArtifactId is
// validated separately by the route (needs a DB lookup to confirm the
// artifact actually exists and belongs to this user), everything else here
// is pure shape/plausibility checking, no I/O.
function validateJobApplication(data) {
  if (!data || typeof data !== "object") return { ok: false, error: "Data lamaran kosong — isi field-nya dulu." };

  const companyName = str(data.companyName);
  const roleTitle = str(data.roleTitle);
  const dateApplied = str(data.dateApplied);
  const submissionProof = str(data.submissionProof);

  if (!companyName) return { ok: false, error: "Nama perusahaan wajib diisi." };
  if (companyName.length > 200) return { ok: false, error: "Nama perusahaan terlalu panjang." };
  if (!roleTitle) return { ok: false, error: "Judul role wajib diisi." };
  if (roleTitle.length > 200) return { ok: false, error: "Judul role terlalu panjang." };

  if (!dateApplied) return { ok: false, error: "Tanggal apply wajib diisi." };
  const parsed = new Date(dateApplied);
  if (Number.isNaN(parsed.getTime())) return { ok: false, error: "Format tanggal apply tidak valid." };
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (parsed.getTime() > today.getTime()) return { ok: false, error: "Tanggal apply tidak boleh di masa depan." };

  if (!submissionProof) return { ok: false, error: "Bukti submit wajib diisi (mis. link konfirmasi, isi email dari HR/portal, atau nomor referensi aplikasi)." };
  if (submissionProof.length < 8) return { ok: false, error: "Bukti submit terlalu pendek — tulis referensi yang jelas (link, isi email, atau nomor referensi)." };
  if (submissionProof.length > 500) return { ok: false, error: "Bukti submit terlalu panjang — ringkas jadi maksimal 500 karakter." };

  return {
    ok: true,
    clean: {
      companyName: companyName.slice(0, 200),
      roleTitle: roleTitle.slice(0, 200),
      dateApplied: parsed.toISOString().slice(0, 10),
      submissionProof: submissionProof.slice(0, 500),
    },
  };
}

module.exports = { validateJobApplication };
