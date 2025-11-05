import { TaskItem } from "./TaskItem";

interface Task {
  id: number;
  name: string;
  duration_minutes: number;
  category: string;
  urgency: number;
  importance: number;
  enjoyment: number;
  earliest_start?: string;
  latest_finish?: string;
}

interface TaskListProps {
  tasks: Task[];
  scores?: Record<number, number>;
  onDelete: (id: number) => void;
  onEdit?: (id: number) => void;
}

export function TaskList({ tasks, scores, onDelete, onEdit }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No tasks yet. Add your first task to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          score={scores?.[task.id]}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
