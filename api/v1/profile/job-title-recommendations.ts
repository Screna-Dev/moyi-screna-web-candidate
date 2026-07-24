import type { IncomingMessage, ServerResponse } from 'node:http';

// Node.js Serverless Function (NOT edge middleware) so we can raise the
// timeout. Job-title recommendations run a synchronous LLM call that can
// exceed the Edge Middleware's hard 25s limit. maxDuration lets this proxy
// wait up to 60s (raise to 300 on a Pro/Enterprise plan).
//
// This path is intentionally excluded from the edge middleware proxy in
// middleware.ts so the request falls through to this function instead.
export const config = {
  maxDuration: 60,
};

// Same backend base the edge middleware uses (includes /api/v1).
const API_URL =
  process.env.VITE_API_URL || 'https://api-staging.screna.ai/api/v1';

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  const backendOrigin = new URL(API_URL).origin;
  // Preserve any query string on the incoming request.
  const search =
    req.url && req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const target = `${backendOrigin}/api/v1/profile/job-title-recommendations${search}`;

  // Forward the headers the backend needs: the bearer token and cookies.
  const headers: Record<string, string> = {};
  const auth = req.headers['authorization'];
  if (auth) headers['authorization'] = auth;
  const cookie = req.headers['cookie'];
  if (cookie) headers['cookie'] = cookie;

  try {
    const backendRes = await fetch(target, {
      method: 'GET',
      headers,
    });

    const buf = Buffer.from(await backendRes.arrayBuffer());
    res.statusCode = backendRes.status;
    const resContentType = backendRes.headers.get('content-type');
    if (resContentType) res.setHeader('content-type', resContentType);
    res.end(buf);
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        message: 'Upstream job-title recommendations failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}
