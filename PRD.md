# ctOS NYC — Product Requirements

## 1. Overview

ctOS NYC is a web app for planning subway trips across New York City. A rider
enters an origin and a destination, picks when they want to travel, and gets back
a ranked set of itineraries, drawn from the MTA's public schedule data and
checked against live service. Everything that decides a route runs in the
browser: the schedule is held in memory and queried locally, so results come back
fast and the app keeps working even when the network is slow. The interface
follows the "Overlord" design system in `DESIGN.md`, which gives the app the cold,
instrument-panel look of the ctOS operating system from the Watch Dogs games.

## 2. Problem and motivation

Planning a subway trip in New York is harder than it should be.

- Most planners are slow. They round-trip every query to a server, so a simple
  "how do I get from A to B" takes several seconds and a connection.
- They are disruption-blind. The schedule says one thing; the actual system,
  with its outages, reroutes, and dead elevators, says another. Riders find out
  about a problem when they are already standing on the platform.
- They cost the rider something other than money. Accounts, app installs, ad
  SDKs, and location tracking are the norm. The trip you are planning is personal
  data, and most tools treat it that way.

ctOS NYC is the counter-argument: a planner that is fast because it runs locally,
honest because it shows live disruptions on the route it just gave you, and
private because it has nothing to log you into and nothing to sell.

## 3. Audience

**Primary:** NYC subway riders on a phone: commuters who take the same few trips
daily and want a quick check before they leave, and visitors who do not know the
system and need a plan they can trust.

**Secondary:** the same riders at a desktop, planning ahead. Desktop is a wider
layout of the same product, not a separate experience.

No rider needs an account, an install, or a permission grant to get a route. The
app opens, loads, and answers.

## 4. Goals and success criteria

| Goal | Success looks like |
|---|---|
| Fast answers | After the schedule has loaded, a plan returns in well under a second on a mid-range phone. |
| Honest answers | Every itinerary is checked against live service; anything affecting it is shown on the result. |
| Private by default | No accounts, no analytics, no tracking. Trip details stay on the device. |
| Works under stress | Once loaded, the planner answers without a live connection; only the disruption layer needs the network. |
| On-brand | The interface is unmistakably the `DESIGN.md` system, judged against its brand checks. |

## 5. Core workflows

1. **Plan a trip.** The rider sets an origin and a destination and receives a
   ranked list of itineraries, each with legs, transfers, and timing.
2. **Adjust the time.** The rider chooses "depart at" or "arrive by" and a
   date/time; the plan updates for that window.
3. **Find the nearest station.** With permission, the rider drops their current
   location onto the nearest station as an origin.
4. **Read the disruptions.** Each result surfaces the alerts, delays, and
   accessibility outages that touch its lines and stations.
5. **Exclude and re-plan.** The rider drops a disrupted line or station and the
   planner routes around it, showing the alternative.

## 6. Functional requirements (MVP)

- **Station search.** Type-ahead search over every subway station in the GTFS
  data, by name. Selecting a result sets it as origin or destination.
- **Nearest station.** On request, use device geolocation to pick the closest
  station as the origin. Geolocation is opt-in: it runs only on an explicit tap,
  reads the position once, and is never stored or tracked — the button says so.
- **Freshness and refresh.** Show when the loaded schedule was published and when
  the live overlay last updated, plus an online/offline indicator. The live data
  refreshes on a cadence and on demand; the rider can force a refresh.
- **Offline planning.** Once the app has loaded, a plan can be produced with no
  connection — the schedule window is cached on the device. Live annotations are
  suppressed offline and resume when the connection returns.
- **Time selection.** Choose "depart at" or "arrive by" with a date and time;
  default to departing now.
- **Itinerary results.** Run the in-memory router for the chosen origin,
  destination, and time window, and return a ranked set of itineraries with legs,
  transfers, walking segments, and arrival times.
- **Map visualization.** Show the chosen itinerary on an interactive map: the
  route traced between stations, with the stops marked.
- **Disruption annotations.** Fetch live service data and mark, on each result,
  any alert, delay, or elevator/escalator outage that affects its lines or
  stations.
- **Exclude and re-plan.** Let the rider remove a flagged line or station from
  consideration and re-run the plan against the remaining network.
- **Responsive layout.** One product that works on a phone and a desktop, built
  mobile-first.

## 7. Experience and voice

The interface speaks the `DESIGN.md` "Overlord" language. Stations read as nodes,
routes as traces, disruptions as system states: `DEGRADED` for a delay or a
planned change, `BREACH` for a suspension or a critical outage. Copy is terse and
declarative; results carry identifiers, timestamps, and status the way the design
system prescribes.

This document does not specify colors, type, motion, or components. `DESIGN.md` is
the single source of truth for all visual and voice decisions, and any UI work
defers to it.

A note on the theme: the ctOS look is an homage. The product is not affiliated
with, endorsed by, or connected to Ubisoft or the Watch Dogs franchise.

## 8. Non-goals (MVP)

- **No accounts and no server-side storage.** Nothing to sign into; no trip
  history kept off-device.
- **No other modes.** Subway only. Buses, the Staten Island Railway as a through
  service, LIRR, and Metro-North are out of scope for the MVP.
- **No address geocoding.** Routing is station-to-station. Typing a street
  address and getting door-to-door directions is a future goal, not MVP.
- **No analytics or tracking.** No usage telemetry, no ad or attribution SDKs, no
  fingerprinting.
- **No realtime-aware routing.** The router plans on the published schedule. Live
  data annotates and filters results; it does not re-time the schedule itself.
- **Not a Watch Dogs product.** No use of Ubisoft trademarks, assets, or branding.

## 9. Privacy and security posture

The repository and its commit history are public. Two things follow from that.

**Rider privacy.** A trip is sensitive: it says where someone is and where they
are going. The app is fully client-side. Trip inputs never reach a server; the
only outbound request is to a stateless proxy that fetches public MTA service
data and logs nothing identifying. Any saved or recent trips live in the device's
own `localStorage` and never sync. Geolocation is requested only on an explicit
action and is used once, locally.

**Author privacy.** Because commits are public, the project keeps no secrets in
the repository (the MTA feeds need no API key) and the author's personal details
stay out of it: a no-reply commit identity, no real-world location data, no
private endpoints.

## 10. Stretch and future work

- **More modes.** Buses and commuter rail.
- **Address geocoding.** Door-to-door planning from typed addresses.
- **Saved trips.** On-device favorites and quick re-runs of common commutes.
- **Accessible routing.** A preference to plan only step-free, elevator-served
  paths.

## 11. Success metrics

- **Time to first plan** — from app open to first itinerary, and from query to
  result once loaded.
- **Disruption-match accuracy** — share of relevant live alerts correctly tied to
  the routes they affect, with no false attributions.
- **Lighthouse mobile score** — performance and accessibility, tracked per
  release.
- **Bundle and asset budget** — initial JavaScript and the in-memory schedule
  asset held within the limits set in `ARCHITECTURE.md`.
