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

## 2026-10-12 · Double web: main branches can be removed
- changed: the main-branch chips in the first and second web steps now have the x remove button (it was missing)
- built: two more jokeweb checks (O4b, O5b)
- live-tested: no

## 2026-10-12 · Double web: tabs removed
- changed: the Working on A / B tabs are gone; step 2 and 3 pick the web, the other web fades (`.off`) and ignores taps; the free board switches web by tapping a bubble
- built: jokeweb checks adjusted (O5c added, drag check now measured inside the board)
- live-tested: no

## 2026-10-12 · Collide line names both concepts
- changed: the "Applying:" line in Collide reads "fish → salmon to books → biographies" when a concept is picked in both webs, and "fish → salmon to books" when only one is; the idea box placeholder follows
- note: saved ideas are still labeled with the other web's subject only
- built: one more jokeweb check (O8b)
- live-tested: no

## 2026-10-12 · Ideas keep their pairing
- built: `ap` saved with each idea (`addIdea`, `removeIdea`, sanitized in `parseNodes`); Joke ideas list shows the full pairing; later picks do not change it
- built: jokeweb checks O9b, O9c (now 107)
- live-tested: no

## 2026-10-12 · Send to Joke-Web Maker is back (one topic or a pair)
- built: `#send` in `mashup.html` shown for 1 or 2 topics only, linking `#subject=X` or `#a=X&b=Y`; `jokeweb.html` handles both (new web at once, banner, spare slot and Swap with previous web, restored)
- built: Help text on both pages and the hub card mention it; mashup suite section F rewritten (49 checks)
- live-tested: no

## 2026-10-12 · Start over warns, then wipes everything
- changed: `#resetDlg` pop-up replaces the tap-twice button; Erase clears the board (both webs in a double), the draft and the stored previous web (`pk-jokeweb-prev-v1`)
- built: jokeweb section P (9 checks, now 116); test helper `mk` can seed the previous-web slot
- live-tested: no

## 2026-10-13 · Sally Holloway credited
- built: `#credit` panel with `#book` link in `jokeweb.html`, a Help sentence, a Tutorials sentence, a hub card clause; jokeweb suite section Q (118 checks)
- note: the book facts (title, subtitle, ISBN 9781907498374, Rethink Press) come from web search results, not from the book; the link target was not opened from here
- live-tested: no

## 2026-10-13 · Book link switched to Amazon
- changed: the three book links (`jokeweb.html` panel and Help, `tutorials.txt`) and the jokeweb Q1/Q2 checks now use the Amazon listing
- live-tested: no

## 2026-10-13 · Format Deck
- built: `public/formats.html` (`/formats`), `public/formats.txt` (40 formats, 8 categories), `/formats` route in `src/index.ts`, hub card 08 (the four separate sites are now 09 to 12), `test/browser/formats.suite.js` (48 checks)
- changed: `help.suite.js` also covers `/formats` (52 checks, H7 label reworded); `mashup.suite.js` hub checks G4, G6, G6c now expect 12 cards; `run.js` and the test static server list the page
- note: `formats.txt` is a first draft by the assistant for the developer to edit; examples are meant to be original
- note: fixed during build: Use this example and Clear replaced the values array while the inputs still pointed at the old one; the saved blanks could be overwritten by a visit where the formats had not loaded
- note: in the build sandbox the receipt, jokeweb, mashup, icon, help and footer suites print "A network error occurred." JS errors on the unmodified files too; cause not found
- live-tested: no

## 2026-10-13 · Format Deck: Seen in the wild
- built: `post:` and `search:` lines in `formats.txt`; the page looks each post up live (handle resolved with `com.atproto.identity.resolveHandle`, post read with `app.bsky.feed.getPosts`, both on `public.api.bsky.app`), 8 second timeout, in-memory cache, stale results ignored when the card changes; `scripts/find-examples.mjs` (candidate finder); Help text; 16 new checks in `formats.suite.js` (64 total) using a mocked API
- changed: F30 now strips `post:` lines from the test copy of the file so dealing makes no requests; F30b allows the two lookups
- note: left out on purpose, my choice, not stated: posts with any label on the post or author, replies, and images/video (the box points to the original)
- note: the finder script was tested only against a local mock server; the sandbox cannot reach Bluesky
- live-tested: no

## 2026-10-13 · Finder improved; README corrected
- fixed: README claimed the Joke-Web Maker reads public posts for "Seen in the wild"; it does not, only the Format Deck does
- built: `scripts/find-examples.mjs` signs in with `BSKY_HANDLE` + `BSKY_APP_PASSWORD`, follows search cursors, filters by `match:` regexes and likes, sorts by likes; `match:` lines added to all 40 formats; page and suite accept `match:`
- built: `test/find-examples.test.js` (5 tests; includes a check that every format's own worked example passes its `match:` lines)
- live-tested: no (never run against real Bluesky)

## 2026-10-13 · Finder tuned after the developer's first real run
- note: first real run read about 290 posts per format and found 114 candidates; 16 formats found 0 (Nobody / Me, Expectation / Reality, Before / After, Translation Guide, Ranking, Bingo Card, Official Notice, Error Message, Customer Service, Talking Object, One-Star Review, Fill in the Blank, Quote Post Game Starter, Portmanteau, Running Bit, How To); three of them read 0 or 1 posts because the search was too narrow
- changed: the finder now reports, per format, how many posts fit the shape and the best like count, and prints the top three results when none fit; loosened the `match:` lines and added more `search:` lines for those formats
- live-tested: no (the cause of each empty format was not yet known)

## 2026-10-13 · Finder: per-format likes bar and more tuning
- note: second real run found 151 candidates; still empty: Nobody / Me (6 fit, best 20 likes), Expectation / Reality (24 fit, best 29), Before / After (1 fit), Translation Guide (0 fit, searches off target), Ranking (3 fit, best 3), Official Notice (3 fit, best 0), Customer Service (1 fit), Fill in the Blank (0 fit: real posts have no underscores)
- built: `likes:` line in `formats.txt` (per-format minimum likes; `--min-likes` overrides); set for 7 formats; new `search:`/`match:` lines for Translation Guide, Ranking, Official Notice, Customer Service, Before / After, Fill in the Blank
- live-tested: no (the changes since the second run have not been run)

## 2026-10-13 · Finder: last two formats retried
- note: third real run found 184 candidates; only Before / After (4 fit, best 14 likes) and Customer Service (1 of 1,134 fit) came up empty
- changed: wider `search:` and `match:` lines for both and a `likes:` bar of 3, so the developer has something to consider; if nothing usable turns up the worked example stays
- live-tested: no

## 2026-10-13 · Finder writes a new file each run
- changed: output goes to `scripts/candidates-DATE-TIME.txt` (ignored by git) instead of overwriting `candidates.txt`, after a one-format run overwrote a full run
- live-tested: no

## 2026-10-13 · Finder retries Bluesky server errors
- note: fourth real run: 194 candidates, Before / After 8 and Customer Service 4; One-Star Review was skipped after a temporary HTTP 502
- changed: the finder retries 5xx answers twice (waits 2 s, then 4 s) and lists any formats it could not search at the end
- built: unit test for the retry (now 24)
- live-tested: no

## 2026-10-13 · Worked examples and Seen in the wild removed
- built: removed the worked example box, Use this example, the "Seen in the wild" box and its Bluesky lookups from `formats.html`; removed `example:`, `post:`, `search:`, `match:` and `likes:` lines from `formats.txt` (the page and the suite now accept only category, how, template and tip)
- built: removed `scripts/find-examples.mjs` and `test/find-examples.test.js`
- changed: hub card and Help text no longer mention examples; `formats` suite reworked (48 checks); F3 now fills every blank with 40 characters and checks the post fits in 300
- note: the one `post:` line the developer added went with the rest
- live-tested: no

## 2026-10-13 · Format Deck review, category 1 (Contrast)
- changed: kept all five formats (Nobody / Me, Expectation / Reality, Before / After, Translation Guide, Two Types of People) and removed their tips at the developer's request; a tip is now optional in the suite (the page already hid an empty one)
- note: the review of the other seven categories is in progress
- live-tested: no

## 2026-10-13 · Format Deck review, category 2 (Lists) and all tips
- changed: removed every `tip:` line from every format, at the developer's request; the page and suite still allow an optional tip
- changed: deleted Ranking, Tier List and Bingo Card; the Format Deck now has 37 formats (Lists keeps Award Ceremony and Pros and Cons); suite and hub card ("Over 30 formats") updated
- note: the review continues with category 3 (Fake documents)
- live-tested: no

## 2026-10-13 · Format Deck review, category 3 (Fake documents) and three new formats
- changed: deleted Official Notice, Error Message and Patch Notes
- built: three new formats from the developer's descriptions: Then and Now (Contrast, after Before / After), Is Just (Wordplay, after If It Were) and Professor X Asks (Dialogue, after Interview Question); the deck is still 37 formats
- note: each overlaps an existing format (Before / After, If It Were, Interview Question); the developer may replace those
- changed: the category chip check no longer hard-codes the Wordplay count
- live-tested: no

## 2026-10-13 · Format Deck review, category 4 (Dialogue)
- changed: deleted Before / After and Customer Service; kept Is Just and Professor X Asks; replaced Interview Question with Interview Detour ("Me: a long, rambling answer... / Interviewer: I meant questions about {the interview topic}."); the deck has 35 formats
- note: If It Were was kept alongside Is Just (the developer did not ask to remove it)
- live-tested: no

## 2026-10-13 · Format Deck review, category 5 (Questions)
- changed: deleted If It Were and the whole Questions category (Which One of You, Be Honest, Rate It, Fill in the Blank, Quote Post Game Starter); Interview Detour now has Me asking a long, rambling question (was answer); the deck has 29 formats in 7 categories; hub card says "Nearly 30 formats"
- live-tested: no

## 2026-10-13 · Format Deck review, category 6 (Wordplay)
- changed: kept the five Wordplay formats; added Classic Blunder ("You just committed one of the classic blunders: {a surprising or silly pitfall}") to Wordplay; the deck has 30 formats; hub card says "About 30 formats"
- live-tested: no

## 2026-10-13 · Format Deck review, category 7 (Escalation) and 8 (Tiny scenes)
- changed: kept the five Escalation formats; deleted Tiny Scene; added LaCroix ("LaCroix is what happens when {a silly way of describing the drink}.") to Tiny scenes; the deck has 30 formats in 7 categories
- live-tested: no

## 2026-10-13 · Format Deck review finished; status notes brought up to date
- changed: `STATUS.md` (pinned to 7390f3b, Format Deck line, suite counts), `NEXT-SESSION.txt` and the formats line in `TESTING-OWED.md` now describe the deck after the review
- live-tested: no

## 2026-10-13 · Notes for Transit Pass and Rush Hour recorded
- changed: `NEXT-SESSION.txt` now holds the developer's descriptions of Transit Pass and Rush Hour (pasted by the developer; neither is built)
- live-tested: no

## 2026-10-13 · Transit Pass built; Format Deck card text fixed
- built: `public/transitpass.html` (route `/transitpass`, hub card 09, hub externals renumbered 10 to 13), `test/browser/transitpass.suite.js` (33 checks); added to the help, icon, footer and hub checks
- fixed: the Format Deck hub card and its Help text still named a "quote post game opener" after that format was removed; the hub card now names Nobody / Me, Professor X Asks and Fake Headline, and a test checks every format it names still exists
- changed: recorded the Rush Hour description, including the "What Lands" panel, in `NEXT-SESSION.txt`; Tightener and Daily Reps dropped
- live-tested: no

## 2026-10-13 · Rush Hour built; Transit Pass photo and name fixes
- built: `public/rushhour.html` (route `/rushhour`, hub card 10, hub externals renumbered 11 to 14), `test/browser/rushhour.suite.js` (34 checks); added to the help, icon, footer and hub checks
- fixed: Transit Pass printed only the handle for an account with no display name (the handle now takes the headline spot); the profile picture is retried with the small version if the full size will not load; the label note now names the label that hid the photo and name (an account carrying `!no-unauthenticated` prints without photo or name)
- not confirmed: why burritozen.net's pass lacked a name; no live access from the build environment. The likely causes are no display name or a hide-list label on that profile
- live-tested: no

## 2026-10-13 · Transit Pass: picture fallback and a readout
- changed: the developer reported no profile picture on any pass and no display name for burritozen.net, after the first fix; the cause is still not confirmed (no live access from the build environment). The pass now tries the picture three ways (direct, small version, `/api/avatar` same-site pass-through added in `src/index.ts`) and shows a line "What Bluesky sent: display name … ; profile picture …" so the real cause is visible
- tests: `transitpass` 38 checks (pass-through, empty display name readout)
- live-tested: no

## 2026-10-13 · Hub reordered; Rush Hour pop-up; Transit Pass readout removed
- changed: hub order is now Tutorials, Joke-Web, Mashup, Format Deck, Top Skeets, Rush Hour, Transit Pass, Skeet Receipt, Tracer, Saga (01 to 10); card colors reassigned so neighbors differ (Top Skeets teal, Rush Hour purple, Transit Pass yellow; the page hero colors and "Tool NN" tags follow); hub and page tests updated
- built: Rush Hour heatmap squares open a pop-up listing that hour's non-reply posts (most liked first, text, likes, time, Open on Bluesky), keyboard-reachable with arrow keys; posts now keep their text in memory for this; privacy text changed from "no post text is shown" to "text appears only in the pop-up"
- removed: the "What Bluesky sent" debugging line on Transit Pass (the picture fallback stays)
- live-tested: no (Rush Hour itself was confirmed by the developer on their account)
