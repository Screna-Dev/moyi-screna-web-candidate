import type { IncomingMessage, ServerResponse } from 'node:http';
import { notFoundPage, sendPage, unavailablePage } from '../../_render/document.js';
import { renderCompanyRolePage } from '../../_render/company.js';
import { segmentAfter } from '../../_render/params.js';

// GET /interview-questions/:company/:role — rewritten here by vercel.json.
//
// One company's notes for one role (scripts/routes.mjs, ROLE_SLUGS). Unknown
// and reserved role slugs answer 404 from the renderer. /:company/page/:n is
// three segments and goes to page/[n].ts; /:company/page lands here and 404s.

export const config = {
  maxDuration: 30,
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const slug = segmentAfter(req, 'interview-questions', 'company');
  // Two after `interview-questions`, not "after the slug": a company slug can
  // equal an earlier segment ('api' on the rewritten path).
  const role = segmentAfter(req, 'interview-questions', 'role', 2);
  if (!slug) {
    sendPage(res, unavailablePage());
    return;
  }
  if (!role) {
    sendPage(res, notFoundPage('There is no such role for this company.'));
    return;
  }
  try {
    sendPage(res, await renderCompanyRolePage(req, slug, role));
  } catch (err) {
    console.error(`[api/interview-questions] ${slug}/${role} failed:`, err);
    sendPage(res, unavailablePage());
  }
}
