// ── STAŁE ──
const API_BASE = "/api/apps/performance/reasons/";
const API_KEY = "";

const CLIENTS = [
  { id: 1, name: "3M" },
  { id: 2, name: "Solventum" },
];

const WORK_CENTERS = [
  { id: 1, name: "Przyjęcie drobnicy" },
  { id: 2, name: "Przyjęcie palet" },
  { id: 3, name: "Cross-dock" },
  { id: 4, name: "Rozładunek" },
  { id: 5, name: "Sortowanie M3" },
  { id: 6, name: "Załadunki" },
  { id: 7, name: "Picking antresola" },
  { id: 8, name: "Kontrola exportów" },
  { id: 9, name: "Misje" },
  { id: 10, name: "Foliowanie" },
  { id: 11, name: "Picking regały" },
  { id: 12, name: "Check & Pack" },
  { id: 13, name: "VAS" },
  { id: 14, name: "Labelling per hour" },
];

const REASON_CODES = [
  { id: 1, name: "Conso dostaw" },
  { id: 2, name: "Problemy sprzętowe" },
  { id: 3, name: "Podwójne sortowanie w strefie 20K" },
  { id: 4, name: "Rozbieżności w dostawach" },
  { id: 5, name: "Error" },
  { id: 6, name: "Sortowanie LOT/DW" },
  { id: 7, name: "Dodatkowe czynności - celne" },
  { id: 8, name: "Dodatkowe czynności - DD" },
  { id: 9, name: "Nowy operator, kontrola reszty" },
  { id: 10, name: "Błędnie załadowany towar" },
  { id: 11, name: "Szkolenie nowego pracownika" },
  { id: 12, name: "Wymogi klienta" },
  { id: 13, name: "Zamówienia paczkowe" },
  { id: 14, name: "Rozdrobnienie Pickingu (3.9K / Linię)" },
  { id: 15, name: "Rozdrobnienie Pickingu (3.3K / Linię)" },
  { id: 16, name: "Rozdrobnienie Pickingu (4.0K / Linię)" },
  { id: 17, name: "Rozdrobnienie Pickingu (4.2K / Linię)" },
  { id: 18, name: "Niewykwalifikowani pracownicy" },
  { id: 19, name: "Zamówienia drobnicowe" },
  { id: 20, name: "Zgrzewy - wysoki wolumen" },
  { id: 21, name: "Instrukcje - wysoki wolumen" },
  { id: 22, name: "Niski wolumen" },
  { id: 23, name: "Opóźnienie w pickingu" },
  { id: 24, name: "Rozdrobnienie Pickingu (2.3K / Linię)" },
  { id: 25, name: "Problem ze specyfikacjami/przewoźnikami" },
  { id: 26, name: "Ograniczona ilość miejsca odstawczego" },
];

// ── STAN ──
let allData = [];
let filtered = [];
let sortKey = "date";
let sortDir = -1; // -1 = desc, 1 = asc
let currentPage = 1;
const PAGE_SIZE = 20;
let deleteTarget = null;

// ── LOOKUP HELPERS ──
const wcById = (id) => WORK_CENTERS.find((w) => w.id === +id);
const rcById = (id) => REASON_CODES.find((r) => r.id === +id);
const wcName = (id) => wcById(id)?.name || `WC #${id}`;
const rcName = (id) => rcById(id)?.name || `RC #${id}`;

// ── BOOTSTRAP ──
function init() {
  populateSelects();
  loadData();

  document
    .getElementById("searchInput")
    .addEventListener("input", applyFilters);
  document
    .getElementById("filterClient")
    .addEventListener("change", applyFilters);
  document.getElementById("filterWC").addEventListener("change", applyFilters);
  document.getElementById("filterRC").addEventListener("change", applyFilters);
  document
    .getElementById("filterMonth")
    .addEventListener("change", applyFilters);

  // Close modals on backdrop click
  document.getElementById("formModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById("deleteModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeDeleteModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeDeleteModal();
    }
  });
}

function populateSelects() {
  const wcFilter = document.getElementById("filterWC");
  const rcFilter = document.getElementById("filterRC");
  const fieldWC = document.getElementById("fieldWC");
  const fieldRC = document.getElementById("fieldRC");

  WORK_CENTERS.forEach((w) => {
    wcFilter.add(new Option(w.name, w.id));
    fieldWC.add(new Option(w.name, w.id));
  });
  REASON_CODES.forEach((r) => {
    rcFilter.add(new Option(r.name, r.id));
    fieldRC.add(new Option(r.name, r.id));
  });
}

// ── API ──
function setApiStatus(status, label) {
  const dot = document.getElementById("apiDot");
  const lbl = document.getElementById("apiLabel");
  dot.className = "api-dot " + status;
  lbl.textContent = label;
  lbl.style.color =
    status === "ok"
      ? "var(--green)"
      : status === "err"
        ? "var(--red)"
        : "var(--amber)";
}

async function apiCall(type, body = null) {
  const url = `${API_BASE}?key=${API_KEY}&type=${type}`;
  const opts = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function loadData() {
  setApiStatus("loading", "Ładowanie...");
  document.getElementById("tableBody").innerHTML =
    '<tr class="loading-row"><td colspan="7"><div class="spinner"></div></td></tr>';

  try {
    const url = `${API_BASE}?key=${API_KEY}&type=GET`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allData = await res.json();
    setApiStatus("ok", "API połączone");
    applyFilters();
    updateStats();
  } catch (err) {
    setApiStatus("err", "Błąd API");
    showToast("Nie można pobrać danych: " + err.message, "error");
    document.getElementById("tableBody").innerHTML =
      `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">⚠</div><div class="empty-text">Błąd połączenia z API</div></div></td></tr>`;
  }
}

// ── STATS ──
function updateStats() {
  const data = allData;
  document.getElementById("statTotal").textContent = data.length;
  document.getElementById("stat3m").textContent = data.filter(
    (r) => r.client === "3M",
  ).length;
  document.getElementById("statSol").textContent = data.filter(
    (r) => r.client === "Solventum",
  ).length;
  document.getElementById("statDays").textContent = new Set(
    data.map((r) => r.date),
  ).size;
  document.getElementById("statWC").textContent = new Set(
    data.map((r) => r.workCenter),
  ).size;
}

// ── FILTROWANIE I SORTOWANIE ──
function applyFilters() {
  const q = document.getElementById("searchInput").value.toLowerCase();
  const cli = document.getElementById("filterClient").value;
  const wc = document.getElementById("filterWC").value;
  const rc = document.getElementById("filterRC").value;
  const month = document.getElementById("filterMonth").value; // "YYYY-MM"

  filtered = allData.filter((r) => {
    if (cli && r.client !== cli) return false;
    if (wc && String(r.workCenter) !== String(wc)) return false;
    if (rc && String(r.reasonCode) !== String(rc)) return false;
    if (month && !r.date.startsWith(month)) return false;
    if (q) {
      const haystack = [
        r.date,
        r.client,
        wcName(r.workCenter),
        rcName(r.reasonCode),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  sortData();
  currentPage = 1;
  renderTable();
}

function sortBy(key) {
  if (sortKey === key) {
    sortDir *= -1;
  } else {
    sortKey = key;
    sortDir = -1;
  }
  sortData();
  renderTable();
  // Update header styles
  document
    .querySelectorAll("thead th")
    .forEach((th) => th.classList.remove("sorted"));
  const th = document.getElementById("th-" + key);
  if (th) {
    th.classList.add("sorted");
    th.querySelector(".sort-icon").textContent = sortDir === -1 ? "↓" : "↑";
  }
}

function sortData() {
  filtered.sort((a, b) => {
    let av = a[sortKey],
      bv = b[sortKey];
    if (sortKey === "workCenter") {
      av = wcName(av);
      bv = wcName(bv);
    }
    if (sortKey === "reasonCode") {
      av = rcName(av);
      bv = rcName(bv);
    }
    if (av < bv) return -sortDir;
    if (av > bv) return sortDir;
    return 0;
  });
}

// ── RENDER TABLE ──
function renderTable() {
  const tbody = document.getElementById("tableBody");
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > pages) currentPage = pages;

  const slice = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">${allData.length ? "Brak wyników dla wybranych filtrów" : "Brak wpisów — dodaj pierwszy wpis"}</div></div></td></tr>`;
  } else {
    tbody.innerHTML = slice
      .map((r) => {
        const clientClass = r.client === "3M" ? "client-3m" : "client-sol";
        const created = r.createdAt
          ? r.createdAt.slice(0, 16).replace("T", " ")
          : "—";
        return `<tr>
        <td class="id-col">${r.id}</td>
        <td class="date-col">${r.date}</td>
        <td><span class="client-badge ${clientClass}">${r.client}</span></td>
        <td><span class="wc-tag">${wcName(r.workCenter)}</span></td>
        <td><span class="rc-tag" title="${rcName(r.reasonCode)}">${rcName(r.reasonCode)}</span></td>
        <td style="font-size:11px;color:var(--text3);font-family:var(--mono)">${created}</td>
        <td class="actions-col">
          <button class="action-btn edit" onclick="openModal(${r.id})" title="Edytuj">
            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="action-btn delete" onclick="openDeleteModal(${r.id})" title="Usuń">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </button>
        </td>
      </tr>`;
      })
      .join("");
  }

  // Pagination
  const info = total
    ? `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, total)} z ${total} wpisów`
    : "0 wpisów";
  document.getElementById("pageInfo").textContent = info;

  const btns = document.getElementById("pageBtns");
  btns.innerHTML = "";
  const addBtn = (label, page, active, disabled) => {
    const b = document.createElement("button");
    b.className = "page-btn" + (active ? " active" : "");
    b.disabled = disabled;
    b.textContent = label;
    b.onclick = () => {
      currentPage = page;
      renderTable();
    };
    btns.appendChild(b);
  };
  addBtn("‹", currentPage - 1, false, currentPage === 1);
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(pages, currentPage + 2);
  if (start > 1) addBtn("1", 1, false, false);
  if (start > 2) {
    const dots = document.createElement("span");
    dots.textContent = "…";
    dots.style.cssText = "padding:4px 6px;color:var(--text3);font-size:12px";
    btns.appendChild(dots);
  }
  for (let p = start; p <= end; p++) addBtn(p, p, p === currentPage, false);
  if (end < pages - 1) {
    const dots = document.createElement("span");
    dots.textContent = "…";
    dots.style.cssText = "padding:4px 6px;color:var(--text3);font-size:12px";
    btns.appendChild(dots);
  }
  if (end < pages) addBtn(pages, pages, false, false);
  addBtn("›", currentPage + 1, false, currentPage === pages);
}

// ── MODAL ADD/EDIT ──
function openModal(id = null) {
  const modal = document.getElementById("formModal");
  const title = document.getElementById("modalTitle");
  clearFormErrors();

  if (id !== null) {
    const r = allData.find((x) => x.id === id);
    if (!r) return;
    title.textContent = "Edytuj wpis";
    document.getElementById("editId").value = r.id;
    document.getElementById("fieldDate").value = r.date;
    document.getElementById("fieldClient").value = r.client;
    document.getElementById("fieldWC").value = r.workCenter;
    document.getElementById("fieldRC").value = r.reasonCode;
  } else {
    title.textContent = "Dodaj wpis";
    document.getElementById("editId").value = "";
    document.getElementById("fieldDate").value = new Date()
      .toISOString()
      .slice(0, 10);
    document.getElementById("fieldClient").value = "";
    document.getElementById("fieldWC").value = "";
    document.getElementById("fieldRC").value = "";
  }

  modal.classList.add("open");
  setTimeout(() => document.getElementById("fieldDate").focus(), 100);
}

function closeModal() {
  document.getElementById("formModal").classList.remove("open");
}

function clearFormErrors() {
  ["Date", "Client", "WC", "RC"].forEach((f) => {
    document.getElementById("field" + f).classList.remove("error");
    document.getElementById("hint" + f).classList.remove("visible");
  });
}

function validateForm() {
  let ok = true;
  const checks = [
    {
      field: "fieldDate",
      hint: "hintDate",
      val: document.getElementById("fieldDate").value,
    },
    {
      field: "fieldClient",
      hint: "hintClient",
      val: document.getElementById("fieldClient").value,
    },
    {
      field: "fieldWC",
      hint: "hintWC",
      val: document.getElementById("fieldWC").value,
    },
    {
      field: "fieldRC",
      hint: "hintRC",
      val: document.getElementById("fieldRC").value,
    },
  ];
  checks.forEach(({ field, hint, val }) => {
    if (!val) {
      document.getElementById(field).classList.add("error");
      document.getElementById(hint).classList.add("visible");
      ok = false;
    }
  });
  return ok;
}

async function saveEntry() {
  clearFormErrors();
  if (!validateForm()) return;

  const id = document.getElementById("editId").value;
  const payload = {
    date: document.getElementById("fieldDate").value,
    client: document.getElementById("fieldClient").value,
    workCenter: +document.getElementById("fieldWC").value,
    reasonCode: +document.getElementById("fieldRC").value,
  };

  const saveBtn = document.getElementById("saveBtn");
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<div class="spinner"></div> Zapisywanie...';

  try {
    if (id) {
      await apiCall("UPDATE", { id: +id, ...payload });
      showToast("Wpis zaktualizowany", "success");
    } else {
      await apiCall("CREATE", payload);
      showToast("Wpis dodany", "success");
    }
    closeModal();
    await loadData();
  } catch (err) {
    showToast("Błąd zapisu: " + err.message, "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML =
      '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Zapisz';
  }
}

// ── MODAL DELETE ──
function openDeleteModal(id) {
  const r = allData.find((x) => x.id === id);
  if (!r) return;
  deleteTarget = id;
  document.getElementById("deleteDesc").innerHTML =
    `ID ${r.id} · ${r.date} · <strong>${r.client}</strong> · ${wcName(r.workCenter)} · ${rcName(r.reasonCode)}`;
  document.getElementById("deleteModal").classList.add("open");
}

function closeDeleteModal() {
  document.getElementById("deleteModal").classList.remove("open");
  deleteTarget = null;
}

async function confirmDelete() {
  if (!deleteTarget) return;
  const btn = document.getElementById("confirmDeleteBtn");
  btn.disabled = true;

  try {
    await apiCall("DELETE", { id: deleteTarget });
    showToast("Wpis usunięty", "success");
    closeDeleteModal();
    await loadData();
  } catch (err) {
    showToast("Błąd usuwania: " + err.message, "error");
  } finally {
    btn.disabled = false;
  }
}

// ── TOAST ──
let toastTimer = null;
function showToast(msg, type = "") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "visible" + (type ? " " + type : "");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 3000);
}

init();
