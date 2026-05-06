import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModuleCardData } from "../modules/module-item";

export function ModuleHeader({
  module,
}: {
  module: {
    id: string;
    title: string;
    status: string;
    description: string;
  };
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-primary/10 text-primary">
            AML
          </Badge>
          <Badge variant="default" className="bg-primary/10 text-primary">
            {module.status}
          </Badge>
        </div>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-semibold leading-none text-foreground">
            {module.title}
          </h1>
          <p className="text-base truncate w-[500px] leading-none text-muted-foreground">
            {module?.description || "No description"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <Select>
          <SelectTrigger className="h-11 w-[160px]">
            <SelectValue placeholder="Version history" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Version history</SelectItem>
            <SelectItem value="v3">Version 3 (current)</SelectItem>
            <SelectItem value="v2">Version 2</SelectItem>
            <SelectItem value="v1">Version 1</SelectItem>
          </SelectContent>
        </Select>

        {module.status === "DRAFT" && (
          <Link href={`/company/module/${module.id}/edit`}>
            <Button>Edit module</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
