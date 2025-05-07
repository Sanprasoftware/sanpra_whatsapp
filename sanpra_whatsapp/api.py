import frappe
from frappe import _
import json
from datetime import datetime
import requests
from frappe.utils.response import Response



@frappe.whitelist()
def log_whatsapp_interaction(lead_id, status, message=None):
    """Log a WhatsApp interaction with a lead"""
    if not frappe.has_permission("Lead", "write"):
        frappe.throw(_("Not permitted to update Lead"), frappe.PermissionError)
        
    lead = frappe.get_doc("Lead", lead_id)
    
    # Update the WhatsApp status
    lead.whatsapp_status = status
    
    # Add a comment with timestamp
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    comment_text = f"[{timestamp}] WhatsApp: {status}. {message or ''}"
    lead.add_comment('Comment', text=comment_text)
    
    # Save the lead
    lead.save()
    
    # Create a communication record for tracking
    communication = frappe.get_doc({
        "doctype": "Communication",
        "communication_type": "Communication",
        "communication_medium": "WhatsApp",
        "subject": f"WhatsApp: {status}",
        "content": message or f"WhatsApp status updated to {status}",
        "sender": frappe.session.user,
        "reference_doctype": "Lead",
        "reference_name": lead_id,
        "sender_full_name": frappe.db.get_value("User", frappe.session.user, "full_name"),
        "sent_or_received": "Sent",
        "seen": 0
    })
    communication.insert(ignore_permissions=True)
    
    return {"success": True, "status": status, "message": message}