"use client";

import type { useWalletConnection } from "@solana/react-hooks";
import * as React from "react";
import { Modal, ModalContent } from "@/components/modal";
import { RegisterForm } from "@/features/user-auth/register-form";
import { WalletAccount } from "@/features/wallet/wallet-accout";

export type Connector = ReturnType<
  typeof useWalletConnection
>["connectors"][number];

export type AuthContextType = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const WalletContext = React.createContext<{
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  auth: AuthContextType;
}>({
  open: false,
  setOpen: () => false,
  auth: {
    open: false,
    setOpen: () => false,
  },
});

export default function WalletProvider(props: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [authModalOpen, setAuthModalOpen] = React.useState(true);

  return (
    <WalletContext.Provider
      value={{
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
          <WalletAccount onClose={() => setOpen(false)} />
        </ModalContent>
      </Modal>
      <Modal open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <RegisterForm />
      </Modal>
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
