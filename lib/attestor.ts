"use server";

/**
 * Attestor registry.
 *
 * Single JSON file that holds every attestor keypair generated across all
 * companies. The public address is the lookup key — store that on the
 * Company record (e.g. Company.attestorWallet) and pass it back here when
 * you need to sign.
 *
 * ⚠️  Stores PRIVATE KEYS IN PLAINTEXT. Add `keys/attestors.json` to
 *     .gitignore. For production, swap the file backend for a KMS.
 *
 * Marked "use server" so this module (Node fs/crypto) is not bundled into
 * client components that import e.g. addAttestor().
 */

import { webcrypto } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  createKeyPairFromPrivateKeyBytes,
  getAddressFromPublicKey,
} from "@solana/kit";

// Node 20+ exposes globalThis.crypto; fall back to webcrypto for older runtimes.
const cryptoApi: Crypto =
  (globalThis.crypto as Crypto) ?? (webcrypto as unknown as Crypto);

// Single registry file. Override path with ATTESTORS_FILE env var if needed.
const ATTESTORS_FILE = resolve(
  process.env.ATTESTORS_FILE ?? "keys/attestors.json",
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AttestorEntry {
  /** Base58-encoded Solana public key. Primary lookup key. */
  address: string;
  /** 32-byte ed25519 private seed, stored as a number array for JSON-safety. */
  secretKey: number[];
  /** ISO timestamp of generation. */
  createdAt: string;
}

interface AttestorsFile {
  attestors: AttestorEntry[];
}

// ─── File I/O ─────────────────────────────────────────────────────────────────

async function loadFile(): Promise<AttestorsFile> {
  try {
    const raw = await readFile(ATTESTORS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AttestorsFile>;
    return { attestors: parsed.attestors ?? [] };
  } catch (err) {
    // First run: file doesn't exist yet.
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { attestors: [] };
    }
    throw err;
  }
}

async function saveFile(data: AttestorsFile): Promise<void> {
  await mkdir(dirname(ATTESTORS_FILE), { recursive: true });
  await writeFile(
    ATTESTORS_FILE,
    `${JSON.stringify(data, null, 2)}\n`,
    "utf-8",
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a fresh attestor keypair and append it to the registry.
 * Returns the entry — caller persists `entry.address` on the Company record.
 */
export async function addAttestor(): Promise<AttestorEntry> {
  // 32 random bytes = ed25519 seed. The public key is derived from this.
  const privateKeyBytes = cryptoApi.getRandomValues(new Uint8Array(32));

  // extractable=true lets crypto.subtle re-export the private key later if
  // some library asks for it; harmless since the bytes are already on disk.
  const keypair = await createKeyPairFromPrivateKeyBytes(privateKeyBytes, true);
  const address = await getAddressFromPublicKey(keypair.publicKey);

  const entry: AttestorEntry = {
    address: address.toString(),
    secretKey: Array.from(privateKeyBytes),
    createdAt: new Date().toISOString(),
  };

  const file = await loadFile();

  // Defensive: a duplicate address means either a ~1-in-2^256 collision (not
  // happening) or the same bytes got added twice via some bug. Refuse rather
  // than silently overwrite — overwriting would orphan the original secret.
  if (file.attestors.some((a) => a.address === entry.address)) {
    throw new Error(`address ${entry.address} already exists in registry`);
  }

  file.attestors.push(entry);
  await saveFile(file);
  return entry;
}

/** Look up an attestor entry by its public address. Returns null if absent. */
export async function getAttestor(
  address: string,
): Promise<AttestorEntry | null> {
  const file = await loadFile();
  return file.attestors.find((a) => a.address === address) ?? null;
}

/** All attestors in the registry, in insertion order. */
export async function listAttestors(): Promise<AttestorEntry[]> {
  return (await loadFile()).attestors;
}

/**
 * Rehydrate a usable CryptoKeyPair for the given address.
 * Throws if the address isn't in the registry.
 *
 * Use this when you need the attestor to actually sign something — e.g.
 * inside start_attempt / submit_attempt flows.
 */
export async function getAttestorKeypair(
  address: string,
): Promise<CryptoKeyPair> {
  const entry = await getAttestor(address);
  if (!entry) throw new Error(`no attestor found for address ${address}`);
  return createKeyPairFromPrivateKeyBytes(
    new Uint8Array(entry.secretKey),
    true,
  );
}
