import frappe
import requests
import json
from datetime import datetime
from frappe.utils import get_site_name

class WhatsAppConnector:
    def __init__(self):
        self.api_base_url = frappe.get_value("WhatsApp Setting","WhatsApp Setting", "api_base_url")
        self.access_token = frappe.get_value("WhatsApp Setting","WhatsApp Setting", "access_token")
        self.phone_number_id = frappe.get_value("WhatsApp Setting","WhatsApp Setting", "phone_number_id")
    def send_doc_message(self,to_number,message_content,media_url):
        site_name = get_site_name(frappe.local.request.host)
        # frappe.msgprint(site_name+"/"+media_url)
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.access_token}"
        }

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_number,
            "type": "document",
            "document": {
                "link": site_name+"/"+media_url,
                "caption": message_content,
                "filename": media_url.split("/")[-1],
                "caption": message_content
            }
        }
        response = requests.post(
            f"{self.api_base_url}/{self.phone_number_id}/messages",
            headers=headers,
            data=json.dumps(payload)
        )
        if response.status_code == 200:
            return {
                "success": True,
                "message_id": response.json().get("messages", [{}])[0].get("id")
            }
        else:
            frappe.log_error(f"WhatsApp API Error: {response.text}", "WhatsApp Message Sending Failed")
            return {
                "success": False,
                "error": response.text
            }

    def send_message(self, to_number, message_content):
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.access_token}"
        }
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_number,
            "type": "text",
            "text": {
                "body": message_content
            }
        }

        response = requests.post(
            f"{self.api_base_url}/{self.phone_number_id}/messages",
            headers=headers,
            data=json.dumps(payload)
        )
        
        if response.status_code == 200:
            return {
                "success": True,
                "message_id": response.json().get("messages", [{}])[0].get("id")
            }
        else:
            frappe.log_error(f"WhatsApp API Error: {response.text}", "WhatsApp Message Sending Failed")
            return {
                "success": False,
                "error": response.text
            }
    
    def get_message_status(self, message_id):
        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }
        
        response = requests.get(
            f"{self.api_base_url}/{message_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            return response.json().get("status")
        else:
            frappe.log_error(f"WhatsApp API Error: {response.text}", "WhatsApp Message Status Check Failed")
            return "unknown"