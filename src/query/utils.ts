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
 * Formats a Date for use with datetime-local input.
 * Returns ISO 8601 format truncated to minutes: YYYY-MM-DDTHH:MM
 *
 * @param date - The date to format
 * @returns Formatted string for datetime-local input
 */
export function formatDateTimeLocal(date: Date): string {
  return date.toISOString().slice(0, 16);
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

  if (!query.origin) {
    errors.origin = 'ORIGIN REQUIRED';
  }
  if (!query.destination) {
    errors.destination = 'DESTINATION REQUIRED';
  }
  if (query.origin && query.destination && query.origin === query.destination) {
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
