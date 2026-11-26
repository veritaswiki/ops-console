import React from 'react';
import { Minus, Plus, Crosshair } from 'lucide-react';
import type { FleetLink, FleetNode } from '../types';
import {
  LAND_PATHS,
  MAP_HEIGHT,
  MAP_WIDTH,
  REGION_PRESETS,
  buildGraticuleLines,
  buildMapArcs,
  buildSparklineGeometry,
  clampViewBox,
  computeFitViewBox,
  layoutMapNodes,
  placeMapNodeLabels,
  type MapViewBox,
} from '../lib/world-map-data';
import { statusTone } from '../utils/format';
import { SegmentedFilter } from './ui';

const GRATICULE = buildGraticuleLines();

const REGION_OPTIONS = [
  { value: 'fit', label: '自动' },
  { value: 'world', label: '全球' },
  { value: 'apac', label: '亚太' },
  { value: 'eurasia', label: '欧亚' },
  { value: 'americas', label: '美洲' },
] as const;

type RegionPresetKey = (typeof REGION_OPTIONS)[number]['value'];

export function WorldMap({
  nodes,
  links,
  selectedNodeId,
  onSelectNode,
}: {
  nodes: FleetNode[];
  links: FleetLink[];
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
}) {
  const [preset, setPreset] = React.useState<RegionPresetKey>('fit');
  const [viewBox, setViewBox] = React.useState<MapViewBox>(() => computeFitViewBox(nodes));
  const [isPanning, setIsPanning] = React.useState(false);
  const hasAutoFitted = React.useRef(false);
  const dragRef = React.useRef<{
    startX: number;
    startY: number;
    origVb: MapViewBox;
    width: number;
    height: number;
  } | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!hasAutoFitted.current && nodes.length > 0) {
      hasAutoFitted.current = true;
      setViewBox(computeFitViewBox(nodes));
    }
  }, [nodes]);

  const handleRegionChange = (next: RegionPresetKey) => {
    setPreset(next);
    if (next === 'fit') {
      setViewBox(computeFitViewBox(nodes));
    } else if (REGION_PRESETS[next]) {
      setViewBox(clampViewBox(REGION_PRESETS[next]));
    }
  };

  const handleZoom = (factor: number) => {
    setViewBox((prev) => {
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      const nextW = prev.w * factor;
      const nextH = nextW / (MAP_WIDTH / MAP_HEIGHT);
      return clampViewBox({ x: cx - nextW / 2, y: cy - nextH / 2, w: nextW, h: nextH });
    });
  };

  const vb = clampViewBox(viewBox);
  const scale = Math.max(0.18, Math.min(1.05, vb.w / MAP_WIDTH));
  const placed = React.useMemo(() => layoutMapNodes(nodes, scale), [nodes, scale]);
  const arcs = React.useMemo(
    () => buildMapArcs(placed, links, selectedNodeId, scale),
    [placed, links, selectedNodeId, scale],
  );
  const fontSize = 14.2 * scale;
  const subFontSize = 11.4 * scale;
  const labels = React.useMemo(
    () => placeMapNodeLabels(placed, { selectedNodeId, vb, scale, fontSize, subFontSize }),
    [placed, selectedNodeId, vb, scale, fontSize, subFontSize],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('[data-node-id]')) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect?.width) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origVb: vb,
      width: rect.width,
      height: rect.height,
    };
    setIsPanning(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const scaleX = drag.origVb.w / drag.width;
    const scaleY = drag.origVb.h / drag.height;
    setViewBox(
      clampViewBox({
        x: drag.origVb.x - dx * scaleX,
        y: drag.origVb.y - dy * scaleY,
        w: drag.origVb.w,
        h: drag.origVb.h,
      }),
    );
  };

  const stopPan = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setIsPanning(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedFilter
          value={preset}
          onChange={handleRegionChange}
          options={REGION_OPTIONS}
          ariaLabel="地图区域视角"
        />
        <div className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] divide-x divide-[var(--border-subtle)] overflow-hidden">
          <button
            type="button"
            onClick={() => handleRegionChange('fit')}
            title="适配活跃节点"
            aria-label="适配活跃节点"
            className="h-8 w-8 inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] active:scale-[0.95] transition-[color,background-color,transform] duration-150 ease-out cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45"
          >
            <Crosshair className="size-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(0.75)}
            title="放大"
            aria-label="放大地图"
            className="h-8 w-8 inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] active:scale-[0.95] transition-[color,background-color,transform] duration-150 ease-out cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45"
          >
            <Plus className="size-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(1.33)}
            title="缩小"
            aria-label="缩小地图"
            className="h-8 w-8 inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] active:scale-[0.95] transition-[color,background-color,transform] duration-150 ease-out cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45"
          >
            <Minus className="size-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopPan}
        onPointerCancel={stopPan}
        className={`rounded-xl border border-[var(--border-subtle)] overflow-hidden bg-[var(--map-ocean)] ${
          isPanning ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <svg
          className="wm-svg"
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="全球多设备节点分布与链路拓扑地图"
        >
          <rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} className="wm-ocean" />

          <g>
            {GRATICULE.map((g) => (
              <line
                key={g.id}
                x1={g.x1}
                y1={g.y1}
                x2={g.x2}
                y2={g.y2}
                className={g.major ? 'wm-grat-major' : 'wm-grat'}
              />
            ))}
          </g>

          <g>
            {LAND_PATHS.map((d, idx) => (
              <path key={idx} d={d} className="wm-land" />
            ))}
          </g>

          <g>
            {arcs.map((arc) => (
              <React.Fragment key={arc.id}>
                <path
                  d={arc.d}
                  className={`wm-arc ${arc.active ? 'is-active' : 'is-inactive'} ${arc.isHighlight ? 'is-highlight' : ''}`}
                  strokeWidth={arc.strokeWidth}
                  strokeDasharray={arc.dash || undefined}
                />
                {arc.rttText && (
                  <text
                    x={arc.rttX}
                    y={arc.rttY}
                    textAnchor="middle"
                    fontSize={11.5 * scale}
                    className="wm-arc-label"
                  >
                    {arc.rttText}
                  </text>
                )}
              </React.Fragment>
            ))}
          </g>

          <g>
            {placed
              .filter((p) => p.offset)
              .map((p) => (
                <line
                  key={`off-${p.node.id}`}
                  x1={p.ax}
                  y1={p.ay}
                  x2={p.x}
                  y2={p.y}
                  className="wm-leader"
                  strokeWidth={0.85 * scale}
                />
              ))}
            {placed.map((item, idx) => {
              const lp = labels[idx];
              if (!lp || lp.hideLabel || !lp.leader) return null;
              const tx =
                lp.anchor === 'start'
                  ? lp.lx - 3 * scale
                  : lp.anchor === 'end'
                    ? lp.lx + 3 * scale
                    : lp.lx;
              const ty = lp.ly - fontSize * 0.3;
              return (
                <line
                  key={`lbl-${item.node.id}`}
                  x1={item.x}
                  y1={item.y}
                  x2={tx}
                  y2={ty}
                  className="wm-leader"
                  strokeWidth={0.8 * scale}
                />
              );
            })}
          </g>

          <g>
            {placed.map((item, idx) => {
              const { node, x, y } = item;
              const lp = labels[idx];
              const tone = statusTone(node.status);
              const isSelected = node.id === selectedNodeId;
              const relX = lp.lx - x;
              const relY = lp.ly - y;
              const relSubY = relY + lp.lineGap;
              const titleText = `${node.name} (${node.region || 'Tailnet'}) · ${node.status}${node.tailscaleIp ? ` · ${node.tailscaleIp}` : ''}`;

              return (
                <g
                  key={node.id}
                  data-node-id={node.id}
                  role="button"
                  tabIndex={0}
                  aria-label={titleText}
                  transform={`translate(${x}, ${y})`}
                  className={`wm-node wm-tone-${tone} ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => onSelectNode(node.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectNode(node.id);
                    }
                  }}
                >
                  <title>{titleText}</title>
                  <circle cx={0} cy={0} r={15 * scale} className="wm-hit-area" />
                  {isSelected && (
                    <circle
                      cx={0}
                      cy={0}
                      r={12 * scale}
                      className="wm-select-ring"
                      strokeWidth={1.6 * scale}
                    />
                  )}
                  <MarkerGlyph deviceType={node.deviceType} scale={scale} />
                  {!lp.hideLabel && (
                    <text
                      x={relX}
                      y={relY}
                      textAnchor={lp.anchor}
                      fontSize={fontSize}
                      className="wm-label"
                    >
                      {lp.shortName}
                    </text>
                  )}
                  {!lp.hideLabel && lp.showSub && lp.metricHint && (
                    <text
                      x={relX}
                      y={relSubY}
                      textAnchor={lp.anchor}
                      fontSize={subFontSize}
                      className="wm-sublabel"
                    >
                      {lp.metricHint}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}

function MarkerGlyph({ deviceType, scale }: { deviceType?: string; scale: number }) {
  const s = scale;
  if (deviceType === 'hub') {
    return (
      <>
        <circle cx={0} cy={0} r={8.5 * s} className="wm-node-halo" />
        <circle cx={0} cy={0} r={5.2 * s} className="wm-node-core" />
        <circle cx={0} cy={0} r={2.0 * s} className="wm-node-center" />
      </>
    );
  }
  if (deviceType === 'laptop') {
    const w = 9.6 * s;
    const h = 6.2 * s;
    return (
      <>
        <rect x={-w / 2} y={-h / 2 - 0.8 * s} width={w} height={h} rx={1.2 * s} className="wm-node-core" />
        <line
          x1={-w * 0.68}
          y1={h / 2 + 0.9 * s}
          x2={w * 0.68}
          y2={h / 2 + 0.9 * s}
          strokeWidth={1.6 * s}
          className="wm-node-stroke"
        />
      </>
    );
  }
  if (deviceType === 'mobile') {
    const w = 6.2 * s;
    const h = 9.8 * s;
    return (
      <>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={1.5 * s} className="wm-node-core" />
        <circle cx={0} cy={h * 0.3} r={0.9 * s} className="wm-node-center" />
      </>
    );
  }
  const r = 4.6 * s;
  return <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={1.6 * s} className="wm-node-core" />;
}

export function SparklineChart({
  label,
  values,
  unit = '%',
  tone = 'accent',
  min,
  max,
}: {
  label: string;
  values: number[];
  unit?: string;
  tone?: 'accent' | 'ok' | 'warn';
  min?: number;
  max?: number;
}) {
  const width = 220;
  const height = 46;
  const geom = React.useMemo(
    () => buildSparklineGeometry(values, width, height, min, max),
    [values, min, max],
  );
  const formatted = geom
    ? Number.isInteger(geom.lastValue)
      ? `${geom.lastValue}${unit}`
      : `${geom.lastValue.toFixed(1)}${unit}`
    : '暂无采样';

  return (
    <div className="py-2.5">
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="text-[12.5px] text-[var(--ink-muted)]">{label}</span>
        <span className="font-mono text-[13px] font-semibold text-[var(--ink)] tabular-nums">
          {formatted}
        </span>
      </div>
      <svg
        className={`w-full h-[44px] block spark-tone-${tone}`}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label} 趋势 ${formatted}`}
      >
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} className="spark-grid" />
        {geom && (
          <>
            <path d={geom.areaPath} className="spark-area" />
            <polyline points={geom.linePoints} fill="none" className="spark-line" />
            <circle cx={geom.lastX} cy={geom.lastY} r={2.8} className="spark-dot" />
          </>
        )}
      </svg>
    </div>
  );
}
