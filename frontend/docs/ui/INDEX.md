# UI semantic map

Use CodeGraph for code navigation: files, symbols, call paths, dependencies, and
impact. This document deliberately records only UI contracts that CodeGraph
cannot infer reliably: route-to-prototype coverage, styling ownership, and
cross-cutting editing constraints.

For the visual system and accessibility rules, read [README.md](./README.md).
For historical findings, read [AUDIT.md](./AUDIT.md) only when relevant.

## Route and prototype coverage

| Production route | Shell | Prototype coverage |
|---|---|---|
| `/` | Marketing | `/prototype/home` |
| `/signin`, `/signup`, `/forgot-password` | Focused | matching prototype route |
| `/login` | Bare/focused legacy placeholder | none |
| `/tree` | In-app | `/prototype/tree-list` |
| `/tree/[id]` | In-app/full canvas | `/prototype/tree` with `role=owner\|contributor\|linked\|reader`, `/prototype/tree/empty`, `?panel=settings` |
| `/claim/[personId]` | Focused | `/prototype/claim/[personId]` |
| `/person` | Legacy redirect to explicit tree workspace | none |
| `/invitation/[id]` | Bare/focused | `/prototype/invitation/[id]` |
| `/help` | Marketing | `/prototype/help` |
| `/support`, `/feedback`, `/admin` | In-app | none |
| `/settings` | In-app | `/prototype/settings`; consent reacceptance at `/prototype/consent` |
| `/legal/tos`, `/legal/privacy` | Focused | `/prototype/legal/tos`, `/prototype/legal/privacy` |

Prototype discovery is driven by `src/lib/prototype/manifest.ts`.

## Required UI contracts

- When a main page's layout, components, interaction, copy, accessible labels,
  CSS classes, or test IDs change, update its prototype mirror in the same
  change. Edit only the marked mirror block unless the scaffold must change.
- Prototype code must use local mock data only. Production code must never
  import from `src/lib/prototype/` or connect prototypes to live data.
- `AppLayoutWrapper` selects Marketing, Focused, and In-app shells. Add a route
  family there when its shell differs from the default.
- Use standard `<img>`, never `next/image`.
- Preserve living-person redaction, keyboard accessibility, visible focus,
  minimum touch targets, dark mode, and reduced motion.
- Consume server-provided tree/person capabilities for role-dependent actions. UI code must never
  infer Owner status from a session-level tree id or from the collaborator roster.

## Styling ownership

| Area | Primary style layer |
|---|---|
| Theme tokens and global foundations | `src/styles/_01_variables.scss` |
| Marketing, typography, lists, empty states | `src/styles/_02_typography.scss` |
| Tree workspace, panels, search | `src/styles/_03_tree_workspace.scss` |
| Forms and buttons | `src/styles/_04_forms_buttons.scss`, `_08_modals_auth.scss` |
| Public header and in-app navigation | `_05_header.scss`, `_07_sidebar_mobile.scss` |
| Photos | `_06_gallery.scss` |
| Modals, auth, onboarding, tour | `_08_modals_auth.scss` |
| Support and admin | `_10_support_admin.scss` |
| Graph canvas, nodes, edges, panel | `src/components/graph/graph.css` |

Before changing a global selector, a shared primitive, a theme token, a shell,
or a `Person`/`Relationship` shape, use CodeGraph to inspect its impact, then
verify the affected prototype and tests.
