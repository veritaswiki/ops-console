#!/usr/bin/env bash
# Ops Console Probe Installer (v2.1.0)
# Transparent, auditable installer for Linux (systemd) and macOS (LaunchAgent).
# Guarantee: This script NEVER modifies firewall rules, SSH configuration, or Tailscale settings.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_SOURCE="${SCRIPT_DIR}/../../probe/ops-probe.mjs"

DRY_RUN=0
UNINSTALL=0
HUB_URL=""
NODE_ID=""
TOKEN=""
DEVICE_TYPE=""
INTERVAL_SEC="30"
SOURCE_FILE="${DEFAULT_SOURCE}"

usage() {
  cat <<'EOF'
Ops Console Probe Installer (v2.1.0)

Installs the zero-dependency, push-only telemetry probe as an unprivileged service:
  - Linux: systemd service running as system user "ops-probe"
           (/opt/ops-probe/ops-probe.mjs, /etc/ops-probe/config.json chmod 600)
  - macOS: user LaunchAgent (unprivileged, do not run with sudo)
           (~/.local/lib/ops-probe/ops-probe.mjs, ~/.config/ops-probe/config.json chmod 600)

Security guarantee:
  NEVER modifies firewall, SSH, or Tailscale configuration.

Usage:
  ./deploy/probe/install-probe.sh [options]

Options:
  --hub-url <url>       Ops Console hub base URL (e.g. https://hub.example.ts.net)
  --node-id <id>        Unique node identifier (default: current hostname)
  --token <token>       Per-node scoped Bearer token (or pass via OPS_PROBE_TOKEN)
  --device-type <type>  hub | server | edge | laptop | mobile | auto
  --interval <sec>      Push interval in seconds (5-3600, default: 30)
  --source <file>       Local path to ops-probe.mjs (default: ../../probe/ops-probe.mjs)
  --dry-run             Print planned actions without making any changes
  --uninstall           Stop service and remove installed probe files (preserves config)
  -h, --help            Show this help message

Examples:
  # Preview Linux install
  ./deploy/probe/install-probe.sh --dry-run --hub-url https://hub.example.ts.net --node-id edge-node-01 --token REPLACE_WITH_PER_NODE_TOKEN

  # Install on Linux
  sudo ./deploy/probe/install-probe.sh --hub-url https://hub.example.ts.net --node-id edge-node-01 --token REPLACE_WITH_PER_NODE_TOKEN

  # Install on macOS
  ./deploy/probe/install-probe.sh --hub-url https://hub.example.ts.net --node-id macbook-01 --device-type laptop --token REPLACE_WITH_PER_NODE_TOKEN
EOF
}

log_info() {
  printf '[ops-probe-install] %s\n' "$1"
}

log_warn() {
  printf '[ops-probe-install] WARNING: %s\n' "$1" >&2
}

die() {
  printf '[ops-probe-install] ERROR: %s\n' "$1" >&2
  exit 1
}

run_or_plan() {
  if [[ "${DRY_RUN}" -eq 1 ]]; then
    printf '[dry-run] %s\n' "$*"
  else
    "$@"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --uninstall)
      UNINSTALL=1
      shift
      ;;
    --hub-url)
      [[ $# -ge 2 ]] || die "--hub-url requires a value"
      HUB_URL="$2"
      shift 2
      ;;
    --node-id)
      [[ $# -ge 2 ]] || die "--node-id requires a value"
      NODE_ID="$2"
      shift 2
      ;;
    --token)
      [[ $# -ge 2 ]] || die "--token requires a value"
      TOKEN="$2"
      shift 2
      ;;
    --device-type)
      [[ $# -ge 2 ]] || die "--device-type requires a value"
      DEVICE_TYPE="$2"
      shift 2
      ;;
    --interval)
      [[ $# -ge 2 ]] || die "--interval requires a value"
      INTERVAL_SEC="$2"
      shift 2
      ;;
    --source)
      [[ $# -ge 2 ]] || die "--source requires a value"
      SOURCE_FILE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1 (use --help for usage)"
      ;;
  esac
done

if [[ -z "${TOKEN}" && -n "${OPS_PROBE_TOKEN:-}" ]]; then
  TOKEN="${OPS_PROBE_TOKEN}"
fi

OS_NAME="$(uname -s)"
case "${OS_NAME}" in
  Linux)
    PLATFORM="linux"
    ;;
  Darwin)
    PLATFORM="darwin"
    ;;
  *)
    die "Unsupported OS: ${OS_NAME}. Supported platforms are Linux (systemd) and macOS (LaunchAgent)."
    ;;
esac

if [[ -z "${NODE_ID}" ]]; then
  NODE_ID="$(hostname -s 2>/dev/null || hostname)"
  NODE_ID="$(printf '%s' "${NODE_ID}" | tr '[:upper:]' '[:lower:]')"
fi

if [[ -z "${DEVICE_TYPE}" ]]; then
  if [[ "${PLATFORM}" == "darwin" ]]; then
    DEVICE_TYPE="auto"
  else
    DEVICE_TYPE="server"
  fi
fi

validate_inputs() {
  if [[ -n "${HUB_URL}" ]] && ! [[ "${HUB_URL}" =~ ^https?://[^[:space:]]+$ ]]; then
    die "--hub-url must start with http:// or https://"
  fi
  if ! [[ "${NODE_ID}" =~ ^[A-Za-z0-9._:-]{1,128}$ ]]; then
    die "--node-id must match ^[A-Za-z0-9._:-]{1,128}$"
  fi
  case "${DEVICE_TYPE}" in
    hub|server|edge|laptop|mobile|auto) ;;
    *) die "--device-type must be one of: hub, server, edge, laptop, mobile, auto" ;;
  esac
  if ! [[ "${INTERVAL_SEC}" =~ ^[0-9]+$ ]] || [[ "${INTERVAL_SEC}" -lt 5 ]] || [[ "${INTERVAL_SEC}" -gt 3600 ]]; then
    die "--interval must be an integer between 5 and 3600"
  fi
}

detect_node() {
  if ! command -v node >/dev/null 2>&1; then
    die "Node.js >= 20 is required but 'node' was not found in PATH."
  fi
  NODE_BIN="$(command -v node)"
  NODE_VERSION="$("${NODE_BIN}" -v)"
  NODE_MAJOR="${NODE_VERSION#v}"
  NODE_MAJOR="${NODE_MAJOR%%.*}"
  if ! [[ "${NODE_MAJOR}" =~ ^[0-9]+$ ]] || [[ "${NODE_MAJOR}" -lt 20 ]]; then
    die "Node.js >= 20 is required (found ${NODE_VERSION} at ${NODE_BIN})."
  fi
  log_info "Detected Node.js ${NODE_VERSION} (${NODE_BIN})"
}

write_config_json() {
  local config_path="$1"
  local owner_spec="${2:-}"

  if [[ -f "${config_path}" && -z "${HUB_URL}" && -z "${TOKEN}" ]]; then
    log_info "Preserving existing config: ${config_path}"
    return 0
  fi

  if [[ -z "${HUB_URL}" || -z "${TOKEN}" ]]; then
    if [[ -f "${config_path}" ]]; then
      log_info "Preserving existing config (pass both --hub-url and --token to regenerate): ${config_path}"
      return 0
    fi
    if [[ "${DRY_RUN}" -eq 1 ]]; then
      log_warn "No --hub-url or --token supplied; using placeholder values in dry-run preview."
    else
      die "Missing required --hub-url and --token to create ${config_path}"
    fi
  fi

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    printf '[dry-run] Write %s (chmod 600%s) with hubUrl=%s nodeId=%s deviceType=%s intervalSec=%s token=<redacted>\n' \
      "${config_path}" \
      "${owner_spec:+, chown ${owner_spec}}" \
      "${HUB_URL:-https://hub.example.ts.net}" \
      "${NODE_ID}" \
      "${DEVICE_TYPE}" \
      "${INTERVAL_SEC}"
    return 0
  fi

  if [[ -f "${config_path}" ]]; then
    local backup_path="${config_path}.bak.$(date +%Y%m%d%H%M%S)"
    cp -p "${config_path}" "${backup_path}"
    chmod 600 "${backup_path}"
    log_info "Backed up existing config to: ${backup_path}"
  fi

  (
    umask 077
    PROBE_CFG_PATH="${config_path}" \
    PROBE_CFG_HUB_URL="${HUB_URL}" \
    PROBE_CFG_NODE_ID="${NODE_ID}" \
    PROBE_CFG_TOKEN="${TOKEN}" \
    PROBE_CFG_DEVICE_TYPE="${DEVICE_TYPE}" \
    PROBE_CFG_INTERVAL="${INTERVAL_SEC}" \
    "${NODE_BIN}" -e '
      const fs = require("node:fs");
      const payload = {
        hubUrl: process.env.PROBE_CFG_HUB_URL,
        nodeId: process.env.PROBE_CFG_NODE_ID,
        token: process.env.PROBE_CFG_TOKEN,
        deviceType: process.env.PROBE_CFG_DEVICE_TYPE,
        intervalSec: Number(process.env.PROBE_CFG_INTERVAL),
        mounts: ["/"],
        watchServices: []
      };
      fs.writeFileSync(process.env.PROBE_CFG_PATH, JSON.stringify(payload, null, 2) + "\n", { mode: 0o600 });
    '
  )

  chmod 600 "${config_path}"
  if [[ -n "${owner_spec}" ]]; then
    chown "${owner_spec}" "${config_path}"
  fi
  log_info "Wrote config (mode 600): ${config_path}"
}

install_linux() {
  local install_dir="/opt/ops-probe"
  local install_bin="${install_dir}/ops-probe.mjs"
  local config_dir="/etc/ops-probe"
  local config_file="${config_dir}/config.json"
  local unit_file="/etc/systemd/system/ops-probe.service"
  local probe_user="ops-probe"

  if [[ "${DRY_RUN}" -eq 0 && "${EUID}" -ne 0 ]]; then
    die "Linux systemd installation requires root privileges. Re-run with sudo (or pass --dry-run to preview)."
  fi

  if [[ "${UNINSTALL}" -eq 1 ]]; then
    if command -v systemctl >/dev/null 2>&1; then
      run_or_plan systemctl disable --now ops-probe.service || true
    fi
    if [[ -f "${unit_file}" || "${DRY_RUN}" -eq 1 ]]; then
      run_or_plan rm -f "${unit_file}"
    fi
    if command -v systemctl >/dev/null 2>&1; then
      run_or_plan systemctl daemon-reload || true
    fi
    if [[ -d "${install_dir}" || "${DRY_RUN}" -eq 1 ]]; then
      run_or_plan rm -rf "${install_dir}"
    fi
    log_info "Uninstalled Linux probe service and ${install_dir}."
    log_info "Config preserved at ${config_file} and system user '${probe_user}' kept."
    log_info "To remove them manually: sudo rm -rf ${config_dir} && sudo userdel ${probe_user}"
    return 0
  fi

  validate_inputs
  detect_node
  [[ -f "${SOURCE_FILE}" ]] || die "Probe source file not found: ${SOURCE_FILE}"
  command -v systemctl >/dev/null 2>&1 || die "systemctl not found; this installer requires systemd on Linux."

  if [[ "${NODE_BIN}" == /home/* || "${NODE_BIN}" == /root/* ]]; then
    log_warn "Node binary (${NODE_BIN}) is inside a home directory. Because ops-probe.service sets ProtectHome=yes, install Node.js under /usr/bin or /usr/local/bin."
  fi

  # Create dedicated unprivileged system user
  if id -u "${probe_user}" >/dev/null 2>&1; then
    log_info "System user '${probe_user}' already exists"
  else
    local nologin_shell="/usr/sbin/nologin"
    if [[ ! -x "${nologin_shell}" && -x "/sbin/nologin" ]]; then
      nologin_shell="/sbin/nologin"
    elif [[ ! -x "${nologin_shell}" ]]; then
      nologin_shell="/bin/false"
    fi
    run_or_plan useradd --system --no-create-home --home-dir /nonexistent --shell "${nologin_shell}" "${probe_user}"
    log_info "Created dedicated unprivileged system user '${probe_user}'"
  fi

  run_or_plan install -d -m 755 "${install_dir}"
  run_or_plan install -m 755 "${SOURCE_FILE}" "${install_bin}"
  run_or_plan install -d -m 700 -o "${probe_user}" -g "${probe_user}" "${config_dir}"
  write_config_json "${config_file}" "${probe_user}:${probe_user}"

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    printf '[dry-run] Write hardened systemd unit: %s (ExecStart=%s %s --config %s)\n' \
      "${unit_file}" "${NODE_BIN}" "${install_bin}" "${config_file}"
  else
    if [[ -f "${unit_file}" ]]; then
      local backup_unit="${unit_file}.bak.$(date +%Y%m%d%H%M%S)"
      cp -p "${unit_file}" "${backup_unit}"
      log_info "Backed up existing systemd unit to: ${backup_unit}"
    fi
    cat > "${unit_file}" <<EOF
[Unit]
Description=Ops Console Probe — Lightweight Push-Only Telemetry Agent
Documentation=https://github.com/ops-console/ops-console
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${probe_user}
Group=${probe_user}
Environment=NODE_ENV=production
Environment=OPS_PROBE_CONFIG=${config_file}
ExecStart=${NODE_BIN} ${install_bin} --config ${config_file}

Restart=always
RestartSec=5
MemoryMax=128M
TimeoutStopSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ops-probe

NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
ProtectControlGroups=yes
ProtectKernelTunables=yes
ProtectKernelModules=yes
CapabilityBoundingSet=
RestrictSUIDSGID=yes
LockPersonality=yes
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX

[Install]
WantedBy=multi-user.target
EOF
    chmod 644 "${unit_file}"
    log_info "Installed hardened systemd unit: ${unit_file}"
  fi

  run_or_plan systemctl daemon-reload
  run_or_plan systemctl enable --now ops-probe.service

  cat <<EOF

Linux installation complete.
  Probe binary: ${install_bin}
  Config file:  ${config_file} (mode 600, owner ${probe_user})
  Systemd unit: ${unit_file}

Useful commands:
  Status:    systemctl status ops-probe.service
  Logs:      journalctl -u ops-probe.service -f
  Dry-run:   sudo -u ${probe_user} ${NODE_BIN} ${install_bin} --config ${config_file} --dry-run --once
  Uninstall: sudo ${BASH_SOURCE[0]} --uninstall
EOF
}

install_macos() {
  local install_dir="${HOME}/.local/lib/ops-probe"
  local install_bin="${install_dir}/ops-probe.mjs"
  local config_dir="${HOME}/.config/ops-probe"
  local config_file="${config_dir}/config.json"
  local agents_dir="${HOME}/Library/LaunchAgents"
  local plist_file="${agents_dir}/com.ops-console.probe.plist"
  local logs_dir="${HOME}/Library/Logs"
  local log_file="${logs_dir}/ops-probe.log"
  local gui_domain="gui/$(id -u)"

  if [[ "${DRY_RUN}" -eq 0 && "${EUID}" -eq 0 ]]; then
    die "Do not run macOS LaunchAgent installation with sudo; run as your normal unprivileged user."
  fi

  if [[ "${UNINSTALL}" -eq 1 ]]; then
    if [[ -f "${plist_file}" || "${DRY_RUN}" -eq 1 ]]; then
      if [[ "${DRY_RUN}" -eq 1 ]]; then
        printf '[dry-run] launchctl bootout %s %s\n' "${gui_domain}" "${plist_file}"
      else
        launchctl bootout "${gui_domain}" "${plist_file}" >/dev/null 2>&1 \
          || launchctl unload "${plist_file}" >/dev/null 2>&1 \
          || true
      fi
      run_or_plan rm -f "${plist_file}"
    fi
    if [[ -d "${install_dir}" || "${DRY_RUN}" -eq 1 ]]; then
      run_or_plan rm -rf "${install_dir}"
    fi
    log_info "Uninstalled macOS LaunchAgent and ${install_dir}."
    log_info "Config preserved at ${config_file} (remove manually if no longer needed)."
    return 0
  fi

  validate_inputs
  detect_node
  [[ -f "${SOURCE_FILE}" ]] || die "Probe source file not found: ${SOURCE_FILE}"

  run_or_plan mkdir -p "${install_dir}" "${agents_dir}" "${logs_dir}"
  run_or_plan cp "${SOURCE_FILE}" "${install_bin}"
  run_or_plan chmod 755 "${install_bin}"
  run_or_plan mkdir -p "${config_dir}"
  run_or_plan chmod 700 "${config_dir}"
  write_config_json "${config_file}"

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    printf '[dry-run] Write macOS LaunchAgent plist: %s (logs -> %s)\n' "${plist_file}" "${log_file}"
    printf '[dry-run] launchctl bootout %s %s (if loaded)\n' "${gui_domain}" "${plist_file}"
    printf '[dry-run] launchctl bootstrap %s %s\n' "${gui_domain}" "${plist_file}"
  else
    if [[ -f "${plist_file}" ]]; then
      local backup_plist="${plist_file}.bak.$(date +%Y%m%d%H%M%S)"
      cp -p "${plist_file}" "${backup_plist}"
      log_info "Backed up existing LaunchAgent plist to: ${backup_plist}"
    fi

    cat > "${plist_file}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.ops-console.probe</string>

  <key>ProgramArguments</key>
  <array>
    <string>${NODE_BIN}</string>
    <string>${install_bin}</string>
    <string>--config</string>
    <string>${config_file}</string>
  </array>

  <key>EnvironmentVariables</key>
  <dict>
    <key>NODE_ENV</key>
    <string>production</string>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>

  <key>RunAtLoad</key>
  <true/>

  <key>KeepAlive</key>
  <true/>

  <key>ProcessType</key>
  <string>Background</string>

  <key>ThrottleInterval</key>
  <integer>10</integer>

  <key>StandardOutPath</key>
  <string>${log_file}</string>

  <key>StandardErrorPath</key>
  <string>${log_file}</string>
</dict>
</plist>
EOF
    chmod 644 "${plist_file}"
    launchctl bootout "${gui_domain}" "${plist_file}" >/dev/null 2>&1 \
      || launchctl unload "${plist_file}" >/dev/null 2>&1 \
      || true
    launchctl bootstrap "${gui_domain}" "${plist_file}" >/dev/null 2>&1 \
      || launchctl load -w "${plist_file}"
    log_info "Loaded LaunchAgent: com.ops-console.probe"
  fi

  cat <<EOF

macOS installation complete.
  Probe binary: ${install_bin}
  Config file:  ${config_file} (mode 600)
  LaunchAgent:  ${plist_file}
  Log file:     ${log_file}

Useful commands:
  Dry-run:   ${NODE_BIN} ${install_bin} --config ${config_file} --dry-run --once
  Logs:      tail -f ${log_file}
  Uninstall: ${BASH_SOURCE[0]} --uninstall
EOF
}

if [[ "${PLATFORM}" == "linux" ]]; then
  install_linux
else
  install_macos
fi
