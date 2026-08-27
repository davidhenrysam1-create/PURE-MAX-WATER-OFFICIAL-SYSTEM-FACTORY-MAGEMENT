/**
 * Sticky Developer Role Inspection Top Banner
 * Displays the active real staff identity being inspected with a 1-click Exit / Restore Super Admin button.
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { Eye, RotateCcw, ShieldCheck, UserCheck, Banknote } from 'lucide-react';

export const InspectionBanner: React.FC = () => {
  const { isInspecting, currentUser, activeRole, exitInspectionMode } = useApp();

  if (!isInspecting || !currentUser) {
    return null;
  }

  const formattedRole = activeRole.replace(/_/g, ' ').toUpperCase();
  const formattedSalary = (currentUser.monthlySalaryLe || 0).toLocaleString();

  return (
    <div
      id="developer-inspection-sticky-banner"
      className="sticky top-0 z-50 w-full bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-b-2 border-amber-500 shadow-2xl text-slate-100 px-4 py-2.5 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/40 shrink-0">
            <Eye className="w-4 h-4 animate-pulse text-amber-300" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-xs text-amber-300 tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                DEVELOPER INSPECTION ACTIVE:
              </span>
              <span className="font-bold text-xs text-white bg-slate-800/90 border border-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1.5 truncate">
                <UserCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-white font-bold">{currentUser.name}</span>
                <span className="font-mono text-purple-300 text-[10px]">({currentUser.employeeId})</span>
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-amber-900/60 border border-amber-600/80 text-amber-200 uppercase font-bold">
                {formattedRole}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300 mt-0.5">
              <span className="truncate">
                Dept: <strong className="text-slate-200">{currentUser.department || 'Factory Floor'}</strong>
              </span>
              <span className="flex items-center gap-1 font-mono text-emerald-400">
                <Banknote className="w-3 h-3 text-emerald-400 shrink-0" />
                Le {formattedSalary} / mo
              </span>
              <span className="text-[10px] text-amber-300/80 hidden sm:inline">
                • Bound to genuine database record
              </span>
            </div>
          </div>
        </div>

        <button
          id="exit-inspection-banner-btn"
          onClick={exitInspectionMode}
          className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition shrink-0 cursor-pointer active:scale-95 ml-auto"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-950 shrink-0" />
          <span>Exit Inspection (Restore Super Admin)</span>
        </button>
      </div>
    </div>
  );
};
