import AsyncStorage from '@react-native-async-storage/async-storage';

export const SCHEMA_VERSION_KEY = 'aleph-schema-version';

/** Reads a stored value, seeing changes made by earlier migrations in the same run. */
export type ReadStored = (key: string) => Promise<unknown>;

/** Returns the keys it changes, mapped to their new values. */
export type Migration = (read: ReadStored) => Promise<Record<string, unknown>>;

/**
 * `MIGRATIONS[n]` upgrades local data from schema version n + 1 to n + 2.
 * Append one whenever a stored shape changes; never edit a released one.
 * Backups restore into the current shape, so `importBackup` must also
 * convert older backup data when a migration is added.
 */
export const MIGRATIONS: Migration[] = [];

/**
 * Data written before versioning existed (no version key) is version 1, the
 * same shape as a fresh install.
 */
export async function migrateStorage(migrations: Migration[] = MIGRATIONS): Promise<void> {
  const target = migrations.length + 1;
  const raw = await AsyncStorage.getItem(SCHEMA_VERSION_KEY);
  const version = raw === null ? 1 : JSON.parse(raw);
  if (!Number.isInteger(version) || version < 1) {
    throw new Error(`Invalid schema version: ${raw}`);
  }
  if (version > target) {
    // Written by a newer app: refuse to load rather than overwrite it.
    throw new Error(`Schema version ${version} is newer than ${target}`);
  }
  if (raw !== null && version === target) return;

  const changes: Record<string, unknown> = {};
  const read: ReadStored = async (key) => {
    if (key in changes) return changes[key];
    const value = await AsyncStorage.getItem(key);
    return value === null ? null : JSON.parse(value);
  };
  for (let from = version; from < target; from++) {
    Object.assign(changes, await migrations[from - 1](read));
  }

  // All migrated keys and the new version land together, so an interrupted
  // migration simply runs again from the old version on the next start.
  await AsyncStorage.multiSet([
    ...Object.entries(changes).map(([key, value]): [string, string] => [key, JSON.stringify(value)]),
    [SCHEMA_VERSION_KEY, JSON.stringify(target)],
  ]);
}
