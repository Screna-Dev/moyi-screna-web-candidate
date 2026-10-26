/**
 * /about — the company facts page, and every place that links to it.
 * Covers: page copy and CTAs, head tags + JSON-LD, the shared marketing Navbar,
 * the home page's own nav bar, the footer, and the route/prerender wiring.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { readFileSync } from 'node:fs';
import React from 'react';
import { createUserPlanMock } from '@/test/utils';
import { PRERENDER_STATIC, minWordsFor } from '../../scripts/routes.mjs';

// ─── Mocks ────────────────────────────────────────────────
let mockUser: { id: string; name: string; email: string; avatar: string } | null = null;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, isAuthenticated: !!mockUser, isLoading: false, logout: vi.fn() }),
}));

vi.mock('@/hooks/useUserPlan', () => ({
  useUserPlan: () => createUserPlanMock(),
}));

vi.mock('@/services/ProfileServices', () => ({
  getPersonalInfo: vi.fn().mockResolvedValue({ data: {} }),
}));

vi.mock('@/services', () => ({
  PaymentService: { getCreditPacks: vi.fn().mockResolvedValue({ data: [] }) },
}));

import { AboutPage } from '@/pages/newDesign/about';
import { Navbar } from '@/components/newDesign/home/navbar';
import { Footer } from '@/components/newDesign/home/footer';
import { HomePage } from '@/pages/newDesign/home/home';
import { ORGANIZATION_JSON_LD } from '@/constants/organization';
import { SEO_COPY } from '@/constants/seo';

const renderAt = (ui: React.ReactElement, path = '/about') =>
  render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);

const jsonLd = () =>
  [...document.head.querySelectorAll('script[type="application/ld+json"]')].map((s) =>
    JSON.parse(s.textContent || '{}'),
  );

/** Every link with this accessible name, desktop and mobile copies alike. */
const linksNamed = (name: string) => screen.queryAllByRole('link', { name });

beforeEach(() => {
  mockUser = null;
  document.head.innerHTML = '';
  // jsdom has neither; the home page uses both.
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as any;
  }
  if (!('IntersectionObserver' in window)) {
    (window as any).IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

// ─── The page ─────────────────────────────────────────────
describe('AboutPage — content', () => {
  it('renders the design copy: one h1, the four section headings, every card', () => {
    renderAt(<AboutPage />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Helping you take the next step in your career— with confidence.');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);

    const h2s = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(h2s).toEqual([
      "Preparing for your next role shouldn't feel like figuring everything out alone.",
      'Learn what to expect. Practice with purpose. Get guidance.',
      'Built around the person preparing.',
      "Get ready for what's next.",
    ]);

    const h3s = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(h3s).toEqual([
      'Real interview insights',
      'AI-powered practice',
      'Human guidance',
      'Relevant preparation',
      'Feedback you can use',
      'Technology with a human perspective',
    ]);

    for (const eyebrow of ['About Screna', 'Our story', 'Our principles', 'Get started']) {
      expect(screen.getByText(eyebrow)).toBeInTheDocument();
    }
  });

  it('carries more text than the prerender word floor', () => {
    const { container } = renderAt(<AboutPage />);
    const main = container.querySelector('main')!;
    const words = main.textContent!.trim().split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(minWordsFor('/about'));
  });

  it('sends a guest to sign-up and a signed-in user to the dashboard', () => {
    const guest = renderAt(<AboutPage />);
    expect(screen.getByRole('link', { name: /Start practicing/ })).toHaveAttribute('href', '/auth?signup=true');
    expect(screen.getByRole('link', { name: 'Contact us' })).toHaveAttribute('href', '/contact');
    guest.unmount();

    mockUser = { id: 'u1', name: 'Test User', email: 't@screna.ai', avatar: '' };
    renderAt(<AboutPage />);
    expect(screen.getByRole('link', { name: /Start practicing/ })).toHaveAttribute('href', '/dashboard');
  });
});

describe('AboutPage — head tags', () => {
  it('writes its own title, description, canonical and robots', () => {
    renderAt(<AboutPage />);
    expect(document.title).toBe(SEO_COPY.about.title);
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      SEO_COPY.about.description,
    );
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://www.screna.ai/about',
    );
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
    expect(document.documentElement.getAttribute('data-seo-ready')).toBe('1');
  });

  it('keeps the description within what a results page shows', () => {
    expect(SEO_COPY.about.description.length).toBeLessThanOrEqual(160);
  });

  it('publishes an AboutPage whose subject is the shared Organization object', () => {
    renderAt(<AboutPage />);
    const blocks = jsonLd();
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      '@type': 'AboutPage',
      url: 'https://www.screna.ai/about',
      mainEntity: JSON.parse(JSON.stringify(ORGANIZATION_JSON_LD)),
    });
  });

  it('gives the home page the very same Organization object', () => {
    renderAt(<HomePage />, '/');
    const org = jsonLd().find((b) => b['@type'] === 'Organization');
    expect(org).toEqual(JSON.parse(JSON.stringify(ORGANIZATION_JSON_LD)));
  });
});

// ─── Nav bars ─────────────────────────────────────────────
const NAV_ORDER = ['Features', 'Interview Questions', 'Blog', 'Pricing', 'FAQ', 'About'];

/** The labels of the desktop link row, in order. */
function desktopNavLabels(container: HTMLElement) {
  const row = [...container.querySelectorAll('div')].find(
    (d) => d.className.includes('lg:flex') && d.className.includes('left-1/2'),
  );
  expect(row, 'desktop nav row').toBeTruthy();
  return { row: row!, labels: within(row!).getAllByRole('link').map((a) => a.textContent) };
}

describe('Shared Navbar (marketing pages)', () => {
  it('lists About last, linking to /about', () => {
    const { container } = renderAt(<Navbar />, '/contact');
    const { labels, row } = desktopNavLabels(container);
    expect(labels).toEqual(NAV_ORDER);
    expect(within(row).getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
  });

  it('draws About in the accent colour on /about only', () => {
    const onAbout = renderAt(<Navbar />, '/about');
    let row = desktopNavLabels(onAbout.container).row;
    expect(within(row).getByRole('link', { name: 'About' })).toHaveStyle({ color: '#2E5BFF' });
    expect(within(row).getByRole('link', { name: 'Blog' })).toHaveStyle({ color: '#4A4D57' });
    onAbout.unmount();

    const onBlog = renderAt(<Navbar />, '/blog');
    row = desktopNavLabels(onBlog.container).row;
    expect(within(row).getByRole('link', { name: 'About' })).toHaveStyle({ color: '#4A4D57' });
    expect(within(row).getByRole('link', { name: 'Blog' })).toHaveStyle({ color: '#2E5BFF' });
  });

  it('never marks a hash link as current, even on the home page', () => {
    const { container } = renderAt(<Navbar />, '/');
    const { row } = desktopNavLabels(container);
    for (const name of ['Features', 'Pricing', 'FAQ']) {
      expect(within(row).getByRole('link', { name })).toHaveStyle({ color: '#4A4D57' });
    }
  });

  it('shows inline links from lg (1024px) and the menu button below it', () => {
    const { container } = renderAt(<Navbar />, '/contact');
    expect(desktopNavLabels(container).row.className).toContain('hidden lg:flex');
    expect(screen.getByRole('button', { name: 'Toggle menu' }).className).toContain('lg:hidden');
  });

  it('includes About in the mobile menu', () => {
    renderAt(<Navbar />, '/contact');
    expect(linksNamed('About')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    const about = linksNamed('About');
    expect(about).toHaveLength(2);
    for (const a of about) expect(a).toHaveAttribute('href', '/about');
  });
});

// The home page's own nav follows the candidate landing redesign (Roles,
// Interview Reports), so it no longer mirrors the shared Navbar — but it keeps
// About, like the shared one.
describe('Home page nav bar (its own copy)', () => {
  it('lists the landing links, About included', () => {
    const { container } = renderAt(<HomePage />, '/');
    const { labels, row } = desktopNavLabels(container);
    expect(labels).toEqual(['Roles', 'Interview Reports', 'Blog', 'Pricing', 'FAQ', 'About']);
    expect(within(row).getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
  });

  it('keeps hash links on the page and real routes as paths', () => {
    const { container } = renderAt(<HomePage />, '/');
    const { row } = desktopNavLabels(container);
    const hrefs = Object.fromEntries(
      within(row).getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')]),
    );
    expect(hrefs).toEqual({
      Roles: '/opportunities',
      'Interview Reports': '/interview-questions',
      Blog: '/blog',
      Pricing: '#pricing',
      FAQ: '#faq',
      About: '/about',
    });
  });

  it('collapses to the menu below lg and lists About there', () => {
    const { container } = renderAt(<HomePage />, '/');
    expect(desktopNavLabels(container).row.className).toContain('hidden lg:flex');
    const toggle = screen.getByRole('button', { name: 'Toggle menu' });
    expect(toggle.className).toContain('lg:hidden');
    const before = linksNamed('About').length;
    fireEvent.click(toggle);
    expect(linksNamed('About').length).toBe(before + 1);
  });
});

describe('Footer', () => {
  it('links to /about under Support', () => {
    renderAt(<Footer />, '/');
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
  });
});

// ─── Route and prerender wiring ───────────────────────────
describe('/about wiring', () => {
  it('is a client route', () => {
    expect(readFileSync('src/router.tsx', 'utf8')).toMatch(/path:\s*'\/about',\s*element:\s*<AboutPage \/>/);
  });

  it('is prerendered, rewritten to the SPA shell, and allowed in robots.txt', () => {
    expect(PRERENDER_STATIC).toContain('/about');
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
    expect(vercel.rewrites).toContainEqual({ source: '/about', destination: '/app.html' });
    expect(readFileSync('public/robots.txt', 'utf8').split('\n')).toContain('Allow: /about');
  });
});
