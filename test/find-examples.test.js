// Tests for scripts/find-examples.mjs (the Format Deck finder), against a fake Bluesky. No network needed.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'find-examples.mjs');
const FORMATS = path.join(__dirname, '..', 'public', 'formats.txt');
const load = () => import(SCRIPT);

// the worked example of a format, built the way the page builds it: the {labels}, in order of first appearance, get the example words
function exampleText(block) {
  const lines = block.split('\n'), tpl = [];
  let ex = '';
  for (const l of lines) { let m = /^template:\s?(.*)$/.exec(l); if (m) tpl.push(m[1]); m = /^example:\s?(.*)$/.exec(l); if (m) ex = m[1]; }
  const words = ex.split('|').map(s => s.trim()), order = [];
  tpl.join('\n').replace(/\{([^}]+)\}/g, (_, k) => { if (!order.includes(k)) order.push(k); return ''; });
  return tpl.join('\n').replace(/\{([^}]+)\}/g, (_, k) => words[order.indexOf(k)] || '');
}

test('every format has a search line and valid match lines, and its own worked example passes them', async () => {
  const { parseFormats } = await load();
  const src = fs.readFileSync(FORMATS, 'utf8'), formats = parseFormats(src);
  const blocks = src.split('\n').filter(l => !l.startsWith(';;')).join('\n').split(/^## /m).slice(1);
  assert.strictEqual(formats.length, 40);
  const problems = [];
  formats.forEach((f, i) => {
    if (!f.searches.length) problems.push(f.name + ': no search');
    if (!f.matches.length) problems.push(f.name + ': no match');
    if (f.badMatch) problems.push(f.name + ': bad regex ' + f.badMatch.join(' | '));
    const ex = exampleText(blocks[i]);
    if (f.matches.length && !f.matches.every(re => re.test(ex))) problems.push(f.name + ': its own example does not match: ' + JSON.stringify(ex.slice(0, 80)));
  });
  assert.deepStrictEqual(problems, []);
});

test('a likes: line sets a format\'s own bar, and bad ones are ignored', async () => {
  const { parseFormats } = await load();
  const [a, b, c] = parseFormats('## A\nsearch: "a"\nlikes: 15\n\n## B\nsearch: "b"\n\n## C\nsearch: "c"\nlikes: lots\n');
  assert.deepStrictEqual([a.likes, b.likes, c.likes], [15, null, null]);
});

test('keep() and pick() choose real uses of the format with the most likes, one per author', async () => {
  const { parseFormats, keep, pick } = await load();
  const [f] = parseFormats('## Nobody / Me\nsearch: "Nobody:" "Me:"\nmatch: ^nobody:\nmatch: ^me:\npost: https://bsky.app/profile/x.test/post/3old\n');
  const P = (rkey, did, likes, text, extra = {}) => ({ uri: `at://${did}/app.bsky.feed.post/${rkey}`, author: { did, handle: did.slice(4) + '.test' }, likeCount: likes, record: { text }, ...extra });
  const good = 'Nobody:\nMe: rehearsing a speech to a toll booth';
  assert.ok(keep(P('a', 'did:1', 40, good), f, 30));
  assert.ok(!keep(P('a', 'did:1', 29, good), f, 30), 'too few likes');
  assert.ok(!keep(P('a', 'did:1', 500, 'Nobody asked and me neither'), f, 30), 'has the words but not the format');
  assert.ok(!keep(P('a', 'did:1', 500, good, { labels: [{ val: 'porn' }] }), f, 30), 'labeled');
  assert.ok(!keep({ ...P('a', 'did:1', 500, good), record: { text: good, reply: { parent: {} } } }, f, 30), 'a reply');
  assert.ok(!keep(P('a', 'did:1', 500, good + 'x'.repeat(300)), f, 30), 'over 300 characters');
  assert.ok(!keep(P('3old', 'did:1', 500, good), f, 30), 'already on the card');
  const picks = pick([P('a', 'did:1', 50, good), P('b', 'did:2', 900, good), P('c', 'did:1', 700, good), P('d', 'did:3', 100, good)], f, 30, 2);
  assert.deepStrictEqual(picks.map(p => p.uri.split('/').pop()), ['b', 'c'], 'most-liked first, one per author, at most 2');
});

// a fake Bluesky: createSession plus a paged searchPosts
function fake(calls) {
  const sample = (n, did, likes, text) => ({ uri: `at://${did}/app.bsky.feed.post/${n}`, author: { did, handle: did.slice(4) + '.test' }, likeCount: likes, repostCount: 3, record: { text } });
  const pageOne = [sample('p1', 'did:one', 80, 'Nobody:\nMe: arguing with a parking meter'), sample('p2', 'did:two', 400, 'Nobody asked.')];
  const pageTwo = [sample('p3', 'did:three', 1200, 'nobody:\nme: alphabetizing the spices at 2am'), sample('p4', 'did:four', 5, 'Nobody:\nMe: low likes')];
  return http.createServer((req, res) => {
    let body = ''; req.on('data', c => body += c); req.on('end', () => {
      const u = new URL(req.url, 'http://x'); calls.push({ path: u.pathname, q: u.searchParams.get('q'), cursor: u.searchParams.get('cursor'), auth: req.headers.authorization || '', proxy: req.headers['atproto-proxy'] || '', body });
      res.setHeader('content-type', 'application/json');
      if (u.pathname.endsWith('createSession')) { const b = JSON.parse(body); if (b.password !== 'good-pass') { res.statusCode = 401; return res.end('{}'); } return res.end(JSON.stringify({ accessJwt: 'tok123' })); }
      if (u.pathname.endsWith('searchPosts')) {
        if (!(req.headers.authorization || '').startsWith('Bearer tok123')) { res.statusCode = 403; return res.end('{}'); }
        return res.end(JSON.stringify(u.searchParams.get('cursor') === 'next' ? { posts: pageTwo } : { posts: pageOne, cursor: 'next' }));
      }
      res.statusCode = 404; res.end('{}');
    });
  });
}
function run(env) {
  return new Promise(resolve => {
    const p = spawn(process.execPath, [SCRIPT, ...(env.ARGS || [])], { env: { ...process.env, ...env, ARGS: undefined } });
    let out = '', err = ''; p.stdout.on('data', d => out += d); p.stderr.on('data', d => err += d);
    p.on('close', code => resolve({ code, out, err }));
  });
}
const withServer = async fn => {
  const calls = [], srv = fake(calls); await new Promise(r => srv.listen(0, '127.0.0.1', r));
  try { return await fn(`http://127.0.0.1:${srv.address().port}`, calls); } finally { srv.close(); }
};
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'finder-'));

test('the script signs in with the app password, reads several pages, and writes the most-liked real matches', async () => {
  await withServer(async (base, calls) => {
    const dir = tmp(), formats = path.join(dir, 'f.txt'), out = path.join(dir, 'c.txt');
    fs.writeFileSync(formats, '## Nobody / Me\nsearch: "Nobody:" "Me:"\nmatch: ^nobody:\nmatch: ^me:\n');
    const r = await run({ FORMATS_FILE: formats, CANDIDATES_FILE: out, BSKY_SERVICE: base, BSKY_HANDLE: 'me.test', BSKY_APP_PASSWORD: 'good-pass', ARGS: ['--min-likes', '30'] });
    assert.strictEqual(r.code, 0, r.err);
    const txt = fs.readFileSync(out, 'utf8'), posts = txt.split('\n').filter(l => l.startsWith('post: '));
    assert.deepStrictEqual(posts, ['post: https://bsky.app/profile/three.test/post/p3', 'post: https://bsky.app/profile/one.test/post/p1'], 'most liked first; the look-alike and the low-likes post are left out');
    assert.ok(/1200 likes/.test(txt));
    const searches = calls.filter(c => c.path.endsWith('searchPosts'));
    assert.strictEqual(searches.length, 2, 'followed the cursor to a second page');
    assert.ok(searches.every(c => c.auth === 'Bearer tok123' && /bsky_appview/.test(c.proxy)));
    assert.ok(!txt.includes('good-pass') && !r.out.includes('good-pass'), 'the app password is never written down');
  });
});

test('the script explains itself when Bluesky refuses a search or the sign-in', async () => {
  await withServer(async (base) => {
    const dir = tmp(), formats = path.join(dir, 'f.txt');
    fs.writeFileSync(formats, '## Nobody / Me\nsearch: "Nobody:"\nmatch: ^nobody:\n');
    const blocked = await run({ FORMATS_FILE: formats, CANDIDATES_FILE: path.join(dir, 'c.txt'), BSKY_SERVICE: base, BSKY_HANDLE: '', BSKY_APP_PASSWORD: '', BSKY_API: base });
    assert.notStrictEqual(blocked.code, 0);
    assert.ok(/signed in/.test(blocked.err) && /BSKY_APP_PASSWORD/.test(blocked.err), blocked.err);
    const bad = await run({ FORMATS_FILE: formats, CANDIDATES_FILE: path.join(dir, 'c.txt'), BSKY_SERVICE: base, BSKY_HANDLE: 'me.test', BSKY_APP_PASSWORD: 'wrong' });
    assert.notStrictEqual(bad.code, 0);
    assert.ok(/would not sign in/.test(bad.err), bad.err);
  });
});

test('a bad match: regex is reported, and --print-queries signs in to nothing', async () => {
  const dir = tmp(), formats = path.join(dir, 'f.txt');
  fs.writeFileSync(formats, '## Oops\nsearch: "x"\nmatch: (unclosed\n');
  const r = await run({ FORMATS_FILE: formats, CANDIDATES_FILE: path.join(dir, 'c.txt') });
  assert.notStrictEqual(r.code, 0); assert.ok(/not a valid regular expression/.test(r.err), r.err);
  fs.writeFileSync(formats, '## Fine\nsearch: "hello there"\nmatch: hello\n');
  const q = await run({ FORMATS_FILE: formats, CANDIDATES_FILE: path.join(dir, 'c.txt'), ARGS: ['--print-queries'] });
  assert.strictEqual(q.code, 0); assert.ok(/bsky\.app\/search\?q=%22hello%20there%22/.test(q.out), q.out);
});

test('a temporary 502 from Bluesky is retried instead of skipping the format', async () => {
  let hits = 0;
  const srv = http.createServer((req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.url.includes('createSession')) return res.end(JSON.stringify({ accessJwt: 'tok123' }));
    hits++; if (hits === 1) { res.statusCode = 502; return res.end('{}'); }
    res.end(JSON.stringify({ posts: [{ uri: 'at://did:one/app.bsky.feed.post/p1', author: { did: 'did:one', handle: 'one.test' }, likeCount: 90, record: { text: 'Nobody:\nMe: retrying' } }] }));
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  try {
    const dir = tmp(), formats = path.join(dir, 'f.txt'), out = path.join(dir, 'c.txt');
    fs.writeFileSync(formats, '## Nobody / Me\nsearch: "Nobody:"\nmatch: ^nobody:\n');
    const r = await run({ FORMATS_FILE: formats, CANDIDATES_FILE: out, BSKY_SERVICE: 'http://127.0.0.1:' + srv.address().port, BSKY_HANDLE: 'me.test', BSKY_APP_PASSWORD: 'x', ARGS: ['--pages', '1'] });
    assert.strictEqual(r.code, 0, r.err);
    assert.ok(/post: https:\/\/bsky\.app\/profile\/one\.test\/post\/p1/.test(fs.readFileSync(out, 'utf8')) && hits === 2, 'hits ' + hits);
  } finally { srv.close(); }
});
