import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";

interface ScheduleItem {
  task_id?: number;
  event_id?: number;
  routine_id?: number;
  start: string;
  end: string;
  task_name?: string;
  event_name?: string;
  category?: string;
}

interface Schedule {
  scheduled: ScheduleItem[];
  created_at: string;
}

interface SuggestedTask {
  task_name: string;
  task_id: number | null;
}

export default function WatchView() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showRationale, setShowRationale] = useState(false);
  const [rationale, setRationale] = useState("");
  const [rationaleActivityName, setRationaleActivityName] = useState("");
  const [isLoadingRationale, setIsLoadingRationale] = useState(false);

  const { data: schedule } = useQuery<Schedule>({
    queryKey: ["/api/schedule"],
  });

  const { data: suggestedTask } = useQuery<SuggestedTask>({
    queryKey: ["/api/suggest-now"],
    refetchInterval: 60000,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const getCurrentActivity = (): string => {
    const now = currentTime.getTime();

    if (schedule?.scheduled && schedule.scheduled.length > 0) {
      for (const item of schedule.scheduled) {
        const start = new Date(item.start).getTime();
        const end = new Date(item.end).getTime();

        if (now >= start && now < end) {
          return item.task_name || item.event_name || "Activity";
        }
      }
    }

    return suggestedTask?.task_name || "No tasks available";
  };

  const formatTime = (date: Date): string => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  };

  const currentActivity = getCurrentActivity();

  const handleWhyNow = async () => {
    const now = currentTime.getTime();
    
    let currentScheduledItem: ScheduleItem | undefined;
    if (schedule?.scheduled && schedule.scheduled.length > 0) {
      currentScheduledItem = schedule.scheduled.find(item => {
        const start = new Date(item.start).getTime();
        const end = new Date(item.end).getTime();
        return now >= start && now < end;
      });
    }
    
    if (!suggestedTask && !currentScheduledItem) {
      setRationale("No activity is currently scheduled or suggested.");
      setShowRationale(true);
      return;
    }

    setShowRationale(true);
    setIsLoadingRationale(true);

    try {
      let activityDetails;
      
      if (currentScheduledItem) {
        const activityName = currentScheduledItem.task_name || currentScheduledItem.event_name || "Activity";
        setRationaleActivityName(activityName);
        activityDetails = {
          activityName,
          startTime: currentScheduledItem.start,
          endTime: currentScheduledItem.end,
          duration: currentScheduledItem.duration_minutes,
          isEvent: currentScheduledItem.is_event || false,
          taskId: currentScheduledItem.task_id,
          eventId: currentScheduledItem.event_id,
          category: currentScheduledItem.category
        };
      } else if (suggestedTask) {
        setRationaleActivityName(suggestedTask.task_name);
        const nowDate = new Date();
        activityDetails = {
          activityName: suggestedTask.task_name,
          startTime: nowDate.toISOString(),
          endTime: new Date(nowDate.getTime() + 60 * 60 * 1000).toISOString(),
          duration: 60,
          isEvent: false,
          taskId: suggestedTask.task_id,
          eventId: null,
          category: undefined
        };
      }

      const response = await apiRequest("POST", "/api/why-now", activityDetails);
      const data = await response.json();
      setRationale(data.rationale || "Unable to generate rationale at this time.");
    } catch (error) {
      setRationale("Sorry, there was an error generating the rationale. Please try again.");
    } finally {
      setIsLoadingRationale(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-8">
      <div className="relative">
        <div className="w-80 h-80 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl border-8 border-slate-700 flex flex-col items-center justify-center p-8 relative">
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-purple-400 rounded-full"></div>
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-purple-400 rounded-full"></div>
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-purple-400 rounded-full"></div>
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-purple-400 rounded-full"></div>

          <button 
            className="absolute bottom-8 right-8 w-10 h-10 rounded-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 flex items-center justify-center text-purple-300 hover:text-purple-200 transition-all shadow-lg z-10"
            title="Why this activity now?"
            onClick={handleWhyNow}
          >
            <Info className="h-5 w-5" />
          </button>

          <div className="text-center space-y-6">
            <div className="text-6xl font-light text-white tracking-wider">
              {formatTime(currentTime)}
            </div>

            <div className="w-full h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>

            <div className="text-lg text-purple-200 font-medium px-6 text-center min-h-[3rem] flex items-center justify-center">
              {currentActivity}
            </div>
          </div>
        </div>

        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-sm text-slate-400">
          {schedule?.created_at
            ? `Schedule from ${new Date(schedule.created_at).toLocaleDateString()}`
            : suggestedTask?.task_name
            ? "Suggested by priority engine"
            : "No tasks available"}
        </div>
      </div>

      <Dialog open={showRationale} onOpenChange={setShowRationale}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Why this now?
            </DialogTitle>
            <DialogDescription className="text-base font-medium pt-2">
              {rationaleActivityName}
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
    </div>
  );
}
