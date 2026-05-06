"use client";

import { usePhantom } from "@phantom/react-sdk";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/hooks/use-company";
import { useSolBalance } from "@/hooks/use-sol-balance";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { useAuthContext } from "@/providers/auth-provider";
import Icon from "@/public/icons";

export function WalletButton() {
  const { address: solanaAddress, toggleModal } = useWalletKit();
  const { isConnected } = usePhantom();
  const { company } = useCompany(solanaAddress);
  const swigAddress = company?.swigAddress ?? null;
  const swigBalance = useSolBalance(swigAddress);
  const { setOpen } = useAuthContext();

  return (
    <>
      {isConnected ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleModal}
            className="border flex items-center gap-1.5 border-[#181819] transition-colors hover:border-primary hover:text-primary py-0.5 px-2.5 rounded-[10px] text-center text-[#525252] text-sm leading-6"
          >
            <span> {`${swigBalance ?? "0.00"} SOL`}</span>
            <Icon.arrowDown className="size-3" strokeWidth={2} />
          </button>
          <div className="flex items-center gap-1">
            <Avatar>
              <AvatarImage
                src={`https://avatar.vercel.sh/${solanaAddress}?size=150`}
              />
              <AvatarFallback>RT</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <p className="text-sm font-medium">{company?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {company?.owner.name} {company?.owner.role}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <Button onClick={() => setOpen(true)}>Sign in</Button>
      )}
    </>
  );
}
