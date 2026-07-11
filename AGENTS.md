# AGENTS.md

Shared operating instructions for AI agents working in this repository. These rules apply to Codex, Cursor, Claude, Kiro, Antigravity, OpenCode, and similar coding agents.

## Repository Snapshot

- Product: Vietnamese family tree application with privacy controls and Vietnamese kinship resolution.
- Active application: Next.js 14 App Router/Route Handlers, React 18, TypeScript, Drizzle ORM,
  PostgreSQL, Vitest, Testing Library, Playwright, and fast-check.
- Reference backend: Java 21, Spring Boot 3.3.5, Flyway, JPA, jqwik, JUnit 5, and Testcontainers;
  disabled by default and not the production-priority request path.
- Specs: `.kiro/specs/vietnamese-family-tree/requirements.md`, `design.md`, and `tasks.md` are the product source of truth. `roadmap.md` is planning-only and does not supply implementation acceptance criteria.

## Agent Workflow

1. Start from the smallest useful context. For non-trivial work, search `.agents/memory.md` for relevant terms and read only matching entries.
2. Check the Kiro spec before changing behavior that affects product requirements, domain rules, privacy, auth, kinship logic, accessibility, or persistence. Use `requirements.md` for intent and acceptance, `design.md` for architecture/domain design, and `tasks.md` for committed scope. Read `roadmap.md` only for future-product planning or prioritization.
3. For UI work, read `frontend/docs/ui/INDEX.md`. Read its `README.md` when changing visual design, accessibility, or shared styles; consult `AUDIT.md` only when its historical findings are relevant.
4. Prefer structural navigation over full-file scans. Use Codegraph or an equivalent symbol graph for definitions, callers, callees, impact, and flow tracing.
5. Use literal search only for strings, comments, config keys, logs, or when a symbol graph is unavailable.
6. Make surgical changes. Do not refactor adjacent code unless the requested change requires it.
7. Add or update tests for behavior changes. Prefer property-based tests for kinship invariants and graph invariants.
8. Run the narrowest verification that proves the change, then broader checks when risk is high.
9. Record durable repo knowledge in `.agents/memory.md` when a discovery will help future agents avoid repeated exploration.

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

For non-trivial implementation work, use Plan mode and follow `.agents/execution-routing-harness.md`. Apply Superpowers selectively through `.agents/superpowers-lite.md`; repo rules override any plugin workflow that would add unnecessary ceremony.

Default delivery path:

```text
Plan mode → clarify only material unknowns → approve plan
→ Antigravity implements bounded Medium/Light work when attached and cost-effective
→ Codex reviews actual diffs and independently verifies
→ COMMIT-READY → commit only when authorized
```

- Codex/Heavy owns technical discovery, architecture, planning, high-risk implementation, integration, review, verification, and commit readiness.
- Prefer attached Antigravity for implementation-ready Medium/Light tasks because the user has more Antigravity usage, but only when scope, contracts, file ownership, and verification are clear.
- Codex/Heavy implements directly when work is tightly coupled, ambiguous, cross-layer, privacy/auth/security-sensitive, migration-related, kinship-critical, or cheaper to implement than delegate and review.
- PO/BA and UI/UX Designer are optional specialists, not default gates. Use PO/BA for product strategy, market research, roadmap, or genuinely unresolved product intent. Use Designer for major flows, redesigns, information architecture, or unresolved interaction direction.
- For ordinary tasks, Plan mode handles product/design clarity with a compact checklist and asks the user only about material decisions.
- Every delegated task uses an Execution Prompt and must return a Review Prompt. Codex verifies the repository rather than trusting worker claims.
- Do not create extra sessions, micro-plans, design documents, worktrees, subagents, or commits merely because a plugin supports them.

Read `.agents/multi-model-playbook.md` only when delegation is selected. Read `.agents/product-delivery-workflow.md` only when the user explicitly requests PO/BA or Designer involvement.

## UI Verification Routing

- Use targeted Playwright tests and screenshots for the affected route/viewports on ordinary UI changes.
- Use `.agents/skills/prototype-ui-audit/SKILL.md` for broad redesigns, shared shell/navigation/style changes, major responsive or modal-positioning changes, cross-page UI work, release audits, or when targeted checks reveal systemic drift.
- Do not run the full prototype UI audit for isolated copy, token, spacing, or single-component changes unless their blast radius is uncertain.

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

- For non-trivial work, search it with task-specific keywords; do not load the whole file by default.
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

## Responsive UI & Modal Positioning Rule

**CRITICAL:**
- Any newly added components, tooltips, or modals MUST be carefully checked across all responsive views (desktop, tablet, mobile).
- Ensure that floating elements (like modals, popovers, or guidance cards) NEVER overlap or obscure navigation buttons and toolbars (e.g., the `.tree-page-header`).
- On mobile and tablet, modals should generally be placed *above* the toolbar, or positioned dynamically so they do not conflict with core navigational elements.
