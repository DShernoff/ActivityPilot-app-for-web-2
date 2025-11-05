import { TaskForm } from "../TaskForm";
import { ThemeProvider } from "../ThemeProvider";

export default function TaskFormExample() {
  return (
    <ThemeProvider>
      <div className="p-6 max-w-2xl">
        <TaskForm onSubmit={(task) => console.log("Task submitted:", task)} />
      </div>
    </ThemeProvider>
  );
}
