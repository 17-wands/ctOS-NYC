import { expect, test } from '@playwright/test';
import { PINNED_NOW, bootToReady, mockApp, planTrip, type RealtimeBody } from './support/app';

function alertOnRoute1(severity: string, header: string): RealtimeBody {
  return {
    generatedAt: PINNED_NOW.toISOString(),
    alerts: [
      {
        id: 'a1',
        severity,
        header,
        description: 'Test alert',
        routeIds: ['1'], // the fixture's only route_short_name
        stopIds: [],
        activePeriod: { start: PINNED_NOW.toISOString(), end: null },
      },
    ],
    tripDelays: [],
    accessibilityOutages: [],
  };
}

test.describe('Disruption annotations', () => {
  test('flags an itinerary whose route has an active alert', async ({ page }) => {
    await mockApp(page, alertOnRoute1('DEGRADED', 'Signal problems'));
    const region = await bootToReady(page);
    await planTrip(region, 'Times', 'Franklin');

    const card = region.getByRole('button').filter({ hasText: 'DURATION' }).first();
    await expect(card).toBeVisible({ timeout: 10000 });
    await expect(card).toHaveAttribute('data-severity', 'warning');

    await card.click();
    const disruptions = region.getByRole('region', { name: 'DISRUPTIONS' });
    await expect(disruptions).toBeVisible();

    // Progressive disclosure (#43): alert details are hidden until expanded.
    await expect(disruptions.getByText('Signal problems')).toBeHidden();
    await disruptions.getByRole('button', { name: /VIEW \d+ DISRUPTION/ }).click();
    await expect(disruptions.getByText('Signal problems')).toBeVisible();

    // The itinerary detail must render above the disruption summary (#43).
    const itinerary = region.getByRole('region', { name: 'ITINERARY' });
    const itineraryBox = await itinerary.boundingBox();
    const disruptionsBox = await disruptions.boundingBox();
    expect(itineraryBox!.y).toBeLessThan(disruptionsBox!.y);
  });

  test('shows no annotations when realtime data is empty', async ({ page }) => {
    await mockApp(page); // empty realtime
    const region = await bootToReady(page);
    await planTrip(region, 'Times', 'Franklin');

    const card = region.getByRole('button').filter({ hasText: 'DURATION' }).first();
    await expect(card).toBeVisible({ timeout: 10000 });
    await expect(card).not.toHaveAttribute('data-severity');

    await card.click();
    await expect(region.getByRole('region', { name: 'DISRUPTIONS' })).toHaveCount(0);
  });
});
