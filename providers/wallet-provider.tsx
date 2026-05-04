"use client";

import { useWalletConnection } from "@solana/react-hooks";
import * as React from "react";
import { Modal, ModalContent } from "@/components/modal";
import { WalletAccount } from "@/features/wallet/wallet-accout";
import WalletConnectors from "@/features/wallet/wallet-connectors";

const MODAL_CLOSE_DURATION = 320;

export type Connector = ReturnType<
  typeof useWalletConnection
>["connectors"][number];

export type AuthContextType = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const WalletContext = React.createContext<{
  pendingConnector: Connector | null;
  setPendingConnector: React.Dispatch<React.SetStateAction<Connector | null>>;
  isConnectorError: boolean;
  setIsConnectorError: React.Dispatch<React.SetStateAction<boolean>>;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  auth: AuthContextType;
}>({
  pendingConnector: null,
  setPendingConnector: () => null,
  isConnectorError: false,
  setIsConnectorError: () => false,
  open: false,
  setOpen: () => false,
  auth: {
    open: false,
    setOpen: () => false,
  },
});

export default function WalletProvider(props: { children: React.ReactNode }) {
  const { wallet, status } = useWalletConnection();
  const [pendingConnector, setPendingConnector] =
    React.useState<Connector | null>(null);
  const [isConnectorError, setIsConnectorError] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [authModalOpen, setAuthModalOpen] = React.useState(true);

  const isConnected = !!wallet && !pendingConnector;

  React.useEffect(() => {
    if (status === "connected" && pendingConnector) {
      setOpen(false);

      const timeout = setTimeout(() => {
        setPendingConnector(null);
        setIsConnectorError(false);
      }, MODAL_CLOSE_DURATION);

      return () => clearTimeout(timeout);
    }
  }, [status, pendingConnector]);
  return (
    <WalletContext.Provider
      value={{
        pendingConnector,
        setPendingConnector,
        isConnectorError,
        setIsConnectorError,
        open,
        setOpen,
        auth: {
          open: authModalOpen,
          setOpen: setAuthModalOpen,
        },
      }}
    >
      {props.children}
      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent>
          {isConnected ? <WalletAccount /> : <WalletConnectors />}
        </ModalContent>
      </Modal>
      {/* <Modal open={authModalOpen} onOpenChange={setAuthModalOpen}>
    
      </Modal> */}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const context = React.useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
