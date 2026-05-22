import { pgTable, serial, text, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const digestsTable = pgTable("digests", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  status: text("status").notNull().default("draft"), // draft | ready
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const digestSectionsTable = pgTable("digest_sections", {
  id: serial("id").primaryKey(),
  digestId: integer("digest_id").notNull().references(() => digestsTable.id, { onDelete: "cascade" }),
  sectionType: text("section_type").notNull(),
  title: text("title").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const storiesTable = pgTable("stories", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").notNull().references(() => digestSectionsTable.id, { onDelete: "cascade" }),
  headline: text("headline").notNull(),
  summary: text("summary").notNull(),
  whyItMatters: text("why_it_matters").notNull(),
  sourceUrl: text("source_url"),
  sourceName: text("source_name"),
  relevanceScore: integer("relevance_score").notNull().default(50),
  sortOrder: integer("sort_order").notNull().default(0),
  userFeedback: text("user_feedback"), // up | down | null
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDigestSchema = createInsertSchema(digestsTable).omit({ id: true, createdAt: true });
export const insertSectionSchema = createInsertSchema(digestSectionsTable).omit({ id: true, createdAt: true });
export const insertStorySchema = createInsertSchema(storiesTable).omit({ id: true, createdAt: true });

export type InsertDigest = z.infer<typeof insertDigestSchema>;
export type InsertSection = z.infer<typeof insertSectionSchema>;
export type InsertStory = z.infer<typeof insertStorySchema>;
export type Digest = typeof digestsTable.$inferSelect;
export type DigestSection = typeof digestSectionsTable.$inferSelect;
export type Story = typeof storiesTable.$inferSelect;
