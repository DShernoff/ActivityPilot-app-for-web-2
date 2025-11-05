import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Calendar, Clock, Repeat, Edit } from "lucide-react";
import { format } from "date-fns";
import type { Event } from "@shared/schema";

interface EventListProps {
  events: Event[];
  onDelete: (id: number) => void;
  onEdit?: (id: number) => void;
}

const categoryColors: Record<string, string> = {
  meeting: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  appointment: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
  personal: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
  general: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20",
};

const repeatLabels: Record<string, string> = {
  none: "Once",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  annually: "Annually",
};

export function EventList({ events, onDelete, onEdit }: EventListProps) {
  if (events.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No events yet</p>
        <p className="text-sm text-muted-foreground mt-1">Add your first event to get started</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);
        const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
        
        return (
          <Card 
            key={event.id} 
            className="p-4 hover-elevate" 
            data-testid={`card-event-${event.id}`}
            onDoubleClick={() => onEdit?.(event.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="font-semibold truncate" data-testid={`text-event-name-${event.id}`}>
                    {event.name}
                  </h3>
                  <Badge 
                    variant="secondary" 
                    className={categoryColors[event.category] || categoryColors.general}
                    data-testid={`badge-event-category-${event.id}`}
                  >
                    {event.category}
                  </Badge>
                  {event.repeat && event.repeat !== "none" && (
                    <Badge 
                      variant="outline"
                      className="gap-1"
                      data-testid={`badge-event-repeat-${event.id}`}
                    >
                      <Repeat className="h-3 w-3" />
                      {repeatLabels[event.repeat]}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span data-testid={`text-event-date-${event.id}`}>
                      {format(startDate, "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span data-testid={`text-event-time-${event.id}`}>
                      {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
                    </span>
                  </div>
                  <span className="text-xs" data-testid={`text-event-duration-${event.id}`}>
                    {durationMinutes} min
                  </span>
                </div>
                
                {event.description && (
                  <p className="text-sm text-muted-foreground mt-2" data-testid={`text-event-description-${event.id}`}>
                    {event.description}
                  </p>
                )}
              </div>
              
              <div className="flex gap-1">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(event.id)}
                    data-testid={`button-edit-event-${event.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(event.id)}
                  data-testid={`button-delete-event-${event.id}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
