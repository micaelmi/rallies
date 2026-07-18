# Phase 5 Tasks: Support, Moderation & Admin Tooling

This file tracks the implementation tasks for **Phase 5** of the Rallies MVP. Support ticketing and administrative operational tooling are essential for maintaining platform safety, managing customer feedback, and moderating community content (`clubs`, `events`).

---

## Task Summary Table

| Task ID | Task Title | Category | Status | Module / Area |
| :--- | :--- | :--- | :--- | :--- |
| **[P5-DEV-01]** | Support & Admin Schemas (`support.schemas.ts`, `admin.schemas.ts`) | Dev | `[ ]` PENDING | `backend/support` / `admin` |
| **[P5-DEV-02]** | Support Repository & Ticket Lifecycle Access | Dev | `[ ]` PENDING | `backend/support` |
| **[P5-DEV-03]** | Support Service & Controller (`/api/v1/support`) | Dev | `[ ]` PENDING | `backend/support` |
| **[P5-DEV-04]** | Admin Operational Repository & Audit Log Access | Dev | `[ ]` PENDING | `backend/admin` |
| **[P5-DEV-05]** | Admin Moderation Service & Controller (`/api/v1/admin`) | Dev | `[ ]` PENDING | `backend/admin` |
| **[P5-DEV-06]** | Frontend Contact & Support Form UI (`/support`) | Dev | `[ ]` PENDING | `frontend/support` |
| **[P5-DEV-07]** | Frontend Admin Dashboard & Moderation Portal (`/admin`) | Dev | `[ ]` PENDING | `frontend/admin` |
| **[P5-REV-01]** | Strict RBAC (`PLATFORM_ADMIN`) & Audit Trail Security Review | Review | `[ ]` PENDING | `backend/admin` |
| **[P5-TST-01]** | Support Ticket & Admin RBAC Unit/Integration Tests | Test | `[ ]` PENDING | `backend/support` / `admin` |
| **[P5-TST-02]** | Support Submission & Admin Moderation E2E Playwright Suite | Test | `[ ]` PENDING | `frontend` |
| **[P5-REP-01]** | Admin Route Registration & OpenAPI Hygiene | Repo | `[ ]` PENDING | `backend` / `docs` |

---

## Detailed Task Specifications

### [P5-DEV-01] Support & Admin Schemas (`support.schemas.ts`, `admin.schemas.ts`)
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/support/support.schemas.ts`, `backend/src/modules/admin/admin.schemas.ts`
- **Objective**: Define Zod contracts for ticket submissions, status updates, moderation actions, and audit log queries.
- **Deliverables & Steps**:
  - `[ ]` Define `CreateSupportTicketSchema` (`type`: `SUPPORT` | `FEEDBACK` | `SUGGESTION`, `subject`, `message`).
  - `[ ]` Define `UpdateTicketStatusSchema` (`status`: `OPEN` | `IN_PROGRESS` | `ANSWERED` | `CLOSED`, `adminNote`).
  - `[ ]` Define `ModerateEntitySchema` (`entityType`: `CLUB` | `EVENT` | `PROFILE`, `entityId`, `action`: `ARCHIVE` | `RESTORE`, `reason`).
- **Acceptance Criteria**:
  - `[ ]` Subject and message strings sanitized against XSS injection tags.

---

### [P5-DEV-02] Support Repository & Ticket Lifecycle Access
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/support/support.repository.ts`
- **Objective**: Implement database access for `SupportTicket` rows.
- **Deliverables & Steps**:
  - `[ ]` Implement `createTicket(userId: string, data: CreateSupportTicketInput)`.
  - `[ ]` Implement `getTicketsByUser(userId: string, page: number, limit: number)`.
  - `[ ]` Implement `getAllTicketsForAdmin(filters: AdminTicketFilters, page: number, limit: number)`.
  - `[ ]` Implement `updateTicketStatus(ticketId: string, status: SupportTicketStatus, adminId: string)`.
- **Acceptance Criteria**:
  - `[ ]` Queries paginated and indexed on `userId` and `status`.

---

### [P5-DEV-03] Support Service & Controller (`/api/v1/support`)
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/support/support.service.ts`, `support.controller.ts`, `support.routes.ts`
- **Objective**: Expose authenticated user endpoints for contact and suggestion submissions.
- **Deliverables & Steps**:
  - `[ ]` Implement `submitTicket(userId: string, input: CreateSupportTicketRequest)`: emits optional email notification hook (`Resend` / `Postmark`).
  - `[ ]` Register `POST /api/v1/support/tickets` and `GET /api/v1/support/tickets/my`.
- **Acceptance Criteria**:
  - `[ ]` Route validation strictly handled by Zod type provider.

---

### [P5-DEV-04] Admin Operational Repository & Audit Log Access
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/admin/admin.repository.ts`
- **Objective**: Provide operational queries across users, clubs, events, and ledger audit trails for platform administrators.
- **Deliverables & Steps**:
  - `[ ]` Implement `getAuditLogs(page: number, limit: number, userId?: string)` across `LedgerEntry` and system modifications.
  - `[ ]` Implement `moderateClub(clubId: string, status: ClubStatus)`.
  - `[ ]` Implement `moderateEvent(eventId: string, status: EventStatus)`.
- **Acceptance Criteria**:
  - `[ ]` Moderation actions record an immutable audit trace entry.

---

### [P5-DEV-05] Admin Moderation Service & Controller (`/api/v1/admin`)
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/admin/admin.service.ts`, `admin.controller.ts`, `admin.routes.ts`
- **Objective**: Build the administrative control plane protected by strict role authorization checks.
- **Deliverables & Steps**:
  - `[ ]` Create Fastify middleware/hook `requirePlatformAdmin`: verifies user JWT claims and checks `role === 'PLATFORM_ADMIN'` in database.
  - `[ ]` Register `GET /api/v1/admin/tickets` and `PUT /api/v1/admin/tickets/:id`.
  - `[ ]` Register `POST /api/v1/admin/moderate` allowing administrators to archive reported clubs or spam events.
  - `[ ]` Register `GET /api/v1/admin/ledger-audit` to inspect financial transactions.
- **Acceptance Criteria**:
  - `[ ]` Any non-admin request attempting to access `/api/v1/admin/*` is rejected immediately with HTTP 403 Forbidden.

---

### [P5-DEV-06] Frontend Contact & Support Form UI (`/support`)
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `frontend/src/app/[locale]/(app)/support/page.tsx`, `frontend/src/components/support/`
- **Objective**: Build a clean, user-friendly contact and feedback form accessible from the main navigation.
- **Deliverables & Steps**:
  - `[ ]` Create form with type selector (`Help Request`, `Feedback`, `Feature Suggestion`), subject line, and message textarea.
  - `[ ]` Display user's previous submitted tickets and their current status badge (`Open`, `In Progress`, `Answered`).
  - `[ ]` Add localized keys (`support.submitTitle`, `support.ticketType`, `support.history`) in `en.json` and `pt-BR.json`.
- **Acceptance Criteria**:
  - `[ ]` Form submission gives clear success feedback and updates ticket list immediately.

---

### [P5-DEV-07] Frontend Admin Dashboard & Moderation Portal (`/admin`)
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `frontend/src/app/[locale]/(app)/admin/page.tsx`, `frontend/src/components/admin/`
- **Objective**: Build the internal moderation and ticket triage interface for platform administrators.
- **Deliverables & Steps**:
  - `[ ]` Create route protection: redirect users without `PLATFORM_ADMIN` role away from `/admin`.
  - `[ ]` Build ticket management table with quick status update dropdowns and note attachments.
  - `[ ]` Build moderation search panel allowing admins to search clubs/events and trigger archive actions.
- **Acceptance Criteria**:
  - `[ ]` Fast, scannable data table layout with responsive controls.

---

### [P5-REV-01] Strict RBAC (`PLATFORM_ADMIN`) & Audit Trail Security Review
- **Status**: `[ ]` PENDING
- **Category**: `Review`
- **Module / Area**: `backend/src/modules/admin/`
- **Objective**: Conduct thorough security review ensuring administrative privilege escalation is impossible.
- **Deliverables & Steps**:
  - `[ ]` Verify that `requirePlatformAdmin` middleware is registered on EVERY route registered under `/api/v1/admin`.
  - `[ ]` Verify that client-provided role claims are never trusted without server-side database role validation.
  - `[ ]` Verify that all moderation adjustments capture the acting admin's user ID in structured logs (`Pino`).
- **Acceptance Criteria**:
  - `[ ]` Security review signed off with zero privilege leaks.

---

### [P5-TST-01] Support Ticket & Admin RBAC Unit/Integration Tests
- **Status**: `[ ]` PENDING
- **Category**: `Testing`
- **Module / Area**: `backend/src/modules/admin/admin.routes.test.ts`, `support.routes.test.ts`
- **Objective**: Verify ticket submissions and strict RBAC rejection behavior.
- **Deliverables & Steps**:
  - `[ ]` Inject `POST /api/v1/support/tickets` with standard user token $\rightarrow$ assert HTTP 201 Created and database persistence.
  - `[ ]` Inject `GET /api/v1/admin/tickets` with standard user (`USER` role) token $\rightarrow$ assert HTTP 403 Forbidden.
  - `[ ]` Inject `GET /api/v1/admin/tickets` with `PLATFORM_ADMIN` token $\rightarrow$ assert HTTP 200 OK.
- **Acceptance Criteria**:
  - `[ ]` 100% pass rate on RBAC security boundary tests.

---

### [P5-TST-02] Support Submission & Admin Moderation E2E Playwright Suite
- **Status**: `[ ]` PENDING
- **Category**: `Testing`
- **Module / Area**: `frontend/tests/e2e/support-admin.spec.ts`
- **Objective**: Verify end-to-end support ticket lifecycle and moderation action.
- **Deliverables & Steps**:
  - `[ ]` E2E test: Standard user opens `/support` $\rightarrow$ submits feedback ticket $\rightarrow$ sees ticket in history.
  - `[ ]` E2E test: Admin user logs into `/admin` $\rightarrow$ views submitted ticket $\rightarrow$ changes status to `Answered` $\rightarrow$ verifies status update reflects on user screen.
- **Acceptance Criteria**:
  - `[ ]` E2E tests run reliably.

---

### [P5-REP-01] Admin Route Registration & OpenAPI Hygiene
- **Status**: `[ ]` PENDING
- **Category**: `Repo Update`
- **Module / Area**: `backend/src/plugins/routes.ts`, `docs`
- **Objective**: Ensure support and admin endpoints are properly registered and tagged in Swagger documentation.
- **Deliverables & Steps**:
  - `[ ]` Register `registerSupportRoutes` and `registerAdminRoutes` in `routes.ts`.
  - `[ ]` Tag admin routes with `tags: ['Admin']` and explicit security definitions (`security: [{ bearerAuth: [] }]`).
- **Acceptance Criteria**:
  - `[ ]` Swagger UI cleanly categorizes administrative routes separate from public/player routes.
