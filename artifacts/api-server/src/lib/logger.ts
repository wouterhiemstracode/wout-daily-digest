import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  ...(isProduction
    ? {
        // Google Cloud Logging reads `severity` and `message`, so errors show up as errors.
        messageKey: "message",
        formatters: { level: (label: string) => ({ severity: label.toUpperCase() }) },
      }
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
