# Decisions: site and UI

### 2026-10-06 · The root is a landing hub; the feed generator moves to /feeds · active
- what: `/` is the Professor Kiosk hub; API, `/health` and feed endpoints unchanged
- why: not recorded
- source: 294a096, README

### 2026-10-08 · One shared design system and footer across pages · active
- what: `public/kiosk.css`; the same footer on every page
- why: not recorded
- source: ad3f65f, 6f75e9a

### 2026-10-08 to 2026-10-09 · Game Preserver (saved copies of Tracer games) built, then removed · superseded
- what: built in stages 0 to 5 (probe tool, server-side crawler, SQLite storage, saved-game pages, reports, admin tools, sign-in); all removed in one commit; the Tracer went back to its plain live version and Imagine Flagons became an always-live trace; kept from the work: shared request budget, client-address handling, link parser, browser test suites
- why: not recorded in the repo
- source: 5013636 through 39508e9 (build), 91d44f7 (removal)

### 2026-10-08 onward · Tracer, Skeet Receipt, Joke-Web Maker, Mashup Machine and Imagine Flagons run in the visitor's browser · active
- what: no sign-in and no server storage; they call Bluesky's public API directly where they need data; the Joke-Web Maker and Mashup Machine keep state in localStorage
- why: not recorded beyond the README descriptions
- source: README (Tracer, Receipt, Joke-Web Maker, Mashup Machine); `public/imagine-flagons.html` code and its Help text; 91d44f7

### 2026-10-09 · Skeet Receipt draws space-heavy posts in a proportional font, shrunk to fit · active
- what: posts that use spaces for layout (ASCII art) are not re-wrapped; lines are kept as written
- why: Bluesky draws such posts in a proportional font, so a monospace space came out about twice as wide
- source: c3ce852, comment in `public/receipt.html`

### 2026-10-10 · One Help dialog shared by the six tool pages · active
- what: `dialog.k-help` styles in `kiosk.css`, wiring in `kiosk-help.js`, content per page; opens on `#help`
- why: not recorded beyond "shared"
- source: 2ab630d, `public/kiosk-help.js`

### 2026-10-10 · Tab icon: PK badge by default, replaced by the live Bluesky avatar and remembered · active
- what: `favicon.svg` is the default; `kiosk.js` swaps in the avatar once it has loaded and caches its URL in localStorage
- why: the next page opens with the right icon straight away (comment in `kiosk.js`)
- source: 7730e71

### 2026-10-10 · Tutorials text lives in `public/tutorials.txt`, rendered client-side · active
- what: tiny format (`##` cards, blank-line paragraphs, lists, bold, links, a video line); `;;` lines are notes
- why: "edit this file and the page restyles itself" (file header, README)
- source: 4306871

### 2026-10-10 · Sending a topic from the Mashup Machine starts a new Joke-Web at once and keeps the previous web in one spare slot · superseded
- what: the old web can be swapped back; the draft post is kept
- why: so nothing is ever lost (comment in `public/jokeweb.html`)
- source: 6d1461e
> Superseded 2026-10-11: the Send button was removed (see the next entry).

### 2026-10-11 · No "Send to Joke-Web Maker" button on the Mashup Machine · active
- what: the button, the `#subject=...&branches=...` link handling and the spare-web slot ("Swap with previous web") were removed from both pages
- why: two or three topics don't make sense as one central concept (developer's statement); a different way to carry mashups over is open
- source: developer request, 2026-10-11

### 2026-10-12 · Mini joke-web is a Full web / Mini web switch inside the Joke-Web Maker · active
- what: `size` (`full` or `mini`) is saved with the web; Mini keeps the four steps but renames step 2 Sub-subjects (with the word prompts), asks for one specific angle, and stops adding at two levels out; Start over keeps the size
- why: the developer asked for the book's mini joke-web (Exercise 5) as an option, unsure how to integrate it, suggested a toggle; double joke-webs were deliberately not built yet
- source: developer request, 2026-10-12

### 2026-10-12 · Double joke-web is a third size in the Joke-Web Maker, with the second web held in `S.other` and swapped in · partly superseded
- what: `size: 'double'`; web A is shown first, web B is kept in `S.other` and swapped in by the A/B tabs (`which` says which is showing); steps are Subjects, First web, Second web, Collide; ideas are stored on the idea's own bubble and labeled "applied to" the other subject; Save image and Copy web cover both webs; switching to Full or Mini hides web B without deleting it, Start over clears both
- why: the developer asked for double webs from the book (Chapter 5, Exercise 6); swapping reuses the single-web drawing, layout and drag code unchanged (design choice, not stated by the developer)
- source: developer request, 2026-10-12
> Partly superseded 2026-10-12: the tabs no longer show one web at a time; see the next-but-one entry about both webs on the board.

### 2026-10-12 · In a double web both webs are on the board at once, side by side (stacked on a narrow screen) · active
- what: the board draws both webs in one SVG with a × between them; each web keeps its own selection; in Collide you pick one idea per list and both light up (others fade); the tabs now say which web the boxes work on; the other web does not move while you drag in one; Save image uses its own side-by-side layout
- why: developer asked to see both webs at once and to select a concept from each list and see them highlighted; stacked layout on phones is my choice for fit, not stated
- source: developer request, 2026-10-12
