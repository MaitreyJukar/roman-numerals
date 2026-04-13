import { ROMAN_MAX, ROMAN_MIN } from "./services/roman.js";

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Roman Numeral Converter API",
    version: "1.0.0",
    description:
      "Converts decimal integers to Roman numerals. Supports a single query or an inclusive range with optional additive output."
  },
  servers: [{ url: "/" }],
  tags: [{ name: "RomanNumeral" }, { name: "System" }],
  paths: {
    "/romannumeral": {
      get: {
        tags: ["RomanNumeral"],
        summary: "Convert integer(s) to Roman numerals",
        description:
          "Use `query` for a single number or `min` + `max` for a range. Default output is subtractive; set `additive=true` for additive form.",
        parameters: [
          {
            name: "query",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: ROMAN_MIN, maximum: ROMAN_MAX },
            description: "Single integer to convert. Cannot be combined with `min`/`max`."
          },
          {
            name: "min",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: ROMAN_MIN, maximum: ROMAN_MAX - 1 },
            description: "Range start (inclusive). Must be used with `max`."
          },
          {
            name: "max",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: ROMAN_MIN + 1, maximum: ROMAN_MAX },
            description: "Range end (inclusive). Must be used with `min`, and be greater than `min`."
          },
          {
            name: "additive",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["1", "0", "true", "false", "yes", "no", "on", "off"] },
            description: "Truthy values (`1`, `true`, `yes`, `on`) enable additive Roman formatting."
          }
        ],
        responses: {
          "200": {
            description: "Roman numeral conversion payload",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    {
                      type: "object",
                      required: ["input", "output"],
                      properties: {
                        input: { type: "string", example: "4000" },
                        output: { type: "string", example: "I̅V̅" }
                      }
                    },
                    {
                      type: "object",
                      required: ["conversions"],
                      properties: {
                        conversions: {
                          type: "array",
                          items: {
                            type: "object",
                            required: ["input", "output"],
                            properties: {
                              input: { type: "string", example: "1" },
                              output: { type: "string", example: "I" }
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["error"],
                  properties: {
                    error: {
                      type: "object",
                      required: ["message"],
                      properties: {
                        message: { type: "string" }
                      }
                    }
                  }
                },
                examples: {
                  invalid: {
                    value: {
                      error: {
                        message: "query must be between 1 and 3999999 inclusive"
                      }
                    }
                  }
                }
              }
            }
          },
          "429": { description: "Rate limit exceeded" },
          "500": { description: "Internal server error" }
        }
      }
    },
    "/health": {
      get: {
        tags: ["System"],
        summary: "Liveness probe",
        responses: {
          "200": {
            description: "Service is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status", "uptime"],
                  properties: {
                    status: { type: "string", example: "ok" },
                    uptime: { type: "number", format: "double", example: 123.45 }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/metrics": {
      get: {
        tags: ["System"],
        summary: "Prometheus metrics",
        responses: {
          "200": {
            description: "Prometheus text exposition format",
            content: {
              "text/plain": { schema: { type: "string" } }
            }
          }
        }
      }
    },
    "/openapi.json": {
      get: {
        tags: ["System"],
        summary: "OpenAPI document",
        responses: {
          "200": {
            description: "The API OpenAPI 3.0.3 specification",
            content: {
              "application/json": {
                schema: { type: "object" }
              }
            }
          }
        }
      }
    }
  }
} as const;
