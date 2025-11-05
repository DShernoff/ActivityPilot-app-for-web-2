import type { Task, Event, ScheduledEvent, InsertTask, InsertEvent, Settings } from "@shared/schema";
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';
import { storage } from "./storage";

class SchedulerState {
  private createLocalTime(referenceDate: Date, hours: number, minutes: number, timezone: string): Date {
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

  async addTask(taskData: InsertTask): Promise<{ status: string; task: Task }> {
    const task = await storage.createTask(taskData);
    return { status: 'ok', task };
  }

  async removeTask(taskId: number): Promise<{ status: string; removed_id?: number; message?: string }> {
    const deleted = await storage.deleteTask(taskId);
    if (deleted) {
      return { status: 'ok', removed_id: taskId };
    }
    return { status: 'error', message: 'task not found' };
  }

  async getTasks(): Promise<Task[]> {
    const tasks = await storage.getTasks();
    return tasks.filter(t => !t.completed);
  }

  async getCompletedTasks(): Promise<Task[]> {
    const tasks = await storage.getTasks();
    return tasks.filter(t => t.completed);
  }

  async getTask(taskId: number): Promise<Task | undefined> {
    return await storage.getTask(taskId);
  }

  async completeTask(taskId: number): Promise<{ status: string; task?: Task; message?: string }> {
    const task = await storage.updateTask(taskId, { 
      completed: true, 
      completed_at: new Date() 
    });
    if (task) {
      await storage.clearScheduledItems();
      return { status: 'ok', task };
    }
    return { status: 'error', message: 'task not found' };
  }

  async uncompleteTask(taskId: number): Promise<{ status: string; task?: Task; message?: string }> {
    const task = await storage.updateTask(taskId, { 
      completed: false, 
      completed_at: null 
    });
    if (task) {
      await storage.clearScheduledItems();
      return { status: 'ok', task };
    }
    return { status: 'error', message: 'task not found' };
  }

  async updateTask(taskId: number, taskData: Partial<InsertTask>): Promise<{ status: string; task?: Task; message?: string }> {
    const task = await storage.updateTask(taskId, taskData);
    if (task) {
      await storage.clearScheduledItems();
      return { status: 'ok', task };
    }
    return { status: 'error', message: 'task not found' };
  }

  async addEvent(eventData: InsertEvent): Promise<{ status: string; event: Event }> {
    const event = await storage.createEvent(eventData);
    return { status: 'ok', event };
  }

  async removeEvent(eventId: number): Promise<{ status: string; removed_id?: number; message?: string }> {
    const deleted = await storage.deleteEvent(eventId);
    if (deleted) {
      return { status: 'ok', removed_id: eventId };
    }
    return { status: 'error', message: 'event not found' };
  }

  async getEvents(): Promise<Event[]> {
    return await storage.getEvents();
  }

  async getEvent(eventId: number): Promise<Event | undefined> {
    return await storage.getEvent(eventId);
  }

  async updateEvent(eventId: number, eventData: Partial<InsertEvent>): Promise<{ status: string; event?: Event; message?: string }> {
    const event = await storage.updateEvent(eventId, eventData);
    if (event) {
      await storage.clearScheduledItems();
      return { status: 'ok', event };
    }
    return { status: 'error', message: 'event not found' };
  }

  async getScheduled(): Promise<ScheduledEvent[]> {
    return await storage.getScheduledItems();
  }

  async setScheduled(scheduled: ScheduledEvent[]): Promise<void> {
    await storage.saveScheduledItems(scheduled);
  }

  async clear(): Promise<void> {
    await storage.clearScheduledItems();
  }

  async getSettings(): Promise<Settings> {
    return await storage.getSettings();
  }

  async updateSettings(settings: Settings): Promise<{ status: string; settings: Settings }> {
    await storage.updateSettings(settings);
    return { status: 'ok', settings };
  }

  private async getWindowBounds(task: Task, slotStart: Date): Promise<{ windowStart: Date; windowEnd: Date } | null> {
    const settings = await this.getSettings();
    
    if (settings.workPersonalMode === "mix") {
      return null;
    }

    if (task.category !== "work" && task.category !== "personal") {
      return null;
    }

    const dayOfWeek = slotStart.getDay();
    let startTime: string;
    let endTime: string;
    let allowedDays: number[];

    if (task.category === "work") {
      startTime = settings.workStartTime;
      endTime = settings.workEndTime;
      allowedDays = settings.workDays;
    } else {
      startTime = settings.personalStartTime;
      endTime = settings.personalEndTime;
      allowedDays = settings.personalDays;
    }

    if (!allowedDays.includes(dayOfWeek)) {
      return null;
    }

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const userTimezone = settings.timezone || 'America/New_York';
    const windowStart = this.createLocalTime(slotStart, startHour, startMin, userTimezone);
    const windowEnd = this.createLocalTime(slotStart, endHour, endMin, userTimezone);

    return { windowStart, windowEnd };
  }

  private normalize(value: number, min = 0, max = 1): number {
    const v = Math.max(min, Math.min(max, value));
    return max > min ? (v - min) / (max - min) : 0;
  }

  private async scoreTask(task: Task, now: Date): Promise<number> {
    const settings = await this.getSettings();
    const u = this.normalize(task.urgency);
    const imp = this.normalize(task.importance);
    const enjoy = this.normalize(task.enjoyment);

    const weights = settings.priorityWeights || { urgency: 0.5, importance: 0.3, enjoyment: 0.2 };
    const weightUrgency = weights.urgency;
    const weightImportance = weights.importance;
    const weightEnjoyment = weights.enjoyment;
    let base = (weightUrgency * u) + (weightImportance * imp) + (weightEnjoyment * enjoy);

    let deadlineBoost = 0;
    if (task.latest_finish) {
      const deadline = new Date(task.latest_finish);
      const secsLeft = (deadline.getTime() - now.getTime()) / 1000;
      if (secsLeft <= 0) {
        deadlineBoost = 1;
      } else {
        const daysLeft = Math.max(secsLeft / 86400, 0.0001);
        deadlineBoost = Math.min(1, 1 / (daysLeft + 0.1));
      }
    }

    let constraintPenalty = 0;

    let flowModeBoost = 0;
    if (task.flow_mode) {
      flowModeBoost = 0.3;
    }

    const score = base + 0.5 * deadlineBoost + flowModeBoost - constraintPenalty;
    return Math.max(score, 0);
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  private addYears(date: Date, years: number): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
  }

  private generateRecurringInstances(
    baseDate: Date,
    repeatPattern: string,
    startTime: Date,
    endTime: Date
  ): Date[] {
    const instances: Date[] = [];
    let currentDate = new Date(baseDate);
    
    while (currentDate < endTime) {
      if (currentDate >= startTime) {
        instances.push(new Date(currentDate));
      }
      
      switch (repeatPattern) {
        case "daily":
          currentDate = this.addDays(currentDate, 1);
          break;
        case "weekly":
          currentDate = this.addDays(currentDate, 7);
          break;
        case "monthly":
          currentDate = this.addMonths(currentDate, 1);
          break;
        case "annually":
          currentDate = this.addYears(currentDate, 1);
          break;
        default:
          return instances;
      }
    }
    
    return instances;
  }

  private async expandRecurringTasks(startTime: Date, endTime: Date): Promise<Task[]> {
    const expandedTasks: Task[] = [];
    const allTasks = await this.getTasks();
    const settings = await this.getSettings();
    const userTimezone = settings.timezone || 'America/New_York';
    
    for (const task of allTasks) {
      if (task.repeat === "none" || !task.repeat) {
        expandedTasks.push(task);
      } else {
        const baseDate = task.earliest_start ? new Date(task.earliest_start) : startTime;
        const instances = this.generateRecurringInstances(baseDate, task.repeat as any, startTime, endTime);
        
        const baseZonedDate = toZonedTime(baseDate, userTimezone);
        const startHour = baseZonedDate.getHours();
        const startMin = baseZonedDate.getMinutes();
        
        let durationMs = task.duration_minutes * 60 * 1000;
        if (task.latest_finish) {
          const finishDate = new Date(task.latest_finish);
          durationMs = finishDate.getTime() - baseDate.getTime();
        }
        
        for (const instanceDate of instances) {
          const instanceStart = this.createLocalTime(instanceDate, startHour, startMin, userTimezone);
          const instanceEnd = new Date(instanceStart.getTime() + durationMs);
          
          const instanceTask: Task = {
            ...task,
            id: task.id,
            earliest_start: instanceStart.toISOString(),
            latest_finish: instanceEnd.toISOString(),
            repeat: "none"
          };
          
          expandedTasks.push(instanceTask);
        }
      }
    }
    
    return expandedTasks;
  }

  async scheduleDay(
    dayStart: string,
    dayEnd: string,
    maxChunkMinutes?: number
  ): Promise<{ status: string; scheduled: ScheduledEvent[] }> {
    const originalStart = new Date(dayStart);
    const originalEnd = new Date(dayEnd);
    const now = new Date();

    if (originalEnd <= originalStart) {
      throw new Error('day_end must be after day_start');
    }

    const settings = await this.getSettings();
    const [dailyStartHour, dailyStartMin] = settings.dailyStartTime.split(':').map(Number);
    const [dailyEndHour, dailyEndMin] = settings.dailyEndTime.split(':').map(Number);
    
    const userTimezone = settings.timezone || 'America/New_York';
    const dailyStartBound = this.createLocalTime(originalStart, dailyStartHour, dailyStartMin, userTimezone);
    const dailyEndBound = this.createLocalTime(originalStart, dailyEndHour, dailyEndMin, userTimezone);
    
    let taskScheduleStart = originalStart;
    let taskScheduleEnd = originalEnd;
    
    if (taskScheduleStart < dailyStartBound) {
      taskScheduleStart = dailyStartBound;
    }
    
    if (taskScheduleEnd > dailyEndBound) {
      taskScheduleEnd = dailyEndBound;
    }
    
    if (taskScheduleEnd <= taskScheduleStart) {
      throw new Error('Schedule window is outside of daily time bounds');
    }

    const scheduledItems: ScheduledEvent[] = [];

    const fixedEvents: ScheduledEvent[] = [];
    const allEvents = await this.getEvents();
    for (const event of allEvents) {
      if (event.repeat === "none" || !event.repeat) {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        
        if (eventStart < originalEnd && eventEnd > originalStart) {
          fixedEvents.push({
            event_id: event.id,
            task_name: event.name,
            start: eventStart.toISOString(),
            end: eventEnd.toISOString(),
            duration_minutes: Math.floor((eventEnd.getTime() - eventStart.getTime()) / (60 * 1000)),
            is_event: true,
            all_day: event.all_day || false,
            location: event.location || undefined
          });
        }
      } else {
        const baseStart = new Date(event.start);
        const baseEnd = new Date(event.end);
        const durationMs = baseEnd.getTime() - baseStart.getTime();
        const instances = this.generateRecurringInstances(baseStart, event.repeat, originalStart, originalEnd);
        
        for (const instanceStart of instances) {
          const instanceEnd = new Date(instanceStart.getTime() + durationMs);
          
          if (instanceStart < originalEnd && instanceEnd > originalStart) {
            fixedEvents.push({
              event_id: event.id,
              task_name: event.name,
              start: instanceStart.toISOString(),
              end: instanceEnd.toISOString(),
              duration_minutes: Math.floor((instanceEnd.getTime() - instanceStart.getTime()) / (60 * 1000)),
              is_event: true,
              all_day: event.all_day || false,
              location: event.location || undefined
            });
          }
        }
      }
    }

    const allDayEvents = fixedEvents.filter(e => e.all_day);
    const timedEvents = fixedEvents.filter(e => !e.all_day);
    
    timedEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    scheduledItems.push(...timedEvents);
    scheduledItems.push(...allDayEvents);

    const expandedTasks = await this.expandRecurringTasks(taskScheduleStart, taskScheduleEnd);
    
    const fixedRoutines: ScheduledEvent[] = [];
    const flexibleTasks: Task[] = [];
    
    for (const task of expandedTasks) {
      const originalTask = await this.getTask(task.id);
      const isRoutine = originalTask && originalTask.repeat && originalTask.repeat !== "none";
      
      if (isRoutine && task.earliest_start && task.latest_finish) {
        const routineStart = new Date(task.earliest_start);
        const routineEnd = new Date(task.latest_finish);
        
        if (routineStart < taskScheduleEnd && routineEnd > taskScheduleStart) {
          const clampedStart = new Date(Math.max(routineStart.getTime(), taskScheduleStart.getTime()));
          const clampedEnd = new Date(Math.min(routineEnd.getTime(), taskScheduleEnd.getTime()));
          
          fixedRoutines.push({
            task_id: task.id,
            task_name: task.name,
            start: clampedStart.toISOString(),
            end: clampedEnd.toISOString(),
            duration_minutes: Math.floor((clampedEnd.getTime() - clampedStart.getTime()) / (60 * 1000)),
            is_event: false
          });
        }
      } else {
        flexibleTasks.push(task);
      }
    }
    
    fixedRoutines.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    scheduledItems.push(...fixedRoutines);
    
    scheduledItems.sort((a, b) => {
      const aTime = new Date(a.start).getTime();
      const bTime = new Date(b.start).getTime();
      const aDate = new Date(a.start).toDateString();
      const bDate = new Date(b.start).toDateString();
      
      if (aDate === bDate) {
        if (a.all_day && !b.all_day) return -1;
        if (!a.all_day && b.all_day) return 1;
      }
      
      return aTime - bTime;
    });
    
    const schedulableTasks = flexibleTasks.filter(t => t.category !== "waiting_on_others");
    const doTodayTasks = schedulableTasks.filter(t => t.category === "do_today");
    const otherTasks = schedulableTasks.filter(t => t.category !== "do_today");
    
    const doTodayWithScores = await Promise.all(doTodayTasks
      .map(async task => ({ task, score: await this.scoreTask(task, now) })));
    doTodayWithScores.sort((a, b) => b.score - a.score);
    
    const otherTasksWithScores = await Promise.all(otherTasks
      .map(async task => ({ task, score: await this.scoreTask(task, now) })));
    otherTasksWithScores.sort((a, b) => b.score - a.score);
    
    const tasksWithScores = [...doTodayWithScores, ...otherTasksWithScores];

    const allFixedItems = [...timedEvents, ...fixedRoutines].sort((a, b) => 
      new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    const availableSlots: Array<{ start: Date; end: Date }> = [];
    let cursor = new Date(taskScheduleStart);
    
    for (const item of allFixedItems) {
      const itemStart = new Date(item.start);
      if (cursor < itemStart) {
        availableSlots.push({ start: new Date(cursor), end: new Date(itemStart) });
      }
      cursor = new Date(Math.max(cursor.getTime(), new Date(item.end).getTime()));
    }
    
    if (cursor < taskScheduleEnd) {
      availableSlots.push({ start: new Date(cursor), end: new Date(taskScheduleEnd) });
    }

    const firstDayEnd = new Date(taskScheduleStart);
    firstDayEnd.setDate(firstDayEnd.getDate() + 1);
    firstDayEnd.setHours(0, 0, 0, 0);

    const mutableSlots = availableSlots.map(slot => ({ 
      start: new Date(slot.start),
      end: new Date(slot.end)
    }));

    const taskRemainingMinutes = new Map<number, number>();
    for (const { task } of tasksWithScores) {
      taskRemainingMinutes.set(task.id, task.duration_minutes);
    }

    for (const { task } of tasksWithScores) {
      let remainingMinutes = taskRemainingMinutes.get(task.id) || 0;

      for (let i = 0; i < mutableSlots.length && remainingMinutes > 0; i++) {
        const slot = mutableSlots[i];
        
        let slotStart = new Date(slot.start);
        const slotEnd = new Date(slot.end);

        if (slotStart >= slotEnd) continue;

        if (task.category === "do_today") {
          if (slotStart >= firstDayEnd) continue;
        }

        const windowBounds = await this.getWindowBounds(task, slotStart);
        if (settings.workPersonalMode === "separate" && (task.category === "work" || task.category === "personal")) {
          if (!windowBounds) {
            continue;
          }
          if (slotStart < windowBounds.windowStart) {
            slotStart = new Date(windowBounds.windowStart);
          }
        }

        if (task.earliest_start) {
          const earliestStart = new Date(task.earliest_start);
          if (slotStart < earliestStart) {
            slotStart = new Date(Math.max(earliestStart.getTime(), slot.start.getTime()));
          }
        }

        let availableUntil = new Date(slotEnd);
        if (task.latest_finish) {
          const latestFinish = new Date(task.latest_finish);
          if (latestFinish < availableUntil) {
            availableUntil = new Date(latestFinish);
          }
        }

        if (task.category === "do_today") {
          availableUntil = new Date(Math.min(availableUntil.getTime(), firstDayEnd.getTime()));
        }

        if (windowBounds && settings.workPersonalMode === "separate" && (task.category === "work" || task.category === "personal")) {
          availableUntil = new Date(Math.min(availableUntil.getTime(), windowBounds.windowEnd.getTime()));
        }

        if (slotStart >= availableUntil || slotStart >= slotEnd) continue;

        let slotMinutes = Math.min(
          remainingMinutes,
          (Math.min(availableUntil.getTime(), slotEnd.getTime()) - slotStart.getTime()) / (60 * 1000)
        );

        if (maxChunkMinutes) {
          const effectiveMaxChunk = task.flow_mode ? maxChunkMinutes * 1.5 : maxChunkMinutes;
          slotMinutes = Math.min(slotMinutes, effectiveMaxChunk);
        }

        if (slotMinutes <= 0) continue;

        const eventStart = new Date(slotStart);
        const eventEnd = new Date(slotStart.getTime() + slotMinutes * 60 * 1000);

        scheduledItems.push({
          task_id: task.id,
          task_name: task.name,
          start: eventStart.toISOString(),
          end: eventEnd.toISOString(),
          duration_minutes: Math.floor(slotMinutes),
          is_event: false
        });

        if (slotStart.getTime() > slot.start.getTime()) {
          const beforeSlot = { 
            start: new Date(slot.start), 
            end: new Date(slotStart) 
          };
          mutableSlots.splice(i, 0, beforeSlot);
          i++;
        }
        
        slot.start = new Date(eventEnd);
        
        remainingMinutes -= slotMinutes;
        taskRemainingMinutes.set(task.id, remainingMinutes);
      }
    }

    const remainingSlots = mutableSlots.filter(slot => {
      const slotDuration = (slot.end.getTime() - slot.start.getTime()) / (60 * 1000);
      return slotDuration > 0;
    });

    if (remainingSlots.length > 0 && tasksWithScores.length > 0) {
      let taskIndex = 0;
      
      for (const slot of remainingSlots) {
        let slotStart = new Date(slot.start);
        const slotEnd = new Date(slot.end);
        
        while (slotStart < slotEnd) {
          const task = tasksWithScores[taskIndex % tasksWithScores.length].task;
          
          const slotMinutes = Math.floor((slotEnd.getTime() - slotStart.getTime()) / (60 * 1000));
          if (slotMinutes <= 0) break;
          
          const chunkMinutes = maxChunkMinutes 
            ? Math.min(slotMinutes, task.flow_mode ? maxChunkMinutes * 1.5 : maxChunkMinutes)
            : Math.min(slotMinutes, task.duration_minutes);
          
          const eventStart = new Date(slotStart);
          const eventEnd = new Date(slotStart.getTime() + chunkMinutes * 60 * 1000);
          
          scheduledItems.push({
            task_id: task.id,
            task_name: task.name,
            start: eventStart.toISOString(),
            end: eventEnd.toISOString(),
            duration_minutes: Math.floor(chunkMinutes),
            is_event: false
          });
          
          slotStart = eventEnd;
          taskIndex++;
        }
      }
    }

    scheduledItems.sort((a, b) => {
      const aTime = new Date(a.start).getTime();
      const bTime = new Date(b.start).getTime();
      const aDate = new Date(a.start).toDateString();
      const bDate = new Date(b.start).toDateString();
      
      if (aDate === bDate) {
        if (a.all_day && !b.all_day) return -1;
        if (!a.all_day && b.all_day) return 1;
      }
      
      return aTime - bTime;
    });

    await this.setScheduled(scheduledItems);
    return { status: 'ok', scheduled: scheduledItems };
  }


  async exportSchedule() {
    return {
      created_at: new Date().toISOString(),
      tasks: await this.getTasks(),
      events: await this.getEvents(),
      scheduled: await this.getScheduled(),
    };
  }

  loadSampleData() {
    // Add scheduled events
    this.addEvent({
      name: "Peer mentoring session",
      start: "2025-09-09T09:30:00",
      end: "2025-09-09T12:30:00",
      category: "work",
      repeat: "none"
    });

    this.addEvent({
      name: "Drive mom and Bry to the procedure",
      start: "2025-09-10T09:00:00",
      end: "2025-09-10T12:00:00",
      category: "personal",
      repeat: "none"
    });

    this.addEvent({
      name: "Call with Eddie and Chris",
      start: "2025-09-10T14:00:00",
      end: "2025-09-10T15:30:00",
      category: "work",
      repeat: "none"
    });

    this.addEvent({
      name: "Division-wide meeting with Angelica (small presentation)",
      start: "2025-09-16T14:00:00",
      end: "2025-09-16T15:30:00",
      category: "work",
      repeat: "none"
    });

    this.addEvent({
      name: "Dad call?",
      start: "2025-09-16T13:00:00",
      end: "2025-09-16T14:00:00",
      category: "personal",
      repeat: "none"
    });

    this.addEvent({
      name: "Performance review - Angelica",
      start: "2025-09-18T11:00:00",
      end: "2025-09-18T12:00:00",
      category: "work",
      repeat: "none"
    });

    this.addEvent({
      name: "Mandy Jansen interview",
      start: "2025-09-26T15:00:00",
      end: "2025-09-26T16:00:00",
      category: "work",
      repeat: "none"
    });

    // Add recurring routines
    this.addTask({
      name: "Dinner",
      duration_minutes: 90,
      category: "personal",
      urgency: 0.5,
      importance: 0.5,
      enjoyment: 0.7,
      repeat: "daily",
      earliest_start: "18:00",
      latest_finish: "19:30",
      constraints: {},
      metadata: {}
    });

    this.addTask({
      name: "Answering Email",
      duration_minutes: 30,
      category: "work",
      urgency: 0.6,
      importance: 0.6,
      enjoyment: 0.3,
      repeat: "daily",
      earliest_start: "10:00",
      latest_finish: "10:30",
      constraints: { weekdays_only: true },
      metadata: {}
    });

    this.addTask({
      name: "Morning Rituals (Weekdays)",
      duration_minutes: 60,
      category: "personal",
      urgency: 0.5,
      importance: 0.6,
      enjoyment: 0.6,
      repeat: "daily",
      earliest_start: "08:00",
      latest_finish: "09:00",
      constraints: { weekdays_only: true },
      metadata: {}
    });

    this.addTask({
      name: "Morning Rituals (Weekend)",
      duration_minutes: 90,
      category: "personal",
      urgency: 0.5,
      importance: 0.6,
      enjoyment: 0.6,
      repeat: "weekly",
      earliest_start: "08:30",
      latest_finish: "10:00",
      constraints: { weekends_only: true },
      metadata: {}
    });

    this.addTask({
      name: "Exercise",
      duration_minutes: 90,
      category: "personal",
      urgency: 0.6,
      importance: 0.7,
      enjoyment: 0.8,
      repeat: "daily",
      latest_finish: "17:00",
      constraints: {},
      metadata: {}
    });

    this.addTask({
      name: "Trash (and recycling)",
      duration_minutes: 30,
      category: "personal",
      urgency: 0.5,
      importance: 0.4,
      enjoyment: 0.2,
      repeat: "weekly",
      earliest_start: "17:30",
      latest_finish: "18:00",
      constraints: { specific_days: [0, 3] },
      metadata: {}
    });

    // Add tasks with deadlines
    this.addTask({
      name: "slides to Angelica re: presentation",
      duration_minutes: 120,
      category: "work",
      urgency: 0.8,
      importance: 0.8,
      enjoyment: 0.4,
      repeat: "none",
      latest_finish: "2025-09-11T23:59:59",
      constraints: {},
      metadata: { type: "Assignment" }
    });

    this.addTask({
      name: "update slides for 16th and send to Angelica",
      duration_minutes: 120,
      category: "work",
      urgency: 0.8,
      importance: 0.8,
      enjoyment: 0.4,
      repeat: "none",
      latest_finish: "2025-09-11T23:59:59",
      constraints: {},
      metadata: { type: "Assignment" }
    });

    this.addTask({
      name: "New Goal setting (email on 9/8 form SR VP Hum Resources)",
      duration_minutes: 120,
      category: "work",
      urgency: 0.6,
      importance: 0.7,
      enjoyment: 0.3,
      repeat: "none",
      latest_finish: "2025-09-30T23:59:59",
      constraints: {},
      metadata: { type: "Assignment" }
    });

    this.addTask({
      name: "3 peaks deposit due Oct 1",
      duration_minutes: 30,
      category: "personal",
      urgency: 0.7,
      importance: 0.6,
      enjoyment: 0.5,
      repeat: "none",
      latest_finish: "2025-10-01T23:59:59",
      constraints: {},
      metadata: { type: "Assignment" }
    });

    this.addTask({
      name: "Gifts for Elisa",
      duration_minutes: 120,
      category: "personal",
      urgency: 0.8,
      importance: 0.7,
      enjoyment: 0.6,
      repeat: "none",
      latest_finish: "2025-09-20T23:59:59",
      constraints: {},
      metadata: { type: "Assignment" }
    });

    this.addTask({
      name: "Elisa's birthday",
      duration_minutes: 120,
      category: "personal",
      urgency: 0.9,
      importance: 0.8,
      enjoyment: 0.8,
      repeat: "none",
      latest_finish: "2025-09-20T23:59:59",
      constraints: {},
      metadata: { type: "Assignment" }
    });

    this.addTask({
      name: "triathlon training",
      duration_minutes: 180,
      category: "personal",
      urgency: 0.8,
      importance: 0.7,
      enjoyment: 0.8,
      repeat: "none",
      latest_finish: "2025-09-07T23:59:59",
      constraints: {},
      metadata: { type: "Assignment" }
    });

    // Long-term projects with priority ratings
    this.addTask({
      name: "Continue work on Activity Advisor program",
      duration_minutes: 120,
      category: "work",
      urgency: 1.0,
      importance: 0.95,
      enjoyment: 0.9,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Boat stuff",
      duration_minutes: 90,
      category: "personal",
      urgency: 0.7,
      importance: 0.6,
      enjoyment: 0.7,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Send keynote video to mom",
      duration_minutes: 30,
      category: "personal",
      urgency: 0.3,
      importance: 0.4,
      enjoyment: 0.6,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Boater endorsement on driver's license",
      duration_minutes: 60,
      category: "personal",
      urgency: 0.5,
      importance: 0.5,
      enjoyment: 0.2,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Get UW safety alerts",
      duration_minutes: 30,
      category: "personal",
      urgency: 0.4,
      importance: 0.4,
      enjoyment: 0.1,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Kurt - September plans",
      duration_minutes: 45,
      category: "personal",
      urgency: 0.8,
      importance: 0.5,
      enjoyment: 0.4,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Pursue School 81/consult Angelica",
      duration_minutes: 60,
      category: "work",
      urgency: 0.6,
      importance: 0.8,
      enjoyment: 0.2,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Get back to Cameron",
      duration_minutes: 30,
      category: "personal",
      urgency: 0.4,
      importance: 0.3,
      enjoyment: 0.5,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Follow up with Erik on Summer Science",
      duration_minutes: 30,
      category: "work",
      urgency: 0.2,
      importance: 0.4,
      enjoyment: 0.7,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Review AI overview from call",
      duration_minutes: 45,
      category: "work",
      urgency: 0.3,
      importance: 0.4,
      enjoyment: 0.4,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Prepare for Angelica performance review",
      duration_minutes: 90,
      category: "work",
      urgency: 0.4,
      importance: 0.8,
      enjoyment: 0.3,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Eddie email - maker / special ed redesign UD, AI",
      duration_minutes: 45,
      category: "work",
      urgency: 0.2,
      importance: 0.2,
      enjoyment: 0.4,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Send around Educator's Guide to STEAM 2ed review",
      duration_minutes: 30,
      category: "work",
      urgency: 0.2,
      importance: 0.3,
      enjoyment: 0.7,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "email Angelica re School 81?",
      duration_minutes: 20,
      category: "work",
      urgency: 0.4,
      importance: 0.4,
      enjoyment: 0.3,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Call Spencer's PT",
      duration_minutes: 30,
      category: "personal",
      urgency: 0.5,
      importance: 0.4,
      enjoyment: 0.3,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "send mom and dad FB post from McNicholls",
      duration_minutes: 15,
      category: "personal",
      urgency: 0.2,
      importance: 0.2,
      enjoyment: 0.4,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "new reverse osmosis",
      duration_minutes: 60,
      category: "personal",
      urgency: 0.4,
      importance: 0.4,
      enjoyment: 0.1,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Spencer's car",
      duration_minutes: 90,
      category: "personal",
      urgency: 0.3,
      importance: 0.4,
      enjoyment: 0.4,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "September and October trip planning",
      duration_minutes: 120,
      category: "personal",
      urgency: 0.7,
      importance: 0.5,
      enjoyment: 0.3,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "sink backed up again",
      duration_minutes: 45,
      category: "personal",
      urgency: 0.5,
      importance: 0.5,
      enjoyment: 0.1,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Ask Mitch about Dad call",
      duration_minutes: 20,
      category: "personal",
      urgency: 0.8,
      importance: 0.5,
      enjoyment: 0.6,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Announce/organize happy hour on 16th",
      duration_minutes: 30,
      category: "work",
      urgency: 0.9,
      importance: 0.5,
      enjoyment: 0.3,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Spencer meal plan",
      duration_minutes: 30,
      category: "personal",
      urgency: 0.1,
      importance: 0.5,
      enjoyment: 0.3,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Tech/AI Ed needs assessment",
      duration_minutes: 90,
      category: "work",
      urgency: 0.6,
      importance: 0.8,
      enjoyment: 0.5,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Project New Masters program",
      duration_minutes: 120,
      category: "work",
      urgency: 0.4,
      importance: 0.8,
      enjoyment: 0.4,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Do something with Autism-Makerspace data",
      duration_minutes: 90,
      category: "work",
      urgency: 0.3,
      importance: 0.5,
      enjoyment: 0.4,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Host NJTEEA site visit",
      duration_minutes: 120,
      category: "work",
      urgency: 0.5,
      importance: 0.6,
      enjoyment: 0.6,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Yes tickets debacle",
      duration_minutes: 45,
      category: "personal",
      urgency: 0.8,
      importance: 0.4,
      enjoyment: 0.6,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Colleen Costagan - check when scholarship will be applied",
      duration_minutes: 30,
      category: "work",
      urgency: 0.9,
      importance: 0.7,
      enjoyment: 0.2,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Boat!",
      duration_minutes: 180,
      category: "personal",
      urgency: 0.4,
      importance: 0.3,
      enjoyment: 0.8,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Check Spencer's tuition balance around the 24th",
      duration_minutes: 20,
      category: "personal",
      urgency: 0.4,
      importance: 0.3,
      enjoyment: 0.2,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Check w team re who does what on 16th - again",
      duration_minutes: 30,
      category: "work",
      urgency: 0.9,
      importance: 0.5,
      enjoyment: 0.4,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Give mentoring group fair warning canceling the 16th",
      duration_minutes: 20,
      category: "work",
      urgency: 0.9,
      importance: 0.4,
      enjoyment: 0.3,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Tweek slides for next Tues again for just Eddie and me",
      duration_minutes: 60,
      category: "work",
      urgency: 0.9,
      importance: 0.8,
      enjoyment: 0.3,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Colleen Costagan - check when scholarship will be applied - check hyunjo on Mon",
      duration_minutes: 30,
      category: "work",
      urgency: 0.8,
      importance: 0.6,
      enjoyment: 0.2,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Ray?",
      duration_minutes: 30,
      category: "personal",
      urgency: 0.3,
      importance: 0.5,
      enjoyment: 0.4,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Matt email - reply, send to eddie, pay marketing fee",
      duration_minutes: 45,
      category: "work",
      urgency: 0.5,
      importance: 0.5,
      enjoyment: 0.2,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Gifts for Elisa",
      duration_minutes: 120,
      category: "personal",
      urgency: 0.9,
      importance: 0.7,
      enjoyment: 0.6,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Matt: NJTEEA conference and session/table",
      duration_minutes: 60,
      category: "work",
      urgency: 0.5,
      importance: 0.4,
      enjoyment: 0.3,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Matt: NJTEEA marketing billing",
      duration_minutes: 30,
      category: "work",
      urgency: 0.8,
      importance: 0.5,
      enjoyment: 0.2,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Patty - Gilbert and it certificaton - student program — sponsor, credit, marketing, etc.",
      duration_minutes: 90,
      category: "work",
      urgency: 0.6,
      importance: 0.4,
      enjoyment: 0.1,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Gandhi",
      duration_minutes: 60,
      category: "personal",
      urgency: 0.8,
      importance: 0.8,
      enjoyment: 0.8,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Ezra!",
      duration_minutes: 60,
      category: "personal",
      urgency: 0.7,
      importance: 0.7,
      enjoyment: 0.7,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Talk to Rebecca Reynolds",
      duration_minutes: 45,
      category: "work",
      urgency: 0.5,
      importance: 0.5,
      enjoyment: 0.5,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Spencer: meal plan",
      duration_minutes: 30,
      category: "personal",
      urgency: 0.2,
      importance: 0.5,
      enjoyment: 0.5,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    this.addTask({
      name: "Spencer: letter; write back?",
      duration_minutes: 60,
      category: "personal",
      urgency: 0.4,
      importance: 0.8,
      enjoyment: 0.8,
      repeat: "none",
      constraints: {},
      metadata: { type: "Long-term project" }
    });

    // Value tasks
    this.addTask({
      name: "Time with my mom",
      duration_minutes: 120,
      category: "personal",
      urgency: 0.5,
      importance: 0.8,
      enjoyment: 0.8,
      repeat: "none",
      constraints: {},
      metadata: { type: "Value" }
    });

    this.addTask({
      name: "Communicate with family and friends",
      duration_minutes: 60,
      category: "personal",
      urgency: 0.4,
      importance: 0.7,
      enjoyment: 0.7,
      repeat: "none",
      constraints: {},
      metadata: { type: "Value" }
    });

    // Hobby tasks
    this.addTask({
      name: "Pillows",
      duration_minutes: 90,
      category: "personal",
      urgency: 0.3,
      importance: 0.3,
      enjoyment: 0.8,
      repeat: "none",
      constraints: {},
      metadata: { type: "Hobby" }
    });

    this.addTask({
      name: "Wine shopping?",
      duration_minutes: 60,
      category: "personal",
      urgency: 0.3,
      importance: 0.3,
      enjoyment: 0.7,
      repeat: "none",
      constraints: {},
      metadata: { type: "Hobby" }
    });

    this.addTask({
      name: "movies -- try Paul's rec",
      duration_minutes: 150,
      category: "personal",
      urgency: 0.3,
      importance: 0.3,
      enjoyment: 0.8,
      repeat: "none",
      constraints: { preferred_days: [4, 5], preferred_context: "evening" },
      metadata: { type: "Hobby" }
    });
  }

  async suggestTaskForNow(): Promise<{ task_name: string; task_id: number | null } | null> {
    const tasks = await this.getTasks();
    const now = new Date();
    
    const actionableTasks = tasks.filter(t => t.category !== "waiting_on_others");
    
    if (actionableTasks.length === 0) {
      return null;
    }
    
    const scoredTasks = await Promise.all(
      actionableTasks.map(async (task) => ({
        task,
        score: await this.scoreTask(task, now)
      }))
    );
    
    scoredTasks.sort((a, b) => b.score - a.score);
    
    const topTask = scoredTasks[0];
    return {
      task_name: topTask.task.name,
      task_id: topTask.task.id
    };
  }
}

export const scheduler = new SchedulerState();
