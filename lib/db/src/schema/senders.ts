import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sendersTable = pgTable("senders", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  active: boolean("active").notNull().default(true),
  autoDetected: boolean("auto_detected").notNull().default(false), // found by sync, not added by hand
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSenderSchema = createInsertSchema(sendersTable).omit({ id: true, createdAt: true });
export type InsertSender = z.infer<typeof insertSenderSchema>;
export type Sender = typeof sendersTable.$inferSelect;
