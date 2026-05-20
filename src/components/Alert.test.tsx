import { render, screen } from '@testing-library/react';
import { Alert } from './Alert';
import { SEVERITY_LABELS, SEVERITY_LEVELS } from './severity';

describe('Alert', () => {
  it.each(SEVERITY_LEVELS)('should render the %s level with its severity label', (level) => {
    render(<Alert level={level}>Sector 04 signal trace</Alert>);

    const role = level === 'critical' ? 'alert' : 'status';
    const alert = screen.getByRole(role);

    expect(alert).toHaveAttribute('data-level', level);
    expect(alert).toHaveTextContent(SEVERITY_LABELS[level]);
    expect(alert).toHaveTextContent('Sector 04 signal trace');
  });

  it('should expose the assertive alert role only at the critical level', () => {
    render(<Alert level="critical">Breach detected</Alert>);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
