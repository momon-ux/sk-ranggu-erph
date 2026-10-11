/**
 * SISTEM PEMANTAUAN e-RPH SEKOLAH KEBANGSAAN RANGGU, TAWAU (XBA3037)
 * Pangkalan Data Induk Rasmi & Senarai Penuh Staf 2026
 * 
 * Pembangun Sistem: MOHAMMAD FIKREY BIN ABDUL GAPAR (Pentadbir Sistem)
 * Keselamatan Super Admin: SHA-256 Hash Cryptographic Verification
 * Kata Laluan Sementara Guru: P3nd1d1kan
 */

const ERPH_SYSTEM_CONFIG = {
  school: {
    name: "SEKOLAH KEBANGSAAN RANGGU",
    shortName: "SK Ranggu",
    code: "XBA3037",
    zone: "Zon Balung, PPD Tawau",
    session: "Sesi Persekolahan 2026",
    logo: "assets/logo-skrg.png",
    logoKpm: "assets/logo-kpm.png",
    currentWeek: 7,
    totalWeeks: 43
  },
  security: {
    systemAdminHash: "f4cf6f28cd1d68e6394b136e8877ab487018648509770a73153bf0af2b3168d9",
    systemAdminName: "Ts. Mohammad Fikrey bin Abdul Gapar",
    defaultTeacherPassword: "P3nd1d1kan"
  },
  // Senarai tarikh Jumaat bagi 43 Minggu Persekolahan 2026
  fridays2026: [
    { minggu: 1, tarikh: "2026-01-09", label: "09 Jan 2026" },
    { minggu: 2, tarikh: "2026-01-16", label: "16 Jan 2026" },
    { minggu: 3, tarikh: "2026-01-23", label: "23 Jan 2026" },
    { minggu: 4, tarikh: "2026-01-30", label: "30 Jan 2026" },
    { minggu: 5, tarikh: "2026-02-06", label: "06 Feb 2026" },
    { minggu: 6, tarikh: "2026-02-13", label: "13 Feb 2026" },
    { minggu: 7, tarikh: "2026-02-20", label: "20 Feb 2026" }, // Minggu Semasa Piawai
    { minggu: 8, tarikh: "2026-02-27", label: "27 Feb 2026" },
    { minggu: 9, tarikh: "2026-03-06", label: "06 Mac 2026" },
    { minggu: 10, tarikh: "2026-03-13", label: "13 Mac 2026" },
    { minggu: 11, tarikh: "2026-03-20", label: "20 Mac 2026" },
    { minggu: 12, tarikh: "2026-03-27", label: "27 Mac 2026" },
    { minggu: 13, tarikh: "2026-04-03", label: "03 Apr 2026" },
    { minggu: 14, tarikh: "2026-04-10", label: "10 Apr 2026" },
    { minggu: 15, tarikh: "2026-04-17", label: "17 Apr 2026" },
    { minggu: 16, tarikh: "2026-04-24", label: "24 Apr 2026" },
    { minggu: 17, tarikh: "2026-05-01", label: "01 Mei 2026" },
    { minggu: 18, tarikh: "2026-05-08", label: "08 Mei 2026" },
    { minggu: 19, tarikh: "2026-05-15", label: "15 Mei 2026" },
    { minggu: 20, tarikh: "2026-05-22", label: "22 Mei 2026" },
    { minggu: 21, tarikh: "2026-06-12", label: "12 Jun 2026" },
    { minggu: 22, tarikh: "2026-06-19", label: "19 Jun 2026" },
    { minggu: 23, tarikh: "2026-06-26", label: "26 Jun 2026" },
    { minggu: 24, tarikh: "2026-07-03", label: "03 Jul 2026" },
    { minggu: 25, tarikh: "2026-07-10", label: "10 Jul 2026" },
    { minggu: 26, tarikh: "2026-07-17", label: "17 Jul 2026" },
    { minggu: 27, tarikh: "2026-07-24", label: "24 Jul 2026" },
    { minggu: 28, tarikh: "2026-07-31", label: "31 Jul 2026" },
    { minggu: 29, tarikh: "2026-08-07", label: "07 Ogo 2026" },
    { minggu: 30, tarikh: "2026-08-14", label: "14 Ogo 2026" },
    { minggu: 31, tarikh: "2026-08-21", label: "21 Ogo 2026" },
    { minggu: 32, tarikh: "2026-08-28", label: "28 Ogo 2026" },
    { minggu: 33, tarikh: "2026-09-04", label: "04 Sep 2026" },
    { minggu: 34, tarikh: "2026-09-25", label: "25 Sep 2026" },
    { minggu: 35, tarikh: "2026-10-02", label: "02 Okt 2026" },
    { minggu: 36, tarikh: "2026-10-09", label: "09 Okt 2026" },
    { minggu: 37, tarikh: "2026-10-16", label: "16 Okt 2026" },
    { minggu: 38, tarikh: "2026-10-23", label: "23 Okt 2026" },
    { minggu: 39, tarikh: "2026-10-30", label: "30 Okt 2026" },
    { minggu: 40, tarikh: "2026-11-06", label: "06 Nov 2026" },
    { minggu: 41, tarikh: "2026-11-13", label: "13 Nov 2026" },
    { minggu: 42, tarikh: "2026-11-20", label: "20 Nov 2026" },
    { minggu: 43, tarikh: "2026-12-04", label: "04 Dis 2026" }
  ]
};

// 5 LAJUR PENTADBIR PENYELIA SK RANGGU
const PENTADBIR_COLUMNS = [
  {
    id: 1,
    title: "Guru Besar",
    name: "YUNUS BIN PATARAI",
    shortTitle: "GB",
    role: "Guru Besar (Peneraju Sekolah)",
    ic: "721005-12-5911",
    color: "amber",
    bgClass: "bg-amber-500",
    borderClass: "border-amber-400",
    headerBg: "bg-gradient-to-r from-amber-600 to-yellow-600",
    desc: "Menyelia 4 Penolong Kanan & Memantau Seluruh Warga Pendidik SK Ranggu"
  },
  {
    id: 2,
    title: "GPK Pentadbiran",
    name: "PUAN HAJAH RAHMATIAH BINTI MOHD JUDA",
    shortTitle: "PK 1",
    role: "Penolong Kanan Pentadbiran (PK 1)",
    ic: "751212-12-5962",
    color: "sky",
    bgClass: "bg-sky-600",
    borderClass: "border-sky-400",
    headerBg: "bg-gradient-to-r from-sky-600 to-blue-700",
    desc: "Kumpulan Guru Seliaan 1 (Kurikulum & Akademik Sesi Pagi)"
  },
  {
    id: 3,
    title: "GPK Hal Ehwal Murid",
    name: "PUAN KOMALA BINTI JOSEPH",
    shortTitle: "PK HEM",
    role: "Penolong Kanan Hal Ehwal Murid (PK HEM)",
    ic: "730914-12-5884",
    color: "emerald",
    bgClass: "bg-emerald-600",
    borderClass: "border-emerald-400",
    headerBg: "bg-gradient-to-r from-emerald-600 to-teal-700",
    desc: "Kumpulan Guru Seliaan 2 (HEM, Disiplin & ICT)"
  },
  {
    id: 4,
    title: "GPK Kokurikulum",
    name: "PUAN WARNAH BINTI SIRA",
    shortTitle: "PK KOKU",
    role: "Penolong Kanan Kokurikulum (PK KOKU)",
    ic: "700207-12-5618",
    color: "rose",
    bgClass: "bg-rose-600",
    borderClass: "border-rose-400",
    headerBg: "bg-gradient-to-r from-rose-600 to-red-700",
    desc: "Kumpulan Guru Seliaan 3 (Kokurikulum, Sukan & 1M1S)"
  },
  {
    id: 5,
    title: "GPK Sidang Petang",
    name: "TUAN HJ EMRAN BIN HJ SELAMAT",
    shortTitle: "PK PETANG",
    role: "Penolong Kanan Petang (PK Petang)",
    ic: "691017-12-5279",
    color: "purple",
    bgClass: "bg-purple-600",
    borderClass: "border-purple-400",
    headerBg: "bg-gradient-to-r from-purple-600 to-indigo-700",
    desc: "Kumpulan Guru Seliaan 4 (Sidang Petang • Tahap 1)"
  }
];

// SENARAI PENUH 60 STAF SK RANGGU LENGKAP BERSERTA AGIHAN PENYELIA
const INITIAL_STAFF_LIST = [
  // PENTADBIR TERTINGGI (ID 1-5)
  { id: 1, code: "GB01", name: "YUNUS BIN PATARAI", ic: "721005-12-5911", role: "Guru Besar (Peneraju Sekolah)", supervisorId: null, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 2, code: "PK01", name: "RAHMATIAH BINTI MOHD JUDA", ic: "751212-12-5962", role: "Penolong Kanan Pentadbiran (PK 1)", supervisorId: 1, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 3, code: "PK02", name: "KOMALA BINTI JOSEPH", ic: "730914-12-5884", role: "Penolong Kanan Hal Ehwal Murid (PK HEM)", supervisorId: 1, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 4, code: "PK03", name: "WARNAH BINTI SIRA", ic: "700207-12-5618", role: "Penolong Kanan Kokurikulum (PK KOKU)", supervisorId: 1, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 5, code: "PK04", name: "EMRAN BIN HJ SELAMAT", ic: "691017-12-5279", role: "Penolong Kanan Petang (PK Petang)", supervisorId: 1, status: "Aktif", session: "Petang", customPassword: null },

  // GURU SELIAAN GPK PENTADBIRAN (Supervisor ID: 2)
  { id: 6, code: "G06", name: "AG KU KEMAINDDRA BIN PG MOHD TAIB", ic: "711026-12-5153", role: "Guru Kelas 6 Iltizam • Bahasa Inggeris", supervisorId: 2, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 8, code: "G08", name: "AINATUN NADHIRAH BINTI DHARMAWI", ic: "971008-12-5118", role: "Guru Kelas 3 Jayyid • Jadual Waktu Petang", supervisorId: 2, status: "Aktif", session: "Petang", customPassword: null },
  { id: 9, code: "G09", name: "ANI BINTI PATOLA", ic: "840229-12-5496", role: "Setiausaha Kurikulum • Penyelaras SPBT", supervisorId: 2, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 10, code: "G10", name: "ASMADI BIN LAJJAKASI", ic: "830602-12-6093", role: "Pegawai Aset & Maklumat • Peperiksaan Dalaman", supervisorId: 2, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 11, code: "G11", name: "BAJAM BINTI LADUNG", ic: "820324-12-5314", role: "Setiausaha Pentadbiran • Guru Kelas 6 Mumtaz", supervisorId: 2, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 12, code: "G12", name: "DARMAWATI BTE LOKKONG", ic: "850603-12-6042", role: "Penolong Setiausaha HEM • Transisi Tahun 1", supervisorId: 2, status: "Aktif", session: "Petang", customPassword: null },
  { id: 13, code: "G13", name: "EVALORENNA BINTI LAMINSIN", ic: "900201-12-5306", role: "Setiausaha Kokurikulum • Penyelaras LDP", supervisorId: 2, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 14, code: "G14", name: "FARIDAH BINTI SUNU", ic: "741020-12-6072", role: "Ketua Panitia Pend Moral • Guru Kelas 1 Khoir", supervisorId: 2, status: "Aktif", session: "Petang", customPassword: null },
  { id: 15, code: "G15", name: "HALIM BIN BIDI", ic: "690322-08-6291", role: "Penyelaras Kebajikan Murid • Ketua Rumah Ungu", supervisorId: 2, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 16, code: "G16", name: "HAMSIAH BINTI HAMID", ic: "831119-12-5538", role: "Ketua Panitia Bahasa Inggeris • Guru Kelas 5 Mumtaz", supervisorId: 2, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 17, code: "G17", name: "HASNAN BIN MAT ZIN", ic: "750209-03-5259", role: "Ketua Panitia Pendidikan Islam • Penyelaras Tahap 2", supervisorId: 2, status: "Aktif", session: "Pagi", customPassword: null },

  // GURU SELIAAN GPK HAL EHWAL MURID (Supervisor ID: 3)
  { id: 19, code: "G19", name: "JAINAH BINTI SULAIMAN", ic: "720515-12-5554", role: "Penyelaras HIP • Guru Kelas 3 Iltizam", supervisorId: 3, status: "Aktif", session: "Petang", customPassword: null },
  { id: 20, code: "G20", name: "JUNAID BIN NURDIN", ic: "750625-12-5755", role: "Ketua Panitia Sains • Bantuan Yayasan Sabah", supervisorId: 3, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 21, code: "G21", name: "MARIANA BINTI KASSIM", ic: "730807-12-5766", role: "Penyelaras Prasekolah • Permata Hati", supervisorId: 3, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 22, code: "G22", name: "MARINI BINTI LADI", ic: "810914-12-5278", role: "Penyelaras PLC • Guru Kelas 2 Jayyid", supervisorId: 3, status: "Aktif", session: "Petang", customPassword: null },
  { id: 23, code: "G23", name: "MASTURAH BINTI TUDA", ic: "750803-12-5900", role: "Ketua Panitia Matematik • Guru Kelas 4 Khoir", supervisorId: 3, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 24, code: "G24", name: "MOHAMMAD FIKREY BIN ABDUL GAPAR", ic: "910528-12-5411", role: "Pentadbir Sistem & ICT • Guru Kelas 6 Jayyid", supervisorId: 3, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 25, code: "G25", name: "MOHAMMAD IKHWAN BIN ABDURAIS", ic: "940502-12-5701", role: "Penyelaras Pembangunan • Guru Kelas 2 Iltizam", supervisorId: 3, status: "Aktif", session: "Petang", customPassword: null },
  { id: 26, code: "G26", name: "MOHD ALFAIZAL BIN DAUD", ic: "820403-12-6243", role: "Penyelaras Data & IDME • Guru Kelas 6 Khoir", supervisorId: 3, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 27, code: "G27", name: "MOHD MUEMIN BIN MOHD AMIN JAPAR", ic: "870131-49-5381", role: "Guru Akademik / Matapelajaran", supervisorId: 3, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 28, code: "G28", name: "MUHAMADIAN BIN SUAIBU", ic: "790313-12-5859", role: "Penyelaras Pemulihan Khas • Ketua Rumah Biru", supervisorId: 3, status: "Aktif", session: "Pagi", customPassword: null },

  // GURU SELIAAN GPK KOKURIKULUM (Supervisor ID: 4)
  { id: 29, code: "G29", name: "NECHI BINTI SERUNAI", ic: "681103-12-5540", role: "AJK RMT • Guru Akademik", supervisorId: 4, status: "Aktif", session: "Petang", customPassword: null },
  { id: 30, code: "G30", name: "NOOR SYAFIQAH NADHIRAH BINTI JAMALUDDIN", ic: "980221-03-6426", role: "Guru Kelas 1 Iltizam • Bahasa Inggeris", supervisorId: 4, status: "Aktif", session: "Petang", customPassword: null },
  { id: 31, code: "G31", name: "NORIMAH BINTI JOYO REJO", ic: "740526-12-5080", role: "Penyelaras 3K (Kebersihan & Kesihatan)", supervisorId: 4, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 32, code: "G32", name: "NORLINA BINTI BAGWAS", ic: "730926-12-5494", role: "Setiausaha HEM • Guru Kelas 1 Jayyid", supervisorId: 4, status: "Aktif", session: "Petang", customPassword: null },
  { id: 33, code: "G33", name: "NOZE BINTI TUKIJAN", ic: "761202-12-5810", role: "Penyelaras Disiplin • Guru Kelas 4 Jayyid", supervisorId: 4, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 34, code: "G34", name: "NUR FAEZAH BINTI BANTALANI", ic: "931220-12-6058", role: "Guru Kelas 3 Mumtaz • Sains", supervisorId: 4, status: "Aktif", session: "Petang", customPassword: null },
  { id: 35, code: "G35", name: "NURUL ANISA BINTI SAPARUDIN", ic: "920918-12-5918", role: "Penyelaras Jadual Pagi • Guru Kelas 4 Mumtaz", supervisorId: 4, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 36, code: "G36", name: "RASMAWATI BINTI TAUSE", ic: "811217-12-5250", role: "Penyelaras Kurikulum Tahap 1 • Guru 1 Mumtaz", supervisorId: 4, status: "Aktif", session: "Petang", customPassword: null },
  { id: 37, code: "G37", name: "RINI BINTI DAUD", ic: "740707-12-5282", role: "Ketua Panitia Sejarah • Guru Kelas 5 Jayyid", supervisorId: 4, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 38, code: "G38", name: "ROBIATUL AIDAWYAH", ic: "981115-02-5736", role: "Guru Akademik / Matapelajaran", supervisorId: 4, status: "Aktif", session: "Pagi", customPassword: null },

  // GURU SELIAAN GPK SIDANG PETANG (Supervisor ID: 5)
  { id: 39, code: "G39", name: "RONI BIN BACHO", ic: "840509-12-6215", role: "Ketua Panitia RBT • Penyelaras ICT & DELIMa", supervisorId: 5, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 40, code: "G40", name: "ROSIDIAN BIN IDRIS", ic: "670415-12-5343", role: "Setiausaha Sukan • Guru Kelas 4 Iltizam", supervisorId: 5, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 41, code: "G41", name: "ROSMINAH BINTI SAPAR", ic: "701026-12-5760", role: "Guru Perpustakaan & Media (GPM)", supervisorId: 5, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 42, code: "G42", name: "RUHAYA BINTI AHMAD", ic: "690623-12-5434", role: "Guru Kelas 3 Khoir • Matematik", supervisorId: 5, status: "Aktif", session: "Petang", customPassword: null },
  { id: 43, code: "G43", name: "S.LILI BINTI LADI", ic: "700605-12-5592", role: "Penyelaras Intervensi • Guru Kelas 2 Khoir", supervisorId: 5, status: "Aktif", session: "Petang", customPassword: null },
  { id: 44, code: "G44", name: "SABRIAH @ HABIBAH BINTI ABDUL SABAR", ic: "691228-12-5594", role: "Ketua Panitia Bahasa Melayu • Penyelaras BAP", supervisorId: 5, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 45, code: "G45", name: "SALSABILA BINTI SHAHRUDDIN", ic: "981025-02-6452", role: "Guru Akademik / Matapelajaran", supervisorId: 5, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 46, code: "G46", name: "SITI JAWARA BINTI LUKMAN", ic: "730126-12-5584", role: "Ketua Panitia PSV • Guru Kelas 2 Mumtaz", supervisorId: 5, status: "Aktif", session: "Petang", customPassword: null },
  { id: 47, code: "G47", name: "SITI NAURIN FADZILAH BINTI JALAL", ic: "790718-01-5164", role: "Guru Bimbingan & Kaunseling (UBK)", supervisorId: 5, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 48, code: "G48", name: "SITI RABIA BIN IBRAHIM", ic: "710908-12-5812", role: "Guru Akademik / Matapelajaran", supervisorId: 5, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 49, code: "G49", name: "SUNARTI BINTI TAPPA", ic: "841008-12-5470", role: "Ketua Panitia Bahasa Arab", supervisorId: 5, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 50, code: "G50", name: "TANJANG BIN TURE", ic: "720403-12-5699", role: "Ketua Panitia Pendidikan Muzik • Guru 5 Khoir", supervisorId: 5, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 51, code: "G51", name: "WAFA FARHANA BINTI ABD KADIR", ic: "931108-12-5530", role: "Ketua Panitia PJPK • Penyelaras Bola Jaring", supervisorId: 5, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 52, code: "G52", name: "WAN MUHAMAD YUSUF BIN WAN ABDUL AZIZ", ic: "870519-08-6373", role: "Penyelaras Pembangunan • Guru Kelas 5 Iltizam", supervisorId: 5, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 53, code: "G53", name: "YUSNI BINTI WAHJUDIN", ic: "800624-12-5676", role: "Guru Prasekolah Mutiara Hati", supervisorId: 5, status: "Aktif", session: "Pagi", customPassword: null },
  { id: 54, code: "G54", name: "ZAMRIE BIN OMAR ALI", ic: "780807-12-5809", role: "Penyelaras Keselamatan • Disiplin Petang", supervisorId: 5, status: "Aktif", session: "Petang", customPassword: null },

  // GURU TIDAK AKTIF (BERSARA / PENCEN)
  { id: 7, code: "G07", name: "AHAD BIN JAAFAR", ic: "660717-12-5251", role: "Guru Akademik", supervisorId: 2, status: "Bersara / Pencen", inactiveReason: "Telah mencapai umur persaraan wajib", session: "Pagi", customPassword: null },
  { id: 18, code: "G18", name: "JAIBY BIN JULIAN", ic: "660707-12-5901", role: "Guru Akademik", supervisorId: 2, status: "Bersara / Pencen", inactiveReason: "Telah mencapai umur persaraan wajib", session: "Pagi", customPassword: null }
];

// REKOD CONTOH PENGHANTARAN e-RPH MINGGUAN (JUMAAT MINGGU 7: 20 FEB 2026)
const INITIAL_UPLOADS_DATA = [
  // GPK kepada Guru Besar
  {
    id: "UPL-M7-02",
    guruId: 2,
    guruName: "RAHMATIAH BINTI MOHD JUDA",
    minggu: 7,
    tarikhJumaat: "2026-02-20",
    status: "HIJAU",
    uploadedAt: "20/02/2026, 07:45 AM",
    fileName: "eRPH_M7_Rahmatiah_Mohd_Juda.pdf",
    fileUrl: "https://drive.google.com/sample/erph-pk1",
    catatan: "e-RPH Minggu 7 Lengkap (BM Tahun 5 & 6)",
    supervisorId: 1,
    verifiedBy: "YUNUS BIN PATARAI",
    verifiedAt: "20/02/2026, 09:30 AM",
    ulasan: "Perancangan PdP sangat mantap."
  },
  {
    id: "UPL-M7-03",
    guruId: 3,
    guruName: "KOMALA BINTI JOSEPH",
    minggu: 7,
    tarikhJumaat: "2026-02-20",
    status: "HIJAU",
    uploadedAt: "20/02/2026, 08:10 AM",
    fileName: "eRPH_M7_Komala_Joseph.pdf",
    fileUrl: "https://drive.google.com/sample/erph-pkhem",
    catatan: "e-RPH Minggu 7 (Sains)",
    supervisorId: 1,
    verifiedBy: "YUNUS BIN PATARAI",
    verifiedAt: "20/02/2026, 09:35 AM",
    ulasan: "Disahkan."
  },
  {
    id: "UPL-M7-04",
    guruId: 4,
    guruName: "WARNAH BINTI SIRA",
    minggu: 7,
    tarikhJumaat: "2026-02-20",
    status: "HIJAU",
    uploadedAt: "20/02/2026, 08:30 AM",
    fileName: "eRPH_M7_Warnah_Sira.pdf",
    fileUrl: "https://drive.google.com/sample/erph-pkkoku",
    catatan: "e-RPH Minggu 7 (PJK)",
    supervisorId: 1,
    verifiedBy: "YUNUS BIN PATARAI",
    verifiedAt: "20/02/2026, 09:40 AM",
    ulasan: "Disahkan."
  },
  {
    id: "UPL-M7-05",
    guruId: 5,
    guruName: "EMRAN BIN HJ SELAMAT",
    minggu: 7,
    tarikhJumaat: "2026-02-20",
    status: "HIJAU",
    uploadedAt: "20/02/2026, 08:45 AM",
    fileName: "eRPH_M7_Emran_Selamat.pdf",
    fileUrl: "https://drive.google.com/sample/erph-pkpetang",
    catatan: "e-RPH Minggu 7 (Pendidikan Islam)",
    supervisorId: 1,
    verifiedBy: "YUNUS BIN PATARAI",
    verifiedAt: "20/02/2026, 09:45 AM",
    ulasan: "Disahkan."
  },

  // Folder Guru Besar Sendiri (Hanya GB dan Ts. Fikrey boleh lihat)
  {
    id: "UPL-M7-01",
    guruId: 1,
    guruName: "YUNUS BIN PATARAI",
    minggu: 7,
    tarikhJumaat: "2026-02-20",
    status: "HIJAU",
    uploadedAt: "20/02/2026, 07:15 AM",
    fileName: "eRPH_Instruksional_GB_M7_2026.pdf",
    fileUrl: "https://drive.google.com/sample/erph-gb-folder-khas",
    catatan: "Rekod Instruksional & Pemantauan PBD Minggu 7",
    supervisorId: null,
    isGbPrivate: true,
    verifiedBy: "Pentadbir Sistem",
    verifiedAt: "20/02/2026, 07:30 AM",
    ulasan: "Arsip rasmi Guru Besar SK Ranggu."
  },

  // Guru-guru Seliaan GPK Pentadbiran
  {
    id: "UPL-M7-06",
    guruId: 6,
    guruName: "AG KU KEMAINDDRA BIN PG MOHD TAIB",
    minggu: 7,
    tarikhJumaat: "2026-02-20",
    status: "HIJAU",
    uploadedAt: "20/02/2026, 08:05 AM",
    fileName: "eRPH_M7_Kemainddra.pdf",
    fileUrl: "https://drive.google.com/sample/erph-kemainddra",
    catatan: "e-RPH Minggu 7 Bahasa Inggeris Thn 6 Iltizam",
    supervisorId: 2,
    verifiedBy: "RAHMATIAH BINTI MOHD JUDA",
    verifiedAt: "20/02/2026, 10:15 AM",
    ulasan: "Lengkap dan teratur."
  },
  {
    id: "UPL-M7-08",
    guruId: 8,
    guruName: "AINATUN NADHIRAH BINTI DHARMAWI",
    minggu: 7,
    tarikhJumaat: "2026-02-20",
    status: "HIJAU",
    uploadedAt: "20/02/2026, 08:18 AM",
    fileName: "eRPH_M7_Ainatun.pdf",
    fileUrl: "https://drive.google.com/sample/erph-ainatun",
    catatan: "e-RPH Minggu 7 Thn 3 Jayyid",
    supervisorId: 2,
    verifiedBy: "RAHMATIAH BINTI MOHD JUDA",
    verifiedAt: "20/02/2026, 10:20 AM",
    ulasan: "Disahkan."
  },
  {
    id: "UPL-M7-09",
    guruId: 9,
    guruName: "ANI BINTI PATOLA",
    minggu: 7,
    tarikhJumaat: "2026-02-20",
    status: "HIJAU",
    uploadedAt: "20/02/2026, 08:40 AM",
    fileName: "eRPH_M7_Ani_Patola.pdf",
    fileUrl: "https://drive.google.com/sample/erph-ani",
    catatan: "e-RPH Bahasa Melayu Minggu 7",
    supervisorId: 2,
    verifiedBy: "RAHMATIAH BINTI MOHD JUDA",
    verifiedAt: "20/02/2026, 10:25 AM",
    ulasan: "Disahkan."
  },
  {
    id: "UPL-M7-10",
    guruId: 10,
    guruName: "ASMADI BIN LAJJAKASI",
    minggu: 7,
    tarikhJumaat: "2026-02-20",
    status: "HIJAU",
    uploadedAt: "20/02/2026, 08:55 AM",
    fileName: "eRPH_M7_Asmadi.pdf",
    fileUrl: "https://drive.google.com/sample/erph-asmadi",
    catatan: "e-RPH PJK Minggu 7",
    supervisorId: 2,
    verifiedBy: "RAHMATIAH BINTI MOHD JUDA",
    verifiedAt: "20/02/2026, 10:30 AM",
    ulasan: "Bagus."
  },
  {
    id: "UPL-M7-11",
    guruId: 11,
    guruName: "BAJAM BINTI LADUNG",
    minggu: 7,
    tarikhJumaat: "2026-02-20",
    status: "HIJAU",
    uploadedAt: "20/02/2026, 09:10 AM",
    fileName: "eRPH_M7_Bajam.pdf",
    fileUrl: "https://drive.google.com/sample/erph-bajam",
    catatan: "e-RPH Bahasa Melayu 6 Mumtaz",
    supervisorId: 2,
    verifiedBy: "RAHMATIAH BINTI MOHD JUDA",
    verifiedAt: "20/02/2026, 10:35 AM",
    ulasan: "Disahkan."
  },

  // Guru-guru Seliaan GPK HEM
  {
    id: "UPL-M7-24",
    guruId: 24,
    guruName: "MOHAMMAD FIKREY BIN ABDUL GAPAR",
    minggu: 7,
    tarikhJumaat: "2026-02-20",
    status: "HIJAU",
    uploadedAt: "20/02/2026, 07:30 AM",
    fileName: "eRPH_M7_Ts_Mohammad_Fikrey_Matematik_Sains.pdf",
    fileUrl: "https://drive.google.com/sample/erph-fikrey",
    catatan: "e-RPH Minggu 7 Matematik & Sains 6 Jayyid (Inovasi Digital)",
    supervisorId: 3,
    verifiedBy: "KOMALA BINTI JOSEPH",
    verifiedAt: "20/02/2026, 09:15 AM",
    ulasan: "Perancangan berimpak tinggi dan sangat inovatif!"
  },
  {
    id: "UPL-M7-23",
    guruId: 23,
    guruName: "MASTURAH BINTI TUDA",
    minggu: 7,
    tarikhJumaat: "2026-02-20",
    status: "HIJAU",
    uploadedAt: "20/02/2026, 08:25 AM",
    fileName: "eRPH_M7_Masturah.pdf",
    fileUrl: "https://drive.google.com/sample/erph-masturah",
    catatan: "e-RPH Matematik 4 Khoir",
    supervisorId: 3,
    verifiedBy: "KOMALA BINTI JOSEPH",
    verifiedAt: "20/02/2026, 09:20 AM",
    ulasan: "Disahkan."
  },
  {
    id: "UPL-M7-26",
    guruId: 26,
    guruName: "MOHD ALFAIZAL BIN DAUD",
    minggu: 7,
    tarikhJumaat: "2026-02-20",
    status: "HIJAU",
    uploadedAt: "20/02/2026, 09:05 AM",
    fileName: "eRPH_M7_Alfaizal.pdf",
    fileUrl: "https://drive.google.com/sample/erph-alfaizal",
    catatan: "e-RPH Matematik 6 Khoir",
    supervisorId: 3,
    verifiedBy: "KOMALA BINTI JOSEPH",
    verifiedAt: "20/02/2026, 09:25 AM",
    ulasan: "Disahkan."
  },

  // Guru-guru Seliaan GPK Kokurikulum
  {
    id: "UPL-M7-30",
    guruId: 30,
    guruName: "NOOR SYAFIQAH NADHIRAH BINTI JAMALUDDIN",
    minggu: 7,
    tarikhJumaat: "2026-02-20",
    status: "HIJAU",
    uploadedAt: "20/02/2026, 08:35 AM",
    fileName: "eRPH_M7_Noor_Syafiqah.pdf",
    fileUrl: "https://drive.google.com/sample/erph-syafiqah",
    catatan: "e-RPH Bahasa Inggeris 1 Iltizam",
    supervisorId: 4,
    verifiedBy: "WARNAH BINTI SIRA",
    verifiedAt: "20/02/2026, 11:00 AM",
    ulasan: "Disahkan."
  },
  {
    id: "UPL-M7-32",
    guruId: 32,
    guruName: "NORLINA BINTI BAGWAS",
    minggu: 7,
    tarikhJumaat: "2026-02-20",
    status: "HIJAU",
    uploadedAt: "20/02/2026, 08:50 AM",
    fileName: "eRPH_M7_Norlina_Bagwas.pdf",
    fileUrl: "https://drive.google.com/sample/erph-norlina",
    catatan: "e-RPH BM 1 Jayyid",
    supervisorId: 4,
    verifiedBy: "WARNAH BINTI SIRA",
    verifiedAt: "20/02/2026, 11:05 AM",
    ulasan: "Lengkap dan kemas."
  },
  {
    id: "UPL-M7-33",
    guruId: 33,
    guruName: "NOZE BINTI TUKIJAN",
    minggu: 7,
    tarikhJumaat: "2026-02-20",
    status: "HIJAU",
    uploadedAt: "20/02/2026, 09:20 AM",
    fileName: "eRPH_M7_Noze.pdf",
    fileUrl: "https://drive.google.com/sample/erph-noze",
    catatan: "e-RPH Bahasa Melayu 4 Jayyid",
    supervisorId: 4,
    verifiedBy: "WARNAH BINTI SIRA",
    verifiedAt: "20/02/2026, 11:10 AM",
    ulasan: "Disahkan."
  },

  // Guru-guru Seliaan GPK Petang
  {
    id: "UPL-M7-39",
    guruId: 39,
    guruName: "RONI BIN BACHO",
    minggu: 7,
    tarikhJumaat: "2026-02-20",
    status: "HIJAU",
    uploadedAt: "20/02/2026, 08:15 AM",
    fileName: "eRPH_M7_Roni_Bacho.pdf",
    fileUrl: "https://drive.google.com/sample/erph-roni",
    catatan: "e-RPH RBT Minggu 7",
    supervisorId: 5,
    verifiedBy: "EMRAN BIN HJ SELAMAT",
    verifiedAt: "20/02/2026, 10:45 AM",
    ulasan: "Disahkan."
  },
  {
    id: "UPL-M7-40",
    guruId: 40,
    guruName: "ROSIDIAN BIN IDRIS",
    minggu: 7,
    tarikhJumaat: "2026-02-20",
    status: "HIJAU",
    uploadedAt: "20/02/2026, 08:50 AM",
    fileName: "eRPH_M7_Rosidian.pdf",
    fileUrl: "https://drive.google.com/sample/erph-rosidian",
    catatan: "e-RPH Matematik 4 Iltizam",
    supervisorId: 5,
    verifiedBy: "EMRAN BIN HJ SELAMAT",
    verifiedAt: "20/02/2026, 10:50 AM",
    ulasan: "Disahkan."
  },
  {
    id: "UPL-M7-52",
    guruId: 52,
    guruName: "WAN MUHAMAD YUSUF BIN WAN ABDUL AZIZ",
    minggu: 7,
    tarikhJumaat: "2026-02-20",
    status: "HIJAU",
    uploadedAt: "20/02/2026, 09:12 AM",
    fileName: "eRPH_M7_Wan_Yusuf.pdf",
    fileUrl: "https://drive.google.com/sample/erph-wanyusuf",
    catatan: "e-RPH Pendidikan Islam 5 Iltizam",
    supervisorId: 5,
    verifiedBy: "EMRAN BIN HJ SELAMAT",
    verifiedAt: "20/02/2026, 10:55 AM",
    ulasan: "Disahkan."
  }
];

// Helper Functions untuk LocalStorage
const ERPH_DATA_VERSION = "2.4";

function getErphDatabase() {
  const savedVersion = localStorage.getItem("SKR_ERPH_DATA_VERSION");
  if (savedVersion !== ERPH_DATA_VERSION) {
    // Sinkronkan versi data terkini (pastikan semua 60 nama guru & no KP rasmi terkini dimuatkan)
    localStorage.setItem("SKR_ERPH_DATA_VERSION", ERPH_DATA_VERSION);
    localStorage.setItem("SKR_ERPH_STAFF_2026", JSON.stringify(INITIAL_STAFF_LIST));
    localStorage.setItem("SKR_ERPH_CONFIG_2026", JSON.stringify(ERPH_SYSTEM_CONFIG));
    if (!localStorage.getItem("SKR_ERPH_UPLOADS_2026")) {
      localStorage.setItem("SKR_ERPH_UPLOADS_2026", JSON.stringify(INITIAL_UPLOADS_DATA));
    }
  }

  const cfg = localStorage.getItem("SKR_ERPH_CONFIG_2026");
  const staff = localStorage.getItem("SKR_ERPH_STAFF_2026");
  const uploads = localStorage.getItem("SKR_ERPH_UPLOADS_2026");
  const usersAuth = localStorage.getItem("SKR_ERPH_USERS_AUTH_2026");

  return {
    config: cfg ? JSON.parse(cfg) : ERPH_SYSTEM_CONFIG,
    pentadbir: PENTADBIR_COLUMNS,
    staffList: staff ? JSON.parse(staff) : INITIAL_STAFF_LIST,
    uploads: uploads ? JSON.parse(uploads) : INITIAL_UPLOADS_DATA,
    usersAuth: usersAuth ? JSON.parse(usersAuth) : {}
  };
}

function saveErphDatabase(db) {
  if (db.config) localStorage.setItem("SKR_ERPH_CONFIG_2026", JSON.stringify(db.config));
  if (db.staffList) localStorage.setItem("SKR_ERPH_STAFF_2026", JSON.stringify(db.staffList));
  if (db.uploads) localStorage.setItem("SKR_ERPH_UPLOADS_2026", JSON.stringify(db.uploads));
  if (db.usersAuth) localStorage.setItem("SKR_ERPH_USERS_AUTH_2026", JSON.stringify(db.usersAuth));
}

function resetErphDatabase() {
  localStorage.setItem("SKR_ERPH_CONFIG_2026", JSON.stringify(ERPH_SYSTEM_CONFIG));
  localStorage.setItem("SKR_ERPH_STAFF_2026", JSON.stringify(INITIAL_STAFF_LIST));
  localStorage.setItem("SKR_ERPH_UPLOADS_2026", JSON.stringify(INITIAL_UPLOADS_DATA));
  localStorage.removeItem("SKR_ERPH_USERS_AUTH_2026");
}
