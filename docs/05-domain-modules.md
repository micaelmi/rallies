# Domain Modules

Rallies should be organized by business capability, not by technical type.

## Proposed modules

### identity
Responsibilities:
- application user identity
- auth provider linkage
- internal roles and account state
- locale preference
- profile completion coordination

### profiles
Responsibilities:
- public player profile
- username / slug
- bio
- sport-related metadata
- visibility settings

### clubs
Responsibilities:
- club creation
- membership lifecycle
- club roles
- ownership and admin permissions
- club discovery metadata
- future announcements or chat hooks

### events
Responsibilities:
- event draft and publication lifecycle
- event discovery
- event ownership
- event boosting eligibility
- moderation status

### scoreboard
Responsibilities:
- ephemeral scoreboard sessions
- broadcast rooms
- session privacy
- save-to-history flow
- match association with 2 or 4 players

### wallet
Responsibilities:
- wallet account
- ledger entries
- balance projection
- credit consumption
- entitlement checks

### billing
Responsibilities:
- product pricing
- Stripe integration
- subscription lifecycle
- credit grants from successful payment events
- reconciliation hooks

### support
Responsibilities:
- contact submissions
- feedback and suggestions
- support ticketing or threaded admin handling
- moderation and admin workflows

### admin
Responsibilities:
- operational tooling
- moderation
- audit views
- support management
- manual adjustments with controls

## Module interaction rules

- Modules must communicate through explicit interfaces or application-level contracts
- Cross-module access should be minimal and intentional
- Shared code must not become a hidden second domain

## Example ownership boundaries

- `wallet` owns credit balance logic
- `events` decides event lifecycle
- `billing` handles payment provider orchestration
- `identity` owns account-level state
- `profiles` owns public player presence

## Important note for AI-generated code

AI agents must always place new behavior in the correct module.  
If a feature touches multiple modules, orchestration belongs in the application layer, not in controllers.
