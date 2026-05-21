import { useState } from 'react';
import type { Stop, StopsIndex } from 'minotor';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import type { GeolocationError } from './types';
import styles from './GeolocationButton.module.css';

type GeolocationButtonProps = {
  stopsIndex: StopsIndex;
  onLocationFound: (stop: Stop) => void;
  onError: (error: GeolocationError) => void;
  disabled?: boolean;
};

type GeoState = 'idle' | 'loading' | 'error';

const ERROR_MESSAGES: Record<GeolocationError, { text: string; severity: 'critical' | 'warning' }> =
  {
    'permission-denied': { text: 'LOCATION ACCESS DENIED', severity: 'critical' },
    'position-unavailable': { text: 'POSITION UNAVAILABLE', severity: 'warning' },
    timeout: { text: 'LOCATION TIMEOUT', severity: 'warning' },
    'no-stops-found': { text: 'NO STATIONS WITHIN 0.5 KM', severity: 'warning' },
  };

/**
 * Geolocation button that finds the nearest station.
 * PRIVACY-FIRST: Only triggers on explicit button click, never automatically.
 * Location data is used once locally and immediately discarded.
 */
export function GeolocationButton({
  stopsIndex,
  onLocationFound,
  onError,
  disabled,
}: GeolocationButtonProps) {
  const [state, setState] = useState<GeoState>('idle');
  const [errorType, setErrorType] = useState<GeolocationError | null>(null);

  const handleClick = () => {
    if (!navigator.geolocation) {
      const error: GeolocationError = 'position-unavailable';
      setErrorType(error);
      setState('error');
      onError(error);
      return;
    }

    setState('loading');
    setErrorType(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const stops = stopsIndex.findStopsByLocation(latitude, longitude, 1, 0.5);

        if (stops.length === 0 || !stops[0]) {
          const error: GeolocationError = 'no-stops-found';
          setErrorType(error);
          setState('error');
          onError(error);
        } else {
          setState('idle');
          onLocationFound(stops[0]);
        }
      },
      (error) => {
        let errorType: GeolocationError;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorType = 'permission-denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorType = 'position-unavailable';
            break;
          case error.TIMEOUT:
            errorType = 'timeout';
            break;
          default:
            errorType = 'position-unavailable';
        }
        setErrorType(errorType);
        setState('error');
        onError(errorType);
      },
      {
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
        enableHighAccuracy: false, // Battery-friendly
      },
    );
  };

  const isLoading = state === 'loading';

  return (
    <div className={styles.container}>
      <Button
        variant="secondary"
        onClick={handleClick}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? 'ACQUIRING POSITION...' : 'USE MY LOCATION'}
      </Button>
      {state === 'error' && errorType && (
        <Alert level={ERROR_MESSAGES[errorType].severity}>{ERROR_MESSAGES[errorType].text}</Alert>
      )}
    </div>
  );
}
