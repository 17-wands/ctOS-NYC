import type { Time } from 'minotor';

export function dateToMinutesFromMidnight(date: Date): Time {
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  return (hours * 60 + minutes) as Time;
}

export function minutesFromMidnightToDate(minutes: Time, referenceDate: Date): Date {
  const result = new Date(referenceDate);
  result.setUTCHours(0, 0, 0, 0);
  result.setUTCMinutes(minutes);
  return result;
}

export function formatTime(date: Date): string {
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
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
