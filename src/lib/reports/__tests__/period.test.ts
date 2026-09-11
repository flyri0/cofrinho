import { monthsInRange, normalizePeriodRange, resolvePeriodPreset } from '../period';

describe('resolvePeriodPreset', () => {
  it('resolves thisMonth to a single-month range', () => {
    expect(resolvePeriodPreset('thisMonth', '2026-05')).toEqual({
      startMonth: '2026-05',
      endMonth: '2026-05',
    });
  });

  it('resolves last3 to a 3-month range ending at the current month', () => {
    expect(resolvePeriodPreset('last3', '2026-05')).toEqual({
      startMonth: '2026-03',
      endMonth: '2026-05',
    });
  });

  it('resolves last6 across a year boundary', () => {
    expect(resolvePeriodPreset('last6', '2026-02')).toEqual({
      startMonth: '2025-09',
      endMonth: '2026-02',
    });
  });

  it('resolves last12 to a full year ending at the current month', () => {
    expect(resolvePeriodPreset('last12', '2026-05')).toEqual({
      startMonth: '2025-06',
      endMonth: '2026-05',
    });
  });
});

describe('normalizePeriodRange', () => {
  it('keeps an already-ordered range unchanged', () => {
    expect(normalizePeriodRange('2026-01', '2026-03')).toEqual({
      startMonth: '2026-01',
      endMonth: '2026-03',
    });
  });

  it('swaps a reversed range', () => {
    expect(normalizePeriodRange('2026-03', '2026-01')).toEqual({
      startMonth: '2026-01',
      endMonth: '2026-03',
    });
  });

  it('handles a single-month range (start equals end)', () => {
    expect(normalizePeriodRange('2026-01', '2026-01')).toEqual({
      startMonth: '2026-01',
      endMonth: '2026-01',
    });
  });
});

describe('monthsInRange', () => {
  it('lists every month, inclusive, for a normal range', () => {
    expect(monthsInRange('2026-01', '2026-04')).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
    ]);
  });

  it('returns a single month when start equals end', () => {
    expect(monthsInRange('2026-05', '2026-05')).toEqual(['2026-05']);
  });

  it('crosses a year boundary', () => {
    expect(monthsInRange('2025-11', '2026-02')).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
  });
});
