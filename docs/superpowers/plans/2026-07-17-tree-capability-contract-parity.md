# Tree Capability Contract Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the deployed tree workspace from crashing when a runtime omits capability fields, and make the Spring and Next.js tree-detail responses expose the same server-authoritative capability contract.

**Architecture:** Normalize the untrusted tree-detail payload once at the React network boundary, preserving a complete `Capabilities` object whose missing or malformed fields are always `false`. Independently bring the optional Spring runtime into parity by classifying tree access and serializing top-level and per-person capabilities; the client never derives permissions from role labels.

**Tech Stack:** TypeScript, React 18, Vitest, Testing Library, Java 21, Spring Boot 3.3.5, JUnit 5, Mockito, AssertJ.

## Global Constraints

- Preserve server-authoritative Owner, Contributor, Linked, Reader, and None capability checks.
- Missing or malformed permission data must fail closed; client role labels never grant permissions.
- Do not change database schemas, REST paths, privacy projection, or mutation authorization.
- Do not add dependencies.
- Use TDD and run frontend and backend regression checks before completion.

---

### Task 1: Frontend tree-response boundary

**Files:**
- Create: `frontend/src/components/tree-page/treeDetailPayload.ts`
- Create: `frontend/src/components/tree-page/treeDetailPayload.test.ts`
- Create: `frontend/src/components/tree-page/useTreePageState.test.tsx`
- Modify: `frontend/src/components/tree-page/useTreePageState.ts`

**Interfaces:**
- Consumes: the unknown JSON returned by `GET /api/v1/trees/:treeId` and existing `Person`, `Relationship`, `Region`, `TreeAccessRole`, and `Capabilities` types.
- Produces: `normalizeTreeDetailPayload(value: unknown): TreeDetailPayload`, with complete fail-closed top-level and per-person capabilities.

- [x] **Step 1: Write failing pure normalization tests**

Cover a complete payload, a legacy Spring payload without `accessRole` or capabilities, a partial/malformed capability object, and invalid non-array graph collections. Assert that only literal `true` grants a capability and invalid structural payloads throw before state is mutated.

- [x] **Step 2: Write the failing hook regression test**

Mock `api.get` with the legacy Spring tree response and render `useTreePageState("tree-1", null)`. Assert loading completes without a render exception, `capabilities.editContent` is `false`, every person has complete false capabilities, and the tree data remains visible.

- [x] **Step 3: Run tests to verify the production failure**

Run:

```bash
pnpm vitest run src/components/tree-page/treeDetailPayload.test.ts src/components/tree-page/useTreePageState.test.tsx
```

Expected: FAIL because the normalizer does not exist and the current hook stores `undefined` capabilities.

- [x] **Step 4: Implement the fail-closed normalizer**

Define all seven capability keys once. Normalize each key with `source[key] === true`, validate `persons` and `relationships` as arrays of objects, normalize each person's capability object, accept only known roles and regions, default missing role to `NONE`, living-redaction to `true`, sharing to `private`, and name to `Cây Gia Phả`.

- [x] **Step 5: Normalize before committing React state**

Change the request generic to `unknown`, call `normalizeTreeDetailPayload` before any setter, and set all tree state only from the normalized object. Keep the existing generic user-facing error path for structurally invalid responses.

- [x] **Step 6: Run the targeted frontend tests**

Run:

```bash
pnpm vitest run src/components/tree-page/treeDetailPayload.test.ts src/components/tree-page/useTreePageState.test.tsx src/components/tree-page/TreePageCapabilities.test.tsx
```

Expected: PASS.

### Task 2: Spring tree-detail capability parity

**Files:**
- Create: `backend/src/main/java/com/caygiapha/familytree/security/TreeAccessRole.java`
- Create: `backend/src/main/java/com/caygiapha/familytree/security/CapabilitySet.java`
- Create: `backend/src/test/java/com/caygiapha/familytree/security/CapabilitySetTest.java`
- Create: `backend/src/test/java/com/caygiapha/familytree/controller/TreeControllerTest.java`
- Modify: `backend/src/main/java/com/caygiapha/familytree/security/AuthorizationService.java`
- Modify: `backend/src/main/java/com/caygiapha/familytree/dto/TreeDetailResponse.java`
- Modify: `backend/src/main/java/com/caygiapha/familytree/controller/TreeController.java`
- Modify: `backend/src/test/java/com/caygiapha/familytree/security/AuthorizationServiceTest.java`

**Interfaces:**
- Consumes: `AuthorizationService.Role`, authenticated tree ownership, collaboration, claims, and sharing access.
- Produces: `TreeAccessRole` values `OWNER`, `CONTRIBUTOR`, `LINKED`, `READER`, `NONE`; `CapabilitySet.forTreeRole(TreeAccessRole)`; `CapabilitySet.forPersonRole(AuthorizationService.Role)`; and Spring JSON fields matching the active Next.js response.

- [x] **Step 1: Write failing capability-matrix tests**

Assert exact seven-boolean mappings: Owner receives all capabilities; Contributor receives content, relationship, and photo editing; Linked receives no tree-level mutations but receives content, photo, and visibility editing for its own person; Reader/None receive no capabilities.

- [x] **Step 2: Write failing tree-access classification tests**

Extend `AuthorizationServiceTest` for owner, contributor, linked-to-tree, admitted reader, and anonymous/denied callers. The method under test is `classifyTreeAccess(UUID treeId, String shareToken)` and must incorporate actual read access before returning `READER`.

- [x] **Step 3: Write the failing controller contract test**

Instantiate `TreeController` with mocked collaborators/repositories/services. Assert `read` returns top-level `accessRole` and `capabilities`, and every projected `PersonItem` includes the role-specific capability object while retaining privacy projection.

- [x] **Step 4: Run tests to verify the Spring contract gap**

Run:

```bash
mvn -Dtest=CapabilitySetTest,AuthorizationServiceTest,TreeControllerTest test
```

Expected: FAIL because the role/capability DTO fields and mappings do not yet exist.

- [x] **Step 5: Implement shared Spring role and capability mappings**

Add immutable enums/records and `classifyTreeAccess`. Keep existing mutation `Role` semantics unchanged; do not make a Reader or tree-level Linked user pass mutation checks.

- [x] **Step 6: Extend and populate `TreeDetailResponse`**

Serialize `accessRole` and `capabilities` at tree level and `capabilities` for each `PersonItem`. Compute values from the same authorization service roles already used for privacy projection.

- [x] **Step 7: Run targeted backend tests**

Run:

```bash
mvn -Dtest=CapabilitySetTest,AuthorizationServiceTest,TreeControllerTest test
```

Expected: PASS.

### Task 3: Cross-runtime regression verification

**Files:**
- Modify if durable evidence is discovered: `.agents/memory.md`

**Interfaces:**
- Consumes: both tree-detail implementations and the normalized React state invariant.
- Produces: evidence that missing fields cannot crash the page and both deployed routing modes compile and preserve authorization behavior.

- [x] **Step 1: Run the full frontend suite and static checks**

```bash
pnpm run typecheck
pnpm test
pnpm run lint
pnpm run build
```

Expected: all commands pass.

- [x] **Step 2: Build with the proxy routing mode enabled**

```bash
USE_BACKEND=true BACKEND_API_URL=http://localhost:8080 pnpm run build
```

Expected: build passes and the rewrite configuration remains valid.

- [x] **Step 3: Run the full Spring suite**

```bash
mvn test
```

Expected: all unit, integration, and property tests pass; environment-only Docker failures must be reported separately rather than hidden.

- [x] **Step 4: Review the final diff and whitespace**

```bash
git diff --check
git status --short
```

Expected: no whitespace errors and only intended files changed.

### Task 4: Review hardening

**Files:**
- Modify: `frontend/src/components/tree-page/treeDetailPayload.ts`
- Modify: `frontend/src/components/tree-page/treeDetailPayload.test.ts`
- Modify: `frontend/src/components/tree-page/useTreePageState.ts`
- Modify: `frontend/src/components/tree-page/useTreePageState.test.tsx`
- Modify: `frontend/src/app/api/v1/trees/[treeId]/route.ts`
- Modify: `frontend/src/app/api/v1/trees/[treeId]/route.test.ts`
- Modify: `frontend/src/lib/services/authorization.test.ts`
- Modify: `backend/src/test/java/com/caygiapha/familytree/security/AuthorizationServiceTest.java`
- Modify: `backend/src/test/java/com/caygiapha/familytree/controller/TreeControllerTest.java`

- [x] **Step 1: Reject object-shaped graph rows that omit required identifiers or domain fields**

- [x] **Step 2: Fail closed while switching trees and ignore stale out-of-order responses**

- [x] **Step 3: Gate client owner/contributor behavior from capabilities, not role labels**

- [x] **Step 4: Pass share tokens into Next role classification and cover authenticated link readers in both runtimes**

- [x] **Step 5: Assert exact seven-field capability matrices and Spring JSON serialization**

- [x] **Step 6: Repeat broad verification after review fixes**

## Self-Review

- Spec coverage: preserves the server-provided capability requirement and all four product roles.
- Placeholder scan: no deferred implementation or unspecified error handling remains.
- Type consistency: frontend and Spring expose the same seven capability property names and the same five tree access-role strings.
