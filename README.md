# Roman Numeral Web Application

Full-stack implementation of the **Adobe & AEM Engineering Test** (revision 1.0): an HTTP service that converts integers to Roman numerals, plus a React front end, production-oriented logging, metrics, caching, container tooling, and automated tests.

Specification reference for numerals: [Roman numerals (Wikipedia)](https://en.wikipedia.org/wiki/Roman_numerals).

## Features

- **Stack:** **TypeScript** end-to-end (strict mode): Express API compiles to `server/dist/`; React UI is `.tsx` via Vite.
- **API** (Express on Node 20+)
  - `GET /romannumeral?query={integer}` → JSON `{ "input": "<string>", "output": "<string>" }` (**subtractive** classical form by default, e.g. `IV` for 4).
  - Optional **`additive`**: `additive=true`, `1`, `yes`, or `on` (case-insensitive) requests **additive** classical form where applicable (e.g. `IIII` for 4, and for n ≥ 4000 an **additive** thousands block before vinculum, e.g. four barred I’s for 4000). Same parameter on range queries: `?min=1&max=5&additive=true`. **Default** is subtractive everywhere: 1–3999, the **⌊n/1000⌋** thousands block with overlines, and the remainder 0–999.
  - **Extension 1:** supported range **1–3,999,999**: **1–3999** use ordinary subtractive form (e.g. 1001 → `MI`). From **4000** upward, the thousands factor uses **vinculum** (Unicode U+0305 after each glyph in that block). By default that block is **subtractive** Roman (e.g. 4000 → `IV` with combining overlines). With **`additive=true`**, the thousands block uses expanded additive symbols before barring (e.g. `IIII` with overlines).
  - **Extension 2:** `GET /romannumeral?min={integer}&max={integer}` with ascending `conversions` array; range work is split into chunks processed concurrently via `Promise.all` (async parallel batches).
  - **OpenAPI:** `GET /openapi.json` returns an OpenAPI 3.0.3 spec documenting `/romannumeral`, `/health`, `/metrics`, and schema examples.
  - Validation errors return JSON as `{ "error": { "message": "<details>" } }` with appropriate HTTP status codes.
  - Conversion logic is **hand-written** (no Roman-numeral libraries).
- **Front end:** React 19 + Vite; calls the same API (relative URLs when served by the server).
- **Extension 3 / operations**
  - **Logging:** [Pino](https://github.com/pinojs/pino) + `pino-http` (structured request logs; JSON in production).
  - **Metrics:** [prom-client](https://github.com/siimon/prom-client) on `GET /metrics` (Prometheus scrape).
  - **Caching:** Redis when `REDIS_URL` is set; always backed by an in-memory **LRU** (hits/misses instrumented).
  - **Docker:** multi-stage `Dockerfile` and `docker-compose.yml` (app + Redis + Prometheus sample config).

## Packaging layout

```
roman-numeral-converter/
├── client/                 # React (Vite) UI — `src/*.tsx`
├── server/
│   ├── src/                # Express app, routes, services, lib (`*.ts`)
│   ├── dist/               # `tsc` output (production `npm start`)
│   ├── public/             # Populated by build: Vite output for static hosting
│   ├── scripts/copy-client.cjs
│   └── test/               # Node test runner + tsx + supertest (`*.test.ts`)
├── ops/prometheus.yml      # Example scrape config for docker-compose
├── docker-compose.yml
├── Dockerfile
└── package.json            # npm workspaces (client + server)
```

## Prerequisites

- Node.js **20+**
- npm 10+
- Optional: Docker / Docker Compose for containerized run and Redis/Prometheus demo

## Build and run (local)

```bash
npm install
npm run dev
```

- API + static (when built): [http://localhost:8080](http://localhost:8080) — start only the server after a full build; in dev, run both workspaces.
- Vite dev server: [http://localhost:5173](http://localhost:5173) (proxies `/romannumeral`, `/health`, `/metrics` to port 8080).

**Terminal 1 — API**

```bash
npm run dev -w server
```

**Terminal 2 — UI (optional in dev)**

```bash
npm run dev -w client
```

**Production-style single process (build UI into `server/public`, then start Node):**

```bash
npm run build
npm start
```

Environment variables are documented in `.env.example`.

## Docker Compose

Builds the UI, bakes static files into the image, and runs the API with Redis and a local Prometheus that scrapes `app:8080/metrics`.

```bash
docker compose up --build
```

- App: [http://localhost:8080](http://localhost:8080)
- Prometheus: [http://localhost:9090](http://localhost:9090)

## Testing

**Methodology:** unit tests cover the pure conversion and range assembler; HTTP tests assert status codes, content types (JSON for success and validation errors), and response shapes using **supertest** against the Express app factory (no network listen).

```bash
npm test
```

**Typecheck only:** `npm run typecheck -w server` and `npm run typecheck -w client`.

## GitHub Actions CI

A GitHub Actions workflow is included at `.github/workflows/ci.yml`.

- Triggers on pushes and pull requests to `main` (plus manual runs).
- Runs `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
- Builds the Docker image in CI (`docker build`) without pushing.

## Engineering notes

- **Security / robustness:** `helmet`, `compression`, configurable **CORS**, and rate limiting on `/romannumeral`.
- **Observability:** request duration histogram, conversion counters (including cache hits path), default process metrics.
- **Hosting:** any Node-friendly host (Fly.io, Render, ECS, etc.); point Prometheus at `/metrics`; ship logs to your aggregator (Datadog, Loki, CloudWatch) by consuming stdout JSON from Pino.

## Dependencies (attribution)

| Area        | Packages |
|------------|----------|
| Runtime    | `express`, `dotenv`, `cors`, `helmet`, `compression`, `express-rate-limit`, `pino`, `pino-http`, `prom-client`, `ioredis`, `lru-cache` |
| Dev / test | `typescript`, `tsx`, `typescript-eslint`, `@types/*`, `concurrently`, `eslint`, `supertest`, `pino-pretty`, `vite`, `@vitejs/plugin-react`, `vitest`, `jsdom`, React 19 |

Roman numeral **algorithm** is implemented in `server/src/services/roman.ts` without third-party numeral libraries, per the assessment rules.

## License

Assessment / portfolio project.
