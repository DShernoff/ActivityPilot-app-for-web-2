import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { TaskForm, type TaskFormData } from "@/components/TaskForm";
import { EventForm, type EventFormData } from "@/components/EventForm";
import { SettingsForm } from "@/components/SettingsForm";
import { TaskList } from "@/components/TaskList";
import { EventList } from "@/components/EventList";
import { ScheduleForm, type ScheduleConfig } from "@/components/ScheduleForm";
import { ScheduleTimeline } from "@/components/ScheduleTimeline";
import { StatsCard } from "@/components/StatsCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckSquare, Clock, Calendar, Trash2, Sparkles, Wand2, LayoutDashboard, Watch, TrendingUp } from "lucide-react";
import type { Task, Event, ScheduledEvent, Settings } from "@shared/schema";
import WatchView from "./WatchView";
import Progress from "./Progress";

export default function Home() {
  const { toast } = useToast();
  const [view, setView] = useState<"dashboard" | "manage" | "schedule" | "watch" | "progress">("dashboard");
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [dailyForecast, setDailyForecast] = useState<string>("");
  const [magicWandSuggestion, setMagicWandSuggestion] = useState<{ suggestion: string; activityName: string; duration: number } | null>(null);

  const { data: tasksData } = useQuery<{ tasks: Task[] }>({
    queryKey: ["/api/tasks"],
  });

  const { data: eventsData } = useQuery<{ events: Event[] }>({
    queryKey: ["/api/events"],
  });

  const { data: scheduleData } = useQuery<{ scheduled: ScheduledEvent[] }>({
    queryKey: ["/api/schedule"],
  });

  const { data: settingsData } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const tasks: Task[] = tasksData?.tasks || [];
  const events: Event[] = eventsData?.events || [];
  const scheduled: ScheduledEvent[] = scheduleData?.scheduled || [];
  const settings: Settings = settingsData || {
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
  };

  const regularTasks = tasks.filter(t => !t.repeat || t.repeat === "none");
  const routines = tasks.filter(t => t.repeat && t.repeat !== "none");

  const editingTask = editingTaskId ? tasks.find(t => t.id === editingTaskId) : null;
  const editingEvent = editingEventId ? events.find(e => e.id === editingEventId) : null;

  const categoryMap = tasks.reduce((acc, task) => {
    acc[task.id] = task.category;
    return acc;
  }, {} as Record<number, string>);
  
  events.forEach(event => {
    categoryMap[event.id] = event.category;
  });

  const addTaskMutation = useMutation({
    mutationFn: async (task: TaskFormData) => {
      const res = await apiRequest("POST", "/api/add_task", task);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task added",
        description: "Your task has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await apiRequest("DELETE", `/api/task/${taskId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      toast({
        title: "Task deleted",
        description: "The task has been removed.",
      });
    },
  });

  const addEventMutation = useMutation({
    mutationFn: async (event: EventFormData) => {
      const res = await apiRequest("POST", "/api/add_event", event);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Event added",
        description: "Your event has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const res = await apiRequest("DELETE", `/api/event/${eventId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      toast({
        title: "Event deleted",
        description: "The event has been removed.",
      });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EventFormData }) => {
      const res = await apiRequest("PUT", `/api/event/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      setEditingEventId(null);
      toast({
        title: "Event updated",
        description: "Your event has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateScheduleMutation = useMutation({
    mutationFn: async (config: ScheduleConfig) => {
      const res = await apiRequest("POST", "/api/schedule", config);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      setView("schedule");
      toast({
        title: "Schedule generated",
        description: "Your optimized schedule is ready.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  const clearStateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/clear");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      toast({
        title: "Cleared",
        description: "All tasks, events, and schedules have been cleared.",
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Settings) => {
      const res = await apiRequest("POST", "/api/settings", settings);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings saved",
        description: "Your schedule preferences have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TaskFormData }) => {
      const res = await apiRequest("PUT", `/api/task/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      setEditingTaskId(null);
      toast({
        title: "Task updated",
        description: "Your task has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const dailyForecastMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/daily-forecast", {});
      return res.json();
    },
    onSuccess: (data) => {
      setDailyForecast(data.forecast);
      toast({
        title: "Daily Forecast Generated",
        description: "Your personalized forecast is ready!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate daily forecast. Please try again.",
        variant: "destructive",
      });
    },
  });

  const magicWandMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/magic-wand", {});
      return res.json();
    },
    onSuccess: (data) => {
      setMagicWandSuggestion(data);
      toast({
        title: "Magic Wand Suggestion",
        description: "A new activity suggestion has been generated!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate suggestion. Please try again.",
        variant: "destructive",
      });
    },
  });

  const totalScheduledMinutes = scheduled.reduce((sum, event) => sum + event.duration_minutes, 0);
  const scheduledHours = (totalScheduledMinutes / 60).toFixed(1);

  const workTasks = tasks.filter(t => t.category === "work").length;
  const personalTasks = tasks.filter(t => t.category === "personal").length;
  const totalCategorizedTasks = workTasks + personalTasks || 1;
  const workLifeBalance = (personalTasks / totalCategorizedTasks * 100).toFixed(0);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Task Scheduler</h1>
              <p className="text-sm text-muted-foreground">Optimize your productivity</p>
            </div>
            <div className="flex items-center gap-2">
              {(tasks.length > 0 || events.length > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearStateMutation.mutate()}
                  data-testid="button-clear-all"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Total Tasks"
            value={tasks.length}
            icon={CheckSquare}
          />
          <StatsCard
            title="Scheduled Hours"
            value={`${scheduledHours}h`}
            icon={Clock}
          />
          <StatsCard
            title="Events"
            value={events.length}
            icon={Calendar}
          />
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            variant={view === "dashboard" ? "default" : "outline"}
            onClick={() => setView("dashboard")}
            data-testid="button-view-dashboard"
          >
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <Button
            variant={view === "manage" ? "default" : "outline"}
            onClick={() => setView("manage")}
            data-testid="button-view-manage"
          >
            Manage
          </Button>
          <Button
            variant={view === "schedule" ? "default" : "outline"}
            onClick={() => setView("schedule")}
            data-testid="button-view-schedule"
          >
            Schedule
          </Button>
          <Button
            variant={view === "watch" ? "default" : "outline"}
            onClick={() => setView("watch")}
            data-testid="button-view-watch"
          >
            <Watch className="h-4 w-4 mr-2" />
            Watch
          </Button>
          <Button
            variant={view === "progress" ? "default" : "outline"}
            onClick={() => setView("progress")}
            data-testid="button-view-progress"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Progress
          </Button>
        </div>

        {view === "progress" ? (
          <Progress />
        ) : view === "dashboard" ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <LayoutDashboard className="h-5 w-5" />
                  Work/Life Balance
                </h3>
                <div className="text-3xl font-bold text-primary mb-2">
                  {workLifeBalance}%
                </div>
                <p className="text-sm text-muted-foreground">
                  Personal tasks vs. work tasks
                </p>
              </Card>

              <Card className="p-6 col-span-1 md:col-span-2">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  AI-Powered Actions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Button
                    onClick={() => dailyForecastMutation.mutate()}
                    disabled={dailyForecastMutation.isPending}
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    data-testid="button-daily-forecast"
                  >
                    <Sparkles className="h-6 w-6" />
                    <span className="font-medium">Daily Forecast</span>
                    <span className="text-xs text-muted-foreground text-center">
                      Get AI insights about your day
                    </span>
                  </Button>
                  <Button
                    onClick={() => magicWandMutation.mutate()}
                    disabled={magicWandMutation.isPending}
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    data-testid="button-magic-wand"
                  >
                    <Wand2 className="h-6 w-6" />
                    <span className="font-medium">Magic Wand</span>
                    <span className="text-xs text-muted-foreground text-center">
                      Get a personalized activity suggestion
                    </span>
                  </Button>
                  <Button
                    onClick={() => generateScheduleMutation.mutate({
                      day_start: new Date().toISOString(),
                      day_end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    })}
                    disabled={generateScheduleMutation.isPending}
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    data-testid="button-generate-schedule-dashboard"
                  >
                    <Calendar className="h-6 w-6" />
                    <span className="font-medium">Generate Schedule</span>
                    <span className="text-xs text-muted-foreground text-center">
                      Create your optimized schedule
                    </span>
                  </Button>
                </div>
              </Card>
            </div>

            {dailyForecast && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Daily Forecast
                </h3>
                <p className="text-base leading-relaxed" data-testid="text-daily-forecast">
                  {dailyForecast}
                </p>
              </Card>
            )}

            {magicWandSuggestion && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-primary" />
                  Magic Wand Suggestion
                </h3>
                <h4 className="font-semibold text-base mb-2" data-testid="text-activity-name">
                  {magicWandSuggestion.activityName}
                </h4>
                <p className="text-base leading-relaxed mb-3" data-testid="text-suggestion">
                  {magicWandSuggestion.suggestion}
                </p>
                <p className="text-sm text-muted-foreground">
                  Estimated duration: {magicWandSuggestion.duration} minutes
                </p>
              </Card>
            )}
          </div>
        ) : view === "manage" ? (
          <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="mb-6" data-testid="tabs-manage">
              <TabsTrigger value="tasks" data-testid="tab-tasks">
                Tasks ({regularTasks.length})
              </TabsTrigger>
              <TabsTrigger value="events" data-testid="tab-events">
                Events ({events.length})
              </TabsTrigger>
              <TabsTrigger value="routines" data-testid="tab-routines">
                Routines ({routines.length})
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings">
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-xl font-semibold mb-4">Add Task</h2>
                  <TaskForm
                    onSubmit={(task) => addTaskMutation.mutate(task)}
                    isLoading={addTaskMutation.isPending}
                    showRepeatOption={false}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-4">Your Tasks</h2>
                  <TaskList
                    tasks={regularTasks}
                    onDelete={(id) => deleteTaskMutation.mutate(id)}
                    onEdit={(id) => setEditingTaskId(id)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="events" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-xl font-semibold mb-4">Add Event</h2>
                  <EventForm
                    onSubmit={(event) => addEventMutation.mutate(event)}
                    isLoading={addEventMutation.isPending}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-4">Your Events</h2>
                  <EventList
                    events={events}
                    onDelete={(id) => deleteEventMutation.mutate(id)}
                    onEdit={(id) => setEditingEventId(id)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="routines" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-xl font-semibold mb-4">Add Routine</h2>
                  <TaskForm
                    onSubmit={(task) => addTaskMutation.mutate(task)}
                    isLoading={addTaskMutation.isPending}
                    showRepeatOption={true}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-4">Your Routines</h2>
                  <TaskList
                    tasks={routines}
                    onDelete={(id) => deleteTaskMutation.mutate(id)}
                    onEdit={(id) => setEditingTaskId(id)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <div className="max-w-2xl">
                <h2 className="text-xl font-semibold mb-4">Schedule Settings</h2>
                <SettingsForm
                  currentSettings={settings}
                  onSubmit={(settings) => updateSettingsMutation.mutate(settings)}
                  isLoading={updateSettingsMutation.isPending}
                />
              </div>
            </TabsContent>
          </Tabs>
        ) : view === "schedule" ? (
          <div className="space-y-6">
            <div className="max-w-2xl">
              <ScheduleForm
                onGenerate={(config) => generateScheduleMutation.mutate(config)}
                isLoading={generateScheduleMutation.isPending}
                settings={settings}
              />
            </div>
            <div className="max-w-4xl mx-auto">
              <ScheduleTimeline events={scheduled} category={categoryMap} />
            </div>
          </div>
        ) : (
          <WatchView />
        )}
      </main>

      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTaskId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <TaskForm
              key={editingTask.id}
              onSubmit={(data) => updateTaskMutation.mutate({ id: editingTask.id, data })}
              isLoading={updateTaskMutation.isPending}
              showRepeatOption={!!editingTask.repeat && editingTask.repeat !== "none"}
              initialData={{
                ...editingTask,
                activity_type: editingTask.activity_type as "assignment" | "project" | "values-driven" | "hobby" | undefined,
                earliest_start: editingTask.earliest_start || undefined,
                latest_finish: editingTask.latest_finish || undefined,
                assignment_deadline: editingTask.assignment_deadline || undefined,
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEventId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          {editingEvent && (
            <EventForm
              key={editingEvent.id}
              onSubmit={(data) => updateEventMutation.mutate({ id: editingEvent.id, data })}
              isLoading={updateEventMutation.isPending}
              initialData={{
                ...editingEvent,
                description: editingEvent.description || undefined,
                repeat: editingEvent.repeat as "none" | "daily" | "weekly" | "monthly" | "annually" | undefined,
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
