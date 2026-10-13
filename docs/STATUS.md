# STATUS (as of e89d28b, 2026-10-10)

## Built
- Feed generator at `/feeds`: Top Skeets (by likes) and My Skeets (newest first), each with or without replies, up to 4 feeds per account. App-password sign-in, any AT Protocol PDS, background scheduler, JSON files in `DATA_DIR`, `GET /health`. Code: `src/*.ts`, `public/feeds.html`.
- Hub at `/` with 12 cards: 8 built here (below), 4 external links (Shitsky38.com, ContestDashboard.live, Clover Kiss Cinema, My Twitter Archive).
- Pages in `public/`, all browser-only except `/feeds`: `/tutorials` (card 01; text in `tutorials.txt`, video in `media/`), `/jokeweb` (02), `/mashup` (03; topics in `topics.js`), `/feeds` (04), `/receipt` (05), `/tracer` (06), `/imagine-flagons` (07; live trace on every visit), `/formats` (08; Format Deck, formats in `formats.txt`; added 2026-10-13, not yet committed).
- Shared: `kiosk.css`, `kiosk.js` (footer avatar + tab icon), `kiosk-links.js` (post-link parser, also used by the server), `kiosk-help.js` (Help dialog on the six tool pages), `favicon.svg`, self-hosted fonts.
- Server hardening: shared AppView request budget (`src/budget.ts`), proxy-aware client address (`src/clientip.ts`), rate-limited mutation endpoints.

## Tested
- Unit (`npm test`): budget, clientip, links, find-examples (the Format Deck finder, against a fake Bluesky). Last run 2026-10-13: find-examples 5 of 5 pass; the earlier 17 pass as of e89d28b.
- Browser (`npm run test:browser`): tracer 39, imagine 7, receipt 122, jokeweb 118, mashup 49, icon 11, help 45, tutorials 29, feeds 12, footer 1. Last run 2026-10-10 at e89d28b: all pass. All use mocked Bluesky responses.

- Format Deck "Seen in the wild" (2026-10-13, uncommitted): `post:` lines in `formats.txt`, looked up live from the public AppView; `formats` suite now 64 checks pass (mocked API). No `post:` lines are in the file yet; `scripts/find-examples.mjs` is untested against the real Bluesky (the build sandbox cannot reach it).
- Format Deck added 2026-10-13 (committed): `formats` suite 48 checks pass; `help` suite now 52 (covers the new page); `mashup` hub checks updated for 12 cards (49). Run in a Linux sandbox with mocked Bluesky. In that sandbox the receipt, jokeweb, mashup, icon, help and footer suites also print "A network error occurred." JS errors on the unmodified files, so they report FAIL there; cause not found; not run on the developer's machine since.

## Not tested / unknown
- Behavior against real Bluesky and the Railway deployment: not recorded in the repo.
- Real-device phone rendering: not recorded in the repo.
- Which commit is deployed: not recorded in the repo.

## Known stale
(none)
