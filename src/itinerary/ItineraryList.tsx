import type { Itinerary } from '../routing/types';
import type { AnnotatedItinerary } from '../routing/disruptions';
import { Label, Mono } from '../components/Text';
import { formatTime, formatDuration } from '../routing/time';
import { lineColor, lineTextColor, lineDivision } from '../routing/lineColors';
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
      {itineraries.map((itinerary, index) => {
        const fromStopName = itinerary.legs[0]?.fromStopName;
        const toStopName = itinerary.legs[itinerary.legs.length - 1]?.toStopName;
        const transferLabel =
          itinerary.transferCount === 1 ? '1 TRANSFER' : `${itinerary.transferCount} TRANSFERS`;

        return (
          <button
            key={index}
            data-testid="itinerary-card"
            className={styles.item}
            data-selected={index === selectedIndex}
            data-severity={'worstSeverity' in itinerary ? itinerary.worstSeverity : undefined}
            onClick={() => onSelect(index)}
            type="button"
          >
            <div className={styles.headline}>
              <div className={styles.timeRange}>
                <Mono>{formatTime(itinerary.departureTime)}</Mono>
                <span className={styles.arrow} aria-hidden="true">
                  →
                </span>
                <Mono>{formatTime(itinerary.arrivalTime)}</Mono>
              </div>
              <div className={styles.durationBlock}>
                <Label>DURATION</Label>
                <span className={styles.duration}>
                  <Mono>{formatDuration(itinerary.totalDuration)}</Mono>
                </span>
              </div>
            </div>

            {fromStopName && toStopName && (
              <div className={styles.endpoints}>
                <span className={styles.endpoint}>{fromStopName}</span>
                <span className={styles.arrow} aria-hidden="true">
                  →
                </span>
                <span className={styles.endpoint}>{toStopName}</span>
              </div>
            )}

            <div className={styles.legs}>
              {itinerary.legs
                .filter((leg) => leg.type === 'vehicle')
                .map((leg, legIndex) => {
                  const route = leg.routeShortName || leg.routeName;
                  const division = lineDivision(route);
                  return (
                    <div key={legIndex} className={styles.route}>
                      <div
                        className={styles.routeBadge}
                        style={{ backgroundColor: lineColor(route), color: lineTextColor(route) }}
                        title={division ? `${route} · ${division}` : (route ?? undefined)}
                      >
                        <Mono>{route}</Mono>
                      </div>
                      {division && (
                        <span className={styles.divisionLabel} aria-hidden="true">
                          <Mono>{division}</Mono>
                        </span>
                      )}
                    </div>
                  );
                })}
              {itinerary.transferCount > 0 && (
                <span className={styles.transfers}>
                  <Label>{transferLabel}</Label>
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
