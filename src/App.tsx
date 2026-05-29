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
import { extractWindowedItineraries, filterItineraries } from './routing';
import { Map } from './map';
import { BottomSheet } from './components/BottomSheet';
import { FreshnessBar } from './freshness';
import { fetchRealtimeData } from './realtime/client';
import { useOnlineStatus } from './realtime/useOnlineStatus';
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
  const online = useOnlineStatus();
  const [state, setState] = useState<LoadState>({ kind: 'loading', stage: 'fetch' });
  const [routingState, setRoutingState] = useState<RoutingState>({ kind: 'idle' });
  const [realtimeState, setRealtimeState] = useState<RealtimeState>({ kind: 'idle' });
  const [exclusionState, setExclusionState] = useState<ExclusionState>({
    excludedRoutes: new Set(),
    excludedStops: new Set(),
  });
  const [bottomSheetExpanded, setBottomSheetExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // On-request refresh: re-poll the live overlay and re-validate the schedule
  // window in the background (no boot flash). Cadence polling continues too.
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [data] = await Promise.all([
        fetchRealtimeData(),
        loadTimetable()
          .then((bundle) => setState({ kind: 'ready', bundle }))
          .catch((error) => {
            // Keep the current bundle on a failed refresh; don't break the session.
            console.error('Schedule refresh failed:', error);
          }),
      ]);
      setRealtimeState(data ? { kind: 'loaded', data } : { kind: 'error' });
    } finally {
      setRefreshing(false);
    }
  };

  const handleQuerySubmit = (query: TripQuery, bundle: TimetableBundle) => {
    setRoutingState({ kind: 'computing' });

    try {
      const itineraries = extractWindowedItineraries(bundle.days, query);
      setRoutingState({ kind: 'results', itineraries, selectedIndex: undefined });
      setBottomSheetExpanded(true); // Auto-expand bottom sheet when results appear
    } catch (error) {
      console.error('Routing failed:', error);
      setRoutingState({ kind: 'idle' });
    }
  };

  const handleItinerarySelect = (selectedIndex: number) => {
    if (routingState.kind !== 'results') return;
    setRoutingState({ ...routingState, selectedIndex });
    // Bring the selected itinerary detail into view (it renders below the list,
    // above the disruptions). Scroll the visible layout's panel — both the
    // desktop sidebar and the mobile bottom sheet render one.
    requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>('[aria-label="ITINERARY"]').forEach((panel) => {
        if (panel.offsetParent !== null) {
          panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    });
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
      {state.kind === 'ready' && (
        <FreshnessBar
          feedPublishedAt={state.bundle.feedPublishedAt}
          liveUpdatedAt={realtimeState.kind === 'loaded' ? realtimeState.data.generatedAt : null}
          online={online}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {routeStatusMessage(routingState, annotatedItineraries.length)}
      </p>
      <main className="app-main">
        {renderMain(
          isSandbox,
          online,
          state,
          routingState,
          annotatedItineraries,
          exclusionState,
          bottomSheetExpanded,
          handleQuerySubmit,
          handleItinerarySelect,
          handleExcludeRoute,
          handleClearExclusions,
          () => setBottomSheetExpanded(!bottomSheetExpanded),
        )}
      </main>
    </div>
  );
}

/** Screen-reader announcement for the routing lifecycle (polite live region). */
function routeStatusMessage(routingState: RoutingState, resultCount: number): string {
  if (routingState.kind === 'computing') return 'Computing routes';
  if (routingState.kind === 'results') {
    return resultCount === 0 ? 'No routes found' : `${resultCount} routes found`;
  }
  return '';
}

function renderMain(
  isSandbox: boolean,
  online: boolean,
  state: LoadState,
  routingState: RoutingState,
  annotatedItineraries: (Itinerary | AnnotatedItinerary)[],
  exclusionState: ExclusionState,
  bottomSheetExpanded: boolean,
  onQuerySubmit: (query: TripQuery, bundle: TimetableBundle) => void,
  onItinerarySelect: (index: number) => void,
  onExcludeRoute: (routeShortName: string) => void,
  onClearExclusions: () => void,
  onToggleBottomSheet: () => void,
) {
  if (isSandbox) return <ComponentsSandbox />;
  if (state.kind === 'loading') return <BootSequence stage={state.stage} />;
  if (state.kind === 'error') return <ErrorState error={state.error} offline={!online} />;

  const resultsContent =
    routingState.kind === 'results' ? (
      <>
        <ItineraryList
          itineraries={annotatedItineraries}
          onSelect={onItinerarySelect}
          selectedIndex={routingState.selectedIndex}
          exclusionsActive={
            exclusionState.excludedRoutes.size > 0 || exclusionState.excludedStops.size > 0
          }
        />
        {routingState.selectedIndex !== undefined &&
          annotatedItineraries[routingState.selectedIndex] && (
            <>
              <ItineraryPanel
                itinerary={annotatedItineraries[routingState.selectedIndex]!}
                onExcludeRoute={onExcludeRoute}
                excludedRoutes={exclusionState.excludedRoutes}
              />
              {'worstSeverity' in annotatedItineraries[routingState.selectedIndex]! && (
                <DisruptionSummary
                  itinerary={
                    annotatedItineraries[routingState.selectedIndex]! as AnnotatedItinerary
                  }
                  onExcludeRoute={onExcludeRoute}
                  excludedRoutes={exclusionState.excludedRoutes}
                />
              )}
            </>
          )}
      </>
    ) : null;

  return (
    <>
      {/* Mobile: QueryPanel in its own grid area */}
      <div className="query-region">
        <QueryPanel
          bundle={state.bundle}
          onQuerySubmit={(query) => onQuerySubmit(query, state.bundle)}
          exclusionState={exclusionState}
          onClearExclusions={onClearExclusions}
        />
        {routingState.kind === 'computing' && (
          <div style={{ padding: '1rem', color: 'var(--color-blue-scan)' }}>
            COMPUTING ROUTES...
          </div>
        )}
      </div>

      {/* Desktop: Sidebar with query and results */}
      <div className="sidebar-region">
        <QueryPanel
          bundle={state.bundle}
          onQuerySubmit={(query) => onQuerySubmit(query, state.bundle)}
          exclusionState={exclusionState}
          onClearExclusions={onClearExclusions}
        />
        {routingState.kind === 'computing' && (
          <div style={{ padding: '1rem', color: 'var(--color-blue-scan)' }}>
            COMPUTING ROUTES...
          </div>
        )}
        {resultsContent}
      </div>

      {/* Map fills remaining space on both layouts */}
      <div className="map-region">
        {routingState.kind === 'results' &&
          routingState.selectedIndex !== undefined &&
          annotatedItineraries[routingState.selectedIndex] && (
            <Map
              itinerary={annotatedItineraries[routingState.selectedIndex]!}
              stopsIndex={state.bundle.stopsIndex}
            />
          )}
      </div>

      {/* Mobile: Bottom sheet with results */}
      {routingState.kind === 'results' && (
        <BottomSheet isExpanded={bottomSheetExpanded} onToggle={onToggleBottomSheet}>
          {resultsContent}
        </BottomSheet>
      )}
    </>
  );
}
