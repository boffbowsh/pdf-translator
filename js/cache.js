// LRU Cache — Map-based with byte-size tracking
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

const cache = new Map();
let currentBytes = 0;

function entrySize(key, value) {
  return (key.length + value.length) * 2;
}

function normalize(key) {
  return key.toLowerCase().trim();
}

export function get(key) {
  const k = normalize(key);
  if (!cache.has(k)) return undefined;
  // Move to end (most recently used)
  const value = cache.get(k);
  cache.delete(k);
  cache.set(k, value);
  return value;
}

export function set(key, value) {
  const k = normalize(key);
  // If already exists, remove old entry first
  if (cache.has(k)) {
    currentBytes -= entrySize(k, cache.get(k));
    cache.delete(k);
  }
  const size = entrySize(k, value);
  // Evict oldest entries until there's room
  while (currentBytes + size > MAX_BYTES && cache.size > 0) {
    const oldest = cache.keys().next().value;
    currentBytes -= entrySize(oldest, cache.get(oldest));
    cache.delete(oldest);
  }
  cache.set(k, value);
  currentBytes += size;
}

export function has(key) {
  return cache.has(normalize(key));
}
