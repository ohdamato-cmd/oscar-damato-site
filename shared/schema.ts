import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Admin user
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Site settings (bio/hero)
export const siteSettings = sqliteTable("site_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  greeting: text("greeting").notNull().default("Hello, I'm Oscar"),
  title: text("title").notNull().default("Building at the intersection of business, strategy, and operations."),
  subtitle: text("subtitle").notNull().default("FSU Marketing graduate on an MBA pathway, with a growing focus on operations, finance, and supply chain. I turn complex problems into clear analysis — through research, writing, and hands-on projects."),
  ctaText: text("cta_text").notNull().default("View my work"),
});

// Projects
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  tag: text("tag").notNull(),
  link: text("link").default(""),
  imageUrl: text("image_url").default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Writing / Op-Eds
export const writings = sqliteTable("writings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  date: text("date").notNull(),
  link: text("link").default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Resume entries
export const resumeEntries = sqliteTable("resume_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  period: text("period").notNull(),
  role: text("role").notNull(),
  organization: text("organization").notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Stock Picks
export const stockPicks = sqliteTable("stock_picks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticker: text("ticker").notNull(),
  company: text("company").notNull(),
  thesis: text("thesis").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Uploaded files
export const uploadedFiles = sqliteTable("uploaded_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  originalName: text("original_name").notNull(),
  storedName: text("stored_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  uploadedAt: text("uploaded_at").notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({ username: true, password: true });
export const insertSiteSettingsSchema = createInsertSchema(siteSettings).omit({ id: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true });
export const insertWritingSchema = createInsertSchema(writings).omit({ id: true });
export const insertResumeEntrySchema = createInsertSchema(resumeEntries).omit({ id: true });
export const insertStockPickSchema = createInsertSchema(stockPicks).omit({ id: true });
export const insertUploadedFileSchema = createInsertSchema(uploadedFiles).omit({ id: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type SiteSettings = typeof siteSettings.$inferSelect;
export type InsertSiteSettings = z.infer<typeof insertSiteSettingsSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Writing = typeof writings.$inferSelect;
export type InsertWriting = z.infer<typeof insertWritingSchema>;
export type ResumeEntry = typeof resumeEntries.$inferSelect;
export type InsertResumeEntry = z.infer<typeof insertResumeEntrySchema>;
export type StockPick = typeof stockPicks.$inferSelect;
export type InsertStockPick = z.infer<typeof insertStockPickSchema>;
export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;
