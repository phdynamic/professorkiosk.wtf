# STATUS (as of 6074e52, 2026-10-13)

## Built
- Feed generator at `/feeds`: Top Skeets (by likes) and My Skeets (newest first), each with or without replies, up to 4 feeds per account. App-password sign-in, any AT Protocol PDS, background scheduler, JSON files in `DATA_DIR`, `GET /health`. Code: `src/*.ts`, `public/feeds.html`.
- Hub at `/` with 13 cards: 9 built here (below), 4 external links (Shitsky38.com, ContestDashboard.live, Clover Kiss Cinema, My Twitter Archive).
- Pages in `public/`, all browser-only except `/feeds`: `/tutorials` (card 01; text in `tutorials.txt`, video in `media/`), `/jokeweb` (02), `/mashup` (03; topics in `topics.js`), `/formats` (04; Format Deck, 30 formats in 7 categories in `formats.txt`), `/mutualmatch` (05; Mutual Match, two handles, shared follows, followers and replies, and where they differ), `/feeds` (06), `/rushhour` (07; Rush Hour, week heatmap, a pop-up of the posts in a square, and What Lands), `/transitpass` (08; Transit Pass, a handle in, a canvas pass out), `/receipt` (09), `/tracer` (10), `/imagine-flagons` (11; live trace on every visit). Separate sites are 12 to 15.
- Shared: `kiosk.css`, `kiosk.js` (footer avatar + tab icon), `kiosk-links.js` (post-link parser, also used by the server), `kiosk-help.js` (Help dialog on the six tool pages), `favicon.svg`, self-hosted fonts.
- Server hardening: shared AppView request budget (`src/budget.ts`), proxy-aware client address (`src/clientip.ts`), rate-limited mutation endpoints.

## Tested
- Unit (`npm test`): budget, clientip, links. Last run 2026-10-13: 17 of 17 pass.
- Browser (`npm run test:browser`): tracer 39, imagine 7, receipt 122, jokeweb 118, mashup 49, formats 49, transitpass 33, icon 12, help 59, tutorials 29, feeds 12, footer 1. Last full run 2026-10-13: all pass (the formats, help and mashup suites were re-run after the later Format Deck edits). All use mocked Bluesky responses, in a Linux sandbox.
- Mutual Match (2026-10-13): built and covered by the `mutualmatch` suite (30 checks, mocked Bluesky); not live-tested. Defaults chosen with the developer: compares follows, followers and replies; 5,000 per list then Load more to 20,000; list plus card. "They differ" (the developer's addition) uses replies as "interaction".
- Rush Hour (2026-10-13): built and covered by the `rushhour` suite (34 checks, mocked Bluesky); not live-tested. Defaults chosen with the developer: heatmap counts originals and quotes (not replies or reposts), "best" is likes only, visitor's time zone with a UTC switch, 500 posts then Load 500 more up to 5,000.
- Transit Pass (2026-10-13): built and covered by the `transitpass` suite (mocked Bluesky); not live-tested. Whether `createdAt` on a real profile is the account's join date is unconfirmed.
- Format Deck (2026-10-13): reviewed with the developer category by category in chat; tips, worked examples and "Seen in the wild" removed; the finder script removed. Not live-tested.

## Not tested / unknown
- Behavior against real Bluesky and the Railway deployment: not recorded in the repo.
- Real-device phone rendering: not recorded in the repo.
- Which commit is deployed: not recorded in the repo.

## Known stale
(none)
