import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  debounce,
  formatDateTimeLocal,
  parseDateTimeLocal,
  roundToNextFiveMinutes,
  validateQuery,
} from './utils';
import type { TripQuery } from './types';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delays function execution by the specified time', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced('test');
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledWith('test');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancels previous calls when invoked again before delay elapses', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced('first');
    vi.advanceTimersByTime(100);
    debounced('second');
    vi.advanceTimersByTime(100);
    debounced('third');
    vi.advanceTimersByTime(200);

    expect(fn).toHaveBeenCalledWith('third');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes all arguments to the debounced function', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced('arg1', 'arg2', 42);
    vi.advanceTimersByTime(200);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2', 42);
  });
});

describe('roundToNextFiveMinutes', () => {
  it('rounds to the next 5-minute interval', () => {
    const date = new Date('2026-05-20T14:22:37Z');
    const rounded = roundToNextFiveMinutes(date);
    expect(rounded.toISOString()).toBe('2026-05-20T14:25:00.000Z');
  });

  it('does not change a date already on a 5-minute mark', () => {
    const date = new Date('2026-05-20T14:25:00Z');
    const rounded = roundToNextFiveMinutes(date);
    expect(rounded.toISOString()).toBe('2026-05-20T14:25:00.000Z');
  });

  it('rounds up from 1 second past a 5-minute mark', () => {
    const date = new Date('2026-05-20T14:25:01Z');
    const rounded = roundToNextFiveMinutes(date);
    expect(rounded.toISOString()).toBe('2026-05-20T14:30:00.000Z');
  });

  it('handles midnight boundary correctly', () => {
    const date = new Date('2026-05-20T23:58:00Z');
    const rounded = roundToNextFiveMinutes(date);
    expect(rounded.toISOString()).toBe('2026-05-21T00:00:00.000Z');
  });
});

describe('formatDateTimeLocal', () => {
  it('formats a date in YYYY-MM-DDTHH:MM format', () => {
    const date = new Date('2026-05-20T14:22:37.123Z');
    const formatted = formatDateTimeLocal(date);
    expect(formatted).toBe('2026-05-20T14:22');
  });

  it('preserves timezone when formatting (returns UTC)', () => {
    const date = new Date('2026-01-15T09:05:00.000Z');
    const formatted = formatDateTimeLocal(date);
    expect(formatted).toBe('2026-01-15T09:05');
  });
});

describe('parseDateTimeLocal', () => {
  it('parses a datetime-local string to a Date', () => {
    const str = '2026-05-20T14:22';
    const parsed = parseDateTimeLocal(str);
    // datetime-local treats the string as local time, so we just verify it parses
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(4); // May is month 4 (0-indexed)
    expect(parsed.getDate()).toBe(20);
  });

  it('formats to a string that parseDateTimeLocal can read', () => {
    const original = new Date('2026-05-20T14:22:00.000Z');
    const formatted = formatDateTimeLocal(original);
    // Verify format is correct for datetime-local input
    expect(formatted).toBe('2026-05-20T14:22');
    // Verify it can be parsed back (may differ due to timezone)
    const parsed = parseDateTimeLocal(formatted);
    expect(parsed).toBeInstanceOf(Date);
    expect(isNaN(parsed.getTime())).toBe(false);
  });
});

describe('validateQuery', () => {
  const validQuery: TripQuery = {
    origin: 1,
    destination: 2,
    mode: 'depart-at',
    dateTime: new Date(Date.now() + 60000), // 1 minute in future
  };

  it('validates a complete and correct query', () => {
    const result = validateQuery(validQuery);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('fails when origin is missing', () => {
    const query = { ...validQuery, origin: null };
    const result = validateQuery(query);
    expect(result.isValid).toBe(false);
    expect(result.errors.origin).toBe('ORIGIN REQUIRED');
  });

  it('fails when destination is missing', () => {
    const query = { ...validQuery, destination: null };
    const result = validateQuery(query);
    expect(result.isValid).toBe(false);
    expect(result.errors.destination).toBe('DESTINATION REQUIRED');
  });

  it('fails when origin and destination are the same', () => {
    const query = { ...validQuery, origin: 1, destination: 1 };
    const result = validateQuery(query);
    expect(result.isValid).toBe(false);
    expect(result.errors.destination).toBe('DESTINATION MUST DIFFER FROM ORIGIN');
  });

  it('treats stop id 0 as a valid origin and destination', () => {
    // StopId is the row order of stops.txt, so the first stop has id 0.
    const result = validateQuery({ ...validQuery, origin: 0, destination: 1 });
    expect(result.isValid).toBe(true);
    expect(result.errors.origin).toBeUndefined();

    const swapped = validateQuery({ ...validQuery, origin: 1, destination: 0 });
    expect(swapped.isValid).toBe(true);
    expect(swapped.errors.destination).toBeUndefined();
  });

  it('fails when dateTime is in the past', () => {
    const query = { ...validQuery, dateTime: new Date(Date.now() - 60000) };
    const result = validateQuery(query);
    expect(result.isValid).toBe(false);
    expect(result.errors.dateTime).toBe('TIME CANNOT BE IN THE PAST');
  });

  it('accumulates multiple errors', () => {
    const query: TripQuery = {
      origin: null,
      destination: null,
      mode: 'depart-at',
      dateTime: new Date(Date.now() - 60000),
    };
    const result = validateQuery(query);
    expect(result.isValid).toBe(false);
    expect(result.errors.origin).toBe('ORIGIN REQUIRED');
    expect(result.errors.destination).toBe('DESTINATION REQUIRED');
    expect(result.errors.dateTime).toBe('TIME CANNOT BE IN THE PAST');
  });
});
