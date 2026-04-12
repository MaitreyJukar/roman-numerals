import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import request from "supertest";
import type { Application } from "express";
import { createApp } from "../src/app.js";

describe("HTTP API", () => {
  let app: Application;

  before(() => {
    app = createApp();
  });

  it("GET /romannumeral?query=1 returns JSON strings", async () => {
    const res = await request(app).get("/romannumeral").query({ query: "1" });
    assert.equal(res.status, 200);
    assert.equal(res.type, "application/json");
    assert.equal(res.body.input, "1");
    assert.equal(res.body.output, "I");
  });

  it("rejects missing query with plain text", async () => {
    const res = await request(app).get("/romannumeral");
    assert.equal(res.status, 400);
    assert.equal(res.type, "text/plain");
    assert.match(res.text, /Provide query/i);
  });

  it("rejects invalid integer", async () => {
    const res = await request(app).get("/romannumeral").query({ query: "x" });
    assert.equal(res.status, 400);
    assert.equal(res.type, "text/plain");
  });

  it("rejects out of range", async () => {
    const res = await request(app).get("/romannumeral").query({ query: "4000000" });
    assert.equal(res.status, 400);
    assert.equal(res.type, "text/plain");
  });

  it("accepts extended-range query", async () => {
    const res = await request(app).get("/romannumeral").query({ query: "4000" });
    assert.equal(res.status, 200);
    assert.equal(res.body.input, "4000");
    const o = "\u0305";
    assert.equal(res.body.output, `I${o}V${o}`);
  });

  it("additive query returns additive classical form", async () => {
    const res = await request(app).get("/romannumeral").query({ query: "4", additive: "true" });
    assert.equal(res.status, 200);
    assert.equal(res.body.input, "4");
    assert.equal(res.body.output, "IIII");
  });

  it("additive=1 enables additive form", async () => {
    const res = await request(app).get("/romannumeral").query({ query: "9", additive: "1" });
    assert.equal(res.status, 200);
    assert.equal(res.body.output, "VIIII");
  });

  it("range query respects additive", async () => {
    const res = await request(app).get("/romannumeral").query({ min: "3", max: "5", additive: "yes" });
    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.conversions.map((c: { output: string }) => c.output),
      ["III", "IIII", "V"]
    );
  });

  it("range query returns ordered conversions", async () => {
    const res = await request(app).get("/romannumeral").query({ min: "1", max: "4" });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.conversions));
    assert.equal(res.body.conversions.length, 4);
    assert.deepEqual(res.body.conversions[2], { input: "3", output: "III" });
  });

  it("range requires both min and max", async () => {
    const res = await request(app).get("/romannumeral").query({ min: "1" });
    assert.equal(res.status, 400);
    assert.equal(res.type, "text/plain");
  });

  it("GET /health", async () => {
    const res = await request(app).get("/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "ok");
  });

  it("GET /metrics exposes prometheus", async () => {
    const res = await request(app).get("/metrics");
    assert.equal(res.status, 200);
    const body = String(res.text);
    assert.ok(body.includes("# HELP") && body.includes("TYPE"));
  });
});
