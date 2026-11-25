# Mobile Check-In Guide (Android & iOS)

Phones do not need an always-on background daemon to appear cleanly in Ops Console. Instead, use **privacy-first, opt-in check-in** over your private Tailscale network.

## Privacy Guarantee

- **Opt-in only**: Check-ins run only when you tap a button, plug in a charger, or trigger a schedule you explicitly create.
- **Minimal fields**: Battery percentage, charging state, network type (`wifi` or `cellular`), and an optional **user-chosen coarse region label** (such as `"home"`, `"office"`, or `"travel"`).
- **ZERO GPS tracking**: Never collects latitude, longitude, cell-tower IDs, Wi-Fi BSSIDs, or continuous background location.
- **ZERO remote code execution**: Strictly push-only HTTP `POST`. The hub cannot send commands back to your phone.
- **Per-device revocable token**: Create a dedicated node token for each phone so a lost device can be revoked immediately without affecting other nodes.

## Prerequisites

1. Install **Tailscale** on your phone and sign in to your private tailnet.
2. Verify your Ops Console hub is reachable over Tailscale (for example, `https://hub.example.ts.net` or `http://100.64.0.10:4320`).
3. Register a mobile node ID on the hub (for example, `pixel-01` or `iphone-01`) and copy its per-node Bearer token.

## Telemetry Payload Contract (`schemaVersion: 1`)

Every mobile check-in sends an authenticated `POST` request to:

```text
POST https://hub.example.ts.net/api/probes/ingest
```

Headers:

- `Content-Type: application/json`
- `Authorization: Bearer REPLACE_WITH_PER_NODE_TOKEN`
- `X-Ops-Probe-Id: <your-node-id>`
- `User-Agent: ops-probe/2.1.0`

Example JSON body:

```json
{
  "schemaVersion": 1,
  "probeVersion": "2.1.0",
  "nodeId": "iphone-01",
  "sentAt": "2026-11-25T08:00:00.000Z",
  "deviceType": "mobile",
  "platform": "ios",
  "arch": "arm64",
  "hostname": "iphone-01",
  "kernel": "mobile",
  "uptimeSec": 0,
  "cpu": null,
  "memory": null,
  "disks": [],
  "network": {
    "rxBytesPerSec": null,
    "txBytesPerSec": null,
    "type": "wifi"
  },
  "battery": {
    "percent": 82,
    "charging": true,
    "source": "AC Power"
  },
  "tailscale": {
    "available": true,
    "online": true,
    "ip": "100.64.0.21",
    "dnsName": "iphone-01.example.ts.net",
    "relay": null,
    "peersOnline": null
  },
  "services": [],
  "agents": {
    "count": 0,
    "categories": {}
  },
  "region": "home",
  "hubRttMs": null
}
```

---

## Android

### Option 1: One-Tap Web UI Check-In (No Extra Apps)

1. Connect to Tailscale on your Android device.
2. Open your Ops Console hub (`https://hub.example.ts.net`) in your mobile browser.
3. Open the **Mobile Check-In** drawer/action, pick a coarse region label if desired (e.g. `home`, `office`), and tap **Check In**.
4. Optionally add the page to your Home Screen as a shortcut for one-tap updates.

### Option 2: Automated Check-In with Termux (`termux-api`)

Install **Termux** and **Termux:API** (from F-Droid), then install `jq`, `curl`, and `termux-api`:

```bash
pkg install -y curl jq termux-api
```

Create `~/.local/bin/ops-checkin.sh` (`chmod 700`):

```bash
#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

HUB_URL="https://hub.example.ts.net"
NODE_ID="pixel-01"
TOKEN="REPLACE_WITH_PER_NODE_TOKEN"
REGION="${1:-home}"

BATT_JSON="$(termux-battery-status)"
PERCENT="$(printf '%s' "${BATT_JSON}" | jq -r '.percentage // 0')"
PLUGGED="$(printf '%s' "${BATT_JSON}" | jq -r '.plugged // "UNPLUGGED"')"
STATUS="$(printf '%s' "${BATT_JSON}" | jq -r '.status // "DISCHARGING"')"

CHARGING="false"
SOURCE="Battery Power"
if [[ "${STATUS}" == "CHARGING" ]]; then
  CHARGING="true"
fi
if [[ "${PLUGGED}" != "UNPLUGGED" ]]; then
  SOURCE="AC Power"
fi

WIFI_STATE="$(termux-wifi-connectioninfo 2>/dev/null | jq -r '.supplicant_state // ""' || true)"
NET_TYPE="cellular"
if [[ "${WIFI_STATE}" == "COMPLETED" ]]; then
  NET_TYPE="wifi"
fi

NOW_ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

PAYLOAD="$(jq -n \
  --arg nodeId "${NODE_ID}" \
  --arg sentAt "${NOW_ISO}" \
  --arg netType "${NET_TYPE}" \
  --arg source "${SOURCE}" \
  --arg region "${REGION}" \
  --argjson percent "${PERCENT}" \
  --argjson charging "${CHARGING}" \
  '{
    schemaVersion: 1,
    probeVersion: "2.1.0",
    nodeId: $nodeId,
    sentAt: $sentAt,
    deviceType: "mobile",
    platform: "android",
    arch: "arm64",
    hostname: $nodeId,
    kernel: "android",
    uptimeSec: 0,
    cpu: null,
    memory: null,
    disks: [],
    network: { rxBytesPerSec: null, txBytesPerSec: null, type: $netType },
    battery: { percent: $percent, charging: $charging, source: $source },
    tailscale: { available: true, online: true, ip: null, dnsName: null, relay: null, peersOnline: null },
    services: [],
    agents: { count: 0, categories: {} },
    region: $region,
    hubRttMs: null
  }')"

curl -fsS --max-time 8 \
  -X POST "${HUB_URL}/api/probes/ingest" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Ops-Probe-Id: ${NODE_ID}" \
  -H "User-Agent: ops-probe/2.1.0" \
  -d "${PAYLOAD}" >/dev/null
```

### Option 3: Tasker HTTP Request

1. Create a Tasker Task named `Ops Check-In` with an **HTTP Request** action:
   - **Method**: `POST`
   - **URL**: `https://hub.example.ts.net/api/probes/ingest`
   - **Headers**:
     - `Content-Type: application/json`
     - `Authorization: Bearer REPLACE_WITH_PER_NODE_TOKEN`
     - `X-Ops-Probe-Id: pixel-01`
     - `User-Agent: ops-probe/2.1.0`
   - **Body**: Use the schema v1 JSON template above with `%BATT` for `battery.percent` and your chosen static/profile-based `region` (do not attach `%LOC`).
2. Trigger manually from a home-screen widget or on **State → Power → Any** (charger connected).

---

## iOS (Tailscale + Apple Shortcuts)

Apple Shortcuts can check in natively with zero third-party apps:

1. Open the **Shortcuts** app and tap **+** to create a new shortcut named **Ops Check-In**.
2. Add the following actions in order:
   - **Get Battery Status** → choose **Battery Level** (save to variable `BatteryPercent`).
   - **Get Battery Status** → choose **Is Charging** (save to variable `IsCharging`).
   - **If** `IsCharging` is true → **Text** `AC Power` → **Otherwise** → **Text** `Battery Power` (save to `PowerSource`).
   - **Get Network Details** → choose **Network** (Wi-Fi vs Cellular; avoid sending raw Wi-Fi SSID if you prefer extra privacy) → normalize to `wifi` or `cellular` (`NetType`).
   - *(Optional)* **Choose from Menu** or **Text** for a user-chosen coarse region label (e.g. `home`, `office`, `travel`) — **never** add `Get Current Location`.
   - **Date** (Current Date) → **Format Date** with ISO 8601 (`yyyy-MM-dd'T'HH:mm:ss'Z'`, UTC) (`SentAt`).
   - **Get Contents of URL**:
     - **URL**: `https://hub.example.ts.net/api/probes/ingest`
     - **Method**: `POST`
     - **Headers**:
       - `Content-Type`: `application/json`
       - `Authorization`: `Bearer REPLACE_WITH_PER_NODE_TOKEN`
       - `X-Ops-Probe-Id`: `iphone-01`
       - `User-Agent`: `ops-probe/2.1.0`
     - **Request Body**: `JSON` containing `schemaVersion` (`1`), `probeVersion` (`"2.1.0"`), `nodeId` (`"iphone-01"`), `sentAt` (`SentAt`), `deviceType` (`"mobile"`), `platform` (`"ios"`), `battery` dictionary (`percent`, `charging`, `source`), `network` dictionary (`type`), and optional `region`.
3. Tap the shortcut to test while connected to Tailscale.
4. *(Optional)* Automate via **Shortcuts → Automation → +**:
   - Trigger on **Charger → Is Connected** or **Time of Day** (e.g., morning/evening).
   - Select **Run Immediately** and pick your **Ops Check-In** shortcut.

## Verification & Token Revocation

- After a check-in, confirm the device appears online with updated battery and timestamp in your Ops Console hub.
- If a phone is lost or retired, revoke its per-node token on the Ops Console hub immediately; no other probes are affected.
