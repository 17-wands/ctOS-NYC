import type { ReactNode } from 'react';
import styles from './Text.module.css';

type TextProps = {
  children: ReactNode;
};

/** Uppercase interface label — DESIGN.md section 5, label scale step. */
export function Label({ children }: TextProps) {
  return <span className={styles.label}>{children}</span>;
}

/** Monospaced text for IDs, timestamps, coordinates, and codes. */
export function Mono({ children }: TextProps) {
  return <span className={styles.mono}>{children}</span>;
}
