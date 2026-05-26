/**
 * Content Security Policy and related security headers.
 *
 * Single source of truth: `vercel.json` serves these in production and
 * `vite.config.ts` serves them from `vite preview`; `csp.test.ts` asserts the
 * two stay in sync. The only outbound origins are the same-origin realtime proxy
 * (`/api/realtime`), the keyless map tile source, and the Vercel Blob store that
 * hosts the schedule assets — no analytics, ads, or third-party origins.
 *
 * Reference: ARCHITECTURE.md §12, PRD.md §9.
 */

/** Keyless map tiles (style, glyphs, sprites, vector tiles). */
export const TILE_ORIGIN = 'https://tiles.openfreemap.org';

/** Vercel Blob store hosting the schedule manifest + `.pb` assets. */
export const BLOB_ORIGIN = 'https://*.public.blob.vercel-storage.com';

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self'",
  // maplibre-gl sets inline style attributes at runtime.
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${TILE_ORIGIN}`,
  "font-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  `connect-src 'self' ${TILE_ORIGIN} ${BLOB_ORIGIN}`,
].join('; ');

/** Security headers served alongside the CSP. */
export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};
