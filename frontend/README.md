# Cây Gia Phả — Frontend (Next.js)

Next.js (React + TypeScript, App Router) frontend for the Vietnamese Family Tree
application. It renders the relationship graph, handles viewpoint switching,
search/filter UI, the in-app help system, and accessibility features, and talks
to the Spring Boot REST API.

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **API client layer** — `src/lib/apiClient.ts` (same-origin `/api/v1`, session
  cookie via `credentials: "include"`, typed error envelope)
- **Session handling** — `src/lib/session.ts` + `src/app/providers.tsx`
  (`SessionProvider` / `useSession`); the session token stays in an HttpOnly cookie
- **Component test runner** — Vitest + Testing Library (jsdom)
- **Property-based testing** — fast-check (in the test scope)

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000  (proxies /api/* to the backend)
```

Set the backend URL for the dev proxy (defaults to `http://localhost:8080`):

```bash
cp .env.local.example .env.local
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check (no emit) |
| `npm test` | Run Vitest (unit + component + property tests) once |
| `npm run lint` | Next.js ESLint |

## Layout

```
src/
  app/            # App Router routes, root layout, session provider
  components/     # Reusable UI components
  lib/            # API client, session helpers, test support
```

## UI design context

Before changing a page, component, layout, or style, start with
[`docs/ui/README.md`](docs/ui/README.md). The companion
[`docs/ui/INDEX.md`](docs/ui/INDEX.md) maps routes to
components/styles/prototypes, and
[`docs/ui/AUDIT.md`](docs/ui/AUDIT.md) records the current improvement backlog.
