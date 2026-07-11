# Product Delivery Workflow

This is an optional specialist workflow. Do not invoke it for ordinary features, bugs, or UI changes that Plan mode can clarify directly. Use it only when the user explicitly requests PO/BA or Designer work, or when a material product/design authority gap cannot be resolved efficiently in the current session.

It governs product work across four roles:

- **PO/BA:** product owner and business analyst; owns problem discovery, market evidence, prioritization, scope, acceptance criteria, and product approval.
- **UI/UX Designer:** owns user-flow and interface design, interaction states, accessibility intent, responsive behavior, prototype/design artifacts, and design rationale.
- **Orchestrator (Heavy):** owns technical discovery, task decomposition, worker prompts, integration, independent verification, rework decisions, and commit readiness.
- **Workers (Medium/Light):** implement bounded tasks and return evidence-rich review prompts to the Orchestrator.

`PA/BO` is treated as referring to `PO/BA` unless the user explicitly defines a separate role.

## End-to-End Flow

```text
PO/BA discovers and prioritizes a task
    ↓
Does the task require design work?
    ├─ No → PO/BA approval gate
    └─ Yes
         ↓
       PO/BA sends Design Execution Prompt
         ↓
       UI/UX Designer creates design package
         ↓
       Designer sends Design Review Prompt to PO/BA
         ↓
       PO/BA approves or sends Design Revision Prompt
         ↓
PO/BA writes approved task document + Orchestration Prompt
    ↓
Orchestrator (Heavy) validates inputs and decomposes work
    ↓
Heavy sends Execution Prompts to Medium/Light Workers
    ↓
Workers implement and return Review Prompts
    ↓
Heavy inspects, integrates, and independently tests
    ├─ Reject → Corrective Execution Prompt → Worker
    └─ Accept
         ↓
       Heavy declares commit-ready
         ↓
       Commit only when the task/user authorization permits it
```

No role may silently skip an approval gate. A downstream role must reject an incomplete handoff instead of inventing missing product or design decisions.

## Role Boundaries

### PO/BA

PO/BA owns **why and what**, not implementation details.

Required responsibilities:

- Understand product context, users, existing roadmap, specs, and implementation state.
- Research current market and competitor evidence when relevant, with dated sources and links.
- Distinguish facts, observations, inferences, and hypotheses.
- Define the user problem, desired outcome, scope, non-goals, priority, metrics, risks, and acceptance criteria.
- Decide whether UI/UX design is required before engineering planning.
- Review design against product intent and either approve it or request a revision through a prompt.
- Produce the final approved task document and a self-contained prompt for the Heavy Orchestrator.
- Avoid prescribing technical implementation unless a product constraint requires it.

PO/BA must not send a UI-sensitive implementation task directly to the Orchestrator while design decisions remain unresolved.

### UI/UX Designer

Designer owns **how the experience should work and feel**, within the approved product problem and repository design constraints.

Required responsibilities:

- Read the product brief, affected flows, existing UI documentation, relevant prototypes, and design system before designing.
- Preserve privacy, accessibility, Vietnamese language clarity, responsive behavior, and usability for older users.
- Cover relevant states: default, loading, empty, error, validation, disabled, success, destructive confirmation, and responsive variants.
- Reuse established patterns when they solve the problem; explain any new pattern.
- Identify copy, interaction, information hierarchy, and prototype-sync requirements.
- Produce implementation-usable artifacts rather than aesthetic direction alone.
- Return a self-contained Design Review Prompt to PO/BA.

Designer does not approve product scope, assign engineering workers, or declare implementation complete.

### Orchestrator (Heavy)

Orchestrator owns **how approved product/design intent becomes a verified technical change**.

Required responsibilities:

- Validate that the PO/BA task document, design approval, design artifacts, acceptance criteria, and orchestration prompt are present and consistent.
- Read relevant specs, memory, code structure, and repository rules.
- Resolve technical ambiguity without changing approved product intent; return unresolved product/design questions to PO/BA.
- Decompose by dependency and file ownership, not merely by frontend/backend labels.
- Apply `.agents/execution-routing-harness.md` and keep the implementation in the same Heavy session unless specialist escalation or worker delegation passes its gates.
- Assign capability tier based on complexity and risk.
- Write every Worker Execution Prompt and explicitly require a Worker Review Prompt in return.
- Review actual diffs and artifacts, run independent checks, integrate results, and issue corrective prompts when evidence is insufficient.
- Approve commit readiness only after the integrated repository meets acceptance criteria.

Orchestrator may make small implementation decisions inside approved scope. It must not silently reinterpret product outcomes or unapproved design behavior.

The existence of PO/BA, Designer, and Worker roles does not make every task a multi-session workflow. For a clear, approved task with no unresolved design decision, the Heavy Orchestrator should normally plan, implement, test, and review in one session.

### Medium/Light Workers

Workers own only the bounded implementation described in their execution prompt.

- Stay inside allowed files and contracts.
- Stop and report material ambiguity instead of expanding scope.
- Run required targeted verification.
- Return the standardized Worker Review Prompt defined in `.agents/multi-model-playbook.md`.
- Never self-approve integration or commit readiness.

## Gate 1: Design Requirement Decision

PO/BA must explicitly set one value in every task:

```text
Design requirement: required | not required | existing approved design
Rationale: <why>
```

Design is normally required when the task changes user flow, navigation, hierarchy, interaction, page layout, responsive behavior, accessibility semantics, visual language, significant copy, or introduces a new screen/component pattern.

Design may be unnecessary for invisible fixes, purely technical maintenance, or mechanical UI corrections already defined by an approved design system or audit item.

## PO/BA → Designer Execution Prompt

```text
DESIGN EXECUTION PROMPT

Role: UI/UX Designer

Product problem:
<User, job to be done, pain point, and supporting evidence.>

Desired outcome:
<Observable user/product outcome, not a predetermined layout.>

Affected journey and surfaces:
<Routes, components, entry points, preceding/following steps.>

Product constraints:
<Scope, non-goals, privacy, kinship, language, business rules.>

Existing context to inspect:
<Specs, frontend UI docs, prototypes, screenshots, design system, audit findings.>

Required states and platforms:
<Desktop/mobile/tablet and loading/empty/error/success/etc.>

Deliverables:
- User-flow description.
- Screen/component design specification.
- Interaction and state behavior.
- Responsive and accessibility requirements.
- Copy recommendations.
- Reused versus new patterns.
- Implementation-relevant measurements/tokens/assets where applicable.
- Prototype synchronization requirements.

Acceptance criteria for design:
- <Product outcome coverage>
- <Usability/accessibility criteria>
- <State/responsive coverage>

Handoff requirement:
Return a self-contained DESIGN REVIEW PROMPT addressed to PO/BA using the repository
template. Include artifact paths/links, decisions, alternatives, unresolved questions,
constraint coverage, and specific items requiring product approval. Do not return only
an informal summary.
```

## Designer → PO/BA Design Review Prompt

```text
DESIGN REVIEW PROMPT FOR PO/BA

Original product problem and desired outcome:
<Restate the approved brief.>

Design artifacts:
- <Path/link: purpose and status>

Proposed user flow:
<Entry, actions, decisions, success, escape/recovery paths.>

Key design decisions:
- <Decision, user benefit, evidence or rationale>

State and responsive coverage:
- <Default/loading/empty/error/success/disabled/destructive>
- <Desktop/tablet/mobile behavior>

Accessibility and privacy coverage:
- <Keyboard, focus, semantics, contrast, readable copy, disclosure/redaction behavior>

Existing patterns reused or changed:
- <Pattern and rationale>

Alternatives considered:
- <Alternative, tradeoff, and rejection reason>

Open product questions:
- <Only questions requiring PO/BA authority>

Requested PO/BA review:
1. Confirm the flow solves <problem/outcome>.
2. Confirm scope and non-goals remain intact.
3. Confirm copy/business/privacy behavior.
4. Approve, or return a Design Revision Prompt with rejected criteria and evidence.

PO/BA must inspect the artifacts and may not approve based solely on this summary.
```

## PO/BA Design Approval Gate

PO/BA records one decision:

```text
Design decision: approved | revision required | rejected
Reviewed artifacts: <paths/links and versions>
Criteria status: <pass/fail per criterion>
Required revisions: <specific evidence-backed changes, if any>
Decision rationale: <why>
```

For revisions, PO/BA sends a new Design Revision Prompt. Designer responds with a new Design Review Prompt. Informal approval does not satisfy the gate.

## PO/BA → Orchestrator Handoff Package

After product and any required design approval, PO/BA produces both an approved task document and an Orchestration Prompt.

The task document must contain:

- Task ID, title, type, priority, and status.
- Problem, target user, evidence, and desired outcome.
- Scope and non-goals.
- Functional, UX, accessibility, privacy, and domain requirements.
- Acceptance criteria and Definition of Done.
- Success metrics and instrumentation needs.
- Dependencies, risks, assumptions, and open questions.
- Design requirement decision.
- Approved design artifact references and approval record, when applicable.

Use this prompt:

```text
ORCHESTRATION PROMPT FOR HEAVY MODEL

Role: Heavy Orchestrator, technical lead, integrator, and final verifier.

Approved task document:
<Exact path or full content.>

Approved design package:
<Artifact paths/links and approval record, or "not required" with rationale.>

Outcome and acceptance criteria:
<Concise authoritative list.>

Repository context:
<Relevant specs, memory, known implementation state, and constraints.>

Authority and non-goals:
<What may be implemented and what must not change.>

Required orchestration behavior:
1. Validate this handoff against the repository and report contradictions.
2. Build the dependency graph and integration order.
3. Keep heavy/high-risk/shared-contract work with the Orchestrator.
4. Assign bounded work to Medium/Light only where delegation is beneficial.
5. Write a self-contained Execution Prompt for every Worker.
6. In every Worker prompt, explicitly require a standardized Review Prompt back.
7. Review actual worker diffs/artifacts and independently re-run relevant checks.
8. Send corrective prompts for unsupported or failed criteria.
9. Run integrated verification and compare results with every acceptance criterion.
10. Declare commit-ready only when the complete change passes all gates.

Required output before implementation:
- Assumptions and contradictions.
- Dependency-aware technical plan.
- Task table with owner tier, file scope, dependencies, verification, and risk.
- Worker Execution Prompts.
- Integration and test plan.

Commit gate:
Do not approve a commit while any required check, acceptance criterion, design match,
privacy rule, or integration dependency is unresolved. Commit only if the user/task
explicitly authorizes the Orchestrator to perform the commit; otherwise report
"commit-ready" and provide the evidence.
```

## Orchestrator Acceptance and Commit Gate

Before accepting implementation, the Heavy Orchestrator must confirm:

- Every worker returned a valid review prompt.
- Actual diffs stayed within approved scope.
- Worker claims match files and test output.
- Product acceptance criteria pass.
- Approved design is implemented or documented deviations have PO/BA approval.
- Privacy, auth, domain, accessibility, responsive, and prototype-sync rules pass where relevant.
- Integrated tests pass at the risk-appropriate level.
- No placeholders, generated noise, secrets, or unrelated refactors were introduced.
- Remaining risks and skipped checks are explicit.

The Orchestrator then chooses exactly one state:

- **REWORK REQUIRED:** send a corrective execution prompt to the responsible Worker.
- **PRODUCT/DESIGN CLARIFICATION REQUIRED:** return a focused prompt to PO/BA or Designer.
- **COMMIT-READY:** all gates pass; await authorization if commit permission is not already part of the task.
- **COMMITTED:** only after an authorized commit succeeds, with commit identifier and final verification evidence.
