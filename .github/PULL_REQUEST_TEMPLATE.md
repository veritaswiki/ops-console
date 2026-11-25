## Summary

<!-- Briefly describe what this PR changes and why. -->

Closes #<!-- issue number if applicable -->

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature / UI enhancement
- [ ] New official-protocol connector
- [ ] Security hardening
- [ ] Documentation / deployment template update
- [ ] Refactor / test improvement

## Verification

<!-- Describe how you verified this change (tests run, demo mode check, Docker build, etc.). -->

- `npm run check`:
- `npm test`:

## Checklist

- [ ] `npm run check` and `npm test` pass locally on Node.js >= 20 LTS.
- [ ] Zero external runtime dependencies added to `package.json`.
- [ ] All subprocess calls use `execFile` / `spawn(..., { shell: false })` with allowlist validation.
- [ ] Zero personal data / PII committed (no real private IPs, Tailscale domains, usernames, secrets, or `config.local.json`).
- [ ] Documentation (`README.md`, `README.zh-CN.md`, `ARCHITECTURE.md`, `ops-console.config.example.json`, `CHANGELOG.md`) updated where applicable.
