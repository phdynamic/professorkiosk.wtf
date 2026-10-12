# Build log 02: kiosk site (backfilled 2026-10-10 from git history)

## 2026-10-06 to 2026-10-08 · hub, first tools, redesign
- commits: 294a096..5dfb522
- built: landing hub; Imagine Flagons Saga; Quote Post Game Tracer; cards for external sites; shared `kiosk.css` redesign and one footer; Skeet Receipt with handwritten note, red circles and presets
- note: 52a5199 (2026-10-06) fixed one bad post stalling all refreshes
- live-tested: not recorded

## 2026-10-08 to 2026-10-09 · Game Preserver built, then removed
- commits: 5013636..91d44f7
- built then removed: saved copies of Tracer games, in stages 0 to 5 (see decisions/site-and-ui.md)
- kept: request budget, client-address handling, link parser, browser test suites (884f7eb)
- why removed: not recorded
- live-tested: not recorded

## 2026-10-09 to 2026-10-10 · more tools and content
- commits: 449f79b..e89d28b
- built: Tracer link fix (449f79b); Receipt spacing fixes; Joke-Web Maker; Mashup Machine; tab icon; Help dialogs on the six tool pages; Bluesky Tutorials page with video; hub reordered and renumbered; Twitter mentions removed from the tutorials
- live-tested: not recorded

## 2026-10-10 · stale comment and README line fixed
- changed: `src/budget.ts` header no longer mentions "game crawls"; README no longer cites the removed probe
- note: comment and docs only, no code change
- live-tested: n/a

## 2026-10-10 · Tutorials fact checks filed
- changed: `TESTING-OWED.md` lists the Bluesky-app and outside-tool facts in `tutorials.txt` that were never checked in the app
- live-tested: no

## 2026-10-10 · Mashup Help fact checks filed
- changed: `TESTING-OWED.md` lists by-hand checks for each claim in the Mashup Machine Help dialog
- live-tested: no

## 2026-10-10 · Joke-Web Maker Help fact checks filed
- changed: `TESTING-OWED.md` lists by-hand checks for each claim in the Joke-Web Maker Help dialog
- live-tested: no

## 2026-10-10 · Receipt Help fact checks filed
- changed: `TESTING-OWED.md` lists by-hand checks for each claim in the Skeet Receipt Help dialog, plus the space-art layout
- live-tested: no

## 2026-10-10 · remaining Help fact checks filed
- changed: `TESTING-OWED.md` now has by-hand checks for the Help dialogs of Top Skeets, the Tracer and the Imagine Flagons Saga (all six tool pages covered)
- live-tested: no

## 2026-10-11 · Send to Joke-Web Maker removed
- built: removed the button from `mashup.html` and its Help and hub text; removed the incoming-topic banner, spare-web slot and swap button from `jokeweb.html`; README, `TESTING-OWED.md` and the mashup suite (F section) updated
- note: old `/jokeweb#subject=...` links are now ignored
- live-tested: no

## 2026-10-11 · Mashup topics grown to about 2,000
- built: `topics.js` went from 600 topics in 20 categories to 2,045 in 32; 12 new categories (Science & space, Spooky & monsters, Sports & games, Cars & transit, Family & kids, Books & art, Small town, Jobs & trades, Restaurants & cafes, Video games, Superheroes & sci-fi, Awkward moments), each placed on the map, plus 16 new odd pairings
- built: Distance spread in `mashup.html` narrowed (`sigma` 0.08*dmax+0.25 to 0.06*dmax+0.2) so Distance 0 still stays in one category on the denser map
- note: topics are mine, unreviewed by the developer; the list should be read through and cut
- live-tested: no

## 2026-10-12 · Mini web option in the Joke-Web Maker
- built: Full web / Mini web switch (`#size-full`, `#size-mini`) in `jokeweb.html`; Mini uses the Sub-subjects wording, shows the word prompts in step 2, caps new bubbles at depth 2 (guided and free), adds the check-every-association tip in step 4, and has a Help section
- built: `size` saved in `pk-jokeweb-v1`; older saved webs load as Full
- built: jokeweb suite section N (13 checks)
- note: double joke-webs not built
- live-tested: no

## 2026-10-12 · Double web (Hadron Joke Collider) in the Joke-Web Maker
- built: third size, Double web, with two-subject start, web A and web B tabs, a Collide step (pick an idea from one web, applied to the other web's subject), choose-a-topic tips, two-web outline and side-by-side PNG, Help section
- built: saved state gains `other` and `which`; older saves load as before
- built: jokeweb suite section O (19 checks)
- live-tested: no

## 2026-10-12 · Double web form fixed
- changed: the two subject boxes now use the same text-box styling as the rest of the page; the "How to choose two subjects" list starts open
- built: one more jokeweb check (O2b)
- live-tested: no

## 2026-10-12 · Both webs on the board in Double web
- built: `renderWeb` draws one or two webs (`layoutWebs`, `buildBoth`), a × between them, side by side or stacked when the board is narrow; per-web selection highlights (halo, path, fade) in Collide; each list has its own idea box (`joke-input-a/-b`)
- built: dragging works in either web with the other held still (`holdShift`)
- built: jokeweb suite checks reworked (now 101)
- live-tested: no
