import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStorageHealthStore } from './storageHealth';

const pendingWrites = new Map<string, Promise<void>>();

export async function flushStorageWrites(): Promise<void> {
  await Promise.all([...pendingWrites.values()]);
}

export function saveJson(key: string, value: unknown): Promise<void> {
  return enqueue(key, () => AsyncStorage.setItem(key, JSON.stringify(value)));
}

export function removeStored(key: string): Promise<void> {
  return enqueue(key, () => AsyncStorage.removeItem(key));
}

/**
 * Save several keys in one AsyncStorage.multiSet call so related data is not
 * left half-written: Android commits it in a single SQLite transaction and iOS
 * updates its manifest once.
 */
export function saveJsonMany(entries: Record<string, unknown>): Promise<void> {
  const pairs = Object.entries(entries).map(([key, value]): [string, string] => [key, JSON.stringify(value)]);
  return enqueueAll(pairs.map(([key]) => key), () => AsyncStorage.multiSet(pairs));
}

function enqueue(key: string, action: () => Promise<void>): Promise<void> {
  return enqueueAll([key], action);
}

function enqueueAll(keys: string[], action: () => Promise<void>): Promise<void> {
  const previous = keys.map((key) => (pendingWrites.get(key) ?? Promise.resolve()).catch(() => {}));
  const next = (previous.length === 1 ? previous[0] : Promise.all(previous)).then(action);
  for (const key of keys) {
    pendingWrites.set(key, next);
    void next.then(
      () => {
        if (pendingWrites.get(key) === next) {
          pendingWrites.delete(key);
          useStorageHealthStore.getState().clearWriteError(key);
        }
      },
      () => useStorageHealthStore.getState().reportWriteError(key),
    );
  }
  return next;
}

export function reportReadError(key: string): void {
  useStorageHealthStore.getState().reportReadError(key);
}
