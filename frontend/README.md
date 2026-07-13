# Cây Gia Phả — Frontend (Next.js)

Next.js (React + TypeScript, App Router) frontend for the Vietnamese Family Tree
application. This is the production-priority full-stack runtime: it renders the
product and implements the active `/api/v1` Route Handlers, TypeScript domain
services, authorization, and PostgreSQL persistence through Drizzle ORM.

The active business contract is email/Google registration, legacy-phone sign-in/recovery
compatibility, explicit multi-tree scoping, and Owner/Contributor/Linked/Reader capabilities. Do
not derive an active tree from the session or the first owned tree; every tree operation must carry
and authorize its target `treeId`.

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Next.js Route Handlers** — active server-side API under `src/app/api/v1`
- **Drizzle ORM + PostgreSQL** — active persistence path
- **API client layer** — `src/lib/apiClient.ts` (same-origin `/api/v1`, session
  cookie via `credentials: "include"`, typed error envelope)
- **Session handling** — `src/lib/session.ts` + `src/app/providers.tsx`
  (`SessionProvider` / `useSession`); the session token stays in an HttpOnly cookie
- **Component test runner** — Vitest + Testing Library (jsdom)
- **Property-based testing** — fast-check (in the test scope)

## Getting started

```bash
pnpm install
pnpm run dev        # http://localhost:3000
```

Use `.env.development` and `.env.production` for environment-specific configuration. The Spring
Boot module is disabled by default and is not required for the normal frontend development loop.

## Scripts

| Script | Purpose |
|---|---|
| `pnpm run dev` | Start the dev server |
| `pnpm run build` | Production build |
| `pnpm run typecheck` | TypeScript check (no emit) |
| `pnpm test` | Run Vitest (unit + component + property tests) once |
| `pnpm run lint` | Next.js ESLint |

## Layout

```
src/
  app/            # Pages, Route Handlers, root layout, session provider
  components/     # Reusable UI components
  lib/            # API client, session helpers, test support
```

## UI design context

Before changing a page, component, layout, or style, start with
[`docs/ui/README.md`](docs/ui/README.md). The companion
[`docs/ui/INDEX.md`](docs/ui/INDEX.md) maps routes to
components/styles/prototypes, and
[`docs/ui/AUDIT.md`](docs/ui/AUDIT.md) preserves the original audit snapshot and a post-audit
revalidation table. Recheck a finding against current code before turning it into a task.

The Requirement 1–26 runtime status is maintained in
[`../.kiro/specs/vietnamese-family-tree/conformance.md`](../.kiro/specs/vietnamese-family-tree/conformance.md).
