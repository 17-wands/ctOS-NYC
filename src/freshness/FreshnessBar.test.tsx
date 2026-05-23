import { fireEvent, render, screen, within } from '@testing-library/react';
import { FreshnessBar } from './FreshnessBar';

const PUBLISHED = '2026-05-22T08:00:00-04:00';
const LIVE = '2026-05-22T14:30:00-04:00';

describe('FreshnessBar', () => {
  it('shows the schedule date and live time when online', () => {
    render(
      <FreshnessBar
        feedPublishedAt={PUBLISHED}
        liveUpdatedAt={LIVE}
        online
        refreshing={false}
        onRefresh={() => {}}
      />,
    );

    const bar = screen.getByRole('region', { name: 'Data freshness' });
    expect(within(bar).getByText('2026-05-22')).toBeInTheDocument(); // schedule (NYC date)
    expect(within(bar).getByText('2:30 PM')).toBeInTheDocument(); // live (NYC time)
    expect(within(bar).getByRole('status', { name: 'Online' })).toHaveTextContent('ONLINE');
  });

  it('shows OFFLINE for live data and status when offline', () => {
    render(
      <FreshnessBar
        feedPublishedAt={PUBLISHED}
        liveUpdatedAt={LIVE}
        online={false}
        refreshing={false}
        onRefresh={() => {}}
      />,
    );

    expect(screen.getByRole('status', { name: 'Offline' })).toHaveTextContent('OFFLINE');
  });

  it('renders an em dash when there is no live timestamp yet', () => {
    render(
      <FreshnessBar
        feedPublishedAt={PUBLISHED}
        liveUpdatedAt={null}
        online
        refreshing={false}
        onRefresh={() => {}}
      />,
    );

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('calls onRefresh when the button is clicked', () => {
    const onRefresh = vi.fn();
    render(
      <FreshnessBar
        feedPublishedAt={PUBLISHED}
        liveUpdatedAt={LIVE}
        online
        refreshing={false}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'REFRESH' }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('disables refresh while refreshing', () => {
    render(
      <FreshnessBar
        feedPublishedAt={PUBLISHED}
        liveUpdatedAt={LIVE}
        online
        refreshing
        onRefresh={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'REFRESHING...' })).toBeDisabled();
  });

  it('disables refresh while offline', () => {
    render(
      <FreshnessBar
        feedPublishedAt={PUBLISHED}
        liveUpdatedAt={LIVE}
        online={false}
        refreshing={false}
        onRefresh={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'REFRESH' })).toBeDisabled();
  });
});
