#!/usr/bin/env node
"use strict";

const { spawn } = require("node:child_process");

function frame(obj) {
  const body = Buffer.from(JSON.stringify(obj), "utf8");
  const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "utf8");
  return Buffer.concat([header, body]);
}

function main() {
  const child = spawn(process.execPath, ["bin/idle-mcp.js"], { stdio: ["pipe", "pipe", "pipe"] });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (d) => (stdout += d.toString("utf8")));
  child.stderr.on("data", (d) => (stderr += d.toString("utf8")));

  child.stdin.write(
    frame({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "smoke", version: "0.0.0" } }
    })
  );
  child.stdin.write(frame({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }));

  setTimeout(() => {
    child.kill("SIGKILL");
  }, 300);

  child.on("close", (code) => {
    process.stdout.write(stdout);
    if (stderr.trim()) process.stderr.write(stderr);
    process.exitCode = code === null ? 0 : code;
  });
}

main();

