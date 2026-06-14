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
  * OTP-based authentication (phone/email validation, code hashing, attempt lockouts).
  * Full audit logs for security mutations and rate-limiting to prevent abuse.
  * Terms of Service & Privacy Policy acceptance gates.
* **Accessibility (WCAG 2.1)**:
  * Full keyboard-only navigation support.
  * Custom text scaling (100–200%) without content or functional loss.
  * Accessible high-contrast color scheme (≥ 4.5:1 ratio).

---

## 🛠️ Technology Stack

### Backend
* **Java 21** & **Spring Boot 3.3.5** (REST API)
* **PostgreSQL** & **Hibernate / JPA**
* **Flyway** (database migrations)
* **jqwik** (Property-Based Testing) & **JUnit 5**
* **Testcontainers** (integration testing database isolation)
* **Cloudinary SDK** (object media storage)

### Frontend
* **Next.js 14** (App Router) & **React 18** & **TypeScript**
* **TailwindCSS / Vanilla CSS**
* **Vitest** & **Testing Library (jsdom)**
* **fast-check** (Property-Based Testing for TS helpers)

---

## ⚙️ Configuration & Environment Variables

To switch the application storage provider to **Cloudinary**, configure the following variables in the backend [`.env`](file:///c:/Users/hi/Documents/Non-Backup/CayGiaPha/backend/.env) file:

```env
APP_STORAGE_TYPE=cloudinary
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

To run the application locally or set up databases, consult the module-specific READMEs:
* [Backend README](file:///c:/Users/hi/Documents/Non-Backup/CayGiaPha/backend/pom.xml)
* [Frontend README](file:///c:/Users/hi/Documents/Non-Backup/CayGiaPha/frontend/README.md)

---

## 🧪 Testing and Verification

To verify that the system works correctly, execute the following commands in their respective directories:

### Backend Tests
```bash
cd backend
mvn test
```

### Frontend Tests
```bash
cd frontend
npm test
```
