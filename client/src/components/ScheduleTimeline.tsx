import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar, Clock, CalendarCheck, Sparkles, CheckCircle2, MapPin } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ScheduledEvent } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface ScheduleTimelineProps {
  events: ScheduledEvent[];
  category?: Record<number, string>;
}

const categoryColors: Record<string, string> = {
  work: "bg-category-work",
  personal: "bg-category-personal",
  general: "bg-category-general",
  do_today: "bg-category-do_today",
  meeting: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  appointment: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
};

export function ScheduleTimeline({ events, category = {} }: ScheduleTimelineProps) {
  const { toast } = useToast();
  const [showRationale, setShowRationale] = useState(false);
  const [rationale, setRationale] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");
  const [isLoadingRationale, setIsLoadingRationale] = useState(false);

  const completeMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to complete task");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/completed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      toast({
        title: "Task completed!",
        description: "Great job! Your progress has been recorded.",
      });
    },
  });

  const handleWhyNow = async (event: ScheduledEvent) => {
    setSelectedActivity(event.task_name);
    setShowRationale(true);
    setIsLoadingRationale(true);
    
    try {
      const response = await apiRequest("POST", "/api/why-now", {
        activityName: event.task_name,
        startTime: event.start,
        endTime: event.end,
        duration: event.duration_minutes,
        isEvent: event.is_event || false,
        taskId: event.task_id,
        eventId: event.event_id,
        category: event.task_id || event.event_id ? category[(event.task_id || event.event_id)!] : undefined
      });
      
      const data = await response.json();
      setRationale(data.rationale || "Unable to generate rationale at this time.");
    } catch (error) {
      setRationale("Sorry, there was an error generating the rationale. Please try again.");
    } finally {
      setIsLoadingRationale(false);
    }
  };

  if (events.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No schedule generated yet. Add tasks and generate a schedule to see your optimized timeline.
          </p>
        </div>
      </Card>
    );
  }

  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDateNumber = (dateStr: string) => {
    return new Date(dateStr).getDate();
  };

  const getMonthShort = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short' });
  };

  const groupEventsByDate = () => {
    const groups: Record<string, typeof sortedEvents> = {};
    
    sortedEvents.forEach(event => {
      const date = formatDate(event.start);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
    });
    
    // Sort events within each day: all-day events first, then by time
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => {
        if (a.all_day && !b.all_day) return -1;
        if (!a.all_day && b.all_day) return 1;
        return new Date(a.start).getTime() - new Date(b.start).getTime();
      });
    });
    
    return groups;
  };

  const groupedEvents = groupEventsByDate();

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Optimized Schedule</h2>
      </div>

      {Object.entries(groupedEvents).map(([date, dayEvents]) => (
        <div key={date} className="mb-8 last:mb-0">
          <div className="mb-4 pb-2 border-b">
            <p className="text-sm font-semibold text-muted-foreground" data-testid={`text-date-${date}`}>
              {date}
            </p>
          </div>
          
          <div className="space-y-3">
            {dayEvents.map((event, index) => {
              const isEvent = event.is_event || false;
              const itemId = isEvent ? event.event_id : event.task_id;
              const cat = itemId ? category[itemId] || 'general' : 'general';
              const bgColor = categoryColors[cat] || 'bg-primary';
              
              if (event.all_day) {
                return (
                  <div 
                    key={index} 
                    className="relative pl-8 mb-4"
                    data-testid={`schedule-event-${itemId}`}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-border opacity-30" />
                    
                    <Card className="p-4 bg-primary/5 border-2 border-primary/20 hover:border-primary/40 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-20 h-20 rounded-lg bg-primary/10 border-2 border-primary/30 flex flex-col items-center justify-center">
                            <div className="text-xs font-semibold text-primary/70 uppercase tracking-wide">
                              {getMonthShort(event.start)}
                            </div>
                            <div className="text-3xl font-bold text-primary leading-none mt-1">
                              {getDateNumber(event.start)}
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg truncate" data-testid={`text-event-name-${itemId}`}>
                              {event.task_name}
                            </h3>
                            <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
                              All Day
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={`text-xs ${bgColor}`}>
                              {cat}
                            </Badge>
                            {event.location && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span className="text-xs">{event.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleWhyNow(event)}
                          data-testid={`button-why-now-${itemId}`}
                          className="flex-shrink-0"
                        >
                          <Sparkles className="h-4 w-4" />
                          Why this now?
                        </Button>
                      </div>
                    </Card>
                  </div>
                );
              }
              
              return (
                <div 
                  key={index} 
                  className="relative pl-8"
                  data-testid={`schedule-event-${itemId}`}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-border" />
                  <div className={`absolute left-0 top-3 w-3 h-3 rounded-full ${bgColor}`} />
                  
                  <Card className="p-4 hover-elevate">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {isEvent && (
                            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                          )}
                          <h3 className="font-medium truncate" data-testid={`text-event-name-${itemId}`}>
                            {event.task_name}
                          </h3>
                          {isEvent && (
                            <Badge variant="outline" className="text-xs">
                              Event
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3" />
                            {formatTime(event.start)} - {formatTime(event.end)}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {event.duration_minutes}m
                          </Badge>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${bgColor}`}
                          >
                            {cat}
                          </Badge>
                          {event.location && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="text-xs">{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!isEvent && event.task_id && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => completeMutation.mutate(event.task_id!)}
                            disabled={completeMutation.isPending}
                            data-testid={`button-complete-${itemId}`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Complete
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleWhyNow(event)}
                          data-testid={`button-why-now-${itemId}`}
                        >
                          <Sparkles className="h-4 w-4" />
                          Why this now?
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <Dialog open={showRationale} onOpenChange={setShowRationale}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Why this now?
            </DialogTitle>
            <DialogDescription className="text-base font-medium pt-2">
              {selectedActivity}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isLoadingRationale ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-pulse text-muted-foreground">
                  Thinking...
                </div>
              </div>
            ) : (
              <p className="text-base leading-relaxed">{rationale}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
