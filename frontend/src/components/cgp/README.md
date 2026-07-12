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

The future application overlay provider owns one root named
`cgp-overlay-root`. Dialog, confirm, menu, popover, tooltip, and toast wrappers
will use that root unless a later approved contract says otherwise.

`GraphOverlayBoundary` remains a separate product-owned local portal system. Its
safe-rectangle measurement and `data-graph-safe-*` exclusion contracts must not
be routed through the generic CGP overlay root.

## Migration status

Phase 0 defined the contracts and verified the kernel. The first approved
runtime layer now exports `CGPButton`, `CGPIconButton`, `CGPTextField`,
`CGPPasswordField`, `CGPSelect`, and `CGPCheckbox`. Fields own their label,
description, error association, state classes, and password-reveal behavior.
Select owns its trigger/listbox/popover and Checkbox owns its checked indicator
plus description/error association. The legacy
`components/Button.tsx` remains a native-button compatibility boundary until
its consumers are migrated in bounded tasks; this preserves its React DOM event
and inline-style contract rather than casting those props into incompatible
React Aria types.

Dialog, toast, menu, and drawer implementations still require their separately
approved migration phases. Existing form consumers remain on their legacy
controls until a bounded migration task is approved. The first
bounded field migration covers sign-in, sign-up, password recovery, and their
synchronized prototypes; region selection remains on the legacy Select until
its bounded consumer-migration task.

The installed `react-aria-components@1.19.0` Toast exports are still prefixed
`UNSTABLE_`. CGP therefore keeps a library-independent toast contract until a
later phase validates a stable API or implements the queue internally.
