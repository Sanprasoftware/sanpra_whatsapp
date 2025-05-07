// Copyright (c) 2025, Sanpra and contributors
// For license information, please see license.txt

frappe.query_reports["Attendance Script Report"] = {
	"filters": [
		{
			"fieldname": "employee_name",
			"label": "Employee Name",
			"fieldtype":"Link",
			"options": "Employee",
		},
		{  
			"fieldname": "from_date",
			"label": "From Date",
			"fieldtype": "Date",
			"default": frappe.datetime.get_today()  
		},
		{
			"fieldname": "to_date",
			"label": "To Date",
			"fieldtype": "Date",
			"default": frappe.datetime.get_today()
		}
	]
};
