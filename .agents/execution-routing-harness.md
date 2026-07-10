# Execution Routing Harness

Use this harness in Plan mode to choose the cheapest safe delivery route. It prevents both unnecessary multi-session ceremony and risky under-delegation.

## Default Route

The default is:

```text
Lead/Heavy Plan mode → user approval when needed → same Lead/Heavy implements
→ same Lead/Heavy tests and reviews → COMMIT-READY
```

Planning is not automatically a handoff. The planning agent may remain the primary implementer and integrator.

Only add PO/BA, Designer, or Workers when a gate below requires or clearly benefits from it.

## Gate 1: Is Product Authority Missing?

Route to **PO/BA** when one or more material questions remain about:

- Which user or problem should be prioritized.
- Whether a feature should exist.
- Desired product outcome, scope, or non-goals.
- Market/competitor evidence or roadmap priority.
- Business rules, success metrics, or acceptance criteria.
- Tradeoffs that change product behavior rather than implementation detail.

Do not route to PO/BA for a reproducible bug, clear maintenance task, or implementation request whose intended behavior is already approved in specs/designs.

If PO/BA is needed, stop technical implementation at the affected decision boundary and return a focused Product Clarification Prompt. Continue unrelated safe discovery only when useful.

## Gate 2: Is Design Authority Missing?

Route through **PO/BA → UI/UX Designer → PO/BA approval** when unresolved decisions materially change:

- User journey, navigation, or information hierarchy.
- A new screen, component pattern, or interaction model.
- Form behavior, destructive flows, permissions, or privacy disclosure.
- Significant responsive behavior or accessibility semantics.
- Multiple UI states whose intended experience is not already defined.
- Visual direction beyond existing design-system patterns.

Keep the task with Heavy when the expected UI is already approved or the change is a mechanical correction, small copy/style fix, or implementation bug with an unambiguous target.

The Orchestrator must not substitute its own product design for a missing approval. It may make local implementation choices inside an approved design.

## Gate 3: Can Heavy Safely Implement Alone?

Prefer **same-session Heavy self-implementation** when most of these are true:

- One coherent outcome spans a small or moderate set of related files.
- Discovery, editing, and tests form a tight feedback loop.
- Shared contracts are still evolving during implementation.
- The task touches privacy, auth, security, migrations, domain invariants, or integration-critical code.
- File ownership cannot be separated cleanly.
- Explaining the task would take a significant fraction of implementation time.
- End-to-end context is more valuable than parallel throughput.
- The task can be completed and verified within one working session.

Self-implementation is not a fallback or lower-quality route. It is the preferred route when coordination would add more cost or risk than it removes.

## Gate 4: Does Worker Delegation Have Positive Net Benefit?

Delegate a workstream to Medium/Light only when **all mandatory conditions** pass:

- **Independent:** it has a bounded outcome and does not require frequent decisions from another task.
- **Contract-stable:** inputs, outputs, behavior, and acceptance criteria are already defined.
- **Ownership-safe:** its files or edit regions do not overlap another active worker's core files.
- **Verifiable:** targeted checks can independently prove its result.
- **Context-bounded:** a self-contained prompt can carry the required repository knowledge.
- **Recoverable:** Heavy can reject, redo, or absorb the work without destabilizing the whole plan.

Then apply the net-benefit test:

```text
Delegation benefit
= estimated Heavy implementation effort avoided
+ useful parallel time saved
- prompt preparation effort
- worker context-loading effort
- Heavy review effort
- integration/conflict effort
- expected rework risk
```

Delegate only when this value is clearly positive. If the result is close or uncertain, keep the task with Heavy.

## Lightweight Scoring Aid

This score is a decision aid, not a substitute for judgment.

Add one point for each:

- Work can run in parallel with another necessary task.
- File ownership is disjoint.
- Contract and acceptance criteria are frozen.
- A targeted automated or visual check proves completion.
- Implementation is repetitive or well-patterned.
- The work is large enough that parallel execution materially shortens delivery.

Subtract one point for each:

- Cross-layer or shared-contract changes.
- Privacy, security, auth, migration, or kinship-invariant risk.
- Frequent feedback with the lead is expected.
- Worker must rediscover broad repository context.
- Merge conflicts or integration rework are plausible.
- Prompt plus review likely approaches the effort of direct implementation.

Routing guidance:

- **3 or more:** delegation is likely useful if all mandatory conditions pass.
- **1–2:** normally keep with Heavy unless schedule pressure makes parallelism valuable.
- **0 or less:** Heavy self-implements.

Never delegate a workstream that fails a mandatory condition merely because its score is high.

## Capability Tier Selection

After deciding to delegate:

- **Medium:** bounded work requiring moderate reasoning, state, logic, tests, or repository pattern matching.
- **Light:** mechanical, low-risk, highly specified, easily verified work such as approved presentational changes, fixtures, repetitive updates, or prototype synchronization.
- **Heavy:** retain high-context, high-risk, architectural, ambiguous, cross-layer, shared-contract, security/privacy, migration, and final-integration work.

Do not classify by frontend versus backend alone. UI can be Heavy; logic can be Light.

## Required Routing Record in Every Non-Trivial Plan

Before implementation, include this compact block:

```text
Execution route: HEAVY_SELF | PO_BA_FIRST | DESIGN_FIRST | HYBRID_DELEGATION

Product gate: pass | clarification required
Design gate: pass | design required | design already approved
Self-implementation assessment: <why Heavy should or should not do all work>
Delegation candidates: <task IDs or none>
Mandatory delegation gates: <pass/fail per candidate>
Net-benefit assessment: <positive/uncertain/negative with brief evidence>
Final routing decision: <route and rationale>
```

For trivial tasks, a one-sentence routing decision is enough; do not create ceremony.

## Route Definitions

### HEAVY_SELF

Use when requirements and design are clear and delegation has no clear net benefit.

```text
Plan mode → Heavy implements → Heavy verifies → COMMIT-READY
```

### PO_BA_FIRST

Use when product intent, priority, outcome, or acceptance criteria are unresolved.

```text
Heavy → Product Clarification Prompt → PO/BA task approval
→ return to Plan mode → route again
```

### DESIGN_FIRST

Use when product intent is approved but material experience decisions are unresolved.

```text
PO/BA → Designer → Design Review Prompt → PO/BA approval
→ Heavy Plan mode → route again
```

### HYBRID_DELEGATION

Use when Heavy retains architecture/integration while independent workstreams have positive delegation value.

```text
Heavy plans and owns contracts
→ Heavy Execution Prompts → Medium/Light
→ Worker Review Prompts → Heavy
→ Heavy independently verifies and integrates
→ COMMIT-READY
```

## Re-Routing During Implementation

Re-run the relevant gate when:

- Discovery contradicts the approved task or design.
- A shared contract becomes unstable.
- A delegated task starts requiring repeated clarification.
- Workers begin overlapping files.
- Worker output fails review more than once.
- A privacy, security, migration, or domain-invariant issue appears.

Heavy should absorb a delegated task when continued prompt/review cycles cost more than completing it directly. Record the reason; do not continue delegation only to preserve the original plan.

## Commit Gate

Routing does not change acceptance standards. Heavy remains responsible for the integrated result and may declare `COMMIT-READY` only after actual artifacts, acceptance criteria, design alignment, privacy/domain rules, and risk-appropriate tests are verified.

Commit only when the user or task grants commit authority.
