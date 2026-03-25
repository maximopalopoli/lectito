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
