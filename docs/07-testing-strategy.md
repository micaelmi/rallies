# Testing Strategy

## Philosophy

Rallies should use DDD for architecture and selective TDD for critical business logic.

## Test pyramid

### Unit tests
Use for:
- wallet calculations
- domain policies
- permission logic
- scoreboard transitions
- event eligibility rules

### Integration tests
Use for:
- repositories
- Fastify routes
- Prisma integrations
- authz boundaries
- Stripe webhook handlers
- save-match flows

### End-to-end tests
Use for:
- sign up / first access
- profile setup
- club creation
- event creation
- credit purchase
- credit spending
- scoreboard flow
- match persistence

## Priority areas

- wallet and ledger
- permissions
- subscriptions and entitlements
- scoreboard privacy and persistence
