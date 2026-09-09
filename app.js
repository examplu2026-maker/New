// ============================================================
// EXAMPLUS — shared app logic
// Handles: API calls to Apps Script, session storage, and
// building the role-based navigation on the dashboard.
// ============================================================

const SESSION_KEY = "examplus_session";

// ---- API ----

async function apiCall(payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    // Apps Script Web Apps prefer text/plain to avoid CORS preflight issues
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  return res.json();
}

// Wraps apiCall to automatically attach the signed-in user's username
// and school, which the backend uses for its permission checks.
async function apiCallAsUser(action, extra) {
  const session = getSession();
  if (!session) throw new Error("Not signed in");
  return apiCall(Object.assign(
    { action, username: session.username, school: session.school },
    extra || {}
  ));
}

// ---- Session ----

function saveSession(data) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function requireSession() {
  const session = getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }
  return session;
}

// ---- Navigation config per role ----
// Each entry: { id, label, icon }. "icon" is a single glyph so no icon
// library is needed — keeps this deployable as plain static files.

const NAV_BY_ROLE = {
  SuperAdmin: [
    { id: "overview", label: "Overview", icon: "◆" },
    { id: "schools", label: "Schools", icon: "▦" },
    { id: "students", label: "Students", icon: "☰" },
    { id: "scores", label: "Scores", icon: "✎" },
    { id: "reportcards", label: "Report Cards", icon: "▤" },
    { id: "promotion", label: "Promotion", icon: "↑" },
    { id: "fees", label: "Fees", icon: "₦" }
  ],
  SchoolAdmin: [
    { id: "overview", label: "Overview", icon: "◆" },
    { id: "students", label: "Students", icon: "☰" },
    { id: "scores", label: "Scores", icon: "✎" },
    { id: "reportcards", label: "Report Cards", icon: "▤" },
    { id: "promotion", label: "Promotion", icon: "↑" },
    { id: "fees", label: "Fees", icon: "₦" }
  ],
  Bursar: [
    { id: "overview", label: "Overview", icon: "◆" },
    { id: "fees", label: "Fees", icon: "₦" }
  ],
  Teacher: [
    { id: "overview", label: "Overview", icon: "◆" },
    { id: "scores", label: "Scores", icon: "✎" }
  ]
};

function initDashboard(session) {
  document.getElementById("sidebarName").textContent = session.name || session.username;
  document.getElementById("sidebarRole").textContent = session.role;
  document.getElementById("topbarSchool").textContent =
    session.school === "ALL" ? "All schools" : session.school;

  document.getElementById("signoutBtn").addEventListener("click", () => {
    clearSession();
    window.location.href = "index.html";
  });

  const items = NAV_BY_ROLE[session.role] || [];
  const nav = document.getElementById("nav");
  const tabbar = document.getElementById("tabbar");
  const panels = document.getElementById("panels");
  const pageTitle = document.getElementById("pageTitle");

  // Build sidebar nav + mobile tab bar
  items.forEach((item, idx) => {
    const navBtn = document.createElement("button");
    navBtn.className = "nav-item" + (idx === 0 ? " active" : "");
    navBtn.dataset.panel = item.id;
    navBtn.innerHTML = `<span>${item.icon}</span><span>${item.label}</span>`;
    navBtn.addEventListener("click", () => showPanel(item.id));
    nav.appendChild(navBtn);

    const tabBtn = document.createElement("button");
    tabBtn.className = idx === 0 ? "active" : "";
    tabBtn.dataset.panel = item.id;
    tabBtn.innerHTML = `<div>${item.icon}</div><div>${item.label}</div>`;
    tabBtn.addEventListener("click", () => showPanel(item.id));
    tabbar.appendChild(tabBtn);

    // Build the panel content (defined per-role in panels.js)
    const panelEl = document.createElement("section");
    panelEl.className = "panel" + (idx === 0 ? " active" : "");
    panelEl.id = "panel-" + item.id;
    panelEl.innerHTML = renderPanel(item.id, session);
    panels.appendChild(panelEl);
  });

  function showPanel(id) {
    document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active", p.id === "panel-" + id));
    document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.panel === id));
    document.querySelectorAll(".tabbar button").forEach(b => b.classList.toggle("active", b.dataset.panel === id));
    const found = items.find(i => i.id === id);
    if (found) pageTitle.textContent = found.label;
    wirePanel(id, session);
  }

  pageTitle.textContent = items[0] ? items[0].label : "Overview";
  if (items[0]) wirePanel(items[0].id, session);
}

// ---- Small shared UI helpers used across panels.js ----

function showStatus(el, message, ok) {
  el.textContent = message;
  el.className = "status-msg show " + (ok ? "ok" : "err");
}

function formatDate(d) {
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
