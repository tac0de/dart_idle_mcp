#!/usr/bin/env node
"use strict";

const { startServer } = require("../src/server.js");

startServer().catch((err) => {
  const message = err && err.stack ? err.stack : String(err);
  process.stderr.write(`[idle-mcp] fatal: ${message}\n`);
  process.exitCode = 1;
});

