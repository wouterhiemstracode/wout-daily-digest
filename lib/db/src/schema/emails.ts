import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sendersTable } from "./senders";

export const emailsTable = pgTable("emails", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => sendersTable.id, { onDelete: "cascade" }),
  gmailMessageId: text("gmail_message_id").notNull().unique(),
  subject: text("subject").notNull(),
  bodyText: text("body_text"),
  bodyHtml: text("body_html"),
  receivedAt: timestamp("received_at").notNull(),
  processed: boolean("processed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEmailSchema = createInsertSchema(emailsTable).omit({ id: true, createdAt: true });
export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Email = typeof emailsTable.$inferSelect;
