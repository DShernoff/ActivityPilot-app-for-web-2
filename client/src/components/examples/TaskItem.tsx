import { TaskItem } from "../TaskItem";
import { ThemeProvider } from "../ThemeProvider";

export default function TaskItemExample() {
  const task = {
    id: 1,
    name: "Write project documentation",
    duration_minutes: 90,
    category: "work",
    urgency: 0.8,
    importance: 0.9,
    enjoyment: 0.4,
    latest_finish: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
  };

  return (
    <ThemeProvider>
      <div className="p-6 max-w-2xl">
        <TaskItem task={task} score={0.87} onDelete={(id) => console.log("Delete task:", id)} />
      </div>
    </ThemeProvider>
  );
}
