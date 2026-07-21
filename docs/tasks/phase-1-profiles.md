# Phase 1 Tasks: Profiles Polish & Public Presence

This file tracks the granular implementation tasks for **Phase 1** of the Rallies MVP. The primary goal is establishing robust, privacy-controlled public player profiles and post-signup onboarding.

---

## Task Summary Table

| Task ID | Task Title | Category | Status | Module / Area |
| :--- | :--- | :--- | :--- | :--- |
| **[P1-DEV-01]** | Profile Schemas & Domain Contracts | Dev | `[x]` FINISHED | `backend/profiles` |
| **[P1-DEV-02]** | Profile Repository & Database Queries | Dev | `[x]` FINISHED | `backend/profiles` |
| **[P1-DEV-03]** | Profile Service & Privacy Orchestration | Dev | `[x]` FINISHED | `backend/profiles` |
| **[P1-DEV-04]** | Profile Controller & Route Registration | Dev | `[x]` FINISHED | `backend/profiles` |
| **[P1-DEV-05]** | Frontend Onboarding & Profile Setup Flow | Dev | `[x]` FINISHED | `frontend/profiles` |
| **[P1-DEV-06]** | Public Profile Page & SEO Shell (`/profiles/[slug]`) | Dev | `[x]` FINISHED | `frontend/profiles` |
| **[P1-REV-01]** | Profile Architecture & Privacy Security Review | Review | `[ ]` PENDING | `backend/profiles` |
| **[P1-TST-01]** | Profile Backend Unit & Integration Tests | Test | `[ ]` PENDING | `backend/profiles` |
| **[P1-TST-02]** | Profile E2E Playwright Suite | Test | `[ ]` PENDING | `frontend/profiles` |
| **[P1-REP-01]** | OpenAPI Documentation & Repo Hygiene | Repo | `[ ]` PENDING | `backend` / `docs` |

---

## Detailed Task Specifications

### [P1-DEV-01] Profile Schemas & Domain Contracts
- **Status**: `[x]` FINISHED
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/profiles/profiles.schemas.ts`, `profiles.types.ts`
- **Objective**: Define explicit Zod schemas for all profile endpoints (`getProfileBySlug`, `updateMyProfile`) and domain interfaces before any logic is written.
- **Deliverables & Steps**:
  - `[x]` Define `UpdateProfileRequestSchema` (username, displayName, bio, city, state, country, sportMetadata, visibilitySettings).
  - `[x]` Define `ProfileResponseSchema` ensuring sensitive internal data is excluded.
  - `[x]` Define `ProfileVisibilityEnum` (`PUBLIC`, `MEMBERS_ONLY`, `PRIVATE`) in language-neutral English.
- **Acceptance Criteria**:
  - `[x]` All schemas export `z.infer<>` TypeScript types.
  - `[x]` Zod schemas reject unknown fields (`.strict()`).

---

### [P1-DEV-02] Profile Repository & Database Queries
- **Status**: `[x]` FINISHED
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/profiles/profiles.repository.ts`
- **Objective**: Implement clean, typed database access methods using Prisma ORM without exposing Prisma types directly to the service layer.
- **Deliverables & Steps**:
  - `[x]` Implement `findBySlug(slug: string)` with active profile check (`ProfileStatus.ACTIVE`).
  - `[x]` Implement `findByUserId(userId: string)`.
  - `[x]` Implement `updateByUserId(userId: string, data: UpdateProfileInput)`.
  - `[x]` Ensure slug collision checking logic (`isSlugTaken`).
- **Acceptance Criteria**:
  - `[x]` No raw SQL or un-indexed queries used.
  - `[x]` All repository returns match internal `Profile` domain types.

---

### [P1-DEV-03] Profile Service & Privacy Orchestration
- **Status**: `[x]` FINISHED
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/profiles/profiles.service.ts`
- **Objective**: Implement core profile business rules, username slug sanitization, and strict location privacy filtering.
- **Deliverables & Steps**:
  - `[x]` Implement `getPublicProfileBySlug(slug: string, viewerUserId?: string)`: filter output based on `visibilitySettings`.
  - `[x]` Enforce location privacy rules: output only `city`, `state/region`, and `country`; strip exact addresses if passed.
  - `[x]` Implement `updateMyProfile(userId: string, input: UpdateProfileRequest)` with slug formatting and validation.
- **Acceptance Criteria**:
  - `[x]` Service throws explicit domain errors (`ProfileNotFoundError`, `SlugAlreadyExistsError`) on failures.
  - `[x]` Privacy masking verified: `PRIVATE` profiles return 404/403 for anonymous viewers.

---

### [P1-DEV-04] Profile Controller & Route Registration
- **Status**: `[x]` FINISHED
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/profiles/profiles.controller.ts`, `profiles.routes.ts`
- **Objective**: Create Fastify route handlers with typed Zod validation using `fastify-type-provider-zod`.
- **Deliverables & Steps**:
  - `[x]` Register `GET /api/v1/profiles/:slug` with `schema: { params: GetProfileParamsSchema, response: { 200: ProfileResponseSchema } }`.
  - `[x]` Register `PUT /api/v1/profiles/me` protected by authentication hook (`checkAuth`).
  - `[x]` Ensure `profiles.routes.ts` is exported and linked inside `src/plugins/routes.ts`.
- **Acceptance Criteria**:
  - `[x]` Zero Prisma calls directly inside `profiles.controller.ts`.
  - `[x]` Standardized error response structure returned on HTTP 400, 401, 404.

---

### [P1-DEV-05] Frontend Onboarding & Profile Setup Flow
- **Status**: `[x]` FINISHED
- **Category**: `Development`
- **Module / Area**: `frontend/src/app/[locale]/(app)/profiles/setup/`, `frontend/src/components/profiles/`
- **Objective**: Build a responsive, mobile-first profile completion wizard post-signup using `shadcn/ui` and `Tailwind CSS`.
- **Deliverables & Steps**:
  - `[x]` Create form fields: Username/Slug picker (with debounce check), Display Name, Sport metadata (table tennis grip style, dominant hand, rating).
  - `[x]` Implement location selector (`city`, `state`, `country`).
  - `[x]` Add translation keys in `frontend/src/messages/en.json` and `pt-BR.json` (`profiles.setup.title`, `profiles.setup.submit`, etc.).
- **Acceptance Criteria**:
  - `[x]` Form validates client-side and handles backend 409 (`SlugAlreadyExists`) cleanly.
  - `[x]` Works seamlessly across desktop and mobile screens.

---

### [P1-DEV-06] Public Profile Page & SEO Shell (`/profiles/[slug]`)
- **Status**: `[x]` FINISHED
- **Category**: `Development`
- **Module / Area**: `frontend/src/app/[locale]/(app)/profiles/[slug]/page.tsx`
- **Objective**: Implement server-rendered public profile pages optimized for SEO, fast loading, and visual excellence.
- **Deliverables & Steps**:
  - `[x]` Fetch profile data server-side using Next.js App Router (`async function Page({ params })`).
  - `[x]` Generate dynamic OpenGraph (`generateMetadata`) tags (`og:title`, `og:description`, `og:image`).
  - `[x]` Render rich sport card showing player bio, country/city badge, and club affiliation if public.
- **Acceptance Criteria**:
  - `[x]` Page achieves fast load times and proper fallback for missing profiles (`notFound()`).
  - `[x]` No hardcoded UI strings; all labels use `next-intl` (`t('profile.memberSince')`).

---

### [P1-REV-01] Profile Architecture & Privacy Security Review
- **Status**: `[ ]` PENDING
- **Category**: `Review`
- **Module / Area**: `backend/src/modules/profiles/`
- **Objective**: Conduct rigorous architectural and security code review against `docs/04-backend-standards.md` and `docs/06-security.md`.
- **Deliverables & Steps**:
  - `[ ]` Verify no `PrismaClient` usage inside `profiles.controller.ts` or `profiles.routes.ts`.
  - `[ ]` Verify location privacy: verify that precise coordinates or street addresses cannot be leaked via API response payload.
  - `[ ]` Verify all status codes and enums (`ProfileStatus.ACTIVE`, `ProfileVisibilityEnum`) are stored in English.
- **Acceptance Criteria**:
  - `[ ]` Review sign-off documented in PR checklist.

---

### [P1-TST-01] Profile Backend Unit & Integration Tests
- **Status**: `[ ]` PENDING
- **Category**: `Testing`
- **Module / Area**: `backend/src/modules/profiles/profiles.service.test.ts`, `profiles.routes.test.ts`
- **Objective**: Write comprehensive test suites using `Vitest` and `Fastify.inject()`.
- **Deliverables & Steps**:
  - `[ ]` Unit test `profiles.service.ts`: test slug generation, collision handling, and privacy masking.
  - `[ ]` Integration test `profiles.routes.ts`: inject `GET /api/v1/profiles/:slug` and `PUT /api/v1/profiles/me` with mock JWT tokens.
- **Acceptance Criteria**:
  - `[ ]` `pnpm --filter backend test` passes with $\ge 85\%$ line coverage for the profile module.

---

### [P1-TST-02] Profile E2E Playwright Suite
- **Status**: `[ ]` PENDING
- **Category**: `Testing`
- **Module / Area**: `frontend/tests/e2e/profiles.spec.ts`
- **Objective**: End-to-end browser verification of the onboarding and public viewing journey using `Playwright`.
- **Deliverables & Steps**:
  - `[ ]` Write test: New user signs up $\rightarrow$ redirected to setup wizard $\rightarrow$ submits profile data $\rightarrow$ views `/profiles/my-slug`.
  - `[ ]` Write test: Anonymous visitor accesses `/profiles/my-slug` and sees correct localized metadata.
- **Acceptance Criteria**:
  - `[ ]` E2E tests run reliably without flakiness across Chromium and WebKit.

---

### [P1-REP-01] OpenAPI Documentation & Repo Hygiene
- **Status**: `[ ]` PENDING
- **Category**: `Repo Update`
- **Module / Area**: `backend/src/plugins/swagger.ts`, `pnpm-lock.yaml`
- **Objective**: Ensure OpenAPI specifications auto-generate correctly and repository lockfiles remain clean.
- **Deliverables & Steps**:
  - `[ ]` Verify that `/api/v1/profiles/*` routes appear properly in Swagger UI (`/documentation`).
  - `[ ]` Ensure request and response schemas generate accurate JSON Schemas.
  - `[ ]` Verify no extra dependencies were added without lockfile synchronization (`pnpm install --frozen-lockfile`).
- **Acceptance Criteria**:
  - `[ ]` OpenAPI schema validation passes with zero warnings.
