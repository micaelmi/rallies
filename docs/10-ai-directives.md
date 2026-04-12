# AI Directives

These directives are mandatory for any AI programming agent working on Rallies.

## Priority order

1. Follow the docs
2. Respect architecture boundaries
3. Preserve security and invariants
4. Prefer clarity over cleverness

## Mandatory rules

- do not invent architecture
- do not bypass the defined module structure
- do not put business logic in controllers
- do not access Prisma directly from route handlers
- always define schemas before implementing routes
- always respect localization rules
- never use translated strings as business values

## Code generation expectations

AI should:
- implement one focused unit of work at a time
- explain assumptions
- avoid unnecessary abstraction
- use explicit naming
- prefer existing patterns over inventing new ones

## Financial / wallet restrictions

For wallet, billing, or entitlement code:
- do not invent shortcuts
- do not mutate balances casually
- do not skip auditability
- do not bypass idempotency requirements

## Realtime restrictions

For scoreboard broadcasting:
- keep ephemeral state separate from durable persistence
- do not write each point directly to the match history table

## Localization restrictions

- no hardcoded user-facing UI text in the wrong layer
- language-neutral enums only
- use locale-aware behavior only where appropriate
