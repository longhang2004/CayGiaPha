# Home Motion and Editorial Tree List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair responsive homepage FAQ presentation, add accessible scroll reveals, clarify auth cross-links, and reformat the tree list as an editorial index.

**Architecture:** Keep `HomeLanding` server-rendered and introduce a small client observer that progressively enhances existing `.home-reveal` elements. Preserve tree-list data and callbacks while changing only its semantic presentation and mirrored prototype markup. Global SCSS remains split between homepage ownership in `_11_home.scss` and tree-list ownership in `_02_typography.scss` with responsive cleanup removed from `_03_tree_workspace.scss`.

**Tech Stack:** Next.js 14, React 18, TypeScript, SCSS, Vitest, Testing Library, Playwright.

## Global Constraints

- Do not add dependencies, API changes, database changes, or capability inference.
- Preserve redirect parameters, create/join/delete behavior, welcome dialog, and Guidance checklist.
- Use `<img>`, never `next/image`.
- Keep 48px touch targets, visible focus, dark mode, reduced motion, and 200% text support.
- Update production and prototype mirrors together.
- Do not commit, push, or merge without a separate user request.

---

### Task 1: Responsive FAQ and scroll reveals

**Files:**
- Create: `frontend/src/components/home/HomeScrollReveal.tsx`
- Create: `frontend/src/components/home/HomeScrollReveal.test.tsx`
- Modify: `frontend/src/components/home/HomeLanding.tsx`
- Modify: `frontend/src/components/home/HomeLanding.test.tsx`
- Modify: `frontend/src/styles/_11_home.scss`
- Modify: `frontend/tests/e2e/home-theme-toggle.spec.ts`

**Interfaces:**
- Produces: `HomeScrollReveal({ enabled, children }: { enabled: boolean; children: ReactNode })`.
- Consumes: existing `.home-reveal` markers and `HomeLanding.animated`.

- [x] Write failing tests proving observer entries add `is-visible`, fallback reveals all content, FAQ text is left aligned, and reduced motion disables transitions.
- [x] Run `npm test -- HomeScrollReveal.test.tsx HomeLanding.test.tsx` and confirm failures identify the missing observer contract.
- [x] Implement `HomeScrollReveal` with one `IntersectionObserver`, `rootMargin: "0px 0px -12%"`, one-time unobserve, and an unavailable-observer fallback.
- [x] Add `justify-content: flex-start`, a fixed icon slot, safe wrapping, `translate`/opacity reveal styles, and reduced-motion overrides.
- [x] Run targeted Vitest and the homepage Playwright checks; expect all tests to pass with no horizontal overflow.

### Task 2: Authentication cross-link copy

**Files:**
- Modify: `frontend/src/components/auth/SignInFlow.tsx`
- Modify: `frontend/src/components/auth/SignInFlow.test.tsx`
- Modify: `frontend/src/components/auth/SignUpFlow.tsx`
- Modify: `frontend/src/components/auth/SignUpFlow.test.tsx`
- Modify: `frontend/src/app/(prototype)/prototype/signin/page.tsx`
- Modify: `frontend/src/app/(prototype)/prototype/signup/page.tsx`

**Interfaces:**
- Preserves: `buildAuthHref(path, redirectTo, reason)` output.
- Produces: exact accessible names `Chưa có tài khoản? Đăng ký ngay!` and `Đã có tài khoản? Đăng nhập ngay!`.

- [x] Change test expectations first and run the two auth test files to confirm copy-only failures.
- [x] Update production and prototype copy without modifying href construction.
- [x] Re-run both auth test files and targeted prototype auth Playwright checks.

### Task 3: Editorial tree list

**Files:**
- Create: `frontend/src/components/tree/TreeListView.tsx`
- Create: `frontend/src/components/tree/TreeListView.test.tsx`
- Modify: `frontend/src/app/tree/page.tsx`
- Modify: `frontend/src/app/(prototype)/prototype/tree-list/page.tsx`
- Modify: `frontend/src/styles/_02_typography.scss`
- Modify: `frontend/src/styles/_03_tree_workspace.scss`
- Modify: `frontend/tests/e2e/prototype.spec.ts`

**Interfaces:**
- Produces: `TreeListView` with tree data, open/delete/add callbacks, optional status, and optional empty-state checklist content.
- Preserves: labels `Cây gia phả của bạn`, `+ Thêm cây`, `Xem sơ đồ`, and `Xóa`.

- [x] Write failing component tests for truthful count, stable ordering, role/region labels, owner-only delete, primary open action, and empty-state checklist slot.
- [x] Run `npm test -- TreeListView.test.tsx` and confirm the component is missing.
- [x] Implement semantic header, ordered editorial rows, metadata, action groups, and the empty state; wire production callbacks without moving data fetching.
- [x] Replace prototype mirror markup with the same component and local mock data only.
- [x] Consolidate tree-list styling in `_02_typography.scss`, remove the old mobile overrides from `_03_tree_workspace.scss`, and verify 48px targets and no overflow.
- [x] Run component and tree-list Playwright tests for populated, empty, welcome, and modal states.

### Task 4: Integrated verification and documentation

**Files:**
- Modify: `frontend/docs/ui/README.md`
- Modify: `.kiro/specs/vietnamese-family-tree/design.md`
- Modify: `.kiro/specs/vietnamese-family-tree/tasks.md`

- [x] Document the scroll-reveal enhancement, FAQ responsive contract, auth cross-link copy, and tree-list editorial-index contract.
- [x] Run targeted Vitest, then `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- [x] Run targeted homepage/tree-list Playwright, `prototype.spec.ts`, and `prototype-audit.spec.ts` when the local server is fresh.
- [x] Capture desktop, tablet, and mobile screenshots, inspect dark mode and 200% text, then run `git diff --check`.
