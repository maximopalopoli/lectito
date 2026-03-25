import type { Session } from '@/types';

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
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

  const sessionDates = new Set(
    sessions.map((s) => toDateKey(new Date(s.startedAt))),
  );

  const now = new Date();
  let streak = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  while (true) {
    if (sessionDates.has(toDateKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function getBestStreak(sessions: Session[]): number {
  if (sessions.length === 0) return 0;

  const sessionDates = [
    ...new Set(sessions.map((s) => toDateKey(new Date(s.startedAt)))),
  ].sort();

  let best = 1;
  let current = 1;

  for (let i = 1; i < sessionDates.length; i++) {
    // Walk from previous date forward one day and compare keys
    const prev = new Date(sessionDates[i - 1]);
    prev.setDate(prev.getDate() + 1);
    if (toDateKey(prev) === sessionDates[i]) {
      current++;
      if (current > best) best = current;
    } else {
      current = 1;
    }
  }

  return best;
}

export interface DailyMinutes {
  label: string; // e.g. "Lun", "Mar"
  minutes: number;
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function getTodayStats(sessions: Session[]): {
  minutes: number;
  pages: number;
  sessionsCount: number;
} {
  const todayKey = toDateKey(new Date());
  const todaySessions = sessions.filter(
    (s) => toDateKey(new Date(s.startedAt)) === todayKey,
  );

  return {
    minutes: todaySessions.reduce((sum, s) => sum + s.durationMin, 0),
    pages: todaySessions.reduce((sum, s) => sum + s.pagesRead, 0),
    sessionsCount: todaySessions.length,
  };
}

export function getMinutesPerDayLastWeek(sessions: Session[]): DailyMinutes[] {
  const result: DailyMinutes[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const dateKey = toDateKey(d);

    const minutes = sessions
      .filter((s) => toDateKey(new Date(s.startedAt)) === dateKey)
      .reduce((sum, s) => sum + s.durationMin, 0);

    result.push({ label: DAY_LABELS[d.getDay()], minutes });
  }

  return result;
}
