// Build-time prerendering for the public pages.
//
// The app cannot be server-rendered as-is (window/localStorage are touched at
// module scope in main.tsx / App.tsx / AuthContext), so instead of an SSR
// rewrite we build normally, serve dist with `vite preview`, drive a headless
// Chromium over every public route, and write the rendered DOM to disk. The
// client still boots with createRoot and replaces everything — no hydration,
// no component changes.
//
// Four constraints shape the code below; each has a comment at its site:
//   1. Sanity's CORS allowlist contains :5173, not vite preview's default
//      :4173 — the wrong port 403s every blog query.
//   2. dist/index.html is the SPA fallback shell for ~45 routes, so the home
//      page snapshot cannot be written over it. It is copied to app.html first.
//   3. @sparticuz/chromium ships headless-shell, which rejects --headless=new.
//   4. That binary is linux-x64 only; local runs need PUPPETEER_EXECUTABLE_PATH.

import path from 'node:path';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { preview } from 'vite';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { PRERENDER_STATIC, minWordsFor, SHELL } from './routes.mjs';

const DIST = path.resolve('dist');
// Constraint 1: :5173 is allowlisted in Sanity's CORS settings, :4173 is not.
const PORT = 5173;
const ORIGIN = `http://localhost:${PORT}`;
const PROJECT = process.env.VITE_SANITY_PROJECT_ID || 'x5tgtd0h';
const DATASET = process.env.VITE_SANITY_DATASET || 'production';
const API = `https://${PROJECT}.apicdn.sanity.io/v2024-01-01/data/query/${DATASET}`;
const PAGE_SIZE = 9; // must match blog-list.tsx

let SHELL_TITLE = ''; // default <title> from the shell, used to detect unwired pages

// Only set in the Vercel environment, so the value cannot be checked in the
// repo. `new URL('us.i.posthog.com')` throws, and this runs at module load —
// a bare hostname here would take the whole build down.
const POSTHOG_HOST = (() => {
  const raw = process.env.VITE_PUBLIC_POSTHOG_HOST;
  if (!raw) return null;
  try {
    return new URL(/^https?:\/\//.test(raw) ? raw : `https://${raw}`).hostname;
  } catch {
    console.warn(`[prerender] VITE_PUBLIC_POSTHOG_HOST unparseable (${raw}); falling back to regex match`);
    return null;
  }
})();

const sanity = (q) => `${API}?query=${encodeURIComponent(q)}`;

/** Fail fast on a CORS misconfiguration instead of after N × 20s timeouts. */
async function assertCors() {
  const res = await fetch(sanity('*[_type=="post"][0]{_id}'), { headers: { Origin: ORIGIN } });
  if (!res.ok) {
    throw new Error(
      `Sanity rejected origin ${ORIGIN} (HTTP ${res.status}). ` +
        `Add ${ORIGIN} under manage.sanity.io -> API -> CORS origins.`,
    );
  }
}

async function blogRoutes() {
  const res = await fetch(
    sanity('*[_type == "post" && defined(slug.current)]{"slug": slug.current}'),
    { headers: { Accept: 'application/json' } },
  );
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
  const { result = [] } = await res.json();
  if (result.length === 0) throw new Error('Sanity returned 0 posts');
  return result.map((p) => `/blog/${p.slug}`);
}

// Constraint 2. Must happen before the snapshot loop (which overwrites
// dist/index.html) and regardless of whether prerendering is skipped —
// otherwise every SPA route 404s.
{
  const shellSrc = await readFile(path.join(DIST, 'index.html'), 'utf8');
  // Local re-run guard: if dist was already snapshotted, index.html holds the
  // home page rather than the shell, and copying it would write home page
  // markup into app.html — exactly what this copy exists to prevent.
  if (!shellSrc.includes('<div id="root"></div>')) {
    throw new Error('dist/index.html is already a snapshot — re-run `vite build` before prerendering');
  }
  SHELL_TITLE = shellSrc.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  // The shell is reused by ~45 SPA routes, some of them publicly indexable
  // (/experience/:id). Shipping the home page's canonical with all of them
  // would declare the home page authoritative for every one — worse than
  // having no canonical at all.
  const shell = shellSrc
    .replace(/\s*<link rel="canonical"[^>]*>/, '')
    .replace(/\s*<meta property="og:url"[^>]*>/, '')
    .replace(/\s*<meta name="twitter:url"[^>]*>/, '');
  await writeFile(path.join(DIST, SHELL), shell, 'utf8');
}

// Escape hatch: if Sanity is down, set PRERENDER_SKIP=1 in the Vercel env and
// redeploy. The site degrades to pure CSR (i.e. how it was before this change)
// but the deploy is not blocked. Remove the variable once resolved.
if (process.env.PRERENDER_SKIP === '1') {
  console.warn(`[prerender] PRERENDER_SKIP=1 — skipping snapshots, wrote ${SHELL} only`);
  process.exit(0);
}

await assertCors();
const routes = [...PRERENDER_STATIC, ...(await blogRoutes())];

const server = await preview({
  preview: {
    port: PORT,
    strictPort: true,
    // Explicitly empty: don't inherit vite.config.ts's dev proxy to
    // api-staging during a production build.
    proxy: {},
  },
});

// Constraint 4: the two launch profiles are not interchangeable. A full
// desktop Chrome hangs on @sparticuz/chromium's Lambda-tuned flags
// (--single-process / --no-zygote) and doesn't understand headless-shell's
// mode string, so the local path gets plain flags instead.
const LOCAL_CHROME = process.env.PUPPETEER_EXECUTABLE_PATH;
const browser = await puppeteer.launch(
  LOCAL_CHROME
    ? {
        executablePath: LOCAL_CHROME,
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      }
    : {
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        // Constraint 3: must not be `true`.
        headless: chromium.headless,
      },
);

/**
 * Inject a JSON payload the page can read as its initial state, so the client
 * doesn't blank the prerendered content out and refetch it. Node-side fetches
 * aren't subject to CORS, so this data comes straight from the API.
 */
const inject = (page, id, data) =>
  page.evaluate(
    ([elId, json]) => {
      const s = document.createElement('script');
      s.id = elId;
      s.type = 'application/json';
      s.textContent = json;
      document.body.appendChild(s);
    },
    // A literal `</script` in the JSON would close the tag early when the
    // snapshot is re-parsed: seed silently unusable, leftover JSON visible.
    [id, JSON.stringify(data).replace(/</g, '\\u003c')],
  );

const snapshots = [];
const failures = [];
const warnings = [];

for (const route of routes) {
  const page = await browser.newPage();
  try {
    // The production bundle carries a live PostHog key. Unblocked, every
    // build would fire ghost $pageview and attribution events on all ~24
    // routes — and the Sanity deploy hook makes every publish a build.
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      try {
        const h = new URL(req.url()).hostname;
        const blocked = POSTHOG_HOST ? h === POSTHOG_HOST : /posthog/i.test(h);
        if (blocked) req.abort();
        else req.continue();
      } catch {
        // A throw here leaves the request hanging until goto's 30s timeout
        // and reports a misleading error.
        req.continue();
      }
    });

    await page.goto(`${ORIGIN}${route}`, { waitUntil: 'load', timeout: 30_000 });
    await page.waitForFunction(
      () => document.documentElement.getAttribute('data-seo-ready') === '1',
      { timeout: 20_000 },
    );

    if (route === '/blog') {
      const res = await fetch(
        sanity(`{"posts": *[_type == "post" && defined(slug.current)] | order(publishedAt desc)[0...${PAGE_SIZE}]{
            _id, title, "slug": slug.current, excerpt, category, publishedAt, author, cover, seoTitle },
          "total": count(*[_type == "post" && defined(slug.current)]),
          "categories": array::unique(*[_type == "post" && defined(slug.current)].category)}`),
      );
      if (!res.ok) warnings.push(`${route}: seed query failed HTTP ${res.status}`);
      else await inject(page, '__prerender_posts__', (await res.json()).result);
    }

    if (route.startsWith('/blog/')) {
      const slug = route.slice('/blog/'.length);
      // Parameterised, not interpolated: a quote in a slug would silently
      // break the query and leave that post flashing on every visit.
      const res = await fetch(
        sanity(`*[_type == "post" && slug.current == $slug][0]{
           _id, title, "slug": slug.current, excerpt, category, publishedAt, author, cover, seoTitle, body
         }`) + `&%24slug=${encodeURIComponent(JSON.stringify(slug))}`,
      );
      const result = res.ok ? (await res.json()).result : null;
      if (!result) warnings.push(`${route}: no seed injected — this page will flash on load`);
      else await inject(page, '__prerender_post__', result);
    }

    await page.evaluate(() => {
      document.querySelectorAll('[data-prerender-strip]').forEach((n) => n.remove());
      // Also matches self-hosted reverse-proxy hostnames, which a plain
      // *posthog* check would miss.
      document
        .querySelectorAll('script[src*="posthog"],script[src*="/static/recorder"],script[src*="array.js"]')
        .forEach((n) => n.remove());
      document.documentElement.removeAttribute('data-seo-ready');
    });

    const { words, blogLinks, title } = await page.evaluate(() => {
      const clone = document.body.cloneNode(true);
      clone.querySelectorAll('script,style,noscript').forEach((n) => n.remove());
      return {
        words: (clone.textContent || '').trim().split(/\s+/).filter(Boolean).length,
        blogLinks: document.querySelectorAll('a[href^="/blog/"]').length,
        title: document.title,
      };
    });

    // Catches "this page never called useSeo": its title is still the shell's.
    // The home page is exempt — it deliberately reuses index.html's copy, so
    // its title matches SHELL_TITLE by design.
    if (!title) {
      failures.push(`${route}: empty title`);
    } else if (route !== '/' && title === SHELL_TITLE) {
      failures.push(`${route}: title is still the shell default "${title}" — page not wired to useSeo`);
    }

    const floor = minWordsFor(route);
    if (route.startsWith('/blog/')) {
      if (words < floor) warnings.push(`${route}: ${words} words (below ${floor})`);
    } else if (words < floor) {
      failures.push(`${route}: ${words} words < ${floor}`);
    }
    // The word threshold alone passes on nav + footer, so a skeleton screen
    // would slip through. Require real article links.
    if (route === '/blog' && blogLinks === 0) {
      failures.push('/blog: snapshot contains 0 article links (likely captured the skeleton)');
    }

    // Collect everything first, write at the end: writing mid-loop makes
    // `vite preview` serve the fresh snapshots as static files to later
    // requests, compounding renders.
    snapshots.push({ route, html: await page.content(), words });
    console.log(`[prerender] ${route} — ${words} words`);
  } catch (err) {
    failures.push(`${route}: ${err.message}`);
  } finally {
    await page.close();
  }
}

await browser.close();
await server.close();

for (const w of warnings) console.warn(`[prerender] WARN ${w}`);
if (failures.length) {
  console.error('[prerender] FAILED:\n' + failures.map((f) => '  - ' + f).join('\n'));
  process.exit(1);
}

for (const { route, html } of snapshots) {
  const outDir = route === '/' ? DIST : path.join(DIST, route);
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'index.html'), html, 'utf8');
}
console.log(`[prerender] wrote ${snapshots.length} pages + ${SHELL}`);
