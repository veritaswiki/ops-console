# Changelog

All notable changes to **Ops Console** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-11-25

### Added
- **Interactive Architecture / Memory / Agent Graph**: Unified 4-lane SVG topology in `public/graph.js` (**Entry & Agents -> Gateway & Providers -> Memory & Context -> Network & Infra**) built from explicit `services[].dependsOn`, port/process discovery, and fleet links, with a clickable node inspector, one-hop highlighting, and focused Memory and Agent mini-graphs.
- **Zero-Dependency Telemetry Store**: `src/store.mjs` with `storage.driver` set to `auto`, `sqlite`, `jsonl`, or `memory`. `auto` prefers Node.js 22+ built-in `node:sqlite` in WAL mode at `data/telemetry.sqlite` and falls back automatically to `0600` daily JSONL on Node.js 20. Retains 7 days of raw samples, 30 days of 1-minute rollups, 365 days of 5-minute rollups, and 90 days of state-transition incidents.
- **Incident History API**: `GET /api/incidents` returns state-transition incidents (`limit`, `openOnly=1`) plus storage driver statistics.
- **Firewall & Port Exposure Posture**: `src/connectors/firewall.mjs` and `GET /api/firewall` provide read-only inspection of `iptables-save -c`, `ip6tables-save -c`, and `ss -Htlpn` / `ss -Hulpn`, classifying listeners as loopback, Tailnet, LAN, or public. Firewall rules are never mutated automatically.
- **Least-Privilege Action Governance**: Per-service `allowedActions` allowlists, plus a server-side single-use 30-second `confirmToken` issued by `POST /api/actions/confirm-token` for `risk: "critical"` services when `security.requireCriticalConfirm` is enabled. Missing or expired tokens return HTTP `409`.
- **Sudoers Template Rendering**: `./deploy/install.sh --render-sudoers [config] [--user <name>]` prints an exact least-privilege template without touching `/etc/sudoers.d/`.
- **Secret Hardening**: `env://VAR` and strict `0600` `file:///path` indirection, `OPS_CONSOLE_WEB_KEY_FILE`, and systemd `LoadCredential` support. Unified redaction in `src/redact.mjs` covers logs, exports, SSE, audit, and command lines; runtime directories are `0700`, files `0600`, and systemd units set `UMask=0077`.
- **Client IP Privacy**: `security.exposeClientIps: false` by default masks client and probe IPs in audit records and `/api/probes`.
- **Probe Token Delivery Hardening**: Probe install hints use `--token-file -` heredoc stdin so one-time tokens never appear in `argv` or `ps`.
- **Repository Guard**: `.githooks/pre-commit` blocks sensitive files and runs the 12-rule PII/secret scanner plus the SemVer version consistency check in `scripts/check.mjs`.

### Changed
- **Non-Blocking Gateway Inventory**: `magpie ls` and `magpie library` refresh in the background with a 60-second TTL, while HTTP `GET /v1/models` remains a live request-path probe.
- **HTTP Delivery Optimizations**: Brotli (`br`) and Gzip compression for responses of at least 1 KiB, an in-memory static asset cache with `ETag` / `304 Not Modified`, `requestTimeout=30s`, and `maxRequestsPerSocket=200`.
- **Frontend Rendering**: Active-view-only rendering, keyed SVG DOM diffing for the World Map and Architecture Graph, and incremental SSE log appending reduce layout work during polling and live log streaming.

---

## [0.2.0] - 2026-11-25

### Added
- **Global Fleet & World Map View**: Offline, zero-CDN Natural Earth 1:110m vector map (`public/world-map.js`) with region presets (`fit`, `world`, `apac`, `eurasia`, `americas`), zoom/pan, co-location de-cluttering, geodesic mesh arcs, live node inspector, and inline SVG telemetry sparklines.
- **Zero-Dependency Push-Only Agent (`ops-probe`)**: Portable subpackage under `probe/` (`@ops-console/probe`) for Linux (`systemd` hardened service) and macOS (`LaunchAgent`), collecting CPU, memory, disk, battery, network delta, Tailscale status, watched services, and aggregate agent counts with zero shell execution and zero reverse command channel.
- **Probe Enrollment & Security Boundaries**: Per-node `ops_prb_*` write-only tokens stored as salted SHA-256 hashes (`0600`), Tailnet CGNAT (`100.64.0.0/10`, `fd7a:115c:a1e0::/48`) + loopback CIDR enforcement (`fleet.requireTailscaleCidr`), bounded payload sanitization, CLI management (`ops-console probe enroll|list|revoke`), and Web UI enrollment/revocation with copyable install commands.
- **Mobile One-Tap Check-in**: Privacy-first browser check-in (`POST /api/probes/checkin`) and mobile guide (`deploy/probe/mobile-checkin.md`) reporting hub RTT, optional battery, and network type without GPS or background location tracking.
- **In-Memory Ring Time-Series Store**: `src/timeseries.mjs` records bounded per-node and fleet telemetry history served via `GET /api/nodes/:id` and `GET /api/fleet`.
- **Auditable Probe Installer**: `deploy/probe/install-probe.sh` supporting Linux `systemd`, macOS `LaunchAgent`, `--dry-run`, and `--uninstall` with token redaction and `0600` config permissions.

### Changed
- **Zero External CDN CSP**: Removed external font CDN entries (`fonts.googleapis.com` / `fonts.gstatic.com`) from `Content-Security-Policy` and `public/index.html` for 100% air-gapped and Tailnet-only operation.
- **8-View Navigation**: Added dedicated **Fleet / Global Nodes** view alongside Overview, Services, Memory, Agents & Gateway, Network, Logs, and Ops & Audit.

---

## [0.1.0] - 2026-11-25

### Added
- **Open-Source Self-Hostable Architecture**: Zero-dependency Node.js >= 20 LTS ESM codebase with CLI entry `bin/ops-console.mjs` and layered configuration resolution (`--config`, `OPS_CONSOLE_CONFIG`, `./config.local.json`, `~/.config/ops-console/config.json`, built-in defaults).
- **Multi-Host Binding**: `--host` / `--hosts` (`OPS_CONSOLE_HOST` / `OPS_CONSOLE_HOSTS`) supporting comma-separated bind addresses (e.g. `127.0.0.1,100.64.0.10`) to serve loopback and Tailnet safely without `0.0.0.0`.
- **Sandbox Demo Mode**: `--demo` / `OPS_CONSOLE_DEMO=1` (`npm run demo`) with realistic built-in topology and simulated live SSE logs for instant evaluation on Linux, macOS, and Windows.
- **Read-Only Mode**: `--read-only` / `OPS_CONSOLE_READ_ONLY=1` to disable all mutating control and operational routes server-side.
- **Web Key Authentication**: Optional `--web-key` / `OPS_CONSOLE_WEB_KEY` (`>= 16` chars) with `?k=<key>` redirect exchange into signed `HttpOnly; SameSite=Lax` 400-day session cookies, `Authorization: Bearer` API support, and built-in sign-in page.
- **Official-Protocol Connectors**: Pluggable telemetry collectors for Systemd, Nowledge Mem (`nmem`), OpenViking (`ov`), Symbiote, Rerank/Embedding gateways, Magpie Gateway, Tailscale, Mihomo (Clash Meta), Syncthing, Remote SSH nodes (`BatchMode=yes` with 60s TTL cache), and generic HTTP probes.
- **Production Unified Log Engine**: Structured `journalctl --output=json` queries with severity histogram, allowlisted file log reader with `realpath` containment and tail chunk reading, rotating JSONL self-logs (`5 MB x 5`) with in-memory ring buffer, SSE live tail (`GET /api/logs/stream`) with concurrency caps & child cleanup, and one-click `jsonl`/`text` export.
- **Security & Resilience**: Exclusive `execFile` execution, CSRF Origin/Referer checks, dual sliding-window rate limits, CSP/security headers, `SingleFlightCache` with stale-on-error fallback, structured `audit.jsonl`, and graceful `SIGTERM`/`SIGINT` shutdown.
- **7-View Architectural Instrument UI**: Responsive light/dark web UI covering Overview & Topology, Services, Memory & Context, Agents & Gateway, Network & Nodes, Log Explorer, and Ops & Audit.
- **Deployment & CI/CD Scaffolding**: Non-root `Dockerfile`, `docker-compose.yml`, portable user & hardened system systemd units, `deploy/install.sh`, GitHub Actions CI & tag-based Release workflows, issue/PR templates, and full bilingual (`EN` / `zh-CN`) documentation.
