import { Label } from '../components/Text';
import type { QueryMode } from './types';
import { formatDateTimeLocal, parseDateTimeLocal } from './utils';
import styles from './TimePicker.module.css';

type TimePickerProps = {
  mode: QueryMode;
  dateTime: Date;
  onModeChange: (mode: QueryMode) => void;
  onDateTimeChange: (dateTime: Date) => void;
  error?: string;
};

/**
 * Time picker with depart/arrive toggle and datetime input.
 * Uses native HTML5 datetime-local for accessibility and mobile support.
 */
export function TimePicker({
  mode,
  dateTime,
  onModeChange,
  onDateTimeChange,
  error,
}: TimePickerProps) {
  const handleModeClick = (newMode: QueryMode) => {
    if (newMode !== mode) {
      onModeChange(newMode);
    }
  };

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseDateTimeLocal(e.target.value);
    onDateTimeChange(parsed);
  };

  const modeLabel = mode === 'depart-at' ? 'DEPARTURE TIME' : 'ARRIVAL TIME';

  return (
    <div className={styles.container}>
      <div className={styles.modeToggle}>
        <Label>MODE</Label>
        <div className={styles.toggleButtons}>
          <button
            type="button"
            className={styles.toggleButton}
            data-active={mode === 'depart-at' ? 'true' : undefined}
            onClick={() => handleModeClick('depart-at')}
          >
            DEPART AT
          </button>
          <button
            type="button"
            className={styles.toggleButton}
            data-active={mode === 'arrive-by' ? 'true' : undefined}
            onClick={() => handleModeClick('arrive-by')}
          >
            ARRIVE BY
          </button>
        </div>
      </div>
      <div className={styles.dateTimeInput}>
        <label htmlFor="query-datetime" className={styles.label}>
          <Label>{modeLabel}</Label>
        </label>
        <input
          type="datetime-local"
          id="query-datetime"
          className={styles.input}
          value={formatDateTimeLocal(dateTime)}
          onChange={handleDateTimeChange}
          data-error={error ? 'true' : undefined}
        />
        {error && <div className={styles.error}>{error}</div>}
      </div>
    </div>
  );
}
