import { useState } from 'react';
import type { Stop } from 'minotor';
import { Panel } from '../components/Panel';
import { Button } from '../components/Button';
import type { TimetableBundle } from '../timetable';
import type { ExclusionState } from '../routing/types';
import { StationSearch } from './StationSearch';
import { GeolocationButton } from './GeolocationButton';
import { TimePicker } from './TimePicker';
import { ExclusionBanner } from './ExclusionBanner';
import type { TripQuery, GeolocationError } from './types';
import { roundToNextFiveMinutes, validateQuery } from './utils';
import { RecentTrips, useRecentTrips, type StoredTrip } from '../trips';
import styles from './QueryPanel.module.css';

type QueryPanelProps = {
  bundle: TimetableBundle;
  onQuerySubmit: (query: TripQuery) => void;
  exclusionState?: ExclusionState;
  onClearExclusions?: () => void;
};

/**
 * Query panel orchestrator that composes station search, geolocation, and time picker
 * into a complete trip query form.
 */
export function QueryPanel({
  bundle,
  onQuerySubmit,
  exclusionState,
  onClearExclusions,
}: QueryPanelProps) {
  const [origin, setOrigin] = useState<Stop | null>(null);
  const [destination, setDestination] = useState<Stop | null>(null);
  const [mode, setMode] = useState<'depart-at' | 'arrive-by'>('depart-at');
  const [dateTime, setDateTime] = useState<Date>(roundToNextFiveMinutes(new Date()));
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const recent = useRecentTrips();

  const query: TripQuery = {
    origin: origin?.id ?? null,
    destination: destination?.id ?? null,
    mode,
    dateTime,
  };

  const validation = validateQuery(query);

  const handleSubmit = () => {
    setAttemptedSubmit(true);
    if (!validation.isValid) return;
    if (origin?.sourceStopId && destination?.sourceStopId) {
      recent.add({
        origin: { sourceStopId: origin.sourceStopId, name: origin.name },
        destination: { sourceStopId: destination.sourceStopId, name: destination.name },
      });
    }
    onQuerySubmit(query);
  };

  const handleSelectRecent = (trip: StoredTrip) => {
    const nextOrigin = bundle.stopsIndex.findStopBySourceStopId(trip.origin.sourceStopId);
    const nextDestination = bundle.stopsIndex.findStopBySourceStopId(trip.destination.sourceStopId);
    if (nextOrigin) setOrigin(nextOrigin);
    if (nextDestination) setDestination(nextDestination);
  };

  const handleGeolocationFound = (stop: Stop) => {
    setOrigin(stop);
  };

  const handleGeolocationError = (error: GeolocationError) => {
    // Error is already displayed by GeolocationButton
    console.warn('Geolocation error:', error);
  };

  const showErrors = attemptedSubmit;

  return (
    <Panel
      title="ROUTE QUERY"
      identifier="QRY-FORM"
      footer={
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={showErrors && !validation.isValid}
        >
          EXECUTE QUERY
        </Button>
      }
    >
      {exclusionState && onClearExclusions && (
        <ExclusionBanner exclusionState={exclusionState} onClear={onClearExclusions} />
      )}
      <RecentTrips trips={recent.trips} onSelect={handleSelectRecent} onClear={recent.clear} />
      <div className={styles.form}>
        <StationSearch
          stopsIndex={bundle.stopsIndex}
          value={origin}
          onChange={setOrigin}
          placeholder="Search for origin station"
          label="ORIGIN STATION"
          id="origin-search"
          error={showErrors ? validation.errors.origin : undefined}
        />
        <GeolocationButton
          stopsIndex={bundle.stopsIndex}
          onLocationFound={handleGeolocationFound}
          onError={handleGeolocationError}
          disabled={!!origin}
        />
        <StationSearch
          stopsIndex={bundle.stopsIndex}
          value={destination}
          onChange={setDestination}
          placeholder="Search for destination station"
          label="DESTINATION STATION"
          id="destination-search"
          error={showErrors ? validation.errors.destination : undefined}
        />
        <TimePicker
          mode={mode}
          dateTime={dateTime}
          onModeChange={setMode}
          onDateTimeChange={setDateTime}
          error={showErrors ? validation.errors.dateTime : undefined}
        />
      </div>
    </Panel>
  );
}
