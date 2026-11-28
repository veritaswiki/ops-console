import type { ToastHandler } from '../types';

const HAS_CJK_RE = /[一-鿿]/;

/**
 * Translates raw backend English / HTTP / network error messages into concise,
 * actionable Chinese copy so users never see internal error strings.
 */
export function humanizeApiError(rawMessage?: string | null, status?: number): string {
  const msg = String(rawMessage || '').trim();
  const lower = msg.toLowerCase();

  // Read-only protection
  if (
    lower.includes('read-only mode') ||
    lower.includes('read only mode') ||
    lower.includes('readonly mode') ||
    (status === 403 && (lower.includes('read-only') || lower.includes('disables')))
  ) {
    return '当前为只读保护模式，无法执行修改操作';
  }

  // Confirm token / high-risk guard
  if (
    status === 409 &&
    (lower.includes('confirmtoken') || lower.includes('confirm token') || lower.includes('confirmation'))
  ) {
    return '该操作会影响关键服务，请先完成二次确认';
  }

  // Auth / permission
  if (status === 401 || lower.includes('unauthorized') || lower.includes('invalid session')) {
    return '登录状态已失效，请重新登录';
  }
  if (status === 403 || lower.includes('forbidden')) {
    return '权限不足，无法执行此操作';
  }

  // Validation / domain-specific English errors
  if (lower.includes('snoozeduntil must be a valid future')) {
    return '延后提醒时间必须晚于当前时间';
  }
  if (lower.includes('watermarkat must be a valid iso')) {
    return '已读时间格式无效，请重试';
  }
  if (lower.includes('prompt is required') || lower.includes('instruction is required')) {
    return '请先输入内容再提交';
  }

  // Not found
  if (status === 404 || lower === 'not found' || lower.endsWith(' not found')) {
    return '目标对象不存在或已被移除';
  }

  // Rate limit
  if (status === 429 || lower.includes('too many requests') || lower.includes('rate limit')) {
    return '操作过于频繁，请稍后再试';
  }

  // Network / timeout / abort
  if (lower.includes('aborterror') || lower === 'the operation was aborted.' || lower.includes('signal is aborted')) {
    return '请求已取消';
  }
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('econnrefused') ||
    lower.includes('load failed') ||
    status === 502 ||
    status === 503
  ) {
    return '服务暂时无法连接，请检查网络后重试';
  }
  if (lower.includes('timeout') || lower.includes('etimedout') || status === 504) {
    return '请求超时，节点响应较慢，请稍后重试';
  }

  // Raw HTTP status fallback
  if (!msg || /^http\s+\d{3}$/i.test(msg)) {
    if (status && status >= 500) return `服务处理异常（${status}），请稍后重试`;
    if (status && status >= 400) return `请求未能完成（${status}），请检查输入后重试`;
    return '操作失败，请稍后重试';
  }

  // Already contains Chinese — return cleanly
  if (HAS_CJK_RE.test(msg)) {
    return msg;
  }

  // Generic server error fallback for opaque English messages
  if (status && status >= 500) {
    return `服务处理异常（${status}）：${msg}`;
  }
  return msg;
}

/**
 * Safely extracts and humanizes any thrown error into a user-friendly Chinese message.
 */
export function extractErrorMessage(err: unknown, fallback = '操作失败，请稍后重试'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return humanizeApiError(err);
  const errorObj = err as { message?: string; status?: number; name?: string };
  if (errorObj.name === 'AbortError') return '请求已取消';
  const raw = errorObj.message || '';
  if (!raw && !errorObj.status) return fallback;
  return humanizeApiError(raw, errorObj.status);
}

/**
 * Unified guard for read-only mode. Replaces silent `if (readOnly) return;`
 * so users always receive immediate, clear feedback when clicking a protected action.
 * Returns true when the action is blocked.
 */
export function guardReadOnly(
  readOnly: boolean | undefined,
  onToast?: ToastHandler,
  actionLabel?: string,
): boolean {
  if (!readOnly) return false;
  const suffix = actionLabel ? `无法${actionLabel}` : '无法执行修改操作';
  onToast?.(`当前为只读模式，${suffix}`, 'info');
  return true;
}
