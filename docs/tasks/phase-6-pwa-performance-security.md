# Phase 6 Tasks: PWA Readiness, Performance & Security Hardening Gate

This file tracks the final production hardening tasks for **Phase 6** of the Rallies MVP. This phase ensures the platform meets its core non-functional goals (`docs/01-product-scope.md`): mobile-first PWA readiness (`Serwist`), high performance (`Prisma` pool tuning, Next.js server caching), and deep security (`OWASP ASVS Level 2` baseline, CSP headers, rate limiting).

---

## Task Summary Table

| Task ID | Task Title | Category | Status | Module / Area |
| :--- | :--- | :--- | :--- | :--- |
| **[P6-DEV-01]** | Serwist PWA Integration & App Manifest (`@serwist/next`) | Dev | `[ ]` PENDING | `frontend` |
| **[P6-DEV-02]** | Next.js Server Caching & Edge Optimization | Dev | `[ ]` PENDING | `frontend` |
| **[P6-DEV-03]** | Prisma Query Optimization & Connection Pool Tuning | Dev | `[ ]` PENDING | `backend/prisma` |
| **[P6-DEV-04]** | Content Security Policy (CSP) & Secure HTTP Headers | Dev | `[ ]` PENDING | `frontend` / `backend` |
| **[P6-DEV-05]** | API Rate Limiting & Abuse Protection (`@fastify/rate-limit`) | Dev | `[ ]` PENDING | `backend/plugins` |
| **[P6-REV-01]** | OWASP ASVS Level 2 Security & Audit Review | Review | `[ ]` PENDING | `backend` / `frontend` |
| **[P6-TST-01]** | Performance & Rate Limiting Stress Unit/Integration Tests | Test | `[ ]` PENDING | `backend` |
| **[P6-TST-02]** | Full E2E Playwright Regression Suite across All Phases | Test | `[ ]` PENDING | `frontend/tests/e2e` |
| **[P6-REP-01]** | Production Deployment Readiness Checklist & Repo Lockfile Audit | Repo | `[ ]` PENDING | `docs` / root |

---

## Detailed Task Specifications

### [P6-DEV-01] Serwist PWA Integration & App Manifest (`@serwist/next`)
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `frontend/src/app/sw.ts`, `frontend/next.config.ts`, `frontend/public/manifest.json`
- **Objective**: Configure progressive web app (PWA) functionality ensuring native-app feel on iOS and Android mobile devices.
- **Deliverables & Steps**:
  - `[ ]` Install and configure `@serwist/next` in `next.config.ts` (`withSerwist`).
  - `[ ]` Create `frontend/public/manifest.json`: define `name`, `short_name: "Rallies"`, `theme_color`, `background_color`, `display: "standalone"`, and responsive icon sizes (`192x192`, `512x512`).
  - `[ ]` Create `frontend/src/app/sw.ts` service worker handling offline shell caching (`runtimeCaching` strategies for static assets and public discovery APIs).
- **Acceptance Criteria**:
  - `[ ]` Lighthouse PWA audit score passes with 100/100; app prompts for home-screen installation on mobile browsers.

---

### [P6-DEV-02] Next.js Server Caching & Edge Optimization
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `frontend/src/app/[locale]/(app)/profiles/`, `events/`
- **Objective**: Optimize server rendering performance using Next.js App Router caching rules and streaming boundaries (`<Suspense>`).
- **Deliverables & Steps**:
  - `[ ]` Apply appropriate `revalidate` intervals (`export const revalidate = 60`) on public SEO pages (`/profiles/[slug]`, `/events`).
  - `[ ]` Wrap slow dynamic components (e.g., club roster lists, match history logs) inside React `<Suspense>` boundaries with skeleton loaders (`shadcn/ui` skeletons).
- **Acceptance Criteria**:
  - `[ ]` First Contentful Paint (FCP) $\le 1.2\text{s}$ and Time to First Byte (TTFB) $\le 200\text{ms}$ on public routes.

---

### [P6-DEV-03] Prisma Query Optimization & Connection Pool Tuning
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/infra/db/prisma.ts`, `backend/prisma/schema.prisma`
- **Objective**: Eliminate database bottlenecks and tune PostgreSQL connection pooling (`@prisma/client`) for concurrent scoreboard and discovery traffic.
- **Deliverables & Steps**:
  - `[ ]` Audit repository queries across `profiles`, `clubs`, and `events` to verify `include` / `select` clauses avoid N+1 query loops.
  - `[ ]` Verify database indexes in `schema.prisma`: ensure composite indexes on (`city`, `country`), (`status`), and (`slug`).
  - `[ ]` Configure connection pool parameters (`connection_limit=15&pool_timeout=10`) via `DATABASE_URL` runtime configuration.
- **Acceptance Criteria**:
  - `[ ]` Zero slow queries detected under simulated concurrent API load.

---

### [P6-DEV-04] Content Security Policy (CSP) & Secure HTTP Headers
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `frontend/next.config.ts`, `backend/src/server.ts` (`@fastify/helmet`)
- **Objective**: Enforce strict browser security headers protecting against XSS, clickjacking, and MIME-sniffing injection attacks.
- **Deliverables & Steps**:
  - `[ ]` Register `@fastify/helmet` in `backend/src/server.ts` with secure default configuration.
  - `[ ]` Configure Content Security Policy (`CSP`) headers in `frontend/next.config.ts`:
    - `default-src 'self'`
    - `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.com` (configured strictly for auth/analytics providers)
    - `frame-ancestors 'none'` (or `X-Frame-Options: DENY`)
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- **Acceptance Criteria**:
  - `[ ]` Security header audit (e.g., Mozilla Observatory) rates the platform at grade A/A+.

---

### [P6-DEV-05] API Rate Limiting & Abuse Protection (`@fastify/rate-limit`)
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/plugins/rate-limit.ts`
- **Objective**: Prevent brute-force attacks and denial-of-service abuse against sensitive API endpoints.
- **Deliverables & Steps**:
  - `[ ]` Install and register `@fastify/rate-limit` using Redis backend for distributed rate tracking across server instances.
  - `[ ]` Configure global default rate limit (`max: 100 requests per minute per IP`).
  - `[ ]` Configure strict rate limits on sensitive endpoints:
    - `/api/v1/identity/*` and `/api/v1/support/*`: max 15 requests per minute.
    - `/api/v1/wallet/*` and `/api/v1/webhooks/*`: strict signature/idempotency verification paired with rate limits.
- **Acceptance Criteria**:
  - `[ ]` Exceeding rate limits returns standardized `429 Too Many Requests` response with `Retry-After` headers.

---

### [P6-REV-01] OWASP ASVS Level 2 Security & Audit Review
- **Status**: `[ ]` PENDING
- **Category**: `Review`
- **Module / Area**: `backend/`, `frontend/`
- **Objective**: Perform a comprehensive security review against the **OWASP ASVS Level 2** baseline (`docs/06-security.md`, `docs/project-definition.txt`).
- **Deliverables & Steps**:
  - `[ ]` Verify that all user-supplied inputs are strictly validated against `Zod` schemas with `.strict()` where appropriate.
  - `[ ]` Verify that no JWT secrets, Stripe API keys, or database passwords can be exposed in logs or client bundles.
  - `[ ]` Verify that all sensitive financial (`LedgerEntry`) and administrative (`moderateClub`, `updateTicketStatus`) actions emit structured `Pino` audit logs with correlation IDs (`reqId`).
- **Acceptance Criteria**:
  - `[ ]` Formal security review checklist completed and documented.

---

### [P6-TST-01] Performance & Rate Limiting Stress Unit/Integration Tests
- **Status**: `[ ]` PENDING
- **Category**: `Testing`
- **Module / Area**: `backend/src/plugins/rate-limit.test.ts`
- **Objective**: Verify rate limiting behavior and endpoint resilience under load.
- **Deliverables & Steps**:
  - `[ ]` Write integration test: fire 25 rapid requests against `/api/v1/support/tickets` $\rightarrow$ verify first 15 return HTTP 200/201 and remaining 10 return HTTP 429.
  - `[ ]` Write stress test: verify database query performance under concurrent simulated requests using `Fastify.inject()`.
- **Acceptance Criteria**:
  - `[ ]` All rate limit tests pass reliably.

---

### [P6-TST-02] Full E2E Playwright Regression Suite across All Phases
- **Status**: `[ ]` PENDING
- **Category**: `Testing`
- **Module / Area**: `frontend/tests/e2e/regression.spec.ts`
- **Objective**: Execute automated regression testing across the entire platform before release.
- **Deliverables & Steps**:
  - `[ ]` Run unified Playwright test suite covering:
    1. Auth onboarding & profile setup (`Phase 1`)
    2. Coin purchase & top-bar balance indicator (`Phase 2`)
    3. Club creation, join requests, & event discovery filtering (`Phase 3`)
    4. Scoreboard gameplay, broadcast view, & history save (`Phase 4`)
    5. Support ticket submission & admin moderation action (`Phase 5`)
- **Acceptance Criteria**:
  - `[ ]` 100% E2E regression test pass rate across desktop and mobile viewports.

---

### [P6-REP-01] Production Deployment Readiness Checklist & Repo Lockfile Audit
- **Status**: `[ ]` PENDING
- **Category**: `Repo Update`
- **Module / Area**: `pnpm-lock.yaml`, `docs/`
- **Objective**: Conduct final repository hygiene audit and deployment preparation.
- **Deliverables & Steps**:
  - `[ ]` Run `pnpm audit --prod` and ensure zero high or critical dependency vulnerabilities exist.
  - `[ ]` Verify `pnpm-lock.yaml` and `package.json` are strictly synchronized across all workspaces (`backend`, `frontend`).
  - `[ ]` Ensure production environment variable documentation (`.env.example`) is complete for deployment to staging and production environments (`docs/09-ci-cd.md`).
- **Acceptance Criteria**:
  - `[ ]` Repository is clean, fully verified, and ready for production MVP release.
