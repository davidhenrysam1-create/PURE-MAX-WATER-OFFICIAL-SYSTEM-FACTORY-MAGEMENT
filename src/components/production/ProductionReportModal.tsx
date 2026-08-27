import React, { useRef } from 'react';
import {
  Printer,
  X,
  Droplets,
  Calendar,
  Layers,
  Scale,
  AlertTriangle,
  Award,
  CheckCircle,
  FileText,
  Boxes,
  Activity,
} from 'lucide-react';
import { ProductionRecord, OuterBuyingRecord, RollBuyingRecord, MachineStatus, User } from '../../types';

interface ProductionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  production: ProductionRecord[];
  outerBuyings: OuterBuyingRecord[];
  rollBuyings: RollBuyingRecord[];
  machines: MachineStatus[];
  currentUser: User | null;
  factoryName?: string;
}

export const ProductionReportModal: React.FC<ProductionReportModalProps> = ({
  isOpen,
  onClose,
  production,
  outerBuyings,
  rollBuyings,
  machines,
  currentUser,
  factoryName = 'Pure Max Purified Mineral Water Factory',
}) => {
  const [filterPeriod, setFilterPeriod] = React.useState<'today' | 'week' | 'month' | 'all'>('month');

  if (!isOpen) return null;

  // Filter records based on selected timeframe
  const filteredProduction = production.filter((p) => {
    if (filterPeriod === 'all') return true;
    const recordDate = new Date(p.date);
    const now = new Date();
    if (filterPeriod === 'today') {
      return p.date === now.toISOString().split('T')[0];
    }
    if (filterPeriod === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return recordDate >= oneWeekAgo;
    }
    if (filterPeriod === 'month') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return recordDate >= oneMonthAgo;
    }
    return true;
  });

  // Calculate aggregates
  const totalSetsUsed = filteredProduction.reduce((sum, p) => sum + (p.outerSetsUsed ?? p.outerFilmCount ?? 0), 0);
  const totalRemainingLeftover = filteredProduction.reduce((sum, p) => sum + (p.outerRemainingBundles || 0), 0);
  const totalBundlesProduced = filteredProduction.reduce((sum, p) => sum + p.bundlesProduced, 0);
  const totalDamagedBundles = filteredProduction.reduce((sum, p) => sum + p.damagedBundles, 0);
  const totalCleanWaterLitres = totalBundlesProduced * 12; // 1 bundle = 12 Litres (20 sachets of 500ml)
  const damageRate = totalBundlesProduced > 0 ? ((totalDamagedBundles / totalBundlesProduced) * 100).toFixed(2) : '0.00';
  const totalRollKgUsed = filteredProduction.reduce((sum, p) => sum + (p.packagingRollWeightKg || 0), 0);

  // Overall Inventory Stock stats
  const totalOuterSetsBought = outerBuyings.reduce((sum, o) => sum + (Number(o.outersCount) || 0), 0);
  const totalOuterSetsConsumedAllTime = production.reduce((sum, p) => sum + (p.outerSetsUsed ?? p.outerFilmCount ?? 0), 0);
  const outerSetsInStock = Math.max(0, totalOuterSetsBought - totalOuterSetsConsumedAllTime);

  const totalRollKgBought = rollBuyings.reduce((sum, r) => sum + ((Number(r.rollWeightKg) || 0) * (Number(r.rollsCount) || 1)), 0);
  const totalRollKgConsumedAllTime = production.reduce((sum, p) => sum + (p.packagingRollWeightKg || 0), 0);
  const rollKgInStock = Math.max(0, totalRollKgBought - totalRollKgConsumedAllTime);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900/90 border border-white/15 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh] backdrop-blur-xl">
        {/* Modal Controls Header (Hidden during actual print) */}
        <div className="p-4 bg-slate-950/80 border-b border-white/10 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Factory Production & Material Audit Report</h3>
              <p className="text-xs text-slate-400">Standard Yield: 1 Set Outer Film = 50 Bundles of Water</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Period selector */}
            <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-white/10 text-xs">
              {(['today', 'week', 'month', 'all'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setFilterPeriod(p)}
                  className={`px-2.5 py-1 rounded-lg capitalize font-medium transition-all cursor-pointer ${
                    filterPeriod === p ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p === 'all' ? 'All Time' : p}
                </button>
              ))}
            </div>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Official Report
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div id="printable-production-report" className="p-8 overflow-y-auto bg-slate-900 text-slate-100 print:p-0 print:bg-white print:text-black space-y-6">
          {/* Official Factory Header */}
          <div className="border-b-2 border-slate-700 print:border-black pb-4 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-white print:text-black">
                  PURE MAX WATER FACTORY OS
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-400 print:border print:border-black print:text-black rounded">
                  OFFICIAL AUDIT
                </span>
              </div>
              <p className="text-xs text-slate-400 print:text-gray-700 mt-1">
                Purified Mineral Water Production & Raw Material Consumption Report
              </p>
              <p className="text-[11px] text-slate-400 print:text-gray-600">
                Conversion Standard: <strong className="text-cyan-300 print:text-black">1 Set Outer Film = 50 Bundles of Water</strong> | Formula: <code className="text-amber-300 print:text-black">(Sets × 50) - Remaining Leftover</code>
              </p>
            </div>

            <div className="text-right text-xs space-y-0.5">
              <p className="text-slate-400 print:text-gray-600">
                Generated By: <strong className="text-white print:text-black">{currentUser?.name || 'Production Engineer'}</strong>
              </p>
              <p className="text-slate-400 print:text-gray-600">
                Date: <strong className="text-white print:text-black">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
              </p>
              <p className="text-slate-400 print:text-gray-600">
                Filter Scope: <strong className="text-cyan-400 print:text-black uppercase">{filterPeriod}</strong> ({filteredProduction.length} batches)
              </p>
            </div>
          </div>

          {/* Key Executive Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:grid-cols-4">
            <div className="p-3.5 bg-slate-800/80 print:bg-gray-100 border border-slate-700 print:border-gray-300 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-600 block">
                Total Output Produced
              </span>
              <p className="text-2xl font-black text-cyan-400 print:text-black mt-1">
                {totalBundlesProduced.toLocaleString()} <span className="text-xs font-normal text-slate-400 print:text-gray-600">Bundles</span>
              </p>
              <span className="text-[10px] text-slate-400 print:text-gray-600 mt-0.5 block">
                {totalCleanWaterLitres.toLocaleString()} Litres Clean Water
              </span>
            </div>

            <div className="p-3.5 bg-slate-800/80 print:bg-gray-100 border border-slate-700 print:border-gray-300 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-600 block">
                Outer Film Sets Used
              </span>
              <p className="text-2xl font-black text-indigo-400 print:text-black mt-1">
                {totalSetsUsed.toLocaleString()} <span className="text-xs font-normal text-slate-400 print:text-gray-600">Sets</span>
              </p>
              <span className="text-[10px] text-slate-400 print:text-gray-600 mt-0.5 block">
                {totalRemainingLeftover} Bundles Leftover Subtracted
              </span>
            </div>

            <div className="p-3.5 bg-slate-800/80 print:bg-gray-100 border border-slate-700 print:border-gray-300 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-600 block">
                Packaging Roll Consumed
              </span>
              <p className="text-2xl font-black text-blue-400 print:text-black mt-1">
                {totalRollKgUsed.toFixed(1)} <span className="text-xs font-normal text-slate-400 print:text-gray-600">KG</span>
              </p>
              <span className="text-[10px] text-slate-400 print:text-gray-600 mt-0.5 block">
                Loaded into Sachet Machines
              </span>
            </div>

            <div className="p-3.5 bg-slate-800/80 print:bg-gray-100 border border-slate-700 print:border-gray-300 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-600 block">
                Damaged / Defect Bundles
              </span>
              <p className="text-2xl font-black text-rose-400 print:text-black mt-1">
                {totalDamagedBundles.toLocaleString()} <span className="text-xs font-normal text-slate-400 print:text-gray-600">Bundles</span>
              </p>
              <span className="text-[10px] text-rose-400 print:text-gray-700 mt-0.5 block">
                Damage Rate: {damageRate}%
              </span>
            </div>
          </div>

          {/* Active Machine Lines & Roll Status */}
          <div>
            <h4 className="text-xs font-bold text-white print:text-black uppercase tracking-wider mb-2 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-cyan-400 print:text-black" />
              Machine Production Lines & Active Roll Status
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 print:grid-cols-4">
              {machines.map((m) => (
                <div
                  key={m.id}
                  className="p-2.5 bg-slate-800/60 print:bg-gray-50 border border-slate-700/80 print:border-gray-300 rounded-lg text-xs"
                >
                  <div className="flex items-center justify-between font-bold text-white print:text-black">
                    <span>{m.code || m.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                        m.status === 'running'
                          ? 'bg-emerald-500/20 text-emerald-400 print:text-emerald-800'
                          : m.status === 'idle'
                          ? 'bg-amber-500/20 text-amber-400 print:text-amber-800'
                          : 'bg-rose-500/20 text-rose-400 print:text-rose-800'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 print:text-gray-600 mt-1">
                    Operator: <strong className="text-slate-200 print:text-black">{m.assignedOperatorName || 'Unassigned'}</strong>
                  </p>
                  <p className="text-[11px] text-slate-400 print:text-gray-600">
                    Active Roll ID: <strong className="text-cyan-400 print:text-black">{m.activeRollKg ? `${m.activeRollKg} KG` : 'Empty'}</strong>
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Raw Material Stock Balances */}
          <div className="p-3 bg-slate-800/40 print:bg-gray-100 border border-slate-700/80 print:border-gray-300 rounded-xl">
            <h4 className="text-xs font-bold text-white print:text-black uppercase tracking-wider mb-2 flex items-center gap-2">
              <Boxes className="w-3.5 h-3.5 text-indigo-400 print:text-black" />
              Raw Material Stock & Inventory Balance Audit
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 print:text-gray-600 block text-[10px]">Outer Sets Purchased:</span>
                <span className="font-bold text-white print:text-black">{totalOuterSetsBought.toLocaleString()} Sets</span>
              </div>
              <div>
                <span className="text-slate-400 print:text-gray-600 block text-[10px]">Outer Sets In Stock:</span>
                <span className="font-bold text-emerald-400 print:text-emerald-700">
                  {outerSetsInStock.toLocaleString()} Sets ({ (outerSetsInStock * 50).toLocaleString()} bundles cap)
                </span>
              </div>
              <div>
                <span className="text-slate-400 print:text-gray-600 block text-[10px]">Roll Weight Purchased:</span>
                <span className="font-bold text-white print:text-black">{totalRollKgBought.toFixed(1)} KG</span>
              </div>
              <div>
                <span className="text-slate-400 print:text-gray-600 block text-[10px]">Roll Stock Balance:</span>
                <span className="font-bold text-emerald-400 print:text-emerald-700">{rollKgInStock.toFixed(1)} KG Remaining</span>
              </div>
            </div>
          </div>

          {/* Production Batch Details Table */}
          <div>
            <h4 className="text-xs font-bold text-white print:text-black uppercase tracking-wider mb-2 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-amber-400 print:text-black" />
              Daily Production Batch Logs & Machine Yields
            </h4>
            <div className="border border-slate-700 print:border-black rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 print:bg-gray-200 text-slate-300 print:text-black font-bold border-b border-slate-700 print:border-black">
                    <th className="p-2">Batch #</th>
                    <th className="p-2">Date / Shift</th>
                    <th className="p-2">Sets Used (Rem)</th>
                    <th className="p-2">Calculated Bundles</th>
                    <th className="p-2">Roll (Kg) & Machine</th>
                    <th className="p-2">Operator</th>
                    <th className="p-2 text-right">Damaged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-300 text-[11px]">
                  {filteredProduction.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-500 print:text-gray-500">
                        No production batches recorded in this timeframe.
                      </td>
                    </tr>
                  ) : (
                    filteredProduction.map((p) => {
                      const sets = p.outerSetsUsed ?? p.outerFilmCount ?? 0;
                      const rem = p.outerRemainingBundles || 0;
                      return (
                        <tr key={p.id} className="hover:bg-slate-800/40 print:hover:bg-transparent">
                          <td className="p-2 font-mono font-bold text-cyan-400 print:text-black">
                            {p.batchNumber}
                          </td>
                          <td className="p-2">
                            {p.date} <span className="text-[10px] text-slate-400 print:text-gray-600 capitalize">({p.shift})</span>
                          </td>
                          <td className="p-2">
                            <span className="font-semibold text-white print:text-black">{sets} Sets</span>
                            {rem > 0 && (
                              <span className="text-[10px] text-amber-400 print:text-gray-700 ml-1">
                                (-{rem} rem)
                              </span>
                            )}
                          </td>
                          <td className="p-2 font-bold text-emerald-400 print:text-black">
                            {p.bundlesProduced.toLocaleString()} Bundles
                          </td>
                          <td className="p-2">
                            {p.packagingRollWeightKg ? `${p.packagingRollWeightKg} KG` : 'N/A'}{' '}
                            <span className="text-[10px] text-slate-400 print:text-gray-600">
                              ({p.machineName || 'Machine'})
                            </span>
                          </td>
                          <td className="p-2 text-slate-300 print:text-black">
                            {p.outerOperatorName || p.operatorName || 'Operator'}
                          </td>
                          <td className="p-2 text-right font-semibold text-rose-400 print:text-black">
                            {p.damagedBundles}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Official Authorization & Signatures */}
          <div className="pt-8 border-t-2 border-slate-700 print:border-black grid grid-cols-2 gap-8 text-xs">
            <div className="space-y-12">
              <div>
                <p className="font-bold text-white print:text-black">Prepared By (Production Engineer):</p>
                <div className="mt-8 border-b border-slate-600 print:border-black w-48"></div>
                <p className="text-[10px] text-slate-400 print:text-gray-600 mt-1">
                  Name: {currentUser?.name || 'Engineer Sign-off'} | Date: _________________
                </p>
              </div>
            </div>

            <div className="space-y-12 text-right">
              <div className="flex flex-col items-end">
                <p className="font-bold text-white print:text-black">Approved & Verified By (Factory Manager):</p>
                <div className="mt-8 border-b border-slate-600 print:border-black w-48"></div>
                <p className="text-[10px] text-slate-400 print:text-gray-600 mt-1">
                  Signature & Stamp | Date: _________________
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
