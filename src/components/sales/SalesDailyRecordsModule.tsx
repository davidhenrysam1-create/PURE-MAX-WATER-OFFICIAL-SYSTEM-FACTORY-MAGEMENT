/**
 * Sales Daily Records Module for Sales Production Officer
 * Pure Max Factory Management System
 * 
 * Provides dedicated daily sales logs & reconciliations:
 * 1. Factory / Gate Sales (Date, Customer, Bundles, Price, Total Le, Payment Mode, Receipt)
 * 2. Van Sales Dispatches & Reconciliation (Loaded, Sold, Unsold Returned, Damaged, Cash Reconciled)
 * 3. Tricycle Sales Dispatches & Reconciliation (Loaded, Sold, Unsold Returned, Damaged, Cash Reconciled)
 * 4. Wholesale Bulk Client Orders (Client, Contact, Bundles, Price, Total Le, Payment Status)
 * 5. Daily Damaged / Burst Sachet Bundles (Factory Gate & In-Transit Defect Audit)
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { SalesCategory, SalesRecord } from '../../types';
import {
  ClipboardList,
  Plus,
  Search,
  CheckCircle2,
  AlertOctagon,
  TrendingUp,
  Truck,
  Bike,
  Building,
  Store,
  DollarSign,
  Receipt,
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  CreditCard,
  Banknote,
  Package,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  UserCheck,
  Tag,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  X,
  AlertTriangle,
} from 'lucide-react';

export const SalesDailyRecordsModule: React.FC = () => {
  const { sales, addSalesRecord, activeRole, currentUser, users } = useApp();

  // Operator and Staff are restricted from viewing or editing daily sales records
  if (['staff', 'operator', 'tricycle_staff', 'van_staff'].includes(activeRole)) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3 max-w-xl mx-auto my-12">
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
          <AlertOctagon className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">Access Restricted</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Daily sales records, invoicing, dispatches, and reconciliation are strictly restricted to Sales Production Officers and Management.
        </p>
      </div>
    );
  }

  // Active Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'gate' | 'van' | 'tricycle' | 'wholesale' | 'damaged'>('all');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  // Modals
  const [showAddGateModal, setShowAddGateModal] = useState(false);
  const [showAddVanModal, setShowAddVanModal] = useState(false);
  const [showAddTriModal, setShowAddTriModal] = useState(false);
  const [showAddWholesaleModal, setShowAddWholesaleModal] = useState(false);
  const [showAddDamagedModal, setShowAddDamagedModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<SalesRecord | null>(null);

  // 1. Gate Sales Form State
  const [gateDate, setGateDate] = useState(new Date().toISOString().split('T')[0]);
  const [gateCustomer, setGateCustomer] = useState('Walk-in Customer / Retail Buyer');
  const [gateBundles, setGateBundles] = useState<number>(50);
  const [gateUnitPrice, setGateUnitPrice] = useState<number>(12000);
  const [gatePayment, setGatePayment] = useState<'cash' | 'orange_money' | 'bank_transfer'>('cash');
  const [gateNotes, setGateNotes] = useState('');

  // 2. Van Sales Form State
  const [vanDate, setVanDate] = useState(new Date().toISOString().split('T')[0]);
  // Issue #3 — dispatch audit fields required by the spec: the time the vehicle
  // left the factory, and the stock officer who signed the load-out off.
  const [vanDispatchTime, setVanDispatchTime] = useState(() =>
    new Date().toTimeString().slice(0, 5)
  );
  const [vanStockOfficer, setVanStockOfficer] = useState('');
  const [vanVehicle, setVanVehicle] = useState('SL-VAN-01 (Makeni Central & Suburbs)');
  const [vanDriver, setVanDriver] = useState('');
  const [vanLoaded, setVanLoaded] = useState<number>(250);
  const [vanSold, setVanSold] = useState<number>(230);
  const [vanUnsold, setVanUnsold] = useState<number>(15);
  const [vanDamaged, setVanDamaged] = useState<number>(5);
  const [vanUnitPrice, setVanUnitPrice] = useState<number>(12000);
  const [vanPayment, setVanPayment] = useState<'cash' | 'orange_money' | 'bank_transfer'>('cash');
  const [vanCashCollected, setVanCashCollected] = useState<number | ''>('');
  const [vanNotes, setVanNotes] = useState('');

  // 3. Tricycle Sales Form State
  const [triDate, setTriDate] = useState(new Date().toISOString().split('T')[0]);
  const [triDispatchTime, setTriDispatchTime] = useState(() =>
    new Date().toTimeString().slice(0, 5)
  );
  const [triStockOfficer, setTriStockOfficer] = useState('');
  const [triVehicle, setTriVehicle] = useState('PM-TRI-02 (Rogbere Junction Route)');
  const [triDriver, setTriDriver] = useState('');
  const [triLoaded, setTriLoaded] = useState<number>(100);
  const [triSold, setTriSold] = useState<number>(92);
  const [triUnsold, setTriUnsold] = useState<number>(6);
  const [triDamaged, setTriDamaged] = useState<number>(2);
  const [triUnitPrice, setTriUnitPrice] = useState<number>(12000);
  const [triPayment, setTriPayment] = useState<'cash' | 'orange_money' | 'bank_transfer'>('cash');
  const [triCashCollected, setTriCashCollected] = useState<number | ''>('');
  const [triNotes, setTriNotes] = useState('');

  // 4. Wholesale Form State
  const [wsDate, setWsDate] = useState(new Date().toISOString().split('T')[0]);
  const [wsClient, setWsClient] = useState('City Supermarket & Wholesale Makeni');
  const [wsPhone, setWsPhone] = useState('+232 76 554 112');
  const [wsAddress, setWsAddress] = useState('Mabanta Road Commercial Center');
  const [wsBundles, setWsBundles] = useState<number>(300);
  const [wsUnitPrice, setWsUnitPrice] = useState<number>(11500);
  const [wsPayment, setWsPayment] = useState<'cash' | 'orange_money' | 'bank_transfer' | 'credit'>('bank_transfer');
  const [wsNotes, setWsNotes] = useState('');

  // 5. Damaged Form State
  const [dmgDate, setDmgDate] = useState(new Date().toISOString().split('T')[0]);
  const [dmgSource, setDmgSource] = useState('Factory Gate Dispatch / Loading Defect');
  const [dmgCount, setDmgCount] = useState<number>(8);
  const [dmgReason, setDmgReason] = useState('Burst sealing & outer bag tear during transit handling');
  const [dmgNotes, setDmgNotes] = useState('');

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return sales.filter((s) => {
      // Sub-tab filter
      if (activeSubTab === 'gate' && s.category !== 'Factory Sales') return false;
      if (activeSubTab === 'van' && s.category !== 'Van Sales') return false;
      if (activeSubTab === 'tricycle' && s.category !== 'Tricycle Sales') return false;
      if (activeSubTab === 'wholesale' && s.category !== 'Wholesale Orders') return false;
      if (activeSubTab === 'damaged' && s.category !== 'Damaged Bundles') return false;

      // Date filter
      if (dateFilter && s.date !== dateFilter) return false;

      // Payment filter
      if (paymentFilter !== 'all' && s.paymentMethod !== paymentFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesReceipt = s.receiptNumber?.toLowerCase().includes(q);
        const matchesCustomer = s.customerOrDriver?.toLowerCase().includes(q);
        const matchesVehicle = s.vehicleNumber?.toLowerCase().includes(q);
        const matchesLogger = s.recordedByName?.toLowerCase().includes(q);
        const matchesNotes = s.notes?.toLowerCase().includes(q);
        if (!matchesReceipt && !matchesCustomer && !matchesVehicle && !matchesLogger && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [sales, activeSubTab, dateFilter, paymentFilter, searchQuery]);

  // Aggregate Metrics for Sales Officer
  const totalBundlesSold = useMemo(() => {
    return sales
      .filter((s) => s.category !== 'Damaged Bundles')
      .reduce((sum, s) => sum + (Number(s.bundleQuantity) || 0), 0);
  }, [sales]);

  const totalRevenueLe = useMemo(() => {
    return sales
      .filter((s) => s.category !== 'Damaged Bundles')
      .reduce((sum, s) => sum + (Number(s.totalAmountLe) || 0), 0);
  }, [sales]);

  const totalCashRevenue = useMemo(() => {
    return sales
      .filter((s) => s.category !== 'Damaged Bundles' && (!s.paymentMethod || s.paymentMethod === 'cash'))
      .reduce((sum, s) => sum + (Number(s.totalAmountLe) || 0), 0);
  }, [sales]);

  const totalOrangeMoney = useMemo(() => {
    return sales
      .filter((s) => s.paymentMethod === 'orange_money')
      .reduce((sum, s) => sum + (Number(s.totalAmountLe) || 0), 0);
  }, [sales]);

  const totalBankTransfer = useMemo(() => {
    return sales
      .filter((s) => s.paymentMethod === 'bank_transfer')
      .reduce((sum, s) => sum + (Number(s.totalAmountLe) || 0), 0);
  }, [sales]);

  const totalDamagedLogged = useMemo(() => {
    return sales.reduce((sum, s) => {
      if (s.category === 'Damaged Bundles') return sum + (Number(s.bundleQuantity) || 0);
      return sum + (Number(s.damagedLosses) || 0);
    }, 0);
  }, [sales]);

  const totalFleetDispatched = useMemo(() => {
    return sales
      .filter((s) => s.category === 'Van Sales' || s.category === 'Tricycle Sales')
      .reduce((sum, s) => sum + (Number(s.bundleQuantity) || 0), 0);
  }, [sales]);

  // Form Handlers
  const handleSaveGateSale = (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = gateBundles * gateUnitPrice;
    addSalesRecord({
      date: gateDate,
      category: 'Factory Sales',
      bundleQuantity: gateBundles,
      unitPriceLe: gateUnitPrice,
      totalAmountLe: totalAmount,
      customerOrDriver: gateCustomer,
      paymentMethod: gatePayment,
      notes: gateNotes || 'Factory gate direct pickup',
      recordedById: currentUser?.id || 'sys',
      recordedByName: currentUser?.name || 'Sales Production Officer',
      recordedByRole: 'sales_manager',
    });
    setShowAddGateModal(false);
    setGateNotes('');
  };

  const handleSaveVanSale = (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = vanSold * vanUnitPrice;
    addSalesRecord({
      date: vanDate,
      category: 'Van Sales',
      bundleQuantity: vanSold,
      loadedBundles: vanLoaded,
      unsoldBundles: vanUnsold,
      damagedLosses: vanDamaged,
      unitPriceLe: vanUnitPrice,
      totalAmountLe: totalAmount,
      amountPaidLe: vanCashCollected === '' ? totalAmount : vanCashCollected,
      vehicleNumber: vanVehicle,
      customerOrDriver: vanDriver,
      paymentMethod: vanPayment,
      notes: `Loaded: ${vanLoaded} | Sold: ${vanSold} | Unsold Returned: ${vanUnsold} | Damaged: ${vanDamaged} | Dispatch Time: ${vanDispatchTime} | Stock Officer Sign-off: ${vanStockOfficer || 'Unsigned'}. ${vanNotes}`,
      recordedById: currentUser?.id || 'sys',
      recordedByName: currentUser?.name || 'Sales Production Officer',
      recordedByRole: 'sales_manager',
    });
    setShowAddVanModal(false);
    setVanNotes('');
    setVanCashCollected('');
  };

  const handleSaveTriSale = (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = triSold * triUnitPrice;
    addSalesRecord({
      date: triDate,
      category: 'Tricycle Sales',
      bundleQuantity: triSold,
      loadedBundles: triLoaded,
      unsoldBundles: triUnsold,
      damagedLosses: triDamaged,
      unitPriceLe: triUnitPrice,
      totalAmountLe: totalAmount,
      amountPaidLe: triCashCollected === '' ? totalAmount : triCashCollected,
      vehicleNumber: triVehicle,
      customerOrDriver: triDriver,
      paymentMethod: triPayment,
      notes: `Loaded: ${triLoaded} | Sold: ${triSold} | Unsold Returned: ${triUnsold} | Damaged: ${triDamaged} | Dispatch Time: ${triDispatchTime} | Stock Officer Sign-off: ${triStockOfficer || 'Unsigned'}. ${triNotes}`,
      recordedById: currentUser?.id || 'sys',
      recordedByName: currentUser?.name || 'Sales Production Officer',
      recordedByRole: 'sales_manager',
    });
    setShowAddTriModal(false);
    setTriNotes('');
    setTriCashCollected('');
  };

  const handleSaveWholesale = (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = wsBundles * wsUnitPrice;
    addSalesRecord({
      date: wsDate,
      category: 'Wholesale Orders',
      bundleQuantity: wsBundles,
      unitPriceLe: wsUnitPrice,
      totalAmountLe: totalAmount,
      customerOrDriver: wsClient,
      clientPhone: wsPhone,
      clientAddress: wsAddress,
      paymentMethod: wsPayment,
      notes: `Client: ${wsClient} | Contact: ${wsPhone} | Address: ${wsAddress}. ${wsNotes}`,
      recordedById: currentUser?.id || 'sys',
      recordedByName: currentUser?.name || 'Sales Production Officer',
      recordedByRole: 'sales_manager',
    });
    setShowAddWholesaleModal(false);
    setWsNotes('');
  };

  const handleSaveDamaged = (e: React.FormEvent) => {
    e.preventDefault();
    addSalesRecord({
      date: dmgDate,
      category: 'Damaged Bundles',
      bundleQuantity: dmgCount,
      damagedLosses: dmgCount,
      unitPriceLe: 0,
      totalAmountLe: 0,
      customerOrDriver: dmgSource,
      notes: `Reason: ${dmgReason}. ${dmgNotes}`,
      recordedById: currentUser?.id || 'sys',
      recordedByName: currentUser?.name || 'Sales Production Officer',
      recordedByRole: 'sales_manager',
    });
    setShowAddDamagedModal(false);
    setDmgNotes('');
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Receipt #', 'Date', 'Category', 'Customer/Driver', 'Vehicle', 'Bundles Sold', 'Unsold Returned', 'Damaged Losses', 'Unit Price (SLE)', 'Total (SLE)', 'Payment Method', 'Recorded By', 'Notes'];
    const rows = filteredRecords.map((r) => [
      r.receiptNumber,
      r.date,
      r.category,
      `"${(r.customerOrDriver || '').replace(/"/g, '""')}"`,
      `"${(r.vehicleNumber || '').replace(/"/g, '""')}"`,
      r.bundleQuantity,
      r.unsoldBundles || 0,
      r.damagedLosses || 0,
      r.unitPriceLe,
      r.totalAmountLe,
      r.paymentMethod || 'cash',
      r.recordedByName,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PureMax_Daily_Sales_Records_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-white">
      {/* Top Header Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-[#020617] text-white border border-emerald-800/40 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <ClipboardList className="w-48 h-48 text-emerald-400" />
        </div>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 font-mono text-[11px] font-bold border border-emerald-700/60 uppercase flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-emerald-400" />
                Sales Production Officer Hub
              </span>
              <span className="text-slate-400 text-xs font-mono">
                Makeni Gate Sales & Fleet Dispatches
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans flex items-center gap-2.5">
              Daily Sales Records & Reconciliations
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Track daily Factory Gate Sales, Van & Tricycle Delivery Reconciliations, Wholesale Bulk Orders, and Damaged Sachet Losses.
            </p>
          </div>

          {/* Quick Log Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddGateModal(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition border border-emerald-400/30 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Gate / Factory Sale</span>
            </button>
            <button
              onClick={() => setShowAddVanModal(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition border border-blue-400/30 cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>+ Van Dispatch Log</span>
            </button>
            <button
              onClick={() => setShowAddTriModal(true)}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-teal-600/30 transition border border-teal-400/30 cursor-pointer"
            >
              <Bike className="w-4 h-4" />
              <span>+ Tricycle Log</span>
            </button>
            <button
              onClick={() => setShowAddWholesaleModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition border border-indigo-400/30 cursor-pointer"
            >
              <Building className="w-4 h-4" />
              <span>+ Wholesale Order</span>
            </button>
            <button
              onClick={() => setShowAddDamagedModal(true)}
              className="px-3 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              <span>+ Damaged Sachet</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Bundles Sold */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold">Total Bundles Sold</span>
            <Package className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {totalBundlesSold.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-400">
            Across Gate, Van, Tricycle & Wholesale
          </p>
        </div>

        {/* Total Revenue */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold">Total Sales Revenue</span>
            <Banknote className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
            SLE {totalRevenueLe.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
            <span>Cash: {Math.round((totalCashRevenue / (totalRevenueLe || 1)) * 100)}%</span>
            <span>• Orange: {Math.round((totalOrangeMoney / (totalRevenueLe || 1)) * 100)}%</span>
          </div>
        </div>

        {/* Fleet Dispatches */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold">Fleet Delivery Sales</span>
            <Truck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
            {totalFleetDispatched.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-400">
            Dispatched via Van & Tricycle Routes
          </p>
        </div>

        {/* Damaged Bundles Log */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold">Damaged Bundles</span>
            <AlertOctagon className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {totalDamagedLogged}
          </div>
          <p className="text-[10px] text-slate-400">
            Gate & Transit Quality Audit Losses
          </p>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60">
          <button
            onClick={() => setActiveSubTab('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'all'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>All Daily Records ({sales.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('gate')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'gate'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Factory Gate Sales ({sales.filter((s) => s.category === 'Factory Sales').length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('van')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'van'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Van Dispatches ({sales.filter((s) => s.category === 'Van Sales').length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('tricycle')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'tricycle'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Tricycle Dispatches ({sales.filter((s) => s.category === 'Tricycle Sales').length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('wholesale')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'wholesale'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Wholesale Orders ({sales.filter((s) => s.category === 'Wholesale Orders').length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('damaged')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'damaged'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Damaged Losses ({sales.filter((s) => s.category === 'Damaged Bundles').length})</span>
          </button>
        </div>

        {/* Export & Actions */}
        <button
          onClick={handleExportCSV}
          className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by receipt #, customer, driver, vehicle reg, notes..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-slate-400 hover:text-slate-600 text-[10px] ml-1"
              >
                Clear
              </button>
            )}
          </div>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All Payment Methods</option>
            <option value="cash">Cash in Hand</option>
            <option value="orange_money">Orange Money</option>
            <option value="bank_transfer">Bank Wire Transfer</option>
            <option value="credit">Credit / Account</option>
          </select>
        </div>
      </div>

      {/* Main Records Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Daily Sales Logs & Dispatch Registry ({filteredRecords.length} entries)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Currency: Sierra Leone Leones (SLE)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-slate-50/50 dark:bg-slate-800/40">
                <th className="py-3 px-3">Receipt / ID</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Customer / Driver / Vehicle</th>
                <th className="py-3 px-3 text-right">Bundles</th>
                <th className="py-3 px-3 text-right">Unit Price</th>
                <th className="py-3 px-3 text-right">Total Amount</th>
                <th className="py-3 px-3 text-center">Payment</th>
                <th className="py-3 px-3">Recorded By</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                    No sales records found matching this filter. Click the buttons above to log a new daily record!
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isDamaged = rec.category === 'Damaged Bundles';
                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition font-sans text-xs"
                    >
                      <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {rec.receiptNumber}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono">{rec.date}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.category === 'Factory Sales'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : rec.category === 'Van Sales'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : rec.category === 'Tricycle Sales'
                              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                              : rec.category === 'Wholesale Orders'
                              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {rec.category === 'Factory Sales' && <Store className="w-3 h-3" />}
                          {rec.category === 'Van Sales' && <Truck className="w-3 h-3" />}
                          {rec.category === 'Tricycle Sales' && <Bike className="w-3 h-3" />}
                          {rec.category === 'Wholesale Orders' && <Building className="w-3 h-3" />}
                          {rec.category === 'Damaged Bundles' && <AlertOctagon className="w-3 h-3" />}
                          {rec.category}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {rec.customerOrDriver || 'Direct Sale'}
                        </div>
                        {rec.vehicleNumber && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Reg: {rec.vehicleNumber}
                          </div>
                        )}
                        {rec.notes && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">
                            {rec.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        {isDamaged ? (
                          <span className="text-rose-500">-{rec.bundleQuantity} Loss</span>
                        ) : (
                          <span>{rec.bundleQuantity.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        {isDamaged ? '—' : `SLE ${rec.unitPriceLe.toLocaleString()}`}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {isDamaged ? (
                          <span className="text-rose-500 text-[10px]">Damaged Loss</span>
                        ) : (
                          `SLE ${rec.totalAmountLe.toLocaleString()}`
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {rec.paymentMethod || 'cash'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-500">
                        <div className="font-semibold text-slate-700 dark:text-slate-300">
                          {rec.recordedByName}
                        </div>
                        <div className="text-[9px] text-slate-400 uppercase">
                          {rec.recordedByRole?.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setSelectedReceipt(rec)}
                          className="px-2 py-1 bg-slate-100 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-emerald-950 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 rounded-lg text-[10px] font-bold transition flex items-center gap-1 mx-auto cursor-pointer"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. Modal: Record Factory Gate Sale */}
      {showAddGateModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-500" />
                Record Factory Gate / Walk-in Sale
              </h3>
              <button onClick={() => setShowAddGateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGateSale} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={gateDate}
                    onChange={(e) => setGateDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
                  <select
                    value={gatePayment}
                    onChange={(e) => setGatePayment(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="cash">Cash in Hand</option>
                    <option value="orange_money">Orange Money</option>
                    <option value="bank_transfer">Bank Wire</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Customer Name / Buyer Details</label>
                <input
                  type="text"
                  value={gateCustomer}
                  onChange={(e) => setGateCustomer(e.target.value)}
                  placeholder="e.g. Hassan Fofanah (Mabanta Road Store)"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bundle Quantity (Sachets)</label>
                  <input
                    type="number"
                    min="1"
                    value={gateBundles}
                    onChange={(e) => setGateBundles(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Unit Price per Bundle (SLE)</label>
                  <input
                    type="number"
                    min="1"
                    value={gateUnitPrice}
                    onChange={(e) => setGateUnitPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-800 dark:text-emerald-300">Total Calculated Revenue:</span>
                <span className="font-mono font-black text-base text-emerald-700 dark:text-emerald-400">
                  SLE {(gateBundles * gateUnitPrice).toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Notes / Special Instructions</label>
                <input
                  type="text"
                  value={gateNotes}
                  onChange={(e) => setGateNotes(e.target.value)}
                  placeholder="e.g. Paid in full at dispatch gate"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddGateModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  Log Gate Sale &rarr;
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Record Van Dispatch & Reconcile */}
      {showAddVanModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-500" />
                Record Van Dispatch & Reconciliation
              </h3>
              <button onClick={() => setShowAddVanModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVanSale} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={vanDate}
                    onChange={(e) => setVanDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Van Reg / Vehicle #</label>
                  <input
                    type="text"
                    value={vanVehicle}
                    onChange={(e) => setVanVehicle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Dispatch Time (Left Factory)</label>
                  <input
                    type="time"
                    value={vanDispatchTime}
                    onChange={(e) => setVanDispatchTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Stock Officer Sign-off</label>
                  <input
                    type="text"
                    placeholder="Name of officer who verified the load-out..."
                    value={vanStockOfficer}
                    onChange={(e) => setVanStockOfficer(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Driver / Sales Representative</label>
                <input
                  type="text"
                  placeholder="Enter Driver / Sales Rep Name..."
                  value={vanDriver}
                  onChange={(e) => setVanDriver(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block font-semibold">Loaded</span>
                  <input
                    type="number"
                    value={vanLoaded}
                    onChange={(e) => setVanLoaded(Number(e.target.value))}
                    className="w-full bg-transparent text-center font-mono font-black text-sm"
                    required
                  />
                </div>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] text-emerald-600 block font-semibold">Sold Bundles</span>
                  <input
                    type="number"
                    value={vanSold}
                    onChange={(e) => setVanSold(Number(e.target.value))}
                    className="w-full bg-transparent text-center font-mono font-black text-sm text-emerald-600 dark:text-emerald-400"
                    required
                  />
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block font-semibold">Unsold (Return)</span>
                  <input
                    type="number"
                    value={vanUnsold}
                    onChange={(e) => setVanUnsold(Number(e.target.value))}
                    className="w-full bg-transparent text-center font-mono font-black text-sm text-amber-500"
                  />
                </div>
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                  <span className="text-[10px] text-rose-600 block font-semibold">Damaged</span>
                  <input
                    type="number"
                    value={vanDamaged}
                    onChange={(e) => setVanDamaged(Number(e.target.value))}
                    className="w-full bg-transparent text-center font-mono font-black text-sm text-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Unit Price per Bundle (SLE)</label>
                  <input
                    type="number"
                    value={vanUnitPrice}
                    onChange={(e) => setVanUnitPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
                  <select
                    value={vanPayment}
                    onChange={(e) => setVanPayment(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="cash">Cash in Hand</option>
                    <option value="orange_money">Orange Money</option>
                    <option value="bank_transfer">Bank Wire</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 flex items-center justify-between text-xs">
                <span className="font-bold text-blue-800 dark:text-blue-300">Expected Sales Revenue:</span>
                <span className="font-mono font-black text-base text-blue-700 dark:text-blue-400">
                  SLE {(vanSold * vanUnitPrice).toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Actual Cash Collected From Driver (SLE)</label>
                <input
                  type="number"
                  min={0}
                  value={vanCashCollected}
                  onChange={(e) => setVanCashCollected(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder={String(vanSold * vanUnitPrice)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">Leave blank if the driver handed in the full expected amount.</p>
              </div>

              {vanCashCollected !== '' && vanCashCollected < vanSold * vanUnitPrice && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 flex items-center justify-between text-xs animate-pulse">
                  <span className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Cash Shortfall Detected:
                  </span>
                  <span className="font-mono font-black text-base text-rose-600 dark:text-rose-400">
                    SLE {(vanSold * vanUnitPrice - vanCashCollected).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVanModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20"
                >
                  Save Van Log &rarr;
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Record Tricycle Dispatch & Reconcile */}
      {showAddTriModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Bike className="w-5 h-5 text-teal-500" />
                Record Tricycle Dispatch & Reconciliation
              </h3>
              <button onClick={() => setShowAddTriModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTriSale} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={triDate}
                    onChange={(e) => setTriDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tricycle Reg / Fleet #</label>
                  <input
                    type="text"
                    value={triVehicle}
                    onChange={(e) => setTriVehicle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Dispatch Time (Left Factory)</label>
                  <input
                    type="time"
                    value={triDispatchTime}
                    onChange={(e) => setTriDispatchTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Stock Officer Sign-off</label>
                  <input
                    type="text"
                    placeholder="Name of officer who verified the load-out..."
                    value={triStockOfficer}
                    onChange={(e) => setTriStockOfficer(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Rider / Delivery Staff Name</label>
                <input
                  type="text"
                  placeholder="Enter Rider / Delivery Staff Name..."
                  value={triDriver}
                  onChange={(e) => setTriDriver(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block font-semibold">Loaded</span>
                  <input
                    type="number"
                    value={triLoaded}
                    onChange={(e) => setTriLoaded(Number(e.target.value))}
                    className="w-full bg-transparent text-center font-mono font-black text-sm"
                    required
                  />
                </div>
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
                  <span className="text-[10px] text-teal-600 block font-semibold">Sold Bundles</span>
                  <input
                    type="number"
                    value={triSold}
                    onChange={(e) => setTriSold(Number(e.target.value))}
                    className="w-full bg-transparent text-center font-mono font-black text-sm text-teal-600 dark:text-teal-400"
                    required
                  />
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block font-semibold">Unsold (Return)</span>
                  <input
                    type="number"
                    value={triUnsold}
                    onChange={(e) => setTriUnsold(Number(e.target.value))}
                    className="w-full bg-transparent text-center font-mono font-black text-sm text-amber-500"
                  />
                </div>
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                  <span className="text-[10px] text-rose-600 block font-semibold">Damaged</span>
                  <input
                    type="number"
                    value={triDamaged}
                    onChange={(e) => setTriDamaged(Number(e.target.value))}
                    className="w-full bg-transparent text-center font-mono font-black text-sm text-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Unit Price per Bundle (SLE)</label>
                  <input
                    type="number"
                    value={triUnitPrice}
                    onChange={(e) => setTriUnitPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
                  <select
                    value={triPayment}
                    onChange={(e) => setTriPayment(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="cash">Cash in Hand</option>
                    <option value="orange_money">Orange Money</option>
                    <option value="bank_transfer">Bank Wire</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800/80 flex items-center justify-between text-xs">
                <span className="font-bold text-teal-800 dark:text-teal-300">Expected Sales Total:</span>
                <span className="font-mono font-black text-base text-teal-700 dark:text-teal-400">
                  SLE {(triSold * triUnitPrice).toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Actual Cash Collected From Driver (SLE)</label>
                <input
                  type="number"
                  min={0}
                  value={triCashCollected}
                  onChange={(e) => setTriCashCollected(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder={String(triSold * triUnitPrice)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">Leave blank if the driver handed in the full expected amount.</p>
              </div>

              {triCashCollected !== '' && triCashCollected < triSold * triUnitPrice && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 flex items-center justify-between text-xs animate-pulse">
                  <span className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Cash Shortfall Detected:
                  </span>
                  <span className="font-mono font-black text-base text-rose-600 dark:text-rose-400">
                    SLE {(triSold * triUnitPrice - triCashCollected).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTriModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-500/20"
                >
                  Save Tricycle Log &rarr;
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: Record Wholesale Bulk Order */}
      {showAddWholesaleModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-500" />
                Record Wholesale / Bulk Client Order
              </h3>
              <button onClick={() => setShowAddWholesaleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWholesale} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={wsDate}
                    onChange={(e) => setWsDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Method / Terms</label>
                  <select
                    value={wsPayment}
                    onChange={(e) => setWsPayment(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="bank_transfer">Bank Wire Transfer</option>
                    <option value="orange_money">Orange Money</option>
                    <option value="cash">Cash on Delivery</option>
                    <option value="credit">Credit (Invoice Net 15)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Client / Supermarket / Depot Name</label>
                <input
                  type="text"
                  value={wsClient}
                  onChange={(e) => setWsClient(e.target.value)}
                  placeholder="e.g. City Supermarket Makeni Branch"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Client Contact Phone</label>
                  <input
                    type="text"
                    value={wsPhone}
                    onChange={(e) => setWsPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Delivery Address</label>
                  <input
                    type="text"
                    value={wsAddress}
                    onChange={(e) => setWsAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Quantity (Bundles)</label>
                  <input
                    type="number"
                    min="1"
                    value={wsBundles}
                    onChange={(e) => setWsBundles(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Agreed Wholesale Price (SLE)</label>
                  <input
                    type="number"
                    min="1"
                    value={wsUnitPrice}
                    onChange={(e) => setWsUnitPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-800 dark:text-indigo-300">Invoice Total:</span>
                <span className="font-mono font-black text-base text-indigo-700 dark:text-indigo-400">
                  SLE {(wsBundles * wsUnitPrice).toLocaleString()}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddWholesaleModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20"
                >
                  Save Wholesale Order &rarr;
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Record Damaged / Quality Loss Bundles */}
      {showAddDamagedModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-rose-500" />
                Record Damaged Sachet Bundles (Sales Quality Audit)
              </h3>
              <button onClick={() => setShowAddDamagedModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDamaged} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={dmgDate}
                    onChange={(e) => setDmgDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Damaged Count (Bundles)</label>
                  <input
                    type="number"
                    min="1"
                    value={dmgCount}
                    onChange={(e) => setDmgCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-rose-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Damage Location / Source</label>
                <select
                  value={dmgSource}
                  onChange={(e) => setDmgSource(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="Factory Gate Dispatch / Loading Defect">Factory Gate Dispatch / Loading Defect</option>
                  <option value="Van Delivery In-Transit Damage">Van Delivery In-Transit Damage</option>
                  <option value="Tricycle Delivery In-Transit Damage">Tricycle Delivery In-Transit Damage</option>
                  <option value="Wholesale Customer Return (Sealing Defect)">Wholesale Customer Return (Sealing Defect)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Defect Cause / Description</label>
                <input
                  type="text"
                  value={dmgReason}
                  onChange={(e) => setDmgReason(e.target.value)}
                  placeholder="e.g. Burst film seam, punctured during stacking"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Additional Notes</label>
                <input
                  type="text"
                  value={dmgNotes}
                  onChange={(e) => setDmgNotes(e.target.value)}
                  placeholder="e.g. Logged for factory quality assurance report"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDamagedModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-500/20"
                >
                  Log Damaged Bundles &rarr;
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Receipt Preview Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-500" />
                <span className="font-black text-sm">Official Sales Receipt</span>
              </div>
              <button onClick={() => setSelectedReceipt(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3 font-mono">
              <div className="text-center border-b border-dashed border-slate-300 dark:border-slate-700 pb-2">
                <div className="font-black text-base text-slate-900 dark:text-white">PURE MAX WATER FACTORY</div>
                <div className="text-[10px] text-slate-500 font-sans">Makeni Operations, Sierra Leone</div>
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  Receipt #{selectedReceipt.receiptNumber}
                </div>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Date:</span>
                  <span className="font-bold">{selectedReceipt.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Category:</span>
                  <span className="font-bold">{selectedReceipt.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer / Rep:</span>
                  <span className="font-bold">{selectedReceipt.customerOrDriver || 'Factory Walk-in'}</span>
                </div>
                {selectedReceipt.vehicleNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vehicle / Fleet:</span>
                    <span className="font-bold">{selectedReceipt.vehicleNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Method:</span>
                  <span className="font-bold uppercase text-emerald-500">{selectedReceipt.paymentMethod || 'cash'}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Bundles Quantity:</span>
                  <span className="font-black">{selectedReceipt.bundleQuantity} Bundles</span>
                </div>
                <div className="flex justify-between">
                  <span>Unit Price:</span>
                  <span>SLE {selectedReceipt.unitPriceLe.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-emerald-600 dark:text-emerald-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Total Amount Paid:</span>
                  <span>SLE {selectedReceipt.totalAmountLe.toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-2 text-[10px] text-slate-400 text-center font-sans">
                Issued by: <strong className="text-slate-700 dark:text-slate-200">{selectedReceipt.recordedByName}</strong> (Sales Production Officer)
                <div className="mt-0.5">Pure Max Quality Purified Sachet Water</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
