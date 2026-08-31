import React, { useMemo } from 'react';
import { AttendanceRecord, User } from '../../types';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';

interface AttendanceMatrixProps {
  attendance: AttendanceRecord[];
  users: User[];
}

export const AttendanceMatrix: React.FC<AttendanceMatrixProps> = ({ attendance, users }) => {
  // Get all unique days in the current month based on records, or just generate 1-31
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  });

  const matrixData = useMemo(() => {
    return users.map(user => {
      let approvedCount = 0;
      let rejectedCount = 0;
      let pendingCount = 0;
      
      const dayStatuses = daysArray.map(dayStr => {
        const record = attendance.find(a => a.userId === user.id && a.date === dayStr);
        if (!record) return null;
        if (record.status === 'approved') {
          approvedCount++;
          return '1';
        }
        if (record.status === 'rejected') {
          rejectedCount++;
          return '0';
        }
        pendingCount++;
        return 'P';
      });

      const totalDays = approvedCount + rejectedCount + pendingCount;
      const rate = totalDays > 0 ? Math.round((approvedCount / totalDays) * 100) : 0;

      return {
        user,
        dayStatuses,
        approvedCount,
        rejectedCount,
        rate
      };
    });
  }, [users, attendance, daysArray]);

  const handleExportExcel = () => {
    const wsData = [
      ['Employee Name', 'Department/Role', ...daysArray.map(d => d.split('-')[2]), 'Total Days Approved (1s)', 'Total Rejected (0s)', 'Attendance Rate (%)'],
      ...matrixData.map(row => [
        row.user.name,
        row.user.role ? row.user.role.replace('_', ' ').toUpperCase() : '',
        ...row.dayStatuses.map(status => status || ''),
        row.approvedCount,
        row.rejectedCount,
        `${row.rate}%`
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Matrix");
    XLSX.writeFile(wb, `Attendance_Matrix_${year}_${month + 1}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Monthly Attendance Matrix</h3>
          <p className="text-xs text-slate-500">1 = Approved, 0 = Rejected, P = Pending Check-in Review &middot; <strong>Days Approved</strong> = total approved days this month</p>
        </div>
        <button
          onClick={handleExportExcel}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition"
        >
          <Download className="w-4 h-4" />
          Export to Excel
        </button>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <table className="w-full text-left text-[10px] border-collapse min-w-max">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase bg-slate-50 dark:bg-slate-800/50">
              <th className="p-3 sticky left-0 bg-slate-50 dark:bg-slate-800/50 z-10 border-r border-slate-200 dark:border-slate-800">Employee Name</th>
              <th className="p-3 border-r border-slate-200 dark:border-slate-800">Role</th>
              {daysArray.map((_, i) => (
                <th key={i} className="p-2 text-center border-r border-slate-200 dark:border-slate-800 w-8">{i + 1}</th>
              ))}
              <th className="p-3 text-center border-r border-slate-200 dark:border-slate-800" title="Total approved days in this month">Days Approved</th>
              <th className="p-3 text-center border-r border-slate-200 dark:border-slate-800">Rej (0)</th>
              <th className="p-3 text-center">Rate %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {matrixData.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="p-3 font-bold text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-200 dark:border-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40">
                  {row.user.name}
                </td>
                <td className="p-3 text-slate-500 capitalize border-r border-slate-200 dark:border-slate-800">{row.user.role.replace('_', ' ')}</td>
                {row.dayStatuses.map((status, i) => (
                  <td key={i} className="p-1 border-r border-slate-200 dark:border-slate-800 text-center">
                    {status === '1' && <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 font-bold">1</span>}
                    {status === '0' && <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 font-bold">0</span>}
                    {status === 'P' && <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 font-bold">P</span>}
                    {!status && <span className="text-slate-300 dark:text-slate-700">-</span>}
                  </td>
                ))}
                <td className="p-3 text-center border-r border-slate-200 dark:border-slate-800">
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{row.approvedCount}</span>
                  <span className="block text-[8px] text-slate-400 font-normal">days approved</span>
                </td>
                <td className="p-3 text-center font-bold text-rose-500 border-r border-slate-200 dark:border-slate-800">{row.rejectedCount}</td>
                <td className="p-3 text-center font-bold text-blue-500">{row.rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
