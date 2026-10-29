# Room & Team Allocation (Event Logistics)

Aplikasi web pengurusan agihan bilik penginapan, kumpulan aktiviti, dan saiz baju bagi peserta program Team Building.

Dibina menggunakan:
- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS 3.4 (Responsif desktop & mobile 360px)
- **Database & ORM**: SQLite + Prisma ORM (Penyimpanan fail tunggal dengan transaksi atomik)
- **Authentication**: Single-password login dengan cookie `httpOnly` bertandatangan HMAC-SHA256 (`jose`)
- **Deployment**: Docker Standalone (Alpine Linux) serasi dengan Coolify persistent volume

---

## ⚙️ Pemboleh Ubah Persekitaran (Environment Variables)

Sediakan fail `.env` (atau tetapkan di dashboard Coolify):

| Pemboleh Ubah | Keterangan | Contoh Nilai |
|---|---|---|
| `DATABASE_URL` | Lokasi fail pangkalan data SQLite | `file:/app/data/app.db` (Production) / `file:./dev.db` (Local) |
| `ADMIN_PASSWORD` | Kata laluan tunggal bagi portal urusetia/admin | `admin123` *(Tukar kepada kata laluan selamat)* |
| `SESSION_SECRET` | Kunci rahsia untuk tandatangan cookie sesi admin | String rawak sekurang-kurangnya 32 aksara |
| `SEED_DEMO` | Masukkan data bilik, kumpulan & 28 peserta rujukan (Pilihan) | `true` atau `false` (Lalai: `false`) |

---

## 🚀 Panduan Deployment di Coolify

1. **Cipta Aplikasi Baru**:
   - Di Coolify, pilih **New Resource** > **Application**.
   - Pilih sumber Git repository anda atau pilih mod Dockerfile.
2. **Konfigurasi Persistent Storage (Volume)**:
   - Pergi ke tab **Storages** di Coolify.
   - Tambah volume baru:
     - **Destination Path**: `/app/data`
     *(Ini memastikan fail pangkalan data `app.db` kekal selamat walaupun container di-restart atau di-redeploy)*.
3. **Tetapkan Environment Variables**:
   - Masukkan `DATABASE_URL=file:/app/data/app.db`
   - Masukkan `ADMIN_PASSWORD` dan `SESSION_SECRET`.
4. **Deploy**:
   - Klik **Deploy**.
   - Semasa container bermula, fail `entrypoint.sh` akan secara automatik menjalankan `npx prisma migrate deploy` dan memasukkan data awal (seeding) jika pangkalan data baru dicipta.

---

## 💻 Menjalankan Secara Tempatan (Local Development)

```bash
# 1. Pasang kebergantungan (dependencies)
npm install

# 2. Jalankan migrasi pangkalan data
npx prisma migrate deploy

# 3. Masukkan data contoh awal (28 peserta, bilik, team, saiz)
npm run db:seed

# 4. Jalankan pelayan pembangunan
npm run dev
```

Buka pelayar di:
- **Laman Utama**: [http://localhost:3000](http://localhost:3000)
- **Semakan Awam Peserta**: [http://localhost:3000/semak](http://localhost:3000/semak)
- **Portal Urusetia (Admin)**: [http://localhost:3000/admin](http://localhost:3000/admin) (Kata laluan: `admin123`)

---

## 🔒 Ciri-ciri Keselamatan & Logik

- **Semakan Kapasiti Berkelompok (Atomic Transactions)**: Semua penugasan bilik dan kumpulan dikawal menggunakan `prisma.$transaction`. Jika dua admin cuba memasukkan peserta serentak ke bilik yang hampir penuh, transaksi akan menolak cubaan yang melebihi kuota dengan mesej mesra BM.
- **Perlindungan Privasi Public `/semak`**: Carian IC hanya memaparkan nama peserta berkenaan, bilik, kumpulan, dan senarai nama rakan sebilik/sekumpulan sahaja. Nombor IC atau maklumat peribadi orang lain tidak didedahkan sama sekali.
- **Rate Limiting In-Memory**: 
  - Laluan semakan awam `/semak`: Maksimum 10 cubaan seminit setiap IP.
  - Laluan log masuk admin: Maksimum 5 cubaan seminit setiap IP.
- **Normalisasi IC**: Peserta atau admin boleh memasukkan IC dengan tanda sempang (cth: `950102-10-5555`) atau tanpa sempang (`950102105555`). Peserta luar tanpa IC rasmi juga boleh disimpan dengan selamat tanpa ralat pertindihan.

