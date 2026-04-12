# Security

## Baseline

Security is a core requirement of Rallies, especially because the platform includes:
- identity
- public profiles
- internal messaging/support
- credits and payments
- broadcast and realtime interactions

Use OWASP-style controls as the minimum baseline.

## Main protections

- strict input validation
- authentication and authorization separation
- webhook verification
- secure headers
- rate limiting
- audit logging for privileged or financial actions
- immutable ledger thinking for wallet operations

## Wallet-specific rules

- credit balance must not be trusted from the client
- all purchases must be confirmed server-side
- idempotency is required for financial flows
- reconciliation jobs should exist for safety

## Realtime security

- connection identity must be validated
- room access must be authorized
- private scoreboard sessions must remain private unless explicitly shared
