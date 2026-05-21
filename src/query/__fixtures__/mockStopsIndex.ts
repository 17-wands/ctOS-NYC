import { StopsIndex, type Stop } from 'minotor';

/** Representative NYC subway stations for testing. */
export const mockStops: Stop[] = [
  {
    id: 1,
    sourceStopId: 'A24',
    name: '59 St - Columbus Circle',
    lat: 40.768296,
    lon: -73.981736,
    children: [],
    locationType: 'STATION',
  },
  {
    id: 2,
    sourceStopId: 'L03',
    name: '14 St - Union Sq',
    lat: 40.734673,
    lon: -73.989951,
    children: [],
    locationType: 'STATION',
  },
  {
    id: 3,
    sourceStopId: '132',
    name: 'Times Sq-42 St',
    lat: 40.75529,
    lon: -73.987495,
    children: [],
    locationType: 'STATION',
  },
  {
    id: 4,
    sourceStopId: 'A27',
    name: '125 St',
    lat: 40.807722,
    lon: -73.9524,
    children: [],
    locationType: 'STATION',
  },
  {
    id: 5,
    sourceStopId: 'R11',
    name: 'Atlantic Av-Barclays Ctr',
    lat: 40.684359,
    lon: -73.97881,
    children: [],
    locationType: 'STATION',
  },
  {
    id: 6,
    sourceStopId: '902',
    name: 'Flushing - Main St',
    lat: 40.759495,
    lon: -73.830078,
    children: [],
    locationType: 'STATION',
  },
  {
    id: 7,
    sourceStopId: 'D43',
    name: 'Coney Island - Stillwell Av',
    lat: 40.577422,
    lon: -73.981233,
    children: [],
    locationType: 'STATION',
  },
  {
    id: 8,
    sourceStopId: 'A65',
    name: 'Far Rockaway - Mott Av',
    lat: 40.603995,
    lon: -73.755405,
    children: [],
    locationType: 'STATION',
  },
];

/**
 * Creates a mock StopsIndex for testing.
 * Provides realistic station data without requiring the full GTFS pipeline.
 */
export function createMockStopsIndex(): StopsIndex {
  return new StopsIndex(mockStops);
}
