import { describe, expect, it } from 'vitest';
import { Map } from './Map';

describe('Map', () => {
  it('exports Map component', () => {
    expect(Map).toBeDefined();
    expect(typeof Map).toBe('function');
  });

  // Note: Full component rendering tests are skipped due to MapLibre GL mock complexity.
  // The Map component is tested via:
  // 1. E2E tests (e2e/routing.spec.ts) - verifies map renders in real browser
  // 2. Manual testing - map visualization with actual tile data
  // 3. Geometry unit tests (geometry.test.ts) - verifies GeoJSON conversion logic
});
