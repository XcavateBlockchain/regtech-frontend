"use client";

import { autoDiscover, type ClientLogger, createClient } from "@solana/client";
import { SolanaProvider } from "@solana/react-hooks";
import type { PropsWithChildren } from "react";

const RPC_ENDPOINT = "https://api.devnet.solana.com";
const WS_ENDPOINT = "wss://api.devnet.solana.com";

// Routes @solana/client logs without escalating handled wallet failures
// (e.g. user cancellation) to console.error, which Next 16 surfaces as a
// Console Error overlay even when our app handles the rejection in-flow.
const logger: ClientLogger = ({ data, level, message }) => {
  if (message.includes("wallet connection failed")) {
    return;
  }
  const tagged = `[solana-client] ${message}`;
  switch (level) {
    case "error":
      console.warn(tagged, data);
      break;
    case "warn":
      console.warn(tagged, data);
      break;
    case "info":
      console.info(tagged, data);
      break;
    default:
      console.debug(tagged, data);
  }
};

const client = createClient({
  endpoint: RPC_ENDPOINT,
  websocketEndpoint: WS_ENDPOINT,
  walletConnectors: autoDiscover(),
  commitment: "confirmed",
  logger,
});

export default function SolanaWalletProvider({ children }: PropsWithChildren) {
  return (
    <SolanaProvider client={client} query={{ config: {}, suspense: false }}>
      {children}
    </SolanaProvider>
  );
}
