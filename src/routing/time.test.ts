import { describe, expect, it } from 'vitest';
import {
  dateToMinutesFromMidnight,
  formatDuration,
  formatTime,
  minutesBetween,
  minutesFromMidnightToDate,
  nycDateString,
  nycMidnight,
} from './time';

// May 2026 is EDT (UTC-4). Instants below carry an explicit -04:00 offset so the
// NYC wall-clock intent is unambiguous regardless of the test runner's zone.

describe('dateToMinutesFromMidnight', () => {
  it('converts NYC midnight to 0', () => {
    expect(dateToMinutesFromMidnight(new Date('2026-05-20T00:00:00-04:00'))).toBe(0);
  });

  it('converts 1:00 AM NYC to 60', () => {
    expect(dateToMinutesFromMidnight(new Date('2026-05-20T01:00:00-04:00'))).toBe(60);
  });

  it('converts 2:30 PM NYC to 870', () => {
    expect(dateToMinutesFromMidnight(new Date('2026-05-20T14:30:00-04:00'))).toBe(870);
  });

  it('converts 11:59 PM NYC to 1439', () => {
    expect(dateToMinutesFromMidnight(new Date('2026-05-20T23:59:00-04:00'))).toBe(1439);
  });

  it('reads the NYC wall clock, not UTC', () => {
    // 04:00 UTC is midnight EDT.
    expect(dateToMinutesFromMidnight(new Date('2026-05-20T04:00:00Z'))).toBe(0);
  });
});

describe('nycMidnight', () => {
  it('returns the EDT midnight instant for a summer date', () => {
    expect(nycMidnight('2026-05-20').toISOString()).toBe('2026-05-20T04:00:00.000Z');
  });

  it('returns the EST midnight instant for a winter date', () => {
    expect(nycMidnight('2026-01-15').toISOString()).toBe('2026-01-15T05:00:00.000Z');
  });
});

describe('nycDateString', () => {
  it('uses the NYC calendar day, which can differ from the UTC day', () => {
    // 02:00 UTC on the 21st is still 22:00 EDT on the 20th in NYC.
    expect(nycDateString(new Date('2026-05-21T02:00:00Z'))).toBe('2026-05-20');
  });
});

describe('minutesFromMidnightToDate', () => {
  it('converts 0 to NYC midnight on the reference NYC day', () => {
    const reference = new Date('2026-05-20T14:00:00-04:00');
    expect(minutesFromMidnightToDate(0, reference).toISOString()).toBe('2026-05-20T04:00:00.000Z');
  });

  it('converts 870 to 2:30 PM NYC', () => {
    const reference = new Date('2026-05-20T10:00:00-04:00');
    expect(formatTime(minutesFromMidnightToDate(870, reference))).toBe('2:30 PM');
  });

  it('rolls past midnight for after-midnight (>1439) service times', () => {
    const reference = new Date('2026-05-20T23:00:00-04:00');
    const result = minutesFromMidnightToDate(1470, reference); // 24:30 -> 00:30 next day
    expect(nycDateString(result)).toBe('2026-05-21');
    expect(formatTime(result)).toBe('12:30 AM');
  });
});

describe('minutesBetween', () => {
  it('returns whole minutes between two instants', () => {
    const a = new Date('2026-05-20T10:00:00-04:00');
    const b = new Date('2026-05-20T11:30:00-04:00');
    expect(minutesBetween(a, b)).toBe(90);
  });

  it('is negative when the second instant is earlier', () => {
    const a = new Date('2026-05-20T11:30:00-04:00');
    const b = new Date('2026-05-20T10:00:00-04:00');
    expect(minutesBetween(a, b)).toBe(-90);
  });
});

describe('formatTime', () => {
  it('formats NYC midnight as 12:00 AM', () => {
    expect(formatTime(new Date('2026-05-20T00:00:00-04:00'))).toBe('12:00 AM');
  });

  it('formats NYC noon as 12:00 PM', () => {
    expect(formatTime(new Date('2026-05-20T12:00:00-04:00'))).toBe('12:00 PM');
  });

  it('formats 9:05 AM NYC with leading zero', () => {
    expect(formatTime(new Date('2026-05-20T09:05:00-04:00'))).toBe('9:05 AM');
  });

  it('formats 2:30 PM NYC correctly', () => {
    expect(formatTime(new Date('2026-05-20T14:30:00-04:00'))).toBe('2:30 PM');
  });
});

describe('formatDuration', () => {
  it('formats less than 60 minutes with M suffix', () => {
    expect(formatDuration(5)).toBe('5M');
    expect(formatDuration(45)).toBe('45M');
    expect(formatDuration(59)).toBe('59M');
  });

  it('formats exact hours without minutes', () => {
    expect(formatDuration(60)).toBe('1H');
    expect(formatDuration(120)).toBe('2H');
  });

  it('formats hours and minutes combined', () => {
    expect(formatDuration(65)).toBe('1H 5M');
    expect(formatDuration(90)).toBe('1H 30M');
    expect(formatDuration(137)).toBe('2H 17M');
  });
});
