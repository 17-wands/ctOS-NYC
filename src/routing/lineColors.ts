/**
 * The three legacy operating divisions plus Staten Island Railway.
 * IRT  — Interborough Rapid Transit (numbered lines, narrow cars)
 * BMT  — Brooklyn-Manhattan Transit (lettered lines, wide cars)
 * IND  — Independent Subway System (lettered lines, wide cars)
 * SIR  — Staten Island Railway
 */
export type Division = 'IRT' | 'BMT' | 'IND' | 'SIR';

const LINE_DIVISIONS: Record<string, Division> = {
  '1': 'IRT',
  '2': 'IRT',
  '3': 'IRT',
  '4': 'IRT',
  '5': 'IRT',
  '6': 'IRT',
  '7': 'IRT',
  GS: 'IRT', // Times Sq–Grand Central Shuttle
  A: 'IND',
  C: 'IND',
  E: 'IND',
  B: 'IND',
  D: 'IND',
  F: 'IND',
  M: 'IND',
  G: 'IND',
  H: 'IND', // Rockaway Park Shuttle
  L: 'BMT',
  N: 'BMT',
  Q: 'BMT',
  R: 'BMT',
  W: 'BMT',
  J: 'BMT',
  Z: 'BMT',
  FS: 'BMT', // Franklin Ave Shuttle
  S: 'IRT', // Default S → Times Sq Shuttle (IRT)
  SI: 'SIR',
  SIR: 'SIR',
};

/**
 * Official MTA subway colors keyed by GTFS `route_short_name` (trunk-line based).
 * https://www.mta.info — route bullets. Used for route badges and the map trace.
 */
const LINE_COLORS: Record<string, string> = {
  '1': '#ee352e',
  '2': '#ee352e',
  '3': '#ee352e',
  '4': '#00933c',
  '5': '#00933c',
  '6': '#00933c',
  '7': '#b933ad',
  A: '#0039a6',
  C: '#0039a6',
  E: '#0039a6',
  B: '#ff6319',
  D: '#ff6319',
  F: '#ff6319',
  M: '#ff6319',
  G: '#6cbe45',
  J: '#996633',
  Z: '#996633',
  L: '#a7a9ac',
  N: '#fccc0a',
  Q: '#fccc0a',
  R: '#fccc0a',
  W: '#fccc0a',
  S: '#808183',
  GS: '#808183',
  FS: '#808183',
  H: '#808183',
  SI: '#0039a6',
  SIR: '#0039a6',
};

/** Scan-blue fallback for unknown routes. */
export const DEFAULT_LINE_COLOR = '#39c7f3';

/** Light-background lines that need dark text for contrast. */
const DARK_TEXT_LINES = new Set(['N', 'Q', 'R', 'W', 'L', 'S', 'GS', 'FS', 'H']);

/** The official bullet color for a route, or the scan-blue fallback. */
export function lineColor(route: string | null | undefined): string {
  if (!route) return DEFAULT_LINE_COLOR;
  return LINE_COLORS[route.toUpperCase()] ?? DEFAULT_LINE_COLOR;
}

/** Readable text color (black/white) for a badge filled with `lineColor(route)`. */
export function lineTextColor(route: string | null | undefined): string {
  return route && DARK_TEXT_LINES.has(route.toUpperCase()) ? '#0a0a0a' : '#ffffff';
}

/**
 * The legacy operating division for a route (IRT / BMT / IND / SIR).
 * Returns `undefined` for unknown or shuttle routes with ambiguous division.
 */
export function lineDivision(route: string | null | undefined): Division | undefined {
  if (!route) return undefined;
  return LINE_DIVISIONS[route.toUpperCase()] ?? LINE_DIVISIONS[route] ?? undefined;
}
