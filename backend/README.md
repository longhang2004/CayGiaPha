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

## How to run (Docker)

From `backend/`:

```bash
docker compose up -d --build
```

MinIO object storage is opt-in (`--profile storage`) so the API can boot without that image. If the API image cannot build (nested overlay/Docker-in-Docker), start only Postgres and Redis and run the JAR on the host as below.

Wait until `caygiapha-api` is healthy, then:

```bash
curl -s http://localhost:8080/actuator/health
curl -s http://localhost:8080/api/v1/platform/architecture
```

Demo login (local seed only):

- Email: `seed@caygiapha.local`
- Password: `SeedFamily-2026!`

```bash
curl -s -X POST http://localhost:8080/api/v1/platform/auth/token \
  -H 'Content-Type: application/json' \
  -d '{"email":"seed@caygiapha.local","password":"SeedFamily-2026!"}'
```

Use the returned Bearer token on `/api/v1/**`. Session cookies remain the
product auth story.

Stop:

```bash
docker compose down
```

## How to run (host JAR + compose infra)

```bash
docker compose up -d db redis
mvn -DskipTests package
SPRING_PROFILES_ACTIVE=local \
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/familytree \
SPRING_DATASOURCE_USERNAME=familytree \
SPRING_DATASOURCE_PASSWORD=familytree \
APP_DEMO_SEED=true \
java -jar target/family-tree-api-0.0.1-SNAPSHOT.jar
```

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
