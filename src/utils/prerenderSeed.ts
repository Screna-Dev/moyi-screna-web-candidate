// Reads the JSON payload that scripts/prerender.mjs injects into each blog
// snapshot.
//
// Without it, the browser boots with empty state, wipes the prerendered markup,
// paints a skeleton, and re-renders once Sanity answers — a visible content
// flash on every visit and a large CLS hit.
//
// MUST be called at module scope, never during render: it removes the script
// element it reads, so under StrictMode's double render the second pass would
// get null. Module scope runs once on first import, which is still after the
// body has parsed (module scripts are deferred), so the node is there.
export function readPrerenderSeed<T>(id: string): T | null {
  if (typeof document === 'undefined') return null;
  const el = document.getElementById(id);
  if (!el?.textContent) return null;
  try {
    return JSON.parse(el.textContent) as T;
  } catch {
    return null;
  } finally {
    // Consume once. The seed lives outside #root so createRoot never clears
    // it; leaving it in place would freeze /blog at build-time data for the
    // whole SPA session (blog → post → back would keep re-reading it).
    el.remove();
  }
}
