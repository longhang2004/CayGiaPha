# Kinship Domain Skill

Use this skill for changes to graph relationships, kinship address resolution, asserted-to-derived upgrades, regional dialect terms, or kinship tests.

## Workflow

1. Read the relevant requirement in `.kiro/specs/vietnamese-family-tree/requirements.md`.
2. Inspect the current implementation structurally with Codegraph when available.
3. Identify the invariant being changed or protected.
4. Add or update focused tests. Use property-based tests when the invariant spans many graph shapes or regions.
5. Keep storage primitive: parent-child and spouse edges are persisted; higher-order terms are derived.

## Guardrails

- Do not traverse asserted relationships for derived kinship computation.
- Preserve the distinction between solid derived edges and dashed asserted edges.
- Check behavior for all supported regions: Bắc, Trung, and Nam.
- Preserve cycle prevention and at-most-one father/mother constraints.
