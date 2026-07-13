# CGP component-system boundary

This directory is the only production UI layer that may import
`react-aria-components`. Product compositions consume CGP-owned contracts and
must not depend directly on the interaction kernel when a CGP wrapper exists.

## Ownership layers

1. Product compositions retain domain state, validation, privacy, and workflow
   decisions.
2. CGP components own public props, accessibility policy, semantic class names,
   and compatibility adapters.
3. React Aria Components supplies interaction behavior only. React Spectrum
   themes and styling are not used.

Existing semantic CSS variables and global SCSS remain authoritative. Runtime
CGP wrappers are client components. Consumer `className` values are additive;
they may control layout but must not remove focus visibility, disabled state,
touch-target sizing, or overlay safety. Inline `style` is excluded from new
contracts and may appear only on an explicitly approved compatibility adapter.

## State class convention

`cgpStateClassName("cgp-button", className, renderProps)` maps active React Aria
render states to BEM-like modifiers such as:

- `cgp-button--hovered`
- `cgp-button--pressed`
- `cgp-button--focus-visible`
- `cgp-button--disabled`
- `cgp-button--pending`
- `cgp-field--invalid`

SCSS should style these owned classes using existing semantic tokens. Product
components should not add selectors for React Aria's default class names.

## Overlay ownership

`cgp-overlay-root` is reserved for a future explicit application portal owner;
the current React Aria overlays use their default body portal. `CGPDialog`,
`CGPDrawer`, `CGPPopover`, and `CGPToastProvider` expose the public overlay
contracts. Consumers retain workflow state and content; CGP owns modal
semantics, dismissal policy, focus behavior, placement, responsive bounds, and
the semantic styling hooks.

`GraphOverlayBoundary` remains a separate product-owned local portal system. Its
safe-rectangle measurement and `data-graph-safe-*` exclusion contracts must not
be routed through the generic CGP overlay root.

## Migration status

The approved runtime layer now exports `CGPButton`, `CGPIconButton`,
`CGPTextField`, `CGPPasswordField`, `CGPSelect`, `CGPCheckbox`, `CGPDialog`,
`CGPDrawer`, `CGPPopover`, `CGPTabs`, and `CGPToastProvider`. The bounded
migration phases cover auth fields and choices, application dialogs, the
responsive sidebar drawer, hamburger/notification/filter/legend popovers,
person-information tabs, and application toasts. Their tests cover semantic
roles and relationships, keyboard interaction, focus restoration, dismissal,
and controlled state.

The legacy `components/Button.tsx` remains a native-button compatibility
boundary because its full React DOM event/style contract is not type-compatible
with React Aria. Existing form consumers that have not been selected for a
bounded migration also retain their native controls. The search results surface
remains a product-owned composite rather than a generic popover, and
`GraphOverlayBoundary` remains graph-owned as described above.

The installed `react-aria-components@1.19.0` Toast exports are still prefixed
`UNSTABLE_`. `CGPToastProvider` therefore keeps a library-independent queue and
public API until a later explicit migration validates a stable kernel API.
