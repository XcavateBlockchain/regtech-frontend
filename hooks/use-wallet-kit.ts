import { useWalletConnection } from "@solana/react-hooks";
import { useWalletContext } from "@/providers/wallet-provider";

const MODAL_CLOSE_DURATION = 320;
const LAMPORTS_PER_SOL = BigInt(1_000_000_000);

export function useWalletKit() {
  const { open: isOpen, setOpen, pendingConnector } = useWalletContext();
  const { wallet } = useWalletConnection();

  const address = wallet?.account.address;
  const isModalOpen = isOpen;
  const isConnected = !!wallet && !pendingConnector;
  const formattedAddress = address
    ? `${address.slice(0, 6)}•••${address.slice(-4)}`
    : "";

  function open() {
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }

  function toggleModal() {
    setOpen((prevState) => !prevState);
  }

  return {
    address,
    isModalOpen,
    isConnected,
    formattedAddress,
    open,
    close,
    toggleModal,
    MODAL_CLOSE_DURATION,
    LAMPORTS_PER_SOL,
  };
}
