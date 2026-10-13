// Mutual Match: two handles in, what they share (follows, followers, replies) and where they differ.
const { chromium } = require('playwright-core');
const BASE = 'http://localhost:3988/mutualmatch';
const out = []; const ok = (n, c, x = '') => out.push((c ? 'PASS' : 'FAIL') + ': ' + n + (x ? ' — ' + x : ''));
const errors = [];
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');   // 1 x 1 red

// ---- the fake Bluesky ----
const pidOf = i => i === 'alice' ? 'did:plc:alice1' : i === 'bob' ? 'did:plc:bob1' : pid(i);
const pid = i => 'did:plc:person' + String(i).padStart(3, '0');
function person(i) {
  const labels = i === 10 ? [{ val: '!no-unauthenticated' }] : i === 11 ? [{ val: 'porn' }] : [];
  return { did: pid(i), handle: 'p' + String(i).padStart(3, '0') + '.example', displayName: 'Person ' + i, avatar: 'https://cdn.bsky.app/img/avatar/plain/' + pid(i) + '/x@jpeg', labels };
}
const range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i);
function acct(did, handle, name, follows, followers, replies, labels = [], extra = {}) {
  const feed = [];
  replies.forEach(([i, n]) => { for (let k = 0; k < n; k++) feed.push({ post: { uri: `at://${did}/app.bsky.feed.post/r${i}_${k}`, author: { did }, record: { createdAt: '2026-10-01T00:00:00Z' } }, reply: { parent: { author: i === 'bob' ? { did: 'did:plc:bob1', handle: 'bob.example', displayName: 'Bob' } : i === 'alice' ? { did: 'did:plc:alice1', handle: 'alice.example', displayName: 'Alice' } : person(i) } } }); });
  for (let k = 0; k < 6; k++) feed.push({ post: { uri: `at://${did}/app.bsky.feed.post/n${k}`, author: { did }, record: { createdAt: '2026-10-02T00:00:00Z' } } });
  feed.push({ post: { uri: 'at://' + did + '/app.bsky.feed.post/selfrp', author: { did }, record: {} }, reason: { $type: 'app.bsky.feed.defs#reasonRepost' } });   // a repost of its own post: ignored
  (extra.reposts || []).forEach(([i, n]) => { for (let k = 0; k < n; k++) feed.push({ post: { uri: `at://${pidOf(i)}/app.bsky.feed.post/rp${k}`, author: i === 'alice' ? { did: 'did:plc:alice1', handle: 'alice.example' } : person(i), record: {} }, reason: { $type: 'app.bsky.feed.defs#reasonRepost' } }); });
  const likes = []; (extra.likes || []).forEach(([i, n]) => { for (let k = 0; k < n; k++) likes.push({ uri: 'at://' + did + '/app.bsky.feed.like/l' + i + '_' + k, value: { subject: { uri: `at://${pidOf(i)}/app.bsky.feed.post/p${k}` } } }); });
  feed.push({ post: { uri: `at://${did}/app.bsky.feed.post/blocked`, author: { did }, record: { createdAt: '2026-10-03T00:00:00Z' } }, reply: { parent: { $type: 'app.bsky.feed.defs#blockedPost' } } });
  return { likes, did, handle, displayName: name, avatar: 'https://cdn.bsky.app/img/avatar/plain/' + did + '/x@jpeg', labels, follows, followers, feed, postsCount: feed.length };
}
const ACCTS = {
  // alice follows 0..19 and bob; bob follows 10..29: both follow 10..19. Followers: alice 0..14, bob 5..24: both 5..14.
  'alice.example': acct('did:plc:alice1', 'alice.example', 'Alice A', range(0, 20), range(0, 15), [[12, 3], [13, 2], [40, 4], [41, 2], [42, 1], [43, 1], [44, 1], [45, 1], [46, 1], ['bob', 1]], [], { likes: [[12, 3], [13, 2], [40, 4], [41, 2], [42, 1], [43, 1]].concat([['alice', 1]]), reposts: [[41, 2], [44, 3], [45, 1]] }),
  'bob.example': acct('did:plc:bob1', 'bob.example', 'Bob B', range(10, 30), range(5, 25), [[12, 2], [13, 1], [2, 5], [3, 3], [60, 3], [61, 1], ['alice', 2]], [], { likes: [[60, 3], [61, 1], [3, 5], [12, 2], ['alice', 2]], reposts: [[62, 2], [2, 1]] }),
  'big.example': acct('did:plc:big1', 'big.example', 'Big Account', range(0, 250), range(0, 250), []),
  'quiet.example': acct('did:plc:quiet1', 'quiet.example', 'Quiet', null, range(0, 5), []),
  'spicy.example': acct('did:plc:spicy1', 'spicy.example', 'Secret Name', range(0, 12), range(0, 12), [], [{ val: 'porn' }])
};
async function mk(browser, { vp = { width: 1200, height: 900 }, scheme = 'light', test = { listCap: 100, listMore: 100, listCeiling: 200, replyCap: 500, replyMore: 500, replyCeiling: 1000, commStart: 6, commMore: 6, commFollowCap: 100, gapMs: 0, retryMs: 1, minPause: 1 }, delay = 0, mode = {} } = {}) {
  const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.addInitScript(t => { window.MM_TEST = t; }, test);
  const page = await ctx.newPage(); const log = { calls: [], third: [] };
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { const u = new URL(r.url()); if (u.hostname !== 'localhost' && u.protocol.startsWith('http') && !/fonts\.g/.test(r.url())) log.third.push(u.hostname); });
  await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await page.route('https://plc.directory/**', r => {
    log.plc = (log.plc || 0) + 1;
    if (mode.noPlc) return r.fulfill({ status: 500, headers: { 'access-control-allow-origin': '*' }, body: '{}' });
    r.fulfill({ headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: JSON.stringify({ service: [{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: 'https://pds.example' }] }) });
  });
  await page.route('https://pds.example/xrpc/**', r => {
    const u = new URL(r.request().url()), H = { 'access-control-allow-origin': '*' }, a = Object.values(ACCTS).find(x => x.did === u.searchParams.get('repo'));
    log.likeCalls = (log.likeCalls || 0) + 1;
    if (!a || u.searchParams.get('collection') !== 'app.bsky.feed.like') return r.fulfill({ status: 400, headers: H, body: '{}' });
    const off = Number(u.searchParams.get('cursor') || 0), lim = Number(u.searchParams.get('limit') || 50);
    r.fulfill({ headers: H, contentType: 'application/json', body: JSON.stringify({ records: a.likes.slice(off, off + lim), cursor: off + lim < a.likes.length ? String(off + lim) : undefined }) });
  });
  await page.route('https://cdn.bsky.app/**', r => r.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: PNG }));
  let n = 0;
  await page.route('https://public.api.bsky.app/xrpc/**', async route => {
    const url = new URL(route.request().url()), H = { 'access-control-allow-origin': '*' }, method = url.pathname.split('/').pop(), actor = url.searchParams.get('actor');
    if (actor === 'professorkiosk.wtf') return route.fulfill({ status: 404, headers: H, body: '{}' });
    log.calls.push(method.replace('app.bsky.', '') + ':' + actor);
    const json = o => route.fulfill({ headers: H, contentType: 'application/json', body: JSON.stringify(o) });
    if (method === 'app.bsky.actor.getProfiles') {
      const ids = url.searchParams.getAll('actors'); log.profilesAsked = (log.profilesAsked || []).concat(ids);
      return json({ profiles: ids.map(d => { const m2 = /^did:plc:person(\d+)$/.exec(d); return m2 ? person(Number(m2[1])) : null; }).filter(Boolean) });
    }
    const pm = /^did:plc:person(\d+)$/.exec(actor || '');
    if (pm && method === 'app.bsky.graph.getFollows') {      // the shared accounts' own follow lists, for the Community tab
      n++; log.person = (log.person || 0) + 1;
      const i = Number(pm[1]);
      if (i === 15) return route.fulfill({ status: 400, headers: H, contentType: 'application/json', body: '{"error":"x"}' });
      const list = i === 12 ? range(10, 20).filter(x => x !== 12) : i === 13 ? [10, 11, 14, 15, 16] : i === 18 ? range(100, 260).concat([12, 13, 14]) : [12, 13];
      const off0 = Number(url.searchParams.get('cursor') || 0), lim0 = Number(url.searchParams.get('limit') || 50);
      return route.fulfill({ headers: H, contentType: 'application/json', body: JSON.stringify({ follows: list.slice(off0, off0 + lim0).map(person), cursor: off0 + lim0 < list.length ? String(off0 + lim0) : undefined }) });
    }
    const a = ACCTS[actor] || Object.values(ACCTS).find(x => x.did === actor);
    if (method === 'app.bsky.actor.getProfile') {
      if (mode.profile === 'down') return route.abort();
      if (!a) return route.fulfill({ status: 400, headers: H, contentType: 'application/json', body: '{"error":"InvalidRequest"}' });
      return json({ did: a.did, handle: a.handle, displayName: a.displayName, avatar: a.avatar, labels: a.labels, followsCount: (a.follows || []).length, followersCount: a.followers.length, postsCount: a.postsCount });
    }
    if (method === 'app.bsky.graph.getRelationships') return json({ actor, relationships: [{ $type: 'app.bsky.graph.defs#relationship', did: url.searchParams.get('others'), following: true, followedBy: false }] });
    n++;
    if (delay) await new Promise(r => setTimeout(r, delay));
    if (mode.rateFirst && n === 1) return route.fulfill({ status: 429, headers: { ...H, 'retry-after': '1' }, body: '{}' });
    if (mode.failFrom && n >= mode.failFrom) return route.fulfill({ status: 500, headers: H, body: '{}' });
    if (!a) return route.fulfill({ status: 400, headers: H, body: '{}' });
    const off = Number(url.searchParams.get('cursor') || 0), lim = Number(url.searchParams.get('limit') || 50);
    const page_ = (arr, key) => json({ [key]: arr.slice(off, off + lim), cursor: off + lim < arr.length ? String(off + lim) : undefined });
    if (method === 'app.bsky.graph.getFollows') { if (!a.follows) return route.fulfill({ status: 400, headers: H, contentType: 'application/json', body: '{"error":"x"}' }); return page_(a.follows.map(person), 'follows'); }
    if (method === 'app.bsky.graph.getFollowers') return page_(a.followers.map(person), 'followers');
    if (method === 'app.bsky.feed.getAuthorFeed') return page_(a.feed, 'feed');
    route.fulfill({ status: 404, headers: H, body: '{}' });
  });
  return { page, log, ctx };
}
const go = async (page, a, b) => { await page.fill('#ha', a); await page.fill('#hb', b); await page.click('#go'); };
const done = page => page.waitForFunction(() => !document.getElementById('go').disabled);
const txt = (page, sel) => page.evaluate(s => (document.querySelector(s) || {}).textContent || '', sel);
const items = page => page.evaluate(() => [...document.querySelectorAll('#people li')].map(li => ({ grp: li.classList.contains('grp'), t: li.textContent.trim().replace(/\s+/g, ' '), img: !!li.querySelector('img'), b: (li.querySelector('b') || {}).textContent })));
const tab = async (page, id) => { await page.click('#t-' + id); };
const pix = (page, x, y) => page.evaluate(([x, y]) => { const c = document.getElementById('card'), d = c.getContext('2d').getImageData(Math.round(x * 3), Math.round(y * 3), 1, 1).data; return [d[0], d[1], d[2]]; }, [x, y]);

(async () => {
  const browser = await chromium.launch({ executablePath: require('./env').CHROME });

  // ---- the empty page and the checks on what is typed ----
  const { page, log } = await mk(browser); await page.goto(BASE);
  const e0 = await page.evaluate(() => ({ tag: document.querySelector('.k-hero .k-tag').textContent, slot: !document.getElementById('slot').hidden, result: document.getElementById('result').hidden, help: !!document.getElementById('helpBtn'), theme: !!document.getElementById('themeToggle'), foot: !!document.querySelector('footer.k-foot .kofi') }));
  ok('M1 the empty page: Tool 06 tag, the empty-slot box, nothing else yet, plus Help, Night mode and the footer', /Tool 06/.test(e0.tag) && e0.slot && e0.result && e0.help && e0.theme && e0.foot, JSON.stringify(e0));
  await page.click('#go'); const r1 = await txt(page, '#find-err');
  await page.fill('#ha', 'alice.example'); await page.click('#go'); const r2 = await txt(page, '#find-err');
  await go(page, 'alice.example', 'not a handle!'); const r3 = await txt(page, '#find-err');
  await go(page, '@Alice.Example', 'https://bsky.app/profile/alice.example'); const r4 = await txt(page, '#find-err');
  ok('M2 an empty box, a bad handle and the same account twice each get a plain message, and nothing is sent to Bluesky', /Type two Bluesky handles/.test(r1) && /Type two Bluesky handles/.test(r2) && /doesn't look like a Bluesky handle/.test(r3) && /same account/.test(r4) && !log.calls.length, [r1, r2, r3, r4].join(' | '));
  const pa = await page.evaluate(() => { const f = window.__mm.parseActor; return [f('@Busy.Example'), f('https://bsky.app/profile/busy.example/post/3abc'), f('did:plc:abc123'), f('nodots'), f('')]; });
  ok('M3 parseActor takes handles, @handles, profile links and DIDs, and refuses the rest', JSON.stringify(pa) === JSON.stringify(['busy.example', 'busy.example', 'did:plc:abc123', null, null]), JSON.stringify(pa));

  // ---- a normal pair ----
  await go(page, 'alice.example', 'bob.example'); await done(page);
  const order = log.calls.join(' ');
  ok('M4 it looks up both profiles, asks whether they follow each other, then reads replies and follows for each', /^actor\.getProfile:alice\.example actor\.getProfile:bob\.example graph\.getRelationships:did:plc:alice1 feed\.getAuthorFeed:did:plc:alice1 feed\.getAuthorFeed:did:plc:bob1 graph\.getFollows:did:plc:alice1 graph\.getFollows:did:plc:bob1 actor\.getProfiles:null$/.test(order), order);
  const hd = await txt(page, '#headline'), st = await page.evaluate(() => [...document.querySelectorAll('#stats .stat')].map(s => s.textContent));
  ok('M5 the headline and the three numbers: 10 both follow, 2 both replied to, and no community hub yet', hd === '@alice.example and @bob.example both follow 10 accounts.' && st[0].startsWith('10') && st[1].startsWith('2') && st[2].startsWith('—'), hd + ' ' + JSON.stringify(st));
  ok('M6 it says how the two relate: alice follows bob, bob does not follow back', (await txt(page, '#rel')) === "@alice.example follows @bob.example, but @bob.example doesn't follow back.", await txt(page, '#rel'));

  // ---- the lists ----
  let li = await items(page);
  const handles = li.map(x => x.t);
  ok('M7 "Both follow" lists the ten shared accounts in handle order, and the two with a label show the handle only: no name, no photo', li.length === 10 && li[0].b === 'p010.example' && !li[0].img && li[1].b === 'p011.example' && !li[1].img && li[2].b === 'Person 12' && li[2].img && li.every((x, i) => !i || x.t >= '' ), JSON.stringify(li.slice(0, 3)));
  await page.fill('#q', 'person 14'); await page.waitForTimeout(250); li = await items(page);
  const ph = await page.fill('#q', 'p013'); await page.waitForTimeout(250); const li2 = await items(page);
  await page.fill('#q', 'zzz'); await page.waitForTimeout(250);
  ok('M8 search matches names and handles, and says so when nothing matches', li.length === 1 && li[0].b === 'Person 14' && li2.length === 1 && /No one in this list matches/.test(await txt(page, '#empty')), JSON.stringify([li, li2]));
  await page.fill('#q', '');  await page.waitForTimeout(250);
  await tab(page, 'reply'); const rp = await items(page);
  ok('M9 "Replied to" has p012 first (3 + 2 replies) then p013 (2 + 1)', rp.length === 2 && /Person 12@.*\(3 \+ 2 replies\)/.test(rp[0].t) && /Person 13@.*\(2 \+ 1 replies\)/.test(rp[1].t), JSON.stringify(rp));
  await tab(page, 'comm'); const c0 = await page.evaluate(() => ({ btn: !!document.getElementById('commGo'), q: document.getElementById('q').hidden, person: window.__personCalls }));
  const personBefore = log.person || 0;
  ok('M9b the Community tab starts with an explanation and a "Find the community" button, reads nothing yet, and hides the search box', c0.btn && c0.q && personBefore === 0);
  await page.click('#commGo'); await done(page);
  let cm = await items(page);
  ok('M9c "Find the community" checks the first 6 of the 10 shared accounts (the test limit), ranks them by how many of the shared accounts each follows (p012: 9 of 9, p013: 5), and offers 6 more', (log.person || 0) === 6 && /Person 12@.*follows 9 of 9/.test(cm[0].t) && /Person 13@.*follows 5 of 9/.test(cm[1].t) && /Checked 6 of the 10 shared accounts/.test(await txt(page, '#captext')) && (await txt(page, '#more')) === 'Check 6 more', JSON.stringify(cm.map(x => x.t)));
  await page.click('#more'); await done(page); cm = await items(page);
  const ctext = cm.map(x => x.b + '|' + x.t.replace(/^.*?\)?(follows.*|follow list.*)$/, '$1'));
  ok('M9d "Check 6 more" finishes the other 4: the two labeled accounts show by handle only, a private follow list says so, a list cut at the limit says "at least", and everything is ranked by handle within a tie', cm.length === 10 && cm[2].b === 'p010.example' && !cm[2].img && cm[3].b === 'p011.example' && /private or unreadable/.test(cm.find(x => x.b === 'Person 15').t) && /follows 0 of 9, at least/.test(cm.find(x => x.b === 'Person 18').t) && (log.person || 0) === 10, JSON.stringify(ctext));
  const hubStat = await page.evaluate(() => [...document.querySelectorAll('#stats .stat')].map(s => s.textContent)[2]), hubAlt = await page.evaluate(() => window.__mm.alt());
  ok('M9e the top hub (Person 12) appears in the third number and in the alt text', /^Person 12/.test(hubStat) && /Top community hub: Person 12\./.test(hubAlt), hubStat + ' | ' + hubAlt.slice(-90));
  await page.evaluate(() => { window.__mm.state().run.comm.scores[0].person.name = 'A Very Long Display Name That Would Not Fit Anywhere At All'; });
  await tab(page, 'reply');
  const longHub = await page.evaluate(() => { const box = [...document.querySelectorAll('#stats .stat')][2], t = box.querySelector('b'); const r = box.getBoundingClientRect(), tr = t.getBoundingClientRect(); return { cls: t.className, inside: tr.left >= r.left - 1 && tr.right <= r.right + 1 && t.scrollWidth <= t.clientWidth + 1 }; });
  ok('M9f a long hub name gets a smaller type size on the page and stays inside its box', longHub.cls === 'long' && longHub.inside, JSON.stringify(longHub));
  await page.evaluate(() => { window.__mm.state().run.comm.scores[0].person.name = 'Person 12'; }); await tab(page, 'follow');
  await tab(page, 'diff'); const df = await items(page);
  const dtxt = df.map(x => x.grp ? '#' + x.t : x.b);
  ok('M10 "They differ": for each account the top 5 accounts it likes and reposts most that the other does not follow (alice: p040 and p041 tie on 4, then p044 with 3 reposts, then p042 and p043; never someone bob follows, bob himself, or her own posts; bob: p060, p062, p061, never alice or anyone alice follows), with the like and repost counts, and the search box is hidden', JSON.stringify(dtxt) === JSON.stringify(["#@alice.example likes and reposts, @bob.example doesn't follow", 'Person 40', 'Person 41', 'Person 44', 'Person 42', 'Person 43', "#@bob.example likes and reposts, @alice.example doesn't follow", 'Person 60', 'Person 62', 'Person 61']) && (await page.isHidden('#q')) && /4 likes · 0 reposts/.test(df[1].t) && /2 likes · 2 reposts/.test(df[2].t) && /0 likes · 3 reposts/.test(df[3].t), JSON.stringify(dtxt) + ' ' + df.slice(1, 4).map(x => x.t).join(' | '));
  ok('M10b the likes come from each account\'s own server (found through plc.directory), and only the few accounts that will be shown are looked up for their profiles (none that were only reposted)', (log.plc || 0) === 2 && (log.likeCalls || 0) === 2 && (log.profilesAsked || []).length > 0 && !(log.profilesAsked || []).some(d => /person0(44|45|62)$/.test(d)), JSON.stringify([log.plc, log.likeCalls, log.profilesAsked]));
  await tab(page, 'follow');

  // ---- the card ----
  const cv = await page.evaluate(() => { const c = document.getElementById('card'); return [c.width, c.height]; });
  const alt = await page.evaluate(() => window.__mm.alt());
  ok('M11 the card is 1440 x 900 and its alt text gives the numbers and names three shared accounts, leaving out the two with labels', cv.join() === '1440,900' && /^Mutual match card for Alice A and Bob B\. 10 accounts both follow, 2 both replied to\. Top community hub: Person 12\. Shared accounts include Person 12, Person 13, Person 14\./.test(alt), alt);
  const withPhoto = await pix(page, 84, 122);
  await page.uncheck('#o-photo'); await page.waitForTimeout(150); const noPhoto = await pix(page, 84, 122);
  ok('M12 the photo switch: with it the first account\'s picture (a red dot) is drawn in its circle, without it the circle shows the plain color', withPhoto[0] > 200 && withPhoto[1] < 90 && !(noPhoto[0] > 200 && noPhoto[1] < 60), JSON.stringify([withPhoto, noPhoto]));
  await page.check('#o-photo');
  await page.uncheck('#o-name'); await page.waitForTimeout(100); const a2 = await page.evaluate(() => window.__mm.alt());
  await page.uncheck('#o-handle'); await page.waitForTimeout(100); const a3 = await page.evaluate(() => window.__mm.alt());
  ok('M13 turning names off uses handles, and turning handles off too gives "Account A" and "Account B" and no shared names', /card for @alice\.example and @bob\.example\./.test(a2) && !a2.includes('Alice A') && /card for Account A and Account B\./.test(a3) && !/Shared accounts include/.test(a3), a2.slice(0, 80) + ' | ' + a3.slice(0, 80));
  await page.check('#o-name'); await page.check('#o-handle');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#save')]);
  const buf = require('fs').readFileSync(await dl.path());
  ok('M14 Share or save image downloads mutual-match.png, a real 1440 x 900 PNG', dl.suggestedFilename() === 'mutual-match.png' && buf.slice(1, 4).toString() === 'PNG' && buf.readUInt32BE(16) === 1440 && buf.readUInt32BE(20) === 900, dl.suggestedFilename());
  await page.click('#copyalt'); await page.waitForTimeout(100);
  ok('M15 Copy alt text puts the alt text on the clipboard', (await page.evaluate(() => navigator.clipboard.readText())) === (await page.evaluate(() => window.__mm.alt())) && (await txt(page, '#status')) === 'Alt text copied.');
  ok('M16 only Bluesky\'s servers are contacted and nothing but the theme is stored', log.third.every(h => ['public.api.bsky.app', 'cdn.bsky.app', 'plc.directory', 'pds.example'].includes(h)) && (await page.evaluate(() => Object.keys(localStorage).every(k => k === 'theme'))), JSON.stringify([...new Set(log.third)]));
  await page.click('#another');
  ok('M17 "Compare another pair" clears the boxes and the results', (await page.isHidden('#result')) && (await page.inputValue('#ha')) === '' && (await page.inputValue('#hb')) === '');

  // ---- a labeled account as one of the pair ----
  await go(page, 'spicy.example', 'bob.example'); await done(page);
  const spA = await page.evaluate(() => window.__mm.alt()), sp = await page.evaluate(() => ({ note: !document.getElementById('labelnote').hidden, t: document.getElementById('labelnote').textContent }));
  ok('M18 a labeled account is on the card by handle only (no name, no photo) and the note says why', sp.note && /@spicy\.example has a label \(porn\)/.test(sp.t) && !spA.includes('Secret Name') && /@spicy\.example and Bob B/.test(spA), sp.t + ' | ' + spA.slice(0, 70));
  await tab(page, 'comm');
  ok('M18b with fewer than 3 shared accounts the Community tab says it needs at least 3, with no button', /Needs at least 3 shared accounts.*These two have 2/.test(await txt(page, '#people')) && !(await page.$('#commGo')));
  await page.click('#another');

  // ---- the likes can't be read ----
  const np = await mk(browser, { mode: { noPlc: true } }); await np.page.goto(BASE); await go(np.page, 'alice.example', 'bob.example'); await done(np.page);
  await np.page.click('#t-diff'); const npl = await items(np.page), npn = await txt(np.page, '#lists-sub');
  ok('M18c if an account\'s likes can\'t be read, They differ still works from reposts and says the likes could not be read', /likes of @alice\.example and @bob\.example could not be read, so this uses reposts only/.test(npn) && npl.filter(x => !x.grp).map(x => x.b).join() === 'Person 44,Person 41,Person 45,Person 62', npn + ' ' + JSON.stringify(npl.map(x => x.b)));
  await np.ctx.close();

  // ---- big accounts: the read limit and "Load more" ----
  await go(page, 'big.example', 'bob.example'); await done(page);
  const bigSt = await page.evaluate(() => [...document.querySelectorAll('#stats .stat')].map(s => s.textContent)), cap = await txt(page, '#captext'), mb = await txt(page, '#more');
  ok('M19 when a list is cut off at the limit the numbers say "at least" (a plus sign) and a Load more button appears', bigSt[0].includes('+') && /Read the first 100 follows of each account/.test(cap) && /at least/.test(cap) && mb === 'Load more', JSON.stringify([bigSt, cap, mb]));
  ok('M20 the differ tab says a follow list was cut off, so they may follow some of them', (await (async () => { await tab(page, 'diff'); return /cut off at the read limit/.test(await txt(page, '#lists-sub')); })()));
  await tab(page, 'follow');
  const nBefore = await page.evaluate(() => window.__mm.state().run.fa.n);
  await page.click('#more'); await done(page);
  const nAfter = await page.evaluate(() => window.__mm.state().run.fa.n);
  ok('M21 "Load more" reads on (100 to 200) and at the ceiling the button goes away with an honest line', nBefore === 100 && nAfter === 200 && (await page.isHidden('#more')) && /limit for one run/.test(await txt(page, '#captext')), nBefore + ' -> ' + nAfter + ' ' + await txt(page, '#captext'));
  await page.click('#another');

  // ---- an account whose follows can't be read ----
  await go(page, 'quiet.example', 'bob.example'); await done(page);
  ok('M22 if an account\'s follow list can\'t be read, the other lists still work and the page says that list couldn\'t be read', /could not be read/.test(await txt(page, '#lists-sub')) && /could not be read/.test(await txt(page, '#empty')), await txt(page, '#lists-sub'));
  await page.click('#another');
  await go(page, 'alice.example', 'nobody.example'); await done(page);
  ok('M23 an unknown second account names it: "Couldn\'t find nobody.example"', /Couldn't find nobody\.example/.test(await txt(page, '#find-err')), await txt(page, '#find-err'));

  // ---- deep link ----
  const dl2 = await mk(browser); await dl2.page.goto(BASE + '#a=alice.example&b=bob.example'); await done(dl2.page);
  ok('M24 a #a=…&b=… link fills both boxes and reads the pair', (await dl2.page.inputValue('#ha')) === 'alice.example' && (await dl2.page.inputValue('#hb')) === 'bob.example' && /both follow 10 accounts/.test(await txt(dl2.page, '#headline')));
  await dl2.ctx.close();

  // ---- the failures ----
  const dn = await mk(browser, { mode: { profile: 'down' } }); await dn.page.goto(BASE); await go(dn.page, 'alice.example', 'bob.example'); await done(dn.page);
  ok('M25 if Bluesky is unreachable the message says so and the button works again', /Bluesky didn't answer/.test(await txt(dn.page, '#find-err')) && !(await dn.page.isDisabled('#go')));
  await dn.ctx.close();
  const rl = await mk(browser, { mode: { rateFirst: true } }); await rl.page.goto(BASE); await go(rl.page, 'alice.example', 'bob.example');
  await rl.page.waitForFunction(() => /rate-limiting/.test(document.getElementById('pnotice').textContent), null, { timeout: 4000 }); await done(rl.page);
  ok('M26 a rate-limit answer shows a waiting notice, then carries on and finishes', /both follow 10 accounts/.test(await txt(rl.page, '#headline')) && (await rl.page.isHidden('#pnotice')));
  await rl.ctx.close();
  const mf = await mk(browser, { mode: { failFrom: 4 } }); await mf.page.goto(BASE); await go(mf.page, 'alice.example', 'bob.example'); await done(mf.page);
  ok('M27 if Bluesky fails halfway it keeps what it read, says so, and offers "Try again"', /Bluesky didn't answer/.test(await txt(mf.page, '#captext')) && (await txt(mf.page, '#more')) === 'Try again' && !(await mf.page.isHidden('#result')));
  await mf.ctx.close();
  const sl = await mk(browser, { delay: 400 }); await sl.page.goto(BASE); await go(sl.page, 'alice.example', 'bob.example');
  await sl.page.waitForFunction(() => /Reading @alice/.test(document.getElementById('ptext').textContent)); await sl.page.click('#stopBtn'); await done(sl.page);
  const stopped = await txt(sl.page, '#captext');
  await sl.page.click('#more'); await done(sl.page);
  ok('M28 Stop halts the read, "Keep reading" picks it up, and it ends with the full answer', /^Stopped\./.test(stopped) && /both follow 10 accounts/.test(await txt(sl.page, '#headline')), stopped);
  await sl.ctx.close();

  // ---- screenshots, phone, night mode ----
  await go(page, 'alice.example', 'bob.example'); await done(page);
  await page.screenshot({ path: 'mutualmatch-desktop-light.png', fullPage: true });
  const ph2 = await mk(browser, { vp: { width: 390, height: 800 }, scheme: 'dark' }); await ph2.page.goto(BASE); await go(ph2.page, 'alice.example', 'bob.example'); await done(ph2.page);
  const sz = await ph2.page.evaluate(() => { const els = [...document.querySelectorAll('.find .k-btn, .find input, .actions .k-btn, .seg button, .controls input, .opt')].filter(e => e.getBoundingClientRect().width > 0 && !e.closest('[hidden]') && !e.hidden); const small = els.filter(e => e.getBoundingClientRect().height < 43.5).map(e => (e.id || e.className) + ':' + Math.round(e.getBoundingClientRect().height)); return { over: document.documentElement.scrollWidth > innerWidth + 1, small, n: els.length }; });
  ok('M29 phone width (night mode): nothing scrolls sideways, and every button, box and switch is at least 44 pixels tall', !sz.over && !sz.small.length && sz.n >= 10, JSON.stringify(sz));
  await ph2.page.screenshot({ path: 'mutualmatch-phone-dark.png', fullPage: true });
  await ph2.ctx.close();
  await page.click('#themeToggle'); await page.waitForTimeout(100);
  ok('M30 Night mode switches the theme and remembers it on the shared "theme" key', (await page.getAttribute('html', 'data-theme')) === 'dark' && (await page.evaluate(() => localStorage.getItem('theme'))) === 'dark');
  await page.screenshot({ path: 'mutualmatch-desktop-dark.png', fullPage: true });

  console.log(out.join('\n')); console.log('JS errors:', errors.length ? errors.join('|') : 'none');
  await browser.close();
})().catch(e => { console.log(out.join('\n')); console.log('TEST CRASH', e); process.exit(1); });
