export class SingleFlightCache {
  constructor() {
    this.entries = new Map();
    this.inflight = new Map();
  }

  async getOrLoad(key, ttlMs, loader, opts = {}) {
    const { force = false, staleOnError = true } = opts;
    const now = Date.now();
    const cached = this.entries.get(key);

    if (!force && cached && now - cached.ts < ttlMs) {
      return cached.value;
    }

    if (this.inflight.has(key)) {
      return this.inflight.get(key);
    }

    const promise = (async () => {
      try {
        const value = await loader();
        this.entries.set(key, { ts: Date.now(), value });
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
      inflightKeys: this.inflight.size,
    };
  }
}
