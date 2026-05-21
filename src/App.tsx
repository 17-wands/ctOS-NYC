import { useEffect, useState } from 'react';
import { ComponentsSandbox } from './sandbox/ComponentsSandbox';
import {
  BootSequence,
  ErrorState,
  loadTimetable,
  type LoadStage,
  type TimetableBundle,
} from './timetable';

type LoadState =
  | { kind: 'loading'; stage: LoadStage }
  | { kind: 'ready'; bundle: TimetableBundle }
  | { kind: 'error'; error: Error };

export function App() {
  const isSandbox = window.location.pathname === '/components';
  const [state, setState] = useState<LoadState>({ kind: 'loading', stage: 'fetch' });

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
      <main className="app-main">{renderMain(isSandbox, state)}</main>
    </div>
  );
}

function renderMain(isSandbox: boolean, state: LoadState) {
  if (isSandbox) return <ComponentsSandbox />;
  if (state.kind === 'loading') return <BootSequence stage={state.stage} />;
  if (state.kind === 'error') return <ErrorState error={state.error} />;
  return <p className="status-line">SYSTEM ONLINE / ROUTE PLANNER STANDBY</p>;
}
