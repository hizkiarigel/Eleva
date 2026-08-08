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

## 9. Task 5 — Pathway di onboarding: adaptif, direkomendasikan AI (v5, SELESAI — menggantikan desain v3 di bawah)

**Riwayat (kenapa desain ini berubah EMPAT kali — detail lengkap di riwayat versi Bible Bab 15):**

- **v1 (implementasi pertama, di-supersede total):** Pathway dipilih manual dari 6 kartu statis di akhir onboarding. Draft PRD alternatif yang mengusulkan "identity is discovered, not chosen" (AI hypothesis + resonance scoring + auto-activate diam-diam setelah 14 hari) DITOLAK sadar saat itu — dianggap menghapus agency pengguna, bertentangan dengan FP1 dan Bible v1.3 Bab 13.
- **v2 (di-supersede total — sumber: `Eleva_PRD.pdf` + `ELEVA_Constitution_Product_Bible_v1.4.docx` Bab 13):** Bible v1.4 mengklarifikasi bahwa contoh yang memicu penolakan di v1 ("jiwa analis melatih diri jadi sales") sebenarnya soal kebutuhan Acting Method, bukan soal mekanisme pemilihan Pathway itu sendiri. Begitu dipisah, tidak ada kontradiksi dengan FP1 — Pathway direkomendasikan AI dari hipotesis, jalur override manual tetap wajib ada, Pathway baru berstatus "trial" sampai terbukti resonan. v2 menambahkan: Situasi/Values/Fear (dipertahankan sebagai step statis terpisah), Stats sebagai polygon 0-100 (default 50), Growth Focus (multi-select 1-3 dari 10 kategori tetap), dan 3 Adaptive Question TETAP (jumlah fixed).
- **v3 (di-supersede oleh v4 di satu titik — revisi kedua dari draft Task 5, ditulis SETELAH founder review langsung terhadap implementasi v2 yang sempat berjalan di production):** Growth Focus (multi-select kategori) DIGANTI TOTAL oleh radar/polygon self-assessment 8-sumbu yang SAMA dipakai buat Stats — bentuk radar chart itu sendiri (sumbu mana yang menonjol/ditekan) yang jadi sinyal minat/fokus, jadi tidak ada dua mekanisme redundan buat hal yang sama. Situasi/Values/Fear (yang di v2 eksplisit dipertahankan atas instruksi founder) DIHAPUS TOTAL — isinya digali lewat percakapan adaptif dinamis, bukan pertanyaan statis lagi. Jumlah pertanyaan adaptif jadi FLEKSIBEL 4-10 (bukan fixed 3), format free-text (user mengetik jawaban). Filosofi inti (Pathway direkomendasikan AI + override manual + status trial 14 hari) TIDAK berubah dari v2.
- **v4 (MENGGANTIKAN v3 di format pengumpulan konteksnya saja — sisanya identik):** free-text Adaptive Questions diganti **Adaptive Statement Cards** — AI generate SATU PERNYATAAN orang-pertama per kartu, pengguna cukup **thumbs up ("ini aku") / thumbs down ("bukan aku")**, tidak mengetik apa pun. Terinspirasi tes Ikigai TAPI dengan beda krusial yang PRD tekankan eksplisit: pernyataan WAJIB di-generate AI per pengguna (dari radar chart + histori swipe orang itu), BUKAN bank pernyataan statis yang sama untuk semua orang — kalau statis, ini jadi "tes kepribadian" generik yang sudah ditolak sebelumnya. Format kartu+swipe SUDAH dikonfirmasi eksplisit oleh founder; range 4-10-nya masih keputusan default dari rekomendasi Claude (belum dikonfirmasi vs fixed 10, ditandai komentar di kode supaya gampang diubah). Jumlah panggilan API SAMA seperti v3 — cuma format input pengguna yang jadi lebih cepat.
- **v4.1 (spesifikasi tambahan radar dari review founder terhadap implementasi live, sisanya identik dengan v4):** (1) angka nilai (1-10) tampil di tiap titik radar, bukan cuma posisi visual; (2) **fitur kunci maksimal 3 titik** — tap titik untuk mengunci, titik terkunci TIDAK ikut redistribusi zero-sum saat titik lain digeser (batas 3 disengaja: memaksa prioritas nyata, "orang nggak bisa mau semuanya" — mau kunci titik ke-4 harus buka salah satu dulu); (3) kombinasi ekstrem (mis. Body=10 DAN Social=10 sekaligus) jadi MUNGKIN kalau dua-duanya dikunci — total tetap 40, sisa 6 titik yang belum dikunci berbagi 20 dan saling redistribusi normal di antara mereka sendiri; (4) DILARANG ada rumus/lookup tetap di kode soal "makna" kombinasi tertentu — info titik terkunci masuk sebagai KONTEKS ke prompt statement card (AI boleh arahkan kartu berikutnya menggali spesifik kombinasi ekstrem kalau pola swipe belum menjelaskan) dan prompt Chapter Analysis (wajib mengaitkan interpretasi kombinasi ke respons kartu aktual, bukan generalisasi karangan sendiri).
- **v4.2 (SESI INI — algoritma redistribusi v2 berbasis evidence sinergi, menggantikan mekanisme redistribusi sebelumnya; UI/lock/kartu tidak berubah):** riwayat resmi dari PRD — v0 (yang sempat production) berperilaku "equal-split" (semua sumbu unlocked cenderung dipaksa rata; ditandai founder sebagai bug), v1 = proporsional murni ke nilai saat ini, v2 (final) = pakai bukti riset untuk 15 dari 28 pasangan sumbu yang punya evidence (`SYNERGY` matrix di `public/app.js`: weight kuat=3/sedang=2/lemah=1, direction searah/berlawanan), proporsional murni untuk sisanya. Saat sumbu X digeser sebesar delta: partner ber-evidence ikut tertarik SETARA delta itu sendiri dibagi menurut bobot (BUKAN dijumlah independen per partner — mode gagal yang didokumentasikan PRD sendiri: satu gesekan kecil bisa minta belasan poin dari sumbu sisa), non-partner menyerap sisa beban proporsional ke nilai mereka saat ini; kalau ada titik yang bakal keluar [1,10], SELURUH delta di-skala-turun seragam (constraint-solving real-time, bukan clamp satu titik); pembulatan largest-remainder ke semua 8 titik sekaligus di akhir supaya total tetap presisi 40; titik terkunci tak tersentuh di langkah mana pun. Konsekuensi DISENGAJA yang diverifikasi persis cocok dengan hitungan manual PRD: **Career sendirian mentok di ≈7.8 (dibulatkan 8) dan TIDAK PERNAH bisa 10** (Career punya evidence ke semua sumbu lain kecuali Finance, peredam kejut satu-satunya) — kalau QA menemukan Career bisa 10, itu tanda algoritmanya salah; Body sendirian bisa ≈9.9. Saat mentok ada feedback: getar halus (kalau device support) + teks singkat di bawah chart ("X udah di titik paling jauh yang bisa dicapai bareng kombinasi sekarang"), titik berhenti mengikuti jari di nilai maksimal yang valid — bukan macet diam-diam. Catatan: PRD merujuk `reference/Eleva_Correlation_Matrix.html` untuk sitasi lengkap tiap pasangan — file itu BELUM disertakan/ter-attach, jadi belum bisa dimasukkan ke repo; bobot+arah di kode diambil persis dari matriks di PRD, tanpa mengarang sitasi.
- **v4.3 (SESI INI — bug fix constraint-solving dari testing manual founder, UI/lock/kartu/algoritma sinergi tidak berubah selain ini):** bug ditemukan founder saat testing: reproduksi `{body:10(locked), mind:6, career:4, finance:6, emotional:6, purpose:6, explorer:1, social:1}` (total 40), geser Explorer +1 saja DITOLAK TOTAL ("sudah di titik terjauh") padahal Explorer punya ruang gerak nyata. Akar masalah: constraint-solving v4.2 memakai SATU faktor skala global — begitu satu non-partner (Social, sudah di floor 1 dari drag sebelumnya) kedeteksi butuh ruang yang sudah 0, faktor skala itu jatuh ke 0 untuk SELURUH gesekan, bukan cuma sumbu yang mentok itu. Fix: tambah **pass saturasi berulang** sebelum constraint-solving lama — sumbu (partner ATAU non-partner) yang SUDAH persis di batas (ruang gerak 0, independen dari besar delta) dikeluarkan dari pool (dipatok, kontribusinya ke `totalBurden` dihapus kalau partner), sisanya dihitung ulang, diulang sampai stabil (maks `others.length` iterasi, dijamin berhenti). Constraint-solving uniform yang lama (skalakan turun SELURUH delta) TETAP dipakai persis seperti sebelumnya untuk sumbu yang match SEBAGIAN ruang gerak (bukan yang sudah 0 dari awal) — jadi Career tetap mentok ≈7.8, Body tetap ≈9.9, tidak ada regresi. Diverifikasi: reproduksi persis founder di atas → Explorer sekarang bisa naik (dites lewat pointer event asli di browser, bukan cuma fungsi murni). Catatan jujur: estimasi founder di laporan bug ("Explorer harusnya bisa sampai ≈8.5") cuma menghitung non-partner (Finance+Emotional+Purpose) sebagai batas — tapi Mind (partner terkuat Explorer, bobot 3 dari total 4) mentok DULUAN di ceiling-nya sendiri (base 6, ruang 4) pada delta≈5.33, sebelum non-partner manapun mentok floor di delta 7.5 — jadi angka yang benar (dan diverifikasi lewat constraint-solving uniform yang sudah ada, sesuai spek "skalakan turun SELURUH delta ... sampai seluruh sistem valid" di v4.2) adalah Explorer mentok ≈6.3 (dibulatkan 6), bukan ≈8.5 — tetap jauh lebih baik dari macet di 1, dan sepenuhnya taat ke mekanisme constraint-solving yang sudah didokumentasikan, bukan penyimpangan baru.
- **v5 (SESI INI — restrukturisasi 7 elemen MECE per Bible v1.5 + algoritma re-normalisasi satu pool per revisi PRD terbaru; kartu/analysis/First Trial tidak berubah):** radar 8 sumbu → **7 sumbu MECE**: Body, **Growth** (gabungan Mind+Explorer — Openness & Intellect satu faktor Big Five), **Livelihood** (gabungan Career+Finance — salary komponen inti definisi career success), Emotional Stability, Social, Purpose, **Autonomy** (BARU — rasa kendali atas keputusan & arah hidup, Self-Determination Theory). Default 5, total **SELALU 35** (7×5). `SYNERGY` dibangun ulang: **14 dari 21 pasangan ber-evidence terarah** (semuanya positif — dua pasangan negatif lama terserap jadi "campuran" saat merge; mekanik `direction:-1` tetap tersedia di kode), 3 campuran (evidence komponen bertabrakan: body|livelihood, emotional|livelihood, body|social — non-partner, menyerap netral), 4 belum ketemu (growth|emotional, growth|social, growth|purpose, social|autonomy); sitasi lengkap per pasangan sekarang benar-benar ada di `reference/Eleva_Correlation_Matrix.html` (file akhirnya disertakan founder, ikut di-commit ke repo bersama `reference/ELEVA_Constitution_Product_Bible_v1.5.docx`). **Algoritma redistribusi diganti re-normalisasi SATU pool** (formula 5-langkah dari PRD, dipilih karena riwayat git founder eksplisit: era 8-elemen sempat menemukan Career punya NOL non-partner begitu Career|Finance ber-evidence — formula dua-tahap lama membeku total di topologi itu, makanya "normalized redistribution formula guaranteeing exact zero-sum regardless of partner count"): saat sumbu X digeser delta, SEMUA sumbu lain yang belum terkunci jadi satu pool dan totalnya berubah PERSIS −delta, dibagi sebanding kekuatan tarik masing-masing — partner: `weight × direction`; non-partner (termasuk campuran): nilai saat ini — tanpa percabangan topologi. Konsekuensi yang berubah dari era v4.2 dan DISENGAJA per PRD baru: tidak ada lagi "Career tidak pernah bisa 10" — batas maksimal tiap sumbu sekarang murni dari zero-sum budget 35 (mis. Autonomy — 5 partner, cuma Social non-partner murni — bisa mencapai 10 dengan mulus, Social tidak lagi dibebani 2×delta sendirian seperti formula lama). Pass saturasi v4.3 (sumbu yang sudah mentok dikecualikan dari pool, sisanya menyerap ulang) dan constraint-solving skala-seragam + largest-remainder (ke 35) + lock + feedback getar/teks semuanya dipertahankan. **Migrasi data production: TIDAK ADA** (keputusan PRD eksplisit — belum ada beta member asli): akun era 8-sumbu tetap jalan read-only apa adanya (dashboard menampilkan stats lama dengan label legacy, AI tetap membaca snapshot lama), jalur resminya reset (tombol ↺ di dashboard, menghapus `character_state`+`days`) lalu onboarding ulang 7 elemen. Viewbox SVG dilebarkan (332→368) karena heptagon menaruh label "Livelihood" di sudut nyaris horizontal yang kepotong di padding lama.

**Alur onboarding final v5:**
1. **Nama + Privacy Promise digabung jadi SATU layar** (v2 punya ini sebagai dua step terpisah) — field nama, di bawahnya langsung teks *"Semua yang kamu ceritakan di sini hanya untuk kamu dan Eleva."* + checkbox konfirmasi ("Aku mengerti dan siap mulai").
2. **Radar self-assessment — 7 SUMBU MECE** (Body, Growth, Livelihood, Emotional Stability, Social, Purpose, Autonomy — lihat riwayat v5 di atas untuk asal-usul merger & Autonomy), skala **1-10**, default **5 tiap sumbu**, total **SELALU TEPAT 35** (7×5), zero-sum. Angka nilai tampil di dalam tiap titik; tap titik = kunci/buka kunci (maksimal 3 terkunci, ikon 🔒 + caption "N/3 terkunci"); titik terkunci tidak bisa digeser dan tidak tersentuh redistribusi titik lain. Redistribusi memakai **re-normalisasi satu pool** (riwayat v5): semua sumbu unlocked lain berubah total persis −delta sebanding kekuatan tariknya (partner: bobot evidence; non-partner: nilai saat ini), sumbu yang sudah mentok dikecualikan dari pool, constraint-solving skala-turun seragam, largest-remainder menjaga total presisi 35, feedback getar+teks saat mentok. Interaksi tap-vs-drag dibedakan lewat ambang gerak ~8px (keputusan implementasi, PRD cuma bilang "lewat ikon/tap di titik"). Info lock TIDAK dipersist ke Postgres (skema tetap hanya `radar_snapshot` nilai sumbu) — dipakai sebagai konteks selama onboarding, dan maknanya terserap ke `originStory` naratif. **Migrasi 8→7: tidak ada** — akun lama reset lalu onboarding ulang (keputusan PRD).
3-N. **Adaptive Statement Cards, jumlah FLEKSIBEL 4-10** (gantikan free-text Adaptive Questions v3, DAN tetap gantikan step statis Situasi/Values/Fear v2 yang dihapus) — kartu #1 dari radar chart (sumbu paling menonjol/ditekan); kartu #2 dst dari radar + SEMUA respons kartu sebelumnya: thumbs up = gali lebih spesifik ke arah itu, thumbs down = AI coba sisi lain. Tiap kartu 1x panggilan API dengan context penuh sejauh ini. Data tiap kartu disimpan sebagai pasangan `{statement, response: "up"|"down"}` (client-state sampai commit akhir — struktur ini yang dikirim ke Chapter Analysis, bukan teks naratif). AI berhenti lebih awal begitu pola swipe cukup konsisten (minimal 4, maksimal 10 dipaksa berhenti) — **range-nya keputusan default dari rekomendasi Claude, founder belum eksplisit konfirmasi vs fixed 10 (ditandai komentar di kode); format kartu+swipe-nya sendiri SUDAH dikonfirmasi founder.**
N+1. AI Thinking (layar loading singkat: *"Aku sedang mencoba memahami ceritamu..."*)
N+2. Chapter Analysis — mekanisme tidak berubah dari v2/v3: insight naratif + Pathway Recommendation (6 nama yang sama: Builder/Guardian/Explorer/Connector/Seeker/Specialist) + Secondary Trait opsional. Inputnya sekarang radar chart FINAL **termasuk sumbu mana yang dikunci pengguna** + semua pasangan statement+respons. Kalau ada 2-3 titik terkunci di nilai tinggi (kasus ekstrem), prompt eksplisit meminta AI mengaitkan kombinasi itu ke respons kartu aktual pengguna, bukan mengarang generalisasi sendiri.
N+3. Konfirmasi — **tidak berubah dari v2/v3**: tombol utama "Mulai First Trial (14 hari)" ATAU link sekunder "Bukan ini — aku tahu persis mau melatih apa" (override bebas teks). Override tetap masuk First Trial 14 hari yang sama.

**First Trial (14 hari) — tidak berubah dari v2:** Pathway baru (rekomendasi AI ATAU override) mulai `pathway_status='trial'`. Growth-gate 12-kata tetap berlaku penuh. Resonance-check lazy di `GET /api/state`: `≥14 hari` DAN `≥5 growth session` → `'active'` permanen. Belum cukup → tetap `'trial'`. Traceable ke data refleksi nyata.

**Perubahan schema Postgres** (di atas kolom `pathway`/`pathway_noun`/`pathway_status`/`pathway_trial_started_at`/`secondary_trait` dari v2 yang tetap dipakai): `character_state` nambah `radar_snapshot jsonb` (nilai sumbu 1-10 saat onboarding — 7 sumbu MECE sejak v5; baris era 8-sumbu tetap membawa 8 kunci lamanya sampai akunnya reset — disimpan sebagai object bukan array, karena array ke kolom jsonb tidak auto-encode benar oleh `pg`, pernah kejadian bug ini di v2 dengan `growth_focus`). Kolom `growth_focus` dari v2 TIDAK dihapus (aman ke baris v2 yang sudah ada), cuma berhenti ditulis untuk user baru.

**Kolom `stats` (0-100, digrow refleksi harian) vs `radar_snapshot` (1-10, baru):** dua kolom terpisah, skala beda. `stats` diisi dari `radar_snapshot × 10` sekali saat `POST /api/profile` (server-side). `radar_snapshot` disimpan mentah sebagai rekaman beku dari yang digambar pengguna.

**Konteks quest harian pengganti Situasi/Values/Fear yang dihapus:** `profile` server-side jadi `{name, createdAt, originStory}` — `originStory` diisi dari `insight` hasil Chapter Analysis, dipakai gantiin `profile.situation` v2 di context AI harian. Akun v2 yang sudah ada (termasuk akun founder) tidak retroaktif dapat `radar_snapshot`/`originStory` — fallback eksplisit di semua titik pembuatan context AI (`radarSnapshot: state.radarSnapshot || undefined` bersanding `growthFocus: state.growthFocus || undefined`, `originStory: profile.originStory || profile.situation`) supaya akun lama tidak mendadak kehilangan "kompas"-nya begitu v3 di-deploy.

**Route:** `POST /api/onboarding/statement-card` (ganti nama dari `adaptive-question` v3, body `{profile, radarSnapshot, previousCards}`), `POST /api/onboarding/chapter-analysis` (body `{profile, radarSnapshot, cards}`). `POST /api/profile` tetap satu-satunya titik commit ke DB — kartu-kartunya sendiri TIDAK dipersist ke Postgres, yang dipersist tetap `originStory` (insight Chapter Analysis) + `radar_snapshot`.

**`server/claude.js`:** `generateStatementCard(ctx)` (ganti dari `generateAdaptiveQuestion` v3) balas `{statement: string|null, confident: boolean}` — batas minimal 4/maksimal 10 DITEGAKKAN DI KODE (server), bukan dipercaya penuh dari `confident` yang dikembalikan model — sama prinsip defense-in-depth dengan crisis-detection dan growth-gate. Prompt-nya eksplisit melarang bank pernyataan generik dan melarang mengulang pernyataan sebelumnya; semantik swipe (up = gali lebih dalam, down = coba sisi lain, penolakan juga informasi) tertulis di prompt kartu DAN prompt Chapter Analysis. `MENTOR_SYSTEM` tidak berubah dari v3 (sudah netral soal mekanisme onboarding). Fallback (tanpa API key): selalu berhenti tepat di 4 pernyataan deterministik, personalisasi murah dari sumbu radar tertinggi (`RADAR_AXIS_TO_PATHWAY` tetap buat `fallbackChapterAnalysis`).

**Dashboard:** tidak berubah dari v2 — badge `{tier} {pathwayNoun}` + indikator "(hipotesis — First Trial)" selama trial.

**Definition of done Task 5 v5 (7 elemen MECE — dari PRD founder revisi terbaru; menggantikan DoD v4.x untuk butir-butir radar):**
- [x] Radar chart **7 sumbu MECE** (Body, Growth, Livelihood, Emotional Stability, Social, Purpose, Autonomy), default 5 semua, **total selalu 35**, redistribusi PROPORSIONAL/terbobot ke sumbu unlocked lain (bukan rata/equal-split)
- [x] Verifikasi variasi: dua drag berturut-turut ke arah berbeda → titik unlocked lain menunjukkan nilai berbeda-beda, bukan identik
- [x] Total tetap 35 setelah pembulatan (largest-remainder ke 7 titik sekaligus; fuzz 3000 sekuens drag acak + lock acak: selalu tepat 35, semua integer 1-10)
- [x] Reproduksi bug founder edisi 7-elemen: Body dikunci 10, Social ditekan ke 1, Growth dinaikkan dari titik rendah → BISA naik (sampai ceiling 10 sekalipun) selama Livelihood/Emotional/Purpose masih di atas floor; Social yang sudah floor dikecualikan dari pool, TIDAK memblokir gesekan — dites unit + pointer event asli di browser
- [x] Geser Autonomy sendirian ke maksimal (kasus paling terhubung: 5 partner, cuma Social non-partner murni) — mencapai 10, total tetap persis 35, Social tidak dibebani berlebihan (re-normalisasi satu pool, bukan 2×delta ke non-partner saja)
- [x] Geser Livelihood sendirian ke maksimal — total tetap PERSIS 35; tidak ada lagi partner negatif (dua pasangan negatif lama terserap jadi campuran saat merge), batas maksimal murni dari zero-sum
- [x] Kunci 2-3 titik di nilai tinggi, dorong titik lain — pergerakan dibatasi wajar begitu budget 35 mendekati habis (dites: 2 lock @10 → Growth mentok 8; 3 lock @10 → sisa 5 poin, gerakan nyaris nol), dengan feedback getar+teks, bukan macet diam-diam
- [x] Elemen ber-partner banyak (Emotional: 4 partner) digeser +3 → total dampak ke non-partner ≈ 1.4 poin (sebanding delta, BUKAN dijumlah independen per-partner yang bakal minta ~12)
- [x] Angka (1-10) tampil di tiap titik; kunci maksimal 3 berfungsi; kombinasi ekstrem tetap mungkin dan masuk context Chapter Analysis tanpa rumus makna tetap di kode (semua tidak berubah dari v4.x, diverifikasi ulang di heptagon)
- [x] `reference/Eleva_Correlation_Matrix.html` + `ELEVA_Constitution_Product_Bible_v1.5.docx` ikut di-commit ke `reference/` (akhirnya disertakan founder)
- [x] Akun era 8-sumbu: TIDAK dimigrasikan (keputusan PRD) — dashboard menampilkan stats lama dengan label legacy tanpa NaN/undefined (dites lewat injeksi SQL akun 8-kunci + browser), jalur resmi = reset → onboarding ulang
- [x] Growth-gate 12-kata + crisis-detection dites ulang setelah v5 — tidak regresi (refleksi pendek: tanpa growth; frasa krisis: mentorReply → 119 ext 8/Sejiwa, deltas kosong)

**Definition of done khusus bug fix v4.3 (HISTORIS — era 8 sumbu; angka-angka spesifiknya digantikan oleh DoD v5 di atas):**
- [x] Reproduksi persis dari laporan founder (`body:10 locked, mind:6, career:4, finance:6, emotional:6, purpose:6, explorer:1, social:1`) — geser Explorer +1 TIDAK lagi ditolak total, sekarang berhasil (dites lewat pointer event asli di browser, plus fungsi murni)
- [x] Sumbu yang sudah di floor/ceiling (seperti Social=1 di atas) TIDAK memblokir pergerakan sumbu lain sama sekali — dikecualikan dari pool, sisanya tetap menyerap dan delta tetap jalan
- [x] Setelah fix, semua test case constraint-solving v4.2 lain diulang — tidak ada regresi: Body max ≈9-10, Career max ≈7-8 (tidak pernah 10), Purpose+3 dibagi terbobot bukan dijumlah independen, lock flow, feedback getar+teks saat benar-benar mentok
- [x] Kasus saturasi berantai (dua sumbu non-partner sudah di floor sekaligus) diuji lewat fuzz — tidak macet, total tetap 40
- [x] Fuzz 2000 gesekan acak dari state awal acak (termasuk lock 1-3 sumbu) — total selalu tepat 40, semua integer 1-10, tidak pernah gagal
- [x] Tidak ada regresi di growth-gate, crisis-detection, isolasi 2-akun (tidak disentuh sesi ini, di luar scope perubahan)

**Definition of done Task 5 v4.2 (HISTORIS — era 8 sumbu; butir radar/angka spesifik digantikan DoD v5, butir kartu/analysis/trial tetap berlaku):**
- [x] Step 1 (Nama + Privacy Promise) satu layar dengan checkbox, bukan dua step terpisah
- [x] Radar chart 8 sumbu, default 5/5/5..., total selalu 40, perubahan satu sumbu mendistribusi ulang sumbu lain yang BELUM terkunci secara PROPORSIONAL/terbobot (bukan rata/equal-split — bug versi production sebelumnya, sudah diganti)
- [x] Verifikasi eksplisit variasi: setelah geser, titik-titik unlocked lain menunjukkan nilai berbeda-beda, BUKAN selalu identik satu sama lain (dites: 4 nilai distinct setelah satu drag Career)
- [x] Total tetap selalu 40 meski setelah pembulatan (largest-remainder ke 8 titik sekaligus, bukan pembulatan naif per-titik — fuzz 1000 drag acak: selalu tepat 40, semua integer 1-10)
- [x] Geser Body sendirian ke maksimal — berhenti di ≈9.9 (2 non-partner: Explorer, Social) — dites unit + browser
- [x] Geser Career sendirian ke maksimal — berhenti di ≈7.8 (dibulatkan 8), TIDAK PERNAH mencapai 10 (cuma 1 non-partner: Finance) — dites unit + browser, cocok persis dengan hitungan manual PRD
- [x] Kunci sumbu lalu dorong sumbu ber-evidence negatif ke tinggi — sistem menahan lewat constraint-solving (dites: Body dikunci 10, Career mentok di 7), bukan diam-diam membiarkan kombinasi mustahil
- [x] Saat titik mentok, ada feedback (getar kalau didukung + teks) — bukan berhenti diam-diam atau macet
- [x] Purpose (4 partner) digeser +3 — total dampak ke non-partner = 2×delta = 6 poin (dibagi terbobot, BUKAN dijumlah independen per-partner) — dites unit, cocok dengan contoh PRD
- [x] Angka (1-10) tampil di tiap titik radar, bukan cuma posisi visual
- [x] Fitur kunci maksimal 3 titik berfungsi: titik terkunci tidak berubah nilainya akibat redistribusi titik lain
- [x] Kombinasi ekstrem (2-3 titik terkunci tinggi sekaligus) tetap memungkinkan secara matematis, dan masuk sebagai context ke Chapter Analysis — TIDAK ada rumus/lookup table tetap yang otomatis menyimpulkan makna kombinasi tertentu di kode
- [x] Growth Focus (multi-select kategori) TIDAK ada — digantikan radar chart
- [x] Step statis Situasi/Values/Fear TIDAK ada — digantikan Adaptive Statement Cards
- [x] Adaptive Statement Cards minimal 4, maksimal 10, format kartu + thumbs up/down (BUKAN input teks bebas)
- [x] Tiap pernyataan kartu di-generate AI per pengguna dari radar chart + histori swipe — bukan bank pernyataan statis/hardcoded (fallback tanpa-API-key satu-satunya pengecualian, deterministik dan jujur soal keterbatasannya, sama seperti fallback quest/reflection yang sudah ada)
- [x] AI berhenti lebih awal kalau pola swipe sudah cukup konsisten (batas 4/10 ditegakkan di kode)
- [x] Chapter Analysis menampilkan insight + Pathway Recommendation + Secondary Trait (opsional)
- [x] Tombol "Mulai First Trial" DAN link override "Bukan ini" dua-duanya ada dan berfungsi
- [x] Override tetap masuk status `trial`, bukan langsung `active`
- [x] Growth-gate 12-kata tidak regresi
- [x] Secondary Trait tidak dapat Identity Maturity ladder atau alokasi quest sendiri
- [x] Setelah 14 hari, ada logic resonance-check yang mengaktifkan Pathway atau memperpanjang trial (tidak berubah dari v2/v3, sudah diverifikasi lewat simulasi tanggal)
- [x] Akun v2/v3 yang sudah ada tetap dapat quest harian yang berfungsi (kontrak server yang dipakai akun existing tidak berubah di v4; fallback kompas v2 dari putaran v3 tetap berlaku)
- [x] Growth-gate, crisis-detection, isolasi 2-akun dites ulang eksplisit setelah perubahan v4

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
