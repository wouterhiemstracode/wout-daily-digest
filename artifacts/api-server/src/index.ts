import app from "./app";
import { logger } from "./lib/logger";

for (const name of ["DATABASE_URL", "SESSION_SECRET", "ALLOWED_EMAILS", "APP_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "ANTHROPIC_API_KEY"]) {
  if (!process.env[name]) throw new Error(`${name} must be set (see README: Environment variables)`);
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
