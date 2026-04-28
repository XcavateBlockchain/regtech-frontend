import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Category = "Securities" | "AML" | "DeFi" | "KYC";
type Status = "Published" | "Draft" | "Failed";

type Module = {
  title: string;
  category: Category;
  tested: string;
  passRate: string;
  failRate: string;
  status: Status;
  passTone: "success" | "warning" | "neutral";
  failTone: "danger" | "danger-bright" | "neutral";
};

const modules: Module[] = [
  {
    title: "SEC Disclosure Requirements",
    category: "Securities",
    tested: "312",
    passRate: "92%",
    failRate: "8%",
    status: "Published",
    passTone: "success",
    failTone: "danger",
  },
  {
    title: "Anti-Money Laundering 101",
    category: "AML",
    tested: "247",
    passRate: "88%",
    failRate: "12%",
    status: "Published",
    passTone: "success",
    failTone: "danger",
  },
  {
    title: "DeFi Protocol Compliance",
    category: "DeFi",
    tested: "---",
    passRate: "---",
    failRate: "---",
    status: "Draft",
    passTone: "neutral",
    failTone: "neutral",
  },
  {
    title: "KYC Fundamentals",
    category: "KYC",
    tested: "188",
    passRate: "79%",
    failRate: "21%",
    status: "Failed",
    passTone: "warning",
    failTone: "danger-bright",
  },
];

const categoryToneMap: Record<
  Category,
  Parameters<typeof Badge>[0]["variant"]
> = {
  Securities: "default",
  AML: "default",
  DeFi: "default",
  KYC: "default",
};

const statusToneMap: Record<Status, Parameters<typeof Badge>[0]["variant"]> = {
  Published: "default",
  Draft: "default",
  Failed: "default",
};

const passToneMap = {
  success: "text-status-success",
  warning: "text-status-warning",
  neutral: "text-ink-mute",
};

const failToneMap = {
  danger: "text-status-danger-bar",
  "danger-bright": "text-status-danger-bright",
  neutral: "text-ink-mute",
};

export function ModulesPerformance() {
  return (
    <Card className="p-4">
      <h2 className="mb-4 font-display text-base font-semibold leading-6 text-ink-strong">
        Modules performance
      </h2>

      <Table>
        <TableHeader>
          <TableRow className="bg-[#959583]/8 hover:bg-[rgba(149,149,131,0.08)] border-transparent">
            <TableHead className="w-[28%]">Title</TableHead>
            <TableHead className="w-[14%]">Category</TableHead>
            <TableHead className="w-[10%]">Tested</TableHead>
            <TableHead className="w-[12%]">Pass rate</TableHead>
            <TableHead className="w-[12%]">Fail rate</TableHead>
            <TableHead className="w-[14%]">Status</TableHead>
            <TableHead className="w-[10%] text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {modules.map((m) => (
            <TableRow key={m.title}>
              <TableCell className="text-ink-strong">{m.title}</TableCell>
              <TableCell>
                <Badge variant={categoryToneMap[m.category]}>
                  {m.category}
                </Badge>
              </TableCell>
              <TableCell className="text-ink-strong">{m.tested}</TableCell>
              <TableCell className={cn(passToneMap[m.passTone])}>
                {m.passRate}
              </TableCell>
              <TableCell className={cn(failToneMap[m.failTone])}>
                {m.failRate}
              </TableCell>
              <TableCell>
                <Badge variant={statusToneMap[m.status]}>{m.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <button
                  type="button"
                  className="font-medium text-action-link transition-colors hover:underline"
                >
                  Edit
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
