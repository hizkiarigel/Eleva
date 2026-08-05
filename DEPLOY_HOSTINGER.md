# Deploy Eleva ke Hostinger (eleva.hkgroup.id)

Panduan ini untuk deploy Eleva ke akun Hostinger yang sudah ada (`hkgroup.id`), di subdomain `eleva.hkgroup.id` — bukan di root domain, supaya tidak menimpa website company profile yang sudah jalan di `hkgroup.id`.

Ini panduan untuk **paket Business/Cloud Hosting** (bukan VPS) — sesuai yang terlihat di hPanel akun ini (ada `PHP Worker` dan `Proses Maksimal` di Detail Hosting, yang cuma ada di paket shared/business/cloud, bukan VPS).

## 0. Sebelum mulai

- Pastikan kode terbaru sudah ke-push ke `github.com/hizkiarigel/Eleva` branch `main` (harusnya sudah, tapi cek dulu).
- Siapkan `ANTHROPIC_API_KEY` dari [console.anthropic.com](https://console.anthropic.com) — akan diisi sebagai environment variable, bukan di-commit ke kode.

## 1. Buat subdomain `eleva.hkgroup.id`

1. Login ke [hpanel.hostinger.com](https://hpanel.hostinger.com).
2. Website → pilih `hkgroup.id` → cari menu **Subdomains** (biasanya di bawah Domain/DNS).
3. Buat subdomain baru dengan nama `eleva` → jadi `eleva.hkgroup.id`.
4. Karena domain ini sudah pakai nameserver Hostinger, DNS-nya otomatis ke-setup, biasanya aktif dalam 5-15 menit.

## 2. Buat Node.js Web App

1. Di hPanel: **Websites** → **Add Website** (atau cari langsung menu **Node.js**).
2. Pilih opsi **Import Git Repository** (bukan upload zip — biar bisa update langsung dari GitHub nanti).
3. Authorize akses ke akun GitHub kamu kalau diminta, lalu pilih repo `hizkiarigel/Eleva`, branch `main`.
4. Isi konfigurasi:
   - **Application URL**: pilih `eleva.hkgroup.id` (subdomain yang baru dibuat di langkah 1), bukan root domain.
   - **Application startup file**: `server/index.js`
   - **Node.js version**: pilih versi LTS terbaru yang tersedia (idealnya 20 atau 22 — sudah dites lokal di Node v22, dan seharusnya kompatibel ke bawah sampai 18).
5. Simpan konfigurasi.

## 3. Set environment variable

Di halaman pengaturan app Node.js yang baru dibuat, cari bagian **Environment Variables**, tambahkan:

| Key | Value |
|---|---|
| `ANTHROPIC_API_KEY` | (API key asli dari console.anthropic.com) |

`PORT` **tidak perlu diisi manual** — kode Eleva sudah baca `process.env.PORT` otomatis (`server/index.js`), jadi otomatis mengikuti port yang di-assign Hostinger.

## 4. Deploy

1. Klik **Deploy** / **Create**. Hostinger akan clone repo, jalankan `npm install`, lalu start app.
2. **Cek log build/deploy** setelah selesai. Yang paling penting dicek: apakah `npm install` sukses menginstal `better-sqlite3` tanpa error.
   - `better-sqlite3` itu native module (bukan JS murni) — biasanya install lewat binary siap pakai (`prebuild-install`), tapi kalau environment Hostinger tidak punya versi yang cocok, instalasinya bisa gagal dan minta compiler C++ yang mungkin tidak tersedia di shared hosting. Ini **belum diverifikasi** untuk platform Hostinger spesifik ini — makanya wajib dicek log-nya, jangan diasumsikan otomatis berhasil.
   - Kalau gagal di sini, laporkan pesan error-nya — kemungkinan perlu penyesuaian versi Node.js yang dipilih di langkah 2.
3. Cek SSL aktif untuk `eleva.hkgroup.id` (biasanya otomatis via hPanel, cari menu SSL kalau belum aktif).

## 5. Verifikasi fungsional

Buka `https://eleva.hkgroup.id` di browser. Harus muncul layar onboarding (kalau pertama kali) atau dashboard. Kalau muncul error, cek log runtime app di hPanel.

## 6. Verifikasi paling penting: apakah data selamat lintas redeploy

Ini bagian paling kritis, jangan dilewati. Hostinger sendiri, di dokumentasi resminya, mengarahkan pengguna Node.js App ke *external database* (Supabase/MongoDB Atlas) untuk persistensi data — yang mengindikasikan file lokal (termasuk `eleva.db` punya Eleva) **berpotensi tidak selamat** kalau proses redeploy melakukan clean checkout ulang dari Git. Ini perlu dites langsung di akun ini, bukan diasumsikan:

1. Selesaikan onboarding di `eleva.hkgroup.id`, isi 1 refleksi apa saja, catat isinya (misalnya screenshot dashboard).
2. Trigger redeploy (lewat tombol redeploy di hPanel, atau push 1 commit kecil ke `main`).
3. Reload `https://eleva.hkgroup.id` — cek apakah profil & refleksi tadi masih ada.

**Kalau data hilang setelah redeploy:**
- Pindahkan lokasi file database ke folder di luar direktori yang dikelola git deploy (misalnya folder terpisah yang kamu buat sendiri lewat File Manager/FTP di hPanel, di luar folder `nodejs` bawaan app).
- Set environment variable baru: `DB_PATH` = path absolut ke file di folder itu (misal `/home/USERNAME/eleva-data/eleva.db`) — kode sudah mendukung ini (`server/db.js` baca `process.env.DB_PATH`, fallback ke lokasi lama kalau tidak diset).
- Redeploy, ulangi tes di atas.
- Kalau masih hilang juga: **jangan andalkan redeploy otomatis dari GitHub push dulu**. Pakai deploy manual (upload zip) dan hindari redeploy kecuali benar-benar perlu update kode, sampai ada solusi yang lebih permanen (migrasi database di luar scope sesi ini).

**Rekomendasi default**: sampai poin ini terverifikasi aman, jangan aktifkan opsi "auto-redeploy tiap push ke `main`" kalau ada — supaya iterasi kode nggak sengaja menghapus data harian yang sedang dipakai.

## 7. Catatan keamanan

Eleva saat ini **belum ada login/auth** (memang disengaja, sesuai desain single-user). Begitu online di URL publik, siapa pun yang tahu `eleva.hkgroup.id` bisa buka, isi, atau reset datanya — bukan cuma kamu.

Rekomendasi ringan (opsional, bukan blocker untuk deploy pertama):
- Jangan taruh link `eleva.hkgroup.id` di navigasi/menu publik situs utama `hkgroup.id`.
- Kalau mau proteksi tambahan, hPanel biasanya punya fitur **Password Protect Directory** yang bisa dipasang di folder app ini sebagai lapisan sementara, sebelum ada auth beneran di kode.
