"use client";

import { useBalance, useWalletConnection } from "@solana/react-hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import Icon from "@/public/icons";

export function WalletButton() {
  const { isConnected, LAMPORTS_PER_SOL, toggleModal } = useWalletKit();
  const { wallet } = useWalletConnection();
  const balance = useBalance(wallet?.account.address);

  const address = wallet?.account.address;
  // const formattedAddress = address
  //   ? `${address.slice(0, 6)}•••${address.slice(-4)}`
  //   : "";

  const lamports = balance.lamports;
  const formattedBalance =
    lamports !== undefined && lamports !== null
      ? (Number(lamports) / Number(LAMPORTS_PER_SOL)).toFixed(4)
      : undefined;

  return (
    <>
      {isConnected ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleModal}
            className="border flex items-center gap-1.5 border-[#181819] transition-colors hover:border-primary hover:text-primary py-0.5 px-2.5 rounded-[23px] text-center text-[#525252] text-sm leading-6"
          >
            <span> {`${formattedBalance ?? "0.00"} SOL`}</span>
            <Icon.arrowDown className="size-3" strokeWidth={2} />
          </button>
          <Avatar>
            <AvatarImage src={`https://avatar.vercel.sh/${address}?size=150`} />
            <AvatarFallback>RT</AvatarFallback>
          </Avatar>
        </div>
      ) : (
        <Button onClick={toggleModal}>Login</Button>
      )}
    </>
  );
}
