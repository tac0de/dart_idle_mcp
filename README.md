# dart-idle-mcp

Local MCP server for the **Dart/Flutter Idle packages** (`idle_core`, `idle_save`, `idle_flutter`) using **`idle_cli` as the single executable authority**.

## Why

- No network dependency (local execution only)
- No Flutter execution (never imports or runs `idle_flutter`)
- Behavior verification is done by running `idle <command>` and reading **JSON-only stdout**

## Prerequisites

- Install `idle_cli` (pub.dev): `dart pub global activate idle_cli`
- Ensure `idle` is available on `PATH` (usually add `~/.pub-cache/bin`), or set `IDLE_CLI_PATH`.

## Run (npx)

```bash
npx -y dart-idle-mcp
```

## Run (from this repo)

```bash
node bin/idle-mcp.js
```

## MCP Client Config (Example)

### Codex CLI (`~/.codex/config.toml`)

```toml
[mcp_servers.idle]
command = "npx"
args = ["-y", "dart-idle-mcp"]
```

### Claude Desktop-style

If your MCP client supports stdio servers, point it at `npx -y dart-idle-mcp`.

```json
{
  "mcpServers": {
    "idle": {
      "command": "npx",
      "args": ["-y", "dart-idle-mcp"]
    }
  }
}
```

## Tools

- `idle.exec`: Runs `idle <args...>` and returns stdout/stderr + parsed JSON if valid.
- `idle.contract`: Returns `AGENTS.md` (the agent contract).

## Config

- `IDLE_CLI_PATH`: override the `idle` executable path (defaults to `idle` on PATH)

## Publish to npm

- This repo is ready to publish as-is, but you may still want a scoped name to avoid collisions (e.g. `@your-scope/dart-idle-mcp`).
- Before publishing, update `package.json#name` (and optionally add `repository`, `homepage`, `bugs`).
- If you intend to publish publicly, set a real `license` in `package.json` (it is currently `UNLICENSED`).
- Publish (requires network + npm auth):

```bash
npm login
npm publish --access public
```

## Troubleshooting

- If `idle` is not found, `idle.exec` returns a structured error with install guidance (`dart pub global activate idle_cli`) and PATH hints.
- This MCP never runs Flutter; any `idle_flutter` impact is conceptual only.
