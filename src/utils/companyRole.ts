// Typed wrappers over the company × role page rules
// (/interview-questions/:company/:role).
//
// The rules live in scripts/routes.mjs because api/_render/company.ts renders
// the page a crawler reads, scripts/sitemap.mjs decides which combinations are
// advertised, and this page re-renders the same head tags on boot. Same
// arrangement as companyPaging and companyBreakdown.

// Plain .mjs manifest, shared with scripts/ and api/ — see scripts/routes.mjs.
import {
  MIN_POSTS_FOR_ROLE_PAGE as MIN_POSTS_IMPL,
  ROLE_SLUGS,
  companyRoleGuidesHeading as guidesHeadingImpl,
  companyRoleIntro as introImpl,
  companyRoleJsonLd as jsonLdImpl,
  companyMoreRoles as moreImpl,
  companyRoleLinks as linksImpl,
  companyRoleSeoDescription as seoDescriptionImpl,
  companyRoleSeoTitle as seoTitleImpl,
  isIndexableRole as indexableImpl,
  roleLabelForSlug as labelImpl,
  roleSlugForLabel as slugImpl,
  showRoleBar as showBarImpl,
} from '../../scripts/routes.mjs';
import { getPublicCompanyRoleStats, getPublicPosts, normalizePublicPosts } from '@/services/CommunityService';

/** One row of companies/roles/stats. */
export type RoleStatRow = { company?: string; role?: string; postCount?: number };

/** One entry of the role links: URL segment, label, note count. */
export type RoleLink = { slug: string; label: string; count: number };

/** Notes a company × role page needs to be indexed. */
export const MIN_POSTS_FOR_ROLE_PAGE: number = MIN_POSTS_IMPL;

/** 10+ notes and under 90% of the company's: the role has an indexed page. */
export const isIndexableRole = (count: number | null | undefined, companyTotal: number | null | undefined): boolean =>
  indexableImpl(count, companyTotal);

/** Roles that clear isIndexableRole, most notes first. */
export const companyRoleLinks = (counts: Record<string, number>, companyTotal: number | null | undefined): RoleLink[] =>
  linksImpl(counts, companyTotal);

/** The "More roles" fold: the company's other slugged roles, most notes first. */
export const companyMoreRoles = (rows: RoleStatRow[], company: string, shown: RoleLink[]): RoleLink[] =>
  moreImpl(rows, company, shown);

/** Whether the role bar renders: an indexed link, or a fold of 2+ roles. */
export const showRoleBar = (links: RoleLink[], more: RoleLink[]): boolean => showBarImpl(links, more);

export const companyRoleGuidesHeading = (name: string): string => guidesHeadingImpl(name);

export const roleSlugForLabel = (label: string | null | undefined): string | null => slugImpl(label);

/** The exact role label a URL segment names; null for unknown or reserved (`page`, `q`). */
export const roleLabelForSlug = (slug: string | undefined): string | null => labelImpl(slug);

export const companyRoleSeoTitle = (name: string, role: string): string => seoTitleImpl(name, role);

export const companyRoleSeoDescription = (name: string, role: string, noteCount: number): string =>
  seoDescriptionImpl(name, role, noteCount);

/** The opening paragraph; '' when there are no notes. */
export const companyRoleIntro = (
  name: string,
  role: string,
  roleCount: number | null | undefined,
  companyCount: number | null | undefined,
): string => introImpl(name, role, roleCount, companyCount);

export const companyRoleJsonLd = (
  siteUrl: string,
  page: { name: string; companySlug: string; role: string; roleSlug: string; intro: string },
): Record<string, unknown>[] => jsonLdImpl(siteUrl, page);

const totalOf = async (params: { company: string; role?: string }): Promise<number> =>
  normalizePublicPosts(await getPublicPosts({ ...params, page: 0 })).total;

/**
 * A company's role links, for a page that has no server seed (in-app
 * navigation). The client twin of api/_render/community.ts
 * fetchCompanyRoleCounts: one public search per role for its total, plus the
 * company's own total for the share rule. Best-effort per role. A stand-in
 * until the company × role count endpoint exists.
 */
export async function getCompanyRoleLinks(company: string): Promise<RoleLink[]> {
  const labels = Object.values(ROLE_SLUGS) as string[];
  const [companyTotal, ...totals] = await Promise.all([
    totalOf({ company }),
    ...labels.map((role) => totalOf({ company, role }).catch(() => 0)),
  ]);
  const counts: Record<string, number> = {};
  labels.forEach((label, i) => { if (totals[i] > 0) counts[label] = totals[i]; });
  return companyRoleLinks(counts, companyTotal);
}

/**
 * The note page's role crumb: the role page slug when it is indexed, else null
 * (the breadcrumb stops at the company). Never throws.
 */
export async function getRoleCrumb(company: string, role: string | null | undefined): Promise<string | null> {
  const slug = roleSlugForLabel(role);
  if (!slug || !role) return null;
  try {
    const [forRole, forCompany] = await Promise.all([totalOf({ company, role }), totalOf({ company })]);
    return isIndexableRole(forRole, forCompany) ? slug : null;
  } catch {
    return null;
  }
}

let roleStatsPromise: Promise<RoleStatRow[]> | null = null;

/**
 * Every company × role with notes (one list for all companies), fetched once
 * per page load. A failure is not cached, so the next caller retries.
 */
export function getRoleStats(): Promise<RoleStatRow[]> {
  if (!roleStatsPromise) {
    roleStatsPromise = getPublicCompanyRoleStats()
      .then((res) => {
        const data = res?.data?.data ?? res?.data;
        return Array.isArray(data) ? (data as RoleStatRow[]) : [];
      })
      .catch((err) => {
        roleStatsPromise = null;
        throw err;
      });
  }
  return roleStatsPromise;
}

/**
 * Every role this company has notes under, labels as the search's `role=`
 * takes them, most notes first — including roles with no URL segment, since
 * the personal centre's Role filter filters the feed rather than linking.
 */
export async function getCompanyRoleLabels(company: string): Promise<string[]> {
  const want = company.trim().toLowerCase();
  const counts = new Map<string, number>();
  for (const r of await getRoleStats()) {
    if (String(r?.company ?? '').trim().toLowerCase() !== want || !r.role) continue;
    const n = Number(r.postCount) || 0;
    if (n > 0) counts.set(r.role, (counts.get(r.role) ?? 0) + n);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([role]) => role);
}
