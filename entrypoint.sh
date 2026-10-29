#!/bin/sh
set -e

# Pastikan folder simpanan data SQLite wujud
mkdir -p /app/data

# Jalankan migrasi schema ke pangkalan data
echo "Menjalankan prisma migrate deploy..."
npx prisma migrate deploy

# Jalankan pembenihan (Sentiasa upsert saiz baju default; bilik/team/peserta contoh hanya jika SEED_DEMO=true)
echo "Menjalankan seed database (Saiz baju default; demo jika SEED_DEMO=true)..."
node prisma/seed.js

echo "Memulakan pelayan Next.js standalone..."
exec node server.js
