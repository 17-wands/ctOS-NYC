import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ItineraryPanel } from './ItineraryPanel';
import type { Itinerary } from '../routing/types';

describe('ItineraryPanel', () => {
  const mockItinerary: Itinerary = {
    legs: [
      {
        type: 'vehicle',
        fromStopId: 1,
        toStopId: 2,
        fromStopName: '59 St - Columbus Circle',
        toStopName: '14 St - Union Sq',
        departureTime: new Date('2026-05-20T14:30:00-04:00'),
        arrivalTime: new Date('2026-05-20T15:00:00-04:00'),
        duration: 30,
        routeName: 'Broadway Express',
        routeShortName: 'Q',
      },
    ],
    departureTime: new Date('2026-05-20T14:30:00-04:00'),
    arrivalTime: new Date('2026-05-20T15:00:00-04:00'),
    totalDuration: 30,
    transferCount: 0,
  };

  it('renders itinerary header with times and duration', () => {
    render(<ItineraryPanel itinerary={mockItinerary} />);

    expect(screen.getByText('ITINERARY')).toBeInTheDocument();
    expect(screen.getByText(/DEPART 2:30 PM • ARRIVE 3:00 PM • 30M/)).toBeInTheDocument();
  });

  it('renders vehicle leg with route info and stops', () => {
    render(<ItineraryPanel itinerary={mockItinerary} />);

    expect(screen.getByText('ROUTE')).toBeInTheDocument();
    expect(screen.getByText('Q')).toBeInTheDocument();
    expect(screen.getByText('Broadway Express')).toBeInTheDocument();
    expect(screen.getByText('BOARD AT')).toBeInTheDocument();
    expect(screen.getByText('59 St - Columbus Circle')).toBeInTheDocument();
    expect(screen.getByText('ALIGHT AT')).toBeInTheDocument();
    expect(screen.getByText('14 St - Union Sq')).toBeInTheDocument();
  });

  it('renders transfer leg', () => {
    const itineraryWithTransfer: Itinerary = {
      ...mockItinerary,
      legs: [
        ...mockItinerary.legs,
        {
          type: 'transfer',
          fromStopId: 2,
          toStopId: 3,
          fromStopName: '14 St - Union Sq',
          toStopName: 'Times Sq-42 St',
          departureTime: new Date('2026-05-20T15:00:00-04:00'),
          arrivalTime: new Date('2026-05-20T15:05:00-04:00'),
          duration: 5,
        },
      ],
      transferCount: 1,
    };

    render(<ItineraryPanel itinerary={itineraryWithTransfer} />);

    expect(screen.getByText('TRANSFER')).toBeInTheDocument();
    expect(screen.getByText('14 St - Union Sq → Times Sq-42 St')).toBeInTheDocument();
  });

  it('renders access leg', () => {
    const itineraryWithAccess: Itinerary = {
      ...mockItinerary,
      legs: [
        {
          type: 'access',
          fromStopId: 0,
          toStopId: 1,
          fromStopName: 'Start',
          toStopName: '59 St - Columbus Circle',
          departureTime: new Date('2026-05-20T14:25:00-04:00'),
          arrivalTime: new Date('2026-05-20T14:30:00-04:00'),
          duration: 5,
        },
        ...mockItinerary.legs,
      ],
    };

    render(<ItineraryPanel itinerary={itineraryWithAccess} />);

    expect(screen.getByText('WALK')).toBeInTheDocument();
    expect(screen.getByText('Start → 59 St - Columbus Circle')).toBeInTheDocument();
  });
});
