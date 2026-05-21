import type { ExclusionState } from '../routing/types';
import { Button } from '../components/Button';
import { Label, Mono } from '../components/Text';
import styles from './ExclusionBanner.module.css';

type ExclusionBannerProps = {
  exclusionState: ExclusionState;
  onClear: () => void;
};

export function ExclusionBanner({ exclusionState, onClear }: ExclusionBannerProps) {
  const { excludedRoutes, excludedStops } = exclusionState;

  if (excludedRoutes.size === 0 && excludedStops.size === 0) {
    return null;
  }

  return (
    <div className={styles.banner} data-severity="warning">
      <div className={styles.content}>
        <Label>ACTIVE EXCLUSIONS</Label>
        {excludedRoutes.size > 0 && (
          <div className={styles.excluded}>
            <Mono>Routes: {Array.from(excludedRoutes).join(', ')}</Mono>
          </div>
        )}
        {excludedStops.size > 0 && (
          <div className={styles.excluded}>
            <Mono>Stops: {excludedStops.size}</Mono>
          </div>
        )}
      </div>
      <Button variant="secondary" onClick={onClear}>
        CLEAR ALL EXCLUSIONS
      </Button>
    </div>
  );
}
