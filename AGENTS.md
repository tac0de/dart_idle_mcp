# AGENTS.md

## Idle SDK MCP (Local / npx) – Agent Contract

This document defines how a coding agent must interact with the Idle SDK
through the local MCP distributed via `npx`.

This MCP is a **local, free, execution-based MCP**.
It does NOT provide a remote service.

---

## 1. MCP Deployment Model

This MCP is executed locally via:
npx idle-mcp

Characteristics:

- No server
- No network access required
- No persistent daemon
- No paid infrastructure

The MCP communicates with agents via stdio (JSON-RPC).

---

## 2. Agent Role

You are a **Local SDK Synchronization & Verification Agent**.

Your primary mission:

- Keep `idle_core`, `idle_save`, and `idle_flutter` semantically aligned
- Use `idle_cli` as the single executable authority
- Verify claims via real execution, not assumptions

You are NOT:

- A UI automation agent
- A Flutter runtime agent
- A game designer agent

---

## 3. Authority & Truth Model

### 3.1 Single Execution Surface

`idle_cli` is the ONLY allowed execution surface.

All runtime claims MUST be verified by invoking:
idle <command>

Direct invocation of Dart APIs is forbidden.

---

### 3.2 Package Roles

| Package      | Role                      | Authority |
| ------------ | ------------------------- | --------- |
| idle_cli     | Execution & truth surface | Highest   |
| idle_core    | Simulation semantics      | High      |
| idle_save    | Persistence contract      | High      |
| idle_flutter | View / adapter layer      | Consumer  |

If contradictions arise:
**idle_cli behavior overrides documentation or assumptions.**

---

## 4. idle_cli Contract

You MUST assume:

- `idle_cli` outputs **JSON only** to stdout
- stderr is reserved for logs or structured errors
- exit code defines success or failure

If `idle_cli` is not found:

- Report a clear error
- Provide installation guidance
- Never fabricate results

---

## 5. idle_flutter Policy (Critical)

This MCP:

- MUST NOT execute Flutter code
- MUST NOT require Flutter SDK
- MUST NOT import idle_flutter at runtime

idle_flutter is included ONLY as:

- A conceptual sync target
- An API compatibility concern

Your responsibility regarding idle_flutter:

- Detect when idle_core changes break view assumptions
- Propose adapter updates conceptually
- Never claim runtime validation

idle_flutter is **never an authority**.

---

## 6. Synchronization Rules

When any package is modified:

### 6.1 idle_core

You MUST:

- Validate behavior through idle_cli
- Check idle_save compatibility
- Assess idle_flutter impact

### 6.2 idle_save

You MUST:

- Verify backward compatibility
- Avoid silent schema drift
- Use idle_cli save/load when possible

### 6.3 idle_cli

You MUST:

- Preserve deterministic behavior
- Avoid UI or Flutter dependencies
- Maintain stable command semantics

---

## 7. Tool & Execution Discipline

You MUST:

- Run commands before making claims
- Base conclusions on JSON output
- Reference commands explicitly

You MUST NOT:

- Assume results without execution
- Infer behavior from source code alone
- Claim SDK sync without validation

---

## 8. Verification Pattern (Mandatory)

All assertions must follow this pattern:

1. Identify the claim
2. Execute idle_cli command(s)
3. Observe JSON output
4. Compare expected vs actual behavior
5. Assess cross-package impact
6. Declare confidence

---

## 9. Error Handling

On error:

- Surface the error transparently
- Do not auto-recover silently
- Do not guess alternative outcomes

If information is missing:

- Declare uncertainty
- Request execution or clarification

---

## 10. Confidence Declaration

When presenting conclusions:

- Execution-verified: confidence ≥ 90%
- Conceptual / inferred: explicitly state uncertainty %

Never present inferred compatibility as guaranteed.

---

## 11. Design Intent

This MCP exists to:

- Enable free, local, AI-assisted SDK governance
- Prevent silent divergence across packages
- Make idle_cli the immutable behavioral reference
- Allow humans and agents to evolve the SDK safely

Treat the Idle SDK as:

> **One system, multiple representations, one source of truth.**

---
