"use client";

import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const STATS = [
  { label: "Total credentials", value: "12" },
  { label: "Active", value: "9" },
  { label: "Pending renewal", value: "3" },
] as const;

const ACTIVE_CREDENTIALS = [
  {
    title: "Financial promotions competency",
    subtitle: "Issued · Expires 14 Jun 2026",
  },
  {
    title: "Consumer duty fundamentals",
    subtitle: "Issued · Expires 02 Dec 2025",
  },
  {
    title: "Anti-money laundering (AML) refresher",
    subtitle: "Issued · Renews in 45 days",
  },
] as const;

const COMPLETED_CREDENTIALS = [
  {
    title: "ICO / GDPR essentials",
    subtitle: "Completed · Verified 08 Jan 2025",
  },
  {
    title: "Senior managers regime overview",
    subtitle: "Completed · Verified 19 Nov 2024",
  },
] as const;

const tabTriggerClass =
  "min-h-11 flex-none rounded-none border-0 bg-transparent px-1 py-3 text-sm font-medium text-muted-foreground shadow-none ring-0 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 data-active:bg-transparent data-active:text-primary data-active:shadow-none data-active:[box-shadow:none] data-active:after:bg-primary sm:min-h-[52px] sm:px-2 sm:text-base";

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 md:py-10">
      <section
        aria-label="Credential summary"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4"
      >
        {STATS.map((item) => (
          <div
            key={item.label}
            className="rounded-md border border-border bg-card px-4 py-4 md:min-h-[88px] md:py-5"
          >
            <p className="text-sm leading-snug text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums md:text-[28px] md:leading-8">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <Tabs defaultValue="active" className="mt-8 md:mt-10">
        <TabsList
          variant="line"
          className="h-auto w-full justify-start gap-6 border-b border-border bg-transparent p-0 sm:gap-10"
        >
          <TabsTrigger value="active" className={tabTriggerClass}>
            Active credentials
          </TabsTrigger>
          <TabsTrigger value="completed" className={tabTriggerClass}>
            Completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6 md:mt-8">
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base md:leading-7">
            These credentials are live on your profile. Download proofs, share
            verification links, or renew before they lapse.
          </p>
          <ul className="mt-6 flex flex-col gap-3 md:mt-8 md:gap-4">
            {ACTIVE_CREDENTIALS.map((row) => (
              <li key={row.title}>
                <CredentialRow title={row.title} subtitle={row.subtitle} />
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="completed" className="mt-6 md:mt-8">
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base md:leading-7">
            Completed credentials stay in your history for audits and employer
            verification. Open a row to view issuance metadata.
          </p>
          <ul className="mt-6 flex flex-col gap-3 md:mt-8 md:gap-4">
            {COMPLETED_CREDENTIALS.map((row) => (
              <li key={row.title}>
                <CredentialRow
                  title={row.title}
                  subtitle={row.subtitle}
                  badge={
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        "bg-[#78B36E]/10 text-[#78B36E]",
                      )}
                    >
                      Completed
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function CredentialRow({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle: string;
  badge?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5 sm:py-4">
      <div className="min-w-0 space-y-1">
        <p className="font-medium leading-snug text-foreground">{title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      </div>
      {badge ? (
        <div className="flex shrink-0 sm:items-center">{badge}</div>
      ) : null}
    </div>
  );
}
