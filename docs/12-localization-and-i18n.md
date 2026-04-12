# Localization and Internationalization

## Supported locales

Initial locales:
- `en`
- `pt-BR`

## Core principles

- localization is a first-class requirement
- business logic must not depend on translated strings
- English is the fallback
- user preference overrides browser language where available

## Frontend implications

- use translation keys for interface text
- avoid hardcoded user-facing strings
- prepare locale-based routing and metadata

## Backend implications

- backend should be locale-aware, not locale-dependent
- emails and notifications should be localized using user preference
- enums, statuses, and system values remain language-neutral

## Data implications

- store user preferred locale
- user-generated content may remain in original language in V1
- translated system-managed content can evolve later
