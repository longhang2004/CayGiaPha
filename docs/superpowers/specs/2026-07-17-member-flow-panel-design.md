# Member flow and Person panel design

Date: 2026-07-17
Status: Approved

## Problem

The old `Thêm người thân` entry mixed two intentions: creating a new Person and connecting people
already present in the tree. It also exposed asserted-label creation beside primitive family
relationships. The person panel represented its screens with several booleans, so Back and Close
could not have stable, distinct meanings. Search lived in the general action drawer instead of next
to the member rows it filtered.

## Interaction model

The workspace now presents two explicit flows:

- `Thêm người mới` starts in the workspace footer. It creates a new Person and one known parent,
  child, or spouse connection to an editable anchor.
- `Cập nhật quan hệ` starts from a Person's information panel. It keeps that Person fixed and adds
  one missing primitive relationship to another existing Person.

The person panel has one state `{ personId: string | null, mode: PersonPanelMode }`, where
`PersonPanelMode` is `view | edit | add-person | update-relationship`. A null `personId` means the
panel is closed. Child modes show Back and Close separately. Back returns to `view` for the same
Person. Close and Escape dismiss the entire panel. Dirty child forms use one discard confirmation;
Back and Close restore focus to their respective opener.

## Form contracts

`AddConnectedPersonForm` selects an anchor with `editRelationships`, preferring the selected Person,
then the viewpoint Person, then the first eligible Person. Natural-language choices map to a pure
primitive relationship payload: father, mother, son, daughter, wife, or husband. Name and relation
stay visible; optional details are progressively disclosed. Submission uses
`POST /trees/{treeId}/relatives`, refreshes the tree, and opens the new Person.

`UpdateRelationshipForm` fixes the viewed Person and chooses a second existing Person. Existing
bloodline or marriage pairs are disabled with an explanation. Asserted or social pairs remain
selectable so the API can upgrade them or return its existing conflict. Submission uses
`POST /relationships` and returns to the original Person view. If no candidate remains, the empty
state can switch to `add-person` with the same anchor.

Asserted creation is intentionally absent from both forms. Existing asserted storage, rendering,
search, upgrade, conflict, and neighbor-preservation behavior remains unchanged.

## Member discovery and actions

Search, voice, filters, and active-filter count sit in fixed chrome above the member list. They
filter projected `persons`, `relationships`, and `addresses` locally by normalized name/address,
gender, side, birth year, living state, claim state, and relationship type. Only the rows scroll.
No query or voice transcript is sent to analytics.

Without active discovery criteria, the list retains `Người thân gần` and `Các thành viên khác`.
With criteria, it shows one `Kết quả` group, count, reset action, and no-match state. The general
action drawer contains only quick guidance, full Help, Settings, and Collaboration when permitted.
Viewpoint change remains in the workspace header.

## Guidance and compatibility

The footer Coach anchor is `workspace-add-person`; member discovery uses `workspace-search` with a
tab fallback; the person chapter targets the edit/update action group. Guidance schema remains 5 so
existing chapter completion is not reset. Help adds `them-nguoi-moi`, describes connecting two
existing people separately, and explains existing dashed edges without teaching asserted creation.

Production and `/prototype/tree` share the same components and state contracts. REST endpoints,
database schema, graph engine, privacy projection, and public product types do not change.
