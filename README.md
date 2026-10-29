# Room & Team Allocation (Event Logistics)

Aplikasi web pengurusan agihan bilik penginapan, kumpulan aktiviti, dan saiz baju bagi peserta program Team Building.

Dibina menggunakan:
- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS 3.4 (Dioptimumkan untuk iPad/tablet portrait & landscape 768–1180px serta telefon 360–390px)
- **Database & ORM**: SQLite + Prisma ORM (Penyimpanan fail tunggal dengan transaksi atomik)
- **Authentication**: Single-password login urusetia dengan cookie `httpOnly` bertandatangan HMAC-SHA256 (`jose`)
- **Deployment**: Docker Standalone (Alpine Linux) serasi dengan Coolify persistent volume

---

## 🌐 Struktur Laluan URL

- **Laman Utama / Semakan Peserta**: `/` *(Dioptimumkan untuk telefon pintar 360–390px)*
- **Laluan Lama `/semak`**: Secara automatik di-redirect (301) ke `/`
- **Portal Urusetia (Admin)**: `/urusetia` (Log masuk di `/urusetia/login`)
- **Laluan `/admin`**: Memulangkan ralat 404 Not Found (tiada pautan admin di laman awam)

---

## ⚙️ Pemboleh Ubah Persekitaran (Environment Variables)

Sediakan fail `.env` (atau tetapkan di dashboard Coolify):

| Pemboleh Ubah | Keterangan | Contoh Nilai |
|---|---|---|
| `DATABASE_URL` | Lokasi fail pangkalan data SQLite | `file:/app/data/app.db` (Production) / `file:./dev.db` (Local) |
| `ADMIN_PASSWORD` | Kata laluan tunggal bagi portal urusetia | `admin123` *(Tukar kepada kata laluan selamat)* |
| `SESSION_SECRET` | Kunci rahsia untuk tandatangan cookie sesi urusetia | String rawak sekurang-kurangnya 32 aksara |
| `SEED_DEMO` | Masukkan data bilik, kumpulan & 28 peserta rujukan (Pilihan) | `true` atau `false` (Lalai: `false`) |

---

## 🚀 Panduan Deployment di Coolify

1. **Cipta Aplikasi Baru**:
   - Di Coolify, pilih **New Resource** > **Application**.
   - Pilih sumber Git repository anda atau mod Dockerfile.
2. **Konfigurasi Persistent Storage (Volume)**:
   - Pergi ke tab **Storages** di Coolify.
   - Tambah volume baru:
     - **Destination Path**: `/app/data`
     *(Memastikan fail pangkalan data `app.db` kekal tersimpan walaupun container di-restart)*.
3. **Tetapkan Environment Variables**:
   - Masukkan `DATABASE_URL=file:/app/data/app.db`
   - Masukkan `ADMIN_PASSWORD` dan `SESSION_SECRET`.
4. **Deploy**:
   - Klik **Deploy**.
   - Semasa container bermula, `entrypoint.sh` akan secara automatik menjalankan `npx prisma migrate deploy` dan menyelaraskan saiz baju asas.

---

## 💻 Menjalankan Secara Tempatan (Local Development)

```bash
# 1. Pasang kebergantungan (dependencies)
npm install

# 2. Jalankan migrasi pangkalan data
npx prisma migrate deploy

# 3. Selaraskan saiz baju (atau tambah demo dengan: npm run db:seed:demo)
npm run db:seed

# 4. Jalankan pelayan pembangunan
npm run dev
```

Buka pelayar di:
- **Semakan Peserta (Awam)**: [http://localhost:3000](http://localhost:3000)
- **Portal Urusetia**: [http://localhost:3000/urusetia](http://localhost:3000/urusetia) (Kata laluan: `admin123`)

---

## 🔒 Ciri-ciri Keselamatan & Logik

- **Semakan Kapasiti Berkelompok (Atomic Transactions)**: Semua penugasan bilik dan kumpulan dikawal menggunakan `prisma.$transaction`. Jika dua urusetia cuba memasukkan peserta serentak ke bilik yang hampir penuh, transaksi akan menolak cubaan yang melebihi kuota dengan mesej mesra BM.
- **Perlindungan Privasi Semakan**: Carian IC di `/` hanya memaparkan nama peserta, bilik, kumpulan, dan senarai nama rakan sebilik/sekumpulan sahaja. Nombor IC atau maklumat peribadi orang lain tidak didedahkan.
- **Rate Limiting In-Memory**: 
  - Laluan semakan awam `/`: Maksimum 10 cubaan seminit setiap IP.
  - Laluan log masuk urusetia: Maksimum 5 cubaan seminit setiap IP.
- **Normalisasi IC**: Menerima IC dengan tanda sempang (cth: `950102-10-5555`) atau tanpa sempang (`950102105555`). Peserta luar tanpa IC rasmi juga boleh disimpan dengan selamat.
- **Search Engine Noindex**: Seluruh aplikasi disertakan tag `robots: noindex, nofollow` bagi memastikan privasi acara terpelihara.
