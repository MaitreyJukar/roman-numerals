# Explain.md

## AI usage disclosure

For building this project, AI was used as an **engineering assistant**, not as the primary author of core business logic.

### What I built myself (without AI)

- Core Roman numeral conversion logic in `server/src/services/roman.ts`.
- API route implementation, request/response flow, and error handling in `server/src/routes/romannumeral.ts`.
- Entire Frontend client implementation in `client/`.

### Where I used AI

I used AI to **enhance and harden** the implementation after the core was already written by me:

- Add and refine Redis + in-memory caching integration.
- Add observability features (Prometheus metrics and related wiring).
- Add and improve Docker artifacts (`Dockerfile`, `docker-compose.yml`).
- Add and improve unit/integration tests.
- Help with refactors, lint/type fixes, and contract/documentation consistency (including OpenAPI and README alignment).

### AI vendor / agent / tools

- **Vendor / environment:** Cursor IDE AI assistant.
- **Agent:** Cursor coding agent (LLM-based pair-programming assistant).
- **Tools used through the agent workflow:** code edits, repository search/read tools, shell execution for lint/test/build verification, and iterative patching.

### AI workflow / process

1. I designed and implemented the core functionality myself first (conversion logic, API behavior, and client).
2. I then used AI for targeted improvements (ops features, test coverage, and code quality).
3. I reviewed and accepted/rejected AI-generated suggestions manually.
4. I validated changes by running lint, typecheck, tests, and build.
5. I made follow-up manual adjustments to preserve intended behavior and keep the code aligned with project requirements.

### Reason for this approach

I used AI to speed up repetitive or boilerplate-heavy engineering tasks (infrastructure setup, test scaffolding, and consistency updates) while keeping ownership of core logic and product behavior. This helped me build the overall infrastructure with a higher velocity with correctness and code understanding.
