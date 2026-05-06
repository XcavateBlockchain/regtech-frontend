"use client";

import type { Address } from "@solana/kit";
import { ArrowDownToLine, Wallet, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useFundSwig } from "@/hooks/use-swig";

const LAMPORTS_PER_SOL = BigInt(1_000_000_000);

type SwigWalletCardProps = {
  companyId: string;
  walletAddress: string;
  swigWalletAddress: string;
  solBalance: number;
  partnerVaultAddress: string | null;
  partnerVaultSolBalance: number;
  onAllocated?: () => void;
  onFunded?: () => void;
};

function truncate(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function SwigWalletCard({
  companyId,
  walletAddress,
  swigWalletAddress,
  solBalance,
  partnerVaultAddress,
  partnerVaultSolBalance,
  onAllocated,
  onFunded,
}: SwigWalletCardProps) {
  const [allocating, setAllocating] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [refundCount, setRefundCount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [quizBalance, setQuizBalance] = useState<{
    purchased: number;
    consumed: number;
    refunded: number;
    remaining: number;
  } | null>(null);
  const [quizBalanceLoading, setQuizBalanceLoading] = useState(false);
  const { fund, loading: funding } = useFundSwig();

  const refreshQuizBalance = useCallback(async () => {
    setQuizBalanceLoading(true);
    try {
      const res = await fetch(
        `/api/company/quiz-balance?companyId=${encodeURIComponent(
          companyId,
        )}&walletAddress=${encodeURIComponent(walletAddress)}`,
      );
      if (!res.ok) {
        setQuizBalance(null);
        return;
      }
      const data = (await res.json()) as {
        purchased: number;
        consumed: number;
        refunded: number;
        remaining: number;
      };
      setQuizBalance(data);
    } finally {
      setQuizBalanceLoading(false);
    }
  }, [companyId, walletAddress]);

  useEffect(() => {
    refreshQuizBalance();
  }, [refreshQuizBalance]);

  async function handleAllocate() {
    setAllocating(true);
    setError(null);
    try {
      const res = await fetch("/api/company/allocate-quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, walletAddress, count: 100 }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error: string };
        throw new Error(body.error ?? "Failed");
      }
      await refreshQuizBalance();
      onAllocated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setAllocating(false);
    }
  }

  async function handleRefund() {
    setError(null);
    const count = Number(refundCount);
    if (!Number.isFinite(count) || count <= 0) {
      setError("Enter a valid refund count");
      return;
    }
    setRefunding(true);
    try {
      const res = await fetch("/api/company/refund-quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, walletAddress, count }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error: string };
        throw new Error(body.error ?? "Failed");
      }
      setRefundCount("");
      await refreshQuizBalance();
      onAllocated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setRefunding(false);
    }
  }

  async function handleFund() {
    setError(null);
    const targetVaultAddress = partnerVaultAddress ?? swigWalletAddress;
    const sol = parseFloat(fundAmount);
    if (!sol || sol <= 0) {
      setError("Enter a valid SOL amount");
      return;
    }
    try {
      const lamports = BigInt(Math.round(sol * Number(LAMPORTS_PER_SOL)));
      await fund(
        walletAddress as Address,
        targetVaultAddress as Address,
        lamports,
      );
      setFundAmount("");
      onFunded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <Card className="flex flex-col gap-5 px-6 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="size-4 text-primary" />
          <p className="text-sm font-medium">Company Vault (Swig)</p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          {truncate(swigWalletAddress)}
        </Badge>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-2xl font-semibold leading-6">
          {solBalance.toFixed(4)}
          <span className="ml-1 text-base font-normal text-muted-foreground">
            SOL
          </span>
        </p>
        <p className="text-xs text-muted-foreground font-mono">
          {swigWalletAddress}
        </p>
      </div>

      {partnerVaultAddress ? (
        <div className="rounded-md border border-border px-3 py-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              Partner vault (Partner PDA)
            </p>
            <Badge variant="outline" className="font-mono text-xs">
              {truncate(partnerVaultAddress)}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground font-mono">
            {partnerVaultAddress}
          </p>
          <p className="mt-1 text-sm">
            {partnerVaultSolBalance.toFixed(4)}{" "}
            <span className="text-xs text-muted-foreground">SOL</span>
          </p>
        </div>
      ) : null}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between rounded-md border border-border px-2 py-1.5">
          <span>Allocated</span>
          <span className="font-medium text-foreground">
            {quizBalanceLoading ? "…" : (quizBalance?.purchased ?? "—")}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border px-2 py-1.5">
          <span>Remaining</span>
          <span className="font-medium text-foreground">
            {quizBalanceLoading ? "…" : (quizBalance?.remaining ?? "—")}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border px-2 py-1.5">
          <span>Consumed</span>
          <span className="font-medium text-foreground">
            {quizBalanceLoading ? "…" : (quizBalance?.consumed ?? "—")}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border px-2 py-1.5">
          <span>Refunded</span>
          <span className="font-medium text-foreground">
            {quizBalanceLoading ? "…" : (quizBalance?.refunded ?? "—")}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="SOL amount"
          value={fundAmount}
          onChange={(e) => setFundAmount(e.target.value)}
          className="h-8 w-28 text-sm"
          disabled={funding}
        />
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={handleFund}
          disabled={funding || !fundAmount}
        >
          <ArrowDownToLine className="size-3.5" />
          {funding ? "Funding…" : "Fund vault"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={async () => {
            setError(null);
            const sol = parseFloat(fundAmount);
            if (!sol || sol <= 0) {
              setError("Enter a valid SOL amount");
              return;
            }
            try {
              const lamports = BigInt(Math.round(sol * Number(LAMPORTS_PER_SOL)));
              await fund(
                walletAddress as Address,
                swigWalletAddress as Address,
                lamports,
              );
              setFundAmount("");
              onFunded?.();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Something went wrong");
            }
          }}
          disabled={funding || !fundAmount}
        >
          <ArrowDownToLine className="size-3.5" />
          {funding ? "Funding…" : "Fund Swig vault"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={handleAllocate}
          disabled={allocating}
        >
          <Zap className="size-3.5" />
          {allocating ? "Allocating…" : "Allocate quizzes"}
        </Button>
        <Input
          type="number"
          min="0"
          step="1"
          placeholder="Refund #"
          value={refundCount}
          onChange={(e) => setRefundCount(e.target.value)}
          className="h-8 w-24 text-sm"
          disabled={refunding}
        />
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={handleRefund}
          disabled={refunding || !refundCount}
        >
          {refunding ? "Refunding…" : "Refund"}
        </Button>
      </div>
    </Card>
  );
}
