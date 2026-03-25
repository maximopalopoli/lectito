import type { Session } from '@/types';

function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  // getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
  // We want Monday as start of week
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
  return monday;
}

export function getWeeklyStats(sessions: Session[]): {
  totalMinutes: number;
  totalSessions: number;
} {
  const weekStart = getStartOfWeek();

  const weeklySessions = sessions.filter(
    (s) => new Date(s.startedAt) >= weekStart,
  );

  return {
    totalMinutes: weeklySessions.reduce((sum, s) => sum + s.durationMin, 0),
    totalSessions: weeklySessions.length,
  };
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days + 1);
  return d;
}

export function getPagesPerDay(
  sessions: Session[],
  days: number,
): number {
  const since = daysAgo(days);
  const totalPages = sessions
    .filter((s) => new Date(s.startedAt) >= since)
    .reduce((sum, s) => sum + s.pagesRead, 0);

  return Math.round((totalPages / days) * 10) / 10;
}

export function getStreak(sessions: Session[]): number {
  if (sessions.length === 0) return 0;

  // Collect unique dates (YYYY-MM-DD local) that have at least one session
  const sessionDates = new Set(
    sessions.map((s) => {
      const d = new Date(s.startedAt);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }),
  );

  // Walk backwards from today counting consecutive days
  const now = new Date();
  let streak = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  while (true) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    if (sessionDates.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
