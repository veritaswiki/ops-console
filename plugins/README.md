# Ops Console Plugins

Ops Console uses a modular, official-protocol plugin architecture so every external integration (MCP servers, AI Agent runtimes, OpenAI-compatible gateways, memory engines, mesh networks, or custom HTTP services) is completely opt-in and decoupled from the core control plane.

## Installing or Creating a Plugin

1. Generate a starter plugin with the CLI:

```bash
ops-console plugin scaffold my-mcp-service --category mcp
```

2. Or create `plugins/<plugin-id>/index.mjs` following `_template/index.mjs` and using `definePlugin(...)` from `src/plugins/sdk.mjs`.
3. Enable and configure your plugin in the Web UI (**插件与接入**), via CLI (`ops-console plugin enable <id>`), or in `config.local.json`:

```json
{
  "plugins": {
    "configs": {
      "mcp-server": {
        "enabled": true,
        "apiUrl": "http://127.0.0.1:8080/mcp",
        "authToken": "env://MCP_AUTH_TOKEN"
      }
    }
  }
}
```

## Security Guidelines for Plugin Authors

- Never hardcode API keys, tokens, personal paths, or hostnames in plugin source files.
- Declare secret fields with `type: 'secret'` in `configSchema` so Ops Console automatically redacts values in API responses and resolves `env://` / `file://` references at runtime.
- Speak only official documented protocols (e.g., MCP JSON-RPC 2.0, A2A `/.well-known/agent.json`, OpenAI `/v1/models`, REST `/health`, or structured CLI `--json`).
