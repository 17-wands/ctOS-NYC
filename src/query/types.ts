import type { StopId } from 'minotor';

/** Query mode: depart at a specific time, or arrive by a specific time. */
export type QueryMode = 'depart-at' | 'arrive-by';

/** Complete trip query ready for the router. */
export type TripQuery = {
  origin: StopId | null;
  destination: StopId | null;
  mode: QueryMode;
  dateTime: Date;
};

/** Validation result for a trip query. */
export type QueryValidation = {
  isValid: boolean;
  errors: {
    origin?: string;
    destination?: string;
    dateTime?: string;
  };
};

/** Geolocation error types. */
export type GeolocationError =
  | 'permission-denied'
  | 'position-unavailable'
  | 'timeout'
  | 'no-stops-found';
