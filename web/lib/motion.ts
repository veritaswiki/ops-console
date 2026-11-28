/**
 * Unified Apple-grade motion grammar for Ops Console.
 *
 * Core principles:
 * - Explanatory, never decorative: motion explains origin, destination, and causality.
 * - Enter slightly calmer, exit ~28% faster, zero bouncy overshoot.
 * - High-frequency / direct-manipulation paths stay 0ms (instant).
 */

export const EASE_OUT_CRAFT = [0.23, 1, 0.32, 1] as const;
export const EASE_EXIT = [0.32, 0, 0.67, 0] as const;
export const EASE_IN_OUT = [0.25, 0.1, 0.25, 1] as const;

export const DURATION = {
  instant: 0,
  micro: 0.11,
  fast: 0.15,
  standard: 0.2,
  sheet: 0.26,
  emphasis: 0.32,
} as const;

export const DURATION_MS = {
  instant: 0,
  micro: 110,
  fast: 150,
  standard: 200,
  sheet: 260,
  emphasis: 320,
} as const;

/** Critically-damped springs (no playful bounce / overshoot). */
export const SPRING_SNAPPY = {
  type: 'spring' as const,
  stiffness: 520,
  damping: 38,
  mass: 0.85,
};

export const SPRING_SHEET = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 38,
  mass: 1.0,
};

export const SPRING_GENTLE = {
  type: 'spring' as const,
  stiffness: 320,
  damping: 32,
  mass: 1.0,
};

/** Unified NumberFlow timing for low-frequency telemetry KPIs and counters. */
export const NUMBER_FLOW_TIMING = {
  transformTiming: { duration: 280, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
  spinTiming: { duration: 280, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
  opacityTiming: { duration: 150, easing: 'ease-out' },
} as const;

/** Pre-composed motion/react transition configs. */
export const TRANSITION_ENTER = {
  duration: DURATION.standard,
  ease: EASE_OUT_CRAFT,
} as const;

export const TRANSITION_EXIT = {
  duration: DURATION.micro,
  ease: EASE_EXIT,
} as const;

export const TRANSITION_MICRO = {
  duration: DURATION.micro,
  ease: EASE_OUT_CRAFT,
} as const;

export const TRANSITION_FAST = {
  duration: DURATION.fast,
  ease: EASE_OUT_CRAFT,
} as const;

export const TRANSITION_SHEET = {
  duration: DURATION.sheet,
  ease: EASE_OUT_CRAFT,
} as const;

export const TRANSITION_VIEW = {
  duration: 0.14,
  ease: EASE_OUT_CRAFT,
} as const;

export const DELAYED_BUSY_MS = 180;
export const COPY_FEEDBACK_MS = 1800;
export const ACTION_SUCCESS_MS = 1400;

/**
 * Exact 1D cubic-bezier solver for cubic-bezier(0.23, 1, 0.32, 1) (EASE_OUT_CRAFT).
 * Used for interruptible requestAnimationFrame animations such as WorldMap camera panning/zooming.
 */
export function evaluateCubicBezier(
  t: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  const sampleX = (u: number) => ((1 - 3 * x2 + 3 * x1) * u + (3 * x2 - 6 * x1)) * u * u + 3 * x1 * u;
  const sampleY = (u: number) => ((1 - 3 * y2 + 3 * y1) * u + (3 * y2 - 6 * y1)) * u * u + 3 * y1 * u;
  const sampleDX = (u: number) => (3 * (1 - 3 * x2 + 3 * x1) * u + 2 * (3 * x2 - 6 * x1)) * u + 3 * x1;

  // Newton-Raphson with bisection fallback for guaranteed convergence
  let u = t;
  for (let i = 0; i < 6; i += 1) {
    const err = sampleX(u) - t;
    if (Math.abs(err) < 1e-6) return sampleY(u);
    const dx = sampleDX(u);
    if (Math.abs(dx) < 1e-6) break;
    u -= err / dx;
  }

  let lo = 0;
  let hi = 1;
  u = t;
  for (let i = 0; i < 16; i += 1) {
    const x = sampleX(u);
    if (Math.abs(x - t) < 1e-6) break;
    if (x < t) lo = u;
    else hi = u;
    u = 0.5 * (lo + hi);
  }
  return sampleY(u);
}

export function easeOutCraft(t: number): number {
  return evaluateCubicBezier(t, EASE_OUT_CRAFT[0], EASE_OUT_CRAFT[1], EASE_OUT_CRAFT[2], EASE_OUT_CRAFT[3]);
}

export interface RectViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function lerpViewBox(from: RectViewBox, to: RectViewBox, progress: number): RectViewBox {
  const p = Math.max(0, Math.min(1, progress));
  return {
    x: from.x + (to.x - from.x) * p,
    y: from.y + (to.y - from.y) * p,
    w: from.w + (to.w - from.w) * p,
    h: from.h + (to.h - from.h) * p,
  };
}

export function viewBoxNearlyEqual(a: RectViewBox, b: RectViewBox, eps = 0.25): boolean {
  return (
    Math.abs(a.x - b.x) < eps &&
    Math.abs(a.y - b.y) < eps &&
    Math.abs(a.w - b.w) < eps &&
    Math.abs(a.h - b.h) < eps
  );
}

/** SSR- and Node-safe check for system prefers-reduced-motion: reduce. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
