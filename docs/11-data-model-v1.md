# Data Model V1

This document defines the conceptual V1 model. The database schema is the implementation source of truth, but this file should explain intent.

## Core entities

### User
Represents internal account identity.

Suggested concerns:
- auth provider linkage
- email
- role
- status
- preferred locale
- timestamps

### Profile
Represents public player-facing identity.

Suggested concerns:
- username
- display name
- avatar
- bio
- city / country
- sport metadata
- visibility settings

### Club
Represents a club/group.

Suggested concerns:
- owner
- name
- description
- location metadata
- discovery visibility

### ClubMember
Represents membership and role in a club.

### Event
Represents a tournament or related activity.

Suggested concerns:
- owner / creator
- title
- description
- location
- lifecycle status
- boost status
- publication metadata

### ScoreboardSession
Represents transient scoreboard state metadata.

### Match
Represents saved durable match history.

### Wallet
Represents the user credit account.

### LedgerEntry
Represents immutable wallet transactions.

## Modeling principles

- separate identity from profile
- use ledger thinking for credits
- preserve ownership and auditability
- keep enums language-neutral
