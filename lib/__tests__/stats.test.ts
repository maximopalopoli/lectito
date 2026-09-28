import type { Goal, Session } from "@/types";
import {
  getBestStreak,
  getGoalProgress,
  getPagesPerDay,
  getStreak,
  getTodayStats,
  getWeeklyStats,
} from "../stats";

// Fixed "now" so every date-relative function is deterministic.
// 2026-06-02 is a Tuesday (local time, no trailing Z on purpose).
const NOW = "2026-06-02T12:00:00";

let idSeq = 0;
function session(startedAt: string, over: Partial<Session> = {}): Session {
  idSeq += 1;
  return {
    id: `s${idSeq}`,
    bookId: "b1",
    startedAt,
    endedAt: startedAt,
    durationMin: 10,
    pagesRead: 5,
    note: null,
    ...over,
  };
}

beforeEach(() => {
  idSeq = 0;
  jest.useFakeTimers();
  jest.setSystemTime(new Date(NOW));
});

afterEach(() => {
  jest.useRealTimers();
});

describe("getStreak", () => {
  it("is 0 for no sessions", () => {
    expect(getStreak([])).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    const sessions = [
      session("2026-06-02T10:00:00"),
      session("2026-06-01T10:00:00"),
      session("2026-05-31T10:00:00"),
    ];
    expect(getStreak(sessions)).toBe(3);
  });

  it("stops at the first gap", () => {
    const sessions = [
      session("2026-06-02T10:00:00"),
      session("2026-05-31T10:00:00"), // 06-01 missing -> breaks the run
    ];
    expect(getStreak(sessions)).toBe(1);
  });

  it("is 0 when the most recent session is not today", () => {
    expect(getStreak([session("2026-06-01T10:00:00")])).toBe(0);
  });

  it("counts a day only once regardless of session count", () => {
    const sessions = [
      session("2026-06-02T08:00:00"),
      session("2026-06-02T20:00:00"),
      session("2026-06-01T09:00:00"),
    ];
    expect(getStreak(sessions)).toBe(2);
  });
});

describe("getBestStreak", () => {
  it("is 0 for no sessions", () => {
    expect(getBestStreak([])).toBe(0);
  });

  it("finds the longest consecutive run (date-independent)", () => {
    const sessions = [
      session("2024-01-01T10:00:00"),
      session("2024-01-02T10:00:00"),
      session("2024-01-03T10:00:00"),
      // gap
      session("2024-01-05T10:00:00"),
      session("2024-01-06T10:00:00"),
    ];
    expect(getBestStreak(sessions)).toBe(3);
  });

  it("is 1 when no two days are adjacent", () => {
    const sessions = [
      session("2024-01-01T10:00:00"),
      session("2024-03-10T10:00:00"),
    ];
    expect(getBestStreak(sessions)).toBe(1);
  });
});

describe("getTodayStats", () => {
  it("sums only today's sessions", () => {
    const sessions = [
      session("2026-06-02T08:00:00", { durationMin: 20, pagesRead: 8 }),
      session("2026-06-02T21:00:00", { durationMin: 15, pagesRead: 3 }),
      session("2026-06-01T21:00:00", { durationMin: 99, pagesRead: 99 }),
    ];
    expect(getTodayStats(sessions)).toEqual({
      minutes: 35,
      pages: 11,
      sessionsCount: 2,
    });
  });
});

describe("getPagesPerDay", () => {
  it("averages pages in the window over the day count, rounded to 1 decimal", () => {
    const sessions = [
      session("2026-06-02T10:00:00", { pagesRead: 10 }),
      session("2026-06-01T10:00:00", { pagesRead: 4 }),
      session("2026-05-20T10:00:00", { pagesRead: 100 }), // outside 7-day window
    ];
    // (10 + 4) / 7 = 2.0
    expect(getPagesPerDay(sessions, 7)).toBe(2);
  });
});

describe("getWeeklyStats", () => {
  it("counts only sessions in the current week", () => {
    const sessions = [
      session("2026-06-02T10:00:00", { durationMin: 25 }), // today, always in-week
      session("2026-05-03T10:00:00", { durationMin: 99 }), // ~30 days ago, before week start
    ];
    expect(getWeeklyStats(sessions)).toEqual({
      totalMinutes: 25,
      totalSessions: 1,
    });
  });
});

describe("getGoalProgress", () => {
  const dailyMinutes: Goal = { metric: "minutes", target: 30, period: "daily" };

  it("computes daily minutes progress", () => {
    const sessions = [
      session("2026-06-02T08:00:00", { durationMin: 15 }),
      session("2026-06-02T20:00:00", { durationMin: 9 }),
      session("2026-06-01T20:00:00", { durationMin: 99 }), // not today
    ];
    expect(getGoalProgress(sessions, dailyMinutes)).toEqual({
      current: 24,
      target: 30,
      percentage: 80,
    });
  });

  it("caps percentage at 100", () => {
    const sessions = [session("2026-06-02T08:00:00", { durationMin: 60 })];
    expect(getGoalProgress(sessions, dailyMinutes).percentage).toBe(100);
  });

  it("supports weekly pages goals", () => {
    const goal: Goal = { metric: "pages", target: 50, period: "weekly" };
    const sessions = [
      session("2026-06-02T10:00:00", { pagesRead: 10 }), // in week
      session("2026-05-03T10:00:00", { pagesRead: 40 }), // before week
    ];
    expect(getGoalProgress(sessions, goal)).toEqual({
      current: 10,
      target: 50,
      percentage: 20,
    });
  });
});
