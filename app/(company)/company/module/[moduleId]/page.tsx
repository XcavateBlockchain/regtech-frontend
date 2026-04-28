import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import {
  KpiStats,
  ModuleDetails,
  ModuleHeader,
  ResultsTable,
} from "@/features/module";

export default function ModuleDetailsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1512px] flex-col gap-6 px-6 py-6">
      <BackLink />
      <ModuleHeader />
      <KpiStats />
      <ModuleDetails
        text={
          "Master the fundamentals of Anti-Money Laundering regulations. Learn how to identify suspicious transactions, understand the FATF framework, and comply with global AML standards including the Bank Secrecy Act."
        }
      />
      <ResultsTable />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-5" strokeWidth={1.75} />
      Back
    </Link>
  );
}
