# Deploy Eleva ke Railway

> **Catatan:** Section 1-6 di bawah ini riwayat deploy pertama (single-user, SQLite + Volume) — sudah selesai dan situsnya sudah live. Kalau kamu baru mulai deploy dari nol dengan kode yang sekarang (Postgres + auth), langsung ke **Section 7** setelah Section 1 (bikin project dari GitHub repo) — lewati Section 2-6, gantinya pakai Postgres bukan Volume+`DB_PATH`.

Cara tercepat buat dapat link publik Eleva. Railway platform khusus buat app kayak gini (Node.js + butuh disk yang nyantol terus antar-deploy) — tinggal connect ke GitHub, dapat link publik dalam hitungan menit, tanpa wizard rumit kayak di shared hosting.

## 0. Sebelum mulai

- Daftar akun di [railway.app](https://railway.app) — bisa pakai akun GitHub yang sama dengan `hizkiarigel/Eleva`. Ada free trial credit untuk mulai, nanti bayar sesuai pemakaian kalau lanjut dipakai.
- Siapkan `ANTHROPIC_API_KEY` dari [console.anthropic.com](https://console.anthropic.com).

## 1. Buat project dari GitHub repo

1. Login ke railway.app → **New Project**.
2. Pilih **Deploy from GitHub repo**.
3. Authorize Railway ke akun GitHub kamu kalau diminta, lalu pilih repo `hizkiarigel/Eleva`.
4. Railway otomatis mendeteksi ini project Node.js dari `package.json` dan langsung mulai build pertama. Build ini kemungkinan belum bisa dipakai penuh dulu (env var & storage belum diset) — lanjut ke langkah berikutnya, nanti di-redeploy.

## 2. Tambah Volume — WAJIB, jangan dilewat

Tanpa ini, `eleva.db` hilang tiap kali Railway redeploy (sama seperti risiko yang dijelaskan untuk Vercel/Netlify di README — defaultnya filesystem tidak persisten).

1. Buka service Eleva yang baru dibuat → tab **Settings** → bagian **Volumes**.
2. **Add Volume**, isi mount path: `/data`.
3. Simpan.

## 3. Set environment variables

Tab **Variables** di service Eleva, tambahkan:

| Key | Value |
|---|---|
| `ANTHROPIC_API_KEY` | (API key asli dari console.anthropic.com) |
| `DB_PATH` | `/data/eleva.db` |

`DB_PATH` ini yang mengarahkan database ke folder Volume tadi (kode Eleva sudah mendukung ini di `server/db.js`, fallback ke lokasi default kalau tidak diset). `PORT` **tidak perlu diisi** — Railway auto-inject dan `server/index.js` sudah baca `process.env.PORT` otomatis.

## 4. Redeploy & buka akses publik

1. Setelah Volume + Variables diset, trigger redeploy (biasanya otomatis, atau klik **Deploy** manual di tab Deployments).
2. Tunggu build selesai, cek **Deploy Logs** — pastikan tidak ada error, khususnya pastikan `npm install` sukses menginstal `better-sqlite3` (native module; Railway pakai container Linux standar jadi harusnya lebih konsisten daripada shared hosting, tapi tetap dicek).
3. Tab **Settings** → **Networking** → klik **Generate Domain** kalau belum ada domain publik. Railway kasih URL otomatis, bentuknya kira-kira `https://eleva-production-xxxx.up.railway.app`.
4. Buka URL itu di browser — harus muncul layar onboarding Eleva.

## 5. Verifikasi persistensi data

Volume Railway didesain persisten lintas deploy, tapi tetap dites sekali sebelum dipakai serius:

1. Selesaikan onboarding, isi 1 refleksi test, catat isinya.
2. Redeploy (push commit kecil ke `main`, atau redeploy manual di Railway).
3. Reload URL-nya — pastikan profil & refleksi tadi masih ada.

Kalau ternyata hilang, cek lagi apakah Volume di langkah 2 benar-benar ter-mount ke `/data` dan `DB_PATH` di langkah 3 sudah persis `/data/eleva.db`.

## 6. Opsional nanti: pakai domain sendiri

Kalau nanti mau pakai subdomain sendiri (misalnya `eleva.hkgroup.id`) daripada URL `*.up.railway.app`: tab **Settings** → **Networking** → **Custom Domain**, lalu tambahkan CNAME record yang diminta di DNS domain kamu. Belum perlu sekarang — tujuan awal cuma supaya UI/UX Eleva bisa diakses lewat satu link dulu.

## 7. Upgrade ke Postgres + Auth + Beta Gate

PRD berubah dari single-user jadi beta ~100 member — kode terbaru butuh Postgres (bukan lagi Volume + `eleva.db`) dan ada layar login/daftar. Situs yang sekarang live masih pakai kode lama sampai langkah ini selesai **dan** kode baru di-push ke `main`.

**Kerjakan urutan ini supaya tidak ada downtime** (kode baru butuh `DATABASE_URL` — kalau di-push sebelum Postgres siap, app akan crash karena tidak bisa connect ke database):

1. Di project Railway yang sama (bukan project baru): klik **New** → **Database** → **Add PostgreSQL**.
2. Railway biasanya otomatis mengaitkan `DATABASE_URL` ke service Eleva (variable reference antar-service). Cek di tab **Variables** service Eleva — kalau `DATABASE_URL` belum muncul, tambahkan manual dengan reference `${{ Postgres.DATABASE_URL }}` (pilih dari dropdown "Add Reference" di form variable).
3. Masih di tab **Variables** service Eleva, tambahkan 3 ini:

   | Key | Value |
   |---|---|
   | `BETA_CODE` | kode yang akan kamu bagikan ke calon beta member (bebas, contoh: `eleva-beta-agustus`) |
   | `SESSION_SECRET` | string acak panjang, generate misalnya via `openssl rand -hex 32` |
   | `NODE_ENV` | `production` |

4. Volume + `DB_PATH` yang lama boleh dibiarkan saja — sudah tidak dipakai kode baru, tapi tidak mengganggu apa-apa kalau tidak dihapus.
5. **Baru setelah 3 variable di atas siap**, kode baru di-push ke `main` (memicu redeploy otomatis).

**Setelah redeploy sukses:**
- Cek Deploy Logs — pastikan tidak ada error koneksi Postgres saat startup.
- Buka domain publiknya — sekarang harus muncul layar **Masuk**/**Daftar**, bukan langsung onboarding.
- **Wajib sebelum kode beta dibagikan ke siapa pun** (bukan opsional — ini gate keras dari PRD): daftar 2 akun test dengan email berbeda, isi onboarding berbeda di masing-masing, pastikan datanya sama sekali tidak ketuker antar akun.

## Catatan keamanan

Sekarang sudah ada login/auth (email + password + kode beta) — bukan lagi open-access seperti sebelumnya. Tetap jangan bagikan `BETA_CODE` di tempat publik (medsos, dsb) — hanya ke calon member yang memang diundang, supaya kecepatan pertumbuhan dan biaya API Claude tetap terkendali.
