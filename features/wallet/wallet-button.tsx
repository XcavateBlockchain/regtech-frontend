"use client";

import { useModal, usePhantom } from "@phantom/react-sdk";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSolBalance } from "@/hooks/use-sol-balance";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import Icon from "@/public/icons";

export function WalletButton() {
  const { address: solanaAddress, toggleModal } = useWalletKit();
  const balance = useSolBalance(solanaAddress);

  const phantomModal = useModal();
  const { isConnected, isLoading } = usePhantom();

  return (
    <>
      {isConnected ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleModal}
            className="border flex items-center gap-1.5 border-[#181819] transition-colors hover:border-primary hover:text-primary py-0.5 px-2.5 rounded-[23px] text-center text-[#525252] text-sm leading-6"
          >
            <span> {`${balance ?? "0.00"} SOL`}</span>
            <Icon.arrowDown className="size-3" strokeWidth={2} />
          </button>
          <Avatar>
            <AvatarImage
              src={`https://avatar.vercel.sh/${solanaAddress}?size=150`}
            />
            <AvatarFallback>RT</AvatarFallback>
          </Avatar>
        </div>
      ) : (
        <Button onClick={phantomModal.open} disabled={isLoading}>
          Login
        </Button>
      )}
    </>
  );
}
