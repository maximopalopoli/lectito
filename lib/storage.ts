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

function enqueue(key: string, action: () => Promise<void>): Promise<void> {
  const previous = pendingWrites.get(key) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(action);
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
  return next;
}

export function reportReadError(key: string): void {
  useStorageHealthStore.getState().reportReadError(key);
}
