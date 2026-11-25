# Security Policy

## Supported Versions

| Version | Supported |
| --- | --- |
| `0.3.x` | Yes |
| `0.2.x` | Security fixes (upgrade to `0.3.x`) |
| `< 0.2.0` | No (upgrade to `0.3.x`) |

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
- **Per-Service Action Allowlists**: `services[].allowedActions` narrows the valid systemd verbs for each unit; an unlisted action is rejected with HTTP `403`.
- **Critical Action Confirmation**: When `security.requireCriticalConfirm` is enabled (default), `risk: "critical"` services require a server-side, single-use, 30-second `confirmToken` from `POST /api/actions/confirm-token`. Missing, expired, mismatched, or reused tokens return HTTP `409`; the token never proves intent across a different unit or action.
- **Path Traversal Defense**: Allowlisted log files are canonicalized via `fs.realpath` and verified against containment boundaries before reading.
- **Web Key Authentication**: When `--web-key` / `OPS_CONSOLE_WEB_KEY` (`>= 16` chars) is set, every route except `/api/ping` and sign-in requires either a signed `HttpOnly; SameSite=Lax` session cookie (derived via HMAC and verified with `crypto.timingSafeEqual`) or `Authorization: Bearer <key>`. Query-string `?k=<key>` tokens are exchanged via redirect so secrets do not linger in browser history. Prefer `OPS_CONSOLE_WEB_KEY_FILE` or systemd `LoadCredential` over environment variables or `--web-key`.
- **Secret Indirection**: Configuration secrets accept `env://VAR` and `file:///path`; file references must be regular files with `0600` (or stricter) permissions. Literal secrets in configuration produce a startup warning.
- **CSRF Protection**: All mutating `POST` routes verify `Origin` / `Referer` against the request host and `security.allowedOrigins`.
- **Rate Limiting & Resource Caps**: Sliding-window per-IP rate limits protect both read (`rateLimitPerMinute`) and mutating (`mutatingRateLimitPerMinute`) routes; concurrent SSE log streams are capped by `maxSseStreams`; JSON request bodies are bounded to 64 KB.
- **Security Headers**: Responses set `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and `Cache-Control: no-store` on API responses.
- **Unified Redaction**: Logs, exports, SSE frames, audit output, and command lines pass through `src/redact.mjs`, which removes private keys, bearer tokens, probe tokens, API keys, query-string secrets, auth headers, and long hex identifiers.
- **Client IP Privacy**: `security.exposeClientIps` defaults to `false`; audit records and `/api/probes` expose salted masked client/probe IPs unless explicitly configured otherwise.
- **Filesystem & Credential Hygiene**: Data directories are created `0700` and runtime files `0600`; systemd units set `UMask=0077`. Probe install hints use `--token-file -` heredoc stdin so one-time tokens never enter `argv` or `ps`.
- **Read-Only Firewall Inspection**: `src/connectors/firewall.mjs` only runs `iptables-save -c`, `ip6tables-save -c`, `ss -Htlpn`, and `ss -Hulpn`. Ops Console never adds, deletes, or flushes firewall rules.
- **Audit Logging**: Every mutating operation writes a structured JSONL entry (`actor`, `ip`, `requestId`, `target`, `action`, `durationMs`, `result`) to `<dataDir>/audit.jsonl`.

---

## Production Hardening Checklist

1. **Bind Narrowly**: Keep the default `--host 127.0.0.1`, or use explicit multi-host binding (`--hosts 127.0.0.1,100.64.0.10`) for loopback + Tailnet access. Avoid `0.0.0.0`.
2. **Enable Web Key Authentication**: Always set a random `>= 32`-character key whenever binding beyond `127.0.0.1`. Prefer `OPS_CONSOLE_WEB_KEY_FILE` pointing to a `0600` file or systemd `LoadCredential`; avoid `--web-key` because it exposes the secret in process listings. Do not store production keys in version-controlled files.
3. **Prefer TLS Termination**: Put Ops Console behind Tailscale Serve (`tailscale serve --bg --https=8444 http://127.0.0.1:4320`) or an internal TLS reverse proxy so session cookies receive the `Secure` attribute.
4. **Use Read-Only Mode for Dashboards**: Pass `--read-only` (or `OPS_CONSOLE_READ_ONLY=1`) on shared or purely observational instances.
5. **Verify SSH Host Keys**: Keep `strictHostKeyChecking: "yes"` (default) for remote SSH nodes and pre-populate `~/.ssh/known_hosts` with dedicated least-privilege keys.
6. **Restrict Configuration & Data Permissions**: Set `chmod 600` on `config.local.json`, `~/.config/ops-console/config.json`, and `~/.config/ops-console/env`, and `chmod 700` on the data directory containing `audit.jsonl`, `telemetry.sqlite`, and `metrics/`.
7. **Render Least-Privilege Sudoers**: Run `./deploy/install.sh --render-sudoers [config] [--user <name>]`, review every command, validate with `visudo -c -f <file>`, then install as `root:root` with mode `0440`. Critical system services are excluded unless they declare explicit `allowedActions`.
8. **Keep Critical Confirmation Enabled**: Leave `security.requireCriticalConfirm: true` and `security.exposeClientIps: false` unless you have a specific, reviewed operational need.
9. **Keep Firewall Inspection Read-Only**: Grant only `iptables-save -c` / `ip6tables-save -c` read commands if you need packet counters. Ops Console does not require rule-mutation privileges and reports degraded posture when counters are unavailable.
10. **Run as Non-Root**: Use the provided user systemd unit, the hardened system unit (`ProtectSystem=strict`, `PrivateTmp=true`, `UMask=0077`), or the non-root `ops` user in the official `Dockerfile`.
