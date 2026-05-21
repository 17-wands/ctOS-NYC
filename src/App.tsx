import { useEffect, useState } from 'react';
import { ComponentsSandbox } from './sandbox/ComponentsSandbox';
import {
  BootSequence,
  ErrorState,
  loadTimetable,
  type LoadStage,
  type TimetableBundle,
} from './timetable';
import { QueryPanel, type TripQuery } from './query';
import { ItineraryList, ItineraryPanel } from './itinerary';
import { extractItineraries, type Itinerary } from './routing';

type LoadState =
  | { kind: 'loading'; stage: LoadStage }
  | { kind: 'ready'; bundle: TimetableBundle }
  | { kind: 'error'; error: Error };

type RoutingState =
  | { kind: 'idle' }
  | { kind: 'computing' }
  | { kind: 'results'; itineraries: Itinerary[]; selectedIndex: number | undefined };

export function App() {
  const isSandbox = window.location.pathname === '/components';
  const [state, setState] = useState<LoadState>({ kind: 'loading', stage: 'fetch' });
  const [routingState, setRoutingState] = useState<RoutingState>({ kind: 'idle' });

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

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="wordmark">ctOS</span>
        <span className="wordmark-region">NYC</span>
      </header>
      <main className="app-main">
        {renderMain(isSandbox, state, routingState, handleQuerySubmit, handleItinerarySelect)}
      </main>
    </div>
  );
}

function renderMain(
  isSandbox: boolean,
  state: LoadState,
  routingState: RoutingState,
  onQuerySubmit: (query: TripQuery, bundle: TimetableBundle) => void,
  onItinerarySelect: (itinerary: Itinerary) => void,
) {
  if (isSandbox) return <ComponentsSandbox />;
  if (state.kind === 'loading') return <BootSequence stage={state.stage} />;
  if (state.kind === 'error') return <ErrorState error={state.error} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <QueryPanel
        bundle={state.bundle}
        onQuerySubmit={(query) => onQuerySubmit(query, state.bundle)}
      />
      {routingState.kind === 'computing' && (
        <div style={{ padding: '1rem', color: 'var(--color-blue-scan)' }}>COMPUTING ROUTES...</div>
      )}
      {routingState.kind === 'results' && (
        <>
          <ItineraryList
            itineraries={routingState.itineraries}
            onSelect={onItinerarySelect}
            selectedIndex={routingState.selectedIndex}
          />
          {routingState.selectedIndex !== undefined &&
            routingState.itineraries[routingState.selectedIndex] && (
              <ItineraryPanel itinerary={routingState.itineraries[routingState.selectedIndex]!} />
            )}
        </>
      )}
    </div>
  );
}
