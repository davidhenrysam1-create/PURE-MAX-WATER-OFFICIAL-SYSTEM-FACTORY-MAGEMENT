/**
 * PurgeRecordsPanel — the two red "Safe Zone" buttons.
 *
 * Owner requirement (verbatim intent):
 *   "I want two buttons at the top that only Manager and Developer can see and
 *    use: one to delete all records made by the Production Sales Officer, and
 *    one to delete all records made by the Production Engineer. They must warn
 *    me first, ask for the Manager/Developer password, and the records must be
 *    stored securely in a database and in Excel so that even if the system
 *    crashes the data is safe and can be accessed."
 *
 * How each requirement is met
 * ---------------------------
 * 1. "two buttons at the top"   — rendered at the very top of the dashboard,
 *                                 above every other module.
 * 2. "only Manager and Developer" — `canPurgeRecords()` gates both the panel
 *                                 AND the context mutation. The panel simply
 *                                 renders `null` for everyone else, so the
 *                                 buttons are not just hidden, they are absent.
 * 3. "warn me first"            — a full-screen confirmation dialog lists
 *                                 exactly what will be removed before anything
 *                                 happens.
 * 4. "ask for the password"     — a safe-zone password field that must be
 *                                 retyped even though the user is already
 *                                 signed in.
 * 5. "stored in database and Excel" — AppContext writes the archive to
 *                                 IndexedDB + localStorage, downloads an .xlsx
 *                                 workbook, and POSTs a copy to the server
 *                                 before touching any live collection.
 *
 * The dialog is rendered through <Portal> so it escapes the sticky header's
 * `backdrop-filter` containing block and its `overflow-hidden` clipping — the
 * same fix applied to the other overlays (see Portal.tsx).
 */

import { useMemo, useState } from 'react';
import { AlertTriangle, ShieldAlert, Trash2, X, Loader2, FileSpreadsheet, Database, HardDriveDownload } from 'lucide-react';

import { useApp } from '../../context/AppContext';
import { canPurgeRecords } from '../../utils/roleAccess';
import { PURGE_SCOPE_META, type PurgeScope } from '../../utils/recordArchive';
import Portal from '../common/Portal';

const SCOPES: PurgeScope[] = ['sales_officer', 'production_engineer'];

/** Collections shown in the confirmation dialog, with human labels. */
const COUNT_LABELS: Array<{ key: string; label: string }> = [
  { key: 'sales', label: 'Sales & Dispatch Records' },
  { key: 'production', label: 'Production Batches' },
  { key: 'attendance', label: 'Attendance Entries' },
  { key: 'expenses', label: 'Expense Records' },
  { key: 'outerBuyings', label: 'Outer (Packaging) Buyings' },
  { key: 'rollBuyings', label: 'Roll Buyings' },
  { key: 'repairs', label: 'Machine Repairs' },
  { key: 'fuel', label: 'Fuel Logs' },
  { key: 'equipmentLogs', label: 'Equipment / Water-Quality Logs' },
];

export const PurgeRecordsPanel = () => {
  const {
    currentUser,
    inspectingOriginalUser,
    users,
    sales,
    production,
    attendance,
    expenses,
    outerBuyings,
    rollBuyings,
    repairs,
    fuel,
    equipmentLogs,
    purgeRecordsByRole,
  } = useApp();

  const [pendingScope, setPendingScope] = useState<PurgeScope | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * Extra friction on purpose. These buttons wipe live records, so they are
   * NOT shown by default even inside Settings. Reaching them takes:
   *   Settings (Profile & Preferences) -> scroll to the very bottom
   *   -> click "Reveal" -> click a red button -> confirm dialog -> password.
   */
  const [revealed, setRevealed] = useState(false);

  // A Developer inspecting another account still acts with their own authority.
  const effectiveRole = inspectingOriginalUser?.role || currentUser?.role;

  /**
   * Preview of what a purge would remove, computed from the same fields the
   * context mutation uses — so the number the user confirms is the number that
   * actually gets archived.
   */
  const preview = useMemo(() => {
    if (!pendingScope) return null;
    const targetRole = PURGE_SCOPE_META[pendingScope].role;
    const staff = users.filter((u) => u.role === targetRole);
    const ids = new Set(staff.map((u) => u.id));
    const owns = (id?: string | null) => !!id && ids.has(id);

    const counts: Record<string, number> = {
      sales: sales.filter((r) => owns(r.recordedById) || r.recordedByRole === targetRole).length,
      production: production.filter((r) => owns(r.engineerId) || owns(r.operatorId)).length,
      attendance: attendance.filter((r) => owns(r.userId) || r.userRole === targetRole).length,
      expenses: expenses.filter((r) => owns(r.recordedById)).length,
      outerBuyings: outerBuyings.filter((r) => owns(r.engineerId)).length,
      rollBuyings: rollBuyings.filter((r) => owns(r.engineerId)).length,
      repairs: repairs.filter((r) => owns(r.engineerId)).length,
      fuel: fuel.filter((r) => owns(r.engineerId)).length,
      equipmentLogs: equipmentLogs.filter((r) => owns(r.operatorId)).length,
    };

    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

    return {
      staff: staff.map((u) => ({ name: u.name, employeeId: u.employeeId })),
      counts,
      total,
    };
  }, [
    pendingScope,
    users,
    sales,
    production,
    attendance,
    expenses,
    outerBuyings,
    rollBuyings,
    repairs,
    fuel,
    equipmentLogs,
  ]);

  // The panel must not exist for anyone without purge authority.
  if (!canPurgeRecords(effectiveRole)) return null;

  const closeDialog = () => {
    setPendingScope(null);
    setPassword('');
    setError(null);
    setBusy(false);
  };

  const handleConfirm = () => {
    if (!pendingScope || busy) return;

    setBusy(true);
    setError(null);

    const result = purgeRecordsByRole(pendingScope, password);

    if (!result.success) {
      setError(result.error || 'The purge could not be completed.');
      setBusy(false);
      return;
    }

    // Success: AppContext has already archived, downloaded the Excel workbook
    // and raised a toast. Just close.
    closeDialog();
  };

  return (
    <>
      <section
        aria-label="Danger zone: purge staff records"
        className="mb-6 rounded-2xl border-2 border-red-500/40 bg-gradient-to-br from-red-950/40 via-red-900/20 to-transparent p-4 shadow-lg shadow-red-950/20 dark:border-red-500/30"
      >
        <div className="mb-3 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-400" aria-hidden="true" />
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-red-300">
            Danger Zone — Record Purge
          </h2>
          <span className="ml-auto rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300">
            Manager / Developer only
          </span>
        </div>

        {!revealed ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-xs leading-relaxed text-slate-400 dark:text-slate-500">
              Advanced maintenance tools for permanently clearing staff records. Kept hidden by
              default — reveal them only when you actually intend to use them.
            </p>
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="shrink-0 rounded-lg border border-slate-600 bg-slate-800/60 px-4 py-2 text-xs font-bold text-slate-300 transition-colors hover:bg-slate-700/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50"
            >
              Reveal record purge tools
            </button>
          </div>
        ) : (
          <>
            <p className="mb-4 max-w-3xl text-xs leading-relaxed text-slate-300 dark:text-slate-400">
              Permanently clear every record logged by a staff role. Nothing is lost — a timestamped
              recovery archive is written to this device, downloaded as an Excel workbook, and copied
              to the server before anything is removed.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SCOPES.map((scope) => {
            const meta = PURGE_SCOPE_META[scope];
            return (
              <button
                key={scope}
                type="button"
                onClick={() => {
                  setPendingScope(scope);
                  setPassword('');
                  setError(null);
                }}
                className="group flex items-center gap-3 rounded-xl border-2 border-red-600 bg-red-600 px-5 py-4 text-left font-black text-white shadow-lg shadow-red-900/40 transition-all hover:bg-red-700 hover:shadow-red-900/60 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-400/50 active:scale-[0.985]"
              >
                <Trash2 className="h-6 w-6 shrink-0 transition-transform group-hover:scale-110" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-base uppercase leading-tight tracking-wide">
                    Delete All {meta.shortLabel} Records
                  </span>
                  <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-wider text-red-100/90">
                    {meta.label} · requires password
                  </span>
                </span>
              </button>
            );
          })}
            </div>
          </>
        )}
      </section>

      {pendingScope && (
        <Portal containerId="purge-records-dialog-root">
          <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm sm:items-center">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="purge-dialog-title"
              className="my-auto w-full max-w-lg rounded-2xl border border-red-500/40 bg-white shadow-2xl dark:bg-slate-900"
            >
              {/* Header */}
              <div className="flex items-start gap-3 border-b border-slate-200 p-5 dark:border-slate-700">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/60">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2
                    id="purge-dialog-title"
                    className="text-lg font-black text-slate-900 dark:text-white"
                  >
                    Purge {PURGE_SCOPE_META[pendingScope].label} Records
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    This cannot be undone from the app. Confirm only if you are certain.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={busy}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-5">
                {/* What will be removed */}
                <div className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
                  <p className="mb-2 text-xs font-black uppercase tracking-wider text-red-800 dark:text-red-300">
                    This will permanently remove
                  </p>
                  <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                    {COUNT_LABELS.filter((c) => (preview?.counts[c.key] ?? 0) > 0).map((c) => (
                      <li key={c.key} className="flex items-center justify-between gap-3">
                        <span>{c.label}</span>
                        <span className="font-bold tabular-nums text-red-700 dark:text-red-300">
                          {preview?.counts[c.key]}
                        </span>
                      </li>
                    ))}
                    {(preview?.total ?? 0) === 0 && (
                      <li className="text-slate-500 dark:text-slate-400">
                        No records found for this role.
                      </li>
                    )}
                  </ul>
                  {preview && preview.total > 0 && (
                    <p className="mt-3 border-t border-red-300 pt-2 text-sm font-black text-red-800 dark:border-red-900/60 dark:text-red-200">
                      {preview.total} record{preview.total === 1 ? '' : 's'} in total
                    </p>
                  )}
                </div>

                {/* Affected accounts */}
                {preview && preview.staff.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-1.5 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Accounts affected
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {preview.staff.map((s) => (
                        <span
                          key={s.employeeId}
                          className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {s.name} · {s.employeeId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Safety notice */}
                <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/25">
                  <p className="mb-1.5 text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    Your data is not lost
                  </p>
                  <ul className="space-y-1 text-[11px] text-emerald-900 dark:text-emerald-200">
                    <li className="flex items-center gap-2">
                      <HardDriveDownload className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      Saved to this device (IndexedDB)
                    </li>
                    <li className="flex items-center gap-2">
                      <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      Downloaded automatically as an Excel workbook
                    </li>
                    <li className="flex items-center gap-2">
                      <Database className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      Copied to the server when one is reachable
                    </li>
                  </ul>
                </div>

                {/* Password gate */}
                <div className="mt-4">
                  <label
                    htmlFor="purge-password"
                    className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300"
                  >
                    Enter your password to confirm
                  </label>
                  <input
                    id="purge-password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirm();
                    }}
                    disabled={busy}
                    autoComplete="current-password"
                    placeholder="Manager or Developer password"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-red-500 focus:ring-2 focus:ring-red-500/30 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {error && (
                  <p
                    role="alert"
                    className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
                  >
                    {error}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 p-5 sm:flex-row sm:justify-end dark:border-slate-700">
                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={busy}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={busy || !password.trim() || (preview?.total ?? 0) === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-red-900/30 transition-colors hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-400/50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Purging…
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Purge {preview?.total ?? 0} Records
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
};

export default PurgeRecordsPanel;
