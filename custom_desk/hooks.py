from . import __version__ as app_version

app_name = "custom_desk"
app_title = "Custom Desk"
app_publisher = "Your Company"
app_description = "Custom light-theme desk replacement for ERPNext v16"
app_email = "admin@yourcompany.com"
app_license = "MIT"
app_version = "1.0.0"

# ─────────────────────────────────────────────────────────────
#  Assets injected into every Desk page
# ─────────────────────────────────────────────────────────────

app_include_css = [
    "/assets/custom_desk/css/custom_desk.css",
]

app_include_js = [
    "/assets/custom_desk/js/custom_desk.js",
]

# ─────────────────────────────────────────────────────────────
#  Boot session data — passes server-side config to the browser
# ─────────────────────────────────────────────────────────────

boot_session = "custom_desk.boot.get_boot_info"

# ─────────────────────────────────────────────────────────────
#  Override default home page (optional – comment out to keep
#  ERPNext's default workspace routing)
# ─────────────────────────────────────────────────────────────

# home_page = "custom-desk"

# ─────────────────────────────────────────────────────────────
#  Jinja environment extras (not required for CSS-only approach)
# ─────────────────────────────────────────────────────────────

# jinja = {
#     "methods": [],
#     "filters": [],
# }
