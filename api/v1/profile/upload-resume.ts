import type { IncomingMessage, ServerResponse } from 'node:http';

// Node.js Serverless Function (NOT edge middleware) so we can raise the
// timeout. The resume upload triggers backend parsing + analysis that
// routinely exceeds the Edge Middleware's hard 25s limit. maxDuration lets
// this proxy wait up to 60s (raise to 300 on a Pro/Enterprise plan).
//
// This path is intentionally excluded from the edge middleware proxy in
// middleware.ts so the request falls through to this function instead.
export const config = {
  maxDuration: 60,
  // Disable Vercel's automatic body parsing so we can stream the raw
  // multipart/form-data body straight through to the backend untouched.
  api: { bodyParser: false },
};

// Same backend base the edge middleware uses (includes /api/v1).
const API_URL =
  process.env.VITE_API_URL || 'https://api-staging.screna.ai/api/v1';

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  // Buffer the raw upload body.
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const body = Buffer.concat(chunks);

  const backendOrigin = new URL(API_URL).origin;
  const target = `${backendOrigin}/api/v1/profile/upload-resume`;

  // Forward the headers the backend needs: the multipart content-type (which
  // carries the boundary), the bearer token, and cookies.
  const headers: Record<string, string> = {};
  const contentType = req.headers['content-type'];
  if (contentType) headers['content-type'] = contentType;
  const auth = req.headers['authorization'];
  if (auth) headers['authorization'] = auth;
  const cookie = req.headers['cookie'];
  if (cookie) headers['cookie'] = cookie;

  try {
    const backendRes = await fetch(target, {
      method: 'POST',
      headers,
      body,
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
        message: 'Upstream resume upload failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}
