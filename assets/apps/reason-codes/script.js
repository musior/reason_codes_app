// =======================================================
// SCRIPT.JS - FULLY COMPATIBLE WITH YOUR CURRENT INDEX.HTML
// Keeps your original HTML ids/functions:
// saveEntry(), confirmDelete(), openDeleteModal(),
// formModal, deleteModal, toast etc.
// =======================================================

// ---------------- CONFIG ----------------
const API_KEY = "K3hT9sYrP2nV8bNq";
const API_BASE = "/api/apps/performance/reasons/";
const PAGE_SIZE = 20;

// ---------------- DATA ----------------
const CLIENTS = ["3M", "Solventum"];

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
  { id: 14, name: "Rozdrobnienie Pickingu" },
  { id: 15, name: "Niewykwalifikowani pracownicy" },
  { id: 16, name: "Zamówienia drobnicowe" },
  { id: 17, name: "Zgrzewy - wysoki wolumen" },
  { id: 18, name: "Instrukcje - wysoki wolumen" },
  { id: 19, name: "Niski wolumen" },
  { id: 20, name: "Opóźnienie w pickingu" },
  { id: 21, name: "Problem ze specufikacjami/przewoźnikami" },
  { id: 22, name: "Ograniczona ilość miejsca odstawczego" },
];

// ---------------- STATE ----------------
let allData = [];
let filtered = [];
let currentPage = 1;
let editId = null;
let deleteTarget = null;

// ---------------- HELPERS ----------------
const $ = (id) => document.getElementById(id);

const wcName = (id) => WORK_CENTERS.find((x) => x.id == id)?.name || `WC ${id}`;

const rcName = (id) => REASON_CODES.find((x) => x.id == id)?.name || `RC ${id}`;

// ---------------- TOAST ----------------
let toastTimer = null;

function showToast(msg, type = "") {
  const el = $("toast");
  if (!el) return alert(msg);

  el.textContent = msg;
  el.className = "visible " + type;

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    el.className = "";
  }, 3000);
}

// ---------------- STATUS ----------------
function setApiStatus(status, txt) {
  if (!$("apiDot") || !$("apiLabel")) return;

  $("apiDot").className = "api-dot " + status;
  $("apiLabel").textContent = txt;
}

// ---------------- API ----------------
async function apiCall(type, body = null) {
  const url = `${API_BASE}?key=${API_KEY}&type=${type}`;

  const options = {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return await res.json();
}

// ---------------- LOAD ----------------
async function loadData() {
  try {
    setApiStatus("loading", "Ładowanie...");

    const raw = await apiCall("GET");

    allData = raw.map((r) => ({
      id: r.id,
      date: r.date,
      client: r.client,
      workCenter: r.work_center,
      reasonCode: r.reason_code,
      createdAt: r.created_at,
    }));

    filtered = [...allData];

    renderTable();
    updateStats();

    setApiStatus("ok", "API połączone");
  } catch (err) {
    console.error(err);
    setApiStatus("err", "Błąd API");
    showToast(err.message, "error");
  }
}

// ---------------- STATS ----------------
function updateStats() {
  if ($("statTotal")) $("statTotal").textContent = allData.length;
  if ($("stat3m"))
    $("stat3m").textContent = allData.filter((x) => x.client === "3M").length;

  if ($("statSol"))
    $("statSol").textContent = allData.filter(
      (x) => x.client === "Solventum",
    ).length;
}

// ---------------- FILTER ----------------
function applyFilters() {
  const q = $("searchInput")?.value.toLowerCase() || "";
  const client = $("filterClient")?.value || "";
  const wc = $("filterWC")?.value || "";
  const rc = $("filterRC")?.value || "";
  const month = $("filterMonth")?.value || "";

  filtered = allData.filter((r) => {
    if (client && r.client !== client) return false;
    if (wc && String(r.workCenter) !== wc) return false;
    if (rc && String(r.reasonCode) !== rc) return false;
    if (month && !r.date.startsWith(month)) return false;

    const txt = `
      ${r.id}
      ${r.date}
      ${r.client}
      ${wcName(r.workCenter)}
      ${rcName(r.reasonCode)}
    `.toLowerCase();

    if (q && !txt.includes(q)) return false;

    return true;
  });

  currentPage = 1;
  renderTable();
}

// ---------------- TABLE ----------------
function renderTable() {
  const tbody = $("tableBody");
  if (!tbody) return;

  const start = (currentPage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  if (!rows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">Brak danych</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows
    .map(
      (r) => `
    <tr>
      <td>${r.id}</td>
      <td>${r.date}</td>
      <td>${r.client}</td>
      <td>${wcName(r.workCenter)}</td>
      <td>${rcName(r.reasonCode)}</td>
      <td>${r.createdAt || "-"}</td>
      <td>
        <button onclick="openModal(${r.id})">✏️</button>
        <button onclick="openDeleteModal(${r.id})">🗑️</button>
      </td>
    </tr>
  `,
    )
    .join("");

  renderPagination();
}

// ---------------- PAGINATION ----------------
function renderPagination() {
  const el = $("pageBtns");
  if (!el) return;

  const pages = Math.ceil(filtered.length / PAGE_SIZE);

  let html = "";

  for (let i = 1; i <= pages; i++) {
    html += `
      <button class="page-btn ${i === currentPage ? "active" : ""}"
      onclick="goPage(${i})">${i}</button>
    `;
  }

  el.innerHTML = html;

  if ($("pageInfo")) {
    $("pageInfo").textContent = `${filtered.length} wpisów`;
  }
}

function goPage(page) {
  currentPage = page;
  renderTable();
}

// ---------------- MODAL ADD / EDIT ----------------
function openModal(id = null) {
  editId = id;

  if (id) {
    const row = allData.find((x) => x.id == id);

    $("editId").value = row.id;
    $("fieldDate").value = row.date;
    $("fieldClient").value = row.client;
    $("fieldWC").value = row.workCenter;
    $("fieldRC").value = row.reasonCode;
  } else {
    $("editId").value = "";
    $("fieldDate").value = "";
    $("fieldClient").value = "";
    $("fieldWC").value = "";
    $("fieldRC").value = "";
  }

  $("formModal").classList.add("open");
}

function closeModal() {
  $("formModal").classList.remove("open");
  editId = null;
}

// ---------------- SAVE ----------------
async function saveEntry() {
  try {
    const payload = {
      date: $("fieldDate").value,
      client: $("fieldClient").value,
      work_center: Number($("fieldWC").value),
      reason_code: Number($("fieldRC").value),
    };

    if (!payload.date || !payload.client) {
      showToast("Uzupełnij formularz", "error");
      return;
    }

    if (editId) {
      await apiCall("UPDATE", {
        id: editId,
        ...payload,
      });

      showToast("Zaktualizowano", "success");
    } else {
      await apiCall("CREATE", payload);
      showToast("Dodano", "success");
    }

    closeModal();
    await loadData();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ---------------- DELETE ----------------
function openDeleteModal(id) {
  deleteTarget = id;
  $("deleteModal").classList.add("open");
}

function closeDeleteModal() {
  $("deleteModal").classList.remove("open");
  deleteTarget = null;
}

async function confirmDelete() {
  if (!deleteTarget) return;

  try {
    await apiCall("DELETE", { id: deleteTarget });

    showToast("Usunięto", "success");

    closeDeleteModal();
    await loadData();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ---------------- SELECTS ----------------
function populateSelects() {
  if ($("fieldClient")) {
    $("fieldClient").innerHTML =
      `<option value="">Wybierz</option>` +
      CLIENTS.map((x) => `<option value="${x}">${x}</option>`).join("");
  }

  if ($("fieldWC")) {
    $("fieldWC").innerHTML =
      `<option value="">Wybierz</option>` +
      WORK_CENTERS.map(
        (x) => `<option value="${x.id}">${x.name}</option>`,
      ).join("");
  }

  if ($("fieldRC")) {
    $("fieldRC").innerHTML =
      `<option value="">Wybierz</option>` +
      REASON_CODES.map(
        (x) => `<option value="${x.id}">${x.name}</option>`,
      ).join("");
  }

  // Filtry
  if ($("filterWC")) {
    $("filterWC").innerHTML =
      `<option value="">Wszystkie Work Centers</options>` +
      WORK_CENTERS.map(
        (x) => `<option value="${x.id}">${x.name}</option>`,
      ).join("");
  }

  if ($("filterRC")) {
    $("filterRC").innerHTML =
      `<option value="">Wszystkie Reason Codes</option>` +
      REASON_CODES.map(
        (x) => `<option value="${x.id}">${x.name}</option>`,
      ).join("");
  }
}

// ---------------- INIT ----------------
function init() {
  populateSelects();
  loadData();

  if ($("searchInput")) {
    $("searchInput").addEventListener("input", applyFilters);
  }

  if ($("filterClient")) {
    $("filterClient").addEventListener("change", applyFilters);
  }

  if ($("filterWC")) {
    $("filterWC").addEventListener("change", applyFilters);
  }

  if ($("filterRC")) {
    $("filterRC").addEventListener("change", applyFilters);
  }

  if ($("filterMonth")) {
    $("filterMonth").addEventListener("change", applyFilters);
  }
}

init();
