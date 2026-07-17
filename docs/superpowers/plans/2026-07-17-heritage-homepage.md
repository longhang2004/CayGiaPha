# Heritage Homepage Implementation Plan

1. Add failing component tests for homepage states, landmarks, navigation anchors, FAQ, footer legal links, Settings legal entry points, and bounded-camera Help copy.
2. Generate and inspect a wide editorial illustration of a Vietnamese multigenerational family, then add it to `frontend/public` for both hero and Open Graph use.
3. Build shared `HomeLanding` content and stable conceptual visuals. Make production derive its state from session and make the prototype pass its local state toggle.
4. Move all homepage rules into a dedicated SCSS partial. Remove the legacy homepage selectors from shared typography and tree-workspace partials.
5. Add marketing anchors to desktop Header and Hamburger, and add a shared legal-and-privacy card to production/prototype Settings before Data Rights.
6. Bump the two graph Help topics, update bounded camera and Reset wording, and sync Kiro/UI documentation.
7. Run targeted tests, full Vitest, typecheck, lint, build, prototype Playwright suites, responsive visual audit, and `git diff --check` before marking task 29 complete.
