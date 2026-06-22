# Security And Privacy Skill

Use this skill for auth, sessions, OTP, authorization, living-person redaction, audit logs, rate limits, photo metadata, or storage changes.

## Workflow

1. Check the Kiro requirements and design security sections before editing.
2. Identify the protected asset: identity, session, private person data, photo metadata, audit trail, or rate-limit state.
3. Prefer fail-closed behavior for authorization and privacy checks.
4. Add regression tests for denied access, redaction, expiry, lockout, or audit behavior.
5. Verify no secrets, OTP codes, session tokens, or private identifiers are logged.

## Guardrails

- Sessions must remain server-side and cookie-based.
- OTP codes must be short-lived, single-use, hashed at rest, and attempt-limited.
- Living-person data must remain redacted for unauthorized viewers.
- Photo handling must preserve metadata stripping guarantees.
