# Eleva — PRD untuk Claude Code

Dokumen ini ditulis supaya bisa langsung dieksekusi tanpa butuh percakapan sebelumnya sebagai konteks. Baca seluruh dokumen ini dulu sebelum mengubah kode apa pun.

## 1. Apa itu Eleva

AI Character Growth System — bukan habit tracker, bukan chatbot umum. AI berperan sebagai mentor yang memberi satu quest personal per hari berdasarkan konteks hidup pengguna, lalu menilai refleksinya.

First principles yang mengikat semua keputusan teknis (versi lengkap ada di `ELEVA_Constitution_Product_Bible_v1.0.docx` kalau file itu ikut di-attach — kalau tidak ada, poin di bawah ini cukup):

- Quest harus personal, bukan checklist generik.
- **Growth butuh substansi nyata, bukan aktivitas kosong** (Goodhart's Law). Ini prinsip non-negotiable, jangan dilonggarkan demi "user experience yang lebih mulus".
- Chapter naik karena pergeseran pola nyata, bukan karena waktu/EXP menumpuk.
- AI adalah mentor, bukan terapis — wajib punya jalur aman ke bantuan profesional kalau ada tanda krisis.
- Satu fitur baru = harus jelas menjawab "apakah ini bantu transformasi pengguna", bukan sekadar "keren untuk ditambahkan".

## 2. Status repo saat ini (v0.1 — sudah jalan, sudah dites)

Stack: Node.js + Express + better-sqlite3 (backend), vanilla JS tanpa build step (frontend). Single-user (belum ada auth).

```
server/index.js   → routes: GET /api/state, POST /api/profile, POST /api/reflection, POST /api/reset
server/db.js      → SQLite: tabel state (singleton row) + days (per tanggal)
server/claude.js  → panggilan Claude API + fallback kalau key kosong/gagal
public/           → index.html, styles.css, app.js (vanilla JS, render manual ke #root)
```

Yang sudah bekerja dan JANGAN diubah tanpa alasan kuat:
- Growth-gate: refleksi < 12 kata → `statDeltas` dipaksa kosong di server (`server/index.js`, cari `eligible`), berlaku walau AI menyarankan nilai lain. Ini implementasi langsung dari Goodhart's Law principle — jangan dilonggarkan.
- Chapter hanya naik tiap kelipatan 5 sesi growth valid (`newGrowthSessions % 5 === 0`).
- Kalau `ANTHROPIC_API_KEY` kosong, app tetap jalan pakai fallback quest generik dan growth selalu 0 — ini disengaja, bukan bug.

## 3. Task 0 — Setup & push (kerjakan lebih dulu, sebelum apa pun)

Repo tujuan: `https://github.com/hizkiarigel/Eleva.git`

```bash
git branch -M main
git remote add origin https://github.com/hizkiarigel/Eleva.git
git push -u origin main
```

Kalau remote sudah pernah diisi sebelumnya, cek dengan `git remote -v` dulu sebelum `git remote add` (akan error kalau sudah ada — pakai `git remote set-url origin ...` kalau perlu ganti). Kalau push ditolak karena histori tidak nyambung (repo GitHub dibuat dengan README/license default), JANGAN langsung `--force` — laporkan ke pengguna dulu, baru putuskan bareng (biasanya solusinya `git pull origin main --allow-unrelated-histories` lalu selesaikan konflik, bukan force push timpa histori GitHub).

Setelah push berhasil, jalankan `npm install && npm start`, pastikan server hidup di `localhost:3000` dan `GET /api/state` merespons sebelum lanjut ke task berikutnya.

## 4. Task 1 — Safety hardening (prioritas tinggi, sebelum ada user lain selain founder)

Saat ini deteksi krisis cuma berupa instruksi di system prompt (`server/claude.js`). Itu lemah karena bergantung penuh ke kepatuhan model. Tambahkan lapisan kedua di server, independen dari AI:

Di `server/index.js`, pada route `POST /api/reflection`, sebelum memanggil `ai.processReflection`:
- Cek `text` terhadap daftar kecil frasa risiko tinggi (niat menyakiti diri sendiri/bunuh diri — bukan sekadar kata "sedih" atau "capek", harus frasa yang cukup spesifik untuk menghindari banyak false positive).
- Kalau terdeteksi: **jangan panggil AI mentor seperti biasa**. Simpan refleksi apa adanya (jangan diblokir dari tersimpan), tapi `mentorReply` diganti pesan tetap yang mengarahkan ke bantuan profesional, dan tidak beri `statDeltas` apa pun untuk sesi itu (bukan momen untuk menilai "growth").
- Gunakan kontak resmi Indonesia yang aktual: **Layanan Sejiwa/Healing119, telepon 119 ekstensi 8, atau www.healing119.id — gratis, 24 jam, oleh Kemenkes RI.** Jangan pakai nomor/layanan lama yang sudah tidak aktif.
- Simpan daftar frasa risiko di file terpisah (`server/safety.js`), bukan hardcode di route, supaya gampang direvisi tanpa menyentuh logic utama. Buat daftar itu pendek dan spesifik, bukan daftar kata umum yang gampang false-positive (mis. jangan trigger dari kata "capek" atau "pengen nyerah" doang).
- Ini pengecekan tambahan (defense in depth), BUKAN pengganti instruksi di system prompt — biarkan instruksi promptnya tetap ada juga.

## 5. Task 2 — Deployment readiness (dokumentasi saja, belum perlu deploy beneran)

SQLite file (`eleva.db`) butuh disk yang persisten antar-deploy. Cocok di: Railway, Render, Fly.io (semua support persistent volume). TIDAK cocok di Vercel/Netlify serverless (filesystem ephemeral, `eleva.db` akan hilang tiap deploy).

Tambahkan bagian singkat di `README.md`: pilihan hosting yang cocok + catatan bahwa migrasi ke Postgres baru dibutuhkan kalau produk ini nanti multi-user (bukan sekarang).

## 6. Eksplisit di luar scope untuk sesi ini — jangan dikerjakan dulu

- Auth / akun / multi-user
- Side Quest, Social Quest, Career Quest, Exploration Quest (baru Main Quest saja)
- Redesign visual besar-besaran
- Pindah dari SQLite ke database lain

Kalau merasa salah satu di atas "sekalian aja dikerjakan", tahan dulu — tanyakan ke pengguna dulu sebelum menambah scope. Produk ini sengaja dibangun bertahap: MVP esensial dulu, dipakai nyata oleh founder sendiri selama beberapa hari, baru diperluas berdasarkan apa yang benar-benar kerasa kurang.

## 7. Definition of done untuk sesi ini

- [ ] Repo ke-push ke `github.com/hizkiarigel/Eleva`, branch `main`
- [ ] `npm install && npm start` jalan tanpa error dari clone bersih
- [ ] Reflection dengan frasa risiko tinggi menghasilkan `mentorReply` berisi kontak 119 ext. 8, bukan quest seperti biasa, dan tidak ada growth untuk sesi itu
- [ ] Reflection normal (tanpa indikasi krisis) tetap berjalan seperti sebelumnya, tidak ada regresi di growth-gate 12-kata
- [ ] README diperbarui dengan catatan hosting
