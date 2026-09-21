import type { IncomingMessage, ServerResponse } from 'node:http';
import { esc, join } from './html';

// Document assembly and the response contract, shared by every request-time
// renderer.
//
// ── The response contract ──────────────────────────────────────────────────
//
// A URL under /experience/** or /interview-questions/** may answer with
// exactly one of three things, and the SPA shell is not among them:
//
//   200  the record exists and is PUBLISHED      s-maxage=86400, swr=604800
//   404  no such record, or not PUBLISHED        s-maxage=60
//   503  upstream unreachable or too slow        no-store + Retry-After
//
// The shell is what this whole renderer exists to stop serving: 3,188 bytes,
// ten words, no h1, no canonical, no robots meta — byte-identical to the
// response for a slug that does not exist, which is why 181 advertised company
// URLs were indistinguishable from typos.
//
// 503 must be no-store. Caching one upstream blip at the edge turns a bad
// second into hours of a page being unavailable, and the CDN would keep serving
// it long after the backend recovered.

export const SITE_URL = (process.env.VITE_SITE_URL || 'https://www.screna.ai').replace(/\/$/, '');

export interface Rendered {
  status: 200 | 404 | 503;
  html: string;
}

export function sendPage(res: ServerResponse, page: Rendered): void {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (page.status === 200) {
    // A day at the edge, a week of stale-while-revalidate. Notes are edited
    // rarely and the daily sitemap rebuild is what picks up new ones, so the
    // long window costs nothing and keeps the 1+N upstream reads a one-off.
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
  } else if (page.status === 404) {
    // Short, so an unpublished note that goes live is servable within a minute
    // rather than after a day of cached 404s.
    res.setHeader('Cache-Control', 's-maxage=60');
  } else {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Retry-After', '120');
  }
  res.statusCode = page.status;
  res.end(page.html);
}

// ─── The shell ──────────────────────────────────────────────────────────────

let shellCache: Promise<string> | null = null;

function originOf(req: IncomingMessage): string {
  const header = (name: string): string => {
    const v = req.headers[name];
    return (Array.isArray(v) ? v[0] : v ?? '').split(',')[0].trim();
  };
  const host = header('x-forwarded-host') || header('host');
  const proto = header('x-forwarded-proto') || 'https';
  return `${proto}://${host}`;
}

/**
 * The untouched SPA shell for THIS deployment, fetched once per instance.
 *
 * Fetched over HTTP from our own origin rather than read off disk, because a
 * serverless bundle and the static output are built separately: the function
 * cannot see dist/, and hardcoding the hashed asset filenames would break on
 * the next build. `/app.html` is a static file on the same deployment as this
 * function, so what comes back always carries the matching bundle — that is
 * the version-safety property, not a convenience.
 *
 * It is app.html, not index.html: index.html is overwritten by the home page
 * snapshot during the build (see scripts/prerender.mjs constraint 2), so it is
 * a rendered page rather than a shell.
 *
 * A rejection is not cached — one failed cold start would otherwise pin this
 * instance to 503 for its whole life.
 */
async function loadShell(req: IncomingMessage): Promise<string> {
  if (!shellCache) {
    const url = `${originOf(req)}/app.html`;
    shellCache = fetch(url, { signal: AbortSignal.timeout(6000) })
      .then(async (res) => {
        if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
        const html = await res.text();
        if (!html.includes('<div id="root"></div>')) {
          throw new Error(`${url}: not an SPA shell (no empty #root)`);
        }
        return html;
      })
      .catch((err) => {
        shellCache = null;
        throw err;
      });
  }
  return shellCache;
}

/**
 * Drop every per-page tag the shell hardcodes, so the ones this render writes
 * are the only ones in the document.
 *
 * index.html ships the home page's title, description, canonical, Open Graph
 * set, Twitter set and a site-wide WebApplication JSON-LD. Appending ours
 * without removing those leaves two of each: two og:titles is a coin flip for
 * an unfurler, and two canonicals is treated by Google as none.
 *
 * What survives is everything that is genuinely site-wide — charset, viewport,
 * the favicon set, the webmanifest, the font preconnects, og:site_name,
 * og:locale — plus the built <script> and <link rel=stylesheet> for the
 * bundle, which is the part that must not be touched.
 *
 * twitter:card is stripped even though the shell's value is the one we want,
 * so that renderHead is the sole author of the whole twitter: set. Leaving it
 * produced two identical tags, which is harmless until the day the two values
 * differ.
 */
function stripShellHead(shell: string): string {
  return shell
    .replace(/[ \t]*<title>[\s\S]*?<\/title>\r?\n?/i, '')
    .replace(/[ \t]*<meta\s+name="description"[^>]*>\r?\n?/i, '')
    .replace(/[ \t]*<meta\s+name="keywords"[^>]*>\r?\n?/i, '')
    .replace(/[ \t]*<link\s+rel="canonical"[^>]*>\r?\n?/gi, '')
    .replace(/[ \t]*<meta\s+property="og:(title|description|image|url|type)"[^>]*>\r?\n?/gi, '')
    .replace(/[ \t]*<meta\s+name="twitter:(card|title|description|image|url)"[^>]*>\r?\n?/gi, '')
    .replace(/[ \t]*<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>\r?\n?/gi, '')
    // Neither should be in the shell; both are stripped anyway so this renderer
    // and the build-time snapshots have one cleanup rule between them.
    .replace(
      /[ \t]*<script[^>]*src="[^"]*(posthog|\/static\/recorder|array\.js)[^"]*"[^>]*>\s*<\/script>\r?\n?/gi,
      '',
    )
    .replace(/\s+data-seo-ready="[^"]*"/gi, '');
}

export interface HeadInput {
  title: string;
  description: string;
  /** Path beginning with `/`, no origin. canonical = SITE_URL + path. */
  canonicalPath: string;
  noindex: boolean;
  type?: 'website' | 'article';
  image?: string;
  jsonLd?: Record<string, unknown>[];
}

/**
 * The per-page head, in the same shape src/hooks/useSeo.ts writes on the
 * client — same tags, same values, same `noindex, follow` wording.
 *
 * The two must agree because both run on every visit: this one is in the HTML
 * a crawler reads, and useSeo rewrites the head moments later when the bundle
 * boots. A crawler that renders the page sees the second version, so a
 * disagreement between them is a page that says two different things about
 * itself depending on how long you look at it.
 *
 * `follow` on the noindex pages, never `nofollow`: a note that does not earn an
 * index entry still links to its company page, and severing that is pure loss.
 */
export function renderHead(input: HeadInput): string {
  const url = `${SITE_URL}${input.canonicalPath}`;
  const image = input.image ?? `${SITE_URL}/og-image.png`;
  const t = esc(input.title);
  const d = esc(input.description);
  return join(
    `<title>${t}</title>`,
    `<meta name="description" content="${d}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta name="robots" content="${input.noindex ? 'noindex, follow' : 'index, follow'}">`,
    `<meta property="og:type" content="${esc(input.type ?? 'website')}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:title" content="${t}">`,
    `<meta property="og:description" content="${d}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:url" content="${esc(url)}">`,
    `<meta name="twitter:title" content="${t}">`,
    `<meta name="twitter:description" content="${d}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
    ...(input.jsonLd ?? []).map(
      (obj) =>
        `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`,
    ),
  );
}

/**
 * Put a rendered page inside this deployment's shell.
 *
 * The body goes INSIDE #root, and the seeds after it. That placement is the
 * client hand-off contract: createRoot() wipes #root on boot, which is exactly
 * what should happen to server markup the React tree is about to replace,
 * while a seed tag outside #root survives long enough for readPrerenderSeed()
 * to read it at module scope. Put the seeds inside and they would be gone
 * before the bundle evaluated; put the body outside and it would still be on
 * screen underneath the app.
 */
export async function composeDocument(
  req: IncomingMessage,
  { head, body, seeds = [] }: { head: string; body: string; seeds?: string[] },
): Promise<string> {
  const shell = stripShellHead(await loadShell(req));
  return shell
    .replace('</head>', `${head}</head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>${seeds.join('')}`);
}

// ─── The two non-200 documents ──────────────────────────────────────────────

/**
 * A real 404 page: the status code is the message, and the body is a way back
 * into the crawlable surface rather than a dead end.
 *
 * Self-contained markup with no shell fetch. Whatever made a record missing,
 * the origin may be the thing that is broken, and a 404 that depends on
 * another request to render can fail on its own.
 */
export function notFoundPage(message: string): Rendered {
  return {
    status: 404,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Not found | Screna AI</title>
<meta name="robots" content="noindex, follow">
<style>body{margin:0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1f2430;background:#f9fafb}main{max-width:34rem;margin:0 auto;padding:6rem 1.5rem;text-align:center}h1{font-size:1.5rem;margin:0 0 .75rem}p{color:#5b6472;margin:0 0 1.5rem}a{color:#2563eb}</style>
</head>
<body>
<main>
<h1>This page is not available</h1>
<p>${esc(message)}</p>
<p><a href="/interview-questions">Browse interview questions by company</a></p>
</main>
</body>
</html>
`,
  };
}

/**
 * A 503 page. Paired with no-store and Retry-After by sendPage.
 *
 * This is the response for "we could not read the record", and it is
 * emphatically not a 404: 404 tells a search engine the page is gone and
 * evicts it from the index, so a minute of upstream trouble would cost every
 * URL it touched. 503 asks the crawler to come back.
 */
export function unavailablePage(): Rendered {
  return {
    status: 503,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Temporarily unavailable | Screna AI</title>
<meta name="robots" content="noindex, follow">
<style>body{margin:0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1f2430;background:#f9fafb}main{max-width:34rem;margin:0 auto;padding:6rem 1.5rem;text-align:center}h1{font-size:1.5rem;margin:0 0 .75rem}p{color:#5b6472}</style>
</head>
<body>
<main>
<h1>Temporarily unavailable</h1>
<p>We could not load this page just now. Please try again in a couple of minutes.</p>
</main>
</body>
</html>
`,
  };
}
