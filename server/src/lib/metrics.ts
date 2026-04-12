import type { NextFunction, Request, Response } from "express";
import client from "prom-client";

const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request latency in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register]
});

export const romanConversionsTotal = new client.Counter({
  name: "roman_numeral_conversions_total",
  help: "Total Roman numeral conversions served",
  labelNames: ["mode"],
  registers: [register]
});

export const cacheHitsTotal = new client.Counter({
  name: "roman_cache_hits_total",
  help: "Cache hits for Roman conversion results",
  labelNames: ["tier"],
  registers: [register]
});

export const cacheMissesTotal = new client.Counter({
  name: "roman_cache_misses_total",
  help: "Cache misses for Roman conversion results",
  registers: [register]
});

export function metricsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();
    res.on("finish", () => {
      const route = req.route?.path || req.path || "unknown";
      const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
      httpRequestDuration
        .labels(req.method, route, String(res.statusCode))
        .observe(durationSec);
    });
    next();
  };
}

export async function metricsHandler(_req: Request, res: Response) {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
}
