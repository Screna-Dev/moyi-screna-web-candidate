// The community API, as the request-time renderers see it.
//
// Two rules shape every function here, both from the shared conventions:
//
//   1. The backend is reached DIRECTLY at VITE_API_PATH. Never through this
//      site's own /api/v1 proxy: that proxy is middleware.ts, which runs on the
//      edge runtime with a 25s ceiling and points at api-staging by default. A
//      render that went through it would either time out or bake staging data
//      into a production page.
//   2. "The record is not there" and "the upstream did not answer" are
//      different answers and must stay different all the way to the status
//      code. A 404 tells Google the page was deleted, so one bad minute
//      upstream would evict every note it had indexed; a 503 says "later".
//      Hence UpstreamError, which the handlers turn into 503, versus a null
//      return, which they turn into 404.

// Origin only — the paths below add /api/v1 themselves, matching
// scripts/prerender.mjs.
const API_BASE = (process.env.VITE_API_PATH || 'https://api.screna.ai').replace(/\/$/, '');
const COMMUNITY = `${API_BASE}/api/v1/community/public`;

/** Upstream failed to answer, or answered 5xx. Renders as 503, never 404. */
export class UpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UpstreamError';
  }
}

export interface PostQuestion {
  id: string;
  seq?: number;
  label?: string;
  title?: string;
  categories?: string[];
  notes?: string;
}

export interface PublicPost {
  id: string;
  company?: string;
  role?: string;
  level?: string;
  round?: string;
  date?: string;
  outcome?: string;
  location?: string;
  summary?: string;
  status?: string;
  questions?: PostQuestion[];
  createdAt?: string;
  updatedAt?: string;
  commentCount?: number;
  likeCount?: number;
  saveCount?: number;
}

export interface AiHints {
  suggested_approach?: string;
  pro_tip?: string;
  framework?: { step?: number | string; title?: string; description?: string }[];
  key_points_to_mention?: string[];
}

export interface CompanyProfile {
  displayName?: string;
  category?: string;
  summary?: string;
  postCount?: number;
  recentPostCount?: number;
  latestUpdatedAt?: string | null;
}

/**
 * GET as JSON, with the status mapping rule 2 above describes.
 *
 * 4xx comes back as null. That includes the 400 the search endpoint answers for
 * a malformed uuid, which is the right shape: a URL whose id cannot exist is a
 * missing page, not a broken backend. 5xx, a network throw and a timeout all
 * raise UpstreamError.
 */
async function getJson<T>(url: string, timeoutMs: number): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new UpstreamError(`${url}: ${(err as Error)?.message ?? 'request failed'}`);
  }
  if (res.status >= 500) throw new UpstreamError(`${url}: HTTP ${res.status}`);
  if (!res.ok) return null;
  try {
    const json = (await res.json()) as { data?: T };
    return (json?.data ?? json) as T;
  } catch (err) {
    // A 200 whose body is not JSON is an upstream fault, not a missing record.
    throw new UpstreamError(`${url}: unparseable body (${(err as Error)?.message})`);
  }
}

interface SearchResult {
  posts?: PublicPost[];
  total?: number;
  size?: number;
  page?: number;
}

/**
 * One post by id, or null when there is nothing published under it.
 *
 * The id check is not defensive padding. There is no
 * GET /community/public/posts/{id}; a single-post read is the LIST endpoint
 * filtered to one postId, and a server that ignores that parameter answers
 * with the newest notes site-wide. Reading posts[0] from such a response
 * publishes another candidate's write-up under this URL, with this URL's
 * canonical and JSON-LD on it. middleware.ts made the same check for the same
 * reason before this renderer existed.
 *
 * A row whose status is set and is not PUBLISHED is also null: the page must
 * 404 rather than serve a draft.
 */
export async function fetchPost(id: string): Promise<PublicPost | null> {
  const data = await getJson<SearchResult>(
    `${COMMUNITY}/posts/search?${new URLSearchParams({ postId: id })}`,
    8000,
  );
  const posts = Array.isArray(data?.posts) ? data!.posts! : [];
  const post = posts[0];
  if (!post || post.id !== id) return null;
  if (post.status && String(post.status).toUpperCase() !== 'PUBLISHED') return null;
  return post;
}

/**
 * AI hints for the questions on one note, keyed by question id.
 *
 * Best-effort per question, four in flight: the hints are cached server-side
 * indefinitely so this is a ~80ms read per question in the steady state, and a
 * note is still worth publishing without one question's hints. A throw here
 * would turn a single slow question into a 503 for the whole page.
 *
 * Deliberately NOT batched — GET /questions/ai-hints?ids= does not exist yet
 * (it 404s). When it lands, this is the one function that changes.
 */
export async function fetchHints(
  questions: PostQuestion[],
  concurrency = 4,
): Promise<Record<string, AiHints>> {
  const withId = questions.filter((q) => q?.id);
  const out: Record<string, AiHints> = {};
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, withId.length) }, async () => {
      while (next < withId.length) {
        const q = withId[next++];
        try {
          const hints = await getJson<AiHints>(`${COMMUNITY}/questions/${q.id}/ai-hints`, 5000);
          if (hints) out[q.id] = hints;
        } catch {
          // Degrade to "this question has no hints"; see above.
        }
      }
    }),
  );
  return out;
}

/** One company's profile row, or null when the company has none (it answers 400/NOT_FOUND). */
export async function fetchCompanyProfile(name: string): Promise<CompanyProfile | null> {
  return getJson<CompanyProfile>(
    `${COMMUNITY}/companies/profile?${new URLSearchParams({ company: name })}`,
    8000,
  );
}

/**
 * One page of a company's notes, newest first, plus the cross-page total.
 *
 * Sorting is fixed to NEWEST server-side and no sort parameter is read, which
 * is why the paginated company URLs compute their own offsets from `total`
 * rather than asking for an order (see api/_render/company.ts).
 */
export async function fetchCompanyPosts(
  name: string,
  page: number,
): Promise<{ posts: PublicPost[]; total: number; size: number; page: number }> {
  const data = await getJson<SearchResult>(
    `${COMMUNITY}/posts/search?${new URLSearchParams({ company: name, page: String(page) })}`,
    8000,
  );
  const posts = Array.isArray(data?.posts) ? data!.posts! : [];
  return {
    posts,
    total: Number.isFinite(data?.total) ? (data!.total as number) : posts.length,
    size: Number.isFinite(data?.size) ? (data!.size as number) : 10,
    page: Number.isFinite(data?.page) ? (data!.page as number) : page,
  };
}

/** The whole company directory, as the stats endpoint returns it (nested by category). */
export async function fetchCompanyStats(): Promise<unknown | null> {
  return getJson<unknown>(`${COMMUNITY}/companies/stats`, 8000);
}
