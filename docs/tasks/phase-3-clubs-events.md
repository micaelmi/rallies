# Phase 3 Tasks: Clubs & Events Ecosystem (Discovery & Network Effect)

This file tracks the implementation tasks for **Phase 3** of the Rallies MVP. Clubs and Events represent the core community structures and discovery marketplace of Rallies. Both modules hook directly into the Phase 2 `wallet` service for credit consumption during creation and boosting.

---

## Task Summary Table

| Task ID | Task Title | Category | Status | Module / Area |
| :--- | :--- | :--- | :--- | :--- |
| **[P3-DEV-01]** | Clubs Schemas & Role Contracts (`clubs.schemas.ts`) | Dev | `[ ]` PENDING | `backend/clubs` |
| **[P3-DEV-02]** | Clubs Repository & Membership Lifecycle Access | Dev | `[ ]` PENDING | `backend/clubs` |
| **[P3-DEV-03]** | Clubs Service (`createClub`, `joinClub`, Role Checks) | Dev | `[ ]` PENDING | `backend/clubs` |
| **[P3-DEV-04]** | Clubs Controller & Routes (`/api/v1/clubs`) | Dev | `[ ]` PENDING | `backend/clubs` |
| **[P3-DEV-05]** | Events Schemas & Publication Contracts (`events.schemas.ts`) | Dev | `[ ]` PENDING | `backend/events` |
| **[P3-DEV-06]** | Events Repository & Discovery Filter Engine | Dev | `[ ]` PENDING | `backend/events` |
| **[P3-DEV-07]** | Events Service (`createDraft`, `publish`, `boost`) | Dev | `[ ]` PENDING | `backend/events` |
| **[P3-DEV-08]** | Events Controller & Routes (`/api/v1/events`) | Dev | `[ ]` PENDING | `backend/events` |
| **[P3-DEV-09]** | Frontend Club Discovery Grid & Detail Pages | Dev | `[ ]` PENDING | `frontend/clubs` |
| **[P3-DEV-10]** | Frontend Event Marketplace & Filter UI | Dev | `[ ]` PENDING | `frontend/events` |
| **[P3-REV-01]** | RBAC & Credit Consumption Boundary Review | Review | `[ ]` PENDING | `backend/clubs` / `events` |
| **[P3-TST-01]** | Clubs Membership & Role Authorization Unit Tests | Test | `[ ]` PENDING | `backend/clubs` |
| **[P3-TST-02]** | Events Discovery & Credit Spending Integration Tests | Test | `[ ]` PENDING | `backend/events` |
| **[P3-TST-03]** | Clubs & Events E2E Playwright Suite | Test | `[ ]` PENDING | `frontend` |
| **[P3-REP-01]** | Route Registration & Swagger Contract Verification | Repo | `[ ]` PENDING | `backend` / `docs` |

---

## Detailed Task Specifications

### [P3-DEV-01] Clubs Schemas & Role Contracts (`clubs.schemas.ts`)
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/clubs/clubs.schemas.ts`, `clubs.types.ts`
- **Objective**: Define explicit Zod contracts for club creation, membership requests, role updates, and search parameters.
- **Deliverables & Steps**:
  - `[ ]` Define `CreateClubRequestSchema` (`name`, `description`, `city`, `state`, `country`, `visibility`).
  - `[ ]` Define `ClubMemberRoleEnum` (`OWNER`, `ADMIN`, `MEMBER`) and `ClubMemberStatusEnum` (`ACTIVE`, `INVITED`, `REQUESTED`, `REMOVED`).
  - `[ ]` Define `SearchClubsQuerySchema` (`location`, `name`, `page`, `limit`).
- **Acceptance Criteria**:
  - `[ ]` All enums use uppercase English identifiers matching `schema.prisma`.

---

### [P3-DEV-02] Clubs Repository & Membership Lifecycle Access
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/clubs/clubs.repository.ts`
- **Objective**: Implement clean data access for club rows and membership joins.
- **Deliverables & Steps**:
  - `[ ]` Implement `createClub(ownerId: string, data: CreateClubInput)`.
  - `[ ]` Implement `searchClubs(filters: SearchClubsFilters)`.
  - `[ ]` Implement `getClubMember(clubId: string, userId: string)` and `updateMemberStatus(clubId: string, userId: string, status: ClubMemberStatus, role: ClubMemberRole)`.
- **Acceptance Criteria**:
  - `[ ]` Search query leverages case-insensitive partial matching on `name` and exact/location filtering on `city`/`country`.

---

### [P3-DEV-03] Clubs Service (`createClub`, `joinClub`, Role Checks)
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/clubs/clubs.service.ts`
- **Objective**: Orchestrate club business logic and enforce credit consumption during club creation.
- **Deliverables & Steps**:
  - `[ ]` Implement `createClub(ownerId: string, input: CreateClubRequest)`: call `walletService.consumeCredits(ownerId, CLUB_CREATE_COST, 'CREATE_CLUB', idempotencyKey)` before persisting club.
  - `[ ]` Implement `requestMembership(clubId: string, userId: string)` and `respondToMembership(clubId: string, targetUserId: string, action: 'ACCEPT' | 'REJECT', actorUserId: string)`.
  - `[ ]` Enforce role permission check: only `OWNER` or `ADMIN` can accept join requests or promote members.
- **Acceptance Criteria**:
  - `[ ]` Throws `UnauthorizedClubActionError` if non-admin attempts to modify roster.

---

### [P3-DEV-04] Clubs Controller & Routes (`/api/v1/clubs`)
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/clubs/clubs.controller.ts`, `clubs.routes.ts`
- **Objective**: Expose schema-validated endpoints for club discovery and membership management.
- **Deliverables & Steps**:
  - `[ ]` Register `POST /api/v1/clubs` (protected).
  - `[ ]` Register `GET /api/v1/clubs` (public discovery with `SearchClubsQuerySchema`).
  - `[ ]` Register `POST /api/v1/clubs/:id/join` and `PUT /api/v1/clubs/:id/members/:userId` (protected).
- **Acceptance Criteria**:
  - `[ ]` Zero Prisma calls in controllers; Zod validation errors return structured 400 responses.

---

### [P3-DEV-05] Events Schemas & Publication Contracts (`events.schemas.ts`)
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/events/events.schemas.ts`, `events.types.ts`
- **Objective**: Define Zod contracts for tournament/event drafts, publication metadata, boosting status, and search filters.
- **Deliverables & Steps**:
  - `[ ]` Define `CreateEventDraftSchema` (`title`, `description`, `city`, `state`, `country`, `startDate`, `endDate`).
  - `[ ]` Define `EventStatusEnum` (`DRAFT`, `PUBLISHED`, `CANCELLED`, `ARCHIVED`).
  - `[ ]` Define `SearchEventsQuerySchema` (`location`, `status`, `boostedOnly`, `page`, `limit`).
- **Acceptance Criteria**:
  - `[ ]` Dates validated using ISO 8601 strings and checked so that `endDate` $\ge$ `startDate`.

---

### [P3-DEV-06] Events Repository & Discovery Filter Engine
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/events/events.repository.ts`
- **Objective**: Implement queries supporting tournament discovery and status filtering.
- **Deliverables & Steps**:
  - `[ ]` Implement `create(ownerId: string, data: CreateEventDraftInput)`.
  - `[ ]` Implement `search(filters: SearchEventsFilters)`: prioritize boosted events (`isBoosted = true`) at the top of results when sorting.
  - `[ ]` Implement `updateStatus(eventId: string, status: EventStatus)`.
- **Acceptance Criteria**:
  - `[ ]` Public search strictly excludes `DRAFT` or `CANCELLED` events unless queried by the owner.

---

### [P3-DEV-07] Events Service (`createDraft`, `publish`, `boost`)
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/events/events.service.ts`
- **Objective**: Implement event lifecycle and credit spending hooks for publishing and boosting.
- **Deliverables & Steps**:
  - `[ ]` Implement `createDraft(ownerId: string, input: CreateEventDraftRequest)`.
  - `[ ]` Implement `publishEvent(eventId: string, ownerId: string, idempotencyKey: string)`: consumes `EVENT_PUBLISH_COST` credits via `walletService`.
  - `[ ]` Implement `boostEvent(eventId: string, ownerId: string, durationDays: number, idempotencyKey: string)`: consumes `EVENT_BOOST_COST` credits and marks `isBoosted = true`.
- **Acceptance Criteria**:
  - `[ ]` Events cannot be published or boosted without sufficient wallet balance.

---

### [P3-DEV-08] Events Controller & Routes (`/api/v1/events`)
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/events/events.controller.ts`, `events.routes.ts`
- **Objective**: Expose event discovery and lifecycle endpoints.
- **Deliverables & Steps**:
  - `[ ]` Register `GET /api/v1/events` (public discovery).
  - `[ ]` Register `POST /api/v1/events` (protected draft creation).
  - `[ ]` Register `POST /api/v1/events/:id/publish` and `POST /api/v1/events/:id/boost` (protected).
- **Acceptance Criteria**:
  - `[ ]` Route schemas strictly typed with Zod provider.

---

### [P3-DEV-09] Frontend Club Discovery Grid & Detail Pages
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `frontend/src/app/[locale]/(app)/clubs/`
- **Objective**: Build the club directory, filter bar (`location`, `name`), and club details/roster page.
- **Deliverables & Steps**:
  - `[ ]` Create `/clubs` listing page with responsive cards and active filter tags.
  - `[ ]` Create `/clubs/[id]` page showing club bio, member count, roster list, and "Request to Join" button.
  - `[ ]` Add localized dictionary entries (`clubs.discover`, `clubs.joinRequest`, `clubs.roster`).
- **Acceptance Criteria**:
  - `[ ]` UI reflects current user status (`Not a Member`, `Request Pending`, `Member`, `Admin`).

---

### [P3-DEV-10] Frontend Event Marketplace & Filter UI
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `frontend/src/app/[locale]/(app)/events/`
- **Objective**: Build the tournament advertisement and discovery marketplace.
- **Deliverables & Steps**:
  - `[ ]` Create `/events` listing view highlighting boosted events with subtle visual distinction/badge (`Promoted`).
  - `[ ]` Build `/events/create` wizard allowing organizers to draft, preview, and publish/boost their event (displaying required coin cost).
  - `[ ]` Add localized strings (`events.promotedBadge`, `events.publishCost`, `events.filterByCity`).
- **Acceptance Criteria**:
  - `[ ]` Organizers receive clear confirmation and wallet deduction preview before finalizing publication.

---

### [P3-REV-01] RBAC & Credit Consumption Boundary Review
- **Status**: `[ ]` PENDING
- **Category**: `Review`
- **Module / Area**: `backend/src/modules/clubs/`, `backend/src/modules/events/`
- **Objective**: Verify strict separation between presentation and domain rules.
- **Deliverables & Steps**:
  - `[ ]` Verify that all credit consumption calls (`walletService.consumeCredits`) pass unique `idempotencyKey` strings.
  - `[ ]` Verify that non-owners cannot publish or boost another user's event.
  - `[ ]` Verify that all database statuses (`ClubStatus.ACTIVE`, `EventStatus.PUBLISHED`) stay strictly in English.
- **Acceptance Criteria**:
  - `[ ]` Architectural sign-off completed.

---

### [P3-TST-01] Clubs Membership & Role Authorization Unit Tests
- **Status**: `[ ]` PENDING
- **Category**: `Testing`
- **Module / Area**: `backend/src/modules/clubs/clubs.service.test.ts`
- **Objective**: Verify club membership state transitions and RBAC checks.
- **Deliverables & Steps**:
  - `[ ]` Unit test: verify `OWNER` can promote `MEMBER` to `ADMIN`.
  - `[ ]` Unit test: verify `MEMBER` attempting to remove another `MEMBER` throws `UnauthorizedClubActionError`.
- **Acceptance Criteria**:
  - `[ ]` 100% test coverage on membership authorization logic.

---

### [P3-TST-02] Events Discovery & Credit Spending Integration Tests
- **Status**: `[ ]` PENDING
- **Category**: `Testing`
- **Module / Area**: `backend/src/modules/events/events.routes.test.ts`
- **Objective**: Verify API-level event creation, credit deduction, and search filtering.
- **Deliverables & Steps**:
  - `[ ]` Inject `POST /api/v1/events/:id/publish` with mock wallet balance $\rightarrow$ verify event status updates to `PUBLISHED` and wallet debits exactly `EVENT_PUBLISH_COST`.
  - `[ ]` Inject `GET /api/v1/events?location=Sao+Paulo` $\rightarrow$ verify only matching active/published events return.
- **Acceptance Criteria**:
  - `[ ]` Integration suite passes cleanly.

---

### [P3-TST-03] Clubs & Events E2E Playwright Suite
- **Status**: `[ ]` PENDING
- **Category**: `Testing`
- **Module / Area**: `frontend/tests/e2e/community.spec.ts`
- **Objective**: Verify end-to-end community interaction flows.
- **Deliverables & Steps**:
  - `[ ]` E2E test: User creates club $\rightarrow$ another user requests to join $\rightarrow$ club owner approves membership.
  - `[ ]` E2E test: Organizer drafts and publishes an event $\rightarrow$ player filters by city and discovers event.
- **Acceptance Criteria**:
  - `[ ]` Stable E2E execution across desktop and mobile configurations.

---

### [P3-REP-01] Route Registration & Swagger Contract Verification
- **Status**: `[ ]` PENDING
- **Category**: `Repo Update`
- **Module / Area**: `backend/src/plugins/routes.ts`, `docs`
- **Objective**: Ensure `/api/v1/clubs` and `/api/v1/events` routes are properly registered and documented.
- **Deliverables & Steps**:
  - `[ ]` Verify route exports in `backend/src/plugins/routes.ts`.
  - `[ ]` Check Swagger output to ensure accurate Zod schema rendering for complex search query parameters.
- **Acceptance Criteria**:
  - `[ ]` Zero build errors or schema warnings.
