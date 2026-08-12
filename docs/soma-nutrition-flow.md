# SOMA Nutrition flow — Part B (PRD.md section 29)

Diagram alur PROGRESSIVE lifecycle untuk Nutrition (search-based + photo-optional
entry, evaluasi mid-day/end-of-day, shortfall banner), plus routing SOMA di META,
sesuai kode di `server/nutrition.js`, `server/nutritionEntry.js`, `server/db.js`,
`server/claude.js`, `server/index.js`, dan `public/app.js`. Dokumen ini WAJIB
tetap akurat terhadap kode — kalau alur berubah, update diagram ini juga.

```mermaid
flowchart TD
    SOMA["Tap SOMA di META\n(rename label-only dari 'Fisik / Lari' —\nBody stat tidak berubah)"] --> COUNT{"Berapa quest SOMA\nMETA yang masih ACTIVE?\n(activeSomaQuest, public/app.js)"}
    COUNT -- "0" --> PICKER["Mode picker: Activity / Nutrition\n(badge 'sedang aktif' kalau ada)"]
    COUNT -- "1" --> RESUME["Skip picker, langsung resume\nquest yang aktif itu"]
    COUNT -- "2+" --> PICKER

    PICKER -- "Activity" --> BODYKIND["Cardio/Gym/Recovery kind picker\n(TIDAK berubah — flow existing)"]
    PICKER -- "Nutrition" --> METASTART["POST /api/meta/start {tool:nutrition}\nquest.progressive = initProgressiveState\n(default: 3 makan, protein, target 60g)"]
    RESUME -- "Nutrition aktif" --> LOGFLOW
    METASTART --> LOGFLOW

    GQ["generateQuest (server/claude.js)\nAI menulis quest harian untuk goal Nutrition"] --> NORM["normalizeCompletionType → nutrition-log\nnormalizeProgressiveSchema → lifecycleType progressive\n+ progressive tervalidasi (requiredContributions/primaryMetric/targetValue)"]
    NORM -.-> LOGFLOW

    LOGFLOW["Nutrition page (nutritionFlowHTML)\ntotals hari ini + primary-metric emphasis;\nrow Sarapan/Makan Siang/Makan Malam/Camilan"] --> MEALPICK["Pilih waktu makan"]
    MEALPICK --> ENTRYMODE{"Cara input"}
    ENTRYMODE -- "Search (utama, sesuai brief)" --> SEARCH["GET /api/foods/search?q=\nsubstring match ke foods (seed MVP)"]
    ENTRYMODE -- "Foto (opsional, sesuai keputusan founder)" --> PHOTO["POST /api/nutrition/analyze-photo\nAI vision → SARAN saja, belum tersimpan"]
    SEARCH --> CONFIRM["Step confirm — semua field editable\n(foodName/servingAmount/servingUnit/macros)"]
    PHOTO --> CONFIRM

    CONFIRM --> VALIDATE["validateFoodEntry (server/nutritionEntry.js)\nmealType enum, plausibility caps —\nSAMA untuk search maupun foto"]
    VALIDATE --> SAVE["POST /api/nutrition/log\ncreateFoodEntry (durable evidence) +\napplyContribution (server/nutrition.js)"]
    SAVE --> CHECK{"evidenceComplete\nAND targetMet?"}
    CHECK -- "ya, mid-day" --> COMPLETE["status COMPLETED — auto, TANPA konfirmasi manual\nresolveNutritionQuest: ai.processReflection\n(ctx.nutritionResult) → statDeltas kalau evidenceComplete"]
    CHECK -- "belum" --> BACKLOG["status tetap ACTIVE\n(TIDAK pernah ATTEMPTED mid-day,\nhanya lazy end-of-day yang boleh)"]
    BACKLOG --> LOGFLOW

    STATE["GET /api/state berikutnya\n(lazy, sama idiom kondisi/Decay —\ntidak ada cron di app ini)"] --> ROLLCHECK{"quest.date sudah\nbukan hari ini,\nstatus masih ACTIVE?"}
    ROLLCHECK -- "ya" --> EVAL["evaluateEndOfDay:\nevidenceComplete? → ATTEMPTED\n!evidenceComplete → INCOMPLETE"]
    EVAL --> RESOLVE2["resolveNutritionQuest\n(SAMA fungsi dengan mid-day COMPLETED)"]
    RESOLVE2 --> SHORTFALL["shortfallPrompt tersimpan di reflection\n(ATTEMPTED/INCOMPLETE saja)"]
    ROLLCHECK -- "tidak" --> NOOP["tidak disentuh"]

    SHORTFALL -.-> BANNER["Home screen: nutritionShortfallHTML\n(pendingNutritionShortfalls dari GET /api/state) —\nchip fixed-option, reuse POST /api/quest/shortfall-reason\n(Task 7d item 6, TIDAK diubah)"]

    COMPLETE -.-> HOMECARD
    BACKLOG -.-> HOMECARD
    HOMECARD["Home quest card (questSummaryCard)\nTombol SELALU 'Lanjut Catat' (bukan 'Mulai'),\nprogress line 'Meals X/Y · Metric A/B'\n— TIDAK PERNAH CTA selesai selagi target belum tercapai"]
```

Penjelasan node yang tidak jelas dari namanya:

- **activeSomaQuest** — "aktif" berarti quest META (bukan Today's Trial) yang
  `is_meta=true` dan `reflection IS NULL`, domain Activity
  (`completionType === "structured-physical"`) atau Nutrition
  (`completionType === "nutrition-log"`). Quest Today's Trial (goal-tied)
  TIDAK ikut dihitung di sini — routing SOMA di META hanya soal sesi META
  itu sendiri, konsisten dengan makna "META" (sesi bebas, di luar rotasi
  goal harian).
- **PROGRESSIVE vs SESSION** — `lifecycleType` field baru di quest jsonb.
  SESSION (cardio/gym/recovery/practice-test/job-match-analysis/
  job-application-submit, TIDAK DISENTUH) = generate → satu submit → selesai.
  PROGRESSIVE (nutrition-log, satu-satunya sejauh ini) = quest tetap terbuka
  sepanjang hari, menampung beberapa submission (`applyContribution`)
  sebelum status berubah dari ACTIVE.
- **evidenceComplete vs targetMet** — dua boolean TERPISAH, tidak pernah
  digabung jadi satu (prinsip anti-Goodhart yang sama dengan
  qualified-applications Livelihood): evidenceComplete = jumlah makan yang
  dicatat sudah cukup (compliance); targetMet = angka metrik utama
  (kalori/protein/karbo/lemak) sudah tercapai (pencapaian). Growth-gate
  hanya mensyaratkan evidenceComplete — targetMet TIDAK PERNAH menahan
  growth kalau compliance-nya sendiri sudah penuh.
- **COMPLETED mid-day, ATTEMPTED/INCOMPLETE hanya end-of-day** —
  `applyContribution` HANYA PERNAH menghasilkan status ACTIVE atau
  COMPLETED (kalau kedua boolean true di saat itu juga) — tidak pernah
  ATTEMPTED, supaya user yang sudah mencatat jumlah makan minimum tapi
  belum capai target tetap punya kesempatan makan lagi hari itu sebelum
  dianggap "gagal". ATTEMPTED/INCOMPLETE HANYA pernah muncul dari
  `evaluateEndOfDay`, dipanggil lazy oleh GET /api/state begitu
  `quest.date` sudah bukan hari ini lagi.
- **resolveNutritionQuest** — satu fungsi dipakai untuk KEDUA jalur resolusi
  (mid-day COMPLETED dari POST /api/nutrition/log, ATTEMPTED/INCOMPLETE dari
  GET /api/state) — memanggil `ai.processReflection` dengan
  `ctx.nutritionResult` (BUKAN flat-bump baru — reuse mekanisme growth yang
  sama dipakai structured-physical/practice-test, prinsip "no arbitrary
  points" Task 7d/14 tidak dibuka lagi untuk domain baru ini).
- **Nutrition page ganda-peran** — `nutritionFlowHTML()` sekaligus jadi
  "Nutrition page" (brief item 6: totals + meal rows + primary-metric
  emphasis) DAN UI logging itu sendiri — pola yang sama dengan
  jobMatchFlowHTML/practiceTestFlowHTML (layar flow khusus yang dibuka lewat
  "Mulai"/"Lanjut Catat", bukan tab nav permanen baru — tidak ada redesign
  navigasi yang diminta).
