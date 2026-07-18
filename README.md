# 🏓 Rallies

> **The Multilingual Web Platform for the Table Tennis Ecosystem.**  
> *Connecting players, clubs, and event organizers through real-time match tracking, discovery, and community monetization.*

---

## 📖 Product Overview

**Rallies** is a modern, mobile-first web application designed specifically for table tennis players, club owners, tournament managers, and platform administrators. Built as a PWA-ready modular monolith, Rallies combines identity management, public player presence, community clans (clubs), event discovery, interactive game scoreboards, and a fintech-grade credit economy into a unified platform.

---

## ✨ Key Features

### 👤 Public Player Profiles
- **Sport Metadata**: Showcase grip style, dominant hand, rating, and competitive stats.
- **Privacy Controls**: Granular location privacy (displaying only city, state, and country) and profile visibility (`PUBLIC`, `MEMBERS_ONLY`, `PRIVATE`).
- **SEO Shell**: Fast, server-rendered public profile pages (`/profiles/:slug`) with OpenGraph metadata.

### 🛡️ Clubs & Communities
- **Clan Structure**: Create and join clubs with full membership lifecycles (`INVITED` $\rightarrow$ `REQUESTED` $\rightarrow$ `ACTIVE`).
- **Role-Based Access**: Role management (`OWNER`, `ADMIN`, `MEMBER`) for roster maintenance and permission management.
- **Discovery Marketplace**: Search and filter clubs by geographic location and name.

### 🏆 Event Discovery & Promotion
- **Tournament Listings**: Event managers can create, publish, and manage tournament ads (`DRAFT`, `PUBLISHED`, `CANCELLED`, `ARCHIVED`).
- **Discovery Engine**: Players can filter events by location, title, and status.
- **Event Boosting**: Spend wallet credits to feature events prominently at the top of discovery results.

### ⚡ Interactive Scoreboard & Match History
- **Ephemeral Real-Time State**: Low-latency point tracking backed by Redis/memory rooms via WebSockets—no database writes on individual point updates.
- **Durable Match Records**: Save finished matches (`Match`) permanently to PostgreSQL, associating results with 2 (`SINGLES`) or 4 (`DOUBLES`) player profiles.
- **Broadcast Spectator Mode**: Live stream scoreboards to spectators, with credit-backed options to expand audience capacity.
- **Table Tennis Rules**: Built-in support for deuce rules, set rotations, server alternations, and touch-optimized controls.

### 💰 Credit Economy & Wallet Ledger
- **Immutable Ledger**: Fintech-style credit tracking (`LedgerEntry`) where net balances are projected from credit/debit records—never mutable directly from client requests.
- **Stripe Payments**: Webhook-verified payment handling (`checkout.session.completed`) for purchasing coin packages and recurring subscriptions.
- **Idempotent Spending**: Server-side idempotency verification for all paid actions (club creation, event publishing, event boosting, broadcast upgrades).

### 🌐 Multilingual & Mobile-First (i18n & PWA)
- **First-Class Locales**: Full support for English (`en`) and Brazilian Portuguese (`pt-BR`), with English fallback.
- **PWA Ready**: Offline shell caching and native-like mobile installability powered by Serwist.
- **Language-Neutral Domain**: System enums and database statuses remain strictly in English while presentation text is fully localized.

---

## 🛠️ Tech Stack & Technical Choices

| Layer | Technology | Rationale & Choices |
| :--- | :--- | :--- |
| **Frontend** | **Next.js (App Router)** + **TypeScript** | Server Components for fast SEO pages; Client Components for interactive scoreboards. |
| **Styling & UI** | **Tailwind CSS** + **shadcn/ui** | Flexible, accessible, responsive design system. |
| **Localization** | **next-intl** | Locale-aware routing (`/[locale]/...`) and translation dictionaries. |
| **Mobile / PWA** | **Serwist** (`@serwist/next`) | Explicit service worker lifecycle and offline shell caching. |
| **Backend API** | **Fastify** + **TypeScript** | Low overhead, high-performance API framework with schema-first plugins. |
| **Validation & OpenAPI** | **Zod** + `fastify-type-provider-zod` | End-to-end type safety; auto-generated OpenAPI specs via `@fastify/swagger`. |
| **Database & ORM** | **PostgreSQL** + **Prisma ORM** | Relational integrity for ledger & domain entities; migrations managed via Prisma. |
| **Cache & Realtime** | **Redis** | In-memory ephemeral scoreboard room state, rate limiting, and session cache. |
| **Auth & Payments** | **Clerk** + **Stripe** | Third-party identity management with webhook sync into DB; Stripe payment processing. |
| **Quality & Security** | **Vitest** + **Playwright** | Unit/integration testing for wallet/scoring math; Playwright for E2E user flows. |

---

## 📐 Architecture & Domain Modules

Rallies is structured as a **DDD-inspired Modular Monolith**, organized strictly by business capability rather than technical layer. Cross-module communications occur through explicit service contracts.

```
backend/src/modules/
├── identity/       # Account identity, Clerk webhook sync, roles
├── profiles/       # Public player profiles, slugs, sport metadata
├── clubs/          # Club creation, membership lifecycle, roles
├── events/         # Event drafts, publication, discovery, boosting
├── scoreboard/     # Ephemeral sessions, WebSocket gateway, durable match history
├── wallet/         # Ledger entries, balance projections, credit consumption
├── billing/        # Stripe webhooks, checkout sessions, subscriptions
├── support/        # Contact forms, suggestions, support ticketing
└── admin/          # Moderation tools, audit log queries, admin actions
```

### Key Engineering Rules
1. **Schema-First**: Define Zod schemas before implementing route handlers or controllers.
2. **Layer Separation**: Controllers parse transport input and delegate to services; Prisma calls live strictly inside repositories.
3. **Realtime Isolation**: Point updates write to Redis ephemeral rooms only; PostgreSQL is written once when the match is finalized.
4. **Security Standard**: Built against **OWASP ASVS Level 2** baseline (strict input validation, rate limiting, secure headers, audit logs).

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20+`
- **Package Manager**: `pnpm` (`v10+`)
- **Docker & Docker Compose** (for local PostgreSQL & Redis)

### Quick Start (Local Setup)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/micaelmi/rallies.git
   cd rallies
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Start local database & services**:
   ```bash
   pnpm db:up
   ```

4. **Run database migrations**:
   ```bash
   pnpm --filter ./backend exec prisma migrate dev
   ```

5. **Start development servers**:
   ```bash
   # Run backend server (http://localhost:3001)
   pnpm dev:backend

   # In a separate terminal, run frontend (http://localhost:3000)
   pnpm dev:frontend
   ```

---

## 📚 Documentation & Task Tracking

Full engineering documentation is maintained in the [`/docs`](file:///c:/Micael/projects/rallies/docs) directory:

- **[docs/00-index.md](file:///c:/Micael/projects/rallies/docs/00-index.md)** - Master Index
- **[docs/01-product-scope.md](file:///c:/Micael/projects/rallies/docs/01-product-scope.md)** - Product Scope & Non-Functional Goals
- **[docs/02-architecture.md](file:///c:/Micael/projects/rallies/docs/02-architecture.md)** - Architecture & Realtime Strategy
- **[docs/04-backend-standards.md](file:///c:/Micael/projects/rallies/docs/04-backend-standards.md)** - Backend Standards & Layering Rules
- **[docs/13-mvp-roadmap.md](file:///c:/Micael/projects/rallies/docs/13-mvp-roadmap.md)** - Complete Phased MVP Roadmap
- **[docs/tasks/README.md](file:///c:/Micael/projects/rallies/docs/tasks/README.md)** - Granular Task Tracker (Phases 1-6)

---

## 📜 License

Private Repository – All Rights Reserved.
