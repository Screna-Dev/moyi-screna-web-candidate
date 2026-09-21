import type { IncomingMessage, ServerResponse } from 'node:http';
import { sendPage, unavailablePage } from '../_render/document';
import { renderCompanyPage } from '../_render/company';
import { segmentAfter } from '../_render/params';

// GET /interview-questions/:company — rewritten here by vercel.json.
//
// Every company in the library is rendered here, not just the ones that clear
// the indexing threshold, and none of them are snapshotted at build time any
// more. The old first wave was ten pages; the sitemap advertised 191 and the
// other 181 answered with the SPA shell. Rendering per request removes the
// difference between "advertised" and "built" rather than keeping the two
// numbers in step by hand.

export const config = {
  maxDuration: 30,
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const slug = segmentAfter(req, 'interview-questions', 'company');
  if (!slug) {
    sendPage(res, unavailablePage());
    return;
  }
  try {
    sendPage(res, await renderCompanyPage(req, slug, null));
  } catch (err) {
    console.error(`[api/interview-questions] ${slug} failed:`, err);
    sendPage(res, unavailablePage());
  }
}
