import { createClient, type ClientConfig } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

// Sanity Content Lake client for the blog.
//
// The dataset is public-read, so no token is required for the anonymous site —
// anonymous reads only ever return *published* documents (drafts require a
// token). The project id / dataset are public values (see screna-blog README);
// they can be overridden per-environment via Vite env vars.
//
// Unlike the original Astro blog (which fetched at build time = SSG), this SPA
// fetches from the Content Lake at runtime in the browser. New posts published
// in the Studio therefore appear immediately with no rebuild/redeploy.
const config: ClientConfig = {
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID || 'x5tgtd0h',
  dataset: import.meta.env.VITE_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  // Use the CDN for cached, fast, cheap reads. Fine for a public read-only site.
  useCdn: true,
};

export const sanityClient = createClient(config);

// ---------------------------------------------------------------------------
// Types (mirror of studio/schemaTypes/post.ts)
// ---------------------------------------------------------------------------
export interface SanityImage {
  _type?: string;
  asset?: { _ref?: string; _type?: string };
  alt?: string;
  hotspot?: unknown;
  crop?: unknown;
}

export interface PostAuthor {
  name?: string;
  role?: string;
}

export interface PostListItem {
  _id: string;
  title?: string;
  slug: string;
  excerpt?: string;
  category?: string;
  publishedAt?: string;
  author?: PostAuthor;
  cover?: SanityImage;
  seoTitle?: string;
}

export interface Post extends PostListItem {
  // Portable Text blocks — rendered with @portabletext/react.
  body?: unknown[];
}

// ---------------------------------------------------------------------------
// Queries (GROQ) — copied from the blog's utils/sanity.ts
// ---------------------------------------------------------------------------
// Shared list-card projection (kept in one place so the list + paginated
// queries stay in sync).
const POST_LIST_FIELDS = `
  _id,
  title,
  "slug": slug.current,
  excerpt,
  category,
  publishedAt,
  author,
  cover,
  seoTitle
`;

const POSTS_QUERY = `
  *[_type == "post" && defined(slug.current)]
  | order(publishedAt desc){ ${POST_LIST_FIELDS} }
`;

const POST_QUERY = `
  *[_type == "post" && slug.current == $slug][0]{
    ${POST_LIST_FIELDS},
    body
  }
`;

export async function getPosts(): Promise<PostListItem[]> {
  return sanityClient.fetch(POSTS_QUERY);
}

export interface PostsPage {
  posts: PostListItem[];
  total: number;
  // Distinct categories that actually have published posts (for filter chips).
  categories: string[];
}

/**
 * Fetch one page of posts, newest first, optionally filtered by category.
 * Pagination is done server-side with a GROQ slice + count, so the browser
 * only ever downloads one page's worth of cards.
 */
export async function getPostsPage(opts: {
  page: number;
  pageSize: number;
  category?: string | null;
}): Promise<PostsPage> {
  const { page, pageSize, category } = opts;
  const start = Math.max(0, (page - 1) * pageSize);
  const end = start + pageSize;

  // `$category` is only referenced when a category is active.
  const match = `_type == "post" && defined(slug.current)${
    category ? ' && category == $category' : ''
  }`;

  return sanityClient.fetch(
    `{
      "posts": *[${match}] | order(publishedAt desc)[$start...$end]{ ${POST_LIST_FIELDS} },
      "total": count(*[${match}]),
      "categories": array::unique(*[_type == "post" && defined(slug.current)].category)
    }`,
    { start, end, category: category ?? null },
  );
}

export async function getPost(slug: string): Promise<Post | null> {
  return sanityClient.fetch(POST_QUERY, { slug });
}

// ---------------------------------------------------------------------------
// Image URL builder (respects hotspot/crop)
// ---------------------------------------------------------------------------
const builder = imageUrlBuilder(sanityClient);

export function urlFor(source: SanityImage) {
  return builder.image(source);
}

// ---------------------------------------------------------------------------
// Category labels (mirror of the schema's six fixed categories)
// ---------------------------------------------------------------------------
export const CATEGORY_LABELS: Record<string, string> = {
  'interview-prep': 'Interview Prep',
  'mock-interview': 'Mock Interview',
  'career-switch': 'Career Switch',
  'opt-visa': 'OPT & Visa',
  mentorship: 'Mentorship',
  media: 'Media',
};

export function formatDate(value?: string): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
