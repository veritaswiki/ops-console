import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createUiSlotRegistry,
  getRailPanelSlots,
  getSettingsSectionById,
  getSettingsSectionSlots,
  getSlotsByKind,
  getWorkspaceActionSlots,
  groupWorkspaceActionSlots,
  normalizeUiSlotName,
  RAIL_PANEL_SLOTS,
  SETTINGS_SECTION_SLOTS,
  WORKSPACE_ACTION_SLOTS,
} from './slots';
import type { DynamicUiSlotEntry, UiSlotIdentifier, UiSlotRegistry } from './slots';
import { CONSOLE_MODULES } from './registry';
import * as registryModule from './registry';
import * as slotsModule from './slots';

function registerWithAlias(
  registry: UiSlotRegistry,
  entry: Omit<DynamicUiSlotEntry, 'slot'> & { slot: UiSlotIdentifier },
): () => void {
  return registry.register(entry as DynamicUiSlotEntry);
}

test('UI slot registries maintain unique IDs, deterministic ordering, and typed kind tags', () => {
  const railIds = new Set(RAIL_PANEL_SLOTS.map((slot) => slot.id));
  assert.equal(railIds.size, RAIL_PANEL_SLOTS.length);
  assert.ok(RAIL_PANEL_SLOTS.every((slot) => slot.kind === 'rail-panel'));

  const sectionIds = new Set(SETTINGS_SECTION_SLOTS.map((slot) => slot.id));
  assert.equal(sectionIds.size, SETTINGS_SECTION_SLOTS.length);
  assert.deepEqual(
    SETTINGS_SECTION_SLOTS.map((slot) => slot.id),
    ['general', 'multi-device', 'orchestration', 'governance', 'gateway', 'cache'],
  );
  assert.ok(SETTINGS_SECTION_SLOTS.every((slot) => slot.kind === 'settings-section'));

  const actionIds = new Set(WORKSPACE_ACTION_SLOTS.map((slot) => slot.id));
  assert.equal(actionIds.size, WORKSPACE_ACTION_SLOTS.length);
  assert.ok(WORKSPACE_ACTION_SLOTS.every((slot) => slot.kind === 'workspace-action'));

  assert.equal(getSlotsByKind('rail-panel').length, RAIL_PANEL_SLOTS.length);
  assert.equal(getSlotsByKind('settings-section').length, SETTINGS_SECTION_SLOTS.length);
  assert.equal(getSlotsByKind('workspace-action').length, WORKSPACE_ACTION_SLOTS.length);
});

test('slot queries filter by view/region/harness/auth and support ordered extensions', () => {
  const agentRails = getRailPanelSlots({ viewId: 'agents' });
  assert.ok(agentRails.some((slot) => slot.id === 'sidebar-agent-threads'));
  assert.ok(!agentRails.some((slot) => slot.id === 'settings-section-rail'));

  const settingsRails = getRailPanelSlots({ region: 'settings-rail', viewId: 'agent-settings' });
  assert.deepEqual(
    settingsRails.map((slot) => slot.id),
    ['settings-section-rail'],
  );

  const harnessGroups = groupWorkspaceActionSlots({ isHarnessView: true, authEnabled: false });
  assert.deepEqual(
    harnessGroups.map((entry) => entry.group),
    ['command', 'preferences'],
  );
  assert.ok(!harnessGroups.flatMap((entry) => entry.slots).some((slot) => slot.id === 'session-logout'));

  const opsGroups = groupWorkspaceActionSlots({ isHarnessView: false, authEnabled: true });
  assert.deepEqual(
    opsGroups.map((entry) => entry.group),
    ['command', 'telemetry', 'preferences'],
  );
  assert.ok(opsGroups.flatMap((entry) => entry.slots).some((slot) => slot.id === 'session-logout'));

  const withExtra = getWorkspaceActionSlots({
    isHarnessView: false,
    authEnabled: false,
    extra: [
      {
        id: 'custom-diagnostic-action',
        kind: 'workspace-action',
        label: '诊断快照',
        group: 'telemetry',
        order: 22,
      },
    ],
  });
  const clockIdx = withExtra.findIndex((slot) => slot.id === 'telemetry-sync-clock');
  const extraIdx = withExtra.findIndex((slot) => slot.id === 'custom-diagnostic-action');
  const pollIdx = withExtra.findIndex((slot) => slot.id === 'telemetry-poll-interval');
  assert.ok(clockIdx >= 0 && extraIdx === clockIdx + 1 && pollIdx === extraIdx + 1);
});

test('settings section slots stay aligned with registry module count', () => {
  assert.equal(CONSOLE_MODULES.length, 16);
  const general = getSettingsSectionById('general');
  assert.equal(general.id, 'general');
  assert.equal(getSettingsSectionSlots({ group: 'cluster' }).length, 3);
});

test('createUiSlotRegistry registers dynamic entries in every slot and normalizes aliases', () => {
  const registry = createUiSlotRegistry();

  registerWithAlias(registry, {
    id: 'dynamic-rail',
    slot: 'rail-panel',
    label: 'Dynamic rail',
    description: 'Injected rail panel',
    region: 'sidebar-nav',
    viewIds: ['agents'],
  });
  registerWithAlias(registry, {
    id: 'dynamic-settings',
    slot: 'settings.section',
    label: 'Dynamic settings',
    group: 'cluster',
  });
  registerWithAlias(registry, {
    id: 'dynamic-action',
    slot: 'workspace-action',
    label: 'Dynamic action',
    group: 'preferences',
    shortcut: '⌘⇧D',
  });

  assert.equal(normalizeUiSlotName('rail-panel'), 'rail.panel');
  assert.equal(normalizeUiSlotName('rail.panel'), 'rail.panel');
  assert.equal(normalizeUiSlotName('settings-section'), 'settings.section');
  assert.equal(normalizeUiSlotName('settings.section'), 'settings.section');
  assert.equal(normalizeUiSlotName('workspace-action'), 'workspace.action');
  assert.equal(normalizeUiSlotName('workspace.action'), 'workspace.action');

  for (const [alias, canonical, id] of [
    ['rail-panel', 'rail.panel', 'dynamic-rail'],
    ['rail.panel', 'rail.panel', 'dynamic-rail'],
    ['settings-section', 'settings.section', 'dynamic-settings'],
    ['settings.section', 'settings.section', 'dynamic-settings'],
    ['workspace-action', 'workspace.action', 'dynamic-action'],
    ['workspace.action', 'workspace.action', 'dynamic-action'],
  ] as const) {
    const entry = registry.get(alias, id);
    assert.ok(entry, `expected entry reachable through ${alias}`);
    assert.equal(entry?.slot, canonical);
  }

  assert.equal(registry.get('rail.panel', 'dynamic-rail')?.slot, 'rail.panel');
  assert.equal(registry.get('rail-panel', 'dynamic-rail')?.label, 'Dynamic rail');
  assert.equal(registry.get('settings-section', 'dynamic-settings')?.slot, 'settings.section');
  assert.equal(registry.get('workspace.action', 'dynamic-action')?.shortcut, '⌘⇧D');
  assert.equal(registry.list('rail-panel').length, 1);
  assert.equal(registry.list('settings.section').length, 1);
  assert.equal(registry.list('workspace-action').length, 1);
  assert.deepEqual(registry.list('rail.panel')[0].viewIds, ['agents']);
});

test('dynamic slots sort by (order, id) with omitted orders defaulting to 100', () => {
  const registry = createUiSlotRegistry();
  registry.register({ id: 'zeta', slot: 'rail.panel', label: 'Z', order: 20 });
  registry.register({ id: 'alpha', slot: 'rail.panel', label: 'A', order: 20 });
  registry.register({ id: 'middle', slot: 'rail.panel', label: 'M' });
  registry.register({ id: 'first', slot: 'rail.panel', label: 'F', order: -5 });
  registry.register({ id: 'later', slot: 'rail.panel', label: 'L', order: 200 });

  assert.equal(registry.get('rail.panel', 'middle')?.order, 100);
  assert.deepEqual(
    registry.list('rail.panel').map((entry) => entry.id),
    ['first', 'alpha', 'zeta', 'middle', 'later'],
  );
  assert.deepEqual(
    registry.list('rail-panel').map((entry) => entry.order),
    [-5, 20, 20, 100, 200],
  );
});

test('dynamic slots hide disabled entries unless includeDisabled is set', () => {
  const registry = createUiSlotRegistry();
  registry.register({ id: 'visible-default', slot: 'workspace.action', label: 'Default' });
  registry.register({ id: 'visible-explicit', slot: 'workspace.action', label: 'On', enabled: true });
  registry.register({ id: 'hidden', slot: 'workspace.action', label: 'Off', enabled: false });

  assert.equal(registry.get('workspace.action', 'visible-default')?.enabled, true);
  assert.deepEqual(
    registry.list('workspace.action').map((entry) => entry.id),
    ['visible-default', 'visible-explicit'],
  );
  assert.deepEqual(
    registry.list('workspace.action', { includeDisabled: true }).map((entry) => entry.id),
    ['hidden', 'visible-default', 'visible-explicit'],
  );
  assert.equal(registry.get('workspace.action', 'hidden')?.enabled, false);
});

test('dispose is idempotent and never removes a re-registered slot with the same id', () => {
  const registry = createUiSlotRegistry();
  let notifications = 0;
  registry.subscribe(() => {
    notifications += 1;
  });

  const disposeFirst = registry.register({ id: 'shared', slot: 'settings.section', label: 'First' });
  assert.equal(notifications, 1);
  disposeFirst();
  assert.equal(notifications, 2);
  assert.equal(registry.get('settings.section', 'shared'), undefined);

  const disposeSecond = registry.register({
    id: 'shared',
    slot: 'settings.section',
    label: 'Second',
  });
  assert.equal(notifications, 3);

  disposeFirst();
  assert.equal(notifications, 3, 'second dispose call must not notify');
  assert.equal(registry.get('settings.section', 'shared')?.label, 'Second');
  assert.equal(registry.list('settings-section').length, 1);

  disposeSecond();
  assert.equal(notifications, 4);
  assert.equal(registry.get('settings.section', 'shared'), undefined);

  disposeSecond();
  assert.equal(notifications, 4, 'repeated dispose calls stay no-ops');
});

test('disposing a superseded registration leaves the newer entry intact', () => {
  const registry = createUiSlotRegistry();
  const disposeStale = registry.register({ id: 'dup', slot: 'rail.panel', label: 'stale' });
  registry.register({ id: 'dup', slot: 'rail.panel', label: 'fresh' });

  disposeStale();
  assert.equal(registry.get('rail.panel', 'dup')?.label, 'fresh');
  assert.equal(registry.list('rail.panel').length, 1);
});

test('unregister returns whether an entry was removed and notify cleanup stops delivery', () => {
  const registry = createUiSlotRegistry();
  const versions: number[] = [];
  const unsubscribe = registry.subscribe(() => versions.push(registry.getVersion()));

  assert.equal(registry.getVersion(), 0);
  const dispose = registry.register({ id: 'temporary', slot: 'rail.panel', label: 'Temp' });
  assert.equal(registry.getVersion(), 1);
  assert.deepEqual(versions, [1]);

  assert.equal(registry.unregister('rail.panel', 'missing'), false);
  assert.equal(registry.getVersion(), 1);
  assert.deepEqual(versions, [1]);

  assert.equal(registry.unregister('rail-panel', 'temporary'), true);
  assert.equal(registry.getVersion(), 2);
  assert.deepEqual(versions, [1, 2]);

  assert.equal(registry.unregister('rail.panel', 'temporary'), false);
  assert.equal(registry.getVersion(), 2);

  unsubscribe();
  registry.register({ id: 'after-unsubscribe', slot: 'rail.panel', label: 'Later' });
  assert.equal(registry.getVersion(), 3);
  assert.deepEqual(versions, [1, 2], 'unsubscribed listeners must not receive updates');

  dispose();
  assert.equal(registry.getVersion(), 3, 'dispose after unregister is a no-op');
});

test('filters cover region, viewId, group, and combinations', () => {
  const registry = createUiSlotRegistry();
  registry.register({
    id: 'nav-agents',
    slot: 'rail.panel',
    label: 'Agents nav',
    region: 'sidebar-nav',
    viewIds: ['agents'],
  });
  registry.register({
    id: 'nav-ops',
    slot: 'rail.panel',
    label: 'Ops nav',
    region: 'sidebar-nav',
    viewIds: ['ops'],
  });
  registry.register({
    id: 'threads',
    slot: 'rail.panel',
    label: 'Threads',
    region: 'sidebar-threads',
    viewIds: ['agents'],
  });
  registry.register({ id: 'regionless', slot: 'rail.panel', label: 'Regionless' });

  assert.deepEqual(
    registry.list('rail.panel', { region: 'sidebar-nav' }).map((entry) => entry.id),
    ['nav-agents', 'nav-ops'],
  );
  assert.deepEqual(
    registry.list('rail.panel', { region: 'settings-rail' }),
    [],
    'region filter excludes entries without a matching region',
  );
  assert.deepEqual(
    registry.list('rail.panel', { viewId: 'agents' }).map((entry) => entry.id),
    ['nav-agents', 'regionless', 'threads'],
    'viewId filter keeps entries that declare no viewIds',
  );
  assert.deepEqual(
    registry.list('rail.panel', { region: 'sidebar-nav', viewId: 'agents' }).map((e) => e.id),
    ['nav-agents'],
  );

  registry.register({ id: 'act-command', slot: 'workspace.action', label: 'Cmd', group: 'command' });
  registry.register({ id: 'act-telemetry', slot: 'workspace.action', label: 'Tel', group: 'telemetry' });
  registry.register({ id: 'act-ungrouped', slot: 'workspace.action', label: 'None' });

  assert.deepEqual(
    registry.list('workspace.action', { group: 'telemetry' }).map((entry) => entry.id),
    ['act-telemetry'],
  );
  assert.deepEqual(
    registry.list('workspace.action').map((entry) => entry.id),
    ['act-command', 'act-telemetry', 'act-ungrouped'],
  );
  assert.deepEqual(
    registry.list('workspace-action', { group: 'preferences' }),
    [],
  );
});

test('clear scopes by slot, notifies once per change, and is a no-op when empty', () => {
  const registry = createUiSlotRegistry();
  let notifications = 0;
  registry.subscribe(() => {
    notifications += 1;
  });

  registry.register({ id: 'rail-a', slot: 'rail.panel', label: 'A' });
  registry.register({ id: 'rail-b', slot: 'rail.panel', label: 'B' });
  registry.register({ id: 'section-a', slot: 'settings.section', label: 'S' });
  registry.register({ id: 'action-a', slot: 'workspace.action', label: 'X' });
  assert.equal(notifications, 4);

  registry.clear('rail-panel');
  assert.equal(notifications, 5);
  assert.equal(registry.list('rail.panel').length, 0);
  assert.equal(registry.list('settings.section').length, 1);
  assert.equal(registry.list('workspace.action').length, 1);

  registry.clear('rail.panel');
  assert.equal(notifications, 5, 'clearing an empty slot must not notify');

  registry.clear();
  assert.equal(notifications, 6);
  assert.equal(registry.list('rail.panel').length, 0);
  assert.equal(registry.list('settings.section').length, 0);
  assert.equal(registry.list('workspace.action').length, 0);

  registry.clear();
  assert.equal(notifications, 6, 'clearing an empty registry must not notify');
});

test('register rejects empty or whitespace-only ids without mutating state', () => {
  const registry = createUiSlotRegistry();
  let notifications = 0;
  registry.subscribe(() => {
    notifications += 1;
  });

  for (const id of ['', '   ', '\t\n']) {
    assert.throws(
      () => registry.register({ id, slot: 'rail.panel', label: 'Invalid' }),
      /UI slot id must be a non-empty string/,
    );
  }
  assert.throws(
    () => registry.register({ id: undefined as unknown as string, slot: 'rail.panel', label: 'X' }),
    /UI slot id must be a non-empty string/,
  );
  assert.equal(notifications, 0);
  assert.equal(registry.getVersion(), 0);
  assert.equal(registry.list('rail.panel').length, 0);
});

test('registry.ts re-exports keep the slot surface and the 16 console modules intact', () => {
  assert.equal(registryModule.createUiSlotRegistry, slotsModule.createUiSlotRegistry);
  assert.equal(registryModule.normalizeUiSlotName, slotsModule.normalizeUiSlotName);
  assert.equal(registryModule.RAIL_PANEL_SLOTS, slotsModule.RAIL_PANEL_SLOTS);
  assert.equal(registryModule.SETTINGS_SECTION_SLOTS, slotsModule.SETTINGS_SECTION_SLOTS);
  assert.equal(registryModule.WORKSPACE_ACTION_SLOTS, slotsModule.WORKSPACE_ACTION_SLOTS);
  assert.equal(
    registryModule.WORKSPACE_ACTION_GROUP_ORDER,
    slotsModule.WORKSPACE_ACTION_GROUP_ORDER,
  );
  assert.equal(registryModule.getRailPanelSlots, slotsModule.getRailPanelSlots);
  assert.equal(registryModule.getSettingsSectionSlots, slotsModule.getSettingsSectionSlots);
  assert.equal(registryModule.getSettingsSectionById, slotsModule.getSettingsSectionById);
  assert.equal(registryModule.getWorkspaceActionSlots, slotsModule.getWorkspaceActionSlots);
  assert.equal(registryModule.groupWorkspaceActionSlots, slotsModule.groupWorkspaceActionSlots);
  assert.equal(registryModule.getSlotsByKind, slotsModule.getSlotsByKind);
  assert.equal(registryModule.registerUiSlot, slotsModule.registerUiSlot);
  assert.equal(registryModule.useUiSlots, slotsModule.useUiSlots);
  assert.equal(registryModule.uiSlotRegistry, slotsModule.uiSlotRegistry);

  assert.equal(typeof registryModule.uiSlotRegistry.list, 'function');
  assert.equal(typeof registryModule.uiSlotRegistry.subscribe, 'function');
  assert.equal(CONSOLE_MODULES.length, 16);
});
