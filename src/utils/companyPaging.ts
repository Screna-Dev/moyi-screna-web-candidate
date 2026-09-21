// Typed wrappers over the crawlable company pagination rules.
//
// The rules live in scripts/routes.mjs because three consumers apply them and
// they must agree exactly: api/_render/company.ts renders the page a crawler
// reads, this page re-renders the same window when the bundle boots, and
// scripts/sitemap.mjs decides what is advertised. Same arrangement, and same
// reason, as companySlug and postIndexing.

// Plain .mjs manifest, shared with scripts/ and api/ — see scripts/routes.mjs.
import {
  COMPANY_PAGE_SIZE as PAGE_SIZE_IMPL,
  companyPageCount as pageCountImpl,
  companyPageWindow as pageWindowImpl,
  companySeoTitle as seoTitleImpl,
  companySeoDescription as seoDescriptionImpl,
} from '../../scripts/routes.mjs';

/** Rows per page, fixed by the API (it ignores every page-size parameter). */
export const COMPANY_PAGE_SIZE: number = PAGE_SIZE_IMPL;

/** How many /page/:n URLs a company with this many notes has. */
export const companyPageCount = (total: number | null | undefined): number => pageCountImpl(total);

/**
 * The slice of the newest-first result set that /page/:n shows.
 *
 * The series runs oldest-first — see companyPageWindow in scripts/routes.mjs
 * for why, and why the arithmetic keeps naming the same notes as the library
 * grows.
 */
export const companyPageWindow = (
  total: number | null | undefined,
  page: number,
): { from: number; take: number } => pageWindowImpl(total, page);

/** <title> for a company page, or for one page of its archive. */
export const companySeoTitle = (name: string, page?: number | null): string =>
  seoTitleImpl(name, page ?? undefined);

/** meta description for a company page, or for one page of its archive. */
export const companySeoDescription = (
  name: string,
  noteCount: number,
  page?: number | null,
  pageCount?: number,
): string => seoDescriptionImpl(name, noteCount, page ?? undefined, pageCount);
