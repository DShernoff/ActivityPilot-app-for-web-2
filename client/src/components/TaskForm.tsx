import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Plus, X } from "lucide-react";
import type { Settings } from "@shared/schema";

interface TaskFormProps {
  onSubmit: (task: TaskFormData) => void;
  isLoading?: boolean;
  showRepeatOption?: boolean;
  initialData?: Partial<TaskFormData>;
}

export interface TaskFormData {
  name: string;
  duration_minutes: number;
  category: string;
  activity_type?: "assignment" | "project" | "values-driven" | "hobby";
  assignment_deadline?: string;
  assignment_total_hours?: number;
  assignment_total_minutes?: number;
  urgency: number;
  importance: number;
  enjoyment: number;
  earliest_start?: string;
  latest_finish?: string;
  repeat?: "none" | "daily" | "weekly" | "monthly" | "annually";
  flow_mode?: boolean;
}

export function TaskForm({ onSubmit, isLoading, showRepeatOption = false, initialData }: TaskFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [duration, setDuration] = useState(initialData?.duration_minutes || 30);
  const [category, setCategory] = useState(initialData?.category || "general");
  const [activityType, setActivityType] = useState<"assignment" | "project" | "values-driven" | "hobby" | "">(initialData?.activity_type || "");
  const [assignmentDeadline, setAssignmentDeadline] = useState(initialData?.assignment_deadline ? new Date(initialData.assignment_deadline).toISOString().slice(0, 16) : "");
  const [assignmentTotalHours, setAssignmentTotalHours] = useState(initialData?.assignment_total_hours || 0);
  const [assignmentTotalMinutes, setAssignmentTotalMinutes] = useState(initialData?.assignment_total_minutes || 0);
  const [urgency, setUrgency] = useState([initialData?.urgency ?? 0.5]);
  const [importance, setImportance] = useState([initialData?.importance ?? 0.5]);
  const [enjoyment, setEnjoyment] = useState([initialData?.enjoyment ?? 0.5]);
  const [userModifiedRatings, setUserModifiedRatings] = useState(false);
  const [earliestStart, setEarliestStart] = useState(initialData?.earliest_start ? new Date(initialData.earliest_start).toISOString().slice(0, 10) : "");
  const [latestFinish, setLatestFinish] = useState(initialData?.latest_finish ? new Date(initialData.latest_finish).toISOString().slice(0, 10) : "");
  const [startTime, setStartTime] = useState(initialData?.earliest_start ? new Date(initialData.earliest_start).toTimeString().slice(0, 5) : "09:00");
  const [endTime, setEndTime] = useState(initialData?.latest_finish ? new Date(initialData.latest_finish).toTimeString().slice(0, 5) : "17:00");
  const [repeat, setRepeat] = useState<"none" | "daily" | "weekly" | "monthly" | "annually">(initialData?.repeat || "daily");
  const [flowMode, setFlowMode] = useState(initialData?.flow_mode || false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isFlexibleRoutine, setIsFlexibleRoutine] = useState(!initialData?.earliest_start && !initialData?.latest_finish);

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (!activityType || userModifiedRatings || !settings?.activityTypeDefaults) {
      return;
    }

    const defaults = settings.activityTypeDefaults.find(d => d.type === activityType);
    if (!defaults) return;

    let urgencyValue = defaults.urgency / 10;
    let importanceValue = defaults.importance / 10;
    let enjoymentValue = defaults.enjoyment / 10;

    if (activityType === "assignment" && assignmentDeadline && (assignmentTotalHours > 0 || assignmentTotalMinutes > 0)) {
      const deadlineDate = new Date(assignmentDeadline);
      const today = new Date();
      const msInDay = 24 * 60 * 60 * 1000;
      const workDaysUntilDeadline = Math.max(1, Math.floor((deadlineDate.getTime() - today.getTime()) / msInDay));
      const totalMinutes = (assignmentTotalHours * 60) + assignmentTotalMinutes;
      const totalDays = totalMinutes / (8 * 60);
      const pace = totalDays / workDaysUntilDeadline;
      urgencyValue = Math.min(1, (5 + pace) / 10);
    }

    setUrgency([urgencyValue]);
    setImportance([importanceValue]);
    setEnjoyment([enjoymentValue]);
  }, [activityType, assignmentDeadline, assignmentTotalHours, assignmentTotalMinutes, settings, userModifiedRatings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let taskData: TaskFormData = {
      name,
      duration_minutes: duration,
      category,
      activity_type: activityType || undefined,
      urgency: urgency[0],
      importance: importance[0],
      enjoyment: enjoyment[0],
      repeat: showRepeatOption ? repeat : "none",
      flow_mode: flowMode,
    };

    if (activityType === "assignment") {
      taskData.assignment_deadline = assignmentDeadline || undefined;
      taskData.assignment_total_hours = assignmentTotalHours;
      taskData.assignment_total_minutes = assignmentTotalMinutes;
      
      if (assignmentTotalHours > 0 || assignmentTotalMinutes > 0) {
        taskData.duration_minutes = (assignmentTotalHours * 60) + assignmentTotalMinutes;
      }
      
      if (assignmentDeadline) {
        taskData.latest_finish = assignmentDeadline;
      }
    }
    
    if (showRepeatOption && !isFlexibleRoutine) {
      const today = new Date();
      const [startHour, startMin] = startTime.split(':');
      const [endHour, endMin] = endTime.split(':');
      
      const startDate = new Date(today);
      startDate.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
      
      const endDate = new Date(today);
      endDate.setHours(parseInt(endHour), parseInt(endMin), 0, 0);
      
      taskData.earliest_start = startDate.toISOString();
      if (activityType !== "assignment" || !assignmentDeadline) {
        taskData.latest_finish = endDate.toISOString();
      }
    } else if (!showRepeatOption) {
      if (earliestStart) {
        const earliestDate = new Date(earliestStart);
        earliestDate.setHours(0, 0, 0, 0);
        taskData.earliest_start = earliestDate.toISOString();
      }
      if (activityType !== "assignment" || !assignmentDeadline) {
        if (latestFinish) {
          const latestDate = new Date(latestFinish);
          latestDate.setHours(23, 59, 59, 999);
          taskData.latest_finish = latestDate.toISOString();
        }
      }
    }
    
    onSubmit(taskData);
    
    if (!initialData) {
      setName("");
      setDuration(30);
      setCategory("general");
      setActivityType("");
      setAssignmentDeadline("");
      setAssignmentTotalHours(0);
      setAssignmentTotalMinutes(0);
      setUrgency([0.5]);
      setImportance([0.5]);
      setEnjoyment([0.5]);
      setUserModifiedRatings(false);
      setEarliestStart("");
      setLatestFinish("");
      setStartTime("09:00");
      setEndTime("17:00");
      setRepeat("daily");
      setFlowMode(false);
    }
  };

  const handleRatingChange = (setter: (value: number[]) => void) => (value: number[]) => {
    setUserModifiedRatings(true);
    setter(value);
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-name">Task Name</Label>
            <Input
              id="task-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter task name"
              required
              data-testid="input-task-name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                min={1}
                data-testid="input-duration"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category" data-testid="select-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="do_today">Do Today</SelectItem>
                  <SelectItem value="waiting_on_others">Waiting on others</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="activity-type">Activity Type</Label>
            <Select value={activityType} onValueChange={(v) => setActivityType(v as any)}>
              <SelectTrigger id="activity-type" data-testid="select-activity-type">
                <SelectValue placeholder="Select activity type (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assignment">Assignment (with deadline)</SelectItem>
                <SelectItem value="project">(Long-term) Project</SelectItem>
                <SelectItem value="values-driven">Values-driven</SelectItem>
                <SelectItem value="hobby">Hobby</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {activityType === "assignment" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="assignment-deadline">Assignment Deadline</Label>
                <Input
                  id="assignment-deadline"
                  type="datetime-local"
                  value={assignmentDeadline}
                  onChange={(e) => setAssignmentDeadline(e.target.value)}
                  data-testid="input-assignment-deadline"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assignment-hours">Total Time (Hours)</Label>
                  <Input
                    id="assignment-hours"
                    type="number"
                    value={assignmentTotalHours}
                    onChange={(e) => setAssignmentTotalHours(parseInt(e.target.value) || 0)}
                    min={0}
                    data-testid="input-assignment-hours"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignment-minutes">Total Time (Minutes)</Label>
                  <Input
                    id="assignment-minutes"
                    type="number"
                    value={assignmentTotalMinutes}
                    onChange={(e) => setAssignmentTotalMinutes(parseInt(e.target.value) || 0)}
                    min={0}
                    max={59}
                    data-testid="input-assignment-minutes"
                  />
                </div>
              </div>
            </>
          )}

          {showRepeatOption && (
            <>
              <div className="space-y-2">
                <Label htmlFor="repeat">Repeat</Label>
                <Select value={repeat} onValueChange={(v) => setRepeat(v as any)}>
                  <SelectTrigger id="repeat" data-testid="select-repeat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <div className="flex flex-col space-y-1">
                  <Label htmlFor="flexible-routine">Flexible Routine</Label>
                  <p className="text-sm text-muted-foreground">Schedule this routine any time during the day</p>
                </div>
                <Switch
                  id="flexible-routine"
                  checked={isFlexibleRoutine}
                  onCheckedChange={setIsFlexibleRoutine}
                  data-testid="switch-flexible-routine"
                />
              </div>
              
              {!isFlexibleRoutine && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Start Time</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      data-testid="input-start-time"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end-time">End Time</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      data-testid="input-end-time"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {!showRepeatOption && (
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-between"
                  data-testid="button-toggle-advanced"
                >
                  Advanced Options
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Urgency</Label>
                  <span className="text-sm text-muted-foreground font-mono">{urgency[0].toFixed(2)}</span>
                </div>
                <Slider
                  value={urgency}
                  onValueChange={handleRatingChange(setUrgency)}
                  max={1}
                  step={0.1}
                  data-testid="slider-urgency"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Importance</Label>
                  <span className="text-sm text-muted-foreground font-mono">{importance[0].toFixed(2)}</span>
                </div>
                <Slider
                  value={importance}
                  onValueChange={handleRatingChange(setImportance)}
                  max={1}
                  step={0.1}
                  data-testid="slider-importance"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Enjoyment</Label>
                  <span className="text-sm text-muted-foreground font-mono">{enjoyment[0].toFixed(2)}</span>
                </div>
                <Slider
                  value={enjoyment}
                  onValueChange={handleRatingChange(setEnjoyment)}
                  max={1}
                  step={0.1}
                  data-testid="slider-enjoyment"
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="flex flex-col space-y-1">
                  <Label htmlFor="flow-mode">Flow Mode</Label>
                  <p className="text-sm text-muted-foreground">I'm really into this activity. Schedule more of it and for longer durations.</p>
                </div>
                <Switch
                  id="flow-mode"
                  checked={flowMode}
                  onCheckedChange={setFlowMode}
                  data-testid="switch-flow-mode"
                />
              </div>

              {!showRepeatOption && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Earliest Start and Latest Finish are optional. Leave them blank if not needed.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="earliest-start">Earliest Start (Optional)</Label>
                      <div className="relative">
                        <Input
                          id="earliest-start"
                          type="date"
                          value={earliestStart}
                          onChange={(e) => setEarliestStart(e.target.value)}
                          data-testid="input-earliest-start"
                        />
                        {earliestStart && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setEarliestStart("")}
                            data-testid="button-clear-earliest-start"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="latest-finish">Latest Finish (Optional)</Label>
                      <div className="relative">
                        <Input
                          id="latest-finish"
                          type="date"
                          value={latestFinish}
                          onChange={(e) => setLatestFinish(e.target.value)}
                          data-testid="input-latest-finish"
                        />
                        {latestFinish && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setLatestFinish("")}
                            data-testid="button-clear-latest-finish"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CollapsibleContent>
          </Collapsible>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading} data-testid={initialData ? "button-update-task" : "button-add-task"}>
          <Plus className="h-4 w-4 mr-2" />
          {initialData ? "Update Task" : (showRepeatOption ? "Add Routine" : "Add Task")}
        </Button>
      </form>
    </Card>
  );
}
