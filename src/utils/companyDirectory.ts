// The public company directory, for the interview-notes surface.
//
// Company page URLs are the backend's `slug` (companies/stats and
// companies/profile both return it, and profile accepts ?slug=). Nothing here
// derives a slug from a name or a name from a slug: the backend owns that rule.
// This module is the typed app-facing wrapper around the shared stats parser in
// scripts/routes.mjs, plus a cached name -> slug lookup for places that only
// have a display name in hand (a note's `company`).

// Plain .mjs manifest, shared with scripts/ and api/ — see scripts/routes.mjs.
import {
  flattenCompanyStats as flattenImpl,
  MIN_POSTS_FOR_PAGE as MIN_POSTS_IMPL,
} from '../../scripts/routes.mjs';
import { getPublicCompaniesStats } from '../services/CommunityService';

/**
 * The note count above which a company earns an INDEXED page, re-exported
 * typed for the app.
 *
 * The same number the sitemap generator applies, which is the point: the
 * directory's featured grid and the sitemap should agree on which companies are
 * being put forward. Every company still gets a rendered page either way — see
 * the full list at the foot of the directory.
 */
export const MIN_POSTS_FOR_PAGE: number = MIN_POSTS_IMPL;

export type DirectoryCompany = {
  company: string;
  /** Company page URL segment; null when the company has no page. */
  slug: string | null;
  category: string;
  postCount: number;
  recentPostCount: number;
  latestUpdatedAt: string | null;
};

export const flattenCompanyStats = (data: unknown): DirectoryCompany[] => flattenImpl(data);

let directoryPromise: Promise<DirectoryCompany[]> | null = null;

/**
 * The public company list, fetched at most once per page load. The API guide
 * recommends caching it, and the directory page already loads it, so in the
 * common "browse the directory, open a note" flow it is warm.
 *
 * Failures are not cached: a page that loaded during a blip should be able to
 * look up a slug on the next attempt rather than being stuck with a rejected
 * promise for the rest of the session.
 */
export function getCompanyDirectory(): Promise<DirectoryCompany[]> {
  if (!directoryPromise) {
    directoryPromise = getPublicCompaniesStats()
      .then((res: { data?: { data?: unknown } }) => flattenCompanyStats(res.data?.data ?? res.data))
      .catch((err: unknown) => {
        directoryPromise = null;
        throw err;
      });
  }
  return directoryPromise;
}

/** Test seam — drops the memoised list. */
export function resetCompanyDirectoryCache() {
  directoryPromise = null;
}

/**
 * Display name -> the backend's slug, or null when the company is unknown, has
 * no slug, or the directory is unreachable. Callers must not link a company
 * page on null.
 */
export async function companySlugFor(name: string | null | undefined): Promise<string | null> {
  const want = (name ?? '').trim().toLowerCase();
  if (!want) return null;
  try {
    const rows = await getCompanyDirectory();
    return rows.find((c) => c.company?.trim().toLowerCase() === want)?.slug ?? null;
  } catch {
    return null;
  }
}
