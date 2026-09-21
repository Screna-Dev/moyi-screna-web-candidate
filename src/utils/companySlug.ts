// Company slug <-> display name, for the public interview-notes surface.
//
// The slug rule itself lives in scripts/routes.mjs so the sitemap function and
// the prerenderer share one implementation with the app; this module is the
// typed app-facing wrapper plus the part only the browser needs: turning a slug
// from the URL back into the exact display name the API indexes.

// Plain .mjs manifest, shared with scripts/ and api/ — see scripts/routes.mjs.
import {
  companySlug as slugifyImpl,
  flattenCompanyStats as flattenImpl,
  MIN_POSTS_FOR_PAGE as MIN_POSTS_IMPL,
} from '../../scripts/routes.mjs';
import { getPublicCompaniesStats } from '../services/CommunityService';

/** Company display name -> URL slug. One-way; see resolveCompanyName. */
export const companySlug = (name: string | null | undefined): string => slugifyImpl(name);

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
  category: string;
  postCount: number;
  recentPostCount: number;
  latestUpdatedAt: string | null;
};

export const flattenCompanyStats = (data: unknown): DirectoryCompany[] => flattenImpl(data);

// ─── slug -> display name ───────────────────────────────────────────────────
//
// Why this exists at all: the slug is lossy, so it cannot be inverted. The old
// approach title-cased the slug back into a name ('at-t' -> 'AT T') and sent
// that to the API, which then reported the company as not found. 18 of the 340
// companies in the library are affected, including Scale.ai (50 notes) and
// AT&T (16) — both well over the threshold for getting their own indexed page.
//
// So the name is looked up in the real company list instead. The list is one
// cacheable aggregate (the API guide recommends caching it), it is public, and
// the directory page already loads it — so in the common "browse the directory,
// click a company" flow it is warm before the company page mounts.

let directoryPromise: Promise<DirectoryCompany[]> | null = null;

/**
 * The public company list, fetched at most once per page load.
 *
 * Failures are not cached: a company page that loaded during a blip should be
 * able to resolve its name on the next attempt rather than being stuck with a
 * rejected promise for the rest of the session.
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
 * Best-effort slug -> display name, using a company list already in hand.
 * Returns null when the slug matches nothing, so callers can tell "no such
 * company" apart from "a name we guessed".
 */
export function matchCompanyName(slug: string, companies: DirectoryCompany[]): string | null {
  const want = companySlug(slug);
  if (!want) return null;
  for (const c of companies) {
    if (companySlug(c.company) === want) return c.company;
  }
  return null;
}

/**
 * Title-case a slug as a last resort, for the first paint and for slugs the
 * directory does not know.
 *
 * Words of three characters or fewer are upper-cased, which is right far more
 * often than not for this data ('ibm' -> 'IBM', 'at' -> 'AT') and wrong in the
 * ways documented on companySlug. Never send the result to the API when a
 * directory lookup is still pending — render it, then correct it.
 */
export function titleizeSlug(slug: string): string {
  return (slug || 'company')
    .split('-')
    .filter(Boolean)
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/**
 * Resolve a slug to the display name the API indexes, falling back to the
 * title-cased slug if the directory is unreachable or has no such company.
 */
export async function resolveCompanyName(slug: string): Promise<{ name: string; exact: boolean }> {
  try {
    const match = matchCompanyName(slug, await getCompanyDirectory());
    if (match) return { name: match, exact: true };
  } catch {
    // fall through to the guess
  }
  return { name: titleizeSlug(slug), exact: false };
}
