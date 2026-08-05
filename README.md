# Eleva — Essential Web MVP

AI Character Growth System. Versi web esensial: Onboarding → AI Analysis → Daily Quest → Reflection → Dashboard.

Single-user (kamu, sebagai first user), SQLite lokal, Express backend, vanilla JS frontend. Tanpa build step.

## Jalanin di lokal

```bash
npm install
cp .env.example .env
# isi ANTHROPIC_API_KEY di .env (dari console.anthropic.com)
npm start
```

Buka `http://localhost:3000`.

Tanpa `ANTHROPIC_API_KEY`, aplikasi tetap jalan — quest jadi generik (fallback), dan refleksi tidak menaikkan stat. Ini disengaja: tidak ada AI mentor sungguhan, tidak ada growth palsu.

## Struktur

```
server/
  index.js    → Express app + routes (/api/state, /api/profile, /api/reflection, /api/reset)
  db.js       → SQLite (better-sqlite3), schema: state (singleton) + days
  claude.js   → panggilan ke Claude API + fallback kalau key belum ada / gagal
public/
  index.html, styles.css, app.js  → frontend vanilla JS, tanpa framework/build step
eleva.db      → database SQLite (dibuat otomatis saat pertama jalan)
```

## Prinsip desain yang tertanam di kode (bukan cuma di dokumen)

- **Growth butuh substansi** (`server/index.js`, `wordCount` gate): refleksi di bawah ~12 kata tidak pernah menaikkan stat, walau quest ditandai selesai. Lihat `ELEVA_Constitution_Product_Bible_v1.0.docx` bab 11 (Goodhart's Law).
- **Chapter tidak naik karena waktu/EXP**: hanya naik tiap kelipatan 5 sesi growth yang valid, dan hanya kalau AI menilai ada pergeseran pola nyata.
- **AI mentor, bukan terapis** (`server/claude.js`, system prompt + `server/safety.js`, deteksi server-side): dua lapis. Prompt AI diinstruksikan mengarahkan ke bantuan profesional kalau refleksi menunjukkan tanda krisis. Di atas itu, `POST /api/reflection` juga mengecek `text` terhadap daftar frasa risiko tinggi secara independen dari AI — kalau cocok, AI mentor tidak dipanggil sama sekali dan `mentorReply` diganti kontak Layanan Sejiwa/Healing119 (119 ext. 8 / www.healing119.id), tanpa growth untuk sesi itu. Lihat bab 12 di dokumen bible untuk kenapa ini penting sebelum ada user lain selain kamu.

## Push ke GitHub

```bash
git remote add origin <url-repo-kamu>
git branch -M main
git push -u origin main
```

`eleva.db` ikut ke-commit sesuai rencana (personal MVP, single file, gampang dibawa). Kalau nanti multi-user, ini yang paling duluan perlu diganti ke database beneran (Postgres dkk) — SQLite-in-git nggak akan scale, tapi untuk sekarang ini pilihan yang benar.

## Deployment

`eleva.db` (SQLite) butuh filesystem yang persisten antar-deploy, jadi pilihan hosting-nya terbatas:

- **Cocok**: Railway, Render, atau Fly.io — semuanya punya persistent volume/disk yang bertahan lintas deploy.
- **Tidak cocok**: Vercel atau Netlify (serverless) — filesystem-nya ephemeral, `eleva.db` akan hilang setiap kali deploy ulang.

Migrasi ke Postgres (atau database managed lain) baru dibutuhkan kalau produk ini nanti multi-user. Untuk single-user seperti sekarang, SQLite + persistent disk di salah satu hosting di atas sudah cukup.

## Belum ada (sengaja, biar essential)

- Auth / multi-user
- Side/Social/Career/Exploration quest (baru Main Quest)
