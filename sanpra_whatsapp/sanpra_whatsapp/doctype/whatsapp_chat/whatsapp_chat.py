import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime
from sanpra_whatsapp.utils.whatsapp_connector import WhatsAppConnector

class WhatsAppChat(Document):
    @frappe.whitelist()
    def send_doc_message(self,message_content, media_url, doc_name=None):
        if doc_name is None:
            connector = WhatsAppConnector()
            to_number = self.contact_number
            result = connector.send_doc_message(to_number, message_content,media_url)
            if result.get("success"):
                self.append("messages", {
                    "message": message_content,
                    "direction": "Outgoing",
                    "status": "Sent",
                    "timestamp": now_datetime(),
                    "message_id": result.get("message_id"),
                    "media_url": media_url,
                    "media_type": "document",
                    "media": media_url
                })
                self.save()
                return True
            else:
                return False

    @frappe.whitelist()
    def send_message(self, message_content, doc_name=None):
        connector = WhatsAppConnector()
        to_number = self.contact_number
            
        result = connector.send_message(to_number, message_content)
            
        if result.get("success"):
                self.append("messages", {
                    "message": message_content,
                    "direction": "Outgoing",
                    "status": "Sent",
                    "timestamp": now_datetime(),
                    "message_id": result.get("message_id")
                })
                self.save()
                return True
        else:
                return False

    @frappe.whitelist()
    def update_message_statuses(self):
        connector = WhatsAppConnector()
        
        for message in self.messages:
            if message.direction == "Outgoing" and message.status not in ["Read", "Failed"] and message.message_id:
                status = connector.get_message_status(message.message_id)
                if status and status != "unknown":
                    message.status = status.capitalize()
        
        self.save()



@frappe.whitelist()
def send_message_o(phone, message_content, doc_name=None):
    connector = WhatsAppConnector()
    if doc_name=="Lead":
        connector = WhatsAppConnector()
        to_number = phone
        chat_name = frappe.db.get_value("WhatsApp Chat", {"contact_number": to_number})
        if chat_name:
            chat = frappe.get_doc("WhatsApp Chat", chat_name)
        else:
            chat = frappe.new_doc("WhatsApp Chat")
            chat.contact_number = to_number
            chat.contact_name = "Unknown"
        result = connector.send_message(to_number, message_content)
        if result.get("success"):
            chat.append("messages", {
                "message": message_content,
                "direction": "Outgoing",
                "status": "Sent",
                "timestamp": now_datetime(),
                "message_id": result.get("message_id")
            })
            chat.save(ignore_permissions=True)
            return True
        else:
            return False
    else:
        connector = WhatsAppConnector()
        to_number = phone
        chat_name = frappe.db.get_value("WhatsApp Chat", {"contact_number": to_number})
        if chat_name:
            chat = frappe.get_doc("WhatsApp Chat", chat_name)
        else:
            chat = frappe.new_doc("WhatsApp Chat")
            chat.contact_number = to_number
            chat.contact_name ="Unknown"
        result = connector.send_message(to_number, message_content)
        if result.get("success"):
            chat.append("messages", {
                "message": message_content,
                "direction": "Outgoing",
                "status": "Sent",
                "timestamp": now_datetime(),
                "message_id": result.get("message_id")
            })
            chat.save(ignore_permissions=True)
            return True
        else:
            return False

@frappe.whitelist()
def send_doc_message_o(phone,message_content, media_url, doc_name=None):
    if doc_name=="Lead":
        connector = WhatsAppConnector()
        to_number = phone
        chat_name = frappe.db.get_value("WhatsApp Chat", {"contact_number": to_number})
        if chat_name:
            chat = frappe.get_doc("WhatsApp Chat", chat_name)
        else:
            chat = frappe.new_doc("WhatsApp Chat")
            chat.contact_number = to_number
            chat.contact_name = "Unknown"
        result = connector.send_doc_message(to_number, message_content,media_url)
        if result.get("success"):
            chat.append("messages", {
                    "message": message_content,
                    "direction": "Outgoing",
                    "status": "Sent",
                    "timestamp": now_datetime(),
                    "message_id": result.get("message_id"),
                    "media_url": media_url,
                    "media_type": "document",
                    "media": media_url
            })
            chat.save(ignore_permissions=True)
            return True
        else:
            return False
    else:
        connector = WhatsAppConnector()
        to_number = phone
        chat_name = frappe.db.get_value("WhatsApp Chat", {"contact_number": to_number})
        if chat_name:
            chat = frappe.get_doc("WhatsApp Chat", chat_name)
        else:
            chat = frappe.new_doc("WhatsApp Chat")
            chat.contact_number = to_number
            chat.contact_name = "Unknown"
        result = connector.send_doc_message(to_number, message_content,media_url)
        if result.get("success"):
            chat.append("messages", {
                    "message": message_content,
                    "direction": "Outgoing",
                    "status": "Sent",
                    "timestamp": now_datetime(),
                    "message_id": result.get("message_id"),
                    "media_url": media_url,
                    "media_type": "document",
                    "media": media_url
            })
            chat.save(ignore_permissions=True)
            return True
        else:
            return False


@frappe.whitelist()
def get_chat_messages(phone_number, reference_doctype=None, reference_name=None):
    if phone_number.startswith("+"):
        phone_number = phone_number[1:]
        
    chat_name = frappe.db.get_value("WhatsApp Chat", {"contact_number": phone_number})
    
    if not chat_name:
        chat = frappe.new_doc("WhatsApp Chat")
        chat.contact_number = phone_number
        
        if reference_doctype and reference_name:
            chat.reference_doctype = reference_doctype
            chat.reference_document = reference_name
            
        if reference_doctype and reference_name:
            doc = frappe.get_doc(reference_doctype, reference_name)
            if hasattr(doc, 'contact_name'):
                chat.contact_name = doc.contact_name
            elif hasattr(doc, 'customer_name'):
                chat.contact_name = doc.customer_name
        
        chat.insert()
        return []
    
    chat = frappe.get_doc("WhatsApp Chat", chat_name)
    
    if reference_doctype and reference_name and (
        chat.reference_doctype != reference_doctype or 
        chat.reference_document != reference_name
    ):
        chat.reference_doctype = reference_doctype
        chat.reference_document = reference_name
        chat.save()
    
    messages = []
    for msg in chat.messages:
        messages.append({
            "message": msg.message,
            "direction": msg.direction,
            "status": msg.status,
            "timestamp": msg.timestamp.strftime("%Y-%m-%d %H:%M:%S") if msg.timestamp else "",
            "message_id": msg.message_id if hasattr(msg, "message_id") else None,
            "media_type": msg.media_type if hasattr(msg, "media_type") else None,
            "media_url": msg.media if hasattr(msg, "media") else None,
            "message_user": msg.message_user
        })
    
    return messages

@frappe.whitelist(allow_guest=True)
def upload_file(docname, doctype, filedata):
    file = frappe.get_doc({
        "doctype": "File",
        "file_name": filedata.filename,
        "attached_to_doctype": doctype,
        "attached_to_name": docname,
        "content": filedata.content,
        "decode": True
    })
    file.insert(ignore_permissions=True)
    return file
