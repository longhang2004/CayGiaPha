# Antigravity CLI Delegation Implementation Plan

**Goal:** Add a repository-local `agy` CLI launcher and make the repository workflow explicitly route safe, bounded Medium/Light work through it while Codex retains orchestration, review, and verification.

**Architecture:** A dependency-free shell launcher validates the workspace, execution mode, timeout, and prompt before invoking `agy --print`. Repository guidance defines when delegation is allowed, what the worker must return, and the mandatory Codex diff/test verification gate. The launcher never enables unrestricted permissions and defaults to read-only planning.

**Tech Stack:** POSIX-compatible shell, `agy` CLI, Markdown workflow documentation.

## Global Constraints

- Preserve unrelated existing worktree changes.
- Default `agy` execution to `--mode plan`.
- Require an explicit `--mode accept-edits` for worker edits.
- Never use `--dangerously-skip-permissions`.
- Keep auth, privacy, schema, kinship-invariant, and ambiguous work with Codex.
- Codex must inspect actual diffs and independently run risk-appropriate verification.
- Do not commit changes unless the user grants commit authority.

## Routing Record

```text
Execution route: HYBRID_DELEGATION
Product gate: pass
Design gate: pass
Self-implementation assessment: Codex owns the launcher contract, workflow integration, and verification; the bounded shell implementation is mechanical but is too tightly coupled to the workflow contract to delegate safely during this change.
Delegation candidates: future implementation-ready Medium/Light tasks after this workflow is installed.
Mandatory delegation gates: independent, contract-stable, ownership-safe, verifiable, context-bounded, recoverable — all required and recorded per task.
Net-benefit assessment: positive for future bounded work because the launcher reduces repeated CLI setup while Codex retains integration and review.
Final routing decision: HYBRID_DELEGATION for future tasks; HEAVY_SELF for this infrastructure change.
```

### Task 1: Add the safe `agy` launcher

**Files:**
- Create: `.agents/bin/agy-delegate`

**Implementation:**

- Accept `--cwd PATH`, `--mode plan|accept-edits`, `--timeout DURATION`, optional `--agent NAME`, optional `--nested`, and one prompt argument.
- Resolve and validate `cwd` as a directory inside the repository root.
- Require `agy` on `PATH` and reject empty prompts or unsupported modes.
- Invoke `agy --print-timeout`, `--mode`, `--add-dir`, optional `--agent`, and `--print` using arrays/quoted arguments.
- When `--nested` is present, append a bounded nested-delegation policy to the prompt: one level only, read-only by default, no concurrent writers, and consolidated parent evidence. Without it, preserve the prompt unchanged.
- Print a concise usage message and return non-zero for invalid input.

**Verification:** `bash -n .agents/bin/agy-delegate`; run `--help`; run invalid-mode and empty-prompt cases and verify non-zero exits without invoking `agy`; run `--nested` with a harmless smoke prompt and verify the parent receives a response.

### Task 2: Update repository routing and handoff contracts

**Files:**
- Modify: `AGENTS.md`
- Modify: `.agents/execution-routing-harness.md`
- Modify: `.agents/multi-model-playbook.md`

**Implementation:**

- Document `.agents/bin/agy-delegate` as the canonical CLI entry point.
- Define the default read-only route and explicit edit route.
- Add worker prompt requirements, exact allowed scope, acceptance criteria, verification commands, and Review Prompt output.
- State that Codex is the orchestrator/verifier and that worker claims are never accepted without independent inspection.
- State that one active writer owns a worktree and that concurrent edits to the same checkout are prohibited.

**Verification:** Search the modified documents for the launcher, mode rules, review contract, and prohibited permission flag; run `git diff --check`.

### Task 3: Add durable repository memory

**Files:**
- Modify: `.agents/memory.md`

**Implementation:**

- Record the canonical launcher and the fact that `agy` may require an environment with permission to write its logs and bind localhost.
- Do not record credentials, tokens, personal data, or machine-specific secrets.

**Verification:** Inspect the new entry for accuracy and run `git diff --check`.

### Task 4: Verify the integrated path

**Files:**
- No additional files.

**Implementation:**

- Run shell syntax and argument-validation checks.
- Run a harmless real `agy` prompt through the launcher in plan mode, using the required elevated environment if the CLI needs its log directory or localhost listener.
- Review the full diff and confirm no unrelated files changed.

**Verification:** Record exact command results; do not claim completion if the real CLI smoke test fails.
