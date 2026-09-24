import type { IncomingMessage } from 'node:http';

// Route parameters out of a rewritten request.
//
// Read from the path, by the segment that precedes them, rather than by
// position or from req.query. Position is wrong the moment a route gains a
// second parameter (/interview-questions/:company/page/:n, where "the last
// segment" is the page number), and req.query is not on IncomingMessage and is
// populated differently by `vercel dev` and by production. The preceding
// segment is stable in both: the URL reaching this function is either the
// source path (/interview-questions/google/page/3) or the rewrite destination
// (/api/interview-questions/google/page/3), and every parameter below sits
// immediately after a literal segment that appears in both.
//
// The query string is still checked first, so an explicitly-passed parameter
// wins where one exists.

function parse(req: IncomingMessage): URL {
  return new URL(req.url ?? '/', 'http://localhost');
}

/**
 * The path segment immediately after `marker`, url-decoded, or '' if there is
 * none. `query` names the query parameter to prefer when present.
 */
export function segmentAfter(req: IncomingMessage, marker: string, query = marker): string {
  const url = parse(req);
  const fromQuery = url.searchParams.get(query);
  if (fromQuery) return fromQuery;
  const segments = url.pathname.split('/').filter(Boolean);
  const at = segments.indexOf(marker);
  if (at < 0) return '';
  try {
    return decodeURIComponent(segments[at + 1] ?? '');
  } catch {
    // A malformed %-escape is a URL nothing produced; treat it as absent so the
    // caller answers 404 rather than throwing a 500.
    return '';
  }
}

/**
 * A 1-based page number from the segment after `page`, or null when the value
 * is not one.
 *
 * Strict on purpose: /page/0, /page/01, /page/abc and /page/1e3 are URLs
 * nothing links to, and answering any of them with real content would mint an
 * unbounded set of duplicates that a crawler is perfectly capable of finding.
 * The five-digit cap is well past the largest company (Meta, 238 pages).
 */
export function pageNumber(req: IncomingMessage): number | null {
  const raw = segmentAfter(req, 'page', 'n');
  if (!/^[1-9][0-9]{0,4}$/.test(raw)) return null;
  return Number(raw);
}
