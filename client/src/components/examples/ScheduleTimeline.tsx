import { ScheduleTimeline } from "../ScheduleTimeline";
import { ThemeProvider } from "../ThemeProvider";

export default function ScheduleTimelineExample() {
  const now = new Date();
  const events = [
    {
      task_id: 1,
      task_name: "Write project documentation",
      start: new Date(now.setHours(9, 0)).toISOString(),
      end: new Date(now.setHours(10, 30)).toISOString(),
      duration_minutes: 90,
    },
    {
      task_id: 2,
      task_name: "Team meeting",
      start: new Date(now.setHours(10, 30)).toISOString(),
      end: new Date(now.setHours(11, 30)).toISOString(),
      duration_minutes: 60,
    },
    {
      task_id: 3,
      task_name: "Grocery shopping",
      start: new Date(now.setHours(11, 30)).toISOString(),
      end: new Date(now.setHours(12, 15)).toISOString(),
      duration_minutes: 45,
    },
  ];

  const category = {
    1: "work",
    2: "work",
    3: "personal",
  };

  return (
    <ThemeProvider>
      <div className="p-6 max-w-3xl">
        <ScheduleTimeline events={events} category={category} />
      </div>
    </ThemeProvider>
  );
}
