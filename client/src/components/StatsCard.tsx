import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
}

export function StatsCard({ title, value, icon: Icon, description }: StatsCardProps) {
  return (
    <Card className="p-6" data-testid={`card-stats-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground truncate">{title}</p>
          <p className="text-2xl font-semibold mt-1" data-testid={`text-stat-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className="flex-shrink-0">
          <div className="p-3 bg-primary/10 rounded-md">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>
    </Card>
  );
}
