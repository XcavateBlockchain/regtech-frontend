"use client";

// import { useDisconnect } from "@phantom/react-sdk";
import { Check, Copy } from "lucide-react";
import * as React from "react";
import {
  ModalBody,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/modal";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/hooks/use-company";
import { useCompanySlug } from "@/hooks/use-company-slug";
import { useSolBalance } from "@/hooks/use-sol-balance";
import { useWalletKit } from "@/hooks/use-wallet-kit";

// import { formatAddress } from "@/lib/utils";

// const MODAL_CLOSE_DURATION = 320;

function truncate(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function WalletAccount(props: { onClose: () => void }) {
  const { address: solanaAddress, handleDisconnect } = useWalletKit();
  const slug = useCompanySlug();

  const balance = useSolBalance(solanaAddress);
  const { company } = useCompany(slug, solanaAddress);
  const swigAccountPda = company?.swigAddress ?? null;
  const swigWalletPda = company?.swigWalletAddress ?? null;
  const swigWalletBalance = useSolBalance(swigWalletPda);

  // function handleDisconnect() {
  //   props.onClose();
  //   // Wait for the close animation before tearing down the session so the
  //   // modal doesn't visibly snap to "Connect Wallet" mid-fade.
  //   setTimeout(() => {
  //     void disconnect().catch(() => undefined);
  //   }, MODAL_CLOSE_DURATION);
  // }

  return (
    <>
      <ModalHeader>
        <ModalTitle>Connected</ModalTitle>
        <ModalDescription className="sr-only">
          Account modal for your connected Solana wallet.
        </ModalDescription>
      </ModalHeader>
      <ModalBody className="h-[280px]">
        <div className="flex w-full flex-col items-center justify-center gap-8 md:pt-5">
          <div className="size-24 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {/* biome-ignore lint/performance/noImgElement: avatar image */}
            <img
              className="rounded-full"
              src={`https://avatar.vercel.sh/${solanaAddress}?size=150`}
              alt="User gradient avatar"
            />
          </div>
          <div className="flex items-center justify-center gap-2 divide-x divide-gray-200">
            <div className="flex flex-col items-center justify-center gap-1 px-2">
              <p className="text-balance text-sm text-muted-foreground">
                {`${balance ?? "0.00"} SOL`}
              </p>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-semibold">
                  <div>{truncate(solanaAddress ?? "")}</div>
                </h1>
                <CopyAddressButton />
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-1 px-2">
              <p className="text-balance text-sm text-muted-foreground">
                {`${swigWalletBalance ?? "0.00"} SOL`}
              </p>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-semibold">
                  <div>{truncate(swigWalletPda ?? "")}</div>
                </h1>
                <CopyAnyAddressButton address={swigWalletPda ?? ""} />
              </div>
              <p className="text-[11px] leading-4 text-muted-foreground">
                Swig wallet PDA
              </p>
            </div>
          </div>

          {swigAccountPda ? (
            <div className="w-full rounded-xl border px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Swig account PDA</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">
                    {truncate(swigAccountPda)}
                  </span>
                  <CopyAnyAddressButton address={swigAccountPda} />
                </div>
              </div>
            </div>
          ) : null}

          <Button
            className="w-full rounded-xl"
            onClick={() => {
              props.onClose();
              handleDisconnect();
            }}
          >
            Disconnect
          </Button>
        </div>
      </ModalBody>
    </>
  );
}

function CopyAddressButton() {
  const { address: solanaAddress } = useWalletKit();
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (copied) setCopied(false);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function handleCopy() {
    if (!solanaAddress) return;
    setCopied(true);
    await navigator.clipboard.writeText(solanaAddress);
  }

  return (
    <button
      type="button"
      className="text-muted-foreground"
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="size-4" strokeWidth={4} />
      ) : (
        <Copy className="size-4" strokeWidth={4} />
      )}
    </button>
  );
}

function CopyAnyAddressButton(props: { address: string }) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (copied) setCopied(false);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function handleCopy() {
    setCopied(true);
    await navigator.clipboard.writeText(props.address);
  }

  return (
    <button
      type="button"
      className="text-muted-foreground"
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="size-4" strokeWidth={4} />
      ) : (
        <Copy className="size-4" strokeWidth={4} />
      )}
    </button>
  );
}
