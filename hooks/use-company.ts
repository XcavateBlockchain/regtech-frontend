"use client";

import { useEffect, useState } from "react";

export type CompanyData = {
  id: string;
  name: string;
  slug: string;
  swigAddress: string | null;
  txConfirmed: boolean;
  collectionAddress: string | null;
  partnerId: string;
  attestor: string | null;
  description: string;
  logoUrl: string | null;
  website: string | null;
  owner: {
    role: string;
    email: string;
    name: string;
  };
};

type UseCompanyReturn = {
  company: CompanyData | null;
  swigSolBalance: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useCompany(walletAddress: string | null): UseCompanyReturn {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [swigSolBalance, setSwigSolBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    void tick;
    if (!walletAddress) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/company/me?walletAddress=${encodeURIComponent(walletAddress)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json()) as { error: string };
          throw new Error(body.error ?? "Failed to load company");
        }
        return res.json() as Promise<{
          company: CompanyData;
          swigSolBalance: number;
        }>;
      })
      .then(({ company, swigSolBalance }) => {
        if (!cancelled) {
          setCompany(company);
          setSwigSolBalance(swigSolBalance);
        }
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Unknown error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [walletAddress, tick]);

  return {
    company,
    swigSolBalance,
    loading,
    error,
    refetch: () => setTick((t) => t + 1),
  };
}
