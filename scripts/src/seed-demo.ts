/**
 * Write a sample edition into the database so the app can be tried without Gmail or OpenAI.
 *   DATABASE_URL=… pnpm --filter @workspace/scripts run seed-demo
 */
import { db, pool, sendersTable, digestsTable, digestSectionsTable, storiesTable } from "@workspace/db";
import { demoEdition, demoSenders } from "./demo-edition";

const today = new Date().toISOString().split("T")[0]!;

await db
  .insert(sendersTable)
  .values(demoSenders.map((s) => ({ ...s, autoDetected: true })))
  .onConflictDoNothing({ target: sendersTable.email });

const [digest] = await db
  .insert(digestsTable)
  .values({ date: today, status: "ready", intro: demoEdition.intro })
  .returning();

for (const [i, section] of demoEdition.sections.entries()) {
  const [sec] = await db
    .insert(digestSectionsTable)
    .values({ digestId: digest!.id, sectionType: section.type, title: section.title, sortOrder: i })
    .returning();
  await db.insert(storiesTable).values(section.stories.map((s, j) => ({ ...s, sectionId: sec!.id, sortOrder: j })));
}

console.log(`Seeded edition ${digest!.id} for ${today}`);
await pool.end();
