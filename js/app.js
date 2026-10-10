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
    filterSearch: ""
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

  // Dapatkan maklumat hari Jumaat bagi minggu tertentu
  function getFridayInfo(weekNum) {
    const f = db.config.fridays2026.find(item => item.minggu === parseInt(weekNum));
    return f || { minggu: weekNum, tarikh: "2026-02-20", label: "Jumaat" };
  }

  // Normalisasi format IC untuk perbandingan (buang sengkang & ruang)
  function cleanIc(icStr) {
    if (!icStr) return "";
    return String(icStr).replace(/[^0-9]/g, "").trim();
  }

  // 3. Elemen DOM
  const elements = {
    loginGateway: document.getElementById("login-gateway"),
    appLayout: document.getElementById("app-layout"),

    // Gateway Elements
    tabLoginBtnGuru: document.getElementById("tab-login-btn-guru"),
    tabLoginBtnAdmin: document.getElementById("tab-login-btn-admin"),
    tabLoginBtnSuper: document.getElementById("tab-login-btn-super"),
    gatewayFormGuru: document.getElementById("gateway-form-guru"),
    gatewayGuruIc: document.getElementById("gateway-guru-ic"),
    gatewayGuruPwd: document.getElementById("gateway-guru-pwd"),
    gatewayFormAdmin: document.getElementById("gateway-form-admin"),
    gatewayFormSuper: document.getElementById("gateway-form-super"),
    gatewaySuperCode: document.getElementById("gateway-super-code"),

    // App Header & Sidebar Elements
    pageTitle: document.getElementById("page-title"),
    pageSubtitle: document.getElementById("page-subtitle"),
    headerWeekSelect: document.getElementById("header-week-select"),
    headerFridayDate: document.getElementById("header-friday-date"),
    authDisplayName: document.getElementById("auth-display-name"),
    authDisplayRole: document.getElementById("auth-display-role"),
    userBadgeIcon: document.getElementById("user-badge-icon"),
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

    // Tab 2 Portal Guru Elements
    portalTeacherAvatar: document.getElementById("portal-teacher-avatar"),
    portalTeacherName: document.getElementById("portal-teacher-name"),
    portalTeacherDetails: document.getElementById("portal-teacher-details"),
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

    // Tab 6 Admin Console Elements
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
    modalReviewGuruName: document.getElementById("modal-review-guru-name"),
    modalReviewWeekLabel: document.getElementById("modal-review-week-label"),
    modalReviewStatusBox: document.getElementById("modal-review-status-box"),
    modalReviewStatusText: document.getElementById("modal-review-status-text"),
    modalReviewTimestamp: document.getElementById("modal-review-timestamp"),
    modalReviewFilename: document.getElementById("modal-review-filename"),
    modalReviewOpenLink: document.getElementById("modal-review-open-link"),
    modalReviewCatatan: document.getElementById("modal-review-catatan"),
    modalReviewUlasanInput: document.getElementById("modal-review-ulasan-input"),
    btnSaveUlasanPentadbir: document.getElementById("btn-save-ulasan-pentadbir"),

    modalAdminManageStaff: document.getElementById("modal-admin-manage-staff"),
    btnCloseManageStaff: document.getElementById("btn-close-manage-staff"),
    formManageStaff: document.getElementById("form-manage-staff"),
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
    modalStaffTitle: document.getElementById("modal-staff-title")
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
        state.currentUser = sessionData.user;
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

  function handleLogout() {
    sessionStorage.removeItem("SKR_LOGGED_USER");
    state.currentUser = null;
    state.isSuperAdminAuthenticated = false;

    // Reset borang login
    elements.gatewayGuruIc.value = "";
    elements.gatewayGuruPwd.value = "";
    elements.gatewaySuperCode.value = "";

    // Sembunyikan App, buka Login Gateway
    elements.appLayout.classList.add("hidden");
    elements.loginGateway.classList.remove("hidden");

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "info",
      title: "Anda telah log keluar daripada sistem.",
      timer: 1800,
      showConfirmButton: false
    });

    lucide.createIcons();
  }

  // Gateway Tab Switching (Guru / Pentadbir / Super Admin)
  elements.tabLoginBtnGuru.addEventListener("click", () => {
    elements.tabLoginBtnGuru.className = "flex-1 py-2 rounded-lg transition bg-white text-sky-700 shadow-xs";
    elements.tabLoginBtnAdmin.className = "flex-1 py-2 rounded-lg transition text-slate-600 hover:text-slate-900";
    elements.tabLoginBtnSuper.className = "flex-1 py-2 rounded-lg transition text-slate-600 hover:text-slate-900";

    elements.gatewayFormGuru.classList.remove("hidden");
    elements.gatewayFormAdmin.classList.add("hidden");
    elements.gatewayFormSuper.classList.add("hidden");
  });

  elements.tabLoginBtnAdmin.addEventListener("click", () => {
    elements.tabLoginBtnAdmin.className = "flex-1 py-2 rounded-lg transition bg-white text-sky-700 shadow-xs";
    elements.tabLoginBtnGuru.className = "flex-1 py-2 rounded-lg transition text-slate-600 hover:text-slate-900";
    elements.tabLoginBtnSuper.className = "flex-1 py-2 rounded-lg transition text-slate-600 hover:text-slate-900";

    elements.gatewayFormAdmin.classList.remove("hidden");
    elements.gatewayFormGuru.classList.add("hidden");
    elements.gatewayFormSuper.classList.add("hidden");
  });

  elements.tabLoginBtnSuper.addEventListener("click", () => {
    elements.tabLoginBtnSuper.className = "flex-1 py-2 rounded-lg transition bg-white text-sky-700 shadow-xs";
    elements.tabLoginBtnGuru.className = "flex-1 py-2 rounded-lg transition text-slate-600 hover:text-slate-900";
    elements.tabLoginBtnAdmin.className = "flex-1 py-2 rounded-lg transition text-slate-600 hover:text-slate-900";

    elements.gatewayFormSuper.classList.remove("hidden");
    elements.gatewayFormGuru.classList.add("hidden");
    elements.gatewayFormAdmin.classList.add("hidden");
  });

  // 1. Submit Log Masuk Guru
  elements.gatewayFormGuru.addEventListener("submit", (e) => {
    e.preventDefault();

    const inputIc = cleanIc(elements.gatewayGuruIc.value);
    const inputPwd = elements.gatewayGuruPwd.value.trim();

    // Cari guru dalam database staf
    const matched = db.staffList.find(s => cleanIc(s.ic) === inputIc);

    if (!matched) {
      Swal.fire({
        icon: "error",
        title: "No. Kad Pengenalan Tidak Sah",
        text: "Nombor K/P yang dimasukkan tidak ditemui dalam senarai rasmi guru SK Ranggu. Sila semak semula.",
        confirmButtonColor: "#0284c7"
      });
      return;
    }

    // Sahkan kata laluan (custom atau default P3nd1d1kan)
    const validPwd = matched.customPassword || db.config.security.defaultTeacherPassword;

    if (inputPwd !== validPwd && inputPwd !== "P3nd1d1kan") {
      Swal.fire({
        icon: "error",
        title: "Kata Laluan Tidak Tepat",
        text: "Sila gunakan kata laluan sementara rasmi: P3nd1d1kan",
        confirmButtonColor: "#0284c7"
      });
      return;
    }

    const userObj = {
      id: matched.id,
      name: matched.name,
      role: matched.role,
      ic: matched.ic,
      isSupervisor: [1, 2, 3, 4, 5].includes(matched.id),
      supervisorId: matched.supervisorId,
      isSuperAdmin: false
    };

    Swal.fire({
      icon: "success",
      title: `Selamat Datang, Cikgu ${matched.name}`,
      text: "Log masuk berjaya. Membuka Portal Peribadi e-RPH...",
      timer: 1800,
      showConfirmButton: false
    });

    handleSuccessfulLogin(userObj, false);
  });

  // 2. Select Pentadbir Sekolah (Quick Leadership Log In)
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

        Swal.fire({
          icon: "success",
          title: `Log Masuk Pentadbir`,
          text: `Selamat bertugas, ${matched.name} (${matched.role}).`,
          timer: 1800,
          showConfirmButton: false
        });

        handleSuccessfulLogin(userObj, false);
      }
    });
  });

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

  // 3. Submit Super Admin Code (Kawalan Keselamatan Pembangun Sistem)
  elements.gatewayFormSuper.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = elements.gatewaySuperCode.value.trim().toUpperCase();
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

      Swal.fire({
        icon: "success",
        title: "Akses Super Admin Diberikan",
        text: "Selamat bertugas Ts. Mohammad Fikrey. Semua kuasa pengurusan sistem diaktifkan.",
        timer: 1800,
        showConfirmButton: false
      });

      handleSuccessfulLogin(superAdminUser, true);
    } else {
      Swal.fire({
        icon: "error",
        title: "Akses Ditolak",
        text: "Kod akses keselamatan tidak sah. Sila pastikan anda mempunyai kebenaran rasmi sebagai pentadbir sistem.",
        confirmButtonColor: "#d97706"
      });
    }
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

    for (let w = 1; w <= db.config.school.totalWeeks; w++) {
      const opt = document.createElement("option");
      opt.value = w;
      opt.textContent = `Minggu ${w}`;
      if (w === state.activeWeek) opt.selected = true;
      elements.headerWeekSelect.appendChild(opt);

      const optPortal = document.createElement("option");
      optPortal.value = w;
      optPortal.textContent = `Minggu ${w}`;
      if (w === state.activeWeek) optPortal.selected = true;
      elements.teacherUploadWeek.appendChild(optPortal);
    }

    updateFridayDisplay();
  }

  function updateFridayDisplay() {
    const f = getFridayInfo(state.activeWeek);
    elements.headerFridayDate.textContent = f.label;
    elements.teacherUploadDate.value = f.label;
    elements.portalUploadWeekTitle.textContent = `Penghantaran e-RPH Minggu ${state.activeWeek} (${f.label})`;
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

    // Badge Icon
    if (isSuper) {
      elements.userBadgeIcon.textContent = "TS";
      elements.userBadgeIcon.className = "w-7 h-7 rounded-lg bg-amber-500 text-white font-black flex items-center justify-center text-xs flex-shrink-0 shadow-xs";
    } else if (isGb) {
      elements.userBadgeIcon.textContent = "GB";
      elements.userBadgeIcon.className = "w-7 h-7 rounded-lg bg-amber-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-xs";
    } else if (isGpk) {
      elements.userBadgeIcon.textContent = "PK";
      elements.userBadgeIcon.className = "w-7 h-7 rounded-lg bg-sky-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-xs";
    } else {
      elements.userBadgeIcon.textContent = "G";
      elements.userBadgeIcon.className = "w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-xs";
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
    container.innerHTML = "";

    const weekNum = state.activeWeek;

    // Ambil semua guru aktif
    const activeTeachers = db.staffList.filter(s => s.status === "Aktif");
    const weekUploads = db.uploads.filter(u => u.minggu === weekNum);

    // Tentukan lajur yang dipaparkan mengikut peranan
    let columnsToRender = db.pentadbir;
    if (isGpk) {
      // GPK HANYA DAPAT MELIHAT LAJUR SELIAAN BELIAU SENDIRI SAHAJA!
      columnsToRender = db.pentadbir.filter(col => col.id === state.currentUser.id);
      elements.pentadbirColumnsWrapper.className = "max-w-2xl mx-auto w-full space-y-4";
    } else {
      // Guru Besar & Super Admin melihat kesemua 5 lajur
      elements.pentadbirColumnsWrapper.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-start";
    }

    // Kira statistik paparan
    let targetStaffForStats = [];
    if (isGpk) {
      targetStaffForStats = db.staffList.filter(s => s.supervisorId === state.currentUser.id && s.status === "Aktif");
    } else {
      targetStaffForStats = activeTeachers;
    }

    let totalHijau = 0;
    let totalMerah = 0;
    targetStaffForStats.forEach(t => {
      const up = weekUploads.find(u => u.guruId === t.id);
      if (up && up.status === "HIJAU") totalHijau++;
      else totalMerah++;
    });

    const totalActive = targetStaffForStats.length || 1;
    const overallPct = Math.round((totalHijau / totalActive) * 100);

    if (isGpk) {
      elements.statTotalHijau.textContent = `${totalHijau} Guru Seliaan Hijau`;
      elements.statTotalMerah.textContent = `${totalMerah} Guru Seliaan Merah`;
      elements.statTotalPct.textContent = `${overallPct}% Selesai`;
    } else {
      elements.statTotalHijau.textContent = `${totalHijau} Guru Hijau (Sekolah)`;
      elements.statTotalMerah.textContent = `${totalMerah} Guru Merah (Sekolah)`;
      elements.statTotalPct.textContent = `${overallPct}% Keseluruhan`;
    }

    // Render setiap lajur yang dibenarkan
    columnsToRender.forEach(col => {
      // Cari guru-guru seliaan di bawah pentadbir ini
      let columnStaff = [];
      if (col.id === 1) {
        // Guru Besar menyelia 4 Penolong Kanan + rekod Guru Besar sendiri
        const gpkStaff = db.staffList.filter(s => [2, 3, 4, 5].includes(s.id));
        const gbRecord = db.staffList.filter(s => s.id === 1);
        columnStaff = [...gbRecord, ...gpkStaff];
      } else {
        columnStaff = db.staffList.filter(s => s.supervisorId === col.id && s.status === "Aktif");
      }

      // Kira bilangan hijau & merah dalam lajur ini
      let colHijau = 0;
      let colMerah = 0;
      columnStaff.forEach(s => {
        const up = weekUploads.find(u => u.guruId === s.id);
        if (up && up.status === "HIJAU") colHijau++;
        else colMerah++;
      });
      const colTotal = columnStaff.length || 1;
      const colPct = Math.round((colHijau / colTotal) * 100);

      // Cipta Elemen Lajur
      const colCard = document.createElement("div");
      colCard.className = "bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col";

      // Header Lajur
      colCard.innerHTML = `
        <div class="${col.headerBg} text-white p-3.5 space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-[9px] font-black uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-full">${col.shortTitle}</span>
            <span class="text-[11px] font-black">${colHijau}/${columnStaff.length} Hantar (${colPct}%)</span>
          </div>
          <h3 class="font-black text-xs sm:text-sm tracking-wide leading-tight truncate" title="${col.name}">${col.name}</h3>
          <p class="text-[10px] text-white/80 font-medium">${col.role}</p>
        </div>

        <div class="p-2.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-600">
          <span>Kumpulan Guru Seliaan</span>
          <span class="text-sky-700">${columnStaff.length} Guru</span>
        </div>

        <!-- Body Senarai Guru di Bawah Pentadbir Ini -->
        <div class="p-2 space-y-2 flex-1 max-h-[680px] overflow-y-auto" id="col-body-${col.id}">
        </div>
      `;

      container.appendChild(colCard);
      const colBody = colCard.querySelector(`#col-body-${col.id}`);

      // Render kad setiap guru di bawah pentadbir ini
      columnStaff.forEach(teacher => {
        // PERATURAN PRIVASI KHAS GURU BESAR:
        // "tiada siapa boleh lihat folder penghantaran rph guru besar kecuali guru besar dan pentadbir sistem"
        const isTeacherGb = (teacher.id === 1);
        const canViewGbFolder = ((state.currentUser && state.currentUser.id === 1) || isSuper);

        const up = weekUploads.find(u => u.guruId === teacher.id);
        const isUploaded = (up && up.status === "HIJAU");

        const teacherCard = document.createElement("div");
        teacherCard.className = `teacher-monitor-card p-3 rounded-xl border ${isUploaded ? 'bg-emerald-50/40 border-emerald-300' : 'bg-rose-50/40 border-rose-200'} space-y-2 text-xs relative`;

        // Maklumat Masa Kemaskini
        let timestampDisplay = "Belum memuat naik e-RPH";
        if (isUploaded && up.uploadedAt) {
          timestampDisplay = `Dikemaskini: ${up.uploadedAt}`;
        }

        teacherCard.innerHTML = `
          <div class="flex items-start justify-between gap-1">
            <div class="min-w-0 flex-1">
              <span class="text-[9px] font-mono font-bold text-slate-400 block">${teacher.code} • ${teacher.session || 'Pagi'}</span>
              <h4 class="font-extrabold text-xs text-slate-900 leading-snug truncate" title="${teacher.name}">
                ${teacher.name}
              </h4>
              <p class="text-[10px] text-slate-500 truncate" title="${teacher.role}">
                ${teacher.role}
              </p>
            </div>
          </div>

          <!-- Status Button (Merah / Hijau) -->
          <div class="pt-1">
            ${isUploaded ? `
              <div class="w-full py-1.5 px-2.5 rounded-lg bg-emerald-600 text-white font-black text-center text-xs shadow-xs flex items-center justify-center gap-1.5">
                <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
                <span>HIJAU - BERJAYA UPLOAD</span>
              </div>
            ` : `
              <div class="w-full py-1.5 px-2.5 rounded-lg bg-rose-600 text-white font-black text-center text-xs shadow-xs flex items-center justify-center gap-1.5">
                <i data-lucide="x-circle" class="w-3.5 h-3.5"></i>
                <span>MERAH - BELUM UPLOAD</span>
              </div>
            `}
          </div>

          <!-- Timestamp Text Dinyatakan Dengan Jelas -->
          <div class="text-[10px] text-slate-600 font-semibold flex items-center justify-between pt-0.5">
            <span class="truncate ${isUploaded ? 'text-emerald-800 font-bold' : 'text-rose-700 font-medium'}">
              <i data-lucide="clock" class="w-3 h-3 inline mr-0.5"></i>
              ${timestampDisplay}
            </span>
          </div>

          <!-- Tindakan Butang -->
          <div class="pt-1 flex items-center justify-between gap-1 border-t border-slate-200/60">
            ${(isTeacherGb && !canViewGbFolder) ? `
              <span class="text-[9px] text-slate-400 italic">Folder Sulit Guru Besar</span>
            ` : `
              <button data-teacher-id="${teacher.id}" class="btn-open-review text-[10px] font-bold text-sky-700 hover:text-sky-950 flex items-center gap-1">
                <i data-lucide="folder" class="w-3 h-3"></i>
                <span>${isUploaded ? 'Buka e-RPH' : 'Perincian'}</span>
              </button>
            `}

            <!-- Kuasa Khas Pentadbir Sistem (Super Admin) -->
            ${isSuper ? `
              <div class="flex items-center space-x-1">
                <button data-teacher-id="${teacher.id}" title="Tukar Status (Hijau <-> Merah)" class="btn-toggle-status-super p-1 rounded hover:bg-slate-200 text-slate-700 transition">
                  <i data-lucide="refresh-cw" class="w-3 h-3 text-amber-600"></i>
                </button>
                ${isUploaded ? `
                  <button data-teacher-id="${teacher.id}" title="Padam e-RPH Senyap" class="btn-silent-delete-super p-1 rounded hover:bg-rose-100 text-rose-700 transition">
                    <i data-lucide="trash-2" class="w-3 h-3"></i>
                  </button>
                ` : ''}
              </div>
            ` : ''}
          </div>
        `;

        // Event Listener: Buka Modal Semakan
        const btnOpenReview = teacherCard.querySelector(".btn-open-review");
        if (btnOpenReview) {
          btnOpenReview.addEventListener("click", () => {
            openReviewErphModal(teacher, up);
          });
        }

        // Event Listener: Super Admin Toggle Status
        const btnToggleSuper = teacherCard.querySelector(".btn-toggle-status-super");
        if (btnToggleSuper) {
          btnToggleSuper.addEventListener("click", () => {
            toggleTeacherStatusSuperAdmin(teacher.id);
          });
        }

        // Event Listener: Super Admin Silent Delete
        const btnDeleteSuper = teacherCard.querySelector(".btn-silent-delete-super");
        if (btnDeleteSuper) {
          btnDeleteSuper.addEventListener("click", () => {
            silentDeleteErphSuperAdmin(teacher.id);
          });
        }

        colBody.appendChild(teacherCard);
      });
    });

    lucide.createIcons();
  }

  // ==============================================================
  // TAB 2: PORTAL PERIBADI GURU
  // ==============================================================
  function renderTeacherPortal() {
    if (!state.currentUser) return;
    const teacher = state.currentUser;

    elements.portalTeacherAvatar.textContent = teacher.name.charAt(0);
    elements.portalTeacherName.textContent = teacher.name;
    elements.portalTeacherDetails.textContent = `No. K/P: ${teacher.ic || '-'} • ${teacher.role}`;

    // Semak status minggu aktif
    const weekNum = state.activeWeek;
    const up = db.uploads.find(u => u.guruId === teacher.id && u.minggu === weekNum);

    if (up && up.status === "HIJAU") {
      elements.portalCurrentStatusBadge.textContent = "HIJAU (Berjaya Upload)";
      elements.portalCurrentStatusBadge.className = "px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300";
      elements.teacherUploadLink.value = up.fileUrl || "";
      elements.teacherUploadFilename.value = up.fileName || "";
      elements.teacherUploadCatatan.value = up.catatan || "";
    } else {
      elements.portalCurrentStatusBadge.textContent = "MERAH (Belum Upload)";
      elements.portalCurrentStatusBadge.className = "px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300";
      elements.teacherUploadLink.value = "";
      elements.teacherUploadFilename.value = "";
      elements.teacherUploadCatatan.value = "";
    }

    elements.teacherUploadWeek.value = state.activeWeek;
    updateFridayDisplay();

    // Render Jadual Sejarah 43 Minggu
    const tbody = elements.portalHistoryTbody;
    tbody.innerHTML = "";

    db.config.fridays2026.forEach(f => {
      const historyUp = db.uploads.find(u => u.guruId === teacher.id && u.minggu === f.minggu);
      const isSah = (historyUp && historyUp.status === "HIJAU");

      const tr = document.createElement("tr");
      tr.className = f.minggu === state.activeWeek ? "bg-sky-50/70 font-bold" : "hover:bg-slate-50";

      tr.innerHTML = `
        <td class="py-2.5 px-3 font-mono font-bold">M${f.minggu}</td>
        <td class="py-2.5 px-3 text-slate-600">${f.label}</td>
        <td class="py-2.5 px-3">
          ${isSah ? `
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">HIJAU</span>
          ` : `
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">MERAH</span>
          `}
        </td>
        <td class="py-2.5 px-3 text-slate-500 font-mono text-[10px]">
          ${isSah ? historyUp.uploadedAt : '—'}
        </td>
        <td class="py-2.5 px-3">
          ${isSah && historyUp.fileUrl ? `
            <a href="${historyUp.fileUrl}" target="_blank" class="text-sky-600 hover:underline flex items-center gap-1 font-bold">
              <i data-lucide="external-link" class="w-3 h-3"></i>
              <span class="truncate max-w-[120px]">${historyUp.fileName || 'Pautan e-RPH'}</span>
            </a>
          ` : '<span class="text-slate-400">—</span>'}
        </td>
        <td class="py-2.5 px-3 text-slate-600 text-[11px]">
          ${isSah && historyUp.ulasan ? historyUp.ulasan : '<span class="text-slate-400 italic">Menunggu semakan</span>'}
        </td>
      `;

      tbody.appendChild(tr);
    });

    lucide.createIcons();
  }

  // Pengisian Borang Hantar e-RPH Guru
  elements.formTeacherUpload.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!state.currentUser) return;
    const teacher = state.currentUser;
    const weekNum = parseInt(elements.teacherUploadWeek.value);
    const fInfo = getFridayInfo(weekNum);
    const link = elements.teacherUploadLink.value.trim() || "https://drive.google.com/sample/erph-portal";
    const filename = elements.teacherUploadFilename.value.trim() || `eRPH_M${weekNum}_${teacher.name.replace(/\s+/g, '_')}.pdf`;
    const catatan = elements.teacherUploadCatatan.value.trim();

    // Buat rekod upload baru atau kemaskini rekod sedia ada
    const existingIndex = db.uploads.findIndex(u => u.guruId === teacher.id && u.minggu === weekNum);

    const uploadRecord = {
      id: `UPL-M${weekNum}-${teacher.id}`,
      guruId: teacher.id,
      guruName: teacher.name,
      minggu: weekNum,
      tarikhJumaat: fInfo.tarikh,
      status: "HIJAU",
      uploadedAt: getCurrentFormattedTimestamp(),
      fileName: filename,
      fileUrl: link,
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

    Swal.fire({
      icon: "success",
      title: "e-RPH Berjaya Dimuat Naik!",
      text: `Status anda untuk Minggu ${weekNum} bertukar kepada HIJAU. Dinyatakan dikemaskini pada ${uploadRecord.uploadedAt}.`,
      timer: 2500,
      showConfirmButton: false
    });

    renderTeacherPortal();
    renderMonitoringColumns();
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

    const activeFriday = db.config.fridays2026.find(f => f.minggu === state.activeWeek);
    const fridayLabel = activeFriday ? activeFriday.label : "Jumaat Minggu Ini";
    if (elements.calHeroFridayTarget) elements.calHeroFridayTarget.textContent = `${fridayLabel} (11:59 PM)`;

    if (dayIdx === 5) {
      countdownTitle = "🚨 PERINGATAN HARI INI:";
      countdownText = "HARI INI IALAH HARI JUMAAT! Sila pastikan e-RPH telah dihantar sebelum tamat tempoh.";
      if (elements.calHeroCountdownText) {
        elements.calHeroCountdownText.className = "text-sm font-black text-emerald-400 leading-snug animate-pulse";
      }
    } else if (dayIdx === 4) {
      countdownTitle = "⚠️ PERINGATAN KEMUNCAK:";
      countdownText = `ESOK IALAH HARI JUMAAT (${fridayLabel})! Tarikh akhir muat naik e-RPH Minggu ${state.activeWeek}.`;
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

    if (elements.calHeroCountdownTitle) elements.calHeroCountdownTitle.textContent = countdownTitle;
    if (elements.calHeroCountdownText) elements.calHeroCountdownText.textContent = countdownText;
    if (elements.calHeroWeekBadge) elements.calHeroWeekBadge.textContent = `Minggu ${state.activeWeek}`;
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
        cellClasses += "bg-rose-50/80 border-rose-200 hover:bg-rose-100/70 font-semibold ";
      } else {
        cellClasses += "bg-white border-slate-200 hover:bg-slate-50 ";
      }

      let innerHtml = `
        <div class="flex items-center justify-between">
          <span class="font-extrabold ${isToday ? 'text-amber-900 text-sm' : isFriday ? 'text-rose-700 font-black' : 'text-slate-700'}">${d}</span>
          ${isToday ? '<span class="text-[9px] bg-amber-500 text-white font-black px-1.5 py-0.5 rounded shadow-xs">HARI INI</span>' : ''}
        </div>
      `;

      if (isFriday) {
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

      cell.className = cellClasses;
      cell.innerHTML = innerHtml;

      if (matchedFriday) {
        cell.classList.add("cursor-pointer");
        cell.title = `Klik untuk semak status penghantaran Minggu ${matchedFriday.minggu} (${matchedFriday.label})`;
        cell.addEventListener("click", () => {
          state.activeWeek = matchedFriday.minggu;
          elements.headerWeekSelect.value = matchedFriday.minggu;
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
      const isCurrent = (f.minggu === state.activeWeek);

      // Kira bilangan hantar pada Jumaat tersebut
      const weekUps = db.uploads.filter(u => u.minggu === f.minggu && u.status === "HIJAU");

      const card = document.createElement("div");
      card.className = `p-3 rounded-xl border text-center transition cursor-pointer ${isCurrent ? 'bg-rose-600 text-white border-rose-600 shadow-md transform scale-102' : 'bg-slate-50 hover:bg-white border-slate-200'}`;

      card.innerHTML = `
        <span class="text-[10px] font-mono font-bold block ${isCurrent ? 'text-rose-100' : 'text-slate-400'}">JUMAAT</span>
        <div class="font-black text-sm my-0.5">Minggu ${f.minggu}</div>
        <p class="text-xs font-semibold ${isCurrent ? 'text-white' : 'text-rose-600'}">${f.label}</p>
        <div class="mt-2 text-[10px] py-0.5 px-2 rounded-full font-bold ${isCurrent ? 'bg-black/20 text-white' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}">
          ${weekUps.length} Hantar
        </div>
      `;

      card.addEventListener("click", () => {
        state.activeWeek = f.minggu;
        elements.headerWeekSelect.value = f.minggu;
        updateFridayDisplay();
        switchTab("pemantauan");
      });

      grid.appendChild(card);
    });
  }

  // ==============================================================
  // TAB 5: RENDER JADUAL WAKTU RUJUKAN
  // ==============================================================
  function renderTimetableReference() {
    const container = elements.jadualRujukanContainer;
    container.innerHTML = `
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h4 class="font-extrabold text-sm text-slate-800">Struktur Waktu Harian Persekolahan SK Ranggu 2026</h4>
        <p class="text-xs text-slate-500 leading-relaxed">
          Sesi Pagi (Tahap 2): 07:20 AM - 12:30 PM • Sesi Petang (Tahap 1): 12:40 PM - 05:40 PM.<br>
          <span class="text-rose-600 font-bold">* Peringatan: Penghantaran e-RPH mingguan adalah wajib dihantar pada setiap hari Jumaat secara penuh dan berpusat kepada nama guru masing-masing.</span>
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div class="p-3 bg-slate-50 border rounded-xl text-center">
            <span class="font-bold text-xs text-slate-700 block">Isnin - Khamis</span>
            <span class="text-xs text-sky-700 font-black">07:20 AM - 12:30 PM</span>
          </div>
          <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
            <span class="font-bold text-xs text-rose-800 block">Jumaat (Hari e-RPH)</span>
            <span class="text-xs text-rose-700 font-black">07:20 AM - 11:30 AM</span>
          </div>
          <div class="p-3 bg-slate-50 border rounded-xl text-center">
            <span class="font-bold text-xs text-slate-700 block">Sesi Petang (Isnin-Khamis)</span>
            <span class="text-xs text-purple-700 font-black">12:40 PM - 05:40 PM</span>
          </div>
          <div class="p-3 bg-purple-50 border border-purple-200 rounded-xl text-center">
            <span class="font-bold text-xs text-purple-800 block">Sesi Petang (Jumaat)</span>
            <span class="text-xs text-purple-700 font-black">01:30 PM - 05:40 PM</span>
          </div>
        </div>
      </div>
    `;
  }

  // ==============================================================
  // TAB 6: KONSOL PENTADBIR SISTEM (SUPER ADMIN)
  // ==============================================================
  function renderAdminConsole() {
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
        <td class="py-2.5 px-3 font-bold text-slate-900">${staff.name}</td>
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
  function openEditStaffModal(staff = null) {
    elements.staffReasonWrapper.classList.add("hidden");

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
      elements.btnAdminRemoveStaff.classList.add("hidden");
    }

    elements.modalAdminManageStaff.classList.remove("hidden");
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

    elements.modalReviewGuruName.textContent = teacher.name;
    elements.modalReviewWeekLabel.textContent = `Minggu ${state.activeWeek} • ${getFridayInfo(state.activeWeek).label}`;

    if (uploadRecord && uploadRecord.status === "HIJAU") {
      elements.modalReviewStatusBox.className = "p-3 rounded-xl border border-emerald-300 bg-emerald-50 flex items-center justify-between";
      elements.modalReviewStatusText.className = "font-black text-xs text-emerald-800";
      elements.modalReviewStatusText.textContent = "STATUS: HIJAU (Berjaya Upload)";
      elements.modalReviewTimestamp.textContent = `Dikemaskini: ${uploadRecord.uploadedAt}`;

      elements.modalReviewFilename.textContent = uploadRecord.fileName || "Pautan e-RPH";
      elements.modalReviewOpenLink.href = uploadRecord.fileUrl || "#";
      elements.modalReviewOpenLink.classList.remove("hidden");
      elements.modalReviewCatatan.textContent = uploadRecord.catatan || "Tiada catatan tambahan.";
      elements.modalReviewUlasanInput.value = uploadRecord.ulasan || "";
    } else {
      elements.modalReviewStatusBox.className = "p-3 rounded-xl border border-rose-300 bg-rose-50 flex items-center justify-between";
      elements.modalReviewStatusText.className = "font-black text-xs text-rose-800";
      elements.modalReviewStatusText.textContent = "STATUS: MERAH (Belum Upload)";
      elements.modalReviewTimestamp.textContent = "Belum memuat naik";

      elements.modalReviewFilename.textContent = "Tiada fail dimuat naik";
      elements.modalReviewOpenLink.classList.add("hidden");
      elements.modalReviewCatatan.textContent = "Guru belum membuat penghantaran bagi minggu ini.";
      elements.modalReviewUlasanInput.value = "";
    }

    elements.modalReviewErph.classList.remove("hidden");
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
        "Minggu": `Minggu ${weekNum}`,
        "Tarikh Jumaat": fInfo.label,
        "Status e-RPH": isH ? "HIJAU (BERJAYA UPLOAD)" : "MERAH (BELUM UPLOAD)",
        "Waktu Kemaskini": isH ? up.uploadedAt : "—",
        "Nama Fail / Pautan": isH ? (up.fileUrl || up.fileName) : "—",
        "Ulasan Pentadbir": isH ? (up.ulasan || "Menunggu Semakan") : "—"
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
    state.activeWeek = parseInt(e.target.value);
    updateFridayDisplay();
    renderMonitoringColumns();
    if (state.activeTab === "portal-guru") renderTeacherPortal();
    if (state.activeTab === "konsol-admin") renderAdminConsole();
  });

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
  // BOOTSTRAP: JALANKAN ENJIN REAL-TIME & SEMAK SESI LOG MASUK
  // ==============================================================
  startRealTimeClockEngine();
  checkExistingSession();
});
