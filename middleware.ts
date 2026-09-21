// Edge middleware: the /api/v1 proxy, and nothing else.
//
// It used to also answer social-preview crawlers on /experience/:id with a
// hand-built Open Graph document. That branch is gone, and so is its matcher
// entry, because /experience/:id is now server-rendered by
// api/experience/[id].ts — which emits the same og:/twitter: tags to everyone.
//
// Removing it was a prerequisite, not a tidy-up. Middleware runs BEFORE
// rewrites, so for any user agent in CRAWLER_UA the OG document would have
// pre-empted the renderer entirely: LinkedIn and Facebook would still have
// received a near-empty document carrying <meta http-equiv="refresh">, and the
// rendered page they are meant to see would never have been requested. One
// document for every agent is also the shape that cannot be mistaken for
// cloaking.
//
// The matcher below is narrowed to /api/v1 for the same reason: every path this
// function does not need to see is a path where it cannot get in the way.

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
}

export const config = {
  matcher: ['/api/v1/:path*'],
};
