import { ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ActivityStatus = "completed" | "published" | "failed";

type Activity = {
  initials: string;
  name: string;
  module: string;
  status: ActivityStatus;
  statusLabel: string;
  time: string;
};

const statusColors: Record<ActivityStatus, string> = {
  completed: "text-status-success",
  published: "text-brand",
  failed: "text-status-danger",
};

const activities: Activity[] = [
  {
    initials: "JL",
    name: "James Liu",
    module: "Security 101",
    status: "completed",
    statusLabel: "Completed",
    time: "2 mins ago",
  },
  {
    initials: "ST",
    name: "Sarah Torgov",
    module: "Insider Trading",
    status: "published",
    statusLabel: "Published",
    time: "18 min ago",
  },
  {
    initials: "DK",
    name: "David Kim",
    module: "AML quiz - 2nd attempt",
    status: "failed",
    statusLabel: "Failed",
    time: "2 mins ago",
  },
  {
    initials: "ST",
    name: "Sarah Torgov",
    module: "Insider Trading",
    status: "published",
    statusLabel: "Published",
    time: "18 min ago",
  },
];

export function RecentActivities() {
  return (
    <Card className="flex flex-col gap-4 px-6 py-4 rounded-[10px]">
      <div className="flex items-center font-sans  text-[#545454] justify-between">
        <h2 className="text-base font-semibold leading-6 ">
          Recent activities
        </h2>
        <button
          type="button"
          className="flex items-center gap-2.5 rounded-[18px] py-1 text-sm leading-6 text-ink-strong transition-colors hover:text-foreground"
        >
          View all
          <ArrowRight className="size-3.5" strokeWidth={2} />
        </button>
      </div>

      <ul className="flex flex-col">
        {activities.map((activity, idx) => (
          <li
            key={`${activity.name}-${idx}`}
            className="flex items-center justify-between py-2.5"
          >
            <div className="flex items-center gap-2.5">
              {/* <div className="flex size-12 items-center justify-center rounded-full bg-accent-purple-soft">
                <span className="text-base font-semibold text-accent-purple">
                  {activity.initials}
                </span>
              </div> */}
              <Avatar className={"size-12"}>
                <AvatarFallback>{activity.initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-sm leading-6">
                <span className="font-semibold text-ink-strong">
                  {activity.name}
                </span>
                <span className="text-ink-mute">{activity.module}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 text-xs leading-none">
              <span className={cn(statusColors[activity.status])}>
                {activity.statusLabel}
              </span>
              <span className="text-ink-mute">{activity.time}</span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
