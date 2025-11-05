import type { Express } from "express";
import { createServer, type Server } from "http";
import { scheduler } from "./scheduler";
import { settingsSchema, insertTaskSchema, insertEventSchema } from "@shared/schema";
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { generateReflection } from "./gemini";

function createLocalTime(referenceDate: Date, hours: number, minutes: number, timezone: string): Date {
  const zonedDate = toZonedTime(referenceDate, timezone);
  const year = zonedDate.getFullYear();
  const month = String(zonedDate.getMonth() + 1).padStart(2, '0');
  const day = String(zonedDate.getDate()).padStart(2, '0');
  const hour = String(hours).padStart(2, '0');
  const minute = String(minutes).padStart(2, '0');
  
  const localTimeString = `${year}-${month}-${day}T${hour}:${minute}:00`;
  const localDate = new Date(localTimeString);
  
  return fromZonedTime(localDate, timezone);
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await scheduler.getTasks();
      res.json({ count: tasks.length, tasks });
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Internal server error" 
      });
    }
  });

  app.post("/api/add_task", async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse({
        ...req.body,
        flow_mode: req.body.flow_mode ?? false
      });
      const result = await scheduler.addTask(validatedData);
      res.json(result);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        res.status(400).json({ 
          status: "error", 
          message: "Invalid task data",
          details: error.message
        });
      } else {
        res.status(500).json({ 
          status: "error", 
          message: error instanceof Error ? error.message : "Internal server error" 
        });
      }
    }
  });

  app.delete("/api/task/:id", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const result = await scheduler.removeTask(taskId);
      if (result.status === "ok") {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Internal server error" 
      });
    }
  });

  app.get("/api/task/:id", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const task = await scheduler.getTask(taskId);
      if (task) {
        res.json(task);
      } else {
        res.status(404).json({ status: "error", message: "task not found" });
      }
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Internal server error" 
      });
    }
  });

  app.put("/api/task/:id", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const validatedData = insertTaskSchema.partial().parse(req.body);
      const result = await scheduler.updateTask(taskId, validatedData);
      if (result.status === "ok") {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        res.status(400).json({ 
          status: "error", 
          message: "Invalid task data",
          details: error.message
        });
      } else {
        res.status(500).json({ 
          status: "error", 
          message: error instanceof Error ? error.message : "Internal server error" 
        });
      }
    }
  });

  app.post("/api/tasks/:id/complete", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const result = await scheduler.completeTask(taskId);
      if (result.status === "ok") {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Internal server error" 
      });
    }
  });

  app.post("/api/tasks/:id/uncomplete", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const result = await scheduler.uncompleteTask(taskId);
      if (result.status === "ok") {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Internal server error" 
      });
    }
  });

  app.get("/api/tasks/completed", async (req, res) => {
    try {
      const tasks = await scheduler.getCompletedTasks();
      res.json({ count: tasks.length, tasks });
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Internal server error" 
      });
    }
  });

  app.get("/api/events", async (req, res) => {
    try {
      const events = await scheduler.getEvents();
      res.json({ count: events.length, events });
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Internal server error" 
      });
    }
  });

  app.post("/api/add_event", async (req, res) => {
    try {
      const result = await scheduler.addEvent(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Internal server error" 
      });
    }
  });

  app.delete("/api/event/:id", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const result = await scheduler.removeEvent(eventId);
      if (result.status === "ok") {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Internal server error" 
      });
    }
  });

  app.get("/api/event/:id", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await scheduler.getEvent(eventId);
      if (event) {
        res.json(event);
      } else {
        res.status(404).json({ status: "error", message: "event not found" });
      }
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Internal server error" 
      });
    }
  });

  app.put("/api/event/:id", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const validatedData = insertEventSchema.partial().parse(req.body);
      const result = await scheduler.updateEvent(eventId, validatedData);
      if (result.status === "ok") {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        res.status(400).json({ 
          status: "error", 
          message: "Invalid event data",
          details: error.message
        });
      } else {
        res.status(500).json({ 
          status: "error", 
          message: error instanceof Error ? error.message : "Internal server error" 
        });
      }
    }
  });

  app.post("/api/schedule", async (req, res) => {
    try {
      const { day_start, day_end, max_chunk_minutes } = req.body;
      
      console.log('📅 Schedule request received:', { day_start, day_end, max_chunk_minutes });
      
      let rangeStart = day_start;
      let rangeEnd = day_end;
      
      if (!rangeStart || !rangeEnd) {
        const settings = await scheduler.getSettings();
        const [startHour, startMin] = settings.dailyStartTime.split(':').map(Number);
        const [endHour, endMin] = settings.dailyEndTime.split(':').map(Number);
        const userTimezone = settings.timezone || 'America/New_York';
        const now = new Date();
        
        rangeStart = createLocalTime(now, startHour, startMin, userTimezone).toISOString();
        rangeEnd = createLocalTime(now, endHour, endMin, userTimezone).toISOString();
      }
      
      const startDate = new Date(rangeStart);
      const endDate = new Date(rangeEnd);
      
      const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      const daysDiff = Math.floor((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 0) {
        const result = await scheduler.scheduleDay(rangeStart, rangeEnd, max_chunk_minutes);
        res.json(result);
      } else {
        const allScheduled: any[] = [];
        const settings = await scheduler.getSettings();
        const [defaultStartHour, defaultStartMin] = settings.dailyStartTime.split(':').map(Number);
        const [defaultEndHour, defaultEndMin] = settings.dailyEndTime.split(':').map(Number);
        const userTimezone = settings.timezone || 'America/New_York';
        
        for (let i = 0; i <= daysDiff; i++) {
          const currentDay = new Date(startDay);
          currentDay.setDate(startDay.getDate() + i);
          
          let dayStart: Date;
          let dayEnd: Date;
          
          if (i === 0) {
            dayStart = new Date(rangeStart);
          } else {
            dayStart = createLocalTime(currentDay, defaultStartHour, defaultStartMin, userTimezone);
          }
          
          if (i === daysDiff) {
            dayEnd = new Date(rangeEnd);
          } else {
            dayEnd = createLocalTime(currentDay, defaultEndHour, defaultEndMin, userTimezone);
          }
          
          if (dayStart < dayEnd) {
            const result = await scheduler.scheduleDay(dayStart.toISOString(), dayEnd.toISOString(), max_chunk_minutes);
            allScheduled.push(...result.scheduled);
          }
        }
        
        await scheduler.setScheduled(allScheduled);
        res.json({ status: 'ok', scheduled: allScheduled });
      }
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Internal server error" 
      });
    }
  });

  app.get("/api/schedule", async (req, res) => {
    try {
      const schedule = await scheduler.exportSchedule();
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Internal server error" 
      });
    }
  });

  app.post("/api/clear", async (req, res) => {
    try {
      await scheduler.clear();
      res.json({ status: "ok", message: "state cleared" });
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Internal server error" 
      });
    }
  });

  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await scheduler.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Internal server error" 
      });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const validatedSettings = settingsSchema.parse(req.body);
      const result = await scheduler.updateSettings(validatedSettings);
      res.json(result);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        res.status(400).json({ 
          status: "error", 
          message: "Invalid settings data",
          details: error.message
        });
      } else {
        res.status(500).json({ 
          status: "error", 
          message: error instanceof Error ? error.message : "Internal server error" 
        });
      }
    }
  });

  app.post("/api/daily-forecast", async (req, res) => {
    try {
      const { generateDailyForecast } = await import("./gemini");
      const tasks = await scheduler.getTasks();
      const scheduled = await scheduler.getScheduled();
      const date = new Date().toLocaleDateString();

      const forecast = await generateDailyForecast({
        tasks: tasks.map(t => ({
          name: t.name,
          category: t.category,
          duration_minutes: t.duration_minutes,
          urgency: t.urgency,
          importance: t.importance,
          enjoyment: t.enjoyment
        })),
        scheduled: scheduled.map(s => ({
          task_name: s.task_name,
          start: s.start,
          end: s.end,
          is_event: s.is_event || false
        })),
        date
      });

      res.json({ forecast });
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Failed to generate forecast" 
      });
    }
  });

  app.post("/api/magic-wand", async (req, res) => {
    try {
      const { generateMagicWandSuggestion } = await import("./gemini");
      const tasks = await scheduler.getTasks();
      
      const workTasks = tasks.filter(t => t.category === "work").length;
      const personalTasks = tasks.filter(t => t.category === "personal").length;
      const totalTasks = workTasks + personalTasks || 1;
      const workLifeBalance = personalTasks / totalTasks;

      const hobbies = tasks
        .filter(t => t.activity_type === "hobby")
        .map(t => t.name)
        .slice(0, 5);

      const suggestion = await generateMagicWandSuggestion({
        tasks: tasks.map(t => ({
          name: t.name,
          category: t.category,
          activity_type: t.activity_type || undefined
        })),
        userPreferences: {
          hobbies,
          workLifeBalance
        }
      });

      res.json(suggestion);
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Failed to generate suggestion" 
      });
    }
  });

  app.post("/api/why-now", async (req, res) => {
    try {
      const { generateWhyNowRationale } = await import("./gemini");
      const { 
        activityName, 
        startTime, 
        endTime, 
        duration,
        isEvent,
        taskId,
        eventId,
        category 
      } = req.body;

      const tasks = await scheduler.getTasks();
      const scheduled = await scheduler.getScheduled();
      const scheduledSorted = [...scheduled].sort((a, b) => 
        new Date(a.start).getTime() - new Date(b.start).getTime()
      );

      const taskDetails = taskId ? tasks.find(t => t.id === taskId) : null;
      
      const currentIndex = scheduledSorted.findIndex(s => 
        s.start === startTime && s.task_name === activityName
      );
      
      const contextBefore = currentIndex > 0 
        ? scheduledSorted[currentIndex - 1].task_name 
        : undefined;
      
      const contextAfter = currentIndex < scheduledSorted.length - 1
        ? scheduledSorted[currentIndex + 1].task_name
        : undefined;

      const scheduledTaskIds = new Set(scheduled.filter(s => s.task_id).map(s => s.task_id));
      const pendingTasksCount = tasks.filter(t => !scheduledTaskIds.has(t.id)).length;

      const rationale = await generateWhyNowRationale({
        activityName,
        startTime,
        endTime,
        duration,
        isEvent: isEvent || false,
        category,
        taskDetails: taskDetails ? {
          urgency: taskDetails.urgency,
          importance: taskDetails.importance,
          enjoyment: taskDetails.enjoyment,
          activity_type: taskDetails.activity_type || undefined,
          flow_mode: taskDetails.flow_mode || false
        } : undefined,
        contextBefore,
        contextAfter,
        scheduledCount: scheduled.length,
        pendingTasksCount
      });

      res.json({ rationale });
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Failed to generate rationale" 
      });
    }
  });

  app.post("/api/reflection", async (req, res) => {
    try {
      const { completedTasks } = req.body;
      
      const reflection = await generateReflection({
        completedTasks: completedTasks.map((t: any) => ({
          name: t.name,
          category: t.category,
          duration_minutes: t.duration_minutes,
          urgency: t.urgency,
          importance: t.importance,
          enjoyment: t.enjoyment,
          activity_type: t.activity_type,
          completed_at: t.completed_at
        }))
      });

      res.json({ reflection });
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Failed to generate reflection" 
      });
    }
  });

  app.get("/api/suggest-now", async (req, res) => {
    try {
      const suggestion = await scheduler.suggestTaskForNow();
      
      if (!suggestion) {
        res.json({ 
          task_name: "No tasks available",
          task_id: null
        });
      } else {
        res.json(suggestion);
      }
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Failed to generate suggestion" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
