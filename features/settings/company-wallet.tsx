"use client";

import { useCompany } from "@/hooks/use-company";
import { useCompanySlug } from "@/hooks/use-company-slug";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { RegtechTransactions } from "./regtech-transactions";
import { SwigWalletCard } from "./swig-wallet-card";

function WalletSectionSkeleton() {
  return (
    <div className="w-full grid grid-cols-1 gap-10">
      <div className="bg-white border rounded-[10px] px-6 py-4">
        <div className="animate-pulse flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-44 rounded bg-muted" />
            <div className="h-4 w-16 rounded bg-muted" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 rounded bg-muted" />
            <div className="h-16 rounded bg-muted" />
            <div className="h-16 rounded bg-muted" />
            <div className="h-16 rounded bg-muted" />
          </div>
          <div className="h-9 w-40 rounded bg-muted" />
        </div>
      </div>

      <div className="bg-white border rounded-[10px] px-6 py-4">
        <div className="animate-pulse flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-48 rounded bg-muted" />
            <div className="h-4 w-16 rounded bg-muted" />
          </div>
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-11/12 rounded bg-muted" />
          <div className="h-4 w-10/12 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

export function CompanyWalletSection() {
  const { address } = useWalletKit();
  const slug = useCompanySlug();
  const {
    company,
    swigSolBalance,
    partnerVaultAddress,
    partnerVaultSolBalance,
    loading,
    error,
    refetch,
  } = useCompany(slug, address);

  if (!address || loading) return <WalletSectionSkeleton />;
  if (
    error ||
    !company?.swigAddress ||
    !company.txConfirmed ||
    !company.swigWalletAddress
  )
    return null;

  return (
    <div className="w-full grid grid-cols-1 gap-10">
      <SwigWalletCard
        companyId={company.id}
        walletAddress={address}
        swigWalletAddress={company.swigWalletAddress}
        solBalance={swigSolBalance}
        partnerVaultAddress={partnerVaultAddress}
        partnerVaultSolBalance={partnerVaultSolBalance}
        onAllocated={refetch}
        onFunded={refetch}
      />
      <RegtechTransactions />
    </div>
  );
}
