import { rewrite } from '@vercel/edge';

export default function middleware(request: Request) {
  const url = new URL(request.url);

  // Determine the backend origin from VITE_API_URL
  // e.g. VITE_API_URL=https://api.screna.ai/api/v1 -> origin=https://api.screna.ai
  const apiUrl =
    process.env.VITE_API_URL || 'https://api-staging.screna.ai/api/v1';
  const backendOrigin = new URL(apiUrl).origin;

  // Rewrite to the backend, preserving path and query string
  return rewrite(`${backendOrigin}${url.pathname}${url.search}`);
}

export const config = {
  matcher: '/api/v1/:path*',
};
