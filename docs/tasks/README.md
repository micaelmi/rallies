# Rallies – MVP Task Management & Execution Guide

This directory contains the granular, actionable task breakdown for each phase of the Rallies MVP Roadmap (`docs/13-mvp-roadmap.md`). These task files orient AI agents and developers during implementation, ensuring strict adherence to architecture boundaries, schema-first development, and automated verification.

---

## Task Status Tracking Convention

Each task and sub-item is tracked using standard markdown checkboxes and status tags. When working on a task, update the status in the corresponding phase file:

- `[ ]` **PENDING**: The task is ready for development but has not started.
- `[/]` **IN PROGRESS**: Work is actively underway on this task.
- `[x]` **FINISHED**: All deliverables, review items, tests, and repo updates are complete and verified.

---

## Task Structure & Categories

Each task entry includes four key dimensions:
1. **Development (`Dev`)**: Implementing schemas, domain services, repositories, route handlers, or frontend pages.
2. **Review (`Review`)**: Architectural and security checks (e.g., ensuring no `Prisma` calls in controllers, Zod validation enforcement, OWASP ASVS checks).
3. **Testing (`Test`)**: Writing unit (`Vitest`), integration (`Fastify` + `Prisma`), and E2E (`Playwright`) suites.
4. **Repo Update (`Repo`)**: Updating OpenAPI definitions, documentation, lockfile (`pnpm-lock.yaml`), or module registries.

---

## MVP Phase Task Files

- **[Phase 1: Profiles Polish & Public Presence](file:///c:/Micael/projects/rallies/docs/tasks/phase-1-profiles.md)**
- **[Phase 2: Wallet Ledger & Stripe Billing Economy](file:///c:/Micael/projects/rallies/docs/tasks/phase-2-wallet-billing.md)**
- **[Phase 3: Clubs & Events Ecosystem](file:///c:/Micael/projects/rallies/docs/tasks/phase-3-clubs-events.md)**
- **[Phase 4: Realtime Scoreboard & Durable Match History](file:///c:/Micael/projects/rallies/docs/tasks/phase-4-scoreboard.md)**
- **[Phase 5: Support, Moderation & Admin Tooling](file:///c:/Micael/projects/rallies/docs/tasks/phase-5-support-admin.md)**
- **[Phase 6: PWA Readiness, Performance & Security Hardening Gate](file:///c:/Micael/projects/rallies/docs/tasks/phase-6-pwa-performance-security.md)**

---

## AI Agent Directives for Task Execution
When an AI agent (Codex / Antigravity) picks up a task from this directory:
1. **Read Before Editing**: Always read `docs/04-backend-standards.md`, `docs/10-ai-directives.md`, and the current module files before writing code.
2. **One Task at a Time**: Complete all sub-items (`Dev`, `Review`, `Test`, `Repo`) for a single task before marking it `[x] FINISHED`.
3. **Respect Module Boundaries**: Never bypass the flat domain module layout (`types`, `schemas`, `repository`, `service`, `controller`, `routes`).
4. **Update Status**: When picking up a task, mark its status as `[/] IN PROGRESS`. Upon passing all acceptance criteria and tests, change it to `[x] FINISHED`.
