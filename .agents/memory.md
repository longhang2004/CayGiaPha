# Agent Memory

Durable project knowledge for future AI agents. Keep entries short, verified, and safe to share. Do not store secrets, credentials, tokens, personal data, or private family data.

## 2026-06-18

- Shared agent workflow lives in `AGENTS.md`; agent-specific files should point back there instead of duplicating rules.
- Product specs live under `.kiro/specs/vietnamese-family-tree/` and should be checked before changing domain behavior.
- Backend verification command: run `mvn test` from `backend/`.
- Frontend verification commands: run `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build` from `frontend/` as risk requires.

## 2026-06-22

- Resolved local environment `pnpm` version switcher `ENOENT` failure by matching the `"packageManager"` field in `package.json` to the system's active `pnpm` version (e.g., `pnpm@10.12.2`).
- The Spring Boot Java backend is currently disabled (`USE_BACKEND=false`). The frontend Next.js server handles routing and database queries full-stack using Drizzle ORM. Database updates must be made in the frontend Next.js project first, and mirrored to the Java backend's Flyway migrations directory (`backend/src/main/resources/db/migration/`) for future synchronization.

## 2026-06-23

- **Vietnamese Kinship Address Terms Seeding**: Since the Spring Boot backend is disabled, Drizzle migrations in Next.js do not automatically seed the `region_kinship_terms` database table. Added dynamic seeding in `frontend/src/lib/services/kinship/address.ts` to automatically populate it from the backend's Flyway SQL files on the first address lookup. This prevents address terms resolving to `(chưa xác định)`.
- **Directional Relationships in AddRelativeForm**: Extended the relationship form to support reverse bloodline definitions (e.g. Child-to-Father, Child-to-Mother) by swapping `sourceId` and `targetId` in the API payload, avoiding validation errors like `Child already has a father bloodline edge` due to role confusion.
- **Home Page and Search Toolbar Styling Fixes**: Constrained `.home-hero` page width to `70rem` centered. Moved search toolbar styling to `globals.css` and upgraded it from a viewport media query to a CSS container query (`@container (max-width: 850px)`) on `.search-panel-toolbar` to dynamically prevent wrapping layout bugs (such as the Add Member button wrapping incorrectly) regardless of whether the sidebar is open or collapsed.
- **Frontend Search Optimization**: Moved tree search execution completely to the frontend in `SearchPanel.tsx` (using local `persons` list and viewpoint `addresses` map) to optimize performance. This also resolves diacritic-insensitive matching for Vietnamese relative terms like "ba".
- **CodeGraph MCP Server Setup**: Configured CodeGraph as an MCP server using its absolute path `/Users/longhang/.nvm/versions/node/v22.15.0/bin/codegraph` and explicit `--path` to avoid `npx` stdout pollution causing JSON-RPC parsing errors (`invalid character 'â' looking for beginning of value`).
- **PersonInfoPanel Accessibility**: When visually hiding the panel's heading using `hideHeading={true}`, a screen-reader-only heading `<h2 className="sr-only">` is rendered instead of completely omitting the heading element, ensuring compatibility with WCAG SC 4.1.2.
- **Agent Workflow Reminder**: Future agents should prioritize initializing and utilizing **Codegraph** tools (if available in their environment) for structural navigation, and strictly use the **RTK Prompt Contract** defined in `AGENTS.md` before starting non-trivial tasks.

## 2026-06-24

- **Prototype Pages**: Added a `(prototype)` route group at `frontend/src/app/(prototype)/`. Prototype pages render real components with mock data — no auth required. Actual routes as of 2026-07-10: `/prototype` (index), `/prototype/home`, `/prototype/signin`, `/prototype/signup`, `/prototype/forgot-password`, `/prototype/invitation/[id]`, `/prototype/tree`, `/prototype/tree?panel=settings`, `/prototype/tree/empty`, `/prototype/help`. Discovery now uses `frontend/src/lib/prototype/manifest.ts`; the former stale OTP links were fixed in `f7ee39d`.
- **Prototype Guard**: Middleware blocks `/prototype/*` in production (NODE_ENV=production) with 404. Layout also calls `notFound()` as a second guard.
- **MockSessionProvider**: Lives in `frontend/src/lib/prototype/mockSession.tsx`. Injects mock session into the real `SessionContext` (exported from `providers.tsx`) so all `useSession()` calls across real components work without a real backend session.
- **SessionContext export**: `SessionContext` and `SessionContextValue` are now exported from `frontend/src/app/providers.tsx` — intentional, required by `MockSessionProvider`. Do not remove.
- **Mock data**: Lives in `frontend/src/lib/prototype/mockData.ts`. Contains `MOCK_PERSONS`, `MOCK_RELATIONSHIPS`, `MOCK_USER`, `PROTOTYPE_TREE_ID`.
- **Prototype Playwright spec**: `frontend/tests/e2e/prototype.spec.ts` — smoke tests for all prototype pages without auth.
- **AGENTS.md sync rule**: Added "Prototype Pages" section to `AGENTS.md` mandating that prototype pages must be updated in the same PR/commit as any main page UI/UX change.
- **Automatic Spouse Inference**: Implemented logic in both `RelationshipService.java` (Java backend) and `relationship.ts` (Next.js frontend) to automatically detect when a child has both a father and a mother, and insert a `marriage` edge with a default status of `"married"` if one does not already exist. This facilitates natural user onboarding when connecting parents. Sibling relationships are not stored as edges and remain fully derived dynamically from shared parents by the kinship resolver.
- **Serverless-Safe Seeding & Database Connection Timeout**: Configured `connectionTimeoutMillis` (10s for Neon on production, 5s for local pg) to prevent the application from hanging indefinitely during database outages. Replaced the global `seedingPromise` in `address.ts` with a simple boolean `isSeeded` flag to prevent serverless containers from getting stuck waiting on a permanently pending/suspended promise if a cold start or database query times out during initial migration seeding.

## 2026-06-25

- **Frontend Priority**: The backend is currently not used. Prioritize all development and updates in the frontend; syncing with the backend will be done later.
- **Environment Configurations**: Environment variables are managed via `.env.development` and `.env.production`. The general `.env` file is redundant and has been removed/ignored.

## 2026-06-27

- **Branch-Grouping Layout Sort**: Sibling and marriage units in each generation are now sorted horizontally based on their parents' average horizontal coordinate (`midParentX`). When sorting coordinates, it resolves the parent's spouse in the tree even when only a single parent relationship is explicitly stored in the database, and uses the marriage midpoint to group paternal siblings on the left and maternal siblings on the right, preventing line crossovers.
- **Single-Parent Married Joint Connector**: Updated the joint-edge connector logic in `TreeGraph.tsx` to detect when a parent is married even if the child only has a single parent edge explicitly in the database. Symmetrically branches both siblings from the parents' marriage midpoint, resolving the "lệch" (asymmetric/skewed) lines.
- **Gender and Parent Role Consistency Constraints**: Enforced strict biological and role validations in `relationship.ts` to reject mother/father roles that conflict with the person's gender (e.g. female as father) or their existing roles in other relationships (e.g. same person as father to child A and mother to child B).
- **Descriptive dropdown options**: Replaced abstract database terms ("Người bắt đầu" / "Người kết thúc") in `AddRelativeForm.tsx` with concrete labels ("Người nguồn/từ", "Người nhận/đến") and parent-child examples to make the interface clear for users.
- **Bottom-Up Parent Centering**: Added a coordinate centering pass in `layoutNodes` that aligns each parent (or spouse couple) directly above the midpoint of their children's positions. This prevents single parent nodes (like a single maternal grandfather) from appearing offset or skewed from their child branches.
- **Fullscreen Mode support**: Integrated HTML5 Fullscreen API with dedicated UI buttons and `:fullscreen` CSS class overrides to stretch the tree graph canvas over the entire viewport dynamically.

## 2026-06-30

- **Alphanumeric Invite Code**: Invitation codes are restricted to 6 characters matching `[a-z1-9]` (no zero or uppercase) to prevent reading ambiguity.
- **In-App Fullscreen Map Layout**: Restructured `.tree-workspace` to take `height: 100vh;` and applied negative margins (`margin: -2rem -1.25rem`) to perfectly offset the parent `.inapp-content` padding, making the graph canvas cover the entire screen.
- **Floating Island Header Toolbar**: Positioned `.tree-page-header` absolutely at the bottom center of the screen with a glassmorphic background (`backdrop-filter`). Added CSS rules to hide the brand logo/title and collapse buttons to icon-only on mobile screens (`max-width: 600px`).
- **Right Details Panel Close Buttons**: Replaced bottom buttons ("Bỏ chọn", "Hủy bỏ") with absolute close buttons (`&times;` / `side-panel__close`) at the top right of the cards. To prevent breaking existing Playwright E2E tests, the button text (e.g. "Bỏ chọn") is preserved inside a screen-reader-only `span` (`className="sr-only"`).
- **Dynamic Invitation Link**: Implemented `/invitation/[id]` dynamic page to consume invitation URLs (`${Base_URL}/invitation/:id`), verify details, and confirm collaboration join. Added redirect support to `/signin` with query param `?redirect=/invitation/[id]` so unauthenticated invitees are correctly redirected back upon logging in.

## 2026-07-05

- **Playwright Dev Server Rule**: Before starting a dev server for browser/Playwright checks, inspect port 3000 first. If port 3000 is already this project's dev server, reuse it. If port 3000 is free, start this project on 3000. If port 3000 belongs to another process/project, start the dev server on a different free port.
- **Extended Family Branch UX**: The tree graph is ego-centric. Render the active viewpoint's bloodline, show spouse/in-law nodes as one-hop boundary nodes, and collapse each boundary node's separate family branch behind an expansion badge until the user switches the viewpoint to that person.

## 2026-07-10

- **Frontend UI context**: Durable design guidance, the route/component/style/prototype map, and the evidence-backed audit backlog live in `frontend/docs/ui/README.md`, `INDEX.md`, and `AUDIT.md`. Read them before UI work.
- **UI audit baseline**: The 2026-07-10 audit rendered 9 prototypes at desktop/tablet/mobile without runtime errors, passed 29/29 a11y tests, and found one stale populated-tree Playwright heading assertion. See the audit for token, touch-target, shell, modal, and prototype drift details.
- **Multi-model planning**: When the user asks for a plan, task split, or prompts for multiple models, follow `.agents/multi-model-playbook.md`. Classify work by required capability tier (`heavy`, `medium`, or `light`) instead of provider/model names. The planning agent leads architecture, integration, and review—preferably using a heavy model—and delegation remains optional based on independence, risk, and coordination cost.
- **Cross-model prompt handoff**: Model communication is prompt-based in both directions. Heavy writes an explicit execution prompt for Medium/Light and must require the worker to return a standardized review prompt containing artifacts, evidence, verification, risks, and focused review instructions. Corrections use a new execution-prompt/review-prompt cycle.
- **Product/design specialist sessions are optional**: Do not route ordinary work through PO/BA or Designer. Use `.agents/product-delivery-workflow.md` only for explicit product strategy/market/roadmap work, major design work, or material authority gaps that Plan mode cannot resolve efficiently with the user.
- **Execution routing default**: Follow `.agents/execution-routing-harness.md` in Plan mode. Codex owns planning, architecture, review, verification, integration, and high-risk implementation. Prefer attached Antigravity for safely bounded Medium/Light implementation because the user has more Antigravity usage; Codex implements directly when work is ambiguous, coupled, privacy/security/domain-sensitive, or cheaper than delegation plus review.
- **Superpowers Lite**: Follow `.agents/superpowers-lite.md`. Use systematic debugging, proportionate planning/TDD/review, and mandatory fresh verification; do not automatically require full brainstorming, design-doc commits, micro-plans, worktrees, per-task subagents, or frequent commits.
- **Prototype UI audit routing**: Full `.agents/skills/prototype-ui-audit/SKILL.md` is reserved for broad redesigns, shared shell/style/navigation work, major responsive/modal changes, cross-page work, release audits, or suspected systemic drift. Use targeted Playwright/screenshots for ordinary isolated UI changes.
- **Active architecture/auth baseline**: The production-priority runtime is Next.js full-stack with Route Handlers, TypeScript services, Drizzle, and PostgreSQL. Spring Boot is an inactive reference/future synchronization target. Password and Google are the active sign-up/sign-in methods; OTP-only auth is legacy. Bounded codes remain for password recovery and person-node claiming.
- **Photo format decision**: The product contract accepts JPEG and PNG only. WebP remains deferred and must be rejected; older design/task text that accepted WebP was documentation drift.
- **UI audit revalidation**: `frontend/docs/ui/AUDIT.md` was captured before same-day fixes. Commits `f7ee39d` and `23224fc` improved semantic tokens, shell mapping, prototype manifest/tests, touch targets, landing media sizing, shared modal behavior, and graph legend. Revalidate each historical audit finding before creating a task.
- **Known remaining prototype/UI debt**: `/prototype/tree` still mounts `UpcomingEventsWidget`, which calls the real API and can log 401 despite mock session; invitation production/prototype pages begin with `h2` and lack `h1`; inline styles/global selectors remain numerous; breakpoint vocabulary remains inconsistent.
- **Password recovery active-runtime gap**: `ForgotPasswordFlow` and client helpers exist, but there are no Next.js `/api/v1/auth/password-reset/request` or `/confirm` Route Handlers while `USE_BACKEND=false`. Do not report password recovery as end-to-end complete until the active handlers and tests exist.

## 2026-07-11

- **Runtime-route verification gate**: Do not infer the deployed request path solely from `USE_BACKEND=false` or the documented “active runtime.” For every new or changed API contract, trace the UI request through rewrites/proxies/environment routing, inventory every backend implementation that can receive it (Next.js and Spring where applicable), and test the endpoint through the actual deployed routing mode. Schema/entity parity alone is insufficient; missing route parity can surface as production HTTP 500 errors.

## 2026-07-12

- **CGP component-system boundary**: `frontend/src/components/cgp/` owns the public component contracts and is the only production UI layer allowed to import `react-aria-components`. Version `1.19.0` is pinned for React 18. Its Toast exports remain `UNSTABLE_*`, so CGP keeps a library-independent toast contract until a separately approved phase validates a stable kernel API. `GraphOverlayBoundary` remains a separate local portal/safe-rectangle system.
- **CGP button migration**: `CGPButton`/`CGPIconButton` are the first runtime wrappers. RAC 1.19 filters `aria-busy`, so `CGPButton` restores it after mount while retaining `isPending`. The legacy `components/Button.tsx` remains native because its full React DOM event/style contract is not type-compatible with RAC; migrate consumers in bounded groups. Initial CGP padding/pill radius intentionally matches the legacy global button shape to prevent visual drift.
- **CGP field foundation**: `CGPTextField`/`CGPPasswordField` keep controlled and uncontrolled values on the React Aria `TextField` root, while the wrapper owns label/description/error association, semantic state classes, and an accessible password reveal toggle. Consumer migration remains a separately approved bounded task.
- **CGP auth field migration**: Sign-in, sign-up, `IdentifierForm`, and password-reset confirmation now use CGP text/password fields, with matching auth prototypes. CGP wraps `FieldError` in a live `role="alert"` boundary because RAC 1.19 filters `role` from `FieldError` itself; the RAC-owned error ID remains the input's `aria-describedby` target. Region Select remains legacy pending its own primitive phase.
- **CGP Select/Checkbox foundation**: `CGPSelect` owns label/value/trigger/listbox/popover semantics and `CGPCheckbox` owns checked indicator plus description/error IDs. RAC 1.19 filters `aria-invalid` from the Select trigger Button, so CGP restores it on the focusable trigger via a ref effect. Consumer migration remains bounded and separate.
- **CGP signup choice migration**: Signup production and prototype now use `CGPSelect` for regional kinship preference and `CGPCheckbox` for both legal consents. The controlled `Region` value and consent booleans remain the existing API payload contract; `.auth-consents` supplies auth-only spacing without changing primitive styles.
- **CGP dialog foundation**: `CGPDialog` delegates focus containment/restoration, outside/Escape dismissal mechanics, and document scroll locking to RAC ModalOverlay/Modal/Dialog. RAC 1.19 filters `aria-modal` from Dialog DOM props and does not associate its description slot automatically, so the wrapper restores `aria-modal` after mount and owns an explicit description ID/`aria-describedby` association.
