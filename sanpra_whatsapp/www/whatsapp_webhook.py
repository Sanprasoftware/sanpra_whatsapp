import frappe
import json
from frappe.utils import now_datetime
import requests
from werkzeug.wrappers import Response
from datetime import datetime
import pytz



@frappe.whitelist(allow_guest=True)
def webhook():
    if frappe.request.method == "GET":
        stored_token = frappe.db.get_value("WhatsApp Settings", {}, "webhook_verify_token")
        hub_challenge = frappe.form_dict.get("hub.challenge")
        if frappe.form_dict.get("hub.verify_token") != stored_token:
            frappe.throw("Verify token does not match")
        return Response(hub_challenge, status=200)

    try:
        data = frappe.local.form_dict
        if isinstance(data, str):
            data = json.loads(data)

        frappe.get_doc({"doctype": "Whatsapp Logs", "meta_data": frappe.as_json(data)}).insert(ignore_permissions=True)

        messages = data.get("entry", [{}])[0].get("changes", [{}])[0].get("value", {}).get("messages", [])

        for message in messages:
            message_type = message.get("type")
            timestamp = message.get("timestamp")
            from_number = message.get("from")
            message_id = message.get("id")
            media_id = None
            message_content = None
            media_url = None

            if message_type == "text":
                message_content = message.get("text", {}).get("body")

            elif message_type in ("image", "audio", "video", "document"):
                media_id = message.get(message_type, {}).get("id")
                caption = message.get(message_type, {}).get("caption", "")
                message_content = f"[{message_type.capitalize()} Message]{f' - {caption}' if caption else ''}"
            timestamp = datetime.utcfromtimestamp(int(timestamp))
            kolkata_tz = pytz.timezone('Asia/Kolkata')
            timestamp = pytz.utc.localize(timestamp).astimezone(kolkata_tz)
            process_incoming_message(from_number, message_content, message_id, timestamp, message_type, media_id)

        return Response("OK", status=200)

    except Exception as e:
        frappe.log_error("Webhook Log Error", frappe.get_traceback())
        frappe.throw(f"Something went wrong: {str(e)}")


def get_media_url(media_id):
    access_token = frappe.get_value("WhatsApp Setting","WhatsApp Setting", "access_token")
    url = f"https://graph.facebook.com/v22.0/{media_id}"
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(url, headers=headers)
    furl=response.json().get("url")
    response = requests.get(furl, headers=headers)
    if response.ok:
        return response.content,response.headers.get("Content-Disposition")
    return None,None


@frappe.whitelist()
def process_incoming_message(from_number, message_content, message_id, timestamp, message_type="text", media_id=None):
    if from_number.startswith("+"):
        from_number = from_number[1:]

    chat_name = frappe.db.get_value("WhatsApp Chat", {"contact_number": from_number})
    if chat_name:
        chat = frappe.get_doc("WhatsApp Chat", chat_name)
    else:
        chat = frappe.new_doc("WhatsApp Chat")
        chat.contact_number = from_number
        chat.contact_name = "Unknown"

    msg=chat.append("messages", {
        "message": message_content,
        "direction": "Incoming",
        "timestamp": timestamp.strftime("%Y-%m-%d %H:%M:%S.") + f"{timestamp.microsecond:06d}",
        "media_type": message_type if message_type != "text" else "text",
        "message_id": message_id
    })

    chat.save(ignore_permissions=True)

    if media_id:
        media_content,media_name=get_media_url(media_id)
        now_timedate = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        file_doc = frappe.get_doc(
            {
                "doctype": "File",
                "file_name": "attachment_" + now_timedate +"." + media_name.split("=")[-1].split(".")[-1],
                "attached_to_doctype": "WhatsApp Chat",
                "attached_to_name": chat.name,
                "attached_to_field": "messages",
                "attached_to_detached": 0,
                "attached_to_child_name": msg.name,
                "content": media_content,
                "decode": False  
            }
        )
        file_doc.insert(ignore_permissions=True)
        msg.db_set("media", file_doc.file_url)
        msg.db_set("media_url",file_doc.file_url)
    frappe.publish_realtime(
        event="new_whatsapp_message",
        message={"chat": chat.name, "message": message_content}
    )


