import { describe, expect, it } from 'vitest';
import {
  dateToMinutesFromMidnight,
  formatDuration,
  formatTime,
  minutesFromMidnightToDate,
} from './time';

describe('dateToMinutesFromMidnight', () => {
  it('converts midnight to 0', () => {
    const date = new Date('2026-05-20T00:00:00Z');
    expect(dateToMinutesFromMidnight(date)).toBe(0);
  });

  it('converts 1:00 AM to 60', () => {
    const date = new Date('2026-05-20T01:00:00Z');
    expect(dateToMinutesFromMidnight(date)).toBe(60);
  });

  it('converts 2:30 PM to 870', () => {
    const date = new Date('2026-05-20T14:30:00Z');
    expect(dateToMinutesFromMidnight(date)).toBe(870);
  });

  it('converts 11:59 PM to 1439', () => {
    const date = new Date('2026-05-20T23:59:00Z');
    expect(dateToMinutesFromMidnight(date)).toBe(1439);
  });
});

describe('minutesFromMidnightToDate', () => {
  it('converts 0 to midnight on reference date', () => {
    const reference = new Date('2026-05-20T10:00:00Z');
    const result = minutesFromMidnightToDate(0, reference);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
  });

  it('converts 870 to 2:30 PM on reference date', () => {
    const reference = new Date('2026-05-20T10:00:00Z');
    const result = minutesFromMidnightToDate(870, reference);
    expect(result.getUTCHours()).toBe(14);
    expect(result.getUTCMinutes()).toBe(30);
  });

  it('preserves date components from reference', () => {
    const reference = new Date('2026-05-20T10:00:00Z');
    const result = minutesFromMidnightToDate(60, reference);
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(4); // May is month 4 (0-indexed)
    expect(result.getUTCDate()).toBe(20);
  });
});

describe('formatTime', () => {
  it('formats midnight as 12:00 AM', () => {
    const date = new Date('2026-05-20T00:00:00Z');
    expect(formatTime(date)).toBe('12:00 AM');
  });

  it('formats noon as 12:00 PM', () => {
    const date = new Date('2026-05-20T12:00:00Z');
    expect(formatTime(date)).toBe('12:00 PM');
  });

  it('formats 9:05 AM with leading zero', () => {
    const date = new Date('2026-05-20T09:05:00Z');
    expect(formatTime(date)).toBe('9:05 AM');
  });

  it('formats 2:30 PM correctly', () => {
    const date = new Date('2026-05-20T14:30:00Z');
    expect(formatTime(date)).toBe('2:30 PM');
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
