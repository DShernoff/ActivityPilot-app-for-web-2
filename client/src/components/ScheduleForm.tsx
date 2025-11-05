import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarClock } from "lucide-react";
import type { Settings } from "@shared/schema";

interface ScheduleFormProps {
  onGenerate: (config: ScheduleConfig) => void;
  isLoading?: boolean;
  settings?: Settings;
}

export interface ScheduleConfig {
  day_start: string;
  day_end: string;
  max_chunk_minutes?: number;
}

export function ScheduleForm({ onGenerate, isLoading, settings }: ScheduleFormProps) {
  const dailyStart = settings?.dailyStartTime || "08:00";
  const dailyEnd = settings?.dailyEndTime || "21:00";
  
  const [startHour, startMin] = dailyStart.split(':').map(Number);
  const [endHour, endMin] = dailyEnd.split(':').map(Number);
  
  const formatDatetimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  const getDefaultDates = () => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setHours(startHour, startMin, 0, 0);
    const endDate = new Date(today);
    endDate.setHours(endHour, endMin, 0, 0);
    return {
      start: formatDatetimeLocal(startDate),
      end: formatDatetimeLocal(endDate)
    };
  };

  const [dayStart, setDayStart] = useState(getDefaultDates().start);
  const [dayEnd, setDayEnd] = useState(getDefaultDates().end);
  const [maxChunk, setMaxChunk] = useState<number | undefined>(90);

  const handleResetToToday = () => {
    const defaults = getDefaultDates();
    setDayStart(defaults.start);
    setDayEnd(defaults.end);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const startLocal = new Date(dayStart);
    const endLocal = new Date(dayEnd);
    
    onGenerate({
      day_start: startLocal.toISOString(),
      day_end: endLocal.toISOString(),
      max_chunk_minutes: maxChunk || undefined,
    });
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Generate Schedule</h2>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Schedule Date Range</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetToToday}
            >
              Reset to Today
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="day-start">Day Start</Label>
              <Input
                id="day-start"
                type="datetime-local"
                value={dayStart}
                onChange={(e) => setDayStart(e.target.value)}
                required
                data-testid="input-day-start"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="day-end">Day End</Label>
              <Input
                id="day-end"
                type="datetime-local"
                value={dayEnd}
                onChange={(e) => setDayEnd(e.target.value)}
                required
                data-testid="input-day-end"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-chunk">Max Chunk Duration (minutes)</Label>
            <Input
              id="max-chunk"
              type="number"
              value={maxChunk || ""}
              onChange={(e) => setMaxChunk(parseInt(e.target.value) || undefined)}
              placeholder="Optional - split long tasks"
              min={1}
              data-testid="input-max-chunk"
            />
            <p className="text-xs text-muted-foreground">
              Optional: Maximum time block duration. Larger tasks will be split into chunks.
            </p>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-generate-schedule">
          <CalendarClock className="h-4 w-4 mr-2" />
          Generate Schedule
        </Button>
      </form>
    </Card>
  );
}
