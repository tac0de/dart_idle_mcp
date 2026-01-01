"use strict";

const { spawn } = require("node:child_process");

function safeJsonParse(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return { ok: false, error: "empty stdout" };
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
}

function buildInstallGuidance(idlePath) {
  const cmd = idlePath === "idle" ? "idle" : idlePath;
  return [
    `idle_cli executable not found (${cmd}).`,
    `Install via Dart: \`dart pub global activate idle_cli\``,
    `Ensure \`~/.pub-cache/bin\` is on PATH, then re-run \`${cmd} <command>\`.`,
    `Or set \`IDLE_CLI_PATH\` to an absolute path to the \`idle\` executable.`
  ].join("\n");
}

async function execIdle({ args, cwd, timeoutMs, idlePath }) {
  const finalIdlePath = (idlePath && String(idlePath).trim()) || process.env.IDLE_CLI_PATH || "idle";
  const finalArgs = Array.isArray(args) ? args.map(String) : [];
  const finalCwd = cwd ? String(cwd) : process.cwd();
  const finalTimeoutMs = Number.isFinite(timeoutMs) ? timeoutMs : 60_000;

  return await new Promise((resolve) => {
    let child;
    try {
      child = spawn(finalIdlePath, finalArgs, {
        cwd: finalCwd,
        stdio: ["ignore", "pipe", "pipe"]
      });
    } catch (err) {
      resolve({
        ok: false,
        error: buildInstallGuidance(finalIdlePath),
        spawnError: err && err.message ? err.message : String(err)
      });
      return;
    }

    const stdoutChunks = [];
    const stderrChunks = [];

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
    }, finalTimeoutMs);

    child.stdout.on("data", (c) => stdoutChunks.push(c));
    child.stderr.on("data", (c) => stderrChunks.push(c));

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        error: buildInstallGuidance(finalIdlePath),
        spawnError: err && err.message ? err.message : String(err)
      });
    });

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = Buffer.concat(stderrChunks).toString("utf8");
      const parsed = safeJsonParse(stdout);

      resolve({
        ok: code === 0 && signal == null,
        code,
        signal,
        idlePath: finalIdlePath,
        args: finalArgs,
        cwd: finalCwd,
        stdout,
        stderr,
        json: parsed.ok ? parsed.value : null,
        jsonParseError: parsed.ok ? null : parsed.error
      });
    });
  });
}

module.exports = { execIdle };

