export interface Session {
  id: string;
  bookId: string;
  startedAt: string; // ISO date
  endedAt: string; // ISO date
  durationMin: number;
  pagesRead: number;
  note: string | null;
}

export interface DailyStats {
  date: string; // ISO date
  minutes: number;
  pages: number;
  sessionsCount: number;
}
