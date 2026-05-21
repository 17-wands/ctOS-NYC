import { render, screen, within } from '@testing-library/react';
import { ErrorState } from './ErrorState';
import { TimetableLoadError, type LoadStage } from './loader';

describe('ErrorState', () => {
  it('renders the BREACH severity label', () => {
    render(
      <ErrorState
        error={new TimetableLoadError('fetch', 'Asset returned HTTP 404')}
        timestamp="2026-05-21T12:00:00Z"
      />,
    );

    expect(screen.getByText('BREACH')).toBeInTheDocument();
  });

  it('marks the panel with critical severity', () => {
    render(
      <ErrorState
        error={new TimetableLoadError('fetch', 'Boom')}
        timestamp="2026-05-21T12:00:00Z"
      />,
    );

    expect(screen.getByRole('region', { name: 'ROUTING SUBSYSTEM FAULT' })).toHaveAttribute(
      'data-severity',
      'critical',
    );
  });

  it('renders the error message inside an alert region', () => {
    render(
      <ErrorState
        error={new TimetableLoadError('deserialize', 'Failed to decode /timetable.pb')}
        timestamp="t"
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to decode /timetable.pb');
  });

  const STAGE_TO_IDENTIFIER: ReadonlyArray<readonly [LoadStage, string]> = [
    ['fetch', 'STAGE:FETCH'],
    ['deserialize', 'STAGE:DECODE'],
    ['router', 'STAGE:ROUTER'],
  ];

  it.each(STAGE_TO_IDENTIFIER)(
    'renders identifier %s for a stage=%s load error',
    (stage, identifier) => {
      render(<ErrorState error={new TimetableLoadError(stage, 'irrelevant')} timestamp="t" />);

      const region = screen.getByRole('region', { name: 'ROUTING SUBSYSTEM FAULT' });
      expect(within(region).getByText(identifier)).toBeInTheDocument();
    },
  );

  it('falls back to STAGE:UNKNOWN for a plain Error', () => {
    render(<ErrorState error={new Error('Unexpected')} timestamp="t" />);

    const region = screen.getByRole('region', { name: 'ROUTING SUBSYSTEM FAULT' });
    expect(within(region).getByText('STAGE:UNKNOWN')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Unexpected');
  });
});
