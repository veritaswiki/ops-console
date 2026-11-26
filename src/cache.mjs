export class SingleFlightCache {
  constructor({ maxEntries = 128 } = {}) {
    this.maxEntries = Math.max(8, Number(maxEntries) || 128);
    this.entries = new Map();
    this.inflight = new Map();
    this.metrics = { hits: 0, misses: 0, coalesced: 0, evictions: 0 };
  }

  _setLru(key, entry) {
    if (this.entries.has(key)) {
      this.entries.delete(key);
    } else if (this.entries.size >= this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey !== undefined) {
        this.entries.delete(oldestKey);
        this.metrics.evictions += 1;
      }
    }
    this.entries.set(key, entry);
  }

  async getOrLoad(key, ttlMs, loader, opts = {}) {
    const { force = false, staleOnError = true } = opts;
    const now = Date.now();
    const cached = this.entries.get(key);

    if (!force && cached && now - cached.ts < ttlMs) {
      // Touch for LRU ordering
      this.entries.delete(key);
      this.entries.set(key, cached);
      this.metrics.hits += 1;
      return cached.value;
    }

    if (this.inflight.has(key)) {
      this.metrics.coalesced += 1;
      return this.inflight.get(key);
    }

    this.metrics.misses += 1;
    const promise = (async () => {
      try {
        const value = await loader();
        this._setLru(key, { ts: Date.now(), value });
        return value;
      } catch (err) {
        if (staleOnError && cached) {
          return cached.value;
        }
        throw err;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, promise);
    return promise;
  }

  invalidate(key) {
    if (key) {
      this.entries.delete(key);
    } else {
      this.entries.clear();
    }
  }

  stats() {
    return {
      cachedKeys: this.entries.size,
      maxEntries: this.maxEntries,
      inflightKeys: this.inflight.size,
      ...this.metrics,
    };
  }
}
