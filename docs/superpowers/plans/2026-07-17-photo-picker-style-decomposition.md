# Photo picker, voice removal and style decomposition plan

1. Add failing tests for a controlled photo picker that accepts JPEG/PNG files up to 5 MiB, supports click and drop, reports validation errors, previews selected files, and revokes object URLs.
2. Implement `PhotoFilePicker` and integrate it with connected-person creation, person editing/creation, and person photos without changing upload endpoints or payloads.
3. Add a partial-success state for a created person whose optional photo upload fails. Keep the created id and prevent duplicate creation.
4. Split photo metadata and timeline presentation out of `PersonPhotos`; move presentation-only inline styles into the gallery/photo style layer.
5. Add failing search tests, extract controlled `TreePeopleSearchChrome`, and remove microphone UI, Web Speech types, callbacks, messages, icon usage, and voice-only styles.
6. Split the three large SCSS files into ownership partials while preserving their import and selector order. Remove only selectors with no production or prototype consumer.
7. Add a style architecture test for aggregator order, Sass compilation, partial size guidance, and dead-selector absence.
8. Update Kiro design/tasks and UI ownership documentation. Keep prototype wiring synchronized because production components are shared.
9. Run targeted tests, full Vitest, typecheck, lint, build, targeted responsive Playwright, prototype suites, visual audit, and `git diff --check`.

No dependency, REST API, database, storage, privacy, capability, or graph contract changes are permitted. Do not commit, push, or merge without a separate request.
