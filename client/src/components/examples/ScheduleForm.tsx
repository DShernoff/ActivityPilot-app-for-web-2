import { ScheduleForm } from "../ScheduleForm";
import { ThemeProvider } from "../ThemeProvider";

export default function ScheduleFormExample() {
  return (
    <ThemeProvider>
      <div className="p-6 max-w-2xl">
        <ScheduleForm onGenerate={(config) => console.log("Generate schedule:", config)} />
      </div>
    </ThemeProvider>
  );
}
