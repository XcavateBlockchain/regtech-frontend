import { appEnv } from "@/constants/app-env";

function parseList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Base58 pubkeys allowed to call admin funding APIs (comma-separated env). */
export function getAdminWallets(): string[] {
  return parseList(
    process.env.NEXT_PUBLIC_XCAVATE_ADMIN_WALLET_ADDRESSES ??
      appEnv.XCAVATE_ADMIN_WALLET_ADDRESSES,
  );
}

export function isAdminWallet(walletAddress: string): boolean {
  const allowed = getAdminWallets();
  if (allowed.length === 0) return false;
  return allowed.includes(walletAddress);
}

export class AdminForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "AdminForbiddenError";
  }
}

export function assertAdminWallet(walletAddress: string): void {
  if (!isAdminWallet(walletAddress)) {
    throw new AdminForbiddenError();
  }
}
