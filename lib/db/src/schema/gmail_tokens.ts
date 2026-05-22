import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const gmailTokensTable = pgTable("gmail_tokens", {
  id: serial("id").primaryKey(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  email: text("email"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type GmailToken = typeof gmailTokensTable.$inferSelect;
