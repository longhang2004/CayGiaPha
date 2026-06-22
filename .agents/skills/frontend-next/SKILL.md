# Frontend Next Skill

Use this skill for Next.js App Router, React, TypeScript, UI, accessibility, API client, session provider, or frontend test work.

## Workflow

1. Inspect route/component ownership before editing.
2. Preserve App Router patterns and existing API client/session helpers.
3. Keep server/client component boundaries explicit.
4. Add component tests or helper tests for behavior changes.
5. Verify with `npm run typecheck`, `npm test`, and, when relevant, `npm run lint` or `npm run build`.

## Guardrails

- Preserve keyboard navigation, scalable text, and contrast requirements.
- Do not expose private person data client-side unless the API explicitly returns it for the current viewer.
- Keep session tokens in HttpOnly cookies; do not move them into local storage.
