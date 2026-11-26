import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSOLE_MODULES,
  MODULE_DOMAINS,
  getModuleByChord,
  getModuleById,
  getModulesGroupedByDomain,
  isValidViewId,
  parseViewFromHash,
} from './registry.ts';

test('CONSOLE_MODULES registers all 10 codified modules with unique IDs and keyboard chords', () => {
  assert.equal(CONSOLE_MODULES.length, 10);
  const ids = new Set(CONSOLE_MODULES.map((m) => m.id));
  const chords = new Set(CONSOLE_MODULES.map((m) => m.chord));
  assert.equal(ids.size, 10);
  assert.equal(chords.size, 10);

  for (const mod of CONSOLE_MODULES) {
    assert.ok(mod.label.length > 0);
    assert.ok(mod.benchmarks.references.length >= 2);
    assert.ok(mod.benchmarks.migratedCapabilities.length >= 2);
    assert.equal(getModuleById(mod.id).id, mod.id);
    assert.equal(getModuleByChord(mod.chord), mod.id);
  }
});

test('getModulesGroupedByDomain covers all 3 domains and all 10 modules cleanly', () => {
  const grouped = getModulesGroupedByDomain();
  assert.equal(grouped.length, MODULE_DOMAINS.length);
  const total = grouped.reduce((sum, g) => sum + g.modules.length, 0);
  assert.equal(total, 10);
});

test('parseViewFromHash and isValidViewId handle hash deep-links safely', () => {
  assert.equal(parseViewFromHash('#services'), 'services');
  assert.equal(parseViewFromHash('#/logs?unit=magpie'), 'logs');
  assert.equal(parseViewFromHash('#NETWORK'), 'network');
  assert.equal(parseViewFromHash('#unknown-view'), null);
  assert.equal(parseViewFromHash(''), null);
  assert.equal(isValidViewId('overview'), true);
  assert.equal(isValidViewId('bogus'), false);
});
