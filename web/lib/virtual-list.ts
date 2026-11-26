export interface VirtualRangeInput {
  scrollTop: number;
  viewportHeight: number;
  itemCount: number;
  itemHeight: number;
  overscan?: number;
}

export interface VirtualRangeResult {
  startIndex: number;
  endIndex: number;
  offsetTop: number;
  totalHeight: number;
}

/**
 * Pure virtual list window calculator for high-throughput log & table viewports.
 * Returns inclusive [startIndex, endIndex) bounds with overscan clamping.
 */
export function computeVisibleRange({
  scrollTop,
  viewportHeight,
  itemCount,
  itemHeight,
  overscan = 10,
}: VirtualRangeInput): VirtualRangeResult {
  const safeCount = Math.max(0, Math.floor(itemCount));
  const safeItemHeight = Math.max(1, itemHeight);
  const totalHeight = safeCount * safeItemHeight;

  if (safeCount === 0) {
    return { startIndex: 0, endIndex: 0, offsetTop: 0, totalHeight: 0 };
  }

  const safeScrollTop = Math.max(0, Math.min(scrollTop, Math.max(0, totalHeight - viewportHeight)));
  const safeViewport = Math.max(safeItemHeight, viewportHeight);
  const safeOverscan = Math.max(0, Math.floor(overscan));

  const rawStart = Math.floor(safeScrollTop / safeItemHeight);
  const visibleCount = Math.ceil(safeViewport / safeItemHeight);

  const startIndex = Math.max(0, rawStart - safeOverscan);
  const endIndex = Math.min(safeCount, rawStart + visibleCount + safeOverscan);

  return {
    startIndex,
    endIndex,
    offsetTop: startIndex * safeItemHeight,
    totalHeight,
  };
}
