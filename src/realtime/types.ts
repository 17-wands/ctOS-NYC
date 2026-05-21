export type Severity = 'SYSTEM' | 'DEGRADED' | 'BREACH';

export type Alert = {
  id: string;
  severity: Severity;
  header: string;
  description: string;
  routeIds: string[];
  stopIds: string[];
  activePeriod: {
    start: string; // ISO-8601
    end: string | null;
  };
};

export type TripDelay = {
  routeId: string;
  stopId: string;
  delaySeconds: number;
};

export type AccessibilityOutage = {
  stationId: string;
  equipmentType: 'ELEVATOR' | 'ESCALATOR';
  status: 'OUT';
  reason: string;
  estimatedReturn: string | null;
};

export type RealtimeResponse = {
  generatedAt: string; // ISO-8601
  alerts: Alert[];
  tripDelays: TripDelay[];
  accessibilityOutages: AccessibilityOutage[];
};
