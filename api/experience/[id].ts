import type { IncomingMessage, ServerResponse } from 'node:http';
import { sendPage, unavailablePage } from '../_render/document.js';
import { renderNotePage } from '../_render/note.js';

// GET /experience/:id — rewritten here by vercel.json.
//
// A Node serverless function, NOT middleware.ts. Three reasons, all of them
// disqualifying for the edge:
//
//   • the edge runtime has a hard 25s ceiling, and a cold render is 1+N
//     upstream reads;
//   • middleware runs BEFORE rewrites, so a middleware that answered this path
//     would pre-empt every rewrite rather than participate in them;
//   • middleware's matcher covered /experience/:path* to serve social crawlers
//     an Open Graph document. That branch is gone: this renderer emits the
//     OG tags for everyone, which is strictly better — one document, no
//     meta-refresh, no crawler-specific content.

export const config = {
  // A cold render is one post read plus one hints read per question, four in
  // flight. Measured at ~0.4s; the ceiling is here for the pathological case
  // of a note with 30 questions and a slow upstream, and it stays well under
  // any client timeout.
  maxDuration: 30,
};

/**
 * The note id from the rewritten request.
 *
 * Read from the injected `id` query parameter when Vercel provides it, and
 * otherwise from the last path segment. Both, because the two differ between
 * `vercel dev` and production, and an id read from the wrong place is a 404 on
 * a page that exists.
 */
function noteId(req: IncomingMessage): string {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const fromQuery = url.searchParams.get('id');
  if (fromQuery) return fromQuery;
  const segments = url.pathname.split('/').filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1] ?? '');
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const id = noteId(req);
  if (!id) {
    // No id at all means the rewrite is misconfigured, not that a note is
    // missing — 503 keeps the URLs in the index while it is fixed.
    sendPage(res, unavailablePage());
    return;
  }
  try {
    sendPage(res, await renderNotePage(req, id));
  } catch (err) {
    console.error(`[api/experience] ${id} failed:`, err);
    sendPage(res, unavailablePage());
  }
}
