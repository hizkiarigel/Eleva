# Eleva — Web MVP (Beta)

AI Character Growth System. Alur: Daftar (kode beta) → Onboarding → AI Analysis → Daily Quest → Reflection → Dashboard.

Beta gratis, terbatas lewat kode undangan (`BETA_CODE`) — bukan pendaftaran terbuka. Postgres (multi-user), Express backend, vanilla JS frontend. Tanpa build step.

**Belum ada pembayaran/billing** — beta ini gratis sampai periode betanya selesai. Jangan diasumsikan ada monetisasi aktif.

## Jalanin di lokal

Butuh Postgres lokal (`createdb eleva_dev` atau setara).

```bash
npm install
cp .env.example .env
# isi ANTHROPIC_API_KEY, DATABASE_URL, BETA_CODE, SESSION_SECRET di .env — lihat komentar di .env.example
npm start
```

Buka `http://localhost:3000`. Tanpa akun, kamu akan diarahkan ke layar daftar/masuk — daftar butuh `BETA_CODE` yang cocok dengan env var-nya.

Tanpa `ANTHROPIC_API_KEY`, aplikasi tetap jalan — quest jadi generik (fallback), dan refleksi tidak menaikkan stat. Ini disengaja: tidak ada AI mentor sungguhan, tidak ada growth palsu.

## Struktur

```
server/
  index.js    → Express app + routes, semua route app di belakang auth middleware
  auth.js     → signup/login (bcrypt + BETA_CODE), dipanggil dari index.js
  db.js       → Postgres (pg), semua query di-scope per user_id
  claude.js   → panggilan ke Claude API + fallback kalau key belum ada / gagal
  safety.js   → deteksi frasa krisis, independen dari AI (lihat bagian Prinsip di bawah)
public/
  index.html, styles.css, app.js  → frontend vanilla JS, termasuk layar auth + privacy notice
reference/
  Eleva_Prototype.jsx  → prototype React yang jadi acuan fitur Pathway (bukan bagian dari app produksi)
```

## Auth & multi-tenant

- Email + password (di-hash pakai bcrypt), session lewat cookie httpOnly yang di-sign (`cookie-session`, secret dari `SESSION_SECRET`). Tidak ada magic link/OAuth, tidak ada flow lupa password — sengaja sederhana untuk beta terkontrol.
- Signup wajib isi `BETA_CODE` yang cocok dengan env var — cara paling sederhana buat batasi kecepatan pertumbuhan (dan biaya API) selama beta.
- Semua route data (`/api/state`, `/api/profile`, `/api/reflection`, `/api/reset`) ada di belakang middleware auth dan **selalu discope dari `req.userId` (session), bukan dari body/param request** — supaya user tidak bisa akses/ubah data user lain walau coba manipulasi request API langsung.
- Privacy notice singkat (bukan kebijakan privasi hukum formal) ditampilkan di layar daftar, wajib dicentang sebelum tombol daftar aktif.

## Prinsip desain yang tertanam di kode (bukan cuma di dokumen)

- **Growth butuh substansi** (`server/index.js`, `wordCount` gate): refleksi di bawah ~12 kata tidak pernah menaikkan stat, walau quest ditandai selesai. Lihat `ELEVA_Constitution_Product_Bible_v1.0.docx` bab 11 (Goodhart's Law).
- **Chapter tidak naik karena waktu/EXP**: hanya naik tiap kelipatan 5 sesi growth yang valid, dan hanya kalau AI menilai ada pergeseran pola nyata.
- **AI mentor, bukan terapis** (`server/claude.js`, system prompt + `server/safety.js`, deteksi server-side): dua lapis. Prompt AI diinstruksikan mengarahkan ke bantuan profesional kalau refleksi menunjukkan tanda krisis. Di atas itu, `POST /api/reflection` juga mengecek `text` terhadap daftar frasa risiko tinggi secara independen dari AI — kalau cocok, AI mentor tidak dipanggil sama sekali dan `mentorReply` diganti kontak Layanan Sejiwa/Healing119 (119 ext. 8 / www.healing119.id), tanpa growth untuk sesi itu. Lihat bab 12 di dokumen bible untuk kenapa ini penting sekarang sudah ada user lain selain founder.

## Onboarding & Pathway (adaptive, v2)

Onboarding: Nama → Private Promise → Situasi → Values → Fear → **Stats** (polygon 8-sisi interaktif, drag titik sudut — menarik satu titik naik mengecilkan 7 titik lain secara proporsional, bukan ke nol, karena manusia punya waktu/energi terbatas) → **Growth Focus** (multi-select 1-3 dari 10 preset, jadi kompas yang dipakai terus untuk Quest/Acting Method harian, bukan cuma sekali di onboarding) → 3x **Adaptive Question** (digenerate AI berurutan, tiap pertanyaan pakai jawaban sebelumnya sebagai context) → **Chapter Analysis** (insight naratif AI + rekomendasi Pathway dari 6 arah: Builder, Guardian, Explorer, Connector, Seeker, Specialist — plus Secondary Trait opsional, informasional saja) → konfirmasi: terima rekomendasi AI ("Mulai First Trial") ATAU override manual lewat teks bebas ("Bukan ini — aku tahu persis mau melatih apa").

Pathway baru (dari jalur mana pun) mulai berstatus **trial** (`pathway_status`), bukan langsung permanen. Growth-gate 12-kata tetap berlaku penuh selama trial. Setelah ≥14 hari **dan** ≥5 growth session asli, resonance-check (dievaluasi lazy tiap `GET /api/state`) otomatis mengaktifkannya permanen; kalau belum cukup data, trial diperpanjang — tidak ada skor AI tersembunyi, semuanya traceable ke data refleksi nyata. AI menurunkan `pathwayNoun` (satu kata benda peran, mis. "Closer" untuk pathway "Sales") sekali dan mempertahankannya persis sama setiap hari setelahnya — ditampilkan sebagai badge `{tier} {pathwayNoun}` di dashboard (`tier` dari `growthSessions` pembagi 3, beda dari kenaikan chapter yang pembagi 5), dengan penanda tambahan `(hipotesis — First Trial)` selama masih trial. AI juga memilih tiap hari apakah instruksinya berbentuk "Quest" (aksi konkret) atau "Acting Method" (praktik cara bersikap) berdasarkan Pathway & chapter — dua framing ini tidak pernah muncul bersamaan.

Akun yang sudah ada sebelum fitur ini (dibuat sebelum kolom `pathway`/`pathway_noun` ditambahkan) tidak retroaktif diminta pilih Pathway — badge-nya otomatis tidak tampil, instruksinya selalu mode "Quest". Bukan bug, sengaja tidak dikerjakan (di luar scope tanpa diminta).

Keterbatasan yang jujur dicatat: resonance-check 14-hari cuma diverifikasi lewat simulasi tanggal (`pathway_trial_started_at` dimundurkan manual di Postgres saat testing), belum lewat pengguna asli yang benar-benar menunggu 14 hari kalender.

## Deployment

Butuh Postgres (bukan lagi SQLite) + proses Node.js yang hidup terus. Panduan konkret:

- `DEPLOY_RAILWAY.md` — deploy dari GitHub repo, tambah Postgres service di project yang sama (`DATABASE_URL` otomatis ter-link).
- `DEPLOY_HOSTINGER.md` — kalau mau tetap di domain sendiri (subdomain di Hostinger Business/Cloud).

Sebelum benar-benar membagikan kode beta ke siapa pun: verifikasi 2 akun test terpisah, pastikan datanya tidak bocor lintas user sama sekali (termasuk lewat manipulasi request API langsung, bukan cuma lewat UI).

## Belum ada (sengaja, biar essential)

- Payment/billing (baru dipikirkan setelah periode beta selesai)
- Magic link/OAuth login, flow lupa password
- Side/Social/Career/Exploration quest (baru Main Quest)
- Kebijakan privasi hukum formal (baru notice minimal di layar daftar)
