import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, TrendingUp, Sparkles, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Task {
  id: number;
  name: string;
  duration_minutes: number;
  category: string;
  activity_type?: string;
  urgency: number;
  importance: number;
  enjoyment: number;
  completed: boolean;
  completed_at?: string;
}

interface CompletedTasksResponse {
  count: number;
  tasks: Task[];
}

export default function Progress() {
  const queryClient = useQueryClient();
  const [showReflection, setShowReflection] = useState(false);
  const [reflection, setReflection] = useState("");
  const [isLoadingReflection, setIsLoadingReflection] = useState(false);

  const { data: completedData } = useQuery<CompletedTasksResponse>({
    queryKey: ["/api/tasks/completed"],
  });

  const uncompleteMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await fetch(`/api/tasks/${taskId}/uncomplete`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to uncomplete task");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/completed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
    },
    onError: () => {
      alert("Sorry, there was an error restoring the task. Please try again.");
    },
  });

  const completedTasks = completedData?.tasks || [];

  const stats = {
    totalCompleted: completedTasks.length,
    totalHours: Math.round(
      completedTasks.reduce((sum, t) => sum + t.duration_minutes, 0) / 60
    ),
    workTasks: completedTasks.filter(
      (t) => t.category === "do_today" || t.category === "waiting_on_others"
    ).length,
    personalTasks: completedTasks.filter(
      (t) => t.category === "values-driven" || t.category === "someday-maybe"
    ).length,
    avgEnjoyment: completedTasks.length
      ? (
          completedTasks.reduce((sum, t) => sum + t.enjoyment, 0) /
          completedTasks.length
        ).toFixed(1)
      : "0",
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "do_today":
        return "bg-red-500/10 text-red-500";
      case "waiting_on_others":
        return "bg-yellow-500/10 text-yellow-500";
      case "values-driven":
        return "bg-green-500/10 text-green-500";
      case "someday-maybe":
        return "bg-blue-500/10 text-blue-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "do_today":
        return "Do Today";
      case "waiting_on_others":
        return "Waiting on Others";
      case "values-driven":
        return "Values-Driven";
      case "someday-maybe":
        return "Someday/Maybe";
      default:
        return category;
    }
  };

  const handleReflection = async () => {
    setShowReflection(true);
    setIsLoadingReflection(true);

    try {
      const response = await fetch("/api/reflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedTasks }),
      });
      const data = await response.json();
      setReflection(data.reflection || "Unable to generate reflection at this time.");
    } catch (error) {
      setReflection("Sorry, there was an error generating your reflection. Please try again.");
    } finally {
      setIsLoadingReflection(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Progress & Reflection
            </h1>
            <p className="text-muted-foreground mt-2">
              Celebrate what you've accomplished and reflect on your journey
            </p>
          </div>
          <Button
            onClick={handleReflection}
            className="bg-gradient-to-r from-purple-600 to-pink-600"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Get AI Reflection
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCompleted}</div>
              <p className="text-xs text-muted-foreground">tasks finished</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Invested</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalHours}h</div>
              <p className="text-xs text-muted-foreground">total hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Work Tasks</CardTitle>
              <TrendingUp className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.workTasks}</div>
              <p className="text-xs text-muted-foreground">obligations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Personal</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.personalTasks}</div>
              <p className="text-xs text-muted-foreground">values-driven</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enjoyment</CardTitle>
              <Sparkles className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgEnjoyment}</div>
              <p className="text-xs text-muted-foreground">avg rating</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Completed Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completedTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No completed tasks yet.</p>
                <p className="text-sm mt-1">
                  Complete tasks from your schedule to see them here!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <h3 className="font-medium">{task.name}</h3>
                        <Badge className={getCategoryColor(task.category)}>
                          {getCategoryLabel(task.category)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {task.duration_minutes} min
                        </span>
                        <span>Enjoyment: {task.enjoyment}/1.0</span>
                        {task.completed_at && (
                          <span>
                            Completed {format(new Date(task.completed_at), "MMM d, h:mm a")}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => uncompleteMutation.mutate(task.id)}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showReflection} onOpenChange={setShowReflection}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Your Progress Reflection
            </DialogTitle>
            <DialogDescription>
              AI-powered insights about your journey
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isLoadingReflection ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-line leading-relaxed">{reflection}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
