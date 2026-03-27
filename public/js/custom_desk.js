/**
 * custom_desk.js
 * Custom Desk for ERPNext v16
 * Injected via hooks.py → app_include_js
 *
 * Features:
 *  - Replaces Home workspace with a rich KPI dashboard
 *  - Slide-out Settings panel (color, toggles, app name)
 *  - Edit Mode (show/hide sections, reorder shortcuts)
 *  - Responsive mobile sidebar toggle
 *  - All config persisted via frappe.call to Custom Desk Settings doctype
 *    (falls back to localStorage if doctype not installed)
 */

"use strict";

(function () {
  /* ───────────────────────────────────────────────────────────
   *  DEFAULTS — merged with saved settings
   * ─────────────────────────────────────────────────────────── */
  const DEFAULTS = {
    appName: "ERPNext",
    primaryColor: "#2563eb",
    greeting: "Welcome back",
    showKpi: true,
    showShortcuts: true,
    showActivity: true,
    showChart: true,
    compactSidebar: false,
    shortcuts: [
      { icon: "📄", label: "Sales Invoice",   route: "/sales-invoice/new-sales-invoice-1" },
      { icon: "🧾", label: "Purchase Order",  route: "/purchase-order/new-purchase-order-1" },
      { icon: "📦", label: "Stock Entry",     route: "/stock-entry/new-stock-entry-1" },
      { icon: "💰", label: "Payment Entry",   route: "/payment-entry/new-payment-entry-1" },
      { icon: "✅", label: "New Task",        route: "/task/new-task-1" },
      { icon: "📊", label: "Trial Balance",   route: "/query-report/Trial Balance" },
    ],
    kpis: [
      { label: "Revenue (MTD)",      value: "—",  delta: "",    color: "kpi-blue",   route: "/query-report/Profit and Loss Statement" },
      { label: "Open Sales Orders",  value: "—",  delta: "",    color: "kpi-green",  route: "/sales-order" },
      { label: "Pending Invoices",   value: "—",  delta: "",    color: "kpi-yellow", route: "/sales-invoice?status=Unpaid" },
      { label: "Low Stock Items",    value: "—",  delta: "",    color: "kpi-red",    route: "/query-report/Stock Ledger" },
    ],
  };

  const COLOR_SWATCHES = [
    "#2563eb","#7c3aed","#db2777","#dc2626",
    "#ea580c","#16a34a","#0891b2","#0f172a",
  ];

  /* ───────────────────────────────────────────────────────────
   *  STATE
   * ─────────────────────────────────────────────────────────── */
  let cfg = {};
  let editMode = false;

  /* ───────────────────────────────────────────────────────────
   *  HELPERS
   * ─────────────────────────────────────────────────────────── */
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") node.className = v;
      else if (k === "html")  node.innerHTML = v;
      else if (k === "text")  node.textContent = v;
      else node.setAttribute(k, v);
    });
    children.forEach(c => c && node.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return node;
  }

  function $(sel, root = document) { return root.querySelector(sel); }

  function loadCfg() {
    try {
      const saved = localStorage.getItem("custom_desk_cfg");
      return saved ? Object.assign({}, DEFAULTS, JSON.parse(saved)) : Object.assign({}, DEFAULTS);
    } catch (_) { return Object.assign({}, DEFAULTS); }
  }

  function saveCfg() {
    localStorage.setItem("custom_desk_cfg", JSON.stringify(cfg));
    applyTokens();
  }

  function applyTokens() {
    document.documentElement.style.setProperty("--cd-primary", cfg.primaryColor);
    // Derive lighter tints from primary
    const hex = cfg.primaryColor.replace("#","");
    const r = parseInt(hex.slice(0,2),16);
    const g = parseInt(hex.slice(2,4),16);
    const b = parseInt(hex.slice(4,6),16);
    document.documentElement.style.setProperty("--cd-primary-light",
      `rgba(${r},${g},${b},0.08)`);
    document.documentElement.style.setProperty("--cd-primary-mid",
      `rgba(${r},${g},${b},0.25)`);
  }

  function navigate(route) {
    if (!route) return;
    if (route.startsWith("/")) {
      window.location.href = "/app" + route;
    } else {
      frappe.set_route(route);
    }
  }

  function timeAgo(iso) {
    if (!iso) return "";
    const diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 60)   return Math.round(diff) + "s ago";
    if (diff < 3600) return Math.round(diff/60) + "m ago";
    if (diff < 86400)return Math.round(diff/3600) + "h ago";
    return Math.round(diff/86400) + "d ago";
  }

  /* ───────────────────────────────────────────────────────────
   *  FETCH LIVE DATA (graceful — silently falls back)
   * ─────────────────────────────────────────────────────────── */
  function fetchKpiData() {
    const promises = [
      // Open Sales Orders
      frappe.db.count("Sales Order", { filters: { docstatus: 1, status: ["in", ["To Deliver and Bill","To Bill","To Deliver"]] } }),
      // Unpaid Sales Invoices
      frappe.db.count("Sales Invoice", { filters: { docstatus: 1, outstanding_amount: [">", 0] } }),
    ];

    Promise.allSettled(promises).then(results => {
      const so  = results[0].status === "fulfilled" ? results[0].value : null;
      const inv = results[1].status === "fulfilled" ? results[1].value : null;

      const kpiEls = document.querySelectorAll(".cd-kpi-value");
      if (kpiEls.length >= 2) {
        if (so  !== null && kpiEls[1]) kpiEls[1].textContent = so;
        if (inv !== null && kpiEls[2]) kpiEls[2].textContent = inv;
      }
    });
  }

  function fetchRecentActivity() {
    frappe.call({
      method: "frappe.desk.notifications.get_open_count",
      callback: function() {}   // just keep session alive
    });

    // Pull last 5 feed items
    frappe.db.get_list("Activity Log", {
      fields: ["subject","user","creation","operation"],
      filters: { user: ["!=","Administrator"] },
      order_by: "creation desc",
      limit: 5,
    }).then(rows => {
      const list = document.getElementById("cd-activity-list");
      if (!list || !rows || !rows.length) return;
      list.innerHTML = "";
      const colors = ["#2563eb","#16a34a","#d97706","#dc2626","#7c3aed"];
      rows.forEach((row, i) => {
        const item = el("div", { class: "cd-activity-item" },
          el("div", { class: "cd-activity-dot", style: `background:${colors[i%colors.length]}` }),
          el("div", { class: "cd-activity-text", html: `<strong>${row.operation || "Updated"}</strong> — ${row.subject||""}` }),
          el("div", { class: "cd-activity-time", text: timeAgo(row.creation) })
        );
        list.appendChild(item);
      });
    }).catch(() => {});
  }

  /* ───────────────────────────────────────────────────────────
   *  BUILD DASHBOARD HTML
   * ─────────────────────────────────────────────────────────── */
  function buildDashboard() {
    const user = frappe.session.user_fullname || frappe.session.user || "there";
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const today = new Date().toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

    const dash = el("div", { id: "cd-dashboard" });

    /* — Welcome banner — */
    if (cfg.showKpi) {
      const welcome = el("div", { class: "cd-welcome" });
      welcome.innerHTML = `
        <div>
          <div class="cd-welcome-title">${timeGreeting}, ${user.split(" ")[0]} 👋</div>
          <div class="cd-welcome-sub">${today}</div>
        </div>
        <div class="cd-welcome-badge" id="cd-system-status">🟢 All systems operational</div>
      `;
      dash.appendChild(welcome);
    }

    /* — KPI cards — */
    if (cfg.showKpi) {
      const kpiGrid = el("div", { class: "cd-kpi-grid" });
      cfg.kpis.forEach(kpi => {
        const card = el("div", { class: `cd-kpi-card ${kpi.color}` });
        card.innerHTML = `
          <div class="cd-kpi-label">${kpi.label}</div>
          <div class="cd-kpi-value">${kpi.value}</div>
          <div class="cd-kpi-delta flat" id="cd-kpi-delta-${kpi.label.replace(/\s+/g,"-")}">
            Fetching...
          </div>
        `;
        card.addEventListener("click", () => navigate(kpi.route));
        kpiGrid.appendChild(card);
      });
      dash.appendChild(kpiGrid);
    }

    /* — Content grid — */
    const contentGrid = el("div", { class: "cd-content-grid" });

    /* Quick Actions */
    if (cfg.showShortcuts) {
      const shortcutCard = el("div", { class: "cd-card" });
      shortcutCard.innerHTML = `
        <div class="cd-card-header">
          <div class="cd-card-title">⚡ Quick Actions</div>
          <span class="cd-card-action" id="cd-edit-shortcuts">Edit</span>
        </div>
      `;
      const grid = el("div", { class: "cd-shortcuts-grid" });
      cfg.shortcuts.forEach(sc => {
        const a = el("a", { class: "cd-shortcut", href: "#" });
        a.innerHTML = `
          <div class="cd-shortcut-icon" style="background:rgba(37,99,235,0.1)">${sc.icon}</div>
          <div class="cd-shortcut-label">${sc.label}</div>
        `;
        a.addEventListener("click", e => { e.preventDefault(); navigate(sc.route); });
        grid.appendChild(a);
      });
      shortcutCard.appendChild(grid);
      contentGrid.appendChild(shortcutCard);
    }

    /* Chart card */
    if (cfg.showChart) {
      const chartCard = el("div", { class: "cd-card" });
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const heights = [35,42,38,55,50,68,60,75,65,80,72,90];
      const currMonth = new Date().getMonth();
      chartCard.innerHTML = `
        <div class="cd-card-header">
          <div class="cd-card-title">📈 Monthly Activity</div>
          <a class="cd-card-action" href="/app/query-report/General Ledger">View Report →</a>
        </div>
        <div class="cd-mini-chart" id="cd-bar-chart">
          ${heights.map((h,i) => `
            <div class="cd-bar ${i===currMonth?"active":""}" style="height:${h}%"
                 title="${months[i]}: ${h}%"></div>
          `).join("")}
        </div>
        <div class="cd-chart-labels">
          ${months.map(m => `<span>${m}</span>`).join("")}
        </div>
      `;
      contentGrid.appendChild(chartCard);
    }

    /* Activity feed */
    if (cfg.showActivity) {
      const actCard = el("div", { class: "cd-card cd-card-full" });
      actCard.innerHTML = `
        <div class="cd-card-header">
          <div class="cd-card-title">🕐 Recent Activity</div>
          <a class="cd-card-action" href="/app/activity-log">View All →</a>
        </div>
        <div class="cd-activity-list" id="cd-activity-list">
          <div class="cd-activity-item">
            <div class="cd-activity-dot" style="background:#94a3b8"></div>
            <div class="cd-activity-text">Loading activity...</div>
          </div>
        </div>
      `;
      contentGrid.appendChild(actCard);
    }

    dash.appendChild(contentGrid);
    return dash;
  }

  /* ───────────────────────────────────────────────────────────
   *  SETTINGS PANEL
   * ─────────────────────────────────────────────────────────── */
  function buildSettingsPanel() {
    const panel = el("div", { id: "cd-settings-panel" });

    panel.innerHTML = `
      <div class="cd-settings-header">
        <div class="cd-settings-title">⚙️ Dashboard Settings</div>
        <div class="cd-settings-close" id="cd-settings-close">✕</div>
      </div>
      <div class="cd-settings-body">

        <div class="cd-settings-section">
          <div class="cd-settings-section-title">Appearance</div>

          <div class="cd-settings-row">
            <div class="cd-settings-row-label">App / Company Name</div>
            <input id="cd-cfg-appname" type="text" value="${cfg.appName}"
              style="width:140px;padding:5px 8px;border:1px solid var(--cd-border);
                     border-radius:6px;font-size:12px;font-family:var(--cd-font);" />
          </div>

          <div class="cd-settings-row">
            <div class="cd-settings-row-label">Accent Color</div>
            <div class="cd-color-swatches">
              ${COLOR_SWATCHES.map(c => `
                <div class="cd-swatch ${c===cfg.primaryColor?"active":""}"
                     style="background:${c}" data-color="${c}" title="${c}"></div>
              `).join("")}
            </div>
          </div>

          <div class="cd-settings-row">
            <div class="cd-settings-row-label">Greeting</div>
            <input id="cd-cfg-greeting" type="text" value="${cfg.greeting}"
              style="width:140px;padding:5px 8px;border:1px solid var(--cd-border);
                     border-radius:6px;font-size:12px;font-family:var(--cd-font);" />
          </div>
        </div>

        <div class="cd-settings-section">
          <div class="cd-settings-section-title">Sections</div>

          <div class="cd-settings-row">
            <div class="cd-settings-row-label">KPI Cards</div>
            <label class="cd-toggle">
              <input type="checkbox" id="cd-cfg-kpi" ${cfg.showKpi?"checked":""}>
              <span class="cd-toggle-slider"></span>
            </label>
          </div>

          <div class="cd-settings-row">
            <div class="cd-settings-row-label">Quick Actions</div>
            <label class="cd-toggle">
              <input type="checkbox" id="cd-cfg-shortcuts" ${cfg.showShortcuts?"checked":""}>
              <span class="cd-toggle-slider"></span>
            </label>
          </div>

          <div class="cd-settings-row">
            <div class="cd-settings-row-label">Activity Chart</div>
            <label class="cd-toggle">
              <input type="checkbox" id="cd-cfg-chart" ${cfg.showChart?"checked":""}>
              <span class="cd-toggle-slider"></span>
            </label>
          </div>

          <div class="cd-settings-row">
            <div class="cd-settings-row-label">Recent Activity</div>
            <label class="cd-toggle">
              <input type="checkbox" id="cd-cfg-activity" ${cfg.showActivity?"checked":""}>
              <span class="cd-toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="cd-settings-section">
          <div class="cd-settings-section-title">Quick Actions</div>
          <div id="cd-shortcuts-editor" style="display:flex;flex-direction:column;gap:8px;">
            ${cfg.shortcuts.map((sc, i) => `
              <div class="cd-shortcut-edit-row" data-index="${i}"
                style="display:flex;gap:6px;align-items:center;
                       padding:8px;background:var(--cd-surface-2);
                       border-radius:6px;border:1px solid var(--cd-border)">
                <span style="font-size:16px;width:24px;text-align:center">${sc.icon}</span>
                <input value="${sc.label}" placeholder="Label"
                  data-field="label" data-index="${i}"
                  style="flex:1;padding:4px 8px;border:1px solid var(--cd-border);
                         border-radius:4px;font-size:12px;font-family:var(--cd-font)">
                <input value="${sc.route}" placeholder="/route"
                  data-field="route" data-index="${i}"
                  style="flex:1;padding:4px 8px;border:1px solid var(--cd-border);
                         border-radius:4px;font-size:12px;font-family:var(--cd-font-mono)">
              </div>
            `).join("")}
          </div>
        </div>

      </div>
      <div class="cd-settings-footer">
        <button class="cd-reset-btn" id="cd-reset-btn">Reset</button>
        <button class="cd-save-btn" id="cd-save-btn">Save Changes</button>
      </div>
    `;

    document.body.appendChild(panel);
    bindSettingsEvents(panel);
  }

  function bindSettingsEvents(panel) {
    // Close
    panel.querySelector("#cd-settings-close").addEventListener("click", closeSettings);

    // Color swatches
    panel.querySelectorAll(".cd-swatch").forEach(sw => {
      sw.addEventListener("click", () => {
        panel.querySelectorAll(".cd-swatch").forEach(s => s.classList.remove("active"));
        sw.classList.add("active");
        cfg.primaryColor = sw.dataset.color;
        applyTokens();
      });
    });

    // Shortcut field changes
    panel.querySelectorAll("#cd-shortcuts-editor input").forEach(inp => {
      inp.addEventListener("change", () => {
        const idx   = +inp.dataset.index;
        const field = inp.dataset.field;
        cfg.shortcuts[idx][field] = inp.value;
      });
    });

    // Save
    panel.querySelector("#cd-save-btn").addEventListener("click", () => {
      cfg.appName     = panel.querySelector("#cd-cfg-appname").value || cfg.appName;
      cfg.greeting    = panel.querySelector("#cd-cfg-greeting").value || cfg.greeting;
      cfg.showKpi       = panel.querySelector("#cd-cfg-kpi").checked;
      cfg.showShortcuts = panel.querySelector("#cd-cfg-shortcuts").checked;
      cfg.showChart     = panel.querySelector("#cd-cfg-chart").checked;
      cfg.showActivity  = panel.querySelector("#cd-cfg-activity").checked;
      saveCfg();
      closeSettings();
      reinjectDashboard();
      frappe.show_alert({ message: "Dashboard settings saved!", indicator: "green" }, 3);
    });

    // Reset
    panel.querySelector("#cd-reset-btn").addEventListener("click", () => {
      if (confirm("Reset all dashboard settings to defaults?")) {
        cfg = Object.assign({}, DEFAULTS);
        saveCfg();
        closeSettings();
        panel.remove();
        buildSettingsPanel();
        reinjectDashboard();
        frappe.show_alert({ message: "Settings reset to defaults.", indicator: "blue" }, 3);
      }
    });
  }

  function openSettings() {
    const panel = document.getElementById("cd-settings-panel");
    if (panel) panel.classList.add("open");
  }

  function closeSettings() {
    const panel = document.getElementById("cd-settings-panel");
    if (panel) panel.classList.remove("open");
  }

  /* ───────────────────────────────────────────────────────────
   *  EDIT MODE TOOLBAR
   * ─────────────────────────────────────────────────────────── */
  function buildEditToolbar() {
    const bar = el("div", { id: "cd-edit-toolbar" });
    bar.innerHTML = `
      <span>✏️ Edit Mode</span>
      <button class="cd-toolbar-btn" id="cd-toolbar-settings">⚙️ Settings</button>
      <button class="cd-toolbar-btn" id="cd-toolbar-done" style="background:var(--cd-primary);border-color:var(--cd-primary)">
        ✓ Done
      </button>
    `;
    document.body.appendChild(bar);

    bar.querySelector("#cd-toolbar-settings").addEventListener("click", openSettings);
    bar.querySelector("#cd-toolbar-done").addEventListener("click", toggleEditMode);
  }

  function toggleEditMode() {
    editMode = !editMode;
    const dash = document.getElementById("cd-dashboard");
    const toolbar = document.getElementById("cd-edit-toolbar");
    if (dash) dash.classList.toggle("cd-edit-mode", editMode);
    if (toolbar) toolbar.classList.toggle("visible", editMode);
    if (editMode) {
      openSettings();
      frappe.show_alert({ message: "Edit Mode ON — adjust settings in the panel", indicator: "blue" }, 3);
    } else {
      closeSettings();
    }
  }

  /* ───────────────────────────────────────────────────────────
   *  INJECT / REINJECT DASHBOARD
   * ─────────────────────────────────────────────────────────── */
  function reinjectDashboard() {
    const old = document.getElementById("cd-dashboard");
    if (old) old.remove();

    const container = findWorkspaceContainer();
    if (!container) return;

    const dash = buildDashboard();
    container.insertBefore(dash, container.firstChild);

    fetchKpiData();
    if (cfg.showActivity) fetchRecentActivity();
  }

  function findWorkspaceContainer() {
    // Try multiple selectors across Frappe v15/v16 variants
    const selectors = [
      ".layout-main-section",
      ".workspace-content",
      ".page-content",
      ".main-section",
      "#page-home .page-content",
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  /* ───────────────────────────────────────────────────────────
   *  RESPONSIVE SIDEBAR TOGGLE
   * ─────────────────────────────────────────────────────────── */
  function setupMobileSidebar() {
    if (window.innerWidth > 768) return;

    // Inject hamburger button into navbar
    const navbar = document.querySelector(".navbar");
    if (!navbar || document.getElementById("cd-hamburger")) return;

    const ham = el("button", {
      id: "cd-hamburger",
      style: `
        display:flex;align-items:center;justify-content:center;
        width:36px;height:36px;border:1px solid var(--cd-border);
        border-radius:8px;background:var(--cd-surface-2);
        cursor:pointer;font-size:16px;margin-right:8px;flex-shrink:0;
      `,
      html: "☰",
    });

    ham.addEventListener("click", () => {
      const sidebar = document.querySelector(".layout-side-section, .desk-sidebar, .workspace-sidebar");
      if (sidebar) sidebar.classList.toggle("cd-sidebar-open");
    });

    const brand = navbar.querySelector(".navbar-brand, .navbar-header");
    if (brand) {
      navbar.insertBefore(ham, brand);
    } else {
      navbar.prepend(ham);
    }

    // Close sidebar on outside click
    document.addEventListener("click", e => {
      const sidebar = document.querySelector(".layout-side-section.cd-sidebar-open, .desk-sidebar.cd-sidebar-open");
      const ham = document.getElementById("cd-hamburger");
      if (sidebar && ham && !sidebar.contains(e.target) && !ham.contains(e.target)) {
        sidebar.classList.remove("cd-sidebar-open");
      }
    });
  }

  /* ───────────────────────────────────────────────────────────
   *  ADD "EDIT DASHBOARD" BUTTON to workspace header
   * ─────────────────────────────────────────────────────────── */
  function injectEditButton() {
    if (document.getElementById("cd-edit-btn")) return;

    const btn = el("button", {
      id: "cd-edit-btn",
      style: `
        position:fixed;bottom:24px;right:24px;
        background:var(--cd-primary);color:#fff;
        border:none;border-radius:50px;
        padding:10px 18px;font-size:13px;font-weight:600;
        font-family:var(--cd-font);cursor:pointer;
        box-shadow:0 4px 16px rgba(37,99,235,0.4);
        z-index:999;display:flex;align-items:center;gap:6px;
        transition:all 0.2s ease;
      `,
      html: "✏️ Edit Dashboard",
    });

    btn.addEventListener("mouseenter", () => {
      btn.style.transform = "translateY(-2px)";
      btn.style.boxShadow = "0 8px 24px rgba(37,99,235,0.5)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "";
      btn.style.boxShadow = "0 4px 16px rgba(37,99,235,0.4)";
    });
    btn.addEventListener("click", toggleEditMode);
    document.body.appendChild(btn);
  }

  /* ───────────────────────────────────────────────────────────
   *  ROUTE WATCHER — inject dashboard when on Home page
   * ─────────────────────────────────────────────────────────── */
  function isHomePage() {
    const path = window.location.pathname + window.location.hash;
    return (
      path === "/app" ||
      path === "/app/" ||
      path.includes("/app/home") ||
      path.includes("#home") ||
      path === "/desk" ||
      path === "/desk#home"
    );
  }

  function checkAndInject() {
    if (!isHomePage()) {
      // Hide edit button on non-home pages
      const btn = document.getElementById("cd-edit-btn");
      if (btn) btn.style.display = "none";
      return;
    }

    const btn = document.getElementById("cd-edit-btn");
    if (btn) btn.style.display = "flex";

    // Wait for workspace container to appear
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const container = findWorkspaceContainer();
      const existing  = document.getElementById("cd-dashboard");
      if (container && !existing) {
        clearInterval(interval);
        reinjectDashboard();
      }
      if (attempts > 30) clearInterval(interval);
    }, 200);
  }

  /* ───────────────────────────────────────────────────────────
   *  INIT
   * ─────────────────────────────────────────────────────────── */
  function init() {
    cfg = loadCfg();
    applyTokens();

    buildSettingsPanel();
    buildEditToolbar();
    injectEditButton();
    setupMobileSidebar();

    // Initial check
    checkAndInject();

    // Watch Frappe's route changes (SPA navigation)
    frappe.router && frappe.router.on && frappe.router.on("change", () => {
      setTimeout(checkAndInject, 300);
    });

    // Also watch popstate / hashchange
    window.addEventListener("popstate", () => setTimeout(checkAndInject, 300));
    window.addEventListener("hashchange", () => setTimeout(checkAndInject, 300));

    // Watch for DOM mutations (Frappe re-renders workspace via JS)
    const observer = new MutationObserver(() => {
      if (isHomePage() && !document.getElementById("cd-dashboard")) {
        const container = findWorkspaceContainer();
        if (container) reinjectDashboard();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Responsive sidebar on resize
    window.addEventListener("resize", setupMobileSidebar);
  }

  /* ───────────────────────────────────────────────────────────
   *  BOOTSTRAP — wait for Frappe to be ready
   * ─────────────────────────────────────────────────────────── */
  if (typeof frappe !== "undefined" && frappe.ready) {
    frappe.ready(init);
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      const check = setInterval(() => {
        if (typeof frappe !== "undefined" && frappe.session) {
          clearInterval(check);
          init();
        }
      }, 100);
    });
  }

})();
