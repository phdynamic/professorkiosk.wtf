// The Format Deck page: formats come from /formats.txt; pick one, fill the blanks, copy or open in Bluesky.
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const out = [], errors = [];
const ok = (n, c, x = '') => out.push((c ? 'PASS' : 'FAIL') + ': ' + n + (x ? ' — ' + x : ''));
const BASE = 'http://localhost:3988/formats';
const ROOT = path.join(__dirname, '..', '..');
const TXT = fs.readFileSync(path.join(ROOT, 'public', 'formats.txt'), 'utf8');

(async () => {
  // ---- the text file, read without the page ----
  const body = TXT.split('\n').filter(l => !l.startsWith(';;')).join('\n');
  const blocks = body.split(/^## /m).slice(1);
  const cats = [];
  let missing = [], bad = [];
  for (const b of blocks) {
    const lines = b.split('\n'), name = lines[0].trim(), f = { template: [], how: '', tip: '', category: '' };
    for (const l of lines.slice(1)) { const m = /^(category|how|template|tip):\s?(.*)$/.exec(l); if (!m) { if (l.trim()) bad.push(name + ': ' + l.slice(0, 40)); continue; } if (m[1] === 'template') f.template.push(m[2]); else f[m[1]] = m[2]; }
    if (!f.category || !f.how || !f.template.length) missing.push(name);   // a tip is optional
    if (f.category && !cats.includes(f.category)) cats.push(f.category);
  }
  ok('F1a the file holds 30 formats in 7 categories, each with a category, how and template (a tip is optional)', blocks.length === 30 && cats.length === 7 && !missing.length, JSON.stringify([blocks.length, cats.length, missing]));
  ok('F1b every line under a format starts with a known label (category, how, template or tip), so no example:, post:, search:, match: or likes: lines are left over', !bad.length, bad.slice(0, 3).join(' / '));
  ok('F1c the text has no em or en dashes and no tabs', !/[—–\t]/.test(TXT));
  ok('F1d the "Rules for what goes in" note is still at the top', /Rules for what goes in/.test(TXT.split('\n').slice(0, 25).join('\n')));

  const browser = await chromium.launch({ executablePath: require('./env').CHROME });
  const requests = [];
  async function mk(vp = { width: 1100, height: 900 }, scheme = 'light', extra = {}) {
    const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme, permissions: ['clipboard-read', 'clipboard-write'], ...extra });
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:3988' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => requests.push(r.method() + ' ' + r.url()));
    await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    await page.route('https://public.api.bsky.app/**', r => r.fulfill({ status: 404, headers: { 'access-control-allow-origin': '*' }, body: '{}' }));
    return page;
  }
  const ready = p => p.waitForSelector('#bench:not([hidden]) #fname');
  const txt = (p, s) => p.locator(s).innerText();

  // ---- the page, loaded fresh ----
  const page = await mk(); await page.goto(BASE); await ready(page);
  const info = await page.evaluate(() => ({ tag: document.querySelector('.k-hero .k-tag').textContent, tiles: document.querySelectorAll('#tiles .tile').length, chips: document.querySelectorAll('#cats button').length, found: document.getElementById('found').textContent, fmts: window.__formats.formats().length, hash: location.hash, footer: !!document.querySelector('footer.k-foot .kofi'), night: !!document.getElementById('themeToggle'), help: !!document.getElementById('helpBtn') }));
  ok('F2 the page opens with a card on the table, 30 tiles, 8 filter chips, the hero tag, footer, Help and Night mode', /Tool 08/.test(info.tag) && info.tiles === 30 && info.chips === 8 && info.found === '30 formats' && info.fmts === 30 && /^#f=/.test(info.hash) && info.footer && info.night && info.help, JSON.stringify(info));
  const allOk = await page.evaluate(() => { const bad = []; window.__formats.formats().forEach(f => { const fill = f.labels.map(() => 'x'.repeat(40)); const b = window.__formats.build(f, fill); const n = window.__formats.glen(b.text); if (b.empty.length) bad.push(f.name + ' has an empty blank'); if (n > 300) bad.push(f.name + ' is ' + n); if (/\{[^}]*\}/.test(b.text)) bad.push(f.name + ' still shows a brace'); }); const slugs = window.__formats.formats().map(f => f.slug); return { bad, unique: new Set(slugs).size === slugs.length }; });
  ok('F3 every format fits in 300 characters with 40 characters in each blank, fills every blank, and has its own address', !allOk.bad.length && allOk.unique, JSON.stringify(allOk));

  // ---- deep link and what is shown ----
  await page.goto('about:blank'); await page.goto(BASE + '#f=nobody-me'); await ready(page);
  const nm = await page.evaluate(() => ({ name: document.getElementById('fname').textContent, cat: document.getElementById('cat').textContent, pos: document.getElementById('pos').textContent, how: document.getElementById('how').textContent, labels: [...document.querySelectorAll('#fields label')].map(l => l.textContent), tip: document.getElementById('tip').textContent, current: document.querySelector('.tile[aria-current="true"]') && document.querySelector('.tile[aria-current="true"]').textContent }));
  ok('F4 #f=nobody-me puts that card on the table: name, category, how, one labeled blank, no tip box text (its tip was removed), and its tile marked', nm.name === 'Nobody / Me' && nm.cat === 'Contrast' && /^Card 1 of 30$/.test(nm.pos) && /quiet, ordinary world/.test(nm.how) && nm.labels.length === 1 && nm.labels[0] === 'An oddly specific thing you do' && nm.tip === '' && /On the table/.test(nm.current || ''), JSON.stringify(nm));

  // ---- typing, counting, warnings ----
  const g0 = await page.evaluate(() => ({ gaps: [...document.querySelectorAll('#post .gap')].map(g => g.textContent), warn: document.getElementById('warn').textContent, post: document.getElementById('post').textContent }));
  ok('F5 with the blank empty, the post shows it highlighted as {its label} and says one blank is still empty', g0.gaps.length === 1 && g0.gaps[0] === '{an oddly specific thing you do}' && g0.warn === '1 blank is still empty.', JSON.stringify(g0));
  await page.fill('#blank0', 'x');
  const t1 = await page.evaluate(() => ({ post: document.getElementById('post').innerText, count: document.getElementById('count').textContent, gaps: document.querySelectorAll('#post .gap').length, warn: document.getElementById('warn').textContent }));
  ok('F6 typing fills the post and the counter (13 of 300), and the empty-blank warning goes away', t1.post === 'Nobody:\nMe: x' && /^13 \/ 300 characters$/.test(t1.count) && t1.gaps === 0 && t1.warn === '', JSON.stringify(t1));
  await page.fill('#blank0', '👨‍👩‍👧‍👦🇨🇦é');
  const emo = await page.evaluate(() => ({ c: document.getElementById('count').textContent, g: window.__formats.glen('👨‍👩‍👧‍👦🇨🇦é') }));
  ok('F7 the counter counts graphemes the way Bluesky does (a family emoji and a flag are one each)', emo.g === 3 && /^15 \/ 300/.test(emo.c), JSON.stringify(emo));
  await page.fill('#blank0', 'a'.repeat(300));
  const over = await page.evaluate(() => ({ c: document.getElementById('count').textContent, cls: document.getElementById('count').className, warn: document.getElementById('warn').textContent, href: document.getElementById('open').getAttribute('href').length }));
  ok('F8 over 300 the counter turns to the over style in words ("Over the limit by 12") and the Open button still works', /^312 \/ 300/.test(over.c) && /over/.test(over.cls) && /Over the limit by 12\./.test(over.warn) && over.href > 300, JSON.stringify(over));

  // ---- clear, stale-value regression ----
  await page.click('#clear');
  const cl = await page.evaluate(() => ({ v: document.getElementById('blank0').value, focus: document.activeElement.id, st: document.getElementById('status').textContent }));
  ok('F9 Clear blanks empties them, puts the cursor in the first one and says so', cl.v === '' && cl.focus === 'blank0' && /cleared/.test(cl.st), JSON.stringify(cl));
  await page.fill('#blank0', 'standing in a doorway');
  ok('F11 typing after Clear blanks still updates the post (no stale copy of the values)', (await txt(page, '#post')) === 'Nobody:\nMe: standing in a doorway');

  // ---- copy and open ----
  await page.click('#copy');
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  ok('F12 Copy post puts exactly the post on the clipboard and says Copied', clip === 'Nobody:\nMe: standing in a doorway' && /^Copied\.$/.test(await txt(page, '#status')), JSON.stringify(clip));
  const op = await page.evaluate(() => { const a = document.getElementById('open'); return { href: a.getAttribute('href'), target: a.target, rel: a.rel }; });
  ok('F13 Open in Bluesky is a link to the bsky.app composer with the post, opening in a new tab with noopener', op.href === 'https://bsky.app/intent/compose?text=' + encodeURIComponent('Nobody:\nMe: standing in a doorway') && op.target === '_blank' && /noopener/.test(op.rel), JSON.stringify(op));
  await page.fill('#blank0', '');
  await page.click('#copy');
  const clip2 = await page.evaluate(() => navigator.clipboard.readText());
  ok('F14 copying with an empty blank copies it as {its label} and the status says so', clip2 === 'Nobody:\nMe: {an oddly specific thing you do}' && /1 blank was still empty/.test(await txt(page, '#status')), JSON.stringify([clip2, await txt(page, '#status')]));

  // ---- a blank used twice ----
  await page.goto('about:blank'); await page.goto(BASE + '#f=running-bit'); await ready(page);
  const rb = await page.evaluate(() => ({ fields: document.querySelectorAll('#fields input').length, hint: [...document.querySelectorAll('#fields small')].map(s => s.textContent) }));
  ok('F15 Running Bit: the repeated phrase is one blank with a "used 2 times" note (three inputs for four slots)', rb.fields === 3 && rb.hint.length === 1 && /Used 2 times/.test(rb.hint[0]), JSON.stringify(rb));
  await page.fill('#blank0', 'A'); await page.fill('#blank1', 'Hush'); await page.fill('#blank2', 'B');
  ok('F16 typing it once fills it in both places', (await txt(page, '#post')) === 'Day 1: A. I said "Hush."\nDay 9: B. I said "Hush."');

  // ---- dealing ----
  await page.goto('about:blank'); await page.goto(BASE); await ready(page);
  const names = []; let dup = false;
  for (let i = 0; i < 30; i++) { const before = await txt(page, '#fname'); await page.click('#deal'); const after = await txt(page, '#fname'); names.push(after); if (before === after) dup = true; }
  ok('F17 Deal another card always gives a different card and, over 30 deals, many different ones', !dup && new Set(names).size >= 10, String(new Set(names).size));
  await page.evaluate(() => window.__formats.seed(() => 0));
  await page.click('#deal'); const s0 = await txt(page, '#fname'); await page.click('#deal'); const s1 = await txt(page, '#fname');
  ok('F18 dealing says which card it dealt (status line) and never repeats the card on the table', /^Dealt: /.test(await txt(page, '#status')) && s0 !== s1);
  await page.evaluate(() => { window.__formats.seed(null); document.activeElement.blur(); });
  const b4 = await txt(page, '#fname'); await page.keyboard.press('Space');
  ok('F19 the Space bar deals a card when nothing is focused', (await txt(page, '#fname')) !== b4);
  const b5 = await txt(page, '#fname'); await page.focus('#blank0'); await page.keyboard.type('a b');
  ok('F20 Space inside a blank types a space and does not deal', (await txt(page, '#fname')) === b5 && (await page.inputValue('#blank0')) === 'a b');

  // ---- browse: filter, search, pick ----
  await page.goto('about:blank'); await page.goto(BASE); await ready(page);
  await page.click('#cats button:has-text("Wordplay")');
  const wp = await page.evaluate(() => ({ expect: window.__formats.formats().filter(f => f.cat === 'Wordplay').length, n: document.querySelectorAll('#tiles .tile').length, cats: [...new Set([...document.querySelectorAll('#tiles .tile .cat')].map(c => c.textContent))], found: document.getElementById('found').textContent, pressed: document.querySelector('#cats button[aria-pressed="true"]').textContent }));
  ok('F21 a category chip narrows the list to that category (every format in it), says so, and shows which chip is on', wp.n === wp.expect && wp.n >= 2 && wp.cats.length === 1 && wp.cats[0] === 'Wordplay' && wp.found === wp.n + ' formats match' && wp.pressed === 'Wordplay', JSON.stringify(wp));
  await page.click('#cats button:has-text("All")'); await page.fill('#q', 'headline');
  const sr = await page.evaluate(() => ({ n: document.querySelectorAll('#tiles .tile').length, nm: document.querySelector('#tiles .nm').textContent, found: document.getElementById('found').textContent }));
  ok('F22 search finds a format by a word in its name or how-line', sr.n === 1 && sr.nm === 'Fake Headline' && sr.found === '1 format matches', JSON.stringify(sr));
  await page.fill('#q', 'zzzzqq');
  ok('F23 a search with no match says so', (await page.locator('#tiles .tile').count()) === 0 && /No formats match/.test(await txt(page, '#found')));
  await page.fill('#q', 'portmanteau');
  await page.click('#tiles .tile:has-text("Portmanteau")');
  const pk = await page.evaluate(() => ({ name: document.getElementById('fname').textContent, hash: location.hash, focus: document.activeElement.id, cur: document.querySelectorAll('.tile[aria-current="true"]').length, now: document.querySelectorAll('.tile .now').length }));
  ok('F24 tapping a tile puts that card on the table, updates the address, moves focus to the card title and marks the tile', pk.name === 'Portmanteau' && pk.hash === '#f=portmanteau' && pk.focus === 'fname' && pk.cur === 1 && pk.now === 1, JSON.stringify(pk));

  // ---- remembered between visits ----
  await page.goto('about:blank'); await page.goto(BASE + '#f=hill-to-die-on'); await ready(page);
  await page.fill('#blank0', 'Kindness'); await page.fill('#blank2', 'Sharing the armrest');
  await page.waitForTimeout(400);
  await page.goto('about:blank'); await page.goto(BASE); await ready(page);
  const mem = await page.evaluate(() => ({ name: document.getElementById('fname').textContent, v: [...document.querySelectorAll('#fields input')].map(i => i.value) }));
  ok('F25 a reload with no address brings back the same card and the words typed in its blanks', mem.name === 'Hill to Die On' && mem.v[0] === 'Kindness' && mem.v[1] === '' && mem.v[2] === 'Sharing the armrest', JSON.stringify(mem));
  await page.goto('about:blank'); await page.goto(BASE + '#f=overheard'); await ready(page);
  ok('F26 an address with #f= wins over the remembered card', (await txt(page, '#fname')) === 'Overheard');
  await page.click('#clear'); await page.waitForTimeout(400);
  const store = await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('pk-formats-v1') || '{}'); return { keys: Object.keys(d.vals || {}), sel: d.sel }; });
  const stored = await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('pk-formats-v1') || '{}'); return Object.keys(d.vals || {}).every(k => d.vals[k].some(x => x && x.trim())); });
  ok('F27 only cards that have words typed in are stored, plus which card is open; cards that were cleared or never touched are not', store.sel === 'overheard' && store.keys.includes('hill-to-die-on') && !store.keys.includes('overheard') && !store.keys.includes('nobody-me') && stored, JSON.stringify(store));
  // saved data that was damaged or tampered with (set before the page's own scripts run, so leaving the page can not overwrite it)
  const withStore = async (value, url) => { const p = await mk(); await p.addInitScript(v => { try { localStorage.setItem('pk-formats-v1', v); } catch (e) {} }, value); await p.goto(url); await ready(p); return p; };
  const pb = await withStore('{broken', BASE);
  ok('F28 damaged saved data is ignored and the page still opens a card', (await pb.locator('#fname').innerText()).length > 0 && (await pb.locator('#tiles .tile').count()) === 30);
  await pb.close();
  const ph2 = await withStore(JSON.stringify({ sel: '__proto__', vals: { '__proto__': ['x'], 'nobody-me': ['y'.repeat(5000), 7, null, { a: 1 }], 'nope': ['z'] } }), BASE + '#f=nobody-me');
  const hostile = await ph2.evaluate(() => ({ v: document.getElementById('blank0').value.length, polluted: ({}).x === undefined && typeof ({}).constructor === 'function', st: Object.keys(window.__formats.state().vals) }));
  ok('F29 hostile saved data (prototype key, huge or non-text values, unknown cards) is trimmed or dropped', hostile.v === 300 && hostile.polluted && hostile.st.join() === 'nobody-me', JSON.stringify(hostile));
  await ph2.close();

  // ---- nothing leaves the page ----
  const p5 = await mk(); await p5.goto(BASE); await ready(p5); await p5.waitForTimeout(300);
  const mark = requests.length;
  await p5.fill('#blank0', 'something'); await p5.click('#copy'); await p5.click('#deal'); await p5.waitForTimeout(300);
  const after = requests.slice(mark).filter(r => !/\/favicon\.svg$/.test(r));   // the browser asks for its own tab icon whenever it likes
  ok('F30 typing, copying and dealing make no network requests at all', after.length === 0, after.join(' | '));
  ok('F30b the page only ever asked for files on this site and the footer avatar lookup: no post lookups of any kind', requests.every(r => /^GET http:\/\/localhost:3988\//.test(r) || /^GET https:\/\/public\.api\.bsky\.app\/xrpc\/app\.bsky\.actor\.getProfile/.test(r)), requests.filter(r => !/localhost:3988/.test(r) && !/getProfile/.test(r)).join(' | '));
  ok('F30c there is no worked example, Use this example button, or Seen in the wild box on the page', await p5.evaluate(() => !document.getElementById('exText') && !document.getElementById('useEx') && !document.getElementById('wild') && !/worked example|seen in the wild/i.test(document.body.textContent)));
  await p5.close();

  // ---- the text file is data: markup never runs, bad links dropped ----
  const evil = ';; note\n## Evil <img src=x onerror="window.__pwn=1"> name\ncategory: <b>Bold</b> cat\nhow: Click [here](javascript:window.__pwn=2) or [fine](https://example.com/x) or [site](/tracer) or [proto](//evil.example/x) or <script>window.__pwn=3</script>\ntemplate: Hello {a <img src=x onerror="window.__pwn=4"> blank}\ntip: [bad](data:text/html,hi) tip\n';
  const p2 = await mk(); await p2.route('**/formats.txt', r => r.fulfill({ contentType: 'text/plain; charset=utf-8', body: evil }));
  await p2.goto(BASE); await ready(p2); await p2.waitForTimeout(200);
  const ev = await p2.evaluate(() => { const links = [...document.querySelectorAll('#how a, #tip a')].map(a => ({ h: a.getAttribute('href'), t: a.target, r: a.rel })); return { pwn: window.__pwn, cat: document.getElementById('cat').textContent, name: document.getElementById('fname').textContent, nodes: document.querySelectorAll('#bench img, #bench svg, #bench script, #tiles img, #tiles b, #bench pre b').length, links, js: !!document.querySelector('a[href^="javascript"], a[href^="data"], a[href^="//"]') }; });
  ok('F31 markup in the text file shows as text and never runs; javascript:, data: and //host links are dropped; https links open in a new tab; site links stay', ev.pwn === undefined && ev.cat === '<b>Bold</b> cat' && /<img/.test(ev.name) && ev.nodes === 0 && !ev.js && ev.links.length === 2 && ev.links.some(l => l.h === 'https://example.com/x' && l.t === '_blank' && /noopener/.test(l.r)) && ev.links.some(l => l.h === '/tracer' && !l.t), JSON.stringify(ev));
  await p2.close();

  // ---- the parser's rules ----
  const p6 = await mk(); await p6.goto(BASE); await ready(p6);
  const ps = await p6.evaluate(() => { const t = ';; note\nA line before the first format\n## One\ncategory: A\ntemplate: X {a} {b}\nexample: ignored\npost: https://bsky.app/profile/a/post/b\n## One\ntemplate: Y\n## Skipped\ncategory: B\nhow: no template\n## Third\ntemplate:\ntemplate: Z {c}\ntemplate:\n'; const r = window.__formats.parse(t); return { slugs: r.map(f => f.slug), keys: Object.keys(r[0]).filter(k => /example|post/.test(k)), cat2: r[1].cat, third: r[2].template, thirdCat: r[2].cat, labels: r[0].labels }; });
  ok('F32 parser: notes and stray lines (including old example: and post: lines) ignored, a format with no template skipped, duplicate names get -2, missing category is "More", blank edge lines trimmed', JSON.stringify(ps) === JSON.stringify({ slugs: ['one', 'one-2', 'third'], keys: [], cat2: 'More', third: ['Z {c}'], thirdCat: 'More', labels: ['a', 'b'] }), JSON.stringify(ps));
  await p6.close();

  // ---- if the file is missing ----
  const p3 = await mk(); await p3.route('**/formats.txt', r => r.fulfill({ status: 500, body: 'x' })); await p3.goto(BASE); await p3.waitForSelector('#loadmsg:not([hidden])');
  ok('F33 if the formats can not be loaded the page says so and shows no empty card', /could not be loaded/.test(await txt(p3, '#loadmsg')) && await p3.locator('#bench').isHidden() && await p3.locator('#browse').isHidden());
  await p3.close();
  const p4 = await mk(); await p4.goto(BASE + '#f=overheard'); await ready(p4); await p4.fill('#blank0', 'kept words'); await p4.waitForTimeout(400);
  await p4.route('**/formats.txt', r => r.fulfill({ status: 500, body: 'x' }));
  await p4.goto('about:blank'); await p4.goto(BASE); await p4.waitForSelector('#loadmsg:not([hidden])'); await p4.goto('about:blank');
  await p4.unroute('**/formats.txt'); await p4.goto(BASE + '#f=overheard'); await ready(p4);
  ok('F33b a visit where the formats failed to load does not wipe the words saved earlier', (await p4.inputValue('#blank0')) === 'kept words');
  await p4.close();

  // ---- the hub and the server ----
  const hub = await mk(); await hub.goto('http://localhost:3988/');
  const hb = await hub.evaluate(() => ({ nums: [...document.querySelectorAll('.tool .num')].map(n => n.textContent + ' ' + n.nextElementSibling.textContent), href: [...document.querySelectorAll('a.k-btn')].map(a => a.getAttribute('href')).includes('/formats') }));
  ok('F34 the hub has Format Deck as card 08 linking to /formats, and the four separate sites are now 10 to 13', hb.href && hb.nums.length === 13 && hb.nums[7] === '08 Format Deck' && hb.nums[9] === '10 Shitsky38.com' && hb.nums[12] === '13 My Twitter Archive', JSON.stringify(hb.nums));
  await hub.close();
  const hubTxt = await (async () => { const h2 = await mk(); await h2.goto('http://localhost:3988/'); const t = await h2.evaluate(() => { const c = [...document.querySelectorAll('.tool')].find(x => /Format Deck/.test(x.textContent)); return c.querySelector('.tool-body p').textContent; }); await h2.close(); return t; })();
  const named = ['Nobody / Me', 'Professor X Asks', 'Fake Headline'];
  ok('F34b the hub card names formats, and every format it names is still in the deck (so it cannot mention one that was removed)', named.every(n => hubTxt.includes(n) && new RegExp('^## ' + n.replace(/[\/]/g, '\\/') + '$', 'm').test(TXT)) && !/quote post game opener/i.test(hubTxt), hubTxt.slice(0, 120));
  ok('F35 the server has a /formats route', /app\.get\('\/formats'/.test(fs.readFileSync(path.join(ROOT, 'src', 'index.ts'), 'utf8')));

  // ---- look: contrast, size, focus, phone, night ----
  const contrast = async (pg, label) => {
    const r = await pg.evaluate(() => {
      const parse = c => { const m = /rgba?\(([^)]+)\)/.exec(c); const p = m[1].split(',').map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const bgOf = el => { while (el) { const c = parse(getComputedStyle(el).backgroundColor); if (c.a > 0.99) return c; el = el.parentElement; } return { r: 255, g: 255, b: 255, a: 1 }; };
      const ratio = el => { const fg = parse(getComputedStyle(el).color), bg = bgOf(el), a = lum(fg), b = lum(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
      const sels = ['#how', '#post', '#count', '#tip', '#fields label', '#fields small', '#tiles .nm', '#tiles .th', '#found', '#cats button', '#cat', '#post .gap'];
      const res = {}; sels.forEach(s => { const el = document.querySelector(s); if (el) res[s] = Math.round(ratio(el) * 100) / 100; });
      const rb = document.querySelector('#cats button[aria-pressed="true"]'); if (rb) res.pressed = Math.round(ratio(rb) * 100) / 100;
      return res;
    });
    const low = Object.entries(r).filter(([, v]) => v < 4.5);
    ok('F36 ' + label + ': text contrast is at least 4.5 to 1 everywhere checked', !low.length && Object.keys(r).length >= 10, JSON.stringify(low.length ? low : Object.keys(r).length + ' checked, lowest ' + Math.min(...Object.values(r))));
  };
  const lt = await mk({ width: 1100, height: 900 }, 'light'); await lt.goto(BASE + '#f=nobody-me'); await ready(lt); await lt.waitForSelector('#tiles .tile');
  await contrast(lt, 'day mode');
  await lt.screenshot({ path: 'formats-desktop-light.png', fullPage: true });
  await lt.click('#themeToggle'); await lt.waitForTimeout(100);
  ok('F37 Night mode button switches the theme and the page remembers it on the shared "theme" key', (await lt.getAttribute('html', 'data-theme')) === 'dark' && (await lt.evaluate(() => localStorage.getItem('theme'))) === 'dark');
  await contrast(lt, 'night mode');
  await lt.screenshot({ path: 'formats-desktop-dark.png', fullPage: true });
  await lt.keyboard.press('Tab');
  await lt.close();

  const ph = await mk({ width: 390, height: 800 }, 'dark'); await ph.goto(BASE + '#f=hill-to-die-on'); await ready(ph); await ph.waitForSelector('#tiles .tile');
  const sizes = await ph.evaluate(() => { const els = [...document.querySelectorAll('#bench .k-btn, #bench input, #cats button, #q, #tiles .tile')].filter(e => e.getBoundingClientRect().width > 0); const small = els.filter(e => e.getBoundingClientRect().height < 44 - 0.5 || e.getBoundingClientRect().width < 44 - 0.5).map(e => (e.id || e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().height)); return { n: els.length, small, over: document.documentElement.scrollWidth > innerWidth + 1, post: document.getElementById('post').getBoundingClientRect().width, vw: innerWidth }; });
  ok('F38 phone width (390, night): no sideways scroll, and every button, input, chip and tile in the page is at least 44 pixels tall and wide', !sizes.over && !sizes.small.length && sizes.n > 20 && sizes.post <= sizes.vw, JSON.stringify(sizes));
  await ph.fill('#blank0', 'a'.repeat(120));
  const wrapOk = await ph.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  ok('F39 a long unbroken string in a blank wraps in the post and does not widen the page', wrapOk);
  await ph.screenshot({ path: 'formats-phone-dark.png', fullPage: true });
  await ph.focus('#deal'); await ph.keyboard.press('Tab'); await ph.keyboard.press('Shift+Tab');
  const focusRing = await ph.evaluate(() => { const s = getComputedStyle(document.activeElement); return { id: document.activeElement.id, w: s.outlineWidth, st: s.outlineStyle }; });
  ok('F40 keyboard focus shows a visible 3-pixel ring', focusRing.id === 'deal' && focusRing.w === '3px' && focusRing.st === 'solid', JSON.stringify(focusRing));
  await ph.close();

  const rm = await mk({ width: 800, height: 800 }, 'light', { reducedMotion: 'reduce' }); await rm.goto(BASE); await ready(rm); await rm.waitForSelector('#tiles .tile');
  ok('F41 with reduced motion on, nothing animates (tiles and buttons have no transition)', await rm.evaluate(() => [...document.querySelectorAll('.tile, .k-btn')].every(e => getComputedStyle(e).transitionDuration.split(',').every(d => parseFloat(d) === 0))));
  await rm.close();

  // ---- Help ----
  const hp = await mk(); await hp.goto(BASE); await ready(hp); await hp.click('#helpBtn');
  const help = await hp.evaluate(() => document.querySelector('#help .hb').textContent);
  ok('F42 Help explains the formats, the 300 limit, that Open in Bluesky is bsky.app only (use Copy elsewhere), and that nothing leaves the browser', /Open in Bluesky/.test(help) && /300/.test(help) && /Blacksky/.test(help) && /Northsky/.test(help) && /saved on this device only/.test(help) && /nothing is sent to this site/i.test(help) && !/Seen in the wild|worked example/i.test(help));
  await hp.close();

  console.log(out.join('\n')); console.log('JS errors:', errors.length ? errors.join('|') : 'none');
  await browser.close();
})().catch(e => { console.log(out.join('\n')); console.log('TEST CRASH', e); process.exit(1); });
