# Stripe Integration TODO

This file is the single source of truth for completing and testing your **Stripe Embedded Form Checkout** (`ui_mode: "form"`) integration in Rallies.

---

## Values to Replace

The following values are placeholders and must be updated before going live.

**Files containing placeholders:**
- [backend/.env.example](backend/.env.example)
- [frontend/.env.example](frontend/.env.example)

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| `STRIPE_SECRET_KEY` (in `backend/.env`) | *(unset)* | Your Stripe secret key (`sk_test_...` / `sk_live_...`) from https://dashboard.stripe.com/apikeys |
| `STRIPE_WEBHOOK_SECRET` (in `backend/.env`) | *(unset)* | Your webhook signing secret (`whsec_...`) from `stripe listen` or https://dashboard.stripe.com/workbench/webhooks |
| `STRIPE_PRICE_ID_STARTER` (in `backend/.env`) | *(unset)* | Your actual Stripe Price ID (`price_...`) for the one-time Starter Coin Pack |
| `STRIPE_PRICE_ID_PRO` (in `backend/.env`) | *(unset)* | Your actual Stripe Price ID (`price_...`) for the one-time Pro Coin Pack |
| `STRIPE_PRICE_ID_CLUB_PASS` (in `backend/.env`) | *(unset)* | Your actual Stripe Price ID (`price_...`) for the recurring monthly Club Pass subscription |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (in `frontend/.env.local`) | `pk_test_...` | Your Stripe publishable key (`pk_test_...` / `pk_live_...`) from https://dashboard.stripe.com/apikeys |

---

## Configured Parameters

These parameters were configured in Checkout Studio and are already set in the Checkout Session creation call.

**Files containing these parameters:**
- [backend/src/modules/billing/billing.service.ts](backend/src/modules/billing/billing.service.ts)

| Parameter | Value |
|-----------|-------|
| `ui_mode` | `"form"` |
| `billing_address_collection` | `"auto"` |
| `phone_number_collection` | `{ enabled: false }` |
| `automatic_tax` | `{ enabled: false }` |
| `payment_method_collection` | `"always"` *(applied when `mode === "subscription"`)* |
| `submit_type` | `"auto"` |
| `integration_identifier` | `"custom_embedded_web_0002"` |
| `mode` | `"payment"` or `"subscription"` (matched from server package catalog) |
| `line_items` | `[{ price: params.priceId, quantity: 1 }]` (resolved from `STRIPE_PRICE_ID_*`) |

---

## Setup & Next Steps

### 1. Environment Variables
Add to `backend/.env`:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_STARTER=price_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_CLUB_PASS=price_...
```

Add to `frontend/.env.local`:
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 2. Local Webhook Listener (Stripe CLI)
```powershell
stripe login
stripe listen --forward-to http://localhost:3344/api/v1/webhooks/stripe
```

### 3. Project Structure
- **Backend**:
  - [backend/src/modules/billing/billing.service.ts](backend/src/modules/billing/billing.service.ts) — Creates `ui_mode: "form"` Checkout Sessions returning `{ sessionId, client_secret }` and verifies `checkout.session.completed` & `invoice.paid` webhooks.
  - [backend/src/modules/billing/billing.controller.ts](backend/src/modules/billing/billing.controller.ts) & [backend/src/modules/billing/billing.routes.ts](backend/src/modules/billing/billing.routes.ts) — Exposes `GET /api/v1/billing/packages`, `POST /api/v1/billing/checkout-sessions`, and raw-body `POST /api/v1/webhooks/stripe`.
- **Frontend**:
  - [frontend/src/components/wallet/stripe-embedded-checkout.tsx](frontend/src/components/wallet/stripe-embedded-checkout.tsx) — Loads `https://js.stripe.com/dahlia/stripe.js`, initializes `stripe.initCheckoutFormSdk({ clientSecret, appearance })`, mounts `#checkout-form`, and wires `actions.confirm({ formConfirmEvent })`.
  - [frontend/src/components/wallet/wallet-packages-client.tsx](frontend/src/components/wallet/wallet-packages-client.tsx) & [frontend/src/app/[locale]/(app)/wallet/page.tsx](frontend/src/app/[locale]/(app)/wallet/page.tsx) — Localized `/[locale]/wallet` page displaying wallet balance, packages, and embedded Checkout form.

### 4. How the Integration Works
1. Authenticated user visits `/en/wallet` (or `/pt-BR/wallet`) and selects a coin pack or subscription.
2. Frontend calls `POST /api/v1/billing/checkout-sessions` with `{ priceId }` and Clerk Bearer JWT.
3. Backend validates `priceId` against the server catalog, creates a Stripe Checkout Session (`ui_mode: "form"`), and returns `{ sessionId, client_secret }`.
4. Stripe's Dahlia JS SDK renders the embedded form inside `#checkout-form` and confirms payment.
5. Stripe sends a signed `checkout.session.completed` or `invoice.paid` webhook to `POST /api/v1/webhooks/stripe`, which atomically credits the user's `Wallet` via `WalletService.grantCredits`.

### 5. Test Card Numbers
- Standard Visa success: `4242 4242 4242 4242` (any future expiry, any 3-digit CVC)
- 3D Secure authentication: `4000 0025 0000 3155`
- Declined card: `4000 0000 0000 0002`

### 6. Next Steps & Resources
- Update your real Stripe Price IDs in `backend/.env` and publishable key in `frontend/.env.local`.
- Test both one-time coin purchases (`mode: "payment"`) and monthly subscriptions (`mode: "subscription"`).
- Resources: https://support.stripe.com and https://docs.stripe.com/mcp
