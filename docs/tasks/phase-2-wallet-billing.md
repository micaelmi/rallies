# Phase 2 Tasks: Wallet Ledger & Stripe Billing Economy

This file tracks the implementation tasks for **Phase 2** of the Rallies MVP. Establishing this financial and credit economy early is critical, as Phase 3 (Clubs & Events) and Phase 4 (Scoreboard broadcasts) depend on ledger checks and coin consumption hooks.

---

## Task Summary Table

| Task ID | Task Title | Category | Status | Module / Area |
| :--- | :--- | :--- | :--- | :--- |
| **[P2-DEV-01]** | Wallet & Ledger Schemas (`wallet.schemas.ts`) | Dev | `[ ]` PENDING | `backend/wallet` |
| **[P2-DEV-02]** | Ledger Repository & Transaction Isolation | Dev | `[ ]` PENDING | `backend/wallet` |
| **[P2-DEV-03]** | Wallet Service & Credit Consumption Engine | Dev | `[ ]` PENDING | `backend/wallet` |
| **[P2-DEV-04]** | Wallet Controller & Routes (`/api/v1/wallet`) | Dev | `[ ]` PENDING | `backend/wallet` |
| **[P2-DEV-05]** | Stripe Billing Service & Webhook Signature Verification | Dev | `[ ]` PENDING | `backend/billing` |
| **[P2-DEV-06]** | Stripe Webhook Routes (`/api/v1/webhooks/stripe`) | Dev | `[ ]` PENDING | `backend/billing` |
| **[P2-DEV-07]** | Frontend Wallet Balance Bar & Coin Purchase UI | Dev | `[ ]` PENDING | `frontend/wallet` |
| **[P2-REV-01]** | Ledger Auditability & Financial Idempotency Review | Review | `[ ]` PENDING | `backend/wallet` |
| **[P2-TST-01]** | Wallet Balance Math & Race Condition Unit Tests | Test | `[ ]` PENDING | `backend/wallet` |
| **[P2-TST-02]** | Stripe Webhook Integration Tests | Test | `[ ]` PENDING | `backend/billing` |
| **[P2-TST-03]** | Credit Purchase E2E Playwright Suite | Test | `[ ]` PENDING | `frontend/wallet` |
| **[P2-REP-01]** | Stripe Secret Config & OpenAPI Registration | Repo | `[ ]` PENDING | `backend` / `config` |

---

## Detailed Task Specifications

### [P2-DEV-01] Wallet & Ledger Schemas (`wallet.schemas.ts`)
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/wallet/wallet.schemas.ts`, `wallet.types.ts`
- **Objective**: Define strict Zod contracts for wallet balance projections, ledger transaction lists, and credit consumption inputs.
- **Deliverables & Steps**:
  - `[ ]` Define `ConsumeCreditsRequestSchema` (`amount`, `reason`, `metadata`, `idempotencyKey`).
  - `[ ]` Define `WalletBalanceResponseSchema` (`userId`, `balance`, `currency`, `updatedAt`).
  - `[ ]` Define `LedgerEntrySchema` ensuring immutable transaction shapes (`CREDIT`, `DEBIT`).
- **Acceptance Criteria**:
  - `[ ]` `idempotencyKey` required as UUIDv4 string.
  - `[ ]` `amount` strictly validated as positive integer greater than zero.

---

### [P2-DEV-02] Ledger Repository & Transaction Isolation
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/wallet/wallet.repository.ts`
- **Objective**: Implement atomic database persistence for `Wallet` and `LedgerEntry` using Prisma interactive transactions (`$transaction`).
- **Deliverables & Steps**:
  - `[ ]` Implement `getOrCreateWallet(userId: string)`.
  - `[ ]` Implement `recordTransaction(tx: Prisma.TransactionClient, params: RecordTransactionParams)` writing immutable `LedgerEntry`.
  - `[ ]` Implement `checkIdempotencyKey(key: string)` to prevent duplicate charges.
- **Acceptance Criteria**:
  - `[ ]` Ledger transactions are atomic: if creating the entry fails, no balance updates occur.
  - `[ ]` Repository queries lock wallet rows appropriately during debit operations to prevent double-spending.

---

### [P2-DEV-03] Wallet Service & Credit Consumption Engine
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/wallet/wallet.service.ts`
- **Objective**: Build the core financial business rules, balance projections, and credit spending engine used by other modules.
- **Deliverables & Steps**:
  - `[ ]` Implement `getBalance(userId: string)`: calculates or projects net balance (`sum(CREDIT) - sum(DEBIT)`).
  - `[ ]` Implement `consumeCredits(userId: string, amount: number, reason: string, idempotencyKey: string)`.
  - `[ ]` Implement `grantCredits(userId: string, amount: number, reason: string, referenceId: string)`.
- **Acceptance Criteria**:
  - `[ ]` Throws `InsufficientBalanceError` cleanly without modifying ledger if balance $<$ amount.
  - `[ ]` Throws `IdempotencyCollisionError` if `idempotencyKey` was already used for a different operation.

---

### [P2-DEV-04] Wallet Controller & Routes (`/api/v1/wallet`)
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/wallet/wallet.controller.ts`, `wallet.routes.ts`
- **Objective**: Expose authenticated endpoints for users to query their balance and transaction history.
- **Deliverables & Steps**:
  - `[ ]` Register `GET /api/v1/wallet/balance` returning `WalletBalanceResponseSchema`.
  - `[ ]` Register `GET /api/v1/wallet/history` with cursor pagination (`limit`, `cursor`).
- **Acceptance Criteria**:
  - `[ ]` Endpoints strictly protected (`checkAuth`); users can only view their own wallet.

---

### [P2-DEV-05] Stripe Billing Service & Webhook Signature Verification
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/billing/billing.service.ts`
- **Objective**: Handle Stripe Checkout session creation and verify incoming webhooks (`checkout.session.completed`, `invoice.paid`).
- **Deliverables & Steps**:
  - `[ ]` Implement `createCheckoutSession(userId: string, priceId: string, returnUrl: string)`.
  - `[ ]` Implement `verifyAndProcessWebhook(rawBody: Buffer, signature: string)` using `stripe.webhooks.constructEvent()`.
  - `[ ]` Upon valid `checkout.session.completed`, call `walletService.grantCredits(userId, coinsAmount, 'STRIPE_PURCHASE', sessionId)`.
- **Acceptance Criteria**:
  - `[ ]` Webhook processing is idempotent: repeated webhook deliveries do not grant duplicate credits.
  - `[ ]` Never trusts client-side purchase completion callbacks without server-side webhook validation.

---

### [P2-DEV-06] Stripe Webhook Routes (`/api/v1/webhooks/stripe`)
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `backend/src/modules/billing/billing.routes.ts`, `billing.controller.ts`
- **Objective**: Register the Stripe webhook listener preserving the unparsed raw request body required for HMAC signature check.
- **Deliverables & Steps**:
  - `[ ]` Register `POST /api/v1/webhooks/stripe` ensuring Fastify passes raw Buffer (`request.rawBody`).
  - `[ ]` Return HTTP `200 OK` immediately after processing to prevent Stripe retry loops.
- **Acceptance Criteria**:
  - `[ ]` Rejects requests with missing or invalid `stripe-signature` headers with HTTP 400.

---

### [P2-DEV-07] Frontend Wallet Balance Bar & Coin Purchase UI
- **Status**: `[ ]` PENDING
- **Category**: `Development`
- **Module / Area**: `frontend/src/app/[locale]/(app)/wallet/page.tsx`, `frontend/src/components/wallet/`
- **Objective**: Create a polished, premium coin purchase page and top-bar coin balance indicator.
- **Deliverables & Steps**:
  - `[ ]` Create header widget displaying current credit balance fetched via SWR/server query.
  - `[ ]` Build `/wallet` coin packages grid displaying cost-benefit tiers and monthly subscription comparison.
  - `[ ]` Add localized strings (`wallet.balance`, `wallet.buyCoins`, `wallet.subscriptionBenefit`) in `en.json` and `pt-BR.json`.
- **Acceptance Criteria**:
  - `[ ]` Clicking a package redirects smoothly to Stripe Checkout URL.

---

### [P2-REV-01] Ledger Auditability & Financial Idempotency Review
- **Status**: `[ ]` PENDING
- **Category**: `Review`
- **Module / Area**: `backend/src/modules/wallet/`, `backend/src/modules/billing/`
- **Objective**: Conduct strict financial and OWASP ASVS review around wallet operations.
- **Deliverables & Steps**:
  - `[ ]` Verify that mutable `balance` updates are impossible without writing an immutable `LedgerEntry`.
  - `[ ]` Verify that all `consumeCredits` calls require an explicit `idempotencyKey`.
  - `[ ]` Verify that Stripe webhook secrets are loaded strictly from environment configuration (`process.env.STRIPE_WEBHOOK_SECRET`).
- **Acceptance Criteria**:
  - `[ ]` Sign-off completed; no direct database mutations found outside transaction blocks.

---

### [P2-TST-01] Wallet Balance Math & Race Condition Unit Tests
- **Status**: `[ ]` PENDING
- **Category**: `Testing`
- **Module / Area**: `backend/src/modules/wallet/wallet.service.test.ts`
- **Objective**: Verify wallet balance accuracy and resilience under concurrent debit attempts.
- **Deliverables & Steps**:
  - `[ ]` Write unit test verifying net balance calculation from multiple mixed `CREDIT` and `DEBIT` entries.
  - `[ ]` Write concurrency test simulating 5 simultaneous requests spending 20 credits from a wallet with only 30 credits balance $\rightarrow$ exactly 1 succeeds, 4 throw `InsufficientBalanceError`.
- **Acceptance Criteria**:
  - `[ ]` 100% test pass rate for all financial logic.

---

### [P2-TST-02] Stripe Webhook Integration Tests
- **Status**: `[ ]` PENDING
- **Category**: `Testing`
- **Module / Area**: `backend/src/modules/billing/billing.routes.test.ts`
- **Objective**: Mock Stripe webhook events and verify atomic credit grant behavior.
- **Deliverables & Steps**:
  - `[ ]` Inject `POST /api/v1/webhooks/stripe` with signed `checkout.session.completed` payload.
  - `[ ]` Assert that `LedgerEntry` was created and user balance increased by exact package amount.
- **Acceptance Criteria**:
  - `[ ]` Replaying the exact same webhook event twice results in zero additional credits granted.

---

### [P2-TST-03] Credit Purchase E2E Playwright Suite
- **Status**: `[ ]` PENDING
- **Category**: `Testing`
- **Module / Area**: `frontend/tests/e2e/wallet.spec.ts`
- **Objective**: End-to-end verification of the purchase flow simulation.
- **Deliverables & Steps**:
  - `[ ]` Simulate navigation to `/wallet` $\rightarrow$ select coin package $\rightarrow$ verify Stripe checkout redirection.
  - `[ ]` Mock return from Stripe $\rightarrow$ verify top-bar coin indicator updates dynamically.
- **Acceptance Criteria**:
  - `[ ]` E2E test runs cleanly across mobile and desktop viewports.

---

### [P2-REP-01] Stripe Secret Config & OpenAPI Registration
- **Status**: `[ ]` PENDING
- **Category**: `Repo Update`
- **Module / Area**: `backend/src/config/`, `backend/src/plugins/routes.ts`
- **Objective**: Register wallet routes in OpenAPI and document required environment variables.
- **Deliverables & Steps**:
  - `[ ]` Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_ID_*` definitions to `.env.example`.
  - `[ ]` Verify `/api/v1/wallet/*` appears in `@fastify/swagger` schemas.
- **Acceptance Criteria**:
  - `[ ]` `.env.example` is complete and self-documenting.
