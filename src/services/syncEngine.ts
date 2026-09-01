/**
 * Dual Online/Offline Synchronization Engine for Pure Max Factory OS
 * Ensures zero data loss by staging every write locally first, queuing offline actions in IndexedDB,
 * and seamlessly syncing with the Cloud SQL PostgreSQL backend once online.
 */

import { idbStorage } from '../utils/indexedDBStorage';
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/safeStorage';

export interface SyncQueueItem {
  id: string;
  type:
    | 'user_create'
    | 'user_update'
    | 'user_delete'
    | 'attendance_create'
    | 'attendance_update'
    | 'sales_create'
    | 'production_create'
    | 'outer_buying_create'
    | 'roll_buying_create'
    | 'packaging_roll_create'
    | 'packaging_roll_update'
    | 'expense_create'
    | 'repair_create'
    | 'fuel_create'
    | 'equipment_log_create'
    | 'message_create'
    | 'announcement_create'
    | 'audit_log_create';
  payload: any;
  timestamp: string;
  retryCount: number;
}

const SYNC_QUEUE_KEY = 'puremax_offline_sync_queue_v2';
const LAST_SYNC_KEY = 'puremax_last_sync_timestamp';

class SyncEngine {
  private queue: SyncQueueItem[] = [];
  private isSyncing = false;
  private listeners: ((pendingCount: number, isSyncing: boolean) => void)[] = [];
  private onRecordSyncedCallbacks: ((type: string, payload: any) => void)[] = [];
  private onSyncCompletedCallbacks: ((syncedCount: number) => void)[] = [];

  constructor() {
    this.loadQueue();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('Network status: ONLINE. Auto-syncing pending offline items...');
        this.processQueue();
      });
      window.addEventListener('focus', () => {
        if (navigator.onLine && this.queue.length > 0) {
          this.processQueue();
        }
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine && this.queue.length > 0) {
          this.processQueue();
        }
      });

      // Background auto-sync interval every 4 seconds for any pending items
      setInterval(() => {
        if (typeof navigator !== 'undefined' && navigator.onLine && this.queue.length > 0 && !this.isSyncing) {
          this.processQueue();
        }
      }, 4000);
    }
  }

  private async loadQueue(): Promise<void> {
    try {
      // 1. Try loading from IndexedDB
      const idbItems = await idbStorage.getOfflineQueue();
      if (idbItems && idbItems.length > 0) {
        this.queue = idbItems;
        this.notify();
        return;
      }
    } catch {
      // fallback to safe local storage
    }

    try {
      this.queue = safeLocalStorageGet<SyncQueueItem[]>(SYNC_QUEUE_KEY, []);
      this.notify();
    } catch (e) {
      console.warn('Could not load sync queue:', e);
      this.queue = [];
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      safeLocalStorageSet(SYNC_QUEUE_KEY, this.queue);
    } catch (e) {
      console.warn('Could not save sync queue to localStorage:', e);
    }

    try {
      // Mirror to IndexedDB
      await idbStorage.clearOfflineQueue();
      for (const item of this.queue) {
        await idbStorage.enqueueOfflineItem(item);
      }
    } catch (e) {
      console.warn('Could not save sync queue to IndexedDB:', e);
    }

    this.notify();
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public getIsSyncing(): boolean {
    return this.isSyncing;
  }

  public getLastSyncTime(): string | null {
    return safeLocalStorageGet<string | null>(LAST_SYNC_KEY, null);
  }

  public subscribe(listener: (pendingCount: number, isSyncing: boolean) => void): () => void {
    this.listeners.push(listener);
    listener(this.queue.length, this.isSyncing);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public onRecordSynced(callback: (type: string, payload: any) => void): () => void {
    this.onRecordSyncedCallbacks.push(callback);
    return () => {
      this.onRecordSyncedCallbacks = this.onRecordSyncedCallbacks.filter((c) => c !== callback);
    };
  }

  public onSyncCompleted(callback: (syncedCount: number) => void): () => void {
    this.onSyncCompletedCallbacks.push(callback);
    return () => {
      this.onSyncCompletedCallbacks = this.onSyncCompletedCallbacks.filter((c) => c !== callback);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.queue.length, this.isSyncing));
  }

  /**
   * Clears all or specific item types from the offline sync queue.
   */
  public clearQueue(types?: string[]): void {
    if (types && types.length > 0) {
      const typeSet = new Set(types);
      this.queue = this.queue.filter((item) => !typeSet.has(item.type));
    } else {
      this.queue = [];
    }
    this.saveQueue();
  }

  /**
   * Enqueues an action for syncing to the server.
   * If online, immediately attempts to process the queue.
   */
  public enqueue(type: SyncQueueItem['type'], payload: any): void {
    const item: SyncQueueItem = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };
    this.queue.push(item);
    this.saveQueue();

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.processQueue();
    }
  }

  /**
   * Process all queued items sequentially or in bulk.
   */
  public async processQueue(): Promise<{ success: boolean; syncedCount: number; errors: number }> {
    if (this.isSyncing || this.queue.length === 0) {
      return { success: true, syncedCount: 0, errors: 0 };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: false, syncedCount: 0, errors: 0 };
    }

    this.isSyncing = true;
    this.notify();

    let syncedCount = 0;
    let errors = 0;
    const remainingQueue: SyncQueueItem[] = [];

    for (const item of this.queue) {
      try {
        const success = await this.dispatchItem(item);
        if (success) {
          syncedCount++;
          // Notify app context to clear offline pending flag on this record
          this.onRecordSyncedCallbacks.forEach((cb) => {
            try {
              cb(item.type, item.payload);
            } catch (err) {
              console.warn('Record synced callback error:', err);
            }
          });
        } else {
          item.retryCount = (item.retryCount || 0) + 1;
          remainingQueue.push(item);
          errors++;
        }
      } catch (err) {
        console.warn(`Sync failed for item ${item.type}:`, err);
        item.retryCount = (item.retryCount || 0) + 1;
        remainingQueue.push(item);
        errors++;
      }
    }

    this.queue = remainingQueue;
    await this.saveQueue();

    if (syncedCount > 0) {
      safeLocalStorageSet(LAST_SYNC_KEY, new Date().toISOString());
      this.onSyncCompletedCallbacks.forEach((cb) => {
        try {
          cb(syncedCount);
        } catch (err) {
          console.warn('onSyncCompleted callback error:', err);
        }
      });
    }

    this.isSyncing = false;
    this.notify();

    return { success: errors === 0, syncedCount, errors };
  }

  private async dispatchItem(item: SyncQueueItem): Promise<boolean> {
    const { type, payload } = item;
    let url = '';
    let method = 'POST';

    switch (type) {
      case 'user_create':
        url = '/api/users';
        break;
      case 'user_update':
        url = `/api/users/${encodeURIComponent(payload.employeeId || payload.id)}`;
        method = 'PUT';
        break;
      case 'user_delete':
        url = `/api/users/${encodeURIComponent(payload.employeeId || payload.id)}`;
        method = 'DELETE';
        break;
      case 'attendance_create':
        url = '/api/attendance';
        break;
      case 'attendance_update':
        url = `/api/attendance/${encodeURIComponent(payload.id || 'current')}`;
        method = 'PUT';
        break;
      case 'sales_create':
        url = '/api/sales';
        break;
      case 'production_create':
        url = '/api/production';
        break;
      case 'outer_buying_create':
        url = '/api/outer-buyings';
        break;
      case 'roll_buying_create':
        url = '/api/roll-buyings';
        break;
      case 'packaging_roll_create':
        url = '/api/packaging-rolls';
        break;
      case 'packaging_roll_update':
        url = `/api/packaging-rolls/${encodeURIComponent(payload.rollCode || payload.id)}`;
        method = 'PUT';
        break;
      case 'expense_create':
        url = '/api/expenses';
        break;
      case 'repair_create':
        url = '/api/repairs';
        break;
      case 'fuel_create':
        url = '/api/fuel';
        break;
      case 'equipment_log_create':
        url = '/api/equipment-logs';
        break;
      case 'message_create':
        url = '/api/messages';
        break;
      case 'announcement_create':
        url = '/api/announcements';
        break;
      case 'audit_log_create':
        url = '/api/audit-logs';
        break;
      default:
        return true; // ignore unknown item
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method !== 'DELETE' ? JSON.stringify(payload) : undefined,
      });

      // 2xx status is success, 409 conflict can also be considered resolved
      return response.ok || response.status === 409;
    } catch {
      return false;
    }
  }
}

export const syncEngine = new SyncEngine();
