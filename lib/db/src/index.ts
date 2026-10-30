import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

if (!/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL)) {
  throw new Error("DATABASE_URL must start with postgresql:// (copy only the connection string, without psql or quotes)");
}

// Fail within seconds when the database can't be reached, instead of waiting forever.
export const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10_000 });
export const db = drizzle(pool, { schema });

export * from "./schema";

// Query helpers, re-exported so every package uses this package's drizzle instance.
export { and, count, desc, eq, gte, ilike, inArray, isNotNull, max, or, sql } from "drizzle-orm";
