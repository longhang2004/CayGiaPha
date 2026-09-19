# Cây Gia Phả portfolio UI + Java API upgrade

Date: 2026-09-19
Status: Accepted (user authorized end-to-end implementation without further gates)

## Design read

Reading this as: a Vietnamese family-memory product for all ages (including elders),
with a craftsman editorial language, leaning toward a custom SCSS system
(forest paper + lacquer vermillion, Be Vietnam Pro). Not a SaaS dashboard.

Dials: VARIANCE 6 / MOTION 3 / DENSITY 4.

## UI direction

- Cool forest paper (`#eef3ee`) and forest ink (`#14261c`), not beige/brass.
- Lacquer vermillion CTAs (`#b43b16`), high contrast, 48px targets.
- Be Vietnam Pro for Vietnamese diacritics; no Inter, no purple gradient.
- Graph gender: pine (male) vs vermillion (female), plus existing text/shape cues.
- Keep tested HomeLanding copy and `data-testid`s. Prototype pages inherit via shared components.

## Java architecture

Modular hexagonal overlay on the existing layered Spring Boot 3.3.5 / Java 21 API.

- Product path stays Next.js (`USE_BACKEND=false`).
- Product auth stays HttpOnly SESSION + OTP.
- JWT is a parallel API-client credential (`/api/v1/platform/auth/token`).
- Event story is transactional outbox, not a Kafka broker.
- Redis is kinship read-through cache + existing rate limits.
- Privacy: living-person redaction and sensitive-read audit remain fail-closed.

See `backend/docs/adr/0001-hexagonal-modular-monolith.md` and the verified
run/smoke notes in `backend/README.md`. Docker Compose is not the proven path
on nested overlayfs VMs.
