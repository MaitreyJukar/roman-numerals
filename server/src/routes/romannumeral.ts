import { Router } from "express";
import type { ParsedQs } from "qs";
import { getCache, setCache } from "../lib/cache.js";
import { romanConversionsTotal } from "../lib/metrics.js";
import { logger } from "../lib/logger.js";
import {
  ROMAN_MAX,
  ROMAN_MIN,
  toRoman,
  toRomanRangeParallel
} from "../services/roman.js";

const router = Router();

function queryFirst(
  value: string | ParsedQs | (string | ParsedQs)[] | undefined
): string | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    const v = value[0];
    if (v === undefined) return undefined;
    return typeof v === "string" ? v : undefined;
  }
  if (typeof value === "string") return value;
  return undefined;
}

/** Truthy: 1, true, yes, on (case-insensitive). */
function parseAdditiveFlag(raw: string | undefined): boolean {
  if (raw === undefined) return false;
  const s = raw.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

type ParseOk = { ok: true; value: number };
type ParseErr = { ok: false; error: string };
type ParseResult = ParseOk | ParseErr;

function parseIntParam(name: string, raw: string | undefined): ParseResult {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: false, error: `Missing required query parameter: ${name}` };
  }
  const trimmed = String(raw).trim();
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, error: `${name} must be a positive base-10 integer` };
  }
  const n = Number.parseInt(trimmed, 10);
  return { ok: true, value: n };
}

function assertInRange(n: number, label: string): string | null {
  if (n < ROMAN_MIN || n > ROMAN_MAX) {
    return `${label} must be between ${ROMAN_MIN} and ${ROMAN_MAX} inclusive`;
  }
  return null;
}

/**
 * Roman numeral conversion endpoint.
 *
 * OpenAPI contract is exposed at GET /openapi.json.
 * - Single value: GET /romannumeral?query=12[&additive=true]
 * - Range values: GET /romannumeral?min=1&max=3[&additive=true]
 */
router.get("/", async (req, res, next) => {
  try {
    const hasMin = req.query.min !== undefined;
    const hasMax = req.query.max !== undefined;
    const hasQuery = req.query.query !== undefined;
    const additive = parseAdditiveFlag(queryFirst(req.query.additive));

    if (hasMin || hasMax) {
      if (!hasMin || !hasMax) {
        return res.status(400).type("text/plain").send("Both min and max query parameters are required for range conversion");
      }
      const minR = parseIntParam("min", queryFirst(req.query.min));
      if (!minR.ok) return res.status(400).type("text/plain").send(minR.error);
      const maxR = parseIntParam("max", queryFirst(req.query.max));
      if (!maxR.ok) return res.status(400).type("text/plain").send(maxR.error);

      const min = minR.value;
      const max = maxR.value;
      const e1 = assertInRange(min, "min");
      if (e1) return res.status(400).type("text/plain").send(e1);
      const e2 = assertInRange(max, "max");
      if (e2) return res.status(400).type("text/plain").send(e2);
      if (min >= max) {
        return res.status(400).type("text/plain").send("min must be strictly less than max");
      }

      const maxRange = (() => {
        const raw = Number.parseInt(process.env.ROMAN_MAX_RANGE_SIZE || "10000", 10);
        if (!Number.isFinite(raw) || raw < 1) return 10_000;
        return Math.min(raw, 50_000);
      })();
      const inclusiveCount = max - min + 1;
      if (inclusiveCount > maxRange) {
        return res
          .status(400)
          .type("text/plain")
          .send(
            `Range too large: ${inclusiveCount} values requested; maximum inclusive range is ${maxRange} (set ROMAN_MAX_RANGE_SIZE up to 50000)`
          );
      }

      const cacheKey = `range:${min}:${max}:a${additive ? 1 : 0}`;
      const cached = await getCache(cacheKey);
      if (cached) {
        romanConversionsTotal.labels("range_cached").inc();
        return res.json(cached as { conversions: { input: string; output: string }[] });
      }

      const conversions = await toRomanRangeParallel(min, max, { additive });
      const payload = { conversions };
      await setCache(cacheKey, payload);
      romanConversionsTotal.labels("range").inc();
      logger.info({ min, max, count: conversions.length, additive }, "roman range converted");
      return res.json(payload);
    }

    if (hasQuery) {
      const q = parseIntParam("query", queryFirst(req.query.query));
      if (!q.ok) return res.status(400).type("text/plain").send(q.error);
      const n = q.value;
      const e = assertInRange(n, "query");
      if (e) return res.status(400).type("text/plain").send(e);

      const cacheKey = `single:${n}:a${additive ? 1 : 0}`;
      const cached = await getCache(cacheKey);
      if (cached) {
        romanConversionsTotal.labels("single_cached").inc();
        return res.json(cached as { input: string; output: string });
      }

      const payload = { input: String(n), output: toRoman(n, additive) };
      await setCache(cacheKey, payload);
      romanConversionsTotal.labels("single").inc();
      return res.json(payload);
    }

    return res
      .status(400)
      .type("text/plain")
      .send('Provide query (e.g. ?query=12) or range (e.g. ?min=1&max=3)');
  } catch (err) {
    next(err);
  }
});

export default router;
