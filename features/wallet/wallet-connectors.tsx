"use client";

import { ChevronLeft } from "lucide-react";
import {
  ModalBody,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/modal";
import { useWalletContext } from "@/providers/wallet-provider";
import { WalletConnecting, WalletOptions } from "./wallet-options";

export default function WalletConnectors() {
  const context = useWalletContext();

  return (
    <>
      <ModalHeader>
        <BackChevron />
        <ModalTitle>
          {context.pendingConnector?.name ?? "Connect Wallet"}
        </ModalTitle>
        <ModalDescription className="sr-only">
          Connect your Solana wallet or create a new one.
        </ModalDescription>
      </ModalHeader>
      <ModalBody>
        {context.pendingConnector ? <WalletConnecting /> : <WalletOptions />}
      </ModalBody>
      {/* <ModalFooter>
        <div className="h-0" />
      </ModalFooter> */}
    </>
  );
}

function BackChevron() {
  const context = useWalletContext();

  if (!context.pendingConnector) {
    return null;
  }

  function handleClick() {
    // returns to the wallet list.
    context.setIsConnectorError(false);
    context.setPendingConnector(null);
  }

  return (
    <button
      type="button"
      className="absolute left-[26px] top-[42px] z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground md:top-[26px]"
      onClick={handleClick}
    >
      <ChevronLeft className="h-4 w-4" />
      <span className="sr-only">Cancel connection</span>
    </button>
  );
}
