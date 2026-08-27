/**
 * Sales Module for Pure Max Factory Management System
 * Supports Factory Sales, Van Sales, Tricycle Sales, and Damaged Bundles tracking in Le.
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SalesCategory, SalesRecord } from '../../types';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  Banknote,
  Truck,
  Bike,
  Building,
  AlertOctagon,
  Calendar,
  CheckCircle2,
  BarChart3,
  CreditCard,
  Package,
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

export const SalesModule: React.FC = () => {
  const { sales, expenses, addSalesRecord, activeRole, currentUser, exportExcelBackup } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [timeframe, setTimeframe] = useState<'daily' | 'monthly' | 'yearly'>('daily');

  // Form State
  const [category, setCategory] = useState<SalesCategory>('Factory Sales');
  const [bundleQuantity, setBundleQuantity] = useState<number>(100);
  const [unitPriceLe, setUnitPriceLe] = useState<number>(12000);
  const [unsoldBundles, setUnsoldBundles] = useState<number>(0);
  const [damagedLosses, setDamagedLosses] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'orange_money' | 'bank_transfer'>('cash');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [customerOrDriver, setCustomerOrDriver] = useState('');
  const [notes, setNotes] = useState('');

  const canRecordSales = ['sales_manager', 'manager', 'second_manager', 'developer'].includes(activeRole);
  const canViewCharts = ['developer', 'ceo', 'manager', 'second_manager', 'sales_manager'].includes(activeRole);

  const filteredSales = sales.filter((s) => {
    const matchesSearch =
      s.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.customerOrDriver?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.recordedByName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || s.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const categoryTotals = {
    factory: sales.filter((s) => s.category === 'Factory Sales').reduce((acc, c) => acc + c.totalAmountLe, 0),
    van: sales.filter((s) => s.category === 'Van Sales').reduce((acc, c) => acc + c.totalAmountLe, 0),
    tricycle: sales.filter((s) => s.category === 'Tricycle Sales').reduce((acc, c) => acc + c.totalAmountLe, 0),
    damaged: sales.filter((s) => s.category === 'Damaged Bundles').reduce((acc, c) => acc + c.bundleQuantity, 0),
  };

  const totalRevenueAllTime = sales.reduce((acc, s) => acc + s.totalAmountLe, 0);
  const totalExpensesAllTime = expenses.reduce((acc, e) => acc + e.amountLe, 0);
  const netProfitAllTime = totalRevenueAllTime - totalExpensesAllTime;

  // Real-time Sales & Profit/Loss Chart aggregation
  const getAggregatedSalesData = () => {
    if (timeframe === 'daily') {
      // Last 8 entries or daily dates
      return [...sales].slice(-8).map((s) => {
        const dayExpenses = expenses.filter((e) => e.date === s.date).reduce((acc, e) => acc + e.amountLe, 0);
        return {
          label: s.date.slice(5),
          fullDate: s.date,
          RevenueLe: s.totalAmountLe,
          ExpensesLe: dayExpenses,
          NetProfitLe: s.totalAmountLe - dayExpenses,
          BundlesSold: s.bundleQuantity,
          LossUnits: s.damagedLosses || (s.category === 'Damaged Bundles' ? s.bundleQuantity : 0),
        };
      });
    } else if (timeframe === 'monthly') {
      const monthlyMap: Record<string, { revenue: number; expenses: number; sold: number; losses: number }> = {};
      sales.forEach((s) => {
        const mKey = s.date.slice(0, 7);
        if (!monthlyMap[mKey]) monthlyMap[mKey] = { revenue: 0, expenses: 0, sold: 0, losses: 0 };
        monthlyMap[mKey].revenue += s.totalAmountLe;
        monthlyMap[mKey].sold += s.bundleQuantity;
        monthlyMap[mKey].losses += s.damagedLosses || (s.category === 'Damaged Bundles' ? s.bundleQuantity : 0);
      });
      expenses.forEach((e) => {
        const mKey = e.date.slice(0, 7);
        if (!monthlyMap[mKey]) monthlyMap[mKey] = { revenue: 0, expenses: 0, sold: 0, losses: 0 };
        monthlyMap[mKey].expenses += e.amountLe;
      });
      return Object.entries(monthlyMap).map(([month, data]) => ({
        label: month,
        fullDate: month,
        RevenueLe: data.revenue,
        ExpensesLe: data.expenses,
        NetProfitLe: data.revenue - data.expenses,
        BundlesSold: data.sold,
        LossUnits: data.losses,
      }));
    } else {
      const yearlyMap: Record<string, { revenue: number; expenses: number; sold: number; losses: number }> = {};
      sales.forEach((s) => {
        const yKey = s.date.slice(0, 4);
        if (!yearlyMap[yKey]) yearlyMap[yKey] = { revenue: 0, expenses: 0, sold: 0, losses: 0 };
        yearlyMap[yKey].revenue += s.totalAmountLe;
        yearlyMap[yKey].sold += s.bundleQuantity;
        yearlyMap[yKey].losses += s.damagedLosses || (s.category === 'Damaged Bundles' ? s.bundleQuantity : 0);
      });
      expenses.forEach((e) => {
        const yKey = e.date.slice(0, 4);
        if (!yearlyMap[yKey]) yearlyMap[yKey] = { revenue: 0, expenses: 0, sold: 0, losses: 0 };
        yearlyMap[yKey].expenses += e.amountLe;
      });
      return Object.entries(yearlyMap).map(([year, data]) => ({
        label: year,
        fullDate: year,
        RevenueLe: data.revenue,
        ExpensesLe: data.expenses,
        NetProfitLe: data.revenue - data.expenses,
        BundlesSold: data.sold,
        LossUnits: data.losses,
      }));
    }
  };

  const chartData = getAggregatedSalesData();

  const handleSubmitSales = (e: React.FormEvent) => {
    e.preventDefault();
    const calculatedTotal = category === 'Damaged Bundles' ? 0 : bundleQuantity * unitPriceLe;

    addSalesRecord({
      date: new Date().toISOString().split('T')[0],
      category,
      bundleQuantity,
      unitPriceLe: category === 'Damaged Bundles' ? 0 : unitPriceLe,
      totalAmountLe: calculatedTotal,
      unsoldBundles,
      damagedLosses,
      paymentMethod,
      vehicleNumber: vehicleNumber || undefined,
      recordedById: currentUser?.id || 'sys',
      recordedByName: currentUser?.name || 'Sales Production Officer',
      recordedByRole: activeRole,
      customerOrDriver: customerOrDriver || 'Standard Route Distribution',
      notes,
    });

    setShowAddModal(false);
    setNotes('');
    setCustomerOrDriver('');
    setUnsoldBundles(0);
    setDamagedLosses(0);
    setVehicleNumber('');
  };

  const exportCSV = () => {
    const headers = 'ID,Date,Category,Bundles,UnitPriceLe,TotalAmountLe,RecordedBy,CustomerDriver,ReceiptNo,PaymentMethod\n';
    const rows = filteredSales
      .map(
        (s) =>
          `"${s.id}","${s.date}","${s.category}",${s.bundleQuantity},${s.unitPriceLe},${s.totalAmountLe},"${s.recordedByName}","${s.customerOrDriver || ''}","${s.receiptNumber}","${s.paymentMethod || 'cash'}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `puremax_sales_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-white">
      {/* Page Title & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-500" />
            Pure Max Sales & Distribution Module
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track daily water sales across 4 categories: Factory Depot, Delivery Vans, Distribution Tricycles, and Damaged Bundles in Sierra Leone Leones (SL Le).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportExcelBackup()}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="Download full system Excel spreadsheet backup"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Excel Master (.xlsx)
          </button>

          <button
            onClick={exportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export CSV
          </button>

          {canRecordSales && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Record Sales Entry
            </button>
          )}
        </div>
      </div>

      {/* 4 Categories Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-blue-900/80 text-blue-900 dark:text-blue-100 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
            <span className="flex items-center gap-1.5">
              <Building className="w-4 h-4" />
              Factory Depot Sales
            </span>
            <span>SL Leones</span>
          </div>
          <div className="text-xl font-black">SL Le {categoryTotals.factory.toLocaleString()}</div>
          <span className="text-[10px] text-blue-600/80 dark:text-blue-300">Direct wholesale walk-ins</span>
        </div>

        <div className="p-4 rounded-xl bg-cyan-50 dark:bg-slate-900 border border-cyan-200 dark:border-cyan-900/80 text-cyan-900 dark:text-cyan-100 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-cyan-600 dark:text-cyan-400">
            <span className="flex items-center gap-1.5">
              <Truck className="w-4 h-4" />
              Van Route Sales
            </span>
            <span>SL Leones</span>
          </div>
          <div className="text-xl font-black">SL Le {categoryTotals.van.toLocaleString()}</div>
          <span className="text-[10px] text-cyan-600/80 dark:text-cyan-300">Heavy delivery truck distribution</span>
        </div>

        <div className="p-4 rounded-xl bg-amber-50 dark:bg-slate-900 border border-amber-200 dark:border-amber-900/80 text-amber-900 dark:text-amber-100 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
            <span className="flex items-center gap-1.5">
              <Bike className="w-4 h-4" />
              Tricycle Sales
            </span>
            <span>SL Leones</span>
          </div>
          <div className="text-xl font-black">SL Le {categoryTotals.tricycle.toLocaleString()}</div>
          <span className="text-[10px] text-amber-600/80 dark:text-amber-300">Neighborhood mini-mart supply</span>
        </div>

        <div className="p-4 rounded-xl bg-rose-50 dark:bg-slate-900 border border-rose-200 dark:border-rose-900/80 text-rose-900 dark:text-rose-100 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-600 dark:text-rose-400">
            <span className="flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4" />
              Damaged Bundles
            </span>
            <span>Total Units</span>
          </div>
          <div className="text-xl font-black">{categoryTotals.damaged} Bundles</div>
          <span className="text-[10px] text-rose-600/80 dark:text-rose-300">Leaked or unsealed film bundles</span>
        </div>
      </div>

      {/* Real-time Sales Revenue & Profit/Loss Bar Charts (Authorized Roles) */}
      {canViewCharts && (
        <div className="space-y-4">
          {/* Executive Revenue & Profit Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/80 text-emerald-900 dark:text-emerald-100 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <Banknote className="w-4 h-4" />
                  Total Gross Revenue
                </span>
                <span className="text-[10px] uppercase font-mono">Real-Time</span>
              </div>
              <div className="text-xl font-black">SL Le {totalRevenueAllTime.toLocaleString()}</div>
              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-300">All depot & route collections</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" />
                  Operating Expenses
                </span>
                <span className="text-[10px] uppercase font-mono">Factory Costs</span>
              </div>
              <div className="text-xl font-black">SL Le {totalExpensesAllTime.toLocaleString()}</div>
              <span className="text-[10px] text-slate-500">Fuel, maintenance & logistics</span>
            </div>

            <div className={`p-4 rounded-xl border space-y-1 shadow-xs ${
              netProfitAllTime >= 0
                ? 'bg-blue-50 dark:bg-slate-900 border-blue-200 dark:border-blue-900/80 text-blue-900 dark:text-blue-100'
                : 'bg-rose-50 dark:bg-slate-900 border-rose-200 dark:border-rose-900/80 text-rose-900 dark:text-rose-100'
            }`}>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className={`flex items-center gap-1.5 ${netProfitAllTime >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  <BarChart3 className="w-4 h-4" />
                  Net Operating Profit / Loss
                </span>
                <span className="text-[10px] uppercase font-mono">Net Margin</span>
              </div>
              <div className="text-xl font-black">
                {netProfitAllTime >= 0 ? '+' : ''}SL Le {netProfitAllTime.toLocaleString()}
              </div>
              <span className={`text-[10px] ${netProfitAllTime >= 0 ? 'text-blue-600/80 dark:text-blue-300' : 'text-rose-600/80 dark:text-rose-300'}`}>
                {totalRevenueAllTime > 0 ? `${((netProfitAllTime / totalRevenueAllTime) * 100).toFixed(1)}% profit margin` : '0% margin'}
              </span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  Sales & Profit/Loss Real-Time Analytics
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Visual breakdown of Gross Revenue, Operating Expenses, and Net Profit in Sierra Leone Leones.
                </p>
              </div>

              {/* Daily / Monthly / Yearly Filter */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setTimeframe('daily')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    timeframe === 'daily'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setTimeframe('monthly')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    timeframe === 'monthly'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setTimeframe('yearly')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    timeframe === 'yearly'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Yearly
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              {/* Chart 1: Financials (Revenue vs Expenses vs Profit) */}
              <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Revenue & Net Profit (SL Le)</span>
                  <span className="text-[10px] text-slate-400 font-mono">Financial Trends</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
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
                        formatter={(value: any, name: any) => [`SL Le ${Number(value).toLocaleString()}`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="RevenueLe" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Gross Revenue" />
                      <Bar dataKey="ExpensesLe" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Expenses" />
                      <Bar dataKey="NetProfitLe" fill="#10b981" radius={[6, 6, 0, 0]} name="Net Profit" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Bundles Distribution vs Loss Units */}
              <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Bundles Distributed vs Damage Losses</span>
                  <span className="text-[10px] text-slate-400 font-mono">Volume Units</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
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
                        formatter={(value: any, name: any) => [`${Number(value).toLocaleString()} Bundles`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="BundlesSold" fill="#0ea5e9" radius={[6, 6, 0, 0]} name="Sold / Dispatched" />
                      <Bar dataKey="LossUnits" fill="#ef4444" radius={[6, 6, 0, 0]} name="Damaged Losses" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search receipt #, driver name, or recorder..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
          >
            <option value="all">All Categories</option>
            <option value="Factory Sales">Factory Sales</option>
            <option value="Van Sales">Van Sales</option>
            <option value="Tricycle Sales">Tricycle Sales</option>
            <option value="Damaged Bundles">Damaged Bundles</option>
          </select>
        </div>
      </div>

      {/* Sales Transactions Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-3">Receipt Ref</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Sold</th>
                <th className="py-3 px-3 text-right">Unsold</th>
                <th className="py-3 px-3 text-right">Unit Price (SL Le)</th>
                <th className="py-3 px-3 text-right">Total Amount (SL Le)</th>
                <th className="py-3 px-3">Driver / Customer</th>
                <th className="py-3 px-3">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">{s.receiptNumber}</td>
                  <td className="py-3 px-3 text-slate-500 font-mono">{s.date}</td>
                  <td className="py-3 px-3 font-medium">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        s.category === 'Factory Sales'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : s.category === 'Van Sales'
                          ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                          : s.category === 'Tricycle Sales'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {s.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-extrabold text-slate-900 dark:text-white">
                    {s.bundleQuantity}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-500">
                    {s.unsoldBundles != null ? s.unsoldBundles : '--'}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500 font-mono">
                    {s.unitPriceLe ? `SL Le ${s.unitPriceLe.toLocaleString()}` : '-'}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-blue-600 dark:text-blue-400 font-mono">
                    SL Le {s.totalAmountLe.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                    <div className="font-semibold">{s.customerOrDriver || 'Depot'}</div>
                    {s.vehicleNumber && <div className="text-[10px] font-mono text-slate-400">{s.vehicleNumber}</div>}
                  </td>
                  <td className="py-3 px-3 text-slate-500">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{s.recordedByName}</div>
                    <div className="text-[10px] capitalize text-slate-400">
                      {s.recordedByRole === 'sales_manager' ? 'Sales Production Officer' : s.recordedByRole.replace('_', ' ')}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Sales Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-white space-y-4 text-xs">
            <h3 className="text-base font-extrabold flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <ShoppingCart className="w-5 h-5 text-blue-500" />
              Record New Water Sales Entry
            </h3>

            <form onSubmit={handleSubmitSales} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Sales Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SalesCategory)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                >
                  <option value="Factory Sales">Factory Sales (Depot)</option>
                  <option value="Van Sales">Van Sales (Truck Route)</option>
                  <option value="Tricycle Sales">Tricycle Sales (Kekeh / Neighborhood)</option>
                  <option value="Damaged Bundles">Damaged Bundles (QA Reject)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Bundle Quantity Sold</label>
                  <input
                    type="number"
                    min="1"
                    value={bundleQuantity}
                    onChange={(e) => setBundleQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Unit Price per Bundle (SL Le)</label>
                  <input
                    type="number"
                    disabled={category === 'Damaged Bundles'}
                    value={category === 'Damaged Bundles' ? 0 : unitPriceLe}
                    onChange={(e) => setUnitPriceLe(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-sm disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Unsold Bundles (Returned)</label>
                  <input
                    type="number"
                    min="0"
                    value={unsoldBundles}
                    onChange={(e) => setUnsoldBundles(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-xs"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Damaged Loss Bundles</label>
                  <input
                    type="number"
                    min="0"
                    value={damagedLosses}
                    onChange={(e) => setDamagedLosses(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-xs text-rose-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-xs"
                  >
                    <option value="cash">Cash in Hand</option>
                    <option value="orange_money">Orange Money / Afrimoney</option>
                    <option value="bank_transfer">Bank Wire / Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Vehicle / Route No (Optional)</label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="e.g. TR-01 or VAN-02"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                  />
                </div>
              </div>

              {category !== 'Damaged Bundles' && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between font-bold">
                  <span className="text-blue-700 dark:text-blue-300">Total Calculation:</span>
                  <span className="text-base font-mono text-blue-600 dark:text-blue-400">
                    SL Le {(bundleQuantity * unitPriceLe).toLocaleString()}
                  </span>
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1">Customer / Driver Reference</label>
                <input
                  type="text"
                  value={customerOrDriver}
                  onChange={(e) => setCustomerOrDriver(e.target.value)}
                  placeholder="e.g. Van Driver Alpha / Wholesale Depot customer"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Notes / Remarks</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional sales remarks..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 font-bold text-white rounded-xl shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Save Sales Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
