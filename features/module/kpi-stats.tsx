import { FileText } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiStats() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Passed users"
        value={"92%"}
        delta={"+120 this week"}
        deltaTone="success"
      />
      <KpiCard
        label="Failed user"
        value={"8%"}
        valueSuffix="Pass"
        delta={"3% Last month"}
        deltaTone="success"
      />
      <KpiCard
        label="Total enrolments"
        value={"14"}
        delta={"2% Requires attention"}
        deltaTone="muted"
      />
      <Card className="flex flex-col gap-5 px-6 py-6">
        <p className="text-sm uppercase text-ink-mute">The module</p>
        <div className="flex flex-col gap-2.5">
          <p className="text-base leading-6 text-ink-strong">
            SEC Disclosure Requirements
          </p>
          <Link
            href="#"
            className="inline-flex items-center gap-1.5 text-sm leading-6 text-brand transition-colors hover:underline"
          >
            <FileText className="size-3.5" strokeWidth={1.75} />
            View PDF
          </Link>
        </div>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  valueSuffix,
  delta,
  deltaTone,
}: {
  label: string;
  value: string;
  valueSuffix?: string;
  delta: string;
  deltaTone: "success" | "muted";
}) {
  return (
    <Card className="flex flex-col gap-5 px-6 py-6">
      <p className="text-sm uppercase text-ink-mute">{label}</p>
      <div className="flex flex-col gap-2.5">
        <p className="text-2xl font-semibold leading-6 text-ink-strong">
          {value}
          {valueSuffix && (
            <span className="ml-1 text-base font-normal leading-6">
              {valueSuffix}
            </span>
          )}
        </p>
        <p
          className={cn(
            "text-sm leading-6",
            deltaTone === "success" ? "text-status-success" : "text-ink-mute",
          )}
        >
          {delta}
        </p>
      </div>
    </Card>
  );
}
