app_name = "custom_desk"
app_title = "Custom Desk"
app_publisher = "Your Company"
app_description = "Custom light-theme desk replacement for ERPNext v16"
app_email = "admin@yourcompany.com"
app_license = "MIT"
app_version = "1.0.0"

# ─────────────────────────────────────────────────────────────
#  Static assets — served directly via symlink (no esbuild needed)
#  Path: /assets/custom_desk/css/... and /assets/custom_desk/js/...
#  These are plain CSS/JS files — NOT bundled through esbuild.
#  The `web_include_*` keys work for desk pages in Frappe v16.
# ─────────────────────────────────────────────────────────────

app_include_css = [
    "/assets/custom_desk/css/custom_desk.css",
]

app_include_js = [
    "/assets/custom_desk/js/custom_desk.js",
]

# ─────────────────────────────────────────────────────────────
#  Boot session — passes server config to the browser
# ─────────────────────────────────────────────────────────────

boot_session = "custom_desk.boot.get_boot_info"
