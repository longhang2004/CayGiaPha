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

- **Prototype Pages**: Added a `(prototype)` route group at `frontend/src/app/(prototype)/`. Prototype pages render real components with mock data — no auth required. Routes: `/prototype` (index), `/prototype/home`, `/prototype/signin`, `/prototype/signin/otp`, `/prototype/signup`, `/prototype/signup/otp`, `/prototype/tree`, `/prototype/tree?panel=settings`, `/prototype/tree/empty`, `/prototype/help`.
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
