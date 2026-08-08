// frontend/src/services/cache.js
// Caché simple en memoria para el frontend con tiempo de expiración (TTL)

const cacheStore = new Map();

export const getCache = (key) => {
  const cached = cacheStore.get(key);
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  return cached.value;
};

export const setCache = (key, value, ttlSeconds = 30) => {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  cacheStore.set(key, { value, expiresAt });
};

export const clearCache = (key) => {
  cacheStore.delete(key);
};

export const clearAllCache = () => {
  cacheStore.clear();
};
