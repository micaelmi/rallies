# Rallies Agent Summary

This file summarizes `docs/00-index.md` through `docs/12-localization-and-i18n.md` and should be treated as a practical working reference for AI-assisted implementation. The docs remain the source of truth.

## Product understanding

Rallies is a multilingual web platform for the table tennis ecosystem. It serves players, clubs, event organizers, and platform administrators. The platform combines:

- third-party authentication with internal application identity and permission ownership
- public player profiles with localization-aware presentation
- clubs with membership, invitations, roles, and future announcements/chat hooks
- events for discovery, publication, and filtering by location and metadata
- scoreboard sessions with private mode, broadcast mode, and durable match history
- support, suggestion, and feedback flows
- credits, subscriptions, and premium feature monetization

Non-functional priorities are mobile-first UX, PWA readiness, strong performance, high security, automation, and compatibility with AI-generated code workflows.

## Architecture rules

Rallies must start as a modular monolith. The architecture is DDD-inspired, but pragmatic rather than academic. The main rule is that modules are organized by business capability, not by technical type.

Within each module, prefer a flat file layout when the module is still small. The default module structure is:

- `module.types.ts`
- `module.schemas.ts`
- `module.repository.ts`
- `module.service.ts`
- `module.controller.ts`
- `module.routes.ts`

`module.types.ts` should hold internal module types, repository contracts, enums, and domain-oriented shapes when a separate entity file is not needed.

This keeps files easy to find while still preserving separation between transport, orchestration, persistence, and domain-facing types.

Core layers:

- Presentation: Next.js frontend, Fastify routes, handlers/controllers
- Application: use cases, orchestration, policies
- Domain: entities, value objects, enums, invariants, domain services
- Infrastructure: Prisma, PostgreSQL, Redis, auth provider, payments, storage, email, observability

Business logic must not live in route handlers or controllers. Infrastructure details must not leak into domain logic. Cross-module interaction should go through explicit interfaces or application contracts.

Scoreboard realtime state must stay separate from persisted match history. Ephemeral session state is not the same thing as durable match records, and points should not be written directly to durable history on every update.

## Domain module boundaries

The intended module split is:

- `identity`: internal account identity, auth-provider linkage, roles, account state, locale preference, profile completion coordination
- `profiles`: public player-facing profile, slug/username, bio, sport metadata, visibility settings
- `clubs`: club creation, ownership, membership lifecycle, roles, discovery metadata, future announcement/chat hooks
- `events`: draft/publication lifecycle, discovery, ownership, boosting, moderation status
- `scoreboard`: ephemeral sessions, broadcast rooms, privacy, save-to-history flow, 2-player or 4-player match association
- `wallet`: wallet account, ledger entries, balance projection, credit consumption, entitlement checks
- `billing`: Stripe lifecycle, pricing, subscription handling, credit grants, reconciliation
- `support`: contact flows, suggestions, feedback, support workflows
- `admin`: moderation, support management, operational tooling, audit views, manual adjustments with controls

Shared code must stay truly shared and must not become a hidden second domain.

## Backend implementation rules

Backend conventions from the docs:

- Fastify + TypeScript
- Zod is the source of truth for external contracts
- `fastify-type-provider-zod` for typed route schemas
- `@fastify/swagger` and `@fastify/swagger-ui` for OpenAPI
- Prisma + PostgreSQL for persistence
- Pino/structured logging
- centralized error handling

Mandatory backend rules:

- define schemas before implementing routes
- validate all external inputs
- reject unknown fields where appropriate
- keep API responses consistent
- include request correlation where possible
- never log secrets or sensitive tokens
- keep enums and statuses language-neutral

Forbidden patterns:

- Prisma calls directly inside route handlers
- business logic in controllers
- generic base classes without clear value
- dumping business rules into `utils`

## API and contract expectations

The API must be schema-first, typed, predictable, and version-ready. OpenAPI is a contract artifact, not just documentation.

Each route should have:

- explicit request schema
- explicit response schema
- consistent error response shape
- documented localization behavior when relevant
- documented auth requirements for protected routes

Pagination and error conventions should stay standardized across modules.

## Data model understanding

The conceptual data model separates internal identity from public profile. The major conceptual entities are:

- `User`: internal account identity
- `Profile`: public player-facing identity
- `Club` and `ClubMember`
- `Event`
- `ScoreboardSession`
- `Match`
- `Wallet`
- `LedgerEntry`

Modeling principles:

- identity and profile are separate concerns
- ledger thinking is mandatory for credits
- ownership and auditability matter
- enums remain language-neutral

The database schema is the implementation source of truth for actual tables and relations.

## Security understanding

Security is a core project requirement. Baseline expectations include:

- strict input validation
- separation of authentication and authorization
- webhook verification
- secure headers
- rate limiting
- audit logging for privileged and financial actions
- immutable-ledger thinking for wallet operations

Wallet and billing rules are especially strict:

- never trust balance or purchase state from the client
- confirm purchases server-side
- require idempotency for financial flows
- plan for reconciliation jobs

Realtime security rules:

- validate connection identity
- authorize room access
- keep private scoreboard sessions private unless explicitly shared

## Testing strategy

The docs recommend DDD-oriented architecture with selective TDD for critical business logic.

Test pyramid:

- Unit tests for wallet math, permission logic, policies, scoreboard transitions, event eligibility
- Integration tests for repositories, Fastify routes, Prisma integrations, authorization boundaries, Stripe webhooks, save-match flows
- End-to-end tests for signup/first access, profile setup, club/event creation, credit purchase/spending, scoreboard flows, match persistence

Highest-risk priority areas are wallet/ledger, permissions, subscriptions/entitlements, and scoreboard privacy/persistence.

## CI/CD expectations

CI/CD is a required safety layer for AI-assisted delivery.

Minimum CI on each PR:

- dependency installation with lockfile enforcement
- type checking
- linting
- unit tests
- integration tests
- build
- schema validation
- migration checks
- secret scanning
- dependency vulnerability scanning

Delivery expectations:

- automatic staging deploy from `main`
- smoke tests after deploy
- controlled production deployment approval
- migration safety checks
- rollback path
- post-deploy smoke tests

Database rules:

- forward-only migrations
- backups before risky production migrations
- no uncontrolled hotfixes directly in production schema

## Localization rules

Supported locales in V1 are:

- `en`
- `pt-BR`

Localization is first-class, but the backend must be locale-aware rather than locale-dependent. English is the fallback. User preference should override browser language when available.

Important implications:

- business logic must never depend on translated strings
- user-facing text should use translation keys in the frontend
- locale-aware emails and notifications should use stored user preference
- enums, statuses, and system values remain language-neutral
- user-generated content can remain in its original language in V1

## AI directives to follow

These are hard constraints for future AI-generated code in this repo:

- follow the docs first
- respect architecture boundaries
- preserve invariants and security
- prefer clarity over cleverness
- do not invent architecture
- do not bypass module boundaries
- do not put business logic in controllers
- do not access Prisma from route handlers
- always define schemas before routes
- always respect localization rules
- never use translated strings as business values

Additional restrictions:

- financial and wallet code must preserve auditability and idempotency
- scoreboard broadcast code must keep ephemeral and durable state separate
- implement focused changes and explain assumptions
- prefer explicit naming and established patterns over new abstractions
