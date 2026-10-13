# STATUS (as of 7390f3b, 2026-10-13)

## Built
- Feed generator at `/feeds`: Top Skeets (by likes) and My Skeets (newest first), each with or without replies, up to 4 feeds per account. App-password sign-in, any AT Protocol PDS, background scheduler, JSON files in `DATA_DIR`, `GET /health`. Code: `src/*.ts`, `public/feeds.html`.
- Hub at `/` with 12 cards: 8 built here (below), 4 external links (Shitsky38.com, ContestDashboard.live, Clover Kiss Cinema, My Twitter Archive).
- Pages in `public/`, all browser-only except `/feeds`: `/tutorials` (card 01; text in `tutorials.txt`, video in `media/`), `/jokeweb` (02), `/mashup` (03; topics in `topics.js`), `/feeds` (04), `/receipt` (05), `/tracer` (06), `/imagine-flagons` (07; live trace on every visit), `/formats` (08; Format Deck, 30 formats in 7 categories in `formats.txt`).
- Shared: `kiosk.css`, `kiosk.js` (footer avatar + tab icon), `kiosk-links.js` (post-link parser, also used by the server), `kiosk-help.js` (Help dialog on the six tool pages), `favicon.svg`, self-hosted fonts.
- Server hardening: shared AppView request budget (`src/budget.ts`), proxy-aware client address (`src/clientip.ts`), rate-limited mutation endpoints.

## Tested
- Unit (`npm test`): budget, clientip, links. Last run 2026-10-13: 17 of 17 pass.
- Browser (`npm run test:browser`): tracer 39, imagine 7, receipt 122, jokeweb 118, mashup 49, formats 48, icon 11, help 52, tutorials 29, feeds 12, footer 1. Last full run 2026-10-13: all pass (the formats, help and mashup suites were re-run after the later Format Deck edits). All use mocked Bluesky responses, in a Linux sandbox.
- Format Deck (2026-10-13): reviewed with the developer category by category in chat; tips, worked examples and "Seen in the wild" removed; the finder script removed. Not live-tested.

## Not tested / unknown
- Behavior against real Bluesky and the Railway deployment: not recorded in the repo.
- Real-device phone rendering: not recorded in the repo.
- Which commit is deployed: not recorded in the repo.

## Known stale
(none)
