/**
 * Production Tracking & Daily Record Module for Pure Max Factory
 *
 * CRITICAL PRODUCTION LOGIC:
 * 1. CORRECTED OUTER YIELD CONVERSION:
 *    - 1 Set of Outer Film = EXACTLY 50 Bundles of Water (NOT 100)
 *      * 1 Set = 50 Bundles
 *      * 2 Sets = 100 Bundles
 *      * 4 Sets = 200 Bundles
 *    - Formula: Total Daily Bundles Produced = (Sets Used * 50) - Remaining Bundles Leftover
 *
 * 2. ROLL (KG) & MACHINE OPERATOR INVENTORY LIFECYCLE:
 *    - Every purchased packaging roll is saved as a distinct inventory record with unique Roll KG and code.
 *    - Machine lines load verified factory inventory rolls only.
 *    - Real-time cumulative yield tally (bundles produced per roll / operator).
 *
 * 3. REAL-TIME MANAGER & DEVELOPER DUAL BAR CHARTS:
 *    - Chart 1: Total Bundles Produced (Daily, Monthly, Yearly)
 *    - Chart 2: Damaged Bundles (Daily, Monthly, Yearly)
 *
 * 4. GLASSMORPHISM STYLING:
 *    - Background: rgba(15, 23, 42, 0.65) / rgba(18, 24, 38, 0.7)
 *    - Backdrop Filter: blur(12px)
 *    - Border: 1px solid rgba(255, 255, 255, 0.1)
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { SalesDailyRecordsModule } from '../sales/SalesDailyRecordsModule';
import { MachineRollTracker } from './MachineRollTracker';
import { ProductionReportModal } from './ProductionReportModal';
import {
  Factory,
  Plus,
  Search,
  CheckCircle2,
  AlertOctagon,
  Droplets,
  BarChart3,
  Layers,
  Scale,
  User,
  Calendar,
  Filter,
  ShieldCheck,
  TrendingUp,
  Clock,
  Sparkles,
  ShoppingBag,
  Package,
  Receipt,
  Truck,
  Boxes,
  Printer,
  Activity,
  Info,
  ArrowRight,
  Ban,
  PackageCheck,
  Check,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

export const ProductionModule: React.FC = () => {
  const {
    production,
    addProductionRecord,
    outerBuyings,
    addOuterBuyingRecord,
    rollBuyings,
    addRollBuyingRecord,
    packagingRolls,
    loadRollToMachine,
    exhaustMachineRoll,
    machines,
    updateMachineStatus,
    activeRole,
    currentUser,
    users,
    resetProductionRecords,
  } = useApp();


  // Active Sub-Tab: 'production' | 'packaging_rolls' | 'outer_buying' | 'roll_buying' | 'inventory_balance'
  const [activeSubTab, setActiveSubTab] = useState<'production' | 'packaging_rolls' | 'outer_buying' | 'roll_buying' | 'inventory_balance'>('production');

  // Modal States
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [showAddOuterModal, setShowAddOuterModal] = useState(false);
  const [showAddRollModal, setShowAddRollModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');

  // 1. Daily Batch / Production State (CORRECTED YIELD: 1 Set = 50 Bundles)
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState<'morning' | 'night'>('morning');
  const [selectedMachineId, setSelectedMachineId] = useState('mach-1');
  const [setsUsed, setSetsUsed] = useState<number>(4); // Default 4 sets = 200 bundles capacity
  const [remainingBundles, setRemainingBundles] = useState<number>(0); // Leftover bundles
  const [outerOperatorName, setOuterOperatorName] = useState('');
  const [selectedRollCode, setSelectedRollCode] = useState('');
  const [rollWeightKg, setRollWeightKg] = useState<number>(28.5); // Active Roll ID / Weight (Kg)
  const [rollOperatorName, setRollOperatorName] = useState('');
  const [damagedBundles, setDamagedBundles] = useState<number>(2);
  const [batchNotes, setBatchNotes] = useState('');

  // 2. Daily Outer Buying State (1 Set = 50 Bundles capacity)
  const [outerBuyDate, setOuterBuyDate] = useState(new Date().toISOString().split('T')[0]);
  const [outerBuyCount, setOuterBuyCount] = useState<number>(100); // 100 sets = 5,000 bundles
  const [outerBuySupplier, setOuterBuySupplier] = useState('Pure Plastics Makeni Depot');
  const [outerBuyCostLe, setOuterBuyCostLe] = useState<number>(2500);
  const [outerBuyInvoice, setOuterBuyInvoice] = useState('');
  const [outerBuyNotes, setOuterBuyNotes] = useState('');

  // 3. Daily Roll Buying State (Roll Name, KG, Count)
  const [rollBuyDate, setRollBuyDate] = useState(new Date().toISOString().split('T')[0]);
  const [rollBuyName, setRollBuyName] = useState('Pure Max 500ml Heavy Sachet Film');
  const [rollBuyWeightKg, setRollBuyWeightKg] = useState<number>(28.5);
  const [rollBuyCount, setRollBuyCount] = useState<number>(4);
  const [rollBuySupplier, setRollBuySupplier] = useState('Makeni Polymers Sierra Leone');
  const [rollBuyCostLe, setRollBuyCostLe] = useState<number>(3200);
  const [rollBuyInvoice, setRollBuyInvoice] = useState('');
  const [rollBuyNotes, setRollBuyNotes] = useState('');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [tableShiftFilter, setTableShiftFilter] = useState<'all' | 'morning' | 'night'>('all');
  const [rollStatusFilter, setRollStatusFilter] = useState<'all' | 'available' | 'loaded' | 'exhausted'>('all');

  // Chart Timeframe: daily / monthly / yearly
  const [chartCategory, setChartCategory] = useState<'daily' | 'monthly' | 'yearly'>('daily');

  // Permissions
  const canLogRecords = ['engineer', 'manager', 'second_manager', 'developer'].includes(activeRole);
  const canViewManagerCharts = ['developer', 'ceo', 'manager', 'second_manager'].includes(activeRole);

  const activeSystemUsers = useMemo(() => {
    return users.filter((u) => u.status !== 'suspended');
  }, [users]);

  // Categorized users for production assignments (Strictly real authenticated accounts in the system)
  const dedicatedOperators = useMemo(() => {
    return users.filter(
      (u) =>
        u.status !== 'suspended' &&
        (u.role === 'operator' ||
          String(u.role).toLowerCase() === 'operator' ||
          String(u.role).toLowerCase() === 'machine_operator')
    );
  }, [users]);

  // Handler for operator selection with automatic active roll lookup
  const handleOperatorSelect = (operatorNameValue: string) => {
    setOuterOperatorName(operatorNameValue);
    if (!operatorNameValue || operatorNameValue === 'custom') {
      return;
    }

    // 1. Look up machine line assigned to this operator
    const assignedMach = machines.find(
      (m) =>
        m.assignedOperatorName &&
        m.assignedOperatorName.trim().toLowerCase() === operatorNameValue.trim().toLowerCase()
    );

    if (assignedMach) {
      // Auto-select this operator's machine line
      setSelectedMachineId(assignedMach.id);
      const rollKg = typeof assignedMach.activeRollKg === 'number' ? assignedMach.activeRollKg : 0;
      setRollWeightKg(rollKg);
      setSelectedRollCode(assignedMach.activeRollCode || '');
    } else {
      // If operator has no assigned machine, look at the currently selected machine or set 0
      const currentMach = machines.find((m) => m.id === selectedMachineId);
      if (currentMach && currentMach.activeRollKg) {
        setRollWeightKg(currentMach.activeRollKg);
        setSelectedRollCode(currentMach.activeRollCode || '');
      } else {
        setRollWeightKg(0);
        setSelectedRollCode('');
      }
    }
  };

  // Handler for machine line selection with automatic operator & roll sync
  const handleMachineSelect = (machId: string) => {
    setSelectedMachineId(machId);
    const found = machines.find((m) => m.id === machId);
    if (found) {
      if (found.assignedOperatorName) {
        // If the assigned operator is in our operator list, select them
        const isOperator = dedicatedOperators.some(
          (op) => op.name.toLowerCase() === found.assignedOperatorName.toLowerCase()
        );
        if (isOperator) {
          setOuterOperatorName(found.assignedOperatorName);
        }
      }
      setRollWeightKg(found.activeRollKg || 0);
      setSelectedRollCode(found.activeRollCode || '');
    }
  };

  // Live Formula Calculation for Batch Modal: (Sets * 50) - Remaining
  const liveCalculatedBundles = useMemo(() => {
    const s = Math.max(0, Number(setsUsed) || 0);
    const r = Math.max(0, Number(remainingBundles) || 0);
    return Math.max(0, s * 50 - r);
  }, [setsUsed, remainingBundles]);

  // Overall totals across all production records
  const totalBundlesAllTime = useMemo(() => {
    return production.reduce((sum, p) => sum + p.bundlesProduced, 0);
  }, [production]);

  const totalSetsUsedAllTime = useMemo(() => {
    return production.reduce(
      (sum, p) => sum + (p.outerSetsUsed ?? p.outerFilmCount ?? 0),
      0
    );
  }, [production]);

  const totalRemainingLeftoverAllTime = useMemo(() => {
    return production.reduce((sum, p) => sum + (p.outerRemainingBundles || 0), 0);
  }, [production]);

  const totalOuterSetsBought = useMemo(() => {
    return outerBuyings.reduce((sum, o) => sum + (Number(o.outersCount) || 0), 0);
  }, [outerBuyings]);

  const outerStockBalance = useMemo(() => {
    return Math.max(0, totalOuterSetsBought - totalSetsUsedAllTime);
  }, [totalOuterSetsBought, totalSetsUsedAllTime]);

  const totalDamagedAllTime = useMemo(() => {
    return production.reduce((sum, p) => sum + p.damagedBundles, 0);
  }, [production]);

  const totalRollKgUsed = useMemo(() => {
    return production.reduce((sum, p) => sum + (p.packagingRollWeightKg || 0), 0);
  }, [production]);

  const totalRollKgBought = useMemo(() => {
    return rollBuyings.reduce(
      (sum, r) => sum + (Number(r.rollWeightKg) || 0) * (Number(r.rollsCount) || 1),
      0
    );
  }, [rollBuyings]);

  const rollKgStockBalance = useMemo(() => {
    return Math.max(0, totalRollKgBought - totalRollKgUsed);
  }, [totalRollKgBought, totalRollKgUsed]);

  // Aggregate Chart Data (Daily / Monthly / Yearly)
  const aggregatedChartData = useMemo(() => {
    if (chartCategory === 'daily') {
      const dailyMap: Record<string, { date: string; label: string; produced: number; damaged: number; sets: number; rollKg: number }> = {};

      production.forEach((p) => {
        const d = p.date;
        const bundles = p.bundlesProduced;
        const sets = p.outerSetsUsed ?? p.outerFilmCount ?? Math.round(bundles / 50);

        if (!dailyMap[d]) {
          dailyMap[d] = {
            date: d,
            label: d.slice(5),
            produced: 0,
            damaged: 0,
            sets: 0,
            rollKg: 0,
          };
        }
        dailyMap[d].produced += bundles;
        dailyMap[d].damaged += p.damagedBundles;
        dailyMap[d].sets += sets;
        dailyMap[d].rollKg += p.packagingRollWeightKg || 0;
      });

      return Object.values(dailyMap)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-10);
    } else if (chartCategory === 'monthly') {
      const monthlyMap: Record<string, { month: string; label: string; produced: number; damaged: number; sets: number; rollKg: number }> = {};

      production.forEach((p) => {
        const m = p.date.slice(0, 7);
        const bundles = p.bundlesProduced;
        const sets = p.outerSetsUsed ?? p.outerFilmCount ?? Math.round(bundles / 50);

        if (!monthlyMap[m]) {
          monthlyMap[m] = {
            month: m,
            label: m,
            produced: 0,
            damaged: 0,
            sets: 0,
            rollKg: 0,
          };
        }
        monthlyMap[m].produced += bundles;
        monthlyMap[m].damaged += p.damagedBundles;
        monthlyMap[m].sets += sets;
        monthlyMap[m].rollKg += p.packagingRollWeightKg || 0;
      });

      return Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
    } else {
      const yearlyMap: Record<string, { year: string; label: string; produced: number; damaged: number; sets: number; rollKg: number }> = {};

      production.forEach((p) => {
        const y = p.date.slice(0, 4);
        const bundles = p.bundlesProduced;
        const sets = p.outerSetsUsed ?? p.outerFilmCount ?? Math.round(bundles / 50);

        if (!yearlyMap[y]) {
          yearlyMap[y] = {
            year: y,
            label: `Year ${y}`,
            produced: 0,
            damaged: 0,
            sets: 0,
            rollKg: 0,
          };
        }
        yearlyMap[y].produced += bundles;
        yearlyMap[y].damaged += p.damagedBundles;
        yearlyMap[y].sets += sets;
        yearlyMap[y].rollKg += p.packagingRollWeightKg || 0;
      });

      return Object.values(yearlyMap).sort((a, b) => a.year.localeCompare(b.year));
    }
  }, [production, chartCategory]);

  // Filtered Production Records
  const filteredProduction = useMemo(() => {
    return production.filter((p) => {
      const matchesSearch =
        p.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.date.includes(searchQuery) ||
        (p.operatorName && p.operatorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.outerOperatorName && p.outerOperatorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.rollOperatorName && p.rollOperatorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.machineName && p.machineName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.packagingRollCode && p.packagingRollCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.engineerName && p.engineerName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesShift = tableShiftFilter === 'all' || p.shift === tableShiftFilter;
      return matchesSearch && matchesShift;
    });
  }, [production, searchQuery, tableShiftFilter]);

  // Filtered Packaging Rolls Inventory
  const filteredPackagingRolls = useMemo(() => {
    return packagingRolls.filter((r) => {
      const matchesSearch =
        r.rollCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.rollName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.supplier && r.supplier.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.operatorName && r.operatorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.assignedMachineName && r.assignedMachineName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        r.purchaseDate.includes(searchQuery);

      const matchesStatus = rollStatusFilter === 'all' || r.status === rollStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [packagingRolls, searchQuery, rollStatusFilter]);

  // Filtered Outer Buyings
  const filteredOuterBuyings = useMemo(() => {
    return outerBuyings.filter((o) => {

  // If active user is Sales Production Officer, strictly show their dedicated Sales Daily Records
  if (activeRole === "sales_manager") {
    return <SalesDailyRecordsModule />;
  }

  // Operator and Staff are restricted from viewing or editing daily production records
  if (["staff", "operator", "tricycle_staff", "van_staff"].includes(activeRole)) {
    return (
      <div className="p-8 text-center bg-slate-100 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl space-y-3 max-w-xl mx-auto my-12 shadow-2xl">
        <div className="w-12 h-12 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
          <AlertOctagon className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Access Restricted</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Daily records, raw material consumption, and production batch logs are strictly restricted to Production Engineers and Factory Management.
        </p>
      </div>
    );
  }

      return (
        o.date.includes(searchQuery) ||
        (o.supplier && o.supplier.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.engineerName && o.engineerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.notes && o.notes.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [outerBuyings, searchQuery]);

  // Filtered Roll Buyings
  const filteredRollBuyings = useMemo(() => {
    return rollBuyings.filter((r) => {
      return (
        r.date.includes(searchQuery) ||
        r.rollName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.supplier && r.supplier.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.engineerName && r.engineerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.notes && r.notes.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [rollBuyings, searchQuery]);

  // Submit Daily Batch: FORMULA (Sets Used * 50) - Remaining Bundles
  const handleSaveDailyBatch = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedMachine = machines.find((m) => m.id === selectedMachineId);
    const finalOuterOperator = outerOperatorName.trim() || selectedMachine?.assignedOperatorName || currentUser?.name || 'Factory Operator';

    const finalRollOperator = rollOperatorName.trim() || selectedMachine?.assignedOperatorName || finalOuterOperator;

    const countSets = Math.max(1, Number(setsUsed) || 1);
    const countRem = Math.max(0, Number(remainingBundles) || 0);
    // Formula: Total Daily Bundles Produced = (Sets Used * 50) - Remaining Bundles
    const calculatedBundles = Math.max(0, countSets * 50 - countRem);

    const batchCode = `REC-${batchDate.replace(/-/g, '')}-${shift.toUpperCase().slice(0, 1)}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    addProductionRecord({
      date: batchDate,
      shift,
      outerSetsUsed: countSets,
      outerRemainingBundles: countRem,
      outerFilmCount: countSets,
      outerOperatorName: finalOuterOperator,
      machineId: selectedMachineId,
      machineName: selectedMachine?.name || 'Sachet Machine Line #1',
      packagingRollCode: selectedRollCode || selectedMachine?.activeRollCode,
      packagingRollWeightKg: Number(rollWeightKg) || (selectedMachine?.activeRollKg || 0),
      rollOperatorName: finalRollOperator,
      bundlesProduced: calculatedBundles,
      damagedBundles: Number(damagedBundles) || 0,
      cleanWaterLitres: calculatedBundles * 12,
      batchNumber: batchCode,
      engineerId: currentUser?.id,
      engineerName: currentUser?.name || 'Production Engineer',
      operatorId: currentUser?.id || 'op-staff',
      operatorName: finalOuterOperator,
      notes: batchNotes.trim(),
    });

    setShowAddBatchModal(false);
    setBatchNotes('');
  };

  // Submit Outer Buying Record
  const handleSaveOuterBuying = (e: React.FormEvent) => {
    e.preventDefault();

    addOuterBuyingRecord({
      date: outerBuyDate,
      outersCount: Number(outerBuyCount) || 1,
      costLe: Number(outerBuyCostLe) || undefined,
      supplier: outerBuySupplier.trim() || 'Pure Plastics Makeni Depot',
      invoiceOrReceipt: outerBuyInvoice.trim() || undefined,
      engineerId: currentUser?.id,
      engineerName: currentUser?.name || 'Production Engineer',
      notes: outerBuyNotes.trim(),
    });

    setShowAddOuterModal(false);
    setOuterBuyNotes('');
    setOuterBuyInvoice('');
  };

  // Submit Roll Buying Record
  const handleSaveRollBuying = (e: React.FormEvent) => {
    e.preventDefault();

    addRollBuyingRecord({
      date: rollBuyDate,
      rollName: rollBuyName.trim() || 'Pure Max 500ml Heavy Sachet Film',
      rollWeightKg: Number(rollBuyWeightKg) || 28.5,
      rollsCount: Number(rollBuyCount) || 1,
      costLe: Number(rollBuyCostLe) || undefined,
      supplier: rollBuySupplier.trim() || 'Makeni Polymers Sierra Leone',
      invoiceOrReceipt: rollBuyInvoice.trim() || undefined,
      engineerId: currentUser?.id,
      engineerName: currentUser?.name || 'Production Engineer',
      notes: rollBuyNotes.trim(),
    });

    setShowAddRollModal(false);
    setRollBuyNotes('');
    setRollBuyInvoice('');
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header & Main Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-inner">
              <Factory className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                {activeRole === 'engineer' ? 'Engineer Production & Material Control' : 'Factory Production & Roll Yield Center'}
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  1:50 YIELD
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Strict inventory rule: <strong className="text-cyan-400 font-bold">1 Set of Outer Film = EXACTLY 50 Bundles</strong> of Pure Max Mineral Water.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowReportModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900/70 hover:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-white/10 shadow-lg backdrop-blur-md transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>Print Production Report</span>
          </button>

          {canLogRecords && (
            <>
              <button
                onClick={() => {
                  const firstMach = machines[0];
                  if (firstMach) {
                    setSelectedMachineId(firstMach.id);
                    setOuterOperatorName(firstMach.assignedOperatorName || '');
                    setRollWeightKg(firstMach.activeRollKg || 0);
                    setSelectedRollCode(firstMach.activeRollCode || '');
                  } else {
                    setOuterOperatorName('');
                    setRollWeightKg(0);
                    setSelectedRollCode('');
                  }
                  setShowAddBatchModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/25 transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Record Daily Batch</span>
              </button>

              <button
                onClick={() => setShowAddOuterModal(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5 backdrop-blur-md transition active:scale-95 cursor-pointer shadow-md"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Buy Outer Film</span>
              </button>

              <button
                onClick={() => setShowAddRollModal(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 font-bold text-xs flex items-center gap-1.5 backdrop-blur-md transition active:scale-95 cursor-pointer shadow-md"
              >
                <Scale className="w-4 h-4" />
                <span>Buy Packaging Roll (Kg)</span>
              </button>

              <button
                onClick={() => setShowResetModal(true)}
                className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center gap-1.5 backdrop-blur-md transition active:scale-95 cursor-pointer shadow-md"
                title="Reset All Production Batches, Roll Buyings, and Outer Records"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Production</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Conversion Banner: 1 Set = 50 Bundles */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/65 backdrop-blur-md border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shadow-inner">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-cyan-300">Standard Outer Yield Rule:</span>
            <span className="text-slate-300 ml-1.5">
              <strong>1 Set = 50 Bundles</strong> | 2 Sets = 100 Bundles | 4 Sets = 200 Bundles | 10 Sets = 500 Bundles
            </span>
          </div>
        </div>
        <div className="bg-slate-950/80 px-3 py-1 rounded-lg border border-cyan-500/30 font-mono text-[11px] text-cyan-300">
          Formula: Total Bundles = (Sets Used × 50) − Remaining Leftover
        </div>
      </div>

      {/* KPI Cards: Production & Raw Material Inventory Balances (Glassmorphic) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bundles Produced */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/65 backdrop-blur-md border border-cyan-500/30 text-slate-900 dark:text-white space-y-1 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-cyan-400 font-semibold flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" /> Total Bundles Produced
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">All-Time</span>
          </div>
          <div className="text-2xl font-black font-mono text-cyan-300">{totalBundlesAllTime.toLocaleString()}</div>
          <span className="text-[11px] text-slate-400 font-mono block">
            {totalSetsUsedAllTime.toLocaleString()} Outer Sets Used ({totalRemainingLeftoverAllTime} rem)
          </span>
        </div>

        {/* Outer Buying Stock Balance */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/65 backdrop-blur-md border border-amber-500/30 text-slate-900 dark:text-white space-y-1 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-400 font-semibold flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-amber-400" /> Outer Film In Stock
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">Available</span>
          </div>
          <div className="text-2xl font-black font-mono text-amber-300">{outerStockBalance.toLocaleString()} Sets</div>
          <span className="text-[11px] text-slate-400 font-mono block">
            Cap: {(outerStockBalance * 50).toLocaleString()} Bundles ({totalOuterSetsBought} bought)
          </span>
        </div>

        {/* Roll Buying & Consumption (Kg) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/65 backdrop-blur-md border border-indigo-500/30 text-slate-900 dark:text-white space-y-1 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-indigo-400 font-semibold flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-indigo-400" /> Roll Stock (Kg)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">{packagingRolls.length} Rolls</span>
          </div>
          <div className="text-2xl font-black font-mono text-indigo-300">{rollKgStockBalance.toFixed(1)} Kg</div>
          <span className="text-[11px] text-slate-400 block">
            {packagingRolls.filter((r) => r.status === 'loaded').length} active loaded | {packagingRolls.filter((r) => r.status === 'available').length} available
          </span>
        </div>

        {/* Damaged Bundles */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/65 backdrop-blur-md border border-rose-500/30 text-slate-900 dark:text-white space-y-1 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-400 font-semibold flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-rose-400" /> Damaged Bundles
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">Quality Defect</span>
          </div>
          <div className="text-2xl font-black font-mono text-rose-400">
            {totalDamagedAllTime.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 block">
            Engineer Quality Audit Metric
          </span>
        </div>
      </div>

      {/* MACHINE OPERATOR & ACTIVE ROLL (KG) TRACKING GRID */}
      <MachineRollTracker
        machines={machines}
        onUpdateMachine={updateMachineStatus}
        operators={activeSystemUsers}
        canEdit={canLogRecords}
      />

      {/* REAL-TIME MANAGER & DEVELOPER DUAL BAR CHARTS */}
      {canViewManagerCharts && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/65 backdrop-blur-md text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Manager & Developer Real-Time Bar Charts</span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60">
                    REAL-TIME AGGREGATED METRICS
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Real-time visual breakdown of total water bundles produced vs. damaged bundles.
                </p>
              </div>
            </div>

            {/* Three Category Selector: Daily / Monthly / Yearly */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-200 dark:border-white/10 text-xs">
              <button
                onClick={() => setChartCategory('daily')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                  chartCategory === 'daily'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-slate-900 dark:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Daily Breakdown</span>
              </button>
              <button
                onClick={() => setChartCategory('monthly')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                  chartCategory === 'monthly'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-slate-900 dark:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Monthly Breakdown</span>
              </button>
              <button
                onClick={() => setChartCategory('yearly')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                  chartCategory === 'yearly'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-slate-900 dark:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Yearly Breakdown</span>
              </button>
            </div>
          </div>

          {/* 2 DISTINCT REAL-TIME BAR CHARTS (Glassmorphic) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart 1: Total Bundles Produced */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/65 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2.5">
                <div>
                  <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <Factory className="w-4 h-4 text-cyan-400" />
                    Chart 1: Total Bundles Produced ({chartCategory.toUpperCase()})
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Calculated from Outer Film formula (Sets × 50 − Remaining)
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                  {chartCategory === 'daily' ? 'Per Day' : chartCategory === 'monthly' ? 'Per Month' : 'Per Year'}
                </span>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aggregatedChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                      formatter={(value: any) => [`${Number(value).toLocaleString()} Bundles`, 'Bundles Produced']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="produced" fill="#06b6d4" radius={[6, 6, 0, 0]} name="Bundles Produced" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Damaged Bundles */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/65 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2.5">
                <div>
                  <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-rose-400" />
                    Chart 2: Damaged Bundles Audit ({chartCategory.toUpperCase()})
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Reported by Engineer during production batches
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                  {chartCategory === 'daily' ? 'Per Day' : chartCategory === 'monthly' ? 'Per Month' : 'Per Year'}
                </span>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aggregatedChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                      formatter={(value: any) => [`${Number(value).toLocaleString()} Damaged`, 'Damaged Bundles']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="damaged" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Damaged Bundles" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab Navigation for Daily Record Sections (Glassmorphic) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
        <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900/65 backdrop-blur-md p-1.5 rounded-2xl text-xs font-bold border border-slate-200 dark:border-white/10 shadow-lg">
          <button
            onClick={() => setActiveSubTab('production')}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'production'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-slate-900 dark:text-white'
            }`}
          >
            <Factory className="w-4 h-4" />
            <span>Production Logs ({production.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('packaging_rolls')}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'packaging_rolls'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-slate-900 dark:text-white'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Rolls Inventory & Yield ({packagingRolls.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('outer_buying')}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'outer_buying'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-slate-900 dark:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Outer Film Stock ({outerBuyings.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('roll_buying')}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'roll_buying'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-slate-900 dark:text-white'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Roll Purchases ({rollBuyings.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('inventory_balance')}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'inventory_balance'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-slate-900 dark:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Stock Ledger</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          {activeSubTab === 'production' && '1 Outer Set = 50 Bundles standard'}
          {activeSubTab === 'packaging_rolls' && 'Roll-to-Operator Yield Tracking'}
          {activeSubTab === 'outer_buying' && 'Incoming Outer Film Stock'}
          {activeSubTab === 'roll_buying' && 'Incoming Packaging Roll Film'}
          {activeSubTab === 'inventory_balance' && 'Real-Time Inventory Status'}
        </div>
      </div>

      {/* Filter and Search Bar */}
      {activeSubTab !== 'inventory_balance' && (
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/65 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeSubTab === 'production'
                  ? 'Search by Batch Code, Date, Machine, Operator Name, Roll Code, or Engineer...'
                  : activeSubTab === 'packaging_rolls'
                  ? 'Search by Roll Code, Brand, Machine, Operator, or Supplier...'
                  : activeSubTab === 'outer_buying'
                  ? 'Search Outer Buying by Date, Supplier, or Logger...'
                  : 'Search Roll Buying by Roll Name, Date, Supplier, or Logger...'
              }
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-950/60 focus:ring-2 focus:ring-cyan-500 font-medium text-xs text-slate-900 dark:text-white placeholder-slate-500"
            />
          </div>

          {activeSubTab === 'production' && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={tableShiftFilter}
                onChange={(e) => setTableShiftFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-950/60 font-bold text-xs text-slate-200"
              >
                <option value="all">All Shifts</option>
                <option value="morning">Morning Shift</option>
                <option value="night">Night Shift</option>
              </select>
            </div>
          )}

          {activeSubTab === 'packaging_rolls' && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={rollStatusFilter}
                onChange={(e) => setRollStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-950/60 font-bold text-xs text-slate-200"
              >
                <option value="all">All Roll Statuses</option>
                <option value="available">🟢 Available Stock</option>
                <option value="loaded">🔵 Loaded in Machine</option>
                <option value="exhausted">⚪ Exhausted / Finished</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 1: DAILY PRODUCTION BATCH LOGS */}
      {activeSubTab === 'production' && (
        <div className="bg-white dark:bg-slate-900/65 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="p-3.5">Batch Code & Date</th>
                  <th className="p-3.5">Machine & Operator</th>
                  <th className="p-3.5">Outer Sets Used (Rem)</th>
                  <th className="p-3.5">Active Roll ID (Kg)</th>
                  <th className="p-3.5">Total Bundles Produced</th>
                  <th className="p-3.5">Damaged Bundles</th>
                  <th className="p-3.5">Clean Water Output</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {filteredProduction.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No production batches recorded. Click "Record Daily Batch" to add one.
                    </td>
                  </tr>
                ) : (
                  filteredProduction.map((p) => {
                    const sets = p.outerSetsUsed ?? p.outerFilmCount ?? 0;
                    const rem = p.outerRemainingBundles || 0;
                    return (
                      <tr key={p.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3.5">
                          <span className="font-mono font-bold text-cyan-400 block">
                            {p.batchNumber}
                          </span>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {p.date} • <span className="capitalize font-semibold text-slate-300">{p.shift}</span>
                          </span>
                        </td>

                        <td className="p-3.5">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {p.machineName || 'Machine Line'}
                          </span>
                          <span className="text-[11px] text-indigo-400 flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3" />
                            {p.outerOperatorName || p.operatorName || 'Operator'}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {sets} Sets
                          </span>
                          {rem > 0 ? (
                            <span className="text-[10px] text-amber-400 font-semibold block">
                              − {rem} bundles rem
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-400 block">
                              0 rem (Full yield)
                            </span>
                          )}
                        </td>

                        <td className="p-3.5">
                          <span className="font-bold text-cyan-400 block">
                            {p.packagingRollWeightKg ? `${p.packagingRollWeightKg} KG` : 'N/A'}
                          </span>
                          {p.packagingRollCode && (
                            <span className="text-[10px] font-mono text-slate-400 block">
                              {p.packagingRollCode}
                            </span>
                          )}
                        </td>

                        <td className="p-3.5">
                          <span className="text-sm font-black font-mono text-emerald-400">
                            {p.bundlesProduced.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            = ({sets} × 50) − {rem}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <span className="font-bold text-rose-400">
                            {p.damagedBundles}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Damaged
                          </span>
                        </td>

                        <td className="p-3.5">
                          <span className="font-semibold text-slate-300">
                            {(p.cleanWaterLitres || p.bundlesProduced * 12).toLocaleString()} L
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Pure Max Water
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: PACKAGING ROLLS INVENTORY & YIELD TRACKING */}
      {activeSubTab === 'packaging_rolls' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900/65 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-cyan-400" />
                  Packaging Roll Inventory & Cumulative Yield Report
                </h4>
                <p className="text-xs text-slate-400">
                  Every roll is recorded with a unique Roll Code and tracked through assignment, production yield, and exhaustion.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300 font-mono px-3 py-1 rounded-lg bg-slate-800 border border-slate-200 dark:border-white/10">
                  Total Rolls: <strong>{packagingRolls.length}</strong>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="p-3.5">Roll Code & Brand</th>
                    <th className="p-3.5">Weight (Kg) & Cost</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Assigned Machine & Operator</th>
                    <th className="p-3.5">Bundles Produced Yield</th>
                    <th className="p-3.5">Purchase Date & Supplier</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {filteredPackagingRolls.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No packaging rolls match the filter. Use "Buy Packaging Roll (Kg)" to record new rolls into factory inventory.
                      </td>
                    </tr>
                  ) : (
                    filteredPackagingRolls.map((roll) => {
                      const isAvailable = roll.status === 'available';
                      const isLoaded = roll.status === 'loaded';
                      const isExhausted = roll.status === 'exhausted';

                      return (
                        <tr key={roll.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-3.5">
                            <span className="font-mono font-bold text-cyan-300 block text-xs">
                              {roll.rollCode}
                            </span>
                            <span className="text-[11px] text-slate-400 truncate max-w-[200px] block">
                              {roll.rollName}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span className="font-black text-slate-900 dark:text-white block">
                              {roll.weightKg} KG
                            </span>
                            <span className="text-[10px] text-emerald-400 font-mono">
                              {roll.costLe ? `SLE ${roll.costLe.toLocaleString()}` : '—'}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                isLoaded
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                  : isAvailable
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isLoaded ? 'bg-cyan-400 animate-pulse' : isAvailable ? 'bg-emerald-400' : 'bg-slate-500'
                                }`}
                              />
                              {roll.status}
                            </span>
                          </td>

                          <td className="p-3.5">
                            {isLoaded ? (
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">
                                  {roll.assignedMachineName || roll.assignedMachineId}
                                </span>
                                <span className="text-[11px] text-indigo-400 flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {roll.operatorName || 'Machine Operator'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">— In Storage —</span>
                            )}
                          </td>

                          <td className="p-3.5">
                            <span className="text-sm font-mono font-bold text-emerald-400">
                              {(roll.bundlesProduced || 0).toLocaleString()} Bundles
                            </span>
                            {roll.bundlesProduced && roll.weightKg ? (
                              <span className="text-[10px] text-slate-400 block font-mono">
                                ~{Math.round(roll.bundlesProduced / roll.weightKg)} bundles / kg
                              </span>
                            ) : null}
                          </td>

                          <td className="p-3.5">
                            <span className="text-slate-300 block">{roll.purchaseDate}</span>
                            <span className="text-[11px] text-slate-400">{roll.supplier}</span>
                          </td>

                          <td className="p-3.5 text-right">
                            {isLoaded && roll.assignedMachineId && (
                              <button
                                onClick={() => exhaustMachineRoll(roll.assignedMachineId!)}
                                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-semibold flex items-center gap-1 ml-auto"
                              >
                                <Ban className="w-3 h-3" />
                                Exhaust
                              </button>
                            )}
                            {isAvailable && (
                              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 justify-end">
                                <Check className="w-3 h-3" /> Ready
                              </span>
                            )}
                            {isExhausted && (
                              <span className="text-[10px] text-slate-500">Retired</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: OUTER FILM PURCHASES */}
      {activeSubTab === 'outer_buying' && (
        <div className="bg-white dark:bg-slate-900/65 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="p-3.5">Purchase Date</th>
                  <th className="p-3.5">Outer Sets Bought</th>
                  <th className="p-3.5">Equivalent Bundle Capacity</th>
                  <th className="p-3.5">Supplier</th>
                  <th className="p-3.5">Total Cost (SLE)</th>
                  <th className="p-3.5">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {filteredOuterBuyings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No outer film purchases logged. Click "Buy Outer Film" to record incoming stock.
                    </td>
                  </tr>
                ) : (
                  filteredOuterBuyings.map((o) => (
                    <tr key={o.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                        {o.date}
                      </td>
                      <td className="p-3.5 font-bold text-amber-400">
                        {o.outersCount.toLocaleString()} Sets
                      </td>
                      <td className="p-3.5 font-mono text-slate-300">
                        {(o.outersCount * 50).toLocaleString()} Bundles Capacity
                      </td>
                      <td className="p-3.5 text-slate-300">
                        {o.supplier || 'N/A'}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-emerald-400">
                        {o.costLe ? `SLE ${o.costLe.toLocaleString()}` : '—'}
                      </td>
                      <td className="p-3.5 text-slate-400">
                        {o.engineerName}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: ROLL PURCHASES BY KG */}
      {activeSubTab === 'roll_buying' && (
        <div className="bg-white dark:bg-slate-900/65 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="p-3.5">Purchase Date</th>
                  <th className="p-3.5">Roll Name / Brand</th>
                  <th className="p-3.5">Weight (KG) & Rolls</th>
                  <th className="p-3.5">Total Weight (KG)</th>
                  <th className="p-3.5">Supplier</th>
                  <th className="p-3.5">Total Cost (SLE)</th>
                  <th className="p-3.5">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {filteredRollBuyings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No roll purchases logged. Click "Buy Packaging Roll (Kg)" to record incoming rolls.
                    </td>
                  </tr>
                ) : (
                  filteredRollBuyings.map((r) => {
                    const totalKg = (Number(r.rollWeightKg) || 0) * (Number(r.rollsCount) || 1);
                    return (
                      <tr key={r.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                          {r.date}
                        </td>
                        <td className="p-3.5 font-bold text-indigo-400">
                          {r.rollName}
                        </td>
                        <td className="p-3.5 text-slate-300">
                          {r.rollsCount} Rolls @ {r.rollWeightKg} KG
                        </td>
                        <td className="p-3.5 font-mono font-bold text-cyan-400">
                          {totalKg.toFixed(1)} KG
                        </td>
                        <td className="p-3.5 text-slate-300">
                          {r.supplier || 'N/A'}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-emerald-400">
                          {r.costLe ? `SLE ${r.costLe.toLocaleString()}` : '—'}
                        </td>
                        <td className="p-3.5 text-slate-400">
                          {r.engineerName}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 5: STOCK BALANCES & RAW MATERIAL LEDGER */}
      {activeSubTab === 'inventory_balance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Outer Film Ledger */}
          <div className="bg-white dark:bg-slate-900/65 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Outer Film Stock Balance</h4>
                  <p className="text-xs text-slate-400">Conversion: 1 Set = 50 Bundles</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {outerStockBalance.toLocaleString()} Sets Available
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 bg-slate-950/60 rounded-lg border border-white/5">
                <span className="text-slate-400">Total Outer Sets Purchased:</span>
                <span className="font-bold text-slate-900 dark:text-white">{totalOuterSetsBought.toLocaleString()} Sets</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-950/60 rounded-lg border border-white/5">
                <span className="text-slate-400">Total Outer Sets Consumed:</span>
                <span className="font-bold text-rose-400">{totalSetsUsedAllTime.toLocaleString()} Sets</span>
              </div>
              <div className="flex justify-between p-2.5 bg-amber-950/30 border border-amber-500/30 rounded-lg">
                <span className="text-amber-300 font-semibold">Net Stock Balance:</span>
                <span className="font-black text-amber-300">
                  {outerStockBalance.toLocaleString()} Sets ({(outerStockBalance * 50).toLocaleString()} Bundles Capacity)
                </span>
              </div>
            </div>
          </div>

          {/* Packaging Roll Ledger */}
          <div className="bg-white dark:bg-slate-900/65 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Packaging Roll Stock Balance (KG)</h4>
                  <p className="text-xs text-slate-400">Film Loaded into Machines</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {rollKgStockBalance.toFixed(1)} KG Available
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 bg-slate-950/60 rounded-lg border border-white/5">
                <span className="text-slate-400">Total Roll Weight Purchased:</span>
                <span className="font-bold text-slate-900 dark:text-white">{totalRollKgBought.toFixed(1)} KG</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-950/60 rounded-lg border border-white/5">
                <span className="text-slate-400">Total Roll Weight Consumed:</span>
                <span className="font-bold text-rose-400">{totalRollKgUsed.toFixed(1)} KG</span>
              </div>
              <div className="flex justify-between p-2.5 bg-indigo-950/30 border border-indigo-500/30 rounded-lg">
                <span className="text-indigo-300 font-semibold">Net Stock Balance:</span>
                <span className="font-black text-indigo-300">
                  {rollKgStockBalance.toFixed(1)} KG Remaining
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: RECORD DAILY PRODUCTION BATCH (Glassmorphic) */}
      {showAddBatchModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900/90 border border-white/15 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 my-8 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shadow-inner">
                  <Factory className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Daily Production Batch</h3>
                  <p className="text-xs text-slate-400">Yield Rule: 1 Set Outer Film = 50 Bundles</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddBatchModal(false)}
                className="text-slate-400 hover:text-slate-900 dark:text-white text-sm w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDailyBatch} className="space-y-4 text-xs">
              {/* Date & Shift */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Production Date *</label>
                  <input
                    type="date"
                    value={batchDate}
                    onChange={(e) => setBatchDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Production Shift *</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="morning">☀️ Morning Shift</option>
                    <option value="night">🌙 Night Shift</option>
                  </select>
                </div>
              </div>

              {/* Machine Selection */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Assigned Sachet Machine Line *</label>
                <select
                  value={selectedMachineId}
                  onChange={(e) => handleMachineSelect(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400 font-medium"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.assignedOperatorName || 'Unassigned'}) — Active Roll: {m.activeRollKg || 0} Kg {m.activeRollCode ? `[${m.activeRollCode}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* CORRECTED OUTER USAGE INPUT FIELDS: Sets Used & Remaining Bundles */}
              <div className="p-3.5 bg-slate-950/60 border border-cyan-500/30 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-cyan-400" /> Outer Film Consumption (1 Set = 50 Bundles)
                  </span>
                  <span className="text-[10px] text-cyan-300 font-mono px-2 py-0.5 bg-cyan-950 rounded">1:50 Standard</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Sets Used (Count) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={setsUsed}
                      onChange={(e) => setSetsUsed(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-cyan-500/50 rounded-lg p-2.5 text-slate-900 dark:text-white font-bold text-base focus:outline-none focus:border-cyan-400"
                      required
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Capacity: {setsUsed * 50} Bundles
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Remaining Bundles Leftover
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={setsUsed * 50}
                      step="1"
                      value={remainingBundles}
                      onChange={(e) => setRemainingBundles(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-amber-500/50 rounded-lg p-2.5 text-amber-400 font-bold text-base focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Subtracted from yield
                    </span>
                  </div>
                </div>

                {/* Live Formula Preview */}
                <div className="p-2.5 bg-white dark:bg-slate-900/90 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <span className="text-slate-400">Total Bundles Produced:</span>
                  <span className="text-base font-black font-mono text-emerald-400">
                    {liveCalculatedBundles.toLocaleString()} Bundles
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  Calculation: ({setsUsed} Sets × 50) − {remainingBundles} Remaining = {liveCalculatedBundles} Bundles Produced
                </p>
              </div>

              {/* Machine Operator & Active Roll Kg */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Operator Name *</label>
                  <select
                    value={outerOperatorName}
                    onChange={(e) => handleOperatorSelect(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400 font-medium"
                    required
                  >
                    <option value="">-- Select Machine Operator --</option>

                    <optgroup label="🏭 Dedicated Machine Operators">
                      {dedicatedOperators.length > 0 ? (
                        dedicatedOperators.map((op) => (
                          <option key={op.id} value={op.name}>
                            {op.name} ({op.employeeId || 'Operator'}) {op.department ? `— ${op.department}` : ''}
                          </option>
                        ))
                      ) : (
                        <option disabled value="__no_op">
                          (No Operator accounts found — Add in Users)
                        </option>
                      )}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Active Roll Loaded (Kg) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={rollWeightKg}
                    onChange={(e) => setRollWeightKg(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-cyan-400 font-bold focus:outline-none focus:border-cyan-400"
                    required
                  />
                  <span className="text-[10px] text-slate-400">
                    {selectedRollCode ? `Code: ${selectedRollCode}` : 'Active Roll in machine'}
                  </span>
                </div>
              </div>

              {/* Damaged Bundles */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Damaged Bundles (Quality Defect Audit)
                </label>
                <input
                  type="number"
                  min="0"
                  value={damagedBundles}
                  onChange={(e) => setDamagedBundles(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-rose-500/40 rounded-lg p-2 text-rose-400 font-bold focus:outline-none focus:border-rose-400"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Batch Remarks / Notes</label>
                <input
                  type="text"
                  value={batchNotes}
                  placeholder="e.g. Standard line pressure, verified 500ml water seal integrity"
                  onChange={(e) => setBatchNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-slate-900 dark:text-white placeholder-slate-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(false)}
                  className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <PackageCheck className="w-4 h-4" />
                  Save Batch & Record Yield
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BUY OUTER FILM (Glassmorphic) */}
      {showAddOuterModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900/90 border border-white/15 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Outer Film Purchase</h3>
                  <p className="text-xs text-slate-400">1 Set = 50 Bundles capacity</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddOuterModal(false)}
                className="text-slate-400 hover:text-slate-900 dark:text-white text-sm w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOuterBuying} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Purchase Date *</label>
                <input
                  type="date"
                  value={outerBuyDate}
                  onChange={(e) => setOuterBuyDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Outer Sets Purchased (Count) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={outerBuyCount}
                  onChange={(e) => setOuterBuyCount(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-amber-500/40 rounded-lg p-2 text-amber-400 font-bold text-base"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Capacity: {(outerBuyCount * 50).toLocaleString()} Bundles of Water
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Supplier Name</label>
                <input
                  type="text"
                  value={outerBuySupplier}
                  onChange={(e) => setOuterBuySupplier(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Total Cost (Leones - SLE)</label>
                <input
                  type="number"
                  value={outerBuyCostLe}
                  onChange={(e) => setOuterBuyCostLe(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-emerald-500/40 rounded-lg p-2 text-emerald-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Invoice / Receipt #</label>
                <input
                  type="text"
                  value={outerBuyInvoice}
                  placeholder="e.g. INV-88219"
                  onChange={(e) => setOuterBuyInvoice(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddOuterModal(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-md"
                >
                  Save Outer Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: BUY ROLL FILM (Glassmorphic) */}
      {showAddRollModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900/90 border border-white/15 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Packaging Roll Purchase</h3>
                  <p className="text-xs text-slate-400">Generates individual inventory codes for each roll</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddRollModal(false)}
                className="text-slate-400 hover:text-slate-900 dark:text-white text-sm w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRollBuying} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Purchase Date *</label>
                <input
                  type="date"
                  value={rollBuyDate}
                  onChange={(e) => setRollBuyDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Roll Brand / Specification *</label>
                <input
                  type="text"
                  value={rollBuyName}
                  onChange={(e) => setRollBuyName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Weight per Roll (KG) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={rollBuyWeightKg}
                    onChange={(e) => setRollBuyWeightKg(parseFloat(e.target.value) || 1)}
                    className="w-full bg-slate-50 dark:bg-slate-800/90 border border-indigo-500/40 rounded-lg p-2 text-indigo-400 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Number of Rolls *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={rollBuyCount}
                    onChange={(e) => setRollBuyCount(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-slate-900 dark:text-white font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Supplier Name</label>
                <input
                  type="text"
                  value={rollBuySupplier}
                  onChange={(e) => setRollBuySupplier(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Total Cost (Leones - SLE)</label>
                <input
                  type="number"
                  value={rollBuyCostLe}
                  onChange={(e) => setRollBuyCostLe(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-emerald-500/40 rounded-lg p-2 text-emerald-400 font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddRollModal(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold rounded-lg shadow-md"
                >
                  Save Roll Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT PRODUCTION REPORT MODAL */}
      <ProductionReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        production={production}
        outerBuyings={outerBuyings}
        rollBuyings={rollBuyings}
        machines={machines}
        currentUser={currentUser}
      />

      {/* RESET PRODUCTION CONFIRMATION MODAL */}
      {showResetModal && (
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
                    Enter your account password to confirm
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium">
                This wipes <strong>everything</strong> recorded in Production:
                <ul className="list-disc pl-4 mt-1.5 space-y-0.5">
                  <li>{production.length} production batch log(s)</li>
                  <li>{outerBuyings.length} outer film purchase(s)</li>
                  <li>{rollBuyings.length} roll buying (KG) record(s)</li>
                  <li>{packagingRolls.length} roll inventory entr(ies)</li>
                </ul>
                <div className="mt-2">
                  <strong>Total Bundles Produced</strong> and all bar charts will return to <strong>0</strong>.
                  A backup Excel workbook is downloaded before deletion.
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Account / Privileged Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Enter password..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-rose-500 focus:outline-none text-sm"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setResetPassword('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const success = resetProductionRecords(resetPassword);
                  if (success) {
                    setShowResetModal(false);
                    setResetPassword('');
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition cursor-pointer shadow-lg shadow-rose-600/25"
              >
                Reset Production &amp; Roll Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
