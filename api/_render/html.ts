// Plain .mjs manifest, shared with scripts/ and src/ — see scripts/routes.mjs.
import { RENDERED_MIN_WORDS } from '../../scripts/routes.mjs';

// Text -> HTML primitives for the request-time renderers in this directory.
//
// Everything under api/_render is imported by the serverless functions and is
// never itself an endpoint: Vercel skips `api/` paths whose name starts with an
// underscore, which is what keeps /api/_render/note reachable from nowhere.

/**
 * Escape a string for interpolation into element content OR an attribute
 * value. One function for both, so a value can never be escaped for the wrong
 * context by accident: `"` and `'` are covered even in text position, and `&`
 * is replaced first so the other replacements are not re-escaped.
 */
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * A `<script type="application/json">` seed tag, in the exact shape
 * readPrerenderSeed() expects (src/utils/prerenderSeed.ts): an element with
 * this id whose textContent parses as JSON, outside #root so createRoot never
 * clears it, and consumed once on read.
 *
 * `<` is escaped to `<` rather than left alone: a literal `</script` in
 * any string in the payload closes the tag early when the browser parses this
 * document, which leaves the seed unusable AND spills raw JSON onto the page.
 * Same hazard, same fix, as scripts/prerender.mjs's inject().
 */
export function seedTag(id: string, data: unknown): string {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<script id="${esc(id)}" type="application/json">${json}</script>`;
}

/**
 * Words in a fragment of HTML, counted the way the crawl checks count them:
 * tags dropped, entities left as single tokens, runs of whitespace collapsed.
 *
 * This is the input to the noindex floor in the renderers (see
 * shouldNoindexOnLength) — it does not have to agree with a browser's
 * innerText to the word, it has to be in the same order of magnitude so a page
 * that rendered almost nothing is recognisable as such.
 */
export function countWords(html: string): number {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * The rendered-length backstop: a page whose body came out under the floor is
 * noindex regardless of what the content gate said.
 *
 * The number lives in scripts/routes.mjs next to the build-time floors, so the
 * two kinds of "this page rendered almost nothing" check share one value — see
 * RENDERED_MIN_WORDS there for why this check exists at all.
 */
export function shouldNoindexOnLength(bodyHtml: string): boolean {
  return countWords(bodyHtml) < RENDERED_MIN_WORDS;
}

/**
 * Join fragments, dropping the falsy ones. Saves a `.filter(Boolean)` per call
 * site, which is what lets a template read as `cond && '<div>…'`.
 *
 * `number` is accepted because `arr.length && '<ul>…'` is the natural way to
 * write "only if there are any", and its falsy value is 0 rather than false.
 */
export function join(...parts: (string | number | false | null | undefined)[]): string {
  return parts.filter(Boolean).join('');
}
