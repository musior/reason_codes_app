// ======================================================
// PERFORMANCE REASONS APP - FULL CRUD (API READY)
// Endpoint:
// /api/apps/performance/reasons/?key=XXX&type=GET
// ======================================================

// ---------------- CONFIG ----------------
const API_KEY = "K3hT9sYrP2nV8bNq";
const API_BASE = "/api/apps/performance/reasons/";

const PAGE_SIZE = 20;

// ---------------- STATIC DATA ----------------
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
];

// ---------------- STATE ----------------
let rows = [];
let filtered = [];
let currentPage = 1;
let editId = null;

// ---------------- HELPERS ----------------
const $ = (id) => document.getElementById(id);

function wcName(id) {
  return WORK_CENTERS.find((x) => x.id == id)?.name || `WC ${id}`;
}

function rcName(id) {
  return REASON_CODES.find((x) => x.id == id)?.name || `RC ${id}`;
}

function toast(msg, type = "ok") {
  const el = $("toast");
  if (!el) return alert(msg);

  el.innerText = msg;
  el.className = "toast show " + type;

  setTimeout(() => {
    el.className = "toast";
  }, 2500);
}

// ---------------- API ----------------
async function api(type, body = null) {
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

// ---------------- LOAD DATA ----------------
async function loadData() {
  try {
    setStatus("loading", "Ładowanie...");

    const data = await api("GET");

    rows = data.map((r) => ({
      id: r.id,
      date: r.date,
      client: r.client,
      work_center: r.work_center,
      reason_code: r.reason_code,
      created_at: r.created_at,
    }));

    filtered = [...rows];

    setStatus("ok", "Połączono");
    render();
    renderStats();
  } catch (err) {
    setStatus("err", "Błąd API");
    toast(err.message, "err");
    console.error(err);
  }
}

// ---------------- STATUS ----------------
function setStatus(type, txt) {
  const el = $("apiStatus");
  if (!el) return;

  el.innerText = txt;
  el.className = type;
}

// ---------------- RENDER ----------------
function render() {
  const tbody = $("tableBody");
  if (!tbody) return;

  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;

  const pageRows = filtered.slice(start, end);

  if (!pageRows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">Brak danych</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = pageRows
    .map(
      (r) => `
    <tr>
      <td>${r.id}</td>
      <td>${r.date}</td>
      <td>${r.client}</td>
      <td>${wcName(r.work_center)}</td>
      <td>${rcName(r.reason_code)}</td>
      <td>${r.created_at || "-"}</td>
      <td>
        <button onclick="openEdit(${r.id})">✏️</button>
        <button onclick="removeRow(${r.id})">🗑️</button>
      </td>
    </tr>
  `,
    )
    .join("");

  renderPagination();
}

// ---------------- PAGINATION ----------------
function renderPagination() {
  const el = $("pagination");
  if (!el) return;

  const pages = Math.ceil(filtered.length / PAGE_SIZE);

  let html = "";

  for (let i = 1; i <= pages; i++) {
    html += `
      <button onclick="goPage(${i})"
      class="${i === currentPage ? "active" : ""}">
      ${i}
      </button>
    `;
  }

  el.innerHTML = html;
}

function goPage(page) {
  currentPage = page;
  render();
}

// ---------------- FILTER ----------------
function filterRows() {
  const q = $("searchInput").value.toLowerCase();

  filtered = rows.filter((r) => {
    const text = `
      ${r.id}
      ${r.date}
      ${r.client}
      ${wcName(r.work_center)}
      ${rcName(r.reason_code)}
    `.toLowerCase();

    return text.includes(q);
  });

  currentPage = 1;
  render();
}

// ---------------- STATS ----------------
function renderStats() {
  if ($("statTotal")) $("statTotal").innerText = rows.length;
  if ($("stat3m"))
    $("stat3m").innerText = rows.filter((x) => x.client === "3M").length;
  if ($("statSol"))
    $("statSol").innerText = rows.filter(
      (x) => x.client === "Solventum",
    ).length;
}

// ---------------- CREATE ----------------
async function saveRow() {
  try {
    const payload = {
      date: $("fieldDate").value,
      client: $("fieldClient").value,
      work_center: Number($("fieldWC").value),
      reason_code: Number($("fieldRC").value),
    };

    if (!payload.date || !payload.client) {
      toast("Uzupełnij formularz", "err");
      return;
    }

    if (editId) {
      await api("UPDATE", {
        id: editId,
        ...payload,
      });

      toast("Zaktualizowano");
    } else {
      await api("CREATE", payload);
      toast("Dodano");
    }

    closeModal();
    await loadData();
  } catch (err) {
    toast(err.message, "err");
  }
}

// ---------------- EDIT ----------------
function openEdit(id) {
  const row = rows.find((x) => x.id == id);
  if (!row) return;

  editId = id;

  $("fieldDate").value = row.date;
  $("fieldClient").value = row.client;
  $("fieldWC").value = row.work_center;
  $("fieldRC").value = row.reason_code;

  openModal();
}

// ---------------- DELETE ----------------
async function removeRow(id) {
  if (!confirm("Usunąć wpis?")) return;

  try {
    await api("DELETE", { id });
    toast("Usunięto");
    await loadData();
  } catch (err) {
    toast(err.message, "err");
  }
}

// ---------------- MODAL ----------------
function openModal() {
  $("modal").style.display = "flex";
}

function closeModal() {
  $("modal").style.display = "none";
  editId = null;

  $("fieldDate").value = "";
  $("fieldClient").value = "";
  $("fieldWC").value = "";
  $("fieldRC").value = "";
}

// ---------------- SELECTS ----------------
function fillSelects() {
  $("fieldClient").innerHTML =
    `<option value="">Wybierz</option>` +
    CLIENTS.map((x) => `<option>${x}</option>`).join("");

  $("fieldWC").innerHTML =
    `<option value="">Wybierz</option>` +
    WORK_CENTERS.map((x) => `<option value="${x.id}">${x.name}</option>`).join(
      "",
    );

  $("fieldRC").innerHTML =
    `<option value="">Wybierz</option>` +
    REASON_CODES.map((x) => `<option value="${x.id}">${x.name}</option>`).join(
      "",
    );
}

// ---------------- INIT ----------------
function init() {
  fillSelects();
  loadData();

  if ($("searchInput")) {
    $("searchInput").addEventListener("input", filterRows);
  }
}

init();
