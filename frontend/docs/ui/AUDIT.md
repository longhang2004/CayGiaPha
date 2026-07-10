# Frontend UI/UX audit

Audit date: 2026-07-10

Scope: all production/prototype page TSX, all non-test UI component TSX, global
SCSS, graph CSS, UI assets, layout/providers, relevant Kiro requirements, and
rendered prototypes.

## Executive summary

The frontend already has a recognizable, appropriate visual identity. Warm paper
surfaces, terracotta, Vietnamese typography, a graph-first workspace, and
deliberate accessibility foundations make it stronger than a generic library UI.
The main risk is design-system fragmentation: presentation is split across global
SCSS, graph CSS, and 550 JSX `style` props; some semantic tokens do not exist;
route shells and prototype coverage have drifted; and rendered navigation targets
contradict the intended 48px target.

No production UI was changed during this audit. Recommendations require a
separate approved implementation task.

## Method and evidence

- CodeGraph inventory: 466 indexed repository files; frontend structure mapped
  structurally before source inspection.
- Static scan: 74 non-test TSX files, 4,497 lines of SCSS/CSS, 283 detected class
  hooks, and 550 JSX inline-style attributes.
- Render scan: 9 actual prototype routes at 1280×800, 768×1024, and 375×667
  (27 captures), light theme, reduced motion. All returned 200 without
  console/page errors.
- Automated measurement: viewport overflow, leaf-text clipping, and rendered
  target bounds. Hidden skip links/off-canvas sidebars/screen-reader text and the
  deliberately oversized graph SVG were treated as false positives.
- `pnpm test src/components/a11y`: 29/29 tests passed.
- Prototype Playwright baseline: 9/10 relevant smoke tests passed; the populated
  tree assertion is stale (`Sơ đồ gia phả` expected, `Gia Phả Dòng Họ` rendered).

Limitations: production-only authenticated data states were reviewed in source,
not with private live data. Full screen-reader testing and a complete rendered
dark-theme matrix were not performed.

## What works well

1. **Distinct product fit.** The warm archive/editorial language suits a
   Vietnamese family-history product.
2. **Clear workspace concept.** The tree remains the canvas; commands sit around
   it instead of turning the experience into a card dashboard.
3. **Responsive re-composition.** Landing cards stack, sidebar becomes drawer,
   graph toolbar becomes mobile-oriented, and help remains readable without
   page-level horizontal scroll.
4. **Meaningful state coverage.** Loading, empty tree, selection, search,
   errors, skeletons, toast, confirmation, and onboarding states exist.
5. **Accessibility foundation.** Vietnamese font subset, skip link, named
   controls, focus-visible, rem scaling, 100–200% text provider, reduced-motion
   hooks, and non-color edge styles are sound.
6. **Privacy-aware language.** Living-person protection and field visibility are
   first-class UI concepts.

## P1 — Correct before broad visual expansion

### 1. Semantic CSS token set is incomplete

Used but undefined names include `--color-danger`,
`--color-surface-hover`, `--color-primary`, `--color-background`,
`--color-surface`, `--color-fg-muted`, and `--color-accent-rgb`. Some uses
have fallbacks; many do not. An unresolved custom property invalidates the full
declaration, so errors, badges, hover surfaces, toast accents, form borders, and
event badges can silently lose styling.

Evidence: `FormControls`, `Badge`, `ToastProvider`,
`UpcomingEventsWidget`, `DeletionDialog`, invitation pages, tree
collaboration, `HelpGuide`, `NotificationBell`, and `PersonPhotos`.

Recommendation: define one documented semantic token set in
`_01_variables.scss` for both themes, replace aliases, and add an
undefined-variable check.

### 2. Real navigation targets are below the accessibility floor

Rendered examples include the desktop sidebar collapse button at 26×26, mobile
app hamburger at 28×28, public brand at 44×24, auth/legal links around 18–36px
high, and help contents links around 26px high. Checkbox visuals are 20×20,
although label wrappers can provide a larger target.

The accessibility suite passes because it verifies representative controls and
global rules, not every rendered override. `_07_sidebar_mobile.scss` sets the
sidebar/hamburger minimum size to `auto`, overriding design intent.

Recommendation: separate icon size from hit area, enforce 44×44 minimum
(preferably 48×48), and add route-level Playwright target measurements.

### 3. Landing hero image collapses to a thin strip on desktop

At 1280×800, the full square `public/hero.png` asset is present but only a
narrow strip is visible above feature copy. It renders normally once the card
stacks at tablet/mobile widths. Likely cause: flex-column
`.home-hero__card-inner`, global `height: 100%` on
`.double-bezel-card__inner`, and default image flex shrinking.

Recommendation: make the media region non-shrinking or remove the ambiguous
inherited height, then assert a meaningful desktop image height.

### 4. Route-shell classification creates strange anonymous layouts

`AppLayoutWrapper` only recognizes sign-in/sign-up as auth pages:

- `/forgot-password` gets a full desktop sidebar and lone mobile hamburger.
- Invitation acceptance gets app navigation before the visitor joins/signs in.
- Prototype index/help/empty states inherit app chrome, which can obscure whether
  a mirror's production shell is correct.

Recommendation: use explicit route-group layouts or a central shell map. Treat
auth recovery and invitation acceptance as deliberate focused/public flows.

### 5. Visual modals do not consistently implement dialog behavior

The shared `Modal`, global confirmation, create-tree popup, and some
onboarding/settings surfaces are mainly `div` trees. They do not consistently
provide dialog role, `aria-modal`, labels, focus trap, Escape, initial focus,
scroll lock, or focus restoration.

Recommendation: build one accessible modal primitive and migrate settings,
collaboration, deletion, confirmations, and create-tree. Preserve the exact
required deletion choices.

## P2 — Consolidate in the next UI maintenance pass

### 6. Styling is fragmented across 550 inline style attributes and global CSS

Concentrations include the tree workspace, invitation/legal/settings, auth,
search, graph widgets, and primitives. This makes dark mode, responsive changes,
hover/focus states, and review harder. Some classes are only hooks for inline
styles; others appear to be incomplete styling work.

Recommendation: extract semantic primitives first (modal, field, icon button,
status message, panel, stack), then move page-specific objects into the current
SCSS layers. Do not rewrite the framework.

### 7. Prototype discovery, mirrors, tests, and repo notes have drifted

- Index lists non-existent `/prototype/signin/otp` and
  `/prototype/signup/otp`.
- Index omits existing forgot-password and invitation prototypes.
- Home prototype omits production loading/animation classes and behavior.
- Populated-tree smoke test expects an old H1.
- Older route descriptions map the empty workspace to `tree/page.tsx` instead
  of `tree/[id]/page.tsx`.

Recommendation: create one typed prototype manifest and drive discovery/smoke
tests from it. Keep mock wiring outside mirror blocks.

### 8. Breakpoints and viewport units are inconsistent

The UI uses 1024, 900, 860, 640, 560, 539, and 480px thresholds without named
tokens. Several app-shell, modal, graph, and auth rules use `100vh`; newer ones
use `100dvh`, risking mobile browser-chrome jumps.

Recommendation: define a small breakpoint vocabulary, prefer container queries
for embedded toolbars, and migrate mobile full-height shells to `100dvh` with
fallbacks.

### 9. Global button behavior is broad and heavy

`button`, `.btn`, `[role="button"]`, and `a.button` share
`transition: all 0.7s`; hover scales down to 0.98 and active to 0.95. Components
then use `!important` and auto minimum sizes to undo it.

Recommendation: transition explicit properties for 150–250ms, reserve press
scale for active state, and define primary/secondary/danger/icon/tab/link
contracts.

### 10. Dark-theme maintenance is duplicated and porous

Theme values are duplicated between `html.dark` and the system-dark media
query. Components also use raw light colors and undefined semantic properties.

Recommendation: define theme variables once per theme selector, introduce
semantic status/gender tokens, and add paired light/dark screenshots for landing,
auth, tree, modal, help, and support.

### 11. Support navigation breaks the controlled palette

The animated pink/orange/cyan/blue gradient and glow are louder than the
terracotta archive system and draw more attention than core navigation.

Recommendation: express support with terracotta/warm gold or a quiet illustrated
accent; reserve multicolor animation for intentional campaigns.

## P3 — Product polish

### 12. Landing repeats a conventional equal-three-card pattern

The hero is strong; the equal onboarding cards create a weaker second focal band.
Consider an editorial numbered sequence, asymmetric timeline, or illustrated
process strip while keeping the hero's whitespace.

### 13. Help is readable but dense

Mobile hierarchy is good, but contents links have short targets and much styling
is inline. Improve target height, current-anchor feedback, and content width
without turning every topic into a heavy card.

### 14. Page naming/case and success tone are inconsistent

Examples include `Cây Gia Phả Của Bạn`, `Gia Phả Dòng Họ`, and
`Tạo Cây Gia Phả Mới` alongside sentence case. Define Vietnamese content style:
sentence-case headings/actions, stable product capitalization, direct errors,
and no unnecessary success exclamation marks.

### 15. Graph cues deserve a formal legend

Solid/dashed/non-bloodline edges, gender surfaces, claimed/ego/deceased states,
and branch badges use multiple channels well. A compact dismissible legend or
contextual guide would reduce learning burden for older users and collaborators.

## Page-family notes

| Page family | Strength | Main improvement |
|---|---|---|
| Landing | Strong scale, warm editorial palette, clear CTA | Fix image shrink; reconsider equal cards |
| Sign-in/sign-up | Calm, focused, clear hierarchy | Increase text-link targets; normalize tokens |
| Forgot password | Form matches auth | Move to focused auth shell |
| Tree list | Clear metadata and empty state | Migrate create popup to shared dialog |
| Tree workspace | Strong graph-first concept and mobile island | Unify primitives; 48px controls; legend/dialogs |
| Empty tree | Good guided first action | Verify long-form progress/sticky submit at 200% |
| Invitation | Clear single-decision card | Public shell and stronger heading/status semantics |
| Help | Strong mobile heading/order | Larger anchors, current section, less inline style |
| Support/feedback | Complete QR/attachment states | Core palette and semantic status tokens |
| Settings | Simple theme choices | Shared radio group and clear theme previews |
| Admin | Useful responsive information architecture | Data typography and consistent states/tokens |
| Legal | Public and readable | Extract legal page classes; verify dark |
| Legacy `/login`, `/person` | Useful development remnants | Remove, redirect, protect, or document |

## Recommended sequence

1. Define/normalize semantic tokens and add undefined-token verification.
2. Fix navigation/help/auth target sizes and add rendered bounds tests.
3. Fix landing image shrink and add viewport assertions.
4. Centralize route shells; correct prototype manifest/tests/notes.
5. Implement and migrate to one accessible dialog primitive.
6. Extract repeated inline styles in small page-family batches.
7. Polish support palette, landing process, help navigation, and graph legend.

Keep these as focused changes with their own screenshots/tests. Avoid combining
token, shell, modal, and visual redesign work into one large refactor.
