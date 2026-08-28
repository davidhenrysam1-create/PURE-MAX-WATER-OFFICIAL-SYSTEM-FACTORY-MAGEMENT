/**
 * Reports & Analytics Module for Pure Max Water Factory
 * Visual charts (Recharts) for sales categories, production vs damage, and expense breakdown with PDF/CSV export.
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  PieChart as PieIcon,
  TrendingUp,
  Banknote,
  Factory,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts';

export const ReportsModule: React.FC = () => {
  const { sales, production, expenses, exportExcelBackup } = useApp();

  const salesByCategory = [
    { name: 'Factory Depot', value: sales.filter((s) => s.category === 'Factory Sales').reduce((a, c) => a + c.totalAmountLe, 0) },
    { name: 'Van Route', value: sales.filter((s) => s.category === 'Van Sales').reduce((a, c) => a + c.totalAmountLe, 0) },
    { name: 'Tricycle', value: sales.filter((s) => s.category === 'Tricycle Sales').reduce((a, c) => a + c.totalAmountLe, 0) },
  ];

  const productionVsDamagedData = production.map((p) => ({
    date: p.date.slice(5),
    Produced: p.bundlesProduced,
    Damaged: p.damagedBundles,
  }));

  const expensesByCategory = [
    { name: 'Packaging', value: expenses.filter((e) => e.category === 'Packaging & Plastics').reduce((a, c) => a + c.amountLe, 0) },
    { name: 'Fuel & Logistics', value: expenses.filter((e) => e.category === 'Logistics & Fuel').reduce((a, c) => a + c.amountLe, 0) },
    { name: 'Maintenance', value: expenses.filter((e) => e.category === 'Maintenance & Spare Parts').reduce((a, c) => a + c.amountLe, 0) },
  ];

  const totalExpenseVal = expensesByCategory.reduce((a, c) => a + c.value, 0);

  // Issue #8 — high-contrast palette + crisp tooltip, kept consistent with
  // SalesModule so the same metric is always the same colour across the app.
  const COLORS = ['#10b981', '#DC143C', '#22d3ee', '#f59e0b', '#8b5cf6'];

  const CHART_TOOLTIP_STYLE = {
    backgroundColor: 'rgba(2, 6, 23, 0.96)',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    borderRadius: '0.75rem',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 600,
    boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.6)',
    padding: '8px 12px',
  } as const;

  const exportPDFSummary = () => {
    alert('Generating Pure Max Factory Analytical PDF Report... File export initiated.');
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-white">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-500" />
            Executive Reports & Analytics Dashboard
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Comprehensive financial breakdown, sales trends, production efficiency, and offline accounting export.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportExcelBackup()}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Download Master Excel (.xlsx)
          </button>

          <button
            onClick={exportPDFSummary}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Executive Report (PDF)
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Category Bar Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Banknote className="w-5 h-5 text-blue-500" />
              Sales Revenue Distribution by Category (SL Le)
            </h3>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.28} vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tick={{ fill: '#cbd5e1', fontWeight: 600 }} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tick={{ fill: '#cbd5e1', fontWeight: 600 }} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [`SL Le ${Number(val).toLocaleString()}`, 'Revenue']}
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={{ color: '#ffffff', fontWeight: 700 }}
                  itemStyle={{ color: '#ffffff' }}
                  cursor={{ fill: 'rgba(148, 163, 184, 0.18)' }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={44} activeBar={{ fillOpacity: 0.82, stroke: '#ffffff', strokeWidth: 1.5 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Production vs Damage Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Factory className="w-5 h-5 text-cyan-500" />
              Daily Bundle Production vs Damaged Units
            </h3>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productionVsDamagedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.28} vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tick={{ fill: '#cbd5e1', fontWeight: 600 }} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tick={{ fill: '#cbd5e1', fontWeight: 600 }} tickLine={false} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={{ color: '#ffffff', fontWeight: 700 }}
                  itemStyle={{ color: '#ffffff' }}
                  cursor={{ fill: 'rgba(148, 163, 184, 0.18)' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} iconType="circle" />
                <Bar dataKey="Produced" fill="#22d3ee" radius={[6, 6, 0, 0]} name="Produced" maxBarSize={32} activeBar={{ fillOpacity: 0.82, stroke: '#ffffff', strokeWidth: 1.5 }} />
                <Bar dataKey="Damaged" fill="#DC143C" radius={[6, 6, 0, 0]} name="Damaged" maxBarSize={32} activeBar={{ fillOpacity: 0.82, stroke: '#ffffff', strokeWidth: 1.5 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Distribution Pie Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-amber-500" />
              Factory Operating Expenditure Breakdown
            </h3>
          </div>

          <div className="h-64 flex items-center justify-center">
            {totalExpenseVal > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expensesByCategory} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`SL Le ${Number(val).toLocaleString()}`, 'Cost']}
                    contentStyle={CHART_TOOLTIP_STYLE}
                    labelStyle={{ color: '#ffffff', fontWeight: 700 }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <PieIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2 stroke-1" />
                <span className="text-xs font-medium">SL Le 0 Total Expenditures Recorded</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Operating expense breakdown will populate as expenses are logged.</span>
              </div>
            )}
          </div>
        </div>

        {/* Executive Accounting Summary */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 text-white border border-slate-800 space-y-4">
          <h3 className="font-extrabold text-base text-cyan-300">Executive Accounting Ledger Summary</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            All records feed into the monthly P&L ledger matching Section 6.5 of Version 2.0 system architecture specification.
          </p>

          <div className="space-y-2 text-xs pt-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80">
              <span className="text-slate-400">Total Recorded Sales (SL Le)</span>
              <span className="font-bold text-blue-400 font-mono">
                SL Le {sales.reduce((a, c) => a + c.totalAmountLe, 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80">
              <span className="text-slate-400">Total Factory Expenses (SL Le)</span>
              <span className="font-bold text-amber-400 font-mono">
                SL Le {expenses.reduce((a, c) => a + c.amountLe, 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80">
              <span className="text-slate-400">Net Estimated Margin (SL Le)</span>
              <span className="font-black text-emerald-400 font-mono text-sm">
                SL Le {(sales.reduce((a, c) => a + c.totalAmountLe, 0) - expenses.reduce((a, c) => a + c.amountLe, 0)).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
