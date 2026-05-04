import {
  AddressType,
  useAccounts,
  useModal,
  usePhantom,
} from "@phantom/react-sdk";
import * as React from "react";
import { useWalletContext } from "@/providers/wallet-provider";

const MODAL_CLOSE_DURATION = 320;
// const LAMPORTS_PER_SOL = BigInt(1_000_000_000);

export function useWalletKit() {
  const accounts = useAccounts();
  const phantomModal = useModal();
  const { isConnected } = usePhantom();
  const { open: isOpen, setOpen } = useWalletContext();

  const address = React.useMemo(() => {
    if (!accounts) return null;
    const solanaEntry = accounts.find(
      (entry) => entry.addressType === AddressType.solana,
    );
    return solanaEntry?.address ?? null;
  }, [accounts]);

  const formattedAddress = address
    ? `${address.slice(0, 6)}•••${address.slice(-4)}`
    : "";

  function open() {
    if (isConnected) {
      setOpen(true);
    } else {
      phantomModal.open();
    }
  }

  function close() {
    setOpen(false);
    phantomModal.close();
  }

  function toggleModal() {
    if (isConnected) {
      setOpen((prev) => !prev);
    } else {
      if (phantomModal.isOpened) phantomModal.close();
      else phantomModal.open();
    }
  }
  return {
    isConnected,
    address,
    isModalOpen: isOpen || phantomModal.isOpened,
    formattedAddress,
    open,
    close,
    toggleModal,
    MODAL_CLOSE_DURATION,
    // LAMPORTS_PER_SOL,
  };
}
