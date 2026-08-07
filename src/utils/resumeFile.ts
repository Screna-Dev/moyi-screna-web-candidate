/**
 * Display name for a stored resume.
 *
 * `resume_path` from GET /profile/resume is a pre-signed S3 URL, so the last
 * path segment still carries the whole `?X-Amz-…` query — taking it verbatim
 * printed a 200-character signature where the filename belongs. Percent-encoded
 * segments are decoded so a name the user recognises comes back out.
 */
export function resumeFileName(path?: string | null): string | undefined {
  if (!path) return undefined;
  const withoutQuery = path.split(/[?#]/)[0];
  // Drop `scheme://host` first, so a URL with no path can't pass its hostname
  // off as the filename.
  const withoutOrigin = withoutQuery.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, '');
  const seg = withoutOrigin.split('/').filter(Boolean).pop();
  if (!seg) return undefined;
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}
