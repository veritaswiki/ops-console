# Security Policy

## Supported Versions

| Version | Supported |
| --- | --- |
| `2.0.x` | Yes |
| `< 2.0.0` | No (upgrade to `2.0.x`) |

---

## Reporting a Vulnerability

**Please do not open public GitHub issues for suspected security vulnerabilities.**

Instead, use **GitHub Private Vulnerability Reporting** (*Security* tab -> *Advisories* -> *Report a vulnerability*) on this repository. Include:

1. A concise description of the vulnerability and affected component/route.
2. Minimal reproduction steps or proof-of-concept request.
3. Potential impact (authentication bypass, command execution, path traversal, CSRF, DoS, secret leak).
4. Any suggested remediation or patch (optional).

We aim to acknowledge reports within **72 hours** and provide an initial triage assessment or remediation timeline within **7 days**.

---

## Threat Model

Ops Console is a **privileged host & service control plane** intended for private loopback or private mesh (e.g., Tailscale / WireGuard) networks. It is **not** designed to be exposed directly to the public internet without an authenticating TLS reverse proxy and strong Web Key protection.

### Built-In Security Controls

- **No Shell Execution**: Subprocesses execute strictly through `child_process.execFile` and `spawn(..., { shell: false })` with static argument arrays.
- **Allowlist Enforcement**: Service controls, timer controls, journal queries, log file readers, and ops scripts operate strictly on items declared in configuration.
- **Path Traversal Defense**: Allowlisted log files are canonicalized via `fs.realpath` and verified against containment boundaries before reading.
- **Web Key Authentication**: When `--web-key` / `OPS_CONSOLE_WEB_KEY` (`>= 16` chars) is set, every route except `/api/ping` and sign-in requires either a signed `HttpOnly; SameSite=Lax` session cookie (derived via HMAC and verified with `crypto.timingSafeEqual`) or `Authorization: Bearer <key>`. Query-string `?k=<key>` tokens are exchanged via redirect so secrets do not linger in browser history.
- **CSRF Protection**: All mutating `POST` routes verify `Origin` / `Referer` against the request host and `security.allowedOrigins`.
- **Rate Limiting & Resource Caps**: Sliding-window per-IP rate limits protect both read (`rateLimitPerMinute`) and mutating (`mutatingRateLimitPerMinute`) routes; concurrent SSE log streams are capped by `maxSseStreams`; JSON request bodies are bounded to 64 KB.
- **Security Headers**: Responses set `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and `Cache-Control: no-store` on API responses.
- **Audit Logging**: Every mutating operation writes a structured JSONL entry (`actor`, `ip`, `requestId`, `target`, `action`, `durationMs`, `result`) to `<dataDir>/audit.jsonl`.

---

## Production Hardening Checklist

1. **Bind Narrowly**: Keep the default `--host 127.0.0.1`, or use explicit multi-host binding (`--hosts 127.0.0.1,100.64.0.10`) for loopback + Tailnet access. Avoid `0.0.0.0`.
2. **Enable Web Key Authentication**: Always set a random `>= 32`-character `OPS_CONSOLE_WEB_KEY` via environment variable or `0600` `EnvironmentFile` whenever binding beyond `127.0.0.1`. Do not store production keys in version-controlled files.
3. **Prefer TLS Termination**: Put Ops Console behind Tailscale Serve (`tailscale serve --bg --https=8444 http://127.0.0.1:4320`) or an internal TLS reverse proxy so session cookies receive the `Secure` attribute.
4. **Use Read-Only Mode for Dashboards**: Pass `--read-only` (or `OPS_CONSOLE_READ_ONLY=1`) on shared or purely observational instances.
5. **Verify SSH Host Keys**: Keep `strictHostKeyChecking: "yes"` (default) for remote SSH nodes and pre-populate `~/.ssh/known_hosts` with dedicated least-privilege keys.
6. **Restrict Configuration & Data Permissions**: Set `chmod 600` on `config.local.json`, `~/.config/ops-console/config.json`, and `~/.config/ops-console/env`, and `chmod 700` on the data directory containing `audit.jsonl`.
7. **Run as Non-Root**: Use the provided user systemd unit, the hardened system unit (`ProtectSystem=strict`, `PrivateTmp=true`), or the non-root `ops` user in the official `Dockerfile`.
