"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/constants/nvaigations";
import { WalletButton } from "@/features/wallet/wallet-button";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { cn } from "@/lib/utils";
import Icon from "@/public/icons";

export default function CompanyNavHeader() {
  const pathname = usePathname();
  const { isConnected } = useWalletKit();

  const isActive = (href: string) => pathname === href;
  return (
    <header className="border-b px-4 md:px-6 sticky top-0 z-10 bg-background/50 backdrop-blur-[45px]">
      <div className="flex items-center justify-between h-12.5 gap-6">
        <div className="flex items-center gap-8">
          <Link href="/">
            <span className="font-mono text-[28px] font-bold leading-6 tracking-[-0.143em] text-primary">
              Regtech
            </span>
          </Link>

          {isConnected && (
            <nav className="flex items-center gap-6">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <span
                    data-active={isActive(item.href)}
                    className={cn(
                      "text-sm leading-normal font-normal text-foreground py-3.5 border-y-2 border-transparent hover:border-b-primary data-[active=true]:border-b-primary data-[active=true]:text-primary",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-6">
          <button
            type="button"
            className="text-ink-strong hover:text-foreground"
          >
            <Icon.bell className="size-6" strokeWidth={1.5} />
          </button>

          <WalletButton />
        </div>
      </div>
    </header>
  );
}
