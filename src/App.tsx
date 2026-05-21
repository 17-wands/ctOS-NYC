import { useEffect, useState, useMemo } from 'react';
import { ComponentsSandbox } from './sandbox/ComponentsSandbox';
import {
  BootSequence,
  ErrorState,
  loadTimetable,
  type LoadStage,
  type TimetableBundle,
} from './timetable';
import { QueryPanel, type TripQuery } from './query';
import { ItineraryList, ItineraryPanel, DisruptionSummary } from './itinerary';
import { extractItineraries, filterItineraries } from './routing';
import { Map } from './map';
import { fetchRealtimeData } from './realtime/client';
import { annotateItinerary } from './routing/matcher';
import type { RealtimeResponse } from './realtime/types';
import type { Itinerary, ExclusionState } from './routing';
import type { AnnotatedItinerary } from './routing/disruptions';

type LoadState =
  | { kind: 'loading'; stage: LoadStage }
  | { kind: 'ready'; bundle: TimetableBundle }
  | { kind: 'error'; error: Error };

type RoutingState =
  | { kind: 'idle' }
  | { kind: 'computing' }
  | { kind: 'results'; itineraries: Itinerary[]; selectedIndex: number | undefined };

type RealtimeState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'loaded'; data: RealtimeResponse }
  | { kind: 'error' };

export function App() {
  const isSandbox = window.location.pathname === '/components';
  const [state, setState] = useState<LoadState>({ kind: 'loading', stage: 'fetch' });
  const [routingState, setRoutingState] = useState<RoutingState>({ kind: 'idle' });
  const [realtimeState, setRealtimeState] = useState<RealtimeState>({ kind: 'idle' });
  const [exclusionState, setExclusionState] = useState<ExclusionState>({
    excludedRoutes: new Set(),
    excludedStops: new Set(),
  });

  const handleQuerySubmit = (query: TripQuery, bundle: TimetableBundle) => {
    setRoutingState({ kind: 'computing' });

    try {
      const itineraries = extractItineraries(bundle.router, query);
      setRoutingState({ kind: 'results', itineraries, selectedIndex: undefined });
    } catch (error) {
      console.error('Routing failed:', error);
      setRoutingState({ kind: 'idle' });
    }
  };

  const handleItinerarySelect = (itinerary: Itinerary) => {
    if (routingState.kind === 'results') {
      const selectedIndex = routingState.itineraries.indexOf(itinerary);
      setRoutingState({ ...routingState, selectedIndex });
    }
  };

  const handleExcludeRoute = (routeShortName: string) => {
    setExclusionState((prev) => ({
      ...prev,
      excludedRoutes: new Set([...prev.excludedRoutes, routeShortName]),
    }));
  };

  const handleClearExclusions = () => {
    setExclusionState({
      excludedRoutes: new Set(),
      excludedStops: new Set(),
    });
  };

  useEffect(() => {
    if (isSandbox) return;

    let cancelled = false;
    const controller = new AbortController();

    loadTimetable({
      signal: controller.signal,
      onStage: (stage) => {
        if (!cancelled) setState({ kind: 'loading', stage });
      },
    })
      .then((bundle) => {
        if (!cancelled) setState({ kind: 'ready', bundle });
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ kind: 'error', error });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isSandbox]);

  // Start polling realtime data when timetable is ready
  useEffect(() => {
    if (state.kind !== 'ready') return;

    let cancelled = false;

    const poll = async () => {
      const data = await fetchRealtimeData();
      if (cancelled) return;

      if (data) {
        setRealtimeState({ kind: 'loaded', data });
      } else {
        setRealtimeState({ kind: 'error' });
      }
    };

    // Initial fetch
    poll();

    // Poll every 60s
    const interval = setInterval(poll, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [state]);

  // Filter itineraries based on exclusions
  const filteredItineraries = useMemo(() => {
    if (routingState.kind !== 'results') return [];
    return filterItineraries(routingState.itineraries, exclusionState);
  }, [routingState, exclusionState]);

  // Annotate filtered itineraries with realtime data
  const annotatedItineraries = useMemo(() => {
    if (realtimeState.kind !== 'loaded') return filteredItineraries;
    return filteredItineraries.map((itinerary) => annotateItinerary(itinerary, realtimeState.data));
  }, [filteredItineraries, realtimeState]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="wordmark">ctOS</span>
        <span className="wordmark-region">NYC</span>
      </header>
      <main className="app-main">
        {renderMain(
          isSandbox,
          state,
          routingState,
          annotatedItineraries,
          exclusionState,
          handleQuerySubmit,
          handleItinerarySelect,
          handleExcludeRoute,
          handleClearExclusions,
        )}
      </main>
    </div>
  );
}

function renderMain(
  isSandbox: boolean,
  state: LoadState,
  routingState: RoutingState,
  annotatedItineraries: (Itinerary | AnnotatedItinerary)[],
  exclusionState: ExclusionState,
  onQuerySubmit: (query: TripQuery, bundle: TimetableBundle) => void,
  onItinerarySelect: (itinerary: Itinerary) => void,
  onExcludeRoute: (routeShortName: string) => void,
  onClearExclusions: () => void,
) {
  if (isSandbox) return <ComponentsSandbox />;
  if (state.kind === 'loading') return <BootSequence stage={state.stage} />;
  if (state.kind === 'error') return <ErrorState error={state.error} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <QueryPanel
        bundle={state.bundle}
        onQuerySubmit={(query) => onQuerySubmit(query, state.bundle)}
        exclusionState={exclusionState}
        onClearExclusions={onClearExclusions}
      />
      {routingState.kind === 'computing' && (
        <div style={{ padding: '1rem', color: 'var(--color-blue-scan)' }}>COMPUTING ROUTES...</div>
      )}
      {routingState.kind === 'results' && (
        <>
          <ItineraryList
            itineraries={annotatedItineraries}
            onSelect={onItinerarySelect}
            selectedIndex={routingState.selectedIndex}
          />
          {routingState.selectedIndex !== undefined &&
            annotatedItineraries[routingState.selectedIndex] && (
              <>
                {'worstSeverity' in annotatedItineraries[routingState.selectedIndex]! && (
                  <DisruptionSummary
                    itinerary={
                      annotatedItineraries[routingState.selectedIndex]! as AnnotatedItinerary
                    }
                    onExcludeRoute={onExcludeRoute}
                    excludedRoutes={exclusionState.excludedRoutes}
                  />
                )}
                <Map
                  itinerary={annotatedItineraries[routingState.selectedIndex]!}
                  stopsIndex={state.bundle.stopsIndex}
                />
                <ItineraryPanel
                  itinerary={annotatedItineraries[routingState.selectedIndex]!}
                  onExcludeRoute={onExcludeRoute}
                  excludedRoutes={exclusionState.excludedRoutes}
                />
              </>
            )}
        </>
      )}
    </div>
  );
}
