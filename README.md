# Cây Gia Phả (Vietnamese Family Tree)

A comprehensive, state-of-the-art web application for constructing, managing, and visualizing family trees (genealogy) tailored to Vietnamese traditions and dialects. 

The system is built with strict privacy controls, regional kinship dialect resolution, and high-performance property-based tests.

---

## 🚀 Key Features

* **Kinship Resolver (Vietnamese Kinship Dialect Support)**: 
  * Resolves relationship paths (shortest path via BFS) from a selected viewpoint (Ego) to any node.
  * Formulates proper forms of address based on Vietnamese traditions (e.g., *bác, chú, cô, dì, cậu, anh, chị, em, cháu*).
  * Automatically switches terms based on birth order, birth years, and parent lineages (paternal vs. maternal).
  * Dynamic regional dialect settings supporting Northern (Bắc), Central (Trung), and Southern (Nam) Vietnamese terms.
* **Graph Store & Asserted vs. Derived Relationships**:
  * Visualizes direct parent-child/spouse relationships as **derived** (solid lines).
  * Supports custom, non-standard relationship descriptions as **asserted** (dashed lines).
  * Automatic conflict detection and warning system when a new bloodline edge forms a path that differs from an existing asserted relationship.
* **Tree-Level Sharing & Gated Privacy**:
  * Tree sharing via secure, hashed tokens.
  * Sensitive field visibility controls (individual settings for name, birth year, and photos).
  * **Living-Person Protection**: Automatic redaction of living individuals' details for non-privileged viewers.
* **Secure Image Storage (Cloudinary/MinIO/Filesystem)**:
  * Upload profile photos with automatic metadata/EXIF/geolocation stripping.
  * Agnostic storage service backing, featuring built-in support for **Cloudinary**, **MinIO (S3-compatible)**, and local filesystem caching.
* **Safety & Compliance**:
  * Two-phase node deletion (Cascade vs. Neighbor-Preservation modes).
  * Password and Google authentication with hashed password verifiers, server-side identity
    verification, HttpOnly sessions, claim-code controls, and rate limiting. Password-recovery UI
    exists but its active Next.js Route Handlers are still pending.
  * Full audit logs for security mutations and rate-limiting to prevent abuse.
  * Terms of Service & Privacy Policy acceptance gates.
* **Accessibility (WCAG 2.1)**:
  * Full keyboard-only navigation support.
  * Custom text scaling (100–200%) without content or functional loss.
  * Accessible high-contrast color scheme (≥ 4.5:1 ratio).

---

## 🛠️ Technology Stack

### Active application
* **Next.js 14** (App Router and Route Handlers), **React 18**, and **TypeScript**
* **Drizzle ORM** and **PostgreSQL**
* Global **SCSS/CSS** design system (no Tailwind)
* **Vitest**, Testing Library, Playwright, axe-core, and fast-check
* Google Identity, Cloudinary-compatible object storage, and Redis-compatible rate limiting where configured

### Reference backend
* **Java 21** and **Spring Boot 3.3.5**, Hibernate/JPA, Flyway, jqwik, JUnit 5, and Testcontainers
* Retained for domain reference and future synchronization; disabled by default (`USE_BACKEND=false`)
* Implement active behavior and schema changes in the Next.js application first, then mirror
  forward migrations to the Java module when required

---

## ⚙️ Configuration & Environment Variables

Runtime configuration is managed by the frontend environment files. For example, a Cloudinary
deployment uses:

```env
APP_STORAGE_TYPE=cloudinary
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

To run the application locally or inspect the reference module, consult:
* [Frontend README](frontend/README.md)
* [Reference backend module](backend/pom.xml)

---

## 🧪 Testing and Verification

To verify that the system works correctly, execute the following commands in their respective directories:

### Backend Tests
```bash
cd backend
mvn test
```

### Active application checks
```bash
cd frontend
pnpm run typecheck
pnpm test
pnpm run lint
pnpm run build
```
