import { eq, sql as dsql } from "drizzle-orm";
import { db } from "./db";
import { 
  tasks, 
  events, 
  settings, 
  scheduled_items,
  type Task, 
  type Event, 
  type InsertTask, 
  type InsertEvent,
  type Settings,
  type ScheduledEvent,
  type SettingsRow
} from "@shared/schema";

export interface IStorage {
  getTasks(): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  
  getEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  
  getSettings(): Promise<Settings>;
  updateSettings(newSettings: Settings): Promise<Settings>;
  
  getScheduledItems(): Promise<ScheduledEvent[]>;
  saveScheduledItems(items: ScheduledEvent[]): Promise<void>;
  clearScheduledItems(): Promise<void>;
}

export class DbStorage implements IStorage {
  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }

  async getTask(id: number): Promise<Task | undefined> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id));
    return result[0];
  }

  async createTask(task: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values(task).returning();
    return result[0];
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    const result = await db.update(tasks).set(task).where(eq(tasks.id, id)).returning();
    return result[0];
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id)).returning();
    await db.delete(scheduled_items).where(eq(scheduled_items.task_id, id));
    return result.length > 0;
  }

  async getEvents(): Promise<Event[]> {
    return await db.select().from(events);
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const result = await db.select().from(events).where(eq(events.id, id));
    return result[0];
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const result = await db.insert(events).values(event).returning();
    return result[0];
  }

  async updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event | undefined> {
    const result = await db.update(events).set(event).where(eq(events.id, id)).returning();
    return result[0];
  }

  async deleteEvent(id: number): Promise<boolean> {
    const result = await db.delete(events).where(eq(events.id, id)).returning();
    await db.delete(scheduled_items).where(eq(scheduled_items.event_id, id));
    return result.length > 0;
  }

  async getSettings(): Promise<Settings> {
    const result = await db.select().from(settings).limit(1);
    
    if (result.length === 0) {
      const defaultSettings: Settings = {
        workPersonalMode: "mix",
        workStartTime: "09:00",
        workEndTime: "17:00",
        workDays: [1, 2, 3, 4, 5],
        personalStartTime: "17:00",
        personalEndTime: "21:00",
        personalDays: [0, 1, 2, 3, 4, 5, 6],
        dailyStartTime: "08:00",
        dailyEndTime: "21:00",
        timezone: "America/New_York",
        priorityWeights: {
          urgency: 0.5,
          importance: 0.3,
          enjoyment: 0.2,
        },
        activityTypeDefaults: [
          { type: "project", urgency: 4, importance: 7, enjoyment: 5 },
          { type: "values-driven", urgency: 4, importance: 8, enjoyment: 7 },
          { type: "hobby", urgency: 3, importance: 4, enjoyment: 9 },
          { type: "assignment", urgency: 5, importance: 7, enjoyment: 4 },
        ],
      };
      
      await this.updateSettings(defaultSettings);
      return defaultSettings;
    }
    
    const row = result[0];
    return this.dbRowToSettings(row);
  }

  async updateSettings(newSettings: Settings): Promise<Settings> {
    const dbSettings = {
      work_personal_mode: newSettings.workPersonalMode,
      work_start_time: newSettings.workStartTime,
      work_end_time: newSettings.workEndTime,
      work_days: newSettings.workDays,
      personal_start_time: newSettings.personalStartTime,
      personal_end_time: newSettings.personalEndTime,
      personal_days: newSettings.personalDays,
      daily_start_time: newSettings.dailyStartTime,
      daily_end_time: newSettings.dailyEndTime,
      timezone: newSettings.timezone,
      priority_weights: newSettings.priorityWeights || null,
      activity_type_defaults: newSettings.activityTypeDefaults || null,
    };

    const existing = await db.select().from(settings).limit(1);
    
    if (existing.length === 0) {
      await db.insert(settings).values(dbSettings);
    } else {
      await db.update(settings).set(dbSettings).where(eq(settings.id, existing[0].id));
    }
    
    return newSettings;
  }

  private dbRowToSettings(row: SettingsRow): Settings {
    return {
      workPersonalMode: row.work_personal_mode as "mix" | "separate",
      workStartTime: row.work_start_time,
      workEndTime: row.work_end_time,
      workDays: row.work_days as number[],
      personalStartTime: row.personal_start_time,
      personalEndTime: row.personal_end_time,
      personalDays: row.personal_days as number[],
      dailyStartTime: row.daily_start_time,
      dailyEndTime: row.daily_end_time,
      timezone: row.timezone,
      priorityWeights: row.priority_weights as any || undefined,
      activityTypeDefaults: row.activity_type_defaults as any || undefined,
    };
  }

  async getScheduledItems(): Promise<ScheduledEvent[]> {
    const items = await db.select().from(scheduled_items);
    return items.map(item => ({
      task_id: item.task_id || undefined,
      event_id: item.event_id || undefined,
      task_name: item.task_name,
      start: item.start,
      end: item.end,
      duration_minutes: item.duration_minutes,
      is_event: item.is_event || false,
      all_day: item.all_day || false,
      location: item.location || undefined,
    }));
  }

  async saveScheduledItems(items: ScheduledEvent[]): Promise<void> {
    await db.delete(scheduled_items).execute();
    
    if (items.length > 0) {
      const dbItems = items.map(item => ({
        task_id: item.task_id || null,
        event_id: item.event_id || null,
        task_name: item.task_name,
        start: item.start,
        end: item.end,
        duration_minutes: item.duration_minutes,
        is_event: item.is_event || false,
        all_day: item.all_day || false,
        location: item.location || null,
      }));
      
      await db.insert(scheduled_items).values(dbItems);
    }
  }

  async clearScheduledItems(): Promise<void> {
    await db.delete(scheduled_items).execute();
  }
}

export const storage = new DbStorage();
