import type { AnnotatedItinerary } from '../routing/disruptions';
import type { Alert } from '../realtime/types';
import { Panel } from '../components/Panel';
import { Button } from '../components/Button';
import { Label, Mono } from '../components/Text';
import styles from './DisruptionSummary.module.css';

type DisruptionSummaryProps = {
  itinerary: AnnotatedItinerary;
  onExcludeRoute?: (routeShortName: string) => void;
  excludedRoutes?: Set<string>;
};

export function DisruptionSummary({
  itinerary,
  onExcludeRoute,
  excludedRoutes,
}: DisruptionSummaryProps) {
  // Collect all unique alerts from all legs
  const allAlerts = new Map<string, Alert>();
  const affectedRoutes = new Set<string>();

  for (const leg of itinerary.legs) {
    if ('disruption' in leg && leg.disruption) {
      for (const alert of leg.disruption.alerts) {
        allAlerts.set(alert.id, alert);
      }
      if ('routeShortName' in leg && leg.routeShortName) {
        affectedRoutes.add(leg.routeShortName);
      }
    }
  }

  if (allAlerts.size === 0) return null;

  const severity = itinerary.worstSeverity || 'warning';

  return (
    <Panel title="DISRUPTIONS" severity={severity}>
      <div className={styles.alerts}>
        {Array.from(allAlerts.values()).map((alert) => (
          <div
            key={alert.id}
            className={styles.alert}
            data-severity={
              alert.severity === 'BREACH'
                ? 'critical'
                : alert.severity === 'DEGRADED'
                  ? 'warning'
                  : 'info'
            }
          >
            <div className={styles.alertHeader}>
              <Label>{alert.severity}</Label>
              <Mono>{alert.header}</Mono>
            </div>
            {alert.description && (
              <div className={styles.alertDescription}>{alert.description}</div>
            )}
          </div>
        ))}
      </div>
      {affectedRoutes.size > 0 && onExcludeRoute && (
        <div className={styles.exclusions}>
          <Label>AVOID ROUTES</Label>
          <div className={styles.exclusionButtons}>
            {Array.from(affectedRoutes).map((route) => (
              <Button
                key={route}
                variant="destructive"
                onClick={() => onExcludeRoute(route)}
                disabled={excludedRoutes?.has(route)}
              >
                AVOID {route}
              </Button>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
