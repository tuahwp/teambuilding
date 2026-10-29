# 0001: SQLite Volume Storage and Transactional Capacity Allocation

Bagi deployment sementara menggunakan Coolify, pangkalan data SQLite dipilih dan disimpan di `/app/data/app.db` melalui Docker volume kekal bagi mengelakkan keperluan pelayan pangkalan data berasingan. Bagi memastikan tiada pertindihan atau lebihan agihan peserta (overcapacity) apabila dua admin mengemas kini agihan serentak, semua semakan kapasiti dan penugasan bilik/kumpulan dijalankan di dalam transaksi atomik Prisma (`prisma.$transaction`) di peringkat pelayan.

