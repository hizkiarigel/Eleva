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
- **AI mentor, bukan terapis** (`server/claude.js`, system prompt): diinstruksikan mengarahkan ke bantuan profesional kalau refleksi menunjukkan tanda krisis, bukan melanjutkan quest seperti biasa. Ini masih sebatas instruksi prompt — belum ada deteksi terpisah di kode. Lihat bab 12 di dokumen bible untuk kenapa ini penting sebelum ada user lain selain kamu.

## Push ke GitHub

```bash
git remote add origin <url-repo-kamu>
git branch -M main
git push -u origin main
```

`eleva.db` ikut ke-commit sesuai rencana (personal MVP, single file, gampang dibawa). Kalau nanti multi-user, ini yang paling duluan perlu diganti ke database beneran (Postgres dkk) — SQLite-in-git nggak akan scale, tapi untuk sekarang ini pilihan yang benar.

## Belum ada (sengaja, biar essential)

- Auth / multi-user
- Side/Social/Career/Exploration quest (baru Main Quest)
- Deteksi krisis otomatis di luar prompt AI
