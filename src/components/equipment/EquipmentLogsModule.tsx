/**
 * Operational Equipment Logs Module for Pure Max Water Factory
 * Dedicated Operator role module for logging water purity TDS, pH, filtration pressure, and UV sterilizers.
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Gauge, Plus, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const EquipmentLogsModule: React.FC = () => {
  const { equipmentLogs, addEquipmentLog, activeRole, currentUser } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [tdsLevelPpm, setTdsLevelPpm] = useState<number>(18);
  const [phLevel, setPhLevel] = useState<number>(7.2);
  const [filtrationPressurePsi, setFiltrationPressurePsi] = useState<number>(42);
  const [uvSterilizerStatus, setUvSterilizerStatus] = useState<'optimal' | 'warning' | 'needs_maintenance'>('optimal');
  const [remarks, setRemarks] = useState('');

  const canLogEquipment = activeRole === 'engineer';

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canLogEquipment) return;

    addEquipmentLog({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      tdsLevelPpm,
      phLevel,
      filtrationPressurePsi,
      uvSterilizerStatus,
      ozoneGeneratorLevel: 0.45,
      operatorId: currentUser?.id || 'eng',
      operatorName: currentUser?.name || 'Production Engineer',
      remarks,
    });

    setShowAddModal(false);
    setRemarks('');
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-white">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <Gauge className="w-6 h-6 text-indigo-500" />
            Operational Equipment & Water Purity Telemetry Logs
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time telemetry for total dissolved solids (TDS PPM), filtration pressure (PSI), pH levels, and UV sterilization status.
          </p>
        </div>

        {canLogEquipment ? (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Log Telemetry Entry
          </button>
        ) : (
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs border border-slate-200 dark:border-slate-700">
            🔒 Read-Only Telemetry View (Engineer Edit Rights)
          </span>
        )}
      </div>

      {/* Sensor Standards Banner */}
      <div className="p-4 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div>
            <span className="font-bold text-white">Pure Max Quality Standard Metrics:</span>
            <span className="text-slate-400 ml-2">TDS &lt; 50 PPM | pH 6.8 - 7.5 | RO Pressure 40-50 PSI</span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] border border-emerald-500/30">
          WHO & Sierra Leone Standards Compliant
        </span>
      </div>

      {/* Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">TDS Purity (PPM)</th>
                <th className="py-3 px-3">pH Level</th>
                <th className="py-3 px-3">Filtration Pressure</th>
                <th className="py-3 px-3">UV Sterilizer</th>
                <th className="py-3 px-3">Operator</th>
                <th className="py-3 px-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {equipmentLogs.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-mono text-slate-500">
                    {e.date} @ {e.time}
                  </td>
                  <td className="py-3 px-3 font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    {e.tdsLevelPpm} PPM
                  </td>
                  <td className="py-3 px-3 font-mono font-bold">{e.phLevel}</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                    {e.filtrationPressurePsi} PSI
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        e.uvSterilizerStatus === 'optimal'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {e.uvSterilizerStatus}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-medium">{e.operatorName}</td>
                  <td className="py-3 px-3 text-slate-400 text-[11px]">{e.remarks || '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Telemetry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-900 dark:text-white space-y-4 text-xs">
            <h3 className="text-base font-extrabold flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <Gauge className="w-5 h-5 text-indigo-500" />
              Log Water Telemetry & Equipment Reading
            </h3>

            <form onSubmit={handleSaveLog} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Water TDS Level (PPM)</label>
                  <input
                    type="number"
                    value={tdsLevelPpm}
                    onChange={(e) => setTdsLevelPpm(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">pH Level</label>
                  <input
                    type="number"
                    step="0.1"
                    value={phLevel}
                    onChange={(e) => setPhLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Filtration Pressure (PSI)</label>
                  <input
                    type="number"
                    value={filtrationPressurePsi}
                    onChange={(e) => setFiltrationPressurePsi(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">UV Sterilizer Status</label>
                  <select
                    value={uvSterilizerStatus}
                    onChange={(e) => setUvSterilizerStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    <option value="optimal">Optimal</option>
                    <option value="warning">Warning</option>
                    <option value="needs_maintenance">Needs Maintenance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Operator Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. RO membrane flushing completed..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 font-bold text-white rounded-xl shadow-md shadow-indigo-500/20"
                >
                  Save Telemetry Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
