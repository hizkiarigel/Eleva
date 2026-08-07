# Eleva — PRD untuk Claude Code

Dokumen ini ditulis supaya bisa langsung dieksekusi tanpa butuh percakapan sebelumnya sebagai konteks. Baca seluruh dokumen ini dulu sebelum mengubah kode apa pun.

## 1. Apa itu Eleva, dan kenapa scope-nya berubah

AI Character Growth System — AI berperan sebagai mentor yang memberi satu quest personal per hari berdasarkan konteks hidup pengguna, lalu menilai refleksinya.

**Perubahan penting dari versi PRD sebelumnya:** produk ini sebelumnya single-user (cuma founder). Rencana awal sempat "100 member gratis, 6 bulan" — ini DIREVISI setelah pertimbangan biaya dan risiko: **skala awal sekarang 10 orang, pilot 14 hari, closed/terundang**, bukan 100 orang langsung. Kalau pilot 10 orang ini berhasil, buka ke skala lebih besar adalah keputusan terpisah nanti — jangan asumsikan otomatis lanjut ke 100. Monetisasi belum jadi scope sesi ini (model bisnisnya SUDAH diputuskan tapi BELUM dibangun — lihat bagian 12). Tapi begitu ada member selain founder — walau cuma 10 — ini bukan lagi proyek personal: ada orang asing yang akan cerita hal personal (patah hati, ketakutan, dsb) ke AI ini. Tanggung jawabnya beda kelas dari sekadar "aplikasi dipakai sendiri", terlepas dari jumlah orangnya sedikit.

**Model AI: Claude Sonnet, bukan Haiku.** Sempat dipertimbangkan Haiku untuk hemat biaya, tapi setelah dihitung: biaya Sonnet untuk 10 orang selama 14 hari (termasuk onboarding adaptif yang panjang) hanya sekitar Rp70.000-90.000/orang untuk sebulan penuh — jauh di bawah budget yang disiapkan founder (~Rp50.000/orang/bulan, dan ini kalkulasi 10 orang 14 hari jauh lebih kecil dari itu). Di skala ini, penghematan ke Haiku (~Rp30.000/orang/bulan) tidak sepadan dengan risiko kualitas — 10 orang pertama ini adalah validasi PALING PENTING soal apakah "mentor voice" Eleva kerasa hidup. Jangan turunkan ke Haiku tanpa instruksi eksplisit founder.

**Selaraskan Task 5 (Pathway First Trial 14 hari) dengan pilot ini:** First Trial per-pengguna itu SAMA dengan durasi pilot 14 hari — bukan dua jangka waktu terpisah yang kebetulan sama angka. 10 orang pilot ini otomatis juga jadi cohort pertama yang menjalani First Trial.

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
6. Task 5: Pathway di onboarding — **QUEUED, mulai HANYA setelah Task 2 & 3 terverifikasi oleh founder** (bukan cuma "kode sudah ditulis") — SELESAI, lihat bagian 9
7. Task 6: Prompt caching — bisa dikerjakan kapan saja setelah Task 5 selesai, tidak diblokir gate lain — SELESAI, lihat bagian 10

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

**Beta gate:** target awal 10 orang terundang, pilot 14 hari (bukan buka bebas), tambahkan satu field `BETA_CODE` di env var — kode yang sama dibagikan ke 10 calon pilot tester (lewat mana pun founder mau share-nya). Signup wajib isi kode ini, dicocokkan ke env var. Sederhana, cukup untuk skala ini, dan langsung memberi founder kontrol atas kecepatan pertumbuhan (dan biaya API yang mengikutinya). Kalau pilot 10 orang ini berhasil, buka gate ke skala lebih besar adalah keputusan terpisah nanti — jangan asumsikan otomatis lanjut ke 100.

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

## 9. Task 5 — Pathway di onboarding: adaptif, direkomendasikan AI (v3, SELESAI — menggantikan total desain v2 di bawah)

**Riwayat (kenapa desain ini berubah TIGA kali — detail lengkap di riwayat versi Bible Bab 15):**

- **v1 (implementasi pertama, di-supersede total):** Pathway dipilih manual dari 6 kartu statis di akhir onboarding. Draft PRD alternatif yang mengusulkan "identity is discovered, not chosen" (AI hypothesis + resonance scoring + auto-activate diam-diam setelah 14 hari) DITOLAK sadar saat itu — dianggap menghapus agency pengguna, bertentangan dengan FP1 dan Bible v1.3 Bab 13.
- **v2 (di-supersede total — sumber: `Eleva_PRD.pdf` + `ELEVA_Constitution_Product_Bible_v1.4.docx` Bab 13):** Bible v1.4 mengklarifikasi bahwa contoh yang memicu penolakan di v1 ("jiwa analis melatih diri jadi sales") sebenarnya soal kebutuhan Acting Method, bukan soal mekanisme pemilihan Pathway itu sendiri. Begitu dipisah, tidak ada kontradiksi dengan FP1 — Pathway direkomendasikan AI dari hipotesis, jalur override manual tetap wajib ada, Pathway baru berstatus "trial" sampai terbukti resonan. v2 menambahkan: Situasi/Values/Fear (dipertahankan sebagai step statis terpisah), Stats sebagai polygon 0-100 (default 50), Growth Focus (multi-select 1-3 dari 10 kategori tetap), dan 3 Adaptive Question TETAP (jumlah fixed).
- **v3 (SESI INI, MENGGANTIKAN v2 total — revisi kedua dari draft Task 5, ditulis SETELAH founder review langsung terhadap implementasi v2 yang sempat berjalan di production):** Growth Focus (multi-select kategori) DIGANTI TOTAL oleh radar/polygon self-assessment 8-sumbu yang SAMA dipakai buat Stats — bentuk radar chart itu sendiri (sumbu mana yang menonjol/ditekan) yang jadi sinyal minat/fokus, jadi tidak ada dua mekanisme redundan buat hal yang sama. Situasi/Values/Fear (yang di v2 eksplisit dipertahankan atas instruksi founder) DIHAPUS TOTAL — isinya sekarang digali lewat Adaptive Questions yang dinamis, bukan pertanyaan statis lagi. Jumlah Adaptive Question jadi FLEKSIBEL 4-10 (bukan fixed 3) — AI berhenti sendiri begitu cukup yakin. Filosofi inti (Pathway direkomendasikan AI + override manual + status trial 14 hari) TIDAK berubah dari v2 — yang berubah murni mekanisme pengumpulan konteksnya.

**Alur onboarding final v3 (MENGGANTIKAN alur v2 di atas):**
1. **Nama + Privacy Promise digabung jadi SATU layar** (v2 punya ini sebagai dua step terpisah) — field nama, di bawahnya langsung teks *"Semua yang kamu ceritakan di sini hanya untuk kamu dan Eleva."* + checkbox konfirmasi ("Aku mengerti dan siap mulai").
2. **Radar self-assessment** (GANTI TOTAL Growth Focus v2 DAN gabung dengan Stats v2 jadi satu mekanisme) — radar chart 8 sumbu sama seperti v2 (Body, Mind, Career, Finance, Emotional Stability, Explorer, Social, Purpose), tapi skala **1-10** (bukan 0-100), default **5 tiap sumbu**, total **SELALU TEPAT 40** (8×5), zero-sum: menaikkan satu sumbu otomatis menurunkan sumbu lain secara terdistribusi (bukan ke bawah 1, floor-nya skala itu sendiri).
3-N. **Adaptive Questions, jumlah FLEKSIBEL 4-10** (ganti dari fixed 3 di v2, DAN gantikan step statis Situasi/Values/Fear v2 yang dihapus) — AI generate satu per satu, berdasarkan jawaban sebelumnya DAN pola radar chart. AI berhenti begitu cukup yakin (minimal 4 pertanyaan, maksimal 10 dipaksa berhenti) — **keputusan default dari rekomendasi Claude sendiri, founder belum eksplisit konfirmasi vs fixed 10, gampang diubah lewat komentar di kode kalau diminta setelah lihat hasilnya.**
N+1. AI Thinking (layar loading singkat: *"Aku sedang mencoba memahami ceritamu..."*)
N+2. Chapter Analysis — **tidak berubah dari v2**: insight naratif + Pathway Recommendation (6 nama yang sama: Builder/Guardian/Explorer/Connector/Seeker/Specialist) + Secondary Trait opsional.
N+3. Konfirmasi — **tidak berubah dari v2**: tombol utama "Mulai First Trial (14 hari)" ATAU link sekunder "Bukan ini — aku tahu persis mau melatih apa" (override bebas teks). Override tetap masuk First Trial 14 hari yang sama.

**First Trial (14 hari) — tidak berubah dari v2:** Pathway baru (rekomendasi AI ATAU override) mulai `pathway_status='trial'`. Growth-gate 12-kata tetap berlaku penuh. Resonance-check lazy di `GET /api/state`: `≥14 hari` DAN `≥5 growth session` → `'active'` permanen. Belum cukup → tetap `'trial'`. Traceable ke data refleksi nyata.

**Perubahan schema Postgres** (di atas kolom `pathway`/`pathway_noun`/`pathway_status`/`pathway_trial_started_at`/`secondary_trait` dari v2 yang tetap dipakai): `character_state` nambah `radar_snapshot jsonb` (nilai 8 sumbu 1-10 saat onboarding, disimpan sebagai object bukan array — array ke kolom jsonb tidak auto-encode benar oleh `pg`, pernah kejadian bug ini di v2 dengan `growth_focus`). Kolom `growth_focus` dari v2 TIDAK dihapus (aman ke baris v2 yang sudah ada), cuma berhenti ditulis untuk user baru.

**Kolom `stats` (0-100, digrow refleksi harian) vs `radar_snapshot` (1-10, baru):** dua kolom terpisah, skala beda. `stats` diisi dari `radar_snapshot × 10` sekali saat `POST /api/profile` (server-side). `radar_snapshot` disimpan mentah sebagai rekaman beku dari yang digambar pengguna.

**Konteks quest harian pengganti Situasi/Values/Fear yang dihapus:** `profile` server-side jadi `{name, createdAt, originStory}` — `originStory` diisi dari `insight` hasil Chapter Analysis, dipakai gantiin `profile.situation` v2 di context AI harian. Akun v2 yang sudah ada (termasuk akun founder) tidak retroaktif dapat `radar_snapshot`/`originStory` — fallback eksplisit di semua titik pembuatan context AI (`radarSnapshot: state.radarSnapshot || undefined` bersanding `growthFocus: state.growthFocus || undefined`, `originStory: profile.originStory || profile.situation`) supaya akun lama tidak mendadak kehilangan "kompas"-nya begitu v3 di-deploy.

**Route:** `POST /api/onboarding/adaptive-question`, `POST /api/onboarding/chapter-analysis` — sama seperti v2, cuma terima `radarSnapshot` bukan `growthFocus`. `POST /api/profile` tetap satu-satunya titik commit ke DB.

**`server/claude.js`:** `generateAdaptiveQuestion`/`generateChapterAnalysis` ditulis ulang (bukan cuma ganti nama field) — termasuk `MENTOR_SYSTEM` sendiri, yang tadinya eksplisit instruksikan model treat `ctx.growthFocus` sebagai kompas dan pisahkan cerita/values/ketakutan sebagai 3 field beda. `generateAdaptiveQuestion` sekarang balas `{question: string|null, confident: boolean}` — batas minimal 4/maksimal 10 DITEGAKKAN DI KODE (server), bukan dipercaya penuh dari `confident` yang dikembalikan model — sama prinsip defense-in-depth dengan crisis-detection dan growth-gate. Fallback (tanpa API key): selalu berhenti tepat di 4 pertanyaan generik, personalisasi murah dari sumbu radar tertinggi (`RADAR_AXIS_TO_PATHWAY` gantikan `GROWTH_FOCUS_TO_PATHWAY` v2 buat `fallbackChapterAnalysis` juga).

**Dashboard:** tidak berubah dari v2 — badge `{tier} {pathwayNoun}` + indikator "(hipotesis — First Trial)" selama trial.

**Definition of done Task 5 v3 (menggantikan DoD v2):**
- [x] Step 1 (Nama + Privacy Promise) satu layar dengan checkbox, bukan dua step terpisah
- [x] Radar chart 8 sumbu, default 5/5/5..., total SELALU TEPAT 40 (integer-exact, bukan proportional-lalu-round yang drift), redistribusi zero-sum saat satu sumbu ditarik
- [x] Growth Focus (multi-select kategori) TIDAK ada — digantikan radar chart
- [x] Step statis Situasi/Values/Fear TIDAK ada — digantikan Adaptive Questions
- [x] Adaptive Questions minimal 4, maksimal 10, AI berhenti lebih awal kalau sudah cukup yakin (batas ditegakkan di kode)
- [x] Chapter Analysis menampilkan insight + Pathway Recommendation + Secondary Trait (opsional)
- [x] Tombol "Mulai First Trial" DAN link override "Bukan ini" dua-duanya ada dan berfungsi
- [x] Override tetap masuk status `trial`, bukan langsung `active`
- [x] Growth-gate 12-kata tidak regresi
- [x] Secondary Trait tidak dapat Identity Maturity ladder atau alokasi quest sendiri
- [x] Setelah 14 hari, ada logic resonance-check yang mengaktifkan Pathway atau memperpanjang trial (tidak berubah dari v2, sudah diverifikasi lewat simulasi tanggal)
- [x] Akun v2 yang sudah ada (growth_focus terisi, radar_snapshot kosong) tetap dapat quest harian yang berfungsi setelah migrasi — dites eksplisit, bukan diasumsikan
- [x] Growth-gate, crisis-detection, isolasi 2-akun dites ulang eksplisit setelah perubahan v3

## 10. Task 6 — Prompt caching (setelah Task 5, tidak diblokir gate lain)

**Alasan:** system prompt Eleva (`MENTOR_SYSTEM` — instruksi nada mentor, aturan Goodhart's Law, dsb) SAMA di setiap panggilan API, baik onboarding maupun harian. Tanpa caching, bagian yang sama ini dibayar penuh berulang-ulang di setiap panggilan.

**Implementasi:** `system: MENTOR_SYSTEM` (string) di `callClaude` (`server/claude.js`) diganti `system: [{type:"text", text: MENTOR_SYSTEM, cache_control:{type:"ephemeral"}}]`. Bagian yang beda-beda tiap panggilan (konteks personal pengguna, riwayat refleksi) TETAP dikirim fresh di `messages`, tidak ikut di-cache.

**Catatan penting soal ambang minimum cache:** model `claude-sonnet-4-6` yang dipakai butuh **minimum 1024 token** di prefix yang di-cache supaya benar-benar tersimpan — di bawah itu, `cache_control` TIDAK error, cuma diam-diam tidak pernah menghasilkan cache hit (`cache_read_input_tokens` tetap 0 selamanya). `MENTOR_SYSTEM` versi v3 (setelah ditulis ulang buat Task 5) diperkirakan ~650-700 token — MASIH DI BAWAH ambang 1024. Kode `cache_control` tetap dipasang (tidak ada biaya tambahan kalau tidak ke-cache), tapi cache hit belum akan muncul sampai system prompt bertambah panjang secara natural — BUKAN ditambal artifisial cuma buat lewat ambang. Ini dilaporkan jujur, bukan diklaim "selesai" begitu saja.

**Definition of done:**
- [x] System prompt di `server/claude.js` pakai cache control Anthropic (`cache_control: {type:"ephemeral"}`)
- [x] `callClaude` expose `data.usage` (sebelumnya dibuang sama sekali) supaya `cache_read_input_tokens`/`cache_creation_input_tokens` bisa dicek — di-log tiap panggilan
- [ ] Verifikasi lewat response API bahwa cache hit benar-benar terjadi di panggilan kedua dst — BELUM bisa diverifikasi di sesi ini (sandbox lokal tidak punya `ANTHROPIC_API_KEY` aktif, dan estimasi token system prompt saat ini di bawah ambang minimum cache 1024 token). Perlu dicek ulang begitu jalan di production dengan API key nyata, dan/atau setelah system prompt bertambah panjang.
- [x] Tidak ada perubahan perilaku/kualitas output AI akibat caching — ini murni optimasi biaya, bukan perubahan konten prompt

## 11. Eksplisit DI LUAR scope sesi ini

- **Payment/billing** (Midtrans/Xendit dsb) — beta ini gratis, monetisasi baru dipikirkan setelah pilot selesai. Model bisnisnya SUDAH diputuskan (lihat bagian 12) tapi implementasinya jangan dikerjakan sekarang.
- Magic link / OAuth login — email+password dulu cukup.
- Flow lupa password.
- Side Quest, Social Quest, Career Quest, Exploration Quest (masih Main Quest saja).
- Redesign visual besar-besaran.
- Kebijakan privasi hukum formal (cukup notice minimal di Task 4).

Kalau merasa salah satu di atas "sekalian aja dikerjakan", tahan dulu — tanyakan ke pengguna dulu.

## 12. Model monetisasi — SUDAH DIPUTUSKAN, BELUM DIBANGUN (referensi untuk nanti, bukan task sesi ini)

Dicatat sekarang supaya keputusannya nggak hilang, TAPI implementasinya (payment gateway, dsb) tetap di luar scope sesi ini (lihat bagian 11). Baca sebelum ada yang mulai membangun fitur monetisasi kapan pun nanti.

**Struktur: Freemium "asli tapi terbatas"** — BUKAN "gratis = template, bayar = personal". Ide awal yang DITOLAK: versi gratis pakai respons template/generik, versi bayar baru dapat AI personal asli — ditolak karena momen "AI ini beneran ngerti aku" adalah yang bikin orang mau upgrade; kalau ditahan di balik paywall, pengguna gratis nggak akan pernah merasakan alasan untuk upgrade.

Struktur yang benar — beda di KEDALAMAN/FITUR, bukan di KEASLIAN personalisasi:

| | Gratis | Berlangganan |
|---|---|---|
| Quest/Acting Method | Asli, AI beneran generate (dengan prompt caching aktif) | Asli, sama |
| Frekuensi | 1/hari, tetap | Sama |
| Pathway & First Trial | Terkunci atau versi ringan | Penuh (Identity Maturity, Secondary Trait) |
| Riwayat & Chapter Analysis | Terbatas (mis. 7 hari terakhir) | Penuh, tersimpan selamanya |

**Harga acuan yang sedang dipertimbangkan founder:** ~Rp50.000/bulan/user. Berdasarkan kalkulasi biaya Sonnet (lihat bagian 1), ini punya margin sehat bahkan tanpa Haiku.

**Catatan platform:** Apple/Google App Store memotong komisi dari transaksi in-app (umumnya 30%, bisa lebih rendah untuk developer kecil tergantung kebijakan yang berlaku saat itu — cek App Store Connect / Google Play Console mendekati waktu launch, kebijakan ini berubah dari waktu ke waktu).

## 13. Definition of done untuk sesi ini (Task 0-4; Task 5 & 6 punya DoD sendiri di atas dan statusnya terpisah)

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
