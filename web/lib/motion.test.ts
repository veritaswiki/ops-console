import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DURATION,
  DURATION_MS,
  EASE_EXIT,
  EASE_IN_OUT,
  EASE_OUT_CRAFT,
  NUMBER_FLOW_TIMING,
  SPRING_GENTLE,
  SPRING_SHEET,
  SPRING_SNAPPY,
  TRANSITION_ENTER,
  TRANSITION_EXIT,
  easeOutCraft,
  evaluateCubicBezier,
  lerpViewBox,
  prefersReducedMotion,
  viewBoxNearlyEqual,
} from './motion';

test('motion durations follow monotonic Apple scale and exit is faster than enter', () => {
  assert.equal(DURATION.instant, 0);
  assert.ok(DURATION.micro < DURATION.fast);
  assert.ok(DURATION.fast < DURATION.standard);
  assert.ok(DURATION.standard < DURATION.sheet);
  assert.ok(DURATION.sheet < DURATION.emphasis);
  assert.ok(TRANSITION_EXIT.duration < TRANSITION_ENTER.duration);

  assert.equal(DURATION_MS.micro, Math.round(DURATION.micro * 1000));
  assert.equal(DURATION_MS.fast, Math.round(DURATION.fast * 1000));
  assert.equal(DURATION_MS.standard, Math.round(DURATION.standard * 1000));
  assert.equal(DURATION_MS.sheet, Math.round(DURATION.sheet * 1000));
  assert.equal(DURATION_MS.emphasis, Math.round(DURATION.emphasis * 1000));
});

test('critically damped springs have no playful overshoot (damping ratio >= 0.85)', () => {
  for (const spring of [SPRING_SNAPPY, SPRING_SHEET, SPRING_GENTLE]) {
    const zeta = spring.damping / (2 * Math.sqrt(spring.stiffness * spring.mass));
    assert.ok(zeta >= 0.85, `Expected critically damped spring zeta >= 0.85, got ${zeta}`);
  }
});

test('easeOutCraft cubic-bezier solver is monotonic, bounded, and front-loaded', () => {
  assert.equal(easeOutCraft(-0.1), 0);
  assert.equal(easeOutCraft(0), 0);
  assert.equal(easeOutCraft(1), 1);
  assert.equal(easeOutCraft(1.5), 1);

  let prev = 0;
  for (let i = 1; i <= 20; i += 1) {
    const t = i / 20;
    const y = easeOutCraft(t);
    assert.ok(y >= prev - 1e-6, `Expected monotonic easeOutCraft at t=${t}`);
    assert.ok(y <= 1 + 1e-6, `Expected bounded easeOutCraft at t=${t}`);
    prev = y;
  }

  // Ease-out curve must travel well past 50% at midpoint t=0.5
  assert.ok(easeOutCraft(0.5) > 0.78);
  // Linear bezier check
  assert.ok(Math.abs(evaluateCubicBezier(0.35, 0, 0, 1, 1) - 0.35) < 1e-5);
  assert.equal(EASE_OUT_CRAFT.length, 4);
  assert.equal(EASE_EXIT.length, 4);
  assert.equal(EASE_IN_OUT.length, 4);
  assert.equal(NUMBER_FLOW_TIMING.transformTiming.duration, 280);
});

test('lerpViewBox and viewBoxNearlyEqual interpolate smoothly and clamp bounds', () => {
  const from = { x: 0, y: 0, w: 1000, h: 480 };
  const to = { x: 200, y: 80, w: 500, h: 240 };

  assert.deepEqual(lerpViewBox(from, to, -1), from);
  assert.deepEqual(lerpViewBox(from, to, 0), from);
  assert.deepEqual(lerpViewBox(from, to, 0.5), { x: 100, y: 40, w: 750, h: 360 });
  assert.deepEqual(lerpViewBox(from, to, 1), to);
  assert.deepEqual(lerpViewBox(from, to, 2), to);

  assert.equal(viewBoxNearlyEqual(from, { x: 0.1, y: -0.1, w: 1000.2, h: 479.9 }), true);
  assert.equal(viewBoxNearlyEqual(from, to), false);
});

test('prefersReducedMotion is safe in Node environment without window', () => {
  assert.equal(prefersReducedMotion(), false);
});
