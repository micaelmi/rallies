# CI/CD

## Goals

CI/CD in Rallies should guarantee:
- safe merges
- automated validation
- predictable deployments
- strong feedback loops for AI-assisted development

## Continuous Integration

On each pull request, run at minimum:

- dependency installation with lockfile enforcement
- type checking
- linting
- unit tests
- integration tests
- application build
- schema validation
- migration checks
- secret scanning
- dependency vulnerability scanning

## Continuous Delivery

Recommended flow:

### Staging
- automatic deploy from main
- smoke tests after deploy
- environment validation
- health check verification

### Production
- controlled deployment approval
- migration safety checks
- rollback path
- post-deploy smoke tests

## Database delivery rules

- forward-only migrations
- backup strategy before risky production migrations
- no manual hotfixes directly in production schema without controlled process

## Why this matters for AI-generated code

AI can produce code quickly, but CI/CD is what stops unsafe or inconsistent changes from reaching production.
