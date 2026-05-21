import { get, set, del } from 'idb-keyval';
import { PersistStorage, StorageValue } from 'zustand/middleware';

/**
 * 创建一个支持从 localStorage 迁移到 IndexedDB 的存储适配器
 * @param name 存储的键名
 */
export function createIndexedDBWithMigration<T>(name: string): PersistStorage<T> {
  return {
    getItem: async (key: string): Promise<StorageValue<T> | null> => {
      // 1. 尝试从 IndexedDB 获取
      const idbValue = await get<StorageValue<T>>(key);
      if (idbValue !== undefined) {
        return idbValue;
      }

      // 2. 如果没有，尝试从 localStorage 获取（旧数据）
      const localValue = localStorage.getItem(key);
      if (localValue) {
        try {
          // 3. 发现旧数据，立即迁移到 IndexedDB
          const parsed = JSON.parse(localValue) as StorageValue<T>;
          await set(key, parsed);
          
          // 4. 迁移成功后，清理 localStorage
          // 注意：为了安全起见，这里可以先不删除，或者在确定稳定后再删除
          // localStorage.removeItem(key); 
          console.log(`[StorageAdapter] Migrated ${key} from localStorage to IndexedDB`);
          return parsed;
        } catch (e) {
          console.error(`[StorageAdapter] Failed to parse localStorage data for ${key}:`, e);
          return null;
        }
      }
      return null;
    },
    setItem: async (key: string, value: StorageValue<T>): Promise<void> => {
      // 始终写入 IndexedDB
      await set(key, value);
    },
    removeItem: async (key: string): Promise<void> => {
      // 同时清理两个地方
      await del(key);
      localStorage.removeItem(key);
    },
  };
}
