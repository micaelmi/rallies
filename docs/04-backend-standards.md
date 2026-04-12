# Backend Standards

## Core layering rules

- Route handlers must not contain business rules
- Use cases orchestrate application behavior
- Repositories abstract database persistence
- Infrastructure code must not leak into domain code

## Validation rules

- All external inputs must be validated
- Zod is the source of truth for route contracts
- Unknown fields should be rejected where appropriate

## Error handling

- Centralized error handling is required
- Domain errors should be typed and explicit
- API responses should be consistent

## Logging

- Structured logs only
- Include request correlation IDs where possible
- Never log secrets or sensitive tokens

## Localization rules

- Never encode business decisions in translated strings
- Enums and statuses must stay language-neutral

## Forbidden patterns

- Prisma calls directly inside route handlers
- business logic inside controllers
- generic base classes with unclear value
- dumping business rules into `utils`
