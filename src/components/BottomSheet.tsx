import styles from './BottomSheet.module.css';

type BottomSheetProps = {
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
};

/**
 * Mobile-only bottom sheet that slides up from the bottom of the viewport.
 * Hidden on desktop via CSS media query.
 */
export function BottomSheet({ children, isExpanded, onToggle }: BottomSheetProps) {
  return (
    <div
      className={styles.sheet}
      data-expanded={isExpanded}
      role="region"
      aria-label="Route results"
    >
      <button
        className={styles.handle}
        onClick={onToggle}
        aria-label={isExpanded ? 'Collapse results' : 'Expand results'}
        aria-expanded={isExpanded}
        type="button"
      >
        <span className={styles.handleBar} />
      </button>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
