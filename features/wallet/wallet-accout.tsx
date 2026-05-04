"use client";

import { useBalance, useWalletConnection } from "@solana/react-hooks";
import { Check, Copy } from "lucide-react";
import * as React from "react";
import {
  ModalBody,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/modal";
import { Button } from "@/components/ui/button";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { useWalletContext } from "@/providers/wallet-provider";

export function WalletAccount() {
  const { MODAL_CLOSE_DURATION, LAMPORTS_PER_SOL } = useWalletKit();

  const { wallet, disconnect } = useWalletConnection();

  const balance = useBalance(wallet?.account.address);
  const context = useWalletContext();

  const address = wallet?.account.address;
  const formattedAddress = address
    ? `${address.slice(0, 6)}•••${address.slice(-4)}`
    : "";

  const lamports = balance.lamports;
  const formattedBalance =
    lamports !== undefined && lamports !== null
      ? (Number(lamports) / Number(LAMPORTS_PER_SOL)).toFixed(4)
      : undefined;

  function handleDisconnect() {
    context.setOpen(false);
    setTimeout(() => {
      void Promise.resolve(disconnect()).catch(() => undefined);
    }, MODAL_CLOSE_DURATION);
  }

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
            {/** biome-ignore lint/performance/noImgElement: avatar image */}
            <img
              className="rounded-full"
              src={`https://avatar.vercel.sh/${address}?size=150`}
              alt="User gradient avatar"
            />
          </div>

          <div className="space-y-1 px-3.5 text-center sm:px-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-semibold">
                <div>{formattedAddress}</div>
              </h1>
              <CopyAddressButton />
            </div>
            <p className="text-balance text-sm text-muted-foreground">
              {`${formattedBalance ?? "0.00"} SOL`}
            </p>
          </div>

          <Button className="w-full rounded-xl" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </div>
      </ModalBody>
    </>
  );
}

function CopyAddressButton() {
  const { wallet } = useWalletConnection();
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (copied) setCopied(false);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function handleCopy() {
    if (!wallet) return;
    setCopied(true);
    await navigator.clipboard.writeText(wallet.account.address);
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
