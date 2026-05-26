import { useCallback, useEffect, useRef, useState } from 'react';
import type { Stop, StopsIndex } from 'minotor';
import { Label, Mono } from '../components/Text';
import { debounce } from './utils';
import styles from './StationSearch.module.css';

type StationSearchProps = {
  stopsIndex: StopsIndex;
  value: Stop | null;
  onChange: (stop: Stop | null) => void;
  placeholder: string;
  label: string;
  id: string;
  error?: string;
};

/**
 * Station search with autocomplete dropdown.
 * Searches the stops index by name and shows up to 8 station results.
 * Supports keyboard navigation (Arrow keys, Enter, Escape).
 */
export function StationSearch({
  stopsIndex,
  value,
  onChange,
  placeholder,
  label,
  id,
  error,
}: StationSearchProps) {
  const [inputValue, setInputValue] = useState(value?.name ?? '');
  const [results, setResults] = useState<Stop[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search function
  const search = useCallback(
    (query: string) => {
      const debouncedFn = debounce(() => {
        if (query.trim().length === 0) {
          setResults([]);
          setIsOpen(false);
          return;
        }
        const stops = stopsIndex
          .findStopsByName(query, 8)
          .filter((stop) => stop.locationType === 'STATION');
        setResults(stops);
        setIsOpen(stops.length > 0);
        setSelectedIndex(-1);
      }, 200);
      debouncedFn();
    },
    [stopsIndex],
  );

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setInputValue(query);
    if (value) {
      onChange(null); // Clear selection if user types after selecting
    }
    search(query);
  };

  // Handle stop selection
  const handleSelectStop = (stop: Stop) => {
    setInputValue(stop.name);
    onChange(stop);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          const selected = results[selectedIndex];
          if (selected) {
            handleSelectStop(selected);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync input value when value prop changes externally (e.g., from geolocation)
  useEffect(() => {
    if (value) {
      setInputValue(value.name);
    }
  }, [value]);

  return (
    <div className={styles.container}>
      <label htmlFor={id} className={styles.label}>
        <Label>{label}</Label>
      </label>
      <input
        ref={inputRef}
        type="text"
        id={id}
        role="combobox"
        className={styles.input}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-expanded={isOpen}
        aria-controls={`${id}-dropdown`}
        aria-autocomplete="list"
        aria-activedescendant={selectedIndex >= 0 ? `${id}-option-${selectedIndex}` : undefined}
        data-error={error ? 'true' : undefined}
      />
      {value && (
        <div className={styles.selectedId}>
          <Mono>{value.sourceStopId}</Mono>
        </div>
      )}
      {error && <div className={styles.error}>{error}</div>}
      {isOpen && (
        <div ref={dropdownRef} id={`${id}-dropdown`} role="listbox" className={styles.dropdown}>
          {results.length === 0 && <div className={styles.noResults}>NO STATIONS FOUND</div>}
          {results.map((stop, index) => (
            <button
              key={stop.id}
              id={`${id}-option-${index}`}
              type="button"
              role="option"
              aria-selected={index === selectedIndex}
              className={styles.option}
              data-selected={index === selectedIndex ? 'true' : undefined}
              onClick={() => handleSelectStop(stop)}
            >
              <span className={styles.optionName}>{stop.name}</span>
              <Mono>{stop.sourceStopId}</Mono>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
