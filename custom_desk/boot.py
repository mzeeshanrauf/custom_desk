import frappe


def get_boot_info(bootinfo):
    """
    Attach custom_desk config to the Frappe boot session.
    Accessible in JS as: frappe.boot.custom_desk
    """
    bootinfo.custom_desk = frappe.db.get_singles_dict("Custom Desk Settings") or {
        "app_name": "ERPNext",
        "greeting": "Welcome back",
        "primary_color": "#2563eb",
        "show_kpi_bar": 1,
        "show_shortcuts": 1,
        "show_activity": 1,
        "show_chart": 1,
        "compact_sidebar": 0,
    }
