import type { IncomingMessage, ServerResponse } from 'node:http';
import { notFoundPage, sendPage, unavailablePage } from '../../../_render/document.js';
import { renderCompanyPage } from '../../../_render/company.js';
import { pageNumber, segmentAfter } from '../../../_render/params.js';

// GET /interview-questions/:company/page/:n — rewritten here by vercel.json.
//
// The crawlable half of a company's notes. A company page shows its ten newest
// and offers "Load more", which is a button: a crawler never presses it, so
// ten notes per company was the whole of what anything could reach. These URLs
// expose the rest as ordinary links.
//
// They are navigation, not content, and deliberately absent from the sitemap —
// 1,832 list pages would dilute a file whose job is to advertise the ~18,700
// note pages they lead to. Their value is the href, and Google follows those
// without being told.

export const config = {
  maxDuration: 30,
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const slug = segmentAfter(req, 'interview-questions', 'company');
  const n = pageNumber(req);
  if (!slug) {
    sendPage(res, unavailablePage());
    return;
  }
  // A page number that is not a positive integer is a URL nothing links to.
  // 404, rather than silently serving page 1 under it.
  if (n === null) {
    sendPage(res, notFoundPage('There is no such page of notes for this company.'));
    return;
  }
  try {
    sendPage(res, await renderCompanyPage(req, slug, n));
  } catch (err) {
    console.error(`[api/interview-questions] ${slug} page ${n} failed:`, err);
    sendPage(res, unavailablePage());
  }
}
