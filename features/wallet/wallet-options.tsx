"use client";

import { useWalletConnection } from "@solana/react-hooks";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Connector, useWalletContext } from "@/providers/wallet-provider";

export function WalletOptions() {
  const context = useWalletContext();
  const { connectors, connect } = useWalletConnection();

  return (
    <div className="flex flex-col gap-3.5">
      {connectors.map((connector) => (
        <WalletOption
          key={connector.id}
          connector={connector}
          onClick={async () => {
            context.setIsConnectorError(false);
            context.setPendingConnector(connector);
            try {
              await connect(connector.id);
            } catch (err) {
              console.warn(`wallet connect failed (${connector.name})`, err);
              context.setIsConnectorError(true);
            }
          }}
        />
      ))}
    </div>
  );
}

export function WalletOption(props: {
  connector: Connector;
  onClick: () => void;
}) {
  const { connector } = props;

  return (
    <Button
      onClick={props.onClick}
      size="lg"
      variant="secondary"
      className="justify-between rounded-xl px-4 py-7 text-base font-semibold"
    >
      <p>{connector.name}</p>
      {connector.icon && (
        // eslint-disable-next-line @next/next/no-img-element
        // biome-ignore lint/performance/noImgElement: wallet icon
        <img
          src={connector.icon}
          alt={connector.name}
          className="size-8 overflow-hidden rounded-[6px]"
        />
      )}
    </Button>
  );
}

export function WalletConnecting() {
  const context = useWalletContext();
  const connector = context.pendingConnector;

  return (
    <div className="flex w-full flex-col items-center justify-center gap-9 md:pt-5">
      {connector?.icon && (
        <div className="size-[116px] relative flex items-center justify-center rounded-2xl border p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/** biome-ignore lint/performance/noImgElement: wallet icon */}
          <img
            src={connector.icon}
            alt={connector.name}
            className="size-full overflow-hidden rounded-2xl"
          />
          {context.isConnectorError ? <RetryConnectorButton /> : null}
        </div>
      )}

      <div className="space-y-3.5 px-3.5 text-center sm:px-0">
        <h1 className="text-xl font-semibold">
          {context.isConnectorError ? "Request Error" : "Requesting Connection"}
        </h1>
        <p className="text-balance text-sm text-muted-foreground">
          {context.isConnectorError
            ? "There was an error with the request. Click above to try again."
            : `Open the ${connector?.name} wallet to connect.`}
        </p>
      </div>
    </div>
  );
}

function RetryConnectorButton() {
  const context = useWalletContext();
  const { connect } = useWalletConnection();

  async function handleClick() {
    if (!context.pendingConnector) return;
    context.setIsConnectorError(false);
    try {
      await connect(context.pendingConnector.id);
    } catch (_err) {
      // console.warn(
      //   `wallet connect retry failed (${context.pendingConnector.name})`,
      //   err,
      // );
      context.setIsConnectorError(true);
    }
  }

  return (
    <Button
      size="icon"
      variant="secondary"
      className="group absolute -bottom-2 -right-2 rounded-full bg-muted p-1.5 shadow"
      onClick={handleClick}
    >
      <RotateCcw className="size-4 transition-transform group-hover:-rotate-45" />
    </Button>
  );
}
