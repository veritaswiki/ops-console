import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeVisibleRange } from './virtual-list.ts';

describe('computeVisibleRange', () => {
  it('handles empty list cleanly', () => {
    const res = computeVisibleRange({
      scrollTop: 0,
      viewportHeight: 460,
      itemCount: 0,
      itemHeight: 24,
      overscan: 8,
    });
    assert.deepEqual(res, { startIndex: 0, endIndex: 0, offsetTop: 0, totalHeight: 0 });
  });

  it('computes initial visible window with overscan clamping', () => {
    const res = computeVisibleRange({
      scrollTop: 0,
      viewportHeight: 240,
      itemCount: 400,
      itemHeight: 24,
      overscan: 5,
    });
    assert.equal(res.startIndex, 0);
    assert.equal(res.endIndex, 15);
    assert.equal(res.offsetTop, 0);
    assert.equal(res.totalHeight, 9600);
  });

  it('computes mid-scroll slice with accurate offsetTop', () => {
    const res = computeVisibleRange({
      scrollTop: 2400,
      viewportHeight: 240,
      itemCount: 400,
      itemHeight: 24,
      overscan: 6,
    });
    assert.equal(res.startIndex, 94);
    assert.equal(res.endIndex, 116);
    assert.equal(res.offsetTop, 94 * 24);
  });

  it('clamps endIndex and scrollTop when scrolled past bottom', () => {
    const res = computeVisibleRange({
      scrollTop: 999999,
      viewportHeight: 240,
      itemCount: 50,
      itemHeight: 24,
      overscan: 4,
    });
    assert.equal(res.endIndex, 50);
    assert.equal(res.startIndex, 36);
    assert.equal(res.totalHeight, 1200);
  });
});
