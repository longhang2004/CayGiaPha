# UI page, component, and style index

Paths are relative to `frontend/`. Use this index to build the smallest safe
context before a UI change.

## Production pages

| Route | Page source | Shell | Main UI / states | Prototype |
|---|---|---|---|---|
| `/` | `src/app/page.tsx` | Landing | Hero, feature card, 3-step strip; session loading/anonymous/authenticated | `/prototype/home` |
| `/signin` | `src/app/signin/page.tsx` | Focused | `SignInFlow`; credentials, Google, error/loading | `/prototype/signin` |
| `/signup` | `src/app/signup/page.tsx` | Focused | `SignUpFlow`; credentials, region, consent, Google | `/prototype/signup` |
| `/forgot-password` | `src/app/forgot-password/page.tsx` | In-app (current) | `ForgotPasswordFlow`; request/reset, loading/error | `/prototype/forgot-password` |
| `/login` | `src/app/login/page.tsx` | In-app | Legacy placeholder, not the main auth flow | none |
| `/tree` | `src/app/tree/page.tsx` | In-app | Tree list, create popup, onboarding; loading/error/empty/list/delete | no list prototype |
| `/tree/[id]` | `src/app/tree/[id]/page.tsx` | In-app/full canvas | Graph, floating commands, panels; loading/empty/populated/search/edit/settings/collaboration/tour | `/prototype/tree`, `/prototype/tree/empty`, `?panel=settings` |
| `/person` | `src/app/person/page.tsx` | In-app | Standalone `PersonForm` / `AddRelativeForm` harness | none |
| `/invitation/[id]` | `src/app/invitation/[id]/page.tsx` | In-app (current) | Invitation card; loading/invalid/auth/accept/decline/result | `/prototype/invitation/[id]` |
| `/help` | `src/app/help/page.tsx` | In-app | `HelpGuide`, contents, long-form topics | `/prototype/help` |
| `/support` | `src/app/support/page.tsx` | In-app | Support/QR half of shared support-feedback component | none |
| `/feedback` | `src/app/feedback/page.tsx` | In-app | Feedback form, attachments, success/error | none |
| `/settings` | `src/app/settings/page.tsx` | In-app | Theme and account information | none |
| `/admin` | `src/app/admin/page.tsx` | In-app | Metrics, feedback, recent data; denied/load/error/data | none |
| `/legal/tos` | `src/app/legal/tos/page.tsx` | Focused | Inline-styled legal document | none |
| `/legal/privacy` | `src/app/legal/privacy/page.tsx` | Focused | Inline-styled legal document | none |

`src/app/layout.tsx` owns font, metadata, theme bootstrap, providers, skip link,
and `AppLayoutWrapper`. `src/app/providers.tsx` owns session context.

## Prototype pages (actual filesystem)

| Prototype | Mirrors / scaffold |
|---|---|
| `/prototype` | Discovery page only |
| `/prototype/home` | Home with local auth-state toggle |
| `/prototype/signin` | Sign-in credentials step; local state/no API |
| `/prototype/signup` | Sign-up credentials/region/consent; local state/no API |
| `/prototype/forgot-password` | Password recovery; local state/no API |
| `/prototype/invitation/[id]` | Fixed invitation data |
| `/prototype/tree` | Populated workspace with `MockSessionProvider` and mock graph |
| `/prototype/tree?panel=settings` | Workspace settings open |
| `/prototype/tree/empty` | Empty workspace with real `PersonForm` |
| `/prototype/help` | Real static `HelpGuide` |

Known drift: the prototype index still lists non-existent
`/prototype/signin/otp` and `/prototype/signup/otp`, and omits existing
forgot-password/invitation pages. See [AUDIT.md](./AUDIT.md).

## Layout and navigation

| Component | Source | Responsibility |
|---|---|---|
| `AppLayoutWrapper` | `src/components/AppLayoutWrapper.tsx` | Select shell and full-canvas padding |
| `Header` | `src/components/Header.tsx` | Public fixed header and session actions |
| `HeaderActions` | `src/components/HeaderActions.tsx` | Older/alternate action cluster; not used by `Header` |
| `Sidebar` | `src/components/Sidebar.tsx` | Desktop nav/collapse, mobile drawer, account actions |
| `HamburgerMenu` | `src/components/HamburgerMenu.tsx` | Public-header display/help/support popover |

## UI primitives and cross-cutting feedback

| Component | Source | Responsibility / caveat |
|---|---|---|
| `Button` | `src/components/Button.tsx` | Native button, loading, trailing icon |
| `Card` | `src/components/ui/Card.tsx` | Inline-styled surface wrapper |
| `Badge` | `src/components/ui/Badge.tsx` | Inline-styled status badge |
| `FormControl`, `Input`, `Select` | `src/components/ui/FormControls.tsx` | Label/error association, double bezel, password visibility |
| `Modal` family | `src/components/ui/Modal.tsx` | Settings overlay/card sections; incomplete dialog behavior |
| `ConfirmProvider` | `src/components/ui/ConfirmProvider.tsx` | Promise-based global confirmation |
| `ToastProvider` | `src/components/ui/ToastProvider.tsx` | Global toast queue |
| `NotificationBell` | `src/components/ui/NotificationBell.tsx` | Reminder count/dropdown and states |
| `Skeleton` | `src/components/ui/Skeleton.tsx` | Text/circle/rect placeholder |
| icon set | `src/components/ui/Icons.tsx` | Custom inline SVG icons |
| `TextSizeProvider` | `src/components/a11y/TextSizeProvider.tsx` | Persist/apply 100–200% root scale |
| `TextSizeControl` | `src/components/a11y/TextSizeControl.tsx` | Step controls, range, output |

## Auth and account

| Component | Source | Responsibility |
|---|---|---|
| `SignInFlow` | `src/components/auth/SignInFlow.tsx` | Password + Google sign-in |
| `SignUpFlow` | `src/components/auth/SignUpFlow.tsx` | Credentials, region, legal consent, Google |
| `ForgotPasswordFlow` | `src/components/auth/ForgotPasswordFlow.tsx` | Password recovery |
| `IdentifierForm` | `src/components/auth/IdentifierForm.tsx` | Legacy/OTP identifier request |
| `OtpForm` | `src/components/auth/OtpForm.tsx` | Legacy/OTP verification |
| `SignOutButton` | `src/components/auth/SignOutButton.tsx` | End session with loading/error |
| error mapper | `src/components/auth/authErrors.ts` | Vietnamese auth error copy |

## Tree and kinship presentation

| Component | Source | Responsibility |
|---|---|---|
| `TreeGraph` | `src/components/graph/TreeGraph.tsx` | Layout, pan/zoom, branch focus, selection, SVG nodes |
| `GraphEdge` / helpers | `src/components/graph/EdgeStyles.tsx` | Relationship connectors and asserted labels |
| `TreeGraphSkeleton` | `src/components/graph/TreeGraphSkeleton.tsx` | Graph-shaped loading state |
| `PersonInfoPanel` | `src/components/graph/PersonInfoPanel.tsx` | Selected person, address, timeline tabs |
| `ViewpointSelector` | `src/components/graph/ViewpointSelector.tsx` | Ego/person selector |
| `UpcomingEventsWidget` | `src/components/graph/UpcomingEventsWidget.tsx` | Birthday/memorial reminders |

Graph coordinates live in `TreeGraph.tsx`; graph/node/edge/panel appearance lives
in `src/components/graph/graph.css`.

## Person, relationship, privacy, and media

| Component | Source | Responsibility |
|---|---|---|
| `PersonForm` | `src/components/person/PersonForm.tsx` | Create/edit person, visibility, deceased info, photo |
| `AddRelativeForm` | `src/components/person/AddRelativeForm.tsx` | Related person + primitive relationship |
| `ConflictWarning` | `src/components/person/ConflictWarning.tsx` | Relationship conflict explanation |
| `PersonPhotos` | `src/components/photos/PersonPhotos.tsx` | Upload, metadata, primary, timeline, deletion |
| `SearchPanel` | `src/components/search/SearchPanel.tsx` | Search/filter/voice/results/workspace actions |
| `RegionSelector` | `src/components/region/RegionSelector.tsx` | Dialect/region setting |
| `ClaimFlow` | `src/components/claim/ClaimFlow.tsx` | Send and verify claim code |
| `DeletionDialog` | `src/components/deletion/DeletionDialog.tsx` | Cascade vs neighbor-preservation choice |

These are product-sensitive; check privacy, deletion, relationship, region,
claim, and living-person requirements before changing visible information or
choice framing.

## Guidance, onboarding, support, and admin

| Component | Source | Responsibility |
|---|---|---|
| `OnboardingModal` | `src/components/onboarding/OnboardingModal.tsx` | New-tree illustrated carousel |
| `TreeWorkspaceTour` | `src/components/onboarding/TreeWorkspaceTour.tsx` | Five-step graph spotlight tour |
| `HelpGuide` | `src/components/help/HelpGuide.tsx` | Help title, contents, topic sections |
| `HelpNav` | `src/components/help/HelpNav.tsx` | Anchor table of contents |
| `HelpSection` | `src/components/help/HelpSection.tsx` | Numbered help section |
| `HelpEntryPoint` | `src/components/help/HelpEntryPoint.tsx` | Menu link into help |
| `SupportFeedbackSection` | `src/components/support/SupportFeedbackSection.tsx` | Support QR + feedback form composition |
| `AdminFeedbackActions` | `src/components/admin/AdminFeedbackActions.tsx` | Admin feedback status controls |

Help copy lives in `src/content/help/helpTopics.ts`. Prototype fixtures live
under `src/lib/prototype/` and must never be imported by production code.

## Style ownership

| Area | Primary selectors/files |
|---|---|
| Landing | `.home-*`, `.home-steps`, `.eyebrow`, `.double-bezel-*`; `_02`, `_03` |
| Lists/empty | `.tree-list-*`, `.empty-tree`, `.onboarding-strip`, `.center-state`; `_02` |
| Workspace | `.tree-workspace*`, `.tree-page-header*`, `.side-panel*`; `_03` |
| Search | `.search-panel-toolbar*`, `.search-*`, filter/result classes; `_03` + inline TSX |
| Public header | `.app-header`, `.app-nav*`, `.hamburger-menu*`; `_05`, `_07` |
| In-app nav | `.inapp-*`, `.global-sidebar*`, `.mobile-top-bar`; `_07` |
| Forms/buttons | global `button`, `.btn*`, `.field*`, `.double-bezel-wrapper`; `_04`, `_08` |
| Auth/modal/tour | `.auth-*`, `.settings-modal*`, `.onboarding-*`, `.tree-tour*`; `_08` |
| Photos | `.photo-*`; `_06` |
| Graph | `.tree-graph*`, `.edge-*`, `.person-info*`; `graph.css` |
| Support/admin | `.support-feedback*`, `.admin-*`; `_10` |

## High-risk shared changes

| Changing… | Also inspect… |
|---|---|
| global button/input rules | Every form, graph/sidebar controls, modal closes, 200% reflow |
| theme variables | dark modes, graph gender colors, status surfaces, legal pages |
| `main` / `.inapp-content` | landing/list/help/support/admin + tree no-padding exception |
| sidebar width/breakpoint | canvas, floating toolbar, mobile tour, every in-app page |
| `Person` / `Relationship` shape | nodes, forms, search, photos, prototype mocks |
| page copy/classes/labels/test IDs | prototype mirror + Playwright assertions |
| modal primitive | settings, collaboration, deletion, confirm, create-tree, onboarding |
