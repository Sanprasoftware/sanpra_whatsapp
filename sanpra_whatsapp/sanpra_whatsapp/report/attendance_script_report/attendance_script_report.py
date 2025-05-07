# Copyright (c) 2025, Sanpra and contributors
# For license information, please see license.txt

import frappe


def execute(filters=None):
	columns, data = get_columns(filters),get_data(filters)
	return columns, data

def get_columns(filters):
	columns=[
	{
		"label": "Employee Name",
		"fieldtype": "Link",
		"options": "Employee",
		"fieldname": "employee",
		"width": 300
	},
 	{
		"label": "Employee Name",
		"fieldname": "employee_name",
		"width": 200,
	},
	{
		"label": "Status",
		"fieldname": "status",
		"width": 200,
	},
	{
		"label": "Department",
		"fieldname": "department",
		"width": 200
	},
 	{
		"label": "Shift",
		"fieldname": "shift",
		"width": 200
	}
	]

	return columns


def get_data(filters):
	if not filters:
		data = frappe.db.get_all(
			"Attendance",
			filters={"docstatus":1},
			fields=["employee", "employee_name", "status", "attendance_date", "department", "shift"]		
		)
	else:
		data = frappe.db.get_all(
			"Attendance",
			filters={"docstatus": 1, "attendance_date":["between",[filters.get("from_date"),filters.get("to_date")]]},
			fields=["employee", "employee_name", "status", "attendance_date", "department", "shift"]
		)

	return data