// Recovery for "Failed to fetch dynamically imported module".
//
// A lazy chunk can fail to load for two reasons: a deploy replaced the hashed
// filenames the open tab still references, or the fetch itself was dropped
// (Googlebot's renderer skips resources under its fetch budget). Either way the
// page is fine — reloading picks up the current index and chunks. Showing an
// error page instead is what got company pages flagged as soft 404 in GSC.

const RELOAD_KEY = 'screna-chunk-reload-at';
// One automatic reload per window, so a chunk that is genuinely gone can't
// trap the tab in a reload loop.
const RELOAD_WINDOW_MS = 10_000;

export function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error ? `${error.name} ${error.message}` : typeof error === 'string' ? error : '';
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError|Unable to preload CSS/i.test(
    message,
  );
}

/** Reloads the page unless we already did so moments ago. Returns whether it reloaded. */
export function reloadForChunkError(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < RELOAD_WINDOW_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // Storage blocked: without the guard a reload could loop forever, so don't.
    return false;
  }
  window.location.reload();
  return true;
}
