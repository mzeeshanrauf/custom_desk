# Custom Desk for ERPNext v16

A **drop-in Frappe app** that replaces the default ERPNext v16 desk with a clean, modern **light-theme dashboard** — globally applied to all users, no per-role setup required.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🎨 **Light Theme** | Clean white/blue design across navbar, sidebar, cards, forms, tables |
| 📊 **KPI Dashboard** | Live counts for Sales Orders, Invoices, Stock alerts |
| ⚡ **Quick Actions** | Configurable shortcut buttons to your most-used doctypes |
| 📈 **Activity Chart** | Monthly bar chart (links to General Ledger report) |
| 🕐 **Activity Feed** | Real-time feed from ERPNext Activity Log |
| ✏️ **Edit Mode** | Floating "Edit Dashboard" button → slide-out settings panel |
| 🔁 **Toggle Sections** | Show/hide KPIs, shortcuts, chart, activity per user |
| 🎨 **Color Picker** | 8 accent colors, applied instantly site-wide |
| 📱 **Responsive** | Mobile sidebar toggle, stacked cards on small screens |
| ♿ **Accessible** | Proper focus rings, contrast ratios, keyboard-navigable |

---

## 📦 Installation

### Prerequisites
- ERPNext v16 installed and running
- `bench` CLI available
- SSH access to the Frappe server

### Step 1 — Copy the app into your bench

```bash
# From your bench directory (e.g., /home/frappe/frappe-bench)
cp -r /path/to/custom_desk ./apps/custom_desk
```

Or clone if you host it on git:
```bash
bench get-app https://github.com/your-org/custom_desk
```

### Step 2 — Install on your site

```bash
bench --site your-site.com install-app custom_desk
```

### Step 3 — Build assets

```bash
bench build --app custom_desk
```

### Step 4 — Restart & clear cache

```bash
bench restart
bench --site your-site.com clear-cache
```

### Step 5 — Reload the browser

Open ERPNext in your browser. The new dashboard appears automatically on the Home page.

---

## 🎛️ Customization

### Via the Settings Panel (no code needed)

1. Log in to ERPNext and go to the **Home** page
2. Click the **✏️ Edit Dashboard** floating button (bottom-right)
3. The settings panel slides in from the right
4. Adjust:
   - **App/Company Name** — replaces "ERPNext" branding
   - **Accent Color** — 8 color swatches
   - **Section toggles** — KPI cards, shortcuts, chart, activity feed
   - **Quick Action links** — edit label and route for each button
5. Click **Save Changes** — persists to browser localStorage

### Via CSS Variables (code)

All colors and sizes are CSS custom properties. Override in a custom CSS file:

```css
:root {
  --cd-primary:        #2563eb;   /* Accent color */
  --cd-primary-light:  #eff6ff;   /* Light tint (hover backgrounds) */
  --cd-bg:             #f8fafc;   /* Page background */
  --cd-surface:        #ffffff;   /* Card background */
  --cd-border:         #e2e8f0;   /* Borders */
  --cd-text:           #0f172a;   /* Primary text */
  --cd-text-secondary: #475569;   /* Secondary text */
  --cd-sidebar-width:  220px;     /* Sidebar width */
  --cd-navbar-h:       52px;      /* Navbar height */
  --cd-font:           'Plus Jakarta Sans', sans-serif;
}
```

### Adding Custom KPI Routes

Edit `public/js/custom_desk.js`, locate the `DEFAULTS.kpis` array:

```js
kpis: [
  { label: "Revenue (MTD)",     value: "—", color: "kpi-blue",   route: "/query-report/Profit and Loss Statement" },
  { label: "Open Sales Orders", value: "—", color: "kpi-green",  route: "/sales-order" },
  { label: "Pending Invoices",  value: "—", color: "kpi-yellow", route: "/sales-invoice?status=Unpaid" },
  { label: "Low Stock Items",   value: "—", color: "kpi-red",    route: "/query-report/Stock Ledger" },
],
```

Colors available: `kpi-blue`, `kpi-green`, `kpi-yellow`, `kpi-red`

After editing, rebuild:
```bash
bench build --app custom_desk
bench --site your-site.com clear-cache
```

### Adding Custom Shortcuts

Edit `public/js/custom_desk.js`, locate `DEFAULTS.shortcuts`:

```js
shortcuts: [
  { icon: "📄", label: "Sales Invoice",  route: "/sales-invoice/new-sales-invoice-1" },
  { icon: "🧾", label: "Purchase Order", route: "/purchase-order/new-purchase-order-1" },
  // Add more here...
  { icon: "🏭", label: "Work Order",     route: "/work-order/new-work-order-1" },
],
```

---

## 📂 File Structure

```
custom_desk/
├── custom_desk/
│   ├── __init__.py       # App version
│   ├── hooks.py          # Registers CSS/JS with Frappe
│   └── boot.py           # Passes config to browser session
├── public/
│   ├── css/
│   │   └── custom_desk.css   # Full light theme (all Frappe elements)
│   └── js/
│       └── custom_desk.js    # Dashboard injection + settings panel
├── setup.py
├── pyproject.toml
├── MANIFEST.in
└── README.md
```

---

## 🔧 Troubleshooting

| Issue | Fix |
|---|---|
| Dashboard not appearing | Run `bench build --app custom_desk` then hard-refresh (Ctrl+Shift+R) |
| CSS not loading | Check `bench --site your-site.com clear-cache` and `bench restart` |
| Settings not saving | Check browser console for localStorage errors; try incognito |
| Sidebar missing on mobile | Tap ☰ hamburger button injected next to the logo |
| Old theme still showing | Check if another custom app is overriding CSS; check load order in `hooks.py` |

---

## 🗑️ Uninstall

```bash
bench --site your-site.com uninstall-app custom_desk
bench build
bench --site your-site.com clear-cache
bench restart
```

---

## 📄 License

MIT — free to use, modify, and distribute.
