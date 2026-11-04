import type { IncomingMessage, ServerResponse } from 'node:http';

// Daily redeploy trigger, called by the Vercel cron in vercel.json.
//
// The sitemap is generated at build time now, which ties "a note is advertised"
// to "a deploy happened". Without this, a note published on a Tuesday would
// wait for whatever unrelated commit landed next. One scheduled rebuild a day
// puts it at worst 24 hours behind.
//
// It forwards to a Deploy Hook and does nothing else. Deliberately: the hook
// URL is a credential (anyone holding it can trigger a production build), so it
// lives in an environment variable and never in the repo or in a client.

export const config = {
  maxDuration: 15,
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Vercel signs its cron calls with CRON_SECRET when the variable is set.
  // Checked when present rather than always, so the route is usable before the
  // secret is configured — but the route is idempotent and cheap either way:
  // the worst an unauthenticated caller achieves is a redundant build.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${secret}`) {
      res.statusCode = 401;
      res.end('Unauthorized');
      return;
    }
  }

  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook) {
    // 503, not 500: the route is fine, the configuration is missing. Says so
    // in the response so a failing cron in the dashboard names its own cause.
    res.statusCode = 503;
    res.end('VERCEL_DEPLOY_HOOK_URL is not configured — no rebuild triggered');
    return;
  }

  try {
    const upstream = await fetch(hook, { method: 'POST', signal: AbortSignal.timeout(10_000) });
    res.statusCode = upstream.ok ? 200 : 502;
    res.end(upstream.ok ? 'Rebuild triggered' : `Deploy hook answered ${upstream.status}`);
  } catch (err) {
    res.statusCode = 502;
    res.end(`Deploy hook unreachable: ${(err as Error)?.message ?? 'unknown error'}`);
  }
}
