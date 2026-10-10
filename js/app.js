/**
 * SISTEM PEMANTAUAN e-RPH SEKOLAH KEBANGSAAN RANGGU, TAWAU (XBA3037)
 * Enjin Logik SPA & Pengurusan Status Penghantaran Jumaat
 * 
 * Kod Akses Super Admin: TS.FIKREY37
 * Kata Laluan Sementara: P3nd1d1kan
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Inisialisasi Pangkalan Data
  let db = getErphDatabase();

  // 2. State Aplikasi
  const state = {
    activeTab: "pemantauan",
    activeWeek: db.config.school.currentWeek || 7,
    currentUser: {
      id: 1,
      name: "YUNUS BIN PATARAI",
      role: "Guru Besar (Peneraju Sekolah)",
      ic: "721005-12-5911",
      isSupervisor: true,
      supervisorId: null,
      isSuperAdmin: false
    },
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

  // Normalisasi format IC untuk perbandingan (tanpa sengkang)
  function cleanIc(icStr) {
    if (!icStr) return "";
    return String(icStr).replace(/[^0-9]/g, "").trim();
  }

  // 3. Elemen DOM
  const elements = {
    pageTitle: document.getElementById("page-title"),
    pageSubtitle: document.getElementById("page-subtitle"),
    headerWeekSelect: document.getElementById("header-week-select"),
    headerFridayDate: document.getElementById("header-friday-date"),
    authDisplayName: document.getElementById("auth-display-name"),
    authDisplayRole: document.getElementById("auth-display-role"),
    userBadgeIcon: document.getElementById("user-badge-icon"),
    btnOpenLoginModal: document.getElementById("btn-open-login-modal"),
    btnQuickAdminAuth: document.getElementById("btn-quick-admin-auth"),
    navBtnAdminConsole: document.getElementById("nav-btn-admin-console"),
    btnRefreshApp: document.getElementById("btn-refresh-app"),
    btnPrintScreen: document.getElementById("btn-print-screen"),
    sidebar: document.getElementById("sidebar"),
    mobileMenuToggle: document.getElementById("mobile-menu-toggle"),
    mobileMenuClose: document.getElementById("mobile-menu-close"),
    navLinks: document.querySelectorAll(".nav-link"),
    tabContents: document.querySelectorAll(".tab-content"),

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

    // Tab 4 Calendar Elements
    calendarFridaysGrid: document.getElementById("calendar-fridays-grid"),
    calCurrentDateDisplay: document.getElementById("cal-current-date-display"),

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
    modalLogin: document.getElementById("modal-login"),
    btnCloseLoginModal: document.getElementById("btn-close-login-modal"),
    formLoginGuru: document.getElementById("form-login-guru"),
    loginGuruIc: document.getElementById("login-guru-ic"),
    loginGuruPwd: document.getElementById("login-guru-pwd"),
    formLoginPentadbir: document.getElementById("form-login-pentadbir"),
    formLoginSuperadmin: document.getElementById("form-login-superadmin"),
    loginAdminCode: document.getElementById("login-admin-code"),

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

  // 4. Inisialisasi Pilihan Minggu Header
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

  // 5. Penukaran Tab Navigasi
  function switchTab(tabId) {
    state.activeTab = tabId;

    // Jika tab adalah Konsol Admin dan belum disahkan, minta kod akses
    if (tabId === "konsol-admin" && !state.isSuperAdminAuthenticated) {
      promptSuperAdminAuth();
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

    // Kemaskini Tajuk Header
    const titles = {
      "pemantauan": { title: "Pemantauan Lajur Pentadbir e-RPH", sub: "Penghantaran Mingguan Setiap Jumaat • SK Ranggu Sesi 2026" },
      "portal-guru": { title: "Portal Peribadi Guru e-RPH", sub: "Pengisian & Semakan Penghantaran e-RPH Nama Sendiri" },
      "carta-organisasi": { title: "Carta Organisasi Jawatankuasa e-RPH", sub: "Struktur Hierarki Penyeliaan Bertingkat SK Ranggu 2026" },
      "kalendar": { title: "Kalendar Penghantaran Jumaat 2026", sub: "Jadual Penuh 43 Hari Jumaat Tarikh Akhir Muat Naik" },
      "jadual-rujukan": { title: "Jadual Waktu Persekolahan Rujukan", sub: "Rujukan Waktu Kelas & Guru (Penghantaran e-RPH Tetap Setiap Jumaat)" },
      "konsol-admin": { title: "Konsol Pentadbir Sistem (Ts. Mohammad Fikrey)", sub: "Akses Super Admin • Kod: TS.FIKREY37" },
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

  // 6. Kemaskini Paparan Pengguna Aktif di Header & Sidebar
  function updateAuthDisplay() {
    elements.authDisplayName.textContent = state.currentUser.name;
    elements.authDisplayRole.textContent = state.currentUser.role;

    // Badge Icon
    if (state.isSuperAdminAuthenticated) {
      elements.userBadgeIcon.textContent = "TS";
      elements.userBadgeIcon.className = "w-7 h-7 rounded-lg bg-amber-500 text-white font-black flex items-center justify-center text-xs flex-shrink-0 shadow-xs";
    } else if (state.currentUser.id === 1) {
      elements.userBadgeIcon.textContent = "GB";
      elements.userBadgeIcon.className = "w-7 h-7 rounded-lg bg-amber-500 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-xs";
    } else if (state.currentUser.isSupervisor) {
      elements.userBadgeIcon.textContent = "PK";
      elements.userBadgeIcon.className = "w-7 h-7 rounded-lg bg-sky-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-xs";
    } else {
      elements.userBadgeIcon.textContent = "G";
      elements.userBadgeIcon.className = "w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-xs";
    }

    // Jika pengguna adalah guru biasa, default tab ke portal-guru
    if (!state.currentUser.isSupervisor && !state.isSuperAdminAuthenticated) {
      if (state.activeTab === "pemantauan") {
        switchTab("portal-guru");
      }
    }
  }

  // ==============================================================
  // TAB 1: RENDER PEMANTAUAN 5 LAJUR PENTADBIR
  // ==============================================================
  function renderMonitoringColumns() {
    const container = elements.pentadbirColumnsWrapper;
    container.innerHTML = "";

    const weekNum = state.activeWeek;

    // Ambil semua guru aktif
    const activeTeachers = db.staffList.filter(s => s.status === "Aktif");

    // Ambil senarai upload bagi minggu ini
    const weekUploads = db.uploads.filter(u => u.minggu === weekNum);

    // Kira statistik keseluruhan
    let totalHijau = 0;
    let totalMerah = 0;

    activeTeachers.forEach(t => {
      const up = weekUploads.find(u => u.guruId === t.id);
      if (up && up.status === "HIJAU") {
        totalHijau++;
      } else {
        totalMerah++;
      }
    });

    const totalActive = activeTeachers.length || 1;
    const overallPct = Math.round((totalHijau / totalActive) * 100);

    elements.statTotalHijau.textContent = `${totalHijau} Guru Hijau`;
    elements.statTotalMerah.textContent = `${totalMerah} Guru Merah`;
    elements.statTotalPct.textContent = `${overallPct}%`;

    // Render setiap satu daripada 5 lajur pentadbir
    db.pentadbir.forEach(col => {
      // Periksa kawalan privasi pentadbir:
      // "untuk pentadbir sistem dan pentadbir sekolah mereka boleh lihat senarai guru di bawah mereka sahaja..masing2 kecuali guru besar sebab hanya guru besar boleh lihat ke semua guru"
      const isGb = (state.currentUser.id === 1);
      const isSuper = state.isSuperAdminAuthenticated;
      const isColOwner = (state.currentUser.id === col.id);
      const canViewThisColumn = (isGb || isSuper || isColOwner);

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

      // Jika pengguna tidak mempunyai kebenaran melihat lajur ini
      if (!canViewThisColumn) {
        colBody.innerHTML = `
          <div class="p-6 text-center space-y-2 text-slate-400">
            <i data-lucide="lock" class="w-8 h-8 mx-auto text-slate-300"></i>
            <p class="font-bold text-xs text-slate-600">Akses Terhad</p>
            <p class="text-[10px] leading-relaxed">
              Anda hanya dibenarkan melihat senarai guru di bawah seliaan anda sahaja.
            </p>
          </div>
        `;
        return;
      }

      // Render kad setiap guru di bawah pentadbir ini
      columnStaff.forEach(teacher => {
        // PERATURAN PRIVASI KHAS GURU BESAR:
        // "tiada siapa boleh lihat folder penghantaran rph guru besar kecuali guru besar dan pentadbir sistem"
        const isTeacherGb = (teacher.id === 1);
        const canViewGbFolder = (state.currentUser.id === 1 || isSuper);

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

            <!-- Kuasa Khas Pentadbir Sistem (Ts. Fikrey - TS.FIKREY37) -->
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
  // TAB 4: RENDER KALENDAR PENGHANTARAN JUMAAT
  // ==============================================================
  function renderCalendarFridays() {
    const grid = elements.calendarFridaysGrid;
    grid.innerHTML = "";

    const now = new Date();
    const dayStr = `${now.getDate()} ${db.config.fridays2026[0] ? 'Okt' : ''} ${now.getFullYear()}`;
    elements.calCurrentDateDisplay.textContent = `11 Okt 2026`;

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
  // TAB 6: KONSOL PENTADBIR SISTEM (TS.FIKREY37)
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
  // FUNGSI KUASA SUPER ADMIN (TS.FIKREY37)
  // ==============================================================
  function promptSuperAdminAuth(callback) {
    Swal.fire({
      title: "Pengesahan Pentadbir Sistem",
      html: `
        <div class="text-left text-xs space-y-2">
          <p class="text-slate-600">Sila masukkan kod akses rahsia untuk membuka konsol pentadbir sistem:</p>
          <input type="password" id="swal-admin-code-input" class="w-full border p-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider" placeholder="Kod Akses: TS.FIKREY37">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Sahkan Kod",
      cancelButtonText: "Batal",
      confirmButtonColor: "#d97706",
      preConfirm: () => {
        const val = document.getElementById("swal-admin-code-input").value.trim();
        if (val.toUpperCase() === "TS.FIKREY37") {
          return true;
        } else {
          Swal.showValidationMessage("Kod akses tidak sah! Sila masukkan TS.FIKREY37");
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
      up.verifiedBy = state.currentUser.name;
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

  // ==============================================================
  // SISTEM LOG MASUK & AUTH
  // ==============================================================
  // Tab pertukaran jenis login
  document.querySelectorAll(".login-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".login-tab-btn").forEach(b => {
        b.className = "login-tab-btn flex-1 py-2 font-bold text-slate-500 border-b-2 border-transparent hover:text-slate-800 text-center";
      });
      btn.className = "login-tab-btn flex-1 py-2 font-bold border-b-2 border-sky-600 text-sky-700 text-center";

      const mode = btn.dataset.loginMode;
      document.querySelectorAll(".login-subform").forEach(f => f.classList.add("hidden"));

      if (mode === "guru") elements.formLoginGuru.classList.remove("hidden");
      if (mode === "pentadbir") elements.formLoginPentadbir.classList.remove("hidden");
      if (mode === "admin") elements.formLoginSuperadmin.classList.remove("hidden");
    });
  });

  // 1. Log Masuk Guru
  elements.formLoginGuru.addEventListener("submit", (e) => {
    e.preventDefault();

    const inputIc = cleanIc(elements.loginGuruIc.value);
    const inputPwd = elements.loginGuruPwd.value.trim();

    // Cari guru mengikut No. KP
    const matched = db.staffList.find(s => cleanIc(s.ic) === inputIc);

    if (!matched) {
      Swal.fire("Ralat Log Masuk", "Nombor Kad Pengenalan tidak dijumpai dalam senarai staf SK Ranggu.", "error");
      return;
    }

    // Semak kata laluan (custom atau default P3nd1d1kan)
    const validPwd = matched.customPassword || db.config.security.defaultTeacherPassword;

    if (inputPwd !== validPwd && inputPwd !== "P3nd1d1kan") {
      Swal.fire("Kata Laluan Salah", "Sila gunakan kata laluan sementara P3nd1d1kan jika belum menjana kata laluan baru.", "error");
      return;
    }

    state.currentUser = {
      id: matched.id,
      name: matched.name,
      role: matched.role,
      ic: matched.ic,
      isSupervisor: [1, 2, 3, 4, 5].includes(matched.id),
      supervisorId: matched.supervisorId,
      isSuperAdmin: false
    };
    state.isSuperAdminAuthenticated = false;

    updateAuthDisplay();
    elements.modalLogin.classList.add("hidden");

    Swal.fire({
      icon: "success",
      title: `Selamat Datang, Cikgu ${matched.name}`,
      text: "Anda kini berada di Portal Peribadi e-RPH.",
      timer: 2000,
      showConfirmButton: false
    });

    switchTab("portal-guru");
  });

  // 2. Log Masuk Pentadbir Cepat
  document.querySelectorAll(".btn-select-admin-role").forEach(btn => {
    btn.addEventListener("click", () => {
      const adminId = parseInt(btn.dataset.adminId);
      const matched = db.staffList.find(s => s.id === adminId);

      if (matched) {
        state.currentUser = {
          id: matched.id,
          name: matched.name,
          role: matched.role,
          ic: matched.ic,
          isSupervisor: true,
          supervisorId: matched.supervisorId,
          isSuperAdmin: false
        };
        state.isSuperAdminAuthenticated = false;

        updateAuthDisplay();
        elements.modalLogin.classList.add("hidden");

        Swal.fire({
          icon: "success",
          title: `Log Masuk Sebagai ${matched.name}`,
          timer: 1500,
          showConfirmButton: false
        });

        switchTab("pemantauan");
      }
    });
  });

  // 3. Log Masuk Super Admin
  elements.formLoginSuperadmin.addEventListener("submit", (e) => {
    e.preventDefault();
    const code = elements.loginAdminCode.value.trim().toUpperCase();

    if (code === "TS.FIKREY37") {
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
      updateAuthDisplay();
      elements.modalLogin.classList.add("hidden");

      Swal.fire({
        icon: "success",
        title: "Akses Super Admin Disahkan",
        text: "Semua kuasa pengurusan sistem diaktifkan.",
        timer: 1500,
        showConfirmButton: false
      });

      switchTab("pemantauan");
    } else {
      Swal.fire("Kod Salah", "Kod akses TS.FIKREY37 tidak tepat.", "error");
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
        db = getErphDatabase();
        renderMonitoringColumns();
        renderAdminConsole();
        Swal.fire("Selesai", "Pangkalan data telah ditetapkan semula.", "success");
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

  elements.btnOpenLoginModal.addEventListener("click", () => {
    elements.modalLogin.classList.remove("hidden");
  });

  elements.btnQuickAdminAuth.addEventListener("click", () => {
    promptSuperAdminAuth();
  });

  elements.navBtnAdminConsole.addEventListener("click", (e) => {
    e.preventDefault();
    if (!state.isSuperAdminAuthenticated) {
      promptSuperAdminAuth();
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
  elements.btnCloseLoginModal.addEventListener("click", () => elements.modalLogin.classList.add("hidden"));
  elements.btnClosePwdModal.addEventListener("click", () => elements.modalChangePassword.classList.add("hidden"));
  elements.btnCloseReviewModal.addEventListener("click", () => elements.modalReviewErph.classList.add("hidden"));
  elements.btnCloseManageStaff.addEventListener("click", () => elements.modalAdminManageStaff.classList.add("hidden"));

  // ==============================================================
  // BOOTSTRAP APLIKASI
  // ==============================================================
  initWeekOptions();
  updateAuthDisplay();
  renderMonitoringColumns();
  renderCalendarFridays();
  renderTimetableReference();
  lucide.createIcons();
});
