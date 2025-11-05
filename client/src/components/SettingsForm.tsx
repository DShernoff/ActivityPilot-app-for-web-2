import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings as SettingsIcon } from "lucide-react";
import type { Settings, ActivityTypeDefault } from "@shared/schema";

interface SettingsFormProps {
  currentSettings: Settings;
  onSubmit: (settings: Settings) => void;
  isLoading?: boolean;
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const weekdays = [1, 2, 3, 4, 5];
const allDays = [0, 1, 2, 3, 4, 5, 6];

export function SettingsForm({ currentSettings, onSubmit, isLoading }: SettingsFormProps) {
  const [mode, setMode] = useState<"mix" | "separate">(currentSettings.workPersonalMode);
  const [workStartTime, setWorkStartTime] = useState(currentSettings.workStartTime);
  const [workEndTime, setWorkEndTime] = useState(currentSettings.workEndTime);
  const [workDays, setWorkDays] = useState<number[]>(currentSettings.workDays);
  const [personalStartTime, setPersonalStartTime] = useState(currentSettings.personalStartTime);
  const [personalEndTime, setPersonalEndTime] = useState(currentSettings.personalEndTime);
  const [personalDays, setPersonalDays] = useState<number[]>(currentSettings.personalDays);
  const [dailyStartTime, setDailyStartTime] = useState(currentSettings.dailyStartTime);
  const [dailyEndTime, setDailyEndTime] = useState(currentSettings.dailyEndTime);
  
  const defaultWeights = { urgency: 0.5, importance: 0.3, enjoyment: 0.2 };
  const [priorityWeights, setPriorityWeights] = useState(currentSettings.priorityWeights || defaultWeights);
  
  const defaultActivityTypes: ActivityTypeDefault[] = [
    { type: "project", urgency: 4, importance: 7, enjoyment: 5 },
    { type: "values-driven", urgency: 4, importance: 8, enjoyment: 7 },
    { type: "hobby", urgency: 3, importance: 4, enjoyment: 9 },
    { type: "assignment", urgency: 5, importance: 7, enjoyment: 4 },
  ];
  const [activityTypeDefaults, setActivityTypeDefaults] = useState<ActivityTypeDefault[]>(
    currentSettings.activityTypeDefaults || defaultActivityTypes
  );

  const toggleWorkDay = (day: number) => {
    setWorkDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const togglePersonalDay = (day: number) => {
    setPersonalDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const updateActivityDefault = (type: ActivityTypeDefault["type"], field: "urgency" | "importance" | "enjoyment", value: number) => {
    setActivityTypeDefaults(prev => prev.map(at => 
      at.type === type ? { ...at, [field]: value } : at
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      workPersonalMode: mode,
      workStartTime,
      workEndTime,
      workDays,
      personalStartTime,
      personalEndTime,
      personalDays,
      dailyStartTime,
      dailyEndTime,
      priorityWeights,
      activityTypeDefaults,
    });
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Schedule Preferences
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Daily Schedule Hours</Label>
              <p className="text-sm text-muted-foreground">
                Set the default time window for scheduling tasks each day
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="daily-start-time">Daily Start Time</Label>
                  <Input
                    id="daily-start-time"
                    type="time"
                    value={dailyStartTime}
                    onChange={(e) => setDailyStartTime(e.target.value)}
                    data-testid="input-daily-start-time"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="daily-end-time">Daily End Time</Label>
                  <Input
                    id="daily-end-time"
                    type="time"
                    value={dailyEndTime}
                    onChange={(e) => setDailyEndTime(e.target.value)}
                    data-testid="input-daily-end-time"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label>Work & Personal Task Scheduling</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as "mix" | "separate")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mix" id="mix" data-testid="radio-mode-mix" />
                  <Label htmlFor="mix" className="font-normal cursor-pointer">
                    Mix work and personal tasks - Schedule all tasks throughout the day regardless of category
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="separate" id="separate" data-testid="radio-mode-separate" />
                  <Label htmlFor="separate" className="font-normal cursor-pointer">
                    Separate work and personal tasks - Schedule them in different time windows
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {mode === "separate" && (
              <div className="space-y-6 pt-4 border-t">
                <div className="space-y-4">
                  <h4 className="font-medium">Work Task Windows</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="work-start-time">Start Time</Label>
                      <Input
                        id="work-start-time"
                        type="time"
                        value={workStartTime}
                        onChange={(e) => setWorkStartTime(e.target.value)}
                        data-testid="input-work-start-time"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="work-end-time">End Time</Label>
                      <Input
                        id="work-end-time"
                        type="time"
                        value={workEndTime}
                        onChange={(e) => setWorkEndTime(e.target.value)}
                        data-testid="input-work-end-time"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Work Days</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {dayNames.map((day, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Checkbox
                            id={`work-day-${index}`}
                            checked={workDays.includes(index)}
                            onCheckedChange={() => toggleWorkDay(index)}
                            data-testid={`checkbox-work-day-${index}`}
                          />
                          <Label htmlFor={`work-day-${index}`} className="font-normal cursor-pointer">
                            {day}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Personal Task Windows</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="personal-start-time">Start Time</Label>
                      <Input
                        id="personal-start-time"
                        type="time"
                        value={personalStartTime}
                        onChange={(e) => setPersonalStartTime(e.target.value)}
                        data-testid="input-personal-start-time"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="personal-end-time">End Time</Label>
                      <Input
                        id="personal-end-time"
                        type="time"
                        value={personalEndTime}
                        onChange={(e) => setPersonalEndTime(e.target.value)}
                        data-testid="input-personal-end-time"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Personal Days</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {dayNames.map((day, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Checkbox
                            id={`personal-day-${index}`}
                            checked={personalDays.includes(index)}
                            onCheckedChange={() => togglePersonalDay(index)}
                            data-testid={`checkbox-personal-day-${index}`}
                          />
                          <Label htmlFor={`personal-day-${index}`} className="font-normal cursor-pointer">
                            {day}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t">
          <h3 className="text-lg font-semibold">Priority Weights</h3>
          <p className="text-sm text-muted-foreground">
            Configure how urgency, importance, and enjoyment are weighted in the priority score calculation
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight-urgency">Urgency Weight</Label>
              <Input
                id="weight-urgency"
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={priorityWeights.urgency}
                onChange={(e) => setPriorityWeights({ ...priorityWeights, urgency: parseFloat(e.target.value) || 0 })}
                data-testid="input-weight-urgency"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight-importance">Importance Weight</Label>
              <Input
                id="weight-importance"
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={priorityWeights.importance}
                onChange={(e) => setPriorityWeights({ ...priorityWeights, importance: parseFloat(e.target.value) || 0 })}
                data-testid="input-weight-importance"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight-enjoyment">Enjoyment Weight</Label>
              <Input
                id="weight-enjoyment"
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={priorityWeights.enjoyment}
                onChange={(e) => setPriorityWeights({ ...priorityWeights, enjoyment: parseFloat(e.target.value) || 0 })}
                data-testid="input-weight-enjoyment"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Default: Urgency 0.5, Importance 0.3, Enjoyment 0.2 (should sum to 1.0)
          </p>
        </div>

        <div className="space-y-4 pt-6 border-t">
          <h3 className="text-lg font-semibold">Activity Type Default Ratings</h3>
          <p className="text-sm text-muted-foreground">
            Set default priority ratings (0-10 scale) for each activity type
          </p>
          {activityTypeDefaults.map((at) => {
            const typeLabels: Record<ActivityTypeDefault["type"], string> = {
              "project": "(Long-term) Project",
              "values-driven": "Values-driven",
              "hobby": "Hobby",
              "assignment": "Assignment (base values)"
            };
            return (
              <div key={at.type} className="space-y-2 p-4 border rounded-lg">
                <h4 className="font-medium">{typeLabels[at.type]}</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${at.type}-urgency`}>Urgency</Label>
                    <Input
                      id={`${at.type}-urgency`}
                      type="number"
                      min="0"
                      max="10"
                      value={at.urgency}
                      onChange={(e) => updateActivityDefault(at.type, "urgency", parseInt(e.target.value) || 0)}
                      data-testid={`input-${at.type}-urgency`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${at.type}-importance`}>Importance</Label>
                    <Input
                      id={`${at.type}-importance`}
                      type="number"
                      min="0"
                      max="10"
                      value={at.importance}
                      onChange={(e) => updateActivityDefault(at.type, "importance", parseInt(e.target.value) || 0)}
                      data-testid={`input-${at.type}-importance`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${at.type}-enjoyment`}>Enjoyment</Label>
                    <Input
                      id={`${at.type}-enjoyment`}
                      type="number"
                      min="0"
                      max="10"
                      value={at.enjoyment}
                      onChange={(e) => updateActivityDefault(at.type, "enjoyment", parseInt(e.target.value) || 0)}
                      data-testid={`input-${at.type}-enjoyment`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">
            Note: For assignments, urgency is calculated as 5 + Pace, where Pace = total time / work days until deadline
          </p>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-save-settings">
          <SettingsIcon className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </form>
    </Card>
  );
}
