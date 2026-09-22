import { Page } from './types';

const DB_NAME = 'PageFlowBuilderDB';
const DB_VERSION = 1;
const STORE_NAME = 'pages';
const LEGACY_STORAGE_KEY = 'pageFlowBuilder_pages';

let dbPromise: Promise<IDBDatabase> | null = null;

const initDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });

  return dbPromise;
};

const migrateLegacyData = async (): Promise<void> => {
  try {
    const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyData) return;

    const pages: Page[] = JSON.parse(legacyData);
    if (pages.length === 0) return;

    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const existingCount = await new Promise<number>((resolve, reject) => {
      const countRequest = store.count();
      countRequest.onsuccess = () => resolve(countRequest.result);
      countRequest.onerror = () => reject(countRequest.error);
    });

    if (existingCount === 0) {
      for (const page of pages) {
        store.put(page);
      }
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });

      localStorage.removeItem(LEGACY_STORAGE_KEY);
      console.log('Successfully migrated legacy data from localStorage to IndexedDB');
    }
  } catch (error) {
    console.warn('Failed to migrate legacy data:', error);
  }
};

export const loadPages = async (): Promise<Page[]> => {
  try {
    await migrateLegacyData();

    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const pages = request.result as Page[];
        pages.sort((a, b) => a.createdAt - b.createdAt);
        resolve(pages);
      };
      request.onerror = () => {
        console.error('Failed to load pages:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to load pages:', error);
    return [];
  }
};

export const savePages = async (pages: Page[]): Promise<void> => {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const existingKeys = await new Promise<string[]>((resolve, reject) => {
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });

    for (const key of existingKeys) {
      if (!pages.find(p => p.id === key)) {
        store.delete(key);
      }
    }

    for (const page of pages) {
      store.put(page);
    }

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => {
        console.error('Failed to save pages:', transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('Failed to save pages:', error);
    throw error;
  }
};

export const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
