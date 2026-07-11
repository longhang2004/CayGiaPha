# PO/BA Design Decision: CGP-GUIDE-001

Decision: APPROVED

Date: 2026-07-11  
Reviewer: PO/BA  
Reviewed artifacts: `design-package.md` version 1.0 and all four visual references in this directory.

## Approval scope

The proposed architecture is approved for orchestration and engineering planning:

- Help is the canonical content source; overview, checklist and contextual guidance use stable
  `topicId` and excerpt references rather than independent copy.
- The first-visit experience is non-blocking and replaces the automatic modal/linear tour with an
  inline overview, a role/state-aware checklist and small contextual notes.
- Checklist completion is driven by confirmed product outcomes. Opening or dismissing guidance
  never completes a task.
- Skip, hide, dismiss, complete, reopen and topic-version changes remain separate states.
- Role and permission gates, target recovery, responsive behavior, accessibility requirements and
  privacy-safe telemetry restrictions are approved as specified.
- Phase 1/Phase 2 boundaries, explicit exclusions and the prototype synchronization map are
  approved.
- Vietnamese copy and terminology are approved as the implementation baseline. Engineering must
  preserve canonical ownership and must not create new product claims at call sites.

## Resolved product decisions

1. **Guide-state scope for Phase 1:** device-local. Cross-device synchronization is deferred. When
   an outcome can be derived from active product state, that product state remains authoritative so
   a user is not asked to repeat already completed work. Device-local guidance state must contain no
   family content or private identifiers.
2. **Conditional capabilities:** events/reminders and person-node claiming remain excluded and
   unpublished until separate PO/BA approval backed by active Next.js end-to-end runtime evidence.
   Account display-name guidance follows the same gate until that feature is separately approved and
   verified.
3. **Analytics and retention:** approve the event taxonomy as a contract only. No event emission,
   substitute console logging or server logging may be implemented until a privacy-approved provider,
   retention period and access policy are recorded in a separate decision. Phase 1 evaluation may use
   privacy-safe moderated usability testing and aggregate test evidence in the meantime.
4. **Content review cadence:** approved. Review affected topics at every relevant feature release and
   perform a quarterly eligibility/content audit. PO/BA owns product truth and publication status;
   Design owns clarity and hierarchy; Engineering supplies runtime evidence.
5. **Checklist role variants:** approved. Reader/non-editor roles must never see create/edit tasks;
   permission-denied states must not reveal unavailable actions; collaborator tasks appear only when
   the active permission and current tree state make them actionable.

## Engineering gates

- Treat the visual artifacts as interaction/hierarchy references, not permission to redesign the
  application shell, graph, navigation or Help visual language.
- A mobile bottom sheet must remain modeless: no scrim, no focus trap, Escape/close support, focus
  restoration, and the underlying task must remain recoverable without completing the guide.
- Do not publish conditional topics merely because their records exist in the canonical registry.
- Do not add analytics dependencies or telemetry emission under this task.
- Production and prototype surfaces must be updated together; guidance prototypes must use fictional,
  deterministic data and make no real upcoming-events or authenticated API request.
- Preserve the repository rule to use standard HTML `<img>` elements.

## Verification required before delivery

- Trace every rendered excerpt to an active canonical Help topic and stable ID.
- Verify eligibility and completion for owner, editable collaborator and reader/non-editor variants.
- Verify first visit, returning incomplete, completed, skipped/hidden, manual reopen and topic-version
  behavior without treating dismissal as completion.
- Verify target present, relocated, offscreen, disabled, absent and permission-ineligible fallbacks.
- Verify keyboard/focus restoration, screen-reader naming and announcements, 44px minimum/48px target,
  reduced motion and 200% text scaling.
- Verify 1280×800, 768×1024 and 375×667 production/prototype states without overflow, blocked primary
  actions or layout shift.
- Verify Help deep linking and safe return without persisting or emitting private URLs or identifiers.
- Verify conditional and prohibited capabilities do not appear in overview, checklist, contextual
  guidance, Help navigation or search/discovery surfaces.

No Design Revision Prompt is required. The design gate is closed as APPROVED; Orchestrator may now
produce the implementation plan subject to the engineering gates above.
