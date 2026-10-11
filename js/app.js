/**
 * SISTEM PEMANTAUAN e-RPH SEKOLAH KEBANGSAAN RANGGU, TAWAU (XBA3037)
 * Enjin Logik SPA & Pengurusan Skrin Log Masuk Wajib (Gateway Auth)
 * 
 * Pengesahan Super Admin: Kriptografi SHA-256 (Dirahsiakan)
 * Kata Laluan Sementara Guru: P3nd1d1kan
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Inisialisasi Pangkalan Data
  let db = getErphDatabase();

  // 2. State Aplikasi
  const state = {
    activeTab: "pemantauan",
    activeWeek: db.config.school.currentWeek || 7,
    currentUser: null, // Null secara default sehingga pengguna log masuk
    isSuperAdminAuthenticated: false,
    filterSearch: "",
    monitoringViewMode: "baris", // "baris" (Default) | "jadual" | "kolum"
    monitoringSearch: "",
    monitoringPentadbirFilter: "ALL", // "ALL" | "1" | "2" | "3" | "4" | "5"
    monitoringStatusFilter: "ALL", // "ALL" | "HIJAU" | "MERAH"
    timetableMode: "guru", // "guru" | "kelas" | "induk"
    timetableSelectedGuru: null,
    timetableSelectedKelas: "4 I",
    timetableIndukSearch: "",
    timetableIndukHari: "ALL",
    timetableIndukKelas: "ALL",
    timetableIndukSubjek: "ALL",
    timetableOfficialPreview: false
  };

  // Helper untuk format tarikh & masa Malaysia
  function getCurrentFormattedTimestamp() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 jadi 12
    const strHours = String(hours).padStart(2, "0");

    return `${day}/${month}/${year}, ${strHours}:${minutes} ${ampm}`;
  }

  // Helper untuk format label tarikh Bahasa Melayu (cth: 09 Jan 2026)
  const MALAY_MONTH_SHORT = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
  function formatMalayDateLabel(dateObjOrStr) {
    if (!dateObjOrStr) return "";
    const d = (typeof dateObjOrStr === "string") ? new Date(dateObjOrStr + "T00:00:00") : dateObjOrStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = MALAY_MONTH_SHORT[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  }

  // Dapatkan maklumat hari Jumaat bagi minggu tertentu (sokong nombor minggu, string cuti dan tarikh)
  function getFridayInfo(weekVal) {
    if (weekVal === undefined || weekVal === null) weekVal = state.activeWeek || 7;
    let f = null;

    // 1. Padanan jika nilai rentetan bermula dengan "cuti-"
    if (typeof weekVal === "string" && weekVal.startsWith("cuti-")) {
      const datePart = weekVal.replace("cuti-", "");
      f = db.config.fridays2026.find(item => item.tarikh === datePart);
    }

    // 2. Padanan jika format tarikh YYYY-MM-DD
    if (!f && typeof weekVal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(weekVal)) {
      f = db.config.fridays2026.find(item => item.tarikh === weekVal);
    }

    // 3. Padanan nombor minggu persekolahan akademik
    const num = parseInt(weekVal);
    if (!f && !isNaN(num) && num > 0) {
      f = db.config.fridays2026.find(item => !item.isCuti && item.minggu === num);
      if (!f) {
        f = db.config.fridays2026.find(item => item.minggu === num);
      }
    }

    // 4. Fallback ke elemen sedia ada jika tidak ditemui
    if (!f && db.config.fridays2026 && db.config.fridays2026.length > 0) {
      f = db.config.fridays2026.find(item => !item.isCuti) || db.config.fridays2026[0];
    }

    return f || { minggu: 7, tarikh: "2026-02-20", label: "20 Feb 2026", isCuti: false, cutiName: "" };
  }

  // Normalisasi format IC untuk perbandingan (buang sengkang & ruang)
  function cleanIc(icStr) {
    if (!icStr) return "";
    return String(icStr).replace(/[^0-9]/g, "").trim();
  }

  // Format saiz fail kepada format mesra pengguna
  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  // Helper Pemampatan Gambar Profil Guru (Resize ke 160x160 JPEG Kualiti Tinggi & Saiz Sangat Ringan)
  function compressImageToBase64(file, maxWidth = 160, maxHeight = 160, quality = 0.82) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) {
        reject(new Error("Fail yang dipilih bukan imej yang sah (Sila pilih format JPG, PNG atau WebP)."));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const width = img.width;
          const height = img.height;
          const minDim = Math.min(width, height);
          const startX = (width - minDim) / 2;
          const startY = (height - minDim) / 2;

          const canvas = document.createElement("canvas");
          canvas.width = maxWidth;
          canvas.height = maxHeight;
          const ctx = canvas.getContext("2d");

          ctx.clearRect(0, 0, maxWidth, maxHeight);
          // Lukis keratan tengah segi empat tepat ke dalam kanvas 160x160
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, maxWidth, maxHeight);

          try {
            const dataUrl = canvas.toDataURL("image/jpeg", quality);
            resolve(dataUrl);
          } catch (err) {
            resolve(canvas.toDataURL("image/png"));
          }
        };
        img.onerror = () => reject(new Error("Gagal membaca data imej. Sila gunakan fail gambar yang sah."));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Gagal membaca fail dari peranti anda."));
      reader.readAsDataURL(file);
    });
  }

  // Pengendali Muat Naik & Penukaran Gambar Profil Guru
  async function handleAvatarUpload(file, targetStaffId = null) {
    if (!file) return;
    try {
      const dataUrl = await compressImageToBase64(file, 160, 160, 0.82);
      const staffId = targetStaffId || (state.currentUser ? state.currentUser.id : null);
      if (!staffId) return;

      const targetStaff = db.staffList.find(s => s.id === staffId);
      if (targetStaff) {
        targetStaff.avatar = dataUrl;
      }

      if (state.currentUser && state.currentUser.id === staffId) {
        state.currentUser.avatar = dataUrl;
        const savedSession = sessionStorage.getItem("SKR_LOGGED_USER");
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession);
            parsed.user.avatar = dataUrl;
            sessionStorage.setItem("SKR_LOGGED_USER", JSON.stringify(parsed));
          } catch (err) {}
        }
      }

      saveErphDatabase(db);
      updateAuthDisplay();
      if (state.activeTab === "portal-guru") renderTeacherPortal();
      if (state.activeTab === "pemantauan") renderMonitoringColumns();
      if (state.activeTab === "konsol-admin") renderAdminConsole();

      safeSwal({
        icon: "success",
        title: "Foto Profil Dikemaskini",
        text: `Gambar profil ${targetStaff ? targetStaff.name : ''} telah berjaya disimpan dan dipaparkan dalam sistem.`,
        timer: 1800,
        showConfirmButton: false
      });
      lucide.createIcons();
    } catch (err) {
      safeSwal({
        icon: "error",
        title: "Ralat Memuat Naik Foto",
        text: err.message || "Gagal memproses fail gambar. Sila cuba lagi.",
        confirmButtonColor: "#e11d48"
      });
    }
  }

  // Pengendali Padam & Kembalikan Ikon Asal Profil
  function handleAvatarRemove(targetStaffId = null) {
    const staffId = targetStaffId || (state.currentUser ? state.currentUser.id : null);
    if (!staffId) return;
    const targetStaff = db.staffList.find(s => s.id === staffId);
    if (!targetStaff) return;

    safeSwal({
      title: "Padam Foto Profil?",
      text: `Adakah anda pasti mahu memadam gambar profil ${targetStaff.name}? Ikon akan digantikan dengan singkatan nama.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Padam",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e11d48"
    }).then(result => {
      if (result.isConfirmed) {
        delete targetStaff.avatar;
        if (state.currentUser && state.currentUser.id === staffId) {
          delete state.currentUser.avatar;
          const savedSession = sessionStorage.getItem("SKR_LOGGED_USER");
          if (savedSession) {
            try {
              const parsed = JSON.parse(savedSession);
              delete parsed.user.avatar;
              sessionStorage.setItem("SKR_LOGGED_USER", JSON.stringify(parsed));
            } catch (err) {}
          }
        }

        saveErphDatabase(db);
        updateAuthDisplay();
        if (state.activeTab === "portal-guru") renderTeacherPortal();
        if (state.activeTab === "pemantauan") renderMonitoringColumns();
        if (state.activeTab === "konsol-admin") renderAdminConsole();

        safeSwal({
          toast: true,
          position: "top-end",
          icon: "info",
          title: "Foto profil dipadamkan.",
          timer: 1500,
          showConfirmButton: false
        });
        lucide.createIcons();
      }
    });
  }

  // ==============================================================
  // ENJIN STORAN DOKUMEN e-RPH (INDEXEDDB FILE STORAGE)
  // Menyimpan dokumen sebenar (PDF / Word / Excel) tanpa had saiz LocalStorage
  // ==============================================================
  const FileStore = {
    dbName: "SKR_ERPH_DOCUMENTS_DB",
    storeName: "erph_files",
    dbInstance: null,

    async init() {
      if (this.dbInstance) return this.dbInstance;
      return new Promise((resolve) => {
        try {
          const req = indexedDB.open(this.dbName, 1);
          req.onupgradeneeded = (e) => {
            const idb = e.target.result;
            if (!idb.objectStoreNames.contains(this.storeName)) {
              idb.createObjectStore(this.storeName, { keyPath: "id" });
            }
          };
          req.onsuccess = (e) => {
            this.dbInstance = e.target.result;
            resolve(this.dbInstance);
          };
          req.onerror = () => resolve(null);
        } catch (err) {
          console.warn("IndexedDB unavailable:", err);
          resolve(null);
        }
      });
    },

    async saveFile(id, fileObj, dataUrl) {
      const db = await this.init();
      if (!db) return false;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction([this.storeName], "readwrite");
          const store = tx.objectStore(this.storeName);
          store.put({
            id: id,
            name: fileObj.name,
            size: fileObj.size,
            type: fileObj.type || "application/octet-stream",
            lastModified: fileObj.lastModified,
            dataUrl: dataUrl
          });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (e) {
          resolve(false);
        }
      });
    },

    async getFile(id) {
      const db = await this.init();
      if (!db) return null;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction([this.storeName], "readonly");
          const store = tx.objectStore(this.storeName);
          const req = store.get(id);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    }
  };

  // Helper Muat Turun & Buka Fail e-RPH Sebenar
  async function downloadOrViewErphDocument(uploadRecord) {
    if (!uploadRecord) return;

    // 1. Dapatkan fail sebenar daripada IndexedDB
    const storedFile = await FileStore.getFile(uploadRecord.id);
    if (storedFile && storedFile.dataUrl) {
      const a = document.createElement("a");
      a.href = storedFile.dataUrl;
      a.download = storedFile.name || uploadRecord.fileName || `eRPH_M${uploadRecord.minggu}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // 2. Jika ada URL luaran (cth: pautan yang dimasukkan)
    if (uploadRecord.fileUrl && uploadRecord.fileUrl.startsWith("http") && !uploadRecord.fileUrl.includes("sample")) {
      window.open(uploadRecord.fileUrl, "_blank");
      return;
    }

    // 3. Jana dokumen fail rasmi e-RPH SK Ranggu secara automatik
    const docContent = `
========================================================================
             KEMENTERIAN PENDIDIKAN MALAYSIA
             SEKOLAH KEBANGSAAN RANGGU, TAWAU (XBA3037)
             SISTEM PEMANTAUAN e-RPH SESI 2026
========================================================================

DOKUMEN PENGHANTARAN RANCANGAN PENGAJARAN HARIAN (e-RPH)
------------------------------------------------------------------------
Nama Guru          : ${uploadRecord.guruName}
Minggu Persekolahan : Minggu ${uploadRecord.minggu}
Tarikh Jumaat      : ${uploadRecord.tarikhJumaat || '-'}
Waktu Dimuat Naik  : ${uploadRecord.uploadedAt}
Status             : ${uploadRecord.status} (BERJAYA DIHANTAR)
Nama Fail Dokumen  : ${uploadRecord.fileName || `eRPH_M${uploadRecord.minggu}.pdf`}
------------------------------------------------------------------------
CATATAN / REFLEKSI GURU:
${uploadRecord.catatan || 'Tiada catatan tambahan.'}

------------------------------------------------------------------------
PENGESAHAN PENTADBIR:
Disemak Oleh       : ${uploadRecord.verifiedBy || 'Dalam Proses Semakan'}
Waktu Semakan      : ${uploadRecord.verifiedAt || '-'}
Ulasan Pentadbir   : ${uploadRecord.ulasan || 'Menunggu ulasan pentadbir penyelia.'}

========================================================================
Dokumen ini disahkan dimuat naik ke dalam Sistem e-RPH Rasmi SK Ranggu.
`;

    const blob = new Blob([docContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = uploadRecord.fileName ? uploadRecord.fileName.replace(/\.pdf$/i, '.txt') : `eRPH_M${uploadRecord.minggu}_${uploadRecord.guruName.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // 3. Elemen DOM
  const elements = {
    loginGateway: document.getElementById("login-gateway"),
    appLayout: document.getElementById("app-layout"),

    // Gateway Elements
    tabLoginBtnGuru: document.getElementById("tab-login-btn-guru"),
    tabLoginBtnAdmin: document.getElementById("tab-login-btn-admin"),
    gatewayFormGuru: document.getElementById("gateway-form-guru"),
    gatewayGuruIc: document.getElementById("gateway-guru-ic"),
    gatewayGuruPwd: document.getElementById("gateway-guru-pwd"),
    gatewayFormAdmin: document.getElementById("gateway-form-admin"),
    loginFeedbackAlert: document.getElementById("login-feedback-alert"),

    // Secret Super Admin Elements (Ikon Setting ⚙️)
    btnSecretAdminTrigger: document.getElementById("btn-secret-admin-trigger"),
    modalSecretAdminAuth: document.getElementById("modal-secret-admin-auth"),
    btnCloseSecretModal: document.getElementById("btn-close-secret-modal"),
    formSecretAdminLogin: document.getElementById("form-secret-admin-login"),
    inputSecretAdminPass: document.getElementById("input-secret-admin-pass"),
    secretAdminFeedback: document.getElementById("secret-admin-feedback"),

    // App Header & Sidebar Elements
    pageTitle: document.getElementById("page-title"),
    pageSubtitle: document.getElementById("page-subtitle"),
    headerWeekSelect: document.getElementById("header-week-select"),
    headerFridayDate: document.getElementById("header-friday-date"),
    authDisplayName: document.getElementById("auth-display-name"),
    authDisplayRole: document.getElementById("auth-display-role"),
    userBadgeIcon: document.getElementById("user-badge-icon"),
    sidebarUserCard: document.getElementById("sidebar-user-card"),
    btnAppLogout: document.getElementById("btn-app-logout"),
    btnHeaderLogout: document.getElementById("btn-header-logout"),
    btnRefreshApp: document.getElementById("btn-refresh-app"),
    btnPrintScreen: document.getElementById("btn-print-screen"),
    sidebar: document.getElementById("sidebar"),
    mobileMenuToggle: document.getElementById("mobile-menu-toggle"),
    mobileMenuClose: document.getElementById("mobile-menu-close"),
    navLinks: document.querySelectorAll(".nav-link"),
    tabContents: document.querySelectorAll(".tab-content"),
    navBtnPemantauan: document.getElementById("nav-btn-pemantauan"),
    navBtnPortalGuru: document.getElementById("nav-btn-portal-guru"),
    navBtnAdminConsole: document.getElementById("nav-btn-admin-console"),
    navBtnEksport: document.getElementById("nav-btn-eksport"),

    // Tab 1 Elements
    statTotalHijau: document.getElementById("stat-total-hijau"),
    statTotalMerah: document.getElementById("stat-total-merah"),
    statTotalPct: document.getElementById("stat-total-pct"),
    pentadbirColumnsWrapper: document.getElementById("pentadbir-columns-wrapper"),
    btnViewModeBaris: document.getElementById("btn-view-mode-baris"),
    btnViewModeJadual: document.getElementById("btn-view-mode-jadual"),
    btnViewModeKolum: document.getElementById("btn-view-mode-kolum"),
    monitoringSearchInput: document.getElementById("monitoring-search-input"),
    btnClearMonitoringSearch: document.getElementById("btn-clear-monitoring-search"),
    monitoringPentadbirFilterGroup: document.getElementById("monitoring-pentadbir-filter-group"),
    monitoringStatusFilterGroup: document.getElementById("monitoring-status-filter-group"),

    // Tab 2 Portal Guru Elements
    portalAvatarWrapper: document.getElementById("portal-avatar-wrapper"),
    portalAvatarInput: document.getElementById("portal-avatar-input"),
    portalTeacherAvatar: document.getElementById("portal-teacher-avatar"),
    portalTeacherName: document.getElementById("portal-teacher-name"),
    portalTeacherDetails: document.getElementById("portal-teacher-details"),
    btnPortalPickAvatar: document.getElementById("btn-portal-pick-avatar"),
    portalAvatarSep: document.getElementById("portal-avatar-sep"),
    btnPortalRemoveAvatar: document.getElementById("btn-portal-remove-avatar"),
    portalUploadWeekTitle: document.getElementById("portal-upload-week-title"),
    portalCurrentStatusBadge: document.getElementById("portal-current-status-badge"),
    btnPortalChangePwd: document.getElementById("btn-portal-change-pwd"),
    formTeacherUpload: document.getElementById("form-teacher-upload"),
    teacherUploadWeek: document.getElementById("teacher-upload-week"),
    teacherUploadDate: document.getElementById("teacher-upload-date"),
    teacherUploadLink: document.getElementById("teacher-upload-link"),
    teacherUploadFilename: document.getElementById("teacher-upload-filename"),
    teacherUploadCatatan: document.getElementById("teacher-upload-catatan"),
    portalHistoryTbody: document.getElementById("portal-history-tbody"),

    // File Upload Direct Elements (Muat Naik Dokumen e-RPH Terus)
    teacherUploadFile: document.getElementById("teacher-upload-file"),
    dropzoneUploadFile: document.getElementById("dropzone-upload-file"),
    btnBrowseFile: document.getElementById("btn-browse-file"),
    fileEmptyState: document.getElementById("file-empty-state"),
    fileSelectedState: document.getElementById("file-selected-state"),
    selectedFileName: document.getElementById("selected-file-name"),
    selectedFileSize: document.getElementById("selected-file-size"),
    btnRemoveSelectedFile: document.getElementById("btn-remove-selected-file"),
    existingFileAlert: document.getElementById("existing-file-alert"),
    existingFileLabel: document.getElementById("existing-file-label"),
    btnDownloadExistingFile: document.getElementById("btn-download-existing-file"),

    // Tab 4 Calendar & Real-Time Clock Elements
    gatewayLiveDay: document.getElementById("gateway-live-day"),
    gatewayLiveDate: document.getElementById("gateway-live-date"),
    gatewayLiveTime: document.getElementById("gateway-live-time"),

    headerLiveDay: document.getElementById("header-live-day"),
    headerLiveDate: document.getElementById("header-live-date"),
    headerLiveTime: document.getElementById("header-live-time"),

    calHeroTime: document.getElementById("cal-hero-time"),
    calHeroDay: document.getElementById("cal-hero-day"),
    calHeroDate: document.getElementById("cal-hero-date"),
    calHeroWeekBadge: document.getElementById("cal-hero-week-badge"),
    calHeroCountdownTitle: document.getElementById("cal-hero-countdown-title"),
    calHeroCountdownText: document.getElementById("cal-hero-countdown-text"),
    calHeroFridayTarget: document.getElementById("cal-hero-friday-target"),

    calMonthTitle: document.getElementById("cal-month-title"),
    calMonthDaysGrid: document.getElementById("cal-month-days-grid"),
    btnCalPrevMonth: document.getElementById("btn-cal-prev-month"),
    btnCalToday: document.getElementById("btn-cal-today"),
    btnCalNextMonth: document.getElementById("btn-cal-next-month"),
    calendarFridaysGrid: document.getElementById("calendar-fridays-grid"),

    // Tab 5 Timetable Elements
    jadualRujukanContainer: document.getElementById("jadual-rujukan-container"),
    btnTimetableAddSlot: document.getElementById("btn-timetable-add-slot"),
    btnTimetablePrint: document.getElementById("btn-timetable-print"),
    btnTimetableReset: document.getElementById("btn-timetable-reset"),
    tabTimetableModeGuru: document.getElementById("tab-timetable-mode-guru"),
    tabTimetableModeKelas: document.getElementById("tab-timetable-mode-kelas"),
    tabTimetableModeInduk: document.getElementById("tab-timetable-mode-induk"),
    filterWrapperGuru: document.getElementById("filter-wrapper-guru"),
    filterWrapperKelas: document.getElementById("filter-wrapper-kelas"),
    filterWrapperInduk: document.getElementById("filter-wrapper-induk"),
    timetableSelectGuru: document.getElementById("timetable-select-guru"),
    timetableTeacherSummary: document.getElementById("timetable-teacher-summary"),
    timetableSelectKelas: document.getElementById("timetable-select-kelas"),
    timetableClassSummary: document.getElementById("timetable-class-summary"),
    timetableSearchInput: document.getElementById("timetable-search-input"),
    timetableFilterIndukHari: document.getElementById("timetable-filter-induk-hari"),
    timetableFilterIndukKelas: document.getElementById("timetable-filter-induk-kelas"),
    timetableFilterIndukSubjek: document.getElementById("timetable-filter-induk-subjek"),
    timetableIndukCount: document.getElementById("timetable-induk-count"),
    timetablePrintSheet: document.getElementById("timetable-print-sheet"),
    btnTimetableTogglePreview: document.getElementById("btn-timetable-toggle-preview"),
    labelTogglePreview: document.getElementById("label-toggle-preview"),
    btnPortalPrintTimetable: document.getElementById("btn-portal-print-timetable"),

    // Tab 6 Admin Console Elements & Takwim
    adminSchoolStartDate: document.getElementById("admin-school-start-date"),
    adminFirstFridayDate: document.getElementById("admin-first-friday-date"),
    adminTotalWeeksInput: document.getElementById("admin-total-weeks-input"),
    adminCurrentWeekInput: document.getElementById("admin-current-week-input"),
    btnAdminSaveSession: document.getElementById("btn-admin-save-session"),
    btnAdminGenerateFridays: document.getElementById("btn-admin-generate-fridays"),
    btnAdminAutoCascadeAll: document.getElementById("btn-admin-auto-cascade-all"),
    btnAdminAddWeekRow: document.getElementById("btn-admin-add-week-row"),
    adminSearchWeek: document.getElementById("admin-search-week"),
    adminTotalFridaysCount: document.getElementById("admin-total-fridays-count"),
    adminActiveWeeksCount: document.getElementById("admin-active-weeks-count"),
    adminHolidayWeeksCount: document.getElementById("admin-holiday-weeks-count"),
    adminWeeksTbody: document.getElementById("admin-weeks-tbody"),
    adminSearchStaff: document.getElementById("admin-search-staff"),
    adminStaffCount: document.getElementById("admin-staff-count"),
    adminStaffTbody: document.getElementById("admin-staff-tbody"),
    btnAdminAddTeacher: document.getElementById("btn-admin-add-teacher"),

    // Tab 7 Export Elements
    btnExportMonitoringExcel: document.getElementById("btn-export-monitoring-excel"),
    btnResetSystemData: document.getElementById("btn-reset-system-data"),

    // Modals
    modalChangePassword: document.getElementById("modal-change-password"),
    btnClosePwdModal: document.getElementById("btn-close-pwd-modal"),
    formChangePwd: document.getElementById("form-change-pwd"),
    newPwdInput: document.getElementById("new-pwd-input"),
    confirmPwdInput: document.getElementById("confirm-pwd-input"),

    modalReviewErph: document.getElementById("modal-review-erph"),
    btnCloseReviewModal: document.getElementById("btn-close-review-modal"),
    modalReviewAvatar: document.getElementById("modal-review-avatar"),
    modalReviewGuruName: document.getElementById("modal-review-guru-name"),
    modalReviewWeekLabel: document.getElementById("modal-review-week-label"),
    modalReviewStatusBox: document.getElementById("modal-review-status-box"),
    modalReviewStatusText: document.getElementById("modal-review-status-text"),
    modalReviewTimestamp: document.getElementById("modal-review-timestamp"),
    modalReviewFilename: document.getElementById("modal-review-filename"),
    modalReviewFilesize: document.getElementById("modal-review-filesize"),
    btnReviewDownloadFile: document.getElementById("btn-review-download-file"),
    modalReviewOpenLink: document.getElementById("modal-review-open-link"),
    modalReviewCatatan: document.getElementById("modal-review-catatan"),
    modalReviewUlasanInput: document.getElementById("modal-review-ulasan-input"),
    btnSaveUlasanPentadbir: document.getElementById("btn-save-ulasan-pentadbir"),

    modalAdminManageStaff: document.getElementById("modal-admin-manage-staff"),
    btnCloseManageStaff: document.getElementById("btn-close-manage-staff"),
    formManageStaff: document.getElementById("form-manage-staff"),
    adminStaffModalAvatarPreview: document.getElementById("admin-staff-modal-avatar-preview"),
    adminStaffModalAvatarInput: document.getElementById("admin-staff-modal-avatar-input"),
    btnAdminModalPickAvatar: document.getElementById("btn-admin-modal-pick-avatar"),
    btnAdminModalRemoveAvatar: document.getElementById("btn-admin-modal-remove-avatar"),
    staffFormId: document.getElementById("staff-form-id"),
    staffFormName: document.getElementById("staff-form-name"),
    staffFormIc: document.getElementById("staff-form-ic"),
    staffFormSession: document.getElementById("staff-form-session"),
    staffFormRole: document.getElementById("staff-form-role"),
    staffFormSupervisor: document.getElementById("staff-form-supervisor"),
    staffFormStatus: document.getElementById("staff-form-status"),
    staffReasonWrapper: document.getElementById("staff-reason-wrapper"),
    staffFormReason: document.getElementById("staff-form-reason"),
    btnAdminRemoveStaff: document.getElementById("btn-admin-remove-staff"),
    modalStaffTitle: document.getElementById("modal-staff-title"),

    // Modal Timetable Slot
    modalEditTimetableSlot: document.getElementById("modal-edit-timetable-slot"),
    modalTimetableTitle: document.getElementById("modal-timetable-title"),
    btnCloseModalTimetable: document.getElementById("btn-close-modal-timetable"),
    btnCancelTimetableSlot: document.getElementById("btn-cancel-timetable-slot"),
    formEditTimetableSlot: document.getElementById("form-edit-timetable-slot"),
    slotFormId: document.getElementById("slot-form-id"),
    slotFormGuru: document.getElementById("slot-form-guru"),
    slotFormHari: document.getElementById("slot-form-hari"),
    slotFormWaktu: document.getElementById("slot-form-waktu"),
    slotFormMasa: document.getElementById("slot-form-masa"),
    slotFormKelas: document.getElementById("slot-form-kelas"),
    slotFormSubjek: document.getElementById("slot-form-subjek"),
    slotClashWarning: document.getElementById("slot-clash-warning"),
    slotClashText: document.getElementById("slot-clash-text"),
    btnDeleteTimetableSlot: document.getElementById("btn-delete-timetable-slot")
  };

  let activeReviewUploadId = null;

  // ==============================================================
  // 4. LOGIK SKRIN LOG MASUK (GATEWAY AUTHENTICATION)
  // ==============================================================
  function checkExistingSession() {
    const savedSession = sessionStorage.getItem("SKR_LOGGED_USER");
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession);
        // Pastikan menyegerakkan rekod profil terkini daripada db.staffList (termasuk avatar)
        const latestStaff = db.staffList.find(s => s.id === sessionData.user?.id);
        if (latestStaff) {
          state.currentUser = { ...sessionData.user, ...latestStaff, isSuperAdmin: sessionData.isSuperAdmin };
        } else {
          state.currentUser = sessionData.user;
        }
        state.isSuperAdminAuthenticated = sessionData.isSuperAdmin;

        // Buka App Layout, sembunyikan Gateway
        elements.loginGateway.classList.add("hidden");
        elements.appLayout.classList.remove("hidden");

        updateAuthDisplay();
        initWeekOptions();

        // Tentukan tab mula mengikut peranan
        if (state.currentUser.isSupervisor || state.isSuperAdminAuthenticated) {
          switchTab("pemantauan");
        } else {
          switchTab("portal-guru");
        }
        return;
      } catch (err) {
        sessionStorage.removeItem("SKR_LOGGED_USER");
      }
    }

    // Jika belum ada sesi, pastikan Login Gateway terpapar
    elements.loginGateway.classList.remove("hidden");
    elements.appLayout.classList.add("hidden");
    lucide.createIcons();
  }

  function handleSuccessfulLogin(userObj, isSuper = false) {
    // Sinkronkan sebarang avatar profil sedia ada dari senarai staf
    const existingStaff = db.staffList.find(s => s.id === userObj.id);
    if (existingStaff && existingStaff.avatar) {
      userObj.avatar = existingStaff.avatar;
    }

    state.currentUser = userObj;
    state.isSuperAdminAuthenticated = isSuper;

    // Simpan dalam sessionStorage
    sessionStorage.setItem("SKR_LOGGED_USER", JSON.stringify({
      user: userObj,
      isSuperAdmin: isSuper
    }));

    // Tukar paparan: Sembunyikan Gateway, Buka App
    elements.loginGateway.classList.add("hidden");
    elements.appLayout.classList.remove("hidden");

    updateAuthDisplay();
    initWeekOptions();

    if (isSuper) {
      switchTab("pemantauan");
    } else if (userObj.isSupervisor) {
      switchTab("pemantauan");
    } else {
      switchTab("portal-guru");
    }

    lucide.createIcons();
  }

  // Helper Keselamatan: Safe SweetAlert2 Wrapper (Cegah sebarang ralat jika CDN disekat)
  function safeSwal(opts) {
    try {
      if (typeof Swal !== "undefined" && Swal && typeof Swal.fire === "function") {
        return Swal.fire(opts);
      }
    } catch (err) {
      console.warn("SweetAlert notification:", err);
    }
  }

  // Helper Paparan Maklum Balas Log Masuk (Inline Banner & Alert)
  function showLoginFeedback(message, type = "error") {
    if (elements.loginFeedbackAlert) {
      elements.loginFeedbackAlert.classList.remove("hidden", "bg-rose-50", "text-rose-800", "border-rose-300", "bg-emerald-50", "text-emerald-800", "border-emerald-300");
      if (type === "error") {
        elements.loginFeedbackAlert.className = "p-3.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300 shadow-xs flex items-start space-x-2";
        elements.loginFeedbackAlert.innerHTML = `<span class="text-rose-600 font-bold text-sm leading-none flex-shrink-0">⚠️</span> <span class="leading-relaxed">${message}</span>`;
      } else {
        elements.loginFeedbackAlert.className = "p-3.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs flex items-start space-x-2";
        elements.loginFeedbackAlert.innerHTML = `<span class="text-emerald-600 font-bold text-sm leading-none flex-shrink-0">✅</span> <span class="leading-relaxed">${message}</span>`;
      }
      elements.loginFeedbackAlert.classList.remove("hidden");
    }

    safeSwal({
      icon: type === "error" ? "error" : "success",
      title: type === "error" ? "Ralat Log Masuk" : "Berjaya",
      text: message,
      confirmButtonColor: type === "error" ? "#e11d48" : "#0284c7"
    });
  }

  function handleLogout() {
    sessionStorage.removeItem("SKR_LOGGED_USER");
    state.currentUser = null;
    state.isSuperAdminAuthenticated = false;

    // Reset borang login
    if (elements.gatewayGuruIc) elements.gatewayGuruIc.value = "";
    if (elements.gatewayGuruPwd) elements.gatewayGuruPwd.value = "";
    if (elements.inputSecretAdminPass) elements.inputSecretAdminPass.value = "";
    if (elements.loginFeedbackAlert) elements.loginFeedbackAlert.classList.add("hidden");
    if (elements.secretAdminFeedback) elements.secretAdminFeedback.classList.add("hidden");

    // Sembunyikan App, buka Login Gateway
    elements.appLayout.classList.add("hidden");
    elements.loginGateway.classList.remove("hidden");

    safeSwal({
      toast: true,
      position: "top-end",
      icon: "info",
      title: "Anda telah log keluar daripada sistem.",
      timer: 1800,
      showConfirmButton: false
    });

    lucide.createIcons();
  }

  // 1. Gateway Tab Switching (Portal Guru vs Pentadbir Sekolah)
  if (elements.tabLoginBtnGuru) {
    elements.tabLoginBtnGuru.addEventListener("click", (e) => {
      e.preventDefault();
      elements.tabLoginBtnGuru.className = "flex-1 py-2.5 rounded-lg transition bg-sky-600 text-white shadow-sm font-black cursor-pointer";
      elements.tabLoginBtnAdmin.className = "flex-1 py-2.5 rounded-lg transition text-slate-600 hover:text-slate-900 font-bold cursor-pointer bg-transparent";

      elements.gatewayFormGuru.classList.remove("hidden");
      elements.gatewayFormAdmin.classList.add("hidden");
      if (elements.loginFeedbackAlert) elements.loginFeedbackAlert.classList.add("hidden");
      lucide.createIcons();
    });
  }

  if (elements.tabLoginBtnAdmin) {
    elements.tabLoginBtnAdmin.addEventListener("click", (e) => {
      e.preventDefault();
      elements.tabLoginBtnAdmin.className = "flex-1 py-2.5 rounded-lg transition bg-sky-600 text-white shadow-sm font-black cursor-pointer";
      elements.tabLoginBtnGuru.className = "flex-1 py-2.5 rounded-lg transition text-slate-600 hover:text-slate-900 font-bold cursor-pointer bg-transparent";

      elements.gatewayFormAdmin.classList.remove("hidden");
      elements.gatewayFormGuru.classList.add("hidden");
      if (elements.loginFeedbackAlert) elements.loginFeedbackAlert.classList.add("hidden");
      lucide.createIcons();
    });
  }

  // 2. Ikon Tetapan Tersembunyi (Super Admin Settings Trigger ⚙️)
  if (elements.btnSecretAdminTrigger) {
    elements.btnSecretAdminTrigger.addEventListener("click", () => {
      if (elements.modalSecretAdminAuth) {
        elements.modalSecretAdminAuth.classList.remove("hidden");
        if (elements.inputSecretAdminPass) {
          elements.inputSecretAdminPass.value = "";
          elements.inputSecretAdminPass.focus();
        }
        if (elements.secretAdminFeedback) {
          elements.secretAdminFeedback.classList.add("hidden");
        }
        lucide.createIcons();
      }
    });
  }

  if (elements.btnCloseSecretModal) {
    elements.btnCloseSecretModal.addEventListener("click", () => {
      if (elements.modalSecretAdminAuth) {
        elements.modalSecretAdminAuth.classList.add("hidden");
      }
    });
  }

  // Helper Keselamatan: Pengesahan Kod Rahsia Super Admin (SHA-256 Hash)
  async function verifyAdminCode(rawInput) {
    const trimmed = (rawInput || "").trim().toUpperCase();
    if (!trimmed) return false;
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(trimmed);
      const hash = await crypto.subtle.digest("SHA-256", data);
      const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
      const expectedHash = db.config?.security?.systemAdminHash || "f4cf6f28cd1d68e6394b136e8877ab487018648509770a73153bf0af2b3168d9";
      return hex === expectedHash;
    } catch (err) {
      return btoa(trimmed) === "VFMuRklLUkVZMzc=";
    }
  }

  // 3. Submit Super Admin Code dari Modal Tetapan Tersembunyi
  if (elements.formSecretAdminLogin) {
    elements.formSecretAdminLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = (elements.inputSecretAdminPass?.value || "").trim().toUpperCase();
      const isValid = await verifyAdminCode(code);

      if (isValid) {
        const superAdminUser = {
          id: 24,
          name: "MOHAMMAD FIKREY BIN ABDUL GAPAR",
          role: "Pentadbir Sistem & Penyelaras ICT (Super Admin)",
          ic: "910528-12-5411",
          isSupervisor: true,
          supervisorId: null,
          isSuperAdmin: true
        };

        if (elements.modalSecretAdminAuth) {
          elements.modalSecretAdminAuth.classList.add("hidden");
        }

        safeSwal({
          icon: "success",
          title: "Akses Super Admin Diberikan",
          text: "Selamat bertugas Ts. Mohammad Fikrey. Semua modul pengurusan sistem diaktifkan.",
          timer: 1800,
          showConfirmButton: false
        });

        handleSuccessfulLogin(superAdminUser, true);
      } else {
        if (elements.secretAdminFeedback) {
          elements.secretAdminFeedback.textContent = "❌ Kod akses keselamatan tidak sah. Sila pastikan anda mempunyai hak akses.";
          elements.secretAdminFeedback.classList.remove("hidden");
        }
        safeSwal({
          icon: "error",
          title: "Akses Ditolak",
          text: "Kod akses keselamatan tidak sah. Sila pastikan anda mempunyai kebenaran rasmi sebagai pentadbir sistem.",
          confirmButtonColor: "#d97706"
        });
      }
    });
  }

  // 4. Submit Log Masuk Portal Guru (Smart & Resilient Matching)
  if (elements.gatewayFormGuru) {
    elements.gatewayFormGuru.addEventListener("submit", async (e) => {
      e.preventDefault();

      const rawIc = (elements.gatewayGuruIc.value || "").trim();
      const rawPwd = (elements.gatewayGuruPwd.value || "").trim();

      if (!rawIc) {
        showLoginFeedback("Sila masukkan Nombor Kad Pengenalan anda.", "error");
        return;
      }

      if (!rawPwd) {
        showLoginFeedback("Sila masukkan Kata Laluan anda.", "error");
        return;
      }

      // SEMAKAN PINTAR SUPER ADMIN: Jika Ts. Fikrey masukkan kod akses rahsia atau IC beliau
      const isPasskeyMatch = (await verifyAdminCode(rawPwd)) || (await verifyAdminCode(rawIc));
      const isFikreyIc = (cleanIc(rawIc) === "910528125411");

      if (isPasskeyMatch || (isFikreyIc && rawPwd.toUpperCase() === "TS.FIKREY37")) {
        const superAdminUser = {
          id: 24,
          name: "MOHAMMAD FIKREY BIN ABDUL GAPAR",
          role: "Pentadbir Sistem & Penyelaras ICT (Super Admin)",
          ic: "910528-12-5411",
          isSupervisor: true,
          supervisorId: null,
          isSuperAdmin: true
        };

        showLoginFeedback("Pengesahan Super Admin Berjaya! Membuka sistem...", "success");
        setTimeout(() => handleSuccessfulLogin(superAdminUser, true), 300);
        return;
      }

      const inputIcClean = cleanIc(rawIc);

      // Cari guru dalam database staf mengikut pelbagai format (bersih, sengkang, kod)
      const matched = db.staffList.find(s => {
        const sIcClean = cleanIc(s.ic);
        return (sIcClean && sIcClean === inputIcClean) || 
               (s.ic && s.ic.trim() === rawIc) || 
               (s.code && s.code.toUpperCase() === rawIc.toUpperCase());
      });

      if (!matched) {
        showLoginFeedback(`Nombor Kad Pengenalan (${rawIc}) tidak ditemui dalam senarai rasmi guru SK Ranggu. Sila pastikan anda memasukkan 12 digit No. KP yang tepat (contoh: 730926-12-5494).`, "error");
        return;
      }

      // Sahkan kata laluan (terima custom password, atau sementara P3nd1d1kan tidak kira huruf besar/kecil)
      const validCustomPwd = matched.customPassword;
      const isDefaultPwd = (rawPwd.toLowerCase() === "p3nd1d1kan");
      const isCustomPwd = (validCustomPwd && rawPwd === validCustomPwd);
      const isFikreyDeveloper = (matched.id === 24 && (rawPwd.toUpperCase() === "TS.FIKREY37" || isDefaultPwd));

      if (!isDefaultPwd && !isCustomPwd && !isFikreyDeveloper) {
        showLoginFeedback(`Kata laluan tidak tepat bagi Cikgu ${matched.name}. Sila gunakan kata laluan sementara rasmi: P3nd1d1kan`, "error");
        return;
      }

      const isLeadership = [1, 2, 3, 4, 5].includes(matched.id);
      const isSuper = (matched.id === 24 && rawPwd.toUpperCase() === "TS.FIKREY37");

      const userObj = {
        id: matched.id,
        name: matched.name,
        role: matched.role,
        ic: matched.ic,
        isSupervisor: isLeadership,
        supervisorId: matched.supervisorId,
        isSuperAdmin: isSuper
      };

      showLoginFeedback(`Log masuk berjaya! Selamat datang, ${matched.name}.`, "success");
      setTimeout(() => handleSuccessfulLogin(userObj, isSuper), 300);
    });
  }

  // 5. Select Pentadbir Sekolah (Quick Leadership Log In)
  document.querySelectorAll(".btn-gateway-admin-select").forEach(btn => {
    btn.addEventListener("click", () => {
      const adminId = parseInt(btn.dataset.gatewayAdminId);
      const matched = db.staffList.find(s => s.id === adminId);

      if (matched) {
        const userObj = {
          id: matched.id,
          name: matched.name,
          role: matched.role,
          ic: matched.ic,
          isSupervisor: true,
          supervisorId: matched.supervisorId,
          isSuperAdmin: false
        };

        safeSwal({
          icon: "success",
          title: `Log Masuk Pentadbir`,
          text: `Selamat bertugas, ${matched.name} (${matched.role}).`,
          timer: 1600,
          showConfirmButton: false
        });

        handleSuccessfulLogin(userObj, false);
      }
    });
  });

  // Logout Buttons
  elements.btnAppLogout.addEventListener("click", handleLogout);
  elements.btnHeaderLogout.addEventListener("click", handleLogout);

  // ==============================================================
  // 5. INISIALISASI & PILIHAN MINGGU HEADER
  // ==============================================================
  function initWeekOptions() {
    elements.headerWeekSelect.innerHTML = "";
    elements.teacherUploadWeek.innerHTML = "";
    if (elements.adminCurrentWeekInput) elements.adminCurrentWeekInput.innerHTML = "";

    db.config.fridays2026.forEach(f => {
      const isCuti = Boolean(f.isCuti);
      const val = isCuti ? `cuti-${f.tarikh}` : f.minggu;
      const labelText = isCuti
        ? `🏖️ [CUTI] ${f.cutiName || 'Cuti Persekolahan'} • ${f.label}`
        : `Minggu ${f.minggu} • ${f.label}`;

      const isSelected = (String(f.minggu) === String(state.activeWeek) || `cuti-${f.tarikh}` === String(state.activeWeek));

      // 1. Dropdown Header Utama
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = labelText;
      if (isSelected) opt.selected = true;
      elements.headerWeekSelect.appendChild(opt);

      // 2. Dropdown Portal Guru
      const optPortal = document.createElement("option");
      optPortal.value = val;
      optPortal.textContent = labelText;
      if (isSelected) optPortal.selected = true;
      elements.teacherUploadWeek.appendChild(optPortal);

      // 3. Dropdown Tetapan Admin
      if (elements.adminCurrentWeekInput && !isCuti) {
        const optAdmin = document.createElement("option");
        optAdmin.value = f.minggu;
        optAdmin.textContent = `Minggu ${f.minggu} (${f.label})`;
        if (f.minggu === (db.config.school.currentWeek || state.activeWeek)) optAdmin.selected = true;
        elements.adminCurrentWeekInput.appendChild(optAdmin);
      }
    });

    updateFridayDisplay();
  }

  function updateFridayDisplay() {
    const f = getFridayInfo(state.activeWeek);
    if (f.isCuti) {
      elements.headerFridayDate.textContent = `${f.label} (🏖️ CUTI)`;
      elements.teacherUploadDate.value = `${f.label} [Cuti: ${f.cutiName || 'Persekolahan'}]`;
      elements.portalUploadWeekTitle.textContent = `🏖️ Minggu Cuti: ${f.cutiName || 'Cuti Persekolahan'} (${f.label})`;
    } else {
      elements.headerFridayDate.textContent = f.label;
      elements.teacherUploadDate.value = f.label;
      elements.portalUploadWeekTitle.textContent = `Penghantaran e-RPH Minggu ${f.minggu} (${f.label})`;
    }
  }

  // ==============================================================
  // 6. PENUKARAN TAB NAVIGASI & KAWALAN HAK AKSES PERANAN
  // ==============================================================
  function switchTab(tabId) {
    const isSuper = state.isSuperAdminAuthenticated;
    const isGb = (!isSuper && state.currentUser && state.currentUser.id === 1);
    const isGpk = (!isSuper && state.currentUser && [2, 3, 4, 5].includes(state.currentUser.id));
    const isTeacher = (!isSuper && !isGb && !isGpk);

    // KESELAMATAN SEKATAN AKSES MENGIKUT PERANAN:
    // 1. Guru biasa DILARANG akses pemantauan pentadbir, konsol admin, atau eksport
    if (isTeacher && (tabId === "pemantauan" || tabId === "konsol-admin" || tabId === "eksport")) {
      Swal.fire({
        icon: "info",
        title: "Paparan Terhad Guru",
        text: "Paparan ini khusus untuk pentadbir sekolah sahaja. Anda dialihkan ke Portal Peribadi e-RPH anda.",
        timer: 1600,
        showConfirmButton: false
      });
      tabId = "portal-guru";
    }

    // 2. GPK (Pentadbir Sekolah) DILARANG akses Konsol Pentadbir Sistem (Ts. Fikrey) atau Eksport
    if (isGpk && (tabId === "konsol-admin" || tabId === "eksport")) {
      Swal.fire({
        icon: "warning",
        title: "Akses Terhad",
        text: "Modul ini tidak dibuka untuk peranan Penolong Kanan.",
        confirmButtonColor: "#0284c7"
      });
      tabId = "pemantauan";
    }

    // 3. Guru Besar DILARANG buka Konsol Pembangun Sistem (dikunci khusus untuk Ts. Fikrey)
    if (isGb && tabId === "konsol-admin") {
      Swal.fire({
        icon: "warning",
        title: "Konsol Teknikal Pembangun",
        text: "Konsol pentadbir sistem dikunci khusus untuk Ts. Mohammad Fikrey (Penyelaras ICT).",
        confirmButtonColor: "#d97706"
      });
      tabId = "pemantauan";
    }

    state.activeTab = tabId;

    // Jika tab adalah Konsol Admin dan belum disahkan, minta pengesahan keselamatan
    if (tabId === "konsol-admin" && !state.isSuperAdminAuthenticated) {
      promptSuperAdminAuth(() => switchTab("konsol-admin"));
      return;
    }

    elements.navLinks.forEach(link => {
      if (link.dataset.tab === tabId) {
        link.classList.add("bg-sky-600", "text-white", "shadow-sm");
        link.classList.remove("text-slate-300", "hover:bg-slate-800", "hover:text-white");
      } else {
        link.classList.remove("bg-sky-600", "text-white", "shadow-sm");
        link.classList.add("text-slate-300", "hover:bg-slate-800", "hover:text-white");
      }
    });

    elements.tabContents.forEach(content => {
      if (content.id === `tab-${tabId}`) {
        content.classList.remove("hidden");
      } else {
        content.classList.add("hidden");
      }
    });

    // Kemaskini Tajuk Header Dinamik Mengikut Peranan
    let monitoringTitle = "Pemantauan 5 Lajur Pentadbir e-RPH";
    let monitoringSub = "Penghantaran Mingguan Setiap Jumaat • SK Ranggu Sesi 2026";

    if (isGpk) {
      const gpkName = state.currentUser.role.split('(')[0].trim();
      monitoringTitle = `Pemantauan Guru Seliaan (${gpkName})`;
      monitoringSub = "Hanya Memaparkan Kumpulan Guru di Bawah Seliaan Anda Sahaja";
    } else if (isGb) {
      monitoringTitle = "Pemantauan Keseluruhan Sekolah (Semua Guru)";
      monitoringSub = "Penyeliaan Penuh 5 Lajur Pentadbir • Akses Guru Besar";
    } else if (isSuper) {
      monitoringTitle = "Papan Induk Pemantauan e-RPH (Akses Penuh Super Admin)";
      monitoringSub = "Kawalan Teknikal 5 Lajur Pentadbir, Folder Guru Besar & Status Guru";
    }

    const titles = {
      "pemantauan": { title: monitoringTitle, sub: monitoringSub },
      "portal-guru": { title: "Portal Peribadi Guru e-RPH", sub: "Pengisian & Semakan Penghantaran e-RPH Nama Sendiri" },
      "carta-organisasi": { title: "Carta Organisasi Jawatankuasa e-RPH", sub: "Struktur Hierarki Penyeliaan Bertingkat SK Ranggu 2026" },
      "kalendar": { title: "Kalendar Penghantaran Jumaat 2026", sub: "Jadual Penuh 43 Hari Jumaat Tarikh Akhir Muat Naik" },
      "jadual-rujukan": { title: "Jadual Waktu Persekolahan Rujukan", sub: "Rujukan Waktu Kelas & Guru (Penghantaran e-RPH Tetap Setiap Jumaat)" },
      "konsol-admin": { title: "Konsol Pentadbir Sistem (Ts. Mohammad Fikrey)", sub: "Kawalan Penuh Teknikal & Pengurusan Guru" },
      "eksport": { title: "Eksport & Sandaran Data", sub: "Jana Fail Microsoft Excel (.xlsx)" }
    };

    const currentMeta = titles[tabId] || { title: "Sistem e-RPH", sub: "SK Ranggu, Tawau" };
    elements.pageTitle.textContent = currentMeta.title;
    elements.pageSubtitle.textContent = currentMeta.sub;

    // Render tab berkaitan
    if (tabId === "pemantauan") renderMonitoringColumns();
    if (tabId === "portal-guru") renderTeacherPortal();
    if (tabId === "kalendar") renderCalendarFridays();
    if (tabId === "jadual-rujukan") renderTimetableReference();
    if (tabId === "konsol-admin") renderAdminConsole();

    if (window.innerWidth < 768) {
      elements.sidebar.classList.add("hidden");
    }

    lucide.createIcons();
  }

  // 7. Kemaskini Paparan Pengguna Aktif & Menu Sisi Mengikut Peranan
  function updateAuthDisplay() {
    if (!state.currentUser) return;

    elements.authDisplayName.textContent = state.currentUser.name;
    elements.authDisplayRole.textContent = state.currentUser.role;

    const isSuper = state.isSuperAdminAuthenticated;
    const isGb = (!isSuper && state.currentUser.id === 1);
    const isGpk = (!isSuper && [2, 3, 4, 5].includes(state.currentUser.id));
    const isTeacher = (!isSuper && !isGb && !isGpk);

    // Badge Icon (Foto Profil atau Singkatan Peranan)
    if (state.currentUser.avatar) {
      elements.userBadgeIcon.innerHTML = `<img src="${state.currentUser.avatar}" alt="${state.currentUser.name}" class="w-full h-full object-cover rounded-lg">`;
      elements.userBadgeIcon.className = "w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 shadow-xs border border-sky-400 bg-white";
    } else {
      if (isSuper) {
        elements.userBadgeIcon.textContent = "TS";
        elements.userBadgeIcon.className = "w-8 h-8 rounded-lg bg-amber-500 text-white font-black flex items-center justify-center text-xs flex-shrink-0 shadow-xs";
      } else if (isGb) {
        elements.userBadgeIcon.textContent = "GB";
        elements.userBadgeIcon.className = "w-8 h-8 rounded-lg bg-amber-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-xs";
      } else if (isGpk) {
        elements.userBadgeIcon.textContent = "PK";
        elements.userBadgeIcon.className = "w-8 h-8 rounded-lg bg-sky-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-xs";
      } else {
        elements.userBadgeIcon.textContent = "G";
        elements.userBadgeIcon.className = "w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-xs";
      }
    }

    // KAWALAN PENGASINGAN PAPARAN MENU SISI (SIDEBAR VIEW ISOLATION):
    // 1. Guru Biasa: Hanya nampak Portal Sendiri, Carta Organisasi, Kalendar, Jadual Waktu.
    if (isTeacher) {
      if (elements.navBtnPemantauan) elements.navBtnPemantauan.classList.add("hidden");
      if (elements.navBtnAdminConsole) elements.navBtnAdminConsole.classList.add("hidden");
      if (elements.navBtnEksport) elements.navBtnEksport.classList.add("hidden");
      if (elements.navBtnPortalGuru) {
        elements.navBtnPortalGuru.classList.remove("hidden");
        elements.navBtnPortalGuru.querySelector("span").textContent = "Portal e-RPH Saya";
      }
    }
    // 2. Pentadbir Sekolah (GPK): Nampak Pemantauan Guru Seliaan (Lajur beliau sahaja), Portal, Carta, Kalendar, Jadual.
    else if (isGpk) {
      if (elements.navBtnPemantauan) {
        elements.navBtnPemantauan.classList.remove("hidden");
        elements.navBtnPemantauan.querySelector("span").textContent = "Pemantauan Guru Seliaan";
      }
      if (elements.navBtnPortalGuru) {
        elements.navBtnPortalGuru.classList.remove("hidden");
        elements.navBtnPortalGuru.querySelector("span").textContent = "Hantar e-RPH Saya (Ke GB)";
      }
      if (elements.navBtnAdminConsole) elements.navBtnAdminConsole.classList.add("hidden");
      if (elements.navBtnEksport) elements.navBtnEksport.classList.add("hidden");
    }
    // 3. Guru Besar: Nampak Pemantauan Semua Guru, Folder GB, Carta, Kalendar, Jadual, Eksport Excel.
    else if (isGb) {
      if (elements.navBtnPemantauan) {
        elements.navBtnPemantauan.classList.remove("hidden");
        elements.navBtnPemantauan.querySelector("span").textContent = "Pemantauan Semua Guru";
      }
      if (elements.navBtnPortalGuru) {
        elements.navBtnPortalGuru.classList.remove("hidden");
        elements.navBtnPortalGuru.querySelector("span").textContent = "Folder e-RPH Guru Besar";
      }
      if (elements.navBtnAdminConsole) elements.navBtnAdminConsole.classList.add("hidden");
      if (elements.navBtnEksport) elements.navBtnEksport.classList.remove("hidden");
    }
    // 4. Super Admin (Ts. Fikrey): Akses penuh ke atas semua menu.
    else if (isSuper) {
      if (elements.navBtnPemantauan) {
        elements.navBtnPemantauan.classList.remove("hidden");
        elements.navBtnPemantauan.querySelector("span").textContent = "Pemantauan 5 Lajur Pentadbir";
      }
      if (elements.navBtnPortalGuru) {
        elements.navBtnPortalGuru.classList.remove("hidden");
        elements.navBtnPortalGuru.querySelector("span").textContent = "Portal e-RPH Ts. Fikrey";
      }
      if (elements.navBtnAdminConsole) elements.navBtnAdminConsole.classList.remove("hidden");
      if (elements.navBtnEksport) elements.navBtnEksport.classList.remove("hidden");
    }
  }

  // ==============================================================
  // TAB 1: RENDER PEMANTAUAN LAJUR PENTADBIR
  // ==============================================================
  function renderMonitoringColumns() {
    const isSuper = state.isSuperAdminAuthenticated;
    const isGb = (!isSuper && state.currentUser && state.currentUser.id === 1);
    const isGpk = (!isSuper && state.currentUser && [2, 3, 4, 5].includes(state.currentUser.id));
    const isTeacher = (!isSuper && !isGb && !isGpk);

    // KESELAMATAN: Jika guru biasa membuka tab pemantauan, sekat dan alihkan ke portal guru
    if (isTeacher) {
      switchTab("portal-guru");
      return;
    }

    const container = elements.pentadbirColumnsWrapper;
    if (!container) return;
    container.innerHTML = "";

    const activeFriday = getFridayInfo(state.activeWeek);
    const isHolidayWeek = Boolean(activeFriday && activeFriday.isCuti);
    const weekNum = activeFriday.minggu || state.activeWeek;

    // Paparkan Notis Banner Pengecualian Cuti Persekolahan
    if (isHolidayWeek) {
      const holidayBanner = document.createElement("div");
      holidayBanner.className = "col-span-full mb-3 p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs";
      holidayBanner.innerHTML = `
        <div class="flex items-center space-x-3.5">
          <div class="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-xl shadow-xs flex-shrink-0">
            🏖️
          </div>
          <div>
            <h4 class="font-black text-sm text-amber-950 uppercase tracking-wide">
              MINGGU CUTI PERSEKOLAHAN: ${activeFriday.cutiName || 'Cuti Persekolahan'} (${activeFriday.label})
            </h4>
            <p class="text-xs text-amber-900 font-semibold mt-0.5 leading-snug">
              Penghantaran e-RPH bagi minggu ini adalah <strong>DIKECUALIKAN</strong>. Sistem tidak mengira atau mengenakan status MERAH kepada para guru.
            </p>
          </div>
        </div>
        <span class="px-3.5 py-1.5 rounded-full bg-amber-300/90 text-amber-950 font-black text-xs border border-amber-400 self-start sm:self-center shadow-xs">
          DIKECUALIKAN DARI e-RPH
        </span>
      `;
      container.appendChild(holidayBanner);
    }

    // Ambil data guru aktif & rekod penghantaran minggu ini
    const activeTeachers = db.staffList.filter(s => s.status === "Aktif");
    const weekUploads = db.uploads.filter(u => u.minggu === weekNum);

    // Kira statistik paparan
    let targetStaffForStats = [];
    if (isGpk) {
      targetStaffForStats = db.staffList.filter(s => s.supervisorId === state.currentUser.id && s.status === "Aktif");
    } else {
      targetStaffForStats = activeTeachers;
    }

    let totalHijau = 0;
    let totalMerah = 0;
    if (isHolidayWeek) {
      totalHijau = targetStaffForStats.length;
      totalMerah = 0;
    } else {
      targetStaffForStats.forEach(t => {
        const up = weekUploads.find(u => u.guruId === t.id);
        if (up && up.status === "HIJAU") totalHijau++;
        else totalMerah++;
      });
    }

    const totalActive = targetStaffForStats.length || 1;
    const overallPct = isHolidayWeek ? 100 : Math.round((totalHijau / totalActive) * 100);

    if (elements.statTotalHijau && elements.statTotalMerah && elements.statTotalPct) {
      if (isHolidayWeek) {
        elements.statTotalHijau.textContent = "Cuti Persekolahan";
        elements.statTotalMerah.textContent = "0 Guru Tertunggak (Dikecualikan)";
        elements.statTotalPct.textContent = "100% Cuti Sekolah";
      } else if (isGpk) {
        elements.statTotalHijau.textContent = `${totalHijau} Guru Seliaan Hijau`;
        elements.statTotalMerah.textContent = `${totalMerah} Guru Seliaan Merah`;
        elements.statTotalPct.textContent = `${overallPct}% Selesai`;
      } else {
        elements.statTotalHijau.textContent = `${totalHijau} Guru Hijau (Sekolah)`;
        elements.statTotalMerah.textContent = `${totalMerah} Guru Merah (Sekolah)`;
        elements.statTotalPct.textContent = `${overallPct}% Keseluruhan`;
      }
    }

    // KEMASKINI GAYA BUTANG TOOLBAR MOD PAPARAN & PENAPIS
    if (elements.btnViewModeBaris && elements.btnViewModeJadual && elements.btnViewModeKolum) {
      const mode = state.monitoringViewMode;
      elements.btnViewModeBaris.className = (mode === "baris")
        ? "px-3.5 py-1.5 rounded-lg text-xs font-black transition flex items-center space-x-1.5 bg-sky-600 text-white shadow-xs cursor-pointer"
        : "px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 text-slate-700 hover:text-slate-950 cursor-pointer";

      elements.btnViewModeJadual.className = (mode === "jadual")
        ? "px-3.5 py-1.5 rounded-lg text-xs font-black transition flex items-center space-x-1.5 bg-sky-600 text-white shadow-xs cursor-pointer"
        : "px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 text-slate-700 hover:text-slate-950 cursor-pointer";

      elements.btnViewModeKolum.className = (mode === "kolum")
        ? "px-3.5 py-1.5 rounded-lg text-xs font-black transition flex items-center space-x-1.5 bg-sky-600 text-white shadow-xs cursor-pointer"
        : "px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 text-slate-700 hover:text-slate-950 cursor-pointer";
    }

    // Kawal Penapis Pentadbir (Jika GPK, sembunyikan penapis pentadbir lain)
    if (elements.monitoringPentadbirFilterGroup) {
      if (isGpk) {
        elements.monitoringPentadbirFilterGroup.classList.add("hidden");
      } else {
        elements.monitoringPentadbirFilterGroup.classList.remove("hidden");
        document.querySelectorAll(".btn-filter-pentadbir").forEach(btn => {
          const val = btn.dataset.pentadbirFilter;
          if (val === String(state.monitoringPentadbirFilter)) {
            btn.className = "btn-filter-pentadbir px-2.5 py-1 rounded-lg text-xs font-black transition bg-slate-900 text-white shadow-2xs";
          } else {
            btn.className = "btn-filter-pentadbir px-2.5 py-1 rounded-lg text-xs font-bold transition bg-slate-100 hover:bg-slate-200 text-slate-700";
          }
        });
      }
    }

    // Butang Penapis Status e-RPH
    document.querySelectorAll(".btn-filter-status").forEach(btn => {
      const val = btn.dataset.statusFilter;
      if (val === state.monitoringStatusFilter) {
        if (val === "HIJAU") {
          btn.className = "btn-filter-status px-2.5 py-1 rounded-lg text-xs font-black transition bg-emerald-600 text-white shadow-2xs";
        } else if (val === "MERAH") {
          btn.className = "btn-filter-status px-2.5 py-1 rounded-lg text-xs font-black transition bg-rose-600 text-white shadow-2xs";
        } else {
          btn.className = "btn-filter-status px-2.5 py-1 rounded-lg text-xs font-black transition bg-slate-900 text-white shadow-2xs";
        }
      } else {
        if (val === "HIJAU") {
          btn.className = "btn-filter-status px-2.5 py-1 rounded-lg text-xs font-bold transition bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200";
        } else if (val === "MERAH") {
          btn.className = "btn-filter-status px-2.5 py-1 rounded-lg text-xs font-bold transition bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200";
        } else {
          btn.className = "btn-filter-status px-2.5 py-1 rounded-lg text-xs font-bold transition bg-slate-100 hover:bg-slate-200 text-slate-700";
        }
      }
    });

    // Butang Kosongkan Carian
    if (elements.btnClearMonitoringSearch) {
      if (state.monitoringSearch) {
        elements.btnClearMonitoringSearch.classList.remove("hidden");
      } else {
        elements.btnClearMonitoringSearch.classList.add("hidden");
      }
    }

    // Tentukan Kumpulan Pentadbir yang dipaparkan
    let columnsToRender = db.pentadbir;
    if (isGpk) {
      columnsToRender = db.pentadbir.filter(col => col.id === state.currentUser.id);
    } else if (state.monitoringPentadbirFilter !== "ALL") {
      columnsToRender = db.pentadbir.filter(col => String(col.id) === String(state.monitoringPentadbirFilter));
    }

    // Fungsi Penapis Senarai Guru (Carian & Status)
    function filterTeacherList(staffArr) {
      return staffArr.filter(teacher => {
        // 1. Penapis Status
        if (state.monitoringStatusFilter !== "ALL") {
          const up = weekUploads.find(u => u.guruId === teacher.id);
          const isUp = Boolean(up && up.status === "HIJAU");
          if (state.monitoringStatusFilter === "HIJAU" && !isUp) return false;
          if (state.monitoringStatusFilter === "MERAH" && isUp) return false;
        }

        // 2. Penapis Kata Kunci Carian
        if (state.monitoringSearch) {
          const q = state.monitoringSearch.toLowerCase().trim();
          const matchName = (teacher.name || "").toLowerCase().includes(q);
          const matchCode = (teacher.code || "").toLowerCase().includes(q);
          const matchRole = (teacher.role || "").toLowerCase().includes(q);
          const matchIc = (teacher.ic || "").toLowerCase().includes(q);
          if (!matchName && !matchCode && !matchRole && !matchIc) return false;
        }

        return true;
      });
    }

    // =========================================================================
    // MOD 1: PAPARAN BARIS MENGIKUT PENTADBIR (DEFAULT - SEMUA NAMA KELIHATAN)
    // =========================================================================
    if (state.monitoringViewMode === "baris") {
      container.className = "space-y-5 w-full";

      columnsToRender.forEach(col => {
        let rawStaff = [];
        if (col.id === 1) {
          const gpkStaff = db.staffList.filter(s => [2, 3, 4, 5].includes(s.id));
          const gbRecord = db.staffList.filter(s => s.id === 1);
          rawStaff = [...gbRecord, ...gpkStaff];
        } else {
          rawStaff = db.staffList.filter(s => s.supervisorId === col.id && s.status === "Aktif");
        }

        // Statistik Pentadbir Ini
        let colHijau = 0;
        let colMerah = 0;
        if (isHolidayWeek) {
          colHijau = rawStaff.length;
          colMerah = 0;
        } else {
          rawStaff.forEach(s => {
            const up = weekUploads.find(u => u.guruId === s.id);
            if (up && up.status === "HIJAU") colHijau++;
            else colMerah++;
          });
        }
        const colTotal = rawStaff.length || 1;
        const colPct = isHolidayWeek ? 100 : Math.round((colHijau / colTotal) * 100);

        // Tapis mengikut carian & status
        const filteredStaff = filterTeacherList(rawStaff);
        if (filteredStaff.length === 0 && (state.monitoringSearch || state.monitoringStatusFilter !== "ALL")) {
          // Jika tiada hasil dalam kumpulan ini semasa menapis, teruskan ke pentadbir lain
          return;
        }

        // Cipta Kad Seksyen Baris Pentadbir
        const sectionCard = document.createElement("div");
        sectionCard.className = "bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col";

        // Header Seksyen Pentadbir
        const headerDiv = document.createElement("div");
        headerDiv.className = `${col.headerBg} text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs`;
        headerDiv.innerHTML = `
          <div class="flex items-center gap-3.5">
            <span class="text-xs font-black uppercase tracking-wider bg-black/25 px-3 py-1.5 rounded-xl border border-white/20 shadow-xs flex-shrink-0">${col.shortTitle}</span>
            <div>
              <h3 class="font-black text-sm sm:text-base tracking-wide leading-tight break-words">${col.name}</h3>
              <p class="text-xs text-white/90 font-medium break-words mt-0.5">${col.role}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 self-start sm:self-auto">
            <div class="bg-black/20 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-white/10 text-right">
              <div class="text-[9.5px] uppercase font-bold text-white/80">Kadar Penghantaran</div>
              <div class="text-xs sm:text-sm font-black">${isHolidayWeek ? `${rawStaff.length}/${rawStaff.length} Guru (Cuti 100%)` : `${colHijau}/${rawStaff.length} Guru (${colPct}%)`}</div>
            </div>
          </div>
        `;
        sectionCard.appendChild(headerDiv);

        // Bekas Senarai Baris Guru
        const listDiv = document.createElement("div");
        listDiv.className = "divide-y divide-slate-100";

        if (filteredStaff.length === 0) {
          listDiv.innerHTML = `
            <div class="p-6 text-center text-xs text-slate-500 font-medium bg-slate-50">
              Tiada guru yang sepadan dengan kriteria carian atau penapis dalam kumpulan ini.
            </div>
          `;
        } else {
          filteredStaff.forEach((teacher, idx) => {
            const isTeacherGb = (teacher.id === 1);
            const canViewGbFolder = ((state.currentUser && state.currentUser.id === 1) || isSuper);
            const up = weekUploads.find(u => u.guruId === teacher.id);
            const isUploaded = (up && up.status === "HIJAU");

            let timestampDisplay = "Belum memuat naik e-RPH";
            if (isHolidayWeek) {
              timestampDisplay = `Cuti Persekolahan (Dikecualikan)`;
            } else if (isUploaded && up.uploadedAt) {
              timestampDisplay = `Dikemaskini: ${up.uploadedAt}`;
            }

            const rowDiv = document.createElement("div");
            rowDiv.className = `teacher-monitor-row p-3.5 sm:p-4 hover:bg-slate-50/90 transition flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 ${isHolidayWeek ? 'bg-amber-50/20' : isUploaded ? 'bg-emerald-50/25' : 'bg-rose-50/25'}`;

            rowDiv.innerHTML = `
              <!-- Maklumat Utama Guru (Foto, Kod, Sesi, Nama Penuh Tanpa Terpotong & Jawatan) -->
              <div class="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                <span class="text-xs font-mono font-bold text-slate-400 w-6 text-center flex-shrink-0 pt-1 sm:pt-0">${idx + 1}</span>
                
                ${teacher.avatar ? `
                  <img src="${teacher.avatar}" alt="${teacher.name}" class="w-11 h-11 rounded-2xl object-cover flex-shrink-0 border-2 border-slate-200 shadow-xs">
                ` : `
                  <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-xs border-2 border-sky-300">
                    ${teacher.name.charAt(0)}
                  </div>
                `}

                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2 mb-0.5">
                    <span class="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      ${teacher.code}
                    </span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                      ${teacher.session || 'Pagi'}
                    </span>
                  </div>

                  <!-- NAMA GURU PENUH: TIADA TRUNCATE! SEMUA HURUF KELIHATAN DENGAN JELAS -->
                  <h4 class="font-black text-sm sm:text-base text-slate-900 break-words leading-snug">
                    ${teacher.name}
                  </h4>
                  <p class="text-xs text-slate-600 font-medium break-words mt-0.5">
                    ${teacher.role} • No. K/P: <span class="font-mono text-slate-500">${teacher.ic || '-'}</span>
                  </p>
                </div>
              </div>

              <!-- Maklumat Masa, Badge Status & Tindakan -->
              <div class="flex flex-wrap sm:flex-nowrap items-center gap-3 flex-shrink-0 self-stretch sm:self-auto justify-between sm:justify-end border-t lg:border-t-0 pt-2.5 lg:pt-0 border-slate-100">
                <div class="text-left sm:text-right min-w-[130px]">
                  <div class="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Tarikh & Waktu</div>
                  <div class="text-xs font-semibold ${isHolidayWeek ? 'text-amber-800' : isUploaded ? 'text-emerald-800 font-bold' : 'text-slate-500'}">
                    ${timestampDisplay}
                  </div>
                </div>

                <!-- Status Badge -->
                <div class="w-36 sm:w-44 text-center">
                  ${isHolidayWeek ? `
                    <div class="w-full py-2 px-3 rounded-xl bg-amber-500 text-white font-black text-xs shadow-xs flex items-center justify-center gap-1.5">
                      <i data-lucide="sun" class="w-3.5 h-3.5"></i>
                      <span>CUTI SEKOLAH</span>
                    </div>
                  ` : isUploaded ? `
                    <div class="w-full py-2 px-3 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-xs flex items-center justify-center gap-1.5">
                      <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
                      <span>HIJAU - BERJAYA</span>
                    </div>
                  ` : `
                    <div class="w-full py-2 px-3 rounded-xl bg-rose-600 text-white font-black text-xs shadow-xs flex items-center justify-center gap-1.5">
                      <i data-lucide="x-circle" class="w-3.5 h-3.5"></i>
                      <span>MERAH - BELUM HANTAR</span>
                    </div>
                  `}
                </div>

                <!-- Butang Tindakan -->
                <div class="flex items-center gap-1.5">
                  ${(isTeacherGb && !canViewGbFolder) ? `
                    <span class="text-[10px] text-slate-400 italic px-2.5 py-1.5 bg-slate-100 rounded-lg">Folder Sulit GB</span>
                  ` : `
                    <button data-teacher-id="${teacher.id}" class="btn-open-review px-3 py-2 rounded-xl ${isUploaded ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'} font-bold text-xs flex items-center gap-1.5 transition cursor-pointer">
                      <i data-lucide="folder" class="w-3.5 h-3.5"></i>
                      <span>${isUploaded ? 'Buka e-RPH' : 'Perincian'}</span>
                    </button>
                  `}

                  ${isSuper ? `
                    <button data-teacher-id="${teacher.id}" title="Tukar Status (Hijau <-> Merah)" class="btn-toggle-status-super p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer">
                      <i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-amber-600"></i>
                    </button>
                    ${isUploaded ? `
                      <button data-teacher-id="${teacher.id}" title="Padam e-RPH Senyap" class="btn-silent-delete-super p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    ` : ''}
                  ` : ''}
                </div>
              </div>
            `;

            listDiv.appendChild(rowDiv);
          });
        }

        sectionCard.appendChild(listDiv);
        container.appendChild(sectionCard);
      });

      if (container.children.length === 0) {
        container.innerHTML = `
          <div class="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <i data-lucide="search-x" class="w-10 h-10 mx-auto text-slate-400 mb-2"></i>
            <h4 class="font-bold text-sm text-slate-700">Tiada Rekod Guru Ditemui</h4>
            <p class="text-xs text-slate-500 mt-1">Sila laraskan semula kata kunci carian atau pilihan penapis anda.</p>
          </div>
        `;
      }
    }

    // =========================================================================
    // MOD 2: PAPARAN JADUAL PENUH SEMUA GURU (FORMAT JADUAL MASTER)
    // =========================================================================
    else if (state.monitoringViewMode === "jadual") {
      container.className = "w-full";

      // Kumpul semua guru yang terlibat
      let masterStaffList = [];
      columnsToRender.forEach(col => {
        let rawStaff = [];
        if (col.id === 1) {
          const gpkStaff = db.staffList.filter(s => [2, 3, 4, 5].includes(s.id));
          const gbRecord = db.staffList.filter(s => s.id === 1);
          rawStaff = [...gbRecord, ...gpkStaff];
        } else {
          rawStaff = db.staffList.filter(s => s.supervisorId === col.id && s.status === "Aktif");
        }
        rawStaff.forEach(s => {
          if (!masterStaffList.some(item => item.id === s.id)) {
            masterStaffList.push({ ...s, supervisorCol: col });
          }
        });
      });

      const filteredStaff = filterTeacherList(masterStaffList);

      const tableCard = document.createElement("div");
      tableCard.className = "bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden";

      tableCard.innerHTML = `
        <div class="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 class="font-black text-sm sm:text-base">Jadual Lengkap Pemantauan e-RPH</h3>
            <p class="text-xs text-slate-400">Senarai setiap guru dalam baris mendatar yang kemas dan jelas</p>
          </div>
          <span class="px-3 py-1 bg-slate-800 text-white rounded-xl text-xs font-bold border border-slate-700 self-start sm:self-auto">
            ${filteredStaff.length} Guru Dipaparkan
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold text-[11px] uppercase tracking-wider">
                <th class="py-3 px-3 text-center w-12">Bil</th>
                <th class="py-3 px-4 min-w-[260px]">Maklumat Guru (Nama Penuh & Jawatan)</th>
                <th class="py-3 px-3 min-w-[130px]">Pentadbir</th>
                <th class="py-3 px-3 text-center min-w-[170px]">Status Minggu ${weekNum}</th>
                <th class="py-3 px-3 text-right min-w-[140px]">Tarikh & Masa</th>
                <th class="py-3 px-4 text-center min-w-[140px]">Tindakan</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${filteredStaff.length === 0 ? `
                <tr>
                  <td colspan="6" class="p-8 text-center text-slate-500 font-medium">
                    Tiada guru ditemui mengikut tapisan carian atau status semasa.
                  </td>
                </tr>
              ` : filteredStaff.map((teacher, idx) => {
                const isTeacherGb = (teacher.id === 1);
                const canViewGbFolder = ((state.currentUser && state.currentUser.id === 1) || isSuper);
                const up = weekUploads.find(u => u.guruId === teacher.id);
                const isUploaded = (up && up.status === "HIJAU");

                let timestampDisplay = "Belum muat naik";
                if (isHolidayWeek) {
                  timestampDisplay = `Cuti Sekolah`;
                } else if (isUploaded && up.uploadedAt) {
                  timestampDisplay = up.uploadedAt;
                }

                const supervisorCol = teacher.supervisorCol || db.pentadbir.find(c => c.id === teacher.supervisorId) || db.pentadbir[0];

                return `
                  <tr class="hover:bg-slate-50/90 transition ${isHolidayWeek ? 'bg-amber-50/10' : isUploaded ? 'bg-emerald-50/15' : 'bg-rose-50/15'}">
                    <td class="py-3 px-3 text-center font-mono font-bold text-slate-400">${idx + 1}</td>
                    
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-3">
                        ${teacher.avatar ? `
                          <img src="${teacher.avatar}" alt="${teacher.name}" class="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-slate-200">
                        ` : `
                          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0 border border-sky-300">
                            ${teacher.name.charAt(0)}
                          </div>
                        `}
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center gap-1.5 mb-0.5">
                            <span class="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">${teacher.code}</span>
                            <span class="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">${teacher.session || 'Pagi'}</span>
                          </div>
                          <!-- NAMA GURU PENUH: TIADA TRUNCATE! -->
                          <div class="font-black text-slate-900 text-xs sm:text-sm break-words">${teacher.name}</div>
                          <div class="text-[11px] text-slate-500 font-medium break-words">${teacher.role} • <span class="font-mono">${teacher.ic || '-'}</span></div>
                        </div>
                      </div>
                    </td>

                    <td class="py-3 px-3">
                      <span class="inline-block px-2 py-0.5 rounded-lg text-[10.5px] font-black text-white ${supervisorCol.bgClass}">
                        ${supervisorCol.shortTitle}
                      </span>
                      <div class="text-[10px] text-slate-500 font-bold truncate max-w-[140px]" title="${supervisorCol.name}">${supervisorCol.name}</div>
                    </td>

                    <td class="py-3 px-3 text-center">
                      ${isHolidayWeek ? `
                        <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                          <i data-lucide="sun" class="w-3.5 h-3.5 text-amber-600"></i>
                          <span>Cuti Sekolah</span>
                        </span>
                      ` : isUploaded ? `
                        <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-600"></i>
                          <span>Hijau (Hantar)</span>
                        </span>
                      ` : `
                        <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                          <i data-lucide="x-circle" class="w-3.5 h-3.5 text-rose-600"></i>
                          <span>Merah (Belum)</span>
                        </span>
                      `}
                    </td>

                    <td class="py-3 px-3 text-right font-medium text-slate-600 font-mono text-[11px]">
                      ${timestampDisplay}
                    </td>

                    <td class="py-3 px-4 text-center">
                      <div class="flex items-center justify-center gap-1.5">
                        ${(isTeacherGb && !canViewGbFolder) ? `
                          <span class="text-[10px] text-slate-400 italic">Folder Sulit</span>
                        ` : `
                          <button data-teacher-id="${teacher.id}" class="btn-open-review px-2.5 py-1.5 rounded-lg ${isUploaded ? 'bg-sky-600 hover:bg-sky-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs">
                            <i data-lucide="folder" class="w-3 h-3"></i>
                            <span>${isUploaded ? 'Buka' : 'Perincian'}</span>
                          </button>
                        `}

                        ${isSuper ? `
                          <button data-teacher-id="${teacher.id}" title="Tukar Status (Hijau <-> Merah)" class="btn-toggle-status-super p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer">
                            <i data-lucide="refresh-cw" class="w-3 h-3 text-amber-600"></i>
                          </button>
                          ${isUploaded ? `
                            <button data-teacher-id="${teacher.id}" title="Padam e-RPH Senyap" class="btn-silent-delete-super p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer">
                              <i data-lucide="trash-2" class="w-3 h-3"></i>
                            </button>
                          ` : ''}
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      `;

      container.appendChild(tableCard);
    }

    // =========================================================================
    // MOD 3: PAPARAN 5 KOLUM KAD (DENGAN NAMA PENUH DIJAMIN TIDAK TERPOTONG)
    // =========================================================================
    else {
      container.className = isGpk
        ? "max-w-2xl mx-auto w-full space-y-4"
        : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-start";

      columnsToRender.forEach(col => {
        let rawStaff = [];
        if (col.id === 1) {
          const gpkStaff = db.staffList.filter(s => [2, 3, 4, 5].includes(s.id));
          const gbRecord = db.staffList.filter(s => s.id === 1);
          rawStaff = [...gbRecord, ...gpkStaff];
        } else {
          rawStaff = db.staffList.filter(s => s.supervisorId === col.id && s.status === "Aktif");
        }

        let colHijau = 0;
        let colMerah = 0;
        if (isHolidayWeek) {
          colHijau = rawStaff.length;
          colMerah = 0;
        } else {
          rawStaff.forEach(s => {
            const up = weekUploads.find(u => u.guruId === s.id);
            if (up && up.status === "HIJAU") colHijau++;
            else colMerah++;
          });
        }
        const colTotal = rawStaff.length || 1;
        const colPct = isHolidayWeek ? 100 : Math.round((colHijau / colTotal) * 100);

        const filteredStaff = filterTeacherList(rawStaff);

        const colCard = document.createElement("div");
        colCard.className = "bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col";

        // Header Lajur (Tiada potongan teks pada nama pentadbir)
        colCard.innerHTML = `
          <div class="${col.headerBg} text-white p-3.5 space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-[9px] font-black uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-full">${col.shortTitle}</span>
              <span class="text-[11px] font-black">${isHolidayWeek ? `${rawStaff.length}/${rawStaff.length} (Cuti 100%)` : `${colHijau}/${rawStaff.length} Hantar (${colPct}%)`}</span>
            </div>
            <h3 class="font-black text-xs sm:text-sm tracking-wide leading-tight break-words" title="${col.name}">${col.name}</h3>
            <p class="text-[10px] text-white/85 font-medium break-words">${col.role}</p>
          </div>

          <div class="p-2.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-600">
            <span>Kumpulan Guru Seliaan</span>
            <span class="text-sky-700">${filteredStaff.length} Guru</span>
          </div>

          <div class="p-2 space-y-2 flex-1 max-h-[720px] overflow-y-auto" id="col-body-${col.id}">
          </div>
        `;

        container.appendChild(colCard);
        const colBody = colCard.querySelector(`#col-body-${col.id}`);

        if (filteredStaff.length === 0) {
          colBody.innerHTML = `
            <div class="p-4 text-center text-[11px] text-slate-400 font-medium">
              Tiada guru sepadan.
            </div>
          `;
        } else {
          filteredStaff.forEach(teacher => {
            const isTeacherGb = (teacher.id === 1);
            const canViewGbFolder = ((state.currentUser && state.currentUser.id === 1) || isSuper);
            const up = weekUploads.find(u => u.guruId === teacher.id);
            const isUploaded = (up && up.status === "HIJAU");

            const teacherCard = document.createElement("div");
            const cardBgClass = isHolidayWeek
              ? 'bg-amber-50/40 border-amber-200'
              : isUploaded
                ? 'bg-emerald-50/40 border-emerald-300'
                : 'bg-rose-50/40 border-rose-200';

            teacherCard.className = `teacher-monitor-card p-3 rounded-xl border ${cardBgClass} space-y-2 text-xs relative`;

            let timestampDisplay = "Belum memuat naik e-RPH";
            if (isHolidayWeek) {
              timestampDisplay = `Cuti Persekolahan (Dikecualikan)`;
            } else if (isUploaded && up.uploadedAt) {
              timestampDisplay = `Dikemaskini: ${up.uploadedAt}`;
            }

            teacherCard.innerHTML = `
              <div class="flex items-start gap-2.5">
                ${teacher.avatar ? `
                  <img src="${teacher.avatar}" alt="${teacher.name}" class="w-9 h-9 rounded-xl object-cover flex-shrink-0 border border-slate-200 shadow-xs">
                ` : `
                  <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0 shadow-xs border border-sky-300">
                    ${teacher.name.charAt(0)}
                  </div>
                `}
                <div class="min-w-0 flex-1">
                  <span class="text-[9px] font-mono font-bold text-slate-400 block">${teacher.code} • ${teacher.session || 'Pagi'}</span>
                  <!-- NAMA GURU: BREAK-WORDS & SEMUA HURUF KELIHATAN -->
                  <h4 class="font-black text-xs text-slate-900 leading-snug break-words" title="${teacher.name}">
                    ${teacher.name}
                  </h4>
                  <p class="text-[10px] text-slate-500 break-words mt-0.5 leading-tight" title="${teacher.role}">
                    ${teacher.role}
                  </p>
                </div>
              </div>

              <!-- Status Button -->
              <div class="pt-1">
                ${isHolidayWeek ? `
                  <div class="w-full py-1.5 px-2.5 rounded-lg bg-amber-500 text-white font-black text-center text-xs shadow-xs flex items-center justify-center gap-1.5">
                    <i data-lucide="sun" class="w-3.5 h-3.5"></i>
                    <span>CUTI SEKOLAH</span>
                  </div>
                ` : isUploaded ? `
                  <div class="w-full py-1.5 px-2.5 rounded-lg bg-emerald-600 text-white font-black text-center text-xs shadow-xs flex items-center justify-center gap-1.5">
                    <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
                    <span>HIJAU - BERJAYA</span>
                  </div>
                ` : `
                  <div class="w-full py-1.5 px-2.5 rounded-lg bg-rose-600 text-white font-black text-center text-xs shadow-xs flex items-center justify-center gap-1.5">
                    <i data-lucide="x-circle" class="w-3.5 h-3.5"></i>
                    <span>MERAH - BELUM HANTAR</span>
                  </div>
                `}
              </div>

              <div class="text-[10px] text-slate-600 font-semibold flex items-center justify-between pt-0.5">
                <span class="break-words ${isHolidayWeek ? 'text-amber-800 font-bold' : isUploaded ? 'text-emerald-800 font-bold' : 'text-rose-700 font-medium'}">
                  <i data-lucide="clock" class="w-3 h-3 inline mr-0.5"></i>
                  ${timestampDisplay}
                </span>
              </div>

              <div class="pt-1 flex items-center justify-between gap-1 border-t border-slate-200/60">
                ${(isTeacherGb && !canViewGbFolder) ? `
                  <span class="text-[9px] text-slate-400 italic">Folder Sulit GB</span>
                ` : `
                  <button data-teacher-id="${teacher.id}" class="btn-open-review text-[10px] font-bold text-sky-700 hover:text-sky-950 flex items-center gap-1 cursor-pointer">
                    <i data-lucide="folder" class="w-3 h-3"></i>
                    <span>${isUploaded ? 'Buka e-RPH' : 'Perincian'}</span>
                  </button>
                `}

                ${isSuper ? `
                  <div class="flex items-center space-x-1">
                    <button data-teacher-id="${teacher.id}" title="Tukar Status (Hijau <-> Merah)" class="btn-toggle-status-super p-1 rounded hover:bg-slate-200 text-slate-700 transition cursor-pointer">
                      <i data-lucide="refresh-cw" class="w-3 h-3 text-amber-600"></i>
                    </button>
                    ${isUploaded ? `
                      <button data-teacher-id="${teacher.id}" title="Padam e-RPH Senyap" class="btn-silent-delete-super p-1 rounded hover:bg-rose-100 text-rose-700 transition cursor-pointer">
                        <i data-lucide="trash-2" class="w-3 h-3"></i>
                      </button>
                    ` : ''}
                  </div>
                ` : ''}
              </div>
            `;

            colBody.appendChild(teacherCard);
          });
        }
      });
    }

    // =========================================================================
    // SAMBUNGKAN EVENT LISTENERS PADA SEMUA BUTANG TINDAKAN
    // =========================================================================
    container.querySelectorAll(".btn-open-review").forEach(btn => {
      btn.addEventListener("click", () => {
        const teacherId = parseInt(btn.dataset.teacherId);
        const teacher = db.staffList.find(s => s.id === teacherId);
        if (teacher) {
          const up = weekUploads.find(u => u.guruId === teacher.id);
          openReviewErphModal(teacher, up);
        }
      });
    });

    container.querySelectorAll(".btn-toggle-status-super").forEach(btn => {
      btn.addEventListener("click", () => {
        const teacherId = parseInt(btn.dataset.teacherId);
        toggleTeacherStatusSuperAdmin(teacherId);
      });
    });

    container.querySelectorAll(".btn-silent-delete-super").forEach(btn => {
      btn.addEventListener("click", () => {
        const teacherId = parseInt(btn.dataset.teacherId);
        silentDeleteErphSuperAdmin(teacherId);
      });
    });

    lucide.createIcons();
  }

  // ==============================================================
  // TAB 2: PORTAL PERIBADI GURU
  // ==============================================================
  // Pembolehubah fail yang dipilih sementara oleh guru
  let currentSelectedUploadFile = null;

  // ==============================================================
  // TAB 2: PORTAL PERIBADI GURU
  // ==============================================================
  function renderTeacherPortal() {
    if (!state.currentUser) return;
    const teacher = state.currentUser;

    if (teacher.avatar) {
      elements.portalTeacherAvatar.innerHTML = `<img src="${teacher.avatar}" alt="${teacher.name}" class="w-full h-full object-cover rounded-2xl">`;
      elements.portalTeacherAvatar.className = "w-14 h-14 rounded-2xl bg-white shadow-sm overflow-hidden border-2 border-sky-400 flex items-center justify-center";
      if (elements.btnPortalRemoveAvatar) elements.btnPortalRemoveAvatar.classList.remove("hidden");
      if (elements.portalAvatarSep) elements.portalAvatarSep.classList.remove("hidden");
    } else {
      elements.portalTeacherAvatar.textContent = teacher.name.charAt(0);
      elements.portalTeacherAvatar.className = "w-14 h-14 rounded-2xl bg-sky-600 text-white font-extrabold flex items-center justify-center text-xl shadow-sm overflow-hidden border-2 border-sky-300";
      if (elements.btnPortalRemoveAvatar) elements.btnPortalRemoveAvatar.classList.add("hidden");
      if (elements.portalAvatarSep) elements.portalAvatarSep.classList.add("hidden");
    }
    elements.portalTeacherName.textContent = teacher.name;
    elements.portalTeacherDetails.textContent = `No. K/P: ${teacher.ic || '-'} • ${teacher.role}`;

    // Semak status minggu aktif
    const weekNum = state.activeWeek;
    const up = db.uploads.find(u => u.guruId === teacher.id && u.minggu === weekNum);

    // Reset pilihan fail baru
    currentSelectedUploadFile = null;
    if (elements.teacherUploadFile) elements.teacherUploadFile.value = "";
    if (elements.fileEmptyState) elements.fileEmptyState.classList.remove("hidden");
    if (elements.fileSelectedState) elements.fileSelectedState.classList.add("hidden");

    const activeFriday = getFridayInfo(state.activeWeek);
    const isHolidayWeek = Boolean(activeFriday && activeFriday.isCuti);

    if (isHolidayWeek) {
      elements.portalCurrentStatusBadge.textContent = `🏖️ CUTI SEKOLAH (Dikecualikan)`;
      elements.portalCurrentStatusBadge.className = "px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300";
      if (elements.teacherUploadLink) elements.teacherUploadLink.value = "";
      if (elements.teacherUploadFilename) elements.teacherUploadFilename.value = "";
      if (elements.teacherUploadCatatan) elements.teacherUploadCatatan.value = `Minggu Cuti: ${activeFriday.cutiName || 'Cuti Persekolahan'}`;
      if (elements.existingFileAlert) elements.existingFileAlert.classList.add("hidden");
    } else if (up && up.status === "HIJAU") {
      elements.portalCurrentStatusBadge.textContent = "HIJAU (Berjaya Upload)";
      elements.portalCurrentStatusBadge.className = "px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300";
      if (elements.teacherUploadLink) elements.teacherUploadLink.value = up.fileUrl || "";
      if (elements.teacherUploadFilename) elements.teacherUploadFilename.value = up.fileName || "";
      if (elements.teacherUploadCatatan) elements.teacherUploadCatatan.value = up.catatan || "";

      // Tunjukkan notis fail sedia ada
      if (elements.existingFileAlert) {
        elements.existingFileAlert.classList.remove("hidden");
        if (elements.existingFileLabel) {
          elements.existingFileLabel.textContent = `${up.fileName || `eRPH_M${weekNum}.pdf`}${up.fileSize ? ` (${up.fileSize})` : ''} • Dimuat naik ${up.uploadedAt}`;
        }
        if (elements.btnDownloadExistingFile) {
          elements.btnDownloadExistingFile.onclick = () => downloadOrViewErphDocument(up);
        }
      }
    } else {
      elements.portalCurrentStatusBadge.textContent = "MERAH (Belum Upload)";
      elements.portalCurrentStatusBadge.className = "px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300";
      if (elements.teacherUploadLink) elements.teacherUploadLink.value = "";
      if (elements.teacherUploadFilename) elements.teacherUploadFilename.value = "";
      if (elements.teacherUploadCatatan) elements.teacherUploadCatatan.value = "";
      if (elements.existingFileAlert) elements.existingFileAlert.classList.add("hidden");
    }

    elements.teacherUploadWeek.value = isHolidayWeek ? `cuti-${activeFriday.tarikh}` : state.activeWeek;
    updateFridayDisplay();

    // Render Jadual Sejarah Takwim Minggu Sesi
    const tbody = elements.portalHistoryTbody;
    tbody.innerHTML = "";

    db.config.fridays2026.forEach(f => {
      const historyUp = db.uploads.find(u => u.guruId === teacher.id && u.minggu === f.minggu);
      const isSah = (historyUp && historyUp.status === "HIJAU");
      const isCuti = Boolean(f.isCuti);
      const isCurrentRow = (f.minggu === state.activeWeek || `cuti-${f.tarikh}` === String(state.activeWeek));

      const tr = document.createElement("tr");
      tr.className = isCurrentRow ? "bg-sky-50/70 font-bold" : "hover:bg-slate-50";

      tr.innerHTML = `
        <td class="py-2.5 px-3 font-mono font-bold">${isCuti ? '<span class="text-amber-800 font-black">CUTI</span>' : 'M' + f.minggu}</td>
        <td class="py-2.5 px-3 text-slate-600">${f.label}</td>
        <td class="py-2.5 px-3">
          ${isCuti ? `
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">🏖️ CUTI</span>
          ` : isSah ? `
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">HIJAU</span>
          ` : `
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">MERAH</span>
          `}
        </td>
        <td class="py-2.5 px-3 text-slate-500 font-mono text-[10px]">
          ${isCuti ? '—' : isSah ? historyUp.uploadedAt : '—'}
        </td>
        <td class="py-2.5 px-3">
          ${isCuti ? `
            <span class="text-slate-400 italic text-[11px]">Dikecualikan</span>
          ` : isSah ? `
            <button type="button" class="btn-download-history-row px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1 shadow-xs cursor-pointer">
              <i data-lucide="download" class="w-3 h-3 text-sky-600"></i>
              <span class="truncate max-w-[130px]">${historyUp.fileName || 'Buka Dokumen'}</span>
            </button>
          ` : '<span class="text-slate-400">—</span>'}
        </td>
        <td class="py-2.5 px-3 text-slate-600 text-[11px]">
          ${isCuti ? `<span class="text-amber-700 font-semibold">${f.cutiName || 'Cuti Persekolahan'}</span>` : (isSah && historyUp.ulasan) ? historyUp.ulasan : '<span class="text-slate-400 italic">Menunggu semakan</span>'}
        </td>
      `;

      if (isSah) {
        const btnRow = tr.querySelector(".btn-download-history-row");
        if (btnRow) {
          btnRow.addEventListener("click", () => {
            downloadOrViewErphDocument(historyUp);
          });
        }
      }

      tbody.appendChild(tr);
    });

    lucide.createIcons();
  }

  // Pengendali Pemilihan Fail Dokumen Fizikal
  function initFileUploadHandlers() {
    if (elements.btnBrowseFile) {
      elements.btnBrowseFile.addEventListener("click", (e) => {
        e.stopPropagation();
        if (elements.teacherUploadFile) elements.teacherUploadFile.click();
      });
    }

    if (elements.dropzoneUploadFile) {
      elements.dropzoneUploadFile.addEventListener("click", () => {
        if (elements.teacherUploadFile) elements.teacherUploadFile.click();
      });

      // Drag and drop listeners
      elements.dropzoneUploadFile.addEventListener("dragover", (e) => {
        e.preventDefault();
        elements.dropzoneUploadFile.classList.add("border-sky-600", "bg-sky-100/70");
      });

      elements.dropzoneUploadFile.addEventListener("dragleave", (e) => {
        e.preventDefault();
        elements.dropzoneUploadFile.classList.remove("border-sky-600", "bg-sky-100/70");
      });

      elements.dropzoneUploadFile.addEventListener("drop", (e) => {
        e.preventDefault();
        elements.dropzoneUploadFile.classList.remove("border-sky-600", "bg-sky-100/70");
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processSelectedFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (elements.teacherUploadFile) {
      elements.teacherUploadFile.addEventListener("change", (e) => {
        if (e.target.files && e.target.files.length > 0) {
          processSelectedFile(e.target.files[0]);
        }
      });
    }

    if (elements.btnRemoveSelectedFile) {
      elements.btnRemoveSelectedFile.addEventListener("click", (e) => {
        e.stopPropagation();
        currentSelectedUploadFile = null;
        if (elements.teacherUploadFile) elements.teacherUploadFile.value = "";
        if (elements.fileEmptyState) elements.fileEmptyState.classList.remove("hidden");
        if (elements.fileSelectedState) elements.fileSelectedState.classList.add("hidden");
      });
    }

    if (elements.teacherUploadWeek) {
      elements.teacherUploadWeek.addEventListener("change", (e) => {
        const val = e.target.value;
        state.activeWeek = (typeof val === "string" && val.startsWith("cuti-")) ? val : (parseInt(val) || val);
        if (elements.headerWeekSelect) elements.headerWeekSelect.value = state.activeWeek;
        updateFridayDisplay();
        renderTeacherPortal();
        renderMonitoringColumns();
      });
    }
  }

  function processSelectedFile(file) {
    if (!file) return;
    currentSelectedUploadFile = file;
    if (elements.selectedFileName) elements.selectedFileName.textContent = file.name;
    if (elements.selectedFileSize) elements.selectedFileSize.textContent = `${formatFileSize(file.size)} • Sedia dimuat naik`;
    if (elements.fileEmptyState) elements.fileEmptyState.classList.add("hidden");
    if (elements.fileSelectedState) elements.fileSelectedState.classList.remove("hidden");
    lucide.createIcons();
  }

  // Inisialisasi event fail upload
  initFileUploadHandlers();

  // Pengisian & Penghantaran Borang Hantar Dokumen e-RPH Guru
  elements.formTeacherUpload.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!state.currentUser) return;
    const teacher = state.currentUser;
    const weekVal = elements.teacherUploadWeek.value;
    const fInfo = getFridayInfo(weekVal);

    // Sekat jika minggu cuti persekolahan
    if (fInfo.isCuti) {
      safeSwal({
        icon: "info",
        title: "Minggu Cuti Persekolahan",
        text: `Minggu ini (${fInfo.label}) merupakan ${fInfo.cutiName || 'Cuti Persekolahan'}. Penghantaran e-RPH adalah dikecualikan dan tidak diperlukan.`,
        confirmButtonColor: "#d97706"
      });
      return;
    }

    const weekNum = fInfo.minggu || parseInt(weekVal);
    const catatan = elements.teacherUploadCatatan.value.trim();
    const optionalLink = elements.teacherUploadLink ? elements.teacherUploadLink.value.trim() : "";

    const existingIndex = db.uploads.findIndex(u => u.guruId === teacher.id && u.minggu === weekNum);
    const hasPreviousUpload = (existingIndex >= 0 && db.uploads[existingIndex].status === "HIJAU");

    // Sekat jika guru belum memilih dokumen fizikal dan belum pernah hantar sebelum ini
    if (!currentSelectedUploadFile && !hasPreviousUpload) {
      safeSwal({
        icon: "warning",
        title: "Sila Muat Naik Fail Dokumen",
        text: "Sila klik butang 'Pilih Fail Dokumen dari Peranti' untuk memuat naik fail e-RPH anda (PDF, Word, atau Excel) sebelum menghantar.",
        confirmButtonColor: "#0284c7"
      });
      return;
    }

    const fileId = `UPL-M${weekNum}-${teacher.id}`;

    // Kes A: Guru memilih fail baru untuk di-upload
    if (currentSelectedUploadFile) {
      const fileToUpload = currentSelectedUploadFile;
      const reader = new FileReader();

      reader.onload = async (event) => {
        const base64Data = event.target.result;
        
        // Simpan fail dokumen fizikal ke IndexedDB
        await FileStore.saveFile(fileId, fileToUpload, base64Data);

        const uploadRecord = {
          id: fileId,
          guruId: teacher.id,
          guruName: teacher.name,
          minggu: weekNum,
          tarikhJumaat: fInfo.tarikh,
          status: "HIJAU",
          uploadedAt: getCurrentFormattedTimestamp(),
          fileName: fileToUpload.name,
          fileSize: formatFileSize(fileToUpload.size),
          fileType: fileToUpload.type,
          hasPhysicalDocument: true,
          fileUrl: optionalLink || "",
          catatan: catatan,
          supervisorId: teacher.supervisorId,
          verifiedBy: null,
          verifiedAt: null,
          ulasan: null
        };

        if (existingIndex >= 0) {
          db.uploads[existingIndex] = { ...db.uploads[existingIndex], ...uploadRecord };
        } else {
          db.uploads.push(uploadRecord);
        }

        saveErphDatabase(db);
        currentSelectedUploadFile = null;
        if (elements.teacherUploadFile) elements.teacherUploadFile.value = "";

        safeSwal({
          icon: "success",
          title: "e-RPH Berjaya Dimuat Naik!",
          text: `Dokumen [${uploadRecord.fileName}] telah berjaya dimuat naik ke dalam sistem. Status Minggu ${weekNum} bertukar kepada HIJAU.`,
          timer: 2500,
          showConfirmButton: false
        });

        renderTeacherPortal();
        renderMonitoringColumns();
      };

      reader.readAsDataURL(fileToUpload);
    } 
    // Kes B: Kemaskini rekod sedia ada tanpa tukar fail
    else {
      const currentRec = db.uploads[existingIndex];
      currentRec.catatan = catatan;
      if (optionalLink) currentRec.fileUrl = optionalLink;
      currentRec.uploadedAt = getCurrentFormattedTimestamp();
      saveErphDatabase(db);

      safeSwal({
        icon: "success",
        title: "e-RPH Dikemaskini",
        text: `Maklumat e-RPH Minggu ${weekNum} telah dikemaskini. Status kekal HIJAU.`,
        timer: 1800,
        showConfirmButton: false
      });

      renderTeacherPortal();
      renderMonitoringColumns();
    }
  });

  // ==============================================================
  // ENJIN MASA NYATA (REAL-TIME CLOCK & CALENDAR ENGINE)
  // ==============================================================
  let calendarViewDate = new Date();

  const MALAY_DAYS = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];
  const MALAY_MONTHS = [
    "Januari", "Februari", "Mac", "April", "Mei", "Jun",
    "Julai", "Ogos", "September", "Oktober", "November", "Disember"
  ];

  function updateLiveClock() {
    const now = new Date();

    const dayIdx = now.getDay();
    const dayName = MALAY_DAYS[dayIdx];
    const dateNum = now.getDate();
    const monthName = MALAY_MONTHS[now.getMonth()];
    const yearNum = now.getFullYear();

    // Format 12-Hour Jam: hh:mm:ss AM/PM
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // Tukar jam 0 ke 12
    const formattedHours = String(hours).padStart(2, "0");
    const formattedTime = `${formattedHours}:${minutes}:${seconds} ${ampm}`;

    const formattedFullDate = `${dateNum} ${monthName.toUpperCase()} ${yearNum}`;
    const formattedShortDate = `${dateNum} ${monthName.substr(0, 3)} ${yearNum}`;

    // 1. Kemaskini Gateway (Login Screen)
    if (elements.gatewayLiveDay) elements.gatewayLiveDay.textContent = dayName.toUpperCase();
    if (elements.gatewayLiveDate) elements.gatewayLiveDate.textContent = formattedFullDate;
    if (elements.gatewayLiveTime) elements.gatewayLiveTime.textContent = formattedTime;

    // 2. Kemaskini Header Bar Utama
    if (elements.headerLiveDay) elements.headerLiveDay.textContent = dayName.toUpperCase();
    if (elements.headerLiveDate) elements.headerLiveDate.textContent = formattedShortDate;
    if (elements.headerLiveTime) elements.headerLiveTime.textContent = formattedTime;

    // 3. Kemaskini Tab Kalendar (Hero Clock)
    if (elements.calHeroTime) elements.calHeroTime.textContent = formattedTime;
    if (elements.calHeroDay) elements.calHeroDay.textContent = dayName.toUpperCase();
    if (elements.calHeroDate) elements.calHeroDate.textContent = `${dateNum} ${monthName} ${yearNum}`;

    // Kira Baki Hari ke Jumaat
    let daysToFriday = (5 - dayIdx + 7) % 7;
    let countdownTitle = "Peringatan Hari Jumaat:";
    let countdownText = "";

    const activeFriday = getFridayInfo(state.activeWeek);
    const fridayLabel = activeFriday ? activeFriday.label : "Jumaat Minggu Ini";

    if (activeFriday && activeFriday.isCuti) {
      countdownTitle = "🏖️ CUTI PERSEKOLAHAN:";
      countdownText = `Minggu ini (${fridayLabel}) merupakan ${activeFriday.cutiName || 'Cuti Persekolahan'}. Penghantaran e-RPH dikecualikan.`;
      if (elements.calHeroCountdownText) {
        elements.calHeroCountdownText.className = "text-sm font-black text-amber-300 leading-snug";
      }
      if (elements.calHeroFridayTarget) {
        elements.calHeroFridayTarget.textContent = `${fridayLabel} (Cuti)`;
      }
      if (elements.calHeroWeekBadge) {
        elements.calHeroWeekBadge.textContent = "Cuti Sekolah";
      }
    } else {
      if (elements.calHeroFridayTarget) elements.calHeroFridayTarget.textContent = `${fridayLabel} (11:59 PM)`;
      if (elements.calHeroWeekBadge) elements.calHeroWeekBadge.textContent = `Minggu ${activeFriday.minggu || state.activeWeek}`;

      if (dayIdx === 5) {
        countdownTitle = "🚨 PERINGATAN HARI INI:";
        countdownText = "HARI INI IALAH HARI JUMAAT! Sila pastikan e-RPH telah dihantar sebelum tamat tempoh.";
        if (elements.calHeroCountdownText) {
          elements.calHeroCountdownText.className = "text-sm font-black text-emerald-400 leading-snug animate-pulse";
        }
      } else if (dayIdx === 4) {
        countdownTitle = "⚠️ PERINGATAN KEMUNCAK:";
        countdownText = `ESOK IALAH HARI JUMAAT (${fridayLabel})! Tarikh akhir muat naik e-RPH Minggu ${activeFriday.minggu || state.activeWeek}.`;
        if (elements.calHeroCountdownText) {
          elements.calHeroCountdownText.className = "text-sm font-black text-amber-300 leading-snug";
        }
      } else {
        countdownTitle = "Kiraan Detik Penghantaran:";
        countdownText = `Baki ${daysToFriday} hari lagi sebelum Tarikh Akhir Jumaat (${fridayLabel}).`;
        if (elements.calHeroCountdownText) {
          elements.calHeroCountdownText.className = "text-sm font-black text-rose-300 leading-snug";
        }
      }
    }

    if (elements.calHeroCountdownTitle) elements.calHeroCountdownTitle.textContent = countdownTitle;
    if (elements.calHeroCountdownText) elements.calHeroCountdownText.textContent = countdownText;
  }

  function startRealTimeClockEngine() {
    updateLiveClock();
    setInterval(updateLiveClock, 1000);
  }

  // ==============================================================
  // TAB 4: RENDER KALENDAR BULANAN & PENGHANTARAN JUMAAT
  // ==============================================================
  function renderInteractiveMonthlyCalendar() {
    const grid = elements.calMonthDaysGrid;
    if (!grid) return;
    grid.innerHTML = "";

    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();

    const monthName = MALAY_MONTHS[month];
    elements.calMonthTitle.textContent = `${monthName} ${year}`;

    const now = new Date();
    const isCurrentMonth = (now.getFullYear() === year && now.getMonth() === month);
    const todayDate = now.getDate();

    // Dapatkan hari pertama bulan (0 = Ahad, 1 = Isnin, ..., 6 = Sabtu)
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Bilangan hari dalam bulan semasa
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    // Bilangan hari dalam bulan sebelumnya
    const prevMonthDays = new Date(year, month, 0).getDate();

    // 1. Petak hari dari bulan sebelumnya (pudar)
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const cell = document.createElement("div");
      cell.className = "p-2 min-h-[60px] sm:min-h-[80px] rounded-xl bg-slate-50/50 border border-slate-100 text-slate-300 text-xs font-semibold select-none flex flex-col justify-start";
      cell.innerHTML = `<span>${dayNum}</span>`;
      grid.appendChild(cell);
    }

    // 2. Petak hari bulan semasa
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const dayOfWeek = cellDate.getDay();
      const isToday = (isCurrentMonth && d === todayDate);
      const isFriday = (dayOfWeek === 5);

      // Semak jika Jumaat ini padan dengan minggu persekolahan 2026
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const matchedFriday = isFriday ? db.config.fridays2026.find(f => f.tarikh === dateStr) : null;

      const cell = document.createElement("div");
      let cellClasses = "p-2 min-h-[60px] sm:min-h-[80px] rounded-xl border transition flex flex-col justify-between text-xs relative ";

      if (isToday) {
        cellClasses += "bg-amber-50 border-amber-400 ring-2 ring-amber-400/50 font-bold shadow-xs ";
      } else if (isFriday) {
        if (matchedFriday && matchedFriday.isCuti) {
          cellClasses += "bg-amber-50/70 border-amber-300 hover:bg-amber-100/70 font-semibold ";
        } else {
          cellClasses += "bg-rose-50/80 border-rose-200 hover:bg-rose-100/70 font-semibold ";
        }
      } else {
        cellClasses += "bg-white border-slate-200 hover:bg-slate-50 ";
      }

      let innerHtml = `
        <div class="flex items-center justify-between">
          <span class="font-extrabold ${isToday ? 'text-amber-900 text-sm' : isFriday ? (matchedFriday && matchedFriday.isCuti ? 'text-amber-800 font-black' : 'text-rose-700 font-black') : 'text-slate-700'}">${d}</span>
          ${isToday ? '<span class="text-[9px] bg-amber-500 text-white font-black px-1.5 py-0.5 rounded shadow-xs">HARI INI</span>' : ''}
        </div>
      `;

      if (isFriday) {
        if (matchedFriday && matchedFriday.isCuti) {
          innerHtml += `
            <div class="mt-1">
              <span class="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-lg bg-amber-500 text-white shadow-xs">
                <span>🏖️ CUTI</span>
              </span>
              <span class="block text-[8px] sm:text-[9px] text-amber-800 font-bold mt-0.5 truncate">${matchedFriday.cutiName || 'Cuti'}</span>
            </div>
          `;
        } else {
          innerHtml += `
            <div class="mt-1">
              <span class="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-lg bg-rose-600 text-white shadow-xs">
                <i data-lucide="check-circle" class="w-3 h-3"></i>
                <span>${matchedFriday ? 'M' + matchedFriday.minggu : 'e-RPH'}</span>
              </span>
              <span class="block text-[8px] sm:text-[9px] text-rose-800 font-bold mt-0.5">Tarikh Akhir</span>
            </div>
          `;
        }
      }

      cell.className = cellClasses;
      cell.innerHTML = innerHtml;

      if (matchedFriday) {
        cell.classList.add("cursor-pointer");
        cell.title = matchedFriday.isCuti
          ? `Klik untuk semak Takwim Cuti (${matchedFriday.cutiName || 'Cuti Persekolahan'})`
          : `Klik untuk semak status penghantaran Minggu ${matchedFriday.minggu} (${matchedFriday.label})`;
        cell.addEventListener("click", () => {
          state.activeWeek = matchedFriday.isCuti ? `cuti-${matchedFriday.tarikh}` : matchedFriday.minggu;
          elements.headerWeekSelect.value = state.activeWeek;
          updateFridayDisplay();
          switchTab("pemantauan");
        });
      }

      grid.appendChild(cell);
    }

    // 3. Petak hari dari bulan seterusnya untuk genapkan baris
    const totalRendered = firstDayIndex + totalDaysInMonth;
    const remainingCells = (7 - (totalRendered % 7)) % 7;
    for (let nextD = 1; nextD <= remainingCells; nextD++) {
      const cell = document.createElement("div");
      cell.className = "p-2 min-h-[60px] sm:min-h-[80px] rounded-xl bg-slate-50/50 border border-slate-100 text-slate-300 text-xs font-semibold select-none flex flex-col justify-start";
      cell.innerHTML = `<span>${nextD}</span>`;
      grid.appendChild(cell);
    }

    lucide.createIcons();
  }

  function renderCalendarFridays() {
    renderInteractiveMonthlyCalendar();

    const grid = elements.calendarFridaysGrid;
    if (!grid) return;
    grid.innerHTML = "";

    db.config.fridays2026.forEach(f => {
      const isCuti = Boolean(f.isCuti);
      const isCurrent = (f.minggu === state.activeWeek || `cuti-${f.tarikh}` === String(state.activeWeek));

      // Kira bilangan hantar pada Jumaat tersebut
      const weekUps = isCuti ? [] : db.uploads.filter(u => u.minggu === f.minggu && u.status === "HIJAU");

      const card = document.createElement("div");
      if (isCuti) {
        card.className = `p-3 rounded-xl border text-center transition cursor-pointer ${isCurrent ? 'bg-amber-500 text-white border-amber-600 shadow-md transform scale-102' : 'bg-amber-50/70 hover:bg-amber-100/70 border-amber-200'}`;
        card.innerHTML = `
          <span class="text-[10px] font-mono font-bold block ${isCurrent ? 'text-amber-100' : 'text-amber-700'}">JUMAAT CUTI</span>
          <div class="font-black text-xs my-0.5 truncate" title="${f.cutiName || 'Cuti'}">🏖️ ${f.cutiName || 'Cuti'}</div>
          <p class="text-xs font-semibold ${isCurrent ? 'text-white' : 'text-amber-900'}">${f.label}</p>
          <div class="mt-2 text-[10px] py-0.5 px-2 rounded-full font-bold ${isCurrent ? 'bg-black/20 text-white' : 'bg-amber-200/80 text-amber-950 border border-amber-300'}">
            Dikecualikan
          </div>
        `;
      } else {
        card.className = `p-3 rounded-xl border text-center transition cursor-pointer ${isCurrent ? 'bg-rose-600 text-white border-rose-600 shadow-md transform scale-102' : 'bg-slate-50 hover:bg-white border-slate-200'}`;
        card.innerHTML = `
          <span class="text-[10px] font-mono font-bold block ${isCurrent ? 'text-rose-100' : 'text-slate-400'}">JUMAAT</span>
          <div class="font-black text-sm my-0.5">Minggu ${f.minggu}</div>
          <p class="text-xs font-semibold ${isCurrent ? 'text-white' : 'text-rose-600'}">${f.label}</p>
          <div class="mt-2 text-[10px] py-0.5 px-2 rounded-full font-bold ${isCurrent ? 'bg-black/20 text-white' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}">
            ${weekUps.length} Hantar
          </div>
        `;
      }

      card.addEventListener("click", () => {
        state.activeWeek = isCuti ? `cuti-${f.tarikh}` : f.minggu;
        elements.headerWeekSelect.value = state.activeWeek;
        updateFridayDisplay();
        switchTab("pemantauan");
      });

      grid.appendChild(card);
    });
  }

  // ==============================================================
  // TAB 5: PENGURUSAN JADUAL WAKTU INTERAKTIF SK RANGGU 2026
  // (Dirujuk daripada Jadual Rasmi Bil. 2 - 654 Slot Mengajar)
  // ==============================================================

  const DEFAULT_PERIODS = (typeof TIMETABLE_PERIODS !== "undefined") ? TIMETABLE_PERIODS : [
    { waktu: 1, masa: "06:40 - 07:10", label: "W1" },
    { waktu: 2, masa: "07:10 - 07:40", label: "W2" },
    { waktu: 3, masa: "07:40 - 08:10", label: "W3" },
    { waktu: 4, masa: "08:10 - 08:40", label: "W4" },
    { waktu: 5, masa: "08:40 - 09:10", label: "W5" },
    { waktu: "REHAT", masa: "09:10 - 09:30", label: "REHAT", isRehat: true },
    { waktu: 6, masa: "09:30 - 10:00", label: "W6" },
    { waktu: 7, masa: "10:00 - 10:30", label: "W7" },
    { waktu: 8, masa: "10:30 - 11:00", label: "W8" },
    { waktu: 9, masa: "11:00 - 11:30", label: "W9" },
    { waktu: 10, masa: "11:30 - 12:00", label: "W10" },
    { waktu: 11, masa: "12:00 - 12:30", label: "W11" }
  ];

  const DEFAULT_DAYS = (typeof TIMETABLE_DAYS !== "undefined") ? TIMETABLE_DAYS : [
    { kod: 1, id: "ISN", nama: "Isnin", fullNama: "Hari Isnin", maxWaktu: 11 },
    { kod: 2, id: "SEL", nama: "Selasa", fullNama: "Hari Selasa", maxWaktu: 11 },
    { kod: 3, id: "RAB", nama: "Rabu", fullNama: "Hari Rabu", maxWaktu: 11 },
    { kod: 4, id: "KHA", nama: "Khamis", fullNama: "Hari Khamis", maxWaktu: 11 },
    { kod: 5, id: "JUM", nama: "Jumaat", fullNama: "Hari Jumaat (e-RPH)", maxWaktu: 9 }
  ];

  const DEFAULT_CLASSES = (typeof TIMETABLE_CLASSES !== "undefined") ? TIMETABLE_CLASSES : [
    "4 I", "4 J", "4 K", "4 M",
    "5 I", "5 J", "5 K", "5 M",
    "6 I", "6 J", "6 K", "6 M"
  ];

  function getSubjectInfo(subjCode) {
    const map = (typeof TIMETABLE_SUBJECTS !== "undefined") ? TIMETABLE_SUBJECTS : {};
    return map[subjCode] || {
      name: subjCode || "Mata Pelajaran",
      bg: "bg-slate-50",
      text: "text-slate-800",
      border: "border-slate-300",
      badge: "bg-slate-600"
    };
  }

  function getTimeForWaktu(waktuNum) {
    const p = DEFAULT_PERIODS.find(p => !p.isRehat && String(p.waktu) === String(waktuNum));
    return p ? p.masa : "07:10 - 07:40";
  }

  function getTimetableTeacherList() {
    const fromTimetable = (db.timetable || []).map(s => s.guru).filter(Boolean);
    const fromStaff = (db.staffList || []).map(s => s.name).filter(Boolean);
    const set = new Set([...fromTimetable, ...fromStaff]);
    return Array.from(set).sort();
  }

  let hasPopulatedTimetableSelects = false;
  function populateTimetableSelects(force = false) {
    if (hasPopulatedTimetableSelects && !force) return;
    hasPopulatedTimetableSelects = true;

    const teachers = getTimetableTeacherList();

    // 1. Dropdown Guru
    if (elements.timetableSelectGuru) {
      elements.timetableSelectGuru.innerHTML = teachers.map(t => `<option value="${t}">${t}</option>`).join("");
      
      if (!state.timetableSelectedGuru) {
        if (state.currentUser && state.currentUser.name) {
          const userClean = cleanIc(state.currentUser.ic);
          const found = teachers.find(t => t.toLowerCase() === state.currentUser.name.toLowerCase() || (userClean && state.currentUser.name.includes(t)));
          if (found) {
            state.timetableSelectedGuru = found;
          }
        }
        if (!state.timetableSelectedGuru && teachers.length > 0) {
          state.timetableSelectedGuru = teachers[0];
        }
      }
      if (state.timetableSelectedGuru) {
        elements.timetableSelectGuru.value = state.timetableSelectedGuru;
      }
    }

    // 2. Dropdown Kelas
    if (elements.timetableSelectKelas) {
      elements.timetableSelectKelas.innerHTML = DEFAULT_CLASSES.map(c => `<option value="${c}">${c}</option>`).join("");
      if (state.timetableSelectedKelas) {
        elements.timetableSelectKelas.value = state.timetableSelectedKelas;
      }
    }

    // 3. Dropdown Penapis Induk
    if (elements.timetableFilterIndukKelas) {
      elements.timetableFilterIndukKelas.innerHTML = `<option value="ALL">Semua Kelas</option>` + DEFAULT_CLASSES.map(c => `<option value="${c}">Kelas ${c}</option>`).join("");
    }
    if (elements.timetableFilterIndukSubjek) {
      const allSubj = Object.keys((typeof TIMETABLE_SUBJECTS !== "undefined") ? TIMETABLE_SUBJECTS : {});
      elements.timetableFilterIndukSubjek.innerHTML = `<option value="ALL">Semua Subjek</option>` + allSubj.map(s => `<option value="${s}">${s} - ${getSubjectInfo(s).name}</option>`).join("");
    }

    // 4. Dropdown Modal Guru
    if (elements.slotFormGuru) {
      elements.slotFormGuru.innerHTML = teachers.map(t => `<option value="${t}">${t}</option>`).join("");
    }
  }

  // ==============================================================
  // PENJANA HELAIAN CETAKAN RASMI 1 HALAMAN (A4 LANDSCAPE)
  // Dilengkapi KOP Logo KPM & SK Ranggu, Grid Padat, & Pengesahan Guru Besar
  // ==============================================================
  function buildOfficialPrintSheet() {
    if (!elements.timetablePrintSheet) return;

    const isClassMode = (state.timetableMode === "kelas");
    let teacherName = state.timetableSelectedGuru || (elements.timetableSelectGuru ? elements.timetableSelectGuru.value : "");
    if (!teacherName && state.currentUser && state.currentUser.name && state.currentUser.role !== "admin") {
      teacherName = state.currentUser.name;
    }
    if (!teacherName && db.staffList && db.staffList.length > 0) {
      teacherName = db.staffList[0].name;
    }
    const selectedClass = state.timetableSelectedKelas || (elements.timetableSelectKelas ? elements.timetableSelectKelas.value : "4 I");

    const slots = isClassMode
      ? (db.timetable || []).filter(s => s.kelas === selectedClass)
      : (db.timetable || []).filter(s => s.guru === teacherName);

    const totalWaktu = slots.length;
    const staffObj = (db.staffList || []).find(s => s.name === teacherName);
    const teacherRole = staffObj ? staffObj.role : "Guru Penolong Akademik";
    const teacherIc = staffObj ? staffObj.ic : "-";

    // Kumpul analisis mata pelajaran
    const subjectSummaryMap = {};
    slots.forEach(s => {
      const key = isClassMode ? `${s.subjek} - ${s.guru}` : `${s.subjek} (${s.kelas})`;
      subjectSummaryMap[key] = (subjectSummaryMap[key] || 0) + 1;
    });

    const now = new Date();
    const tarikhCetak = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    let html = `
      <div class="official-print-document font-sans text-slate-950 bg-white leading-tight">
        <!-- 1. KEPALA SURAT RASMI (KOP SURAT KPM & SEKOLAH) -->
        <div class="flex items-center justify-between pb-2 mb-2 border-b-[2.5px] border-slate-900">
          <div class="w-20 flex-shrink-0 flex items-center justify-start">
            <img src="assets/logo-kpm.png" alt="Logo KPM" class="h-16 w-auto object-contain">
          </div>
          <div class="flex-1 text-center px-2">
            <div class="text-[10px] font-bold tracking-widest text-slate-700 uppercase">KEMENTERIAN PENDIDIKAN MALAYSIA</div>
            <div class="text-[9.5px] font-bold text-slate-800 uppercase tracking-tight">JABATAN PENDIDIKAN NEGERI SABAH • PEJABAT PENDIDIKAN DAERAH TAWAU</div>
            <div class="text-[13px] font-black text-slate-950 uppercase tracking-normal">SEKOLAH KEBANGSAAN RANGGU, TAWAU (XBA3037)</div>
            <div class="mt-1">
              <span class="inline-block text-[10.5px] font-black uppercase tracking-wider px-3.5 py-0.5 bg-slate-100 border border-slate-400 rounded-sm">
                ${isClassMode ? `JADUAL WAKTU KELAS ${selectedClass} • SESI PERSEKOLAHAN 2026` : `JADUAL WAKTU PERSENDIRIAN GURU • SESI PERSEKOLAHAN 2026`}
              </span>
            </div>
          </div>
          <div class="w-20 flex-shrink-0 flex items-center justify-end">
            <img src="assets/logo-skrg.png" alt="Logo SK Ranggu" class="h-16 w-auto object-contain">
          </div>
        </div>

        <!-- 2. JALUR METADATA GURU / KELAS -->
        <div class="grid grid-cols-4 gap-2 mb-2 p-1.5 bg-slate-50 border border-slate-400 rounded text-[9.5px] leading-snug">
          ${isClassMode ? `
            <div><span class="font-bold text-slate-600">KELAS:</span> <span class="font-black text-slate-900">${selectedClass}</span></div>
            <div><span class="font-bold text-slate-600">TAHAP / SESI:</span> <span class="font-bold text-slate-800">Tahap 2 (Sesi Pagi)</span></div>
            <div><span class="font-bold text-slate-600">JUMLAH WAKTU:</span> <span class="font-black text-indigo-950">${totalWaktu} Waktu Seminggu</span></div>
            <div><span class="font-bold text-slate-600">TARIKH KUAT KUASA:</span> <span class="font-bold text-slate-800">05 Januari 2026</span></div>
          ` : `
            <div class="col-span-2"><span class="font-bold text-slate-600">NAMA GURU:</span> <span class="font-black text-slate-900 uppercase">${teacherName}</span></div>
            <div><span class="font-bold text-slate-600">JUMLAH WAKTU:</span> <span class="font-black text-indigo-950">${totalWaktu} Waktu (${(totalWaktu * 0.5).toFixed(1)} Jam)</span></div>
            <div><span class="font-bold text-slate-600">TARIKH KUAT KUASA:</span> <span class="font-bold text-slate-800">05 Januari 2026</span></div>
            <div class="col-span-2"><span class="font-bold text-slate-600">JAWATAN:</span> <span class="font-bold text-slate-800">${teacherRole}</span></div>
            <div><span class="font-bold text-slate-600">NO. K/P:</span> <span class="font-mono font-bold text-slate-800">${teacherIc}</span></div>
            <div><span class="font-bold text-slate-600">TARIKH CETAKAN:</span> <span class="font-mono text-slate-700">${tarikhCetak}</span></div>
          `}
        </div>

        <!-- 3. JADUAL GRID RASMI 1-PAGE (CRISP & HIGH CONTRAST) -->
        <table class="official-print-table w-full border-collapse border border-slate-800 text-center mb-2">
          <thead>
            <tr class="bg-slate-200 text-slate-950 text-[9.5px] font-black border-b border-slate-800">
              <th class="border border-slate-700 py-1 px-1 w-[60px] bg-slate-300">HARI</th>
              <th class="border border-slate-700 py-1 px-0.5"><div class="font-bold">W1</div><div class="text-[7.5px] font-mono font-normal">06:40-07:10</div></th>
              <th class="border border-slate-700 py-1 px-0.5"><div class="font-bold">W2</div><div class="text-[7.5px] font-mono font-normal">07:10-07:40</div></th>
              <th class="border border-slate-700 py-1 px-0.5"><div class="font-bold">W3</div><div class="text-[7.5px] font-mono font-normal">07:40-08:10</div></th>
              <th class="border border-slate-700 py-1 px-0.5"><div class="font-bold">W4</div><div class="text-[7.5px] font-mono font-normal">08:10-08:40</div></th>
              <th class="border border-slate-700 py-1 px-0.5"><div class="font-bold">W5</div><div class="text-[7.5px] font-mono font-normal">08:40-09:10</div></th>
              <th class="border border-slate-700 py-1 px-0.5 bg-amber-100 text-amber-950 w-[46px]"><div class="font-black text-[9px]">REHAT</div><div class="text-[7.5px] font-mono font-normal">09:10-09:30</div></th>
              <th class="border border-slate-700 py-1 px-0.5"><div class="font-bold">W6</div><div class="text-[7.5px] font-mono font-normal">09:30-10:00</div></th>
              <th class="border border-slate-700 py-1 px-0.5"><div class="font-bold">W7</div><div class="text-[7.5px] font-mono font-normal">10:00-10:30</div></th>
              <th class="border border-slate-700 py-1 px-0.5"><div class="font-bold">W8</div><div class="text-[7.5px] font-mono font-normal">10:30-11:00</div></th>
              <th class="border border-slate-700 py-1 px-0.5"><div class="font-bold">W9</div><div class="text-[7.5px] font-mono font-normal">11:00-11:30</div></th>
              <th class="border border-slate-700 py-1 px-0.5"><div class="font-bold">W10</div><div class="text-[7.5px] font-mono font-normal">11:30-12:00</div></th>
              <th class="border border-slate-700 py-1 px-0.5"><div class="font-bold">W11</div><div class="text-[7.5px] font-mono font-normal">12:00-12:30</div></th>
            </tr>
          </thead>
          <tbody>
    `;

    DEFAULT_DAYS.forEach((day) => {
      html += `
        <tr class="border-b border-slate-700">
          <td class="border border-slate-700 p-1 font-black text-[10px] text-slate-900 bg-slate-100 uppercase">
            ${day.nama}
          </td>
      `;

      DEFAULT_PERIODS.forEach(p => {
        if (p.isRehat) {
          html += `<td class="border border-slate-700 p-0.5 bg-amber-50/70 text-amber-950 font-black text-[8.5px]">
            REHAT
          </td>`;
          return;
        }

        if (day.id === "JUM" && p.waktu > 9) {
          html += `<td class="border border-slate-700 p-0.5 bg-slate-100 text-slate-400 font-semibold text-[8px] italic">
            Solat Jumaat
          </td>`;
          return;
        }

        const slot = slots.find(s => s.hari === day.id && Number(s.waktu) === Number(p.waktu));
        if (slot) {
          html += `
            <td class="border border-slate-700 p-1 bg-white">
              <div class="font-black text-[11px] text-slate-950 leading-none">${slot.subjek}</div>
              <div class="text-[8.5px] font-extrabold text-slate-700 mt-0.5 truncate leading-none">${isClassMode ? slot.guru : slot.kelas}</div>
            </td>
          `;
        } else {
          html += `
            <td class="border border-slate-700 p-1 bg-slate-50/50">
              <span class="text-slate-200 text-[10px]">-</span>
            </td>
          `;
        }
      });

      html += `</tr>`;
    });

    html += `
          </tbody>
        </table>

        <!-- 4. BAHAGIAN ANALISIS AGIHAN SUBJEK & RUANG TANDATANGAN PENGESAHAN -->
        <div class="grid grid-cols-12 gap-3 pt-1 border-t border-slate-400 text-[9.5px]">
          <!-- Analisis Agihan Subjek (5 cols) -->
          <div class="col-span-5">
            <div class="font-black text-[9.5px] text-slate-900 mb-1 uppercase tracking-wider">Analisis Agihan Mengajar:</div>
            <table class="w-full border-collapse border border-slate-400 text-[8.5px]">
              <tr class="bg-slate-100 font-bold border-b border-slate-400">
                <th class="border border-slate-400 p-0.5 text-left pl-1">Mata Pelajaran & Sasaran</th>
                <th class="border border-slate-400 p-0.5 text-center w-16">Bil. Waktu</th>
              </tr>
              ${Object.entries(subjectSummaryMap).map(([item, count]) => `
                <tr class="border-b border-slate-300">
                  <td class="border border-slate-400 p-0.5 pl-1 font-semibold">${item}</td>
                  <td class="border border-slate-400 p-0.5 text-center font-bold">${count}</td>
                </tr>
              `).join("")}
              <tr class="bg-slate-100 font-black border-t border-slate-400">
                <td class="border border-slate-400 p-0.5 pl-1">JUMLAH KESELURUHAN</td>
                <td class="border border-slate-400 p-0.5 text-center font-black">${totalWaktu}</td>
              </tr>
            </table>
          </div>

          <!-- Ruang Tandatangan Rasmi Guru & Guru Besar (7 cols) -->
          <div class="col-span-7 flex justify-between gap-6 pt-1">
            <div class="flex-1 text-center">
              <div class="text-[9px] font-bold text-slate-600 mb-8">Disediakan Oleh:</div>
              <div class="border-b border-slate-700 w-36 mx-auto"></div>
              <div class="text-[9px] font-bold text-slate-950 mt-1 uppercase">${isClassMode ? "GURU KELAS" : teacherName}</div>
              <div class="text-[8px] text-slate-500">Tarikh: .......................................</div>
            </div>
            <div class="flex-1 text-center">
              <div class="text-[9px] font-bold text-slate-600 mb-8">Disahkan Oleh:</div>
              <div class="border-b border-slate-700 w-36 mx-auto"></div>
              <div class="text-[9.5px] font-black text-slate-950 mt-1 uppercase">YUNUS BIN PATARAI</div>
              <div class="text-[8px] font-bold text-slate-700">Guru Besar, SK Ranggu Tawau</div>
              <div class="text-[8px] text-slate-500">Tarikh: .......................................</div>
            </div>
          </div>
        </div>
      </div>
    `;

    elements.timetablePrintSheet.innerHTML = html;
  }

  // Fungsi Utama Render Jadual Waktu Rujukan
  function renderTimetableReference() {
    populateTimetableSelects();

    // Kemaskini Gaya Tab Mod Aktif
    if (elements.tabTimetableModeGuru) {
      if (state.timetableMode === "guru") {
        elements.tabTimetableModeGuru.className = "px-4 py-2 rounded-xl transition flex items-center space-x-1.5 bg-white text-indigo-700 shadow-xs cursor-pointer";
        elements.tabTimetableModeKelas.className = "px-4 py-2 rounded-xl transition flex items-center space-x-1.5 text-slate-600 hover:text-slate-900 cursor-pointer";
        elements.tabTimetableModeInduk.className = "px-4 py-2 rounded-xl transition flex items-center space-x-1.5 text-slate-600 hover:text-slate-900 cursor-pointer";
        elements.filterWrapperGuru.classList.remove("hidden");
        elements.filterWrapperKelas.classList.add("hidden");
        elements.filterWrapperInduk.classList.add("hidden");
      } else if (state.timetableMode === "kelas") {
        elements.tabTimetableModeGuru.className = "px-4 py-2 rounded-xl transition flex items-center space-x-1.5 text-slate-600 hover:text-slate-900 cursor-pointer";
        elements.tabTimetableModeKelas.className = "px-4 py-2 rounded-xl transition flex items-center space-x-1.5 bg-white text-emerald-700 shadow-xs cursor-pointer";
        elements.tabTimetableModeInduk.className = "px-4 py-2 rounded-xl transition flex items-center space-x-1.5 text-slate-600 hover:text-slate-900 cursor-pointer";
        elements.filterWrapperGuru.classList.add("hidden");
        elements.filterWrapperKelas.classList.remove("hidden");
        elements.filterWrapperInduk.classList.add("hidden");
      } else {
        elements.tabTimetableModeGuru.className = "px-4 py-2 rounded-xl transition flex items-center space-x-1.5 text-slate-600 hover:text-slate-900 cursor-pointer";
        elements.tabTimetableModeKelas.className = "px-4 py-2 rounded-xl transition flex items-center space-x-1.5 text-slate-600 hover:text-slate-900 cursor-pointer";
        elements.tabTimetableModeInduk.className = "px-4 py-2 rounded-xl transition flex items-center space-x-1.5 bg-white text-slate-900 shadow-xs cursor-pointer";
        elements.filterWrapperGuru.classList.add("hidden");
        elements.filterWrapperKelas.classList.add("hidden");
        elements.filterWrapperInduk.classList.remove("hidden");
      }
    }

    if (state.timetableMode === "guru") {
      renderTimetableGuru();
    } else if (state.timetableMode === "kelas") {
      renderTimetableKelas();
    } else {
      renderTimetableInduk();
    }

    // Bina helaian cetakan rasmi siap siaga
    buildOfficialPrintSheet();

    // Kawal paparan mod pratonton rasmi jika diaktifkan
    if (elements.timetablePrintSheet && elements.jadualRujukanContainer) {
      if (state.timetableOfficialPreview) {
        elements.timetablePrintSheet.classList.remove("hidden");
        elements.jadualRujukanContainer.classList.add("hidden");
        if (elements.labelTogglePreview) elements.labelTogglePreview.textContent = "Kembali ke Mod Interaktif";
        if (elements.btnTimetableTogglePreview) elements.btnTimetableTogglePreview.className = "px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-xs";
      } else {
        elements.timetablePrintSheet.classList.add("hidden");
        elements.jadualRujukanContainer.classList.remove("hidden");
        if (elements.labelTogglePreview) elements.labelTogglePreview.textContent = "Pratonton Rasmi (1 Halaman)";
        if (elements.btnTimetableTogglePreview) elements.btnTimetableTogglePreview.className = "px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer";
      }
    }

    lucide.createIcons();
  }

  // 1. PANDANGAN GURU
  function renderTimetableGuru() {
    const container = elements.jadualRujukanContainer;
    const teacherName = state.timetableSelectedGuru || (elements.timetableSelectGuru ? elements.timetableSelectGuru.value : "");
    const slots = (db.timetable || []).filter(s => s.guru === teacherName);

    const totalWaktu = slots.length;
    const classesTaught = [...new Set(slots.map(s => s.kelas))].sort();

    if (elements.timetableTeacherSummary) {
      elements.timetableTeacherSummary.textContent = `${totalWaktu} Waktu Seminggu • ${classesTaught.length} Kelas Diajar`;
    }

    let html = `
      <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <!-- Header Info Guru -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <i data-lucide="user-check" class="w-5 h-5"></i>
            </div>
            <div>
              <h4 class="font-extrabold text-base text-slate-900">${teacherName}</h4>
              <p class="text-xs text-slate-500">Jadual Waktu Mengajar Individu Guru • Sesi Persekolahan 2026</p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-800 rounded-xl border border-indigo-200">
              Jumlah: <b>${totalWaktu} Waktu</b> / Minggu
            </span>
            <span class="text-xs font-semibold px-3 py-1 bg-slate-50 text-slate-700 rounded-xl border border-slate-200">
              Kelas: ${classesTaught.join(", ") || "-"}
            </span>
          </div>
        </div>

        <!-- Jadual Grid Mingguan Guru -->
        <div class="overflow-x-auto rounded-2xl border border-slate-200">
          <table class="w-full border-collapse text-center text-xs min-w-[950px]">
            <thead>
              <tr class="bg-slate-100/90 text-slate-700 font-extrabold border-b border-slate-200">
                <th class="p-2.5 border-r border-slate-200 w-24">HARI</th>
    `;

    DEFAULT_PERIODS.forEach(p => {
      if (p.isRehat) {
        html += `<th class="p-2 border-r border-slate-200 bg-amber-50 text-amber-900 w-16">
          <div class="font-black text-[11px]">REHAT</div>
          <div class="text-[9px] text-amber-700 font-normal">09:10-09:30</div>
        </th>`;
      } else {
        html += `<th class="p-2 border-r border-slate-200">
          <div class="font-black text-[11px] text-indigo-900">W${p.waktu}</div>
          <div class="text-[9px] text-slate-500 font-normal font-mono">${p.masa}</div>
        </th>`;
      }
    });

    html += `</tr></thead><tbody>`;

    DEFAULT_DAYS.forEach((day) => {
      html += `<tr class="border-b border-slate-200 hover:bg-slate-50/50 transition">
        <td class="p-2.5 font-black text-slate-800 border-r border-slate-200 bg-slate-50/80">
          <span class="block">${day.nama.toUpperCase()}</span>
          <span class="text-[9px] text-slate-400 font-normal">Hari ${day.kod}</span>
        </td>`;

      DEFAULT_PERIODS.forEach(p => {
        if (p.isRehat) {
          html += `<td class="p-1 border-r border-slate-200 bg-amber-50/40 text-amber-800 text-[10px] font-bold">
            <span class="writing-mode-vertical">REHAT</span>
          </td>`;
          return;
        }

        if (day.id === "JUM" && p.waktu > 9) {
          html += `<td class="p-1 border-r border-slate-200 bg-slate-100/50 text-slate-400 text-[10px] italic">
            <div class="p-2 rounded-lg border border-dashed border-slate-200">Solat Jumaat</div>
          </td>`;
          return;
        }

        const slot = slots.find(s => s.hari === day.id && Number(s.waktu) === Number(p.waktu));
        if (slot) {
          const subjInfo = getSubjectInfo(slot.subjek);
          html += `
            <td class="p-1.5 border-r border-slate-200">
              <div class="group relative p-2 rounded-xl border ${subjInfo.border} ${subjInfo.bg} cursor-pointer hover:shadow-md transition text-left"
                   title="Klik untuk sunting slot ini"
                   onclick="window.erphTimetableEditSlot(${slot.id})">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-[10px] font-extrabold px-1.5 py-0.5 rounded ${subjInfo.badge} text-white shadow-2xs">${slot.subjek}</span>
                  <span class="text-[10px] font-black text-slate-700 bg-white/90 px-1.5 py-0.2 rounded border border-slate-200">${slot.kelas}</span>
                </div>
                <div class="text-[11px] font-bold text-slate-900 truncate leading-tight">${subjInfo.name}</div>
                <div class="text-[9px] text-slate-500 font-mono mt-0.5">${slot.masa}</div>
                
                <div class="opacity-0 group-hover:opacity-100 transition absolute inset-0 bg-indigo-900/10 rounded-xl flex items-center justify-center backdrop-blur-[0.5px]">
                  <span class="text-[10px] bg-indigo-700 text-white font-bold px-2 py-0.5 rounded-lg shadow-sm flex items-center gap-1">
                    <i data-lucide="edit-2" class="w-2.5 h-2.5"></i> Sunting
                  </span>
                </div>
              </div>
            </td>
          `;
        } else {
          html += `
            <td class="p-1.5 border-r border-slate-200">
              <div class="group h-full min-h-[58px] rounded-xl border border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 p-1 flex items-center justify-center cursor-pointer transition text-center"
                   title="Tambah slot pada hari ${day.nama}, Waktu ${p.waktu}"
                   onclick="window.erphTimetableAddSlotQuick('${teacherName.replace(/'/g, "\\'")}', '${day.id}', ${p.waktu}, '${p.masa}', '')">
                <span class="text-[10px] text-slate-300 group-hover:text-indigo-600 font-bold hidden group-hover:inline-flex items-center gap-0.5">
                  <i data-lucide="plus" class="w-3 h-3"></i> Tambah
                </span>
              </div>
            </td>
          `;
        }
      });

      html += `</tr>`;
    });

    html += `
            </tbody>
          </table>
        </div>

        <!-- Panduan Subjek & Warna -->
        <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <div class="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <i data-lucide="palette" class="w-3.5 h-3.5 text-indigo-600"></i>
            <span>Petunjuk Warna Mata Pelajaran:</span>
          </div>
          <div class="flex flex-wrap gap-2 text-[10px]">
    `;

    Object.entries((typeof TIMETABLE_SUBJECTS !== "undefined") ? TIMETABLE_SUBJECTS : {}).forEach(([code, item]) => {
      html += `
        <span class="px-2 py-1 rounded-lg border ${item.border} ${item.bg} ${item.text} font-bold flex items-center gap-1">
          <span class="w-2 h-2 rounded-full ${item.badge}"></span>
          <span>${code}</span>: <span class="font-normal">${item.name}</span>
        </span>
      `;
    });

    html += `
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // 2. PANDANGAN KELAS
  function renderTimetableKelas() {
    const container = elements.jadualRujukanContainer;
    const selectedClass = state.timetableSelectedKelas || (elements.timetableSelectKelas ? elements.timetableSelectKelas.value : "4 I");
    const slots = (db.timetable || []).filter(s => s.kelas === selectedClass);

    const totalWaktu = slots.length;
    const teachersInvolved = [...new Set(slots.map(s => s.guru))].sort();

    if (elements.timetableClassSummary) {
      elements.timetableClassSummary.textContent = `${totalWaktu} Waktu Seminggu • ${teachersInvolved.length} Guru Terlibat`;
    }

    let html = `
      <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <!-- Header Info Kelas -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <i data-lucide="graduation-cap" class="w-5 h-5"></i>
            </div>
            <div>
              <h4 class="font-extrabold text-base text-slate-900">Jadual Waktu Kelas ${selectedClass}</h4>
              <p class="text-xs text-slate-500">Jadual Pembelajaran Murid • SK Ranggu Sesi Persekolahan 2026</p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200">
              Jumlah: <b>${totalWaktu} Waktu</b> / Minggu
            </span>
            <span class="text-xs font-semibold px-3 py-1 bg-slate-50 text-slate-700 rounded-xl border border-slate-200">
              ${teachersInvolved.length} Orang Guru
            </span>
          </div>
        </div>

        <!-- Jadual Grid Mingguan Kelas -->
        <div class="overflow-x-auto rounded-2xl border border-slate-200">
          <table class="w-full border-collapse text-center text-xs min-w-[950px]">
            <thead>
              <tr class="bg-slate-100/90 text-slate-700 font-extrabold border-b border-slate-200">
                <th class="p-2.5 border-r border-slate-200 w-24">HARI</th>
    `;

    DEFAULT_PERIODS.forEach(p => {
      if (p.isRehat) {
        html += `<th class="p-2 border-r border-slate-200 bg-amber-50 text-amber-900 w-16">
          <div class="font-black text-[11px]">REHAT</div>
          <div class="text-[9px] text-amber-700 font-normal">09:10-09:30</div>
        </th>`;
      } else {
        html += `<th class="p-2 border-r border-slate-200">
          <div class="font-black text-[11px] text-emerald-900">W${p.waktu}</div>
          <div class="text-[9px] text-slate-500 font-normal font-mono">${p.masa}</div>
        </th>`;
      }
    });

    html += `</tr></thead><tbody>`;

    DEFAULT_DAYS.forEach((day) => {
      html += `<tr class="border-b border-slate-200 hover:bg-slate-50/50 transition">
        <td class="p-2.5 font-black text-slate-800 border-r border-slate-200 bg-slate-50/80">
          <span class="block">${day.nama.toUpperCase()}</span>
          <span class="text-[9px] text-slate-400 font-normal">Hari ${day.kod}</span>
        </td>`;

      DEFAULT_PERIODS.forEach(p => {
        if (p.isRehat) {
          html += `<td class="p-1 border-r border-slate-200 bg-amber-50/40 text-amber-800 text-[10px] font-bold">
            <span class="writing-mode-vertical">REHAT</span>
          </td>`;
          return;
        }

        if (day.id === "JUM" && p.waktu > 9) {
          html += `<td class="p-1 border-r border-slate-200 bg-slate-100/50 text-slate-400 text-[10px] italic">
            <div class="p-2 rounded-lg border border-dashed border-slate-200">Solat Jumaat</div>
          </td>`;
          return;
        }

        const slot = slots.find(s => s.hari === day.id && Number(s.waktu) === Number(p.waktu));
        if (slot) {
          const subjInfo = getSubjectInfo(slot.subjek);
          html += `
            <td class="p-1.5 border-r border-slate-200">
              <div class="group relative p-2 rounded-xl border ${subjInfo.border} ${subjInfo.bg} cursor-pointer hover:shadow-md transition text-left"
                   title="Klik untuk sunting slot ini"
                   onclick="window.erphTimetableEditSlot(${slot.id})">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-[10px] font-extrabold px-1.5 py-0.5 rounded ${subjInfo.badge} text-white shadow-2xs">${slot.subjek}</span>
                </div>
                <div class="text-[11px] font-bold text-slate-900 truncate leading-tight">${slot.guru}</div>
                <div class="text-[9px] text-slate-500 font-mono mt-0.5">${slot.masa}</div>
                
                <div class="opacity-0 group-hover:opacity-100 transition absolute inset-0 bg-emerald-900/10 rounded-xl flex items-center justify-center backdrop-blur-[0.5px]">
                  <span class="text-[10px] bg-emerald-700 text-white font-bold px-2 py-0.5 rounded-lg shadow-sm flex items-center gap-1">
                    <i data-lucide="edit-2" class="w-2.5 h-2.5"></i> Sunting
                  </span>
                </div>
              </div>
            </td>
          `;
        } else {
          html += `
            <td class="p-1.5 border-r border-slate-200">
              <div class="group h-full min-h-[58px] rounded-xl border border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 p-1 flex items-center justify-center cursor-pointer transition text-center"
                   title="Tambah slot pada hari ${day.nama}, Waktu ${p.waktu}"
                   onclick="window.erphTimetableAddSlotQuick('', '${day.id}', ${p.waktu}, '${p.masa}', '${selectedClass}')">
                <span class="text-[10px] text-slate-300 group-hover:text-emerald-600 font-bold hidden group-hover:inline-flex items-center gap-0.5">
                  <i data-lucide="plus" class="w-3 h-3"></i> Tambah
                </span>
              </div>
            </td>
          `;
        }
      });

      html += `</tr>`;
    });

    html += `
            </tbody>
          </table>
        </div>

        <!-- Senarai Guru Terlibat -->
        <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <div class="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <i data-lucide="users" class="w-3.5 h-3.5 text-emerald-600"></i>
            <span>Senarai Guru Pengajar Kelas ${selectedClass}:</span>
          </div>
          <div class="flex flex-wrap gap-2 text-[11px]">
            ${teachersInvolved.map(t => `<span class="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 shadow-2xs">${t}</span>`).join("")}
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // 3. JADUAL INDUK & CARIAN SLOT (654 SLOT)
  function renderTimetableInduk() {
    const container = elements.jadualRujukanContainer;
    const allSlots = db.timetable || [];
    const search = (state.timetableIndukSearch || "").toLowerCase().trim();
    const fHari = state.timetableIndukHari || "ALL";
    const fKelas = state.timetableIndukKelas || "ALL";
    const fSubjek = state.timetableIndukSubjek || "ALL";

    const filtered = allSlots.filter(s => {
      if (fHari !== "ALL" && s.hari !== fHari) return false;
      if (fKelas !== "ALL" && s.kelas !== fKelas) return false;
      if (fSubjek !== "ALL" && s.subjek !== fSubjek) return false;
      if (search) {
        const str = `${s.guru} ${s.kelas} ${s.subjek} ${s.hari} ${s.masa}`.toLowerCase();
        if (!str.includes(search)) return false;
      }
      return true;
    });

    if (elements.timetableIndukCount) {
      elements.timetableIndukCount.textContent = `Menunjukkan ${filtered.length} daripada ${allSlots.length} slot`;
    }

    let html = `
      <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h4 class="font-extrabold text-base text-slate-900">Jadual Induk & Pangkalan Carian Slot (${allSlots.length} Slot)</h4>
            <p class="text-xs text-slate-500">Senarai penuh seluruh jadual waktu PdP SK Ranggu 2026 • Tapisan dan kemas kini pantas</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-800 rounded-xl border border-indigo-200">
              ${filtered.length} Slot Ditemui
            </span>
            <button type="button" class="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    onclick="window.erphTimetableAddSlotQuick()">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>Tambah Slot</span>
            </button>
          </div>
        </div>

        <div class="overflow-x-auto rounded-2xl border border-slate-200 max-h-[600px] overflow-y-auto">
          <table class="w-full border-collapse text-left text-xs min-w-[750px]">
            <thead class="sticky top-0 bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200 z-10">
              <tr>
                <th class="p-3 w-12 text-center">#</th>
                <th class="p-3 w-20">HARI</th>
                <th class="p-3 w-36">WAKTU & MASA</th>
                <th class="p-3 w-24">KELAS</th>
                <th class="p-3 w-32">SUBJEK</th>
                <th class="p-3">NAMA GURU</th>
                <th class="p-3 w-28 text-center">TINDAKAN</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
    `;

    if (filtered.length === 0) {
      html += `
        <tr>
          <td colspan="7" class="p-8 text-center text-slate-400 italic">
            Tiada slot jadual ditemui mengikut tapisan semasa.
          </td>
        </tr>
      `;
    } else {
      const displaySlots = filtered.slice(0, 200);
      displaySlots.forEach((slot, idx) => {
        const subjInfo = getSubjectInfo(slot.subjek);
        html += `
          <tr class="hover:bg-slate-50/80 transition">
            <td class="p-3 text-center text-slate-400 font-mono text-[11px]">${idx + 1}</td>
            <td class="p-3 font-bold text-slate-800">
              <span class="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-bold border border-slate-200">${slot.hari}</span>
            </td>
            <td class="p-3 font-mono text-[11px] text-slate-600">
              <span class="font-bold text-indigo-700">W${slot.waktu}</span> (${slot.masa})
            </td>
            <td class="p-3 font-extrabold text-slate-900">
              <span class="px-2 py-0.5 bg-slate-100 rounded text-slate-800 border border-slate-200">${slot.kelas}</span>
            </td>
            <td class="p-3">
              <span class="px-2 py-0.5 rounded ${subjInfo.badge} text-white font-black text-[10px] shadow-2xs">${slot.subjek}</span>
              <span class="text-[11px] text-slate-600 ml-1 font-semibold">${subjInfo.name}</span>
            </td>
            <td class="p-3 font-bold text-slate-800 uppercase">
              ${slot.guru}
            </td>
            <td class="p-3 text-center">
              <div class="inline-flex items-center gap-1">
                <button type="button" class="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                        title="Sunting slot ini" onclick="window.erphTimetableEditSlot(${slot.id})">
                  <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                </button>
                <button type="button" class="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Padam slot ini" onclick="window.erphTimetableDeleteDirect(${slot.id})">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      });

      if (filtered.length > 200) {
        html += `
          <tr>
            <td colspan="7" class="p-4 text-center bg-slate-50 text-slate-500 font-bold">
              Menunjukkan 200 daripada ${filtered.length} slot. Gunakan carian untuk menyaring secara spesifik.
            </td>
          </tr>
        `;
      }
    }

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // FUNGSI WINDOW UNTUK TINDAKAN EDIT & TAMBAH SLOT
  window.erphTimetableEditSlot = function(slotId) {
    populateTimetableSelects();
    const slot = (db.timetable || []).find(s => s.id === slotId);
    if (!slot) return;

    elements.slotFormId.value = slot.id;
    elements.modalTimetableTitle.textContent = `Sunting Slot: ${slot.subjek} (${slot.kelas})`;
    elements.slotFormGuru.value = slot.guru;
    elements.slotFormHari.value = slot.hari;
    elements.slotFormWaktu.value = slot.waktu;
    elements.slotFormMasa.value = slot.masa || getTimeForWaktu(slot.waktu);
    elements.slotFormKelas.value = slot.kelas;
    elements.slotFormSubjek.value = slot.subjek;

    if (elements.btnDeleteTimetableSlot) {
      elements.btnDeleteTimetableSlot.classList.remove("hidden");
    }
    if (elements.slotClashWarning) {
      elements.slotClashWarning.classList.add("hidden");
    }

    elements.modalEditTimetableSlot.classList.remove("hidden");
    lucide.createIcons();
  };

  window.erphTimetableAddSlotQuick = function(guru = "", hari = "ISN", waktu = 1, masa = "", kelas = "4 I", subjek = "BM") {
    populateTimetableSelects();
    elements.slotFormId.value = "";
    elements.modalTimetableTitle.textContent = "Tambah Slot Jadual Waktu Baru";
    
    if (guru) elements.slotFormGuru.value = guru;
    else if (state.timetableSelectedGuru) elements.slotFormGuru.value = state.timetableSelectedGuru;

    if (hari) elements.slotFormHari.value = hari;
    if (waktu) elements.slotFormWaktu.value = waktu;
    if (masa) elements.slotFormMasa.value = masa;
    else if (waktu) elements.slotFormMasa.value = getTimeForWaktu(waktu);

    if (kelas) elements.slotFormKelas.value = kelas;
    else if (state.timetableSelectedKelas) elements.slotFormKelas.value = state.timetableSelectedKelas;

    if (subjek) elements.slotFormSubjek.value = subjek;

    if (elements.btnDeleteTimetableSlot) {
      elements.btnDeleteTimetableSlot.classList.add("hidden");
    }
    if (elements.slotClashWarning) {
      elements.slotClashWarning.classList.add("hidden");
    }

    elements.modalEditTimetableSlot.classList.remove("hidden");
    lucide.createIcons();
  };

  window.erphTimetableDeleteDirect = function(slotId) {
    const slot = (db.timetable || []).find(s => s.id === slotId);
    if (!slot) return;

    Swal.fire({
      title: "Padam Slot Ini?",
      html: `Adakah anda pasti ingin memadam slot <b>${slot.subjek}</b> untuk <b>${slot.kelas}</b> (${slot.guru}, ${slot.hari} W${slot.waktu})?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Padam!",
      cancelButtonText: "Batal"
    }).then(result => {
      if (result.isConfirmed) {
        db.timetable = db.timetable.filter(s => s.id !== slotId);
        saveErphDatabase(db);
        safeSwal({
          icon: "success",
          title: "Dipadam",
          text: "Slot jadual waktu berjaya dipadam.",
          toast: true,
          position: "top-end",
          timer: 1500,
          showConfirmButton: false
        });
        renderTimetableReference();
      }
    });
  };

  // Semakan Pertindihan Slot (Clash Detection)
  function checkSlotClash(guru, hari, waktu, kelas, excludeId) {
    const clashTeacher = (db.timetable || []).find(s => s.id !== excludeId && s.guru === guru && s.hari === hari && Number(s.waktu) === Number(waktu));
    const clashClass = (db.timetable || []).find(s => s.id !== excludeId && s.kelas === kelas && s.hari === hari && Number(s.waktu) === Number(waktu));

    if (clashTeacher && clashClass) {
      return `Pertindihan Ganda: Guru ${guru} telah mengajar kelas ${clashTeacher.kelas} (${clashTeacher.subjek}), dan kelas ${kelas} telah diajar oleh ${clashClass.guru} (${clashClass.subjek}) pada waktu ini.`;
    }
    if (clashTeacher) {
      return `Pertindihan Guru: ${guru} telah mempunyai jadual ${clashTeacher.subjek} di kelas ${clashTeacher.kelas} pada waktu ini.`;
    }
    if (clashClass) {
      return `Pertindihan Kelas: Kelas ${kelas} telah mempunyai jadual ${clashClass.subjek} bersama guru ${clashClass.guru} pada waktu ini.`;
    }
    return null;
  }

  // ==============================================================
  // ENJIN TAKWIM PERSEKOLAHAN & PENGIRAAN MINGGU (AUTO-CASCADE)
  // ==============================================================

  // Fungsi mengira semula urutan minggu bermula dari startIndex
  function cascadeRenumberWeeks(startIndex, startWeekNum) {
    let nextNum;
    if (startWeekNum === null || startWeekNum === undefined) {
      let prev = 0;
      for (let k = startIndex - 1; k >= 0; k--) {
        if (!db.config.fridays2026[k].isCuti && db.config.fridays2026[k].minggu) {
          prev = db.config.fridays2026[k].minggu;
          break;
        }
      }
      nextNum = prev + 1;
    } else {
      nextNum = parseInt(startWeekNum);
      if (isNaN(nextNum) || nextNum < 1) nextNum = 1;
    }

    for (let i = startIndex; i < db.config.fridays2026.length; i++) {
      const row = db.config.fridays2026[i];
      if (row.isCuti) {
        row.minggu = null; // Cuti tidak dikira dalam urutan minggu persekolahan ("sistem xkira")
      } else {
        row.minggu = nextNum;
        nextNum++;
      }
    }

    const nonHolidays = db.config.fridays2026.filter(f => !f.isCuti && f.minggu);
    if (nonHolidays.length > 0) {
      db.config.school.totalWeeks = Math.max(...nonHolidays.map(f => f.minggu));
    }

    saveErphDatabase(db);
    initWeekOptions();
    renderCalendarFridays();
    renderAdminWeeksTable();
    renderMonitoringColumns();
    updateFridayDisplay();

    const activeFr = db.config.fridays2026[startIndex];
    const fromLabel = activeFr && activeFr.minggu ? `Minggu ${activeFr.minggu}` : `Indeks ${startIndex + 1}`;
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Auto-Cascade Berjaya!",
      text: `Minggu seterusnya disusun secara automatik: ${fromLabel} ➔ ${nextNum - 1}.`,
      timer: 2000,
      showConfirmButton: false
    });
  }

  // Fungsi mengira semula urutan keseluruhan takwim (1, 2, 3...)
  function autoCascadeAllWeeks() {
    let currentAcademicWeek = 1;

    db.config.fridays2026.forEach(row => {
      if (row.isCuti) {
        row.minggu = null;
      } else {
        row.minggu = currentAcademicWeek;
        currentAcademicWeek++;
      }
    });

    db.config.school.totalWeeks = currentAcademicWeek - 1;
    saveErphDatabase(db);

    initWeekOptions();
    renderCalendarFridays();
    renderAdminWeeksTable();
    renderMonitoringColumns();
    updateFridayDisplay();

    Swal.fire({
      icon: "success",
      title: "Kira Semula Selesai",
      text: `Semua minggu persekolahan telah disusun secara berurutan (1 hingga ${db.config.school.totalWeeks}) dengan melangkau minggu cuti.`,
      timer: 2000,
      showConfirmButton: false
    });
  }

  // Jana semula senarai Jumaat daripada tarikh mula buka sekolah
  function generateSchoolFridays(firstFridayStr, totalCount) {
    const startD = new Date(firstFridayStr + "T00:00:00");
    const newFridays = [];

    for (let i = 0; i < totalCount; i++) {
      const curD = new Date(startD);
      curD.setDate(startD.getDate() + (i * 7));

      const year = curD.getFullYear();
      const month = String(curD.getMonth() + 1).padStart(2, "0");
      const day = String(curD.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      const labelStr = formatMalayDateLabel(curD);

      newFridays.push({
        minggu: i + 1,
        tarikh: dateStr,
        label: labelStr,
        isCuti: false,
        cutiName: ""
      });
    }

    db.config.fridays2026 = newFridays;
    db.config.school.totalWeeks = totalCount;
    db.config.school.firstFriday = firstFridayStr;
    saveErphDatabase(db);

    initWeekOptions();
    renderCalendarFridays();
    renderAdminWeeksTable();
    renderMonitoringColumns();
    updateFridayDisplay();
  }

  // Render Jadual Pengurusan Takwim di Konsol Super Admin
  function renderAdminWeeksTable() {
    const tbody = elements.adminWeeksTbody;
    if (!tbody) return;
    tbody.innerHTML = "";

    const query = (elements.adminSearchWeek ? elements.adminSearchWeek.value : "").toLowerCase().trim();

    const activeWeeks = db.config.fridays2026.filter(f => !f.isCuti);
    const holidayWeeks = db.config.fridays2026.filter(f => f.isCuti);

    if (elements.adminTotalFridaysCount) elements.adminTotalFridaysCount.textContent = db.config.fridays2026.length;
    if (elements.adminActiveWeeksCount) elements.adminActiveWeeksCount.textContent = activeWeeks.length;
    if (elements.adminHolidayWeeksCount) elements.adminHolidayWeeksCount.textContent = holidayWeeks.length;

    db.config.fridays2026.forEach((f, originalIdx) => {
      // Filter search
      const weekStr = f.minggu ? `minggu ${f.minggu} m${f.minggu}` : "cuti";
      const cutiStr = (f.cutiName || "").toLowerCase();
      const dateStr = f.tarikh.toLowerCase();
      const labelStr = f.label.toLowerCase();

      if (query && !weekStr.includes(query) && !cutiStr.includes(query) && !dateStr.includes(query) && !labelStr.includes(query)) {
        return;
      }

      const isCuti = Boolean(f.isCuti);
      const isCurrentSchoolWeek = (f.minggu === state.activeWeek);

      const tr = document.createElement("tr");
      tr.className = `transition ${isCuti ? 'bg-amber-50/40 hover:bg-amber-50' : isCurrentSchoolWeek ? 'bg-sky-50/60 font-bold' : 'hover:bg-slate-50'}`;

      tr.innerHTML = `
        <td class="py-2.5 px-3 text-center font-mono font-bold text-slate-400 text-xs">${originalIdx + 1}</td>
        <td class="py-2.5 px-3">
          <input type="date" class="admin-row-date border border-slate-300 rounded px-2 py-1 text-xs font-mono bg-white focus:ring-1 focus:ring-sky-500" value="${f.tarikh}" data-idx="${originalIdx}">
        </td>
        <td class="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap admin-row-label-text">
          ${f.label}
        </td>
        <td class="py-2.5 px-3">
          ${isCuti ? `
            <span class="inline-flex items-center px-2 py-1 rounded bg-amber-100 text-amber-900 font-black text-[11px] border border-amber-300">
              🏖️ CUTI
            </span>
          ` : `
            <div class="flex items-center space-x-1.5">
              <span class="text-slate-400 font-black text-xs">M</span>
              <input type="number" class="admin-row-week-input w-16 border border-slate-300 rounded px-2 py-1 text-xs font-black font-mono text-center bg-white focus:ring-2 focus:ring-amber-500" value="${f.minggu || ''}" min="1" max="60" data-idx="${originalIdx}" title="Ubah nombor minggu & tekan Enter untuk auto-cascade">
            </div>
          `}
        </td>
        <td class="py-2.5 px-3">
          <select class="admin-row-cuti-select border rounded px-2 py-1 text-xs font-bold ${isCuti ? 'bg-amber-100 border-amber-300 text-amber-950' : 'bg-emerald-50 border-emerald-300 text-emerald-900'} cursor-pointer" data-idx="${originalIdx}">
            <option value="false" ${!isCuti ? 'selected' : ''}>🟢 Persekolahan (Wajib e-RPH)</option>
            <option value="true" ${isCuti ? 'selected' : ''}>🏖️ Cuti Sekolah (Dikecualikan)</option>
          </select>
        </td>
        <td class="py-2.5 px-3">
          <input type="text" class="admin-row-cuti-name border border-slate-300 rounded px-2 py-1 text-xs w-full ${isCuti ? 'bg-white font-bold text-amber-900' : 'bg-slate-50 text-slate-400'}" placeholder="${isCuti ? 'cth: Cuti Penggal 1...' : '— (Minggu Biasa)'}" value="${f.cutiName || ''}" data-idx="${originalIdx}" ${!isCuti ? 'disabled' : ''}>
        </td>
        <td class="py-2.5 px-3 text-center">
          <div class="flex items-center justify-center gap-1.5">
            <button type="button" class="btn-cascade-from-row px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded font-bold text-[10px] transition flex items-center gap-1 cursor-pointer" data-idx="${originalIdx}" title="Kira semula urutan minggu-minggu seterusnya dari sini">
              <i data-lucide="zap" class="w-3 h-3 text-amber-600"></i>
              <span>Auto-Cascade</span>
            </button>
            <button type="button" class="btn-delete-week-row p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition cursor-pointer" data-idx="${originalIdx}" title="Padam baris Jumaat ini">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>
      `;

      // Event listener: Edit nombor minggu (Contoh dari 35 tukar ke 30 -> auto-cascade 31, 32, 33...)
      const inputWeek = tr.querySelector(".admin-row-week-input");
      if (inputWeek) {
        inputWeek.addEventListener("change", (e) => {
          const val = parseInt(e.target.value);
          if (!isNaN(val) && val > 0) {
            cascadeRenumberWeeks(originalIdx, val);
          }
        });
        inputWeek.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const val = parseInt(e.target.value);
            if (!isNaN(val) && val > 0) {
              cascadeRenumberWeeks(originalIdx, val);
            }
          }
        });
      }

      // Event listener: Tukar jenis minggu (Persekolahan vs Cuti Sekolah)
      const selectCuti = tr.querySelector(".admin-row-cuti-select");
      if (selectCuti) {
        selectCuti.addEventListener("change", (e) => {
          const targetCuti = (e.target.value === "true");
          const targetItem = db.config.fridays2026[originalIdx];
          targetItem.isCuti = targetCuti;
          if (targetCuti) {
            if (!targetItem.cutiName) targetItem.cutiName = "Cuti Persekolahan";
            cascadeRenumberWeeks(originalIdx, null);
          } else {
            // Kembali ke minggu persekolahan
            let prevW = 0;
            for (let k = originalIdx - 1; k >= 0; k--) {
              if (!db.config.fridays2026[k].isCuti && db.config.fridays2026[k].minggu) {
                prevW = db.config.fridays2026[k].minggu;
                break;
              }
            }
            cascadeRenumberWeeks(originalIdx, prevW + 1);
          }
        });
      }

      // Event listener: Edit nama cuti
      const inputCutiName = tr.querySelector(".admin-row-cuti-name");
      if (inputCutiName) {
        inputCutiName.addEventListener("change", (e) => {
          db.config.fridays2026[originalIdx].cutiName = e.target.value.trim();
          saveErphDatabase(db);
          initWeekOptions();
          updateFridayDisplay();
        });
      }

      // Event listener: Edit tarikh Jumaat
      const inputDate = tr.querySelector(".admin-row-date");
      if (inputDate) {
        inputDate.addEventListener("change", (e) => {
          const newDate = e.target.value;
          if (newDate) {
            db.config.fridays2026[originalIdx].tarikh = newDate;
            db.config.fridays2026[originalIdx].label = formatMalayDateLabel(newDate);
            saveErphDatabase(db);
            initWeekOptions();
            renderCalendarFridays();
            renderAdminWeeksTable();
            updateFridayDisplay();
          }
        });
      }

      // Event listener: Butang Auto-Cascade dari baris ini
      const btnCascade = tr.querySelector(".btn-cascade-from-row");
      if (btnCascade) {
        btnCascade.addEventListener("click", () => {
          const curWeek = f.minggu || null;
          cascadeRenumberWeeks(originalIdx, curWeek);
        });
      }

      // Event listener: Padam baris Jumaat
      const btnDelete = tr.querySelector(".btn-delete-week-row");
      if (btnDelete) {
        btnDelete.addEventListener("click", () => {
          Swal.fire({
            title: "Padam Baris Jumaat?",
            text: `Padam ${f.label} (${isCuti ? f.cutiName : 'Minggu ' + f.minggu}) dari takwim?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Ya, Padam",
            cancelButtonText: "Batal",
            confirmButtonColor: "#ef4444"
          }).then(res => {
            if (res.isConfirmed) {
              db.config.fridays2026.splice(originalIdx, 1);
              autoCascadeAllWeeks();
            }
          });
        });
      }

      tbody.appendChild(tr);
    });

    lucide.createIcons();
  }

  // ==============================================================
  // TAB 6: KONSOL PENTADBIR SISTEM (SUPER ADMIN)
  // ==============================================================
  function renderAdminConsole() {
    // 1. Muatkan Tetapan Takwim Sesi
    if (elements.adminSchoolStartDate) {
      elements.adminSchoolStartDate.value = db.config.school.startDate || "2026-01-05";
    }
    if (elements.adminFirstFridayDate) {
      elements.adminFirstFridayDate.value = db.config.school.firstFriday || "2026-01-09";
    }
    if (elements.adminTotalWeeksInput) {
      elements.adminTotalWeeksInput.value = db.config.school.totalWeeks || 43;
    }
    if (elements.adminCurrentWeekInput) {
      elements.adminCurrentWeekInput.value = db.config.school.currentWeek || state.activeWeek || 7;
    }

    // 2. Render Jadual Takwim & Urutan Minggu
    renderAdminWeeksTable();

    // 3. Render Jadual Staf Master
    const tbody = elements.adminStaffTbody;
    tbody.innerHTML = "";

    const query = elements.adminSearchStaff.value.toLowerCase().trim();
    const filtered = db.staffList.filter(s => {
      return s.name.toLowerCase().includes(query) ||
             (s.ic && s.ic.includes(query)) ||
             s.code.toLowerCase().includes(query);
    });

    elements.adminStaffCount.textContent = filtered.length;

    const weekUploads = db.uploads.filter(u => u.minggu === state.activeWeek);

    filtered.forEach(staff => {
      const up = weekUploads.find(u => u.guruId === staff.id);
      const isHijau = (up && up.status === "HIJAU");

      const supervisor = db.pentadbir.find(p => p.id === staff.supervisorId) || { name: "Tiada / Sendiri" };

      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-50 transition";

      tr.innerHTML = `
        <td class="py-2.5 px-3 font-mono font-bold text-slate-500">${staff.code}</td>
        <td class="py-2.5 px-3 font-bold text-slate-900">
          <div class="flex items-center space-x-2">
            ${staff.avatar ? `
              <img src="${staff.avatar}" class="w-6 h-6 rounded-full object-cover border border-slate-200 flex-shrink-0">
            ` : `
              <div class="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                ${staff.name.charAt(0)}
              </div>
            `}
            <span class="truncate">${staff.name}</span>
          </div>
        </td>
        <td class="py-2.5 px-3 font-mono text-[11px] text-slate-600">${staff.ic || '—'}</td>
        <td class="py-2.5 px-3 text-sky-800 font-semibold text-[11px]">${supervisor.name}</td>
        <td class="py-2.5 px-3 text-center">
          ${isHijau ? `
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">HIJAU</span>
          ` : `
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">MERAH</span>
          `}
        </td>
        <td class="py-2.5 px-3 text-center">
          <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${staff.status === 'Aktif' ? 'bg-sky-50 text-sky-800' : 'bg-amber-100 text-amber-900'}">
            ${staff.status}
          </span>
        </td>
        <td class="py-2.5 px-3 text-center space-x-1">
          <!-- Butang Togol Hijau / Merah -->
          <button data-staff-id="${staff.id}" class="btn-admin-quick-toggle px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded font-bold text-[10px] transition" title="Tukar Status Hijau/Merah">
            Togol Warna
          </button>

          <!-- Butang Padam Senyap -->
          ${isHijau ? `
            <button data-staff-id="${staff.id}" class="btn-admin-silent-del px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded font-bold text-[10px] transition" title="Padam e-RPH Tanpa Rekod">
              Padam e-RPH
            </button>
          ` : ''}

          <!-- Butang Edit Guru -->
          <button data-staff-id="${staff.id}" class="btn-admin-edit-staff px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded font-bold text-[10px] transition">
            Edit
          </button>
        </td>
      `;

      // Event listener: Quick toggle
      tr.querySelector(".btn-admin-quick-toggle").addEventListener("click", () => {
        toggleTeacherStatusSuperAdmin(staff.id);
      });

      // Event listener: Silent delete
      const delBtn = tr.querySelector(".btn-admin-silent-del");
      if (delBtn) {
        delBtn.addEventListener("click", () => {
          silentDeleteErphSuperAdmin(staff.id);
        });
      }

      // Event listener: Edit
      tr.querySelector(".btn-admin-edit-staff").addEventListener("click", () => {
        openEditStaffModal(staff);
      });

      tbody.appendChild(tr);
    });

    lucide.createIcons();
  }

  // ==============================================================
  // FUNGSI KUASA SUPER ADMIN (KAWALAN KHAS TS. MOHAMMAD FIKREY)
  // ==============================================================
  function promptSuperAdminAuth(callback) {
    Swal.fire({
      title: "Pengesahan Pentadbir Sistem",
      html: `
        <div class="text-left text-xs space-y-2">
          <p class="text-slate-600">Sila masukkan kod akses rahsia untuk membuka konsol pentadbir sistem:</p>
          <input type="password" id="swal-admin-code-input" class="w-full border p-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider" placeholder="••••••••••••">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Sahkan Kod",
      cancelButtonText: "Batal",
      confirmButtonColor: "#d97706",
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        const val = document.getElementById("swal-admin-code-input").value.trim();
        const isValid = await verifyAdminCode(val);
        if (isValid) {
          return true;
        } else {
          Swal.showValidationMessage("Kod akses keselamatan tidak sah!");
          return false;
        }
      }
    }).then(result => {
      if (result.isConfirmed) {
        state.isSuperAdminAuthenticated = true;
        state.currentUser = {
          id: 24,
          name: "MOHAMMAD FIKREY BIN ABDUL GAPAR",
          role: "Pentadbir Sistem & Penyelaras ICT (Super Admin)",
          ic: "910528-12-5411",
          isSupervisor: true,
          supervisorId: null,
          isSuperAdmin: true
        };
        sessionStorage.setItem("SKR_LOGGED_USER", JSON.stringify({
          user: state.currentUser,
          isSuperAdmin: true
        }));
        updateAuthDisplay();
        switchTab("konsol-admin");
        Swal.fire({
          icon: "success",
          title: "Akses Super Admin Diberikan",
          text: "Selamat bertugas Ts. Mohammad Fikrey.",
          timer: 1500,
          showConfirmButton: false
        });
        if (callback) callback();
      }
    });
  }

  // 1. Togol Status Guru (Hijau <-> Merah)
  function toggleTeacherStatusSuperAdmin(teacherId) {
    const teacher = db.staffList.find(s => s.id === teacherId);
    if (!teacher) return;

    const weekNum = state.activeWeek;
    const fInfo = getFridayInfo(weekNum);
    const existingIndex = db.uploads.findIndex(u => u.guruId === teacherId && u.minggu === weekNum);

    if (existingIndex >= 0 && db.uploads[existingIndex].status === "HIJAU") {
      // Tukar kepada Merah
      db.uploads[existingIndex].status = "MERAH";
      saveErphDatabase(db);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "warning",
        title: `${teacher.name} ditukar kepada MERAH`,
        timer: 1500,
        showConfirmButton: false
      });
    } else {
      // Tukar kepada Hijau
      const newUp = {
        id: `UPL-M${weekNum}-${teacherId}`,
        guruId: teacherId,
        guruName: teacher.name,
        minggu: weekNum,
        tarikhJumaat: fInfo.tarikh,
        status: "HIJAU",
        uploadedAt: getCurrentFormattedTimestamp(),
        fileName: `eRPH_M${weekNum}_${teacher.name.replace(/\s+/g, '_')}.pdf`,
        fileUrl: "https://drive.google.com/sample/erph",
        catatan: "Disahkan secara manual oleh Pentadbir Sistem",
        supervisorId: teacher.supervisorId,
        verifiedBy: "Pentadbir Sistem (Ts. Fikrey)",
        verifiedAt: getCurrentFormattedTimestamp(),
        ulasan: "Disahkan."
      };

      if (existingIndex >= 0) {
        db.uploads[existingIndex] = newUp;
      } else {
        db.uploads.push(newUp);
      }
      saveErphDatabase(db);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `${teacher.name} ditukar kepada HIJAU`,
        timer: 1500,
        showConfirmButton: false
      });
    }

    renderMonitoringColumns();
    if (state.activeTab === "konsol-admin") renderAdminConsole();
    if (state.activeTab === "portal-guru") renderTeacherPortal();
  }

  // 2. Padam e-RPH Senyap Tanpa Pernyataan
  function silentDeleteErphSuperAdmin(teacherId) {
    const teacher = db.staffList.find(s => s.id === teacherId);
    const weekNum = state.activeWeek;

    db.uploads = db.uploads.filter(u => !(u.guruId === teacherId && u.minggu === weekNum));
    saveErphDatabase(db);

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "info",
      title: `e-RPH ${teacher ? teacher.name : ''} dikeluarkan (tanpa rekod)`,
      timer: 1800,
      showConfirmButton: false
    });

    renderMonitoringColumns();
    if (state.activeTab === "konsol-admin") renderAdminConsole();
    if (state.activeTab === "portal-guru") renderTeacherPortal();
  }

  // 3. Buka Modal Edit Staff
  let adminModalStaffAvatar = null;

  function updateAdminModalAvatarPreview(name = "G") {
    if (!elements.adminStaffModalAvatarPreview) return;
    if (adminModalStaffAvatar) {
      elements.adminStaffModalAvatarPreview.innerHTML = `<img src="${adminModalStaffAvatar}" class="w-full h-full object-cover rounded-xl">`;
      elements.adminStaffModalAvatarPreview.className = "w-12 h-12 rounded-xl overflow-hidden border border-slate-300 flex-shrink-0 bg-white shadow-xs";
      if (elements.btnAdminModalRemoveAvatar) elements.btnAdminModalRemoveAvatar.classList.remove("hidden");
    } else {
      elements.adminStaffModalAvatarPreview.textContent = (name || "G").charAt(0).toUpperCase();
      elements.adminStaffModalAvatarPreview.className = "w-12 h-12 rounded-xl bg-sky-600 text-white font-black text-lg flex items-center justify-center overflow-hidden border border-slate-300 flex-shrink-0 shadow-xs";
      if (elements.btnAdminModalRemoveAvatar) elements.btnAdminModalRemoveAvatar.classList.add("hidden");
    }
  }

  function openEditStaffModal(staff = null) {
    elements.staffReasonWrapper.classList.add("hidden");
    if (elements.adminStaffModalAvatarInput) elements.adminStaffModalAvatarInput.value = "";

    if (staff) {
      elements.modalStaffTitle.textContent = "Kemaskini Maklumat Guru";
      elements.staffFormId.value = staff.id;
      elements.staffFormName.value = staff.name;
      elements.staffFormIc.value = staff.ic || "";
      elements.staffFormSession.value = staff.session || "Pagi";
      elements.staffFormRole.value = staff.role || "";
      elements.staffFormSupervisor.value = staff.supervisorId || "2";
      elements.staffFormStatus.value = staff.status || "Aktif";
      elements.staffFormReason.value = staff.inactiveReason || "";
      adminModalStaffAvatar = staff.avatar || null;
      updateAdminModalAvatarPreview(staff.name);
      if (staff.status !== "Aktif") {
        elements.staffReasonWrapper.classList.remove("hidden");
      }
      elements.btnAdminRemoveStaff.classList.remove("hidden");
    } else {
      elements.modalStaffTitle.textContent = "Tambah Guru Baru ke Senarai";
      elements.staffFormId.value = "";
      elements.staffFormName.value = "";
      elements.staffFormIc.value = "";
      elements.staffFormSession.value = "Pagi";
      elements.staffFormRole.value = "Guru Akademik";
      elements.staffFormSupervisor.value = "2";
      elements.staffFormStatus.value = "Aktif";
      elements.staffFormReason.value = "";
      adminModalStaffAvatar = null;
      updateAdminModalAvatarPreview("G");
      elements.btnAdminRemoveStaff.classList.add("hidden");
    }

    elements.modalAdminManageStaff.classList.remove("hidden");
    lucide.createIcons();
  }

  if (elements.adminStaffModalAvatarInput) {
    elements.adminStaffModalAvatarInput.addEventListener("change", async (e) => {
      if (e.target.files && e.target.files[0]) {
        try {
          adminModalStaffAvatar = await compressImageToBase64(e.target.files[0], 160, 160, 0.82);
          updateAdminModalAvatarPreview(elements.staffFormName.value || "G");
        } catch (err) {
          safeSwal({ icon: "error", title: "Ralat Imej", text: err.message });
        }
      }
    });
  }

  if (elements.btnAdminModalRemoveAvatar) {
    elements.btnAdminModalRemoveAvatar.addEventListener("click", () => {
      adminModalStaffAvatar = null;
      if (elements.adminStaffModalAvatarInput) elements.adminStaffModalAvatarInput.value = "";
      updateAdminModalAvatarPreview(elements.staffFormName.value || "G");
    });
  }

  elements.staffFormStatus.addEventListener("change", () => {
    if (elements.staffFormStatus.value !== "Aktif") {
      elements.staffReasonWrapper.classList.remove("hidden");
    } else {
      elements.staffReasonWrapper.classList.add("hidden");
    }
  });

  // Simpan Maklumat Guru
  elements.formManageStaff.addEventListener("submit", (e) => {
    e.preventDefault();

    const idVal = elements.staffFormId.value;
    const nameVal = elements.staffFormName.value.trim().toUpperCase();
    const icVal = elements.staffFormIc.value.trim();
    const sessionVal = elements.staffFormSession.value;
    const roleVal = elements.staffFormRole.value.trim();
    const supVal = parseInt(elements.staffFormSupervisor.value);
    const statusVal = elements.staffFormStatus.value;
    const reasonVal = elements.staffFormReason.value.trim();

    if (idVal) {
      // Kemaskini guru sedia ada
      const target = db.staffList.find(s => String(s.id) === String(idVal));
      if (target) {
        target.name = nameVal;
        target.ic = icVal;
        target.session = sessionVal;
        target.role = roleVal;
        target.supervisorId = supVal;
        target.status = statusVal;
        target.inactiveReason = reasonVal;
        target.avatar = adminModalStaffAvatar;

        if (state.currentUser && state.currentUser.id === target.id) {
          state.currentUser.avatar = adminModalStaffAvatar;
          const savedSession = sessionStorage.getItem("SKR_LOGGED_USER");
          if (savedSession) {
            try {
              const parsed = JSON.parse(savedSession);
              parsed.user.avatar = adminModalStaffAvatar;
              sessionStorage.setItem("SKR_LOGGED_USER", JSON.stringify(parsed));
            } catch (err) {}
          }
          updateAuthDisplay();
        }
      }
    } else {
      // Tambah guru baru
      const newId = db.staffList.length > 0 ? Math.max(...db.staffList.map(s => s.id)) + 1 : 1;
      db.staffList.push({
        id: newId,
        code: `G${String(newId).padStart(2, "0")}`,
        name: nameVal,
        ic: icVal,
        role: roleVal,
        supervisorId: supVal,
        status: statusVal,
        session: sessionVal,
        inactiveReason: reasonVal,
        avatar: adminModalStaffAvatar,
        customPassword: null
      });
    }

    saveErphDatabase(db);
    elements.modalAdminManageStaff.classList.add("hidden");

    Swal.fire({
      icon: "success",
      title: "Data Disimpan",
      text: "Maklumat guru telah dikemaskini dalam pangkalan data.",
      timer: 1500,
      showConfirmButton: false
    });

    renderAdminConsole();
    renderMonitoringColumns();
  });

  // Keluarkan Guru dengan Nyatakan Sebab
  elements.btnAdminRemoveStaff.addEventListener("click", () => {
    const idVal = elements.staffFormId.value;
    const target = db.staffList.find(s => String(s.id) === String(idVal));
    if (!target) return;

    Swal.fire({
      title: `Keluarkan ${target.name}?`,
      text: "Sila pilih sebab pengeluaran guru daripada senarai aktif:",
      input: "select",
      inputOptions: {
        "Berpindah": "Berpindah Sekolah",
        "Bersara / Pencen": "Bersara / Pencen",
        "Cuti Belajar": "Cuti Belajar Bergaji Penuh",
        "Cuti Bersalin": "Cuti Bersalin / Sakit Berpanjangan",
        "Nyahaktif": "Nyahaktifkan Lain-lain"
      },
      showCancelButton: true,
      confirmButtonText: "Sahkan Pengeluaran",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ef4444"
    }).then(result => {
      if (result.isConfirmed) {
        target.status = result.value;
        target.inactiveReason = `Dikeluarkan pada ${getCurrentFormattedTimestamp()}: ${result.value}`;
        saveErphDatabase(db);
        elements.modalAdminManageStaff.classList.add("hidden");

        Swal.fire("Selesai", `Guru telah dikeluarkan dengan status: ${result.value}`, "success");
        renderAdminConsole();
        renderMonitoringColumns();
      }
    });
  });

  // ==============================================================
  // MODAL SEMAKAN e-RPH (UNTUK PENTADBIR)
  // ==============================================================
  function openReviewErphModal(teacher, uploadRecord) {
    activeReviewUploadId = uploadRecord ? uploadRecord.id : null;

    if (elements.modalReviewAvatar) {
      if (teacher.avatar) {
        elements.modalReviewAvatar.innerHTML = `<img src="${teacher.avatar}" alt="${teacher.name}" class="w-full h-full object-cover rounded-xl">`;
        elements.modalReviewAvatar.className = "w-10 h-10 rounded-xl overflow-hidden border border-slate-700 flex-shrink-0 bg-white";
      } else {
        elements.modalReviewAvatar.textContent = teacher.name.charAt(0);
        elements.modalReviewAvatar.className = "w-10 h-10 rounded-xl bg-sky-600 text-white font-black text-sm flex items-center justify-center overflow-hidden border border-slate-700 flex-shrink-0";
      }
    }

    elements.modalReviewGuruName.textContent = teacher.name;
    elements.modalReviewWeekLabel.textContent = `Minggu ${state.activeWeek} • ${getFridayInfo(state.activeWeek).label}`;

    if (uploadRecord && uploadRecord.status === "HIJAU") {
      elements.modalReviewStatusBox.className = "p-3 rounded-xl border border-emerald-300 bg-emerald-50 flex items-center justify-between";
      elements.modalReviewStatusText.className = "font-black text-xs text-emerald-800";
      elements.modalReviewStatusText.textContent = "STATUS: HIJAU (Berjaya Upload)";
      elements.modalReviewTimestamp.textContent = `Dikemaskini: ${uploadRecord.uploadedAt}`;

      elements.modalReviewFilename.textContent = uploadRecord.fileName || `eRPH_M${state.activeWeek}_${teacher.name}.pdf`;
      if (elements.modalReviewFilesize) {
        elements.modalReviewFilesize.textContent = uploadRecord.fileSize ? `Saiz Dokumen: ${uploadRecord.fileSize} • Dimuat naik ${uploadRecord.uploadedAt}` : `Dimuat naik pada ${uploadRecord.uploadedAt}`;
      }

      if (elements.btnReviewDownloadFile) {
        elements.btnReviewDownloadFile.classList.remove("hidden");
        elements.btnReviewDownloadFile.onclick = () => downloadOrViewErphDocument(uploadRecord);
      }

      if (uploadRecord.fileUrl && uploadRecord.fileUrl.startsWith("http") && !uploadRecord.fileUrl.includes("sample")) {
        elements.modalReviewOpenLink.href = uploadRecord.fileUrl;
        elements.modalReviewOpenLink.classList.remove("hidden");
      } else {
        elements.modalReviewOpenLink.classList.add("hidden");
      }
      elements.modalReviewCatatan.textContent = uploadRecord.catatan || "Tiada catatan tambahan.";
      elements.modalReviewUlasanInput.value = uploadRecord.ulasan || "";
    } else {
      elements.modalReviewStatusBox.className = "p-3 rounded-xl border border-rose-300 bg-rose-50 flex items-center justify-between";
      elements.modalReviewStatusText.className = "font-black text-xs text-rose-800";
      elements.modalReviewStatusText.textContent = "STATUS: MERAH (Belum Upload)";
      elements.modalReviewTimestamp.textContent = "Belum memuat naik";

      elements.modalReviewFilename.textContent = "Tiada fail dimuat naik";
      if (elements.modalReviewFilesize) {
        elements.modalReviewFilesize.textContent = "Guru belum memuat naik e-RPH minggu ini";
      }
      if (elements.btnReviewDownloadFile) {
        elements.btnReviewDownloadFile.classList.add("hidden");
      }
      elements.modalReviewOpenLink.classList.add("hidden");
      elements.modalReviewCatatan.textContent = "Guru belum membuat penghantaran bagi minggu ini.";
      elements.modalReviewUlasanInput.value = "";
    }

    elements.modalReviewErph.classList.remove("hidden");
    lucide.createIcons();
  }

  elements.btnSaveUlasanPentadbir.addEventListener("click", () => {
    if (!activeReviewUploadId) {
      Swal.fire("Makluman", "Tiada rekod penghantaran e-RPH untuk diulas.", "info");
      return;
    }

    const up = db.uploads.find(u => u.id === activeReviewUploadId);
    if (up) {
      up.ulasan = elements.modalReviewUlasanInput.value.trim();
      up.verifiedBy = state.currentUser ? state.currentUser.name : "Pentadbir";
      up.verifiedAt = getCurrentFormattedTimestamp();
      saveErphDatabase(db);

      Swal.fire({
        icon: "success",
        title: "Ulasan Disimpan",
        text: "Pengesahan pentadbir telah direkodkan.",
        timer: 1500,
        showConfirmButton: false
      });
      elements.modalReviewErph.classList.add("hidden");
      renderMonitoringColumns();
    }
  });

  // Tukar Kata Laluan Guru
  elements.btnPortalChangePwd.addEventListener("click", () => {
    elements.newPwdInput.value = "";
    elements.confirmPwdInput.value = "";
    elements.modalChangePassword.classList.remove("hidden");
  });

  elements.formChangePwd.addEventListener("submit", (e) => {
    e.preventDefault();
    const p1 = elements.newPwdInput.value;
    const p2 = elements.confirmPwdInput.value;

    if (p1.length < 4) {
      Swal.fire("Ralat", "Kata laluan mestilah sekurang-kurangnya 4 aksara.", "warning");
      return;
    }
    if (p1 !== p2) {
      Swal.fire("Ralat", "Sila pastikan pengesahan kata laluan sepadan.", "error");
      return;
    }

    const t = db.staffList.find(s => s.id === state.currentUser.id);
    if (t) {
      t.customPassword = p1;
      saveErphDatabase(db);
      elements.modalChangePassword.classList.add("hidden");
      Swal.fire("Berjaya", "Kata laluan peribadi anda telah disimpan. Gunakan kata laluan ini untuk log masuk seterusnya.", "success");
    }
  });

  // ==============================================================
  // EKSPORT EXCEL
  // ==============================================================
  elements.btnExportMonitoringExcel.addEventListener("click", () => {
    if (typeof XLSX === "undefined") {
      Swal.fire("Ralat", "Pustaka XLSX tidak dapat dimuatkan.", "error");
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Status Pemantauan Minggu Semasa
    const weekNum = state.activeWeek;
    const fInfo = getFridayInfo(weekNum);
    const weekUps = db.uploads.filter(u => u.minggu === weekNum);

    const rows = db.staffList.filter(s => s.status === "Aktif").map(s => {
      const up = weekUps.find(u => u.guruId === s.id);
      const isH = (up && up.status === "HIJAU");
      const sup = db.pentadbir.find(p => p.id === s.supervisorId) || { name: "Guru Besar" };

      return {
        "Kod": s.code,
        "Nama Guru": s.name,
        "No. Kad Pengenalan": s.ic,
        "Sesi": s.session,
        "Pentadbir Penyelia": sup.name,
        "Minggu": fInfo.isCuti ? `[CUTI] ${fInfo.cutiName || 'Cuti Persekolahan'}` : `Minggu ${fInfo.minggu || weekNum}`,
        "Tarikh Jumaat": fInfo.label,
        "Status e-RPH": fInfo.isCuti ? "DIKECUALIKAN (CUTI SEKOLAH)" : (isH ? "HIJAU (BERJAYA UPLOAD)" : "MERAH (BELUM UPLOAD)"),
        "Waktu Kemaskini": fInfo.isCuti ? "— (Cuti Persekolahan)" : (isH ? up.uploadedAt : "—"),
        "Nama Fail / Pautan": fInfo.isCuti ? "Dikecualikan" : (isH ? (up.fileUrl || up.fileName) : "—"),
        "Ulasan Pentadbir": fInfo.isCuti ? (fInfo.cutiName || "Cuti Persekolahan") : (isH ? (up.ulasan || "Menunggu Semakan") : "—")
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `Pemantauan_M${weekNum}`);

    XLSX.writeFile(wb, `Laporan_eRPH_SKRanggu_Minggu_${weekNum}.xlsx`);
    Swal.fire("Berjaya", `Laporan Minggu ${weekNum} dimuat turun sebagai Excel.`, "success");
  });

  // Reset Demo
  elements.btnResetSystemData.addEventListener("click", () => {
    Swal.fire({
      title: "Set Semula Data?",
      text: "Semua rekod penghantaran dan senarai guru akan kembali kepada asal.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Set Semula",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ef4444"
    }).then(result => {
      if (result.isConfirmed) {
        resetErphDatabase();
        sessionStorage.removeItem("SKR_LOGGED_USER");
        location.reload();
      }
    });
  });

  // ==============================================================
  // EVENT LISTENERS UMUM
  // ==============================================================
  elements.navLinks.forEach(link => {
    link.addEventListener("click", () => switchTab(link.dataset.tab));
  });

  elements.headerWeekSelect.addEventListener("change", (e) => {
    const val = e.target.value;
    state.activeWeek = (typeof val === "string" && val.startsWith("cuti-")) ? val : (parseInt(val) || val);
    updateFridayDisplay();
    renderMonitoringColumns();
    if (state.activeTab === "portal-guru") renderTeacherPortal();
    if (state.activeTab === "konsol-admin") renderAdminConsole();
  });

  // ==============================================================
  // EVENT LISTENERS PENGURUSAN TAKWIM SESI & AUTO-CASCADE
  // ==============================================================

  // 1. Simpan Tetapan Sesi Persekolahan
  if (elements.btnAdminSaveSession) {
    elements.btnAdminSaveSession.addEventListener("click", () => {
      const sDate = elements.adminSchoolStartDate.value;
      const fDate = elements.adminFirstFridayDate.value;
      const tWeeks = parseInt(elements.adminTotalWeeksInput.value) || 43;
      const cWeek = parseInt(elements.adminCurrentWeekInput.value) || 7;

      db.config.school.startDate = sDate;
      db.config.school.firstFriday = fDate;
      db.config.school.totalWeeks = tWeeks;
      db.config.school.currentWeek = cWeek;
      saveErphDatabase(db);

      Swal.fire({
        icon: "success",
        title: "Tetapan Sesi Disimpan",
        text: `Tarikh Buka Sekolah: ${sDate || 'Ditetapkan'} • Minggu Semasa: M${cWeek}`,
        timer: 1800,
        showConfirmButton: false
      });
      initWeekOptions();
      updateFridayDisplay();
      renderMonitoringColumns();
    });
  }

  // 2. Apabila Admin ubah Tarikh Mula Buka Sekolah, automatik hitung Tarikh Jumaat Pertama
  if (elements.adminSchoolStartDate) {
    elements.adminSchoolStartDate.addEventListener("change", (e) => {
      const val = e.target.value;
      if (val) {
        const d = new Date(val + "T00:00:00");
        const day = d.getDay(); // 0=Ahad, 1=Isnin, 5=Jumaat
        const diff = (5 - day + 7) % 7;
        d.setDate(d.getDate() + diff);

        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dayStr = String(d.getDate()).padStart(2, "0");
        if (elements.adminFirstFridayDate) {
          elements.adminFirstFridayDate.value = `${y}-${m}-${dayStr}`;
        }
      }
    });
  }

  // 3. Jana Semula Tarikh Jumaat Takwim
  if (elements.btnAdminGenerateFridays) {
    elements.btnAdminGenerateFridays.addEventListener("click", () => {
      const fDate = elements.adminFirstFridayDate ? elements.adminFirstFridayDate.value : "2026-01-09";
      const tWeeks = elements.adminTotalWeeksInput ? (parseInt(elements.adminTotalWeeksInput.value) || 43) : 43;

      if (!fDate) {
        Swal.fire("Sila Pilih Tarikh", "Sila masukkan tarikh Jumaat pertama sesi persekolahan.", "warning");
        return;
      }

      Swal.fire({
        title: "Jana Semula Takwim Jumaat?",
        text: `Sistem akan menjana semula ${tWeeks} tarikh Jumaat (setiap 7 hari) bermula dari ${fDate}.`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Ya, Jana Takwim",
        cancelButtonText: "Batal",
        confirmButtonColor: "#0284c7"
      }).then(res => {
        if (res.isConfirmed) {
          generateSchoolFridays(fDate, tWeeks);
          Swal.fire("Selesai", `Sebanyak ${tWeeks} tarikh Jumaat berjaya dijana dan dikira secara berurutan.`, "success");
        }
      });
    });
  }

  // 4. Auto-Cascade Semua Minggu
  if (elements.btnAdminAutoCascadeAll) {
    elements.btnAdminAutoCascadeAll.addEventListener("click", () => {
      autoCascadeAllWeeks();
    });
  }

  // 5. Tambah Baris Jumaat Baru
  if (elements.btnAdminAddWeekRow) {
    elements.btnAdminAddWeekRow.addEventListener("click", () => {
      let nextDate = new Date();
      if (db.config.fridays2026.length > 0) {
        const last = db.config.fridays2026[db.config.fridays2026.length - 1];
        nextDate = new Date(last.tarikh + "T00:00:00");
        nextDate.setDate(nextDate.getDate() + 7);
      }
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, "0");
      const d = String(nextDate.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;
      const labelStr = formatMalayDateLabel(nextDate);

      const maxW = Math.max(0, ...db.config.fridays2026.filter(f => !f.isCuti && f.minggu).map(f => f.minggu));

      db.config.fridays2026.push({
        minggu: maxW + 1,
        tarikh: dateStr,
        label: labelStr,
        isCuti: false,
        cutiName: ""
      });
      db.config.school.totalWeeks = maxW + 1;
      saveErphDatabase(db);

      initWeekOptions();
      renderCalendarFridays();
      renderAdminWeeksTable();
      updateFridayDisplay();

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Baris Ditambah",
        text: `Minggu ${maxW + 1} (${labelStr}) telah ditambah ke dalam takwim.`,
        timer: 1500,
        showConfirmButton: false
      });
    });
  }

  // 6. Carian Minggu Takwim
  if (elements.adminSearchWeek) {
    elements.adminSearchWeek.addEventListener("input", renderAdminWeeksTable);
  }

  elements.navBtnAdminConsole.addEventListener("click", (e) => {
    e.preventDefault();
    if (!state.isSuperAdminAuthenticated) {
      promptSuperAdminAuth(() => switchTab("konsol-admin"));
    } else {
      switchTab("konsol-admin");
    }
  });

  elements.adminSearchStaff.addEventListener("input", renderAdminConsole);

  elements.btnAdminAddTeacher.addEventListener("click", () => {
    openEditStaffModal(null);
  });

  elements.btnRefreshApp.addEventListener("click", () => {
    db = getErphDatabase();
    renderMonitoringColumns();
    renderAdminConsole();
    Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Data dikemaskini", timer: 1000, showConfirmButton: false });
  });

  elements.btnPrintScreen.addEventListener("click", () => {
    window.print();
  });

  // Mobile Menu
  elements.mobileMenuToggle.addEventListener("click", () => elements.sidebar.classList.toggle("hidden"));
  elements.mobileMenuClose.addEventListener("click", () => elements.sidebar.classList.add("hidden"));

  // Close modals
  elements.btnClosePwdModal.addEventListener("click", () => elements.modalChangePassword.classList.add("hidden"));
  elements.btnCloseReviewModal.addEventListener("click", () => elements.modalReviewErph.classList.add("hidden"));
  elements.btnCloseManageStaff.addEventListener("click", () => elements.modalAdminManageStaff.classList.add("hidden"));

  // Calendar Month Navigation Listeners
  if (elements.btnCalPrevMonth) {
    elements.btnCalPrevMonth.addEventListener("click", () => {
      calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
      renderInteractiveMonthlyCalendar();
    });
  }

  if (elements.btnCalNextMonth) {
    elements.btnCalNextMonth.addEventListener("click", () => {
      calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
      renderInteractiveMonthlyCalendar();
    });
  }

  if (elements.btnCalToday) {
    elements.btnCalToday.addEventListener("click", () => {
      calendarViewDate = new Date();
      renderInteractiveMonthlyCalendar();
    });
  }

  // ==============================================================
  // PENGENDALI PENUKARAN FOTO PROFIL (PORTAL GURU & SIDEBAR)
  // ==============================================================
  if (elements.portalAvatarWrapper) {
    elements.portalAvatarWrapper.addEventListener("click", () => {
      if (elements.portalAvatarInput) elements.portalAvatarInput.click();
    });
  }

  if (elements.btnPortalPickAvatar) {
    elements.btnPortalPickAvatar.addEventListener("click", () => {
      if (elements.portalAvatarInput) elements.portalAvatarInput.click();
    });
  }

  if (elements.btnPortalRemoveAvatar) {
    elements.btnPortalRemoveAvatar.addEventListener("click", () => {
      handleAvatarRemove();
    });
  }

  if (elements.portalAvatarInput) {
    elements.portalAvatarInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        handleAvatarUpload(e.target.files[0]);
        e.target.value = "";
      }
    });
  }

  if (elements.sidebarUserCard) {
    elements.sidebarUserCard.addEventListener("click", () => {
      if (elements.portalAvatarInput) {
        elements.portalAvatarInput.click();
      }
    });
  }

  if (elements.btnAdminModalPickAvatar) {
    elements.btnAdminModalPickAvatar.addEventListener("click", () => {
      if (elements.adminStaffModalAvatarInput) elements.adminStaffModalAvatarInput.click();
    });
  }

  // ==============================================================
  // PENGENDALI ACARA JADUAL WAKTU INTERAKTIF (TAB 5)
  // ==============================================================
  if (elements.tabTimetableModeGuru) {
    elements.tabTimetableModeGuru.addEventListener("click", () => {
      state.timetableMode = "guru";
      renderTimetableReference();
    });
  }

  if (elements.tabTimetableModeKelas) {
    elements.tabTimetableModeKelas.addEventListener("click", () => {
      state.timetableMode = "kelas";
      renderTimetableReference();
    });
  }

  if (elements.tabTimetableModeInduk) {
    elements.tabTimetableModeInduk.addEventListener("click", () => {
      state.timetableMode = "induk";
      renderTimetableReference();
    });
  }

  // Penapis Guru
  if (elements.timetableSelectGuru) {
    elements.timetableSelectGuru.addEventListener("change", (e) => {
      state.timetableSelectedGuru = e.target.value;
      renderTimetableReference();
    });
  }

  // Penapis Kelas
  if (elements.timetableSelectKelas) {
    elements.timetableSelectKelas.addEventListener("change", (e) => {
      state.timetableSelectedKelas = e.target.value;
      renderTimetableReference();
    });
  }

  // Carian & Penapis Induk
  if (elements.timetableSearchInput) {
    elements.timetableSearchInput.addEventListener("input", (e) => {
      state.timetableIndukSearch = e.target.value;
      renderTimetableInduk();
      lucide.createIcons();
    });
  }

  if (elements.timetableFilterIndukHari) {
    elements.timetableFilterIndukHari.addEventListener("change", (e) => {
      state.timetableIndukHari = e.target.value;
      renderTimetableInduk();
      lucide.createIcons();
    });
  }

  if (elements.timetableFilterIndukKelas) {
    elements.timetableFilterIndukKelas.addEventListener("change", (e) => {
      state.timetableIndukKelas = e.target.value;
      renderTimetableInduk();
      lucide.createIcons();
    });
  }

  if (elements.timetableFilterIndukSubjek) {
    elements.timetableFilterIndukSubjek.addEventListener("change", (e) => {
      state.timetableIndukSubjek = e.target.value;
      renderTimetableInduk();
      lucide.createIcons();
    });
  }

  // Butang Global Jadual
  if (elements.btnTimetableAddSlot) {
    elements.btnTimetableAddSlot.addEventListener("click", () => {
      window.erphTimetableAddSlotQuick();
    });
  }

  // Togol Pratonton Rasmi 1 Halaman A4
  if (elements.btnTimetableTogglePreview) {
    elements.btnTimetableTogglePreview.addEventListener("click", () => {
      state.timetableOfficialPreview = !state.timetableOfficialPreview;
      renderTimetableReference();
    });
  }

  // Cetak Jadual Waktu Rasmi (1 Halaman A4 Landscape)
  if (elements.btnTimetablePrint) {
    elements.btnTimetablePrint.addEventListener("click", () => {
      if (state.timetableMode === "induk") {
        const targetTeacher = state.timetableSelectedGuru || (state.currentUser && state.currentUser.name) || (db.staffList && db.staffList[0] ? db.staffList[0].name : "");
        state.timetableSelectedGuru = targetTeacher;
        if (elements.timetableSelectGuru) elements.timetableSelectGuru.value = targetTeacher;
      }
      buildOfficialPrintSheet();
      window.print();
    });
  }

  // Cetak Jadual Waktu Sendiri dari Portal Guru (1 Halaman)
  if (elements.btnPortalPrintTimetable) {
    elements.btnPortalPrintTimetable.addEventListener("click", () => {
      const currentTeacherName = (state.currentUser && state.currentUser.name)
        ? state.currentUser.name
        : (db.staffList && db.staffList[0] ? db.staffList[0].name : "");
      state.timetableMode = "guru";
      state.timetableSelectedGuru = currentTeacherName;
      if (elements.timetableSelectGuru) {
        elements.timetableSelectGuru.value = currentTeacherName;
      }
      buildOfficialPrintSheet();
      window.print();
    });
  }

  if (elements.btnTimetableReset) {
    elements.btnTimetableReset.addEventListener("click", () => {
      Swal.fire({
        title: "Set Semula Jadual Piawai?",
        html: "Adakah anda pasti ingin mengembalikan semua data jadual waktu kepada <b>654 slot rasmi SK Ranggu</b> dari fail asal?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#4f46e5",
        cancelButtonColor: "#64748b",
        confirmButtonText: "Ya, Set Semula",
        cancelButtonText: "Batal"
      }).then(result => {
        if (result.isConfirmed) {
          if (typeof INITIAL_TIMETABLE_DATA !== "undefined") {
            db.timetable = JSON.parse(JSON.stringify(INITIAL_TIMETABLE_DATA));
            saveErphDatabase(db);
            populateTimetableSelects(true);
            renderTimetableReference();
            safeSwal({
              icon: "success",
              title: "Berjaya",
              text: "Jadual waktu telah diset semula kepada 654 slot rasmi.",
              toast: true,
              position: "top-end",
              timer: 2000,
              showConfirmButton: false
            });
          }
        }
      });
    });
  }

  // Tutup Modal Slot
  if (elements.btnCloseModalTimetable) {
    elements.btnCloseModalTimetable.addEventListener("click", () => {
      elements.modalEditTimetableSlot.classList.add("hidden");
    });
  }

  if (elements.btnCancelTimetableSlot) {
    elements.btnCancelTimetableSlot.addEventListener("click", () => {
      elements.modalEditTimetableSlot.classList.add("hidden");
    });
  }

  // Auto-kemaskini masa apabila waktu ditukar dalam modal
  if (elements.slotFormWaktu) {
    elements.slotFormWaktu.addEventListener("change", (e) => {
      if (elements.slotFormMasa) {
        elements.slotFormMasa.value = getTimeForWaktu(e.target.value);
      }
      checkModalClashLive();
    });
  }

  function checkModalClashLive() {
    if (!elements.slotClashWarning) return;
    const guru = elements.slotFormGuru.value;
    const hari = elements.slotFormHari.value;
    const waktu = elements.slotFormWaktu.value;
    const kelas = elements.slotFormKelas.value;
    const excludeId = elements.slotFormId.value ? parseInt(elements.slotFormId.value) : -1;

    const clashMsg = checkSlotClash(guru, hari, waktu, kelas, excludeId);
    if (clashMsg) {
      elements.slotClashText.textContent = clashMsg;
      elements.slotClashWarning.classList.remove("hidden");
    } else {
      elements.slotClashWarning.classList.add("hidden");
    }
  }

  if (elements.slotFormGuru) elements.slotFormGuru.addEventListener("change", checkModalClashLive);
  if (elements.slotFormHari) elements.slotFormHari.addEventListener("change", checkModalClashLive);
  if (elements.slotFormKelas) elements.slotFormKelas.addEventListener("change", checkModalClashLive);

  // Padam Slot Melalui Modal
  if (elements.btnDeleteTimetableSlot) {
    elements.btnDeleteTimetableSlot.addEventListener("click", () => {
      const slotId = elements.slotFormId.value ? parseInt(elements.slotFormId.value) : null;
      if (slotId) {
        elements.modalEditTimetableSlot.classList.add("hidden");
        window.erphTimetableDeleteDirect(slotId);
      }
    });
  }

  // Simpan / Tambah Slot (Submit Form)
  if (elements.formEditTimetableSlot) {
    elements.formEditTimetableSlot.addEventListener("submit", (e) => {
      e.preventDefault();
      const slotId = elements.slotFormId.value ? parseInt(elements.slotFormId.value) : null;
      const guru = elements.slotFormGuru.value.trim();
      const hari = elements.slotFormHari.value;
      const waktu = parseInt(elements.slotFormWaktu.value);
      const masa = elements.slotFormMasa.value.trim() || getTimeForWaktu(waktu);
      const kelas = elements.slotFormKelas.value;
      const subjek = elements.slotFormSubjek.value;

      const kodHariMap = { "ISN": 1, "SEL": 2, "RAB": 3, "KHA": 4, "JUM": 5 };
      const kodHari = kodHariMap[hari] || 1;

      // Semak pertindihan
      const clashMsg = checkSlotClash(guru, hari, waktu, kelas, slotId || -1);

      function commitSaveSlot() {
        if (!db.timetable) db.timetable = [];

        if (slotId) {
          // Kemaskini slot sedia ada
          const idx = db.timetable.findIndex(s => s.id === slotId);
          if (idx !== -1) {
            db.timetable[idx] = {
              ...db.timetable[idx],
              guru,
              hari,
              kodHari,
              waktu,
              masa,
              kelas,
              subjek,
              paparan: `${kelas} ${subjek}`
            };
          }
        } else {
          // Tambah slot baru
          const nextId = db.timetable.reduce((max, s) => Math.max(max, s.id || 0), 0) + 1;
          db.timetable.push({
            id: nextId,
            guru,
            hari,
            kodHari,
            waktu,
            masa,
            kelas,
            subjek,
            paparan: `${kelas} ${subjek}`,
            halamanPdf: 1
          });
        }

        saveErphDatabase(db);
        elements.modalEditTimetableSlot.classList.add("hidden");
        populateTimetableSelects(true);
        renderTimetableReference();

        safeSwal({
          icon: "success",
          title: "Berjaya",
          text: `Slot ${subjek} (${kelas}) untuk ${guru} telah disimpan.`,
          toast: true,
          position: "top-end",
          timer: 2000,
          showConfirmButton: false
        });
      }

      if (clashMsg) {
        Swal.fire({
          title: "Amaran Pertindihan Slot",
          html: `${clashMsg}<br><br><span class="text-xs text-slate-500">Adakah anda tetap ingin meneruskan penyimpanan slot ini?</span>`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#4f46e5",
          cancelButtonColor: "#64748b",
          confirmButtonText: "Ya, Teruskan",
          cancelButtonText: "Semak Semula"
        }).then(res => {
          if (res.isConfirmed) {
            commitSaveSlot();
          }
        });
      } else {
        commitSaveSlot();
      }
    });
  }

  // ==============================================================
  // PENGENDALI TOOLBAR MOD PAPARAN PEMANTAUAN (BARIS / JADUAL / KOLUM)
  // ==============================================================
  if (elements.btnViewModeBaris) {
    elements.btnViewModeBaris.addEventListener("click", () => {
      state.monitoringViewMode = "baris";
      renderMonitoringColumns();
    });
  }

  if (elements.btnViewModeJadual) {
    elements.btnViewModeJadual.addEventListener("click", () => {
      state.monitoringViewMode = "jadual";
      renderMonitoringColumns();
    });
  }

  if (elements.btnViewModeKolum) {
    elements.btnViewModeKolum.addEventListener("click", () => {
      state.monitoringViewMode = "kolum";
      renderMonitoringColumns();
    });
  }

  if (elements.monitoringSearchInput) {
    elements.monitoringSearchInput.addEventListener("input", (e) => {
      state.monitoringSearch = e.target.value;
      renderMonitoringColumns();
    });
  }

  if (elements.btnClearMonitoringSearch) {
    elements.btnClearMonitoringSearch.addEventListener("click", () => {
      if (elements.monitoringSearchInput) elements.monitoringSearchInput.value = "";
      state.monitoringSearch = "";
      renderMonitoringColumns();
    });
  }

  document.querySelectorAll(".btn-filter-pentadbir").forEach(btn => {
    btn.addEventListener("click", () => {
      state.monitoringPentadbirFilter = btn.dataset.pentadbirFilter;
      renderMonitoringColumns();
    });
  });

  document.querySelectorAll(".btn-filter-status").forEach(btn => {
    btn.addEventListener("click", () => {
      state.monitoringStatusFilter = btn.dataset.statusFilter;
      renderMonitoringColumns();
    });
  });

  // ==============================================================
  // BOOTSTRAP: JALANKAN ENJIN REAL-TIME & SEMAK SESI LOG MASUK
  // ==============================================================
  startRealTimeClockEngine();
  checkExistingSession();
});
