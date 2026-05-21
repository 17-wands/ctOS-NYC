import type { Itinerary } from '../routing/types';
import { Panel } from '../components/Panel';
import { Label, Mono } from '../components/Text';
import { formatTime, formatDuration } from '../routing/time';
import styles from './ItineraryPanel.module.css';

type ItineraryPanelProps = {
  itinerary: Itinerary;
};

export function ItineraryPanel({ itinerary }: ItineraryPanelProps) {
  return (
    <Panel
      title="ITINERARY"
      status={`DEPART ${formatTime(itinerary.departureTime)} • ARRIVE ${formatTime(itinerary.arrivalTime)} • ${formatDuration(itinerary.totalDuration)}`}
      severity="info"
    >
      <div className={styles.legs}>
        {itinerary.legs.map((leg, index) => (
          <div key={index} className={styles.leg} data-leg-type={leg.type}>
            {leg.type === 'vehicle' && (
              <>
                <div className={styles.legHeader}>
                  <Label>ROUTE</Label>
                  <div className={styles.routeBadge}>
                    <Mono>{leg.routeShortName || leg.routeName}</Mono>
                  </div>
                  <Label>{leg.routeName}</Label>
                </div>
                <div className={styles.legRoute}>
                  <div className={styles.stop}>
                    <div className={styles.time}>
                      <Mono>{formatTime(leg.departureTime)}</Mono>
                    </div>
                    <Label>BOARD AT</Label>
                    <div className={styles.stopName}>{leg.fromStopName}</div>
                  </div>
                  <div className={styles.connector}>
                    <div className={styles.line} />
                    <Label>{formatDuration(leg.duration)}</Label>
                  </div>
                  <div className={styles.stop}>
                    <div className={styles.time}>
                      <Mono>{formatTime(leg.arrivalTime)}</Mono>
                    </div>
                    <Label>ALIGHT AT</Label>
                    <div className={styles.stopName}>{leg.toStopName}</div>
                  </div>
                </div>
              </>
            )}
            {leg.type === 'transfer' && (
              <div className={styles.transfer}>
                <Label>TRANSFER</Label>
                <Mono>{formatDuration(leg.duration)}</Mono>
                <div className={styles.transferPath}>
                  {leg.fromStopName} → {leg.toStopName}
                </div>
              </div>
            )}
            {leg.type === 'access' && (
              <div className={styles.access}>
                <Label>WALK</Label>
                <Mono>{formatDuration(leg.duration)}</Mono>
                <div className={styles.accessPath}>
                  {leg.fromStopName} → {leg.toStopName}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}
