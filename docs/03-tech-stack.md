# Tech Stack

## Frontend

### Framework
- Next.js
- TypeScript

### UI
- Tailwind CSS
- shadcn/ui for consistent primitives

### App behavior
- App Router
- Server Components preferred by default
- Client Components only where interactivity is required
- PWA support

### Localization
Recommended:
- `next-intl` or equivalent locale-aware frontend solution

## Backend

### API framework
- Fastify
- TypeScript
- `fastify-type-provider-zod`

### Validation and contracts
- Zod for request and response schemas
- `@fastify/swagger`
- `@fastify/swagger-ui`

### Logging
- Pino

### Realtime
- WebSocket support, with strict authorization rules
- Redis can be introduced for session coordination when needed

## Data layer

### Primary database
- PostgreSQL

### ORM
- Prisma

### Cache / ephemeral state / queues
- Redis

## External services

### Authentication
- Clerk or another mature third-party auth provider

### Payments
- Stripe

### Email
- Resend or Postmark

### Storage
- S3-compatible object storage

## Quality and tooling

### Testing
- Vitest
- Playwright

### CI/CD
- GitHub Actions

### Observability
- Sentry
- OpenTelemetry
- structured logs

## Why this stack

This stack supports:
- fast product iteration
- strong typing
- excellent backend performance
- schema-driven development
- scalable architecture without early overengineering
- strong compatibility with AI-generated code workflows
