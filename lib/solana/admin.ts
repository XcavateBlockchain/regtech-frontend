import { createCollectionV1, createV2 } from "@metaplex-foundation/mpl-core";
import {
  createSignerFromKeypair,
  generateSigner,
  keypairIdentity,
  publicKey as umiPublicKey,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  type Address,
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  type Instruction,
  type KeyPairSigner,
  pipe,
  setTransactionMessageLifetimeUsingBlockhash,
} from "@solana/kit";
import {
  setTransactionMessageFeePayerSigner,
  signTransactionMessageWithSigners,
} from "@solana/signers";
import { getBase64EncodedWireTransaction } from "@solana/transactions";
import { Keypair } from "@solana/web3.js";
import {
  fetchSwig,
  getSignInstructions,
  getSwigWalletAddress,
  type Swig,
} from "@swig-wallet/kit";
import { appEnv } from "@/constants/app-env";
import { getAttestor } from "@/lib/attestor";

const { SOLANA_RPC_URL: RPC_URL } = appEnv;

// ─── Keypair loading ──────────────────────────────────────────────────────────

function loadKeypairBytes(envVar: string): Uint8Array {
  const raw = process.env[envVar];
  if (!raw) throw new Error(`Missing env var: ${envVar}`);
  if (raw.trimStart().startsWith("[")) {
    return new Uint8Array(JSON.parse(raw) as number[]);
  }
  throw new Error(`${envVar} must be a JSON array of 64 bytes`);
}

let _adminSigner: KeyPairSigner | null = null;
let _delegateSigner: KeyPairSigner | null = null;

export async function getAdminSigner(): Promise<KeyPairSigner> {
  if (!_adminSigner)
    _adminSigner = await createKeyPairSignerFromBytes(
      loadKeypairBytes("XCAVATE_ADMIN_PRIVATE_KEY"),
    );
  return _adminSigner;
}

/**
 * Loads a per-company attestor signer from the local attestor registry.
 * The Company record stores the attestor public address (base58) and we
 * look up the corresponding private bytes in `keys/attestors.json`.
 */
export async function getAttestorSigner(
  attestorAddress: string,
): Promise<KeyPairSigner> {
  const entry = await getAttestor(attestorAddress);
  if (!entry) {
    throw new Error(`No attestor found for address ${attestorAddress}`);
  }
  const raw = new Uint8Array(entry.secretKey);
  // Our attestor registry stores a 32-byte Ed25519 seed; expand to the
  // 64-byte Solana secret key bytes expected by createKeyPairSignerFromBytes.
  const keypairBytes =
    raw.byteLength === 32 ? Keypair.fromSeed(raw).secretKey : raw;
  return createKeyPairSignerFromBytes(keypairBytes);
}

export async function getDelegateSigner(): Promise<KeyPairSigner> {
  if (!_delegateSigner)
    _delegateSigner = await createKeyPairSignerFromBytes(
      loadKeypairBytes("PARTNER_DELEGATE_PRIVATE_KEY"),
    );
  return _delegateSigner;
}

export async function getDelegateAddress(): Promise<Address> {
  return (await getDelegateSigner()).address;
}

// ─── UUID → bytes ─────────────────────────────────────────────────────────────

export function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, "");
  if (hex.length !== 32) throw new Error(`Invalid UUID: ${uuid}`);
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// ─── Transaction helpers ──────────────────────────────────────────────────────

/** Polls getSignatureStatuses until the tx is confirmed or times out (30s). */
async function waitForConfirmation(
  rpc: ReturnType<typeof createSolanaRpc>,
  signature: string,
): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    const { value } = await rpc
      .getSignatureStatuses(
        [signature as Parameters<typeof rpc.getSignatureStatuses>[0][0]],
        { searchTransactionHistory: false },
      )
      .send();
    const status = value[0];
    if (
      status &&
      (status.confirmationStatus === "confirmed" ||
        status.confirmationStatus === "finalized")
    ) {
      if (status.err)
        throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
      return;
    }
  }
  throw new Error(`Transaction ${signature} not confirmed within 30s`);
}

/** Build, sign, send, and confirm a transaction. Returns the signature string. */
export async function sendServerTransaction(
  signer: KeyPairSigner,
  instructions: Instruction[],
): Promise<string> {
  const rpc = createSolanaRpc(RPC_URL);
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

  const signedTx = await pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(signer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    (m) => appendTransactionMessageInstructions(instructions, m),
    (m) => signTransactionMessageWithSigners(m),
  );

  const wireTransaction = getBase64EncodedWireTransaction(signedTx);
  const signature = await rpc
    .sendTransaction(wireTransaction, {
      encoding: "base64",
      skipPreflight: false,
    })
    .send();

  await waitForConfirmation(rpc, String(signature));
  return String(signature);
}

// ─── Swig delegate signing ────────────────────────────────────────────────────

/**
 * Finds the role ID in the Swig account whose Ed25519 authority matches
 * the PARTNER_DELEGATE_KEY pubkey.
 */
export async function findDelegateRoleId(swig: Swig): Promise<number> {
  const delegateAddr = await getDelegateAddress();
  for (const role of swig.roles) {
    const auth = role.authority;
    // Ed25519Authority exposes addressString (base58)
    if (
      "addressString" in auth &&
      (auth as { addressString: string }).addressString === delegateAddr
    ) {
      return role.id;
    }
  }
  throw new Error(
    "Delegate role not found in Swig account. Ensure company completed Step 3b during registration.",
  );
}

/**
 * Fetches the Swig account, wraps the instruction with the server delegate role,
 * signs with PARTNER_DELEGATE_KEY, and broadcasts the transaction.
 */
export async function executeViaSwigDelegate(
  swigAddress: Address,
  instruction: Instruction,
): Promise<string> {
  // fetchSwig expects Rpc<GetAccountInfoApi> from swig's bundled @solana/kit v2.
  // Our createSolanaRpc returns a v6 Rpc — structurally compatible at runtime.
  const rpc = createSolanaRpc(RPC_URL) as never;
  const delegateSigner = await getDelegateSigner();

  const swigAccount = await fetchSwig(rpc, swigAddress);
  if (process.env.NODE_ENV !== "production") {
    const swigWalletAddress = await getSwigWalletAddress(swigAccount);
    console.log("[swig] delegate execution", {
      swigAddress: String(swigAddress),
      swigVersion: swigAccount.accountVersion(),
      swigWalletAddress: String(swigWalletAddress),
    });
  }
  const roleId = await findDelegateRoleId(swigAccount);

  // getSignInstructions returns KitInstruction[] (swig v2 types) — same runtime shape as v6 Instruction
  const signIxs = (await getSignInstructions(swigAccount, roleId, [
    instruction as never,
  ])) as unknown as Instruction[];

  return sendServerTransaction(delegateSigner, signIxs);
}

/**
 * In Swig v2, the program signs CPIs as the Swig "system wallet" PDA (not the
 * Swig account PDA). In v1, the Swig account PDA is the wallet.
 *
 * Use this helper whenever passing a `partner_admin` account to the regtech program.
 */
export async function getPartnerAdminAddress(
  swigAddress: Address,
): Promise<Address> {
  const rpc = createSolanaRpc(RPC_URL) as never;
  const swigAccount = await fetchSwig(rpc, swigAddress);
  return (await getSwigWalletAddress(swigAccount)) as Address;
}

// ─── mpl-core collection creation ────────────────────────────────────────────

/**
 * Creates an mpl-core Collection.
 * updateAuthority must be the Partner PDA so the regtech program can verify ownership.
 * Admin pays for the account.
 */
export async function createCredentialCollection(
  companyName: string,
  updateAuthority: Address,
): Promise<Address> {
  const adminBytes = loadKeypairBytes("XCAVATE_ADMIN_PRIVATE_KEY");

  const umi = createUmi(RPC_URL);

  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(adminBytes);
  umi.use(keypairIdentity(createSignerFromKeypair(umi, umiKeypair)));

  const collectionSigner = generateSigner(umi);

  await createCollectionV1(umi, {
    collection: collectionSigner,
    name: `${companyName} Credentials`,
    uri: "",
    updateAuthority: umiPublicKey(updateAuthority as string),
  }).sendAndConfirm(umi, { confirm: { commitment: "confirmed" } });

  return collectionSigner.publicKey as unknown as Address;
}

/**
 * Mints a new mpl-core asset into the company's credential collection.
 * Admin keypair signs (it is the collection updateAuthority).
 * Returns the new asset address.
 */
export async function mintCredentialNft(
  collectionAddress: Address,
  recipientWallet: Address,
  name: string,
  metadataUri: string,
): Promise<Address> {
  const adminBytes = loadKeypairBytes("XCAVATE_ADMIN_PRIVATE_KEY");

  const umi = createUmi(RPC_URL);
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(adminBytes);
  umi.use(keypairIdentity(createSignerFromKeypair(umi, umiKeypair)));

  const assetSigner = generateSigner(umi);

  await createV2(umi, {
    asset: assetSigner,
    collection: umiPublicKey(collectionAddress),
    owner: umiPublicKey(recipientWallet),
    name,
    uri: metadataUri,
  }).sendAndConfirm(umi, { confirm: { commitment: "confirmed" } });

  return assetSigner.publicKey as unknown as Address;
}
