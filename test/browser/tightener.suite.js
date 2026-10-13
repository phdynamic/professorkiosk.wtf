// Joke Tightener: a joke in, flags on the padding, tap to cut, tighten it all.
const { chromium } = require('playwright-core');
const BASE = 'http://localhost:3988/tightener';
const out = []; const ok = (n, c, x = '') => out.push((c ? 'PASS' : 'FAIL') + ': ' + n + (x ? ' — ' + x : ''));
const errors = [];
const EXAMPLE = "So I was honestly just trying to open a jar of pickles, and I literally could not do it, and I think that is kind of a metaphor for my life, which is really just a lot of jars.";
const TIGHT = "I was trying to open a jar of pickles, and I could not do it, and that is a metaphor for my life, which is a lot of jars.";
async function mk(browser, { vp = { width: 1200, height: 900 }, scheme = 'light' } = {}) {
  const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage(); const log = { third: [] };
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { const u = new URL(r.url()); if (u.hostname !== 'localhost' && u.protocol.startsWith('http') && !/fonts\.g/.test(r.url())) log.third.push(u.hostname); });
  await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await page.route('https://public.api.bsky.app/**', r => r.fulfill({ status: 404, headers: { 'access-control-allow-origin': '*' }, body: '{}' }));   // the footer avatar only
  return { page, log, ctx };
}
const val = page => page.inputValue('#draft');
const txt = (page, sel) => page.evaluate(s => (document.querySelector(s) || {}).textContent || '', sel);
(async () => {
  const browser = await chromium.launch({ executablePath: require('./env').CHROME });
  const { page, log } = await mk(browser); await page.goto(BASE);

  const e0 = await page.evaluate(() => ({ tag: document.querySelector('.k-hero .k-tag').textContent, all: document.getElementById('all').disabled, undo: document.getElementById('undo').disabled, copy: document.getElementById('copy').disabled, help: !!document.getElementById('helpBtn'), theme: !!document.getElementById('themeToggle'), foot: !!document.querySelector('footer.k-foot .kofi'), flags: document.querySelectorAll('.flag').length }));
  ok('TT1 the empty page: Tool 05 tag, every action off, no flags, plus Help, Night mode and the footer', /Tool 05/.test(e0.tag) && e0.all && e0.undo && e0.copy && !e0.flags && e0.help && e0.theme && e0.foot, JSON.stringify(e0));

  // ---- what it flags ----
  const f = await page.evaluate(ex => { const T = window.__tight; return { cuts: T.cutsOf(ex).map(c => c.text), tight: T.tightenAll(ex) }; }, EXAMPLE);
  ok('TT2 the example flags So, honestly, just, literally, "I think", "kind of", really and just (and leaves "that" alone because "I think" is already flagged)', JSON.stringify(f.cuts) === JSON.stringify(['So', 'honestly', 'just', 'literally', 'I think', 'kind of', 'really', 'just']), JSON.stringify(f.cuts));
  ok('TT3 tightening the whole example gives a clean sentence', f.tight === TIGHT, f.tight);
  const cases = await page.evaluate(() => { const T = window.__tight, one = (t, i = 0) => T.applyCut(t, T.cutsOf(t)[i]); return [
    one('It was really funny.'), one('Honestly, it was bad.'), one('It was, you know, bad.'), one('So, what now?'), one('He said that it works.'),
    T.cutsOf('That is so good, justice for adjust, reality.').length, one('Was it sort of sad?'), T.tightenAll('I mean, it is a bit much.'), one('line one\nBasically line two.', 0)]; });
  ok('TT4 cuts tidy the spacing, commas and capital letters, and only whole words count', JSON.stringify(cases) === JSON.stringify(['It was funny.', 'It was bad.', 'It was, bad.', 'What now?', 'He said it works.', 0, 'Was it sad?', 'It is much.', 'line one\nLine two.']), JSON.stringify(cases));
  const r = await page.evaluate(() => { const T = window.__tight; return { reps: T.repeatsOf('cat cat cat dog the the the').map(x => x.word + x.n), none: T.repeatsOf('cat cat dog').length, sents: T.sentencesOf('One two three. Four five six seven! Eight?').map(s => s.words) }; });
  ok('TT5 a word used three times is a repeat, two is not, and common words like "the" never count; sentences are counted by words', JSON.stringify(r.reps) === JSON.stringify(['cat3']) && r.none === 0 && JSON.stringify(r.sents) === JSON.stringify([3, 4, 1]), JSON.stringify(r));

  // ---- the page ----
  await page.click('#example');
  const ui = await page.evaluate(() => ({ flags: document.querySelectorAll('.flag').length, chips: document.querySelectorAll('.chip').length, all: !document.getElementById('all').disabled, count: document.getElementById('count').textContent, notes: document.getElementById('notes').textContent }));
  ok('TT6 "Try an example" fills the box; eight flags show in the text and as eight buttons in the notes, "Tighten it all" turns on, and the counter reads the length', (await val(page)) === EXAMPLE && ui.flags === 8 && ui.chips === 8 && ui.all && /^\d+ \/ 300 characters/.test(ui.count) && /8 fillers or hedges/.test(ui.notes), JSON.stringify(ui));
  const n0 = (await val(page)).length;
  await page.click('.flag >> nth=1');   // honestly
  const afterOne = await val(page);
  ok('TT7 tapping a flag cuts just that word ("honestly"), the counter says how much is cut, and Undo turns on', afterOne === EXAMPLE.replace('honestly ', '') && /\d+ cut so far/.test(await txt(page, '#count')) && !(await page.isDisabled('#undo')), afterOne.slice(0, 40));
  await page.click('#undo');
  ok('TT8 Undo puts the text back exactly and clears the "cut so far" note', (await val(page)) === EXAMPLE && !/cut so far/.test(await txt(page, '#count')));
  await page.click('.chip >> nth=0');
  ok('TT9 the buttons in the notes cut too ("So" opens the sentence, so "I" becomes the new start)', (await val(page)).startsWith('I was honestly'), (await val(page)).slice(0, 30));
  await page.click('#undo');
  await page.click('#all');
  ok('TT10 "Tighten it all" cuts every flag at once, gives the clean sentence (which is still one long sentence, so that note stays), and Undo restores the original in one step', (await val(page)) === TIGHT && (await page.isDisabled('#all')) && !/filler or hedge/.test(await txt(page, '#notes')) && /One long sentence/.test(await txt(page, '#notes')) && await (async () => { await page.click('#undo'); return (await val(page)) === EXAMPLE; })());
  await page.click('#clear');
  ok('TT11 Clear empties the box and Undo brings the joke back', (await val(page)) === '' && await (async () => { await page.click('#undo'); return (await val(page)) === EXAMPLE; })());

  // ---- repeats, long sentences, the limit ----
  await page.fill('#draft', 'The cat sat. The cat ran. The cat hid.');
  const rep = await page.evaluate(() => ({ marks: document.querySelectorAll('.rep').length, note: document.getElementById('notes').textContent }));
  ok('TT12 a word repeated three times is underlined each time and listed, with a note that repeating can be the joke', rep.marks === 3 && /cat.*×3/.test(rep.note) && /sometimes the joke/.test(rep.note), JSON.stringify(rep));
  const long = Array.from({ length: 25 }, (_, i) => 'word' + String.fromCharCode(97 + (i % 26)) + i).join(' ') + '.';
  await page.fill('#draft', long);
  ok('TT13 a sentence over 22 words is listed in the notes with its word count', /One long sentence.*is 25 words/.test(await txt(page, '#notes')), await txt(page, '#notes'));
  await page.fill('#draft', 'x'.repeat(320));
  const over = await page.evaluate(() => ({ cls: document.getElementById('count').className, t: document.getElementById('count').textContent, href: document.getElementById('open').getAttribute('href') }));
  ok('TT14 over 300 characters the counter turns to the over style and says by how much, and Open in Bluesky carries the text', /over/.test(over.cls) && /over by 20/.test(over.t) && over.href === 'https://bsky.app/intent/compose?text=' + 'x'.repeat(320), JSON.stringify([over.cls, over.t]));
  await page.fill('#draft', '😀'.repeat(10) + '👨‍👩‍👧‍👦');
  ok('TT15 the counter counts a family emoji as one character, the way Bluesky does', /^11 \/ 300/.test(await txt(page, '#count')), await txt(page, '#count'));

  // ---- keyboard, copy, storage ----
  await page.fill('#draft', 'It was really funny.');
  await page.focus('.flag'); await page.keyboard.press('Enter');
  ok('TT16 a flag can be cut from the keyboard (Enter on the focused word)', (await val(page)) === 'It was funny.', await val(page));
  await page.click('#copy'); await page.waitForTimeout(100);
  ok('TT17 Copy post puts exactly the text on the clipboard and says Copied', (await page.evaluate(() => navigator.clipboard.readText())) === 'It was funny.' && (await txt(page, '#status')) === 'Copied.');
  ok('TT18 the page asks nothing of Bluesky itself (only the shared footer picture lookup goes out), contacts no other site, and stores nothing but the theme', log.third.every(h => h === 'public.api.bsky.app') && (await page.evaluate(() => Object.keys(localStorage).every(k => k === 'theme') && Object.keys(sessionStorage).length === 0)), JSON.stringify(log.third));
  await page.fill('#draft', EXAMPLE); await page.reload();
  ok('TT19 reloading the page leaves the box empty (the joke is not saved)', (await val(page)) === '');

  // ---- phone, night mode ----
  await page.click('#example');
  await page.screenshot({ path: 'tightener-desktop-light.png', fullPage: true });
  const ph = await mk(browser, { vp: { width: 390, height: 800 }, scheme: 'dark' }); await ph.page.goto(BASE); await ph.page.click('#example');
  const sz = await ph.page.evaluate(() => { const els = [...document.querySelectorAll('.row .k-btn, .chip, #draft')].filter(e => e.getBoundingClientRect().width > 0 && !e.closest('[hidden]')); const small = els.filter(e => e.getBoundingClientRect().height < 43.5).map(e => (e.id || e.className) + ':' + Math.round(e.getBoundingClientRect().height)); return { over: document.documentElement.scrollWidth > innerWidth + 1, small, n: els.length }; });
  ok('TT20 phone width (night mode): nothing scrolls sideways and every button and chip is at least 44 pixels tall', !sz.over && !sz.small.length && sz.n >= 12, JSON.stringify(sz));
  await ph.page.screenshot({ path: 'tightener-phone-dark.png', fullPage: true });
  await ph.ctx.close();
  await page.click('#themeToggle'); await page.waitForTimeout(100);
  ok('TT21 Night mode switches the theme and remembers it on the shared "theme" key', (await page.getAttribute('html', 'data-theme')) === 'dark' && (await page.evaluate(() => localStorage.getItem('theme'))) === 'dark');
  await page.screenshot({ path: 'tightener-desktop-dark.png', fullPage: true });

  console.log(out.join('\n')); console.log('JS errors:', errors.length ? errors.join('|') : 'none');
  await browser.close();
})().catch(e => { console.log(out.join('\n')); console.log('TEST CRASH', e); process.exit(1); });
