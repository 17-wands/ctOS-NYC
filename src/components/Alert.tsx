import type { ReactNode } from 'react';
import { SEVERITY_LABELS, type Severity } from './severity';
import styles from './Alert.module.css';

type AlertProps = {
  level: Severity;
  children: ReactNode;
};

/**
 * Status banner across the five DESIGN.md severity levels. Critical alerts
 * use `role="alert"` (assertive announcement); the others use `role="status"`.
 */
export function Alert({ level, children }: AlertProps) {
  const role = level === 'critical' ? 'alert' : 'status';

  return (
    <div className={styles.alert} data-level={level} role={role}>
      <span className={styles.label}>{SEVERITY_LABELS[level]}</span>
      <span className={styles.message}>{children}</span>
    </div>
  );
}
