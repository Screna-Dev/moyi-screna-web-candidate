import { useEffect } from 'react';

// Per-route <head> management for the public/indexable pages.
//
// The app is a pure CSR SPA, so index.html ships one hardcoded title /
// description / canonical for every URL. This hook rewrites those nodes per
// route, and — just as importantly — sets `data-seo-ready` on <html> once the
// page's real data is in. scripts/prerender.mjs waits for that flag before
// snapshotting the DOM, so "wait until the content exists" and "wait until the
// head is correct" are the same signal.

const SITE_URL = 'https://www.screna.ai';
const MANAGED = 'data-seo';

export interface SeoInput {
  title: string;
  description: string;
  /** Path beginning with `/`, no origin. canonical = SITE_URL + path */
  path: string;
  image?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
  jsonLd?: Record<string, unknown>[];
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    el.setAttribute(MANAGED, '');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    el.setAttribute(MANAGED, '');
    document.head.appendChild(el);
  }
  el.href = href;
}

/**
 * Write per-route <head> tags.
 *
 * Pass `null` while the page's data is still loading: nothing is written and
 * `data-seo-ready` stays unset, which is what keeps the prerenderer from
 * snapshotting a skeleton screen. Terminal states that will never have data
 * (404, load error) must still pass an object — a `noindex: true` one — or the
 * build will hang on that route until it times out.
 */
export function useSeo(input: SeoInput | null) {
  const key = input ? JSON.stringify(input) : '';

  useEffect(() => {
    if (!input) return;
    const {
      title,
      description,
      path,
      image = `${SITE_URL}/og-image.png`,
      type = 'website',
      noindex = false,
      jsonLd = [],
    } = input;
    const url = `${SITE_URL}${path}`;

    document.title = title;
    upsertCanonical(url);
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:image', image);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    // index.html hardcodes the home URL here; without an override every page
    // would advertise the home page as its Twitter target.
    upsertMeta('name', 'twitter:url', url);
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);

    document.head
      .querySelectorAll(`script[type="application/ld+json"][${MANAGED}]`)
      .forEach((n) => n.remove());
    for (const obj of jsonLd) {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.setAttribute(MANAGED, '');
      // Escape `<`: a literal `</script` inside the JSON would close the tag
      // early when the prerendered HTML is re-parsed by the browser.
      s.textContent = JSON.stringify(obj).replace(/</g, '\\u003c');
      document.head.appendChild(s);
    }

    document.documentElement.setAttribute('data-seo-ready', '1');
    return () => document.documentElement.removeAttribute('data-seo-ready');
    // `key` is the serialised input — re-runs only when the content changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

export { SITE_URL };
