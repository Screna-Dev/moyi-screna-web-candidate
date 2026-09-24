// Build-time sitemap generation.
//
// Runs after `vite build` and writes a sitemap index plus its children into
// dist/, where Vercel serves them as static files. It replaces api/sitemap.ts,
// which computed the whole thing per request and was bounded by that: a
// per-request function cannot make thousands of upstream calls, so it scanned
// the newest 20 pages of notes — 200 rows — and advertised the best 40. The
// library is ~18,700 notes. The other ~18,660 were not merely unadvertised;
// nothing on the site linked to most of them either.
//
// Two constraints shape the scan:
//
//   1. It is sharded BY COMPANY. Site-wide paging cannot reach the library:
//      posts/search?page=1000 answers 500 and page >= 1001 answers 400, because
//      Elasticsearch's max_result_window is 10,000 and the page size is fixed
//      at 10. Per company the deepest is Meta at 238 pages, comfortably inside
//      it.
//   2. Every company is scanned, not just the ~191 that earn a page of their
//      own. The company threshold decides whether a COMPANY page is indexed; it
//      says nothing about the notes, and each note is its own page.
//
// Counting: the number of URLs here comes from what the scan returned (the
// Elasticsearch view, ~18,733). companies/stats reports ~18,820 because it is a
// database aggregate and index sync is asynchronous. The two are not
// reconcilable and must not be reconciled — stats is used for the company list
// and the company-page threshold only.

import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  PRERENDER_STATIC,
  companySlug,
  eligibleCompanies,
  flattenCompanyStats,
  isIndexablePost,
} from './routes.mjs';

const DIST = path.resolve('dist');
const SITE_URL = (process.env.VITE_SITE_URL || 'https://www.screna.ai').replace(/\/$/, '');
const API_BASE = (process.env.VITE_API_PATH || 'https://api.screna.ai').replace(/\/$/, '');
const COMMUNITY = `${API_BASE}/api/v1/community/public`;
const SANITY_PROJECT = process.env.VITE_SANITY_PROJECT_ID || 'x5tgtd0h';
const SANITY_DATASET = process.env.VITE_SANITY_DATASET || 'production';

// Companies scanned at once. The API dropped requests under heavier bursts
// during the note-seeding work (comment coverage fell from 39/39 notes to
// 6/39), and a dropped page here is silently missing URLs rather than an error.
const SHARD_CONCURRENCY = 8;

// Sitemaps allow 50,000 URLs per file; 10,000 keeps each one small enough to
// open and read, which matters when diagnosing a coverage report.
const MAX_URLS_PER_FILE = 10_000;

// A company with more pages than this is a bug, not a company: the public
// search endpoint stops answering past page 999 anyway.
const MAX_PAGES_PER_COMPANY = 999;

function xmlEscape(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** ISO-8601 for <lastmod>, or null when the value is not a usable date. */
function isoDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function urlEntry(loc, lastmod) {
  const mod = lastmod ? `\n    <lastmod>${xmlEscape(lastmod)}</lastmod>` : '';
  return `  <url>\n    <loc>${xmlEscape(loc)}</loc>${mod}\n  </url>`;
}

function urlset(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join(
    '\n',
  )}\n</urlset>\n`;
}

function sitemapIndex(files) {
  const now = new Date().toISOString();
  const entries = files.map(
    (f) =>
      `  <sitemap>\n    <loc>${xmlEscape(`${SITE_URL}/${f}`)}</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join(
    '\n',
  )}\n</sitemapindex>\n`;
}

/**
 * fetch with a bounded retry on connection-level failures.
 *
 * Only throws are retried. An HTTP status is an answer, and retrying a 400
 * four times just makes the build slower before it reports the same thing.
 */
async function fetchWithRetry(url, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fetch(url, { headers: { Accept: 'application/json' } });
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 500 * 2 ** i));
    }
  }
  throw lastErr;
}

async function getJson(url) {
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

/** Blog slugs, from the Sanity Content Lake. Node-side, so no CORS allowlist. */
async function blogPosts() {
  const query =
    '*[_type == "post" && defined(slug.current)] | order(publishedAt desc){"slug": slug.current, publishedAt, _updatedAt}';
  const url = `https://${SANITY_PROJECT}.apicdn.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}?query=${encodeURIComponent(
    query,
  )}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
  const { result = [] } = await res.json();
  return result;
}

/**
 * Every published note for one company, by walking its pages until one comes
 * back empty.
 *
 * Queried by the exact display name, url-encoded: 'AT&T' and 'Booking.com' are
 * real company names and an unencoded `&` truncates the query string, which
 * returns another company's notes rather than an error.
 */
async function companyNotes(name) {
  const rows = [];
  for (let page = 0; page <= MAX_PAGES_PER_COMPANY; page += 1) {
    const data = await getJson(
      `${COMMUNITY}/posts/search?${new URLSearchParams({ company: name, page: String(page) })}`,
    );
    const batch = Array.isArray(data?.posts) ? data.posts : [];
    if (batch.length === 0) break;
    rows.push(...batch);
    // The endpoint reports a cross-page total; stop as soon as it is covered
    // rather than spending one more request to see an empty page.
    const total = Number.isFinite(data?.total) ? data.total : null;
    if (total !== null && rows.length >= total) break;
  }
  return rows;
}

async function main() {
  const stats = await getJson(`${COMMUNITY}/companies/stats`);

  // Scanned by exact display name, deduplicated by name rather than by slug.
  // Merging to slugs first would drop notes: two rows whose names differ only
  // in punctuation ('Scale.ai' / 'Scale AI') collapse to one slug, and only one
  // of the two names would then be queried.
  const names = [...new Set(flattenCompanyStats(stats).map((c) => c.company).filter(Boolean))];

  // Company PAGES, on the other hand, are keyed by slug and gated on the note
  // threshold — one URL per company that earns an indexed page. The /page/:n
  // children are deliberately absent: they are navigation, and 1,832 list pages
  // would dilute a file whose purpose is to advertise the note pages they lead
  // to. Google follows their links without being told about them.
  const companies = eligibleCompanies(stats);

  const scanned = await mapLimit(names, SHARD_CONCURRENCY, async (name) => {
    try {
      return await companyNotes(name);
    } catch (err) {
      // One company's notes missing is a gap in coverage, not a reason to
      // publish no sitemap at all — but it must be visible in the build log.
      console.warn(`[sitemap] ${name}: scan failed (${err.message}) — its notes are not advertised`);
      return [];
    }
  });

  // Deduplicated by id: a note reached through two spellings of its company is
  // still one page.
  const byId = new Map();
  for (const row of scanned.flat()) {
    if (row?.id && !byId.has(row.id)) byId.set(row.id, row);
  }
  const allNotes = [...byId.values()];

  // The same gate the page applies (isIndexablePost), so the sitemap never
  // advertises a URL that answers with `noindex`.
  const notes = allNotes.filter((p) => isIndexablePost(p));

  const posts = await blogPosts();

  // ── Children ──
  const files = [];

  const staticEntries = [
    ...PRERENDER_STATIC.map((p) => urlEntry(`${SITE_URL}${p === '/' ? '/' : p}`)),
    ...posts.map((p) =>
      urlEntry(`${SITE_URL}/blog/${p.slug}`, isoDate(p._updatedAt ?? p.publishedAt)),
    ),
  ];
  files.push(['sitemap-static.xml', urlset(staticEntries)]);

  files.push([
    'sitemap-companies.xml',
    urlset(
      companies.map((c) =>
        urlEntry(`${SITE_URL}/interview-questions/${companySlug(c.company)}`, isoDate(c.latestUpdatedAt)),
      ),
    ),
  ]);

  // Notes split by the month they were last touched. Month, rather than a flat
  // numbered split, so a file's name says what changed: a rebuild rewrites the
  // current month and leaves the rest byte-identical, which is what lets a
  // crawler skip them.
  const months = new Map();
  for (const note of notes) {
    const stamp = isoDate(note.updatedAt ?? note.createdAt ?? note.date);
    const key = stamp ? stamp.slice(0, 7) : 'undated';
    if (!months.has(key)) months.set(key, []);
    months.get(key).push(urlEntry(`${SITE_URL}/experience/${note.id}`, stamp));
  }
  for (const key of [...months.keys()].sort()) {
    const entries = months.get(key);
    // A month over the cap is split into numbered parts. Not expected at
    // current volumes (the busiest month is far under 10,000) but a silent
    // oversized sitemap is rejected whole.
    for (let i = 0; i < entries.length; i += MAX_URLS_PER_FILE) {
      const part = entries.slice(i, i + MAX_URLS_PER_FILE);
      const suffix = i === 0 ? '' : `-${i / MAX_URLS_PER_FILE + 1}`;
      files.push([`sitemap-notes-${key}${suffix}.xml`, urlset(part)]);
    }
  }

  await mkdir(DIST, { recursive: true });
  for (const [name, xml] of files) {
    await writeFile(path.join(DIST, name), xml, 'utf8');
  }
  await writeFile(path.join(DIST, 'sitemap.xml'), sitemapIndex(files.map(([name]) => name)), 'utf8');

  const noteUrls = notes.length;
  console.log(
    `[sitemap] scanned ${names.length} companies -> ${allNotes.length} notes ` +
      `(${noteUrls} clear the content gate); ` +
      `${companies.length} company pages; ${posts.length} blog posts; ` +
      `${files.length} child sitemaps + index`,
  );
  if (noteUrls === 0) {
    // Publishing an index whose children are empty is worse than failing: it
    // replaces a working sitemap with one that tells Google the site has no
    // content.
    throw new Error('no note URLs passed the gate — refusing to publish an empty sitemap');
  }
}

// Failure must block the deploy. A deploy with no sitemap file is worse than no
// deploy: /sitemap.xml 404s, Search Console reports it unreadable, and every
// URL in it loses its only declaration. This step therefore runs BEFORE
// prerender.mjs, whose PRERENDER_SKIP escape hatch exits the process — from
// there it cannot skip a step that has already completed.
await main();
