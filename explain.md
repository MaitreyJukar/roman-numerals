# Explain.md

## Problem understanding

The project is a **Roman numeral converter** exposed over HTTP. Clients send integers (or an inclusive range) and receive Roman strings in **JSON**. The brief’s classical form is **subtractive by default** (e.g. 4 → `IV`); an optional **additive** mode expands subtractive pairs where applicable (e.g. 4 → `IIII`). The project also expands the max integer conversion value from 3999 to 3999999 including the **thousands block** when using vinculum for values ≥ 4000.

---

## Approach and layout

The repo is an **npm workspaces** monorepo:

- **`server/`** — Express (TypeScript): routes, services, shared libs (`cache`, `metrics`, `logger`), static UI after build.
- **`client/`** — React + Vite (TypeScript): calls the same API with relative URLs in production.

Design is layered by responsibility (not a heavy MVC framework):

- **Routes** — parse query strings, validate range rules, HTTP status codes, cache keys, metrics labels.
- **Services** — pure conversion (`roman.ts`): greedy subtractive base for 1–3999, additive expansion, vinculum prefix for larger values (4000 - 3999999).
- **Libs** — Redis + in-memory LRU cache, Prometheus metrics, Pino logging.

The above split keeps conversion logic easy to unit test while HTTP and ops concerns stay at the edges.

---

## Roman numeral conversion

For **1–3999**, conversion uses a **greedy subtractive** iteration over fixed `(value, symbol)` pairs (1000/`M`, 900/`CM`, …), which matches common subtractive Roman rules.

For **4_000_000 > n ≥ 4000**, the integer is split into **⌊n/1000⌋** (thousands factor) and **n mod 1000** (remainder). The thousands factor is rendered in ordinary Roman (subtractive or additive per flag), then each base letter block gets a **combining overline** (U+0305) — a practical “vinculum” representation in plain Unicode. The remainder uses the same 1–3999 path with no overline.

`toRomanRangeParallel` fills results in **parallel chunks** (`Promise.all` over chunk tasks) with a **preallocated array** indexed by value so order stays correct without large intermediate `slice`/`flat` structures.

---

## Extensions implemented

| Area | What shipped |
|------|----------------|
| **Range** | `GET /romannumeral?min=&max=` returns `{ conversions: [{ input, output }, …] }`, bounded by `ROMAN_MAX_RANGE_SIZE` (env, capped). |
| **Additive mode** | `additive` query flag (truthy: `1`, `true`, `yes`, `on`) for single and range. |
| **Caching** | Redis when `REDIS_URL` is set, always backed by an **LRU**; cache keys include additive flag. |
| **Metrics** | `GET /metrics` (Prometheus text); conversion counters include cache-hit paths. |
| **Logging** | Structured **Pino** + `pino-http` request logs. |
| **Security / robustness** | `helmet`, `compression`, CORS from env, **rate limit** on `/romannumeral`. |
| **API contract** | **OpenAPI 3.0.3** at `GET /openapi.json`. |
| **Docker** | Multi-stage `Dockerfile`; `docker-compose.yml` for app + Redis + sample Prometheus. |

---

## Error handling

Validation failures (missing/invalid query params, out-of-range integers, bad range bounds, range too large) return **HTTP 400** with JSON:

```json
{ "error": { "message": "…" } }
```

Success responses stay JSON (`{ input, output }` or `{ conversions }`). Unhandled server errors still use the Express error handler (500 plain text).

---

## Testing strategy

- **Unit tests** — `roman.ts` subtractive/additive/vinculum edge cases and `toRomanRangeParallel` ordering and options.
- **HTTP tests** — Supertest against `createApp()`: status codes, JSON shapes, OpenAPI document presence, additive flag behavior.

---

## Tradeoffs and future work

- **Reverse conversion** (Roman → integer) is not implemented; it needs a separate parser and ambiguity rules.
- **500 errors** could adopt the same JSON `{ error: { message } }` envelope as 400 for a single client contract.
- **Cache TTL / invalidation** is environment-driven; tuning depends on traffic and how stale answers may be.
- **Horizontal scale** would need shared Redis (already supported) and sticky or stateless rate-limit strategy if moved beyond in-memory defaults.
