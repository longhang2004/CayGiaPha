# Java portfolio API (reference / showcase)

The **active product** is the Next.js application. This Spring Boot module is a
runnable **portfolio-grade reference API** that implements the same Vietnamese
family-tree domain: primitive parent-child and spouse edges, derived kinship,
living-person redaction, tree authorization, and hashed verification codes.

It is designed to read well in a Middle Backend Developer interview. Recruiters
in Vietnam and internationally (2025-2026 listings at ITviec, CareerViet, plus
hexagonal Java roles at Tekion/Uplers-style shops) repeatedly ask for:

- Java 21 + Spring Boot 3
- Spring Security / JWT
- JPA + PostgreSQL + Flyway
- Redis
- OpenAPI
- Micrometer / Prometheus
- Hexagonal or clean architecture
- Testcontainers + JUnit 5
- Resilience4j
- Event-driven writes (outbox)

This module implements those as **one coherent modular hexagonal monolith**,
not a grab-bag of disconnected libraries.

## What reviewers should look at

| Topic | Where |
|---|---|
| Architecture decision | [`docs/adr/0001-hexagonal-modular-monolith.md`](docs/adr/0001-hexagonal-modular-monolith.md) |
| Bounded-context ports | `src/main/java/com/caygiapha/familytree/hexagon/` |
| Transactional outbox | `platform/outbox/` + Flyway `V28` |
| JWT + session cookie dual auth | `security/AuthenticationFilter` + `platform/security/` |
| Kinship invariants | existing `KinshipResolver` + jqwik `*Properties` |
| Living-person privacy | `LivingPersonPolicy` + hexagonal privacy use case |
| Demo family seed | `demo/DemoFamilySeedRunner` (gated by `app.demo.seed`) |
| OpenAPI | `http://localhost:8080/api/v1/docs` |
| Metrics | `http://localhost:8080/actuator/prometheus` |

Product contracts (`/api/v1/auth`, trees, persons, relationships) stay on the
existing `ErrorResponse` envelope so the Next.js client is not broken. RFC 7807
Problem Details is offered when the client sends `Accept: application/problem+json`.

## How to run (verified: host JAR)

This is the path verified on 2026-09-19 against Java 21, Maven, PostgreSQL 16,
and Redis 7 on localhost (`SPRING_PROFILES_ACTIVE=local`, `APP_DEMO_SEED=true`).

Postgres and Redis can be host installs **or** Compose services if the Docker
daemon can start containers. Then:

```bash
cd backend
mvn -DskipTests package
SPRING_PROFILES_ACTIVE=local \
SPRING_DATASOURCE_URL=jdbc:postgresql://127.0.0.1:5432/familytree \
SPRING_DATASOURCE_USERNAME=familytree \
SPRING_DATASOURCE_PASSWORD=familytree \
APP_DEMO_SEED=true \
java -jar target/family-tree-api-0.0.1-SNAPSHOT.jar
```

Create the `familytree` role/database first if you are using a host Postgres
(user/password/db `familytree`). Flyway applies V1–V28 on boot.

## How to run (Docker Compose)

From `backend/`, when the daemon can create overlay containers:

```bash
docker compose up -d --build
```

MinIO object storage is opt-in (`--profile storage`) so the API can boot without
that image. Infra only:

```bash
docker compose up -d db redis
```

Nested Docker / overlayfs environments often cannot start Compose containers
(`overlay ... err: invalid argument`). Use the host JAR path above instead.

Wait until the API is healthy, then run the smoke checks.

Stop Compose (keeps the named volume):

```bash
docker compose down
```

## Smoke checks

```bash
curl -s http://127.0.0.1:8080/actuator/health
curl -s http://127.0.0.1:8080/api/v1/health
curl -s http://127.0.0.1:8080/api/v1/platform/architecture
```

Demo login (local seed only; never a production secret):

- Email: `seed@caygiapha.local`
- Password: `SeedFamily-2026!`

```bash
curl -s -X POST http://127.0.0.1:8080/api/v1/platform/auth/token \
  -H 'Content-Type: application/json' \
  -d '{"email":"seed@caygiapha.local","password":"SeedFamily-2026!"}'
```

Use the returned Bearer token on `/api/v1/**`. Session cookies remain the
product auth story.

Verified against that seed (2026-09-19):

- `GET /api/v1/trees` lists `Họ Nguyễn - Chi Hà Nội` (region `Bac`, 8 people)
- `GET /api/v1/platform/trees/{treeId}/kinship/{egoId}` resolves 7 addresses
- Redis keys `kinship:addresses:*` are written, then evicted on graph mutation
- `POST /api/v1/persons` and `POST /api/v1/relationships` return 201
- Relationship writes append a published `graph.mutated` row to `domain_outbox`
- OpenAPI: `http://127.0.0.1:8080/api/v1/docs` (`/api/v1/openapi` is 3.0.1)

The seed runner talks to repositories directly, so `domain_outbox` stays empty
until an API graph mutation. Idempotency replay needs header `Idempotency-Key`.

## Known local gaps

- `V16__allow_multiple_trees_and_tree_name.sql` drops `trees_owner_user_id_key`
  but the V1 constraint is named `uq_trees_owner`. A database migrated from V1
  still has `UNIQUE (owner_user_id)`, so `POST /api/v1/trees` for the seed user
  returns HTTP 500 (`INTERNAL_ERROR`) instead of a second tree. Person and
  relationship writes on the existing tree succeed.
- Compose `api` / `db` / `redis` images are the reviewer path on a normal Docker
  host. They were not startable in the overlayfs nested-Docker VM used for the
  2026-09-19 check.

## Tests

```bash
mvn test
```

Integration tests that need Docker are tagged `integration` and skip when the
daemon is unavailable. Kinship graph invariants live in jqwik property tests.

## Privacy and logging

- Living people are redacted unless the viewer is authorized.
- OTP codes, session tokens, JWT secrets, and private family fields must never
  appear in logs. Structured logging only records correlation ids and action
  names.
