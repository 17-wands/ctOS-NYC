import type { Itinerary, ItineraryLeg } from './types';
import type { Alert, TripDelay, AccessibilityOutage } from '../realtime/types';

export type LegDisruption = {
  severity: 'warning' | 'critical'; // DEGRADED or BREACH
  alerts: Alert[];
  delays?: TripDelay;
  accessibilityIssue?: AccessibilityOutage;
};

export type AnnotatedItineraryLeg = ItineraryLeg & {
  disruption?: LegDisruption;
};

export type AnnotatedItinerary = Omit<Itinerary, 'legs'> & {
  legs: AnnotatedItineraryLeg[];
  worstSeverity?: 'warning' | 'critical';
};
