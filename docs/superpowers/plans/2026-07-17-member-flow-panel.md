# Member flow and Person panel implementation plan

Date: 2026-07-17
Status: Approved, in verification

## Delivery sequence

1. Add reducer and controller tests for selecting, opening each child mode, Back, Close, created
   Person transitions, dirty confirmation, and focus restoration.
2. Add a pure primitive-relation mapper and split the old combined form into
   `AddConnectedPersonForm` and `UpdateRelationshipForm`, with endpoint and capability tests.
3. Replace production/prototype boolean wiring with the panel controller. Keep `selectedId` derived
   for the existing graph contract.
4. Move search, voice, and filters into fixed member-list chrome; filter projected workspace data
   locally and keep the rows as the sole scroll owner.
5. Simplify footer, Person actions, and the action drawer. Remove asserted creation controls while
   preserving asserted backend and graph behavior.
6. Synchronize canonical Help, checklist, Coach anchors, Kiro requirements/design/tasks, roadmap,
   and UI documentation.
7. Verify targeted unit/component and relationship route regressions, then full Vitest, typecheck,
   lint, build, responsive Playwright, broad prototype audit, visual screenshots, and
   `git diff --check`.

## Acceptance evidence

- The reducer cannot express combined or contradictory panel modes.
- Back returns to the same Person view; X and Escape close the panel; dirty forms prompt before
  either transition; focus returns to the correct opener.
- New-person creation calls only the atomic relative endpoint. Existing-person updates call only
  the relationship endpoint and never create a Person.
- Primitive choices map to correct gender, edge type, and endpoint direction. Existing direct pairs
  are disabled; asserted/social pairs reach the backend's existing upgrade/conflict path.
- Owner, contributor, linked, and reader capabilities expose only authorized entries.
- Search/filter results are reactive, normalized, privacy-projected, local, and do not leak query or
  voice content into analytics.
- Production and prototype remain synchronized at 320×568, 375×667, 768×1024, and 1280×800, plus
  200% text on mobile and tablet, without horizontal overflow or inaccessible controls.

## Constraints

No dependency, REST API, database migration, graph-engine change, privacy change, commit, push, or
merge is part of this implementation.
