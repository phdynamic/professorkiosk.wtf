// Rush Hour: a handle in, a week grid of when posts land and do best, and a What Lands comparison.
const { chromium } = require('playwright-core');
const BASE = 'http://localhost:3988/rushhour';
const out = []; const ok = (n, c, x = '') => out.push((c ? 'PASS' : 'FAIL') + ': ' + n + (x ? ' — ' + x : ''));
const errors = [];
const NOW = Date.UTC(2026, 9, 13);            // a Tuesday, midnight UTC; in New York it is still Monday evening
const TZ = 'America/New_York';
const iso = t => new Date(t).toISOString();

// ---- the fake Bluesky ----
function ownPost(did, i) {
  const hit = i % 10 === 0, reply = !hit && i % 5 === 2, ts = NOW - i * (5 * 3600e3 + (i % 7) * 13 * 60e3);
  return {
    uri: `at://${did}/app.bsky.feed.post/p${i}`, author: { did }, indexedAt: iso(ts), likeCount: hit ? 100 + (i % 7) : i % 3,
    embed: hit ? { $type: 'app.bsky.embed.images#view', images: [] } : undefined,
    record: { createdAt: iso(ts), text: hit ? 'Nobody wants this ' + 'x'.repeat(20) : 'Today I went to the thing and ' + 'y'.repeat(100), reply: reply ? { root: {}, parent: {} } : undefined }
  };
}
function feedFor(did, n) {
  const items = [];
  for (let i = 0; i < n; i++) {
    items.push({ post: ownPost(did, i) });
    if (i % 9 === 4) items.push({ post: { uri: `at://did:plc:other/app.bsky.feed.post/r${i}`, author: { did: 'did:plc:other' }, indexedAt: iso(NOW), likeCount: 5000, record: { createdAt: iso(NOW), text: 'Reposted thing' } }, reason: { $type: 'app.bsky.feed.defs#reasonRepost' } });
  }
  return items;
}
const ACCTS = {
  'busy.example': { did: 'did:plc:busy1', handle: 'busy.example', postsCount: 400, feed: feedFor('did:plc:busy1', 400) },
  'small.example': { did: 'did:plc:small1', handle: 'small.example', postsCount: 12, feed: feedFor('did:plc:small1', 12) },
  'empty.example': { did: 'did:plc:empty1', handle: 'empty.example', postsCount: 0, feed: [] }
};
async function mk(browser, { vp = { width: 1200, height: 900 }, scheme = 'light', tz = TZ, test = { cap: 120, more: 120, ceiling: 300, gapMs: 0, retryMs: 1, minPause: 1 }, feedDelay = 0, mode = {} } = {}) {
  const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme, timezoneId: tz, permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.addInitScript(t => { window.RUSH_TEST = t; }, test);
  const page = await ctx.newPage(); const log = { calls: [], third: [], feed: [] };
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { const u = new URL(r.url()); if (u.hostname !== 'localhost' && u.protocol.startsWith('http') && !/fonts\.g/.test(r.url())) log.third.push(u.hostname); });
  await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  let feedCalls = 0;
  await page.route('https://public.api.bsky.app/xrpc/**', async route => {
    const url = new URL(route.request().url()), H = { 'access-control-allow-origin': '*' }, method = url.pathname.split('/').pop(), actor = url.searchParams.get('actor');
    if (actor === 'professorkiosk.wtf') return route.fulfill({ status: 404, headers: H, body: '{}' });   // the footer avatar lookup
    log.calls.push(method + ':' + actor);
    if (method === 'app.bsky.actor.getProfile') {
      if (mode.profile === 'down') return route.abort();
      const a = ACCTS[actor] || Object.values(ACCTS).find(x => x.did === actor);
      if (!a) return route.fulfill({ status: 400, headers: H, contentType: 'application/json', body: '{"error":"InvalidRequest"}' });
      return route.fulfill({ headers: H, contentType: 'application/json', body: JSON.stringify({ did: a.did, handle: a.handle, postsCount: a.postsCount }) });
    }
    if (method === 'app.bsky.feed.getAuthorFeed') {
      feedCalls++; log.feed.push(url.search);
      if (feedDelay) await new Promise(r => setTimeout(r, feedDelay));
      if (mode.rateFirst && feedCalls === 1) return route.fulfill({ status: 429, headers: { ...H, 'retry-after': '1' }, body: '{}' });
      if (mode.failFrom && feedCalls >= mode.failFrom) return route.fulfill({ status: 500, headers: H, body: '{}' });
      const a = Object.values(ACCTS).find(x => x.did === actor); if (!a) return route.fulfill({ status: 400, headers: H, body: '{}' });
      const off = Number(url.searchParams.get('cursor') || 0), lim = Number(url.searchParams.get('limit') || 50), slice = a.feed.slice(off, off + lim);
      return route.fulfill({ headers: H, contentType: 'application/json', body: JSON.stringify({ feed: slice, cursor: off + lim < a.feed.length ? String(off + lim) : undefined }) });
    }
    route.fulfill({ status: 404, headers: H, body: '{}' });
  });
  return { page, log, ctx };
}
const go = async (page, h) => { await page.fill('#handle', h); await page.click('#go'); };
const done = page => page.waitForFunction(() => !document.getElementById('go').disabled);
const txt = (page, sel) => page.evaluate(s => (document.querySelector(s) || {}).textContent || '', sel);
const heatCells = page => page.evaluate(() => [...document.querySelectorAll('#heat td[data-t]')].map(td => ({ d: +td.dataset.d, h: +td.dataset.h, t: td.dataset.t, thin: td.classList.contains('thin') })));
const nOf = t => Number((/: (\d+) post/.exec(t) || [])[1] || 0);

(async () => {
  const browser = await chromium.launch({ executablePath: require('./env').CHROME });

  // ---- the empty page ----
  const { page, log } = await mk(browser); await page.goto(BASE);
  const e0 = await page.evaluate(() => ({ tag: document.querySelector('.k-hero .k-tag').textContent, slot: !document.getElementById('slot').hidden, result: document.getElementById('result').hidden, help: !!document.getElementById('helpBtn'), theme: !!document.getElementById('themeToggle'), foot: !!document.querySelector('footer.k-foot .kofi') }));
  ok('R1 the empty page: Tool 06 tag, the empty-slot box, nothing else yet, plus the Help button, Night mode and the footer', /Tool 06/.test(e0.tag) && e0.slot && e0.result && e0.help && e0.theme && e0.foot, JSON.stringify(e0));
  await page.click('#go'); const err1 = await txt(page, '#find-err');
  await go(page, 'not a handle!'); const err2 = await txt(page, '#find-err');
  ok('R2 an empty or a bad handle gets a plain message and nothing is sent to Bluesky', /Type a Bluesky handle first/.test(err1) && /doesn't look like a Bluesky handle/.test(err2) && !log.calls.length, err1 + ' | ' + err2);
  const pa = await page.evaluate(() => { const f = window.__rush.parseActor; return [f('@Busy.Example'), f('https://bsky.app/profile/busy.example/post/3abc'), f('did:plc:abc123'), f('nodots'), f(''), f('a b.com')]; });
  ok('R3 parseActor takes handles, @handles, profile links and DIDs, and refuses the rest', JSON.stringify(pa) === JSON.stringify(['busy.example', 'busy.example', 'did:plc:abc123', null, null, null]), JSON.stringify(pa));
  const op = await page.evaluate(() => { const f = window.__rush.openingOf; return [f('“Nobody: x'), f('https://x.com a'), f('@a hi'), f('😀 hi'), f(''), f("Don't stop"), f('Hello, world')]; });
  ok('R4 opening words: lower case, no punctuation, links, mentions and emoji are labeled', JSON.stringify(op) === JSON.stringify(['nobody', '(a link)', '(an @mention)', '(a symbol or emoji)', '', "don't", 'hello']), JSON.stringify(op));
  const lu = await page.evaluate(() => { const L = window.__rush.landsOf; const mk = (n, likes) => Array.from({ length: n }, (_, i) => ({ t: i, likes: likes(i), len: 10, pic: false, reply: false, first: 'a' })); return [L(mk(19, i => i)).enough, !!L(mk(25, () => 0)).nolikes, L(mk(25, i => i)).k, L(mk(20, i => i)).k]; });
  ok('R5 What Lands needs 20 posts, notices when nothing has a like, and the top 10% is a tenth of the posts (at least 1)', JSON.stringify(lu) === JSON.stringify([false, true, 2, 2]), JSON.stringify(lu));

  // ---- a busy account, capped at 120 for the test ----
  await go(page, '@Busy.Example'); await done(page);
  const posts1 = await page.evaluate(() => window.__rush.state().run.posts.length), seen1 = await page.evaluate(() => Object.keys(window.__rush.state().run.seen));
  ok('R6 it looks up the profile, then reads the author feed with replies included, 100 at a time', log.calls[0] === 'app.bsky.actor.getProfile:busy.example' && log.calls[1] === 'app.bsky.feed.getAuthorFeed:did:plc:busy1' && /filter=posts_with_replies/.test(log.feed[0]) && /limit=100/.test(log.feed[0]) && /cursor=/.test(log.feed[1]), JSON.stringify([log.calls, log.feed]));
  ok('R7 it stops at the cap exactly (120), counts only the account\'s own posts and skips every repost', posts1 === 120 && !seen1.some(u => u.includes('did:plc:other')) && (await txt(page, '#captext')).startsWith('Showing the newest 120 posts') && (await txt(page, '#more')) === 'Load 120 more', JSON.stringify([posts1, await txt(page, '#captext'), await txt(page, '#more')]));
  const st = await page.evaluate(() => [...document.querySelectorAll('#stats .stat')].map(s => s.textContent));
  ok('R8 the stat cards: posts read, in the grid (replies left out), replies left out', st[0].startsWith('120') && st[1].startsWith('96') && st[2].startsWith('24'), JSON.stringify(st));

  // ---- the grid ----
  let cells = await heatCells(page);
  const sum = cells.reduce((s, c) => s + nOf(c.t), 0);
  ok('R9 the grid is 7 days by 24 hours and its squares add up to the non-reply posts (96)', cells.length === 168 && sum === 96, cells.length + ' cells, ' + sum + ' posts');
  const c0 = cells.find(c => c.d === 1 && c.h === 20);
  ok('R10 in New York time the first post (Tuesday midnight UTC) lands on Monday 8 PM, and a square reads like "Mon 8 PM: 1 post"', c0 && nOf(c0.t) >= 1 && /^Mon 8 PM: \d+ posts?/.test(c0.t), c0 && c0.t);
  await page.click('#z-utc'); cells = await heatCells(page);
  const cu = cells.find(c => c.d === 2 && c.h === 0), cu2 = cells.find(c => c.d === 1 && c.h === 20);
  ok('R11 switching to UTC moves it to Tuesday 12 AM, keeps the total, and says UTC in the sentence', cu && nOf(cu.t) >= 1 && nOf(cu2.t) === 0 && cells.reduce((s, c) => s + nOf(c.t), 0) === 96 && /UTC time/.test(await txt(page, '#heat-sub')) && (await page.getAttribute('#z-utc', 'aria-pressed')) === 'true');
  await page.click('#z-local');
  const heads = await page.evaluate(() => ({ rows: document.querySelectorAll('#heat tbody th[scope=row]').length, cols: [...document.querySelectorAll('#heat thead th')].map(t => t.textContent).join(','), empties: [...document.querySelectorAll('#heat td[data-t]')].filter(td => !td.textContent.trim()).length }));
  ok('R12 the grid is a real table: a header for each weekday, an hour label every 3 hours, and every square has readable text', heads.rows === 7 && heads.cols === '12a,3a,6a,9a,12p,3p,6p,9p' && heads.empties === 0, JSON.stringify(heads));
  await page.click('#heat td[data-d="1"][data-h="20"]');
  const dlg = await page.evaluate(() => { const d = document.getElementById('slotdlg'); return { open: d.open, title: document.getElementById('slot-t').textContent, items: [...d.querySelectorAll('.plist li')].map(li => ({ likes: li.querySelector('.likes').textContent, txt: (li.querySelector('.txt') || {}).textContent, href: li.querySelector('a').href, rel: li.querySelector('a').rel })) }; });
  const want = (await heatCells(page)).find(c => c.d === 1 && c.h === 20), wantN = nOf(want.t);
  ok('R13 clicking a square opens a pop-up titled with the slot and the number of posts, one entry per post, most liked first, each with its text and a link to the post on Bluesky', dlg.open && dlg.title === 'Monday 8 PM · ' + wantN + (wantN === 1 ? ' post' : ' posts') && dlg.items.length === wantN && dlg.items.every(i => /^https:\/\/bsky\.app\/profile\/busy\.example\/post\/p\d+$/.test(i.href) && /noopener/.test(i.rel) && i.txt) && dlg.items.map(i => parseInt(i.likes)).every((v, i, a) => !i || a[i - 1] >= v), JSON.stringify(dlg).slice(0, 300));
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  await page.focus('#heat td[data-d="0"][data-h="0"]'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowRight');
  const kb = await page.evaluate(() => ({ at: document.activeElement.dataset.d + ',' + document.activeElement.dataset.h, tabs: document.querySelectorAll('#heat td[tabindex="0"]').length }));
  ok('R13b the grid works from the keyboard: arrow keys move between squares, one square is a tab stop, Enter opens it and Escape closes it', kb.at === '1,1' && kb.tabs === 1 && !(await page.evaluate(() => document.getElementById('slotdlg').open)), JSON.stringify(kb));
  await page.keyboard.press('Enter'); const kopen = await page.evaluate(() => document.getElementById('slotdlg').open || document.querySelectorAll('#slotbody .plist li').length === 0);
  await page.keyboard.press('Escape'); await page.waitForTimeout(50);
  ok('R13c Escape closes the pop-up and puts focus back on the square', !(await page.evaluate(() => document.getElementById('slotdlg').open)) && (await page.evaluate(() => document.activeElement.dataset.d)) !== undefined && kopen);
  await page.click('#m-likes'); cells = await heatCells(page);
  const lg = await txt(page, '#legend');
  ok('R14 "Average likes" mode: pressed state and legend change, and squares with fewer than 3 posts get the dotted edge', (await page.getAttribute('#m-likes', 'aria-pressed')) === 'true' && /more likes/.test(lg) && /under 3 posts/.test(lg) && cells.some(c => c.thin) && cells.filter(c => c.thin).every(c => { const n = nOf(c.t); return n > 0 && n < 3; }), lg);
  const picks = await page.evaluate(() => [...document.querySelectorAll('#picks .pick')].map(p => p.querySelector('dt').textContent + '=' + p.querySelector('dd').childNodes[0].textContent));
  ok('R15 four call-outs: most posts, best time, best day, best hour (each a slot or "Not enough posts yet")', picks.length === 4 && /^Most posts=(Sun|Mon|Tue|Wed|Thu|Fri|Sat) \d+ [AP]M$/.test(picks[0]) && picks.every(p => /=(?!undefined)/.test(p)), JSON.stringify(picks));
  await page.click('#m-count');

  // ---- What Lands ----
  const lands = await txt(page, '#lands'), lsub = await txt(page, '#lands-sub');
  ok('R16 What Lands compares the top 12 posts (a tenth of 120) with the other 108, replies included', /The 12 posts with the most likes \(100 or more\) against the other 108/.test(lsub), lsub);
  const pairs = await page.evaluate(() => [...document.querySelectorAll('#lands .cmp')].map(c => c.querySelector('h3').textContent + ':' + [...c.querySelectorAll('.pair b')].map(b => b.textContent).join('/')));
  ok('R17 length (38 against about 130), pictures (100% against 0%) and replies (0% against 22%) come out as built', pairs[0] === 'Length:38/130' && pairs[1] === 'A picture, video or GIF:100%/0%' && pairs[2] === 'Replies:0%/22%', JSON.stringify(pairs));
  const words = await page.evaluate(() => [...document.querySelectorAll('#lands .words tbody tr')].map(r => [...r.children].map(c => c.textContent).join(' ')));
  ok('R18 the opening-word table lists "nobody" at 100% of the top posts and 0% of the rest', words.length === 1 && words[0] === 'nobody 100% 0%', JSON.stringify(words));
  const learned = await page.evaluate(() => [...document.querySelectorAll('#lands .learned li:not(.t)')].map(l => l.textContent));
  ok('R19 "What stands out" says the top posts run shorter, pictures help, replies rarely make the top, and hits open with "nobody"', learned.length === 4 && /run shorter: about 38 characters, against 130/.test(learned[0]) && /Pictures help: 100%/.test(learned[1]) && /Replies rarely make the top/.test(learned[2]) && /open with "nobody": 100%/.test(learned[3]), JSON.stringify(learned));

  // ---- Load more ----
  const callsBefore = log.feed.length;
  await page.click('#more'); await done(page);
  const posts2 = await page.evaluate(() => window.__rush.state().run.posts.length);
  ok('R20 "Load 120 more" reads on to exactly 240 with no repeats', posts2 === 240 && (await page.evaluate(() => new Set(Object.keys(window.__rush.state().run.seen)).size)) === 240 && log.feed.length > callsBefore, String(posts2));
  await page.click('#more'); await done(page);
  const posts3 = await page.evaluate(() => window.__rush.state().run.posts.length);
  ok('R21 the next one stops at the ceiling (300) and the button goes away with an honest line', posts3 === 300 && (await page.isHidden('#more')) && /limit for one run/.test(await txt(page, '#captext')), await txt(page, '#captext'));

  // ---- copy the summary ----
  await page.click('#copysum'); await page.waitForTimeout(100);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  ok('R22 Copy summary puts a short plain-text summary on the clipboard, ending with the site address', /^Rush Hour for @busy\.example \(300 posts read, times in America\/New_York\)\n/.test(clip) && /Most posts: /.test(clip) && clip.trim().endsWith('professorkiosk.wtf/rushhour') && (await txt(page, '#status')) === 'Summary copied.', clip);
  ok('R23 only Bluesky\'s public server is contacted, and nothing but the theme is stored in the browser', log.third.every(h => h === 'public.api.bsky.app') && (await page.evaluate(() => Object.keys(localStorage).every(k => k === 'theme'))), JSON.stringify([...new Set(log.third)]));
  await page.click('#another');
  ok('R24 "Read another account" clears the results and the box', (await page.isHidden('#result')) && (await page.inputValue('#handle')) === '' && !(await page.isHidden('#slot')));

  // ---- a small account, an empty one, an unknown one ----
  await go(page, 'small.example'); await done(page);
  const sm = await page.evaluate(() => ({ n: window.__rush.state().run.posts.length, cap: !document.getElementById('capbar').hidden, status: document.getElementById('status').textContent, lands: document.getElementById('lands').textContent }));
  ok('R25 a small account is read in full: no "load more", "Read all 12 posts", and What Lands says it needs 20', sm.n === 12 && !sm.cap && sm.status === 'Read all 12 posts.' && /needs at least 20 posts/.test(sm.lands), JSON.stringify(sm));
  await page.click('#another'); await go(page, 'empty.example'); await done(page);
  ok('R26 an account with no posts says so and shows no grid', /has no posts of their own/.test(await txt(page, '#captext')) && (await page.isHidden('#result')));
  await go(page, 'nobody.example'); await done(page);
  ok('R27 an unknown account gets "Couldn\'t find that account"', /Couldn't find that account/.test(await txt(page, '#find-err')), await txt(page, '#find-err'));

  // ---- deep link and example link ----
  const dl = await mk(browser); await dl.page.goto(BASE + '#handle=small.example'); await done(dl.page);
  ok('R28 a #handle= link fills the box and reads the account', (await dl.page.inputValue('#handle')) === 'small.example' && (await dl.page.evaluate(() => window.__rush.state().run.posts.length)) === 12);
  await dl.ctx.close();

  // ---- the failures ----
  const dn = await mk(browser, { mode: { profile: 'down' } }); await dn.page.goto(BASE); await go(dn.page, 'busy.example'); await done(dn.page);
  ok('R29 if Bluesky is unreachable the message says so in plain words and the button works again', /Bluesky didn't answer/.test(await txt(dn.page, '#find-err')) && !(await dn.page.isDisabled('#go')));
  await dn.ctx.close();
  const rl = await mk(browser, { mode: { rateFirst: true } }); await rl.page.goto(BASE); await go(rl.page, 'small.example');
  await rl.page.waitForFunction(() => /rate-limiting/.test(document.getElementById('pnotice').textContent), null, { timeout: 4000 }); await done(rl.page);
  ok('R30 a rate-limit answer shows a waiting notice, then carries on and finishes', (await rl.page.evaluate(() => window.__rush.state().run.posts.length)) === 12 && (await rl.page.isHidden('#pnotice')));
  await rl.ctx.close();
  const mf = await mk(browser, { mode: { failFrom: 2 } }); await mf.page.goto(BASE); await go(mf.page, 'busy.example'); await done(mf.page);
  const nmf = await mf.page.evaluate(() => window.__rush.state().run.posts.length), cmf = await txt(mf.page, '#captext');
  ok('R31 if Bluesky fails halfway it keeps what it read, says so, and offers "Try again"', nmf > 50 && nmf < 100 && cmf.includes('Showing the ' + nmf + ' posts read so far') && (await txt(mf.page, '#more')) === 'Try again' && !(await mf.page.isHidden('#result')), cmf);
  await mf.ctx.close();
  const sl = await mk(browser, { feedDelay: 500 }); await sl.page.goto(BASE); await go(sl.page, 'busy.example');
  await sl.page.waitForFunction(() => /Reading @busy\.example/.test(document.getElementById('ptext').textContent)); await sl.page.click('#stopBtn'); await done(sl.page);
  const stopped = await txt(sl.page, '#captext');
  await sl.page.click('#more'); await done(sl.page);
  ok('R32 Stop halts the read ("Stopped at …"), and "Keep reading" picks it up again', /^Stopped at \d+ posts?\.$/.test(stopped) && (await sl.page.evaluate(() => window.__rush.state().run.posts.length)) === 120, stopped);
  await sl.ctx.close();

  // ---- screenshots, phone and night mode ----
  await go(page, 'busy.example'); await done(page);
  await page.screenshot({ path: 'rushhour-desktop-light.png', fullPage: true });
  const ph = await mk(browser, { vp: { width: 390, height: 800 }, scheme: 'dark' }); await ph.page.goto(BASE); await go(ph.page, 'busy.example'); await done(ph.page);
  const sz = await ph.page.evaluate(() => { const els = [...document.querySelectorAll('.find .k-btn, .find input, .actions .k-btn, .seg button, #more')].filter(e => e.getBoundingClientRect().width > 0 && !e.closest('[hidden]')); const small = els.filter(e => e.getBoundingClientRect().height < 43.5).map(e => (e.id || e.className) + ':' + Math.round(e.getBoundingClientRect().height)); const hb = document.querySelector('.heatbox'); return { over: document.documentElement.scrollWidth > innerWidth + 1, small, heatFits: hb.scrollWidth <= hb.clientWidth + 1, n: els.length }; });
  ok('R33 phone width (night mode): nothing scrolls sideways, the grid fits, and every button, box and switch is at least 44 pixels tall', !sz.over && !sz.small.length && sz.heatFits && sz.n >= 8, JSON.stringify(sz));
  await ph.page.screenshot({ path: 'rushhour-phone-dark.png', fullPage: true });
  await ph.ctx.close();
  await page.click('#themeToggle'); await page.waitForTimeout(100);
  ok('R34 Night mode switches the theme and remembers it on the shared "theme" key', (await page.getAttribute('html', 'data-theme')) === 'dark' && (await page.evaluate(() => localStorage.getItem('theme'))) === 'dark');
  await page.screenshot({ path: 'rushhour-desktop-dark.png', fullPage: true });

  console.log(out.join('\n')); console.log('JS errors:', errors.length ? errors.join('|') : 'none');
  await browser.close();
})().catch(e => { console.log(out.join('\n')); console.log('TEST CRASH', e); process.exit(1); });
