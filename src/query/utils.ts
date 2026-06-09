import type { TripQuery, QueryValidation } from './types';

/**
 * Debounces a function call by a specified delay.
 * Useful for search inputs to prevent excessive queries.
 *
 * @param fn - The function to debounce
 * @param delayMs - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: never[]) => unknown>(
  fn: T,
  delayMs: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };
}

/**
 * Rounds a date to the next 5-minute interval.
 * Used for default time picker values.
 *
 * @param date - The date to round
 * @returns Date rounded to next 5-minute mark
 */
export function roundToNextFiveMinutes(date: Date): Date {
  const ms = 1000 * 60 * 5; // 5 minutes in milliseconds
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

/**
 * Formats a Date for use with a `datetime-local` input.
 *
 * `datetime-local` values are interpreted as **local (wall-clock) time**, not
 * UTC. Using `toISOString()` here would display the wrong hour for any user
 * outside UTC. We use local date-getters so the input always shows the correct
 * local time.
 *
 * @param date - The date to format
 * @returns Local-time string in `YYYY-MM-DDTHH:MM` format
 */
export function formatDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * Parses a datetime-local input value to a Date.
 *
 * @param str - The datetime-local string (YYYY-MM-DDTHH:MM)
 * @returns Parsed Date object
 */
export function parseDateTimeLocal(str: string): Date {
  return new Date(str);
}

/**
 * Validates a complete trip query.
 * Checks for required fields and logical consistency.
 *
 * @param query - The trip query to validate
 * @returns Validation result with isValid flag and error messages
 */
export function validateQuery(query: TripQuery): QueryValidation {
  const errors: QueryValidation['errors'] = {};

  // StopId is a number and can legitimately be 0 (the first stop in the feed),
  // so check for null explicitly rather than falsiness.
  if (query.origin === null) {
    errors.origin = 'ORIGIN REQUIRED';
  }
  if (query.destination === null) {
    errors.destination = 'DESTINATION REQUIRED';
  }
  if (query.origin !== null && query.destination !== null && query.origin === query.destination) {
    errors.destination = 'DESTINATION MUST DIFFER FROM ORIGIN';
  }
  if (query.dateTime < new Date()) {
    errors.dateTime = 'TIME CANNOT BE IN THE PAST';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
