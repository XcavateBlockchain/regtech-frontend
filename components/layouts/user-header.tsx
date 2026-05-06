"use client";

import Image from "next/image";
import Link from "next/link";
import Icon from "@/public/icons";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

export default function CompanyNavHeader() {
  //   const pathname = usePathname();

  return (
    <header className="border-b sticky top-0 z-10 bg-background/50 backdrop-blur-[45px] px-4 md:px-6">
      <div className="flex items-center justify-between h-14 gap-4 md:h-16 md:gap-6">
        {/* Logo + Nav */}
        <div className="flex items-center gap-4 md:gap-8">
          <Link href="/">
            <Image
              src={"/app_logo.svg"}
              alt="Regtech"
              width={180}
              height={32}
              // className="w-[180px] h-[32px]"
              loading="eager"
            />
          </Link>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-4 md:gap-6">
          <button
            type="button"
            className="text-ink-strong hover:text-foreground"
          >
            <Icon.bell className="size-6" strokeWidth={1.5} />
          </button>

          <Avatar>
            <AvatarImage src={`https://avatar.vercel.sh/${"test"}?size=150`} />
            <AvatarFallback>RT</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
