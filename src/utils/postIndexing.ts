// Typed wrapper over the single-note indexing gate.
//
// The rule itself lives in scripts/routes.mjs so that scripts/sitemap.mjs
// (which decides what is advertised), scripts/prerender.mjs (which decides what
// is snapshotted) and api/_render/note.ts (which decides what is noindex) all
// apply the identical test. Same arrangement, and same reason, as companySlug.

// Plain .mjs manifest, shared with scripts/ and api/ — see scripts/routes.mjs.
import {
  isIndexablePost as isIndexablePostImpl,
  postContentWords as postContentWordsImpl,
  noteSeoTitle as noteSeoTitleImpl,
  MIN_POST_CONTENT_WORDS as MIN_WORDS,
} from '../../scripts/routes.mjs';

/** Shape the gate reads. A superset of it (the real post) is fine. */
export type IndexablePostInput = {
  id?: string;
  summary?: string | null;
  questions?: { title?: string | null; notes?: string | null }[] | null;
} | null | undefined;

export const MIN_POST_CONTENT_WORDS: number = MIN_WORDS;

/** Guest-visible content words: summary + question titles + notes. */
export const postContentWords = (post: IndexablePostInput): number =>
  postContentWordsImpl(post);

/**
 * Is this note substantial enough to deserve its own indexed page?
 *
 * False for the roughly half of the library that is one question plus one
 * trimmed sentence — those say nothing the company page's card does not
 * already say, and publishing thousands of them is what "scaled content"
 * describes.
 */
export const isIndexablePost = (post: IndexablePostInput): boolean =>
  isIndexablePostImpl(post);

/**
 * The note page's <title>, og:title and twitter:title.
 *
 * Shared with api/_render/note.ts, which writes the same string into the
 * server-rendered HTML before this page's useSeo rewrites it on boot. Two
 * copies of the truncation rule is how the brand went missing from all 40
 * prerendered titles — see noteSeoTitle in scripts/routes.mjs.
 */
export const noteSeoTitle = (post: {
  company?: string | null;
  role?: string | null;
  round?: string | null;
} | null | undefined): string => noteSeoTitleImpl(post);
