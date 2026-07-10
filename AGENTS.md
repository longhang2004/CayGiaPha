# AGENTS.md

Shared operating instructions for AI agents working in this repository. These rules apply to Codex, Cursor, Claude, Kiro, Antigravity, OpenCode, and similar coding agents.

## Repository Snapshot

- Product: Vietnamese family tree application with privacy controls and Vietnamese kinship resolution.
- Backend: Java 21, Spring Boot 3.3.5, PostgreSQL, Flyway, JPA, jqwik, JUnit 5, Testcontainers.
- Frontend: Next.js 14 App Router, React 18, TypeScript, Vitest, Testing Library, fast-check.
- Specs: `.kiro/specs/vietnamese-family-tree/requirements.md`, `design.md`, and `tasks.md` are the product source of truth.

## Agent Workflow

1. Start from the smallest useful context.
2. Check the Kiro spec before changing behavior that affects product requirements, domain rules, privacy, auth, kinship logic, accessibility, or persistence.
3. Prefer structural navigation over full-file scans. Use Codegraph or an equivalent symbol graph for definitions, callers, callees, impact, and flow tracing.
4. Use literal search only for strings, comments, config keys, logs, or when a symbol graph is unavailable.
5. Make surgical changes. Do not refactor adjacent code unless the requested change requires it.
6. Add or update tests for behavior changes. Prefer property-based tests for kinship invariants and graph invariants.
7. Run the narrowest verification that proves the change, then broader checks when risk is high.
8. Record durable repo knowledge in `.agents/memory.md` when a discovery will help future agents avoid repeated exploration.

## RTK Prompt Contract

Use this compact contract before non-trivial work:

```text
Role: <backend | frontend | full-stack | reviewer | test engineer>
Task: <specific outcome>
Knowledge: <spec links, files, symbols, constraints already known>
Success: <tests/checks that prove completion>
Constraints: smallest correct change; protect privacy/security; preserve existing style
```

For implementation tasks, convert vague requests into verifiable goals before editing.

## Multi-Model Planning and Delegation

When the user asks for planning, task breakdown, delegation, or prompts for multiple models, read and follow `.agents/multi-model-playbook.md` before producing the plan.

For product-delivery work that involves PO/BA, UI/UX Designer, Orchestrator, and Worker roles, also follow `.agents/product-delivery-workflow.md`. In this repository, `PA/BO` in user discussions is treated as an alias/typo for `PO/BA` unless the user defines it differently.

- The planning agent is the default lead, architect, and final integrator; use a heavy-capability model for this role when model selection is available.
- Delegate only workstreams with clear boundaries, inputs, outputs, file ownership, and verification.
- Assign work to heavy, medium, or light models according to complexity, risk, context breadth, and verification needs rather than provider names.
- Keep tightly coupled, cross-layer, privacy-sensitive, architectural, or integration-heavy changes with the lead/heavy model unless parallelism has a clear benefit.
- Every delegated task must include the repository context, allowed scope, dependencies, acceptance criteria, required tests, prohibited changes, and handoff format.
- Cross-model communication must use explicit prompt handoffs: the lead/heavy model writes the execution prompt, and each medium/light model returns a self-contained review prompt for the heavy model. The execution prompt must explicitly require this return prompt.
- Product and design handoffs are also prompt-based: PO/BA requests design work, Designer returns a design-review prompt, PO/BA approves or requests revision, then PO/BA produces the approved task document and orchestration prompt.
- The final plan must include integration order, review ownership, and end-to-end verification; delegated output is never accepted without lead review.

## Codegraph Workflow

Use Codegraph when available:

- `codegraph_context`: first stop for an area or task.
- `codegraph_search`: find a symbol by name.
- `codegraph_node`: inspect a symbol signature/source.
- `codegraph_callers`: understand who depends on a symbol.
- `codegraph_callees`: understand downstream behavior.
- `codegraph_trace`: trace a flow from one symbol to another.
- `codegraph_impact`: check what may break before changing shared symbols.

If Codegraph is not initialized, ask before running initialization. Do not index secrets or generated dependency directories.

## Memory Workflow

Use `.agents/memory.md` as lightweight project memory inspired by claude-mem:

- Add only durable, verified facts that future agents need.
- Prefer decisions, traps, commands, invariants, and architecture notes.
- Do not store secrets, credentials, tokens, personal data, or private family data.
- Keep entries short and dated.
- Remove or correct stale entries when you prove they are wrong.

## Skill Workflow

Use skills as reusable procedures, not as hidden requirements:

- Keep repo-local skills under `.agents/skills/`.
- Load or read a skill only when the task matches its description.
- Prefer a narrow skill over a broad one.
- If a skill conflicts with `AGENTS.md` or a Kiro spec, follow the Kiro spec for product behavior and `AGENTS.md` for workflow.

Recommended skill categories for this repo:

- `backend-spring`: controllers, services, JPA, Flyway, Testcontainers.
- `frontend-next`: App Router, React components, API client, accessibility, Vitest.
- `kinship-domain`: graph edges, asserted vs derived relationships, regional terms, invariants.
- `security-privacy`: auth, sessions, living-person redaction, audit logs, rate limits.

## Verification Commands

Run commands from the module directory unless noted.

Backend:

```bash
mvn test
```

Frontend:

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

Prefer targeted tests first when available, then run the broader command before finishing risky changes.

## Next.js Image Component Rule

**CRITICAL:** 
- **DO NOT** use the Next.js `<Image />` component (`next/image`).
- **ALWAYS** use the standard HTML `<img>` tag for all images to avoid hydration mismatches and unwanted caching issues in this project.
- **IGNORE** any ESLint warnings related to `@next/next/no-img-element`. Never refactor `<img>` to `<Image />` just to fix this lint warning.

## Domain Guardrails

- Store primitive parent-child and spouse relationships; derive higher-order kinship terms.
- Treat asserted relationships as opaque until intermediate primitive paths exist.
- Preserve living-person privacy and redaction behavior.
- Never leak OTP codes, session tokens, private identifiers, or family data in logs or docs.
- For regional kinship behavior, check coverage for Bắc, Trung, and Nam.
- Do not change API contracts, database schema, or privacy behavior without matching tests and migration/spec updates.

## Review Checklist

- Does the change satisfy the relevant Kiro requirement?
- Is the implementation the smallest correct change?
- Are tests updated at the right level?
- Are generated files, secrets, local env files, and dependency directories untouched?
- Did verification commands run, or is any skipped check explicitly explained?

## Prototype Pages

Prototype pages live under `frontend/src/app/(prototype)/prototype/` and are **dev/local only** (blocked at middleware level and via `notFound()` in production).

### Purpose

Prototype pages render each main functional page with mock data — no login required. They exist so Playwright tests and AI agents can visually inspect any page state without signing in or out.

### Route Map

| Prototype URL | Mirrors |
|---|---|
| `/prototype` | Index / discovery page |
| `/prototype/home` | `src/app/page.tsx` |
| `/prototype/signin` | `src/app/signin/page.tsx` / `SignInFlow` |
| `/prototype/signup` | `src/app/signup/page.tsx` / `SignUpFlow` |
| `/prototype/forgot-password` | `src/app/forgot-password/page.tsx` / `ForgotPasswordFlow` |
| `/prototype/invitation/[id]` | `src/app/invitation/[id]/page.tsx` |
| `/prototype/tree` | `src/app/tree/[id]/page.tsx` — populated workspace |
| `/prototype/tree?panel=settings` | `src/app/tree/[id]/page.tsx` — settings modal open |
| `/prototype/tree/empty` | `src/app/tree/[id]/page.tsx` — empty/onboarding state |
| `/prototype/help` | `src/app/help/page.tsx` |

### Mandatory Sync Rule

**Whenever the UI or UX of a main page changes** (layout, components, interactions, CSS classes, accessible labels, `data-testid` attributes, copy/text), the corresponding prototype page in `src/app/(prototype)/prototype/<page>/` **MUST be updated in the same commit or PR**.

Each prototype file contains a `BEGIN/END mirror` comment block that marks the section to keep in sync. Only update lines inside that block; leave the prototype scaffolding (mock data wiring, `MockSessionProvider`, no-op handlers) intact.

### Constraints

- Never import from `src/lib/prototype/` in production application code (only in `(prototype)` route group files).
- Never connect prototype pages to real database queries or session tokens.
- Mock data lives in `src/lib/prototype/mockData.ts`. Update it if the `Person` or `Relationship` type shapes change.
- `SessionContext` is exported from `src/app/providers.tsx` specifically to support `MockSessionProvider`. Do not remove that export.
