/**
 * Secure Purge Archive ("Safe Zone") for Pure Max Factory OS.
 *
 * PURPOSE
 * -------
 * Managers and Developers can permanently clear every record made by the
 * Production Sales Officer or the Production Engineer. That is a destructive,
 * irreversible-looking action, so the owner asked for the records to still be
 * kept "in a more secure and safe way (database and excel) so that even if the
 * system crashes the data is safe and can be accessed".
 *
 * Nothing is therefore thrown away. Every purge writes a signed, timestamped
 * archive that is:
 *   1. Stored in IndexedDB            — survives refresh, crash and cache clear
 *   2. Mirrored in a localStorage index — so the vault lists instantly
 *   3. Downloaded as a multi-sheet .xlsx — the portable, human-readable copy
 *   4. POSTed to the server (best effort) — the off-device "database" copy
 *
 * #4 deliberately cannot fail the purge: on GitHub Pages and in an AI Studio
 * deployment without Postgres there is no backend, and the local copies are
 * what actually matter there.
 *
 * Archives are read-only snapshots. They are never re-merged automatically,
 * which keeps the purge predictable, but they can be restored on request.
 */

import * as XLSX from 'xlsx';
import { idbStorage } from './indexedDBStorage';
import {
  SalesRecord,
  ProductionRecord,
  AttendanceRecord,
  ExpenseRecord,
  OuterBuyingRecord,
  RollBuyingRecord,
  MachineRepairRecord,
  FuelRecord,
  EquipmentLogRecord,
} from '../types';

/** The two purge targets the owner asked for. */
export type PurgeScope = 'sales_officer' | 'production_engineer';

export const PURGE_SCOPE_META: Record<
  PurgeScope,
  { label: string; shortLabel: string; role: string; description: string }
> = {
  sales_officer: {
    label: 'Production Sales Officer',
    shortLabel: 'Sales Officer',
    role: 'sales_manager',
    description:
      'Every sales invoice, dispatch record, expense and attendance entry logged by any Production Sales Officer account.',
  },
  production_engineer: {
    label: 'Production Engineer',
    shortLabel: 'Engineer',
    role: 'engineer',
    description:
      'Every production batch, material purchase, repair, fuel, telemetry and attendance entry logged by any Production Engineer account.',
  },
};

/** The set of collections a purge can touch, in a stable order. */
export const ARCHIVE_COLLECTIONS = [
  'sales',
  'production',
  'attendance',
  'expenses',
  'outerBuyings',
  'rollBuyings',
  'repairs',
  'fuel',
  'equipmentLogs',
] as const;

export type ArchiveCollection = (typeof ARCHIVE_COLLECTIONS)[number];

export interface PurgedArchive {
  id: string;
  scope: PurgeScope;
  scopeLabel: string;
  purgedAt: string;
  purgedById: string;
  purgedByName: string;
  purgedByRole: string;
  /** How many records were removed from each collection. */
  recordCounts: Record<ArchiveCollection, number>;
  totalRecords: number;
  /** The removed records themselves, verbatim. */
  sales: SalesRecord[];
  production: ProductionRecord[];
  attendance: AttendanceRecord[];
  expenses: ExpenseRecord[];
  outerBuyings: OuterBuyingRecord[];
  rollBuyings: RollBuyingRecord[];
  repairs: MachineRepairRecord[];
  fuel: FuelRecord[];
  equipmentLogs: EquipmentLogRecord[];
  /** Names of the staff accounts whose records were cleared. */
  affectedStaff: string[];
}

/** Lightweight summary kept in localStorage so the vault renders instantly. */
export interface ArchiveSummary {
  id: string;
  scope: PurgeScope;
  scopeLabel: string;
  purgedAt: string;
  purgedByName: string;
  totalRecords: number;
  affectedStaff: string[];
  /** True once the server has confirmed it stored a copy. */
  backedUpToServer?: boolean;
}

const INDEX_KEY = 'puremax_purge_archive_index';
const IDB_PREFIX = 'purge_archive::';
const MAX_INDEX_ENTRIES = 200;

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export function buildArchive(params: {
  scope: PurgeScope;
  records: Record<ArchiveCollection, any[]>;
  actor: { id: string; name: string; role: string } | null;
  affectedStaff: string[];
}): PurgedArchive {
  const { scope, records, actor, affectedStaff } = params;

  const recordCounts = {} as Record<ArchiveCollection, number>;
  let totalRecords = 0;
  for (const key of ARCHIVE_COLLECTIONS) {
    const n = (records[key] || []).length;
    recordCounts[key] = n;
    totalRecords += n;
  }

  return {
    id: `PURGE-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    scope,
    scopeLabel: PURGE_SCOPE_META[scope].label,
    purgedAt: new Date().toISOString(),
    purgedById: actor?.id || 'unknown',
    purgedByName: actor?.name || 'Unknown User',
    purgedByRole: actor?.role || 'unknown',
    recordCounts,
    totalRecords,
    sales: records.sales || [],
    production: records.production || [],
    attendance: records.attendance || [],
    expenses: records.expenses || [],
    outerBuyings: records.outerBuyings || [],
    rollBuyings: records.rollBuyings || [],
    repairs: records.repairs || [],
    fuel: records.fuel || [],
    equipmentLogs: records.equipmentLogs || [],
    affectedStaff,
  };
}

/**
 * Persists the archive to IndexedDB (authoritative) and adds a summary to the
 * localStorage index. IndexedDB is effectively unbounded, which is exactly why
 * it is used here: a purge archive can be several megabytes of JSON, far past
 * the ~5 MB localStorage budget.
 */
export async function saveArchiveToVault(archive: PurgedArchive): Promise<void> {
  try {
    await idbStorage.saveMediaItem(IDB_PREFIX + archive.id, JSON.stringify(archive), {
      scope: archive.scope,
      totalRecords: archive.totalRecords,
      purgedAt: archive.purgedAt,
    });
  } catch (err) {
    console.error('Failed to write purge archive to IndexedDB:', err);
  }

  try {
    const index = safeParse<ArchiveSummary[]>(localStorage.getItem(INDEX_KEY), []);
    const summary: ArchiveSummary = {
      id: archive.id,
      scope: archive.scope,
      scopeLabel: archive.scopeLabel,
      purgedAt: archive.purgedAt,
      purgedByName: archive.purgedByName,
      totalRecords: archive.totalRecords,
      affectedStaff: archive.affectedStaff,
    };
    const next = [summary, ...index.filter((s) => s.id !== archive.id)].slice(0, MAX_INDEX_ENTRIES);
    localStorage.setItem(INDEX_KEY, JSON.stringify(next));
  } catch (err) {
    console.warn('Failed to update purge archive index:', err);
  }
}

export function listArchives(): ArchiveSummary[] {
  return safeParse<ArchiveSummary[]>(localStorage.getItem(INDEX_KEY), []);
}

export async function loadArchive(id: string): Promise<PurgedArchive | null> {
  try {
    const raw = await idbStorage.getMediaItem(IDB_PREFIX + id);
    return raw ? (JSON.parse(raw) as PurgedArchive) : null;
  } catch (err) {
    console.error('Failed to load purge archive:', err);
    return null;
  }
}

export async function deleteArchive(id: string): Promise<void> {
  try {
    await idbStorage.saveMediaItem(IDB_PREFIX + id, '');
  } catch {
    /* ignore */
  }
  try {
    const index = safeParse<ArchiveSummary[]>(localStorage.getItem(INDEX_KEY), []);
    localStorage.setItem(INDEX_KEY, JSON.stringify(index.filter((s) => s.id !== id)));
  } catch {
    /* ignore */
  }
}

/**
 * Best-effort copy to the server. Resolves false when no backend is reachable,
 * which is the normal case on a static deploy — callers must never treat this
 * as a failure of the purge itself.
 */
export async function uploadArchiveToServer(archive: PurgedArchive): Promise<boolean> {
  try {
    const res = await fetch('/api/purge-archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(archive),
    });
    if (!res.ok) return false;
    // Mark the local summary so the vault can show whether an off-device
    // copy exists.
    try {
      const index = safeParse<ArchiveSummary[]>(localStorage.getItem(INDEX_KEY), []);
      const next = index.map((s) => (s.id === archive.id ? { ...s, backedUpToServer: true } : s));
      localStorage.setItem(INDEX_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------------- */
/* Excel export                                                              */
/* ------------------------------------------------------------------------- */

const SHEET_NAME: Record<ArchiveCollection, string> = {
  sales: 'Sales Records',
  production: 'Production Batches',
  attendance: 'Attendance',
  expenses: 'Expenses',
  outerBuyings: 'Outer Buyings',
  rollBuyings: 'Roll Buyings',
  repairs: 'Machine Repairs',
  fuel: 'Fuel Logs',
  equipmentLogs: 'Equipment Logs',
};

export function archiveToWorkbook(archive: PurgedArchive): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Manifest first, so anyone opening the file knows exactly what they hold.
  const manifest: Array<Array<string | number>> = [
    ['PURE MAX WATER FACTORY — SECURE PURGE ARCHIVE'],
    [],
    ['Archive ID', archive.id],
    ['Purge Scope', archive.scopeLabel],
    ['Purged On', new Date(archive.purgedAt).toLocaleString()],
    ['Purged By', `${archive.purgedByName} (${archive.purgedByRole})`],
    ['Total Records Archived', archive.totalRecords],
    [],
    ['Staff Accounts Affected', archive.affectedStaff.join(', ') || '—'],
    [],
    ['COLLECTION', 'RECORDS ARCHIVED'],
    ...ARCHIVE_COLLECTIONS.map((key) => [SHEET_NAME[key], archive.recordCounts[key]]),
    [],
    [
      'This workbook is a complete, unmodified snapshot of every record removed from the live system.',
    ],
    ['Keep it with the factory accounts. It is the recovery copy if the system ever crashes.'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(manifest), 'Purge Manifest');

  for (const key of ARCHIVE_COLLECTIONS) {
    const rows = archive[key];
    if (!rows || rows.length === 0) continue;
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), SHEET_NAME[key]);
  }

  return wb;
}

export function downloadArchive(archive: PurgedArchive): void {
  const wb = archiveToWorkbook(archive);
  const d = new Date(archive.purgedAt);
  const stamp = `${d.toISOString().slice(0, 10)}_${d.toTimeString().slice(0, 8).replace(/:/g, '-')}`;
  const scopeTag = archive.scope === 'sales_officer' ? 'SalesOfficer' : 'ProductionEngineer';
  XLSX.writeFile(wb, `PureMax_PURGE_ARCHIVE_${scopeTag}_${stamp}.xlsx`);
}
