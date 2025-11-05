import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, doublePrecision, boolean, jsonb, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  duration_minutes: integer("duration_minutes").notNull(),
  category: text("category").notNull(),
  activity_type: text("activity_type"),
  assignment_deadline: text("assignment_deadline"),
  assignment_total_hours: integer("assignment_total_hours"),
  assignment_total_minutes: integer("assignment_total_minutes"),
  urgency: doublePrecision("urgency").notNull(),
  importance: doublePrecision("importance").notNull(),
  enjoyment: doublePrecision("enjoyment").notNull(),
  earliest_start: text("earliest_start"),
  latest_finish: text("latest_finish"),
  repeat: text("repeat").default("none"),
  flow_mode: boolean("flow_mode").default(false),
  completed: boolean("completed").default(false),
  completed_at: timestamp("completed_at"),
  constraints: jsonb("constraints"),
  metadata: jsonb("metadata"),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  start: text("start").notNull(),
  end: text("end").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  location: text("location"),
  all_day: boolean("all_day").default(false),
  repeat: text("repeat").default("none"),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  work_personal_mode: text("work_personal_mode").notNull().default("mix"),
  work_start_time: text("work_start_time").notNull().default("09:00"),
  work_end_time: text("work_end_time").notNull().default("17:00"),
  work_days: jsonb("work_days").notNull().default([1, 2, 3, 4, 5]),
  personal_start_time: text("personal_start_time").notNull().default("17:00"),
  personal_end_time: text("personal_end_time").notNull().default("21:00"),
  personal_days: jsonb("personal_days").notNull().default([0, 1, 2, 3, 4, 5, 6]),
  daily_start_time: text("daily_start_time").notNull().default("08:00"),
  daily_end_time: text("daily_end_time").notNull().default("21:00"),
  timezone: text("timezone").notNull().default("America/New_York"),
  priority_weights: jsonb("priority_weights").default({ urgency: 0.5, importance: 0.3, enjoyment: 0.2 }),
  activity_type_defaults: jsonb("activity_type_defaults"),
});

export const scheduled_items = pgTable("scheduled_items", {
  id: serial("id").primaryKey(),
  task_id: integer("task_id"),
  event_id: integer("event_id"),
  task_name: text("task_name").notNull(),
  start: text("start").notNull(),
  end: text("end").notNull(),
  duration_minutes: integer("duration_minutes").notNull(),
  is_event: boolean("is_event").default(false),
  all_day: boolean("all_day").default(false),
  location: text("location"),
  created_at: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertTaskSchema = createInsertSchema(tasks, {
  name: z.string().min(1, "Task name is required"),
  duration_minutes: z.number().min(1, "Duration must be at least 1 minute"),
  activity_type: z.enum(["assignment", "project", "values-driven", "hobby"]).optional(),
  urgency: z.number().min(0).max(1),
  importance: z.number().min(0).max(1),
  enjoyment: z.number().min(0).max(1),
  repeat: z.enum(["none", "daily", "weekly", "monthly", "annually"]).optional(),
}).omit({ id: true });

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export const insertEventSchema = createInsertSchema(events, {
  name: z.string().min(1, "Event name is required"),
  repeat: z.enum(["none", "daily", "weekly", "monthly", "annually"]).optional(),
}).omit({ id: true });

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });
export type SettingsRow = typeof settings.$inferSelect;

export const scheduledEventSchema = z.object({
  task_id: z.number().optional(),
  event_id: z.number().optional(),
  task_name: z.string(),
  start: z.string(),
  end: z.string(),
  duration_minutes: z.number(),
  is_event: z.boolean().optional(),
  all_day: z.boolean().optional(),
  location: z.string().optional(),
});

export type ScheduledEvent = z.infer<typeof scheduledEventSchema>;

export const activityTypeDefaultSchema = z.object({
  type: z.enum(["assignment", "project", "values-driven", "hobby"]),
  urgency: z.number().min(0).max(10),
  importance: z.number().min(0).max(10),
  enjoyment: z.number().min(0).max(10),
});

export type ActivityTypeDefault = z.infer<typeof activityTypeDefaultSchema>;

export const settingsSchema = z.object({
  workPersonalMode: z.enum(["mix", "separate"]),
  workStartTime: z.string(),
  workEndTime: z.string(),
  workDays: z.array(z.number().min(0).max(6)),
  personalStartTime: z.string(),
  personalEndTime: z.string(),
  personalDays: z.array(z.number().min(0).max(6)),
  dailyStartTime: z.string(),
  dailyEndTime: z.string(),
  timezone: z.string().default("America/New_York"),
  priorityWeights: z.object({
    urgency: z.number().min(0).max(1),
    importance: z.number().min(0).max(1),
    enjoyment: z.number().min(0).max(1),
  }).optional(),
  activityTypeDefaults: z.array(activityTypeDefaultSchema).optional(),
});

export type Settings = z.infer<typeof settingsSchema>;

export type ScheduledItem = typeof scheduled_items.$inferSelect;
