import type { StopId } from 'minotor';

export type LegType = 'vehicle' | 'transfer' | 'access';

export type ItineraryLeg = {
  type: LegType;
  fromStopId: StopId;
  toStopId: StopId;
  fromStopName: string;
  toStopName: string;
  departureTime: Date;
  arrivalTime: Date;
  duration: number;
  routeName?: string;
  routeShortName?: string;
};

export type Itinerary = {
  legs: ItineraryLeg[];
  departureTime: Date;
  arrivalTime: Date;
  totalDuration: number;
  transferCount: number;
};
