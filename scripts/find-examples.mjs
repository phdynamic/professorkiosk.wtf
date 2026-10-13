#!/usr/bin/env node
// Finds candidate "Seen in the wild" posts for the Format Deck: posts that really use a format, with plenty of likes.
//
// For every format in public/formats.txt it
//   1. runs the format's `search:` line on Bluesky (most-liked first, several pages deep),
//   2. keeps only posts whose text matches EVERY `match:` line of the format (a regular expression, so a post that
//      merely contains the words "me" and "nobody" does not count as a Nobody / Me post),
//   3. throws out replies, anything with a moderation label, posts over 300 characters, and posts under --min-likes,
//   4. sorts what is left by like count and writes the best ones to a new file, scripts/candidates-DATE-TIME.txt, for YOU to read (every run makes its own file).
// Nothing is added to the site automatically. You copy the `post:` lines you like into public/formats.txt.
//
// Searching on Bluesky needs you to be signed in, so give the script an app password (Settings > App Passwords):
//   BSKY_HANDLE=you.bsky.social BSKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx node scripts/find-examples.mjs
// The app password is only sent to Bluesky to sign in; it is never written to a file. Your own account is only used to
// search. If your account is not on bsky.social, also set BSKY_SERVICE to your PDS address.
//
// Options:
//   --only "Overheard"    one format (part of the name is enough)
//   --min-likes 50        only posts with at least this many likes (default 30; a format can set its own with a likes: line, and --min-likes overrides that)
//   --per-format 8        most candidates written per format (default 8)
//   --pages 3             how many pages of 100 search results to read per search (default 3)
//   --print-queries       just print the searches, with links you can open in Bluesky, and sign in to nothing
//
// Be kind to the authors: only copy in posts you would be comfortable having the author see you featured,
// and skip anything that mocks a private person.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const FORMATS = process.env.FORMATS_FILE || path.join(here, '..', 'public', 'formats.txt');
// every run writes its own file (candidates-YYYY-MM-DD-HHMM.txt), so a later run, or a run for one format, never overwrites an earlier one
const stamp = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '');
const OUT = process.env.CANDIDATES_FILE || path.join(here, `candidates-${stamp}.txt`);
const HANDLE = process.env.BSKY_HANDLE || '';
const PASSWORD = process.env.BSKY_APP_PASSWORD || '';
const TOKEN = process.env.BSKY_TOKEN || '';
const SERVICE = (process.env.BSKY_SERVICE || (HANDLE ? 'https://bsky.social' : process.env.BSKY_API || 'https://public.api.bsky.app')).replace(/\/+$/, '');

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] != null ? args[i + 1] : dflt; };
const only = opt('--only', '').toLowerCase();
const likesGiven = args.includes('--min-likes'), minLikes = Number(opt('--min-likes', '30'));
const perFormat = Number(opt('--per-format', '8'));
const pages = Math.max(1, Number(opt('--pages', '3')));
const printOnly = args.includes('--print-queries');

// One format per "## Name" block. `search:` (one or more) says what to ask Bluesky; `match:` (one or more) is a regular
// expression, case-insensitive, with ^ and $ working on each line of the post; a post must match all of them.
export function parseFormats(src) {
  const out = []; let cur = null;
  for (const line of src.replace(/\r\n?/g, '\n').split('\n')) {
    if (line.startsWith(';;')) continue;
    let m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) { cur = { name: m[1], searches: [], matches: [], matchSrc: [], have: [], likes: null }; out.push(cur); continue; }
    if (!cur) continue;
    m = /^(search|match|post|likes):\s?(.*)$/.exec(line);
    if (!m) continue;
    const v = m[2].trim();
    if (m[1] === 'search') { if (v) cur.searches.push(v); }
    else if (m[1] === 'post') cur.have.push(v);
    else if (m[1] === 'likes') { if (/^\d+$/.test(v)) cur.likes = Number(v); }
    else if (v) { cur.matchSrc.push(v); try { cur.matches.push(new RegExp(v, 'im')); } catch (e) { cur.badMatch = (cur.badMatch || []).concat(v); } }
  }
  return out;
}
export function keep(p, f, minLikes) {
  if (!p || !p.record || !p.author || !p.uri) return false;
  if (p.record.reply) return false;                                    // replies need their context
  if (p.labels && p.labels.length) return false;                      // any moderation label: leave it out
  if (p.author.labels && p.author.labels.length) return false;
  const text = (p.record.text || '').trim();
  if (!text || text.length > 300) return false;
  if ((p.likeCount || 0) < minLikes) return false;
  if (f.matches.length && !f.matches.every(re => re.test(text))) return false;   // it must really use the format
  const rkey = p.uri.split('/').pop();
  if (f.have.some(h => h.replace(/[?#].*$/, '').replace(/\/+$/, '').split('/').pop() === rkey)) return false;   // already on the card
  return true;
}
// the best posts first (most likes), at most one per author, at most `limit`
export function pick(posts, f, minLikes, limit) {
  const seen = new Set(), out = [];
  for (const p of posts.filter(x => keep(x, f, minLikes)).sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))) {
    if (seen.has(p.author.did)) continue;
    seen.add(p.author.did); out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

let auth = TOKEN;
async function signIn() {
  if (auth || !HANDLE || !PASSWORD) return;
  const r = await fetch(SERVICE + '/xrpc/com.atproto.server.createSession', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier: HANDLE, password: PASSWORD }) });
  if (!r.ok) { const e = new Error('Bluesky would not sign in as ' + HANDLE + ' (HTTP ' + r.status + '). Check the handle and the app password.'); e.fatal = true; throw e; }
  auth = (await r.json()).accessJwt || '';
  if (!auth) { const e = new Error('Bluesky signed in but sent no access token.'); e.fatal = true; throw e; }
}
async function fetchPage(q, cursor) {
  let url = `${SERVICE}/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(q)}&sort=top&lang=en&limit=100`;
  if (cursor) url += '&cursor=' + encodeURIComponent(cursor);
  const headers = { accept: 'application/json' };
  if (auth) { headers.authorization = 'Bearer ' + auth; headers['atproto-proxy'] = 'did:web:api.bsky.app#bsky_appview'; }
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(url, { headers });
    if (r.status === 429) { await sleep((Number(r.headers.get('retry-after')) || 30) * 1000); continue; }
    if (r.status === 401 || r.status === 403) { const e = new Error('blocked'); e.blocked = r.status; throw e; }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  throw new Error('rate limited');
}
async function search(q) {
  const all = []; let cursor = '';
  for (let i = 0; i < pages; i++) {
    const d = await fetchPage(q, cursor);
    all.push(...(d.posts || []));
    cursor = d.cursor || '';
    if (!cursor) break;
    await sleep(300);
  }
  return all;
}

async function main() {
  const formats = parseFormats(fs.readFileSync(FORMATS, 'utf8')).filter(f => f.searches.length && (!only || f.name.toLowerCase().includes(only)));
  if (!formats.length) { console.log('No formats matched.'); return; }
  const badRe = formats.filter(f => f.badMatch);
  if (badRe.length) { for (const f of badRe) console.error(`${f.name}: a match: line is not a valid regular expression: ${f.badMatch.join(' | ')}`); process.exitCode = 1; return; }
  if (printOnly) {
    for (const f of formats) { console.log(f.name); for (const s of f.searches) console.log(`  ${s}\n  https://bsky.app/search?q=${encodeURIComponent(s)}`); console.log(''); }
    return;
  }
  const lines = [';; Candidates from scripts/find-examples.mjs, most-liked first. Read each one. Copy the post: lines you like into public/formats.txt.',
    ';; Only feature posts you would be comfortable having the author see. Nothing here is on the site until you copy it.', ''];
  let total = 0;
  try { await signIn(); } catch (e) { console.error(e.message); process.exitCode = 1; return; }
  for (const f of formats) {
    let posts = [];
    try { for (const s of f.searches) posts.push(...await search(s)); }
    catch (e) {
      if (e.blocked) {
        console.error(`Bluesky answered HTTP ${e.blocked} to a search from ${SERVICE}. Searching needs you to be signed in.`);
        console.error('Set BSKY_HANDLE and BSKY_APP_PASSWORD (an app password from Bluesky Settings) and run again, or use --print-queries and search by hand.');
        process.exitCode = 1; return;
      }
      console.error(`${f.name}: ${e.message}`); continue;
    }
    const byUri = new Map(posts.map(p => [p.uri, p])), unique = [...byUri.values()];
    const need = likesGiven || f.likes == null ? minLikes : f.likes;   // a format whose real posts are rarely liked can lower the bar with a likes: line
    const picks = pick(unique, f, need, perFormat);
    // why a format came up short: how many posts fit its shape at all, and how well liked the best of them was
    const fit = unique.filter(p => keep(p, f, 0)), best = fit.reduce((m, p) => Math.max(m, p.likeCount || 0), 0);
    const note = `${fit.length} of ${unique.length} posts read fit the format${fit.length ? `, the best has ${best} likes` : ''}${need !== minLikes ? `; this format asks for ${need}+ likes` : ''}`;
    lines.push(`## ${f.name}`, ...f.searches.map(s => `;; search: ${s}`), `;; ${note}`);
    const misses = !fit.length ? unique.slice().sort((x, y) => (y.likeCount || 0) - (x.likeCount || 0)).slice(0, 3) : [];
    if (misses.length) { lines.push(';; nothing fit the format. The most-liked results were:'); misses.forEach(p => lines.push(`;;   ${p.likeCount || 0} likes: ${(p.record && p.record.text || '').replace(/\s+/g, ' ').slice(0, 120)}`)); }
    if (!picks.length) lines.push(`;; nothing passed the filters`);
    for (const p of picks) {
      lines.push(`;; ${p.likeCount || 0} likes, ${p.repostCount || 0} reposts, @${p.author.handle}: ${p.record.text.replace(/\s+/g, ' ').slice(0, 200)}`);
      lines.push(`post: https://bsky.app/profile/${p.author.handle}/post/${p.uri.split('/').pop()}`);
    }
    lines.push(''); total += picks.length;
    console.log(`${f.name}: ${picks.length} candidates (${note})`);
    if (misses.length) misses.forEach(p => console.log(`    nothing fit the format; top result: ${p.likeCount || 0} likes: ${(p.record && p.record.text || '').replace(/\s+/g, ' ').slice(0, 90)}`));
    await sleep(500);
  }
  fs.writeFileSync(OUT, lines.join('\n'));
  console.log(`\n${total} candidates written to ${OUT}`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
