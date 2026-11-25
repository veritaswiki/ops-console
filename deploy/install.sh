#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
INSTALL_DIR="${HOME}/.local/share/ops-console"
CONFIG_DIR="${HOME}/.config/ops-console"
CONFIG_FILE="${CONFIG_DIR}/config.json"
ENV_FILE="${CONFIG_DIR}/env"
SYSTEMD_USER_DIR="${HOME}/.config/systemd/user"
SYSTEMD_UNIT_FILE="${SYSTEMD_USER_DIR}/ops-console.service"

IN_PLACE=0
WITH_SYSTEMD=0
UNINSTALL=0
RENDER_SUDOERS=0
SUDOERS_USER="${USER:-ops-console}"
SUDOERS_CONFIG=""

usage() {
  cat <<'EOF'
Ops Console Installer (v0.3.0)

Usage:
  ./deploy/install.sh [options]

Options:
  --prefix <dir>          Install directory (default: ~/.local/share/ops-console)
  --in-place              Run directly from this repository checkout instead of copying files
  --with-systemd          Install, reload, and enable the systemd user service
  --render-sudoers [cfg]  Print least-privilege /etc/sudoers.d/ops-console drop-in for config and exit
  --user <name>           Target OS username for --render-sudoers (default: current user)
  --uninstall             Stop/disable the user service and remove the installed copy
  -h, --help              Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prefix)
      [[ $# -ge 2 ]] || { echo "Error: --prefix requires a directory path" >&2; exit 1; }
      INSTALL_DIR="$2"
      shift 2
      ;;
    --in-place)
      IN_PLACE=1
      shift
      ;;
    --with-systemd)
      WITH_SYSTEMD=1
      shift
      ;;
    --render-sudoers)
      RENDER_SUDOERS=1
      if [[ $# -ge 2 && "$2" != --* ]]; then
        SUDOERS_CONFIG="$2"
        shift 2
      else
        shift
      fi
      ;;
    --user)
      [[ $# -ge 2 ]] || { echo "Error: --user requires a username" >&2; exit 1; }
      SUDOERS_USER="$2"
      shift 2
      ;;
    --uninstall)
      UNINSTALL=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Error: Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ "${RENDER_SUDOERS}" -eq 1 ]]; then
  CFG_TARGET="${SUDOERS_CONFIG:-${CONFIG_FILE}}"
  [[ -f "${CFG_TARGET}" ]] || { echo "Error: config file not found: ${CFG_TARGET}" >&2; exit 1; }
  command -v node >/dev/null 2>&1 || { echo "Error: node is required to parse ${CFG_TARGET}" >&2; exit 1; }
  node -e '
    const fs = require("node:fs");
    const user = process.argv[1];
    const cfg = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
    const unitRe = /^[A-Za-z0-9_.@-]+\.(service|timer)$/;
    const cmds = [];
    const services = Array.isArray(cfg.services) ? cfg.services : [];
    for (const svc of services) {
      if (svc.scope !== "system" || !unitRe.test(String(svc.unit || ""))) continue;
      if (svc.risk === "critical" && !Array.isArray(svc.allowedActions)) continue;
      const actions = Array.isArray(svc.allowedActions) ? svc.allowedActions : ["start", "stop", "restart", "reload"];
      for (const act of actions) {
        if (["start", "stop", "restart", "reload"].includes(act)) {
          cmds.push(`/bin/systemctl ${act} ${svc.unit}`);
        }
      }
    }
    const timers = Array.isArray(cfg.timers) ? cfg.timers : [];
    for (const t of timers) {
      if (t.scope !== "system" || !unitRe.test(String(t.unit || ""))) continue;
      for (const act of ["start", "stop", "enable --now", "disable --now"]) {
        cmds.push(`/bin/systemctl ${act} ${t.unit}`);
      }
    }
    if (cfg.connectors?.firewall?.enabled) {
      cmds.push("/usr/sbin/iptables-save -c", "/usr/sbin/ip6tables-save -c", "/usr/sbin/nft -j list ruleset");
    }
    console.log("# /etc/sudoers.d/ops-console (install with: visudo -c -f <file>, chmod 0440 root:root)");
    console.log("# Critical system services are excluded by default unless explicit allowedActions are set.");
    if (cmds.length === 0) {
      console.log("# No non-critical system units or privileged firewall readers configured.");
      process.exit(0);
    }
    console.log(`${user} ALL=(root) NOPASSWD: ${cmds.join(", \\\n  ")}`);
  ' "${SUDOERS_USER}" "${CFG_TARGET}"
  exit 0
fi

if [[ "${UNINSTALL}" -eq 1 ]]; then
  echo "Uninstalling Ops Console..."
  if command -v systemctl >/dev/null 2>&1 && [[ -f "${SYSTEMD_UNIT_FILE}" ]]; then
    systemctl --user disable --now ops-console.service || true
    rm -f "${SYSTEMD_UNIT_FILE}"
    systemctl --user daemon-reload || true
    echo "Removed systemd user unit: ${SYSTEMD_UNIT_FILE}"
  fi
  if [[ "${IN_PLACE}" -eq 0 && -d "${INSTALL_DIR}" && "${INSTALL_DIR}" != "${SOURCE_DIR}" ]]; then
    rm -rf "${INSTALL_DIR}"
    echo "Removed install directory: ${INSTALL_DIR}"
  fi
  echo "Configuration preserved at: ${CONFIG_DIR} (remove manually if no longer needed)"
  exit 0
fi

# 1. Verify Node.js >= 20
if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not installed. Please install Node.js >= 20 LTS." >&2
  exit 1
fi

NODE_BIN="$(command -v node)"
NODE_VERSION="$("${NODE_BIN}" -v)"
NODE_MAJOR="${NODE_VERSION#v}"
NODE_MAJOR="${NODE_MAJOR%%.*}"

if ! [[ "${NODE_MAJOR}" =~ ^[0-9]+$ ]] || [[ "${NODE_MAJOR}" -lt 20 ]]; then
  echo "Error: Node.js >= 20 LTS is required (found ${NODE_VERSION})." >&2
  exit 1
fi
echo "[ok] Detected Node.js ${NODE_VERSION} (${NODE_BIN})"

# 2. Prepare application directory
if [[ "${IN_PLACE}" -eq 1 ]]; then
  TARGET_DIR="${SOURCE_DIR}"
  echo "[ok] Using in-place checkout: ${TARGET_DIR}"
else
  TARGET_DIR="${INSTALL_DIR}"
  mkdir -p "${TARGET_DIR}" "${TARGET_DIR}/data"
  for item in package.json ops-console.config.example.json bin src public probe; do
    if [[ -e "${SOURCE_DIR}/${item}" ]]; then
      rm -rf "${TARGET_DIR:?}/${item}"
      cp -R "${SOURCE_DIR}/${item}" "${TARGET_DIR}/${item}"
    fi
  done
  echo "[ok] Installed application files to: ${TARGET_DIR}"
fi

DATA_DIR="${TARGET_DIR}/data"
mkdir -p "${DATA_DIR}"
chmod 700 "${DATA_DIR}"

# 3. Scaffold user configuration and optional environment file
mkdir -p "${CONFIG_DIR}"
chmod 700 "${CONFIG_DIR}"

if [[ ! -f "${CONFIG_FILE}" ]]; then
  cp "${SOURCE_DIR}/ops-console.config.example.json" "${CONFIG_FILE}"
  chmod 600 "${CONFIG_FILE}"
  echo "[ok] Created default config: ${CONFIG_FILE}"
else
  echo "[ok] Existing config preserved: ${CONFIG_FILE}"
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  cat > "${ENV_FILE}" <<'EOF'
# Ops Console optional environment overrides (chmod 600)
# OPS_CONSOLE_HOSTS=127.0.0.1,100.64.0.10
# OPS_CONSOLE_PORT=4320
# Recommended: point OPS_CONSOLE_WEB_KEY_FILE to a 0600 file containing the web key
# OPS_CONSOLE_WEB_KEY_FILE=%h/.config/ops-console/webkey
# OPS_CONSOLE_READ_ONLY=0
# MIHOMO_API_SECRET=
# SYNCTHING_API_KEY=
EOF
  chmod 600 "${ENV_FILE}"
  echo "[ok] Created environment template: ${ENV_FILE}"
else
  echo "[ok] Existing environment file preserved: ${ENV_FILE}"
fi

# 4. Validate configuration when CLI entrypoint is present
if [[ -f "${TARGET_DIR}/bin/ops-console.mjs" ]]; then
  "${NODE_BIN}" "${TARGET_DIR}/bin/ops-console.mjs" --check-config --config "${CONFIG_FILE}"
  echo "[ok] Configuration validated successfully"
fi

# 5. Optional systemd user service setup
if [[ "${WITH_SYSTEMD}" -eq 1 ]]; then
  if ! command -v systemctl >/dev/null 2>&1; then
    echo "Error: systemctl not found; cannot install systemd user unit." >&2
    exit 1
  fi

  mkdir -p "${SYSTEMD_USER_DIR}"
  if [[ -f "${SYSTEMD_UNIT_FILE}" ]]; then
    BACKUP_UNIT="${SYSTEMD_UNIT_FILE}.bak.$(date +%Y%m%d%H%M%S)"
    cp "${SYSTEMD_UNIT_FILE}" "${BACKUP_UNIT}"
    echo "[ok] Backed up existing unit to: ${BACKUP_UNIT}"
  fi

  cat > "${SYSTEMD_UNIT_FILE}" <<EOF
[Unit]
Description=Ops Console — Architecture, Service, Memory & Log Control Plane
Documentation=https://github.com/veritaswiki/ops-console
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${TARGET_DIR}
Environment=NODE_ENV=production
Environment=OPS_CONSOLE_CONFIG=${CONFIG_FILE}
Environment=OPS_CONSOLE_DATA_DIR=${DATA_DIR}
EnvironmentFile=-${ENV_FILE}
ExecStart=${NODE_BIN} ${TARGET_DIR}/bin/ops-console.mjs
UMask=0077
Restart=always
RestartSec=2
MemoryMax=512M
TimeoutStopSec=15
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ops-console

[Install]
WantedBy=default.target
EOF

  systemctl --user daemon-reload
  systemctl --user enable --now ops-console.service
  echo "[ok] Enabled and started systemd user service: ops-console.service"
fi

cat <<EOF

Installation complete.

Next steps:
  1. Edit your configuration:   ${CONFIG_FILE}
  2. Set optional secrets/env:  ${ENV_FILE}
  3. Start manually:            ${NODE_BIN} ${TARGET_DIR}/bin/ops-console.mjs --config ${CONFIG_FILE}
  4. Or test sandbox demo mode: ${NODE_BIN} ${TARGET_DIR}/bin/ops-console.mjs --demo

Rollback / Uninstall:
  - Stop service only:          systemctl --user disable --now ops-console.service
  - Full uninstall:             ${SCRIPT_DIR}/install.sh --uninstall --prefix "${TARGET_DIR}"
EOF
