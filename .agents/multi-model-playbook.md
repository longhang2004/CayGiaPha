# Multi-Model Planning Playbook

This document applies only after `.agents/execution-routing-harness.md` selects delegation or the user explicitly requests multiple models. It is not the default workflow for ordinary tasks. Models are identified by capability tier—heavy, medium, or light—not by vendor or product name.

When work originates from the product workflow, the Orchestrator must also read `.agents/product-delivery-workflow.md` and treat the PO/BA-approved task document, design package, and orchestration prompt as its input contract.

For implementation planning, apply `.agents/execution-routing-harness.md` before creating Worker prompts. Prefer attached Antigravity for implementation-ready Medium/Light work; direct Heavy implementation remains the safe route for ambiguous, coupled, high-risk, or delegation-negative work.

## Operating Model

The planning agent is the lead and final integrator. When model selection is available, this role defaults to a heavy model. The lead owns repository discovery, requirements interpretation, architecture, dependency mapping, task boundaries, integration, review, and final verification.

The lead/heavy model may implement the complete plan itself. Use other models as implementation workers only when a workstream is sufficiently independent to hand off safely and delegation has a positive net benefit:

- **Heavy model:** architecture, ambiguous or high-risk logic, cross-layer changes, difficult debugging, security/privacy/auth, migrations, domain invariants, shared contracts, integration, and final review.
- **Medium model:** well-specified implementation with moderate reasoning, such as bounded services, API handlers, stateful components, non-trivial tests, isolated refactors, or logic whose contracts and edge cases are already defined.
- **Light model:** low-risk and mechanically verifiable work, such as simple presentational UI, styling adjustments, copy, documentation formatting, test fixtures, repetitive updates, and prototype synchronization that does not require new product decisions.

These tiers describe the capability required by a task, not a permanent rating of a particular product. Assign from the actual task shape, risk, dependencies, and available context. A UI task may require a heavy model when it involves complex state or architecture, while a logic task may fit a light model when it is mechanical. Do not manufacture parallel work merely to use every tier.

## Planning Procedure

For every non-trivial planning request:

1. Read the relevant Kiro requirements/design/tasks and durable project memory.
2. Inspect the affected code structurally with Codegraph when available.
3. Define the outcome and measurable acceptance criteria before splitting work.
4. Identify shared contracts first: types, APIs, state shape, database schema, design tokens, privacy rules, and domain invariants.
5. Build a dependency graph and find genuinely independent workstreams.
6. Decide whether delegation saves time after including briefing, review, merge-conflict, and verification costs.
7. Assign one owner per file or clearly separated region. Avoid concurrent edits to the same file.
8. Order integration and name the checks that prove the combined result.

## Delegate or Keep with the Lead

Delegate when most of the following are true:

- The output can be specified independently.
- Required context fits in a focused prompt.
- Files do not overlap another active task.
- Acceptance can be proven with targeted tests or visual checks.
- Integration points are already defined.
- The work is large enough to repay coordination overhead.

Keep with the lead/heavy model when any of the following dominates:

- The change is small, typically a few closely related files.
- Discovery, implementation, and testing require a tight feedback loop.
- Multiple layers must evolve together around an unsettled contract.
- The work touches authentication, privacy, living-person redaction, schema migration, or broad shared infrastructure.
- The task depends heavily on implicit repository context.
- Two workers would edit the same core file or create a risky merge sequence.

## Required Plan Format

A multi-model plan must include:

1. **Goal and success criteria** — observable behavior and required checks.
2. **Known constraints** — relevant specs, domain/privacy rules, prototype sync, and non-goals.
3. **Dependency order** — contracts or prerequisite decisions before implementation tasks.
4. **Task table** — task ID, owner, scope/files, dependencies, deliverable, verification, and risk.
5. **Prompts** — one self-contained execution prompt per delegated task.
6. **Integration plan** — merge/order strategy, conflict boundaries, lead review, and combined verification.
7. **Fallback** — what the lead/heavy model should absorb if a delegated result is incomplete, incompatible, or unverifiable.

Do not present tasks as parallel when dependencies make them sequential. Explicitly mark tasks as parallel-safe or blocked by another task.

## Delegated Prompt Contract

All cross-model communication uses a two-way prompt handoff:

1. The lead/heavy model writes a self-contained execution prompt for the medium/light model.
2. The medium/light model performs the task and writes a self-contained review prompt back to the lead/heavy model.
3. The lead/heavy model uses that return prompt to inspect the actual artifacts, verify claims, request corrections when needed, and integrate the result.

The execution prompt must explicitly tell the worker to produce the return review prompt. A prose summary alone is not a valid handoff.

Use this template for every worker execution prompt:

```text
Role: <backend | frontend | logic | test engineer>
Capability tier: <heavy | medium | light>

Objective:
<One concrete, verifiable result.>

Repository context:
<Relevant stack, specs, symbols, established patterns, and current behavior.>

Allowed scope:
<Exact files/directories or explicitly bounded areas that may be changed.>

Do not change:
<Contracts, unrelated files, generated artifacts, privacy behavior, or other exclusions.>

Dependencies and contracts:
<Inputs from other tasks and interfaces that must remain stable.>

Acceptance criteria:
- <Observable behavior>
- <Edge case or invariant>
- <Compatibility/accessibility/privacy requirement>

Verification:
<Exact targeted tests/checks to run and expected result.>

Handoff:
After completing the work, return a self-contained REVIEW PROMPT addressed to the
lead/heavy model. It must include the objective, assigned scope, changed artifacts,
design/logic decisions, acceptance-criteria status, exact verification output,
unverified claims, remaining risks, assumptions, and focused review requests.
Include enough repository paths and commands for the heavy model to independently
inspect and verify the result. Do not return only a prose summary, and do not claim
completion when required checks were not run.
```

Also include the repository-wide constraints relevant to that task:

- Make the smallest correct change and preserve existing style.
- Check the Kiro spec for behavior changes.
- Add or update tests for changed behavior.
- Never expose secrets, tokens, identifiers, or private family data.
- Frontend images must use HTML `<img>`, not `next/image`.
- UI/UX changes must update the corresponding prototype in the same change.
- The Next.js frontend is currently the active implementation; do not assume the Java backend is serving production behavior.

## Return Review Prompt Contract

Every medium/light model must end its handoff with a prompt that the lead/heavy model can execute directly. Use this template:

```text
REVIEW PROMPT FOR LEAD/HEAVY MODEL

Original objective:
<The result this task was assigned to produce.>

Assigned capability tier and scope:
<Tier and exact allowed files/areas.>

Changed artifacts:
- <Path: concise description of the change>

Implementation decisions:
- <Decision and rationale>

Acceptance criteria status:
- [pass | fail | partial | not verified] <Criterion and evidence>

Verification performed:
- Command/check: <exact command or inspection>
- Result: <exit status and material output>

Not verified or blocked:
- <Anything the worker could not prove, with reason>

Risks and assumptions:
- <Regression risk, uncertain behavior, or assumption>

Review requests:
1. Inspect <path/symbol/behavior> for <specific concern>.
2. Re-run <command/check> to independently verify <claim>.
3. Confirm compatibility with <spec/contract/dependent task>.

Lead instructions:
Review the actual diff/artifacts rather than trusting this report. Check scope,
contracts, privacy/security/domain invariants, tests, and integration impact. If any
criterion is unsupported, return a corrective execution prompt instead of accepting
the task. Integrate only after the combined repository passes the required checks.
```

If the heavy model requests corrections, it must send a new corrective execution prompt that cites the rejected criterion, observed evidence, allowed repair scope, and verification required. The worker must respond with a new review prompt; do not rely on informal conversational acknowledgements.

## Review and Integration Gates

The lead/heavy model must review every worker result before integration:

- Require the standardized return review prompt; if it is missing, request it before accepting the handoff.
- Confirm the diff stays within its assigned scope.
- Compare behavior with the Kiro spec and shared contracts.
- Check privacy, auth, kinship invariants, accessibility, and prototype synchronization where relevant.
- Reject placeholders, speculative refactors, skipped error paths, and unsupported completion claims.
- Run the narrowest relevant checks, then broader frontend/backend checks in proportion to risk.
- Resolve integration failures centrally; do not pass incompatible outputs between workers without updating their contracts.

The work is complete only when the integrated repository, not each isolated worker response, satisfies the success criteria.
