# Eleva — PRD untuk Claude Code

Dokumen ini ditulis supaya bisa langsung dieksekusi tanpa butuh percakapan sebelumnya sebagai konteks. Baca seluruh dokumen ini dulu sebelum mengubah kode apa pun.

## 1. Apa itu Eleva, dan kenapa scope-nya berubah

AI Character Growth System — AI berperan sebagai mentor yang memberi satu quest personal per hari berdasarkan konteks hidup pengguna, lalu menilai refleksinya.

**Perubahan penting dari versi PRD sebelumnya:** produk ini sebelumnya single-user (cuma founder). Sekarang rencananya membuka **beta gratis untuk ~100 member dalam 6 bulan**, monetisasi baru dimulai SETELAH periode beta ini selesai (jadi payment/billing BUKAN scope sesi ini — lihat bagian 7). Tapi begitu ada member selain founder, ini bukan lagi proyek personal — ada orang asing yang akan cerita hal personal (patah hati, ketakutan, dsb) ke AI ini. Tanggung jawabnya beda kelas dari sekadar "aplikasi dipakai sendiri".

First principles yang mengikat semua keputusan teknis (versi lengkap ada di `ELEVA_Constitution_Product_Bible_v1.3.docx` kalau file itu ikut di-attach):

- Quest harus personal, bukan checklist generik.
- **Growth butuh substansi nyata, bukan aktivitas kosong** (Goodhart's Law). Non-negotiable.
- Chapter naik karena pergeseran pola nyata, bukan waktu/EXP menumpuk.
- AI adalah mentor, bukan terapis — wajib punya jalur aman ke bantuan profesional kalau ada tanda krisis.
- Fitur baru harus jelas menjawab "apakah ini bantu transformasi pengguna", bukan sekadar "keren untuk ditambahkan".

## 2. Status repo saat ini

Stack: Node.js + Express, vanilla JS frontend tanpa build step. **Masih single-user** — ini yang jadi fokus utama PRD ini untuk diubah.

```
server/index.js   → routes: GET /api/state, POST /api/profile, POST /api/reflection, POST /api/reset
server/db.js      → SQLite (eleva.db, singleton row) — akan dimigrasi ke Postgres di Task 1
server/claude.js  → panggilan Claude API + fallback kalau key kosong/gagal
public/           → index.html, styles.css, app.js (vanilla JS, render manual ke #root)
```

Yang sudah bekerja dan JANGAN diubah logikanya (boleh dipindah lokasinya kalau perlu refactor untuk multi-user):
- Growth-gate: refleksi < 12 kata → `statDeltas` dipaksa kosong di server, walau AI menyarankan nilai lain.
- Chapter hanya naik tiap kelipatan 5 sesi growth valid.
- Kalau `ANTHROPIC_API_KEY` kosong, app tetap jalan pakai fallback quest generik, growth selalu 0.
- Desain saat ini sudah membatasi API call ke maksimal ~2x/user/hari (1 quest generation + 1 reflection). Ini penting dipertahankan saat multi-user — JANGAN buat pola yang bisa memicu regenerasi quest berulang kali per hari per user, supaya biaya API tetap terkendali di 100 user.

## 3. Urutan wajib — jangan lompat urutan

1. Task 0: Push ke GitHub (kalau belum)
2. Task 1: Migrasi ke Postgres
3. Task 2: Auth + multi-tenant data model + beta gate
4. Task 3: Crisis safety hardening
5. Task 4: Privacy notice minimal
6. Task 5: Pathway di onboarding — **QUEUED, mulai HANYA setelah Task 2 & 3 terverifikasi oleh founder** (bukan cuma "kode sudah ditulis")

**Gate keras: JANGAN buka pendaftaran ke member sungguhan sampai Task 2 dan Task 3 selesai DAN terverifikasi** — bukan cuma "sudah ditulis kodenya", tapi dites nyata: bikin 2 akun berbeda, pastikan data mereka benar-benar terpisah (user A tidak bisa lihat quest/refleksi/stats user B lewat cara apa pun, termasuk lewat manipulasi request langsung ke API).

**Gate kedua, khusus Task 5: JANGAN mulai Task 5 sebelum founder eksplisit bilang Task 2 & 3 sudah diverifikasi.** Kalau status itu belum jelas dari percakapan sejauh ini, tanyakan ke founder dulu sebelum menyentuh kode Task 5 — jangan asumsikan boleh jalan cuma karena PRD-nya sudah ada.

## 4. Task 0 — Push ke GitHub

Repo tujuan: `https://github.com/hizkiarigel/Eleva.git`

```bash
git branch -M main
git remote add origin https://github.com/hizkiarigel/Eleva.git
git push -u origin main
```

Kalau remote sudah ada, cek `git remote -v` dulu. Kalau push ditolak karena histori tidak nyambung, JANGAN `--force` — laporkan ke pengguna dulu.

## 5. Task 1 — Migrasi ke Postgres

Filesystem Railway ephemeral tanpa volume ter-attach — `eleva.db` berisiko hilang tiap deploy/restart. Sudah pernah ada beberapa hari data pengguna yang sempat berisiko karena ini.

**Langkah 0 — WAJIB sebelum kode disentuh:** Railway Shell di service Eleva, `sqlite3 eleva.db ".dump" > /tmp/backup.sql`, pastikan tersimpan aman di luar Railway sebelum lanjut.

**Langkah 1:** Railway dashboard → New → Database → PostgreSQL, di project yang sama. Railway otomatis sediakan `DATABASE_URL` (linked variable), termasuk untuk lokal.

**Langkah 2:** Ganti `better-sqlite3` → `pg`. Schema baru harus langsung dirancang multi-tenant (lihat Task 2 di bawah — jangan bikin schema single-user dulu terus diubah lagi, sekalian sekarang).

**Langkah 3:** Migrasi data lama dari backup dump — data itu jadi milik akun founder (user pertama) setelah Task 2 (auth) selesai dibuat.

**Langkah 4:** `git rm --cached eleva.db`, tambahkan `eleva.db*` ke `.gitignore`, update `README.md` dan `.env.example` (`DATABASE_URL=`).

## 6. Task 2 — Auth + multi-tenant data model + beta gate

Ini perubahan struktural terbesar. Prinsip: sederhana dulu (sesuai semangat "essential" produk ini), jangan over-engineer.

**Auth:** email + password (bcrypt untuk hash), session via cookie (httpOnly, signed) — bukan magic link dulu (butuh setup email transaksional, tambahan kompleksitas yang belum perlu untuk beta). Nggak perlu flow "lupa password" di v1 beta; cukup catatan di README bahwa itu belum ada.

**Beta gate:** karena target terkontrol (~100 member dalam 6 bulan, bukan buka bebas), tambahkan satu field `BETA_CODE` di env var — kode yang sama dibagikan ke semua calon beta member (lewat mana pun founder mau share-nya). Signup wajib isi kode ini, dicocokkan ke env var. Sederhana, cukup untuk skala ini, dan langsung memberi founder kontrol atas kecepatan pertumbuhan (dan biaya API yang mengikutinya).

**Schema Postgres (gantikan rancangan single-user sebelumnya):**
- `users` (id, email unique, password_hash, created_at)
- `character_state` (user_id FK unique → users.id, profile jsonb, stats jsonb, chapter_number, chapter_title, growth_sessions)
- `days` (user_id FK → users.id, date, quest jsonb, insight text, reflection jsonb, PRIMARY KEY (user_id, date))

**Routes:** semua route yang sekarang ada (`/api/state`, `/api/profile`, `/api/reflection`, `/api/reset`) harus di belakang middleware auth, dan semua query ke db di-scope pakai `req.userId` dari session — bukan dari body/param yang bisa dipalsukan client. Tambahkan `/api/signup`, `/api/login`, `/api/logout`.

**Frontend:** tambahkan layar login/signup sederhana sebelum onboarding (satu field email, satu field password, satu field kode beta untuk signup). Jangan redesign besar-besaran — konsisten dengan gaya visual yang sudah ada di `public/styles.css`.

**Verifikasi wajib sebelum dianggap selesai:** buat 2 akun uji, isi onboarding beda-beda di masing-masing, konfirmasi quest/stats/history sama sekali tidak tercampur, dan konfirmasi user A tidak bisa akses data user B walau coba modifikasi request API secara langsung (bukan cuma lewat UI).

## 7. Task 3 — Crisis safety hardening (WAJIB sebelum ada beta member pertama)

Saat ini deteksi krisis cuma instruksi di system prompt (`server/claude.js`) — lemah karena bergantung penuh ke kepatuhan model. Tambahkan lapisan kedua di server, independen dari AI.

Di route reflection, sebelum memanggil `ai.processReflection`:
- Cek `text` terhadap daftar kecil frasa risiko tinggi (niat menyakiti diri sendiri/bunuh diri — frasa spesifik, bukan kata umum seperti "sedih" atau "capek", untuk menghindari false positive).
- Kalau terdeteksi: jangan panggil AI mentor seperti biasa. Refleksi tetap tersimpan, tapi `mentorReply` diganti pesan tetap yang mengarahkan ke bantuan profesional, tanpa `statDeltas`.
- Kontak resmi: **Layanan Sejiwa/Healing119, telepon 119 ekstensi 8, atau www.healing119.id — gratis, 24 jam, Kemenkes RI.**
- Simpan daftar frasa di `server/safety.js` terpisah, supaya gampang direvisi.
- Ini tambahan (defense in depth), bukan pengganti instruksi system prompt.

## 8. Task 4 — Privacy notice minimal

Beta member akan cerita hal personal ke AI. Sebelum signup selesai, tampilkan (boleh sesederhana satu paragraf + checkbox "saya mengerti"):
- Data refleksi diproses oleh AI (Claude/Anthropic) untuk menghasilkan quest & analisis.
- Data disimpan di database (Postgres, Railway), diakses oleh founder untuk keperluan pengembangan produk selama masa beta.
- Bukan pengganti layanan kesehatan mental profesional.

Ini bukan kebijakan privasi hukum yang lengkap — cukup untuk beta terkontrol berbasis kepercayaan. Kebijakan privasi formal jadi task terpisah kalau nanti masuk fase monetisasi.

## 9. Task 5 — Adaptive Pathway Onboarding (v2, SELESAI — menggantikan total desain v1 di bawah)

**Riwayat (kenapa desain ini berubah dua kali — detail lengkap di riwayat versi Bible Bab 15):**

- **v1 (implementasi pertama, sudah di-supersede total):** Pathway dipilih manual dari 6 kartu statis di akhir onboarding. Saat itu, draft PRD alternatif yang mengusulkan "identity is discovered, not chosen" (Pathway via AI hypothesis + resonance scoring + auto-activate diam-diam setelah 14 hari observasi) DITOLAK sadar — dianggap menghapus agency pengguna, bertentangan dengan FP1 dan `ELEVA_Constitution_Product_Bible_v1.3.docx` Bab 13.
- **v2 (implementasi sesi ini, MENGGANTIKAN v1 total — sumber: `Eleva_PRD.pdf` + `ELEVA_Constitution_Product_Bible_v1.4.docx` Bab 13):** Bible v1.4 mengklarifikasi bahwa contoh yang memicu penolakan di v1 ("jiwa analis melatih diri jadi sales") sebenarnya soal kebutuhan Acting Method, bukan soal mekanisme pemilihan Pathway. Begitu dipisah, tidak ada kontradiksi dengan FP1 — Pathway sekarang **direkomendasikan AI dari hipotesis**, TAPI jalur keluar manual (override bebas teks) tetap wajib ada, dan Pathway baru berstatus **"trial"** (bukan langsung permanen/diam-diam) sampai terbukti resonan dari data refleksi nyata. Agency pengguna tetap non-negotiable; yang berubah cuma mekanisme default-nya.

**Urutan onboarding final v2 (MENGGANTIKAN urutan v1):**
1. Nama
2. Private Promise (layar statis, sama seperti v1: *"Semua yang kamu ceritakan di sini hanya untuk kamu dan Eleva."*)
3. Situasi hidup sekarang (Story) — **TETAP ADA, tidak digantikan Adaptive Questions.** Ini tahap awal AI membangun konteks (Story → Core Values → Core Fear); Adaptive Questions di bawah adalah lapisan ekspansi, bukan pengganti.
4. Values (Core Values)
5. Fear (Core Fear)
6. **BARU, ganti dari 8 slider 1-10:** Stats sebagai polygon interaktif 8 sisi (SVG, drag titik sudut, bukan isi angka). Menarik satu titik naik mengecilkan 7 titik lain secara proporsional (floor kecil, bukan ke nol) — total kira-kira konstan, memodelkan bahwa manusia (semua orang) punya waktu & energi terbatas.
7. **BARU:** Growth Focus — multi-select 1-3 dari 10 preset (Career, Purpose, Relationship, Leadership, Confidence, Communication, Wealth, Health, Adventure, Contribution). Ini kompas yang dipakai TERUS-MENERUS untuk Quest/Acting Method/reflection prompt seterusnya — bukan data onboarding sekali pakai lalu dilupakan.
8-10. **BARU, gantikan step "Pathway 6 kartu" v1:** 3x Adaptive Question, digenerate AI berurutan sebagai percakapan bercabang (bukan daftar statis) — Q1 gali lebih dalam dari Growth Focus + cerita awal, Q2 mengarah ke obstacle/fear yang menghalangi, Q3 mengarah ke values/non-negotiables (framing tidak langsung).
11. AI Thinking (loading singkat: "Aku sedang mencoba memahami ceritamu...")
12. **BARU:** Chapter Analysis — insight naratif AI (rangkuman 2-4 kalimat) + Pathway Recommendation (1 dari 6 nama yang sama seperti v1: Builder/Guardian/Explorer/Connector/Seeker/Specialist) + Secondary Trait opsional (informasional saja — TIDAK dapat Identity Maturity ladder atau Quest/Acting Method sendiri, supaya tidak jadi dua proyek transformasi identitas paralel).
13. Konfirmasi — WAJIB dua jalur: tombol utama "Mulai First Trial (14 hari)" (terima rekomendasi AI) ATAU link sekunder "Bukan ini — aku tahu persis mau melatih apa" (override manual via teks bebas, BUKAN balik ke kartu pilihan). Override tetap masuk First Trial 14 hari yang sama, bukan langsung permanen.

**First Trial (14 hari):** Pathway baru (dari rekomendasi AI ATAU override manual — dua-duanya sama) mulai `pathway_status='trial'`. Growth-gate 12-kata tetap berlaku penuh selama trial, tidak berubah. Resonance-check dievaluasi lazy setiap `GET /api/state` dipanggil: kalau `now() - pathway_trial_started_at >= 14 hari` DAN `growthSessions >= 5` (unit sama yang dipakai chapter-advance) → `pathway_status` otomatis jadi `'active'` (masuk Identity Maturity ladder permanen). Belum cukup data → tetap `'trial'` (diperpanjang, bukan dipaksa/di-skip). Traceable ke data refleksi nyata, bukan skor AI tersembunyi.

**Perubahan schema Postgres** (di atas kolom `pathway`/`pathway_noun` dari v1 yang tetap dipakai apa adanya untuk quest generation harian): `character_state` nambah `growth_focus jsonb`, `pathway_status text DEFAULT 'trial'`, `pathway_trial_started_at timestamptz`, `secondary_trait text`.

**Route baru:** `POST /api/onboarding/adaptive-question`, `POST /api/onboarding/chapter-analysis` — di belakang `requireAuth`, tapi stateless (dipanggil berkali-kali SELAMA onboarding sebelum `character_state` ada). `POST /api/profile` tetap satu-satunya titik commit ke DB, dipanggil sekali di akhir step 13.

**`server/claude.js`:** dua fungsi baru — `generateAdaptiveQuestion(ctx)`, `generateChapterAnalysis(ctx)` — reuse nada/pola prompt & fallback dari `MENTOR_SYSTEM`/`generateQuest` yang sudah ada. Fallback deterministik untuk kedua fungsi (pertanyaan generik per-tahap, analisis berbasis pola Growth Focus→Pathway sederhana) supaya onboarding tetap bisa diselesaikan tanpa `ANTHROPIC_API_KEY`, konsisten prinsip yang sudah ada di `generateQuest`/`processReflection`.

**Dashboard:** badge tier+pathwayNoun (mekanisme tidak berubah dari v1: `{tier} {pathwayNoun}`, tier dari `growthSessions` pembagi 3) + indikator kecil "(hipotesis — First Trial)" ditambahkan selama `pathway_status === 'trial'`.

**Definition of done Task 5 v2 (menggantikan DoD v1):**
- [x] Situasi/Values/Fear tetap ada sebagai step terpisah, tidak digantikan Adaptive Questions
- [x] Stats sebagai polygon drag interaktif, redistribusi proporsional non-zero saat satu titik ditarik naik
- [x] Growth Focus multi-select (1-3 dari 10), tersimpan & dipakai sebagai context Quest harian seterusnya
- [x] 3 Adaptive Question berurutan, tiap pertanyaan pakai jawaban sebelumnya sebagai context
- [x] Chapter Analysis tampilkan insight + Pathway rec + Secondary Trait opsional
- [x] Dua jalur konfirmasi (terima rekomendasi AI / override manual teks bebas), keduanya masuk First Trial 14 hari yang sama
- [x] `pathway_status` mulai `'trial'`, otomatis `'active'` setelah ≥14 hari DAN ≥5 growth session (resonance-check lazy, diverifikasi lewat simulasi tanggal di Postgres)
- [x] Dashboard menampilkan indikator trial selama belum `'active'`
- [x] Growth-gate 12-kata, crisis-detection, isolasi 2-akun tidak regresi (dites ulang eksplisit setelah perubahan ini)
- [ ] Resonance-check 14-hari HANYA diverifikasi lewat simulasi tanggal (`pathway_trial_started_at` dimundurkan manual di Postgres) — belum diverifikasi dengan pengguna asli menunggu 14 hari kalender sungguhan. Dicatat jujur sebagai keterbatasan, bukan "selesai penuh".

## 10. Eksplisit DI LUAR scope sesi ini

- **Payment/billing** (Midtrans/Xendit dsb) — beta ini gratis, monetisasi baru dipikirkan setelah periode beta selesai. Jangan mulai kerjakan ini sekarang.
- Magic link / OAuth login — email+password dulu cukup.
- Flow lupa password.
- Side Quest, Social Quest, Career Quest, Exploration Quest (masih Main Quest saja).
- Redesign visual besar-besaran.
- Kebijakan privasi hukum formal (cukup notice minimal di Task 4).

Kalau merasa salah satu di atas "sekalian aja dikerjakan", tahan dulu — tanyakan ke pengguna dulu.

## 11. Definition of done untuk sesi ini (Task 0-4; Task 5 punya DoD sendiri di atas dan statusnya terpisah)

- [ ] Repo ke-push ke `github.com/hizkiarigel/Eleva`, branch `main`
- [ ] Backup SQLite lama tersimpan aman di luar Railway sebelum migrasi
- [ ] Postgres aktif, `DATABASE_URL` terhubung, data lama termigrasi ke akun founder
- [ ] `eleva.db` keluar dari git tracking, `.gitignore` & `README.md` diperbarui
- [ ] Signup/login/logout jalan, dilindungi `BETA_CODE`
- [ ] 2 akun uji dites eksplisit: tidak ada kebocoran data antar-user, termasuk lewat manipulasi request API langsung
- [ ] Semua route API ada di belakang auth middleware, di-scope by `userId` dari session (bukan dari body/param client)
- [ ] Reflection dengan frasa risiko tinggi → arahkan ke 119 ext. 8, tanpa growth, tervalidasi jalan
- [ ] Reflection normal tidak regresi (growth-gate 12-kata tetap berlaku)
- [ ] Privacy notice tampil sebelum signup selesai
- [ ] README diperbarui: cara jalanin lokal dengan Postgres + auth, dan catatan jelas bahwa payment BELUM ada
