/**
 * Attendance & Salary Module for Pure Max Factory Management System
 * Includes Check-in/out, Manager Approval Queue, Auto Salary Calculation in Le, and Manager Salary Override with Audit Log.
 */

import React, { useState, useMemo } from 'react';
import { AttendanceMatrix } from './AttendanceMatrix';
import { useApp } from '../../context/AppContext';
import { AttendanceRecord } from '../../types';
import Portal from '../common/Portal';
import {
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  Banknote,
  AlertCircle,
  Search,
  UserCheck,
  Edit2,
  Calendar,
  ShieldAlert,
  RotateCcw,
  KeyRound,
} from 'lucide-react';

export const AttendanceModule: React.FC = () => {
  const {
    attendance,
    users,
    currentUser,
    activeRole,
    checkIn,
    checkOut,
    approveAttendance,
    approveCheckOut,
    resetAttendance,
    overrideSalary,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'attendance' | 'salaries' | 'matrix'>('attendance');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Check In Modal Form State
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInNotes, setCheckInNotes] = useState('');

  // Salary Override Modal State
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newSalaryLe, setNewSalaryLe] = useState<number>(5000000);
  const [overrideReason, setOverrideReason] = useState('');

  // Reset Attendance gate (Manager / Developer only)
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const userTodayRec = attendance.find((a) => a.userId === currentUser?.id && a.date === todayStr);

  const isRestrictedStaff = ['staff', 'operator', 'tricycle_staff', 'van_staff', 'engineer', 'sales_manager'].includes(activeRole);
  const canViewAllSalaries = ['developer', 'ceo', 'manager', 'second_manager'].includes(activeRole);

  const isEligibleForCheckIn = [
    'operator',
    'staff',
    'tricycle_staff',
    'van_staff',
    'engineer',
    'sales_manager',
  ].includes(activeRole);

  const isExcludedFromCheckIn = ['manager', 'second_manager', 'developer', 'ceo'].includes(activeRole);

  const canViewMatrix = ["manager", "developer", "sales_manager", "engineer", "second_manager"].includes(activeRole);

  const canApprove = [
    'manager',
    'second_manager',
    'developer',
    'ceo',
    'sales_manager',
  ].includes(activeRole);
  const canOverrideSalary = ['manager', 'developer'].includes(activeRole);

  const getStationForRole = (role?: string) => {
    switch (role) {
      case 'sales_manager':
        return 'Factory Main Sales Depot, Makeni';
      case 'engineer':
        return 'Water Treatment & RO Bay, Makeni';
      case 'operator':
        return 'Line #1 Production Floor, Makeni';
      case 'staff':
        return 'Packaging & Sachet Depot, Makeni';
      case 'tricycle_staff':
        return 'Makeni Tricycle Distribution Fleet';
      case 'van_staff':
        return 'Makeni & Northern Region Van Fleet';
      default:
        return 'Makeni Production Plant - Line #1';
    }
  };

  const autoAssignedLocation = currentUser?.department || getStationForRole(currentUser?.role);

  /**
   * Collapse records so one (account, day) is never listed twice. A local
   * `att-<epoch>` row and the server's numeric row for the same shift arrive
   * with different ids, so without this the table repeats the same day.
   */
  const dedupedAttendance = useMemo(() => {
    const byKey = new Map<string, AttendanceRecord>();
    attendance.forEach((rec) => {
      const key = `${rec.userId || rec.employeeId}::${rec.date}`;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, rec);
        return;
      }
      // Prefer whichever copy carries more detail.
      const score = (r: AttendanceRecord) =>
        (r.checkOutTime ? 8 : 0) +
        (r.checkOutStatus ? 4 : 0) +
        (r.status && r.status !== 'pending' ? 2 : 0);
      const winner = score(rec) > score(existing) ? rec : existing;
      const loser = winner === rec ? existing : rec;
      byKey.set(key, {
        ...winner,
        checkOutTime: winner.checkOutTime ?? loser.checkOutTime,
        checkOutStatus: winner.checkOutStatus ?? loser.checkOutStatus,
      });
    });
    return Array.from(byKey.values());
  }, [attendance]);

  const filteredAttendance = dedupedAttendance.filter((a) => {
    // Restricted Staff ONLY view their own attendance records!
    if (isRestrictedStaff && !canApprove && a.userId !== currentUser?.id) {
      return false;
    }
    const matchesSearch =
      a.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.userRole.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  /**
   * Approval queue.
   *
   * FIX: the queue used to render raw `attendance`, so every extra check-in row
   * for the same person showed up as a separate duplicate entry. It is now
   * collapsed to ONE row per (account, day), and each row only surfaces the
   * DAY + DATE as requested.
   */
  const dayName = (dateStr: string): string => {
    const d = new Date(`${dateStr}T00:00:00`);
    return isNaN(d.getTime())
      ? '-'
      : d.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const pendingQueue = useMemo(() => {
    const collapsed = new Map<string, AttendanceRecord>();
    attendance.forEach((a) => {
      const needsCheckIn = a.status === 'pending';
      const needsCheckOut = a.checkOutStatus === 'pending';
      if (!needsCheckIn && !needsCheckOut) return;

      const key = `${a.userId}::${a.date}`;
      const existing = collapsed.get(key);
      if (!existing) {
        collapsed.set(key, a);
        return;
      }
      // Merge the two approval needs into one row rather than duplicating.
      collapsed.set(key, {
        ...existing,
        checkOutTime: existing.checkOutTime || a.checkOutTime,
        checkOutStatus:
          existing.checkOutStatus === 'pending' || a.checkOutStatus === 'pending'
            ? 'pending'
            : existing.checkOutStatus,
      });
    });
    return Array.from(collapsed.values()).sort((x, y) => y.date.localeCompare(x.date));
  }, [attendance]);

  const handleSelfCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    checkIn(autoAssignedLocation, checkInNotes);
    setShowCheckInModal(false);
    setCheckInNotes('');
  };

  const handleOpenOverride = (userId: string, currentMonthlyLe: number) => {
    setSelectedUserId(userId);
    setNewSalaryLe(currentMonthlyLe);
    setOverrideReason('');
    setShowOverrideModal(true);
  };

  const handleConfirmSalaryOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !overrideReason) return;
    overrideSalary(selectedUserId, newSalaryLe, overrideReason);
    setShowOverrideModal(false);
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-500" />
            Attendance & Salary Management Module
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Geotagged staff check-ins, shift approvals, and automated daily/monthly payroll in Sierra Leone Leones (SL Le).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tab toggle */}
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center gap-1 text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('attendance')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSubTab === 'attendance' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs' : 'text-slate-500'
              }`}
            >
              Attendance Records
            </button>
            <button
              onClick={() => setActiveSubTab('salaries')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSubTab === 'salaries' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs' : 'text-slate-500'
              }`}
            >
              Salary & Payroll (SL Le)
            </button>
            {['developer', 'manager', 'second_manager'].includes(activeRole) && (
              <button
                type="button"
                onClick={() => {
                  setResetPassword('');
                  setShowResetModal(true);
                }}
                className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-500/20 transition cursor-pointer"
                title="Reset all attendance records (requires Manager/Developer password)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Attendance
              </button>
            )}
            {canViewMatrix && (
              <button
                onClick={() => setActiveSubTab("matrix")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeSubTab === "matrix" ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs" : "text-slate-500"
                }`}
              >
                Attendance Summary Matrix
              </button>
            )}
          </div>

          {/* Personal Check-In Button (Excluded for Managers, CEO, Developer) */}
          {isExcludedFromCheckIn ? (
            <span className="px-3.5 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-500" />
              Manager Admin (Approvals & Payroll Only)
            </span>
          ) : !userTodayRec ? (
            <button
              onClick={() => setShowCheckInModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              Check In Today
            </button>
          ) : !userTodayRec.checkOutTime ? (
            <button
              onClick={() => checkOut(userTodayRec.id)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Check Out Now ({userTodayRec.checkInTime})
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1.5 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
              Shift Completed Today
            </span>
          )}
        </div>
      </div>

      {/* Personal Salary & Approved Attendance Card for Staff, Operators, Drivers, Engineers, Sales */}
      {isEligibleForCheckIn && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-800/60 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 block">
                Personal Payroll & Shift Breakdown
              </span>
              <h3 className="text-lg font-extrabold flex items-center gap-2 text-white">
                <Banknote className="w-5 h-5 text-emerald-400" />
                My Approved Attendance & Monthly Salary Payout
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Staff: <strong className="text-white">{currentUser?.name}</strong> | ID: <span className="font-mono text-indigo-300">{currentUser?.employeeId}</span> | Dept: <span className="text-slate-200">{currentUser?.department}</span>
              </p>
            </div>

            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Verified Attendance Dashboard
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1 font-mono text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase block">Daily Salary Rate</span>
              <span className="text-base font-bold text-amber-400">
                SL Le {currentUser?.dailySalaryLe.toLocaleString()}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase block">Approved Days Worked</span>
              <span className="text-base font-bold text-emerald-400">
                {attendance.filter((a) => a.userId === currentUser?.id && a.status === 'approved').length} Days
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase block">Earned Salary to Date</span>
              <span className="text-base font-bold text-emerald-400">
                SL Le {(attendance.filter((a) => a.userId === currentUser?.id && a.status === 'approved').length * (currentUser?.dailySalaryLe || 0)).toLocaleString()}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase block">Base Monthly Contract</span>
              <span className="text-base font-bold text-indigo-300">
                SL Le {currentUser?.monthlySalaryLe.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'attendance' && (
        /* ATTENDANCE SECTION */
        <div className="space-y-4">
          {/* Search & Status Filter */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search worker name or role..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* STAFF ATTENDANCE APPROVAL QUEUE - deduplicated, Day + Date only */}
          {canApprove && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-amber-500" />
                  Staff Attendance Approval Queue
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold">
                    {pendingQueue.length} pending
                  </span>
                </h3>
                <span className="text-[10px] text-slate-400">One entry per account per day</span>
              </div>

              {pendingQueue.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No attendance is awaiting approval.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="py-2 px-3">Worker</th>
                        <th className="py-2 px-3">Role</th>
                        <th className="py-2 px-3">Day</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {pendingQueue.map((rec) => (
                        <tr key={`${rec.userId}::${rec.date}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{rec.userName}</td>
                          <td className="py-2.5 px-3 capitalize text-slate-500">{rec.userRole.replace('_', ' ')}</td>
                          <td className="py-2.5 px-3 font-semibold text-indigo-600 dark:text-indigo-400">{dayName(rec.date)}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{rec.date}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {rec.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => approveAttendance(rec.id, false)}
                                    className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold rounded-lg hover:bg-rose-200 text-[10px] transition"
                                  >
                                    Reject In
                                  </button>
                                  <button
                                    onClick={() => approveAttendance(rec.id, true)}
                                    className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 text-[10px] transition"
                                  >
                                    Approve In
                                  </button>
                                </>
                              )}
                              {rec.checkOutStatus === 'pending' && (
                                <>
                                  <button
                                    onClick={() => approveCheckOut(rec.id, false)}
                                    className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold rounded-lg hover:bg-rose-200 text-[10px] transition"
                                  >
                                    Reject Out
                                  </button>
                                  <button
                                    onClick={() => approveCheckOut(rec.id, true)}
                                    className="px-2.5 py-1 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-[10px] transition"
                                  >
                                    Approve Out
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Attendance Table */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    {canApprove && <th className="py-3 px-3">Worker</th>}
                    {canApprove && <th className="py-3 px-3">Role</th>}
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Check-In</th>
                    {canApprove && <th className="py-3 px-3">Check-Out</th>}
                    {canApprove && <th className="py-3 px-3">Location</th>}
                    <th className="py-3 px-3">Status</th>
                    {canApprove && <th className="py-3 px-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAttendance.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      {canApprove && (
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{rec.userName}</td>
                      )}
                      {canApprove && (
                        <td className="py-3 px-3 capitalize text-slate-500">{rec.userRole.replace('_', ' ')}</td>
                      )}
                      <td className="py-3 px-3 font-mono text-slate-500">{rec.date}</td>
                      <td className="py-3 px-3 font-bold text-blue-600 dark:text-blue-400 font-mono">{rec.checkInTime}</td>
                      {canApprove && (
                      <td className="py-3 px-3">
                        <span className="font-mono text-slate-500">{rec.checkOutTime || '--:--'}</span>
                        {rec.checkOutTime && (
                          <span
                            className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              rec.checkOutStatus === 'approved'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : rec.checkOutStatus === 'rejected'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {rec.checkOutStatus || 'approved'}
                          </span>
                        )}
                      </td>
                      )}
                      {canApprove && (
                      <td className="py-3 px-3 text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{rec.location || 'Factory Floor'}</span>
                      </td>
                      )}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            rec.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : rec.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      {canApprove && (
                        <td className="py-3 px-3 text-right">
                          {(rec.status === 'pending' || activeRole === 'developer') && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => approveAttendance(rec.id, false)}
                                className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold rounded-lg hover:bg-rose-200 text-[10px] transition"
                                title="Reject attendance"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => approveAttendance(rec.id, true)}
                                className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 text-[10px] shadow-sm transition"
                                title="Approve attendance"
                              >
                                Approve
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'salaries' && (
        /* SALARIES & PAYROLL SECTION */
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-emerald-500" />
                  {canViewAllSalaries ? 'Monthly Factory Staff Payroll (Sierra Leone Leones)' : 'My Personal Monthly Salary & Payroll (Sierra Leone Leones)'}
                </h3>
                <p className="text-xs text-slate-500">
                  {canViewAllSalaries
                    ? 'Calculated automatically: (Approved Present Days × Daily Salary Rate)'
                    : 'Your approved attendance days and calculated take-home pay based on your contract rate.'}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-3">Employee Name</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3 text-right">Approved Days</th>
                    <th className="py-3 px-3 text-right">Daily Rate (SL Le)</th>
                    <th className="py-3 px-3 text-right">Computed Monthly Salary (SL Le)</th>
                    {canOverrideSalary && <th className="py-3 px-3 text-right">Override</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users
                    .filter((u) => canViewAllSalaries || u.id === currentUser?.id || u.employeeId === currentUser?.employeeId)
                    .map((u) => {
                    const approvedCount = attendance.filter((a) => a.userId === u.id && a.status === 'approved').length;
                    const computedSalary = approvedCount > 0 ? approvedCount * u.dailySalaryLe : u.monthlySalaryLe;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{u.employeeId}</div>
                        </td>
                        <td className="py-3 px-3 capitalize text-slate-500">
                          {u.role === 'sales_manager' ? 'Sales Production Officer' : u.role.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {approvedCount} Days
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-500">
                          SL Le {u.dailySalaryLe.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-blue-600 dark:text-blue-400 font-mono text-sm">
                          SL Le {computedSalary.toLocaleString()}
                        </td>
                        {canOverrideSalary && (
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleOpenOverride(u.id, u.monthlySalaryLe)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 dark:text-blue-300 font-medium text-[11px] flex items-center justify-end gap-1 ml-auto transition"
                            >
                              <Edit2 className="w-3 h-3" />
                              Override
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'matrix' && (
        <AttendanceMatrix attendance={attendance} users={users} />
      )}

      {/* Check In Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-900 dark:text-white space-y-4 text-xs">
            <h3 className="text-base font-extrabold flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <Clock className="w-5 h-5 text-emerald-500" />
              Staff Shift Check-In
            </h3>

            <form onSubmit={handleSelfCheckIn} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                    Assigned Duty Station
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold">
                    Management Approved
                  </span>
                </div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  {autoAssignedLocation}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Location is automatically registered based on your official staff duty assignment.
                </p>
              </div>

              <div>
                <label className="block font-semibold mb-1">Shift Notes / Duty Assignment</label>
                <textarea
                  value={checkInNotes}
                  onChange={(e) => setCheckInNotes(e.target.value)}
                  placeholder="e.g. Processing Line #1 daily packaging shift..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCheckInModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 font-bold text-white rounded-xl shadow-md shadow-emerald-500/20"
                >
                  Confirm Check-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-900 dark:text-white space-y-4 text-xs">
            <h3 className="text-base font-extrabold flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Manager Salary Rate Override
            </h3>

            <p className="text-[11px] text-slate-500">
              Note: Every salary override is strictly written to system audit logs with manager credentials and reason code.
            </p>

            <form onSubmit={handleConfirmSalaryOverride} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">New Monthly Base Rate (SL Le)</label>
                <input
                  type="number"
                  step="100000"
                  value={newSalaryLe}
                  onChange={(e) => setNewSalaryLe(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-extrabold font-mono text-base text-blue-600 dark:text-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Audit Reason for Override</label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Approved overtime allowance or performance bonus..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 font-bold text-white rounded-xl shadow-md shadow-blue-500/20"
                >
                  Save Override & Log Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Attendance - Manager / Developer password gate */}
      {showResetModal && (
        <Portal containerId="attendance-reset-dialog-root">
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            role="alertdialog"
            aria-modal="true"
            onClick={() => setShowResetModal(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 shadow-2xl p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Reset All Attendance Records
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Manager / Developer only &middot; password required
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800">
                <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                  This will permanently clear <strong>all {attendance.length} attendance records</strong> for every
                  staff member. A backup is downloaded as an Excel workbook and stored locally before anything is
                  deleted.
                </p>
              </div>

              <label className="block">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  Enter your Manager / Developer password
                </span>
                <input
                  type="password"
                  autoFocus
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetPassword('');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!resetPassword}
                  onClick={() => {
                    const ok = resetAttendance(resetPassword);
                    if (ok) {
                      setShowResetModal(false);
                      setResetPassword('');
                    }
                  }}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs text-white transition flex items-center gap-1.5 ${
                    resetPassword
                      ? 'bg-rose-600 hover:bg-rose-700 cursor-pointer'
                      : 'bg-rose-300 dark:bg-rose-900 cursor-not-allowed'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset {attendance.length} Records
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
};
