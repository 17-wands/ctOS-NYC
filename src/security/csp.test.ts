import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BLOB_ORIGIN, CONTENT_SECURITY_POLICY, SECURITY_HEADERS, TILE_ORIGIN } from './csp';

type VercelHeader = { key: string; value: string };
type VercelConfig = { headers: { source: string; headers: VercelHeader[] }[] };

const vercel = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../vercel.json'), 'utf8'),
) as VercelConfig;

const rule = vercel.headers[0]!;
const served = Object.fromEntries(rule.headers.map((h) => [h.key, h.value]));

describe('production security headers (vercel.json)', () => {
  it('applies to every route', () => {
    expect(rule.source).toBe('/(.*)');
  });

  it('serves the CSP from the single source, in sync with vite preview', () => {
    expect(served['Content-Security-Policy']).toBe(CONTENT_SECURITY_POLICY);
  });

  it('serves every shared security header verbatim', () => {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      expect(served[key]).toBe(value);
    }
  });
});

describe('content security policy', () => {
  it('locks down the dangerous defaults', () => {
    expect(CONTENT_SECURITY_POLICY).toContain("default-src 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("base-uri 'self'");
  });

  it('allows only the realtime proxy (self), tiles, and the blob store to connect', () => {
    expect(CONTENT_SECURITY_POLICY).toContain(`connect-src 'self' ${TILE_ORIGIN} ${BLOB_ORIGIN}`);
  });

  it('does not permit unsafe script execution or open wildcards', () => {
    expect(CONTENT_SECURITY_POLICY).not.toContain('unsafe-eval');
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/script-src[^;]*\*/);
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/connect-src[^;]*\s\*/);
  });
});
