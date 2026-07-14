# Gemini Execution Prompt — Person-Centric Mobile UX

Paste the block below into Gemini from the repository root.

```text
Role: frontend implementation engineer
Capability tier: medium/heavy single worker

Objective:
Implement every task in:
/Users/longhang/personal_repos/CayGiaPha/docs/superpowers/plans/2026-07-13-person-centric-mobile-ux.md

Repository:
/Users/longhang/personal_repos/CayGiaPha

Current branch:
codex/senior-mobile-ux-research, based on codex/business-conformance.

Visual source:
/Users/longhang/.codex/generated_images/019f5b51-72cc-7f12-98b3-1f7765698b74/exec-8917a52e-46ca-4834-92d5-bf41ae28d9f0.png
Use it as the approved person-centric information hierarchy, not as permission to replace the existing warm editorial brand.

Required reading, in order:
1. /Users/longhang/personal_repos/CayGiaPha/AGENTS.md
2. /Users/longhang/personal_repos/CayGiaPha/docs/superpowers/plans/2026-07-13-person-centric-mobile-ux.md
3. /Users/longhang/personal_repos/CayGiaPha/docs/research/2026-07-13-older-adult-mobile-ux.md
4. /Users/longhang/personal_repos/CayGiaPha/docs/research/ux-baseline-2026-07-13/README.md
5. /Users/longhang/personal_repos/CayGiaPha/frontend/docs/ui/INDEX.md
6. /Users/longhang/personal_repos/CayGiaPha/frontend/docs/ui/README.md
7. Kiro requirements 3–10 and 13–18 plus corresponding frontend/error/testing sections in design.md.

Operating rules:
- Execute Tasks 1–7 sequentially. Do not create parallel agents or worktrees.
- Use CodeGraph first for symbols, callers, dependencies, and impact. Use rg only for literal strings/config after exact files are known.
- Follow test-first steps where the plan requests behavioral tests. Use screenshots/DOM assertions for visual-only CSS.
- Keep changes surgical. Do not redesign auth, invitation/claim, settings, support, legal, feedback, or admin.
- Do not change REST APIs, database schema, kinship algorithms, privacy/redaction, or capability contracts.
- Use server capabilities only and verify Owner, Contributor, Linked, and Reader separately.
- Use existing semantic SCSS tokens and components/cgp. Add no dependency or parallel design system.
- Use HTML img, never next/image.
- Keep core actions visibly labelled in Vietnamese and provide tap/button alternatives for every gesture.
- Keep targets >=44x44 CSS px, visible focus, keyboard reachability, dark/system themes, reduced motion, and 100–200% reflow.
- HELP_TOPICS stays canonical; do not copy its guidance prose into components.
- Vercel UX events contain only the enum payload in Task 1. Never send IDs, names, search text, invite/claim codes, contact data, photos, tokens, or free text.
- Do not implement fake Undo. Keep important errors persistent and valid fields intact.
- Update each production page and its prototype mirror in the same task. Prototypes stay mock-only and never call production APIs.
- Preserve existing dirty files. Do not clean, reset, stage, commit, push, or open a PR.
- If discovery requires an API/privacy/capability change or contradicts a frozen interface, stop at that boundary and report evidence instead of silently expanding scope.

Execution discipline:
1. Print the branch and git status before editing; record pre-existing dirty files.
2. Create a checklist from Tasks 1–7 and keep it current.
3. For each task: write the focused test, demonstrate absent/failing behavior where practical, implement the smallest change, run the exact targeted check, and inspect that task's diff.
4. Keep production/prototype synchronization in the same diff; do not postpone mirrors.
5. At Task 7 run typecheck, all Vitest tests, lint, build, and the three Playwright suites exactly as documented.
6. Inspect 320, 375, 430, tablet, desktop, 200% text, dark, and reduced-motion captures; write the requested audit file.
7. Run git diff --check and git status --short. Never claim a skipped check passed.

Completion contract:
- Do not commit.
- End with the exact REVIEW PROMPT FOR CODEX structure from the implementation plan.
- Include every changed path, exact commands/results, failed or skipped checks, assumptions, remaining risks, and focused review requests.
- Mark partial or unverified acceptance criteria accurately.
```
