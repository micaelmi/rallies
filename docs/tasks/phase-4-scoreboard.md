# Phase 4 Tasks: Realtime Scoreboard & Durable Match History

This file tracks the implementation tasks for **Phase 4** of the Rallies MVP. The Scoreboard is one of the most technically sensitive modules because it requires a strict separation between **low-latency ephemeral realtime state** (in-memory/Redis rooms) and **durable match history** (PostgreSQL `Match` records).

---

## Task Summary Table

| Task ID | Task Title | Category | Status | Module / Area |
| :--- | :--- | :--- | :--- | :--- |
| **[P4-DEV-01]** | Scoreboard Schemas & Match Contracts (`scoreboard.schemas.ts`) | Dev | `[ ]` PENDING | `backend/scoreboard` |
| **[P4-DEV-02]** | Ephemeral Room State Manager (Redis / Memory) | Dev | `[ ]` PENDING | `backend/scoreboard` |
| **[P4-DEV-03]** | Realtime WebSocket Gateway & Room Authorization | Dev | `[ ]` PENDING | `backend/scoreboard` |
| **[P4-DEV-04]** | Durable Match Repository & Save-to-History Flow | Dev | `[ ]` PENDING | `backend/scoreboard` |
| **[P4-DEV-05]** | Scoreboard Service (`pointUpdate`, `broadcastUnlock`, `finishMatch`) | Dev | `[ ]` PENDING | `backend/scoreboard` |
| **[P4-DEV-06]** | Scoreboard Controller & REST/WS Routes (`/api/v1/scoreboard`) | Dev | `[ ]` PENDING | `backend/scoreboard` |
| **[P4-DEV-07]** | Frontend Interactive Mobile Scoreboard UI | Dev | `[ ]` PENDING | `frontend/scoreboard` |
| **[P4-DEV-08]** | Frontend Broadcast Spectator Room & Match History View | Dev | `[ ]` PENDING | `frontend/scoreboard` |
| **[P4-REV-01]** | Ephemeral vs. Durable Isolation & Realtime Security Review | Review | `[ ]` PENDING | `backend/scoreboard` |
| **[P4-TST-01]** | Table Tennis Ping Pong Scoring Rules Unit Tests | Test | `[ ]` PENDING | `backend/scoreboard` |
| **[P4-TST-02]** | Realtime WebSocket & Save-to-History Integration Tests | Test | `[ ]` PENDING | `backend/scoreboard` |
| **[P4-TST-03]** | Scoreboard Touch Controls & Spectator E2E Playwright Suite | Test | `[ ]` PENDING | `frontend/scoreboard` |
| **[P4-REP-01]** | Realtime Gateway Documentation & WebSocket Config | Repo | `[ ]` PENDING | `backend` / `docs` |

---

## Detailed Task Specifications

### [P4-DEV-01] Scoreboard Schemas & Match Contracts (`scoreboard.schemas.ts`)
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/scoreboard/scoreboard.schemas.ts`, `scoreboard.types.ts`
- **Objective**: Define explicit Zod schemas for room creation, WebSocket point update events, broadcast upgrades, and match save payloads.
- **Deliverables & Steps**:
  - `[ ]` Define `CreateScoreboardSessionSchema` (`matchFormat`: `SINGLES` | `DOUBLES`, `playerAIds`, `playerBIds`, `isPrivate`).
  - `[ ]` Define `ScoreboardPointEventSchema` (`sessionId`, `scoringSide`: `'A' | 'B'`, `pointsDelta`: `1 | -1`, `timestamp`).
  - `[ ]` Define `FinishAndSaveMatchSchema` (`sessionId`, `finalScoreA`, `finalScoreB`, `setsData`).
- **Acceptance Criteria**:
  - `[ ]` Validates player ID arrays: exactly 2 IDs total for `SINGLES`, exactly 4 IDs for `DOUBLES`.

---

### [P4-DEV-02] Ephemeral Room State Manager (Redis / Memory)
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/scoreboard/room.manager.ts`
- **Objective**: Implement a high-performance ephemeral state store (`room:<sessionId>`) inside Redis (with in-memory fallback for testing) to hold active live scores.
- **Deliverables & Steps**:
  - `[ ]` Implement `createRoom(sessionId: string, initialConfig: RoomConfig)`.
  - `[ ]` Implement `updateRoomScore(sessionId: string, side: 'A' | 'B', delta: number)` performing fast atomic increments without hitting PostgreSQL.
  - `[ ]` Implement `getRoomState(sessionId: string)` and `deleteRoom(sessionId: string)`.
- **Acceptance Criteria**:
  - `[ ]` Room state expires automatically (`TTL` set to 24 hours of inactivity) to prevent Redis memory leaks.

---

### [P4-DEV-03] Realtime WebSocket Gateway & Room Authorization
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/scoreboard/scoreboard.gateway.ts`
- **Objective**: Handle real-time WebSocket connection lifecycle (`@fastify/websocket` or `Socket.IO`) with strict room access checks.
- **Deliverables & Steps**:
  - `[ ]` Authenticate connection handshake (`verifyJWT` from query or header).
  - `[ ]` Authorize room subscription: if session is `isPrivate = true`, verify subscriber is the room owner or an explicit participant.
  - `[ ]` Broadcast score update events (`point_scored`, `set_finished`) immediately to all connected subscribers in the room channel.
- **Acceptance Criteria**:
  - `[ ]` Unauthenticated or unauthorized connections attempting to join private rooms are terminated immediately with close code `4003 Unauthorized`.

---

### [P4-DEV-04] Durable Match Repository & Save-to-History Flow
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/scoreboard/scoreboard.repository.ts`
- **Objective**: Persist finished matches to PostgreSQL (`Match` table) linking player profiles cleanly.
- **Deliverables & Steps**:
  - `[ ]` Implement `saveMatchHistory(tx: Prisma.TransactionClient, data: SaveMatchData)` writing immutable `Match` row.
  - `[ ]` Implement `updateScoreboardSessionStatus(sessionId: string, status: ScoreboardSessionStatus)`.
  - `[ ]` Implement `getMatchHistoryByUserId(userId: string, page: number, limit: number)`.
- **Acceptance Criteria**:
  - `[ ]` No intermediate point-by-point updates touch the database during active gameplay; only one durable write occurs upon completion.

---

### [P4-DEV-05] Scoreboard Service (`pointUpdate`, `broadcastUnlock`, `finishMatch`)
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/scoreboard/scoreboard.service.ts`
- **Objective**: Orchestrate table tennis scoring math and broadcast credit consumption.
- **Deliverables & Steps**:
  - `[ ]` Implement `handlePointScored(sessionId: string, side: 'A' | 'B', delta: number, actorId: string)` verifying actor is authorized scorekeeper.
  - `[ ]` Implement `unlockExtendedBroadcast(sessionId: string, ownerId: string, idempotencyKey: string)`: consumes `BROADCAST_UPGRADE_COST` credits and removes spectator limits.
  - `[ ]` Implement `finishAndSave(sessionId: string, ownerId: string)`: reads final state from Redis room $\rightarrow$ writes `Match` to Postgres $\rightarrow$ cleans up Redis room.
- **Acceptance Criteria**:
  - `[ ]` Handles table tennis deuce rules (must win by 2 points past 10-10) and set rotation logic cleanly.

---

### [P4-DEV-06] Scoreboard Controller & REST/WS Routes (`/api/v1/scoreboard`)
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/scoreboard/scoreboard.controller.ts`, `scoreboard.routes.ts`
- **Objective**: Register REST endpoints for session initiation/history and WebSocket route for real-time room streaming.
- **Deliverables & Steps**:
  - `[ ]` Register `POST /api/v1/scoreboard/sessions` (create session).
  - `[ ]` Register `POST /api/v1/scoreboard/sessions/:id/broadcast-unlock` (protected credit spend).
  - `[ ]` Register `POST /api/v1/scoreboard/sessions/:id/finish` (save durable match).
  - `[ ]` Register `GET /api/v1/scoreboard/live/:id` WebSocket handler.
- **Acceptance Criteria**:
  - `[ ]` All REST endpoints schema-validated with Zod provider.

---

### [P4-DEV-07] Frontend Interactive Mobile Scoreboard UI
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `frontend/src/app/[locale]/(app)/scoreboard/play/[id]/`, `frontend/src/components/scoreboard/`
- **Objective**: Build a vibrant, touch-friendly, high-contrast live scoreboard controller optimized for mobile screens during fast-paced matches.
- **Deliverables & Steps**:
  - `[ ]` Create large touch zones for Player/Team A (`Left/Top`) and Player/Team B (`Right/Bottom`) with instant sound/haptic feedback on tap (`+1`).
  - `[ ]` Add swipe-down or long-press undo gesture (`-1 point`) and server indicator badge alternating every 2 points (and every point during deuce).
  - `[ ]` Add localized UI keys (`scoreboard.serve`, `scoreboard.deuce`, `scoreboard.matchPoint`, `scoreboard.finishMatch`).
- **Acceptance Criteria**:
  - `[ ]` Zero UI latency: optimistic score updates render immediately before WebSocket acknowledgment.

---

### [P4-DEV-08] Frontend Broadcast Spectator Room & Match History View
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `frontend/src/app/[locale]/(app)/scoreboard/watch/[id]/`, `frontend/src/app/[locale]/(app)/profiles/history/`
- **Objective**: Create the real-time spectator view and player match history log.
- **Deliverables & Steps**:
  - `[ ]` Build `/scoreboard/watch/[id]` read-only spectator screen receiving real-time WebSocket score pushes.
  - `[ ]` Build `/profiles/history` and match cards displaying durable `Match` outcomes (`Singles/Doubles`, scores, opponents, date).
  - `[ ]` Add "Upgrade Broadcast" modal allowing creators to spend credits for public streaming.
- **Acceptance Criteria**:
  - `[ ]` Spectator view handles connection drops gracefully with automatic WebSocket reconnection and state resynchronization.

---

### [P4-REV-01] Ephemeral vs. Durable Isolation & Realtime Security Review
- **Status**: `[ ]` PENDING
- **Category**: `Review`
- **Module / Area**: `backend/src/modules/scoreboard/`
- **Objective**: Conduct strict code review guaranteeing zero database writes during point tracking and robust connection security.
- **Deliverables & Steps**:
  - `[ ]` Verify that `updateRoomScore` touches ONLY Redis/memory and NEVER executes a `Prisma` update.
  - `[ ]` Verify that private scoreboard rooms (`isPrivate = true`) reject unauthorized WebSocket subscribers.
  - `[ ]` Verify that match history saves (`finishAndSave`) execute inside an atomic database transaction.
- **Acceptance Criteria**:
  - `[ ]` Sign-off completed; strict architectural boundary preserved.

---

### [P4-TST-01] Table Tennis Ping Pong Scoring Rules Unit Tests
- **Status**: `[ ]` PENDING
- **Category**: `Testing`
- **Module / Area**: `backend/src/modules/scoreboard/scoreboard.service.test.ts`
- **Objective**: Verify standard ITTF table tennis scoring math.
- **Deliverables & Steps**:
  - `[ ]` Write test: 11-9 score triggers set victory; 11-10 does not (must win by 2).
  - `[ ]` Write test: 12-10 deuce victory works accurately; server rotation flips every 2 points until 10-10, then every 1 point.
- **Acceptance Criteria**:
  - `[ ]` 100% test pass rate for game math.

---

### [P4-TST-02] Realtime WebSocket & Save-to-History Integration Tests
- **Status**: `[ ]` PENDING
- **Category**: `Testing`
- **Module / Area**: `backend/src/modules/scoreboard/scoreboard.routes.test.ts`
- **Objective**: Verify WebSocket event broadcasting and PostgreSQL durable saving.
- **Deliverables & Steps**:
  - `[ ]` Simulate WebSocket connection $\rightarrow$ emit point scoring events $\rightarrow$ verify Redis state updates.
  - `[ ]` Call `POST /api/v1/scoreboard/sessions/:id/finish` $\rightarrow$ verify `Match` table row exists in PostgreSQL and Redis room is cleared.
- **Acceptance Criteria**:
  - `[ ]` Integration suite passes cleanly without orphaned Redis keys.

---

### [P4-TST-03] Scoreboard Touch Controls & Spectator E2E Playwright Suite
- **Status**: `[ ]` PENDING
- **Category**: `Testing`
- **Module / Area**: `frontend/tests/e2e/scoreboard.spec.ts`
- **Objective**: Verify browser interactive gameplay and spectator synchronization.
- **Deliverables & Steps**:
  - `[ ]` E2E test: User opens `/scoreboard/play` $\rightarrow$ taps score buttons $\rightarrow$ finishes match $\rightarrow$ checks profile match history.
  - `[ ]` E2E multi-context test: Creator updates score in one browser context $\rightarrow$ spectator in second browser context sees exact real-time score update.
- **Acceptance Criteria**:
  - `[ ]` E2E multi-browser synchronization verified.

---

### [P4-REP-01] Realtime Gateway Documentation & WebSocket Config
- **Status**: `[ ]` PENDING
- **Category**: `Repo Update`
- **Module / Area**: `backend/src/plugins/`, `docs`
- **Objective**: Document WebSocket connection protocols and Redis environment requirements.
- **Deliverables & Steps**:
  - `[ ]` Document WebSocket connection URL format (`wss://.../api/v1/scoreboard/live/:id`) and expected JSON event frames in OpenAPI/docs.
  - `[ ]` Ensure `REDIS_URL` pool configuration is documented in `.env.example`.
- **Acceptance Criteria**:
  - `[ ]` Documentation and config examples complete.
