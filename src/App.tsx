import { ComponentsSandbox } from './sandbox/ComponentsSandbox';

export function App() {
  const isSandbox = window.location.pathname === '/components';

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="wordmark">ctOS</span>
        <span className="wordmark-region">NYC</span>
      </header>
      <main className="app-main">
        {isSandbox ? (
          <ComponentsSandbox />
        ) : (
          <p className="status-line">SYSTEM ONLINE / ROUTE PLANNER STANDBY</p>
        )}
      </main>
    </div>
  );
}
