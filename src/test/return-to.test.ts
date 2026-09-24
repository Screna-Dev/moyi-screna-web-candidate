/**
 * returnTo tests (F3)
 *
 * The consuming half of this contract (auth.tsx → resolvePostAuthPath) is
 * covered by post-auth-redirect.test.ts. This is the producing half: what a
 * bounce site puts in the URL, and what it refuses to put there.
 */
import { describe, it, expect } from 'vitest';
import { buildAuthPath, sanitizeReturnTo, targetFromLocation } from '@/utils/returnTo';

describe('targetFromLocation', () => {
  it('joins pathname, search and hash', () => {
    expect(targetFromLocation({ pathname: '/coaching', search: '?sort=top', hash: '#list' }))
      .toBe('/coaching?sort=top#list');
  });

  it('tolerates a location with only a pathname', () => {
    expect(targetFromLocation({ pathname: '/coaching' })).toBe('/coaching');
  });
});

describe('sanitizeReturnTo', () => {
  it('keeps a site-relative path whole', () => {
    expect(sanitizeReturnTo('/interview-insights/google?tab=all#top'))
      .toBe('/interview-insights/google?tab=all#top');
  });

  it.each([null, undefined, ''])('drops an empty target (%s)', (raw) => {
    expect(sanitizeReturnTo(raw)).toBe('');
  });

  // `//evil.com` is a protocol-relative URL: the browser would leave the site.
  // A single leading slash is the hard condition, not just "starts with /".
  it.each([
    '//evil.com',
    '//evil.com/path',
    'https://evil.com',
    'javascript:alert(1)',
    'coaching',
  ])('refuses an off-site target (%s)', (raw) => {
    expect(sanitizeReturnTo(raw)).toBe('');
  });

  // Pointing back at the login page would land the user on /auth after
  // signing in — the loop the whole feature exists to avoid.
  it.each(['/auth', '/register', '/auth?signup=true', '/auth/google/callback'])(
    'refuses a target that points back at auth (%s)',
    (raw) => {
      expect(sanitizeReturnTo(raw)).toBe('');
    }
  );

  // A path that merely starts with the same letters is a different route.
  it('keeps a path that only looks like an auth route', () => {
    expect(sanitizeReturnTo('/authors/42')).toBe('/authors/42');
  });
});

describe('buildAuthPath', () => {
  it('encodes a string target', () => {
    expect(buildAuthPath('/coaching')).toBe('/auth?returnTo=%2Fcoaching');
  });

  it('encodes a location object, query and hash included', () => {
    expect(buildAuthPath({ pathname: '/interview-insights', search: '?q=a b', hash: '#x' }))
      .toBe('/auth?returnTo=%2Finterview-insights%3Fq%3Da%20b%23x');
  });

  // No target and no valid target both mean the same thing: let
  // resolvePostAuthPath decide the landing by role. Never a loop.
  it.each([undefined, null, '', '//evil.com', '/auth'])(
    'falls back to a bare /auth for %s',
    (raw) => {
      expect(buildAuthPath(raw as never)).toBe('/auth');
    }
  );
});
