export class TimeSeriesStore {
  constructor({ maxPoints = 60, minIntervalMs = 4000, maxSeries = 128, store = null } = {}) {
    this.maxPoints = Math.max(10, Math.min(360, Number(maxPoints) || 60));
    this.minIntervalMs = Math.max(0, Number(minIntervalMs) || 0);
    this.maxSeries = Math.max(16, Math.min(512, Number(maxSeries) || 128));
    this.store = store || null;
    this.series = new Map();
  }

  record(key, sample, { persist = true } = {}) {
    const cleanKey = String(key || '').trim();
    if (!cleanKey || !sample || typeof sample !== 'object') return;
    let list = this.series.get(cleanKey);
    if (!list) {
      if (this.series.size >= this.maxSeries) {
        const oldestKey = this.series.keys().next().value;
        if (oldestKey && oldestKey !== 'fleet') {
          this.series.delete(oldestKey);
        }
      }
      list = [];
      this.series.set(cleanKey, list);
    } else {
      this.series.delete(cleanKey);
      this.series.set(cleanKey, list);
    }
    const now = typeof sample.ts === 'number' ? sample.ts : Date.now();
    const point = { ...sample, ts: now };
    const last = list[list.length - 1];
    if (last && this.minIntervalMs > 0 && now - last.ts < this.minIntervalMs) {
      list[list.length - 1] = point;
      return;
    }
    list.push(point);
    if (list.length > this.maxPoints) {
      list.splice(0, list.length - this.maxPoints);
    }
    if (persist && this.store) {
      this.store.recordSample(cleanKey, point);
    }
  }

  get(key, limit = this.maxPoints) {
    const list = this.series.get(String(key || '').trim());
    if (!list || list.length === 0) return [];
    const cap = Math.max(1, Math.min(this.maxPoints, Number(limit) || this.maxPoints));
    return list.slice(-cap);
  }

  summaryMap(limit = 24) {
    const result = {};
    for (const key of this.series.keys()) {
      result[key] = this.get(key, limit);
    }
    return result;
  }

  clear(key) {
    if (key) this.series.delete(String(key));
    else this.series.clear();
  }
}
