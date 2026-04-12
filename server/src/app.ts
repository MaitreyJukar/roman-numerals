import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import compression from "compression";
import cors from "cors";
import express, { type Application, type ErrorRequestHandler } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { logger } from "./lib/logger.js";
import { metricsHandler, metricsMiddleware } from "./lib/metrics.js";
import romannumeral from "./routes/romannumeral.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseOrigins(): boolean | string[] {
  const raw = process.env.CORS_ORIGINS;
  if (!raw || raw.trim() === "") {
    if (process.env.NODE_ENV === "production") return false;
    return true;
  }
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export function createApp(): Application {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(
    cors({
      origin: parseOrigins(),
      credentials: true
    })
  );
  app.use(express.json({ limit: "32kb" }));
  app.use(
    pinoHttp({
      logger,
      customLogLevel(_req: IncomingMessage, res: ServerResponse, err?: Error) {
        if (res.statusCode >= 500 || err) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      }
    })
  );
  app.use(metricsMiddleware());

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use("/romannumeral", apiLimiter);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  app.get("/ready", (_req, res) => {
    res.json({ status: "ready" });
  });

  app.get("/metrics", metricsHandler);

  app.use("/romannumeral", romannumeral);

  const publicDir = path.join(__dirname, "..", "public");
  app.use(express.static(publicDir, { index: false, fallthrough: true }));

  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    if (req.path.startsWith("/romannumeral") || req.path.startsWith("/metrics")) {
      return next();
    }
    if (/\.[a-z0-9]+$/i.test(req.path)) return next();
    res.sendFile(path.join(publicDir, "index.html"), (err) => {
      if (err) next(err);
    });
  });

  const onError: ErrorRequestHandler = (err, req, res, _next) => {
    req.log?.error({ err }, "unhandled error");
    if (res.headersSent) return;
    res.status(500).type("text/plain").send("Internal Server Error");
  };
  app.use(onError);

  return app;
}
