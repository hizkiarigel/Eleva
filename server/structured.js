// Task 7b: deterministic validation for structured-physical quest completion.
// Numbers in separate fields are much harder to fake convincingly than a
// paragraph - but only if the numbers are actually checked. This module is
// the code-enforced layer (required fields + plausibility); the AI layer on
// top only ever sees data that already passed here, same defense-in-depth
// split as the crisis phrase list and the growth-gate. Kept as its own
// module so the rules are unit-testable without booting the HTTP server.

const CARDIO_ACTIVITIES = ["Lari", "Jalan cepat", "Sepeda", "Lompat tali", "Lainnya"];

// Per-activity plausible top speeds (km/h). The PRD's own example of an
// impossible combo - 15 km in 20 minutes "running" (45 km/h) - falls to the
// Lari cap. Generous on purpose: the goal is catching fabrication-grade
// impossibilities, not policing athletic outliers.
const SPEED_CAP_KMH = {
  "Lari": 25,
  "Jalan cepat": 12,
  "Sepeda": 60,
  "Lompat tali": 5, // distance barely applies; anything beyond a warmup-jog drift is implausible
  "Lainnya": 60,
};

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Returns { ok: true, clean } or { ok: false, error } - error messages are
// user-facing (Indonesian, concrete about WHICH combination is implausible).
function validateStructuredData(kind, data) {
  if (!data || typeof data !== "object") return { ok: false, error: "Data terstruktur kosong — isi field-nya dulu." };

  if (kind === "cardio") {
    const jenis = String(data.jenisAktivitas || "").trim();
    const jenisLain = String(data.jenisLainnya || "").trim();
    const durasi = num(data.durasiMenit);
    const jarak = data.jarakKm === "" || data.jarakKm == null ? null : num(data.jarakKm);
    const titikBerat = String(data.titikBerat || "").trim();
    const titikBeratDetail = String(data.titikBeratDetail || "").trim();

    if (!CARDIO_ACTIVITIES.includes(jenis)) return { ok: false, error: "Pilih jenis aktivitasnya dulu." };
    if (jenis === "Lainnya" && !jenisLain) return { ok: false, error: "Tulis jenis aktivitasnya di kolom 'Lainnya'." };
    if (durasi == null || durasi <= 0) return { ok: false, error: "Durasi wajib diisi, format MM:SS (mis. 20:01)." };
    if (durasi > 600) return { ok: false, error: "Durasi lebih dari 10 jam dalam sehari tidak wajar — cek lagi angkanya." };
    if (jarak != null && (jarak < 0 || jarak > 200)) return { ok: false, error: "Jarak di luar rentang wajar (0-200 km) — cek lagi angkanya." };
    if (!["Ringan", "Cukup", "Berat", "Terlalu berat"].includes(titikBerat)) return { ok: false, error: "Pilih salah satu: Ringan, Cukup, Berat, atau Terlalu berat." };
    if (["Berat", "Terlalu berat"].includes(titikBerat) && !titikBeratDetail) return { ok: false, error: "Ceritakan singkat apa yang bikin berat." };

    if (jarak != null && jarak > 0) {
      const speed = jarak / (durasi / 60);
      const cap = SPEED_CAP_KMH[jenis] ?? 60;
      if (speed > cap) {
        return {
          ok: false,
          error: `Durasi ${durasi.toFixed(2)} menit dengan jarak ${jarak} km berarti ${speed.toFixed(1)} km/jam — tidak wajar untuk ${jenis === "Lainnya" ? jenisLain || "aktivitas ini" : jenis}. Cek lagi salah satu angkanya.`,
        };
      }
    }

    return {
      ok: true,
      clean: {
        kind: "cardio",
        jenisAktivitas: jenis,
        ...(jenis === "Lainnya" ? { jenisLainnya: jenisLain } : {}),
        durasiMenit: durasi,
        ...(jarak != null ? { jarakKm: jarak } : {}),
        titikBerat,
        ...(["Berat", "Terlalu berat"].includes(titikBerat) ? { titikBeratDetail: titikBeratDetail.slice(0, 300) } : {}),
      },
    };
  }

  if (kind === "gym") {
    const gerakan = String(data.gerakan || "").trim();
    const set = num(data.set);
    const repetisi = num(data.repetisi);
    const beban = data.bebanKg === "" || data.bebanKg == null ? null : num(data.bebanKg);
    const titik = String(data.titikGagal || "").trim();

    if (!gerakan) return { ok: false, error: "Tulis gerakannya dulu (mis. push-up, squat, bench press)." };
    if (set == null || !Number.isInteger(set) || set <= 0) return { ok: false, error: "Set wajib angka bulat lebih dari 0." };
    if (set > 50) return { ok: false, error: "Lebih dari 50 set dalam sehari tidak wajar — cek lagi angkanya." };
    if (repetisi == null || !Number.isInteger(repetisi) || repetisi <= 0) return { ok: false, error: "Repetisi wajib angka bulat lebih dari 0." };
    if (repetisi > 500) return { ok: false, error: "Lebih dari 500 repetisi per set tidak wajar — cek lagi angkanya." };
    if (beban != null && (beban < 0 || beban > 500)) return { ok: false, error: "Beban di luar rentang wajar (0-500 kg) — cek lagi angkanya." };
    if (!titik) return { ok: false, error: "Titik gagal/berat wajib diisi (mis. 'set 3 rep 8' atau 'set terakhir')." };

    return {
      ok: true,
      clean: {
        kind: "gym",
        gerakan: gerakan.slice(0, 200),
        set,
        repetisi,
        ...(beban != null ? { bebanKg: beban } : {}),
        titikGagal: titik.slice(0, 200),
      },
    };
  }

  return { ok: false, error: "Jenis quest terstruktur tidak dikenal." };
}

module.exports = { validateStructuredData, CARDIO_ACTIVITIES };
