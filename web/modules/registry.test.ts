import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSOLE_MODULES,
  getModuleByChord,
  getModuleById,
  getModulesGroupedByDomain,
  isValidViewId,
  MODULE_DOMAINS,
  parseViewFromHash,
} from './registry';

test('CONSOLE_MODULES registers all 16 codified modules with unique IDs and keyboard chords', () => {
  assert.equal(CONSOLE_MODULES.length, 16);

  const ids = new Set(CONSOLE_MODULES.map((m) => m.id));
  const chords = new Set(CONSOLE_MODULES.map((m) => m.chord.toLowerCase()));
  assert.equal(ids.size, 16);
  assert.equal(chords.size, 16);

  for (const mod of CONSOLE_MODULES) {
    assert.ok(mod.label.length > 0);
    assert.ok(mod.shortDesc.length > 0);
    assert.ok(mod.keywords.length > 0);
    assert.ok(mod.benchmarks.references.length > 0);
    assert.ok(mod.benchmarks.migratedCapabilities.length > 0);
    assert.equal(getModuleById(mod.id).id, mod.id);
    assert.equal(getModuleByChord(mod.chord), mod.id);
  }
});

test('getModulesGroupedByDomain places Harness section first with Agent, Tasks, Graph, Bot, GitHub, and Settings', () => {
  const grouped = getModulesGroupedByDomain();
  assert.equal(grouped.length, MODULE_DOMAINS.length);
  assert.equal(grouped[0].domain.id, 'agent');
  assert.equal(grouped[0].domain.title, 'Harness');
  assert.equal(grouped[0].modules[0].label, 'Agent');
  assert.deepEqual(
    grouped[0].modules.map((m) => m.id),
    ['agents', 'projects', 'graph', 'bots', 'github', 'agent-settings'],
  );
  const total = grouped.reduce((sum, g) => sum + g.modules.length, 0);
  assert.equal(total, CONSOLE_MODULES.length);
});

test('parseViewFromHash and isValidViewId handle hash deep-links and aliases safely', () => {
  assert.equal(isValidViewId('agents'), true);
  assert.equal(isValidViewId('github'), true);
  assert.equal(isValidViewId('bots'), true);
  assert.equal(isValidViewId('agent-settings'), true);
  assert.equal(isValidViewId('unknown'), false);

  assert.equal(parseViewFromHash('#agents'), 'agents');
  assert.equal(parseViewFromHash('#tasks'), 'projects');
  assert.equal(parseViewFromHash('#github'), 'github');
  assert.equal(parseViewFromHash('#bots'), 'bots');
  assert.equal(parseViewFromHash('#graph'), 'graph');
  assert.equal(parseViewFromHash('#agent-settings'), 'agent-settings');
  assert.equal(parseViewFromHash('#/services?tab=failed'), 'services');
  assert.equal(parseViewFromHash('#invalid-view'), null);
  assert.equal(parseViewFromHash(''), null);
});
