"use client";

import {
  AddressType,
  PhantomProvider,
  type PhantomTheme,
} from "@phantom/react-sdk";
import type { PropsWithChildren } from "react";
import { appEnv } from "@/constants/app-env";

const customTheme: PhantomTheme = {
  background: "#ffffff", // matches our --background dark mode
  text: "#09090b", // matches --foreground dark mode
  secondary: "#71717A", // muted-foreground, hex required
  brand: "#624781", // primary action; light on dark for contrast
  error: "#ef4444", // red-500
  success: "#22c55e", // green-500
  borderRadius: "10px", // matches SimpleKit's 1rem rounded modal
  overlay: "rgba(9, 9, 11, 0.5)", // matches our Dialog overlay
};

const APP_ID = appEnv.PHANTOM_APP_ID;
// const _RPC_ENDPOINT = appEnv.SOLANA_RPC_URL;
// const _WS_ENDPOINT = appEnv.SOLANA_WS_URL;

if (typeof window !== "undefined" && !APP_ID) {
  console.warn(
    "[SimpleKit] NEXT_PUBLIC_PHANTOM_APP_ID is not set. Get one at https://phantom.com/portal and add it to .env.local.",
  );
}

export default function SolanaWalletProvider({ children }: PropsWithChildren) {
  const redirectUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback`
      : "";
  return (
    <PhantomProvider
      config={{
        providers: ["injected"],
        appId: APP_ID ?? "",
        addressTypes: [AddressType.solana],
        authOptions: { redirectUrl },
      }}
      theme={customTheme}
      appName="Regtech"
    >
      {children}
    </PhantomProvider>
  );
}
