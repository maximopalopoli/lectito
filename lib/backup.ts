import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

import { useBooksStore } from '@/store/books';
import { useSessionsStore } from '@/store/sessions';
import { useGoalsStore } from '@/store/goals';
import type { Book, Goal, Session } from '@/types';

interface BackupData {
  version: number;
  exportedAt: string;
  books: Book[];
  sessions: Session[];
  goal: Goal | null;
}

export async function exportBackup(): Promise<void> {
  const books = useBooksStore.getState().books;
  const sessions = useSessionsStore.getState().sessions;
  const goal = useGoalsStore.getState().goal;

  const data: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    books,
    sessions,
    goal,
  };

  const json = JSON.stringify(data, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `aleph-backup-${date}.json`;

  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const filePath = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(filePath, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(filePath, {
    mimeType: 'application/json',
    dialogTitle: 'Exportar backup de Aleph',
  });
}

export async function importBackup(): Promise<{ books: number; sessions: number }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled) {
    throw new Error('Cancelado');
  }

  const asset = result.assets[0];
  const content = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const data: unknown = JSON.parse(content);

  if (
    !data ||
    typeof data !== 'object' ||
    !('version' in data) ||
    !('books' in data) ||
    !('sessions' in data)
  ) {
    throw new Error('El archivo no es un backup válido de Aleph');
  }

  const backup = data as BackupData;

  if (!Array.isArray(backup.books) || !Array.isArray(backup.sessions)) {
    throw new Error('El archivo no contiene datos válidos');
  }

  useBooksStore.getState().replaceBooks(backup.books);
  useSessionsStore.getState().replaceSessions(backup.sessions);

  if (backup.goal) {
    useGoalsStore.getState().setGoal(backup.goal);
  } else {
    useGoalsStore.getState().clearGoal();
  }

  return { books: backup.books.length, sessions: backup.sessions.length };
}
