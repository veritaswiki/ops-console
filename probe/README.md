# `@ops-console/probe`

Lightweight, zero-dependency, push-only telemetry probe for **Ops Console** (`v0.3.0`).

Designed to be auditable in minutes: a single ES module (`ops-probe.mjs`) using only Node.js `>= 20` built-in APIs.

## Security Model

- **Push-Only Telemetry**: The probe only sends outbound HTTP/HTTPS `POST` requests to your configured `hubUrl`. It never opens a listening socket and never accepts inbound traffic.
- **Zero Remote Code Execution (RCE)**: The probe never polls for commands, never evaluates hub responses, and cannot run arbitrary instructions from the hub.
- **Zero Runtime Dependencies**: Uses only Node.js built-ins (`node:fs`, `node:os`, `node:path`, `node:child_process` with `execFile` exclusively — never `exec` or `sh -c`, `node:net`, and global `fetch`).
- **Non-Root by Default**: Runs as an unprivileged, sandboxed `ops-probe` system user on Linux (`systemd`) and as an unprivileged user LaunchAgent on macOS.
- **Per-Node Scoped Tokens**: Authenticates with `Authorization: Bearer <token>` and `X-Ops-Probe-Id: <nodeId>`. Revoking one node's token never affects other nodes. The probe warns on `stderr` if its config file is readable by group or others (`mode & 0o077 !== 0`).
- **Token Delivery Without `ps` Exposure**: Install with `--token-file -` and a heredoc so the one-time token arrives over stdin and never appears in `argv` or process listings. A `0600` file path is also accepted.
- **Audit Before Sending**: Run `ops-probe --dry-run --once` to inspect the exact JSON payload printed to `stdout` without making any network connection.
- **Privacy-First Collection**: Only checks services explicitly listed in `watchServices`. Agent detection reports aggregate category counts only and never emits process arguments, PIDs, usernames, or environment variables.
- **Zero Third-Party Telemetry**: Never phones home to any external service.

## Quick Start

1. Preview the exact payload locally without contacting any server:

```bash
node ./ops-probe.mjs --dry-run --once
```

2. Copy the example config, lock down permissions, and set your hub URL, node ID, and per-node token:

```bash
cp probe.config.example.json config.json
chmod 600 config.json
```

3. Send a single telemetry snapshot to verify connectivity:

```bash
node ./ops-probe.mjs --config ./config.json --once
```

4. Run continuously (default interval: `30s`, exponential backoff capped at 5 minutes on failures):

```bash
node ./ops-probe.mjs --config ./config.json
```

## CLI Options & Environment Variables

| Flag | Environment Variable | Description |
| --- | --- | --- |
| `-c, --config <path>` | `OPS_PROBE_CONFIG` | Path to JSON config file |
| `--interval <sec>` | `OPS_PROBE_INTERVAL` | Push interval in seconds (`5`–`3600`, default `30`) |
| — | `OPS_PROBE_HUB_URL` | Override `hubUrl` (e.g. `https://hub.example.ts.net`) |
| — | `OPS_PROBE_NODE_ID` | Override `nodeId` (e.g. `edge-node-01`) |
| — | `OPS_PROBE_TOKEN` | Override per-node Bearer token |
| `--once` | — | Collect and send one snapshot, then exit |
| `--dry-run` | — | Collect and print JSON payload to `stdout` without sending |
| `--version` | — | Print probe version (`0.3.0`) |
| `-h, --help` | — | Show CLI help |

Precedence: CLI flags > environment variables > config file > built-in defaults.

## Deployment

### Linux (`systemd`)

Use the auditable installer (never modifies firewall, SSH, or Tailscale settings):

```bash
# Preview every action first
../deploy/probe/install-probe.sh --dry-run \
  --hub-url https://hub.example.ts.net \
  --node-id edge-node-01 \
  --token-file - <<'EOF'
REPLACE_WITH_ONE_TIME_PROBE_TOKEN
EOF

# Install hardened systemd service as unprivileged user ops-probe
sudo ../deploy/probe/install-probe.sh \
  --hub-url https://hub.example.ts.net \
  --node-id edge-node-01 \
  --token-file - <<'EOF'
REPLACE_WITH_ONE_TIME_PROBE_TOKEN
EOF
```

Reference unit template: [`../deploy/probe/ops-probe.service`](../deploy/probe/ops-probe.service).

### macOS (`LaunchAgent`)

Install as an unprivileged user agent (do not run with `sudo`):

```bash
../deploy/probe/install-probe.sh \
  --hub-url https://hub.example.ts.net \
  --node-id macbook-pro-01 \
  --device-type laptop \
  --token-file - <<'EOF'
REPLACE_WITH_ONE_TIME_PROBE_TOKEN
EOF
```

Reference LaunchAgent template: [`../deploy/probe/com.ops-console.probe.plist`](../deploy/probe/com.ops-console.probe.plist). Logs write to `~/Library/Logs/ops-probe.log`.

### Mobile (Android & iOS)

Phones do not need a persistent background daemon. See [`../deploy/probe/mobile-checkin.md`](../deploy/probe/mobile-checkin.md) for privacy-first, opt-in check-in workflows using Tailscale + Web UI, Termux/Tasker (Android), or Apple Shortcuts (iOS) with **zero GPS tracking**.

## Telemetry Protocol (`schemaVersion: 1`)

- **Endpoint**: `POST <hubUrl>/api/probes/ingest`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
  - `X-Ops-Probe-Id: <nodeId>`
  - `User-Agent: ops-probe/0.3.0`
- **Payload fields**: `schemaVersion`, `probeVersion`, `nodeId`, `sentAt`, `deviceType`, `platform`, `arch`, `hostname`, `kernel`, `uptimeSec`, `cpu`, `memory`, `disks`, `network`, `battery`, `tailscale`, `services`, `agents`, `hubRttMs`.

## License

MIT
