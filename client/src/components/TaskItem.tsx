import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Clock, Calendar, Edit } from "lucide-react";

interface TaskItemProps {
  task: {
    id: number;
    name: string;
    duration_minutes: number;
    category: string;
    urgency: number;
    importance: number;
    enjoyment: number;
    earliest_start?: string;
    latest_finish?: string;
  };
  score?: number;
  onDelete: (id: number) => void;
  onEdit?: (id: number) => void;
}

const categoryColors: Record<string, string> = {
  work: "bg-category-work",
  personal: "bg-category-personal",
  general: "bg-category-general",
  do_today: "bg-category-do_today",
};

const getPriorityColor = (urgency: number, importance: number) => {
  const priority = urgency * 0.6 + importance * 0.4;
  if (priority >= 0.7) return "bg-priority-high";
  if (priority >= 0.4) return "bg-priority-medium";
  return "bg-priority-low";
};

export function TaskItem({ task, score, onDelete, onEdit }: TaskItemProps) {
  const priorityColor = getPriorityColor(task.urgency, task.importance);

  return (
    <Card 
      className="relative overflow-hidden hover-elevate cursor-pointer" 
      data-testid={`card-task-${task.id}`}
      onDoubleClick={() => onEdit?.(task.id)}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${priorityColor}`} />
      <div className="p-4 pl-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate" data-testid={`text-task-name-${task.id}`}>{task.name}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {task.duration_minutes}m
              </Badge>
              <Badge 
                variant="secondary" 
                className={`text-xs ${categoryColors[task.category] || 'bg-secondary'} text-white`}
              >
                {task.category}
              </Badge>
              {score !== undefined && (
                <Badge variant="outline" className="text-xs font-mono">
                  Score: {score.toFixed(2)}
                </Badge>
              )}
            </div>
            {(task.earliest_start || task.latest_finish) && (
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {task.earliest_start && (
                  <span>Start: {new Date(task.earliest_start).toLocaleString()}</span>
                )}
                {task.latest_finish && (
                  <span>Finish by: {new Date(task.latest_finish).toLocaleString()}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(task.id)}
                data-testid={`button-edit-task-${task.id}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(task.id)}
              data-testid={`button-delete-task-${task.id}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
