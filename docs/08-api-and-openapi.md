# API and OpenAPI

## API style

- schema-first
- typed
- predictable
- version-ready

## Tooling

- `@fastify/swagger`
- `@fastify/swagger-ui`
- Zod
- `fastify-type-provider-zod`

## Rules

- every route must define request schema
- response schema should be explicit
- OpenAPI must be treated as a contract artifact, not just documentation
- localization behavior should be documented where relevant

## Suggested conventions

- version API under a stable prefix when appropriate
- standard error response structure
- pagination conventions for list endpoints
- explicit auth requirements in protected routes
