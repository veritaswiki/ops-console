# Changelog

All notable changes to **Ops Console** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-11-25

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
