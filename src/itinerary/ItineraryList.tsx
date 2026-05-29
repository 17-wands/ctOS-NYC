import type { Itinerary } from '../routing/types';
import type { AnnotatedItinerary } from '../routing/disruptions';
import { Label, Mono } from '../components/Text';
import { formatTime, formatDuration } from '../routing/time';
import { lineColor, lineTextColor } from '../routing/lineColors';
import styles from './ItineraryList.module.css';

type ItineraryListProps = {
  itineraries: (Itinerary | AnnotatedItinerary)[];
  onSelect: (index: number) => void;
  selectedIndex?: number;
  /** Whether the rider has active route/stop exclusions; surfaces a helper line. */
  exclusionsActive?: boolean;
};

export function ItineraryList({
  itineraries,
  onSelect,
  selectedIndex,
  exclusionsActive = false,
}: ItineraryListProps) {
  if (itineraries.length === 0) {
    const help = exclusionsActive
      ? 'Some routes or stops are excluded. Clear the exclusions or try a different time.'
      : 'Try a different departure time, or check disruptions for the affected lines.';
    return (
      <div className={styles.empty}>
        <Label>NO ROUTES FOUND</Label>
        <p className={styles.emptyHelp}>{help}</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {itineraries.map((itinerary, index) => (
        <button
          key={index}
          className={styles.item}
          data-selected={index === selectedIndex}
          data-severity={'worstSeverity' in itinerary ? itinerary.worstSeverity : undefined}
          onClick={() => onSelect(index)}
          type="button"
        >
          <div className={styles.times}>
            <div className={styles.time}>
              <Mono>{formatTime(itinerary.departureTime)}</Mono>
            </div>
            <div className={styles.arrow}>→</div>
            <div className={styles.time}>
              <Mono>{formatTime(itinerary.arrivalTime)}</Mono>
            </div>
          </div>
          <div className={styles.meta}>
            <Label>DURATION</Label>
            <Mono>{formatDuration(itinerary.totalDuration)}</Mono>
            {itinerary.transferCount > 0 && (
              <>
                <Label>TRANSFERS</Label>
                <Mono>{itinerary.transferCount}</Mono>
              </>
            )}
          </div>
          <div className={styles.legs}>
            {itinerary.legs
              .filter((leg) => leg.type === 'vehicle')
              .map((leg, legIndex) => {
                const route = leg.routeShortName || leg.routeName;
                return (
                  <div key={legIndex} className={styles.route}>
                    <div
                      className={styles.routeBadge}
                      style={{ backgroundColor: lineColor(route), color: lineTextColor(route) }}
                    >
                      <Mono>{route}</Mono>
                    </div>
                  </div>
                );
              })}
          </div>
        </button>
      ))}
    </div>
  );
}
