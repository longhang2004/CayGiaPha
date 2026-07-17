# UI context for Cây Gia Phả

This directory is the starting point for frontend UI/UX changes. It records the
current design language, where visual concerns live, and known quality gaps. It
describes the code as of 2026-07-10; product specs and `AGENTS.md` take
precedence.

## Read order

1. Read this file for the visual model and editing rules.
2. Use [INDEX.md](./INDEX.md) to find the route, component, stylesheet, and
   prototype affected by a change.
3. Check [AUDIT.md](./AUDIT.md) before introducing a pattern or fixing one. Its main body is a
   pre-fix snapshot; use the post-audit revalidation table before treating a finding as current.
4. For privacy, accessibility, auth, persistence, or kinship behavior, read the
   relevant Kiro requirements and design sections before editing.

## Current design direction

The product uses a warm, editorial family-archive aesthetic rather than a
generic SaaS dashboard:

- Plus Jakarta Sans with Vietnamese glyph support.
- Warm beige canvas, warm ink text, white paper surfaces, and terracotta accent.
- Large, low-weight display headings; compact labels; generous macro spacing.
- Rounded paper cards, double-bezel containers, hairlines, and restrained shadows.
- A task-first populated family-tree workspace: list is the mobile/tablet default, graph is an
  equivalent labelled tab, and wide containers show a list–graph split view.
- Light/dark themes based on semantic variables. Gender and relationship cues
  combine color with text, shape, or dash patterns.
- Older-user accessibility intent: 48 CSS-px targets, text scaling from
  100–200%, visible keyboard focus.

The strongest existing screens are the landing page, auth cards, and graph
workspace. Preserve their warm palette, typography, and purposeful whitespace.

## Rendering shells

`src/components/AppLayoutWrapper.tsx` assigns one of three shells by pathname:

| Shell | Current routes | Visual structure |
|---|---|---|
| Marketing | `/`, `/help`, `/prototype/home`, `/prototype/help` | Fixed translucent header + content |
| Bare/focused | `/signin`, `/signup`, `/forgot-password`, `/invitation/*`, `/legal/*`, their prototypes, `/prototype` | Content only; page/component supplies its frame |
| In-app | Tree, settings, support, feedback, admin, and other authenticated product routes | Desktop sidebar, mobile top bar/drawer, scrollable content |

This remains a centralized string-based map in `AppLayoutWrapper`. Known recovery and invitation
routes now use the bare shell; update the map and corresponding prototype whenever a new route
family is introduced.

## Styling architecture

There is no Tailwind or third-party component system. Global SCSS is loaded from
`src/app/layout.tsx`; `src/components/graph/graph.css` is additionally
imported by the tree workspace.

`src/styles/globals.scss` defines this cascade:

| Order | File | Owns |
|---:|---|---|
| 1 | `_01_variables.scss` | Theme tokens, spacing, shadows, root/body, dark mode |
| 2 | `_02_typography.scss` | Type hierarchy, shared layouts, landing, lists/empty states |
| 3 | `_03_tree_workspace.scss` | Workspace, toolbar, panels, search, double-bezel utilities, breakpoints |
| 4 | `_04_forms_buttons.scss` | Buttons, inputs, field states, focus, check/radio |
| 5 | `_05_header.scss` | Public header, nav, text-size UI, skip link |
| 6 | `_06_gallery.scss` | Photo upload and gallery |
| 7 | `_07_sidebar_mobile.scss` | In-app shell, sidebar/drawer, mobile bar, notifications/toasts |
| 8 | `_08_modals_auth.scss` | Auth, modal, forms, onboarding, tour, loading states |
| 9 | `_09_animations.scss` | Reusable entrance animation |
| 10 | `_10_support_admin.scss` | Support, feedback, admin |
| extra | `components/graph/graph.css` | SVG graph, nodes/edges, controls, person panel |

CSS is global. Before changing a shared selector, search both SCSS and TSX.

## Canonical tokens

Use `_01_variables.scss`; avoid raw component colors unless a color carries
domain meaning and has a dark-theme counterpart.

| Purpose | Token family |
|---|---|
| Page | `--color-bg`, `--color-fg`, `--color-muted` |
| Brand/action | `--color-brand`, `--color-brand-active`, `--color-accent` |
| Surfaces | `--color-surface-card`, `--color-surface-strong`, translucent surface tokens |
| Dividers | `--color-hairline`, `--color-hairline-soft`, `--color-hairline-strong` |
| Accessibility | `--color-focus`, `--min-touch-target` |
| Spacing | `--space-xs` through `--space-section` |
| Motion | `--ease-spring`, `--ease-fluid` |
| Elevation | `--shadow-ambient`, `--shadow-ambient-lg`, `--shadow-inner` |

The semantic aliases named in the original audit (`--color-danger`, `--color-surface-hover`,
`--color-primary`, `--color-background`, `--color-surface`, `--color-fg-muted`, and
`--color-accent-rgb`) are now defined for light and dark themes. Continue to avoid inventing aliases
without adding both definitions and an undefined-token check.

## Responsive model

Current behavioral thresholds:

- Container `>= 960px`: populated tree workspace becomes a split list–graph view.
- `<= 1024px`: workspace compacts panels/actions.
- `<= 900px`: sidebar becomes a drawer; the workspace action drawer becomes a bottom sheet with
  upward enter and downward exit motion; the graph's eight primary controls use an exact 4×2 grid.
- `<= 860px`: support/admin grids collapse.
- `<= 640px`: landing/auth/tree mobile composition.
- `<= 560px`, `<= 539px`, `<= 480px`: local adjustments.

Do not infer a clean breakpoint scale from these values; consolidation is
recommended. Test at 1280×800, 768×1024, and 375×667, plus 200% text scaling.
The graph deliberately has a larger internal SVG world; offscreen SVG nodes are
not automatically page-overflow bugs.

## Interaction and state language

- `src/components/cgp/` is the production interaction-component boundary.
  Product components use its button, field, choice, dialog, drawer, popover,
  tabs, and toast contracts instead of importing `react-aria-components`
  directly.
- Primary actions use `.btn`; secondary actions use `.btn-secondary`.
- Forms use `FormControl`, `Input`, and `Select` where practical.
- Long operations use button spinners, skeletons, or named loading states.
- Empty tree, empty selection, loading, and error states already exist.
- Destructive actions require confirmation and explicit wording.
- Relationship types must remain distinguishable by line style and color.
- `prefers-reduced-motion` must disable non-essential motion.
- Help topics under `src/content/help/` are the canonical guidance source. Overview, checklist and contextual notes reference topic IDs and excerpt keys; do not duplicate explanatory copy in components.
- The populated workspace uses progressive Coach mark chapters sourced from canonical Help topics:
  overview, actions, graph, and person. Contextual chapters start only after the user opens their
  surface and never open a drawer, change tabs, expand controls, select a person, or start editing.
  Missing capability/viewport anchors are skipped; Completion, Skip, and Escape persist per chapter.
  Settings replays overview, while action and graph surfaces expose typed chapter-specific replay.
  Tree-list and empty-tree states retain the short checklist.
- Populated workspace actions are distributed between a compact context bar, a stable footer, and
  a capability-filtered action drawer. Mobile/tablet use `list`/`graph` tabs with inert inactive
  content; wide containers use the same mounted panels in split view.
- Workspace drawers and person panels keep chrome fixed, clip at the surface root, and give exactly
  one internal body/list region ownership of scrolling. Contextual Coach cards render in an absolute
  layer outside that scroll region, so they do not push content rows.
- The viewpoint picker keeps search and count controls in fixed chrome and scrolls only its person
  list. Person view, create, edit, and add-relative modes share the side-panel chrome/body contract;
  normal actions remain grouped, the destructive action is separated, and the person surface has a
  typed manual replay for its Coach chapter.
- User-facing kinship reference copy is “Xét vai vế theo [Tên]” and “Đổi người xét”. Keep the stable
  internal `viewpoint` names and reserve “góc nhìn” for graph camera/zoom controls such as Đặt lại.
- Region Nam may append a privacy-safe, display-only calling number for sibling and parent-sibling
  terms (including their spouses) when explicit birth order is visible. Bắc/Trung, missing or hidden
  order, and all ineligible relation bands retain the canonical base term; never infer “Út”.
- The action drawer remains a compact right drawer on desktop and a vertically entering/exiting
  bottom sheet on mobile/tablet. Mobile/tablet graph controls place exactly eight primary actions in
  a 4×2 grid, with selected-person centring and full Help outside the grid; desktop controls remain
  compact.
- At the canonical 200% text scale on touch layouts, action-drawer title/close chrome stays fixed
  while secondary description copy scrolls with the action list. The workspace footer reflows into
  normal document flow and the list/graph surface keeps a 360px work area, preventing fixed chrome
  from covering member rows on short 320px-wide viewports.
- These presentation changes do not alter capability filtering, privacy projection, API contracts,
  or the graph engine. `/prototype/tree` shares the production workspace components, and targeted
  tests plus the three-viewport audit cover responsive scroll ownership.
- Guidance content is reviewed with each relevant feature release and quarterly for runtime accuracy.

## Non-negotiable editing rules

1. Preserve privacy/redaction semantics. Never expose private family data in
   visual fixtures, screenshots, or logs.
2. Use standard `<img>`; this repository forbids `next/image`.
3. Keep 48×48 targets where possible, never below the 44×44 floor, and retain
   `:focus-visible`.
4. Use semantic HTML and accessible names. Dialogs need dialog semantics, focus
   management, Escape handling, and focus restoration.
5. Update the corresponding prototype in the same change. Only edit its mirror
   block unless prototype scaffolding itself must change.
6. Add/update relevant tests. Run narrow proof first, broader checks for shared styles.
7. Prefer a shared class/token over a new inline style. Avoid broad element
   selectors unless intentionally application-wide.
8. Check light, explicit dark, system dark, reduced motion, keyboard, and 200%
   text-size behavior for shared primitives.

## Authorization-driven UI

Tree responses are the source of `accessRole` and per-person capabilities. Production and
prototype scenarios cover Owner, Contributor, Linked, and Reader. Contributor may edit people,
relationships, and photos but never tree settings, sharing, collaborators, claim invitations, or
visibility. Linked controls only their own linked node and receives projected data elsewhere.
Session identity does not contain a default tree.

## UI change checklist

Before editing:

- Identify the shell, page, shared components, style layer, and prototype in
  [INDEX.md](./INDEX.md).
- Check shared selector/token usage and relevant Kiro requirements.
- Capture the current prototype at the three reference viewports.

Before handoff:

- Re-capture affected prototypes at all reference viewports.
- Verify keyboard order, focus, dialog behavior, target size, contrast, reflow,
  loading/error/empty states, and dark mode.
- Run `pnpm test src/components/a11y` and relevant component/Playwright tests.
- Run typecheck/build when shared TSX, Sass, routing, or providers changed.
