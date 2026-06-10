/**
 * Handles the "Failed to fetch dynamically imported module" error that happens
 * when a browser still has an old `index.html` loaded after a new deployment.
 *
 * Vite emits hashed chunk filenames (e.g. `SpectrumPage-CPb-FLuU.js`). After a
 * redeploy those hashes change, so the stale tab requests a chunk that no longer
 * exists. With an SPA rewrite the server returns `index.html` instead of the JS
 * module, and the dynamic `import()` rejects. The robust recovery is a one-time
 * full reload so the browser fetches the fresh `index.html` + chunk manifest.
 */

const RELOAD_KEY = "app:last-chunk-reload";
// If we already reloaded within this window and still fail, stop reloading so we
// don't get stuck in a loop on a genuinely missing chunk.
const RELOAD_WINDOW_MS = 10_000;

function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [\w-]+ failed|dynamically imported module/i.test(
    message,
  );
}

/**
 * Triggers a guarded one-time reload for a stale chunk. If a reload already
 * happened recently, rethrows so a real error can surface instead of looping.
 */
export function reloadForStaleChunk(error: unknown): Promise<never> {
  const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
  const now = Date.now();

  if (now - last > RELOAD_WINDOW_MS) {
    sessionStorage.setItem(RELOAD_KEY, String(now));
    window.location.reload();
    // Keep the caller pending while the page reloads.
    return new Promise<never>(() => {});
  }

  throw error;
}

/**
 * Wraps a dynamic import (as used by react-router's `lazy`) so that a stale
 * chunk failure triggers a one-time reload instead of crashing the route.
 */
export function lazyWithReload<T>(
  importFn: () => Promise<T>,
): () => Promise<T> {
  return async () => {
    try {
      return await importFn();
    } catch (error) {
      if (isChunkLoadError(error)) {
        return reloadForStaleChunk(error);
      }
      throw error;
    }
  };
}
