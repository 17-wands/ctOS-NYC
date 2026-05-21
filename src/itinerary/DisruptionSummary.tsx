import type { AnnotatedItinerary } from '../routing/disruptions';
import type { Alert } from '../realtime/types';
import { Panel } from '../components/Panel';
import { Label, Mono } from '../components/Text';
import styles from './DisruptionSummary.module.css';

type DisruptionSummaryProps = {
  itinerary: AnnotatedItinerary;
};

export function DisruptionSummary({ itinerary }: DisruptionSummaryProps) {
  // Collect all unique alerts from all legs
  const allAlerts = new Map<string, Alert>();
  for (const leg of itinerary.legs) {
    if ('disruption' in leg && leg.disruption) {
      for (const alert of leg.disruption.alerts) {
        allAlerts.set(alert.id, alert);
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
    </Panel>
  );
}
