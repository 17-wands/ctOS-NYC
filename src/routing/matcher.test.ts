import { describe, expect, it } from 'vitest';
import { annotateItinerary } from './matcher';
import type { Itinerary } from './types';
import type { Alert, TripDelay, AccessibilityOutage } from '../realtime/types';

describe('annotateItinerary', () => {
  const mockItinerary: Itinerary = {
    departureTime: new Date('2026-05-21T09:00:00Z'),
    arrivalTime: new Date('2026-05-21T09:30:00Z'),
    totalDuration: 30,
    transferCount: 1,
    legs: [
      {
        type: 'vehicle',
        fromStopId: 1,
        toStopId: 2,
        fromStopName: '14 St - Union Sq',
        toStopName: 'Times Sq - 42 St',
        departureTime: new Date('2026-05-21T09:00:00Z'),
        arrivalTime: new Date('2026-05-21T09:15:00Z'),
        duration: 15,
        routeName: 'L',
        routeShortName: 'L',
      },
      {
        type: 'transfer',
        fromStopId: 2,
        toStopId: 3,
        fromStopName: 'Times Sq - 42 St',
        toStopName: 'Times Sq - 42 St',
        departureTime: new Date('2026-05-21T09:15:00Z'),
        arrivalTime: new Date('2026-05-21T09:20:00Z'),
        duration: 5,
      },
      {
        type: 'vehicle',
        fromStopId: 3,
        toStopId: 4,
        fromStopName: 'Times Sq - 42 St',
        toStopName: 'Grand Central - 42 St',
        departureTime: new Date('2026-05-21T09:20:00Z'),
        arrivalTime: new Date('2026-05-21T09:30:00Z'),
        duration: 10,
        routeName: '7',
        routeShortName: '7',
      },
    ],
  };

  it('annotates legs with matching route alerts', () => {
    const alerts: Alert[] = [
      {
        id: 'alert-1',
        severity: 'DEGRADED',
        header: 'L train delays',
        description: 'Delays due to signal problems',
        routeIds: ['L'],
        stopIds: [],
        activePeriod: {
          start: '2026-05-21T08:00:00Z',
          end: null,
        },
      },
    ];

    const annotated = annotateItinerary(mockItinerary, {
      alerts,
      tripDelays: [],
      accessibilityOutages: [],
    });

    expect(annotated.legs[0]?.disruption).toBeDefined();
    expect(annotated.legs[0]?.disruption?.severity).toBe('warning');
    expect(annotated.legs[0]?.disruption?.alerts).toHaveLength(1);
    expect(annotated.legs[0]?.disruption?.alerts[0]?.id).toBe('alert-1');
    expect(annotated.worstSeverity).toBe('warning');
  });

  it('annotates legs with matching stop alerts', () => {
    const alerts: Alert[] = [
      {
        id: 'alert-2',
        severity: 'BREACH',
        header: 'Station closed',
        description: 'Grand Central station temporarily closed',
        routeIds: [],
        stopIds: ['4'],
        activePeriod: {
          start: '2026-05-21T09:00:00Z',
          end: '2026-05-21T11:00:00Z',
        },
      },
    ];

    const annotated = annotateItinerary(mockItinerary, {
      alerts,
      tripDelays: [],
      accessibilityOutages: [],
    });

    expect(annotated.legs[2]?.disruption).toBeDefined();
    expect(annotated.legs[2]?.disruption?.severity).toBe('critical');
    expect(annotated.legs[2]?.disruption?.alerts[0]?.id).toBe('alert-2');
    expect(annotated.worstSeverity).toBe('critical');
  });

  it('annotates legs with trip delays', () => {
    const delays: TripDelay[] = [
      {
        routeId: 'L',
        stopId: '1',
        delaySeconds: 180,
      },
    ];

    const annotated = annotateItinerary(mockItinerary, {
      alerts: [],
      tripDelays: delays,
      accessibilityOutages: [],
    });

    expect(annotated.legs[0]?.disruption).toBeDefined();
    expect(annotated.legs[0]?.disruption?.delays).toBeDefined();
    expect(annotated.legs[0]?.disruption?.delays?.delaySeconds).toBe(180);
  });

  it('annotates legs with accessibility outages', () => {
    const outages: AccessibilityOutage[] = [
      {
        stationId: '2',
        equipmentType: 'ELEVATOR',
        status: 'OUT',
        reason: 'Under maintenance',
        estimatedReturn: '2026-05-21T15:00:00Z',
      },
    ];

    const annotated = annotateItinerary(mockItinerary, {
      alerts: [],
      tripDelays: [],
      accessibilityOutages: outages,
    });

    expect(annotated.legs[0]?.disruption).toBeDefined();
    expect(annotated.legs[0]?.disruption?.accessibilityIssue).toBeDefined();
    expect(annotated.legs[0]?.disruption?.accessibilityIssue?.equipmentType).toBe('ELEVATOR');
  });

  it('does not annotate transfer legs', () => {
    const alerts: Alert[] = [
      {
        id: 'alert-3',
        severity: 'DEGRADED',
        header: 'General delays',
        description: 'System-wide delays',
        routeIds: [],
        stopIds: ['2', '3'],
        activePeriod: {
          start: '2026-05-21T08:00:00Z',
          end: null,
        },
      },
    ];

    const annotated = annotateItinerary(mockItinerary, {
      alerts,
      tripDelays: [],
      accessibilityOutages: [],
    });

    // Transfer leg should not have disruption annotation
    expect(annotated.legs[1]?.disruption).toBeUndefined();
  });

  it('returns empty annotations when no realtime data', () => {
    const annotated = annotateItinerary(mockItinerary, {
      alerts: [],
      tripDelays: [],
      accessibilityOutages: [],
    });

    expect(annotated.legs[0]?.disruption).toBeUndefined();
    expect(annotated.legs[2]?.disruption).toBeUndefined();
    expect(annotated.worstSeverity).toBeUndefined();
  });

  it('does not match alerts from different routes/stops', () => {
    const alerts: Alert[] = [
      {
        id: 'alert-4',
        severity: 'BREACH',
        header: 'A train delays',
        description: 'Not related to L or 7 trains',
        routeIds: ['A'],
        stopIds: ['100'],
        activePeriod: {
          start: '2026-05-21T08:00:00Z',
          end: null,
        },
      },
    ];

    const annotated = annotateItinerary(mockItinerary, {
      alerts,
      tripDelays: [],
      accessibilityOutages: [],
    });

    expect(annotated.legs[0]?.disruption).toBeUndefined();
    expect(annotated.legs[2]?.disruption).toBeUndefined();
    expect(annotated.worstSeverity).toBeUndefined();
  });

  it('determines worst severity across multiple legs', () => {
    const alerts: Alert[] = [
      {
        id: 'alert-5',
        severity: 'DEGRADED',
        header: 'L train delays',
        description: 'Minor delays',
        routeIds: ['L'],
        stopIds: [],
        activePeriod: {
          start: '2026-05-21T08:00:00Z',
          end: null,
        },
      },
      {
        id: 'alert-6',
        severity: 'BREACH',
        header: '7 train suspended',
        description: 'Major disruption',
        routeIds: ['7'],
        stopIds: [],
        activePeriod: {
          start: '2026-05-21T09:00:00Z',
          end: null,
        },
      },
    ];

    const annotated = annotateItinerary(mockItinerary, {
      alerts,
      tripDelays: [],
      accessibilityOutages: [],
    });

    // First leg has warning (DEGRADED)
    expect(annotated.legs[0]?.disruption?.severity).toBe('warning');
    // Third leg has critical (BREACH)
    expect(annotated.legs[2]?.disruption?.severity).toBe('critical');
    // Worst severity across all legs is critical
    expect(annotated.worstSeverity).toBe('critical');
  });
});
