app_name = "custom_desk"
app_title = "Custom Desk"
app_publisher = "Your Company"
app_description = "Custom light-theme desk replacement for ERPNext v16"
app_email = "admin@yourcompany.com"
app_license = "MIT"
app_version = "1.0.0"

# ─────────────────────────────────────────────────────────────
#  Assets — Frappe v14/v15/v16 esbuild bundle system
#
#  Rules:
#  1. Files named *.bundle.js / *.bundle.css anywhere inside
#     public/ are auto-detected and compiled by Frappe's esbuild.
#  2. In app_include_css / app_include_js use JUST the filename
#     (no path). Frappe resolves it to the correct dist path.
# ─────────────────────────────────────────────────────────────

app_include_css = ["custom_desk.bundle.css"]
app_include_js  = ["custom_desk.bundle.js"]

# ─────────────────────────────────────────────────────────────
#  Boot session — attaches config to frappe.boot in the browser
# ─────────────────────────────────────────────────────────────
boot_session = "custom_desk.boot.get_boot_info"
