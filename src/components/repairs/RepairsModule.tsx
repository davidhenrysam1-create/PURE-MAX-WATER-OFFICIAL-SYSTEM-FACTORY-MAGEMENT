/**
 * Repairs & Fuel Module for Pure Max Water Factory
 * Logged by Production Engineer & visible to Factory Head / Manager.
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Wrench, Fuel, Plus, CheckCircle2, AlertTriangle, Truck } from 'lucide-react';

export const RepairsModule: React.FC = () => {
  const { repairs, fuel, addRepairRecord, addFuelRecord, activeRole, currentUser } = useApp();

  const [activeTab, setActiveTab] = useState<'repairs' | 'fuel'>('repairs');
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);

  // Repair Form
  const [machineName, setMachineName] = useState('');
  const [sparePart, setSparePart] = useState('');
  const [repairCostLe, setRepairCostLe] = useState<number>(500000);
  const [issueDescription, setIssueDescription] = useState('');

  // Fuel Form
  const [vehicleOrMachine, setVehicleOrMachine] = useState('');
  const [litres, setLitres] = useState<number>(50);
  const [costPerLitreLe, setCostPerLitreLe] = useState<number>(21000);

  const canLog = ['engineer', 'manager', 'second_manager', 'developer'].includes(activeRole);

  const handleSaveRepair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineName || !sparePart) return;

    addRepairRecord({
      date: new Date().toISOString().split('T')[0],
      machineName,
      sparePart,
      costLe: repairCostLe,
      engineerId: currentUser?.id || 'eng',
      engineerName: currentUser?.name || 'Production Engineer',
      issueDescription,
      resolutionStatus: 'completed',
    });

    setShowRepairModal(false);
    setMachineName('');
    setSparePart('');
    setIssueDescription('');
  };

  const handleSaveFuel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleOrMachine) return;

    addFuelRecord({
      date: new Date().toISOString().split('T')[0],
      vehicleOrMachine,
      litres,
      costPerLitreLe,
      totalCostLe: litres * costPerLitreLe,
      engineerId: currentUser?.id || 'eng',
      engineerName: currentUser?.name || 'Production Engineer',
      receiptNumber: `NP-FUEL-${Math.floor(1000 + Math.random() * 9000)}`,
    });

    setShowFuelModal(false);
    setVehicleOrMachine('');
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-white">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <Wrench className="w-6 h-6 text-orange-500" />
            Machine Repairs & Fleet Fuel Logs
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Maintenance record of water processing pumps, packaging sealers, generator diesel, and distribution vans/tricycles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center gap-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('repairs')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'repairs' ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-300 shadow-xs' : 'text-slate-500'
              }`}
            >
              Machine Repairs ({repairs.length})
            </button>
            <button
              onClick={() => setActiveTab('fuel')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'fuel' ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-300 shadow-xs' : 'text-slate-500'
              }`}
            >
              Fuel Purchases ({fuel.length})
            </button>
          </div>

          {canLog && (
            <button
              onClick={() => (activeTab === 'repairs' ? setShowRepairModal(true) : setShowFuelModal(true))}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              {activeTab === 'repairs' ? 'Log Machine Repair' : 'Log Fuel Purchase'}
            </button>
          )}
        </div>
      </div>

      {activeTab === 'repairs' ? (
        /* REPAIRS TABLE */
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Machine Reference</th>
                  <th className="py-3 px-3">Spare Part Replaced</th>
                  <th className="py-3 px-3 text-right">Cost (SL Le)</th>
                  <th className="py-3 px-3">Engineer</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Issue Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {repairs.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono text-slate-500">{r.date}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{r.machineName}</td>
                    <td className="py-3 px-3 font-semibold text-blue-600 dark:text-blue-400">{r.sparePart}</td>
                    <td className="py-3 px-3 text-right font-black font-mono text-orange-600 dark:text-orange-400">
                      SL Le {r.costLe.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{r.engineerName}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                        {r.resolutionStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">{r.issueDescription}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* FUEL TABLE */
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-3">Receipt Ref</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Vehicle / Generator</th>
                  <th className="py-3 px-3 text-right">Litres</th>
                  <th className="py-3 px-3 text-right">Rate / Litre (SL Le)</th>
                  <th className="py-3 px-3 text-right">Total Cost (SL Le)</th>
                  <th className="py-3 px-3">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {fuel.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono font-bold text-orange-600 dark:text-orange-400">{f.receiptNumber}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{f.date}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{f.vehicleOrMachine}</td>
                    <td className="py-3 px-3 text-right font-bold text-blue-600">{f.litres} L</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">SL Le {f.costPerLitreLe.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-black font-mono text-orange-600 dark:text-orange-400 text-sm">
                      SL Le {f.totalCostLe.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-slate-500">{f.engineerName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Repair Modal */}
      {showRepairModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-900 dark:text-white space-y-4 text-xs">
            <h3 className="text-base font-extrabold flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <Wrench className="w-5 h-5 text-orange-500" />
              Log Machine Repair
            </h3>

            <form onSubmit={handleSaveRepair} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Machine Name</label>
                <input
                  type="text"
                  value={machineName}
                  onChange={(e) => setMachineName(e.target.value)}
                  placeholder="e.g. Automatic Sachet Sealing Machine #2"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Spare Part Replaced</label>
                <input
                  type="text"
                  value={sparePart}
                  onChange={(e) => setSparePart(e.target.value)}
                  placeholder="e.g. Teflon Heating Belt & Thermocouple"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Repair Cost (SL Le)</label>
                <input
                  type="number"
                  value={repairCostLe}
                  onChange={(e) => setRepairCostLe(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-extrabold font-mono text-orange-600"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Issue & Resolution Description</label>
                <textarea
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Describe repair actions taken..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRepairModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 font-bold text-white rounded-xl shadow-md shadow-orange-500/20"
                >
                  Save Repair Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fuel Modal */}
      {showFuelModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-900 dark:text-white space-y-4 text-xs">
            <h3 className="text-base font-extrabold flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <Fuel className="w-5 h-5 text-orange-500" />
              Log Diesel / Petrol Purchase
            </h3>

            <form onSubmit={handleSaveFuel} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Vehicle / Generator Reference</label>
                <input
                  type="text"
                  value={vehicleOrMachine}
                  onChange={(e) => setVehicleOrMachine(e.target.value)}
                  placeholder="e.g. Delivery Van #1 or 250kVA Standby Generator"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Fuel Quantity (Litres)</label>
                  <input
                    type="number"
                    value={litres}
                    onChange={(e) => setLitres(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Cost / Litre (SL Le)</label>
                  <input
                    type="number"
                    value={costPerLitreLe}
                    onChange={(e) => setCostPerLitreLe(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-sm"
                    required
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 flex items-center justify-between font-bold text-orange-800 dark:text-orange-200">
                <span>Calculated Total Fuel Cost:</span>
                <span className="font-mono text-sm">SL Le {(litres * costPerLitreLe).toLocaleString()}</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFuelModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 font-bold text-white rounded-xl shadow-md shadow-orange-500/20"
                >
                  Save Fuel Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
