import React, { useState, useMemo } from 'react';
import {
  Activity,
  User,
  Scale,
  Settings,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  Edit3,
  PackageCheck,
  Ban,
  Boxes,
  ArrowRight,
} from 'lucide-react';
import { MachineStatus, User as UserType } from '../../types';
import { useApp } from '../../context/AppContext';

interface MachineRollTrackerProps {
  machines: MachineStatus[];
  onUpdateMachine: (machineId: string, updates: Partial<MachineStatus>) => void;
  operators: UserType[];
  canEdit: boolean;
}

export const MachineRollTracker: React.FC<MachineRollTrackerProps> = ({
  machines,
  onUpdateMachine,
  operators,
  canEdit,
}) => {
  const {
    packagingRolls,
    loadRollToMachine,
    exhaustMachineRoll,
    addPackagingRolls,
    showToast,
  } = useApp();

  const [selectedMachine, setSelectedMachine] = useState<MachineStatus | null>(null);
  const [operatorName, setOperatorName] = useState('');
  const [selectedRollCode, setSelectedRollCode] = useState('');
  const [isRegisteringNewRoll, setIsRegisteringNewRoll] = useState(false);
  const [newRollWeightKg, setNewRollWeightKg] = useState<number>(28.5);
  const [newRollName, setNewRollName] = useState('Pure Max 500ml Heavy Sachet Film');
  const [newRollSupplier, setNewRollSupplier] = useState('');
  const [machineStatus, setMachineStatus] = useState<'running' | 'idle' | 'maintenance' | 'reloading'>('running');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Categorize operators by role
  const dedicatedOperators = useMemo(() => {
    return operators.filter((u) => u.role === 'operator' || String(u.role).toLowerCase() === 'operator' || String(u.role).toLowerCase() === 'machine_operator');
  }, [operators]);

  // Filter available packaging rolls in factory inventory
  const availableRolls = packagingRolls.filter((r) => r.status === 'available');

  const handleOpenEdit = (machine: MachineStatus) => {
    setSelectedMachine(machine);
    setOperatorName(machine.assignedOperatorName || '');
    setSelectedRollCode(machine.activeRollCode || '');
    setIsRegisteringNewRoll(false);
    setNewRollWeightKg(28.5);
    setNewRollName('Pure Max 500ml Heavy Sachet Film');
    setNewRollSupplier('');
    setMachineStatus(machine.status);
    setNotes(machine.notes || '');
    setErrorMessage('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachine) return;
    setErrorMessage('');

    const targetOp = operatorName.trim() || selectedMachine.assignedOperatorName || 'Machine Operator';

    if (isRegisteringNewRoll) {
      // Create new roll in inventory and load it
      const dateStamp = new Date().toISOString().split('T')[0].replace(/-/g, '').slice(4);
      const randHex = Math.floor(100 + Math.random() * 900);
      const generatedCode = `ROLL-${dateStamp}-${randHex}-1`;

      const newRollItem = {
        rollCode: generatedCode,
        rollName: newRollName.trim() || 'Pure Max 500ml Sachet Film',
        weightKg: Number(newRollWeightKg) || 28.5,
        status: 'loaded' as const,
        purchaseDate: new Date().toISOString().split('T')[0],
        costLe: 450,
        supplier: newRollSupplier.trim() || 'Sierra Plastics Ltd',
        assignedMachineId: selectedMachine.id,
        assignedMachineName: selectedMachine.name,
        operatorName: targetOp,
        loadedAt: new Date().toISOString(),
        notes: notes.trim() || 'Directly loaded to machine',
      };

      addPackagingRolls([newRollItem]);

      onUpdateMachine(selectedMachine.id, {
        assignedOperatorName: targetOp,
        activeRollId: undefined,
        activeRollCode: generatedCode,
        activeRollKg: Number(newRollWeightKg) || 28.5,
        activeRollName: newRollItem.rollName,
        activeRollBundlesProduced: 0,
        status: machineStatus,
        lastLoadedDate: new Date().toISOString().split('T')[0],
        notes: notes.trim(),
      });

      setSelectedMachine(null);
      return;
    }

    if (!selectedRollCode) {
      // Just updating status or operator without changing roll
      onUpdateMachine(selectedMachine.id, {
        assignedOperatorName: targetOp,
        status: machineStatus,
        notes: notes.trim(),
      });
      setSelectedMachine(null);
      return;
    }

    // Load roll from inventory
    const result = loadRollToMachine(selectedMachine.id, selectedRollCode, targetOp);
    if (!result.success) {
      setErrorMessage(result.error || 'Failed to load selected roll.');
      return;
    }

    if (machineStatus !== 'running') {
      onUpdateMachine(selectedMachine.id, { status: machineStatus });
    }

    setSelectedMachine(null);
  };

  const handleExhaustActiveRoll = (machineId: string) => {
    exhaustMachineRoll(machineId);
    setSelectedMachine(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Machine Lines & Roll Inventory Lifecycle Tracker
          </h3>
          <p className="text-xs text-slate-400">
            Strict roll-to-operator tracking: assign verified factory inventory rolls, monitor cumulative yield, and manage line status.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {machines.map((machine) => {
          const isRunning = machine.status === 'running';
          const isIdle = machine.status === 'idle';
          const isReloading = machine.status === 'reloading';
          const hasActiveRoll = !!(machine.activeRollKg && machine.activeRollKg > 0);

          return (
            <div
              key={machine.id}
              className="bg-slate-900/65 backdrop-blur-md border border-white/10 hover:border-cyan-500/40 rounded-xl p-4 transition-all flex flex-col justify-between relative group shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono font-bold text-cyan-300 px-2 py-0.5 bg-slate-800/80 rounded border border-cyan-500/20">
                    {machine.code || machine.id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isRunning
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : isIdle
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isRunning ? 'bg-emerald-400 animate-pulse' : isIdle ? 'bg-amber-400' : 'bg-rose-400'
                        }`}
                      />
                      {machine.status}
                    </span>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 truncate">{machine.name}</h4>

                <div className="space-y-2 text-xs text-slate-300 bg-slate-950/50 p-3 rounded-lg border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <User className="w-3.5 h-3.5 text-indigo-400" /> Operator:
                    </span>
                    <span className="font-semibold text-slate-100 truncate max-w-[130px]">
                      {machine.assignedOperatorName || 'Unassigned'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Scale className="w-3.5 h-3.5 text-cyan-400" /> Active Roll (Kg):
                    </span>
                    <span className="font-bold text-cyan-400">
                      {hasActiveRoll ? `${machine.activeRollKg} KG` : 'No Roll'}
                    </span>
                  </div>

                  {machine.activeRollCode && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Roll Code:</span>
                      <span className="font-mono text-cyan-300 font-semibold">{machine.activeRollCode}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-white/10">
                    <span className="text-slate-400">Active Roll Yield:</span>
                    <span className="font-bold text-emerald-400">
                      {(machine.activeRollBundlesProduced || 0).toLocaleString()} Bundles
                    </span>
                  </div>

                  {machine.totalBundlesProduced ? (
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Total Output:</span>
                      <span>{machine.totalBundlesProduced.toLocaleString()} Bundles</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {canEdit && (
                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {machine.lastLoadedDate ? `Loaded: ${machine.lastLoadedDate}` : 'Ready'}
                  </span>
                  <button
                    onClick={() => handleOpenEdit(machine)}
                    className="text-xs text-cyan-300 hover:text-cyan-200 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 transition-all shadow-sm"
                  >
                    <Edit3 className="w-3 h-3" />
                    Load Roll / Assign
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Load Roll & Operator Assignment Modal */}
      {selectedMachine && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900/90 border border-white/15 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shadow-inner">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Machine Operator & Roll Setup</h4>
                  <p className="text-xs text-slate-400">{selectedMachine.name} ({selectedMachine.code || 'Line'})</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMachine(null)}
                className="text-slate-400 hover:text-slate-900 dark:text-white text-sm w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              {/* Operator selection */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Assigned Machine Operator *</label>
                <div className="space-y-1.5">
                  <select
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800/90 border border-white/10 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400 font-medium"
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
                          (No dedicated Operator accounts — Add in Users)
                        </option>
                      )}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Choose from factory inventory rolls or register new */}
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-cyan-400" /> Packaging Roll Selection
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegisteringNewRoll(!isRegisteringNewRoll);
                      setErrorMessage('');
                    }}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-medium"
                  >
                    {isRegisteringNewRoll ? '← Select Available Inventory Roll' : '+ Register & Load New Roll'}
                  </button>
                </div>

                {!isRegisteringNewRoll ? (
                  <div className="space-y-1.5">
                    <label className="block text-slate-400 text-[11px]">
                      Available Rolls in Factory Inventory ({availableRolls.length} available)
                    </label>
                    <select
                      value={selectedRollCode}
                      onChange={(e) => setSelectedRollCode(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800/90 border border-white/10 rounded-lg p-2.5 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                    >
                      <option value="">
                        {selectedMachine.activeRollCode
                          ? `Keep Current Active Roll: ${selectedMachine.activeRollCode} (${selectedMachine.activeRollKg} KG)`
                          : '-- Select from Verified Factory Stock --'}
                      </option>
                      {availableRolls.map((r) => (
                        <option key={r.id} value={r.rollCode}>
                          {r.rollCode} — {r.weightKg} KG ({r.rollName}) - {r.supplier}
                        </option>
                      ))}
                    </select>
                    {availableRolls.length === 0 && (
                      <p className="text-[11px] text-amber-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> No available unassigned rolls in stock. Click "+ Register & Load New Roll".
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-1">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1">Roll Weight (Kg) *</label>
                        <input
                          type="number"
                          step="0.1"
                          min="5"
                          max="100"
                          value={newRollWeightKg}
                          onChange={(e) => setNewRollWeightKg(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-100 dark:bg-slate-800/90 border border-white/10 rounded-lg p-2 text-cyan-400 font-bold focus:outline-none focus:border-cyan-400"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1">Supplier</label>
                        <input
                          type="text"
                          value={newRollSupplier}
                          onChange={(e) => setNewRollSupplier(e.target.value)}
                          className="w-full bg-slate-100 dark:bg-slate-800/90 border border-white/10 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Packaging Film Type / Brand</label>
                      <input
                        type="text"
                        value={newRollName}
                        onChange={(e) => setNewRollName(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-800/90 border border-white/10 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Status and Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Line Status</label>
                  <select
                    value={machineStatus}
                    onChange={(e) => setMachineStatus(e.target.value as any)}
                    className="w-full bg-slate-100 dark:bg-slate-800/90 border border-white/10 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="running">🟢 Running</option>
                    <option value="idle">🟡 Idle</option>
                    <option value="reloading">🟠 Reloading</option>
                    <option value="maintenance">🔴 Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Batch / Shift Remarks</label>
                  <input
                    type="text"
                    value={notes}
                    placeholder="e.g. Calibrated heater..."
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800/90 border border-white/10 rounded-lg p-2 text-slate-900 dark:text-white placeholder-slate-500"
                  />
                </div>
              </div>

              {/* Active Roll Actions */}
              {selectedMachine.activeRollKg && selectedMachine.activeRollKg > 0 ? (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
                  <span className="text-[11px]">
                    Current active roll yield: <strong>{(selectedMachine.activeRollBundlesProduced || 0).toLocaleString()}</strong> bundles
                  </span>
                  <button
                    type="button"
                    onClick={() => handleExhaustActiveRoll(selectedMachine.id)}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded text-[11px] font-semibold flex items-center gap-1 transition-all"
                  >
                    <Ban className="w-3 h-3" />
                    Mark Roll Finished / Exhausted
                  </button>
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedMachine(null)}
                  className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-all shadow-md flex items-center gap-1.5"
                >
                  <PackageCheck className="w-4 h-4" />
                  Save & Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
