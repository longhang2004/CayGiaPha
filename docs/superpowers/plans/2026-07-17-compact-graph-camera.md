# Compact Graph Layout & Bounded Camera Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reformat graph nodes into a compact vertical layout, use real node geometry for every
connector, clamp zoom/pan to useful limits, and record Bắc/Trung ordered addressing as future work.

**Architecture:** Add pure graph geometry and camera modules, prove them with unit tests, then make
the React layout/zoom hooks consume those contracts. Keep `TreeGraphProps`, API behavior, privacy,
and kinship resolution unchanged.

**Tech Stack:** React 18, TypeScript, SVG/foreignObject, Vitest, Testing Library, Playwright.

## Global Constraints

- Node metrics: 176×128 at 100%, 192×156 at 150%, 208×184 at 200%.
- Horizontal gap 24px; generation gap 96px; component gap 72px; world padding 64px.
- Camera padding 48px; minimum zoom `clamp(fitZoom, 0.12, 0.5)`; maximum zoom 2.
- No dependency, API, database, privacy, resolver, search, or public product-type changes.
- Preserve production/prototype component reuse and all existing graph/Coach controls.
- Use TDD for every behavior change. Do not commit, push, or merge without user authorization.

---

### Task 1: Pure graph geometry

**Files:**
- Create: `frontend/src/components/graph/treeGraphGeometry.ts`
- Test: `frontend/src/components/graph/treeGraphGeometry.test.ts`
- Modify: `frontend/src/lib/graph.ts`

- [x] Write failing tests for metrics, component spacing, world bounds, and rectangle-edge points.
- [x] Run the targeted test and confirm the expected RED failures.
- [x] Implement the minimal geometry and layout-option contracts.
- [x] Run targeted geometry and existing graph-layout tests to GREEN.

### Task 2: Pure bounded camera

**Files:**
- Create: `frontend/src/components/graph/treeGraphCamera.ts`
- Test: `frontend/src/components/graph/treeGraphCamera.test.ts`

- [x] Write failing tests for fit/min/max zoom, four pan boundaries, small-axis centering, anchoring,
  fit, and center-on-point behavior.
- [x] Run the targeted test and confirm RED.
- [x] Implement `getCameraLimits`, `clampCamera`, `zoomCameraAt`, `fitCamera`, and
  `centerCameraOn`.
- [x] Run the targeted tests to GREEN.

### Task 3: Integrate compact layout and connectors

**Files:**
- Modify: graph layout hook, `TreeGraph`, `TreeGraphNode`, `EdgeStyles`, `graph.css`
- Test: `frontend/src/components/graph/TreeGraph.test.tsx`

- [x] Replace the long-name width test with failing metric/content/connector regression tests.
- [x] Run the component test and confirm RED.
- [x] Feed text scale into layout, render node B, and route every edge from actual dimensions.
- [x] Run geometry and component tests to GREEN.

### Task 4: Integrate bounded interactions

**Files:**
- Modify: `frontend/src/components/graph/useTreeGraphZoom.ts`
- Modify: `frontend/src/components/graph/TreeGraphControls.tsx`
- Test: `frontend/src/components/graph/useTreeGraphZoom.test.tsx`

- [x] Add failing hook tests for drag, wheel, pinch/button anchoring, reset, resize, centering, and
  disabled zoom controls.
- [x] Run the hook tests and confirm RED.
- [x] Route every transform through the pure camera helpers and expose limits/capability flags.
- [x] Run hook and graph component tests to GREEN.

### Task 5: Specs, roadmap, and responsive evidence

**Files:**
- Modify: Kiro `design.md`, `tasks.md`, `roadmap.md`, and UI README
- Create: `frontend/tests/e2e/tree-graph-camera.spec.ts`

- [x] Document the current graph contract and add Bắc/Trung ordered addressing as roadmap-only.
- [x] Add Playwright checks at 320×568, 375×667, 768×1024, and 1280×800 plus 200% mobile/tablet.
- [x] Run targeted Playwright, prototype suites, and the broad screenshot audit.
- [x] Inspect all graph screenshots and report unrelated audit findings without changing them.

### Task 6: Final verification

- [x] Run targeted and full Vitest.
- [x] Run typecheck, lint, and build.
- [x] Run targeted Playwright, `prototype.spec.ts`, and `prototype-audit.spec.ts`.
- [x] Run `git diff --check`, inspect status/diff, and confirm `.superpowers/` is not included.
