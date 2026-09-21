import { describe, expect, it } from 'vitest';
// Plain .mjs manifest, shared with scripts/, api/ and src/.
import {
  companySlug,
  eligibleCompanies,
  flattenCompanyStats,
  minWordsFor,
  MIN_POSTS_FOR_PAGE,
} from '../../scripts/routes.mjs';

// These helpers decide which company pages are indexed, what URL each gets, and
// whether the build accepts the resulting snapshot. They are consumed from
// places that cannot import each other's language (the React app, the
// request-time renderers under api/_render, the build scripts), so a regression
// here shows up as published-but-broken URLs rather than a failing import.

describe('companySlug', () => {
  it.each([
    ['Google', 'google'],
    ['Meta', 'meta'],
    ['DoorDash', 'doordash'],
    ['Early-stage Startup', 'early-stage-startup'],
  ])('%s -> %s', (name, slug) => {
    expect(companySlug(name)).toBe(slug);
  });

  // The whole reason resolveCompanyName exists. These names collapse to slugs
  // that cannot be turned back into them, so anything needing the display name
  // must look it up rather than re-derive it. All three clear
  // MIN_POSTS_FOR_PAGE in the live library, i.e. all three get indexed pages.
  it.each([
    ['Scale.ai', 'scale-ai'],
    ['AT&T', 'at-t'],
    ['Booking.com', 'booking-com'],
    ['Verkada Inc.', 'verkada-inc'],
    ['Qube Research & Technologies', 'qube-research-technologies'],
  ])('is lossy for %s (-> %s)', (name, slug) => {
    expect(companySlug(name)).toBe(slug);
  });

  it('is idempotent, so a slug fed back in is unchanged', () => {
    for (const n of ['Scale.ai', 'AT&T', 'Google', 'Verkada Inc.']) {
      expect(companySlug(companySlug(n))).toBe(companySlug(n));
    }
  });

  it('never produces leading, trailing or doubled separators', () => {
    for (const n of ['  Spaced  ', '.leading', 'trailing.', 'a...b', '&&&']) {
      const s = companySlug(n);
      expect(s).not.toMatch(/^-|-$|--/);
    }
  });

  it('survives null and undefined rather than throwing', () => {
    expect(companySlug(null)).toBe('');
    expect(companySlug(undefined)).toBe('');
  });
});

describe('minWordsFor', () => {
  it('prefers an exact match over a prefix rule', () => {
    // '/interview-questions' and '/interview-questions/' both "match" the
    // directory under a naive scan; the exact key must win.
    expect(minWordsFor('/interview-questions')).toBe(120);
  });

  // Company pages had their own 350-word floor while they were snapshotted at
  // build time. They are rendered per request now and answer to
  // RENDERED_MIN_WORDS instead, so there is no '/interview-questions/' prefix
  // rule left and they fall through to the default.
  it('has no company-page prefix rule left, only the directory exact match', () => {
    expect(minWordsFor('/interview-questions/google')).toBe(120);
    expect(minWordsFor('/interview-questions/scale-ai')).toBe(120);
  });

  it('keeps the pre-existing rules intact', () => {
    expect(minWordsFor('/contact')).toBe(80);
    expect(minWordsFor('/blog/some-post')).toBe(400);
    expect(minWordsFor('/faq')).toBe(120);
  });
});

describe('flattenCompanyStats', () => {
  it('falls back to the group category when a row has none', () => {
    const rows = flattenCompanyStats({
      categories: [{ category: 'Big Tech', companies: [{ company: 'Google', postCount: 5 }] }],
    });
    expect(rows).toEqual([
      {
        company: 'Google',
        category: 'Big Tech',
        postCount: 5,
        recentPostCount: 0,
        latestUpdatedAt: null,
      },
    ]);
  });

  it('returns an empty list for junk rather than throwing', () => {
    expect(flattenCompanyStats(null)).toEqual([]);
    expect(flattenCompanyStats({})).toEqual([]);
    expect(flattenCompanyStats({ categories: 'nope' })).toEqual([]);
  });
});

describe('eligibleCompanies', () => {
  const stats = {
    categories: [
      {
        category: 'Mid-sized',
        companies: [
          { company: 'Scale.ai', postCount: 30, recentPostCount: 1, latestUpdatedAt: '2026-01-01T00:00:00Z' },
          { company: 'Tiny', postCount: 3 },
        ],
      },
      {
        category: 'FAANG / Big Tech',
        companies: [
          // Same company, second category group — the stats API really does
          // this when a company's posts carry inconsistent categories.
          { company: 'Scale.ai', postCount: 20, recentPostCount: 2, latestUpdatedAt: '2026-06-01T00:00:00Z' },
          { company: 'Meta', postCount: 490 },
        ],
      },
    ],
  };

  it('merges rows for the same company before applying the gate', () => {
    const scale = eligibleCompanies(stats).find((c: { slug: string }) => c.slug === 'scale-ai');
    expect(scale.postCount).toBe(50);
    expect(scale.recentPostCount).toBe(3);
  });

  it('keeps the newest latestUpdatedAt when merging', () => {
    const scale = eligibleCompanies(stats).find((c: { slug: string }) => c.slug === 'scale-ai');
    expect(scale.latestUpdatedAt).toBe('2026-06-01T00:00:00Z');
  });

  // Gating the un-merged rows would drop a company whose total is well over the
  // threshold because neither half reached it alone.
  it('gates on the merged total, not on either half', () => {
    const split = {
      categories: [
        { category: 'A', companies: [{ company: 'Split Co', postCount: 6 }] },
        { category: 'B', companies: [{ company: 'Split Co', postCount: 6 }] },
      ],
    };
    expect(eligibleCompanies(split).map((c: { slug: string }) => c.slug)).toEqual(['split-co']);
  });

  it(`excludes companies under ${MIN_POSTS_FOR_PAGE} notes`, () => {
    expect(eligibleCompanies(stats).map((c: { slug: string }) => c.slug)).not.toContain('tiny');
  });

  // The renderer asks for every company, threshold or not, because the
  // threshold decides indexing and not existence: a company below it still gets
  // a rendered `noindex, follow` page, which is the crawl path to its notes.
  it('returns every company when the threshold is lifted', () => {
    expect(eligibleCompanies(stats, 0).map((c: { slug: string }) => c.slug)).toEqual([
      'meta',
      'scale-ai',
      'tiny',
    ]);
  });

  it('sorts most notes first, so the featured grid leads with the busiest pages', () => {
    expect(eligibleCompanies(stats).map((c: { slug: string }) => c.slug)).toEqual(['meta', 'scale-ai']);
  });

  it('drops rows whose company name slugifies to nothing', () => {
    const junk = { categories: [{ category: 'A', companies: [{ company: '???', postCount: 99 }] }] };
    expect(eligibleCompanies(junk)).toEqual([]);
  });
});
