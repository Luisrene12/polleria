/**
 * cache.js — Caché en memoria con TTL
 * Evita queries repetidas a la DB para datos que cambian poco
 * (estado de caja, lista de productos, etc.)
 */

class MemCache {
    constructor() {
        this._store = new Map();
    }

    /**
     * Guarda un valor con TTL en segundos
     */
    set(key, value, ttlSeconds = 30) {
        const expiresAt = Date.now() + ttlSeconds * 1000;
        this._store.set(key, { value, expiresAt });
    }

    /**
     * Obtiene un valor. Retorna null si expiró o no existe.
     */
    get(key) {
        const entry = this._store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this._store.delete(key);
            return null;
        }
        return entry.value;
    }

    /**
     * Invalida una clave específica
     */
    del(key) {
        this._store.delete(key);
    }

    /**
     * Invalida todas las claves que empiecen con un prefijo
     */
    delByPrefix(prefix) {
        for (const key of this._store.keys()) {
            if (key.startsWith(prefix)) this._store.delete(key);
        }
    }

    /**
     * Limpia entradas expiradas periódicamente (cada 5 min)
     */
    _startCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, entry] of this._store.entries()) {
                if (now > entry.expiresAt) this._store.delete(key);
            }
        }, 5 * 60 * 1000);
    }
}

const cache = new MemCache();
cache._startCleanup();

module.exports = cache;
