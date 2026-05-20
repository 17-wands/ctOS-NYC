import type { ReactNode } from 'react';
import type { Severity } from './severity';
import { Label, Mono } from './Text';
import styles from './Panel.module.css';

type PanelProps = {
  title: string;
  identifier?: string;
  status?: string;
  timestamp?: string;
  severity?: Severity;
  inactive?: boolean;
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Modular control surface (DESIGN.md section 8): header strip with title and
 * optional metadata, a body, an optional severity rail, and an optional footer.
 * Exposes `data-severity` and `data-inactive` for styling and test hooks.
 */
export function Panel({
  title,
  identifier,
  status,
  timestamp,
  severity,
  inactive,
  footer,
  children,
}: PanelProps) {
  return (
    <section
      className={styles.panel}
      aria-label={title}
      data-severity={severity}
      data-inactive={inactive || undefined}
    >
      {severity ? (
        <span className={styles.rail} data-severity={severity} aria-hidden="true" />
      ) : null}
      <div className={styles.body}>
        <header className={styles.header}>
          <span className={styles.title}>{title}</span>
          <div className={styles.meta}>
            {identifier ? <Mono>{identifier}</Mono> : null}
            {status ? <Label>{status}</Label> : null}
            {timestamp ? <Mono>{timestamp}</Mono> : null}
          </div>
        </header>
        <div className={styles.content}>{children}</div>
        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
      </div>
    </section>
  );
}
