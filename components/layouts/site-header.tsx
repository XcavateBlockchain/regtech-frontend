"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "../ui/button";

export default function SiteHeader() {
  const pathname = usePathname();
  const _isActive = (href: string) => pathname === href;
  return (
    <header className="border-b px-4 md:px-6">
      <div className="flex items-center justify-between h-12.5 gap-6">
        <div className="flex items-center gap-8">
          <Link href="/">
            <span className="font-mono text-[28px] font-bold leading-6 tracking-[-0.143em] text-primary">
              Regtech
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          <Button size="lg">Login</Button>
        </div>
      </div>
    </header>
  );
}
