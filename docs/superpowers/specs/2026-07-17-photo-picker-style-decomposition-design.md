# Photo picker, voice removal and style decomposition design

## Scope

This change replaces browser-native photo controls with one accessible picker, removes the browser-dependent voice search path, and splits the three largest global SCSS files by component ownership. It does not change API payloads, storage behavior, authorization, privacy projection, or graph behavior.

## Photo picker contract

`PhotoFilePicker` owns file selection and presentation. It accepts an `id`, a controlled `File | null` value, `onChange`, label, hint, and disabled state. JPEG and PNG files up to 5 MiB are accepted. Invalid files stay local to the picker and are never passed to a form.

The native file input remains in the accessibility tree and supports keyboard activation. The visible control supports click, touch, and drag and drop. A selected file shows a thumbnail, filename, and explicit actions to replace or remove it. Object URLs are revoked whenever the selected file changes and when the component unmounts.

The picker is shared by the connected-person form, person form, and photo gallery. The gallery keeps data fetching and mutations in `PersonPhotos`; photo metadata and timeline rendering move to focused presentation components.

If person creation succeeds but the optional photo upload fails, the form keeps the created person id, disables creation, and offers a direct way to open that person's information. This prevents a retry from creating a duplicate person.

## People search contract

Workspace people search remains local to the projected people, relationships, and addresses already loaded by the page. Text and filters stay reactive and no search text is sent to analytics.

Voice search is removed because the Web Speech implementation and permission lifecycle vary by browser and vendor. `TreePeopleSearchChrome` becomes a controlled component for the text field, filters, result count, and clear action. `TreePeopleListView` retains projection, grouping, row selection, and result rendering.

## Style ownership

The numbered global files remain in the same `globals.scss` import order. `_03_tree_workspace.scss`, `_08_modals_auth.scss`, and `_11_home.scss` become short aggregators that import ownership partials in the exact former cascade order.

The ownership folders are:

- `tree-workspace/`: shell, header and actions, surface, people list, picker and drawer, coach marks, person panel.
- `modals-auth/`: dialogs and settings, loaders, auth, tree entry, onboarding, invitation and claim, legal.
- `home/`: foundation and hero, feature stories, illustrations, kinship and privacy, FAQ, footer, responsive overrides.

Global selectors remain global. Partial files target fewer than 400 lines and do not exceed 500 lines. Old selectors are removed only after confirming that production and prototype markup have no consumer. Dark theme, reduced motion, text scaling, and responsive cascade order remain part of the contract.

## Verification

Component tests cover picker validation, keyboard/drop behavior, preview lifecycle, form integration, partial success, and the voice-free search contract. A style architecture test locks aggregator order and dead-selector removal. Type checking, lint, production build, targeted and full Vitest, responsive Playwright suites, and a visual prototype audit provide regression coverage.
