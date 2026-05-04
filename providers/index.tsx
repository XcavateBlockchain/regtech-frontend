"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import SolanaWalletProvider from "./solana-provider";
import WalletProvider from "./wallet-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <div vaul-drawer-wrapper="" className="bg-background">
      <SolanaWalletProvider>
        <TooltipProvider delay={0}>
          <WalletProvider>{children}</WalletProvider>
        </TooltipProvider>
      </SolanaWalletProvider>
    </div>
  );
}
