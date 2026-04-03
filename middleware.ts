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
      const res = await fetch(`${apiUrl}/community/posts/${postId}`, {
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        const json = await res.json();
        const post = json.data ?? json;

        const title = [post.company, post.round || 'Interview Experience']
          .filter(Boolean)
          .join(' — ');
        const description =
          post.summary ||
          `${post.role ? post.role + ' interview' : 'Interview'} experience at ${post.company || 'a top company'} on Screna AI`;
        const image = post.og_image || DEFAULT_OG_IMAGE;

        return new Response(
          buildOgHtml({ title, description, image, url: pageUrl }),
          { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
        );
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
