import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatMagpieModelOption,
  formatSigningSourceLabel,
  groupMagpieModels,
  matchMagpieBindingForAgent,
  resolveAgentDefaultModel,
} from './magpie-models';
import type { A2AAgentPeer, MagpieAgentBinding, MagpieModelItem } from '../types';

const SAMPLE_MODELS: MagpieModelItem[] = [
  {
    id: 'opencode-go/glm-5.3',
    displayName: 'GLM-5.3',
    label: 'GLM-5.3 · OpenCode Go',
    provider: 'opencode-go',
    group: 'opencode-go',
    isRoutingGroup: false,
    reasoning: true,
    reasoningLevels: ['low', 'high'],
    contextWindow: 200000,
    maxOutputTokens: 65536,
    toolCall: true,
  },
  {
    id: 'auto/deepseek-v4.1-flash',
    displayName: 'DeepSeek V4.1 Flash',
    label: 'DeepSeek V4.1 Flash · routing group',
    provider: 'qoder-cn',
    group: 'routing-group',
    isRoutingGroup: true,
    reasoning: true,
    reasoningLevels: ['low', 'high', 'max'],
    contextWindow: 1048576,
    maxOutputTokens: 384000,
    toolCall: true,
  },
  {
    id: 'agy-cli/claude-sonnet-5-5',
    displayName: 'Claude Sonnet 5.5',
    label: 'Claude Sonnet 5.5 · Antigravity',
    provider: 'agy-cli',
    group: 'agy-cli',
    isRoutingGroup: false,
    reasoning: false,
    reasoningLevels: [],
    contextWindow: 200000,
    maxOutputTokens: 64000,
    toolCall: true,
  },
];

const SAMPLE_BINDINGS: MagpieAgentBinding[] = [
  {
    name: 'Codex',
    harness: 'codex',
    rawModel: 'auto/deepseek-v4.1-flash',
    model: 'auto/deepseek-v4.1-flash',
    canonicalModel: 'auto/deepseek-v4.1-flash',
    mode: 'pinned',
    effort: 'high',
    configSource: '~/.codex/config.toml',
  },
  {
    name: 'Pi',
    harness: 'pi',
    rawModel: 'magpie/auto/deepseek-v4.1-flash',
    model: 'auto/deepseek-v4.1-flash',
    canonicalModel: 'auto/deepseek-v4.1-flash',
    mode: 'pinned',
    effort: 'high',
    configSource: '~/.pi/agent/settings.json',
  },
];

test('groupMagpieModels places routing groups first and buckets remaining models by provider', () => {
  const groups = groupMagpieModels(SAMPLE_MODELS);
  assert.equal(groups.length, 3);
  assert.equal(groups[0].id, 'routing-group');
  assert.equal(groups[0].isRoutingGroup, true);
  assert.equal(groups[0].models[0].id, 'auto/deepseek-v4.1-flash');
});

test('matchMagpieBindingForAgent and resolveAgentDefaultModel prefer live Magpie binding over hints', () => {
  const codexAgent = {
    id: 'a2a-hub-codex-lead',
    name: 'Codex CLI',
    harness: 'codex',
    nodeId: 'cn-ctyun-east',
    nodeName: 'Tianyi Cloud',
    role: 'lead',
    delegatable: true,
    status: 'healthy',
    protocolVersion: '0.3',
    modelHint: 'legacy-hint',
  } as A2AAgentPeer;

  const binding = matchMagpieBindingForAgent(codexAgent, SAMPLE_BINDINGS);
  assert.equal(binding?.canonicalModel, 'auto/deepseek-v4.1-flash');

  const resolved = resolveAgentDefaultModel(codexAgent, SAMPLE_BINDINGS, 'fallback-model');
  assert.equal(resolved.source, 'magpie');
  assert.equal(resolved.model, 'auto/deepseek-v4.1-flash');

  const fallbackResolved = resolveAgentDefaultModel(null, [], 'auto/gemini-4-argon');
  assert.equal(fallbackResolved.source, 'orchestrator');
  assert.equal(fallbackResolved.model, 'auto/gemini-4-argon');
});

test('formatMagpieModelOption and formatSigningSourceLabel produce readable labels', () => {
  assert.match(formatMagpieModelOption(SAMPLE_MODELS[1]), /DeepSeek V4\.1 Flash.*auto\/deepseek-v4\.1-flash.*推理/);
  assert.equal(formatSigningSourceLabel('file'), '密钥文件 (0600)');
  assert.equal(formatSigningSourceLabel('ephemeral'), '进程内临时密钥');
});
