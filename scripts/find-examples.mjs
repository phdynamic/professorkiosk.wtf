#!/usr/bin/env node
// Finds candidate "Seen in the wild" posts for the Format Deck.
//
// It reads the `search:` line of every format in public/formats.txt, asks Bluesky to search for it, throws out
// replies and anything with a moderation label, and writes what is left to scripts/candidates.txt for YOU to read.
// Nothing is added to the site automatically. You copy the `post:` lines you like into public/formats.txt.
//
// Run it on your own computer (it needs the internet):
//   node scripts/find-examples.mjs                      all formats
//   node scripts/find-examples.mjs --only "Overheard"   one format (part of the name is enough)
//   node scripts/find-examples.mjs --min-likes 30       only posts with at least 30 likes (default 15)
//   node scripts/find-examples.mjs --print-queries      just print the searches, with links you can open in Bluesky
//
// If Bluesky refuses unsigned-in searches (HTTP 401 or 403), the script says so and prints the search links instead.
// You can also point it at a service you are signed in to with BSKY_SERVICE and BSKY_TOKEN (an access token),
// but that path is untested. Use --print-queries and search by hand if it does not work.
//
// Be kind to the authors: only copy in posts you would be comfortable having the author see you featured,
// and skip anything that mocks a private person.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const FORMATS = process.env.FORMATS_FILE || path.join(here, '..', 'public', 'formats.txt');
const OUT = process.env.CANDIDATES_FILE || path.join(here, 'candidates.txt');
const SERVICE = (process.env.BSKY_SERVICE || process.env.BSKY_API || 'https://public.api.bsky.app').replace(/\/+$/, '');
const TOKEN = process.env.BSKY_TOKEN || '';

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] != null ? args[i + 1] : dflt; };
const only = opt('--only', '').toLowerCase();
const minLikes = Number(opt('--min-likes', '15'));
const perFormat = Number(opt('--per-format', '8'));
const printOnly = args.includes('--print-queries');

export function parseFormats(src) {
  const out = []; let cur = null;
  for (const line of src.replace(/\r\n?/g, '\n').split('\n')) {
    if (line.startsWith(';;')) continue;
    let m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) { cur = { name: m[1], search: '', have: [] }; out.push(cur); continue; }
    if (!cur) continue;
    m = /^(search|post):\s?(.*)$/.exec(line);
    if (!m) continue;
    if (m[1] === 'search') cur.search = m[2].trim(); else cur.have.push(m[2].trim());
  }
  return out;
}
export function keep(p, have, minLikes) {
  if (!p || !p.record || !p.author || !p.uri) return false;
  if (p.record.reply) return false;                                    // replies need their context
  if (p.labels && p.labels.length) return false;                      // any moderation label: leave it out
  if (p.author.labels && p.author.labels.length) return false;
  const text = (p.record.text || '').trim();
  if (!text || text.length > 300) return false;
  if ((p.likeCount || 0) < minLikes) return false;
  const rkey = p.uri.split('/').pop();
  if (have.some(h => h.includes(rkey))) return false;                  // already on the card
  return true;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function search(q) {
  const url = `${SERVICE}/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(q)}&sort=top&lang=en&limit=50`;
  const headers = { accept: 'application/json' };
  if (TOKEN) { headers.authorization = 'Bearer ' + TOKEN; headers['atproto-proxy'] = 'did:web:api.bsky.app#bsky_appview'; }
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(url, { headers });
    if (r.status === 429) { await sleep((Number(r.headers.get('retry-after')) || 30) * 1000); continue; }
    if (r.status === 401 || r.status === 403) { const e = new Error('blocked'); e.blocked = r.status; throw e; }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return (await r.json()).posts || [];
  }
  throw new Error('rate limited');
}

async function main() {
  const formats = parseFormats(fs.readFileSync(FORMATS, 'utf8')).filter(f => f.search && (!only || f.name.toLowerCase().includes(only)));
  if (!formats.length) { console.log('No formats matched.'); return; }
  if (printOnly) {
    for (const f of formats) console.log(`${f.name}\n  ${f.search}\n  https://bsky.app/search?q=${encodeURIComponent(f.search)}\n`);
    return;
  }
  const lines = [';; Candidates from scripts/find-examples.mjs. Read each one. Copy the post: lines you like into public/formats.txt.',
    ';; Only features posts you would be comfortable having the author see. Nothing here is on the site until you copy it.', ''];
  let total = 0;
  for (const f of formats) {
    let posts;
    try { posts = await search(f.search); }
    catch (e) {
      if (e.blocked) {
        console.error(`Bluesky answered HTTP ${e.blocked} to a search from ${SERVICE}. Searching needs you to be signed in.`);
        console.error('Run again with --print-queries to get search links you can open in Bluesky, or see the top of this file for BSKY_SERVICE and BSKY_TOKEN.');
        process.exitCode = 1; return;
      }
      console.error(`${f.name}: ${e.message}`); continue;
    }
    const seenAuthors = new Set(), picks = [];
    for (const p of posts) {
      if (!keep(p, f.have, minLikes) || seenAuthors.has(p.author.did)) continue;
      seenAuthors.add(p.author.did); picks.push(p);
      if (picks.length >= perFormat) break;
    }
    lines.push(`## ${f.name}`, `;; search: ${f.search}`);
    if (!picks.length) lines.push(';; nothing passed the filters');
    for (const p of picks) {
      lines.push(`;; ${p.likeCount || 0} likes, @${p.author.handle}: ${p.record.text.replace(/\s+/g, ' ').slice(0, 200)}`);
      lines.push(`post: https://bsky.app/profile/${p.author.handle}/post/${p.uri.split('/').pop()}`);
    }
    lines.push(''); total += picks.length;
    console.log(`${f.name}: ${picks.length} candidates`);
    await sleep(700);
  }
  fs.writeFileSync(OUT, lines.join('\n'));
  console.log(`\n${total} candidates written to ${OUT}`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
