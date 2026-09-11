import { shiftMonth } from '@/lib/month';

// see technical-specification.md §5.9 — "current month, last 3/6/12 months, custom range"
export const REPORT_PERIOD_PRESETS = ['thisMonth', 'last3', 'last6', 'last12', 'custom'] as const;
export type ReportPeriodPreset = (typeof REPORT_PERIOD_PRESETS)[number];

export interface ReportPeriod {
  startMonth: string;
  endMonth: string;
}

const PRESET_MONTHS_BACK: Record<Exclude<ReportPeriodPreset, 'custom'>, number> = {
  thisMonth: 0,
  last3: 2,
  last6: 5,
  last12: 11,
};

// 'custom' has no fixed range — the caller supplies its own via setCustomRange.
export function resolvePeriodPreset(
  preset: Exclude<ReportPeriodPreset, 'custom'>,
  currentMonth: string,
): ReportPeriod {
  return {
    startMonth: shiftMonth(currentMonth, -PRESET_MONTHS_BACK[preset]),
    endMonth: currentMonth,
  };
}

// A custom range typed by the user could end up reversed; swap rather than reject.
export function normalizePeriodRange(startMonth: string, endMonth: string): ReportPeriod {
  return startMonth <= endMonth
    ? { startMonth, endMonth }
    : { startMonth: endMonth, endMonth: startMonth };
}

// Every 'YYYY-MM' in [startMonth, endMonth], inclusive — used so months with no
// activity still show up (as a zero) instead of silently disappearing from a chart.
export function monthsInRange(startMonth: string, endMonth: string): string[] {
  const months: string[] = [];
  for (let month = startMonth; month <= endMonth; month = shiftMonth(month, 1)) {
    months.push(month);
  }
  return months;
}
