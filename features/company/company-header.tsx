import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CompanyDashboardHeader() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-base text-muted-foreground">
          Financial services joined March 2024
        </p>
      </div>
      <div className="flex items-center gap-2.5">
        <Button variant="outline" className="gap-2">
          Add team
          <Plus className="size-3.5" strokeWidth={2} />
        </Button>
        <Button>Create Module</Button>
      </div>
    </div>
  );
}
