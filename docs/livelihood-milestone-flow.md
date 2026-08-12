# Livelihood Milestone flow — Task 14 (PRD.md section 26)

Diagram alur Milestone eksplisit untuk Primary Quest Livelihood dan Job Match
Analysis versi evidence-based, sesuai kode di `server/targets.js`,
`server/jobMatch.js`, `server/jobApplication.js`, `server/claude.js`,
`server/index.js`, dan `public/app.js`. Dokumen ini WAJIB tetap akurat
terhadap kode — kalau alur berubah, update diagram ini juga.

```mermaid
flowchart TD
    GQ["generateQuest (server/claude.js)\nAI menulis quest harian untuk goal Livelihood"] --> HINT{"ctx.jobMatchHint\n(dihitung server, bukan AI)"}
    HINT -- "qualified true, belum di-submit" --> CTJAS["completionType WAJIB\njob-application-submit"]
    HINT -- "qualified false, belum di-submit" --> CTOTHER["skill-building (reflective)\natau job-match-analysis lowongan lain"]
    HINT -- "tidak ada hint" --> CTJMA["completionType job-match-analysis\n(default, quest job-search baru)"]

    CTJMA --> TAP1["Tap 'Mulai' → cek Artifacts library\nCV ada? skip upload, langsung upload lowongan"]
    TAP1 --> ANALYZE["POST /api/job-match/analyze"]
    ANALYZE --> GENJM["generateJobMatchAnalysis (server/claude.js)\nAI: matchTable + matchScore(0-100) + verdict + relevanceNote + nextStep"]
    GENJM --> CLEANJM["cleanJobMatchResult (server/jobMatch.js)\nqualified = matchScore >= 70 — DIHITUNG KODE,\nbukan diklaim AI. matchScore wajib ada, else fallback."]
    CLEANJM --> ENSUREM["ensureQualifiedApplicationsMilestone\n(server/index.js) — auto-create goalTargets[goalIndex]\n= {kind:qualified-applications, targetCount:10, currentCount:0}\nkalau goal ini belum punya Milestone Livelihood"]
    ENSUREM --> NOBADGE["TIDAK ADA delta/badge lagi\n(Task 7d item 2 gap yang ditutup task ini) —\nreflection.deltas selalu {}"]
    NOBADGE --> CARDJM["Result card (jobMatchResultHTML)\nMATCH SCORE X/100 + LOLOS/BELUM LOLOS;\nmatchTable + verdict + relevanceNote + nextStep (TIDAK berubah);\nMilestone progress line (targetPickerHTML mode progress)\ngantikan badge 'Livelihood +3'"]

    CARDJM -.-> STATE["GET /api/state berikutnya:\njobMatchHint dihitung dari reflection.jobMatchResult\ngoal ini (recentDays scoped per-goal)"]
    STATE -.-> HINT

    CTJAS --> TAP2["Tap 'Mulai' → cek Artifacts library\nCV ada? skip ke form, else upload dulu"]
    TAP2 --> FORM["Form terstruktur (job-application-submit)\ncompanyName, roleTitle, dateApplied,\ncvVersionUsed (artifact id), submissionProof"]
    FORM --> SUBMIT["POST /api/job-application/submit"]
    SUBMIT --> VALIDATE["validateJobApplication (server/jobApplication.js)\nfield wajib + plausibilitas (tanggal tidak di masa depan,\nbukti submit >= 8 karakter) — DETERMINISTIK, tanpa AI"]
    VALIDATE --> GATE{"Gate qualified:\nanalisis TERAKHIR goal ini\nreflection.jobMatchResult.qualified?"}
    GATE -- "tidak / tidak ada" --> REJECT["400 — belum ada analisis LOLOS,\ncurrentCount TIDAK bertambah"]
    GATE -- "ya" --> INC["currentCount += 1\n(setGoalTarget, merge JSONB,\nsama seperti cardio/gym)"]
    INC --> REACH{"currentCount\n== targetCount (10)?"}
    REACH -- "tidak" --> PROGRESS["targetScreen mode progress\nkind qualified-applications\n'Qualified Applications: X/10'"]
    REACH -- "ya" --> OPTIONS["targetScreen mode options, reached true\nkind livelihood-funnel —\ngenerateTargetOptions cabang baru\n(generateLivelihoodFunnelOptions):\n2 arah funnel (Response Rate / Interview→Offer)\n+ Opsi C tulis sendiri (targetManualFormHTML)"]
    OPTIONS --> PICK["POST /api/goal-target\n(mekanisme A/B/C generik, TIDAK diubah —\nhanya kind baru lewat mekanisme yang sama)"]
    PICK --> STAGE2["goalTargets[goalIndex] jadi kind livelihood-funnel\n(Milestone #1 selesai, Milestone #2 dimulai)"]

    PROGRESS --> CARDJA["Result card: jobApplicationSummary line\n+ Milestone progress (targetPickerHTML)\nTIDAK ADA growth stat baru (Task 7d 'no arbitrary\npoints' — Milestone counter ITU SENDIRI signalnya)"]
    OPTIONS --> CARDJA
    CARDJA -.-> STATE2["GET /api/state berikutnya:\nquestSummaryCard .quest-context\n'→ Milestone: 10 Qualified Applications (X/10)'\n(atau funnel label kalau sudah Milestone #2) —\nSAMA formatnya seperti Body"]
```

Penjelasan node yang tidak jelas dari namanya:

- **ctx.jobMatchHint** — dihitung server-side di `GET /api/state` (needySlots
  loop), BUKAN diserahkan ke AI untuk disimpulkan dari `recentDays` mentah
  (prinsip defense-in-depth yang sama dengan `targetReached`/`qualified`):
  scoped per-goal lewat `db.recentDays(userId, {goalIndex, limit:5})`, cari
  `job-match-analysis` TERBARU untuk goal ini yang belum punya
  `job-application-submit` SESUDAHNYA (dibandingkan lewat id row). Prompt
  `generateQuest` cuma diberi hint jadi/tidaknya, bukan mentah recentDays,
  supaya completionType hari ini tidak pernah salah rute.
- **qualified (matchScore >= 70)** — satu-satunya sinyal deterministik yang
  menentukan verdict lolos/tidak (keputusan founder: bukan penilaian naratif
  AI semata). `matchScore` sendiri tetap dari AI (mempertimbangkan skill
  overlap DAN kesesuaian role/red flag lewat instruksi prompt), tapi ambang
  70 dan boolean `qualified` dihitung di `server/jobMatch.js`, tidak pernah
  dipercaya dari klaim bebas AI.
- **ensureQualifiedApplicationsMilestone** — beda dari target cardio/gym
  (baru ada setelah user pilih A/B/C) atau practice-test's `currentTargetFor`
  (dihitung ulang tiap baca, tidak pernah disimpan): Milestone Livelihood #1
  DIBUAT OTOMATIS saat goal ini pertama kali disentuh job-match-analysis,
  targetCount tetap 10 (keputusan founder, bukan pilihan AI/user), dan HARUS
  disimpan ke `goal_targets` supaya baris ".quest-context" Primary Quest
  bisa membacanya — kalau cuma dihitung ulang tiap baca (seperti
  practice-test), baris Milestone tidak akan pernah muncul di quest card,
  persis laporan founder yang jadi alasan task ini.
- **Milestone #2 (livelihood-funnel)** — begitu 10/10 tercapai, kind target
  goal ini BERUBAH dari `qualified-applications` ke `livelihood-funnel`
  (metrik funnel generik: label + target/current value) lewat mekanisme
  A/B/C yang SAMA persis (tidak ada komponen baru). `currentValue` metrik
  funnel ini TIDAK ada instrumentasi otomatis (belum ada yang mendeteksi
  "interview terjadi" atau "recruiter membalas") — dicatat sebagai gap yang
  diketahui di PRD.md, bukan ditutup diam-diam.
- **Tidak ada growth stat baru di job-application-submit** — keputusan
  desain eksplisit, bukan kealpaan: Task 7d sudah menutup "poin arbitrer" di
  semua completionType lain, Milestone counter goal ini SENDIRI adalah
  pengganti sinyal progress-nya (parallel dengan kenapa badge "Livelihood
  +3" dihapus di job-match-analysis, bukan dipindah ke rute lain).
