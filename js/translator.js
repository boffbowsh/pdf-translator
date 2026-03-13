// Translation manager: worker management, Promise API, cache integration
import * as cache from "./cache.js";

let worker = null;
let requestId = 0;
const pending = new Map(); // id -> { resolve, reject }
let onProgress = null;
let initPromise = null;

export function init(progressCallback) {
  if (initPromise) return initPromise;

  onProgress = progressCallback;
  worker = new Worker("./js/translation-worker.js", { type: "module" });

  initPromise = new Promise((resolve, reject) => {
    worker.onmessage = (e) => {
      const msg = e.data;

      switch (msg.type) {
        case "init-progress":
          onProgress?.(msg.progress);
          break;

        case "init-complete":
          resolve();
          break;

        case "init-error":
          reject(new Error(msg.error));
          break;

        case "translation-result": {
          cache.set(msg.text, msg.translation);
          const req = pending.get(msg.id);
          if (req) {
            pending.delete(msg.id);
            req.resolve(msg.translation);
          }
          break;
        }

        case "translation-error": {
          const req2 = pending.get(msg.id);
          if (req2) {
            pending.delete(msg.id);
            req2.reject(new Error(msg.error));
          }
          break;
        }
      }
    };

    worker.postMessage({ type: "init" });
  });

  return initPromise;
}

export function translate(text) {
  const trimmed = text.trim();
  if (!trimmed) return Promise.resolve("");

  const cached = cache.get(trimmed);
  if (cached !== undefined) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const id = ++requestId;
    pending.set(id, { resolve, reject });
    worker.postMessage({ type: "translate", id, text: trimmed });
  });
}

// Fire-and-forget for cache warming
export function preTranslate(text) {
  const trimmed = text.trim();
  if (!trimmed || cache.has(trimmed)) return;
  const id = ++requestId;
  // No pending entry needed — result will be cached by worker.onmessage handler
  pending.set(id, { resolve: () => {}, reject: () => {} });
  worker.postMessage({ type: "translate", id, text: trimmed });
}

// Pre-translate individual words from nearby spans
export function preTranslateWords(spans) {
  for (const span of spans) {
    if (!span?.textContent) continue;
    const words = span.textContent.split(/\s+/).filter(Boolean);
    for (const word of words) {
      preTranslate(word);
    }
  }
}
