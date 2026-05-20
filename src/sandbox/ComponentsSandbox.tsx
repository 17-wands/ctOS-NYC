import { Alert, Button, Label, Mono, Panel, SEVERITY_LEVELS } from '../components';
import styles from './ComponentsSandbox.module.css';

const ALERT_MESSAGES: Record<(typeof SEVERITY_LEVELS)[number], string> = {
  info: 'Sector 04 / scan complete',
  success: 'Sector 04 / route authorized',
  warning: 'Sector 04 / signal degraded',
  critical: 'Sector 04 / access breach',
  unknown: 'Sector 04 / signal unverified',
};

/**
 * Internal gallery of every primitive in its variants and states. Used to
 * sanity-check the design system against the DESIGN.md brand checks and as
 * the target of the /components e2e smoke test.
 */
export function ComponentsSandbox() {
  return (
    <div className={styles.sandbox}>
      <h1 className={styles.heading}>COMPONENT LIBRARY</h1>

      <section className={styles.section} aria-label="Buttons">
        <h2 className={styles.sectionTitle}>BUTTONS</h2>
        <div className={styles.row}>
          <Button variant="primary">AUTHORIZE</Button>
          <Button variant="secondary">OPEN INCIDENT</Button>
          <Button variant="destructive">REVOKE ACCESS</Button>
          <Button variant="primary" disabled>
            AUTHORIZE
          </Button>
        </div>
      </section>

      <section className={styles.section} aria-label="Alerts">
        <h2 className={styles.sectionTitle}>ALERTS</h2>
        <div className={styles.stack}>
          {SEVERITY_LEVELS.map((level) => (
            <Alert key={level} level={level}>
              {ALERT_MESSAGES[level]}
            </Alert>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-label="Panels">
        <h2 className={styles.sectionTitle}>PANELS</h2>
        <div className={styles.stack}>
          <Panel
            title="Route Trace"
            identifier="TRC-4472"
            status="Active"
            timestamp="14:22:09"
            severity="critical"
            footer={<Button variant="secondary">OPEN AUDIT</Button>}
          >
            Northbound corridor under review. Three transfer nodes flagged for service change.
          </Panel>
          <Panel title="Standby Module" inactive>
            Module dim until a route is selected.
          </Panel>
        </div>
      </section>

      <section className={styles.section} aria-label="Typography">
        <h2 className={styles.sectionTitle}>TYPOGRAPHY</h2>
        <div className={styles.typeStack}>
          <p className={styles.typeDisplayMd}>Display MD</p>
          <p className={styles.typeHeadingLg}>Heading LG</p>
          <p className={styles.typeHeadingMd}>Heading MD</p>
          <p className={styles.typeBodyMd}>Body MD — operational copy.</p>
          <p className={styles.typeBodySm}>Body SM — secondary copy.</p>
          <div className={styles.row}>
            <Label>Interface Label</Label>
            <Mono>MONO-0042 / 14:22:09</Mono>
          </div>
        </div>
      </section>
    </div>
  );
}
