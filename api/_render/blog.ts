// The blog's Sanity dataset, as the request-time renderers see it. Public-read,
// so no token; same project and dataset as src/services/sanity.ts.
import { COMPANY_GUIDES_QUERY, sortCompanyGuides } from '../../scripts/routes.mjs';

const PROJECT = process.env.VITE_SANITY_PROJECT_ID || 'x5tgtd0h';
const DATASET = process.env.VITE_SANITY_DATASET || 'production';
const QUERY_URL = `https://${PROJECT}.apicdn.sanity.io/v2024-01-01/data/query/${DATASET}`;

export interface CompanyGuide {
  title: string;
  slug: string;
  publishedAt?: string;
}

/**
 * Blog posts tagged with this company, OA first then newest first.
 *
 * Best-effort: any failure is an empty list, never an UpstreamError. The guides
 * are a links block on a page that stands without them, so a slow Sanity must
 * not turn the company page into a 503.
 */
export async function fetchCompanyGuides(slug: string): Promise<CompanyGuide[]> {
  const params = new URLSearchParams({
    query: COMPANY_GUIDES_QUERY,
    $company: JSON.stringify(slug),
  });
  try {
    const res = await fetch(`${QUERY_URL}?${params}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { result?: CompanyGuide[] };
    return sortCompanyGuides(json.result) as CompanyGuide[];
  } catch (err) {
    console.error(`[render:company] ${slug}: blog guides unavailable — ${(err as Error)?.message}`);
    return [];
  }
}
