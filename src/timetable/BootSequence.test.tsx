import { render, screen, within } from '@testing-library/react';
import { BootSequence } from './BootSequence';
import { LOAD_STAGES, type LoadStage } from './loader';

describe('BootSequence', () => {
  it('renders the three pipeline stage codes', () => {
    render(<BootSequence stage="fetch" timestamp="2026-05-21T12:00:00Z" />);

    const list = screen.getByLabelText('Boot sequence stages');
    expect(within(list).getByText('TRANSMISSION')).toBeInTheDocument();
    expect(within(list).getByText('DECODE')).toBeInTheDocument();
    expect(within(list).getByText('ROUTING NODE')).toBeInTheDocument();
  });

  it('renders the supplied timestamp in the panel header', () => {
    render(<BootSequence stage="fetch" timestamp="2026-05-21T12:00:00Z" />);

    expect(screen.getByRole('region', { name: 'BOOT SEQUENCE' })).toHaveTextContent(
      '2026-05-21T12:00:00Z',
    );
  });

  type StateExpectation = readonly ('done' | 'active' | 'pending')[];

  const STAGE_EXPECTATIONS: ReadonlyArray<readonly [LoadStage, StateExpectation]> = [
    ['fetch', ['active', 'pending', 'pending']],
    ['deserialize', ['done', 'active', 'pending']],
    ['router', ['done', 'done', 'active']],
  ];

  it.each(STAGE_EXPECTATIONS)(
    'marks the right state for each row when stage="%s"',
    (stage, expected) => {
      render(<BootSequence stage={stage} timestamp="t" />);

      const list = screen.getByLabelText('Boot sequence stages');
      const items = within(list).getAllByRole('listitem');
      expect(items).toHaveLength(LOAD_STAGES.length);

      const states = items.map((li) => li.getAttribute('data-state'));
      expect(states).toEqual([...expected]);
    },
  );

  it('shows the active stage code as the panel status', () => {
    render(<BootSequence stage="router" timestamp="t" />);

    const region = screen.getByRole('region', { name: 'BOOT SEQUENCE' });
    expect(region).toHaveTextContent('ROUTING NODE');
  });
});
