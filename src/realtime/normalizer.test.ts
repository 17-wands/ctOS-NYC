import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { transit_realtime } from 'gtfs-realtime-bindings';
import { normalizeAlerts, normalizeTripDelays, normalizeAccessibilityOutages } from './normalizer';

describe('normalizeAlerts', () => {
  it('normalizes service alerts feed from captured protobuf', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'alerts.pb');
    const buffer = fs.readFileSync(fixturePath);
    const feed = transit_realtime.FeedMessage.decode(buffer);

    const alerts = normalizeAlerts(feed);

    expect(alerts).toBeInstanceOf(Array);
    // MTA typically has many alerts
    expect(alerts.length).toBeGreaterThan(0);

    // Verify structure of first alert
    const firstAlert = alerts[0];
    expect(firstAlert).toHaveProperty('id');
    expect(firstAlert).toHaveProperty('severity');
    expect(['SYSTEM', 'DEGRADED', 'BREACH']).toContain(firstAlert?.severity);
    expect(firstAlert).toHaveProperty('header');
    expect(firstAlert).toHaveProperty('description');
    expect(firstAlert).toHaveProperty('routeIds');
    expect(firstAlert).toHaveProperty('stopIds');
    expect(firstAlert).toHaveProperty('activePeriod');
    expect(firstAlert?.activePeriod).toHaveProperty('start');
    expect(firstAlert?.activePeriod).toHaveProperty('end');
  });

  it('returns empty array when feed has no entities', () => {
    const emptyFeed = transit_realtime.FeedMessage.create({
      header: {
        gtfsRealtimeVersion: '2.0',
        incrementality: transit_realtime.FeedHeader.Incrementality.FULL_DATASET,
        timestamp: Date.now() / 1000,
      },
      entity: [],
    });

    const alerts = normalizeAlerts(emptyFeed);

    expect(alerts).toEqual([]);
  });

  it('handles alerts with missing optional fields', () => {
    const feed = transit_realtime.FeedMessage.create({
      header: {
        gtfsRealtimeVersion: '2.0',
        incrementality: transit_realtime.FeedHeader.Incrementality.FULL_DATASET,
        timestamp: Date.now() / 1000,
      },
      entity: [
        {
          id: 'test-alert-1',
          alert: {
            // Minimal alert with no optional fields
            effect: transit_realtime.Alert.Effect.SIGNIFICANT_DELAYS,
          },
        },
      ],
    });

    const alerts = normalizeAlerts(feed);

    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.severity).toBe('DEGRADED');
    expect(alerts[0]?.header).toBe('Service Alert');
    expect(alerts[0]?.description).toBe('');
    expect(alerts[0]?.routeIds).toEqual([]);
    expect(alerts[0]?.stopIds).toEqual([]);
  });
});

describe('normalizeTripDelays', () => {
  it('normalizes trip updates feed from captured protobuf', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'trip-updates.pb');
    const buffer = fs.readFileSync(fixturePath);
    const feed = transit_realtime.FeedMessage.decode(buffer);

    const delays = normalizeTripDelays([feed]);

    expect(delays).toBeInstanceOf(Array);

    // If there are delays, verify structure
    if (delays.length > 0) {
      const firstDelay = delays[0];
      expect(firstDelay).toHaveProperty('routeId');
      expect(firstDelay).toHaveProperty('stopId');
      expect(firstDelay).toHaveProperty('delaySeconds');
      expect(typeof firstDelay?.delaySeconds).toBe('number');
    }
  });

  it('returns empty array when feeds have no trip updates', () => {
    const emptyFeed = transit_realtime.FeedMessage.create({
      header: {
        gtfsRealtimeVersion: '2.0',
        incrementality: transit_realtime.FeedHeader.Incrementality.FULL_DATASET,
        timestamp: Date.now() / 1000,
      },
      entity: [],
    });

    const delays = normalizeTripDelays([emptyFeed]);

    expect(delays).toEqual([]);
  });

  it('handles trip updates with delays', () => {
    const feed = transit_realtime.FeedMessage.create({
      header: {
        gtfsRealtimeVersion: '2.0',
        incrementality: transit_realtime.FeedHeader.Incrementality.FULL_DATASET,
        timestamp: Date.now() / 1000,
      },
      entity: [
        {
          id: 'trip-1',
          tripUpdate: {
            trip: {
              tripId: 'test-trip',
              routeId: 'A',
            },
            stopTimeUpdate: [
              {
                stopSequence: 1,
                stopId: 'A24',
                arrival: {
                  delay: 120,
                },
              },
              {
                stopSequence: 2,
                stopId: 'A27',
                departure: {
                  delay: 180,
                },
              },
            ],
          },
        },
      ],
    });

    const delays = normalizeTripDelays([feed]);

    expect(delays).toHaveLength(2);
    expect(delays[0]).toEqual({
      routeId: 'A',
      stopId: 'A24',
      delaySeconds: 120,
    });
    expect(delays[1]).toEqual({
      routeId: 'A',
      stopId: 'A27',
      delaySeconds: 180,
    });
  });
});

describe('normalizeAccessibilityOutages', () => {
  it.skip('normalizes accessibility feed from captured protobuf', () => {
    // Skipped: MTA accessibility feed (nyct_ene) returned XML error at capture time.
    // Test structure is validated via synthetic tests below.
    const fixturePath = path.join(__dirname, 'fixtures', 'accessibility.pb');
    const buffer = fs.readFileSync(fixturePath);
    const feed = transit_realtime.FeedMessage.decode(buffer);

    const outages = normalizeAccessibilityOutages(feed);

    expect(outages).toBeInstanceOf(Array);

    // If there are outages, verify structure
    if (outages.length > 0) {
      const firstOutage = outages[0];
      expect(firstOutage).toHaveProperty('stationId');
      expect(firstOutage).toHaveProperty('equipmentType');
      expect(['ELEVATOR', 'ESCALATOR']).toContain(firstOutage?.equipmentType);
      expect(firstOutage).toHaveProperty('status');
      expect(firstOutage?.status).toBe('OUT');
      expect(firstOutage).toHaveProperty('reason');
      expect(firstOutage).toHaveProperty('estimatedReturn');
    }
  });

  it('returns empty array when feed has no entities', () => {
    const emptyFeed = transit_realtime.FeedMessage.create({
      header: {
        gtfsRealtimeVersion: '2.0',
        incrementality: transit_realtime.FeedHeader.Incrementality.FULL_DATASET,
        timestamp: Date.now() / 1000,
      },
      entity: [],
    });

    const outages = normalizeAccessibilityOutages(emptyFeed);

    expect(outages).toEqual([]);
  });

  it('identifies elevator outages from alert text', () => {
    const feed = transit_realtime.FeedMessage.create({
      header: {
        gtfsRealtimeVersion: '2.0',
        incrementality: transit_realtime.FeedHeader.Incrementality.FULL_DATASET,
        timestamp: Date.now() / 1000,
      },
      entity: [
        {
          id: 'elevator-outage-1',
          alert: {
            headerText: {
              translation: [{ text: 'Elevator Outage at 14 St - Union Sq' }],
            },
            descriptionText: {
              translation: [{ text: 'The elevator is currently out of service' }],
            },
            informedEntity: [{ stopId: 'L03' }],
          },
        },
      ],
    });

    const outages = normalizeAccessibilityOutages(feed);

    expect(outages).toHaveLength(1);
    expect(outages[0]).toMatchObject({
      stationId: 'L03',
      equipmentType: 'ELEVATOR',
      status: 'OUT',
      reason: 'The elevator is currently out of service',
    });
  });

  it('identifies escalator outages from alert text', () => {
    const feed = transit_realtime.FeedMessage.create({
      header: {
        gtfsRealtimeVersion: '2.0',
        incrementality: transit_realtime.FeedHeader.Incrementality.FULL_DATASET,
        timestamp: Date.now() / 1000,
      },
      entity: [
        {
          id: 'escalator-outage-1',
          alert: {
            headerText: {
              translation: [{ text: 'Escalator not working' }],
            },
            descriptionText: {
              translation: [{ text: 'The escalator is under maintenance' }],
            },
            informedEntity: [{ stopId: 'A24' }],
          },
        },
      ],
    });

    const outages = normalizeAccessibilityOutages(feed);

    expect(outages).toHaveLength(1);
    expect(outages[0]).toMatchObject({
      stationId: 'A24',
      equipmentType: 'ESCALATOR',
      status: 'OUT',
      reason: 'The escalator is under maintenance',
    });
  });
});
