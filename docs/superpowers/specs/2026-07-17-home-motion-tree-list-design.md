# Home motion and editorial tree list design

## Scope

This follow-up polishes four existing surfaces without changing APIs, persistence, privacy, or tree capabilities:

1. Repair FAQ alignment and wrapping at desktop, tablet, mobile, and 200% text scale.
2. Reveal homepage sections as they enter the viewport, with a no-motion fallback.
3. Clarify the cross-links between sign-in and sign-up in production and prototype flows.
4. Reformat `/tree` and `/prototype/tree-list` as an editorial index while preserving create, join, open, delete, welcome, and checklist behavior.

## Homepage interaction

- FAQ questions remain left aligned. The trailing plus/minus icon owns a fixed area and never participates in text centering or wrapping.
- FAQ answers continue to animate with the existing grid-row and opacity transition.
- A client-only `HomeScrollReveal` observer marks each `.home-reveal` element visible once it intersects the viewport. The page remains fully visible when JavaScript or `IntersectionObserver` is unavailable.
- Motion uses opacity and CSS `translate`; it does not compete with card hover transforms.
- `prefers-reduced-motion: reduce` bypasses all reveal movement.

## Authentication copy

- Sign-in footer: `Chưa có tài khoản? Đăng ký ngay!`
- Sign-up footer: `Đã có tài khoản? Đăng nhập ngay!`
- Existing redirect and invitation query parameters remain unchanged.
- Prototype mirrors use the same copy.

## Tree list composition

- Keep the heading `Cây gia phả của bạn` and the existing `+ Thêm cây` entry point.
- Add a truthful count summary derived from the loaded list.
- Render trees as numbered editorial rows rather than generic dashboard cards.
- Each row contains the index, tree name, role, regional dialect, primary `Xem sơ đồ` action, and owner-only `Xóa` action.
- The delete action is visually secondary but remains explicit and keyboard accessible.
- Mobile stacks each row without horizontal overflow and keeps actions at least 48px high.
- The empty state uses the same editorial surface and retains `GuidanceChecklist` unchanged.
- Loading, error, modal, welcome dialog, create/join callbacks, routing, and delete confirmation retain their current behavior.

## Verification

- Unit tests cover FAQ alignment hooks, scroll-observer lifecycle and fallback, and auth copy with preserved destinations.
- Playwright covers homepage FAQ/reveal behavior and tree-list populated/empty states at 375×667, 768×1024, and 1280×800, plus representative 200% text scale.
- Production and prototype mirrors must remain synchronized.
