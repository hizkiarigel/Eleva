// Task 7b: deterministic validation for structured-physical quest completion.
// Numbers in separate fields are much harder to fake convincingly than a
// paragraph - but only if the numbers are actually checked. This module is
// the code-enforced layer (required fields + plausibility); the AI layer on
// top only ever sees data that already passed here, same defense-in-depth
// split as the crisis phrase list and the growth-gate. Kept as its own
// module so the rules are unit-testable without booting the HTTP server.

const CARDIO_ACTIVITIES = ["Lari", "Jalan cepat", "Sepeda", "Lompat tali", "Lainnya"];

const exerciseCatalog = require("./exerciseCatalog");

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

  // Task 7d: recovery/rest/nutrition Trials get their own structured
  // evidence too - "TIDAK ADA tipe Trial yang default ke textarea bebas"
  // applies to pemulihan quests exactly as much as active cardio/gym ones
  // (this closes the regression the founder found: a post-injury "Audit
  // Fondasi Pemulihan" quest falling back to a free-text journal prompt).
  // No single target/pace to compare against here (canTarget in targets.js
  // already returns false for unknown kinds, so this never triggers the
  // Target Berikutnya A/B/C flow) - completion is just "did you record it".
  if (kind === "recovery") {
    const durasiTidurJam = num(data.durasiTidurJam);
    const asupanAirGelas = num(data.asupanAirGelas);
    const makanProtein = num(data.makanProtein);
    const levelNyeri = String(data.levelNyeri || "").trim();

    if (durasiTidurJam == null || durasiTidurJam < 0 || durasiTidurJam > 24) return { ok: false, error: "Durasi tidur wajib diisi, 0-24 jam." };
    if (asupanAirGelas == null || asupanAirGelas < 0 || asupanAirGelas > 30) return { ok: false, error: "Asupan air di luar rentang wajar (0-30 gelas) — cek lagi angkanya." };
    if (makanProtein == null || !Number.isInteger(makanProtein) || makanProtein < 0 || makanProtein > 10) return { ok: false, error: "Jumlah makan berprotein wajib angka bulat 0-10." };
    if (!["Tidak ada", "Ringan", "Sedang", "Berat"].includes(levelNyeri)) return { ok: false, error: "Pilih level nyeri: Tidak ada, Ringan, Sedang, atau Berat." };

    return {
      ok: true,
      clean: { kind: "recovery", durasiTidurJam, asupanAirGelas, makanProtein, levelNyeri },
    };
  }

  // SOMA Training multi-exercise session (Movement→Training spec): a full
  // workout log - multiple exercises from the FIXED catalog, each with its
  // own sets grid. Same defense-in-depth split as the single-exercise gym
  // kind above: everything is code-validated here (ids resolved against the
  // server catalog, per-set plausibility caps identical to gym's), and the
  // end-of-session evaluation (volume/calories/dominant muscle group) is
  // computed server-side from catalog numbers - a client can never inflate
  // a calorie estimate by sending its own. Legacy "gym" entries above are
  // untouched: in-flight single-exercise quests keep validating exactly as
  // before, this is a NEW kind, not a migration.
  if (kind === "gym-session") {
    const rawExercises = Array.isArray(data.exercises) ? data.exercises : [];
    if (rawExercises.length === 0) return { ok: false, error: "Tambah minimal satu gerakan dulu." };
    if (rawExercises.length > 20) return { ok: false, error: "Lebih dari 20 gerakan dalam satu sesi tidak wajar — cek lagi daftarnya." };

    const cleanExercises = [];
    for (const ex of rawExercises) {
      const entry = exerciseCatalog.EXERCISES_BY_ID.get(String(ex?.exerciseId || ""));
      if (!entry) return { ok: false, error: "Ada gerakan yang tidak dikenal di katalog — pilih dari daftar gerakan." };
      const rawSets = Array.isArray(ex.sets) ? ex.sets : [];
      if (rawSets.length === 0) return { ok: false, error: `${entry.name}: tambah minimal satu set.` };
      if (rawSets.length > 50) return { ok: false, error: `${entry.name}: lebih dari 50 set tidak wajar — cek lagi angkanya.` };
      const cleanSets = [];
      for (const s of rawSets) {
        const reps = num(s?.reps);
        const weight = s?.weightKg === "" || s?.weightKg == null ? null : num(s.weightKg);
        const done = Boolean(s?.done);
        // An unchecked (not-done) set may be left blank - it's a plan row,
        // not evidence. A DONE set must carry plausible numbers.
        if (done) {
          if (reps == null || !Number.isInteger(reps) || reps <= 0) return { ok: false, error: `${entry.name}: repetisi wajib angka bulat lebih dari 0 untuk set yang selesai.` };
          if (reps > 500) return { ok: false, error: `${entry.name}: lebih dari 500 repetisi per set tidak wajar — cek lagi angkanya.` };
          if (weight != null && (weight < 0 || weight > 500)) return { ok: false, error: `${entry.name}: beban di luar rentang wajar (0-500 kg) — cek lagi angkanya.` };
        }
        cleanSets.push({
          ...(reps != null && Number.isInteger(reps) && reps > 0 ? { reps } : {}),
          ...(weight != null && weight >= 0 ? { weightKg: weight } : {}),
          done,
        });
      }
      cleanExercises.push({
        exerciseId: entry.id,
        // Name/muscle group come from the server catalog, never trusted
        // from the client payload.
        name: entry.name,
        muscleGroup: entry.primaryMuscleGroup,
        sets: cleanSets,
      });
    }

    if (!cleanExercises.some((ex) => ex.sets.some((s) => s.done))) {
      return { ok: false, error: "Tandai minimal satu set sebagai selesai — belum ada yang bisa dicatat sebagai bukti." };
    }

    return { ok: true, clean: { kind: "gym-session", exercises: cleanExercises, evaluation: evaluateGymSession(cleanExercises) } };
  }

  // BODY · MOVEMENT execution flow (design handoff): Strength's Active
  // Session submission - deliberately a DIFFERENT kind from "gym-session"
  // above even though the shapes rhyme, because the source of truth
  // differs: this is matched against the QUEST'S OWN plannedExercises by
  // index (server/index.js's computeEvidenceStatus, not a client-echoed
  // target - same "trust the quest, not the submission" posture cardio/gym
  // already use), never a catalog lookup. No name/target fields are
  // validated here for that reason - the client sends what it logged, the
  // quest itself is what's compared against, in the caller. Same
  // plausibility caps as gym's single-exercise kind (reps ≤500, kg 0-500).
  if (kind === "strength-session") {
    const rawExercises = Array.isArray(data.exercises) ? data.exercises : [];
    if (rawExercises.length === 0) return { ok: false, error: "Data latihan kosong — nggak ada gerakan yang tercatat." };
    if (rawExercises.length > 20) return { ok: false, error: "Lebih dari 20 gerakan dalam satu sesi tidak wajar." };

    const cleanExercises = [];
    for (const ex of rawExercises) {
      const name = String(ex?.name || "").trim().slice(0, 100);
      if (!name) return { ok: false, error: "Ada gerakan tanpa nama tercatat." };
      const rawSets = Array.isArray(ex.sets) ? ex.sets : [];
      if (rawSets.length === 0) return { ok: false, error: `${name}: tidak ada set yang tercatat.` };
      if (rawSets.length > 50) return { ok: false, error: `${name}: lebih dari 50 set tidak wajar — cek lagi angkanya.` };
      const cleanSets = [];
      for (const s of rawSets) {
        const reps = num(s?.reps);
        const weight = s?.weightKg === "" || s?.weightKg == null ? null : num(s.weightKg);
        const done = Boolean(s?.done);
        if (done) {
          if (reps == null || !Number.isInteger(reps) || reps <= 0) return { ok: false, error: `${name}: repetisi wajib angka bulat lebih dari 0 untuk set yang selesai.` };
          if (reps > 500) return { ok: false, error: `${name}: lebih dari 500 repetisi per set tidak wajar — cek lagi angkanya.` };
          if (weight != null && (weight < 0 || weight > 500)) return { ok: false, error: `${name}: beban di luar rentang wajar (0-500 kg) — cek lagi angkanya.` };
        }
        cleanSets.push({
          ...(reps != null && Number.isInteger(reps) && reps > 0 ? { reps } : {}),
          ...(weight != null && weight >= 0 ? { weightKg: weight } : {}),
          done,
        });
      }
      const rpe = Number.isInteger(ex?.rpe) && ex.rpe >= 5 && ex.rpe <= 10 ? ex.rpe : null;
      cleanExercises.push({ name, sets: cleanSets, rpe });
    }

    if (!cleanExercises.some((ex) => ex.sets.some((s) => s.done))) {
      return { ok: false, error: "Tandai minimal satu set sebagai selesai — belum ada yang bisa dicatat sebagai bukti." };
    }

    return { ok: true, clean: { kind: "strength-session", exercises: cleanExercises } };
  }

  return { ok: false, error: "Jenis quest terstruktur tidak dikenal." };
}

// End-of-session evaluation per the Training spec - only COMPLETED (done)
// sets count toward all three numbers. Dominant muscle group = the group
// with the most completed sets; ties list every winner rather than forcing
// a single one (spec's own rule). Calories are Σ(catalog caloriesPerSet ×
// completed sets) - rough and static by design, directional feedback only.
function evaluateGymSession(cleanExercises) {
  let totalVolumeKg = 0;
  let estimatedCalories = 0;
  const setsPerGroup = {};
  for (const ex of cleanExercises) {
    const entry = exerciseCatalog.EXERCISES_BY_ID.get(ex.exerciseId);
    for (const s of ex.sets) {
      if (!s.done) continue;
      totalVolumeKg += (s.weightKg || 0) * (s.reps || 0);
      estimatedCalories += entry ? entry.caloriesPerSet : 0;
      setsPerGroup[ex.muscleGroup] = (setsPerGroup[ex.muscleGroup] || 0) + 1;
    }
  }
  const max = Math.max(0, ...Object.values(setsPerGroup));
  const dominantMuscleGroups = Object.keys(setsPerGroup).filter((g) => setsPerGroup[g] === max);
  return { totalVolumeKg: Math.round(totalVolumeKg), estimatedCalories, dominantMuscleGroups };
}

module.exports = { validateStructuredData, evaluateGymSession, CARDIO_ACTIVITIES };
