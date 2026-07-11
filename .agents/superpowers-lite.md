# Superpowers Lite

Use Superpowers as a selective quality toolkit, not as the repository's end-to-end delivery methodology. `AGENTS.md`, Kiro specs, explicit user instructions, and the execution routing harness take precedence.

## Default Workflow

```text
Plan mode → concise approved plan → Antigravity or Codex implementation
→ Codex diff review → fresh verification → COMMIT-READY
```

Do not automatically require brainstorming, a committed design document, a micro-step plan, a worktree, fresh subagents per task, or frequent commits.

## Skill Routing

- **brainstorming:** use only when requirements, product intent, architecture, or significant UX direction are genuinely ambiguous. Keep it proportional; ordinary clear tasks do not need a separate design document.
- **systematic-debugging:** use for bugs without a verified root cause.
- **writing-plans:** use for multi-step or delegated work. Plans should be detailed enough to execute safely, but need not split every action into 2–5 minute steps.
- **test-driven-development:** use for behavior changes, regressions, domain invariants, and logic where a failing test can prove the defect. Do not force test-first for documentation, purely visual adjustments, generated artifacts, or work where another verification method is more appropriate.
- **executing-plans:** use for an implementation worker receiving a stable plan.
- **dispatching-parallel-agents / subagent-driven-development:** use only when `.agents/execution-routing-harness.md` selects delegation and the user/platform permits it.
- **requesting-code-review / receiving-code-review:** use for meaningful delegated or high-risk changes; keep mechanical reviews compact.
- **verification-before-completion:** always apply before completion, fixed, passing, commit-ready, commit, push, or PR claims.
- **using-git-worktrees:** use only with explicit user consent or an established repo workflow. Avoid it when attached Antigravity must operate on the current checkout unless Antigravity is deliberately switched to the worktree.
- **finishing-a-development-branch:** reuse its verification discipline, but follow this repo's commit authorization and git workflow instead of automatically committing, merging, pushing, discarding, or cleaning worktrees.

## Token and Quota Policy

- Reference repo paths instead of pasting large specs or source files into prompts.
- Use the smallest relevant context and targeted memory entries.
- Keep product/design checks inside Plan mode for ordinary work.
- Prefer Antigravity for safely bounded Medium/Light implementation when attached.
- Codex reviews declared files and risk boundaries first, expanding only when evidence suggests broader impact.
- Escalate to separate PO/BA or Designer sessions only when their specialist output is likely to change the decision materially.

## Antigravity Handoff

Every Antigravity Execution Prompt must include objective, exact allowed scope, stable contracts, acceptance criteria, required verification, prohibited changes, and this requirement:

```text
Return a concise Review Prompt for Codex containing changed paths, decisions,
acceptance-criteria status, exact commands/results, unverified claims, risks,
and focused review requests. Do not claim completion without fresh evidence.
```

Codex must inspect the actual diff and independently run risk-appropriate checks before accepting the result.
