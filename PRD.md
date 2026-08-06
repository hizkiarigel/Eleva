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

## 9. Task 5 — Pathway di onboarding (QUEUED — lihat gate kedua di bagian 3)

**Konteks:** Ada draft PRD alternatif ("Adaptive Onboarding PRD") yang beredar dan sempat dipertimbangkan. Sebagian isinya DITOLAK secara sadar — dicatat di sini supaya tidak salah ke-adopt kalau file itu ikut nyasar ke sesi ini:

- **DITOLAK:** "Identity is discovered, not chosen" — Pathway via AI hypothesis + resonance scoring + auto-activate primary pathway setelah 14 hari observasi diam-diam. Ini menghapus agency pengguna untuk secara sadar memilih identitas yang mau dilatih (termasuk yang berlawanan dari kecenderungan alaminya) — bertentangan langsung dengan FP1 dan dengan keputusan desain di `ELEVA_Constitution_Product_Bible_v1.3.docx` Bab 13.
- **DITOLAK:** Secondary Trait (dua pathway aktif sekaligus), 14-hari trial wajib sebelum pathway apa pun ditampilkan ke pengguna, Adaptive Questions bercabang berdasarkan Growth Focus. Semua ini terlalu berat untuk scope "essential", dan membuang percuma flow onboarding yang sudah divalidasi manual oleh founder di prototype.
- **DIADOPSI:** "Private Promise" — satu kalimat reassurance privasi, ditempatkan SEBELUM pertanyaan vulnerable (Situasi/Values/Fear). Ini BUKAN pengganti Task 4 (privacy notice legal/data-handling) — dua-duanya tetap ada, beda fungsi: Private Promise itu emosional/reassurance di awal, Task 4 itu informasi data-handling sebelum signup selesai.
- **DIADOPSI (sudah tercatat di Bible, bukan tugas baru di sini):** framing "Pathway itu uji coba, bukan komitmen mati" untuk sesi-sesi awal setelah Pathway dipilih.

**Urutan onboarding final (SUDAH divalidasi manual oleh founder di `Eleva_Prototype.jsx` — jangan ubah urutannya tanpa alasan kuat):**
1. Nama
2. **BARU:** Private Promise — satu layar singkat: *"Semua yang kamu ceritakan di sini hanya untuk kamu dan Eleva."*
3. Situasi hidup sekarang
4. Values
5. Fear
6. Stats (8 slider, 1-10)
7. **BARU:** Pathway — pilih satu dari: Builder, Guardian, Explorer, Connector, Seeker, atau Specialist (dengan input teks bebas untuk spesialisasinya). Framing di layar ini: "Sekarang, pilih jalanmu — dari yang barusan kamu ceritain, ini enam arah yang bisa kamu latih sengaja."

**Perubahan schema Postgres** (di atas schema Task 2 yang sudah ada): `character_state` nambah dua kolom — `pathway text`, `pathway_noun text`.

**Perubahan `server/claude.js`:**
- Prompt AI (system prompt DAN context onboarding/harian) sertakan `pathway` dan `pathwayNoun`.
- Response JSON `generateQuest` nambah field: `pathwayNoun` (diturunkan SEKALI saat onboarding dari teks Pathway, dipertahankan sama persis setiap hari setelahnya — JANGAN diganti-ganti tiap generate), dan `quest.mode`: `"quest"` atau `"acting"` — AI yang memilih framing mana yang relevan hari itu berdasarkan Pathway + chapter, bukan dua instruksi sekaligus dalam satu hari.
- **Implementasi lengkap (prompt final, response shape, fallback behavior) sudah ada dan SUDAH DITES di `Eleva_Prototype.jsx` fungsi `generateQuest`/`MENTOR_SYSTEM` — port logic itu apa adanya, jangan re-derive prompt dari nol.**

**Perubahan Dashboard:** tampilkan badge kecil di bawah judul chapter: `{tier} {pathwayNoun}` (contoh: "Practicing Closer"). Tier dihitung dari `growthSessions` yang sudah ada: `["Emerging","Practicing","Reliable","System","Master"][min(4, floor(growthSessions/3))]` — sengaja pakai pembagi 3 (beda dari kenaikan chapter yang pembagi 5), supaya tier kerasa lebih responsif daripada chapter.

**Kartu quest harian:** label berubah jadi "QUEST HARI INI" atau "ACTING METHOD HARI INI" tergantung `quest.mode` dari respons AI.

**Definition of done khusus Task 5:**
- [ ] Private Promise tampil sebagai layar tersendiri sebelum Situasi/Values/Fear
- [ ] Pathway step di akhir onboarding (step 7), 6 opsi, Specialist punya input teks bebas
- [ ] `pathwayNoun` konsisten (tidak berubah-ubah tiap hari) setelah pertama kali di-generate
- [ ] Dashboard menampilkan tier + pathwayNoun
- [ ] Kartu quest harian menampilkan mode yang benar sesuai respons AI
- [ ] Growth-gate 12-kata dan chapter-advance-tiap-5-sesi TIDAK berubah/regresi akibat perubahan ini

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
