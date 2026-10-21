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

### 2026-10-11 · No "Send to Joke-Web Maker" button on the Mashup Machine · superseded
- what: the button, the `#subject=...&branches=...` link handling and the spare-web slot ("Swap with previous web") were removed from both pages
- why: two or three topics don't make sense as one central concept (developer's statement); a different way to carry mashups over is open
- source: developer request, 2026-10-11
> Superseded 2026-10-12: the button came back for one topic or a pair, see the last entry below.

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

### 2026-10-12 · No "Working on A / B" tabs in the double web; the steps (and tapping a bubble on the free board) decide the active web · active
- what: the First web / Second web steps set which web the boxes add to, the other web fades in those steps and ignores taps, and on the free board tapping a bubble in a web makes it the active one
- why: developer found the tabs duplicated the step buttons and could disagree with them
- source: developer request, 2026-10-12

### 2026-10-12 · Each double-web idea is saved with the full pairing it was written for · active
- what: nodes carry `ap`, a list kept in step with `jokes`, holding the "to books → biographies" side of each idea; the Joke ideas list reads "fish → salmon to books → biographies"; ideas saved before this fall back to the other web's subject
- why: developer asked for the full pairing to be saved with each idea
- source: developer request, 2026-10-12

### 2026-10-12 · The Mashup Machine can send one topic or a pair to the Joke-Web Maker; three topics have no button · active
- what: one topic starts a web (Full, or Mini if that was the size) with it as the subject; a pair starts a Double web with the two topics as its subjects; the previous web (any size) stays in the one spare slot and can be swapped back; the draft is kept
- why: the developer proposed it once Double web existed, since three topics don't make one central concept but one or two map onto one or two subjects
- source: developer request, 2026-10-12

### 2026-10-12 · Start over asks in a pop-up, then erases everything including the previous web · active
- what: replaces the tap-twice confirm with a dialog (Erase / Keep my webs, Esc cancels); Erase wipes the web or both webs of a double web, the draft and the spare previous web, so no swap button remains; the size choice is kept
- why: developer asked for a warning that both webs will be erased and no switch-back button afterward (I read "both webs" as the current and previous web, and for a double web both A and B)
- source: developer request, 2026-10-12

### 2026-10-13 · Credit Sally Holloway and link to her book wherever the joke-web is described · partly superseded
- what: a credit panel and Get the book link on `/jokeweb`, a line in its Help, a sentence in `tutorials.txt` and a clause on the hub card; the link goes to the publisher's page for the book
- why: developer asked to credit her with the technique and to plug the book with a purchase link; the publisher page was chosen because I could not open any shop page from the sandbox to confirm it sells the book (the developer may prefer a bookshop or affiliate link)
- source: developer request, 2026-10-13
> Partly superseded 2026-10-13: the link target is now the Amazon listing, see the next entry.

### 2026-10-13 · The book link is the developer's Amazon listing, without the search-tracking parts · active
- what: all book links point to `https://www.amazon.com/Serious-Guide-Joke-Writing-Something/dp/1907498370`
- why: the developer supplied an Amazon address; the `crid`, `dib`, `qid`, `sprefix` and `sr` parts of the pasted address are tied to their own search session, so only the product path was kept (same product)
- source: developer request, 2026-10-13

### 2026-10-13 · Format Deck runs in the visitor's browser, with its formats in `public/formats.txt` · active
- what: `/formats` (hub card 08); no sign-in, no server calls; the file is parsed in the page (format described at the top of the file); blanks typed into each card are kept in localStorage (`pk-formats-v1`), this device only
- why: the developer wanted a public tool for people writing jokes, and no moderation work (Game Preserver "was starting to require moderation", developer's statement); a text file like `tutorials.txt` and `topics.js` so the developer can edit formats (my choice, not stated)
- source: developer request, 2026-10-13

### 2026-10-13 · Each Format Deck card is reference plus a small workbench · superseded
- what: how-line, worked example (built from the example words), a blank per `{label}`, the post as it builds, a counter against 300 graphemes, Copy post, Open in Bluesky (`https://bsky.app/intent/compose?text=`), Use this example, Clear blanks, a tip; a blank left empty is copied as its `{label}`; no dice button that drops in random Mashup topics
- why: the developer asked for "some combination of reference and" typing and copying, wanted a worked example, and suggested opening in Bluesky; they chose the option without the dice; copying empty blanks as `{label}` and bsky.app only for Open are my choices, not stated (Blacksky and Northsky users use Copy)
- source: developer request, 2026-10-13
> Partly superseded 2026-10-13: the worked example was removed from the cards, see the last entry below.

### 2026-10-13 · Format Deck shows real posts by live lookup, picked by the developer · superseded
- what: `post:` lines hold links only; the page asks the public AppView when a card opens and hides a post that is gone, labeled, or a reply; the worked example stays as the backup; candidates come from `scripts/find-examples.mjs`, and the developer copies chosen `post:` lines in by hand
- why: the developer asked for real Bluesky posts as embedded examples, "live lookup with a backup example if the post disappears" (their words). They picked automatic search for finding matches; my choice, not stated: the search runs as a script they read through before anything goes on the site, instead of on every visitor's page, because search results can't be vetted and there is no moderation capacity (standing rule)
- source: developer request, 2026-10-13
> Superseded 2026-10-13: "Seen in the wild" was removed, see the last entry below.

### 2026-10-13 · The finder ranks by likes and checks each post against the format's `match:` regexes; "Seen in the wild" belongs only to the Format Deck · superseded
- what: `match:` lines (JS regular expressions, case-insensitive) in `formats.txt`; the finder signs in with an app password, reads three pages of top results per search, keeps posts that pass every `match:` line and `--min-likes` (30), one per author, most-liked first; the Joke-Web Maker does not use "Seen in the wild" (a README sentence that said it did was wrong and was removed)
- why: developer wants real, well-liked posts that actually use each format; unauthenticated search is likely refused by Bluesky, so signing in is the working path (not confirmed from here)
- source: developer request, 2026-10-13; `scripts/find-examples.mjs`
> Superseded 2026-10-13: the finder and its `search:`, `match:` and `likes:` lines were removed, see the last entry below.

### 2026-10-13 · Worked examples and "Seen in the wild" removed from the Format Deck, with the finder script · active
- what: no `example:` or `post:` lines, no worked example box or Use this example button, no live post lookups (the Format Deck makes no Bluesky requests); the finder (`scripts/find-examples.mjs`, `test/find-examples.test.js`) and the `search:`, `match:` and `likes:` lines are gone; a card is the how-line, the blanks, the post, the counter, Copy and Open in Bluesky, and the tip
- why: the developer asked to take both out altogether; I removed the finder as well because it existed only to find posts for "Seen in the wild" (it is in git history if wanted back)
- source: developer request, 2026-10-13

### 2026-10-13 · Joke Tightener is rule-based and tightens the whole joke · active
- what: `/tightener` flags filler and hedge words and phrases (tap to cut, one-tap tighten with Undo), repeated words (three or more, shown but never cut) and sentences over 22 words (listed); character counter out of 300 in graphemes; Copy and Open in Bluesky; nothing stored; it is tool 05 on the hub, before Mutual Match (everything below moved down one, separate sites now 13 to 16)
- why: the developer asked for the Tightener (named it the Joke Tightener and said it should tighten the entire joke, not split setup from punchline) and chose these features and the no-storage rule; the exact word lists, the "So" and "that" rules, the 22-word limit and the decision to never cut repeats for you are my choices
- source: developer request and answers, 2026-10-13
- live-tested: no

### 2026-10-13 · Mutual Match compares follows, followers and replies, and lists where the two differ · active
- what: `/mutualmatch` reads both profiles, then replies (newest 500 posts), follows and followers (5,000 each, Load more to 20,000), and shows accounts both follow, follow both, both replied to, plus for each account the 5 accounts it replies to most that the other does not follow; a Venn-style card on one canvas; labeled accounts by handle only; it is tool 05 on the hub (everything below moved down one, separate sites now 12 to 15)
- why: the developer chose the three comparisons, the 5,000 limit with Load more, the list-plus-card result and the placement; "They differ" was added by the developer, who defined it as the top 5 accounts each person interacts with that the other doesn't follow, and I took "interact with" to mean replies because that is the interaction the page already reads; the 5-account cut, the plus-sign "at least" wording and the Venn layout are my choices
- source: developer request and answers, 2026-10-13
- live-tested: no

### 2026-10-13 · Rush Hour counts originals and quotes, ranks by likes, reads the author feed with a cap · active
- what: `/rushhour` reads `getAuthorFeed` (`posts_with_replies`) paced, skipping reposts; cap 500, Load 500 more, ceiling 5,000; heatmap excludes replies, What Lands includes them; "best" = likes only; local time zone with a UTC switch; minimum 3 posts per square and 5 per day or hour for "best"; What Lands needs 20 posts; it is tool 10 on the hub (separate sites now 11 to 14)
- why: the developer chose these when asked (originals and quotes, likes only, visitor's time, 500 then Load more); the minimums, the 20-post floor, the wording of "what stands out" and the 5,000 ceiling are my choices to keep small samples from reading as patterns
- source: developer request and answers, 2026-10-13
- live-tested: no

### 2026-10-13 · Transit Pass is one canvas, with a profile read and no feed pagination · active
- what: `/transitpass` draws the pass once on a canvas used for both the page and the PNG; data is one `getProfile` read (join date from `createdAt`, post rate as total posts over days since joining); route and line from a hash of the DID; the same label hide list as Skeet Receipt; it is tool 09 on the hub, so the separate sites moved to 10 to 13
- why: the developer described the tool (handle in, pass card out, saved as a PNG like the Receipt) and asked for it to be built first; one canvas instead of the Receipt's separate HTML and canvas drawings was my choice to keep the page and the image identical; pass types, the pace wording and the line names are my inventions, not the developer's
- source: developer request, 2026-10-13

### 2026-10-13 · Mutual Match: Community replaces Follow both · active
- what: the "Follow both" (shared followers) list and the followers reads are gone; a Community tab now ranks the accounts both people follow by how many of the other shared accounts each follows, on a button press, reading each candidate's follow list (cap 1,000 follows; 60 candidates at first, 60 more at a time); the card and numbers show the top community hub once it has run. "Replied to" and "They differ" are unchanged (recent posts only, and labeled as such)
- why: the developer asked for it because follower lists are slow and Both follow is the quick, useful one; I chose to rank only the shared accounts (not everyone who follows them) because finding other candidates would need follower lists of the shared accounts, which is what made Follow both slow; the 1,000-follow and 60-candidate limits are mine to bound the cost (about 600 requests at most per batch)
- source: developer request, 2026-10-13
- live-tested: no

### 2026-10-13 · Mutual Match: They differ uses likes and reposts · active
- what: the 5 accounts each person likes and reposts most (likes plus reposts) that the other does not follow; reposts come from the posts already read; likes are the newest 500 like records read from the account's own data server (found through plc.directory, since the public AppView does not list likes), then the few shown are looked up with getProfiles; if the server can't be reached it says so and uses reposts only; a new third-party host (plc.directory) and each account's own server are now contacted by this one page
- why: the developer asked for it (replaced replies); the 500-like limit and the reposts-only fallback are my choices
- source: developer request, 2026-10-13
- live-tested: no (the likes route is the riskiest part: some servers may not allow reads from a web page)

### 2026-10-13 · The Imagine Flagons Saga page is folded into the Tracer as an example link · active
- what: `public/imagine-flagons.html` and its test suite were removed; the Tracer's example line now offers a small game and "The Imagine Flagons Saga" (a `/tracer?post=` link to the post that started it); the server redirects `/imagine-flagons` (302) to that link so old links keep working; the hub lost the Saga card and the Tracer card moved to 07, after Mutual Match (everything below moved up, separate sites now 12 to 15); the Tracer card mentions the saga
- why: the developer asked for it; keeping both example links, the 302 (not 301, so it can be changed) and what the saga page did that the Tracer does not (a random-quote key, showing locked posts with a note) were my calls and are listed in TESTING-OWED
- source: developer request, 2026-10-13
- live-tested: no

### 2026-10-14 · The Saga is the Tracer's only example, and the One Ring comes with it · active
- what: the Tracer's example line offers only the Imagine Flagons Saga (the small example is gone); while the saga post (professorkiosk.wtf, rkey 3ma4vpkdvwk26) is being traced, the gold One Ring shows in the hero, as on the old saga page; clicking it throws emoji confetti and a toast; any other trace hides it; it follows the same rule as other hero art (hidden on phones) and the confetti and float animation respect reduced motion
- why: the developer asked for it; showing the ring from the start of the trace (not after the post loads) and hiding it on phones and for reduced motion were my calls
- source: developer request, 2026-10-14
- live-tested: no

### 2026-10-18 · Now That's a Skeet is listed under Elsewhere and in the Tutorials Contests section · active
- what: hub card 14 "Now That's a Skeet" (skeet.contestdashboard.live, a trophy-awarding app for giving awards to favorite posts, a bit like FavStar) in Elsewhere on the network, so Clover Kiss Cinema and My Twitter Archive became 15 and 16; the Tutorials Contests section ends with a sentence linking to it
- why: the developer built the app and asked for both; the card colour and the wording of the Contests sentence were my choices
- source: developer requests, 2026-10-18
- live-tested: no
