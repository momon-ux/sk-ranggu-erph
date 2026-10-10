# Sistem e-RPH SK Ranggu (XBA3037)

> **Papan Induk & Dashboard Jadual Sistem Rancangan Pelajaran Harian (e-RPH)**
> Sekolah Kebangsaan Ranggu, Tawau, Sabah (Zon Balung, PPD Tawau)
> Sesi Persekolahan 2026

Berdasarkan inspirasi sistem pemantauan e-RPH berasaskan jadual waktu dan papan pemuka pentadbir automasi sekolah.

---

## 🌟 Ciri-Ciri Utama Sistem

1. **Dashboard Pentadbir (Executive Analytics)**:
   - **4 Kad KPI Utama**:
     - 🔴 **Tiada RPH / Belum Hantar** (Peratusan & bilangan slot belum hantar)
     - 🟡 **Belum Disahkan / Belum Semak** (Peratusan & bilangan slot menunggu semakan)
     - 🔵 **Perlu Edit** (Peratusan & bilangan slot memerlukan pindaan guru)
     - 🟢 **Disahkan** (Peratusan & bilangan slot telah disahkan pentadbir)
   - **Tapis Dinamik**: Pilihan Bulan (Jan–Dis) dan Minggu Akademik (Minggu 1 hingga 43).
   - **Pecahan Ikut Darjah**: Darjah 1 hingga Darjah 6 dengan ikon dan peratusan. Klik kad darjah untuk terus menapis paparan jadual waktu.
   - **Pecahan Ikut Subjek**: 12 Panitia SK Ranggu (BM, BI, Matematik, Sains, Pendidikan Islam, Bahasa Arab, Sejarah, PSV, Muzik, PJK, RBT, Pendidikan Moral). Klik mana-mana subjek untuk menyerlahkan (*highlight*) semua waktu subjek berkenaan pada jadual.

2. **Jadual RPH (Interactive Matrix & Visual Tracker)**:
   - Paparan jadual waktu mengikut kelas (Kelas 1 Iltizam, 1 Jayyid, 2 Iltizam, 3 Jayyid, 4 Iltizam, 5 Iltizam, 6 Jayyid, dll.).
   - Petunjuk warna status berasaskan DSKP e-RPH:
     - 🔴 Merah = Tiada RPH (Klik untuk isi & hantar)
     - 🟡 Kuning = Belum Disahkan (Menunggu semakan)
     - 🔵 Biru = Perlu Edit (Tindakan pembetulan guru)
     - 🟢 Hijau = Disahkan (Telah disemak & diluluskan)
   - **Fungsi Serlah Pintar (*Smart Focus Highlighting*)**: Apabila subjek atau guru ditapis, waktu berkaitan akan menyala terang dengan bingkai biru/emas manakala slot lain dikaburkan.

3. **Modul Pengisian e-RPH (Untuk Guru)**:
   - Borang lengkap DSKP mengandungi:
     - Guru, Tarikh, Minggu, Mata Pelajaran, Kelas, Masa, Tajuk
     - Standard Kandungan (SK) & Standard Pembelajaran (SP)
     - Objektif Pembelajaran
     - Aktiviti PdP (Set Induksi, Perkembangan, Penutup)
     - Bahan Bantu Mengajar (BBM) & Pentaksiran Bilik Darjah (PBD)
     - Refleksi Guru

4. **Modul Semakan Pentadbir (Untuk Guru Besar / Penolong Kanan)**:
   - Paparan penuh perancangan PdP guru.
   - Pilihan status semakan: Disahkan, Perlu Edit, Belum Disahkan.
   - Ruang Komen / Catatan Pentadbir.
   - Perekodan nama pentadbir penyemak dan tarikh semakan secara automatik.

5. **Senarai Guru & Direktori Staf**:
   - Direktori 34+ pendidik SK Ranggu berserta Kod Guru (G01–G34), No K/P, Subjek Utama, Agihan Kelas, dan status penghantaran RPH minggu semasa.
   - Butang pintas "Lihat Jadual" untuk memaparkan jadual waktu khusus guru tersebut.

6. **Eksport & Import Microsoft Excel (.xlsx)**:
   - Format 3 lembaran kerja (Sheets) serasi Excel:
     - `RPH`: Rekod penuh e-RPH dan ulasan semakan
     - `Jadual`: Matriks jadual waktu kelas dan guru
     - `Tetapan_Guru`: Direktori guru dan mata pelajaran
   - Sokongan import fail `.xlsx` dan `.csv`.

---

## 🚀 Pemasangan & Penggunaan Tempatan

Sistem ini dibina menggunakan teknologi web moden (HTML5, Tailwind CSS, JavaScript modular) tanpa memerlukan kompilasi rumit:

```bash
# Buka fail index.html dalam mana-mana pelayar web (Chrome / Edge / Safari):
open index.html
```

---

## 🏫 Maklumat Sekolah

- **Sekolah**: Sekolah Kebangsaan Ranggu, Tawau (XBA3037)
- **Guru Besar**: Yunus bin Patarai
- **PK Pentadbiran**: Rahmatiah binti Mohd Juda
- **Pembangun & Penyelaras ICT**: Ts. Mohammad Fikrey bin Abdul Gapar (Guru Kelas 6 Jayyid)
