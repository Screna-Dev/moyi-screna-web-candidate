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

// Community API origin for build-time seed fetches. Node-side, so no CORS.
const API_BASE = (process.env.VITE_API_PATH || 'https://api.screna.ai').replace(/\/$/, '');
const COMMUNITY = `${API_BASE}/api/v1/community/public`;

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
  const res = await fetchWithRetry(sanity('*[_type=="post"][0]{_id}'), { headers: { Origin: ORIGIN } });
  if (!res.ok) {
    throw new Error(
      `Sanity rejected origin ${ORIGIN} (HTTP ${res.status}). ` +
        `Add ${ORIGIN} under manage.sanity.io -> API -> CORS origins.`,
    );
  }
}

/**
 * fetch with a bounded retry on connection-level failures.
 *
 * The community API drops connections intermittently — measured at roughly
 * three failures in four one afternoon, recovering on its own. A single
 * attempt turns that into a failed build, and the company-links tripwire below
 * makes that failure hard rather than a warning, so one dropped connection
 * would block a deploy for reasons that have nothing to do with the commit.
 *
 * Only retries throws (DNS, connection reset, timeout). An HTTP status is an
 * answer: a 404 means the route is not deployed and retrying it four times
 * just makes the build slower before it reports the same thing.
 */
async function fetchWithRetry(url, opts = {}, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fetch(url, opts);
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        const backoffMs = 500 * 2 ** i;
        console.warn(`[prerender] ${url} failed (${err.message}); retrying in ${backoffMs}ms`);
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }
  }
  throw lastErr;
}

let statsCache;
/** GET /community/public/companies/stats, fetched at most once per build. */
async function companyStats() {
  if (statsCache !== undefined) return statsCache;
  try {
    const res = await fetchWithRetry(`${COMMUNITY}/companies/stats`, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      console.warn(`[prerender] company stats HTTP ${res.status} from ${COMMUNITY} — no company seeds`);
      statsCache = null;
    } else {
      const json = await res.json();
      statsCache = json.data ?? json;
    }
  } catch (err) {
    console.warn(`[prerender] company stats unreachable (${err.message}) — no company seeds`);
    statsCache = null;
  }
  return statsCache;
}

// Company pages are no longer snapshotted either: /interview-questions/:company
// and its /page/:n children are rendered per request by
// api/interview-questions/[company].ts. The first wave was ten companies, the
// sitemap advertised 191, and the other 181 answered with the SPA shell —
// rendering per request removes the gap between "advertised" and "built"
// instead of keeping two slices in step by hand. It also lets all ~700
// companies have a page, which is what gives the ~1,388 notes at the smaller
// companies a crawl path.
//
// The directory page (/interview-questions) IS still snapshotted, and still
// needs its seed: its grid plus the full company list at its foot are the only
// links into the company pages, and the snapshot browser cannot reach the API.

async function blogRoutes() {
  const res = await fetchWithRetry(
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

// Single notes are no longer snapshotted: /experience/:id is rendered per
// request by api/experience/[id].ts. A snapshot cost one page load plus 1+N API
// requests per note, which capped the surface at a 40-note first wave and would
// have been ~18,700 page loads and ~90,000 requests to cover the library — on
// every deploy, including deploys that touch nothing on that page. Anything
// left in dist/experience/ would also SHADOW the rewrite, since static files
// win over rewrites, so removing the routes is what makes the renderer live.
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

/**
 * Plant a JSON payload in the DOM before any page script runs, so a module
 * reading it at import time (readPrerenderSeed) finds it already there.
 *
 * evaluateOnNewDocument runs at document-start, which is EARLIER than
 * documentElement existing — <html> has not been parsed yet, so a naive
 * `document.documentElement.appendChild` throws, the seed never lands, and the
 * page silently falls back to fetching (which cannot work here: the preview
 * server mounts no API proxy). So: try once, and if there is no documentElement
 * yet, attach the moment the parser creates it.
 */
const plantSeed = (page, id, data) =>
  page.evaluateOnNewDocument(
    ([elId, json]) => {
      const plant = () => {
        if (!document.documentElement) return false;
        if (document.getElementById(elId)) return true;
        const s = document.createElement('script');
        s.id = elId;
        s.type = 'application/json';
        s.textContent = json;
        document.documentElement.appendChild(s);
        return true;
      };
      if (!plant()) {
        const obs = new MutationObserver(() => {
          if (plant()) obs.disconnect();
        });
        obs.observe(document, { childList: true, subtree: true });
      }
    },
    // A literal `</script` would close the tag early when the snapshot is
    // re-parsed, same hazard as inject() below.
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

    // Company pages get their payload planted before any page script runs.
    //
    // This is the opposite order from the blog seeds below, and the difference
    // matters: those pages fetch their own content from Sanity (reachable from
    // the browser), so their seed only exists to stop a flash on the client.
    // A company page cannot fetch anything — the preview server has no API
    // proxy — so unless the data is already in the DOM when the module
    // evaluates, the snapshot renders an empty page. readPrerenderSeed runs at
    // module scope, so the tag has to exist before the bundle does.
    // The directory's company grid is the crawler's only route from this page
    // to the company pages, and it comes from the same unreachable API.
    let directoryPayload = null;
    if (route === '/interview-questions') {
      directoryPayload = await companyStats();
      if (!directoryPayload) {
        warnings.push(`${route}: no seed — company grid will be empty, so nothing links to the company pages`);
      } else {
        await plantSeed(page, '__prerender_directory__', { stats: directoryPayload });
      }
    }

    await page.goto(`${ORIGIN}${route}`, { waitUntil: 'load', timeout: 30_000 });
    await page.waitForFunction(
      () => document.documentElement.getAttribute('data-seo-ready') === '1',
      { timeout: 20_000 },
    );

    // readPrerenderSeed consumes the tag on read, so the pre-navigation copy is
    // gone from the DOM by now. Re-inject it into the captured HTML: without
    // this the shipped snapshot shows the notes, then the client boots, finds
    // no seed, and blanks the page to refetch.
    if (directoryPayload) await inject(page, '__prerender_directory__', { stats: directoryPayload });

    if (route === '/blog') {
      const res = await fetchWithRetry(
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
      const res = await fetchWithRetry(
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

    const { words, blogLinks, companyLinks, companyIndexLinks, title } = await page.evaluate(() => {
      const clone = document.body.cloneNode(true);
      clone.querySelectorAll('script,style,noscript').forEach((n) => n.remove());
      return {
        words: (clone.textContent || '').trim().split(/\s+/).filter(Boolean).length,
        blogLinks: document.querySelectorAll('a[href^="/blog/"]').length,
        // Grid cards only. A plain href^="/interview-questions/" scan also
        // matches the category tiles' hardcoded example chips, which render
        // with or without data and would mask an empty grid.
        companyLinks: document.querySelectorAll('a[data-company-card]').length,
        // The full company index at the foot of the directory. Separate from
        // the grid above it: the grid is a shortlist the client slices to 27
        // cards, so a healthy card count says nothing about whether the ~700
        // company pages are linked at all.
        companyIndexLinks: document.querySelectorAll('a[data-company-index]').length,
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
    // Same reasoning, and learned the hard way: the directory's word count is
    // mostly chrome (hero, category tiles, the Quick Mock panel), so an empty
    // company grid still clears the floor. The floor is not the tripwire here —
    // the links are. Without them this page is a dead end: the sitemap still
    // advertises the company pages, but nothing on the site points at them.
    if (route === '/interview-questions' && companyLinks === 0) {
      failures.push(
        '/interview-questions: snapshot contains 0 company links — the grid is empty ' +
          '(company stats unreachable at build time; check the warning above)',
      );
    }
    // The company pages are rendered per request, so this snapshot is the only
    // place a crawler can learn that they exist. The grid is a shortlist; the
    // index at the foot of the page is the complete set, and it is the one that
    // has to be there. 100 is a floor well under the ~700 companies in the
    // library and well over anything a partial render would produce.
    if (route === '/interview-questions' && companyIndexLinks < 100) {
      failures.push(
        `/interview-questions: company index has ${companyIndexLinks} links (expected ~700) — ` +
          'most company pages would have nothing linking to them',
      );
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
