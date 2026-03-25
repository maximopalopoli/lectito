import type { Book, Goal, Session } from '@/types';

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

export function getGoalProgress(
  sessions: Session[],
  goal: Goal,
): { current: number; target: number; percentage: number } {
  const filtered =
    goal.period === 'daily'
      ? sessions.filter((s) => toDateKey(new Date(s.startedAt)) === toDateKey(new Date()))
      : sessions.filter((s) => new Date(s.startedAt) >= getStartOfWeek());

  const current =
    goal.metric === 'minutes'
      ? filtered.reduce((sum, s) => sum + s.durationMin, 0)
      : filtered.reduce((sum, s) => sum + s.pagesRead, 0);

  return {
    current,
    target: goal.target,
    percentage: Math.min(Math.round((current / goal.target) * 100), 100),
  };
}

// --- Heatmap ---

const HEATMAP_THRESHOLDS = [0, 15, 45] as const; // minutes

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  minutes: number;
  level: 0 | 1 | 2 | 3;
}

function minutesToLevel(minutes: number): 0 | 1 | 2 | 3 {
  if (minutes <= HEATMAP_THRESHOLDS[0]) return 0;
  if (minutes <= HEATMAP_THRESHOLDS[1]) return 1;
  if (minutes <= HEATMAP_THRESHOLDS[2]) return 2;
  return 3;
}

export function getReadingHeatmap(
  sessions: Session[],
  months = 3,
): HeatmapDay[] {
  // Build minutes-per-day map
  const minutesMap: Record<string, number> = {};
  for (const s of sessions) {
    const key = toDateKey(new Date(s.startedAt));
    minutesMap[key] = (minutesMap[key] ?? 0) + s.durationMin;
  }

  // Generate all days in range
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - months, today.getDate());
  // Align to Monday
  const dayOfWeek = start.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  start.setDate(start.getDate() - diff);

  const result: HeatmapDay[] = [];
  const cursor = new Date(start);

  while (cursor <= today) {
    const key = toDateKey(cursor);
    const minutes = minutesMap[key] ?? 0;
    result.push({ date: key, minutes, level: minutesToLevel(minutes) });
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

// --- Books per month ---

const MONTH_LABELS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

export interface MonthlyBooks {
  label: string;
  count: number;
}

export function getBooksPerMonth(books: Book[], months = 6): MonthlyBooks[] {
  const now = new Date();
  const result: MonthlyBooks[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();

    const count = books.filter((b) => {
      if (b.status !== 'DONE' || !b.completedAt) return false;
      const completed = new Date(b.completedAt);
      return completed.getFullYear() === year && completed.getMonth() === month;
    }).length;

    result.push({ label: MONTH_LABELS[month], count });
  }

  return result;
}
