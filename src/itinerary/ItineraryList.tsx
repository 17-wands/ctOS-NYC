import type { Itinerary } from '../routing/types';
import { Label, Mono } from '../components/Text';
import { formatTime, formatDuration } from '../routing/time';
import styles from './ItineraryList.module.css';

type ItineraryListProps = {
  itineraries: Itinerary[];
  onSelect: (itinerary: Itinerary) => void;
  selectedIndex?: number;
};

export function ItineraryList({ itineraries, onSelect, selectedIndex }: ItineraryListProps) {
  if (itineraries.length === 0) {
    return (
      <div className={styles.empty}>
        <Label>NO ROUTES FOUND</Label>
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
          onClick={() => onSelect(itinerary)}
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
              .map((leg, legIndex) => (
                <div key={legIndex} className={styles.route}>
                  <div className={styles.routeBadge}>
                    <Mono>{leg.routeShortName || leg.routeName}</Mono>
                  </div>
                </div>
              ))}
          </div>
        </button>
      ))}
    </div>
  );
}
