import crypto from 'node:crypto';

const REDACT_RULES = [
  { re: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g, replace: '[REDACTED_PRIVATE_KEY]' },
  { re: /\b(Bearer\s+)[A-Za-z0-9._~+/=-]{12,}/gi, replace: '$1[REDACTED]' },
  { re: /([?&](?:k|key|token|api_key|apikey|secret|access_token)=)[^&\s"'<>]+/gi, replace: '$1[REDACTED]' },
  { re: /\b(ops_prb_[A-Za-z0-9_-]{8,})\b/g, replace: '[REDACTED_PROBE_TOKEN]' },
  { re: /\b(sk-(?:proj-|ant-|live-|test-)?[A-Za-z0-9_-]{12,})\b/g, replace: '[REDACTED_API_KEY]' },
  { re: /\b(gh[pousr]_[A-Za-z0-9_-]{12,})\b/g, replace: '[REDACTED_GH_TOKEN]' },
  { re: /\b(tskey-[A-Za-z0-9_-]{12,})\b/g, replace: '[REDACTED_TS_KEY]' },
  { re: /(--?(?:api[-_]?key|token|secret|password|passwd|web[-_]?key|auth[-_]?key)[=\s]+)(?:"[^"]*"|'[^']*'|[^\s]+)/gi, replace: '$1[REDACTED]' },
  { re: /((?:authorization|x-api-key|x-auth-token|cookie|set-cookie)\s*:\s*)[^\r\n]+/gi, replace: '$1[REDACTED]' },
  { re: /\b([A-Fa-f0-9]{40,})\b/g, replace: '[REDACTED_HEX]' },
];

const SENSITIVE_HEADER_NAME_RE = /(?:authorization|proxy-authorization|cookie|set-cookie|api[-_]?key|auth[-_]?token|access[-_]?token|x-.*(?:token|key|secret|auth)|secret|password|passwd|credential)/i;

export function redactText(input) {
  if (input === null || input === undefined) return '';
  let out = String(input);
  for (const rule of REDACT_RULES) {
    out = out.replace(rule.re, rule.replace);
  }
  return out;
}

export function redactCommand(cmd, maxLen = 160) {
  return redactText(String(cmd || '')).slice(0, maxLen);
}

export function redactLogEntry(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  const next = { ...entry };
  if (typeof next.message === 'string') {
    next.message = redactText(next.message);
  }
  if (typeof next.output === 'string') {
    next.output = redactText(next.output);
  }
  if (typeof next.error === 'string') {
    next.error = redactText(next.error);
  }
  return next;
}

export function redactHeaders(headers) {
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
    return headers;
  }
  const out = {};
  for (const [headerName, headerValue] of Object.entries(headers)) {
    if (SENSITIVE_HEADER_NAME_RE.test(headerName)) {
      out[headerName] = '[REDACTED]';
    } else if (typeof headerValue === 'string') {
      out[headerName] = redactText(headerValue);
    } else {
      out[headerName] = headerValue;
    }
  }
  return out;
}

export function redactConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return config;
  }
  const next = { ...config };
  if (next.auth && typeof next.auth === 'object' && !Array.isArray(next.auth)) {
    next.auth = {
      ...next.auth,
      ...(next.auth.webKey ? { webKey: '[REDACTED]' } : {}),
    };
  }
  if (next.a2a && typeof next.a2a === 'object' && !Array.isArray(next.a2a)) {
    next.a2a = {
      ...next.a2a,
      ...(next.a2a.sharedSecret ? { sharedSecret: '[REDACTED]' } : {}),
    };
  }
  if (next.observability && typeof next.observability === 'object' && !Array.isArray(next.observability)) {
    next.observability = {
      ...next.observability,
      ...(Array.isArray(next.observability.adapters)
        ? {
            adapters: next.observability.adapters.map((adapter) => {
              if (!adapter || typeof adapter !== 'object' || Array.isArray(adapter)) return adapter;
              const nextAdapter = { ...adapter };
              if (nextAdapter.headers && typeof nextAdapter.headers === 'object' && !Array.isArray(nextAdapter.headers)) {
                nextAdapter.headers = redactHeaders(nextAdapter.headers);
              }
              if (typeof nextAdapter.url === 'string') {
                nextAdapter.url = redactText(nextAdapter.url);
              }
              return nextAdapter;
            }),
          }
        : {}),
    };
  }
  return next;
}

export function maskClientIp(ip, { expose = false, salt = 'ops-console' } = {}) {
  const clean = String(ip || '').trim().replace(/^::ffff:/, '');
  if (!clean) return '';
  if (expose) return clean;
  if (clean === '127.0.0.1' || clean === '::1') return clean;
  const digest = crypto.createHash('sha256').update(`${salt}:${clean}`).digest('hex').slice(0, 12);
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(clean)) {
    const parts = clean.split('.');
    return `${parts[0]}.${parts[1]}.x.x#${digest.slice(0, 6)}`;
  }
  return `ip#${digest}`;
}
