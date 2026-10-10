/**
 * SISTEM DASHBOARD & JADUAL e-RPH SK RANGGU, TAWAU (XBA3037)
 * Logik Aplikasi Utama (Core SPA Engine)
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Inisialisasi Pangkalan Data
  let db = getAppDatabase();

  // 2. State Aplikasi
  const state = {
    activeTab: "dashboard",
    userRole: "pentadbir", // 'pentadbir' atau 'guru'
    currentUserName: "Yunus bin Patarai (Guru Besar)",
    dashFilters: {
      bulan: "Feb",
      minggu: 7,
      status: "ALL"
    },
    jdlFilters: {
      status: "ALL",
      bulan: "Feb",
      minggu: 7,
      guru: "ALL",
      subjek: "ALL",
      darjah: "ALL",
      kelas: "ALL"
    },
    highlightSubject: null,
    highlightTeacher: null
  };

  // Helper untuk format tarikh ISO ke Malaysia
  function formatDisplayDate(dateStr) {
    if (!dateStr) return "-";
    const parts = dateStr.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  }

  // 3. Elemen DOM
  const elements = {
    topTitle: document.getElementById("top-title"),
    headerActiveWeek: document.getElementById("header-active-week"),
    userAvatar: document.getElementById("user-avatar"),
    currentUserName: document.getElementById("current-user-name"),
    currentUserRole: document.getElementById("current-user-role"),
    toggleUserRole: document.getElementById("toggle-user-role"),
    sidebar: document.getElementById("sidebar"),
    mobileMenuToggle: document.getElementById("mobile-menu-toggle"),
    mobileMenuClose: document.getElementById("mobile-menu-close"),
    navLinks: document.querySelectorAll(".nav-link"),
    tabContents: document.querySelectorAll(".tab-content"),

    // Dashboard Elements
    dashFilterBulan: document.getElementById("dash-filter-bulan"),
    dashFilterMinggu: document.getElementById("dash-filter-minggu"),
    dashStatusTabs: document.querySelectorAll(".dash-status-tab"),
    kpiRedPct: document.getElementById("kpi-red-pct"),
    kpiRedCount: document.getElementById("kpi-red-count"),
    kpiYellowPct: document.getElementById("kpi-yellow-pct"),
    kpiYellowCount: document.getElementById("kpi-yellow-count"),
    kpiBluePct: document.getElementById("kpi-blue-pct"),
    kpiBlueCount: document.getElementById("kpi-blue-count"),
    kpiGreenPct: document.getElementById("kpi-green-pct"),
    kpiGreenCount: document.getElementById("kpi-green-count"),
    darjahCardsContainer: document.getElementById("darjah-cards-container"),
    subjectCardsContainer: document.getElementById("subject-cards-container"),

    // Jadual Elements
    jdlFilterStatus: document.getElementById("jdl-filter-status"),
    jdlFilterBulan: document.getElementById("jdl-filter-bulan"),
    jdlFilterMinggu: document.getElementById("jdl-filter-minggu"),
    jdlFilterGuru: document.getElementById("jdl-filter-guru"),
    jdlFilterSubjek: document.getElementById("jdl-filter-subjek"),
    jdlFilterDarjah: document.getElementById("jdl-filter-darjah"),
    jdlFilterKelas: document.getElementById("jdl-filter-kelas"),
    btnResetFilters: document.getElementById("btn-reset-filters"),
    timetableContainer: document.getElementById("timetable-matrix-container"),

    // Guru & Jadual Waktu Elements
    guruTableBody: document.getElementById("guru-table-body"),
    searchGuruInput: document.getElementById("search-guru-input"),
    scheduleTableBody: document.getElementById("schedule-table-body"),
    btnAddScheduleSlot: document.getElementById("btn-add-schedule-slot"),

    // Export & Settings Elements
    btnQuickExport: document.getElementById("btn-quick-export"),
    btnExportFullExcel: document.getElementById("btn-export-full-excel"),
    btnTriggerImport: document.getElementById("btn-trigger-import"),
    importExcelFile: document.getElementById("import-excel-file"),
    btnResetDemo: document.getElementById("btn-reset-demo"),
    btnPrintView: document.getElementById("btn-print-view"),
    btnRefreshData: document.getElementById("btn-refresh-data"),
    btnSaveSettings: document.getElementById("btn-save-settings"),

    // Modals
    modalRphEntry: document.getElementById("modal-rph-entry"),
    formRphEntry: document.getElementById("form-rph-entry"),
    btnCloseRphModal: document.getElementById("btn-close-rph-modal"),
    btnCancelRph: document.getElementById("btn-cancel-rph"),
    entrySlotId: document.getElementById("entry-slot-id"),
    entryRphId: document.getElementById("entry-rph-id"),
    entryGuru: document.getElementById("entry-guru"),
    entryTarikh: document.getElementById("entry-tarikh"),
    entryMinggu: document.getElementById("entry-minggu"),
    entrySubjek: document.getElementById("entry-subjek"),
    entryKelas: document.getElementById("entry-kelas"),
    entryMasa: document.getElementById("entry-masa"),
    entryTajuk: document.getElementById("entry-tajuk"),
    entrySk: document.getElementById("entry-sk"),
    entrySp: document.getElementById("entry-sp"),
    entryObjektif: document.getElementById("entry-objektif"),
    entryAktiviti: document.getElementById("entry-aktiviti"),
    entryBbm: document.getElementById("entry-bbm"),
    entryPentaksiran: document.getElementById("entry-pentaksiran"),
    entryRefleksi: document.getElementById("entry-refleksi"),

    modalRphReview: document.getElementById("modal-rph-review"),
    btnCloseReviewModal: document.getElementById("btn-close-review-modal"),
    btnCloseReview: document.getElementById("btn-close-review"),
    btnSaveReview: document.getElementById("btn-save-review"),
    btnEditAsTeacher: document.getElementById("btn-edit-as-teacher"),
    reviewRphId: document.getElementById("review-rph-id"),
    reviewModalTeacherInfo: document.getElementById("review-modal-teacher-info"),
    reviewCurrentBadge: document.getElementById("review-current-badge"),
    reviewDateInfo: document.getElementById("review-date-info"),
    reviewSlotInfo: document.getElementById("review-slot-info"),
    reviewTajuk: document.getElementById("review-tajuk"),
    reviewSk: document.getElementById("review-sk"),
    reviewSp: document.getElementById("review-sp"),
    reviewObjektif: document.getElementById("review-objektif"),
    reviewAktiviti: document.getElementById("review-aktiviti"),
    reviewBbm: document.getElementById("review-bbm"),
    reviewPentaksiran: document.getElementById("review-pentaksiran"),
    reviewRefleksi: document.getElementById("review-refleksi"),
    reviewStatusSelect: document.getElementById("review-status-select"),
    reviewPentadbirSelect: document.getElementById("review-pentadbir-select"),
    reviewKomenInput: document.getElementById("review-komen-input")
  };

  // 4. Inisialisasi Opsyen Dropdown
  function initDropdownOptions() {
    // Minggu (1 hingga 43)
    const mingguOptions = ['<option value="ALL">Semua Minggu</option>'];
    for (let w = 1; w <= db.config.school.totalWeeks; w++) {
      mingguOptions.push(`<option value="${w}">Minggu ${w}</option>`);
    }
    elements.dashFilterMinggu.innerHTML = mingguOptions.join("");
    elements.jdlFilterMinggu.innerHTML = mingguOptions.join("");

    // Set minggu semasa (default Minggu 7)
    elements.dashFilterMinggu.value = db.config.school.currentWeek;
    elements.jdlFilterMinggu.value = db.config.school.currentWeek;

    // Guru Dropdown
    const guruOptions = ['<option value="ALL">Semua Guru</option>'];
    const guruModalOptions = [];
    db.teachers.forEach(g => {
      guruOptions.push(`<option value="${g.id}">${g.name} (${g.id})</option>`);
      guruModalOptions.push(`<option value="${g.id}">${g.name} (${g.id})</option>`);
    });
    elements.jdlFilterGuru.innerHTML = guruOptions.join("");
    elements.entryGuru.innerHTML = guruModalOptions.join("");

    // Subjek Dropdown
    const subjekOptions = ['<option value="ALL">Semua Subjek</option>'];
    const subjekModalOptions = [];
    db.subjects.forEach(s => {
      subjekOptions.push(`<option value="${s.name}">${s.name}</option>`);
      subjekModalOptions.push(`<option value="${s.name}">${s.name}</option>`);
    });
    elements.jdlFilterSubjek.innerHTML = subjekOptions.join("");
    elements.entrySubjek.innerHTML = subjekModalOptions.join("");

    // Kelas Dropdown
    const kelasOptions = ['<option value="ALL">Semua Kelas</option>'];
    const kelasModalOptions = [];
    db.darjahList.forEach(d => {
      d.classes.forEach(c => {
        kelasOptions.push(`<option value="${c}">${c}</option>`);
        kelasModalOptions.push(`<option value="${c}">${c}</option>`);
      });
    });
    elements.jdlFilterKelas.innerHTML = kelasOptions.join("");
    elements.entryKelas.innerHTML = kelasModalOptions.join("");

    // Pentadbir Penyemak
    const approverOptions = [];
    db.config.approvers.forEach(a => {
      approverOptions.push(`<option value="${a.name} (${a.role})">${a.name} (${a.role})</option>`);
    });
    elements.reviewPentadbirSelect.innerHTML = approverOptions.join("");
  }

  // 5. Penukaran Tab Navigasi
  function switchTab(targetTab) {
    state.activeTab = targetTab;
    elements.navLinks.forEach(link => {
      if (link.dataset.tab === targetTab) {
        link.classList.add("bg-sky-600", "text-white", "shadow-sm");
        link.classList.remove("text-slate-300", "hover:bg-slate-800", "hover:text-white");
      } else {
        link.classList.remove("bg-sky-600", "text-white", "shadow-sm");
        link.classList.add("text-slate-300", "hover:bg-slate-800", "hover:text-white");
      }
    });

    elements.tabContents.forEach(section => {
      if (section.id === `tab-${targetTab}`) {
        section.classList.remove("hidden");
      } else {
        section.classList.add("hidden");
      }
    });

    // Kemaskini Tajuk Header
    const titles = {
      dashboard: "Dashboard Pentadbir - Sistem RPH",
      jadual: "Jadual RPH - Sistem RPH",
      guru: "Senarai Guru & Pendidik SK Ranggu",
      jadualwaktu: "Pengurusan Jadual Waktu",
      export: "Eksport & Import Data e-RPH",
      tetapan: "Tetapan Sistem e-RPH"
    };
    elements.topTitle.textContent = titles[targetTab] || "Sistem RPH";

    // Muat semula data khusus tab
    if (targetTab === "dashboard") renderDashboard();
    if (targetTab === "jadual") renderJadualMatrix();
    if (targetTab === "guru") renderGuruTable();
    if (targetTab === "jadualwaktu") renderScheduleTable();

    // Tutup menu mobil jika terbuka
    if (window.innerWidth < 768) {
      elements.sidebar.classList.add("hidden");
    }

    lucide.createIcons();
  }

  // 6. Logik Pengiraan & Render Dashboard
  function renderDashboard() {
    const selectedBulan = elements.dashFilterBulan.value;
    const selectedMinggu = elements.dashFilterMinggu.value;
    const selectedStatus = state.dashFilters.status;

    // Tapis slot jadual
    let totalSlots = db.schedule.length;
    let slotRphMap = new Map();

    // Petakan RPH mengikut slotId untuk minggu yang dipilih
    db.rphList.forEach(r => {
      const matchMinggu = selectedMinggu === "ALL" || String(r.minggu) === String(selectedMinggu);
      const matchBulan = selectedBulan === "ALL" || r.bulan === selectedBulan;
      if (matchMinggu && matchBulan) {
        slotRphMap.set(r.slotId, r);
      }
    });

    let counts = {
      tiada: 0,
      belumDisahkan: 0,
      perluEdit: 0,
      disahkan: 0
    };

    db.schedule.forEach(slot => {
      const rph = slotRphMap.get(slot.id);
      if (!rph) {
        counts.tiada++;
      } else if (rph.status === "Belum Disahkan") {
        counts.belumDisahkan++;
      } else if (rph.status === "Perlu Edit") {
        counts.perluEdit++;
      } else if (rph.status === "Disahkan") {
        counts.disahkan++;
      }
    });

    const total = totalSlots || 1;
    const pctTiada = Math.round((counts.tiada / total) * 100);
    const pctBelum = Math.round((counts.belumDisahkan / total) * 100);
    const pctEdit = Math.round((counts.perluEdit / total) * 100);
    const pctSah = Math.round((counts.disahkan / total) * 100);

    // Kemaskini Kad KPI
    elements.kpiRedPct.textContent = `${pctTiada}%`;
    elements.kpiRedCount.textContent = `${counts.tiada} Slot • Belum Hantar`;

    elements.kpiYellowPct.textContent = `${pctBelum}%`;
    elements.kpiYellowCount.textContent = `${counts.belumDisahkan} Slot • Belum Semak`;

    elements.kpiBluePct.textContent = `${pctEdit}%`;
    elements.kpiBlueCount.textContent = `${counts.perluEdit} Slot • Perlu Edit`;

    elements.kpiGreenPct.textContent = `${pctSah}%`;
    elements.kpiGreenCount.textContent = `${counts.disahkan} Slot • Disahkan`;

    // Render Seksyen Ikut Darjah (Darjah 1 hingga Darjah 6)
    renderDarjahCards(slotRphMap);

    // Render Seksyen Ikut Subjek (12 Panitia)
    renderSubjectCards(slotRphMap);
  }

  function renderDarjahCards(slotRphMap) {
    const container = elements.darjahCardsContainer;
    container.innerHTML = "";

    db.darjahList.forEach(item => {
      const slotsInDarjah = db.schedule.filter(s => s.darjah === item.darjah);
      let countSubmitted = 0;
      slotsInDarjah.forEach(s => {
        if (slotRphMap.has(s.id)) countSubmitted++;
      });

      const totalInDarjah = slotsInDarjah.length || 1;
      const pct = Math.round((countSubmitted / totalInDarjah) * 100);

      const card = document.createElement("div");
      card.className = "category-card bg-slate-50 hover:bg-white border border-slate-200 hover:border-sky-400 p-3 rounded-xl shadow-xs transition text-center";
      card.innerHTML = `
        <div class="text-2xl mb-1">${item.icon}</div>
        <h4 class="font-extrabold text-xs text-slate-800">${item.label}</h4>
        <div class="text-lg font-black text-sky-700 my-0.5">${pct}%</div>
        <p class="text-[10px] text-slate-500 font-medium">${countSubmitted} / ${slotsInDarjah.length} RPH</p>
      `;

      // Klik kad darjah -> lompat terus ke Jadual RPH ditapis mengikut darjah tersebut!
      card.addEventListener("click", () => {
        elements.jdlFilterDarjah.value = String(item.darjah);
        elements.jdlFilterSubjek.value = "ALL";
        elements.jdlFilterGuru.value = "ALL";
        state.jdlFilters.darjah = String(item.darjah);
        state.jdlFilters.subjek = "ALL";
        state.jdlFilters.guru = "ALL";
        switchTab("jadual");
      });

      container.appendChild(card);
    });
  }

  function renderSubjectCards(slotRphMap) {
    const container = elements.subjectCardsContainer;
    container.innerHTML = "";

    db.subjects.forEach(sub => {
      const slotsInSub = db.schedule.filter(s => s.subjek === sub.name);
      let countSubmitted = 0;
      slotsInSub.forEach(s => {
        if (slotRphMap.has(s.id)) countSubmitted++;
      });

      const totalInSub = slotsInSub.length || 1;
      const pct = slotsInSub.length > 0 ? Math.round((countSubmitted / totalInSub) * 100) : 0;

      const card = document.createElement("div");
      card.className = `category-card ${sub.bg} border ${sub.border} hover:shadow-md p-3 rounded-xl transition text-center`;
      card.innerHTML = `
        <div class="flex items-center justify-center w-8 h-8 mx-auto rounded-lg bg-white/80 shadow-xs mb-1.5 ${sub.text}">
          <i data-lucide="${sub.icon}" class="w-4 h-4"></i>
        </div>
        <h4 class="font-bold text-xs ${sub.text} truncate" title="${sub.name}">${sub.name}</h4>
        <div class="text-lg font-black text-slate-900 my-0.5">${pct}%</div>
        <p class="text-[10px] text-slate-600 font-medium">${countSubmitted} / ${slotsInSub.length} RPH</p>
      `;

      // Klik kad subjek -> lompat ke Jadual RPH dan serlahkan (highlight) semua slot subjek ini!
      card.addEventListener("click", () => {
        elements.jdlFilterSubjek.value = sub.name;
        state.jdlFilters.subjek = sub.name;
        state.highlightSubject = sub.name;
        switchTab("jadual");
      });

      container.appendChild(card);
    });
  }

  // 7. Render Matriks Jadual Waktu & Penyerlahan Slot
  function renderJadualMatrix() {
    const container = elements.timetableContainer;
    container.innerHTML = "";

    const fStatus = elements.jdlFilterStatus.value;
    const fBulan = elements.jdlFilterBulan.value;
    const fMinggu = elements.jdlFilterMinggu.value;
    const fGuru = elements.jdlFilterGuru.value;
    const fSubjek = elements.jdlFilterSubjek.value;
    const fDarjah = elements.jdlFilterDarjah.value;
    const fKelas = elements.jdlFilterKelas.value;

    // Kumpulkan RPH untuk minggu/bulan aktif
    const rphMap = new Map();
    db.rphList.forEach(r => {
      const matchMinggu = fMinggu === "ALL" || String(r.minggu) === String(fMinggu);
      const matchBulan = fBulan === "ALL" || r.bulan === fBulan;
      if (matchMinggu && matchBulan) {
        rphMap.set(r.slotId, r);
      }
    });

    // Dapatkan senarai kelas unik daripada jadual
    let uniqueClasses = [...new Set(db.schedule.map(s => s.kelas))];

    // Tapis mengikut Darjah jika dipilih
    if (fDarjah !== "ALL") {
      uniqueClasses = uniqueClasses.filter(c => {
        const sampleSlot = db.schedule.find(s => s.kelas === c);
        return sampleSlot && String(sampleSlot.darjah) === String(fDarjah);
      });
    }

    // Tapis mengikut Kelas jika dipilih
    if (fKelas !== "ALL") {
      uniqueClasses = uniqueClasses.filter(c => c === fKelas);
    }

    if (uniqueClasses.length === 0) {
      container.innerHTML = `
        <div class="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
          <i data-lucide="calendar-x" class="w-10 h-10 mx-auto text-slate-300 mb-2"></i>
          <p class="font-bold text-sm">Tiada slot jadual ditemui untuk penapis yang dipilih.</p>
          <button id="btn-empty-reset" class="mt-3 text-xs text-sky-600 hover:underline font-semibold">Set semula penapis</button>
        </div>
      `;
      const btnEmptyReset = document.getElementById("btn-empty-reset");
      if (btnEmptyReset) {
        btnEmptyReset.addEventListener("click", resetAllFilters);
      }
      lucide.createIcons();
      return;
    }

    // Susun mengikut Kelas
    uniqueClasses.forEach(className => {
      const classSlots = db.schedule.filter(s => s.kelas === className);

      // Cipta kad kontena jadual kelas
      const classCard = document.createElement("div");
      classCard.className = "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6";

      // Header Kelas
      classCard.innerHTML = `
        <div class="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            <h3 class="font-bold text-sm tracking-wide">Kelas ${className}</h3>
          </div>
          <span class="text-xs text-slate-300 font-medium">Minggu ${fMinggu === "ALL" ? db.config.school.currentWeek : fMinggu} • Sesi Pagi</span>
        </div>
        <div class="overflow-x-auto timetable-container">
          <table class="timetable-table text-xs text-slate-700">
            <thead>
              <tr class="text-slate-600 font-bold border-b border-slate-200">
                <th class="py-2.5 px-3 text-left w-24 bg-slate-100">Hari \\ Waktu</th>
                ${db.config.timeSlots.map(time => `<th class="py-2.5 px-2 text-center font-bold text-[11px] min-w-[130px]">${time}</th>`).join("")}
              </tr>
            </thead>
            <tbody id="tbody-${className.replace(/\s+/g, '-')}" class="divide-y divide-slate-100">
            </tbody>
          </table>
        </div>
      `;

      container.appendChild(classCard);
      const tbody = classCard.querySelector(`#tbody-${className.replace(/\s+/g, '-')}`);

      // Cipta baris untuk setiap hari (Isnin - Jumaat)
      db.config.days.forEach(day => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50/50 transition";

        // Kolum Hari
        const tdDay = document.createElement("td");
        tdDay.className = "py-2.5 px-3 font-bold text-slate-800 bg-slate-50/80 border-r border-slate-200";
        tdDay.textContent = day;
        tr.appendChild(tdDay);

        // Kolum Slot Waktu
        db.config.timeSlots.forEach(time => {
          const td = document.createElement("td");
          td.className = "p-1.5 align-top border border-slate-200";

          // Waktu Rehat
          if (time.includes("10:00-10:30")) {
            td.className += " bg-slate-100/70 text-center font-bold text-slate-400 text-[11px] align-middle";
            td.textContent = "REHAT";
            tr.appendChild(td);
            return;
          }

          // Cari slot yang sepadan
          const slot = classSlots.find(s => s.hari === day && s.masa === time);

          if (!slot) {
            td.innerHTML = `<div class="h-14 rounded-lg bg-slate-50/40 border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-300">-</div>`;
            tr.appendChild(td);
            return;
          }

          const rph = rphMap.get(slot.id);
          let statusLabel = "Tiada RPH";
          let statusClass = "slot-status-red";
          let badgeBg = "bg-rose-500";

          if (rph) {
            statusLabel = rph.status;
            if (rph.status === "Disahkan") {
              statusClass = "slot-status-green";
              badgeBg = "bg-emerald-500";
            } else if (rph.status === "Perlu Edit") {
              statusClass = "slot-status-blue";
              badgeBg = "bg-sky-500";
            } else if (rph.status === "Belum Disahkan") {
              statusClass = "slot-status-yellow";
              badgeBg = "bg-amber-500";
            }
          }

          // Semak Penapis Status
          let matchesStatusFilter = true;
          if (fStatus !== "ALL") {
            matchesStatusFilter = (statusLabel === fStatus);
          }

          // Semak Penyerlahan (Highlighting)
          let isHighlighted = false;
          let isDimmed = false;
          const hasActiveSubjectFilter = (fSubjek !== "ALL");
          const hasActiveGuruFilter = (fGuru !== "ALL");

          if (hasActiveSubjectFilter || hasActiveGuruFilter) {
            const matchSub = (!hasActiveSubjectFilter || slot.subjek === fSubjek);
            const matchGur = (!hasActiveGuruFilter || slot.guruId === fGuru);
            if (matchSub && matchGur) {
              isHighlighted = true;
            } else {
              isDimmed = true;
            }
          }

          if (!matchesStatusFilter) {
            isDimmed = true;
          }

          // Cipta Kad Slot
          const slotCard = document.createElement("div");
          let extraClasses = "";
          if (isHighlighted) extraClasses += " slot-highlighted ring-2 ring-sky-500 bg-white ";
          if (isDimmed) extraClasses += " slot-dimmed ";

          slotCard.className = `slot-card ${statusClass} ${extraClasses} p-2 rounded-lg border shadow-xs min-h-[58px] flex flex-col justify-between`;
          slotCard.innerHTML = `
            <div>
              <div class="flex items-center justify-between gap-1">
                <span class="font-extrabold text-[11px] leading-tight truncate" title="${slot.subjek}">${slot.subjek}</span>
                <span class="w-2 h-2 rounded-full ${badgeBg} flex-shrink-0" title="${statusLabel}"></span>
              </div>
              <p class="text-[10px] text-slate-600 font-medium truncate mt-0.5" title="${slot.guruName}">
                ${slot.guruName}
              </p>
            </div>
            <div class="flex items-center justify-between mt-1 pt-1 border-t border-black/5 text-[9px] font-semibold">
              <span class="text-slate-500">${slot.masa}</span>
              <span class="font-bold uppercase tracking-tight">${statusLabel}</span>
            </div>
          `;

          // Klik Slot Card:
          // Jika Tiada RPH -> Buka Modal Tambah RPH (isi borang)
          // Jika Ada RPH -> Buka Modal Semakan Pentadbir (semak atau sahkan)
          slotCard.addEventListener("click", () => {
            if (!rph) {
              openRphEntryModal(slot);
            } else {
              openRphReviewModal(rph, slot);
            }
          });

          td.appendChild(slotCard);
          tr.appendChild(td);
        });

        tbody.appendChild(tr);
      });
    });

    lucide.createIcons();
  }

  // 8. Modal Handlers
  function openRphEntryModal(slot, existingRph = null) {
    elements.entrySlotId.value = slot ? slot.id : (existingRph ? existingRph.slotId : "");
    elements.entryRphId.value = existingRph ? existingRph.id : "";

    const activeMinggu = elements.jdlFilterMinggu.value === "ALL" ? db.config.school.currentWeek : elements.jdlFilterMinggu.value;
    const defaultDate = "2026-02-16";

    if (existingRph) {
      elements.entryGuru.value = existingRph.guruId;
      elements.entryTarikh.value = existingRph.tarikh || defaultDate;
      elements.entryMinggu.value = existingRph.minggu || activeMinggu;
      elements.entrySubjek.value = existingRph.mataPelajaran;
      elements.entryKelas.value = existingRph.kelas;
      elements.entryMasa.value = existingRph.masa;
      elements.entryTajuk.value = existingRph.tajuk;
      elements.entrySk.value = existingRph.standardKandungan || "";
      elements.entrySp.value = existingRph.standardPembelajaran || "";
      elements.entryObjektif.value = existingRph.objektif || "";
      elements.entryAktiviti.value = existingRph.aktiviti || "";
      elements.entryBbm.value = existingRph.bbm || "";
      elements.entryPentaksiran.value = existingRph.pentaksiran || "";
      elements.entryRefleksi.value = existingRph.refleksi || "";
      document.getElementById("rph-modal-title").textContent = "Kemaskini e-RPH";
    } else {
      elements.entryGuru.value = slot.guruId;
      elements.entryTarikh.value = defaultDate;
      elements.entryMinggu.value = activeMinggu;
      elements.entrySubjek.value = slot.subjek;
      elements.entryKelas.value = slot.kelas;
      elements.entryMasa.value = slot.masa;
      elements.entryTajuk.value = "";
      elements.entrySk.value = `SK 1.1 - ${slot.subjek}`;
      elements.entrySp.value = `SP 1.1.1 - Standard Pembelajaran ${slot.subjek}`;
      elements.entryObjektif.value = "Pada akhir PdP, sekurang-kurangnya 80% murid dapat menguasai kemahiran yang diajar.";
      elements.entryAktiviti.value = "1. Set Induksi (5 min): Pengenalan tajuk melalui tayangan gambar.\n2. Perkembangan (20 min): Penerangan konsep dan aktiviti berpusatkan murid.\n3. Penutup (5 min): Rumusan dan latihan pengukuhan.";
      elements.entryBbm.value = "Buku teks digital, kad imbasan, lembaran kerja";
      elements.entryPentaksiran.value = "Pemerhatian & Lembaran Kerja";
      elements.entryRefleksi.value = "Murid memberikan tumpuan yang baik sepanjang PdP.";
      document.getElementById("rph-modal-title").textContent = "Tambah / Hantar RPH";
    }

    elements.modalRphEntry.classList.remove("hidden");
  }

  function closeRphEntryModal() {
    elements.modalRphEntry.classList.add("hidden");
  }

  function openRphReviewModal(rph, slot) {
    elements.reviewRphId.value = rph.id;
    elements.reviewModalTeacherInfo.textContent = `Cikgu ${rph.guruName} • ${rph.mataPelajaran} • ${rph.kelas}`;

    // Badge Status
    const badgeColors = {
      "Disahkan": "bg-emerald-100 text-emerald-800 border-emerald-300",
      "Perlu Edit": "bg-sky-100 text-sky-800 border-sky-300",
      "Belum Disahkan": "bg-amber-100 text-amber-800 border-amber-300"
    };
    elements.reviewCurrentBadge.className = `inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeColors[rph.status] || "bg-slate-100"}`;
    elements.reviewCurrentBadge.textContent = rph.status;

    elements.reviewDateInfo.textContent = `Tarikh: ${formatDisplayDate(rph.tarikh)}`;
    elements.reviewSlotInfo.textContent = `Minggu ${rph.minggu} • ${rph.masa}`;

    elements.reviewTajuk.textContent = rph.tajuk || "-";
    elements.reviewSk.textContent = rph.standardKandungan || "-";
    elements.reviewSp.textContent = rph.standardPembelajaran || "-";
    elements.reviewObjektif.textContent = rph.objektif || "-";
    elements.reviewAktiviti.textContent = rph.aktiviti || "-";
    elements.reviewBbm.textContent = rph.bbm || "-";
    elements.reviewPentaksiran.textContent = rph.pentaksiran || "-";
    elements.reviewRefleksi.textContent = rph.refleksi || "-";

    elements.reviewStatusSelect.value = rph.status;
    elements.reviewKomenInput.value = rph.komenPentadbir || "";
    if (rph.namaPentadbir) {
      elements.reviewPentadbirSelect.value = rph.namaPentadbir;
    }

    elements.modalRphReview.classList.remove("hidden");
  }

  function closeRphReviewModal() {
    elements.modalRphReview.classList.add("hidden");
  }

  // 9. Simpan RPH Baru / Kemaskini RPH
  elements.formRphEntry.addEventListener("submit", (e) => {
    e.preventDefault();

    const rphId = elements.entryRphId.value || `RPH-${String(db.rphList.length + 1).padStart(3, "0")}`;
    const slotId = elements.entrySlotId.value;
    const guruId = elements.entryGuru.value;
    const teacherObj = db.teachers.find(t => t.id === guruId) || { name: "Guru SK Ranggu" };

    const newRph = {
      id: rphId,
      slotId: slotId,
      guruId: guruId,
      guruName: teacherObj.name,
      tarikh: elements.entryTarikh.value,
      minggu: parseInt(elements.entryMinggu.value),
      bulan: "Feb",
      mataPelajaran: elements.entrySubjek.value,
      kelas: elements.entryKelas.value,
      darjah: parseInt(elements.entryKelas.value.charAt(0)) || 1,
      masa: elements.entryMasa.value,
      tajuk: elements.entryTajuk.value,
      standardKandungan: elements.entrySk.value,
      standardPembelajaran: elements.entrySp.value,
      objektif: elements.entryObjektif.value,
      aktiviti: elements.entryAktiviti.value,
      bbm: elements.entryBbm.value,
      pentaksiran: elements.entryPentaksiran.value,
      refleksi: elements.entryRefleksi.value,
      status: "Belum Disahkan",
      komenPentadbir: "",
      namaPentadbir: "",
      tarikhSemakan: ""
    };

    const existingIndex = db.rphList.findIndex(r => r.id === rphId);
    if (existingIndex >= 0) {
      db.rphList[existingIndex] = { ...db.rphList[existingIndex], ...newRph };
    } else {
      db.rphList.push(newRph);
    }

    saveAppDatabase(db);
    closeRphEntryModal();

    Swal.fire({
      icon: "success",
      title: "e-RPH Berjaya Dihantar!",
      text: `RPH bagi kelas ${newRph.kelas} telah direkodkan. Menunggu pengesahan pentadbir.`,
      timer: 2000,
      showConfirmButton: false
    });

    renderDashboard();
    renderJadualMatrix();
  });

  // 10. Simpan Semakan Pentadbir
  elements.btnSaveReview.addEventListener("click", () => {
    const rphId = elements.reviewRphId.value;
    const rph = db.rphList.find(r => r.id === rphId);

    if (rph) {
      rph.status = elements.reviewStatusSelect.value;
      rph.komenPentadbir = elements.reviewKomenInput.value;
      rph.namaPentadbir = elements.reviewPentadbirSelect.value;
      rph.tarikhSemakan = new Date().toISOString().split("T")[0];

      saveAppDatabase(db);
      closeRphReviewModal();

      Swal.fire({
        icon: "success",
        title: "Semakan Disimpan!",
        text: `Status RPH dikemaskini kepada "${rph.status}".`,
        timer: 1800,
        showConfirmButton: false
      });

      renderDashboard();
      renderJadualMatrix();
    }
  });

  // Edit as Teacher daripada Review Modal
  elements.btnEditAsTeacher.addEventListener("click", () => {
    const rphId = elements.reviewRphId.value;
    const rph = db.rphList.find(r => r.id === rphId);
    if (rph) {
      closeRphReviewModal();
      openRphEntryModal(null, rph);
    }
  });

  // 11. Render Jadual Senarai Guru
  function renderGuruTable() {
    const tbody = elements.guruTableBody;
    tbody.innerHTML = "";

    const query = elements.searchGuruInput.value.toLowerCase().trim();

    const filtered = db.teachers.filter(g => {
      return g.name.toLowerCase().includes(query) ||
             g.subjek.toLowerCase().includes(query) ||
             g.kelas.toLowerCase().includes(query) ||
             g.id.toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-400">Tiada guru dijumpai.</td></tr>`;
      return;
    }

    filtered.forEach(guru => {
      const guruRphs = db.rphList.filter(r => r.guruId === guru.id && r.minggu === db.config.school.currentWeek);
      const isComplete = guruRphs.length >= 2;
      const statusBadge = isComplete
        ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Lengkap (${guruRphs.length})</span>`
        : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Sebahagian (${guruRphs.length})</span>`;

      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-50 transition";
      tr.innerHTML = `
        <td class="py-3 px-4 font-mono font-bold text-sky-700">${guru.id}</td>
        <td class="py-3 px-4 font-bold text-slate-900">${guru.name}</td>
        <td class="py-3 px-4 text-slate-500 font-mono text-[11px]">${guru.ic}</td>
        <td class="py-3 px-4 text-slate-700 font-medium">${guru.subjek}</td>
        <td class="py-3 px-4 text-slate-600 text-[11px]">${guru.kelas}</td>
        <td class="py-3 px-4 text-center">${statusBadge}</td>
        <td class="py-3 px-4 text-center">
          <button data-guru-id="${guru.id}" class="btn-filter-guru-schedule px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-md font-semibold text-[11px] transition">
            Lihat Jadual
          </button>
        </td>
      `;

      tr.querySelector(".btn-filter-guru-schedule").addEventListener("click", () => {
        elements.jdlFilterGuru.value = guru.id;
        state.jdlFilters.guru = guru.id;
        state.highlightTeacher = guru.id;
        switchTab("jadual");
      });

      tbody.appendChild(tr);
    });
  }

  // 12. Render Jadual Waktu Persekolahan
  function renderScheduleTable() {
    const tbody = elements.scheduleTableBody;
    tbody.innerHTML = "";

    db.schedule.forEach(slot => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-50 transition";
      tr.innerHTML = `
        <td class="py-2.5 px-4 font-mono font-bold text-slate-500">${slot.id}</td>
        <td class="py-2.5 px-4 font-bold text-slate-800">${slot.kelas}</td>
        <td class="py-2.5 px-4 font-semibold text-slate-700">${slot.hari}</td>
        <td class="py-2.5 px-4 font-mono text-slate-600">${slot.masa}</td>
        <td class="py-2.5 px-4 font-bold text-sky-700">${slot.subjek}</td>
        <td class="py-2.5 px-4 text-slate-700">${slot.guruName}</td>
        <td class="py-2.5 px-4 text-center">
          <button data-slot-id="${slot.id}" class="btn-delete-slot text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition" title="Padam Slot">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>
      `;

      tr.querySelector(".btn-delete-slot").addEventListener("click", () => {
        db.schedule = db.schedule.filter(s => s.id !== slot.id);
        saveAppDatabase(db);
        renderScheduleTable();
      });

      tbody.appendChild(tr);
    });

    lucide.createIcons();
  }

  // 13. Eksport Penuh ke Excel (Format 3 Sheets Mengikut Video)
  function exportFullExcel() {
    if (typeof XLSX === "undefined") {
      Swal.fire("Ralat", "Pustaka XLSX belum dimuatkan.", "error");
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: RPH
    const rphRows = db.rphList.map(r => ({
      "ID": r.id,
      "GuruID": r.guruId,
      "Nama Guru": r.guruName,
      "Tarikh": r.tarikh,
      "Minggu": r.minggu,
      "Mata Pelajaran": r.mataPelajaran,
      "Kelas": r.kelas,
      "Masa": r.masa,
      "Tajuk": r.tajuk,
      "Standard Kandungan": r.standardKandungan,
      "Standard Pembelajaran": r.standardPembelajaran,
      "Objektif": r.objektif,
      "Aktiviti": r.aktiviti,
      "BBM": r.bbm,
      "Pentaksiran": r.pentaksiran,
      "Refleksi": r.refleksi,
      "Status": r.status,
      "Komen Pentadbir": r.komenPentadbir,
      "Nama Pentadbir": r.namaPentadbir,
      "Tarikh Semakan": r.tarikhSemakan
    }));
    const wsRph = XLSX.utils.json_to_sheet(rphRows);
    XLSX.utils.book_append_sheet(wb, wsRph, "RPH");

    // Sheet 2: Jadual
    const jadualRows = db.schedule.map(s => ({
      "ID": s.id,
      "Kelas": s.kelas,
      "Hari": s.hari,
      "Masa": s.masa,
      "Subjek": s.subjek,
      "GuruID": s.guruId,
      "Nama Guru": s.guruName
    }));
    const wsJadual = XLSX.utils.json_to_sheet(jadualRows);
    XLSX.utils.book_append_sheet(wb, wsJadual, "Jadual");

    // Sheet 3: Tetapan_Guru
    const guruRows = db.teachers.map(g => ({
      "GuruID": g.id,
      "Nama": g.name,
      "No KP": g.ic,
      "Mata Pelajaran": g.subjek,
      "Kelas": g.kelas,
      "Emel": g.email
    }));
    const wsGuru = XLSX.utils.json_to_sheet(guruRows);
    XLSX.utils.book_append_sheet(wb, wsGuru, "Tetapan_Guru");

    // Tulis fail
    const dateStamp = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `RPH_export_SKRanggu_${dateStamp}.xlsx`);

    Swal.fire({
      icon: "success",
      title: "Fail Excel Berjaya Dijana!",
      text: "Fail RPH_export_SKRanggu.xlsx sedia untuk disimpan.",
      timer: 2000,
      showConfirmButton: false
    });
  }

  // 14. Import Fail Excel
  function handleImportExcel(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        // Jika sheet RPH wujud
        if (workbook.SheetNames.includes("RPH")) {
          const rphData = XLSX.utils.sheet_to_json(workbook.Sheets["RPH"]);
          if (rphData.length > 0) {
            db.rphList = rphData.map((row, idx) => ({
              id: row["ID"] || `RPH-IMP-${idx + 1}`,
              slotId: row["SlotID"] || "",
              guruId: row["GuruID"] || "G01",
              guruName: row["Nama Guru"] || "",
              tarikh: row["Tarikh"] || "2026-02-16",
              minggu: parseInt(row["Minggu"]) || 7,
              bulan: "Feb",
              mataPelajaran: row["Mata Pelajaran"] || "",
              kelas: row["Kelas"] || "",
              darjah: parseInt(row["Kelas"] ? row["Kelas"].charAt(0) : "1") || 1,
              masa: row["Masa"] || "",
              tajuk: row["Tajuk"] || "",
              standardKandungan: row["Standard Kandungan"] || "",
              standardPembelajaran: row["Standard Pembelajaran"] || "",
              objektif: row["Objektif"] || "",
              aktiviti: row["Aktiviti"] || "",
              bbm: row["BBM"] || "",
              pentaksiran: row["Pentaksiran"] || "",
              refleksi: row["Refleksi"] || "",
              status: row["Status"] || "Belum Disahkan",
              komenPentadbir: row["Komen Pentadbir"] || "",
              namaPentadbir: row["Nama Pentadbir"] || "",
              tarikhSemakan: row["Tarikh Semakan"] || ""
            }));
          }
        }

        saveAppDatabase(db);
        Swal.fire("Berjaya!", "Data e-RPH telah diimport ke dalam sistem.", "success");
        renderDashboard();
        renderJadualMatrix();
      } catch (err) {
        Swal.fire("Ralat Import", "Fail tidak dapat dibaca. Pastikan format Excel betul.", "error");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // 15. Reset Semua Filter
  function resetAllFilters() {
    elements.jdlFilterStatus.value = "ALL";
    elements.jdlFilterBulan.value = "Feb";
    elements.jdlFilterMinggu.value = db.config.school.currentWeek;
    elements.jdlFilterGuru.value = "ALL";
    elements.jdlFilterSubjek.value = "ALL";
    elements.jdlFilterDarjah.value = "ALL";
    elements.jdlFilterKelas.value = "ALL";
    state.highlightSubject = null;
    state.highlightTeacher = null;
    renderJadualMatrix();
  }

  // 16. Event Listeners UI
  // Nav Links
  elements.navLinks.forEach(link => {
    link.addEventListener("click", () => switchTab(link.dataset.tab));
  });

  // Mobile Menu
  elements.mobileMenuToggle.addEventListener("click", () => {
    elements.sidebar.classList.toggle("hidden");
  });
  elements.mobileMenuClose.addEventListener("click", () => {
    elements.sidebar.classList.add("hidden");
  });

  // Toggle User Role (Pentadbir vs Guru)
  elements.toggleUserRole.addEventListener("click", () => {
    if (state.userRole === "pentadbir") {
      state.userRole = "guru";
      state.currentUserName = "Ts. Mohammad Fikrey (Penyelaras ICT)";
      elements.userAvatar.textContent = "G";
      elements.userAvatar.className = "w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs";
      elements.currentUserName.textContent = "Ts. Fikrey";
      elements.currentUserRole.textContent = "Guru Kelas 6 Jayyid";
    } else {
      state.userRole = "pentadbir";
      state.currentUserName = "Yunus bin Patarai (Guru Besar)";
      elements.userAvatar.textContent = "P";
      elements.userAvatar.className = "w-8 h-8 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center text-xs";
      elements.currentUserName.textContent = "Guru Besar";
      elements.currentUserRole.textContent = "Pentadbir Utama";
    }
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "info",
      title: `Peranan ditukar: ${state.userRole.toUpperCase()}`,
      timer: 1500,
      showConfirmButton: false
    });
  });

  // Filter Dashboard Events
  elements.dashFilterBulan.addEventListener("change", renderDashboard);
  elements.dashFilterMinggu.addEventListener("change", () => {
    elements.headerActiveWeek.textContent = `Minggu ${elements.dashFilterMinggu.value}`;
    renderDashboard();
  });

  elements.dashStatusTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      elements.dashStatusTabs.forEach(t => {
        t.className = "dash-status-tab px-3 py-1 rounded-md transition text-slate-600 hover:text-slate-900";
      });
      tab.className = "dash-status-tab px-3 py-1 rounded-md transition bg-white text-sky-700 shadow-sm font-bold";
      state.dashFilters.status = tab.dataset.status;

      // Lompat ke tab jadual jika status khusus ditekan
      if (tab.dataset.status !== "ALL") {
        elements.jdlFilterStatus.value = tab.dataset.status;
        switchTab("jadual");
      } else {
        renderDashboard();
      }
    });
  });

  // Filter Jadual Events
  [
    elements.jdlFilterStatus,
    elements.jdlFilterBulan,
    elements.jdlFilterMinggu,
    elements.jdlFilterGuru,
    elements.jdlFilterSubjek,
    elements.jdlFilterDarjah,
    elements.jdlFilterKelas
  ].forEach(select => {
    select.addEventListener("change", () => {
      state.highlightSubject = (elements.jdlFilterSubjek.value !== "ALL") ? elements.jdlFilterSubjek.value : null;
      state.highlightTeacher = (elements.jdlFilterGuru.value !== "ALL") ? elements.jdlFilterGuru.value : null;
      renderJadualMatrix();
    });
  });

  elements.btnResetFilters.addEventListener("click", resetAllFilters);

  // Search Guru
  elements.searchGuruInput.addEventListener("input", renderGuruTable);

  // Export & Import
  elements.btnQuickExport.addEventListener("click", exportFullExcel);
  elements.btnExportFullExcel.addEventListener("click", exportFullExcel);

  elements.btnTriggerImport.addEventListener("click", () => {
    elements.importExcelFile.click();
  });

  elements.importExcelFile.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleImportExcel(e.target.files[0]);
    }
  });

  // Reset Demo
  elements.btnResetDemo.addEventListener("click", () => {
    Swal.fire({
      title: "Adakah anda pasti?",
      text: "Semua perubahan akan ditetapkan semula kepada data piawai SK Ranggu.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Tetapkan Semula",
      cancelButtonText: "Batal"
    }).then((result) => {
      if (result.isConfirmed) {
        resetAppDatabaseToDefault();
        db = getAppDatabase();
        initDropdownOptions();
        renderDashboard();
        renderJadualMatrix();
        Swal.fire("Berjaya!", "Pangkalan data telah ditetapkan semula.", "success");
      }
    });
  });

  // Print
  elements.btnPrintView.addEventListener("click", () => {
    window.print();
  });

  // Refresh
  elements.btnRefreshData.addEventListener("click", () => {
    db = getAppDatabase();
    renderDashboard();
    renderJadualMatrix();
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Data dimuat semula",
      timer: 1000,
      showConfirmButton: false
    });
  });

  // Close Modals
  elements.btnCloseRphModal.addEventListener("click", closeRphEntryModal);
  elements.btnCancelRph.addEventListener("click", closeRphEntryModal);
  elements.btnCloseReviewModal.addEventListener("click", closeRphReviewModal);
  elements.btnCloseReview.addEventListener("click", closeRphReviewModal);

  // Tambah Slot Jadual
  elements.btnAddScheduleSlot.addEventListener("click", () => {
    Swal.fire({
      title: "Tambah Slot Jadual Waktu",
      html: `
        <div class="text-left space-y-2 text-xs">
          <div>
            <label class="font-bold text-slate-700">Kelas:</label>
            <input id="swal-slot-kelas" class="w-full border p-2 rounded text-xs" value="6 Jayyid">
          </div>
          <div>
            <label class="font-bold text-slate-700">Hari:</label>
            <select id="swal-slot-hari" class="w-full border p-2 rounded text-xs">
              <option value="Isnin">Isnin</option>
              <option value="Selasa">Selasa</option>
              <option value="Rabu">Rabu</option>
              <option value="Khamis">Khamis</option>
              <option value="Jumaat">Jumaat</option>
            </select>
          </div>
          <div>
            <label class="font-bold text-slate-700">Masa:</label>
            <input id="swal-slot-masa" class="w-full border p-2 rounded text-xs" value="07:20-08:00">
          </div>
          <div>
            <label class="font-bold text-slate-700">Subjek:</label>
            <input id="swal-slot-subjek" class="w-full border p-2 rounded text-xs" value="Matematik">
          </div>
          <div>
            <label class="font-bold text-slate-700">Guru:</label>
            <select id="swal-slot-guru" class="w-full border p-2 rounded text-xs">
              ${db.teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join("")}
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Simpan Slot",
      cancelButtonText: "Batal",
      preConfirm: () => {
        const k = document.getElementById("swal-slot-kelas").value;
        const h = document.getElementById("swal-slot-hari").value;
        const m = document.getElementById("swal-slot-masa").value;
        const s = document.getElementById("swal-slot-subjek").value;
        const gId = document.getElementById("swal-slot-guru").value;
        const tObj = db.teachers.find(t => t.id === gId) || { name: "Guru" };
        return {
          id: `JDL-${String(db.schedule.length + 1).padStart(3, "0")}`,
          kelas: k,
          darjah: parseInt(k.charAt(0)) || 1,
          hari: h,
          masa: m,
          subjek: s,
          guruId: gId,
          guruName: tObj.name
        };
      }
    }).then(result => {
      if (result.isConfirmed) {
        db.schedule.push(result.value);
        saveAppDatabase(db);
        renderScheduleTable();
        Swal.fire("Berjaya!", "Slot jadual ditambah.", "success");
      }
    });
  });

  // Settings Save
  elements.btnSaveSettings.addEventListener("click", () => {
    db.config.school.name = document.getElementById("setting-school-name").value;
    db.config.school.code = document.getElementById("setting-school-code").value;
    db.config.school.session = document.getElementById("setting-session").value;
    db.config.school.currentWeek = parseInt(document.getElementById("setting-current-week").value) || 7;
    saveAppDatabase(db);
    Swal.fire("Berjaya", "Tetapan sistem disimpan.", "success");
    renderDashboard();
  });

  // 17. Permulaan Aplikasi (App Boot)
  initDropdownOptions();
  renderDashboard();
  renderJadualMatrix();
  lucide.createIcons();
});
