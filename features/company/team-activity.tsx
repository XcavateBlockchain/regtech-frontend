import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

type TeamStat = { value: string; label: string };
type TeamLog = { label: string; time: string };

const teamStats: TeamStat[] = [
  { value: "8", label: "Active employees" },
  { value: "2", label: "Modules this week" },
];

const teamLog: TeamLog[] = [
  { label: "2 modules created", time: "This week" },
  { label: "1 quiz updated", time: "Yesterday" },
  { label: "3 investors invited", time: "Apr 21" },
];

export function TeamActivity() {
  return (
    <Card className="flex flex-col gap-[54px] px-6 py-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center font-sans text-[#545454] justify-between">
          <h2 className="text-base font-semibold leading-6 font-sans text-[#545454]">
            Team activity
          </h2>
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-[18px] py-1 text-sm leading-6 text-ink-strong transition-colors hover:text-foreground"
          >
            Manage
            <ArrowRight className="size-3.5" strokeWidth={2} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {teamStats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center justify-center gap-2.5 rounded-[10px] bg-[#f8f8f8] px-7 py-6"
            >
              <span className="text-2xl font-semibold leading-6 text-ink-strong">
                {stat.value}
              </span>
              <span className="text-sm leading-6 text-ink-mute">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <ul className="flex flex-col gap-4 text-sm leading-6 text-[#959583]">
        {teamLog.map((entry) => (
          <li key={entry.label} className="flex items-center justify-between">
            <span>{entry.label}</span>
            <span>{entry.time}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
