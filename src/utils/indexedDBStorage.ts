/**
 * IndexedDB Storage Engine for Pure Max Factory OS
 * Provides high-capacity, non-volatile offline persistence for:
 * 1. High-resolution & compressed branding media (Login backgrounds, header banners, user avatars)
 * 2. Offline transactional queues (Attendance, Sales, Production, Outer/Roll buyings, Expenses)
 */

const DB_NAME = 'PureMax_FactoryDB_v2';
const DB_VERSION = 1;

export const STORES = {
  MEDIA: 'media_assets',
  OFFLINE_QUEUE: 'offline_queue',
  OFFLINE_RECORDS: 'offline_records',
} as const;

class IndexedDBStorage {
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      this.initDB();
    }
  }

  private initDB(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // 1. Media Assets Store (key-value: key -> dataUrl / blob)
          if (!db.objectStoreNames.contains(STORES.MEDIA)) {
            db.createObjectStore(STORES.MEDIA, { keyPath: 'key' });
          }

          // 2. Offline Queue Store (for pending network sync)
          if (!db.objectStoreNames.contains(STORES.OFFLINE_QUEUE)) {
            const queueStore = db.createObjectStore(STORES.OFFLINE_QUEUE, { keyPath: 'id' });
            queueStore.createIndex('timestamp', 'timestamp', { unique: false });
            queueStore.createIndex('type', 'type', { unique: false });
          }

          // 3. Offline Records Cache
          if (!db.objectStoreNames.contains(STORES.OFFLINE_RECORDS)) {
            const recordsStore = db.createObjectStore(STORES.OFFLINE_RECORDS, { keyPath: 'id' });
            recordsStore.createIndex('collection', 'collection', { unique: false });
            recordsStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = (err) => {
          console.warn('IndexedDB open error, falling back gracefully:', err);
          resolve(null);
        };
      } catch (e) {
        console.warn('IndexedDB initialization failed:', e);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  /* =========================================================
   * MEDIA ASSETS STORE (Branding pictures, avatars, banners)
   * ========================================================= */

  public async saveMediaItem(key: string, dataUrl: string, metadata?: Record<string, any>): Promise<boolean> {
    const db = await this.initDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.MEDIA, 'readwrite');
        const store = tx.objectStore(STORES.MEDIA);
        const item = {
          key,
          dataUrl,
          metadata: metadata || {},
          updatedAt: new Date().toISOString(),
        };
        const req = store.put(item);

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  public async getMediaItem(key: string): Promise<string | null> {
    const db = await this.initDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.MEDIA, 'readonly');
        const store = tx.objectStore(STORES.MEDIA);
        const req = store.get(key);

        req.onsuccess = () => {
          if (req.result && req.result.dataUrl) {
            resolve(req.result.dataUrl);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  /* =========================================================
   * OFFLINE SYNC QUEUE STORE
   * ========================================================= */

  public async enqueueOfflineItem(item: {
    id: string;
    type: string;
    payload: any;
    timestamp: string;
    retryCount: number;
  }): Promise<boolean> {
    const db = await this.initDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.OFFLINE_QUEUE, 'readwrite');
        const store = tx.objectStore(STORES.OFFLINE_QUEUE);
        const req = store.put(item);

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  public async getOfflineQueue(): Promise<any[]> {
    const db = await this.initDB();
    if (!db) return [];

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.OFFLINE_QUEUE, 'readonly');
        const store = tx.objectStore(STORES.OFFLINE_QUEUE);
        const req = store.getAll();

        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  public async removeOfflineItem(id: string): Promise<boolean> {
    const db = await this.initDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.OFFLINE_QUEUE, 'readwrite');
        const store = tx.objectStore(STORES.OFFLINE_QUEUE);
        const req = store.delete(id);

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  public async clearOfflineQueue(): Promise<boolean> {
    const db = await this.initDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.OFFLINE_QUEUE, 'readwrite');
        const store = tx.objectStore(STORES.OFFLINE_QUEUE);
        const req = store.clear();

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  /* =========================================================
   * OFFLINE RECORDS PERSISTENCE (Attendance, Sales, Rolls, etc)
   * ========================================================= */

  public async saveOfflineRecord(collection: string, record: any): Promise<boolean> {
    const db = await this.initDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.OFFLINE_RECORDS, 'readwrite');
        const store = tx.objectStore(STORES.OFFLINE_RECORDS);
        const req = store.put({
          id: record.id,
          collection,
          data: record,
          timestamp: new Date().toISOString(),
        });

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  public async getOfflineRecordsByCollection(collection: string): Promise<any[]> {
    const db = await this.initDB();
    if (!db) return [];

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORES.OFFLINE_RECORDS, 'readonly');
        const store = tx.objectStore(STORES.OFFLINE_RECORDS);
        const index = store.index('collection');
        const req = index.getAll(collection);

        req.onsuccess = () => {
          const list = (req.result || []).map((r) => r.data);
          resolve(list);
        };
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }
}

export const idbStorage = new IndexedDBStorage();
