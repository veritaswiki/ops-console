import type { FleetLink, FleetNode } from '../types';
import { LAND_PATHS } from './natural-earth.ts';

export { LAND_PATHS };

export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 460;
const LAT_MAX = 82;
const LAT_MIN = -58;
const LAT_SPAN = LAT_MAX - LAT_MIN;

export interface MapViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const REGION_PRESETS: Record<string, MapViewBox & { label: string }> = {
  world: { x: 0, y: 0, w: 1000, h: 460, label: '全球' },
  apac: { x: 645, y: 74, w: 340, h: 245, label: '亚太' },
  eurasia: { x: 430, y: 36, w: 540, h: 276, label: '欧亚' },
  americas: { x: 68, y: 42, w: 360, h: 290, label: '美洲' },
};

export interface PlacedMapNode {
  node: FleetNode;
  ax: number;
  ay: number;
  x: number;
  y: number;
  offset: boolean;
}

export interface NodeLabelPlacement {
  anchor: 'start' | 'middle' | 'end';
  lx: number;
  ly: number;
  leader: boolean;
  showSub: boolean;
  hideLabel: boolean;
  shortName: string;
  metricHint: string;
  lineGap: number;
}

export interface PlacedMapArc {
  id: string;
  d: string;
  kind: string;
  active: boolean;
  isHighlight: boolean;
  strokeWidth: number;
  dash: string;
  rttText: string;
  rttX: number;
  rttY: number;
}

export function projectLatLon(lat?: number | null, lon?: number | null): { x: number; y: number } {
  const clampedLat = Math.max(LAT_MIN, Math.min(LAT_MAX, Number(lat) || 0));
  const clampedLon = Math.max(-180, Math.min(180, Number(lon) || 0));
  return {
    x: Math.round(((clampedLon + 180) / 360) * MAP_WIDTH * 10) / 10,
    y: Math.round(((LAT_MAX - clampedLat) / LAT_SPAN) * MAP_HEIGHT * 10) / 10,
  };
}

export function clampViewBox(vb: MapViewBox): MapViewBox {
  const aspect = MAP_WIDTH / MAP_HEIGHT;
  const w = Math.max(140, Math.min(MAP_WIDTH, Number(vb.w) || MAP_WIDTH));
  const h = w / aspect;
  const x = Math.max(0, Math.min(MAP_WIDTH - w, Number(vb.x) || 0));
  const y = Math.max(0, Math.min(MAP_HEIGHT - h, Number(vb.y) || 0));
  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
    w: Math.round(w * 10) / 10,
    h: Math.round(h * 10) / 10,
  };
}

export function computeFitViewBox(nodes: FleetNode[]): MapViewBox {
  const valid = (nodes || []).filter(
    (n) => Number.isFinite(Number(n.lat)) && Number.isFinite(Number(n.lon)),
  );
  if (!valid.length) return { x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT };
  const primary = valid.filter((n) => n.status !== 'offline' || n.probeMode !== 'tailscale-only');
  const source = primary.length >= 2 ? primary : valid;
  const pts = source.map((n) => projectLatLon(n.lat, n.lon));
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const pt of pts) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }
  const padX = Math.max(58, (maxX - minX) * 0.42);
  const padY = Math.max(38, (maxY - minY) * 0.48);
  const spanX = Math.max(220, maxX - minX + padX * 2);
  const spanY = Math.max(115, maxY - minY + padY * 2);
  const aspect = MAP_WIDTH / MAP_HEIGHT;
  let w = spanX;
  let h = w / aspect;
  if (h < spanY) {
    h = spanY;
    w = h * aspect;
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return clampViewBox({ x: cx - w / 2, y: cy - h / 2, w, h });
}

export function buildGraticuleLines(): Array<{
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  major: boolean;
}> {
  const lines: Array<{ id: string; x1: number; y1: number; x2: number; y2: number; major: boolean }> = [];
  for (let lon = -150; lon <= 150; lon += 30) {
    const x = Math.round(((lon + 180) / 360) * MAP_WIDTH * 10) / 10;
    lines.push({ id: `lon-${lon}`, x1: x, y1: 0, x2: x, y2: MAP_HEIGHT, major: lon === 0 });
  }
  for (let lat = -40; lat <= 60; lat += 20) {
    const y = Math.round(((LAT_MAX - lat) / LAT_SPAN) * MAP_HEIGHT * 10) / 10;
    lines.push({ id: `lat-${lat}`, x1: 0, y1: y, x2: MAP_WIDTH, y2: y, major: lat === 0 });
  }
  return lines;
}

export function layoutMapNodes(nodes: FleetNode[], scale: number): PlacedMapNode[] {
  const base: PlacedMapNode[] = (nodes || []).map((node) => {
    const anchor = projectLatLon(node.lat, node.lon);
    return { node, ax: anchor.x, ay: anchor.y, x: anchor.x, y: anchor.y, offset: false };
  });

  const threshold = 16 * scale;
  const visited = new Set<number>();
  for (let i = 0; i < base.length; i += 1) {
    if (visited.has(i)) continue;
    const cluster = [i];
    visited.add(i);
    for (let j = i + 1; j < base.length; j += 1) {
      if (visited.has(j)) continue;
      if (Math.hypot(base[i].ax - base[j].ax, base[i].ay - base[j].ay) < threshold) {
        cluster.push(j);
        visited.add(j);
      }
    }
    if (cluster.length > 1) {
      cluster.sort((a, b) => {
        const aHub = base[a].node.deviceType === 'hub' ? 0 : 1;
        const bHub = base[b].node.deviceType === 'hub' ? 0 : 1;
        return aHub - bHub;
      });
      const radius = Math.min(30, 17 + cluster.length * 3.0) * scale;
      const startIdx = base[cluster[0]].node.deviceType === 'hub' ? 1 : 0;
      const orbiting = cluster.slice(startIdx);
      const angles = [-0.55, 0.55, 2.45, -2.45, 1.55, -1.55];
      orbiting.forEach((idx, k) => {
        const angle = angles[k % angles.length] + Math.floor(k / angles.length) * 0.4;
        const item = base[idx];
        item.x = Math.max(16, Math.min(MAP_WIDTH - 16, item.ax + Math.cos(angle) * radius));
        item.y = Math.max(16, Math.min(MAP_HEIGHT - 16, item.ay + Math.sin(angle) * radius));
        item.offset = true;
      });
    }
  }
  return base;
}

function estimateTextWidth(text: string, fontSize: number): number {
  let units = 0;
  for (const ch of String(text || '')) {
    units += ch.charCodeAt(0) > 255 ? 1.18 : 0.72;
  }
  return units * fontSize;
}

function rectOverlapArea(
  a: { x1: number; y1: number; x2: number; y2: number },
  b: { x1: number; y1: number; x2: number; y2: number },
): number {
  const ox = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1));
  const oy = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  return ox * oy;
}

export function placeMapNodeLabels(
  placed: PlacedMapNode[],
  opts: { selectedNodeId: string; vb: MapViewBox; scale: number; fontSize: number; subFontSize: number },
): NodeLabelPlacement[] {
  const { selectedNodeId, vb, scale, fontSize, subFontSize } = opts;
  const pad = 4 * scale;
  const occupied = placed.map((p) => ({
    x1: p.x - 9 * scale,
    y1: p.y - 9 * scale,
    x2: p.x + 9 * scale,
    y2: p.y + 9 * scale,
  }));

  const priorityScore = (item: PlacedMapNode) => {
    if (item.node.id === selectedNodeId) return 0;
    if (item.node.deviceType === 'hub') return 1;
    if (item.node.status === 'healthy') return 2;
    if (item.node.status === 'degraded') return 3;
    if (item.node.status === 'standby') return 4;
    return 5;
  };

  const ordered = placed
    .map((item, index) => ({ item, index }))
    .sort((a, b) => priorityScore(a.item) - priorityScore(b.item));
  const results = new Array<NodeLabelPlacement>(placed.length);

  type Candidate = {
    anchor: 'start' | 'middle' | 'end';
    lx: number;
    ly: number;
    rx1: number;
    ry1: number;
    rx2: number;
    ry2: number;
    leader: boolean;
  };

  const makeCandidates = (x: number, y: number, w: number, h: number, lineH: number, isTwoLine: boolean): Candidate[] => {
    const gx = 12 * scale;
    const gy = 13 * scale;
    const outerX = 24 * scale;
    const outerY = 24 * scale;
    const topBaseline = isTwoLine ? -(gy + lineH * 0.95) : -gy;
    const botBaseline = gy + fontSize * 0.85;
    const midBaseline = isTwoLine ? -fontSize * 0.1 : fontSize * 0.35;
    const rightEdge = vb.x + vb.w - 14 * scale;
    const list: Candidate[] = [
      { anchor: 'start', lx: x + gx, ly: y + midBaseline, rx1: x + gx, ry1: y + midBaseline - fontSize * 0.9, rx2: x + gx + w, ry2: y + midBaseline - fontSize * 0.9 + h, leader: false },
      { anchor: 'end', lx: x - gx, ly: y + midBaseline, rx1: x - gx - w, ry1: y + midBaseline - fontSize * 0.9, rx2: x - gx, ry2: y + midBaseline - fontSize * 0.9 + h, leader: false },
      { anchor: 'middle', lx: x, ly: y + topBaseline, rx1: x - w / 2, ry1: y + topBaseline - fontSize * 0.9, rx2: x + w / 2, ry2: y + topBaseline - fontSize * 0.9 + h, leader: false },
      { anchor: 'middle', lx: x, ly: y + botBaseline, rx1: x - w / 2, ry1: y + botBaseline - fontSize * 0.9, rx2: x + w / 2, ry2: y + botBaseline - fontSize * 0.9 + h, leader: false },
      { anchor: 'start', lx: x + gx, ly: y + topBaseline, rx1: x + gx, ry1: y + topBaseline - fontSize * 0.9, rx2: x + gx + w, ry2: y + topBaseline - fontSize * 0.9 + h, leader: false },
      { anchor: 'end', lx: x - gx, ly: y + topBaseline, rx1: x - gx - w, ry1: y + topBaseline - fontSize * 0.9, rx2: x - gx, ry2: y + topBaseline - fontSize * 0.9 + h, leader: false },
      { anchor: 'start', lx: x + gx, ly: y + botBaseline, rx1: x + gx, ry1: y + botBaseline - fontSize * 0.9, rx2: x + gx + w, ry2: y + botBaseline - fontSize * 0.9 + h, leader: false },
      { anchor: 'end', lx: x - gx, ly: y + botBaseline, rx1: x - gx - w, ry1: y + botBaseline - fontSize * 0.9, rx2: x - gx, ry2: y + botBaseline - fontSize * 0.9 + h, leader: false },
      { anchor: 'start', lx: x + outerX, ly: y - outerY, rx1: x + outerX, ry1: y - outerY - fontSize * 0.9, rx2: x + outerX + w, ry2: y - outerY - fontSize * 0.9 + h, leader: true },
      { anchor: 'end', lx: x - outerX, ly: y - outerY, rx1: x - outerX - w, ry1: y - outerY - fontSize * 0.9, rx2: x - outerX, ry2: y - outerY - fontSize * 0.9 + h, leader: true },
      { anchor: 'start', lx: x + outerX, ly: y + outerY + fontSize * 0.5, rx1: x + outerX, ry1: y + outerY - fontSize * 0.4, rx2: x + outerX + w, ry2: y + outerY - fontSize * 0.4 + h, leader: true },
      { anchor: 'end', lx: x - outerX, ly: y + outerY + fontSize * 0.5, rx1: x - outerX - w, ry1: y + outerY - fontSize * 0.4, rx2: x - outerX, ry2: y + outerY - fontSize * 0.4 + h, leader: true },
      { anchor: 'middle', lx: x, ly: y - outerY * 1.45, rx1: x - w / 2, ry1: y - outerY * 1.45 - fontSize * 0.9, rx2: x + w / 2, ry2: y - outerY * 1.45 - fontSize * 0.9 + h, leader: true },
      { anchor: 'middle', lx: x, ly: y + outerY * 1.65, rx1: x - w / 2, ry1: y + outerY * 1.65 - fontSize * 0.9, rx2: x + w / 2, ry2: y + outerY * 1.65 - fontSize * 0.9 + h, leader: true },
    ];
    if (x + outerX + w > rightEdge) {
      list.push(
        { anchor: 'end', lx: rightEdge, ly: y + midBaseline, rx1: rightEdge - w, ry1: y + midBaseline - fontSize * 0.9, rx2: rightEdge, ry2: y + midBaseline - fontSize * 0.9 + h, leader: true },
        { anchor: 'end', lx: rightEdge, ly: y - outerY * 1.15, rx1: rightEdge - w, ry1: y - outerY * 1.15 - fontSize * 0.9, rx2: rightEdge, ry2: y - outerY * 1.15 - fontSize * 0.9 + h, leader: true },
        { anchor: 'end', lx: rightEdge, ly: y + outerY * 1.25, rx1: rightEdge - w, ry1: y + outerY * 1.25 - fontSize * 0.9, rx2: rightEdge, ry2: y + outerY * 1.25 - fontSize * 0.9 + h, leader: true },
      );
    }
    return list;
  };

  const evaluate = (cand: Candidate) => {
    const rect = { x1: cand.rx1 - pad, y1: cand.ry1 - pad, x2: cand.rx2 + pad, y2: cand.ry2 + pad };
    const edgeMargin = 8 * scale;
    let penalty = cand.leader ? 18 : 0;
    if (rect.x1 < vb.x + edgeMargin) penalty += 50000 + (vb.x + edgeMargin - rect.x1) * 500;
    if (rect.x2 > vb.x + vb.w - edgeMargin) penalty += 50000 + (rect.x2 - (vb.x + vb.w - edgeMargin)) * 500;
    if (rect.y1 < vb.y + edgeMargin) penalty += 50000 + (vb.y + edgeMargin - rect.y1) * 500;
    if (rect.y2 > vb.y + vb.h - edgeMargin) penalty += 50000 + (rect.y2 - (vb.y + vb.h - edgeMargin)) * 500;
    let overlap = 0;
    for (const occ of occupied) {
      overlap += rectOverlapArea(rect, occ);
    }
    return { rect, overlap, score: overlap * 8 + penalty };
  };

  for (const { item, index } of ordered) {
    const { node, x, y } = item;
    const isSelected = node.id === selectedNodeId;
    const shortName = String(node.name || node.id).split(/[（(]/)[0].trim().slice(0, 18);
    const metricHint =
      node.battery?.percent != null
        ? `${Math.round(node.battery.percent)}%`
        : node.cpu?.usagePct != null
          ? `CPU ${Math.round(node.cpu.usagePct)}%`
          : node.region || '';

    const lineGap = subFontSize * 1.28;
    const w2 = Math.max(estimateTextWidth(shortName, fontSize), estimateTextWidth(metricHint, subFontSize));
    const h2 = metricHint ? fontSize + lineGap + 2 * scale : fontSize + 2 * scale;
    const w1 = estimateTextWidth(shortName, fontSize);
    const h1 = fontSize + 2 * scale;

    let best: (Candidate & { rect: { x1: number; y1: number; x2: number; y2: number }; overlap: number; score: number; showSub: boolean }) | null = null;
    for (const cand of makeCandidates(x, y, w2, h2, lineGap, Boolean(metricHint))) {
      const ev = evaluate(cand);
      if (!best || ev.score < best.score) best = { ...cand, ...ev, showSub: Boolean(metricHint) };
    }

    if (best && best.overlap > 0 && !isSelected && metricHint) {
      for (const cand of makeCandidates(x, y, w1, h1, lineGap, false)) {
        const ev = evaluate(cand);
        if (ev.score < best.score) {
          best = { ...cand, ...ev, showSub: false };
        }
      }
    }

    const fallback = best!;
    const hideLabel = !isSelected && node.status === 'offline' && fallback.overlap > w1 * h1 * 0.25;
    if (!hideLabel) {
      occupied.push(fallback.rect);
    }
    results[index] = {
      anchor: fallback.anchor,
      lx: fallback.lx,
      ly: fallback.ly,
      leader: fallback.leader,
      showSub: fallback.showSub,
      hideLabel,
      shortName,
      metricHint,
      lineGap,
    };
  }

  return results;
}

export function buildMapArcs(
  placed: PlacedMapNode[],
  links: FleetLink[],
  selectedNodeId: string,
  scale: number,
): PlacedMapArc[] {
  const byId = new Map(placed.map((p) => [p.node.id, p]));
  const out: PlacedMapArc[] = [];
  for (const link of links || []) {
    const a = byId.get(link.from);
    const b = byId.get(link.to);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) continue;
    const lift = Math.min(54 * scale, dist * 0.22);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2 - lift;
    const kind = String(link.kind || 'direct').toLowerCase();
    const isHighlight = Boolean(selectedNodeId && (link.from === selectedNodeId || link.to === selectedNodeId));
    const strokeWidth = (isHighlight ? 2.1 : 1.35) * scale;
    const dash =
      kind === 'relay'
        ? `${(4.5 * scale).toFixed(1)} ${(3.2 * scale).toFixed(1)}`
        : kind === 'checkin' || kind === 'ssh' || kind === 'backup' || kind === 'external'
          ? `${(2.4 * scale).toFixed(1)} ${(3.0 * scale).toFixed(1)}`
          : '';
    const d = `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    const rttNum = link.rttMs == null ? NaN : Number(link.rttMs);
    const showRtt = isHighlight && Number.isFinite(rttNum) && rttNum > 0 && dist > 72 * scale;
    out.push({
      id: `${link.from}->${link.to}:${kind}`,
      d,
      kind,
      active: Boolean(link.active),
      isHighlight,
      strokeWidth,
      dash,
      rttText: showRtt ? `${Math.round(rttNum)}ms` : '',
      rttX: 0.25 * a.x + 0.5 * mx + 0.25 * b.x,
      rttY: 0.25 * a.y + 0.5 * my + 0.25 * b.y - 4 * scale,
    });
  }
  return out;
}

export function buildSparklineGeometry(
  values: number[],
  width = 220,
  height = 48,
  min?: number,
  max?: number,
): {
  linePoints: string;
  areaPath: string;
  lastX: number;
  lastY: number;
  lastValue: number;
} | null {
  const vals = values.filter((v) => Number.isFinite(v));
  if (!vals.length) return null;
  const minVal = min !== undefined ? min : Math.min(...vals);
  const maxVal = max !== undefined ? max : Math.max(...vals, minVal + 1);
  const span = Math.max(1e-6, maxVal - minVal);
  const padY = 6;
  const plotH = height - padY * 2;
  const coords = vals.map((v, idx) => {
    const x = vals.length === 1 ? width : (idx / (vals.length - 1)) * width;
    const norm = Math.max(0, Math.min(1, (v - minVal) / span));
    const y = padY + (1 - norm) * plotH;
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10] as const;
  });
  const linePoints = coords.map(([x, y]) => `${x},${y}`).join(' ');
  const areaPath = `M0,${height} L${coords.map(([x, y]) => `${x},${y}`).join(' L')} L${width},${height} Z`;
  const last = coords[coords.length - 1];
  return {
    linePoints,
    areaPath,
    lastX: last[0],
    lastY: last[1],
    lastValue: vals[vals.length - 1],
  };
}
