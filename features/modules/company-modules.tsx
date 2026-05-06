"use client";

import { useEffect, useMemo, useState } from "react";
import type { ModuleCardData } from "@/features/modules/module-item";
import { ModuleList } from "@/features/modules/module-list";
import { Filters, Header } from "@/features/modules/module-toolbar";
import { useCompany } from "@/hooks/use-company";
import { useWalletKit } from "@/hooks/use-wallet-kit";

type ApiModule = {
  id: string;
  name: string;
  category: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  thumbnailUrl: string;
  txConfirmed: boolean;
  shareToken: string;
};

function toCategoryLabel(raw: string): ModuleCardData["category"] {
  const upper = raw.toUpperCase();
  if (upper === "AML") return "AML";
  if (upper === "KYC") return "KYC";
  if (upper === "DEFI") return "DeFi";
  return "Securities";
}

export function CompanyModules() {
  const { address } = useWalletKit();
  const { company, loading: companyLoading } = useCompany(address);
  const [modules, setModules] = useState<ApiModule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address || companyLoading || !company) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/company/modules?walletAddress=${encodeURIComponent(address)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json()) as { error: string };
          throw new Error(body.error ?? "Failed to load modules");
        }
        return res.json() as Promise<{ modules: ApiModule[] }>;
      })
      .then((data) => {
        if (!cancelled) setModules(data.modules);
      })
      .catch(() => {
        if (!cancelled) setModules([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [address, company, companyLoading]);

  const cards = useMemo<ModuleCardData[]>(
    () =>
      modules.map((m) => {
        if (m.status === "DRAFT") {
          return {
            slug: m.id,
            title: m.name,
            category: toCategoryLabel(m.category),
            coverImageUrl: m.thumbnailUrl,
            mode: "edit",
          };
        }

        return {
          slug: m.id,
          title: m.name,
          category: toCategoryLabel(m.category),
          coverImageUrl: m.thumbnailUrl,
          mode: "stats",
          shareToken: m.shareToken,
          stats: {
            enrolled: 0,
            completed: 0,
            available: 0,
            avgScore: "—",
          },
        };
      }),
    [modules],
  );

  const activeCount = modules.filter((m) => m.status === "ACTIVE").length;

  return (
    <>
      <Header total={loading ? 0 : activeCount} />
      <Filters />
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading modules…</div>
      ) : (
        <ModuleList modules={cards} />
      )}
    </>
  );
}
