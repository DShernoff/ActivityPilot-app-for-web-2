import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Plus } from "lucide-react";

interface EventFormProps {
  onSubmit: (event: EventFormData) => void;
  isLoading?: boolean;
  initialData?: {
    name: string;
    start: string;
    end: string;
    category: string;
    description?: string;
    location?: string;
    all_day?: boolean;
    repeat?: "none" | "daily" | "weekly" | "monthly" | "annually";
  };
}

export interface EventFormData {
  name: string;
  start: string;
  end: string;
  category: string;
  description?: string;
  location?: string;
  all_day?: boolean;
  repeat?: "none" | "daily" | "weekly" | "monthly" | "annually";
}

export function EventForm({ onSubmit, isLoading, initialData }: EventFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  
  const initStartDate = initialData?.start ? new Date(initialData.start) : new Date();
  const initEndDate = initialData?.end ? new Date(initialData.end) : new Date();
  
  const [startDate, setStartDate] = useState(initStartDate.toISOString().slice(0, 10));
  const [startHour, setStartHour] = useState(initStartDate.getHours() % 12 || 12);
  const [startMinute, setStartMinute] = useState(initStartDate.getMinutes());
  const [startAmPm, setStartAmPm] = useState<"AM" | "PM">(initStartDate.getHours() >= 12 ? "PM" : "AM");
  
  const [endDate, setEndDate] = useState(initEndDate.toISOString().slice(0, 10));
  const [endHour, setEndHour] = useState(initEndDate.getHours() % 12 || 12);
  const [endMinute, setEndMinute] = useState(initEndDate.getMinutes());
  const [endAmPm, setEndAmPm] = useState<"AM" | "PM">(initEndDate.getHours() >= 12 ? "PM" : "AM");
  
  const [category, setCategory] = useState(initialData?.category || "general");
  const [description, setDescription] = useState(initialData?.description || "");
  const [location, setLocation] = useState(initialData?.location || "");
  const [allDay, setAllDay] = useState(initialData?.all_day || false);
  const [repeat, setRepeat] = useState<"none" | "daily" | "weekly" | "monthly" | "annually">(initialData?.repeat || "none");
  const [showAdvanced, setShowAdvanced] = useState(!!initialData?.description || !!initialData?.location || (initialData?.repeat && initialData?.repeat !== "none"));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    let startDateTime: Date;
    let endDateTime: Date;
    
    if (allDay) {
      startDateTime = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
      endDateTime = new Date(startYear, startMonth - 1, startDay, 23, 59, 59, 999);
    } else {
      const startHour24 = startAmPm === "PM" ? (startHour % 12) + 12 : startHour % 12;
      startDateTime = new Date(startYear, startMonth - 1, startDay, startHour24, startMinute, 0, 0);
      
      const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
      const endHour24 = endAmPm === "PM" ? (endHour % 12) + 12 : endHour % 12;
      endDateTime = new Date(endYear, endMonth - 1, endDay, endHour24, endMinute, 0, 0);
    }
    
    onSubmit({
      name,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      category,
      description: description || undefined,
      location: location || undefined,
      all_day: allDay,
      repeat,
    });
    
    const now = new Date();
    setName("");
    setStartDate(now.toISOString().slice(0, 10));
    setStartHour(9);
    setStartMinute(0);
    setStartAmPm("AM");
    setEndDate(now.toISOString().slice(0, 10));
    setEndHour(10);
    setEndMinute(0);
    setEndAmPm("AM");
    setCategory("general");
    setDescription("");
    setLocation("");
    setAllDay(false);
    setRepeat("none");
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-name">Event Name</Label>
            <Input
              id="event-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter event name"
              required
              data-testid="input-event-name"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{allDay ? "Date" : "Start Date & Time"}</Label>
              <div className={allDay ? "grid grid-cols-1 gap-2" : "grid grid-cols-5 gap-2"}>
                <div className={allDay ? "" : "col-span-2 space-y-1"}>
                  {!allDay && <Label className="text-xs text-muted-foreground">Date</Label>}
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    data-testid="input-event-start-date"
                  />
                </div>
                {!allDay && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Hour</Label>
                      <Input
                        type="number"
                        min="1"
                        max="12"
                        value={startHour}
                        onChange={(e) => setStartHour(parseInt(e.target.value) || 1)}
                        placeholder="HH"
                        required
                        data-testid="input-event-start-hour"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Min</Label>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        value={startMinute}
                        onChange={(e) => setStartMinute(parseInt(e.target.value) || 0)}
                        placeholder="MM"
                        required
                        data-testid="input-event-start-minute"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Period</Label>
                      <Select value={startAmPm} onValueChange={(v) => setStartAmPm(v as "AM" | "PM")}>
                        <SelectTrigger data-testid="select-event-start-ampm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AM">AM</SelectItem>
                          <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {!allDay && (
              <div className="space-y-2">
                <Label>End Date & Time</Label>
                <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      data-testid="input-event-end-date"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Hour</Label>
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      value={endHour}
                      onChange={(e) => setEndHour(parseInt(e.target.value) || 1)}
                      placeholder="HH"
                      required
                      data-testid="input-event-end-hour"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Min</Label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={endMinute}
                      onChange={(e) => setEndMinute(parseInt(e.target.value) || 0)}
                      placeholder="MM"
                      required
                      data-testid="input-event-end-minute"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Period</Label>
                    <Select value={endAmPm} onValueChange={(v) => setEndAmPm(v as "AM" | "PM")}>
                      <SelectTrigger data-testid="select-event-end-ampm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="event-category" data-testid="select-event-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="appointment">Appointment</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-location">Location</Label>
            <Input
              id="event-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter event location (optional)"
              data-testid="input-event-location"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="all-day"
              checked={allDay}
              onCheckedChange={(checked) => setAllDay(checked as boolean)}
              data-testid="checkbox-event-all-day"
            />
            <Label
              htmlFor="all-day"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              All Day Event
            </Label>
          </div>

          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between"
                data-testid="button-toggle-event-advanced"
              >
                Advanced Options
                <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional event description"
                  data-testid="input-event-description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-repeat">Repeat</Label>
                <Select value={repeat} onValueChange={(v) => setRepeat(v as any)}>
                  <SelectTrigger id="event-repeat" data-testid="select-event-repeat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-add-event">
          <Plus className="h-4 w-4 mr-2" />
          {initialData ? "Save Event" : "Add Event"}
        </Button>
      </form>
    </Card>
  );
}
