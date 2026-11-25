export class TimeSeriesStore {
  constructor({ maxPoints = 60, minIntervalMs = 4000 } = {}) {
    this.maxPoints = Math.max(10, Math.min(360, Number(maxPoints) || 60));
    this.minIntervalMs = Math.max(0, Number(minIntervalMs) || 0);
    this.series = new Map();
  }

  record(key, sample) {
    const cleanKey = String(key || '').trim();
    if (!cleanKey || !sample || typeof sample !== 'object') return;
    let list = this.series.get(cleanKey);
    if (!list) {
      list = [];
      this.series.set(cleanKey, list);
    }
    const now = typeof sample.ts === 'number' ? sample.ts : Date.now();
    const last = list[list.length - 1];
    if (last && this.minIntervalMs > 0 && now - last.ts < this.minIntervalMs) {
      list[list.length - 1] = { ...sample, ts: now };
      return;
    }
    list.push({ ...sample, ts: now });
    if (list.length > this.maxPoints) {
      list.splice(0, list.length - this.maxPoints);
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
