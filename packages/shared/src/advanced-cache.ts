/**
 * Advanced caching system for financial analysis results
 * Uses IndexedDB for persistent storage and LRU cache for memory efficiency
 */

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

export class AdvancedCache {
  private memoryCache = new Map<string, CacheEntry>();
  private maxMemorySize = 100;
  private defaultTTL = 1000 * 60 * 60; // 1 hour
  private dbName = 'EonMentorCache';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDatabase();
  }

  /**
   * Initialize IndexedDB for persistent caching
   */
  private async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };
    });
  }

  /**
   * Get item from cache (memory first, then IndexedDB)
   */
  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isValid(memoryEntry)) {
      this.updateAccess(memoryEntry);
      return memoryEntry.value as T;
    }

    // Check IndexedDB
    if (!this.db) await this.initDatabase();
    
    try {
      const entry = await this.getFromDB(key);
      if (entry && this.isValid(entry)) {
        // Promote to memory cache
        this.memoryCache.set(key, entry);
        this.enforceMemoryLimit();
        this.updateAccess(entry);
        await this.updateInDB(entry);
        return entry.value as T;
      }
    } catch (error) {
      console.warn('[Cache] Error reading from IndexedDB:', error);
    }

    return null;
  }

  /**
   * Set item in both memory and persistent cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      expiresAt: Date.now() + (ttl || this.defaultTTL),
      accessCount: 0,
      lastAccessed: Date.now()
    };

    // Set in memory
    this.memoryCache.set(key, entry);
    this.enforceMemoryLimit();

    // Set in IndexedDB
    try {
      await this.setInDB(entry);
    } catch (error) {
      console.warn('[Cache] Error writing to IndexedDB:', error);
    }
  }

  /**
   * Remove item from cache
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    
    try {
      await this.deleteFromDB(key);
    } catch (error) {
      console.warn('[Cache] Error deleting from IndexedDB:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    try {
      await this.clearDB();
    } catch (error) {
      console.warn('[Cache] Error clearing IndexedDB:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memorySize: number;
    memoryKeys: string[];
    persistentSize: number;
    hitRate: number;
  }> {
    const memoryKeys = Array.from(this.memoryCache.keys());
    let persistentSize = 0;
    
    try {
      persistentSize = await this.getPersistentSize();
    } catch (error) {
      console.warn('[Cache] Error getting persistent size:', error);
    }

    return {
      memorySize: this.memoryCache.size,
      memoryKeys,
      persistentSize,
      hitRate: this.calculateHitRate()
    };
  }

  /**
   * Clean expired entries
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    
    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt < now) {
        this.memoryCache.delete(key);
      }
    }

    // Clean IndexedDB
    try {
      await this.cleanupDB();
    } catch (error) {
      console.warn('[Cache] Error cleaning IndexedDB:', error);
    }
  }

  private isValid(entry: CacheEntry): boolean {
    return entry.expiresAt > Date.now();
  }

  private updateAccess(entry: CacheEntry): void {
    entry.accessCount++;
    entry.lastAccessed = Date.now();
  }

  private enforceMemoryLimit(): void {
    if (this.memoryCache.size <= this.maxMemorySize) return;

    // Remove least recently used entries
    const entries = Array.from(this.memoryCache.entries())
      .sort(([,a], [,b]) => a.lastAccessed - b.lastAccessed);

    const toRemove = entries.slice(0, entries.length - this.maxMemorySize);
    toRemove.forEach(([key]) => this.memoryCache.delete(key));
  }

  private calculateHitRate(): number {
    const entries = Array.from(this.memoryCache.values());
    if (entries.length === 0) return 0;
    
    const totalAccess = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    return entries.length > 0 ? totalAccess / entries.length : 0;
  }

  private async getFromDB(key: string): Promise<CacheEntry | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async setInDB(entry: CacheEntry): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async updateInDB(entry: CacheEntry): Promise<void> {
    return this.setInDB(entry);
  }

  private async deleteFromDB(key: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async clearDB(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getPersistentSize(): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async cleanupDB(): Promise<void> {
    if (!this.db) return;

    const now = Date.now();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const index = store.index('expiresAt');
      const request = index.openCursor(IDBKeyRange.upperBound(now));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
export const cache = new AdvancedCache();