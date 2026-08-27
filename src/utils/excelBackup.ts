/**
 * Excel Backup Utility for Pure Max Factory Management System
 * Creates and downloads structured multi-sheet Excel (.xlsx) workbooks containing all factory records.
 */

import * as XLSX from 'xlsx';
import {
  User,
  AttendanceRecord,
  SalesRecord,
  ProductionRecord,
  OuterBuyingRecord,
  RollBuyingRecord,
  ExpenseRecord,
  MachineRepairRecord,
  FuelRecord,
  EquipmentLogRecord,
  AuditLog,
} from '../types';

export interface FactoryBackupData {
  users?: User[];
  attendance?: AttendanceRecord[];
  sales?: SalesRecord[];
  production?: ProductionRecord[];
  outerBuyings?: OuterBuyingRecord[];
  rollBuyings?: RollBuyingRecord[];
  expenses?: ExpenseRecord[];
  repairs?: MachineRepairRecord[];
  fuel?: FuelRecord[];
  equipmentLogs?: EquipmentLogRecord[];
  auditLogs?: AuditLog[];
  generatedAt?: string;
  factoryName?: string;
}

export function generateExcelWorkbook(data: FactoryBackupData): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const timestamp = data.generatedAt || new Date().toISOString();
  const factoryName = data.factoryName || 'Pure Max Purified Mineral Water Factory #1';

  // 1. Summary & Overview Sheet
  const totalSalesLe = (data.sales || []).reduce((sum, s) => sum + (Number(s.totalAmountLe) || 0), 0);
  const totalBundles = (data.production || []).reduce((sum, p) => sum + (Number(p.bundlesProduced) || 0), 0);
  const totalExpensesLe = (data.expenses || []).reduce((sum, e) => sum + (Number(e.amountLe) || 0), 0);
  const totalFuelLe = (data.fuel || []).reduce((sum, f) => sum + (Number(f.totalCostLe) || 0), 0);
  const totalRepairsLe = (data.repairs || []).reduce((sum, r) => sum + (Number(r.costLe) || 0), 0);

  const summaryData = [
    ['PURE MAX WATER FACTORY - MASTER DATABASE BACKUP & AUDIT REPORT'],
    ['Factory Location', 'Makeni Plant & Freetown Distribution Operations, Sierra Leone'],
    ['Generated On', new Date(timestamp).toLocaleString()],
    ['System Version', 'Pure Max Factory OS v4.2.0 (High-Reliability Dual Online/Offline Engine)'],
    [''],
    ['EXECUTIVE SUMMARY METRICS', 'VALUE'],
    ['Total Recorded Sales Revenue (SL Le)', `SL Le ${totalSalesLe.toLocaleString()}`],
    ['Total Finished Sachet Bundles Produced', `${totalBundles.toLocaleString()} Bundles`],
    ['Total Operational Expenses (SL Le)', `SL Le ${totalExpensesLe.toLocaleString()}`],
    ['Total Fleet Fuel Expenses (SL Le)', `SL Le ${totalFuelLe.toLocaleString()}`],
    ['Total Machine Repair Costs (SL Le)', `SL Le ${totalRepairsLe.toLocaleString()}`],
    ['Total Registered Staff & Operators', `${(data.users || []).length} Personnel`],
    ['Total Attendance Logs Recorded', `${(data.attendance || []).length} Records`],
    ['Total Sales Invoices Logged', `${(data.sales || []).length} Transactions`],
    ['Total Production Batches Logged', `${(data.production || []).length} Batches`],
    ['Total Outer Film Purchases', `${(data.outerBuyings || []).length} Entries`],
    ['Total Roll Film Purchases', `${(data.rollBuyings || []).length} Entries`],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary Overview');

  // 2. Sales Transactions Sheet
  if (data.sales && data.sales.length > 0) {
    const salesRows = data.sales.map((s) => ({
      'Invoice / Receipt #': s.receiptNumber,
      'Date': s.date,
      'Sales Category': s.category,
      'Bundles (Bags)': s.bundleQuantity,
      'Unit Price (SL Le)': s.unitPriceLe,
      'Total Amount (SL Le)': s.totalAmountLe,
      'Customer / Driver': s.customerOrDriver || '',
      'Payment Method': s.paymentMethod || 'Cash / Mobile Money',
      'Delivery Route': s.deliveryRoute || 'Direct Plant Gate',
      'Recorded By': s.recordedByName,
      'Notes / Phone': s.notes || '',
      'Created At': s.createdAt,
    }));
    const wsSales = XLSX.utils.json_to_sheet(salesRows);
    XLSX.utils.book_append_sheet(wb, wsSales, 'Sales Tracker');
  }

  // 3. Daily Production Batches Sheet
  if (data.production && data.production.length > 0) {
    const prodRows = data.production.map((p) => ({
      'Batch Number': p.batchNumber,
      'Date': p.date,
      'Shift': p.shift,
      'Outer Film Count': p.outerFilmCount || 0,
      'Bundles Produced': p.bundlesProduced,
      'Damaged Bundles': p.damagedBundles || 0,
      'Net Yield Bundles': (p.bundlesProduced || 0) - (p.damagedBundles || 0),
      'Water Litres Treated': p.cleanWaterLitres || (p.bundlesProduced * 10),
      'Outer Operator': p.outerOperatorName || p.operatorName || '',
      'Roll Operator': p.rollOperatorName || '',
      'Packaging Roll Wt (kg)': p.packagingRollWeightKg || 0,
      'Notes': p.notes || '',
      'Created At': p.createdAt,
    }));
    const wsProd = XLSX.utils.json_to_sheet(prodRows);
    XLSX.utils.book_append_sheet(wb, wsProd, 'Production Batches');
  }

  // 4. Daily Outer Film Buying Sheet
  if (data.outerBuyings && data.outerBuyings.length > 0) {
    const outerRows = data.outerBuyings.map((o) => ({
      'Entry ID': o.id,
      'Date': o.date,
      'Outers Count': o.outersCount,
      'Equivalent Bundles Cap': Number(o.outersCount || 0) * 100,
      'Engineer / Officer': o.engineerName,
      'Cost (SL Le)': o.costLe || 0,
      'Supplier / Remarks': o.notes || '',
      'Created At': o.createdAt,
    }));
    const wsOuter = XLSX.utils.json_to_sheet(outerRows);
    XLSX.utils.book_append_sheet(wb, wsOuter, 'Daily Outer Buying');
  }

  // 5. Daily Roll Film Buying Sheet
  if (data.rollBuyings && data.rollBuyings.length > 0) {
    const rollRows = data.rollBuyings.map((r) => ({
      'Entry ID': r.id,
      'Date': r.date,
      'Roll Brand / Spec': r.rollName,
      'Roll Weight (KG)': r.rollWeightKg,
      'Engineer / Officer': r.engineerName,
      'Cost (SL Le)': r.costLe || 0,
      'Supplier / Remarks': r.notes || '',
      'Created At': r.createdAt,
    }));
    const wsRoll = XLSX.utils.json_to_sheet(rollRows);
    XLSX.utils.book_append_sheet(wb, wsRoll, 'Daily Roll Buying');
  }

  // 6. Factory Operating Expenses Sheet
  if (data.expenses && data.expenses.length > 0) {
    const expRows = data.expenses.map((e) => ({
      'Expense ID': e.id,
      'Date': e.date,
      'Category': e.category,
      'Description / Purpose': e.itemDescription,
      'Amount (SL Le)': e.amountLe,
      'Vendor / Payment Method': e.vendor || 'Cash',
      'Receipt Ref #': e.receiptNumber || '',
      'Recorded By': e.recordedByName,
      'Created At': e.createdAt,
    }));
    const wsExp = XLSX.utils.json_to_sheet(expRows);
    XLSX.utils.book_append_sheet(wb, wsExp, 'Operating Expenses');
  }

  // 7. Staff Attendance & Salary Timesheet Sheet
  if (data.attendance && data.attendance.length > 0) {
    const attRows = data.attendance.map((a) => ({
      'Record ID': a.id,
      'Employee ID': a.employeeId || '',
      'Staff Name': a.userName || '',
      'Role': a.userRole || '',
      'Date': a.date,
      'Check-In Time': a.checkInTime || '',
      'Check-Out Time': a.checkOutTime || '',
      'Duration (Hours)': a.durationHours || '',
      'Shift Location': a.location || 'Factory Main Plant',
      'Approval Status': (a.status || 'pending').toUpperCase(),
      'Verified By': a.approvedBy || '',
      'Notes': a.notes || '',
    }));
    const wsAtt = XLSX.utils.json_to_sheet(attRows);
    XLSX.utils.book_append_sheet(wb, wsAtt, 'Staff Attendance');
  }

  // 8. Machine Repairs & Plant Maintenance Sheet
  if (data.repairs && data.repairs.length > 0) {
    const repRows = data.repairs.map((r) => ({
      'Repair ID': r.id,
      'Date': r.date,
      'Machine Name / Asset': r.machineName,
      'Issue Description': r.issueDescription,
      'Spare Parts Replaced': r.sparePart || 'N/A',
      'Repair Cost (SL Le)': r.costLe || 0,
      'Engineer / Technician': r.engineerName,
      'Resolution Status': r.resolutionStatus,
      'Created At': r.createdAt,
    }));
    const wsRep = XLSX.utils.json_to_sheet(repRows);
    XLSX.utils.book_append_sheet(wb, wsRep, 'Machine Repairs');
  }

  // 9. Fuel & Fleet Logs Sheet
  if (data.fuel && data.fuel.length > 0) {
    const fuelRows = data.fuel.map((f) => ({
      'Fuel Log ID': f.id,
      'Date': f.date,
      'Vehicle / Machine': f.vehicleOrMachine,
      'Fuel Litres': f.litres,
      'Cost per Litre (SL Le)': f.costPerLitreLe || 0,
      'Total Cost (SL Le)': f.totalCostLe,
      'Driver / Officer': f.engineerName,
      'Fuel Station / Receipt': f.receiptNumber || 'NP Station',
      'Created At': f.createdAt,
    }));
    const wsFuel = XLSX.utils.json_to_sheet(fuelRows);
    XLSX.utils.book_append_sheet(wb, wsFuel, 'Fuel & Fleet Logs');
  }

  // 10. Water Purity & Equipment Logs Sheet
  if (data.equipmentLogs && data.equipmentLogs.length > 0) {
    const eqRows = data.equipmentLogs.map((l) => ({
      'Telemetry ID': l.id,
      'Date': l.date,
      'Time': l.time,
      'TDS Level (PPM)': l.tdsLevelPpm,
      'pH Level': l.phLevel,
      'Filtration Pressure (PSI)': l.filtrationPressurePsi,
      'UV Sterilizer Status': l.uvSterilizerStatus,
      'Ozone Generator (mg/L)': l.ozoneGeneratorLevel,
      'Operator / Engineer': l.operatorName,
      'Remarks': l.notes || '',
      'Created At': l.createdAt,
    }));
    const wsEq = XLSX.utils.json_to_sheet(eqRows);
    XLSX.utils.book_append_sheet(wb, wsEq, 'Water Quality & Equipment');
  }

  // 11. Official Staff Directory Sheet
  if (data.users && data.users.length > 0) {
    const userRows = data.users.map((u) => ({
      'Employee ID': u.employeeId,
      'Full Name': u.name,
      'Role': u.role,
      'Department': u.department,
      'Phone Number': u.phone,
      'Email': u.email,
      'Status': u.status.toUpperCase(),
      'Daily Salary (SL Le)': u.dailySalaryLe || 0,
      'Monthly Salary (SL Le)': u.monthlySalaryLe || 0,
      'Account Created': u.createdAt,
    }));
    const wsUsers = XLSX.utils.json_to_sheet(userRows);
    XLSX.utils.book_append_sheet(wb, wsUsers, 'Staff Directory');
  }

  // 12. System Audit Logs Sheet
  if (data.auditLogs && data.auditLogs.length > 0) {
    const auditRows = data.auditLogs.map((a) => ({
      'Log ID': a.id,
      'Timestamp': a.timestamp,
      'Actor Name': a.actorName,
      'Actor Role': a.actorRole,
      'Action Code': a.action,
      'Operation Details': a.details,
    }));
    const wsAudit = XLSX.utils.json_to_sheet(auditRows);
    XLSX.utils.book_append_sheet(wb, wsAudit, 'System Audit Logs');
  }

  return wb;
}

/**
 * Downloads the full factory database as an Excel .xlsx workbook.
 */
export function downloadExcelBackup(data: FactoryBackupData, customFilename?: string): void {
  try {
    const wb = generateExcelWorkbook(data);
    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
    const filename = customFilename || `PureMax_Factory_Master_Backup_${dateStr}_${timeStr}.xlsx`;
    XLSX.writeFile(wb, filename);
  } catch (err) {
    console.error('Failed to export Excel backup workbook:', err);
    throw err;
  }
}
