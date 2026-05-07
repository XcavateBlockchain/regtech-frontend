"use client";

import { AddressType } from "@phantom/browser-sdk";
import { PhantomProvider, type PhantomTheme } from "@phantom/react-sdk";
import type { PropsWithChildren } from "react";
import { appEnv } from "@/constants/app-env";

const customTheme: PhantomTheme = {
  background: "#ffffff",
  text: "#09090b",
  secondary: "#71717A",
  brand: "#624781",
  error: "#ef4444",
  success: "#22c55e",
  borderRadius: "10px",
  overlay: "rgba(9, 9, 11, 0.5)",
};

const APP_ID = appEnv.PHANTOM_APP_ID;
// const _RPC_ENDPOINT = appEnv.SOLANA_RPC_URL;
// const _WS_ENDPOINT = appEnv.SOLANA_WS_URL;

if (typeof window !== "undefined" && !APP_ID) {
  console.warn(
    "[SimpleKit] NEXT_PUBLIC_PHANTOM_APP_ID is not set. Get one at https://phantom.com/portal and add it to .env.local.",
  );
}

function getPhantomRedirectUrl(): string {
  if (typeof window === "undefined") return "";
  const configuredBase = (appEnv.APP_URL ?? "").trim().replace(/\/$/, "");
  const currentOrigin = window.location.origin.replace(/\/$/, "");
  const origin =
    configuredBase && configuredBase === currentOrigin
      ? configuredBase
      : currentOrigin;
  return `${origin}/auth/callback`;
}

export default function SolanaWalletProvider({ children }: PropsWithChildren) {
  const redirectUrl = getPhantomRedirectUrl();

  return (
    <PhantomProvider
      config={{
        providers: ["google", "injected"],
        appId: APP_ID ?? "",
        addressTypes: [AddressType.solana],
        authOptions: {
          redirectUrl,
        },
      }}
      theme={customTheme}
      appName="Regtech"
    >
      {children}
    </PhantomProvider>
  );
}
