import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderCompanyPage, renderCompanyRolePage } from '../../api/_render/company';
import {
  companyMoreRoles,
  companyRoleLinks,
  isIndexableRole,
  roleLabelForSlug,
  roleSlugForLabel,
  showRoleBar,
} from '../../scripts/routes.mjs';

// The request-time renderer for /interview-questions/:company/:role.

const SHELL = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Screna AI</title>
  <link rel="canonical" href="https://www.screna.ai/" />
  <script type="module" crossorigin src="/assets/index-abc123.js"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;

const req = { headers: { host: 'www.screna.ai', 'x-forwarded-proto': 'https' } } as never;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * Meta: 15 Software Engineer, 12 Product Manager and 4 Data Scientist notes
 * (31). Snap: 12 Software Engineer notes and nothing else.
 */
const LIBRARY = [
  ...Array.from({ length: 15 }, (_, i) => ({ id: `swe-${15 - i}`, role: 'Software Engineer', company: 'Meta' })),
  ...Array.from({ length: 12 }, (_, i) => ({ id: `pm-${12 - i}`, role: 'Product Manager', company: 'Meta' })),
  ...Array.from({ length: 4 }, (_, i) => ({ id: `ds-${4 - i}`, role: 'Data Scientist', company: 'Meta' })),
  ...Array.from({ length: 12 }, (_, i) => ({ id: `snap-${12 - i}`, role: 'Software Engineer', company: 'Snap' })),
].map((p) => ({
  ...p,
  round: 'Onsite',
  date: '2026-04-11T00:00:00Z',
  status: 'PUBLISHED',
  summary: `Summary of ${p.id}. ${'Body text. '.repeat(30)}`,
  questions: [{ id: `q-${p.id}`, title: `Question ${p.id}`, notes: 'One sentence.' }],
}));

let searches: URLSearchParams[] = [];

/** `upstream` makes posts/search answer 503. */
function mockBackend({ upstream = 200 } = {}) {
  searches = [];
  globalThis.fetch = vi.fn((input: unknown) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/app.html')) return Promise.resolve(new Response(SHELL));
    if (url.pathname.endsWith('/companies/profile')) {
      const slug = url.searchParams.get('slug');
      const rows: Record<string, unknown> = {
        meta: { displayName: 'Meta', slug: 'meta', category: 'FAANG / Big Tech', postCount: 100 },
        snap: { displayName: 'Snap', slug: 'snap', postCount: 12 },
      };
      return Promise.resolve(
        slug && rows[slug] ? json({ data: rows[slug] }) : json({ errorCode: 'NOT_FOUND' }, 400),
      );
    }
    if (url.pathname.endsWith('/posts/search')) {
      searches.push(url.searchParams);
      if (upstream !== 200) return Promise.resolve(new Response('down', { status: upstream }));
      // Exact label match, like the real endpoint: no normalisation.
      const role = url.searchParams.get('role');
      const rows = LIBRARY.filter((p) => p.company === url.searchParams.get('company') && (!role || p.role === role));
      const page = Number(url.searchParams.get('page') ?? '0');
      return Promise.resolve(
        json({ data: { posts: rows.slice(page * 10, page * 10 + 10), total: rows.length, size: 10, page } }),
      );
    }
    if (url.pathname.endsWith('/companies/roles/stats')) {
      // The whole list, whatever `company=` says — like the real endpoint.
      const counts = new Map<string, { company: string; role: string; postCount: number }>();
      for (const p of LIBRARY) {
        const k = `${p.company}|${p.role}`;
        const row = counts.get(k) ?? { company: p.company, role: p.role, postCount: 0 };
        row.postCount += 1;
        counts.set(k, row);
      }
      // No URL segment for this one: it must never be linked.
      const rows = [...counts.values(), { company: 'Meta', role: 'Performance Engineer', postCount: 2 }];
      return Promise.resolve(json({ status: 'SUCCESS', data: rows }));
    }
    return Promise.resolve(new Response('not found', { status: 404 }));
  }) as never;
}

function seedOf(html: string): any {
  const raw = html.match(/id="__prerender_company__"[^>]*>([\s\S]*?)<\/script>/)![1];
  return JSON.parse(raw.replace(/\\u003c/g, '<'));
}

const linkedIds = (html: string) => [...html.matchAll(/href="\/experience\/([^"]+)"/g)].map((m) => m[1]);

let realFetch: typeof globalThis.fetch;
beforeEach(() => {
  realFetch = globalThis.fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('role slugs', () => {
  it('maps every slug to a label and back', () => {
    expect(roleLabelForSlug('software-engineer')).toBe('Software Engineer');
    expect(roleLabelForSlug('technical-program-manager')).toBe('Technical Program Manager');
    expect(roleSlugForLabel('QA / Test Engineer')).toBe('qa-test-engineer');
  });

  it('never resolves a reserved or unknown segment', () => {
    for (const s of ['page', 'q', 'not-a-role', 'Software-Engineer', 'constructor', '']) {
      expect(roleLabelForSlug(s), s).toBeNull();
    }
  });
});

describe('isIndexableRole / companyRoleLinks', () => {
  it('needs 10 notes and under 90% of the company', () => {
    expect(isIndexableRole(10, 100)).toBe(true);
    expect(isIndexableRole(9, 100)).toBe(false);
    expect(isIndexableRole(89, 100)).toBe(true);
    expect(isIndexableRole(90, 100)).toBe(false);
  });

  it('lists qualifying roles in ROLE_SLUGS, most notes first', () => {
    expect(
      companyRoleLinks({ 'Data Scientist': 40, 'Software Engineer': 50, 'UX Designer': 3, 'Research Scientist': 30 }, 200),
    ).toEqual([
      { slug: 'software-engineer', label: 'Software Engineer', count: 50 },
      { slug: 'data-scientist', label: 'Data Scientist', count: 40 },
    ]);
  });
});

describe('renderCompanyPage — role links', () => {
  const roleHrefs = (html: string) =>
    [...html.matchAll(/href="\/interview-questions\/meta\/([a-z-]+)"/g)].map((m) => m[1]);

  it('links each qualifying role, after the stats and before the notes, then again at the end', async () => {
    mockBackend();
    const page = await renderCompanyPage(req, 'meta', null);
    expect(page.status).toBe(200);
    // Bar, then the closing section: SWE 15 and PM 12; DS (4) has no indexed
    // page, so it is only in the bar's nofollow "More roles" fold.
    expect(roleHrefs(page.html.replace(/<details[\s\S]*?<\/details>/, ''))).toEqual([
      'software-engineer', 'product-manager',
      'software-engineer', 'product-manager',
    ]);
    expect(roleHrefs(page.html.match(/<details[\s\S]*?<\/details>/)![0])).toEqual(['data-scientist']);
    const bar = page.html.indexOf('aria-label="Interview questions by role"');
    expect(bar).toBeGreaterThan(page.html.indexOf('</header>'));
    expect(bar).toBeLessThan(page.html.indexOf('href="/experience/'));
    expect(page.html).toContain('Software Engineer <span class="opacity-70">15</span>');
    expect(page.html).toContain('Meta interview guides by role</h2>');
    expect(page.html.lastIndexOf('/meta/product-manager')).toBeGreaterThan(page.html.lastIndexOf('href="/experience/'));
    expect(seedOf(page.html).roleLinks.map((r: { slug: string }) => r.slug)).toEqual([
      'software-engineer',
      'product-manager',
    ]);
  });

  it('leaves the bar out when no role qualifies (one role is the whole company)', async () => {
    mockBackend();
    const page = await renderCompanyPage(req, 'snap', null);
    expect(page.status).toBe(200);
    expect(page.html).not.toContain('Interview questions by role');
    expect(page.html).not.toContain('/interview-questions/snap/software-engineer');
  });
});

describe('renderCompanyRolePage', () => {
  it("lists the company's notes for that role, searched by label", async () => {
    mockBackend();
    const page = await renderCompanyRolePage(req, 'meta', 'software-engineer');
    expect(page.status).toBe(200);
    expect(searches[0].get('company')).toBe('Meta');
    expect(searches[0].get('role')).toBe('Software Engineer');
    expect(linkedIds(page.html)).toEqual([
      'swe-15', 'swe-14', 'swe-13', 'swe-12', 'swe-11',
      'swe-10', 'swe-9', 'swe-8', 'swe-7', 'swe-6',
    ]);
    expect(page.html).toContain('<title>Meta Software Engineer Interview Questions | Screna AI</title>');
    expect(page.html).toContain(
      '<link rel="canonical" href="https://www.screna.ai/interview-questions/meta/software-engineer">',
    );
    expect(page.html.match(/<h1[ >]/g)).toHaveLength(1);
  });

  it('opens with the stats and a breadcrumb back to the company page', async () => {
    mockBackend();
    const page = await renderCompanyRolePage(req, 'meta', 'software-engineer');
    expect(page.html).toContain(
      '15 Software Engineers have shared notes from their Meta interviews, with the questions they were asked in each round. That is 15% of the 100 Meta interview notes on Screna AI.',
    );
    expect(page.html).toMatch(
      /<li><a href="\/interview-questions">Interview Questions<\/a><\/li>.*<li><a href="\/interview-questions\/meta">Meta<\/a><\/li>.*<li aria-current="page"[^>]*>Software Engineer<\/li>/s,
    );
    expect(page.html).toContain('"@type":"BreadcrumbList"');
    expect(page.html).toContain('"position":3');
    expect(page.html).toContain('"item":"https://www.screna.ai/interview-questions/meta/software-engineer"');
  });

  it('shows the role links with this role highlighted and All back to the company page', async () => {
    mockBackend();
    const page = await renderCompanyRolePage(req, 'meta', 'product-manager');
    const bar = page.html.match(/<nav class="mb-6" aria-label="Interview questions by role">([\s\S]*?)<\/nav>/)![1];
    expect([...bar.matchAll(/href="([^"]+)"/g)].map((m) => m[1])).toEqual([
      '/interview-questions/meta',
      '/interview-questions/meta/software-engineer',
      '/interview-questions/meta/product-manager',
      // The fold, nofollow.
      '/interview-questions/meta/data-scientist',
    ]);
    expect(bar).toMatch(/href="\/interview-questions\/meta\/product-manager" aria-current="page"/);
    expect(bar).toContain('<details>');
  });

  it('is noindex when the role is 90% of the company or more', async () => {
    mockBackend();
    const page = await renderCompanyRolePage(req, 'snap', 'software-engineer');
    expect(page.status).toBe(200);
    expect(page.html).toContain('content="noindex, follow"');
  });

  it('is indexed at the threshold', async () => {
    mockBackend();
    const page = await renderCompanyRolePage(req, 'meta', 'software-engineer');
    expect(page.html).toContain('content="index, follow"');
  });

  it('renders below the threshold, but noindex and without JSON-LD', async () => {
    mockBackend();
    const page = await renderCompanyRolePage(req, 'meta', 'data-scientist');
    expect(page.status).toBe(200);
    expect(linkedIds(page.html)).toEqual(['ds-4', 'ds-3', 'ds-2', 'ds-1']);
    expect(page.html).toContain('content="noindex, follow"');
    expect(page.html).not.toContain('application/ld+json');
    expect(seedOf(page.html).noindex).toBe(true);
  });

  it('seeds the client with the role, so the company page seed never matches it', async () => {
    mockBackend();
    const seed = seedOf((await renderCompanyRolePage(req, 'meta', 'software-engineer')).html);
    expect(seed.role).toBe('Software Engineer');
    expect(seed.total).toBe(15);
    expect(seed.page).toBeNull();
    expect(seed.profile.slug).toBe('meta');
  });

  it.each(['not-a-role', 'page', 'q'])('404s the role slug %s without asking the API', async (slug) => {
    mockBackend();
    const page = await renderCompanyRolePage(req, 'meta', slug);
    expect(page.status).toBe(404);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('404s a role this company has no notes for', async () => {
    mockBackend();
    const page = await renderCompanyRolePage(req, 'meta', 'product-designer');
    expect(page.status).toBe(404);
  });

  it('404s an unknown company', async () => {
    mockBackend();
    const page = await renderCompanyRolePage(req, 'nope', 'software-engineer');
    expect(page.status).toBe(404);
  });

  it('answers 503, never 404, when the search is down', async () => {
    mockBackend({ upstream: 503 });
    const page = await renderCompanyRolePage(req, 'meta', 'software-engineer');
    expect(page.status).toBe(503);
  });
});

describe('companyMoreRoles / showRoleBar', () => {
  const rows = [
    { company: 'Meta', role: 'Software Engineer', postCount: 1194 },
    { company: 'Meta', role: 'Product Designer', postCount: 5 },
    { company: 'Meta', role: 'Backend Engineer', postCount: 4 },
    { company: 'Meta', role: 'Data Analyst', postCount: 4 },
    { company: 'Meta', role: 'Performance Engineer', postCount: 2 },
    { company: 'Google', role: 'Business Analyst', postCount: 9 },
  ];
  const shown = [{ slug: 'software-engineer', label: 'Software Engineer', count: 1194 }];

  it("lists the company's other slugged roles, most notes first", () => {
    expect(companyMoreRoles(rows, 'Meta', shown)).toEqual([
      { slug: 'product-designer', label: 'Product Designer', count: 5 },
      { slug: 'backend-engineer', label: 'Backend Engineer', count: 4 },
      { slug: 'data-analyst', label: 'Data Analyst', count: 4 },
    ]);
  });

  it('matches the company name case-insensitively and nothing else', () => {
    expect(companyMoreRoles(rows, 'google', []).map((r) => r.slug)).toEqual(['business-analyst']);
    expect(companyMoreRoles(rows, 'Nope', [])).toEqual([]);
    expect(companyMoreRoles(null as never, 'Meta', [])).toEqual([]);
  });

  it('hides the bar only when there is no indexed link and at most one other role', () => {
    const one = [{ slug: 'a', label: 'A', count: 1 }];
    expect(showRoleBar([], [])).toBe(false);
    expect(showRoleBar([], one)).toBe(false);
    expect(showRoleBar([], [...one, ...one])).toBe(true);
    expect(showRoleBar(one, [])).toBe(true);
  });
});

describe('More roles fold (rendered)', () => {
  const nav = (html: string) => html.match(/<nav class="mb-6" aria-label="Interview questions by role">[\s\S]*?<\/ul><\/nav>/)![0];

  it('company page: indexed links followed, the rest nofollow inside a closed fold', async () => {
    mockBackend();
    const { html } = await renderCompanyPage(req, 'meta', null);
    const bar = nav(html);
    expect(bar).toContain('href="/interview-questions/meta/software-engineer">');
    expect(bar).toContain('href="/interview-questions/meta/product-manager">');
    expect(bar).toContain('<details>');
    expect(bar).toContain('href="/interview-questions/meta/data-scientist" rel="nofollow"');
    expect(bar).not.toContain('performance-engineer');
    // Every link inside the fold is nofollow; none outside it is.
    const [outside, fold] = bar.split('<details');
    expect(outside).not.toContain('nofollow');
    expect([...fold.matchAll(/<a /g)].length).toBe([...fold.matchAll(/rel="nofollow"/g)].length);
    expect(seedOf(html).moreRoles).toEqual([{ slug: 'data-scientist', label: 'Data Scientist', count: 4 }]);
  });

  it('a page for a fold role opens the fold with that role current', async () => {
    mockBackend();
    const { status, html } = await renderCompanyRolePage(req, 'meta', 'data-scientist');
    expect(status).toBe(200);
    const bar = nav(html);
    expect(bar).toContain('<details open>');
    expect(bar).toMatch(/href="\/interview-questions\/meta\/data-scientist" rel="nofollow" aria-current="page"/);
  });

  it('a one-role company gets no bar at all', async () => {
    mockBackend();
    const { html } = await renderCompanyPage(req, 'snap', null);
    expect(html).not.toContain('aria-label="Interview questions by role"');
  });
});
