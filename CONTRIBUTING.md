# Contributing to Ops Console

Thank you for your interest in contributing to **Ops Console**! We welcome bug reports, documentation improvements, new official-protocol connectors, and clean pull requests.

By participating in this project, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).

---

## Development Setup

Ops Console has **zero runtime dependencies** and requires only **Node.js >= 20 LTS**:

```bash
git clone https://github.com/ops-console/ops-console.git
cd ops-console

# Verify syntax and configuration checks
npm run check

# Run the full test suite (Node.js built-in test runner)
npm test

# Start in sandbox demo mode (works on Linux, macOS, and Windows)
npm run demo
```

---

## Code Style & Conventions

- **Zero Runtime Dependencies**: Do not add external packages to `dependencies` in `package.json`. Prefer Node.js built-in modules (`node:http`, `node:fs/promises`, `node:child_process`, `node:crypto`, `node:test`, `node:assert/strict`).
- **ESM Only**: Use `.mjs` extensions and explicit relative imports (`./config.mjs`).
- **Formatting**: Follow `.editorconfig` (UTF-8, LF line endings, 2-space indentation).
- **Security First**:
  - Always use `execFile` / `spawn` with `shell: false` (via `src/exec.mjs`). Never use `exec` or shell string interpolation.
  - Validate all external inputs and enforce allowlists before touching files, systemd units, or subprocesses.
  - Never log secrets, Web Keys, cookies, or `Authorization` headers.
- **Zero Personal Data (PII)**: Never commit personal hostnames, private Tailscale domains, real non-example IP addresses, usernames, or API keys. Use RFC 5737 / RFC 6598 example placeholders (`100.64.0.10`, `node.example.ts.net`, `ops-user`, `example.com`).

---

## Adding a New Official Connector

If you would like to integrate a new self-hosted service, memory engine, or network daemon:

1. **Propose first (optional for small probes)**: Open a [Connector Request](./.github/ISSUE_TEMPLATE/connector_request.yml) issue linking to the upstream service's official HTTP API or structured CLI documentation.
2. **Create the adapter module**: Add a focused module under `src/connectors/<name>.mjs` using `runCmd` or `httpProbe` from `src/exec.mjs`.
3. **Wire configuration**: Add an optional, disabled-by-default (or gracefully degrading) entry under `connectors.<name>` in `src/config.mjs` and document it in `ops-console.config.example.json`.
4. **Support Demo Mode**: Add realistic synthetic fixture output in `src/demo.mjs` so contributors on any OS can verify the UI without running the upstream daemon.
5. **Add unit tests**: Add deterministic tests under `test/` covering normal responses, unreachable/timeout degradation, and invalid payloads.
6. **Update documentation**: Document the official protocol and collected telemetry in `README.md`, `README.zh-CN.md`, and `ARCHITECTURE.md`.

---

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat(connectors): add official health collector for <service>
fix(logs): ensure journalctl child terminates on SSE disconnect
docs(readme): clarify multi-host Tailnet binding example
test(security): cover Web Key cookie rotation and CSRF rejection
chore(ci): test against Node 20 and Node 22 LTS
```

---

## Pull Request Checklist

Before opening a PR, verify:

- [ ] `npm run check` passes without errors.
- [ ] `npm test` passes completely, including new tests for your changes.
- [ ] `package.json` introduces zero runtime dependencies.
- [ ] No personal hostnames, private IPs, secrets, or local config files (`config.local.json`, `data/`) are included.
- [ ] Documentation (`README.md`, `README.zh-CN.md`, `ARCHITECTURE.md`, `ops-console.config.example.json`) is updated if behavior or configuration changed.
