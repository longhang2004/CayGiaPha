# Agent Memory

Durable project knowledge for future AI agents. Keep entries short, verified, and safe to share. Do not store secrets, credentials, tokens, personal data, or private family data.

## 2026-06-18

- Shared agent workflow lives in `AGENTS.md`; agent-specific files should point back there instead of duplicating rules.
- Product specs live under `.kiro/specs/vietnamese-family-tree/` and should be checked before changing domain behavior.
- Backend verification command: run `mvn test` from `backend/`.
- Frontend verification commands: run `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build` from `frontend/` as risk requires.

## 2026-06-22

- Local environment `pnpm` version switcher might fail to switch to the specified version in `package.json` (e.g. `pnpm@11.5.0`) with `ENOENT`. If this happens, use `npx pnpm <command>` as a workaround, which successfully resolves the configured version.
- The Spring Boot Java backend is currently disabled (`USE_BACKEND=false`). The frontend Next.js server handles routing and database queries full-stack using Drizzle ORM. Database updates must be made in the frontend Next.js project first, and mirrored to the Java backend's Flyway migrations directory (`backend/src/main/resources/db/migration/`) for future synchronization.

## 2026-06-23

- **Vietnamese Kinship Address Terms Seeding**: Since the Spring Boot backend is disabled, Drizzle migrations in Next.js do not automatically seed the `region_kinship_terms` database table. Added dynamic seeding in `frontend/src/lib/services/kinship/address.ts` to automatically populate it from the backend's Flyway SQL files on the first address lookup. This prevents address terms resolving to `(chưa xác định)`.
- **Directional Relationships in AddRelativeForm**: Extended the relationship form to support reverse bloodline definitions (e.g. Child-to-Father, Child-to-Mother) by swapping `sourceId` and `targetId` in the API payload, avoiding validation errors like `Child already has a father bloodline edge` due to role confusion.
- **Home Page and Search Toolbar Styling Fixes**: Constrained `.home-hero` page width to `70rem` centered. Moved search toolbar styling to `globals.css` and upgraded it from a viewport media query to a CSS container query (`@container (max-width: 850px)`) on `.search-panel-toolbar` to dynamically prevent wrapping layout bugs (such as the Add Member button wrapping incorrectly) regardless of whether the sidebar is open or collapsed.
- **Frontend Search Optimization**: Moved tree search execution completely to the frontend in `SearchPanel.tsx` (using local `persons` list and viewpoint `addresses` map) to optimize performance. This also resolves diacritic-insensitive matching for Vietnamese relative terms like "ba".
- **CodeGraph MCP Server Setup**: Configured CodeGraph as an MCP server using its absolute path `/Users/longhang/.nvm/versions/node/v22.15.0/bin/codegraph` and explicit `--path` to avoid `npx` stdout pollution causing JSON-RPC parsing errors (`invalid character 'â' looking for beginning of value`).
- **PersonInfoPanel Accessibility**: When visually hiding the panel's heading using `hideHeading={true}`, a screen-reader-only heading `<h2 className="sr-only">` is rendered instead of completely omitting the heading element, ensuring compatibility with WCAG SC 4.1.2.
- **Agent Workflow Reminder**: Future agents should prioritize initializing and utilizing **Codegraph** tools (if available in their environment) for structural navigation, and strictly use the **RTK Prompt Contract** defined in `AGENTS.md` before starting non-trivial tasks.
