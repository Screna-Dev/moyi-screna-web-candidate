export default async function middleware(request: Request) {
  const url = new URL(request.url);

  // Determine the backend origin from VITE_API_URL
  // e.g. VITE_API_URL=https://api.screna.ai/api/v1 -> origin=https://api.screna.ai
  const apiUrl =
    process.env.VITE_API_URL || 'https://api-staging.screna.ai/api/v1';
  const backendOrigin = new URL(apiUrl).origin;

  // Proxy the request to the backend, preserving path and query string
  const targetUrl = `${backendOrigin}${url.pathname}${url.search}`;

  const headers = new Headers(request.headers);
  headers.set('host', new URL(apiUrl).host);

  return fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.body,
  });
}

export const config = {
  matcher: '/api/v1/:path*',
};
