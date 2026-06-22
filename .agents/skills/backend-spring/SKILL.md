# Backend Spring Skill

Use this skill for Java, Spring Boot, controller, service, repository, JPA, Flyway, or backend test work.

## Workflow

1. Locate the service/controller/repository with Codegraph or symbol search.
2. Keep controllers thin and put domain rules in services.
3. Match existing error handling through `ApiException`, `ErrorCode`, and `GlobalExceptionHandler`.
4. Add tests near the behavior: service tests for domain logic, controller tests for REST contracts, repository/integration tests for persistence.
5. Run targeted tests when possible, then `mvn test` for broad backend verification.

## Guardrails

- Do not introduce database schema changes without a Flyway migration and tests.
- Do not bypass authorization or privacy services from controllers.
- Keep kinship resolver logic deterministic and testable.
