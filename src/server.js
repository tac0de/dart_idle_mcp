"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { JsonRpcStream } = require("./protocol.js");
const { execIdle } = require("./idle.js");

function readTextFileIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function makeError(code, message, data) {
  const err = { code, message };
  if (data !== undefined) err.data = data;
  return err;
}

function asTextBlock(text) {
  return [{ type: "text", text: String(text ?? "") }];
}

function toolResult(payload) {
  return { content: asTextBlock(JSON.stringify(payload, null, 2)) };
}

function toolError(payload) {
  return { isError: true, content: asTextBlock(JSON.stringify(payload, null, 2)) };
}

function getPackageVersion() {
  const pkgPath = path.join(__dirname, "..", "package.json");
  const pkgText = readTextFileIfExists(pkgPath);
  if (!pkgText) return "0.0.0";
  try {
    return JSON.parse(pkgText).version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function getPackageName() {
  const pkgPath = path.join(__dirname, "..", "package.json");
  const pkgText = readTextFileIfExists(pkgPath);
  if (!pkgText) return "dart-idle-mcp";
  try {
    return JSON.parse(pkgText).name || "dart-idle-mcp";
  } catch {
    return "dart-idle-mcp";
  }
}

function toolsList() {
  return [
    {
      name: "idle.exec",
      description:
        "Run idle_cli (idle <args...>) and return stdout/stderr plus parsed JSON (if stdout is valid JSON). This is the ONLY allowed execution surface for behavior claims about the Dart/Flutter Idle packages.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          args: { type: "array", items: { type: "string" } },
          cwd: { type: "string" },
          timeoutMs: { type: "number" },
          idlePath: { type: "string", description: "Optional override path to the `idle` executable." }
        },
        required: ["args"]
      }
    },
    {
      name: "idle.contract",
      description: "Return the agent contract / verification policy enforced by this MCP (from AGENTS.md).",
      inputSchema: { type: "object", additionalProperties: false, properties: {} }
    }
  ];
}

function listResources() {
  return [
    {
      uri: "idle://contract",
      name: "Idle SDK Agent Contract",
      description: "Operational constraints: idle_cli is the only execution surface, JSON-only stdout, no Flutter execution."
    }
  ];
}

async function startServer() {
  const stream = new JsonRpcStream({ input: process.stdin, output: process.stdout });
  const serverVersion = getPackageVersion();
  const serverName = getPackageName();
  const contractPath = path.join(__dirname, "..", "AGENTS.md");
  const contractText = readTextFileIfExists(contractPath) || "";

  stream.onMessage = async (msg) => {
    if (!msg || msg.jsonrpc !== "2.0" || !msg.method) return;

    const id = Object.prototype.hasOwnProperty.call(msg, "id") ? msg.id : null;
    const respond = (payload) => {
      if (id === null) return;
      stream.send({ jsonrpc: "2.0", id, ...payload });
    };

    try {
      switch (msg.method) {
        case "initialize": {
          const requestedVersion = msg.params && msg.params.protocolVersion;
          respond({
            result: {
              protocolVersion: requestedVersion || "2024-11-05",
              capabilities: {
                tools: {},
                resources: {},
                prompts: {}
              },
              serverInfo: { name: serverName, version: serverVersion }
            }
          });
          return;
        }

        case "tools/list": {
          respond({ result: { tools: toolsList() } });
          return;
        }

        case "tools/call": {
          const params = msg.params || {};
          const name = params.name;
          const args = params.arguments || {};
          if (name === "idle.exec") {
            const result = await execIdle(args);
            respond({ result: result.ok ? toolResult(result) : toolError(result) });
            return;
          }

          if (name === "idle.contract") {
            respond({ result: toolResult({ ok: true, contract: contractText }) });
            return;
          }

          respond({ error: makeError(-32601, `Unknown tool: ${name}`) });
          return;
        }

        case "resources/list": {
          respond({ result: { resources: listResources() } });
          return;
        }

        case "resources/read": {
          const params = msg.params || {};
          if (params.uri !== "idle://contract") {
            respond({ error: makeError(-32602, `Unknown resource URI: ${params.uri}`) });
            return;
          }
          respond({
            result: {
              contents: [
                {
                  uri: "idle://contract",
                  mimeType: "text/markdown",
                  text: contractText
                }
              ]
            }
          });
          return;
        }

        case "prompts/list": {
          respond({
            result: {
              prompts: [
                {
                  name: "idle.sync_check",
                  description:
                    "Workflow prompt for verifying Idle SDK behavior using idle_cli JSON output (no Dart API calls, no Flutter execution)."
                }
              ]
            }
          });
          return;
        }

        case "prompts/get": {
          const params = msg.params || {};
          if (params.name !== "idle.sync_check") {
            respond({ error: makeError(-32602, `Unknown prompt: ${params.name}`) });
            return;
          }
          respond({
            result: {
              description: "Idle SDK synchronization checklist",
              messages: [
                {
                  role: "system",
                  content: [
                    {
                      type: "text",
                      text: [
                        "You are a Local SDK Synchronization & Verification Agent for the Idle SDK.",
                        "",
                        "Hard rules:",
                        "- The ONLY allowed execution surface is idle_cli: run `idle <command>`.",
                        "- Base claims on JSON output from stdout; stderr is logs/errors.",
                        "- Never execute or import Flutter (idle_flutter is conceptual only).",
                        "- If idle_cli is missing, return installation guidance; never fabricate outcomes.",
                        "",
                        "Verification pattern:",
                        "1) State the claim.",
                        "2) Run the relevant `idle` command(s).",
                        "3) Inspect the returned JSON.",
                        "4) Compare expected vs actual.",
                        "5) Assess impact across idle_core / idle_save / idle_flutter.",
                        "6) Declare confidence (execution-verified >= 90%)."
                      ].join("\n")
                    }
                  ]
                }
              ]
            }
          });
          return;
        }

        default: {
          respond({ error: makeError(-32601, `Method not found: ${msg.method}`) });
        }
      }
    } catch (err) {
      respond(
        { error: makeError(-32000, "Server error", { message: err && err.message ? err.message : String(err) }) }
      );
    }
  };

  process.stderr.write(`[idle-mcp] started (v${serverVersion})\n`);
}

module.exports = { startServer };
