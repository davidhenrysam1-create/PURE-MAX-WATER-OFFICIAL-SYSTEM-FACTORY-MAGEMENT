import Dexie, { Table } from 'dexie';
import { User, SalesRecord, ProductionRecord, AttendanceRecord } from '../types';

export interface SyncQueueItem {
  id?: number;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
  synced: boolean;
  createdAt: number;
}

export class OfflineAppDatabase extends Dexie {
  users!: Table<User, string>;
  sales!: Table<SalesRecord, string>;
  production!: Table<ProductionRecord, string>;
  attendance!: Table<AttendanceRecord, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('PureMaxOfflineDB');
    this.version(1).stores({
      users: 'id, employeeId, role',
      sales: 'id, date, createdBy',
      production: 'id, date, createdBy, machineId',
      attendance: 'id, userId, employeeId, date, status',
      syncQueue: '++id, table, operation, synced, createdAt'
    });
  }
}

export const db = new OfflineAppDatabase();

// Sync mechanism to push pending changes
export async function pushPendingSyncs() {
  if (!navigator.onLine) return;
  
  const pending = await db.syncQueue.where('synced').equals(0).toArray();
  if (pending.length === 0) return;

  for (const item of pending) {
    try {
      // In a real full-stack app, this would hit the postgres /api/sync endpoint
      // const res = await fetch(`/api/sync/${item.table}`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(item)
      // });
      // if (res.ok) {
        await db.syncQueue.update(item.id!, { synced: true });
      // }
    } catch (e) {
      console.error('Failed to sync item', item, e);
    }
  }
}

// Background sync listener setup
if (typeof window !== 'undefined') {
  window.addEventListener('online', pushPendingSyncs);
}
