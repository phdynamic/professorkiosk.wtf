# STATUS (as of 6074e52, 2026-10-13)

## Built
- Feed generator at `/feeds`: Top Skeets (by likes) and My Skeets (newest first), each with or without replies, up to 4 feeds per account. App-password sign-in, any AT Protocol PDS, background scheduler, JSON files in `DATA_DIR`, `GET /health`. Code: `src/*.ts`, `public/feeds.html`.
- Hub at `/` with 13 cards: 9 built here (below), 4 external links (Shitsky38.com, ContestDashboard.live, Clover Kiss Cinema, My Twitter Archive).
- Pages in `public/`, all browser-only except `/feeds`: `/tutorials` (card 01; text in `tutorials.txt`, video in `media/`), `/jokeweb` (02), `/mashup` (03; topics in `topics.js`), `/formats` (04; Format Deck, 30 formats in 7 categories in `formats.txt`), `/tightener` (05; Joke Tightener, rule-based filler, repeat and long-sentence flags), `/mutualmatch` (06; Mutual Match), `/feeds` (07), `/rushhour` (08), `/transitpass` (09), `/receipt` (10), `/tracer` (11), `/imagine-flagons` (12; live trace on every visit). Separate sites are 13 to 16.
- Shared: `kiosk.css`, `kiosk.js` (footer avatar + tab icon), `kiosk-links.js` (post-link parser, also used by the server), `kiosk-help.js` (Help dialog on the six tool pages), `favicon.svg`, self-hosted fonts.
- Server hardening: shared AppView request budget (`src/budget.ts`), proxy-aware client address (`src/clientip.ts`), rate-limited mutation endpoints.

## Tested
- Unit (`npm test`): budget, clientip, links. Last run 2026-10-13: 17 of 17 pass.
- Browser (`npm run test:browser`): tracer 39, imagine 7, receipt 122, jokeweb 118, mashup 49, formats 49, transitpass 33, icon 12, help 59, tutorials 29, feeds 12, footer 1. Last full run 2026-10-13: all pass (the formats, help and mashup suites were re-run after the later Format Deck edits). All use mocked Bluesky responses, in a Linux sandbox.
- Joke Tightener (2026-10-13): built and covered by the `tightener` suite (21 checks); not live-tested. The developer's choices: it tightens the whole joke (no punchline detection), flags filler and hedges (tap to cut), repeated words and long sentences, offers a one-tap tighten with Undo, a 300-character counter, Copy and Open in Bluesky, and stores nothing. The word lists and the 22-word long-sentence limit are mine.
- Mutual Match (2026-10-13): "They differ" now means likes and reposts (not replies); likes are read from each account's own server via plc.directory, which may fail on some servers (it then falls back to reposts only). Built and covered by the `mutualmatch` suite (30 checks, mocked Bluesky); not live-tested. Defaults chosen with the developer: compares follows and replies (the Follow both tab was replaced by Community on 2026-10-13 because followers lists are slow); 5,000 follows then Load more to 20,000; list plus card. "They differ" (the developer's addition) uses replies as "interaction".
- Rush Hour (2026-10-13): built and covered by the `rushhour` suite (34 checks, mocked Bluesky); not live-tested. Defaults chosen with the developer: heatmap counts originals and quotes (not replies or reposts), "best" is likes only, visitor's time zone with a UTC switch, 500 posts then Load 500 more up to 5,000.
- Transit Pass (2026-10-13): built and covered by the `transitpass` suite (mocked Bluesky); not live-tested. Whether `createdAt` on a real profile is the account's join date is unconfirmed.
- Format Deck (2026-10-13): reviewed with the developer category by category in chat; tips, worked examples and "Seen in the wild" removed; the finder script removed. Not live-tested.

## Not tested / unknown
- Behavior against real Bluesky and the Railway deployment: not recorded in the repo.
- Real-device phone rendering: not recorded in the repo.
- Which commit is deployed: not recorded in the repo.

## Known stale
(none)
