const CRAWLER_UA =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Discordbot|redditbot|Slackbot|WhatsApp|TelegramBot|Applebot|PinterestBot/i;

const SITE_URL = 'https://www.screna.ai';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildOgHtml({
  title,
  description,
  image,
  url,
}: {
  title: string;
  description: string;
  image: string;
  url: string;
}): string {
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const i = escapeHtml(image);
  const u = escapeHtml(url);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${t}</title>
  <meta name="description" content="${d}" />

  <meta property="og:type" content="article" />
  <meta property="og:url" content="${u}" />
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${d}" />
  <meta property="og:image" content="${i}" />
  <meta property="og:site_name" content="Screna AI" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${d}" />
  <meta name="twitter:image" content="${i}" />

  <!-- Redirect real users who somehow land here -->
  <meta http-equiv="refresh" content="0;url=${u}" />
</head>
<body></body>
</html>`;
}

export default async function middleware(request: Request) {
  const url = new URL(request.url);

  // ── API proxy (existing behaviour) ──
  if (url.pathname.startsWith('/api/v1')) {
    // The resume upload is handled by a dedicated Node serverless function
    // (api/v1/profile/upload-resume.ts) that allows up to 60s — beyond this
    // edge middleware's hard 25s limit. Let it fall through to that function.
    if (url.pathname === '/api/v1/profile/upload-resume') {
      return;
    }

    // Job-title recommendations run a synchronous LLM call that can also
    // exceed the edge middleware's 25s limit. It has its own dedicated Node
    // serverless function (api/v1/profile/job-title-recommendations.ts) with
    // a 60s timeout — let it fall through too.
    if (url.pathname === '/api/v1/profile/job-title-recommendations') {
      return;
    }

    const apiUrl =
      process.env.VITE_API_URL || 'https://api-staging.screna.ai/api/v1';
    const backendOrigin = new URL(apiUrl).origin;
    const targetUrl = `${backendOrigin}${url.pathname}${url.search}`;

    const headers = new Headers(request.headers);
    headers.set('host', new URL(apiUrl).host);

    return fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.body,
    });
  }

  // ── Dynamic OG tags for social-media crawlers ──
  const ua = request.headers.get('user-agent') || '';
  if (!CRAWLER_UA.test(ua)) {
    // Not a crawler — let Vercel serve the SPA as normal
    return;
  }

  // /experience/:id
  const experienceMatch = url.pathname.match(/^\/experience\/([^/]+)\/?$/);
  if (experienceMatch) {
    const postId = experienceMatch[1];
    const pageUrl = `${SITE_URL}/experience/${postId}`;

    try {
      const apiUrl =
        process.env.VITE_API_URL || 'https://api-staging.screna.ai/api/v1';

      // The public list endpoint filtered to one post, NOT
      // /community/posts/{postId}: that one requires a CANDIDATE bearer token,
      // and this runs at the edge with no credentials. It answered 401 for
      // every request, so every shared link previewed with the generic fallback
      // card below — the real-data branch never once ran.
      const res = await fetch(
        `${apiUrl}/community/public/posts/search?${new URLSearchParams({ postId })}`,
        { headers: { Accept: 'application/json' } },
      );

      if (res.ok) {
        const json = await res.json();

        // Only the { posts, total } contract is read. An endpoint that answers
        // with something else — an older build, a proxy, an error envelope —
        // must land on the generic card, never on an unfiltered result set: a
        // server that ignores `postId` returns the newest notes site-wide, and
        // reading posts[0] from that would put another candidate's company,
        // round and summary on the preview card for THIS url.
        const posts = Array.isArray(json.data?.posts) ? json.data.posts : [];

        // Zero rows means missing OR unpublished; the API withholds which on
        // purpose, and either way there is nothing to preview. The id check is
        // the cheap half of the guard above — a confidently wrong preview card
        // is worse than a vague but honest one.
        const post = posts[0] && posts[0].id === postId ? posts[0] : undefined;

        if (post) {
          const title = [post.company, post.round || 'Interview Experience']
            .filter(Boolean)
            .join(' — ');
          const description =
            post.summary ||
            `${post.role ? post.role + ' interview' : 'Interview'} experience at ${post.company || 'a top company'} on Screna AI`;
          // No per-post image exists on PostDto; every card uses the site image
          // until something generates and stores one.
          const image = DEFAULT_OG_IMAGE;

          return new Response(
            buildOgHtml({ title, description, image, url: pageUrl }),
            { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
          );
        }
      }
    } catch {
      // Fall through to default OG tags
    }

    // Fallback: generic OG for experience pages
    return new Response(
      buildOgHtml({
        title: 'Interview Experience — Screna AI',
        description:
          'Read real interview experiences and prepare for your next interview with Screna AI.',
        image: DEFAULT_OG_IMAGE,
        url: pageUrl,
      }),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }

  // Other pages: let the SPA handle (static OG from index.html)
  return;
}

export const config = {
  matcher: ['/api/v1/:path*', '/experience/:path*'],
};
