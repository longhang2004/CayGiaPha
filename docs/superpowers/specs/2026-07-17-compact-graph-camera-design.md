# Compact Graph Layout and Bounded Camera Design

**Status:** Approved 2026-07-17

## Goal

Make the populated family-tree graph materially narrower and easier to scan while preserving
relationship semantics, increasing vertical separation between generations, and preventing the
camera from being dragged or zoomed beyond useful limits.

## Node and world geometry

The graph uses one deterministic metric profile derived from the existing 100–200% text scale.
The scale is clamped to that range and linearly interpolates node dimensions between `176×128` at
100%, `192×156` at 150%, and `208×184` at 200%. Horizontal node spacing is 24px, generation spacing
is 96px beyond node height, disconnected components are separated by 72px, and the graph world has
64px content padding on every side.

Nodes use the approved vertical editorial treatment: avatar at the left, a two-line name, separate
address and lifespan rows, and an in-flow status row for branch state. Long names remain fully
available through the button's accessible name and tooltip. Fixed pixel padding and gaps prevent
the surrounding chrome from doubling at 200% while rem-based text continues to scale.

Every connector consumes the same node dimensions as layout. Marriage connectors meet the actual
left/right card edges; parent-child connectors meet parent bottoms and child tops; a joint
two-parent connector continues from the marriage midpoint; and generic relationships intersect the
source and target card rectangles instead of crossing card interiors.

## Camera contract

The camera is calculated by pure geometry shared by initialization, reset, resize, pan, wheel,
pinch, zoom buttons, fullscreen, and center-on-node behavior. It reserves a 48px viewport edge
padding. For viewport `V` and graph world `W`:

```text
fitZoom = min(1, (V.width - 96) / W.width, (V.height - 96) / W.height)
minZoom = clamp(fitZoom, 0.12, 0.5)
maxZoom = 2
```

When the scaled world is smaller than the padded viewport on an axis, that axis is centered. When
it is larger, pan is clamped to `[viewport - 48 - scaledWorld, 48]`. Wheel zoom is anchored at the
pointer, pinch at the touch midpoint, and button zoom at the viewport center. Reset fits the graph;
the initial readable view retains the existing 0.75 zoom around the active ego when full fit would
be smaller. Zoom controls expose disabled state at the effective limits.

## Product and documentation boundary

This change is frontend-only. It does not change REST APIs, persistence, privacy projection,
kinship resolution, search, or public product types. The current Nam-only ordinal rule remains in
force. The roadmap gains a future item to research and implement culturally correct ordered
addressing independently for Bắc and Trung; it must not assume the Southern `birthOrder + 1`
formatter applies to either region.

`/prototype/tree` continues to render production graph components. Responsive evidence covers
320×568, 375×667, 768×1024, and 1280×800, with representative mobile/tablet checks at 200% text.

## Acceptance

- The prototype fixture's graph world is at least 25% narrower than the pre-change layout.
- Node dimensions match the metric profile and no node content escapes its card at 200% text.
- Connectors terminate on card boundaries and retain existing edge styles and relationship IDs.
- Zoom stays between the effective minimum and 2; pan cannot pass any 48px camera boundary.
- Reset, ego centering, selected-person centering, resize, fullscreen, export, mouse, touch, wheel,
  keyboard/button equivalents, Coach anchors, and production/prototype reuse continue to work.
