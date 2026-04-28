import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Delta = {
  value: string;
  tone: "success" | "muted";
};

type StatCardProps = {
  label: string;
  value: string;
  unit?: string;
  delta: Delta;
};

function StatCard({ label, value, unit, delta }: StatCardProps) {
  return (
    <Card className="flex flex-1 flex-col gap-5 px-6 py-6">
      <p className="text-sm uppercase text-ink-mute">{label}</p>
      <div className="flex flex-col gap-2.5">
        <p className="text-2xl font-semibold leading-6 text-ink-strong">
          {value}
          {unit && (
            <span className="ml-1 text-base font-normal leading-6">{unit}</span>
          )}
        </p>
        <p
          className={cn(
            "text-sm leading-6",
            delta.tone === "success" ? "text-status-success" : "text-ink-mute",
          )}
        >
          {delta.value}
        </p>
      </div>
    </Card>
  );
}

export function CompanyStats() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Investors Tested"
        value="92%"
        delta={{ value: "+120 this week", tone: "success" }}
      />
      <StatCard
        label="Verification Pass Rate"
        value="78%"
        unit="Pass"
        delta={{ value: "3% Last month", tone: "success" }}
      />
      <StatCard
        label="Failed Assessments"
        value="14"
        delta={{ value: "2% Requires attention", tone: "muted" }}
      />
      <StatCard
        label="Active Modules"
        value="12"
        unit="Modules"
        delta={{ value: "+2 Created this month", tone: "success" }}
      />
    </div>
  );
}
