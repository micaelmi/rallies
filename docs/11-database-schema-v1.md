# Rallies — Database Schema V1

## Overview

This document defines the relational database schema for the first version of the platform, considering:

- Clerk as the authentication provider
- mandatory profile onboarding after account creation
- clubs with owner/member rules
- optional club linkage for events
- announcements instead of club chat
- matches with guest participants and consent-based invitations for registered users
- wallet with ledger-first design
- support tickets created only by authenticated users

Database target: **PostgreSQL**
ORM target: **Prisma ORM 7.6.0**

---

## Conventions

### Primary keys
- All primary keys use `String` IDs generated as `cuid()` in Prisma.
- Database type: `VARCHAR(191)`

### Timestamps
- `createdAt`: `TIMESTAMP(3)`
- `updatedAt`: `TIMESTAMP(3)`
- `deletedAt` is not used in V1 unless explicitly noted.

### URL fields
- URL fields use `VARCHAR(2048)`.

### Text fields
- short names/titles: `VARCHAR(120)` or `VARCHAR(160)`
- long descriptions/content: `TEXT`

### Money / credits
- money/price fields use `DECIMAL(10,2)`
- wallet credit movements use `INT`

### Locale
- locale fields use `VARCHAR(10)`
- examples: `en`, `pt-BR`, `en-AU`

---

# Enums

## ProfileStatus
- `PENDING`
- `ACTIVE`

## ClubStatus
- `ACTIVE`
- `INACTIVE`
- `ARCHIVED`

## ClubMemberRole
- `OWNER`
- `ADMIN`
- `MEMBER`

## ClubMemberStatus
- `ACTIVE`
- `INVITED`
- `REQUESTED`
- `REMOVED`

## Weekday
- `MONDAY`
- `TUESDAY`
- `WEDNESDAY`
- `THURSDAY`
- `FRIDAY`
- `SATURDAY`
- `SUNDAY`

## EventStatus
- `DRAFT`
- `PUBLISHED`
- `CANCELLED`
- `ARCHIVED`

## MatchFormat
- `SINGLES`
- `DOUBLES`

## MatchStatus
- `PENDING_CONFIRMATION`
- `READY`
- `IN_PROGRESS`
- `FINISHED`
- `CANCELLED`

## ParticipantType
- `USER`
- `GUEST`

## InvitationStatus
- `PENDING`
- `ACCEPTED`
- `DECLINED`
- `EXPIRED`

## ScoreboardSessionStatus
- `LIVE`
- `PAUSED`
- `FINISHED`

## SupportTicketType
- `SUPPORT`
- `FEEDBACK`
- `SUGGESTION`

## SupportTicketStatus
- `OPEN`
- `IN_PROGRESS`
- `ANSWERED`
- `CLOSED`

## LedgerEntryType
- `CREDIT`
- `DEBIT`

## AnnouncementStatus
- `PUBLISHED`
- `ARCHIVED`

---

# Tables

## 1. User

Purpose: internal application user linked to Clerk.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | VARCHAR(191) | PK | Internal user ID |
| clerkUserId | VARCHAR(191) | UK, NOT NULL | Clerk user identifier |
| email | VARCHAR(320) | UK, NOT NULL | Synced from Clerk |
| createdAt | TIMESTAMP(3) | NOT NULL | Default now |
| updatedAt | TIMESTAMP(3) | NOT NULL | Auto-updated |

### Keys
- PK: `id`
- UK: `clerkUserId`
- UK: `email`

---

## 2. Profile

Purpose: application-specific profile completed after signup.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | VARCHAR(191) | PK |  |
| userId | VARCHAR(191) | FK, UK, NOT NULL | 1:1 with `User` |
| username | VARCHAR(30) | UK, NOT NULL | Public unique handle |
| city | VARCHAR(120) | NULL |  |
| state | VARCHAR(120) | NULL |  |
| country | VARCHAR(120) | NOT NULL |  |
| instagramUrl | VARCHAR(2048) | NULL |  |
| description | TEXT | NULL |  |
| preferredLocale | VARCHAR(10) | NOT NULL | ex: `en`, `pt-BR` |
| status | ENUM(ProfileStatus) | NOT NULL | `PENDING` / `ACTIVE` |
| createdAt | TIMESTAMP(3) | NOT NULL |  |
| updatedAt | TIMESTAMP(3) | NOT NULL |  |

### Keys
- PK: `id`
- FK: `userId -> User.id`
- UK: `userId`
- UK: `username`

---

## 3. Club

Purpose: club identity and core information.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | VARCHAR(191) | PK |  |
| name | VARCHAR(120) | NOT NULL |  |
| slug | VARCHAR(80) | UK, NOT NULL | Public URL slug |
| description | TEXT | NOT NULL |  |
| logoUrl | VARCHAR(2048) | NULL |  |
| backgroundImageUrl | VARCHAR(2048) | NULL |  |
| backgroundColorHex | VARCHAR(7) | NULL | Example: `#1A73E8` |
| email | VARCHAR(320) | NOT NULL |  |
| phone | VARCHAR(30) | NULL |  |
| instagramUrl | VARCHAR(2048) | NULL |  |
| country | VARCHAR(120) | NOT NULL |  |
| state | VARCHAR(120) | NULL |  |
| city | VARCHAR(120) | NULL |  |
| address | VARCHAR(255) | NOT NULL |  |
| mapsUrl | VARCHAR(2048) | NULL |  |
| maxMembers | INT | NULL |  |
| ownerId | VARCHAR(191) | FK, NOT NULL | Must also exist in `ClubMember` as `OWNER` |
| status | ENUM(ClubStatus) | NOT NULL |  |
| createdAt | TIMESTAMP(3) | NOT NULL |  |
| updatedAt | TIMESTAMP(3) | NOT NULL |  |

### Keys
- PK: `id`
- FK: `ownerId -> User.id`
- UK: `slug`

### Business rules
- A club must have an owner.
- The owner must also be a member of the club with role `OWNER`.
- `backgroundImageUrl` and `backgroundColorHex` are both optional.
- UI priority: use `backgroundImageUrl` first, fallback to `backgroundColorHex`.

---

## 4. ClubMember

Purpose: membership relation between users and clubs.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | VARCHAR(191) | PK |  |
| clubId | VARCHAR(191) | FK, NOT NULL |  |
| userId | VARCHAR(191) | FK, NOT NULL |  |
| role | ENUM(ClubMemberRole) | NOT NULL |  |
| status | ENUM(ClubMemberStatus) | NOT NULL |  |
| joinedAt | TIMESTAMP(3) | NULL | Filled when active |
| createdAt | TIMESTAMP(3) | NOT NULL |  |
| updatedAt | TIMESTAMP(3) | NOT NULL |  |

### Keys
- PK: `id`
- FK: `clubId -> Club.id`
- FK: `userId -> User.id`
- UK: `(clubId, userId)`

---

## 5. ClubSchedule

Purpose: structured club opening/training schedule.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | VARCHAR(191) | PK |  |
| clubId | VARCHAR(191) | FK, NOT NULL |  |
| weekday | ENUM(Weekday) | NOT NULL |  |
| openTime | VARCHAR(5) | NOT NULL | Format `HH:mm` |
| closeTime | VARCHAR(5) | NOT NULL | Format `HH:mm` |
| label | VARCHAR(120) | NULL | Example: `Beginner training` |
| createdAt | TIMESTAMP(3) | NOT NULL |  |
| updatedAt | TIMESTAMP(3) | NOT NULL |  |

### Keys
- PK: `id`
- FK: `clubId -> Club.id`

---

## 6. ClubPrice

Purpose: structured club pricing entries.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | VARCHAR(191) | PK |  |
| clubId | VARCHAR(191) | FK, NOT NULL |  |
| title | VARCHAR(120) | NOT NULL | Example: `Trial class` |
| description | TEXT | NULL |  |
| price | DECIMAL(10,2) | NOT NULL |  |
| currency | CHAR(3) | NOT NULL | ISO currency, e.g. `AUD` |
| createdAt | TIMESTAMP(3) | NOT NULL |  |
| updatedAt | TIMESTAMP(3) | NOT NULL |  |

### Keys
- PK: `id`
- FK: `clubId -> Club.id`

---

## 7. Event

Purpose: public or private event that may optionally belong to a club.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | VARCHAR(191) | PK |  |
| clubId | VARCHAR(191) | FK, NULL | Optional club relation |
| title | VARCHAR(160) | NOT NULL |  |
| description | TEXT | NOT NULL |  |
| imageUrl | VARCHAR(2048) | NULL |  |
| address | VARCHAR(255) | NOT NULL |  |
| mapsUrl | VARCHAR(2048) | NULL |  |
| startAt | TIMESTAMP(3) | NOT NULL |  |
| endAt | TIMESTAMP(3) | NOT NULL |  |
| registrationUrl | VARCHAR(2048) | NULL | External registration link |
| createdById | VARCHAR(191) | FK, NOT NULL |  |
| status | ENUM(EventStatus) | NOT NULL |  |
| createdAt | TIMESTAMP(3) | NOT NULL |  |
| updatedAt | TIMESTAMP(3) | NOT NULL |  |

### Keys
- PK: `id`
- FK: `clubId -> Club.id`
- FK: `createdById -> User.id`

---

## 8. ClubAnnouncement

Purpose: club communication channel for owners/admins to publish posts that members can read.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | VARCHAR(191) | PK |  |
| clubId | VARCHAR(191) | FK, NOT NULL |  |
| createdById | VARCHAR(191) | FK, NOT NULL | Should be owner/admin |
| title | VARCHAR(160) | NOT NULL |  |
| content | TEXT | NOT NULL |  |
| isPinned | BOOLEAN | NOT NULL | Default false |
| status | ENUM(AnnouncementStatus) | NOT NULL |  |
| createdAt | TIMESTAMP(3) | NOT NULL |  |
| updatedAt | TIMESTAMP(3) | NOT NULL |  |

### Keys
- PK: `id`
- FK: `clubId -> Club.id`
- FK: `createdById -> User.id`

---

## 9. Match

Purpose: durable match definition created before scoreboard session.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | VARCHAR(191) | PK |  |
| createdById | VARCHAR(191) | FK, NOT NULL |  |
| format | ENUM(MatchFormat) | NOT NULL | `SINGLES` or `DOUBLES` |
| bestOf | INT | NOT NULL | Suggested values: 1, 3, 5, 7 |
| status | ENUM(MatchStatus) | NOT NULL |  |
| createdAt | TIMESTAMP(3) | NOT NULL |  |
| updatedAt | TIMESTAMP(3) | NOT NULL |  |

### Keys
- PK: `id`
- FK: `createdById -> User.id`

### Business rules
- A scoreboard session is only created after the match exists.
- Registered users should only become confirmed participants after consent.

---

## 10. MatchParticipant

Purpose: players linked to a match, including guests.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | VARCHAR(191) | PK |  |
| matchId | VARCHAR(191) | FK, NOT NULL |  |
| team | INT | NOT NULL | Usually `1` or `2` |
| position | INT | NULL | Optional player slot within team |
| participantType | ENUM(ParticipantType) | NOT NULL | `USER` or `GUEST` |
| userId | VARCHAR(191) | FK, NULL | Null for guests |
| displayName | VARCHAR(120) | NOT NULL | Snapshot name for history |
| createdAt | TIMESTAMP(3) | NOT NULL |  |

### Keys
- PK: `id`
- FK: `matchId -> Match.id`
- FK: `userId -> User.id`

### Business rules
- Guest participants do not require a user link.
- Application validation should enforce:
  - if `participantType = GUEST`, `userId` must be null
  - if `participantType = USER`, consent flow must exist via invitation

---

## 11. MatchInvitation

Purpose: consent flow for registered users invited to a match.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | VARCHAR(191) | PK |  |
| matchId | VARCHAR(191) | FK, NOT NULL |  |
| invitedUserId | VARCHAR(191) | FK, NOT NULL |  |
| invitedByUserId | VARCHAR(191) | FK, NOT NULL |  |
| status | ENUM(InvitationStatus) | NOT NULL |  |
| createdAt | TIMESTAMP(3) | NOT NULL |  |
| respondedAt | TIMESTAMP(3) | NULL |  |

### Keys
- PK: `id`
- FK: `matchId -> Match.id`
- FK: `invitedUserId -> User.id`
- FK: `invitedByUserId -> User.id`
- UK: `(matchId, invitedUserId)`

---

## 12. ScoreboardSession

Purpose: live session for match scoring.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | VARCHAR(191) | PK |  |
| matchId | VARCHAR(191) | FK, UK, NOT NULL | One session per match in V1 |
| createdById | VARCHAR(191) | FK, NOT NULL |  |
| isPublic | BOOLEAN | NOT NULL | Default false |
| status | ENUM(ScoreboardSessionStatus) | NOT NULL |  |
| createdAt | TIMESTAMP(3) | NOT NULL |  |
| endedAt | TIMESTAMP(3) | NULL |  |

### Keys
- PK: `id`
- FK: `matchId -> Match.id`
- FK: `createdById -> User.id`
- UK: `matchId`

---

## 13. Game

Purpose: per-game score inside a match.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | VARCHAR(191) | PK |  |
| matchId | VARCHAR(191) | FK, NOT NULL |  |
| gameNumber | INT | NOT NULL | 1..N |
| team1Points | INT | NOT NULL |  |
| team2Points | INT | NOT NULL |  |
| createdAt | TIMESTAMP(3) | NOT NULL |  |

### Keys
- PK: `id`
- FK: `matchId -> Match.id`
- UK: `(matchId, gameNumber)`

---

## 14. Wallet

Purpose: per-user wallet projection.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | VARCHAR(191) | PK |  |
| userId | VARCHAR(191) | FK, UK, NOT NULL | One wallet per user |
| currentBalance | INT | NOT NULL | Cached/projection balance |
| createdAt | TIMESTAMP(3) | NOT NULL |  |
| updatedAt | TIMESTAMP(3) | NOT NULL |  |

### Keys
- PK: `id`
- FK: `userId -> User.id`
- UK: `userId`

### Business rule
- `currentBalance` is a projection/cache.
- The **source of truth** is `LedgerEntry`.

---

## 15. LedgerEntry

Purpose: immutable wallet credit movements.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | VARCHAR(191) | PK |  |
| walletId | VARCHAR(191) | FK, NOT NULL |  |
| type | ENUM(LedgerEntryType) | NOT NULL | `CREDIT` / `DEBIT` |
| amount | INT | NOT NULL | Positive integer |
| referenceType | VARCHAR(80) | NULL | Example: `subscription`, `event`, `manual_adjustment` |
| referenceId | VARCHAR(191) | NULL | Related entity ID if applicable |
| description | TEXT | NULL |  |
| createdAt | TIMESTAMP(3) | NOT NULL |  |

### Keys
- PK: `id`
- FK: `walletId -> Wallet.id`

### Business rules
- Entries should be immutable.
- Balance should be derived from ledger history.

---

## 16. SupportTicket

Purpose: authenticated user contact request.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | VARCHAR(191) | PK |  |
| createdById | VARCHAR(191) | FK, NOT NULL | Only logged users can create |
| type | ENUM(SupportTicketType) | NOT NULL |  |
| title | VARCHAR(160) | NOT NULL |  |
| description | TEXT | NOT NULL |  |
| status | ENUM(SupportTicketStatus) | NOT NULL |  |
| answer | TEXT | NULL | Latest/admin answer |
| answeredById | VARCHAR(191) | FK, NULL |  |
| answeredAt | TIMESTAMP(3) | NULL |  |
| createdAt | TIMESTAMP(3) | NOT NULL |  |
| updatedAt | TIMESTAMP(3) | NOT NULL |  |

### Keys
- PK: `id`
- FK: `createdById -> User.id`
- FK: `answeredById -> User.id`

---

# Relationship Summary

- `User 1:1 Profile`
- `User 1:N Club (owner)`
- `User N:N Club` through `ClubMember`
- `Club 1:N ClubSchedule`
- `Club 1:N ClubPrice`
- `Club 1:N ClubAnnouncement`
- `Club 1:N Event` (optional from event side)
- `User 1:N Event` as creator
- `User 1:N Match` as creator
- `Match 1:N MatchParticipant`
- `Match 1:N MatchInvitation`
- `Match 1:1 ScoreboardSession`
- `Match 1:N Game`
- `User 1:1 Wallet`
- `Wallet 1:N LedgerEntry`
- `User 1:N SupportTicket` as creator

---

# Validation Rules That Should Also Exist in the Application Layer

These rules are important but are not fully expressed by Prisma alone:

1. **Club owner must also exist in `ClubMember`** with role `OWNER`.
2. **Match participant guest rule**:
   - guest => `userId = null`
   - user => accepted invitation required
3. **Background color** should be validated as a proper hex value.
4. **Schedule time strings** should be validated as `HH:mm`.
5. **`bestOf`** should be restricted to accepted values.
6. **Only club owner/admin** can create announcements.
7. **Only logged users** can create support tickets.
8. **Ledger entries must be immutable** after creation.

---

# Suggested Indexes

Besides PK/UK/FK indexes, add indexes for common queries:

- `Profile.username`
- `Club.slug`
- `Club.city`
- `Event.startAt`
- `Event.status`
- `Event.clubId`
- `ClubAnnouncement.clubId, createdAt`
- `Match.createdById`
- `MatchParticipant.matchId`
- `MatchInvitation.invitedUserId, status`
- `ScoreboardSession.status`
- `LedgerEntry.walletId, createdAt`
- `SupportTicket.createdById, status`

