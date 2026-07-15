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
- **Automatic spouse inference (superseded 2026-07-13)**: The active Next.js runtime must not
  infer a marriage between co-parents. Existing marriage rows are retained because runtime data
  cannot distinguish prior inference from an explicit user assertion. Sibling relationships remain
  derived from shared parents rather than stored as primitive edges.
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
- **Antigravity CLI** (2026-07-13): Use `.agents/bin/agy-delegate` for repository-local Antigravity delegation. It defaults to read-only `plan` mode; `accept-edits` requires explicit bounded ownership and Codex diff/test verification. The `agy` process may need a host environment that permits its log directory and localhost listener; never use `--dangerously-skip-permissions`.
- **Patch-batch delegation** (2026-07-14): Use 2–4 narrowly scoped patch packets rather than delegating a broad feature to one worker. Prefer `gemini-3.5-flash` for eligible light packets; freeze contracts and ownership first, run shared-checkout writers sequentially, and require a diff plus targeted evidence for every packet. See `.agents/execution-routing-harness.md` and `.agents/multi-model-playbook.md`.
- **Superpowers Lite**: Follow `.agents/superpowers-lite.md`. Use systematic debugging, proportionate planning/TDD/review, and mandatory fresh verification; do not automatically require full brainstorming, design-doc commits, micro-plans, worktrees, per-task subagents, or frequent commits.
- **Prototype UI audit routing**: Full `.agents/skills/prototype-ui-audit/SKILL.md` is reserved for broad redesigns, shared shell/style/navigation work, major responsive/modal changes, cross-page work, release audits, or suspected systemic drift. Use targeted Playwright/screenshots for ordinary isolated UI changes.
- **Active architecture/auth baseline**: The production-priority runtime is Next.js full-stack with Route Handlers, TypeScript services, Drizzle, and PostgreSQL. Spring Boot is an inactive reference/future synchronization target. Password and Google are the active sign-up/sign-in methods; OTP-only auth is legacy. Bounded codes remain for password recovery and person-node claiming.
- **Photo format decision**: The product contract accepts JPEG and PNG only. WebP remains deferred and must be rejected; older design/task text that accepted WebP was documentation drift.
- **UI audit revalidation**: `frontend/docs/ui/AUDIT.md` was captured before same-day fixes. Commits `f7ee39d` and `23224fc` improved semantic tokens, shell mapping, prototype manifest/tests, touch targets, landing media sizing, shared modal behavior, and graph legend. Revalidate each historical audit finding before creating a task.
- **Known remaining prototype/UI debt**: Prototype tree/event, claim, recovery, consent, settings,
  collaboration, and invitation states use mock adapters and must not call production APIs.
  Invitation production/prototype pages begin with `h2` and lack `h1`; inline styles/global
  selectors remain numerous; breakpoint vocabulary remains inconsistent.
- **Password recovery active-runtime gap**: `ForgotPasswordFlow` and client helpers exist, but there are no Next.js `/api/v1/auth/password-reset/request` or `/confirm` Route Handlers while `USE_BACKEND=false`. Do not report password recovery as end-to-end complete until the active handlers and tests exist.

## 2026-07-11

- **Runtime-route verification gate**: Do not infer the deployed request path solely from `USE_BACKEND=false` or the documented “active runtime.” For every new or changed API contract, trace the UI request through rewrites/proxies/environment routing, inventory every backend implementation that can receive it (Next.js and Spring where applicable), and test the endpoint through the actual deployed routing mode. Schema/entity parity alone is insufficient; missing route parity can surface as production HTTP 500 errors.

## 2026-07-12

- **CGP component-system boundary**: `frontend/src/components/cgp/` owns the public component contracts and is the only production UI layer allowed to import `react-aria-components`. Version `1.19.0` is pinned for React 18. Its Toast exports remain `UNSTABLE_*`, so CGP keeps a library-independent toast contract until a separately approved phase validates a stable kernel API. `GraphOverlayBoundary` remains a separate local portal/safe-rectangle system.
- **CGP button migration**: `CGPButton`/`CGPIconButton` are the first runtime wrappers. RAC 1.19 filters `aria-busy`, so `CGPButton` restores it after mount while retaining `isPending`. The legacy `components/Button.tsx` remains native because its full React DOM event/style contract is not type-compatible with RAC; migrate consumers in bounded groups. Initial CGP padding/pill radius intentionally matches the legacy global button shape to prevent visual drift.
- **CGP field foundation**: `CGPTextField`/`CGPPasswordField` keep controlled and uncontrolled values on the React Aria `TextField` root, while the wrapper owns label/description/error association, semantic state classes, and an accessible password reveal toggle. Consumer migration remains a separately approved bounded task.
- **CGP auth field migration**: Sign-in, sign-up, `IdentifierForm`, and password-reset confirmation now use CGP text/password fields, with matching auth prototypes. CGP wraps `FieldError` in a live `role="alert"` boundary because RAC 1.19 filters `role` from `FieldError` itself; the RAC-owned error ID remains the input's `aria-describedby` target. Signup region uses `CGPSelect`.
- **CGP Select/Checkbox foundation**: `CGPSelect` owns label/value/trigger/listbox/popover semantics and `CGPCheckbox` owns checked indicator plus description/error IDs. RAC 1.19 filters `aria-invalid` from the Select trigger Button, so CGP restores it on the focusable trigger via a ref effect. Consumer migration remains bounded and separate.
- **CGP signup choice migration**: Signup production and prototype now use `CGPSelect` for regional kinship preference and `CGPCheckbox` for both legal consents. The controlled `Region` value and consent booleans remain the existing API payload contract; `.auth-consents` supplies auth-only spacing without changing primitive styles.
- **CGP dialog foundation**: `CGPDialog` delegates focus containment/restoration, outside/Escape dismissal mechanics, and document scroll locking to RAC ModalOverlay/Modal/Dialog. RAC 1.19 filters `aria-modal` from Dialog DOM props and does not associate its description slot automatically, so the wrapper restores `aria-modal` after mount and owns an explicit description ID/`aria-describedby` association.
- **CGP TreeEntryModal migration**: `TreeEntryModal` is the first legacy modal consumer migrated to `CGPDialog`; its create/join state machine and form controls remain unchanged. The consumer keeps its established 38rem layout and 1.5rem body padding through `.tree-entry-modal .cgp-dialog__body`, with the tree-list prototype serving all entry states.
- **2026-07-13 CGP dialog migration complete**: ConfirmProvider, DeletionDialog, SettingsModal, and CollaborationModal now use `CGPDialog`; dialog footers are outside the scrollable body. Collaboration rows must wrap at 200% text to avoid horizontal overflow.
- **2026-07-13 CGP interaction migration complete**: HamburgerMenu, NotificationBell, SearchPanel filters, and GraphLegend use `CGPPopover`; the responsive app sidebar uses `CGPDrawer`; PersonInfoPanel uses `CGPTabs`; application notifications use the library-independent `CGPToastProvider`. Search results remain a product-owned composite, and GraphOverlayBoundary remains graph-local by design.
- **2026-07-13 CGP cleanup**: Legacy `components/ui/Modal.tsx`, `components/ui/ToastProvider.tsx`, and their dead modal/filter/sidebar CSS were removed. Production `react-aria-components` imports remain confined to `src/components/cgp/`.
- **2026-07-13 CGP 200% overlay rules**: Long CGP popovers need a `100dvh` max-height plus vertical scrolling. The responsive app drawer scales up to the viewport, wraps nav labels, and scrolls vertically; graph legend close targets remain at least `--min-touch-target` (48px in the current theme).

## 2026-07-13

- **Older-adult mobile UX research**: Evidence-backed pre-plan research for elderly and low-confidence
  technology users lives at `docs/research/2026-07-13-older-adult-mobile-ux.md`. Technical WCAG
  conformance is only the floor; future UI planning should prioritize visible labeled actions,
  non-gesture alternatives, contextual Help backed by canonical topic IDs, safe error recovery, and
  moderated mobile testing with Vietnamese users 60+. Keep the existing 44 CSS-px floor/48px intent;
  WCAG 2.2 AA's 24px minimum is not the product target.
- **Older-adult UX baseline audit**: The 2026-07-13 evidence and round-1 protocol live under
  `docs/research/ux-baseline-2026-07-13/`. At 100% text the four target prototypes have no page-level
  horizontal overflow and most visible core targets meet 44px, but mobile guidance obscures the
  graph, core toolbar labels disappear, and Help is a long sequential document. At 200% text,
  tree-list/tree workspaces remain locked to the viewport and Help expands to 571px wide; production
  redesign stays gated on three visual directions plus moderated testing.

- **Early-access welcome cookie**: The tree-list welcome dialog acknowledges per browser with `cgp_early_access_welcome_v1=acknowledged`, path `/`, `SameSite=Lax`, and a 365-day expiry. Cookie failure must never prevent the dialog from closing for the current page visit.
- **Help/ClaimFlow boundary**: Person-node ClaimFlow is mounted at `/claim/[personId]`, requires an
  authenticated matching account identity, and has a mock-only prototype. Help may describe this
  recipient flow, but must keep it distinct from Owner invitations and collaboration invitations.
- **Business model authority (2026-07-13)**: New accounts register with email/password or Google;
  existing phone-only accounts retain sign-in/SMS-recovery compatibility. Sign-up creates one
  initial tree and Users may explicitly create more. Tree operations never fall back to the first
  owned tree. Roles are Owner, Contributor (trusted read + content/photo editor, no administration
  or visibility), Linked (own-node/photo/visibility only), and Reader (projected read only).
- **Person-node linking contract (2026-07-13)**: The user-facing name is “Xác nhận đây là tôi”. A
  claim code is bound to the Person and normalized destination, verification requires a signed-in
  account with the matching identity, and the client submits only the code. This is distinct from
  reusable collaboration invitations.
- **Conformance source (2026-07-13)**: `.kiro/specs/vietnamese-family-tree/conformance.md` maps
  Requirements 1–26 to active Next.js routes/services/UI/tests. Checked historical tasks are not
  readiness evidence; update the matrix after each remediation batch.
- **Privacy projection contract (2026-07-13)**: `frontend/src/lib/services/privacy.ts` is the only
  living-person/per-field projector for tree, person, search, photo, and upcoming-event reads. A
  person born exactly 100 years before the current UTC year is still living. Contributor is a
  trusted reader; Linked is trusted only when authorization classifies the requested node itself
  as `LINKED`; projected readers never receive visibility metadata.
- **Legal and data-rights v2 (2026-07-13)**: Legal v2 content is canonical in
  `frontend/src/content/legal/legalContent.ts` and persisted by Java migration V27; wording remains
  subject to external legal review. `/settings` lists claimed nodes and supports JSON export,
  correction navigation, anonymize/delete, and account deletion. Relational deletion is
  transactional; photo objects are cleaned after commit with sanitized count-only error logging.
- **Graph mutation contract (2026-07-13)**: New relatives use the atomic
  `/api/v1/trees/[treeId]/relatives` command. Primitive/asserted edges are directed, exact
  duplicates fail without overwriting data, co-parents do not imply marriage, and relationship
  edits/deletes address an explicit relationship id. Asserted labels upgrade only to `verified` or
  `conflict`; conflict never deletes or rewrites the user's label.
- **Invitation-code storage (2026-07-13)**: Newly issued collaboration codes are stored as
  `sha256:<base64url-digest>` and the raw code is returned only at issuance. Acceptance checks the
  digest first and temporarily falls back to unexpired plaintext legacy rows; pending-list APIs
  must never serialize either representation.
- **Capability/UI contract (2026-07-13)**: `editRelationships` is distinct from `editContent`.
  Owner and Contributor may edit relationships; Linked may edit only the linked Person's own
  fields/photos/visibility and never tree structure; Reader is read-only. Production UI consumes
  server-returned tree/person capabilities, while prototypes reproduce them from isolated mock data.
- **Auth/logging hardening (2026-07-13)**: The supported Google flow is
  `POST /api/v1/auth/google`; legacy GET login/callback routes only redirect to `/signin` and never
  create accounts. Google identity must expose a verified normalized email and is rate-limited by
  hashed identity plus IP. Runtime logs use generic messages/counts and never attach provider
  responses, raw errors, OTPs, destinations, credentials, session/share tokens, or family data.
- **Verification environment (2026-07-13)**: The 100-file frontend Vitest suite uses a 15-second
  per-test budget because concurrent jsdom UI setup can exceed Vitest's 5-second default. Java
  Flyway/Testcontainers verification passes all 27 migrations on PostgreSQL 16; the host Java 26
  cannot run the full Mockito suite because the pinned ByteBuddy supports only through Java 23.
- **Workspace screenshot compositor (2026-07-15)**: Chromium screenshots can show transient black
  tiles when the mobile list/graph track is captured while it remains translated. The broad audit
  keeps production swipe behavior intact and flattens only the active graph track through
  Playwright's capture-only `style` option before exporting durable screenshots.
