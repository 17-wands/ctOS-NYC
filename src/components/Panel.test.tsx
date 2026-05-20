import { render, screen } from '@testing-library/react';
import { Panel } from './Panel';

describe('Panel', () => {
  it('should expose the title as the region label', () => {
    render(<Panel title="Route Trace">Body copy</Panel>);

    expect(screen.getByRole('region', { name: 'Route Trace' })).toBeInTheDocument();
  });

  it('should render its children', () => {
    render(<Panel title="Route Trace">Northbound corridor</Panel>);

    expect(screen.getByRole('region')).toHaveTextContent('Northbound corridor');
  });

  it('should render the optional header metadata when provided', () => {
    render(
      <Panel title="Route Trace" identifier="TRC-4472" status="Active" timestamp="14:22:09">
        Body
      </Panel>,
    );

    const panel = screen.getByRole('region');

    expect(panel).toHaveTextContent('TRC-4472');
    expect(panel).toHaveTextContent('Active');
    expect(panel).toHaveTextContent('14:22:09');
  });

  it('should render the footer when provided', () => {
    render(
      <Panel title="Route Trace" footer={<span>Audit link</span>}>
        Body
      </Panel>,
    );

    expect(screen.getByText('Audit link')).toBeInTheDocument();
  });

  it('should mark the panel with the given severity', () => {
    render(
      <Panel title="Route Trace" severity="critical">
        Body
      </Panel>,
    );

    expect(screen.getByRole('region')).toHaveAttribute('data-severity', 'critical');
  });

  it('should render the inactive state', () => {
    render(
      <Panel title="Route Trace" inactive>
        Body
      </Panel>,
    );

    expect(screen.getByRole('region')).toHaveAttribute('data-inactive');
  });
});
