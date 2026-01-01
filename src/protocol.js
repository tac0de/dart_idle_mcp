"use strict";

function parseHeaders(headerText) {
  const headers = Object.create(null);
  for (const line of headerText.split("\r\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    headers[key] = value;
  }
  return headers;
}

class JsonRpcStream {
  constructor({ input, output }) {
    this.input = input;
    this.output = output;
    this.buffer = Buffer.alloc(0);
    this.onMessage = null;

    input.on("data", (chunk) => this.#onData(chunk));
  }

  #onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const headerEnd = this.buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) return;

      const headerText = this.buffer.slice(0, headerEnd).toString("utf8");
      const headers = parseHeaders(headerText);
      const contentLength = Number(headers["content-length"]);
      if (!Number.isFinite(contentLength) || contentLength < 0) {
        process.stderr.write(`[idle-mcp] invalid Content-Length: ${headers["content-length"]}\n`);
        this.buffer = this.buffer.slice(headerEnd + 4);
        continue;
      }

      const messageStart = headerEnd + 4;
      const messageEnd = messageStart + contentLength;
      if (this.buffer.length < messageEnd) return;

      const jsonText = this.buffer.slice(messageStart, messageEnd).toString("utf8");
      this.buffer = this.buffer.slice(messageEnd);

      let msg;
      try {
        msg = JSON.parse(jsonText);
      } catch (e) {
        process.stderr.write(`[idle-mcp] invalid JSON-RPC message: ${e}\n`);
        continue;
      }

      if (this.onMessage) this.onMessage(msg);
    }
  }

  send(message) {
    const body = Buffer.from(JSON.stringify(message), "utf8");
    const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "utf8");
    this.output.write(header);
    this.output.write(body);
  }
}

module.exports = { JsonRpcStream };

