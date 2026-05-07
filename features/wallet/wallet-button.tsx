"use client";

import { usePhantom } from "@phantom/react-sdk";
import { useCompany } from "@/hooks/use-company";
import { useSolBalance } from "@/hooks/use-sol-balance";
import { useWalletKit } from "@/hooks/use-wallet-kit";

import Icon from "@/public/icons";

export function WalletButton() {
  const { address: solanaAddress, toggleModal } = useWalletKit();
  const { isConnected } = usePhantom();
  const { company } = useCompany(solanaAddress);
  const swigWalletAddress = company?.swigWalletAddress ?? null;
  const swigWalletBalance = useSolBalance(swigWalletAddress);

  if (!isConnected) return null;

  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={toggleModal}
        className="border flex items-center gap-1.5 border-[#181819] transition-colors hover:border-primary hover:text-primary py-1 px-2.5 rounded-[10px] text-center text-[#525252] text-sm leading-6"
      >
        <span> {`${swigWalletBalance ?? "0.00"} SOL`}</span>
        <Icon.arrowDown className="size-3" strokeWidth={2} />
      </button>
    </div>
  );
}
