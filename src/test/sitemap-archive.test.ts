import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// scripts/sitemap.mjs, run for real against a fake backend.
//
// The script runs main() on import and writes into ./dist, so it is executed
// as a child process in a temp directory with `fetch` replaced by a preload.
// Covers the company archive file (sitemap-company-pages.xml): which companies,
// which page numbers, lastmod, and that the rest of the sitemap is intact.

const SCRIPT = path.resolve('scripts/sitemap.mjs');

/**
 * The fake library. Notes are newest first, like the real endpoint, with
 * updatedAt counting down one day per note from 2026-09-30.
 *   Meta      25 notes  → pages 2 and 3 (last page holds 5)
 *   Snap      21 notes  → page 2 only; page 3 holds ONE note and is skipped
 *   Tiny       3 notes  → below the page threshold, no archive at all
 *   Broken    15 notes  → its scan fails, so it lists nothing
 */
const FAKE_BACKEND = `
const COUNTS = { Meta: 25, Snap: 21, Tiny: 3, Broken: 15 };
const day = (i) => new Date(Date.UTC(2026, 8, 30) - i * 864e5).toISOString();
const json = (data, status = 200) =>
  new Response(JSON.stringify({ data }), { status, headers: { 'Content-Type': 'application/json' } });
globalThis.fetch = async (input) => {
  const url = new URL(String(input));
  if (url.hostname.endsWith('sanity.io')) {
    return new Response(JSON.stringify({ result: [{ slug: 'hello', publishedAt: '2026-01-01' }] }));
  }
  if (url.pathname.endsWith('/companies/stats')) {
    return json({ categories: [{ category: 'Tech', companies: Object.entries(COUNTS).map(
      ([company, postCount]) => ({ company, postCount, latestUpdatedAt: day(0) })) }] });
  }
  if (url.pathname.endsWith('/posts/search')) {
    const company = url.searchParams.get('company');
    const page = Number(url.searchParams.get('page'));
    if (company === 'Broken') return new Response('down', { status: 500 });
    const total = COUNTS[company] ?? 0;
    const posts = Array.from({ length: total }, (_, i) => ({
      id: company + '-' + (total - i),
      company,
      updatedAt: day(i),
      // Meta-25 got its seoTitle after its last edit; Meta-24 before it.
      seoTitleUpdatedAt:
        company === 'Meta' && i === 0 ? '2026-10-20T00:00:00.000Z'
        : company === 'Meta' && i === 1 ? '2026-01-01T00:00:00.000Z'
        : undefined,
      questions: [{ title: 'Q', notes: 'One sentence.' }],
    })).slice(page * 10, page * 10 + 10);
    return json({ posts, total, size: 10, page });
  }
  return new Response('not found', { status: 404 });
};
`;

let dir: string;
let dist: string;
let log: string;

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'sitemap-test-'));
  dist = path.join(dir, 'dist');
  const preload = path.join(dir, 'fake-backend.mjs');
  writeFileSync(preload, FAKE_BACKEND);
  log = execFileSync(process.execPath, ['--import', preload, SCRIPT], {
    cwd: dir,
    env: { ...process.env, VITE_SITE_URL: 'https://www.screna.ai', VITE_API_PATH: 'https://api.test' },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}, 60_000);

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const read = (name: string) => readFileSync(path.join(dist, name), 'utf8');
const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const archiveUrls = () => locs(read('sitemap-company-pages.xml'));

describe('sitemap — company archive pages', () => {
  it('lists the archive file in the sitemap index', () => {
    expect(locs(read('sitemap.xml'))).toContain('https://www.screna.ai/sitemap-company-pages.xml');
  });

  it('lists pages 2..n for companies over the threshold, and nothing else', () => {
    expect(archiveUrls()).toEqual([
      'https://www.screna.ai/interview-questions/meta/page/2',
      'https://www.screna.ai/interview-questions/meta/page/3',
      'https://www.screna.ai/interview-questions/snap/page/2',
    ]);
  });

  it('never lists page 1 — its canonical is the company page', () => {
    expect(archiveUrls().some((u) => u.endsWith('/page/1'))).toBe(false);
  });

  it('leaves out a last page holding a single note', () => {
    expect(archiveUrls()).not.toContain('https://www.screna.ai/interview-questions/snap/page/3');
  });

  it('leaves out a company below the page threshold', () => {
    expect(archiveUrls().some((u) => u.includes('/tiny/'))).toBe(false);
  });

  it('leaves out a company whose scan failed, and says so in the log', () => {
    expect(archiveUrls().some((u) => u.includes('/broken/'))).toBe(false);
  });

  it("stamps each page with the newest note in that page's window", () => {
    // Meta, 25 notes newest-first (index i updated on day i). Page 2 is the
    // window from index 5 to 14 → newest is index 5; page 3 is index 0..4 → 0.
    const xml = read('sitemap-company-pages.xml');
    const lastmodOf = (url: string) =>
      xml.match(new RegExp(`<loc>${url.replace(/[/.]/g, '\\$&')}</loc>\\s*<lastmod>([^<]+)</lastmod>`))?.[1];
    const day = (i: number) => new Date(Date.UTC(2026, 8, 30) - i * 864e5).toISOString();
    expect(lastmodOf('https://www.screna.ai/interview-questions/meta/page/2')).toBe(day(5));
    expect(lastmodOf('https://www.screna.ai/interview-questions/meta/page/3')).toBe(day(0));
  });

  it('logs the archive URL count', () => {
    expect(log).toMatch(/3 company archive pages/);
  });

  it('still writes the other children', () => {
    const files = readdirSync(dist);
    expect(files).toEqual(expect.arrayContaining(['sitemap-static.xml', 'sitemap-companies.xml']));
    expect(files.some((f) => f.startsWith('sitemap-notes-'))).toBe(true);
    expect(locs(read('sitemap-companies.xml'))).toEqual([
      'https://www.screna.ai/interview-questions/meta',
      'https://www.screna.ai/interview-questions/snap',
      // Broken clears the threshold from stats even though its scan failed;
      // the company page itself is still listed.
      'https://www.screna.ai/interview-questions/broken',
    ]);
  });
});

describe('sitemap — note lastmod and seoTitleUpdatedAt', () => {
  const day = (i: number) => new Date(Date.UTC(2026, 8, 30) - i * 864e5).toISOString();
  const lastmodOf = (xml: string, id: string) =>
    xml.match(new RegExp(`<loc>https://www\\.screna\\.ai/experience/${id}</loc>\\s*<lastmod>([^<]+)</lastmod>`))?.[1];

  it('takes seoTitleUpdatedAt when it is the later of the two, and stays in its own month file', () => {
    const xml = read('sitemap-notes-2026-09.xml');
    expect(lastmodOf(xml, 'Meta-25')).toBe('2026-10-20T00:00:00.000Z');
    expect(readdirSync(dist).some((f) => f.startsWith('sitemap-notes-2026-10'))).toBe(false);
  });

  it('keeps the note date when seoTitleUpdatedAt is older or absent', () => {
    const xml = read('sitemap-notes-2026-09.xml');
    expect(lastmodOf(xml, 'Meta-24')).toBe(day(1));
    expect(lastmodOf(xml, 'Meta-23')).toBe(day(2));
  });
});
