# ctOS NYC — Architecture

This document gives technical direction for implementation. Read it before any
non-trivial technical work, and keep it current when behavior changes.

## 1. Overview and principles

ctOS NYC is a client-side single-page app. Route planning runs entirely in the
browser against an in-memory copy of the MTA subway schedule. There is no
application backend, no database, and no user state on a server.

One server-side piece exists: a stateless edge function that proxies the MTA
realtime feeds, which the browser cannot fetch directly because those feeds send
no CORS headers. The proxy holds no state, stores nothing, and only relays a
fixed set of public MTA URLs.

Principles:

- **Routing is local.** The schedule is parsed once, ahead of time, and shipped
  as a compact binary asset. The browser loads it into memory and queries it with
  no network round-trip.
- **The server does as little as possible.** The only server code is the realtime
  proxy. It is a relay, not a service.
- **Realtime annotates; it does not route.** The router plans on the published
  schedule. Live data marks results and filters re-plans; it never re-times the
  schedule itself.
- **Nothing personal leaves the device.** Trip inputs are not sent anywhere. The
  proxy receives no rider data.

## 2. System diagram

```
                        ┌──────────────────────────────────────────────┐
                        │             BROWSER (rider device)            │
                        │                                                │
 ┌────────────────┐     │  ┌────────────┐    ┌───────────────────────┐  │
 │ Static assets  │────▶│  │ App shell  │    │ minotor router        │  │
 │ (Vercel CDN)   │load │  │ React+Vite │───▶│ in-memory RAPTOR over │  │
 │ · app bundle   │     │  │            │    │ the loaded timetable  │  │
 │ · timetable.pb │     │  └─────┬──────┘    └───────────────────────┘  │
 └────────────────┘     │        │                                       │
                        │        ├───────────────┐                       │
                        │        ▼               ▼                       │
                        │  ┌────────────┐   ┌──────────────────┐          │
                        │  │ MapLibre   │   │ realtime client  │          │
                        │  │ GL map     │   └────────┬─────────┘          │
                        │  └─────┬──────┘            │                    │
                        └────────┼───────────────────┼────────────────────┘
                                 │ vector tiles      │ normalized JSON
                                 ▼                   ▼
                       ┌──────────────────┐  ┌──────────────────────┐
                       │ keyless tile     │  │ Vercel Edge Function │
                       │ source           │  │ GET /api/realtime    │
                       └──────────────────┘  └──────────┬───────────┘
                                                        │ GTFS-rt protobuf
                                                        ▼
                                            ┌──────────────────────┐
                                            │ MTA public feeds      │
                                            │ · subway GTFS-rt      │
                                            │ · service alerts      │
                                            │ · elevator/escalator  │
                                            └──────────────────────┘
```

## 3. Component breakdown

| Component | Responsibility |
|---|---|
| App shell | React + Vite SPA: layout, routing between views, query/result state. |
| Timetable loader | Fetches `timetable.pb`, hydrates the in-memory minotor structures, drives the boot sequence. |
| minotor wrapper | Thin adapter over the `minotor` package: stop lookup, point/range queries, exclusion filters. |
| Realtime client | Calls `/api/realtime`, polls on an interval, exposes normalized disruptions. |
| Disruption matcher | Maps each disruption to the routes and stops it affects; annotates itineraries. |
| Map layer | MapLibre GL: dark basemap, route trace, station markers, viewport fit. |
| UI kit | `DESIGN.md` primitives: panels, buttons, alerts, mono/label text. |

## 4. Data model

**Static schedule.** The MTA GTFS static zip (stops, routes, trips, stop_times,
calendar) is the source. minotor's `GtfsParser` converts it into a `Timetable`
plus a stops index, serialized to a protobuf binary, `timetable.pb`. This is built
ahead of time (see §6), never in the browser.

**In-memory structures.** At startup the browser deserializes `timetable.pb` into
minotor's `Timetable` and `StopsIndex`, then constructs the `Router`. These live
for the session.

**Itinerary model.** A query returns Pareto-ranked itineraries. Each itinerary is
an ordered list of legs; a leg is either a transit leg (route, board stop, alight
stop, board/alight times) or a transfer/walk leg (from stop, to stop, duration).

**Realtime contract.** The proxy returns a stable JSON shape so the client never
parses protobuf:

```jsonc
GET /api/realtime
{
  "generatedAt": "2026-05-19T14:32:08Z",
  "alerts": [
    {
      "id": "lmm:alert:1234",
      "severity": "DEGRADED",            // SYSTEM | DEGRADED | BREACH
      "header": "string",
      "description": "string",
      "routeIds": ["A", "C"],
      "stopIds": ["A24"],
      "activePeriod": { "start": "ISO-8601", "end": "ISO-8601 | null" }
    }
  ],
  "tripDelays": [
    { "routeId": "A", "stopId": "A24", "delaySeconds": 420 }
  ],
  "accessibilityOutages": [
    {
      "stationId": "string",
      "equipmentType": "ELEVATOR",        // ELEVATOR | ESCALATOR
      "status": "OUT",
      "reason": "string",
      "estimatedReturn": "ISO-8601 | null"
    }
  ]
}
```

`severity` maps to `DESIGN.md` alert levels: `SYSTEM` → info, `DEGRADED` →
warning, `BREACH` → critical.

## 5. Data flows

**Build-time GTFS pipeline**

```
[GitHub Action: weekly cron + manual dispatch]
   │
   ├─▶ download MTA GTFS static zip
   ├─▶ minotor GtfsParser ──▶ Timetable + StopsIndex
   ├─▶ serialize ──▶ timetable.pb
   └─▶ publish asset ──▶ Vercel deploy
```

**Route planning query**

```
rider input
   ├─▶ resolve origin + destination to stop IDs (stops index)
   ├─▶ build query: { from, to, time, mode: depart-at | arrive-by }
   ├─▶ minotor point/range query against the in-memory Timetable
   ├─▶ Pareto-ranked itineraries (legs, transfers, times)
   └─▶ render: itinerary panels + MapLibre trace
```

**Realtime annotation and re-plan**

```
realtime client
   ├─▶ GET /api/realtime  (Edge Function, polled ~every 60s)
   ├─▶ normalized JSON: alerts[], tripDelays[], accessibilityOutages[]
   ├─▶ disruption matcher: disruption ──▶ affected routeIds / stopIds
   ├─▶ annotate each itinerary leg (DEGRADED | BREACH)
   └─▶ rider excludes a line/stop
         └─▶ re-run minotor query with those routes/stops filtered out
```

## 6. GTFS static pipeline

Parsing the full GTFS feed is slow (on the order of minutes) and must not happen
in the browser. A GitHub Action, scheduled weekly and runnable on demand,
downloads the MTA subway GTFS static zip, runs minotor's `GtfsParser` in Node,
serializes the result to `timetable.pb`, and triggers a Vercel deploy so the new
asset ships on the CDN.

The browser fetches `timetable.pb` once at startup and deserializes it behind the
`DESIGN.md` boot sequence. We consume the published `minotor` npm package, so the
app build needs no `protoc` toolchain.

## 7. Realtime proxy

A Vercel Edge Function at `GET /api/realtime`:

1. Fetches the MTA subway GTFS-realtime feeds, the service-alerts feed, and the
   elevator/escalator (accessibility) feed.
2. Parses the protobuf with `gtfs-realtime-bindings`, including the NYCT
   extension used by the MTA feeds.
3. Normalizes everything to the JSON contract in §4.
4. Caches the response briefly (~30 s) so polling clients share one upstream
   fetch, and returns it with permissive CORS headers.

Parsing stays server-side: it keeps protobuf and the NYCT extension out of the
client bundle, and gives the client one stable shape regardless of feed quirks.

**The proxy is not an open proxy.** It fetches a hard-coded allowlist of MTA feed
URLs only. It takes no URL or target from the request, accepts no rider data,
and logs nothing identifying.

## 8. External dependencies

| Dependency | Role | Notes |
|---|---|---|
| `minotor` | In-browser RAPTOR routing | MIT, TypeScript. Consume the published npm package. |
| `maplibre-gl` | Interactive map | Open source; renders the dark basemap and route trace. |
| `gtfs-realtime-bindings` | Protobuf parsing in the proxy | Server-side only, in the Edge Function. |
| Map tile source | Basemap tiles | Must be **keyless** (e.g. OpenFreeMap, or a self-hosted Protomaps `.pmtiles` file) so no API key lands in a public repo. |

## 9. Tech stack and minimum versions

| Layer | Choice | Minimum |
|---|---|---|
| Language | TypeScript | 5.4 |
| UI framework | React | 18 |
| Build tool | Vite | 5 |
| Runtime (build/CI) | Node.js | 22 LTS |
| Package manager | npm | 10 |
| Compile target | ECMAScript | ES2022 |

Supported browsers: current and previous major of Chrome, Edge, and Firefox;
Safari and iOS Safari 16.4 and later.

There is **no Python in this project.** The stack is TypeScript end to end,
including the Edge Function. The `pytest` and `ruff` steps named in
`workflows/feature-development.md` describe a Python core that does not exist
here; treat them as not applicable. Trimming the workflow file is tracked as a
follow-up issue.

## 10. Test strategy and frameworks

| Kind | Tooling | Scope |
|---|---|---|
| Unit + component | Vitest + `@testing-library/react` (jsdom) | Pure logic, the minotor wrapper, the disruption matcher, React components. |
| End-to-end | Playwright | Full flows at a mobile and a desktop viewport. |
| Accessibility | `@axe-core/playwright` | WCAG checks inside the e2e run. |

Tests ship with the feature that introduces them; every issue in the backlog
includes its own tests. Fixtures: a trimmed GTFS sample for the parser path and
captured GTFS-realtime protobuf payloads for the proxy normalizer.

## 11. CI/CD and deployment

GitHub Actions runs on every push and pull request:

- `npm run validate` — lint and type-check
- `npm test` — Vitest
- `npm run test:e2e` — Playwright
- `npm run build` — production build

Vercel deploys the production site on merge to `main` and a preview deployment
for every pull request. A separate scheduled Action rebuilds `timetable.pb` (see
§6). No deploy secrets are committed; the MTA feeds need no API key.

## 12. Security and privacy

- **No secrets in the repo.** The MTA feeds are keyless; the map tile source is
  keyless. There is nothing to leak.
- **The proxy is locked down.** Fixed MTA URL allowlist, no request-controlled
  targets, no rider data accepted, no identifying logs.
- **Content Security Policy.** A strict CSP is served; the only outbound origins
  are the realtime proxy and the tile source.
- **No analytics or tracking.** No telemetry, ad, or attribution SDKs.
- **No PII persistence.** Recent or saved trips live only in the device's
  `localStorage`; nothing syncs.
- **Author privacy.** Commits use a no-reply identity; no personal location data
  or private endpoints enter the public repository.

## 13. Performance budgets

| Budget | Target |
|---|---|
| Initial JS (gzipped, excludes map and timetable) | under ~250 KB |
| `timetable.pb` (compressed, lazy-loaded after first paint) | under ~8 MB |
| Query to itinerary, after the timetable has loaded | under ~1 s on a mid-range phone |
| Lighthouse mobile — performance and accessibility | tracked per release |

## 14. Open questions and future work

- **Offline planner.** A service worker caching the app shell and `timetable.pb`
  so a plan can be produced with no connection. Left out of the MVP.
- **Realtime-aware routing.** Feeding live trip updates into the timetable so the
  router itself accounts for delays. minotor has no native GTFS-realtime support,
  so this needs custom integration and is deferred.
- **Additional modes.** Buses and commuter rail would enlarge `timetable.pb` and
  add feeds; revisit budgets if pursued.
