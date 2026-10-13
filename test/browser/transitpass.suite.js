// Transit Pass: a handle in, a pass card out, drawn on a canvas and saved as a PNG.
const { chromium } = require('playwright-core');
const fs = require('fs');
const BASE = 'http://localhost:3988/transitpass';
const out = []; const ok = (n, c, x = '') => out.push((c ? 'PASS' : 'FAIL') + ': ' + n + (x ? ' — ' + x : ''));
const errors = [];
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');   // 1 x 1 red
const NOW = Date.UTC(2026, 9, 13);
const PROFILES = {
  'cool.example': { did: 'did:plc:abc123', handle: 'cool.example', displayName: 'Cool Person', avatar: 'https://cdn.bsky.app/img/avatar/plain/did:plc:abc123/x@jpeg', createdAt: '2023-03-04T23:59:00.000Z', postsCount: 1234, followersCount: 5678, followsCount: 910, labels: [] },
  'newbie.example': { did: 'did:plc:new999', handle: 'newbie.example', displayName: '', avatar: 'https://cdn.bsky.app/img/avatar/plain/did:plc:new999/x@jpeg', createdAt: '2026-10-12T12:00:00.000Z', postsCount: 1, followersCount: 0, followsCount: 3, labels: [] },
  'spicy.example': { did: 'did:plc:spicy1', handle: 'spicy.example', displayName: 'Secret Name', avatar: 'https://cdn.bsky.app/img/avatar/plain/did:plc:spicy1/x@jpeg', createdAt: '2024-01-01T00:00:00.000Z', postsCount: 50, followersCount: 10, followsCount: 10, labels: [{ val: 'porn' }] },
  'nopic.example': { did: 'did:plc:nopic1', handle: 'nopic.example', displayName: 'No Picture', avatar: 'https://cdn.bsky.app/img/avatar/plain/did:plc:nopic1/x@jpeg', createdAt: '2022-05-05T00:00:00.000Z', postsCount: 900, followersCount: 1, followsCount: 1, labels: [] },
  'undated.example': { did: 'did:plc:undat1', handle: 'undated.example', displayName: 'Undated', createdAt: undefined, postsCount: 5, followersCount: 1, followsCount: 1, labels: [] },
  'private.example': { did: 'did:plc:priv11', handle: 'private.example', displayName: 'Private Person', avatar: 'https://cdn.bsky.app/img/avatar/plain/did:plc:priv11/x@jpeg', createdAt: '2021-01-01T00:00:00.000Z', postsCount: 5, followersCount: 1, followsCount: 1, labels: [{ val: '!no-unauthenticated' }] },
  'mild.example': { did: 'did:plc:mild11', handle: 'mild.example', displayName: 'Mild Label', createdAt: '2020-01-01T00:00:00.000Z', postsCount: 5, followersCount: 1, followsCount: 1, labels: [{ val: 'some-harmless-label' }] }
};
async function mk(browser, { mode = 'ok', scheme = 'light', vp = { width: 1100, height: 900 }, avatarFail = [] } = {}) {
  const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage(); const log = { calls: [], third: [], images: [] };
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { const u = new URL(r.url()); if (u.hostname !== 'localhost' && u.protocol.startsWith('http') && !/fonts\.g/.test(r.url())) log.third.push(r.method() + ' ' + r.url()); });
  await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await page.route('https://public.api.bsky.app/xrpc/**', route => {
    const url = new URL(route.request().url()), H = { 'access-control-allow-origin': '*' }, actor = url.searchParams.get('actor');
    if (actor === 'professorkiosk.wtf') return route.fulfill({ status: 404, headers: H, body: '{}' });   // the footer avatar lookup
    log.calls.push(url.pathname.split('.').pop() + ':' + actor);
    if (mode === 'down') return route.abort();
    if (mode === 'rate') return route.fulfill({ status: 429, headers: H, body: '{}' });
    const p = PROFILES[actor] || Object.values(PROFILES).find(x => x.did === actor);
    if (!p) return route.fulfill({ status: 400, headers: H, contentType: 'application/json', body: '{"error":"InvalidRequest","message":"Profile not found"}' });
    route.fulfill({ headers: H, contentType: 'application/json', body: JSON.stringify(p) });
  });
  await page.route('https://cdn.bsky.app/**', route => {
    log.images.push(route.request().url());
    if (avatarFail.some(x => route.request().url().includes(x))) return route.fulfill({ status: 404, body: 'no' });
    route.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: PNG });
  });
  return { page, log, ctx };
}
const P = async (page, h) => { await page.fill('#handle', h); await page.click('#go'); };
const shown = page => page.waitForSelector('#pwrap:not([hidden])');
const txt = (page, sel) => page.evaluate(s => (document.querySelector(s) || {}).textContent || '', sel);
const alt = page => page.getAttribute('#pass', 'aria-label');
const pix = (page, x, y) => page.evaluate(([x, y]) => { const c = document.getElementById('pass'), d = c.getContext('2d').getImageData(Math.round(x * 3), Math.round(y * 3), 1, 1).data; return [d[0], d[1], d[2], d[3]]; }, [x, y]);
(async () => {
  const browser = await chromium.launch({ executablePath: require('./env').CHROME });
  const setNow = page => page.evaluate(n => window.__transit.setNow(() => n), NOW);

  // ---- the empty page ----
  const { page, log } = await mk(browser); await page.goto(BASE); await setNow(page);
  const e0 = await page.evaluate(() => ({ tag: document.querySelector('.k-hero .k-tag').textContent, slot: !document.getElementById('slot').hidden, pwrap: document.getElementById('pwrap').hidden, btns: ['save', 'copyimg', 'copyalt', 'another'].map(i => document.getElementById(i).disabled), help: !!document.getElementById('helpBtn'), theme: !!document.getElementById('themeToggle'), foot: !!document.querySelector('footer.k-foot .kofi') }));
  ok('T1 the page opens empty: Tool 10 tag, "your pass prints here", the action buttons off, Help, Night mode and footer', /Tool 10/.test(e0.tag) && e0.slot && e0.pwrap && e0.btns.every(Boolean) && e0.help && e0.theme && e0.foot, JSON.stringify(e0));

  // ---- parsing what was typed ----
  const pa = await page.evaluate(() => { const f = window.__transit.parseActor; return { a: f('@Cool.Example'), b: f('  professorkiosk.wtf  '), c: f('https://bsky.app/profile/cool.example'), d: f('https://bsky.app/profile/did:plc:abc123/post/3k'), e: f('did:plc:abc123'), f: f('did:plc:abc123?x'), g: f('hello'), h: f('a b.example'), i: f(''), j: f('x.'), k: f('a'.repeat(260) + '.com'), l: f('@@two.example'), m: f('javascript:alert(1)'), n: f('cool.example/extra') }; });
  ok('T2 handles are tidied (case, @, spaces); profile links and DIDs work; things that are not handles are refused', pa.a === 'cool.example' && pa.b === 'professorkiosk.wtf' && pa.c === 'cool.example' && pa.d === 'did:plc:abc123' && pa.e === 'did:plc:abc123' && pa.g === null && pa.h === null && pa.i === null && pa.j === null && pa.k === null && pa.l === 'two.example' && pa.m === null && pa.n === null && pa.f === null, JSON.stringify(pa));

  // ---- the numbers ----
  const nm = await page.evaluate(() => { const f = window.__transit.paceOf; return { a: f(1000, 100).text, b: f(50, 100).text, c: f(10, 100).text, d: f(3, 0.5).text, e: f(1, 1).text, f: f(0, 400).text, g: f(5, null), h: f(1234, 1318).text, t: [0, 29, 30, 364, 365, 1094, 1095, null].map(window.__transit.typeOf) }; });
  ok('T3 pace is posts a day, a week or a month (whichever reads best), "1 post" is singular, and no join date gives no pace', nm.a === '10 posts a day' && nm.b === '3.5 posts a week' && nm.c === '3 posts a month' && nm.d === '3 posts a day' && nm.e === '1 post a day' && nm.f === '0 posts a month' && nm.g === null && nm.h === '6.6 posts a week', JSON.stringify(nm));
  ok('T4 pass types: Day Tripper under 30 days, Regular under a year, Commuter under three, Lifer after that, Mystery Rider with no date', nm.t.join() === 'DAY TRIPPER,DAY TRIPPER,REGULAR,REGULAR,COMMUTER,COMMUTER,LIFER,MYSTERY RIDER', nm.t.join());

  // ---- printing a pass ----
  await P(page, '@Cool.Example'); await shown(page);
  const m1 = await page.evaluate(() => { const s = window.__transit.state().model; return { route: s.route, line: s.line.name, handle: s.handle, name: s.name, posts: s.posts, fol: s.followers, fing: s.follows, pace: s.pace && s.pace.text, type: s.type, created: s.created.toISOString(), labeled: s.labeled, avatar: !!s.avatar, canvas: [document.getElementById('pass').width, document.getElementById('pass').height], slot: document.getElementById('slot').hidden }; });
  ok('T5 a handle prints a pass: the numbers from the profile, a two-digit route, a line, the pace, the pass type, and the empty-slot box goes away', m1.handle === 'cool.example' && m1.name === 'Cool Person' && m1.posts === 1234 && m1.fol === 5678 && m1.fing === 910 && /^\d\d$/.test(m1.route) && m1.pace === '6.6 posts a week' && m1.type === 'LIFER' && m1.avatar && !m1.labeled && m1.slot && m1.canvas.join() === '1440,900', JSON.stringify(m1));
  const a1 = await alt(page);
  ok('T6 the pass has alt text with who, route and line, pass type, member since (in UTC), posts and pace, followers and following', /^Transit pass for Cool Person \(@cool\.example\)\./.test(a1) && a1.includes('Route ' + m1.route + ', ' + m1.line + ' Line. Pass type: LIFER.') && a1.includes('Member since Mar 4, 2023.') && a1.includes('1,234 posts, about 6.6 posts a week.') && a1.includes('5,678 followers, 910 following.') && a1.includes('professorkiosk.wtf/transitpass'), a1);
  ok('T7 one profile read and one picture read, nothing else', log.calls.length === 1 && log.calls[0] === 'getProfile:cool.example' && log.images.length === 1, JSON.stringify([log.calls, log.images]));
  const band = await pix(page, 40, 200), cardTop = await pix(page, 300, 15);
  const lineHex = await page.evaluate(() => window.__transit.state().model.line.color), want = [1, 3, 5].map(i => parseInt(lineHex.slice(i, i + 2), 16));
  ok('T8 the left band of the pass is drawn in the account\'s line color', band[0] === want[0] && band[1] === want[1] && band[2] === want[2] && band[3] === 255, JSON.stringify([band, want]));
  const pic = await pix(page, 178, 63);
  ok('T9 the profile picture is drawn on the pass (the circle is not blank paper)', pic[3] === 255 && Math.abs(pic[1] - 253) + Math.abs(pic[2] - 246) > 60, JSON.stringify(pic));

  // ---- the same account, the same pass ----
  const route2 = await page.evaluate(() => { const f = window.__transit.fnv; const l = window.__transit.lines; const h = f('did:plc:abc123'); return { route: String((h >>> 8) % 100).padStart(2, '0'), line: l[h % l.length].name }; });
  ok('T10 the route and line come from the account\'s permanent ID (so they are the same every time, and handle changes do not change them)', route2.route === m1.route && route2.line === m1.line, JSON.stringify([route2, m1.route, m1.line]));
  await page.click('#another');
  await P(page, 'https://bsky.app/profile/did:plc:abc123'); await shown(page);
  const same = await page.evaluate(() => { const s = window.__transit.state().model; return s.route + s.line.name; });
  ok('T11 looking the same account up by profile link and DID gives the same route and line', same === m1.route + m1.line, same);

  // ---- switches ----
  await page.uncheck('#o-name'); await page.waitForTimeout(100);
  const a2 = await alt(page);
  await page.uncheck('#o-handle'); await page.waitForTimeout(100);
  const a3 = await alt(page);
  await page.uncheck('#o-photo'); await page.waitForTimeout(100);
  const pic2 = await pix(page, 178, 63);
  ok('T12 turning off name, then handle, takes them out of the alt text; turning off the photo takes the picture off the card', /^Transit pass for @cool\.example\./.test(a2) && !a2.includes('Cool Person') && /^Transit pass\./.test(a3) && !a3.includes('cool.example\.') && Math.abs(pic2[1] - 253) + Math.abs(pic2[2] - 246) < 12, JSON.stringify([a2.slice(0, 40), a3.slice(0, 30), pic2]));
  await page.check('#o-name'); await page.check('#o-handle'); await page.check('#o-photo');

  // ---- a brand-new account, no name ----
  await page.click('#another'); await P(page, 'newbie.example'); await shown(page);
  const a4 = await alt(page);
  ok('T13 a half-day-old account with no display name: handle only, "Day Tripper", pace in posts a day, and 1 post is singular (a first day counts as a whole day)', /^Transit pass for @newbie\.example\./.test(a4) && a4.includes('Pass type: DAY TRIPPER.') && a4.includes('1 post, about 1 post a day.') && a4.includes('0 followers, 3 following.'), a4);

  // ---- a labeled account ----
  await page.click('#another'); await P(page, 'spicy.example'); await shown(page);
  const lab = await page.evaluate(() => ({ note: !document.getElementById('labelnote').hidden, photo: document.getElementById('o-photo').disabled, name: document.getElementById('o-name').disabled, avatar: !!window.__transit.state().model.avatar }));
  const a5 = await alt(page);
  ok('T14 an account with a content label prints without its photo or name, says why, and those switches are off', lab.note && lab.photo && lab.name && !lab.avatar && !a5.includes('Secret Name') && /^Transit pass for @spicy\.example\./.test(a5), JSON.stringify([lab, a5.slice(0, 50)]));
  await page.click('#another'); await P(page, 'mild.example'); await shown(page);
  ok('T15 a label that is not on the hide list does not hide anything', !(await page.evaluate(() => window.__transit.state().model.labeled)) && (await alt(page)).includes('Mild Label'));

  const nt = await page.evaluate(() => document.getElementById('labelnote').textContent);
  ok('T15b the label note names the label that hid the photo and name', /"porn"/.test(nt), nt);
  await page.click('#another'); await P(page, 'private.example'); await shown(page);
  const nt2 = await page.evaluate(() => ({ t: document.getElementById('labelnote').textContent, hidden: document.getElementById('labelnote').hidden }));
  ok('T15c an account that opted out of logged-out viewing says so in the note', !nt2.hidden && /asked not to be shown to people who aren't logged in/.test(nt2.t) && /!no-unauthenticated/.test(nt2.t), JSON.stringify(nt2));

  // ---- the full-size picture fails, the small one is tried ----
  const tf = await mk(browser, { avatarFail: ['/img/avatar/'] }); await tf.page.goto(BASE); await setNow(tf.page); await P(tf.page, 'cool.example'); await shown(tf.page);
  ok('T15d if the full-size picture will not load, the small version is tried and the photo still prints', (await tf.page.evaluate(() => !!window.__transit.state().model.avatar)) && tf.log.images.some(u => u.includes('/img/avatar_thumbnail/')), JSON.stringify(tf.log.images));
  await tf.ctx.close();

  // ---- Bluesky's image server refuses everything: this site's pass-through is the last resort ----
  const pf = await mk(browser, { avatarFail: ['/img/avatar'] }); await pf.page.route('**/api/avatar**', r => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
  await pf.page.goto(BASE); await setNow(pf.page); await P(pf.page, 'cool.example'); await shown(pf.page);
  ok('T15e if both direct loads fail, the picture comes through this site\'s pass-through', await pf.page.evaluate(() => !!window.__transit.state().model.avatar) && !!(await pf.page.evaluate(() => window.__transit.state().model.avatarHow)).match(/through this site/));
  await pf.ctx.close();

  // ---- an account with no join date ----
  await page.click('#another'); await P(page, 'undated.example'); await shown(page);
  const a6 = await alt(page);
  ok('T16 an account with no join date still prints: member since "Unknown", no pace, Mystery Rider', a6.includes('Member since Unknown.') && a6.includes('Pass type: MYSTERY RIDER.') && a6.includes('5 posts.') && !a6.includes('about'), a6);

  // ---- the picture fails to load ----
  const nf = await mk(browser, { avatarFail: ['nopic1'] }); await nf.page.goto(BASE); await setNow(nf.page);
  await P(nf.page, 'nopic.example'); await shown(nf.page);
  ok('T17 if the picture will not load the pass prints anyway, without it', !(await nf.page.evaluate(() => !!window.__transit.state().model.avatar)) && (await alt(nf.page)).includes('No Picture'));
  await nf.ctx.close();

  // ---- problems ----
  await page.click('#another');
  const calls0 = log.calls.length;
  await page.click('#go');
  ok('T18 pressing Print with nothing typed asks for a handle and makes no request', /Type a handle first/.test(await page.innerText('#find-err')) && log.calls.length === calls0);
  await P(page, 'not a handle');
  ok('T19 something that is not a handle is explained, with no request', /doesn't look like a Bluesky handle/.test(await page.innerText('#find-err')) && log.calls.length === calls0);
  await P(page, 'ghost.example'); await page.waitForFunction(() => /couldn't find that account/.test(document.getElementById('find-err').textContent));
  ok('T20 an account that does not exist says so and the pass does not appear', await page.locator('#pwrap').isHidden() && await page.locator('#find-err').isVisible());
  const dn = await mk(browser, { mode: 'down' }); await dn.page.goto(BASE); await P(dn.page, 'cool.example'); await dn.page.waitForFunction(() => /didn't answer/.test(document.getElementById('find-err').textContent));
  ok('T21 when Bluesky cannot be reached it says so and the button works again', await dn.page.locator('#go').isEnabled());
  await dn.ctx.close();
  const rl = await mk(browser, { mode: 'rate' }); await rl.page.goto(BASE); await P(rl.page, 'cool.example'); await rl.page.waitForFunction(() => /didn't answer/.test(document.getElementById('find-err').textContent));
  ok('T22 when Bluesky says slow down (429) it is treated the same way', true);
  await rl.ctx.close();

  // ---- the buttons ----
  await P(page, 'cool.example'); await shown(page);
  ok('T23 once printed, the four action buttons come on', (await page.evaluate(() => ['save', 'copyimg', 'copyalt', 'another'].map(i => document.getElementById(i).disabled))).every(x => !x));
  const dl = page.waitForEvent('download'); await page.click('#save'); const d = await dl;
  const buf = fs.readFileSync(await d.path());
  ok('T24 Share or save image downloads a PNG named for the route, 1440 x 900', d.suggestedFilename() === 'transit-pass-route-' + m1.route + '.png' && buf.slice(1, 4).toString() === 'PNG' && buf.readUInt32BE(16) === 1440 && buf.readUInt32BE(20) === 900, d.suggestedFilename() + ' ' + buf.readUInt32BE(16) + 'x' + buf.readUInt32BE(20));
  await page.click('#copyalt');
  ok('T25 Copy alt text puts the alt text on the clipboard', (await page.evaluate(() => navigator.clipboard.readText())) === (await alt(page)));
  await page.click('#copyimg').catch(() => {});
  await page.waitForFunction(() => /Image copied|Couldn't copy the image/.test(document.getElementById('status').textContent));
  ok('T26 Copy image says it copied (or says it could not, and nothing breaks)', true, await page.innerText('#status'));
  await page.click('#another');
  ok('T27 Print another empties the page, clears the box and puts the cursor in it', (await page.inputValue('#handle')) === '' && await page.locator('#pwrap').isHidden() && await page.locator('#slot').isVisible() && (await page.evaluate(() => document.activeElement.id)) === 'handle');

  // ---- deep link ----
  const dd = await mk(browser); await dd.page.goto(BASE + '#handle=cool.example'); await shown(dd.page);
  ok('T28 /transitpass#handle=... prints that account straight away', (await alt(dd.page)).includes('Cool Person'));
  await dd.ctx.close();
  const ex = await mk(browser); await ex.page.goto(BASE); await ex.page.route('https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=professorkiosk.wtf', r => r.fulfill({ headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: JSON.stringify({ did: 'did:plc:pk0001', handle: 'professorkiosk.wtf', displayName: 'Professor Kiosk', createdAt: '2023-05-01T00:00:00Z', postsCount: 10, followersCount: 2, followsCount: 3 }) }));
  await ex.page.click('#find-note a'); await shown(ex.page);
  ok('T29 the example link prints @professorkiosk.wtf', (await alt(ex.page)).includes('professorkiosk.wtf'));
  await ex.ctx.close();

  // ---- privacy: what the page asks for ----
  const third = log.third.filter(r => !/^GET https:\/\/public\.api\.bsky\.app\/xrpc\/app\.bsky\.actor\.getProfile/.test(r) && !/^GET https:\/\/cdn\.bsky\.app\//.test(r));
  ok('T30 the page only ever asked Bluesky for profiles and Bluesky\'s image server for pictures (plus the footer avatar lookup)', third.length === 0, third.join(' | '));
  ok('T31 nothing is stored: no localStorage keys other than the theme', await page.evaluate(() => Object.keys(localStorage).every(k => k === 'theme')));

  // ---- look: phone, night, focus ----
  await page.close();
  const ph = await mk(browser, { vp: { width: 390, height: 800 }, scheme: 'dark' }); await ph.page.goto(BASE); await setNow(ph.page); await P(ph.page, 'cool.example'); await shown(ph.page);
  const sz = await ph.page.evaluate(() => { const c = document.getElementById('pass').getBoundingClientRect(), els = [...document.querySelectorAll('.find .k-btn, .find input, .actions .k-btn, .opt')].filter(e => e.getBoundingClientRect().width > 0 && !e.hidden); const small = els.filter(e => e.getBoundingClientRect().height < 43.5).map(e => (e.id || e.className) + ':' + Math.round(e.getBoundingClientRect().height)); return { w: c.width, vw: innerWidth, over: document.documentElement.scrollWidth > innerWidth + 1, small }; });
  ok('T32 phone width (night mode): the pass fits the screen, nothing scrolls sideways, and every button, box and switch is at least 44 pixels tall', sz.w <= sz.vw && !sz.over && !sz.small.length, JSON.stringify(sz));
  await ph.page.screenshot({ path: 'transitpass-phone-dark.png', fullPage: true });
  await ph.ctx.close();
  const dk = await mk(browser); await dk.page.goto(BASE); await setNow(dk.page); await P(dk.page, 'cool.example'); await shown(dk.page);
  await dk.page.screenshot({ path: 'transitpass-desktop-light.png', fullPage: true });
  await dk.page.click('#themeToggle'); await dk.page.waitForTimeout(100);
  ok('T33 Night mode switches the theme and remembers it on the shared "theme" key', (await dk.page.getAttribute('html', 'data-theme')) === 'dark' && (await dk.page.evaluate(() => localStorage.getItem('theme'))) === 'dark');
  await dk.page.screenshot({ path: 'transitpass-desktop-dark.png', fullPage: true });
  await dk.ctx.close();

  console.log(out.join('\n')); console.log('JS errors:', errors.length ? errors.join('|') : 'none');
  await browser.close();
})().catch(e => { console.log(out.join('\n')); console.log('TEST CRASH', e); process.exit(1); });
