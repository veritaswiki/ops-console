import test from 'node:test';
import assert from 'node:assert/strict';
import { extractErrorMessage, guardReadOnly, humanizeApiError } from './ux-errors';

test('humanizeApiError converts raw backend/HTTP/network errors to plain Chinese', () => {
  assert.equal(
    humanizeApiError('Read-only mode disables A2A workspace mutations', 403),
    '当前为只读保护模式，无法执行修改操作',
  );
  assert.equal(
    humanizeApiError('confirmToken is required for critical service', 409),
    '该操作会影响关键服务，请先完成二次确认',
  );
  assert.equal(humanizeApiError('Unauthorized', 401), '登录状态已失效，请重新登录');
  assert.equal(humanizeApiError('Forbidden', 403), '权限不足，无法执行此操作');
  assert.equal(humanizeApiError('Task not found', 404), '目标对象不存在或已被移除');
  assert.equal(humanizeApiError('Too Many Requests', 429), '操作过于频繁，请稍后再试');
  assert.equal(humanizeApiError('Failed to fetch'), '服务暂时无法连接，请检查网络后重试');
  assert.equal(humanizeApiError('HTTP 504', 504), '请求超时，节点响应较慢，请稍后重试');
  assert.equal(humanizeApiError('HTTP 500', 500), '服务处理异常（500），请稍后重试');
  assert.equal(
    humanizeApiError('snoozedUntil must be a valid future ISO timestamp', 400),
    '延后提醒时间必须晚于当前时间',
  );
  assert.equal(humanizeApiError('节点连接超时，请检查探针状态', 500), '节点连接超时，请检查探针状态');
});

test('extractErrorMessage handles Error instances, AbortError, strings, and nullish values', () => {
  const abortErr = new Error('The operation was aborted.');
  abortErr.name = 'AbortError';
  assert.equal(extractErrorMessage(abortErr), '请求已取消');

  const httpErr = Object.assign(new Error('Read-only mode disables action'), { status: 403 });
  assert.equal(extractErrorMessage(httpErr), '当前为只读保护模式，无法执行修改操作');
  assert.equal(extractErrorMessage(null, '自定义兜底'), '自定义兜底');
});

test('guardReadOnly emits clear feedback when readOnly is true and passes when false', () => {
  const messages: Array<{ text: string; tone?: string }> = [];
  const toast = (text: string, tone?: 'info' | 'ok' | 'err') => {
    messages.push({ text, tone });
  };

  assert.equal(guardReadOnly(false, toast, '删除规则'), false);
  assert.equal(messages.length, 0);

  assert.equal(guardReadOnly(true, toast, '删除规则'), true);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].text, '当前为只读模式，无法删除规则');
  assert.equal(messages[0].tone, 'info');
});
