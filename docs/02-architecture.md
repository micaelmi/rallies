# Architecture

## Recommended style

Rallies should start as a **modular monolith**.

This is the best balance for:
- delivery speed
- consistency
- lower infrastructure complexity
- transactional integrity
- future extraction of services if scale demands it

## Architectural principles

- DDD-inspired module boundaries
- Pragmatic SOLID
- Schema-first APIs
- Business logic isolated from transport and infrastructure
- Clear separation between public app concerns and internal system concerns

## Layers

### Presentation
- Next.js frontend
- Mobile-first UI
- PWA shell
- public pages and authenticated app pages

### Application
- Fastify routes
- handlers/controllers
- use cases
- policies and orchestration

### Domain
- entities
- value objects
- enums
- domain services
- business invariants

### Infrastructure
- Prisma
- PostgreSQL
- Redis
- email provider
- auth provider
- payments
- object storage
- observability tools

## Realtime strategy

Scoreboard realtime state should be treated separately from persisted history:
- session state is ephemeral
- match history is durable
- do not persist every point to PostgreSQL in real time

## Localization principle

The system is locale-aware, but domain logic remains language-neutral.
