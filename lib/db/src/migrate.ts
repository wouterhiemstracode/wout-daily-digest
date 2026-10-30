import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./index";

/** Apply the SQL migrations in `migrationsFolder` (lib/db/migrations) that haven't run yet. */
export async function migrateDatabase(migrationsFolder: string) {
  await migrate(db, { migrationsFolder });
}
