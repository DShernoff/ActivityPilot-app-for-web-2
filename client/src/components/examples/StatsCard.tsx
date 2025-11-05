import { StatsCard } from "../StatsCard";
import { CheckSquare, Clock, Calendar } from "lucide-react";
import { ThemeProvider } from "../ThemeProvider";

export default function StatsCardExample() {
  return (
    <ThemeProvider>
      <div className="p-6 grid grid-cols-3 gap-4">
        <StatsCard title="Total Tasks" value={5} icon={CheckSquare} />
        <StatsCard title="Scheduled Hours" value="6.5h" icon={Clock} />
        <StatsCard title="Completion Rate" value="80%" icon={Calendar} description="This week" />
      </div>
    </ThemeProvider>
  );
}
