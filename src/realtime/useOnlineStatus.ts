import { useEffect, useState } from 'react';

/**
 * Tracks the browser's online/offline state via `navigator.onLine` and the
 * `online`/`offline` window events. Used to degrade gracefully when there is no
 * signal (e.g. underground): the cached schedule still plans, the live overlay
 * is suppressed, and the UI can show an offline indicator.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}
