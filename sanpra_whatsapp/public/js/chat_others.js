

let globalPhone;

function setupWhatsAppFeatures(frm) {
    frappe.db.get_value('Whatsapp Number Field', frm.doc.doctype, 'field_name')
        .then(result => {
            if (result && result.message && result.message.field_name) {
                globalPhone = result.message.field_name;
                frm.add_custom_button(__('WhatsApp Chat'), function() {

                    show_whatsapp_chat_dialog(frm);
                }, __('View'));
                
                var chat_field = frm.get_field('custom_chat_box');
                if (chat_field) {
                    setup_chat_html_field(frm, chat_field);
                }
            }
        })
        .catch(err => {
            console.error("Error checking WhatsApp configuration:", err);
        });
}



function formatMobileNumber(number) {
    number = number.replace(/\D/g, '');
  
    if (number.length === 10) {
      return '91' + number;
    }
  
    if (number.length === 12 && number.startsWith('91')) {
      return number;
    }
  
    return number;
}

  

(async function() {
    try {
        const result = await frappe.db.get_list('Whatsapp Number Field', {
            fields: ['document']
        });
        
        if (result && result.length > 0) {
            const doctypes = result.map(r => r.document);
            
            doctypes.forEach(doctype => {
                if (doctype) {  
                    frappe.ui.form.on(doctype, {
                        refresh: function(frm) {
                            setupWhatsAppFeatures(frm);
                        }
                    });
                }
            });
        } else {
            console.log("No WhatsApp configurations found");
        }
    } catch (err) {
        console.error("Error fetching WhatsApp configurations:", err);
    }
})();




function setup_chat_html_field(frm, field) {
    $(field.wrapper).find('.whatsapp-chat-container').remove();
    
    $(field.wrapper).append(`
        <div class="whatsapp-chat-container">
            <div class="chat-messages"></div>
            <div class="chat-input">
                <textarea class="form-control" rows="3" placeholder="Type a message..."></textarea>
                <div class="chat-actions">
                    <button class="btn btn-default attachment-btn">
                        <i class="fa fa-paperclip"></i>
                    </button>
                    <button class="btn btn-primary send-btn">Send</button>
                </div>
                <input type="file" class="attachment-input" style="display: none;">
                <div class="attachment-preview" style="display: none;"></div>
            </div>
        </div>
    `);
    
    init_whatsapp_chat(frm, $(field.wrapper));
    load_whatsapp_chat(frm, $(field.wrapper));
}

function show_whatsapp_chat_dialog(frm) {
    var d = new frappe.ui.Dialog({
        title: __('WhatsApp Chat'),
        fields: [
            {
                fieldname: 'phone',
                fieldtype: 'Data',
                label: 'Phone Number',
                reqd: 1,
                default: formatMobileNumber(frm.get_field(globalPhone).get_value()) || ''
            },
            {
                fieldname: 'custom_chat_box',
                fieldtype: 'HTML'
            }
        ],
        primary_action_label: 'Send',
        primary_action(values) {
            const message = $(d.fields_dict.custom_chat_box.wrapper).find('textarea').val();
            const attachment = $(d.fields_dict.custom_chat_box.wrapper).find('.attachment-input')[0].files[0];
            
            if (message || attachment) {
                if (attachment) {
                    send_whatsapp_attachment(frm, values.phone, message, attachment, d);
                } else {
                    send_whatsapp_message(frm, values.phone, message, d);
                }
            }
        }
    });
    
   
    d.$wrapper.addClass('large-dialog');
    
    $(d.fields_dict.custom_chat_box.wrapper).html(`
        <div class="whatsapp-chat-container">
            <div class="chat-messages"></div>
            <div class="chat-input">
                <textarea class="form-control" rows="3" placeholder="Type a message..."></textarea>
                <div class="chat-actions">
                    <button class="btn btn-default attachment-btn">
                        <i class="fa fa-paperclip"></i>
                    </button>
                </div>
                <input type="file" class="attachment-input" style="display: none;">
                <div class="attachment-preview" style="display: none;"></div>
            </div>
        </div>
    `);
    
    // Initialize attachment button
    $(d.fields_dict.custom_chat_box.wrapper).find('.attachment-btn').on('click', function() {
        $(d.fields_dict.custom_chat_box.wrapper).find('.attachment-input').click();
    });
    
    $(d.fields_dict.custom_chat_box.wrapper).find('.attachment-input').on('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const previewContainer = $(d.fields_dict.custom_chat_box.wrapper).find('.attachment-preview');
            previewContainer.empty().show();
            
            const fileType = file.type.split('/')[0];
            if (fileType === 'image') {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewContainer.html(`
                        <div class="attachment-item">
                            <img src="${e.target.result}" style="max-height: 100px; max-width: 100px;">
                            <span class="attachment-name">${file.name}</span>
                            <button class="btn btn-xs btn-danger remove-attachment">
                                <i class="fa fa-times"></i>
                            </button>
                        </div>
                    `);
                };
                reader.readAsDataURL(file);
            } else {
                previewContainer.html(`
                    <div class="attachment-item">
                        <i class="fa fa-file"></i>
                        <span class="attachment-name">${file.name}</span>
                        <button class="btn btn-xs btn-danger remove-attachment">
                            <i class="fa fa-times"></i>
                        </button>
                    </div>
                `);
            }
            
            previewContainer.find('.remove-attachment').on('click', function() {
                e.target.value = '';
                previewContainer.empty().hide();
            });
        }
    });
    
    load_chat_messages(frm, d, d.get_value('phone'));
    
    d.show();
}

// Add a button to the right sidebar actions menu
function add_sidebar_whatsapp_button(frm) {
    // Remove existing button first
    $('.page-actions .whatsapp-chat-btn').remove();
    
    $(`<button class="btn btn-default btn-sm whatsapp-chat-btn" style="margin-left: 10px;">
        <i class="fa fa-whatsapp"></i> WhatsApp Chat
    </button>`)
    .appendTo($('.page-actions'))
    .on('click', function() {
        show_whatsapp_chat_dialog(frm);
    });
}

function render_chat_message(msg) {
    const message = frappe.utils.escape_html(msg.message || '');
    const media_type = msg.media_type || '';
    const media_url = msg.media_url || '';
    if (media_type && media_url) {
        switch (media_type) {
            case "image":
                return `${message}<br><img src="${media_url}" class="chat-media img-responsive" style="max-width: 200px; border-radius: 8px;">`;
            case "video":
                return `${message}<br><video controls style="max-width: 200px;"><source src="${media_url}" type="video/mp4">Your browser does not support the video tag.</video>`;
            case "audio":
                return `${message}<br><audio controls><source src="${media_url}" type="audio/mpeg">Your browser does not support the audio tag.</audio>`;
            case "document":
                if (msg.direction=='outgoing'){
                    return `${message}<br><a href="${media_url}" target="_blank" class="btn btn-sm btn-success">Open Document</a>`;
                };
                return `${message}<br><a href="${media_url}" target="_blank" class="btn btn-sm btn-secondary">Open Document</a>`;
            default:
                return message;
        }
    }

    return message;
}

function send_whatsapp_message(frm, phone_number, message, dialog) {
    frappe.call({
        method: 'sanpra_whatsapp.sanpra_whatsapp.doctype.whatsapp_chat.whatsapp_chat.send_message_o',
        args: {
            doc_name:'other',
            phone: phone_number,
            message_content: message
        },
        callback: function(r) {
            if (r.message) {
                if (dialog) {
                    $(dialog.fields_dict.custom_chat_box.wrapper).find('textarea').val('');
                    load_chat_messages(frm, dialog, phone_number);
                } else {
                    let field = frm.get_field('custom_chat_box');
                    if (field) {
                        $(field.wrapper).find('textarea').val('');
                        load_whatsapp_chat(frm, $(field.wrapper));
                    }
                }
                frappe.show_alert({
                    message: __('WhatsApp message sent successfully'),
                    indicator: 'green'
                }, 3);
                
                frm.reload_doc();
            } else {
                frappe.show_alert({
                    message: __('Failed to send WhatsApp message'),
                    indicator: 'red'
                }, 5);
            }
        }
    });
}

function send_whatsapp_attachment(frm, phone_number, caption, file, dialog) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doctype', frm.doctype);
    formData.append('docname', frm.docname);
    formData.append('is_private', 0);
    formData.append('folder', 'Home/Attachments');
    formData.append('from_form', 1);
    
    $.ajax({
        url: '/api/method/upload_file',
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-Frappe-CSRF-Token', frappe.csrf_token);
        },
        success: function(response) {
            if (response.message && response.message.file_url) {
                frappe.call({
                    method: 'sanpra_whatsapp.sanpra_whatsapp.doctype.whatsapp_chat.whatsapp_chat.send_doc_message_o',
                    args: {
                        phone:phone_number,
                        doc_name:'other',
                        message_content: caption || '',
                        media_url: response.message.file_url
                    },
                    callback: function(r) {
                        if (r.message) {
                            if (dialog) {
                                $(dialog.fields_dict.custom_chat_box.wrapper).find('textarea').val('');
                                $(dialog.fields_dict.custom_chat_box.wrapper).find('.attachment-input').val('');
                                $(dialog.fields_dict.custom_chat_box.wrapper).find('.attachment-preview').empty().hide();
                                load_chat_messages(frm, dialog, phone_number);
                            } else {
                                let field = frm.get_field('custom_chat_box');
                                if (field) {
                                    $(field.wrapper).find('textarea').val('');
                                    $(field.wrapper).find('.attachment-input').val('');
                                    $(field.wrapper).find('.attachment-preview').empty().hide();
                                    load_whatsapp_chat(frm, $(field.wrapper));
                                }
                            }
                            
                            frappe.show_alert({
                                message: __('WhatsApp attachment sent successfully'),
                                indicator: 'green'
                            }, 3);
                            
                            // Refresh the form to show the newly attached file
                            frm.reload_doc();
                        } else {
                            frappe.show_alert({
                                message: __('Failed to send WhatsApp attachment'),
                                indicator: 'red'
                            }, 5);
                        }
                    }
                });
            } else {
                frappe.show_alert({
                    message: __('Failed to upload file'),
                    indicator: 'red'
                }, 5);
            }
        },
        error: function() {
            frappe.show_alert({
                message: __('Failed to upload file'),
                indicator: 'red'
            }, 5);
        }
    });
}

function init_whatsapp_chat(frm, wrapper) {
    // Set up attachment button
    wrapper.find('.attachment-btn').on('click', function() {
        wrapper.find('.attachment-input').click();
    });
    
    wrapper.find('.attachment-input').on('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const previewContainer = wrapper.find('.attachment-preview');
            previewContainer.empty().show();
            
            const fileType = file.type.split('/')[0];
            if (fileType === 'image') {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewContainer.html(`
                        <div class="attachment-item">
                            <img src="${e.target.result}" style="max-height: 100px; max-width: 100px;">
                            <span class="attachment-name">${file.name}</span>
                            <button class="btn btn-xs btn-danger remove-attachment">
                                <i class="fa fa-times"></i>
                            </button>
                        </div>
                    `);
                };
                reader.readAsDataURL(file);
            } else {
                previewContainer.html(`
                    <div class="attachment-item">
                        <i class="fa fa-file"></i>
                        <span class="attachment-name">${file.name}</span>
                        <button class="btn btn-xs btn-danger remove-attachment">
                            <i class="fa fa-times"></i>
                        </button>
                    </div>
                `);
            }
            
            previewContainer.find('.remove-attachment').on('click', function() {
                e.target.value = '';
                previewContainer.empty().hide();
            });
        }
    });
    
    wrapper.find('.send-btn').on('click', function() {
        const message = wrapper.find('textarea').val();
        const file = wrapper.find('.attachment-input')[0].files[0];
        const phone = formatMobileNumber(frm.get_field(globalPhone).get_value()) || '';
        if ((message || file) && phone) {
            if (file) {
                send_whatsapp_attachment(frm, phone, message, file);
            } else {
                send_whatsapp_message(frm, phone, message);
            }
            
            wrapper.find('textarea').val('');
            wrapper.find('.attachment-input').val('');
            wrapper.find('.attachment-preview').empty().hide();
            
            setTimeout(() => {
                load_whatsapp_chat(frm, wrapper);
            }, 1000);
        } else if (!phone) {
            frappe.show_alert({
                message: __('No phone number available for this document'),
                indicator: 'yellow'
            }, 5);
        }
    });
    
    wrapper.find('textarea').on('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            wrapper.find('.send-btn').click();
        }
    });
    
    frappe.realtime.on('new_whatsapp_message', function(data) {
        const phone = formatMobileNumber(frm.get_field(globalPhone).get_value()) || '';
        if (phone && data.from_number === phone.replace('+', '')) {
            load_whatsapp_chat(frm, wrapper);
        }
    });
}

function load_chat_messages(frm, dialog, phone_number) {
    frappe.call({
        method: 'sanpra_whatsapp.sanpra_whatsapp.doctype.whatsapp_chat.whatsapp_chat.get_chat_messages',
        args: {
            phone_number: phone_number,
            reference_doctype: frm.doctype,
            reference_name: frm.docname
        },
        callback: function(r) {
            if (r.message) {
                const messages = r.message;
                const $chatMessages = $(dialog.fields_dict.custom_chat_box.wrapper).find('.chat-messages');
                
                $chatMessages.empty();
                
                messages.forEach(msg => {
                    const messageClass = msg.direction === 'Incoming' ? 'incoming' : 'outgoing';
                    const statusClass = msg.status ? msg.status.toLowerCase() : '';
                    $chatMessages.append(`
                        <div class="chat-message ${messageClass} ${statusClass}">
                            <div class="message-content">
                                ${render_chat_message(msg)}
                            </div>
                            <div class="message-meta">
                                <span class="message-time">${msg.timestamp}</span>
                                <span class="message-status">${msg.message_user}</span>
                                ${msg.status ? `<span class="message-status">${msg.status}</span>` : ''}
                            </div>
                        </div>
                    `);
                });
                
                $chatMessages.scrollTop($chatMessages[0].scrollHeight);
            }
        }
    });
}

function load_whatsapp_chat(frm, wrapper) {
    const phone = formatMobileNumber(frm.get_field(globalPhone).get_value()) || '';
    if (!phone) {
        wrapper.find('.chat-messages').html('<div class="text-muted">No phone number available for this document</div>');
        return;
    }
    
    frappe.call({
        method: 'sanpra_whatsapp.sanpra_whatsapp.doctype.whatsapp_chat.whatsapp_chat.get_chat_messages',
        args: {
            phone_number: phone,
            reference_doctype: frm.doctype,
            reference_name: frm.docname
        },
        callback: function(r) {
            if (r.message) {
                const messages = r.message;
                const $chatMessages = wrapper.find('.chat-messages');
                
                $chatMessages.empty();
                messages.forEach(msg => {
                    const messageClass = msg.direction === 'Incoming' ? 'incoming' : 'outgoing';
                    const statusClass = msg.status ? msg.status.toLowerCase() : '';
                    $chatMessages.append(`
                        <div class="chat-message ${messageClass} ${statusClass}">
                            <div class="message-content">
                                ${render_chat_message(msg)}
                            </div>
                            <div class="message-meta">
                                <span class="message-time">${msg.timestamp}</span>
                                <span class="message-status">${msg.message_user}</span>
                                ${msg.status ? `<span class="message-status">${msg.status}</span>` : ''}
                            </div>
                        </div>
                    `);
                });
                
                $chatMessages.scrollTop($chatMessages[0].scrollHeight);
            }
        }
    });
}

$(document).ready(function() {
    if (!$('#whatsapp_chat_styles').length) {
        $('head').append(`
            <style id="whatsapp_chat_styles">
                .whatsapp-chat-container {
                    display: flex;
                    flex-direction: column;
                    height: 500px;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    overflow: hidden;
                    margin-top: 15px;
                }
                
                .chat-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 15px;
                    background-color: #e5ddd5;
                }
                
                .chat-input {
                    display: flex;
                    flex-direction: column;
                    padding: 10px;
                    background-color: white;
                    border-top: 1px solid var(--border-color);
                }
                
                .chat-input textarea {
                    flex: 1;
                    margin-bottom: 10px;
                    resize: none;
                }
                
                .chat-actions {
                    display: flex;
                    justify-content: space-between;
                }
                
                .attachment-btn {
                    margin-right: auto;
                }
                
                .attachment-preview {
                    padding: 8px;
                    margin-top: 8px;
                    background-color: #f8f9fa;
                    border-radius: 4px;
                }
                
                .attachment-item {
                    display: flex;
                    align-items: center;
                    padding: 4px;
                }
                
                .attachment-item img {
                    margin-right: 10px;
                }
                
                .attachment-item .fa-file {
                    font-size: 24px;
                    margin-right: 10px;
                    color: #6c757d;
                }
                
                .attachment-name {
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                
                .remove-attachment {
                    margin-left: 10px;
                }
                
                .chat-message {
                    max-width: 70%;
                    margin-bottom: 10px;
                    padding: 10px;
                    border-radius: 8px;
                    word-break: break-word;
                }
                
                .incoming {
                    background-color: white;
                    align-self: flex-start;
                    margin-right: auto;
                    border-top-left-radius: 0;
                }
                
                .outgoing {
                    background-color: #dcf8c6;
                    align-self: flex-end;
                    margin-left: auto;
                    border-top-right-radius: 0;
                }
                
                .message-meta {
                    display: flex;
                    justify-content: flex-end;
                    font-size: 0.8em;
                    color: #6c757d;
                    margin-top: 5px;
                }
                
                .message-status {
                    margin-left: 5px;
                }
                
                .delivered {
                    color: #0d6efd;
                }
                
                .read {
                    color: #198754;
                }
                
                .failed {
                    color: #dc3545;
                }
                
                /* Make dialog larger */
                .large-dialog .modal-dialog {
                    width: 90%;
                    max-width: 1200px;
                }
                
                .large-dialog .modal-content {
                    height: 80vh;
                }
                
                .large-dialog .modal-body {
                    height: calc(80vh - 130px);
                    display: flex;
                    flex-direction: column;
                }
                
                .large-dialog .frappe-control[data-fieldname="custom_chat_box"] {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                
                .large-dialog .whatsapp-chat-container {
                    flex: 1;
                    height: auto;
                }
            </style>
        `);
    }
});