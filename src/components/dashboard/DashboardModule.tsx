/**
 * Role-Scoped Dashboard Module for Pure Max Factory Management System
 */

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { compressImage } from '../../utils/imageCompressor';
import { recordTimestamp } from '../../utils/dateUtils';
import {
  TrendingUp,
  Banknote,
  Factory,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  ShoppingCart,
  Wrench,
  Gauge,
  Plus,
  ShieldAlert,
  Sparkles,
  Layers,
  FileSpreadsheet,
  Megaphone,
  BarChart,
  Calendar,
  Eye,
  ShieldCheck,
  RotateCcw,
  Lock,
  ImageIcon,
  Upload,
  Trash2,
  Save,
  Camera,
  Check,
  ShoppingBag,
  Scale,
  UserPlus,
  UserCheck,
} from 'lucide-react';

export const DashboardModule: React.FC = () => {
  const {
    currentUser,
    activeRole,
    isInspecting,
    inspectingOriginalUser,
    exitInspectionMode,
    switchRolePreview,
    sales,
    production,
    outerBuyings,
    rollBuyings,
    expenses,
    attendance,
    equipmentLogs,
    repairs,
    fuel,
    users,
    machines,
    announcements,
    systemHealth,
    approveAttendance,
    approveCheckOut,
    checkIn,
    checkOut,
    setActiveTab,
    theme,
    updateTheme,
    showToast,
    todayDateKey,
    dailyWindowStart,
    resetDailyCounters,
    resetMaterialBuyings,
    resetProductionRecords,
    resetRepairsAndFuel,
    resetToFreshDatabase,
    packagingRolls,
  } = useApp();

  // Manager/Developer "Reset Daily Counters" — two-step confirmation state.
  const canResetDaily = ['manager', 'second_manager', 'developer'].includes(activeRole);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [showMaterialResetConfirm, setShowMaterialResetConfirm] = useState(false);
  const [materialResetPassword, setMaterialResetPassword] = useState('');
  // Full production reset (batches + roll inventory + outer film)
  const [showProductionResetConfirm, setShowProductionResetConfirm] = useState(false);
  const [productionResetPassword, setProductionResetPassword] = useState('');
  const [showRepairsFuelResetConfirm, setShowRepairsFuelResetConfirm] = useState(false);
  const [repairsFuelResetPassword, setRepairsFuelResetPassword] = useState('');
  const [showFreshStartConfirm, setShowFreshStartConfirm] = useState(false);
  const [freshStartPassword, setFreshStartPassword] = useState('');

  // Daily Developer Branding State
  const loginFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const [loginBgInput, setLoginBgInput] = useState(theme.loginBgUrl || '');
  const [bannerBgInput, setBannerBgInput] = useState(theme.bannerBgUrl || '');
  const [factoryNameInput, setFactoryNameInput] = useState(theme.factoryName || 'Pure Max Factory #1');
  const [brandingStatusMsg, setBrandingStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (theme.loginBgUrl) setLoginBgInput(theme.loginBgUrl);
  }, [theme.loginBgUrl]);

  useEffect(() => {
    if (theme.bannerBgUrl) setBannerBgInput(theme.bannerBgUrl);
  }, [theme.bannerBgUrl]);

  useEffect(() => {
    if (theme.factoryName) setFactoryNameInput(theme.factoryName);
  }, [theme.factoryName]);

  const dailyThemesGallery = [
    {
      id: 'crystal-spring',
      title: 'Makeni Crystal Spring Flow',
      desc: 'Pristine mountain mineral water reservoir & fresh morning current',
      tag: 'Morning Freshness',
      loginBg: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&auto=format&fit=crop&q=80',
      bannerBg: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1600&auto=format&fit=crop&q=80',
    },
    {
      id: 'bottling-plant',
      title: 'Automated Bottling & Sterile Line',
      desc: 'High-speed conveyor packaging & ultra-filtration machinery',
      tag: 'Industrial Power',
      loginBg: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1600&auto=format&fit=crop&q=80',
      bannerBg: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1600&auto=format&fit=crop&q=80',
    },
    {
      id: 'pure-aqua',
      title: 'Deep Mineral Aqua Filtration',
      desc: 'Crystal pure hydration & sanitized laboratory quality control',
      tag: 'Quality Standard',
      loginBg: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1600&auto=format&fit=crop&q=80',
      bannerBg: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=80',
    },
    {
      id: 'fleet-sunrise',
      title: 'Sierra Leone Distribution Fleet',
      desc: 'Early morning van & tricycle dispatch across Makeni & Freetown',
      tag: 'Plant Logistics',
      loginBg: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=1600&auto=format&fit=crop&q=80',
      bannerBg: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&auto=format&fit=crop&q=80',
    },
  ];

  const handleApplyDailyPreset = (preset: typeof dailyThemesGallery[0]) => {
    setLoginBgInput(preset.loginBg);
    setBannerBgInput(preset.bannerBg);
    updateTheme({
      loginBgUrl: preset.loginBg,
      bannerBgUrl: preset.bannerBg,
    });
    showToast(`Daily Theme "${preset.title}" Applied Successfully!`, 'success', 'Daily UI Updated');
    setBrandingStatusMsg(`🌟 Applied "${preset.title}" as today's active UI login picture and top banner!`);
    setTimeout(() => setBrandingStatusMsg(null), 5000);
  };

  const handleUploadLoginFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        if (file.size > 2 * 1024 * 1024) {
          showToast('Large image detected: Auto-compressing for ultra-fast performance...', 'info', 'Optimizing Image');
        }
        const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.7 });
        if (compressed) {
          setLoginBgInput(compressed);
          updateTheme({ loginBgUrl: compressed });
          showToast('Login Screen Picture uploaded & compressed successfully', 'info', 'Login Picture Updated');
          setBrandingStatusMsg('📸 Custom login screen background updated and optimized!');
          setTimeout(() => setBrandingStatusMsg(null), 4000);
        }
      } catch (err) {
        console.warn('Login image upload error:', err);
        showToast('Image processing completed with safe fallback', 'info', 'Login Picture');
      }
    }
  };

  const handleUploadBannerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        if (file.size > 2 * 1024 * 1024) {
          showToast('Large image detected: Auto-compressing banner...', 'info', 'Optimizing Banner');
        }
        const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.7 });
        if (compressed) {
          setBannerBgInput(compressed);
          updateTheme({ bannerBgUrl: compressed });
          showToast('Top Navigation Banner uploaded & compressed successfully', 'info', 'Banner Picture Updated');
          setBrandingStatusMsg('📸 Top navigation banner background updated and optimized!');
          setTimeout(() => setBrandingStatusMsg(null), 4000);
        }
      } catch (err) {
        console.warn('Banner image upload error:', err);
        showToast('Banner image processed with safe fallback', 'info', 'Banner Picture');
      }
    }
  };

  const handleSaveDeveloperDailyBranding = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateTheme({
      loginBgUrl: loginBgInput ? loginBgInput.trim() : undefined,
      bannerBgUrl: bannerBgInput ? bannerBgInput.trim() : undefined,
      factoryName: (factoryNameInput && factoryNameInput.trim()) || 'Pure Max Factory #1',
    });
    showToast('Global Developer Branding Updated Successfully', 'success', 'Developer Branding Deployed');
    setBrandingStatusMsg('✨ Global Developer Branding (Login Screen & Header Banner) saved and deployed!');
    setTimeout(() => setBrandingStatusMsg(null), 5000);
  };

  // -------------------------------------------------------------------------
  // Financial Computations in Leones (Le)
  // -------------------------------------------------------------------------
  // Daily figures are now window-based rather than calendar-string based:
  //  * `dailyWindowStart` is the later of local midnight and the last manual
  //    reset (see AppContext), so the Manager's "Reset Daily Counters" zeroes
  //    the cards without deleting a single record.
  //  * `todayDateKey` flips exactly at local midnight (a timer re-renders this
  //    component), so the cards roll over on their own even if the tab has been
  //    open for days.
  // The old code used `new Date().toISOString().split('T')[0]`, which is a UTC
  // date and was also captured once per render — hence "daily totals never
  // reset".
  const inDailyWindow = React.useCallback(
    (record: { date?: string; createdAt?: string }) => {
      const ts = recordTimestamp(record);
      if (Number.isNaN(ts)) return record.date === todayDateKey;
      return ts >= dailyWindowStart;
    },
    [dailyWindowStart, todayDateKey]
  );

  // Daily Computations
  const todaysSales = sales.filter(inDailyWindow);
  const todaysExpenses = expenses.filter(inDailyWindow);
  const todaysProduction = production.filter(inDailyWindow);

  const dailySalesLe = todaysSales.reduce((acc, curr) => acc + curr.totalAmountLe, 0);
  const dailyExpensesLe = todaysExpenses.reduce((acc, curr) => acc + curr.amountLe, 0);
  const dailyNetProfitLe = dailySalesLe - dailyExpensesLe;
  const dailyBundlesProduced = todaysProduction.reduce((acc, curr) => acc + curr.bundlesProduced, 0);

  // Lifetime Computations
  const totalSalesLe = sales.reduce((acc, curr) => acc + curr.totalAmountLe, 0);
  const totalExpensesLe = expenses.reduce((acc, curr) => acc + curr.amountLe, 0);
  const totalSalariesLe = users.reduce((acc, curr) => acc + curr.monthlySalaryLe, 0);
  const netProfitLe = totalSalesLe - totalExpensesLe;
  const totalBundlesProduced = production.reduce((acc, curr) => acc + curr.bundlesProduced, 0);
  const totalBundlesDamaged = production.reduce((acc, curr) => acc + curr.damagedBundles, 0);

  const developerRoles: { role: UserRole; label: string; desc: string; badge: string }[] = [
    { role: 'developer', label: 'Developer (Super Admin)', desc: 'Full root access, SQL queries, system health & audit', badge: 'bg-purple-950 text-purple-300 border-purple-800' },
    { role: 'ceo', label: 'CEO (Owner)', desc: 'Executive read-only analytics, financial yields, and metrics', badge: 'bg-amber-950 text-amber-300 border-amber-800' },
    { role: 'manager', label: 'Factory Manager (Head)', desc: 'Operational control, staff management, approvals & expenses', badge: 'bg-blue-950 text-blue-300 border-blue-800' },
    { role: 'second_manager', label: '2nd Shift Manager', desc: 'Shift operations, night batch management & staff tracking', badge: 'bg-cyan-950 text-cyan-300 border-cyan-800' },
    { role: 'sales_manager', label: 'Sales Production Officer', desc: 'Wholesale client orders, van & tricycle reconciliation', badge: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
    { role: 'operator', label: 'Machine Operator', desc: 'Water TDS, pH, filtration pressure & production logs', badge: 'bg-indigo-950 text-indigo-300 border-indigo-800' },
    { role: 'engineer', label: 'Production Engineer', desc: 'Machinery repairs, generator fuel logs & maintenance', badge: 'bg-orange-950 text-orange-300 border-orange-800' },
    { role: 'staff', label: 'Factory Staff', desc: 'Attendance check-in, salary oversight & factory broadcasts', badge: 'bg-slate-900 text-slate-300 border-slate-700' },
    { role: 'tricycle_staff', label: 'Tricycle Driver', desc: 'GPS delivery tracking, batch dispatch & sales drop-off', badge: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
    { role: 'van_staff', label: 'Van Distribution Driver', desc: 'High-capacity route delivery, GPS tracking & retail drops', badge: 'bg-blue-950 text-blue-300 border-blue-800' },
  ];

  const myProductionRecords = production.filter(p => p.outerOperatorName === currentUser?.name || p.rollOperatorName === currentUser?.name);
  const myTodayProductionRecords = myProductionRecords.filter(inDailyWindow);
  const myLifetimeBundles = myProductionRecords.reduce((acc, curr) => acc + curr.bundlesProduced, 0);
  const myTodayBundles = myTodayProductionRecords.reduce((acc, curr) => acc + curr.bundlesProduced, 0);

  const dayName = (dateStr: string): string => {
    const d = new Date(`${dateStr}T00:00:00`);
    return isNaN(d.getTime())
      ? '-'
      : d.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const pendingAttendance = React.useMemo(() => {
    const collapsed = new Map<string, any>();
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

  // ---------------------------------------------------------------------------
  // ISSUE #5 — "Recent Sales Transactions" must be a LIVE feed
  // ---------------------------------------------------------------------------
  // Previously this rendered `sales.slice(0, 4)` — the first four rows in
  // whatever order they happened to sit in state, including seeded/demo rows and
  // non-sales entries such as "Damaged Bundles". It is now bound strictly to
  // transactions logged by an ACTIVE Production Sales Officer account, newest
  // first. Anything unattributable is treated as demo/legacy noise and hidden
  // here (it is still present in Reports and the Excel export, and
  // `purgeDemoData()` in AppContext can remove it outright).
  const liveSalesFeed = React.useMemo(() => {
    const officerKeys = new Set<string>();
    users.forEach((u) => {
      if (u.role === 'sales_manager' && u.status !== 'suspended') {
        officerKeys.add(String(u.id).toLowerCase());
        officerKeys.add(String(u.name).toLowerCase().trim());
      }
    });

    return sales
      .filter((s) => {
        if (s.category === 'Damaged Bundles') return false;
        const byId = String(s.recordedById || '').toLowerCase();
        const byName = String(s.recordedByName || '').toLowerCase().trim();
        return officerKeys.has(byId) || officerKeys.has(byName);
      })
      .sort((a, b) => (recordTimestamp(b) || 0) - (recordTimestamp(a) || 0))
      .slice(0, 4);
  }, [sales, users]);

  const latestEquipmentLog = equipmentLogs[0] || {
    tdsLevelPpm: 0,
    phLevel: 0,
    filtrationPressurePsi: 0,
    uvSterilizerStatus: 'none',
  };

  const todayStr = todayDateKey;
  const userTodayRecord = attendance.find((a) => a.userId === currentUser?.id && a.date === todayStr);
  const userCheckedInToday = !!userTodayRecord;
  const isEligibleForCheckIn = ['operator', 'staff', 'tricycle_staff', 'van_staff', 'engineer', 'sales_manager'].includes(activeRole);

  return (
    <div className="space-[#12] space-y-6 text-slate-900 dark:text-white">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-[#020617] text-slate-100 border border-slate-800/80 shadow-xl relative overflow-hidden">
        {theme.bannerBgUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20 pointer-events-none transition-all duration-500"
            style={{ backgroundImage: `url(${theme.bannerBgUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 font-mono text-[11px] font-semibold border border-indigo-800/60 uppercase">
                {activeRole.replace('_', ' ')} Dashboard
              </span>
              <span className="text-slate-500 text-xs">| {currentUser?.department}</span>
              {currentUser?.role === 'developer' && activeRole !== 'developer' && (
                <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 font-mono text-[10px] font-bold border border-amber-800 animate-pulse">
                  DEV PREVIEW MODE
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
              Welcome back, {currentUser?.name || 'Worker'}!
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Pure Max Purified Mineral Water Factory operations active. Manage sales, production, attendance, expenses, and real-time announcements.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Action Button based on Role */}
            {(activeRole === 'sales_manager' || activeRole === 'manager') && (
              <button
                onClick={() => setActiveTab('sales')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20 text-white transition border border-indigo-400/30 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Record New Sale
              </button>
            )}

            {activeRole === 'engineer' && (
              <button
                onClick={() => setActiveTab('equipment')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 text-white transition border border-amber-400/30 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Log Telemetry & Equipment
              </button>
            )}

            {/* Attendance & Salary Shortcut for Staff & Operating Staff */}
            {['operator', 'staff', 'tricycle_staff', 'van_staff'].includes(activeRole) && (
              <button
                onClick={() => setActiveTab('attendance')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20 text-white transition border border-indigo-400/30 cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                Attendance & Salary
              </button>
            )}

            {/* Check-In / Check-Out Controls (Strictly for Operator, Staff, Drivers, Engineer, Sales Officer - Excluded for Managers/CEO/Dev) */}
            {isEligibleForCheckIn && (
              <>
                {!userCheckedInToday ? (
                  <button
                    onClick={() => {
                      const autoLocation = currentUser?.department || 'Makeni Production Plant - Line #1';
                      checkIn(autoLocation, 'Checked in from Dashboard');
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 text-white transition border border-emerald-400/30 cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                    Check In Today
                  </button>
                ) : !userTodayRecord.checkOutTime ? (
                  <button
                    onClick={() => checkOut(userTodayRecord.id)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Check Out Now ({userTodayRecord.checkInTime})
                  </button>
                ) : (
                  <span className="px-3.5 py-2 rounded-xl bg-slate-800 text-emerald-400 font-bold text-xs flex items-center gap-1.5 border border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4" />
                    Shift Done ({userTodayRecord.checkInTime} - {userTodayRecord.checkOutTime})
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Developer Role Inspection Sandbox (DEVELOPER DASHBOARD ONLY - REAL DATABASE ACCOUNTS STRICTLY)
          ISSUE #12: this previously rendered when `currentUser?.role === 'developer' || isInspecting`.
          During an inspection the Developer's session IS the target staff account, so
          `currentUser.role` is no longer 'developer' — but `isInspecting` is true, so the
          whole grid of "Inspect As …" buttons was still painted INSIDE the staff member's
          dashboard. That is the "secondary inspection triggers leaking into the target
          dashboard" the spec calls out.

          It now renders only on the Developer's own dashboard, and only when not
          inspecting. While inspecting, the single sticky "Exit Inspection Mode" control
          in InspectionBanner.tsx is the only way out. */}
      {currentUser?.role === 'developer' && !isInspecting && (
        <div
          id="developer-inspection-sandbox-container"
          className="p-5 rounded-2xl bg-slate-900 border border-purple-900/50 shadow-xl space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Developer Role Inspection & Security Sandbox</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                    SUPER ADMIN EXCLUSIVE
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Strict Real Account Mode: Dynamically matches ONLY verified accounts registered in the database. Dummy personas removed.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>Zero Dummy Data • Authentic DB Binding</span>
              </span>
              {isInspecting && (
                <button
                  type="button"
                  id="sandbox-restore-dev-top-btn"
                  onClick={exitInspectionMode}
                  className="text-xs px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Super Admin</span>
                </button>
              )}
            </div>
          </div>

          {/* Role Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {developerRoles.map((r) => {
              // Handle Developer Role Card (David Henry Sam)
              if (r.role === 'developer') {
                const devAccount = users.find((u) => u.role === 'developer') || currentUser;
                const isCurrent = currentUser?.role === 'developer' && !isInspecting;

                return (
                  <div
                    key={r.role}
                    id={`sandbox-role-card-${r.role}`}
                    className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      isCurrent
                        ? 'bg-purple-950/80 border-purple-400 shadow-lg shadow-purple-950/60 ring-2 ring-purple-500'
                        : 'bg-slate-950/80 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-white line-clamp-1">{r.label}</span>
                        {isCurrent && <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 ml-1" />}
                      </div>

                      {/* Developer Real Profile Box */}
                      <div className="my-2 p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2">
                        {devAccount?.avatarUrl ? (
                          <img
                            src={devAccount.avatarUrl}
                            alt={devAccount.name}
                            className="w-8 h-8 rounded-lg object-cover border border-purple-500/40 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-purple-900/50 text-purple-200 text-xs font-bold flex items-center justify-center border border-purple-700 shrink-0">
                            DH
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold text-slate-100 truncate">
                            {devAccount?.name || 'David Henry Sam'}
                          </div>
                          <div className="text-[9px] font-mono text-purple-300 truncate">
                            {devAccount?.employeeId || 'DEV-11422'} • Super Admin
                          </div>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">{r.desc}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mb-2">
                        <span>Salary: Le {(devAccount?.monthlySalaryLe || 9100000).toLocaleString()} / mo</span>
                        <span className="text-purple-400 font-bold">ROOT OWNER</span>
                      </div>

                      {isInspecting ? (
                        <button
                          type="button"
                          onClick={exitInspectionMode}
                          className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[10px] flex items-center justify-center gap-1.5 transition shadow cursor-pointer active:scale-98"
                        >
                          <RotateCcw className="w-3 h-3 text-slate-950" />
                          <span>Restore Super Admin</span>
                        </button>
                      ) : (
                        <div className="w-full py-1.5 rounded-lg bg-purple-950 border border-purple-700/60 text-purple-300 font-bold text-[10px] flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-purple-400" />
                          <span>Super Admin Active</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Non-Developer Roles: Query REAL database accounts ONLY
              const matchingUsers = users.filter(
                (u) => u.role === r.role && u.status !== 'suspended' && u.role !== 'developer'
              );
              const hasRealAccount = matchingUsers.length > 0;
              const primaryUser = matchingUsers[0];
              const isCurrentlyInspectingThisRole =
                isInspecting && currentUser?.role === r.role && (!primaryUser || currentUser.id === primaryUser.id);

              return (
                <div
                  key={r.role}
                  id={`sandbox-role-card-${r.role}`}
                  className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between relative group ${
                    isCurrentlyInspectingThisRole
                      ? 'bg-purple-950/80 border-purple-400 shadow-lg shadow-purple-950/60 ring-2 ring-purple-500'
                      : hasRealAccount
                      ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/50 border-slate-800/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-white line-clamp-1 group-hover:text-purple-300 transition">
                        {r.label}
                      </span>
                      {isCurrentlyInspectingThisRole && (
                        <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 ml-1" />
                      )}
                    </div>

                    {hasRealAccount ? (
                      /* Real DB Account Profile Display */
                      <div className="my-2 p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2">
                        {primaryUser.avatarUrl ? (
                          <img
                            src={primaryUser.avatarUrl}
                            alt={primaryUser.name}
                            className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-300 text-xs font-bold flex items-center justify-center border border-emerald-700 shrink-0">
                            {primaryUser.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold text-slate-100 truncate">
                            {primaryUser.name}
                          </div>
                          <div className="text-[9px] font-mono text-emerald-400 truncate flex items-center gap-1">
                            <UserCheck className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                            <span>{primaryUser.employeeId}</span>
                            <span className="text-slate-500">• Registered</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Clean Unassigned / Empty State Banner */
                      <div className="my-2 p-2.5 rounded-xl bg-amber-950/20 border border-dashed border-amber-800/60 text-center">
                        <span className="text-[10px] font-bold text-amber-300 flex items-center justify-center gap-1">
                          <Lock className="w-3 h-3 text-amber-400" />
                          No Registered Account
                        </span>
                        <p className="text-[9px] text-slate-400 mt-0.5">Unassigned Role in Database</p>
                      </div>
                    )}

                    <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">{r.desc}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80">
                    {hasRealAccount ? (
                      <>
                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mb-2">
                          <span>Salary: Le {(primaryUser.monthlySalaryLe || 0).toLocaleString()} / mo</span>
                          <span className="text-emerald-400 font-bold">
                            {matchingUsers.length} Active User{matchingUsers.length > 1 ? 's' : ''}
                          </span>
                        </div>

                        {isCurrentlyInspectingThisRole ? (
                          <div className="w-full py-1.5 rounded-lg bg-amber-950/80 border border-amber-600 text-amber-300 font-bold text-[10px] flex items-center justify-center gap-1 shadow">
                            <Eye className="w-3 h-3 text-amber-400 animate-pulse" />
                            <span>Currently Inspecting 👁️</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            id={`sandbox-inspect-btn-${r.role}`}
                            onClick={() => switchRolePreview(r.role, primaryUser)}
                            className="w-full py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition shadow shadow-purple-600/30 cursor-pointer active:scale-98"
                          >
                            <span>Inspect As {primaryUser.name.split(' ')[0]} &rarr;</span>
                          </button>
                        )}

                        {/* Additional Users in Same Role */}
                        {matchingUsers.length > 1 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {matchingUsers.slice(1).map((extraUser) => (
                              <button
                                key={extraUser.id}
                                type="button"
                                onClick={() => switchRolePreview(r.role, extraUser)}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 hover:bg-purple-900/60 text-slate-300 hover:text-purple-200 border border-slate-800 transition cursor-pointer"
                              >
                                {extraUser.name.split(' ')[0]} ({extraUser.employeeId})
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          disabled
                          title="No registered user account exists for this role"
                          className="w-full py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-500 text-[10px] font-bold cursor-not-allowed flex items-center justify-center gap-1 opacity-60"
                        >
                          <Lock className="w-3 h-3 text-slate-600" />
                          <span>Inspection Locked</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('users')}
                          className="w-full py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-800/80 border border-indigo-700 text-indigo-300 hover:text-white text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <UserPlus className="w-3 h-3 text-indigo-300" />
                          <span>+ Assign / Create Staff</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* UI Login Picture & Top Banner Daily Update Section (DEVELOPER DASHBOARD ONLY) */}
      {currentUser?.role === 'developer' && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-purple-900/50 shadow-xl space-y-4">
          {/* Hidden File Upload Inputs for Developer Daily Branding */}
          <input
            type="file"
            ref={loginFileRef}
            onChange={handleUploadLoginFile}
            accept="image/*"
            className="hidden"
          />
          <input
            type="file"
            ref={bannerFileRef}
            onChange={handleUploadBannerFile}
            accept="image/*"
            className="hidden"
          />

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>UI Login Picture & Banner Daily Update Hub</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold uppercase">
                      DEVELOPER ONLY
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Daily 1-click photo rotations & live custom background image uplinks for the Login Portal and Header Banner.
                  </p>
                </div>
              </div>

              {brandingStatusMsg && (
                <div className="px-3 py-1 bg-emerald-950/80 border border-emerald-700 text-emerald-300 rounded-lg text-[11px] font-bold flex items-center gap-1.5 animate-fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{brandingStatusMsg}</span>
                </div>
              )}
            </div>

            {/* Daily Water Plant Themes Gallery (1-Click Instant Apply) */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                Daily Water Plant Presets (1-Click Instant Apply)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {dailyThemesGallery.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/60 transition flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div className="h-16 rounded-lg overflow-hidden relative mb-2 border border-slate-800/80">
                      <img
                        src={preset.bannerBg}
                        alt={preset.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[8px] font-mono font-bold text-indigo-300 border border-indigo-500/30">
                        {preset.tag}
                      </div>
                    </div>
                    <div className="mb-2">
                      <h4 className="text-[11px] font-bold text-white group-hover:text-purple-300 transition leading-snug truncate">
                        {preset.title}
                      </h4>
                      <p className="text-[9px] text-slate-400 line-clamp-1 mt-0.5">{preset.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyDailyPreset(preset)}
                      className="w-full py-1.5 bg-purple-950/80 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-800/80 font-bold text-[10px] rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      Apply Daily Preset
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Daily Upload & Live Previews Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {/* Login Picture Card */}
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-200 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                    UI Login Picture
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Device Upload / URL</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={loginBgInput}
                    onChange={(e) => setLoginBgInput(e.target.value)}
                    placeholder="https://... or upload image"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-800 bg-[#020617] text-slate-200 text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-hidden truncate"
                  />
                  <button
                    type="button"
                    onClick={() => loginFileRef.current?.click()}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                  </button>
                  {loginBgInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setLoginBgInput('');
                        updateTheme({ loginBgUrl: undefined });
                      }}
                      className="p-1.5 rounded-xl bg-rose-950/50 border border-rose-900/60 text-rose-400 hover:bg-rose-900/60 transition cursor-pointer"
                      title="Clear Login Picture"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Login Live Preview Box */}
                <div className="relative h-24 rounded-xl overflow-hidden border border-slate-800 bg-[#020617] flex items-center justify-center">
                  {loginBgInput ? (
                    <img
                      src={loginBgInput}
                      alt="Login Screen Daily Preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                      <ImageIcon className="w-4 h-4 text-slate-600" />
                      <span>Default Dark Aurora Background</span>
                    </div>
                  )}
                  <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/10 text-[8px] font-mono font-bold text-slate-200">
                    Login Screen Live Preview
                  </div>
                </div>
              </div>

              {/* Banner Picture Card */}
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-200 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                    Top Header Banner Picture
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Device Upload / URL</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={bannerBgInput}
                    onChange={(e) => setBannerBgInput(e.target.value)}
                    placeholder="https://... or upload banner"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-800 bg-[#020617] text-slate-200 text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-hidden truncate"
                  />
                  <button
                    type="button"
                    onClick={() => bannerFileRef.current?.click()}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                  </button>
                  {bannerBgInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setBannerBgInput('');
                        updateTheme({ bannerBgUrl: undefined });
                      }}
                      className="p-1.5 rounded-xl bg-rose-950/50 border border-rose-900/60 text-rose-400 hover:bg-rose-900/60 transition cursor-pointer"
                      title="Clear Banner Picture"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Banner Live Preview Box */}
                <div className="relative h-24 rounded-xl overflow-hidden border border-slate-800 bg-[#020617] flex items-center justify-center">
                  {bannerBgInput ? (
                    <img
                      src={bannerBgInput}
                      alt="Top Banner Daily Preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-center opacity-90"
                    />
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                      <ImageIcon className="w-4 h-4 text-slate-600" />
                      <span>Default Header Metallic Gradient</span>
                    </div>
                  )}
                  <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/10 text-[8px] font-mono font-bold text-slate-200">
                    Top Banner Live Preview
                  </div>
                </div>
              </div>
            </div>

            {/* Factory Title & Deploy Row */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={factoryNameInput}
                  onChange={(e) => setFactoryNameInput(e.target.value)}
                  placeholder="Pure Max Factory #1"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-[#020617] text-slate-200 text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveDeveloperDailyBranding}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-lg shadow-purple-500/25 transition flex items-center gap-2 text-xs cursor-pointer shrink-0"
              >
                <Save className="w-4 h-4" />
                Save & Deploy Daily UI Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Row (Scoped to Role - Staff Accounts see Personal Attendance, Shifts & Pay Rate, while Management sees Revenue, Production, Expenses & Water Quality) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {['staff', 'operator', 'tricycle_staff', 'van_staff'].includes(activeRole) ? (
          <>
            {/* 1. Staff Approved Attendance KPI */}
            <div className="p-4 rounded-xl bg-slate-900/60 dark:bg-slate-900/80 border border-slate-800/80 shadow-md flex items-center justify-between hover:border-slate-700 transition">
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider text-[10px] font-mono">My Approved Attendance</span>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                  {attendance.filter((a) => a.userId === currentUser?.id && a.status === 'approved').length} Days
                </div>
                <span className="text-[10px] text-emerald-300 font-medium flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Verified for Monthly Salary
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            {/* 2. Staff Today's Shift & Check-in Status */}
            <div className="p-4 rounded-xl bg-slate-900/60 dark:bg-slate-900/80 border border-slate-800/80 shadow-md flex items-center justify-between hover:border-slate-700 transition">
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider text-[10px] font-mono">Today's Shift Status</span>
                <div className="text-sm font-bold font-mono text-cyan-400 mt-1 flex items-center gap-1.5">
                  {userCheckedInToday ? (
                    userTodayRecord?.checkOutTime ? (
                      <span className="text-emerald-400">Shift Done ({userTodayRecord.checkOutTime})</span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Active ({userTodayRecord?.checkInTime})
                      </span>
                    )
                  ) : (
                    <span className="text-amber-400">Pending Check-in</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5 truncate max-w-[140px]">
                  {currentUser?.department || 'Makeni Production Plant'}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* 3. Staff Daily Pay Rate & Accrued Earnings */}
            <div className="p-4 rounded-xl bg-slate-900/60 dark:bg-slate-900/80 border border-slate-800/80 shadow-md flex items-center justify-between hover:border-slate-700 transition">
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider text-[10px] font-mono">Daily Pay Rate</span>
                <div className="text-xl font-bold font-mono text-indigo-400 mt-1">
                  SL Le {(currentUser?.dailySalaryLe || 0).toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                  Est. Accrued: <strong className="text-emerald-400">SL Le {((currentUser?.dailySalaryLe || 0) * attendance.filter((a) => a.userId === currentUser?.id && a.status === 'approved').length).toLocaleString()}</strong>
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 flex items-center justify-center shrink-0">
                <Banknote className="w-5 h-5" />
              </div>
            </div>

            {/* 4. Staff Station & ID */}
            <div className="p-4 rounded-xl bg-slate-900/60 dark:bg-slate-900/80 border border-slate-800/80 shadow-md flex items-center justify-between hover:border-slate-700 transition">
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider text-[10px] font-mono">Assigned Station</span>
                <div className="text-sm font-bold font-mono text-purple-400 mt-1 truncate max-w-[140px]">
                  {currentUser?.department || 'Makeni Plant'}
                </div>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5 font-mono">
                  ID: <strong className="text-slate-200">{currentUser?.employeeId || 'PM-STAFF'}</strong>
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-950/80 text-purple-400 border border-purple-800/60 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </div>
            {/* Operator Targeted Notifications */}
            {activeRole === "operator" && (
              <>
                <div className="p-4 rounded-xl bg-slate-900/60 dark:bg-slate-900/80 border border-slate-800/80 shadow-md flex items-center justify-between hover:border-slate-700 transition col-span-1 sm:col-span-2 lg:col-span-2">
                  <div>
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider text-[10px] font-mono">Daily Work Output (My Shift)</span>
                    <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                      {myTodayBundles.toLocaleString()} Bundles
                    </div>
                    <span className="text-[10px] text-emerald-300 font-medium flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Produced Today
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 flex items-center justify-center shrink-0">
                    <Factory className="w-5 h-5" />
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 dark:bg-slate-900/80 border border-slate-800/80 shadow-md flex items-center justify-between hover:border-slate-700 transition col-span-1 sm:col-span-2 lg:col-span-2">
                  <div>
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider text-[10px] font-mono">Accumulated Output (Lifetime)</span>
                    <div className="text-xl font-bold font-mono text-purple-400 mt-1">
                      {myLifetimeBundles.toLocaleString()} Bundles
                    </div>
                    <span className="text-[10px] text-purple-300 font-medium flex items-center gap-1 mt-0.5">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      Total output by this account
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-950/80 text-purple-400 border border-purple-800/60 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="col-span-1 sm:col-span-2 lg:col-span-4 space-y-6">
            {/* TODAY'S SUMMARY */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    TODAY'S SUMMARY (24-Hour Period)
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    Auto-resets at local midnight • {todayDateKey}
                  </p>
                </div>

                {/* Manager / Developer manual reset control */}
                {canResetDaily && (
                  <button
                    id="reset-daily-counters-btn"
                    onClick={() => {
                      setResetConfirmText('');
                      setShowResetConfirm(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    title="Reset today's summary counters to zero (historical records are preserved)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Daily Counters</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider font-mono">Production</span>
                  <div className="text-lg font-bold font-mono text-cyan-600 dark:text-cyan-400 mt-1">
                    {dailyBundlesProduced.toLocaleString()} Bundles
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider font-mono">Revenue</span>
                  <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                    SL Le {dailySalesLe.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider font-mono">Expenses</span>
                  <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                    SL Le {dailyExpensesLe.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider font-mono">Net (Today)</span>
                  <div className={`text-lg font-bold font-mono mt-1 ${dailyNetProfitLe >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    SL Le {dailyNetProfitLe.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* LIFETIME METRICS */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                <BarChart className="w-4 h-4 text-purple-500" />
                LIFETIME METRICS (All-Time)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Sales Revenue */}
                <div className="p-4 rounded-xl bg-slate-900/60 dark:bg-slate-900/80 border border-slate-800/80 shadow-md flex items-center justify-between hover:border-slate-700 transition">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider font-mono">Total Revenue (Le)</span>
                    <div className="text-xl font-bold font-mono text-indigo-400 mt-1">
                      SL Le {totalSalesLe.toLocaleString()}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 flex items-center justify-center shrink-0">
                    <Banknote className="w-5 h-5" />
                  </div>
                </div>

                {/* 2. Bundles Produced */}
                <div className="p-4 rounded-xl bg-slate-900/60 dark:bg-slate-900/80 border border-slate-800/80 shadow-md flex items-center justify-between hover:border-slate-700 transition">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider font-mono">Bundles Produced</span>
                    <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                      {totalBundlesProduced.toLocaleString()}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 flex items-center justify-center shrink-0">
                    <Factory className="w-5 h-5" />
                  </div>
                </div>

                {/* 3. Factory Expenses */}
                <div className="p-4 rounded-xl bg-slate-900/60 dark:bg-slate-900/80 border border-slate-800/80 shadow-md flex items-center justify-between hover:border-slate-700 transition">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider font-mono">Factory Expenses</span>
                    <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                      SL Le {totalExpensesLe.toLocaleString()}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/60 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                </div>

                {/* 4. Net Profit Lifetime */}
                <div className="p-4 rounded-xl bg-slate-900/60 dark:bg-slate-900/80 border border-slate-800/80 shadow-md flex items-center justify-between hover:border-slate-700 transition">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider font-mono">Net Lifetime (Le)</span>
                    <div className={`text-xl font-bold font-mono mt-1 ${netProfitLe >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      SL Le {netProfitLe.toLocaleString()}
                    </div>
                  </div>
                  <div className={`w-10 h-10 rounded-xl ${netProfitLe >= 0 ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60' : 'bg-rose-950/80 text-rose-400 border-rose-800/60'} flex items-center justify-center shrink-0`}>
                    <Scale className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Role Scoped Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Role Specific Modules & Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Developer / System Admin View */}
          {activeRole === 'developer' && (
            <div className="p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-sm">Super Admin System Health Overview</h3>
                </div>
                <button
                  onClick={() => setActiveTab('system')}
                  className="text-xs text-purple-400 hover:underline font-medium"
                >
                  View Full Audit Logs &rarr;
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="text-slate-400 text-[10px]">Database Engine</span>
                  <div className="font-bold text-emerald-400 mt-1">{systemHealth.dbStatus}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="text-slate-400 text-[10px]">API Uptime</span>
                  <div className="font-bold text-blue-400 mt-1">{systemHealth.apiUptimePercentage}%</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="text-slate-400 text-[10px]">Total User Accounts</span>
                  <div className="font-bold text-amber-400 mt-1">{users.length} Active Accounts</div>
                </div>
              </div>
            </div>
          )}

          {/* Engineer Specific Daily Record Card */}
          {activeRole === 'engineer' && (
            <div className="p-5 rounded-2xl bg-slate-900/65 backdrop-blur-md text-white border border-cyan-500/30 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-cyan-300 flex items-center gap-2">
                    <Factory className="w-5 h-5 text-cyan-400" />
                    Engineer Daily Production & Raw Material Records
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Log daily Outer Buying (Date), Roll Buying (Name & KG), Outer Film usage (<strong className="text-cyan-400">1 Set = 50 Bundles</strong>), and Damaged Bundles.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setActiveTab('production')}
                    className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-cyan-600/30 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Daily Batch Record &rarr;</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('production')}
                    className="px-3 py-1.5 bg-amber-600/30 border border-amber-500/40 text-amber-300 hover:bg-amber-600/50 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                    <span>Outer Buying &rarr;</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('production')}
                    className="px-3 py-1.5 bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/50 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Scale className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Roll Buying (KG) &rarr;</span>
                  </button>
                  {canResetDaily && (
                    <button
                      onClick={() => {
                        setMaterialResetPassword('');
                        setShowMaterialResetConfirm(true);
                      }}
                      className="px-3 py-1.5 bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/40 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                      <span>Reset KG & Outer</span>
                    </button>
                  )}
                  {canResetDaily && (
                    <button
                      onClick={() => {
                        setProductionResetPassword('');
                        setShowProductionResetConfirm(true);
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition cursor-pointer"
                      title="Wipe all production batches, roll inventory and outer film records (password required)"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Production &amp; Roll Records</span>
                    </button>
                  )}
                  {canResetDaily && (
                    <button
                      onClick={() => {
                        setRepairsFuelResetPassword('');
                        setShowRepairsFuelResetConfirm(true);
                      }}
                      className="px-3 py-1.5 bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/40 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                      title="Wipe all repairs and fuel records (password required)"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                      <span>Reset Repairs &amp; Fuel</span>
                    </button>
                  )}
                  {canResetDaily && (
                    <button
                      onClick={() => {
                        setFreshStartPassword('');
                        setShowFreshStartConfirm(true);
                      }}
                      className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-rose-900/40 transition cursor-pointer"
                      title="Empty ALL records in database and local storage for a clean fresh start (password required)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Fresh Start (Empty All)</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-cyan-500/30">
                  <span className="text-[10px] text-slate-400">Total Bundles Produced</span>
                  <div className="font-black text-cyan-300 font-mono text-sm mt-0.5">{totalBundlesProduced.toLocaleString()}</div>
                  <span className="text-[9px] text-cyan-400 font-mono">1 Set = 50 Bundles</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-amber-500/30">
                  <span className="text-[10px] text-amber-400">Outer Buying Log</span>
                  <div className="font-black text-amber-300 font-mono text-sm mt-0.5">
                    {outerBuyings.reduce((sum, o) => sum + (Number(o.outersCount) || 0), 0)} Sets
                  </div>
                  <span className="text-[9px] text-slate-400">Raw Outer Stock</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-indigo-500/30">
                  <span className="text-[10px] text-indigo-400">Roll Buying Log</span>
                  <div className="font-black text-indigo-300 font-mono text-sm mt-0.5">
                    {rollBuyings.reduce((sum, r) => sum + ((Number(r.rollWeightKg) || 0) * (Number(r.rollsCount) || 1)), 0).toFixed(1)} KG
                  </div>
                  <span className="text-[9px] text-slate-400">Packaging Rolls</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-rose-500/30">
                  <span className="text-[10px] text-rose-400">Damaged Bundles</span>
                  <div className="font-bold text-rose-400 font-mono text-sm mt-0.5">{totalBundlesDamaged}</div>
                  <span className="text-[9px] text-slate-400">Quality Audit</span>
                </div>
              </div>
            </div>
          )}

          {/* Sales Production Officer Specific Daily Record Card */}
          {activeRole === 'sales_manager' && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white border border-emerald-800/40 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-emerald-300 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-emerald-400" />
                    Sales Production Officer Daily Records & Dispatches
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Log daily Factory Gate Sales, Van & Tricycle Dispatches, Wholesale Orders, and Damaged Sachet Losses.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setActiveTab('sales')}
                    className="px-3 py-1.5 bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 hover:bg-emerald-800/50 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <span>Sales Analytics &rarr;</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-800/50">
                  <span className="text-[10px] text-emerald-400">Total Bundles Sold</span>
                  <div className="font-black text-emerald-300 font-mono text-sm mt-0.5">
                    {sales.filter((s) => s.category !== 'Damaged Bundles').reduce((sum, s) => sum + (Number(s.bundleQuantity) || 0), 0).toLocaleString()}
                  </div>
                  <span className="text-[9px] text-slate-400">Gate & Fleet Dispatches</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/90 border border-blue-800/50">
                  <span className="text-[10px] text-blue-400">Total Revenue (SLE)</span>
                  <div className="font-black text-blue-300 font-mono text-sm mt-0.5">
                    SLE {sales.filter((s) => s.category !== 'Damaged Bundles').reduce((sum, s) => sum + (Number(s.totalAmountLe) || 0), 0).toLocaleString()}
                  </div>
                  <span className="text-[9px] text-slate-400">Cash & Digital Payments</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/90 border border-teal-800/50">
                  <span className="text-[10px] text-teal-400">Fleet Route Dispatches</span>
                  <div className="font-black text-teal-300 font-mono text-sm mt-0.5">
                    {sales.filter((s) => s.category === 'Van Sales' || s.category === 'Tricycle Sales').reduce((sum, s) => sum + (Number(s.bundleQuantity) || 0), 0).toLocaleString()}
                  </div>
                  <span className="text-[9px] text-slate-400">Van & Tricycle Bundles</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/90 border border-rose-800/50">
                  <span className="text-[10px] text-rose-400">Damaged / Defect Losses</span>
                  <div className="font-bold text-rose-400 font-mono text-sm mt-0.5">
                    {sales.reduce((sum, s) => sum + (s.category === 'Damaged Bundles' ? Number(s.bundleQuantity) || 0 : Number(s.damagedLosses) || 0), 0)}
                  </div>
                  <span className="text-[9px] text-slate-400">Gate & Transit Quality Audit</span>
                </div>
              </div>
            </div>
          )}

          {/* CEO View */}
          {activeRole === 'ceo' && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-amber-500" />
                  Executive Financial & Profit Margin Summary
                </h3>
                <span className="text-xs font-mono text-slate-500">Read-Only Mode</span>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[11px] text-slate-500">Gross Sales</span>
                  <div className="text-base font-extrabold text-blue-600 dark:text-blue-400">SL Le {totalSalesLe.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Operating Expenses</span>
                  <div className="text-base font-extrabold text-amber-600 dark:text-amber-400">SL Le {totalExpensesLe.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Net Estimated Profit</span>
                  <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">SL Le {netProfitLe.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {/* Pending Attendance Approvals (Manager & 2nd Manager) */}
          {(activeRole === 'manager' || activeRole === 'second_manager' || activeRole === 'developer') && (() => {
            const shortfalls = sales.filter(
              (s) => (s.category === 'Van Sales' || s.category === 'Tricycle Sales') && (s.balanceLe || 0) > 0
            );
            if (shortfalls.length === 0) return null;
            const totalShortfall = shortfalls.reduce((acc, s) => acc + (s.balanceLe || 0), 0);
            return (
              <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-300 dark:border-rose-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-rose-800 dark:text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Cash Shortfall Alerts ({shortfalls.length})
                  </h3>
                  <span className="font-mono font-black text-sm text-rose-700 dark:text-rose-400">
                    SLE {totalShortfall.toLocaleString()} short
                  </span>
                </div>
                <div className="space-y-2">
                  {shortfalls.slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {s.category} • {s.vehicleNumber || 'Unassigned vehicle'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {s.customerOrDriver || 'Unknown driver'} • {s.date} • Recorded by {s.recordedByName}
                        </div>
                      </div>
                      <span className="font-mono font-black text-rose-600 dark:text-rose-400">
                        SLE {(s.balanceLe || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                {shortfalls.length > 5 && (
                  <button
                    onClick={() => setActiveTab('sales')}
                    className="text-xs text-rose-700 dark:text-rose-400 font-semibold hover:underline"
                  >
                    View all {shortfalls.length} flagged dispatches &rarr;
                  </button>
                )}
              </div>
            );
          })()}

          {(activeRole === 'manager' || activeRole === 'second_manager' || activeRole === 'developer') && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  Staff Attendance Approval Queue ({pendingAttendance.length})
                </h3>
                <button
                  onClick={() => setActiveTab('attendance')}
                  className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                >
                  View All Attendance
                </button>
              </div>

              {pendingAttendance.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  No pending check-in requests. All staff approvals are up to date!
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingAttendance.map((rec) => {
                    const dateObj = new Date(rec.date);
                    const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    return (
                    <div
                      key={`${rec.userId}::${rec.date}`}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col gap-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{rec.userName}</div>
                          <div className="text-[11px] text-slate-500">
                            {rec.userRole.replace('_', ' ')} • {formattedDate}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-mono text-slate-500">In: {rec.checkInTime}</div>
                        {rec.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => approveAttendance(rec.id, false)}
                              className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-semibold rounded-lg hover:bg-rose-200"
                            >
                              Reject In
                            </button>
                            <button
                              onClick={() => approveAttendance(rec.id, true)}
                              className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700"
                            >
                              Approve In
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {rec.checkOutStatus === 'pending' && (
                        <div className="flex items-center justify-between border-t border-slate-200/50 dark:border-slate-700/50 pt-2 mt-1">
                          <div className="text-[11px] font-mono text-slate-500">Out: {rec.checkOutTime}</div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => approveCheckOut(rec.id, false)}
                              className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-semibold rounded-lg hover:bg-rose-200"
                            >
                              Reject Out
                            </button>
                            <button
                              onClick={() => approveCheckOut(rec.id, true)}
                              className="px-3 py-1 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
                            >
                              Approve Out
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sales Summary Table Preview for Management / Personal Attendance for Staff */}
          {!['staff', 'operator', 'tricycle_staff', 'van_staff'].includes(activeRole) ? (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-500" />
                  Live Sales Transactions
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[9px] font-black uppercase tracking-wide">
                    Sales Officer Feed
                  </span>
                </h3>
                <button
                  onClick={() => setActiveTab('sales')}
                  className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                >
                  Go to Sales Tracker &rarr;
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                      <th className="py-2 px-2">Date</th>
                      <th className="py-2 px-2">Category</th>
                      <th className="py-2 px-2 text-right">Bundles</th>
                      <th className="py-2 px-2 text-right">Amount (SL Le)</th>
                      <th className="py-2 px-2">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {liveSalesFeed.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center">
                          <div className="flex flex-col items-center gap-1.5 text-slate-500">
                            <ShoppingCart className="w-5 h-5 text-slate-400" />
                            <span className="text-xs font-semibold">No live transactions yet</span>
                            <span className="text-[10px] max-w-xs">
                              This feed shows sales logged by active Production Sales Officers. It will populate
                              automatically as they record dispatches.
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                    {liveSalesFeed.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-2 font-mono text-slate-500">{s.date}</td>
                        <td className="py-2.5 px-2 font-medium">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.category === 'Factory Sales'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                : s.category === 'Van Sales'
                                ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300'
                                : s.category === 'Tricycle Sales'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {s.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold">{s.bundleQuantity}</td>
                        <td className="py-2.5 px-2 text-right font-extrabold text-blue-600 dark:text-blue-400">
                          SL Le {s.totalAmountLe.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2 text-slate-500">{s.recordedByName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-500" />
                  My Recent Attendance & Clock-In Records
                </h3>
                <button
                  onClick={() => setActiveTab('attendance')}
                  className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                >
                  View Full Attendance History &rarr;
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                      <th className="py-2 px-2">Date</th>
                      <th className="py-2 px-2">Check-in</th>
                      <th className="py-2 px-2">Check-out</th>
                      <th className="py-2 px-2 text-right">Hours</th>
                      <th className="py-2 px-2 text-right">Approval Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {attendance
                      .filter((a) => a.userId === currentUser?.id)
                      .slice(0, 5)
                      .map((att) => (
                        <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-2 font-mono text-slate-500">{att.date}</td>
                          <td className="py-2.5 px-2 font-medium text-slate-700 dark:text-slate-300">{att.checkInTime}</td>
                          <td className="py-2.5 px-2 text-slate-500">{att.checkOutTime || '—'}</td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-600 dark:text-slate-400">
                            {att.durationHours ? `${att.durationHours} hrs` : 'In Progress'}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                att.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : att.status === 'rejected'
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {att.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {attendance.filter((a) => a.userId === currentUser?.id).length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500 text-xs">
                          No attendance records logged yet today. Use the Attendance button above to check in.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Broadcasts, Announcements & Team Activity */}
        <div className="space-y-6">
          {/* Announcements Widget */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-500" />
                Factory Announcements
              </h3>
              {(activeRole === 'manager' || activeRole === 'developer') && (
                <button
                  onClick={() => setActiveTab('chat')}
                  className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                >
                  Post New
                </button>
              )}
            </div>

            <div className="space-y-3">
              {announcements.map((anc) => (
                <div
                  key={anc.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{anc.title}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        anc.priority === 'urgent'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {anc.priority}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">{anc.content}</p>
                  <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between border-t border-slate-200 dark:border-slate-700/40">
                    <span>By: {anc.authorName} ({anc.authorRole})</span>
                    <span>{new Date(anc.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-Time Water Quality Monitor Widget - Visible ONLY to Engineer, Manager, and Developer */}
          {['engineer', 'manager', 'second_manager', 'ceo', 'developer'].includes(activeRole) ? (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950 via-slate-900 to-slate-950 text-white border border-cyan-800/40 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm text-cyan-300">
                  <Gauge className="w-5 h-5 text-cyan-400" />
                  Real-Time Water Quality Monitor
                </div>
                {activeRole === 'engineer' ? (
                  <button
                    onClick={() => setActiveTab('equipment')}
                    className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 shadow-sm cursor-pointer"
                    title="Log & Edit Water Telemetry"
                  >
                    <Plus className="w-3 h-3" />
                    Edit Telemetry
                  </button>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">
                    🔒 Read-Only View
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300">
                Automated sensor telemetry from Makeni Processing Plant Line #1 Reverse Osmosis System.
                {activeRole !== 'engineer' && (
                  <span className="block text-[11px] text-cyan-400/80 mt-0.5 font-medium">
                    (Edit permissions restricted exclusively to Production Engineer)
                  </span>
                )}
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-cyan-800/50">
                  <span className="text-[10px] text-slate-400 font-mono">TDS Purity Level</span>
                  <div className="font-bold text-cyan-300 text-sm mt-0.5">{latestEquipmentLog.tdsLevelPpm} PPM</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-cyan-800/50">
                  <span className="text-[10px] text-slate-400 font-mono">Filtration Pressure</span>
                  <div className="font-bold text-cyan-300 text-sm mt-0.5">{latestEquipmentLog.filtrationPressurePsi} PSI</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-cyan-800/50">
                  <span className="text-[10px] text-slate-400 font-mono">pH Level</span>
                  <div className="font-bold text-cyan-300 text-sm mt-0.5">{latestEquipmentLog.phLevel}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-cyan-800/50">
                  <span className="text-[10px] text-slate-400 font-mono">UV Sterilizer</span>
                  <div className="font-bold text-emerald-400 text-sm mt-0.5 capitalize">{latestEquipmentLog.uvSterilizerStatus}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-indigo-300">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                Staff Shift & Safety Guidelines
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ensure all PPE gear is worn during shift hours. Maintain sanitation protocols at your assigned Makeni station.
              </p>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                Approved Station: <strong className="text-slate-200">{currentUser?.department || 'Makeni Production Plant'}</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------------
       * Reset Daily Counters — double confirmation (Issue #4)
       * Restricted to Manager / 2nd Manager / Developer. Two deliberate steps
       * (open dialog, then type RESET) plus an explicit confirmation of what is
       * and is not affected, so the button can never be hit by accident.
       * ------------------------------------------------------------------- */}
      {showMaterialResetConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
        >
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 shadow-2xl overflow-hidden">
            <div className="bg-rose-50 dark:bg-rose-950/30 p-5 border-b border-rose-100 dark:border-rose-900 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-rose-900 dark:text-rose-200">
                    Reset KG & Outer Buying Logs?
                  </h3>
                  <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80">
                    Enter your manager password to confirm
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium">
                This will instantly wipe all historical <strong>Roll Buying (KG)</strong> and <strong>Outer Buying</strong> logs from the system. Production Batch records are NOT affected.
              </div>
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  Manager / Developer Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={materialResetPassword}
                  onChange={(e) => setMaterialResetPassword(e.target.value)}
                  placeholder="Enter password..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <button
                onClick={() => setShowMaterialResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={outerBuyings.length === 0 && rollBuyings.length === 0}
                onClick={() => {
                  const success = resetMaterialBuyings(materialResetPassword);
                  if (success) {
                    setShowMaterialResetConfirm(false);
                    setMaterialResetPassword('');
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs transition cursor-pointer"
              >
                {(outerBuyings.length === 0 && rollBuyings.length === 0) ? 'No Records to Reset' : 'Wipe KG & Outer Logs'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Production & Roll Records reset - Manager / Developer password gate */}
      {showProductionResetConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 shadow-2xl overflow-hidden">
            <div className="bg-rose-50 dark:bg-rose-950/30 p-5 border-b border-rose-100 dark:border-rose-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-rose-900 dark:text-rose-200">
                    Reset Production &amp; Roll Records?
                  </h3>
                  <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80">
                    Enter your Manager / Developer password to confirm
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium">
                This wipes <strong>everything</strong> the Production Engineer has recorded:
                <ul className="list-disc pl-4 mt-1.5 space-y-0.5">
                  <li>{production.length} production batch log(s)</li>
                  <li>{outerBuyings.length} outer film purchase(s)</li>
                  <li>{rollBuyings.length} roll buying (KG) record(s)</li>
                  <li>{packagingRolls.length} roll inventory entr(ies) — weights reset</li>
                </ul>
                <div className="mt-2">
                  <strong>Total Bundles Produced</strong> and all production charts return to <strong>0</strong>.
                  A backup workbook is downloaded before anything is deleted.
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  Manager / Developer Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={productionResetPassword}
                  onChange={(e) => setProductionResetPassword(e.target.value)}
                  placeholder="Enter password..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <button
                onClick={() => {
                  setShowProductionResetConfirm(false);
                  setProductionResetPassword('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={
                  production.length === 0 && 
                  outerBuyings.length === 0 && 
                  rollBuyings.length === 0 && 
                  packagingRolls.length === 0 &&
                  machines.every(m => (m.activeRollKg || 0) === 0 && (m.totalBundlesProduced || 0) === 0 && (m.activeRollBundlesProduced || 0) === 0 && !m.assignedOperatorName && m.activeRollName === 'No Roll Loaded')
                }
                onClick={() => {
                  const success = resetProductionRecords(productionResetPassword);
                  if (success) {
                    setShowProductionResetConfirm(false);
                    setProductionResetPassword('');
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs transition cursor-pointer"
              >
                {(production.length === 0 && outerBuyings.length === 0 && rollBuyings.length === 0 && packagingRolls.length === 0 && machines.every(m => (m.activeRollKg || 0) === 0 && (m.totalBundlesProduced || 0) === 0 && (m.activeRollBundlesProduced || 0) === 0 && !m.assignedOperatorName && m.activeRollName === 'No Roll Loaded')) ? 'No Records to Reset' : 'Reset Production & Roll Records'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repairs & Fuel reset - Manager / Developer password gate */}
      {showRepairsFuelResetConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 shadow-2xl overflow-hidden">
            <div className="bg-rose-50 dark:bg-rose-950/30 p-5 border-b border-rose-100 dark:border-rose-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-rose-900 dark:text-rose-200">
                    Reset Repairs &amp; Fuel Records?
                  </h3>
                  <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80">
                    Enter your Manager / Developer password to confirm
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium">
                This permanently clears:
                <ul className="list-disc pl-4 mt-1.5 space-y-0.5">
                  <li>{repairs.length} machine repair record(s)</li>
                  <li>{fuel.length} fuel log(s)</li>
                </ul>
                <div className="mt-2">
                  A backup workbook is downloaded before anything is deleted.
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  Manager / Developer Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={repairsFuelResetPassword}
                  onChange={(e) => setRepairsFuelResetPassword(e.target.value)}
                  placeholder="Enter password..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <button
                onClick={() => {
                  setShowRepairsFuelResetConfirm(false);
                  setRepairsFuelResetPassword('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={repairs.length === 0 && fuel.length === 0}
                onClick={() => {
                  const success = resetRepairsAndFuel(repairsFuelResetPassword);
                  if (success) {
                    setShowRepairsFuelResetConfirm(false);
                    setRepairsFuelResetPassword('');
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs transition cursor-pointer"
              >
                {(repairs.length === 0 && fuel.length === 0) ? 'No Records to Reset' : 'Reset Repairs & Fuel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fresh Start Confirmation Modal */}
      {showFreshStartConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
          onClick={() => setShowFreshStartConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-rose-500 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-rose-900 dark:text-rose-200">
                    ⚠️ Execute Fresh Start (Empty All Records)?
                  </h3>
                  <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80">
                    This will permanently empty ALL database tables and local storage records.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-rose-100/70 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 font-medium">
                This action is <strong className="underline">irreversible</strong> and will clear:
                <ul className="list-disc pl-4 mt-1.5 space-y-0.5 font-semibold">
                  <li>All sales &amp; dispatch records</li>
                  <li>All production batches &amp; packaging rolls</li>
                  <li>All material &amp; roll buyings</li>
                  <li>All attendance, expenses, repairs &amp; fuel logs</li>
                  <li>All messages, announcements &amp; audit logs</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  Manager / Developer Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={freshStartPassword}
                  onChange={(e) => setFreshStartPassword(e.target.value)}
                  placeholder="Enter your password..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <button
                onClick={() => {
                  setShowFreshStartConfirm(false);
                  setFreshStartPassword('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={false}
                onClick={() => {
                  const success = resetToFreshDatabase(freshStartPassword);
                  if (success) {
                    setShowFreshStartConfirm(false);
                    setFreshStartPassword('');
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs transition cursor-pointer shadow-lg shadow-rose-600/30"
              >
                Empty All &amp; Fresh Start
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center border border-amber-400/40 shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-900 dark:text-amber-200">
                    Reset Today's Counters?
                  </h3>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                    Step 2 of 2 — confirm to proceed
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                <p className="font-bold text-emerald-900 dark:text-emerald-300 mb-1">What this does</p>
                <p className="text-emerald-800 dark:text-emerald-400 leading-relaxed">
                  Sets today's Production, Revenue and Expenses counters back to zero so you can start a fresh
                  shift tally. <strong>No records are deleted.</strong> Every transaction stays in the database, in
                  Reports, and in the Excel backup.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  Type <span className="font-mono text-rose-600 dark:text-rose-400">RESET</span> to confirm
                </label>
                <input
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="RESET"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono tracking-widest focus:ring-2 focus:ring-amber-500 focus:outline-none uppercase"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={resetConfirmText.trim().toUpperCase() !== 'RESET'}
                onClick={() => {
                  resetDailyCounters();
                  setShowResetConfirm(false);
                  setResetConfirmText('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs transition cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
