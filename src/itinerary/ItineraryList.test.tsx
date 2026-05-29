import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ItineraryList } from './ItineraryList';
import type { Itinerary } from '../routing/types';

describe('ItineraryList', () => {
  const mockItineraries: Itinerary[] = [
    {
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
    },
    {
      legs: [
        {
          type: 'vehicle',
          fromStopId: 1,
          toStopId: 3,
          fromStopName: '59 St - Columbus Circle',
          toStopName: 'Times Sq-42 St',
          departureTime: new Date('2026-05-20T14:35:00-04:00'),
          arrivalTime: new Date('2026-05-20T14:50:00-04:00'),
          duration: 15,
          routeName: 'Lexington Av Express',
          routeShortName: '4',
        },
        {
          type: 'transfer',
          fromStopId: 3,
          toStopId: 4,
          fromStopName: 'Times Sq-42 St',
          toStopName: '14 St - Union Sq',
          departureTime: new Date('2026-05-20T14:50:00-04:00'),
          arrivalTime: new Date('2026-05-20T14:55:00-04:00'),
          duration: 5,
        },
        {
          type: 'vehicle',
          fromStopId: 4,
          toStopId: 2,
          fromStopName: '14 St - Union Sq',
          toStopName: 'Atlantic Av-Barclays Ctr',
          departureTime: new Date('2026-05-20T14:55:00-04:00'),
          arrivalTime: new Date('2026-05-20T15:10:00-04:00'),
          duration: 15,
          routeName: 'Broadway Local',
          routeShortName: 'N',
        },
      ],
      departureTime: new Date('2026-05-20T14:35:00-04:00'),
      arrivalTime: new Date('2026-05-20T15:10:00-04:00'),
      totalDuration: 35,
      transferCount: 1,
    },
  ];

  it('renders all itineraries', () => {
    const onSelect = vi.fn();
    render(<ItineraryList itineraries={mockItineraries} onSelect={onSelect} />);

    const items = screen.getAllByRole('button');
    expect(items).toHaveLength(2);
  });

  it('shows departure and arrival times', () => {
    const onSelect = vi.fn();
    render(<ItineraryList itineraries={mockItineraries} onSelect={onSelect} />);

    expect(screen.getByText('2:30 PM')).toBeInTheDocument();
    expect(screen.getByText('3:00 PM')).toBeInTheDocument();
  });

  it('shows duration and transfer count', () => {
    const onSelect = vi.fn();
    render(<ItineraryList itineraries={mockItineraries} onSelect={onSelect} />);

    expect(screen.getAllByText('DURATION')).toHaveLength(2);
    expect(screen.getByText('30M')).toBeInTheDocument();
    expect(screen.getByText('35M')).toBeInTheDocument();
    expect(screen.getByText('TRANSFERS')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows route badges for vehicle legs', () => {
    const onSelect = vi.fn();
    render(<ItineraryList itineraries={mockItineraries} onSelect={onSelect} />);

    expect(screen.getByText('Q')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('N')).toBeInTheDocument();
  });

  it('calls onSelect when an itinerary is clicked', () => {
    const onSelect = vi.fn();
    render(<ItineraryList itineraries={mockItineraries} onSelect={onSelect} />);

    const items = screen.getAllByRole('button');
    if (items[0]) {
      fireEvent.click(items[0]);
      expect(onSelect).toHaveBeenCalledWith(0);
    }
  });

  it('highlights the selected itinerary', () => {
    const onSelect = vi.fn();
    render(<ItineraryList itineraries={mockItineraries} onSelect={onSelect} selectedIndex={1} />);

    const items = screen.getAllByRole('button');
    expect(items[0]).not.toHaveAttribute('data-selected', 'true');
    expect(items[1]).toHaveAttribute('data-selected', 'true');
  });

  it('renders empty state with the generic helper when no itineraries', () => {
    const onSelect = vi.fn();
    render(<ItineraryList itineraries={[]} onSelect={onSelect} />);

    expect(screen.getByText('NO ROUTES FOUND')).toBeInTheDocument();
    expect(screen.getByText(/Try a different departure time/i)).toBeInTheDocument();
  });

  it('surfaces an exclusions-aware helper when exclusions are active', () => {
    const onSelect = vi.fn();
    render(<ItineraryList itineraries={[]} onSelect={onSelect} exclusionsActive />);

    expect(screen.getByText('NO ROUTES FOUND')).toBeInTheDocument();
    expect(screen.getByText(/Some routes or stops are excluded/i)).toBeInTheDocument();
  });
});
