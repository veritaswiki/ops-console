# Architecture

Ops Console v0.3.0 is designed as a self-contained, zero-dependency Node.js (>= 20 LTS ESM) control plane and multi-device telemetry hub. Every subsystem favors explicit allowlists, bounded resource usage, official upstream protocols, push-only remote observability, read-only host inspection, and graceful degradation when optional components are absent.

---

## 1. Module Map

```text
ops-console/
├── bin/
│   └── ops-console.mjs          # CLI entry: flag parsing, --check-config, multi-host server bootstrap, graceful shutdown
├── src/
│   ├── config.mjs               # Precedence loader, schema validation, unit/timer/logFile allowlist lookup
│   ├── security.mjs             # Timing-safe Web Key auth, signed cookies, CSRF Origin guard, CSP headers, realpath containment, sliding-window rate limiter
│   ├── exec.mjs                 # Safe execFile runner (shell: false), bounded stdout/stderr, user environment normalization, AbortController HTTP probe
│   ├── cache.mjs                # SingleFlightCache: TTL caching, concurrent in-flight deduplication, stale-on-error fallback
│   ├── redact.mjs               # Unified secret/token redaction and client-IP masking for logs, exports, SSE, audit, and command lines
│   ├── store.mjs                # Zero-dependency telemetry store: SQLite WAL / daily JSONL / memory, rollups, incidents, retention pruning
│   ├── logger.mjs               # StructuredLogger: JSONL file sink with 5 MB x 5 rotation, in-memory ring buffer, EventEmitter live fan-out
│   ├── logs.mjs                 # Unified log query (journalctl JSON + allowlisted files + self-log), severity histogram, export, SSE live tail
│   ├── actions.mjs              # Allowlisted systemd/timer controls, per-service allowedActions, single-use confirmToken, audit recorder
│   ├── probes.mjs               # ProbeRegistry: salted SHA-256 token store (0600), Tailnet CIDR guard, payload sanitizer, multi-source fleet fusion
│   ├── timeseries.mjs           # Bounded in-memory ring buffer for per-node and fleet telemetry sparklines
│   ├── demo.mjs                 # Deterministic sandbox snapshot generator + simulated SSE log emitter for --demo mode
│   ├── server.mjs               # HTTP/SSE request router, static asset handler, multi-host binding lifecycle
│   └── connectors/              # Pluggable official-protocol telemetry adapters
│       ├── host.mjs             # Host CPU, memory, load, uptime, and disk mount collectors
│       ├── systemd.mjs          # Batched `systemctl show` for services & timers
│       ├── memory-nmem.mjs      # Nowledge Mem `/health` + `nmem --json` status, stats, spaces, feed, search, doctor
│       ├── memory-openviking.mjs# OpenViking `/health`, `/ready` + `ov -o json` health, status, skills, find
│       ├── memory-symbiote.mjs  # Symbiote `/api/health` workbench probe
│       ├── memory-rerank.mjs    # Rerank / Embedding `/health` gateway probes
│       ├── firewall.mjs         # Read-only iptables/ip6tables + listening socket parser and exposure classifier
│       └── ...                  # Gateway (Magpie), mesh/network (Tailscale, Mihomo, Syncthing), remote SSH nodes, custom HTTP probes
├── public/
│   ├── index.html               # Single-page architectural instrument shell (8 views, zero external CDN links)
│   ├── styles.css               # Design tokens, light/dark themes, responsive desktop & mobile grids
│   ├── world-map.js             # Offline Natural Earth 1:110m vector map, geodesic arcs, pan/zoom, SVG sparklines
│   ├── graph.js                 # 4-lane interactive SVG architecture/memory/agent graph with keyed DOM diffing
│   └── app.js                   # Zero-build ESM frontend: state store, topology renderer, SSE log stream client
├── probe/
│   ├── ops-probe.mjs            # Zero-dependency push-only telemetry agent for Linux & macOS (execFile only, zero RCE)
│   ├── probe.config.example.json# Annotated example probe configuration
│   └── README.md                # Probe security model, CLI flags, and schema v1 contract
├── .githooks/
│   └── pre-commit               # Blocks sensitive files, runs the 12-rule PII/secret scan and SemVer consistency check
├── deploy/
│   ├── install.sh               # Portable POSIX/bash installer & config scaffolder
│   └── systemd/                 # User & hardened system service unit templates
└── test/                        # Node.js built-in test runner (`node --test`) suites
```

---

## 2. Request Lifecycle

```mermaid
sequenceDiagram
  participant Client
  participant Gate as Security Gate
  participant Router as HTTP/SSE Router
  participant Cache as SingleFlightCache
  participant Target as Connector / Action / Log Engine
  participant Audit as audit.jsonl

  Client->>Gate: HTTP Request (GET / POST / SSE)
  Gate->>Gate: Apply security headers (CSP, nosniff, DENY)
  Gate->>Gate: Check per-IP SlidingWindowRateLimiter
  alt Web Key enabled & route != /api/ping
    Gate->>Gate: Verify signed cookie, ?k= exchange, or Bearer token
  end
  alt Mutating POST request
    Gate->>Gate: Reject if --read-only
    Gate->>Gate: Verify Origin/Referer against allowedOrigins
  end
  Gate->>Router: Authorized request with correlation requestId
  alt Telemetry GET
    Router->>Cache: getOrFetch(key, ttl, fetcher)
    Cache->>Target: Execute official CLI / HTTP probe (coalesced)
    Target-->>Cache: Normalized result
    Cache-->>Client: JSON payload (Brotli/Gzip when >= 1 KiB)
  else Mutating POST
    Router->>Target: Validate allowlist & execute action
    Target-->>Audit: Append structured audit record
    Target-->>Client: Action result JSON
  end
```

### Multi-Host Binding

Instead of binding `0.0.0.0`, `bin/ops-console.mjs` instantiates an `http.Server` listener for each configured address in `console.hosts` (for example `["127.0.0.1", "100.64.0.10"]`) sharing the same request handler and active connection tracker. On `SIGTERM` or `SIGINT`, all listeners stop accepting new connections, active SSE streams receive clean termination, child log-tail processes are killed, and open sockets drain gracefully before exit.

Each listener sets `requestTimeout=30_000`, `maxRequestsPerSocket=200`, `headersTimeout=15_000`, and `keepAliveTimeout=65_000`. JSON responses and compressible static assets of at least 1 KiB are encoded with Brotli when advertised, otherwise Gzip. Static assets are read once into an in-memory cache keyed by resolved path, size, and mtime; responses carry a weak `ETag` and return `304 Not Modified` when `If-None-Match` matches.

---

## 3. Connector Contract

Every connector under `src/connectors/` adheres to the following invariants:

1. **Official Protocols Only**: Connectors communicate exclusively through documented HTTP health/API routes or structured CLI flags (`--json`, `-o json`, `--output=json`). Never parse undocumented internal database files or scrape private host state.
2. **Zero Hardcoded Secrets**: Secrets (such as Mihomo controller secret or Syncthing API key) come solely from user configuration or environment variables (`MIHOMO_API_SECRET`, `SYNCTHING_API_KEY`).
3. **Timeout & Output Bounds**: Every subprocess runs through `runCmd()` (`execFile` with `shell: false`, explicit `timeout`, and `maxBuffer`), and every HTTP probe runs through `httpProbe()` with `AbortController` timeouts.
4. **Graceful Degradation**: Each connector returns a normalized status envelope:

```js
{
  enabled: true,        // false when disabled in config
  available: true,      // false when binary/endpoint is unreachable
  status: 'ok',         // 'ok' | 'degraded' | 'offline' | 'disabled'
  latencyMs: 14,        // probe round-trip latency
  collectedAt: '...',   // ISO-8601 timestamp
  data: {},             // connector-specific structured metrics
  error: null           // sanitized error summary if degraded/offline
}
```

If one connector times out or its binary is missing on the host, the rest of `/api/snapshot` still succeeds normally.

---

## 4. Unified Logging & SSE Pipeline

Ops Console aggregates three log sources behind one structured schema (`ts`, `level`, `source`, `unit`, `message`, `meta`):

1. **Systemd Journal (`journalctl --output=json`)**:
   - Queries only allowlisted units defined in `services` and `timers` (plus optional system scope validation).
   - Supports server-side filtering by severity (`err`, `warn`, `info`, `debug`), time window (`15m`..`7d`), plain keyword, or bounded regex, and computes a severity breakdown histogram.
2. **Allowlisted File Logs**:
   - Only files explicitly listed in `logFiles` can be queried.
   - Before opening a file, `resolveSafePath()` resolves symlinks with `fs.realpath` and verifies path containment.
   - Tail reading seeks from the end of the file in fixed byte chunks rather than loading multi-gigabyte logs into memory.
3. **Ops Console Self-Log (`StructuredLogger`)**:
   - Writes structured JSONL to `<dataDir>/ops-console.jsonl` with automatic size rotation (`5 MB x 5` archives).
   - Maintains a fixed-capacity in-memory ring buffer and emits events for zero-disk-poll live streaming.

### SSE Live Tail (`GET /api/logs/stream`)

- Enforces `security.maxSseStreams` (default `8`) to prevent file-descriptor or process exhaustion.
- Emits periodic SSE comment heartbeats (`: keepalive`) so reverse proxies (Tailscale Serve, Nginx, Caddy) keep connections open cleanly.
- Binds `req.on('close', ...)` and server shutdown hooks directly to `child.kill('SIGTERM')` (with `SIGKILL` fallback) so `journalctl -f` never leaks orphaned subprocesses.
- Supports one-click filtered export via `GET /api/logs/export?format=jsonl|text`.

---

## 5. Caching & Single-Flight Concurrency

`SingleFlightCache` (`src/cache.mjs`) prevents thundering-herd storms when multiple browser tabs or dashboards poll `/api/snapshot` or `/api/remotes` simultaneously:

- **In-Flight Coalescing**: Concurrent requests for the same cache key await a single shared Promise instead of spawning duplicate `systemctl`, `nmem`, `ov`, or `ssh` processes.
- **Per-Key TTL**: Fast local probes use short TTLs (a few seconds), while remote SSH probes default to a 60-second TTL (bypassable via `?refresh=1`).
- **Stale-on-Error Fallback**: If a refresh fails due to a transient timeout, the cache may return the last known good value marked as stale while surfacing the error metadata rather than blanking the UI.
- **Background CLI Refresh**: `magpie ls` and `magpie library` refresh in the background with a 60-second TTL and never block the request path. `GET /v1/models` remains a live HTTP probe, so model reachability is current while expensive CLI inventory stays cached.

The frontend complements server caching with active-view-only rendering. Hidden views do not re-render on each poll; the World Map and architecture graph update SVG nodes and edges through keyed DOM diffing, and SSE log frames append incrementally to the existing list instead of rebuilding it.

---

## 6. Zero-Dependency Telemetry Store

`src/store.mjs` owns time-series and incident persistence behind `storage.driver`:

| Driver | Behaviour |
| --- | --- |
| `auto` | Prefers Node.js 22+ built-in `node:sqlite` with WAL at `data/telemetry.sqlite`; falls back automatically to daily JSONL on Node.js 20. |
| `sqlite` | Pins the built-in SQLite engine. |
| `jsonl` | Writes `0600` daily JSONL files under `data/metrics/` with an asynchronous write queue. |
| `memory` | Keeps bounded samples and incidents in process memory only. |

The store retains raw samples for 7 days, 1-minute rollups for 30 days, 5-minute rollups for 365 days, and state-transition incidents for 90 days. Rollups are maintained incrementally, and pruning runs opportunistically at most every six hours. The data directory is created `0700`; SQLite files and JSONL append files are `0600`.

Incidents are recorded when a service, memory engine, or fleet node changes state. `GET /api/incidents` returns recent incidents (`limit`, `openOnly=1`) plus storage statistics such as driver, path, sample count, and open incidents.

---

## 7. Firewall & Port Exposure Inspection

`src/connectors/firewall.mjs` implements read-only posture collection:

- Reads `iptables-save -c` and `ip6tables-save -c` (preferring a passwordless `sudo -n` read-only rule, then falling back to the direct binary).
- Reads listening sockets with `ss -Htlpn` and `ss -Hulpn`, extracting bind address, port, process name, and PID when available.
- Classifies each bind as `loopback`, `tailnet` (CGNAT or Tailscale IPv6), `lan` (RFC 1918), `public-wildcard`, or `other`.
- Marks wildcard listeners as `tailnet-guarded` when a packet-counted DROP/REJECT rule covers the port, and exposes policies, truncated rule sets, listener posture, and dropped-packet counters.

`GET /api/firewall?refresh=1` returns the normalized posture. The connector never calls `iptables -A`, `-D`, `-F`, or any mutating firewall command; when only socket data is available it reports `backend: "sockets-only"` and a permission hint instead of escalating.

---

## 8. Unified Interactive Graph

`public/graph.js` renders one zero-build SVG topology with four lanes:

**Entry & Agents -> Gateway & Providers -> Memory & Context -> Network & Infra**

The graph fuses explicit `services[].dependsOn` edges with configured ports, discovered processes, and fleet links. Every node is clickable: the inspector shows role, status, ports, and dependencies, and the graph highlights one-hop neighbours. Focused Memory and Agent mini-graphs reuse the same node model and interaction, so the overview, memory view, and agent view cannot drift into separate topologies.

---

## 9. Least-Privilege Governance & Secret Hardening

- **Action allowlists**: Every service may declare `allowedActions`; an action outside that list is rejected with HTTP `403` even if it is a valid systemd verb.
- **Critical confirmation**: With `security.requireCriticalConfirm: true`, any `risk: "critical"` service action requires a `confirmToken` issued by `POST /api/actions/confirm-token`. Tokens are server-side, bound to unit and action, valid for 30 seconds, and consumed once; a missing or expired token returns HTTP `409`.
- **Sudoers rendering**: `./deploy/install.sh --render-sudoers [config] [--user <name>]` prints command-level sudo rules for configured services, timers, and firewall readers. It never writes to `/etc/sudoers.d/`; operators validate and install the output themselves. Critical system services are excluded unless they explicitly declare `allowedActions`.
- **Secret indirection**: Secret fields accept `env://VAR` and `file:///path`. File references must be regular files with no group/other permission bits (`0600` or stricter). The Web Key may come from `OPS_CONSOLE_WEB_KEY_FILE`, which is read with the same strict permission check, or from systemd `LoadCredential`.
- **Unified redaction**: `src/redact.mjs` removes private keys, bearer tokens, probe tokens, API keys, query-string secrets, auth headers, and long hex strings from logs, exports, SSE frames, audit output, and command lines. `maskClientIp()` hides client and probe IPs in audit records and `/api/probes` unless `security.exposeClientIps: true`.
- **Probe delivery**: Enrollment install hints use `--token-file -` with a heredoc, so one-time probe tokens are read from stdin and never appear in `argv` or `ps`.
- **Repository guard**: `.githooks/pre-commit` blocks staged `.env`, key, certificate, probe-state, and telemetry database files, then runs `scripts/check.mjs` with 12 PII/secret rules and the cross-file SemVer consistency check.

---

## 10. Security Threat Model Summary

| Threat | Primary Mitigation |
| --- | --- |
| **Command injection via unit/query inputs** | Exclusive use of `execFile` / `spawn` with `shell: false`; strict regex validation on unit names (`UNIT_RE`) and allowlist lookup before execution. |
| **Arbitrary file read / symlink escape** | File log IDs map strictly to configured `logFiles`; `fs.realpath` containment checks prevent symlink traversal. |
| **Cross-Site Request Forgery (CSRF)** | All mutating `POST` routes verify `Origin` / `Referer` against host + `security.allowedOrigins`; session cookie uses `SameSite=Lax`. |
| **Unauthorized network exposure** | Defaults to `127.0.0.1` loopback; multi-host binding avoids `0.0.0.0`; optional Web Key (`>= 16` chars) with timing-safe comparison (`crypto.timingSafeEqual`) and signed `HttpOnly` session cookie. |
| **Accidental or unauthorized mutation** | `--read-only` / `OPS_CONSOLE_READ_ONLY=1` disables all write routes server-side; per-service `allowedActions` narrows verbs; critical services require a single-use 30s `confirmToken`; every mutation writes an immutable entry to `audit.jsonl`. |
| **Secret leakage via argv, logs, or exports** | `env://` / strict `0600` `file://` indirection, `OPS_CONSOLE_WEB_KEY_FILE` and `LoadCredential`, heredoc probe-token delivery, and unified redaction across logs, SSE, exports, audit, and command lines. |
| **Client or probe IP disclosure** | `security.exposeClientIps` defaults to `false`; audit and `/api/probes` return salted masked IPs unless explicitly enabled. |
| **Firewall mutation or privilege escalation** | Firewall connector only executes read-only save/list commands and reports degraded mode rather than escalating; sudoers rendering produces a reviewable least-privilege template. |
| **Resource exhaustion / DoS** | Separate per-IP sliding-window rate limits for read (`rateLimitPerMinute`) and mutating (`mutatingRateLimitPerMinute`) endpoints, 64 KB JSON body cap, `maxSseStreams` cap, subprocess timeouts and buffer caps. |

For reporting vulnerabilities and production hardening steps, see [SECURITY.md](./SECURITY.md).
