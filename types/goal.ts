export type GoalMetric = 'minutes' | 'pages';
export type GoalPeriod = 'daily' | 'weekly';

export interface Goal {
  metric: GoalMetric;
  target: number;
  period: GoalPeriod;
}
