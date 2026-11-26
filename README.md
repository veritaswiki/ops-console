# Ops Console

**Self-Hostable Architecture, Service, Memory & Log Control Plane**

English | [简体中文](./README.zh-CN.md)

[![Version](https://img.shields.io/badge/version-0.3.0-0f172a?style=flat-square)](./CHANGELOG.md)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20%20LTS-16a34a?style=flat-square)](https://nodejs.org/)
[![Dependencies](https://img.shields.io/badge/runtime%20deps-0-2563eb?style=flat-square)](#feature-matrix)
[![License: MIT](https://img.shields.io/badge/license-MIT-475569?style=flat-square)](./LICENSE)
[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-111827?style=flat-square)](./.github/workflows/ci.yml)

Ops Console is a zero-dependency Node.js control plane that unifies service orchestration, AI memory & context telemetry, mesh networking inspection, remote SSH node health, firewall posture, persistent incident history, and real-time structured log exploration in a single self-hosted web instrument.

---

## Architecture

```mermaid
flowchart LR
  Browser["Web Instrument UI (8 Views · Interactive Graph · Light/Dark)"]
  Auth["Auth & Security Gate (Web Key Cookie · CSRF · Rate Limit)"]
  API["HTTP & SSE Router (Node.js >= 20 ESM)"]
  Cache["SingleFlight TTL Cache (Stale-on-Error Fallback)"]
  Store["Telemetry Store (SQLite WAL / JSONL · Rollups · Incidents)"]
  Logs["Unified Log Engine (journalctl JSON · Files · Ring Buffer · SSE)"]
  Audit["Audit Trail (audit.jsonl)"]

  subgraph Connectors["Official-Protocol Connectors"]
    Sys["Systemd & Timers"]
    Mem["Nowledge Mem · OpenViking · Symbiote · Rerank/Emb"]
    Gw["Magpie Gateway & Agents"]
    Net["Tailscale · Mihomo · Syncthing"]
    Fw["Firewall & Port Posture (Read-Only)"]
    SSH["Remote SSH Nodes (BatchMode)"]
  end

  Browser <--> Auth
  Auth <--> API
  API --> Cache
  API --> Store
  Cache --> Connectors
  API <--> Logs
  API --> Audit
  Logs --> Sys
```

---

## 3-Second Quickstart (Demo Mode)

Run Ops Console on Linux, macOS, or Windows with built-in sandbox topology and simulated live SSE log streaming — no systemd or backend services required:

```bash
git clone https://github.com/ops-console/ops-console.git
cd ops-console
npm run demo
# Or invoke the CLI directly:
node bin/ops-console.mjs --demo --port 4320
```

Open `http://127.0.0.1:4320` in your browser to explore all 8 views immediately, including the offline Global Fleet Map, the interactive architecture/memory/agent graph, and the Probe Manager.

---

## Feature Matrix

| Area | Capabilities |
| --- | --- |
| **Web Instrument UI** | Zero-CDN light & dark themes, responsive desktop + mobile layout, 8 dedicated views: **Overview & Topology**, **Global Fleet & Probes**, **Services**, **Memory & Context**, **Agents & Gateway**, **Network**, **Log Explorer**, and **Ops & Audit**. Only the active view renders; the graph and map use keyed SVG DOM diffing, and SSE logs append incrementally. |
| **Interactive Architecture Graph** | Unified 4-lane SVG topology (`public/graph.js`): **Entry & Agents → Gateway & Providers → Memory & Context → Network & Infra**, built from explicit `services[].dependsOn`, port/process discovery, and fleet links. Click any node for an inspector and one-hop dependency highlight; focused Memory and Agent mini-graphs reuse the same interaction model. |
| **Multi-Device Fleet & `ops-probe`** | Offline Natural Earth 1:110m vector world map, per-node SVG sparklines, push-only Linux/macOS probe (`probe/`), and privacy-first mobile one-tap check-in with zero GPS tracking and zero reverse command channel. |
| **Performance & Delivery** | Non-blocking background refresh for `magpie ls` / `magpie library` (60s TTL) while HTTP `/v1/models` stays live on the request path; Brotli/Gzip responses for payloads ≥ 1 KiB; static asset memory cache with `ETag` / `304 Not Modified`; `requestTimeout=30s`; `maxRequestsPerSocket=200`. |
| **Persistent Telemetry & Incidents** | Zero-dependency store (`src/store.mjs`) with `auto`/`sqlite`/`jsonl`/`memory` drivers, 7-day raw samples, 1-minute rollups for 30 days, 5-minute rollups for 365 days, and state-transition incidents with 90-day retention via `GET /api/incidents`. |
| **Firewall & Port Posture** | Read-only inspection of `iptables-save -c`, `ip6tables-save -c`, and `ss -Htlpn` / `ss -Hulpn`, classifying listeners as loopback, Tailnet, LAN, or public. Exposed through `GET /api/firewall`; firewall rules are never mutated. |
| **Official Connectors** | Pluggable connectors speaking official HTTP APIs and structured CLI JSON (`nmem`, `ov`, `magpie`, `tailscale`, `systemctl`, `journalctl`, Mihomo REST, Syncthing REST, Symbiote, Rerank/Embedding, SSH). |
| **Unified Log System** | Structured `journalctl --output=json` queries (unit, severity `err`/`warn`/`info`/`debug`, range `15m..7d`, keyword/regex, severity histogram), allowlisted file logs with `realpath` containment, rotating self-logs (`5 MB x 5`), live SSE tail, and one-click `jsonl`/`text` export. |
| **Operations & Audit** | Safe allowlisted service/timer actions, per-service `allowedActions`, and server-side single-use 30s `confirmToken` for critical services. Read-Only mode, health & backup triggers, and structured `audit.jsonl` recording actor, IP, request ID, target, action, duration, and result. |
| **Security & Resilience** | Pure `execFile` execution (zero shell injection), CSRF Origin/Referer checks, sliding-window rate limiting, CSP & security headers, optional Web Key signed cookie auth, unified redaction across logs/exports/SSE/audit, masked client IPs by default, `0600`/`0700` runtime permissions, and graceful `SIGTERM`/`SIGINT` shutdown. |
| **Zero-Dependency Runtime** | Pure Node.js >= 20 LTS ESM. Zero npm runtime packages to audit, patch, or bundle. |

---

## Configuration & CLI

### Configuration Resolution Order

Ops Console resolves configuration in strict precedence order:

1. CLI flag: `--config <path>`
2. Environment variable: `OPS_CONSOLE_CONFIG`
3. Local override: `./config.local.json` (git-ignored)
4. User config: `~/.config/ops-console/config.json`
5. Built-in generic defaults

Copy the example configuration to get started:

```bash
cp ops-console.config.example.json config.local.json
node bin/ops-console.mjs --check-config --config ./config.local.json
```

### CLI Flags & Environment Variables

| CLI Flag | Environment Variable | Default | Description |
| --- | --- | --- | --- |
| `--config <path>` | `OPS_CONSOLE_CONFIG` | auto-resolved | Path to JSON configuration file. |
| `--host <addr>` / `--hosts <a,b>` | `OPS_CONSOLE_HOST` / `OPS_CONSOLE_HOSTS` | `127.0.0.1` | Comma-separated bind addresses (e.g. `127.0.0.1,100.64.0.10`). |
| `--port <port>` | `OPS_CONSOLE_PORT` | `4320` | Listening TCP port. |
| `--web-key <key>` | `OPS_CONSOLE_WEB_KEY` | disabled | Shared key (`>= 16` chars) enabling signed cookie + Bearer auth. |
| — | `OPS_CONSOLE_WEB_KEY_FILE` | — | Read the Web Key from a strict `0600` file (recommended with systemd `LoadCredential`). |
| `--read-only` | `OPS_CONSOLE_READ_ONLY=1` | `false` | Disables all mutating control/ops endpoints. |
| `--demo` | `OPS_CONSOLE_DEMO=1` | `false` | Starts with built-in sandbox data and simulated live SSE logs. |
| — | `OPS_CONSOLE_DATA_DIR` | `./data` | Override directory for self-logs, `audit.jsonl`, and runtime state. |
| — | `OPS_CONSOLE_STORAGE_DRIVER` | `auto` | Telemetry driver: `auto`, `sqlite`, `jsonl`, or `memory`. |
| — | `MIHOMO_API_SECRET` | — | Bearer secret for Mihomo REST API connector (optional). |
| — | `SYNCTHING_API_KEY` | — | API key for Syncthing connector (optional). |
| `--check-config` | — | — | Validates resolved configuration and exits `0` on success. |
| `--version` | — | — | Prints version (`0.3.0`) and exits. |
| `--help` | — | — | Displays CLI usage summary. |

### Probe Management Subcommands

```bash
# Enroll a Linux/macOS/mobile node and print a one-time ops_prb_* token + install command
ops-console probe enroll --id edge-tokyo-01 --name "Tokyo Edge" --type server --region "Tokyo, JP" --lat 35.68 --lon 139.69

# List enrolled probe tokens (metadata only; never exposes plaintext tokens)
ops-console probe list

# Immediately revoke a node's push token
ops-console probe revoke --id edge-tokyo-01
```

See [`probe/README.md`](./probe/README.md) and [`deploy/probe/mobile-checkin.md`](./deploy/probe/mobile-checkin.md) for Linux `systemd`, macOS `LaunchAgent`, and Android/iOS setup.

When installing a probe manually, prefer `--token-file -` with a heredoc so the one-time token never appears in `argv` or `ps`:

```bash
sudo ./deploy/probe/install-probe.sh --hub-url https://node.example.ts.net --node-id edge-tokyo-01 --token-file - <<'EOF'
REPLACE_WITH_ONE_TIME_PROBE_TOKEN
EOF
```

---

## Persistent Telemetry, Incidents & Firewall Posture

### Storage & Retention

`storage.driver` defaults to `auto`: on Node.js 22+ it uses the built-in `node:sqlite` engine with WAL mode at `data/telemetry.sqlite`; on Node.js 20 it falls back automatically to daily JSONL under `data/metrics/` with `0600` files. Set `sqlite`, `jsonl`, or `memory` to pin a driver explicitly.

```json
"storage": {
  "driver": "auto",
  "rawRetentionDays": 7,
  "rollup1mDays": 30,
  "rollup5mDays": 365,
  "incidentRetentionDays": 90
}
```

The store keeps raw samples for 7 days, 1-minute rollups for 30 days, 5-minute rollups for 365 days, and state-transition incidents for 90 days. Incidents are available from `GET /api/incidents` (`limit`, `openOnly=1`) along with storage driver statistics.

### Firewall & Listening Sockets

`src/connectors/firewall.mjs` reads `iptables-save -c`, `ip6tables-save -c`, `ss -Htlpn`, and `ss -Hulpn` without changing any rule. Listeners are classified as loopback, Tailnet, LAN, wildcard/public, or `tailnet-guarded` when a packet-counted DROP/REJECT rule protects a wildcard port. Inspect the posture in the Network view or via `GET /api/firewall`; the connector is read-only by design.

### Graph Dependencies

The interactive graph uses explicit `services[].dependsOn` edges plus discovered ports, processes, and fleet links. Add `dependsOn` to each service to make the 4-lane topology and one-hop highlighting reflect your real architecture.

---

## Deployment Guides

### 1. Direct Node.js (Loopback + Tailnet Multi-Host Binding)

Bind explicitly to loopback and your private Tailnet IP without exposing `0.0.0.0` or altering host firewall rules:

```bash
OPS_CONSOLE_WEB_KEY="replace-with-32-char-random-secret" \
  node bin/ops-console.mjs \
  --config ~/.config/ops-console/config.json \
  --hosts 127.0.0.1,100.64.0.10 \
  --port 4320
```

Authenticate once in a browser using `http://100.64.0.10:4320/?k=<your-web-key>` (or via the built-in sign-in screen). Ops Console strips `?k=` from the URL via redirect and sets a signed `HttpOnly; SameSite=Lax` cookie valid for 400 days. Programmatic clients may send `Authorization: Bearer <your-web-key>`.

### 2. Docker & Docker Compose

```bash
cp ops-console.config.example.json config.local.json
OPS_CONSOLE_WEB_KEY="replace-with-32-char-random-secret" docker compose up -d
```

To launch Docker directly in sandbox demo mode:

```bash
OPS_CONSOLE_DEMO=1 docker compose up --build
```

See [Dockerfile](./Dockerfile) and [docker-compose.yml](./docker-compose.yml).

### 3. Systemd (User or System Service)

Run the portable installer script to verify Node.js >= 20, scaffold `~/.config/ops-console/config.json`, and optionally install the user systemd service:

```bash
./deploy/install.sh --with-systemd
```

Print an exact least-privilege sudoers template for your configuration without touching `/etc/sudoers.d/`:

```bash
./deploy/install.sh --render-sudoers ./config.local.json --user ops-user
```

Review the output, validate it with `visudo -c -f <file>`, then install it as `root:root` with mode `0440`. Critical system services are excluded unless they declare an explicit `allowedActions` allowlist.

Manual templates are available in:

- [deploy/systemd/ops-console.user.service](./deploy/systemd/ops-console.user.service) — User-level unit (`systemctl --user`)
- [deploy/systemd/ops-console.system.service](./deploy/systemd/ops-console.system.service) — Hardened system-level unit (`ProtectSystem=strict`, `PrivateTmp=true`)

### 4. Tailscale Serve (HTTPS Ingress)

Keep Ops Console bound solely to `127.0.0.1:4320` and terminate TLS via Tailscale Serve:

```bash
tailscale serve --bg --https=8444 http://127.0.0.1:4320
```

Add `https://node.example.ts.net:8444` to `security.allowedOrigins` in your config so CSRF checks permit browser mutations from the Tailnet origin.

---

## Official-Protocol Connectors

All connectors are optional, gracefully degrade when disabled or unreachable, and speak only documented upstream protocols with zero hardcoded secrets:

| Connector | Official Protocol / CLI | Collected Telemetry |
| --- | --- | --- |
| **Systemd** | `systemctl show` (batched), `journalctl --output=json` | Service active/sub/main PID, memory/CPU, timers, structured logs |
| **Nowledge Mem** | `GET /health`, `nmem --json` (`status`, `stats`, `spaces`, `feed`, `search`, `doctor`) | Engine health, unit counts, spaces, recent feed, diagnostics |
| **OpenViking** | `GET /health`, `GET /ready`, `ov -o json` (`health`, `status`, `skills`, `find`) | Component health metrics, registered skills, context retrieval |
| **Symbiote** | `GET /api/health` | Reading workbench liveness and status payload |
| **Rerank / Embedding** | `GET /health` | Local model gateway readiness and latency |
| **Magpie Gateway** | OpenAI `GET /v1/models`, `magpie ls`, `magpie library` | Routed model catalog, running bridges, MCP/library inventory |
| **Tailscale** | `tailscale status --json`, `tailscale serve status --json` | Self/peer mesh state, Tailnet IPs, active HTTPS Serve routes |
| **Mihomo (Clash Meta)** | `GET /version`, `/connections`, `/proxies` (Bearer secret from env) | Proxy core version, live connection counts, active selectors |
| **Syncthing** | `GET /rest/noauth/health` | Sync daemon liveness |
| **Host Firewall & Ports** | `iptables-save -c`, `ip6tables-save -c`, `ss -Htlpn`, `ss -Hulpn` (read-only) | IPv4/IPv6 policies and rules, listening sockets, loopback/Tailnet/LAN/public exposure |
| **Remote SSH Nodes** | `ssh -o BatchMode=yes` with configurable `StrictHostKeyChecking` (60s TTL cache) | Remote uptime, load, memory, disk, and backup freshness |
| **Generic HTTP Probes** | `GET <healthUrl>` per configured service | HTTP status code and round-trip latency |

---

## REST & SSE API Reference

| Method & Path | Access | Description |
| --- | --- | --- |
| `GET /api/ping` | Public | Lightweight liveness probe (`200 OK`) for Docker/systemd healthchecks. |
| `GET /api/snapshot` | Read | Aggregated topology, host metrics, services, timers, connectors, and running jobs. |
| `GET /api/fleet` (`GET /api/nodes`) | Read | Unified multi-device fleet view fusing local hub, `ops-probe` push telemetry, SSH nodes, and Tailscale peers. |
| `GET /api/nodes/:id` | Read | Detailed node state plus bounded time-series history for sparkline rendering. |
| `GET /api/probes` | Read | Enrolled probe metadata (scopes, type, region; never exposes tokens). |
| `GET /api/firewall?refresh=1` | Read | Read-only firewall policies/rules, listening sockets, and exposure summary. |
| `GET /api/incidents` | Read | State-transition incidents (`limit`, `openOnly=1`) plus storage driver statistics. |
| `POST /api/probes/ingest` | Probe Token | Push-only telemetry ingest authenticated by per-node `Bearer ops_prb_*` + `X-Ops-Probe-Id` (restricted to Tailnet/loopback CIDR by default). |
| `POST /api/probes/checkin` | Session / Read | Privacy-first mobile Web UI check-in (RTT, optional battery/network; zero GPS). |
| `POST /api/probes/enroll` | Mutate | Issue a one-time `ops_prb_*` token and install snippets. Blocked in `--read-only`. |
| `DELETE /api/probes/:id` | Mutate | Revoke an enrolled probe token immediately. Blocked in `--read-only`. |
| `GET /api/remotes?refresh=1` | Read | Remote SSH node health summary (cached 60s unless `refresh=1`). |
| `GET /api/logs` | Read | Structured log query (`source`, `unit`, `file`, `severity`, `since`, `q`, `regex`, `limit`). |
| `GET /api/logs/stream` | Read (SSE) | Real-time `text/event-stream` tail with heartbeat, concurrency cap, and child-process cleanup. |
| `GET /api/logs/export` | Read | Download filtered logs (`?format=jsonl` or `?format=text`). |
| `GET /api/audit` | Read | Recent structured audit entries from `audit.jsonl`. |
| `POST /api/actions/confirm-token` | Mutate | Issue a server-side single-use `confirmToken` valid for 30s for a critical service action. Blocked in `--read-only`. |
| `POST /api/services/control` | Mutate | Allowlisted systemd action (`start`, `stop`, `restart`, `reload`). Critical services require `confirmToken` (HTTP `409` if omitted) when `security.requireCriticalConfirm` is enabled. Blocked in `--read-only`. |
| `POST /api/timers/control` | Mutate | Allowlisted timer action (`start`, `stop`, `enable`, `disable`). Blocked in `--read-only`. |
| `POST /api/ops/health` | Mutate | Trigger configured health check script. Blocked in `--read-only`. |
| `POST /api/ops/backup` | Mutate | Trigger configured backup script. Blocked in `--read-only`. |

> **Note:** When `--web-key` / `OPS_CONSOLE_WEB_KEY` is configured, all routes except `/api/ping` and the sign-in flow require a valid signed session cookie or `Authorization: Bearer <key>` header.

---

## Security & Hardening

- **Zero Shell Interpolation**: Every subprocess uses `child_process.execFile` / `spawn(..., { shell: false })` with static argument vectors.
- **Strict Allowlists**: Only units, timers, log files, scripts, and per-service `allowedActions` explicitly declared in configuration can be queried or controlled.
- **Critical Action Confirmation**: `risk: "critical"` services require a server-side single-use 30s `confirmToken` from `POST /api/actions/confirm-token`; missing or expired tokens return HTTP `409`.
- **Path Containment**: File log readers resolve symlinks via `fs.realpath` and verify strict prefix containment before reading tail chunks.
- **CSRF & Rate Limiting**: Mutating `POST` requests validate `Origin`/`Referer` against `security.allowedOrigins` and pass through a per-IP sliding-window rate limiter.
- **Read-Only Mode**: Run with `--read-only` or `OPS_CONSOLE_READ_ONLY=1` for purely observational dashboards.
- **Least-Privilege Deployment**: `--render-sudoers` prints command-level sudo rules for the configured services, timers, and firewall readers without writing to `/etc/sudoers.d/`.
- **Secret Indirection**: Use `env://VAR` or a strict `0600` `file:///path` reference for connector secrets and the Web Key. `OPS_CONSOLE_WEB_KEY_FILE` and systemd `LoadCredential` keep keys out of `argv` and `ps`.
- **Unified Redaction & IP Masking**: `src/redact.mjs` scrubs tokens and secrets from logs, exports, SSE, audit, and `ps` command lines. Runtime directories are `0700` and files `0600`; systemd units set `UMask=0077`. `security.exposeClientIps: false` masks client and probe IPs in audit records and `/api/probes`.
- **Read-Only Firewall Inspection**: Firewall posture is collected with read-only commands only; Ops Console never adds, deletes, or flushes rules.
- **Zero External CDN & Push-Only Telemetry**: Strict `default-src 'self'` CSP with offline vector maps; remote probes hold write-only telemetry tokens restricted to Tailnet/loopback CIDRs with zero remote command execution capability.

See [SECURITY.md](./SECURITY.md) for the complete threat model and hardening checklist.

---

## Development & Testing

```bash
npm run check   # Static syntax & config validation
npm test        # Node.js built-in test runner (node --test)
npm start       # Launch control plane
npm run demo    # Launch sandbox demo mode
```

Enable the repository hook once per clone to run the 12-rule PII/secret scanner and SemVer consistency check before every commit:

```bash
git config core.hooksPath .githooks
```

## Documentation & Community

- [Architecture Guide](./ARCHITECTURE.md) — Module map, connector contract, telemetry store, firewall posture, interactive graph, SSE pipeline, caching, and threat model
- [Contributing Guide](./CONTRIBUTING.md) — Adding connectors, running tests, and PR guidelines
- [Security Policy](./SECURITY.md) — Reporting vulnerabilities and deployment hardening
- [Code of Conduct](./CODE_OF_CONDUCT.md) — Community standards
- [Changelog](./CHANGELOG.md) — Release history

## License

Released under the [MIT License](./LICENSE). Copyright (c) 2026 Ops Console Contributors.
