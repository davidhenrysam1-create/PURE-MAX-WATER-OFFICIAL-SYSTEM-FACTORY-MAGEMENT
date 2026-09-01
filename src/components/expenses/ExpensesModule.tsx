/**
 * Expenses Module for Pure Max Water Factory
 * Manager-only factory expenditure logging and monthly profit/loss accounting in Sierra Leone Leones (Le).
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ExpenseCategory } from '../../types';
import {
  Banknote,
  Plus,
  RotateCcw,
  Trash2,
  Receipt,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';

export const ExpensesModule: React.FC = () => {
  const {
    expenses,
    addExpenseRecord,
    sales,
    activeRole,
    currentUser,
    resetExpensesRecords,
  } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Packaging & Plastics');
  const [itemDescription, setItemDescription] = useState('');
  const [amountLe, setAmountLe] = useState<number>(1000000);
  const [vendor, setVendor] = useState('');

  const canManageExpenses =
    ['manager', 'second_manager', 'developer', 'ceo', 'accountant'].includes(activeRole) ||
    currentUser?.role === 'developer' ||
    currentUser?.role === 'manager';

  const totalExpensesLe = expenses.reduce((acc, c) => acc + c.amountLe, 0);
  const totalSalesLe = sales.reduce((acc, c) => acc + c.totalAmountLe, 0);
  const netProfitLe = totalSalesLe - totalExpensesLe;

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemDescription) return;

    addExpenseRecord({
      date: new Date().toISOString().split('T')[0],
      category,
      itemDescription,
      amountLe,
      vendor: vendor || 'Local Vendor',
      receiptNumber: `EXP-${Math.floor(100 + Math.random() * 900)}`,
      recordedById: currentUser?.id || 'mgr',
      recordedByName: currentUser?.name || 'Factory Head',
    });

    setShowAddModal(false);
    setItemDescription('');
    setVendor('');
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-white">
      {/* Title & Top Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <Banknote className="w-6 h-6 text-amber-500" />
            Factory Purchases &amp; Operating Expenses Module
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Log raw sachet film rolls, generator diesel fuel, maintenance spares, and utility bills in Sierra Leone Leones (SL Le).
          </p>
        </div>

        {canManageExpenses && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setResetPassword('');
                setShowResetModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition active:scale-95 cursor-pointer"
              title="Reset All Factory Expenditure Records"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Expenses</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Log Factory Expense
            </button>
          </div>
        )}
      </div>

      {/* P&L Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Total Revenue (Gross Sales)</span>
          <div className="text-xl font-extrabold text-blue-400">SL Le {totalSalesLe.toLocaleString()}</div>
          <span className="text-[10px] text-slate-500">From 4 sales categories</span>
        </div>

        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-100 space-y-1">
          <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Total Factory Expenditure</span>
          <div className="text-xl font-extrabold">SL Le {totalExpensesLe.toLocaleString()}</div>
          <span className="text-[10px] text-amber-600/80 dark:text-amber-300">Raw materials, fuel &amp; maintenance</span>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-100 space-y-1">
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Estimated Net Margin</span>
          <div className="text-xl font-extrabold">SL Le {netProfitLe.toLocaleString()}</div>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-300">Net operating balance</span>
        </div>
      </div>

      {/* Expense Logs Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-3">Receipt Ref</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Expense Category</th>
                <th className="py-3 px-3">Item Description</th>
                <th className="py-3 px-3 text-right">Amount (SL Le)</th>
                <th className="py-3 px-3">Vendor</th>
                <th className="py-3 px-3">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500">
                    No factory expenses recorded yet. Click "Log Factory Expense" above to add entries.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono font-bold text-amber-600 dark:text-amber-400">{exp.receiptNumber}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{exp.date}</td>
                    <td className="py-3 px-3 font-semibold">
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">{exp.itemDescription}</td>
                    <td className="py-3 px-3 text-right font-black text-amber-600 dark:text-amber-400 font-mono text-sm">
                      SL Le {exp.amountLe.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-slate-500">{exp.vendor || '--'}</td>
                    <td className="py-3 px-3 text-slate-500">{exp.recordedByName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-900 dark:text-white space-y-4 text-xs">
            <h3 className="text-base font-extrabold flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <Banknote className="w-5 h-5 text-amber-500" />
              Log Factory Expense Purchase
            </h3>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Expense Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                >
                  <option value="Packaging & Plastics">Packaging &amp; Plastics (Sachet Film)</option>
                  <option value="Logistics & Fuel">Logistics &amp; Fuel (Diesel Generator/Vans)</option>
                  <option value="Maintenance & Spare Parts">Maintenance &amp; Spare Parts</option>
                  <option value="Utilities & Electricity">Utilities &amp; Electricity</option>
                  <option value="Raw Materials">Raw Materials &amp; Treatment Chemicals</option>
                  <option value="Salaries & Wages">Salaries &amp; Wages</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Item Description</label>
                <input
                  type="text"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="e.g. 5 Rolls Pure Max sachet film packaging"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Expense Amount (SL Le)</label>
                <input
                  type="number"
                  step="10000"
                  value={amountLe}
                  onChange={(e) => setAmountLe(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-extrabold font-mono text-sm text-amber-600"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Vendor / Supplier Name</label>
                <input
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="e.g. Sierra Poly Packaging Ltd"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 font-bold text-white rounded-xl shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  Save Expense Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET EXPENSES CONFIRMATION MODAL */}
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
                    Reset Factory Expenditure Records?
                  </h3>
                  <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80">
                    Enter your account password to confirm
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium">
                This will wipe <strong>all factory expense records</strong>:
                <ul className="list-disc pl-4 mt-1.5 space-y-0.5">
                  <li>{expenses.length} factory expense log(s)</li>
                  <li>Total cleared: <strong>SL Le {totalExpensesLe.toLocaleString()}</strong></li>
                </ul>
                <div className="mt-2">
                  <strong>Total Factory Expenditure</strong> will return to <strong>SL Le 0</strong>.
                  A backup Excel workbook will be automatically downloaded before deletion.
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const success = resetExpensesRecords(resetPassword);
                      if (success) {
                        setShowResetModal(false);
                        setResetPassword('');
                      }
                    }
                  }}
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
                  const success = resetExpensesRecords(resetPassword);
                  if (success) {
                    setShowResetModal(false);
                    setResetPassword('');
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition cursor-pointer shadow-lg shadow-rose-600/25"
              >
                Reset Factory Expenses
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
