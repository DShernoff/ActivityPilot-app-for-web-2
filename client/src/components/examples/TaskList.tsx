import { TaskList } from "../TaskList";
import { ThemeProvider } from "../ThemeProvider";

export default function TaskListExample() {
  const tasks = [
    {
      id: 1,
      name: "Write project documentation",
      duration_minutes: 90,
      category: "work",
      urgency: 0.8,
      importance: 0.9,
      enjoyment: 0.4,
    },
    {
      id: 2,
      name: "Team meeting",
      duration_minutes: 60,
      category: "work",
      urgency: 0.6,
      importance: 0.7,
      enjoyment: 0.5,
    },
    {
      id: 3,
      name: "Grocery shopping",
      duration_minutes: 45,
      category: "personal",
      urgency: 0.4,
      importance: 0.6,
      enjoyment: 0.3,
    },
  ];

  const scores = { 1: 0.87, 2: 0.65, 3: 0.45 };

  return (
    <ThemeProvider>
      <div className="p-6 max-w-3xl">
        <TaskList tasks={tasks} scores={scores} onDelete={(id) => console.log("Delete task:", id)} />
      </div>
    </ThemeProvider>
  );
}
