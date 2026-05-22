import type { Time } from 'minotor';

/**
 * Time helpers anchored to the MTA's local zone.
 *
 * minotor models time as minutes from the *local* midnight of a service day, and
 * GTFS stop times are local clock times. So every conversion between a wall-clock
 * minute count and an absolute instant must go through America/New_York — not UTC.
 * (An earlier version used `getUTCHours`, which was wrong by the NYC offset and
 * could not anchor multi-day windows.)
 */
export const SCHEDULE_TIMEZONE = 'America/New_York';

type Wall = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const wallFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: SCHEDULE_TIMEZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** The NYC wall-clock components of an absolute instant. */
function nycWall(instant: Date): Wall {
  const parts: Record<string, string> = {};
  for (const part of wallFormatter.formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** NYC's UTC offset (in minutes) at a given instant. EDT = -240, EST = -300. */
function nycOffsetMinutes(instant: Date): number {
  const w = nycWall(instant);
  const wallAsUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return (wallAsUtc - instant.getTime()) / 60000;
}

/** The NYC calendar date (YYYY-MM-DD) an instant falls on. */
export function nycDateString(instant: Date): string {
  const w = nycWall(instant);
  return `${w.year}-${String(w.month).padStart(2, '0')}-${String(w.day).padStart(2, '0')}`;
}

/**
 * The absolute instant of NYC-local midnight for a service date (YYYY-MM-DD).
 * Uses the standard wall-time→instant offset correction, re-checked once to stay
 * correct across the spring-forward / fall-back transitions.
 */
export function nycMidnight(serviceDate: string): Date {
  const guess = new Date(`${serviceDate}T00:00:00Z`);
  const offset = nycOffsetMinutes(guess);
  let instant = new Date(guess.getTime() - offset * 60000);
  const corrected = nycOffsetMinutes(instant);
  if (corrected !== offset) {
    instant = new Date(guess.getTime() - corrected * 60000);
  }
  return instant;
}

/** Whole minutes between two instants (to - from), rounded. */
export function minutesBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 60000);
}

/** Minutes from NYC-local midnight of the instant's NYC day (0..1439). */
export function dateToMinutesFromMidnight(date: Date): Time {
  const w = nycWall(date);
  return (w.hour * 60 + w.minute) as Time;
}

/**
 * Reconstruct an absolute instant from minutes-after-NYC-midnight, anchored to
 * the NYC day of `referenceDate`. `minutes` may exceed 1439 to model after-
 * midnight (next-day) service, which rolls the instant forward correctly.
 */
export function minutesFromMidnightToDate(minutes: Time, referenceDate: Date): Date {
  const midnight = nycMidnight(nycDateString(referenceDate));
  return new Date(midnight.getTime() + minutes * 60000);
}

/** Format an instant as a 12-hour NYC wall-clock time, e.g. "2:30 PM". */
export function formatTime(date: Date): string {
  const w = nycWall(date);
  const period = w.hour >= 12 ? 'PM' : 'AM';
  const displayHours = w.hour % 12 || 12;
  const displayMinutes = w.minute.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${period}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}M`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}H`;
  }
  return `${hours}H ${remainingMinutes}M`;
}
