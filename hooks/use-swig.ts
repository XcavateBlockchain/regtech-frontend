"use client";

import type { ISolanaChain } from "@phantom/chain-interfaces";
import { useSolana } from "@phantom/react-sdk";
import {
  AccountRole,
  type Address,
  appendTransactionMessageInstructions,
  assertIsSignature,
  compileTransaction,
  createTransactionMessage,
  type Instruction,
  isAddress,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  address as solanaAddress,
} from "@solana/kit";
import { VersionedMessage, VersionedTransaction } from "@solana/web3.js";
import {
  Actions,
  createEd25519AuthorityInfo,
  fetchSwig,
  findSwigPda,
  getAddAuthorityInstructions,
  getCreateSwigInstruction,
  type Swig,
} from "@swig-wallet/kit";
import { useCallback, useEffect, useState } from "react";
import { REGTECH_PROGRAM_ADDRESS } from "@/generated/reg_tech";
import { rpc } from "@/hooks/use-contract";

const DELEGATE_PUBKEY = process.env.NEXT_PUBLIC_PARTNER_DELEGATE_PUBKEY;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function waitForConfirmation(signature: string): Promise<void> {
  assertIsSignature(signature);
  for (let i = 0; i < 40; i++) {
    const { value } = await rpc.getSignatureStatuses([signature]).send();
    const status = value[0];
    if (status?.err)
      throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
    if (
      status?.confirmationStatus === "confirmed" ||
      status?.confirmationStatus === "finalized"
    )
      return;
    await sleep(500);
  }
  throw new Error("Transaction confirmation timeout");
}

async function sendViaPhantomTx(
  solana: ISolanaChain,
  ownerAddress: Address,
  instructions: Instruction[],
): Promise<string> {
  const {
    value: { blockhash, lastValidBlockHeight },
  } = await rpc.getLatestBlockhash().send();

  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayer(ownerAddress, m),
    (m) =>
      setTransactionMessageLifetimeUsingBlockhash(
        { blockhash, lastValidBlockHeight },
        m,
      ),
    (m) => appendTransactionMessageInstructions(instructions, m),
  );

  const compiled = compileTransaction(message);
  const unsignedTx = new VersionedTransaction(
    VersionedMessage.deserialize(
      compiled.messageBytes as unknown as Uint8Array,
    ),
  );

  // Phantom signs only — we send via our own RPC so there's no cluster mismatch.
  const signedTx = (await solana.signTransaction(
    unsignedTx,
  )) as VersionedTransaction;
  const wireBase64 = Buffer.from(signedTx.serialize()).toString("base64");

  const signature = await rpc
    .sendTransaction(wireBase64 as never, {
      encoding: "base64",
      skipPreflight: true,
    })
    .send();

  await waitForConfirmation(signature as unknown as string);
  return signature as unknown as string;
}

// ─── useCreateAndDelegateSwig ─────────────────────────────────────────────────

type CreateSwigResult = {
  swigAddress: Address;
  swigId: string; // base64-encoded 32-byte id
};

type UseCreateAndDelegateSwigReturn = {
  execute: (ownerAddress: Address) => Promise<CreateSwigResult>;
  loading: boolean;
  error: Error | null;
};

/**
 * Creates a Swig wallet and adds the xcavate server delegate as a restricted authority.
 * Requires two Phantom signatures from the owner.
 *
 * Tx 1: create Swig (owner = root authority)
 * Tx 2: add server delegate with programLimit → REGTECH_PROGRAM only
 */
export function useCreateAndDelegateSwig(): UseCreateAndDelegateSwigReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { solana } = useSolana();

  const execute = useCallback(
    async (ownerAddress: Address): Promise<CreateSwigResult> => {
      if (!DELEGATE_PUBKEY) {
        throw new Error("NEXT_PUBLIC_PARTNER_DELEGATE_PUBKEY is not set");
      }
      if (!isAddress(DELEGATE_PUBKEY)) {
        throw new Error(
          `NEXT_PUBLIC_PARTNER_DELEGATE_PUBKEY is not a valid Solana address (got ${DELEGATE_PUBKEY.length} chars, need 43-44 base58 chars). Check your .env.local.`,
        );
      }

      setLoading(true);
      setError(null);

      try {
        // ── Tx 1: Create Swig ──────────────────────────────────────────────
        const swigId = crypto.getRandomValues(new Uint8Array(32));
        const swigAddress = await findSwigPda(swigId);

        const createIx = await getCreateSwigInstruction({
          payer: ownerAddress,
          id: swigId,
          actions: Actions.set().all().get(),
          authorityInfo: createEd25519AuthorityInfo(ownerAddress),
        });

        await sendViaPhantomTx(solana, ownerAddress, [createIx as never]);

        // ── Tx 2: Add server delegate authority ────────────────────────────
        const swigAccount = await fetchSwig(rpc as never, swigAddress);
        const rootRole = swigAccount.roles[0];
        if (rootRole === undefined)
          throw new Error("Swig has no roles after creation");

        const delegateIxs = await getAddAuthorityInstructions(
          swigAccount,
          rootRole.id,
          createEd25519AuthorityInfo(DELEGATE_PUBKEY),
          Actions.set()
            .programLimit({ programId: REGTECH_PROGRAM_ADDRESS })
            .get(),
          { payer: ownerAddress },
        );

        await sendViaPhantomTx(solana, ownerAddress, delegateIxs as never[]);

        return {
          swigAddress,
          swigId: Buffer.from(swigId).toString("base64"),
        };
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [solana],
  );

  return { execute, loading, error };
}

// ─── useSwigAccount ───────────────────────────────────────────────────────────

type UseSwigAccountReturn = {
  swig: Swig | null;
  loading: boolean;
  error: Error | null;
};

/** Fetches and decodes a Swig account from its PDA address. */
export function useSwigAccount(
  swigAddress: Address | null,
): UseSwigAccountReturn {
  const [swig, setSwig] = useState<Swig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!swigAddress) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const account = await fetchSwig(rpc as never, swigAddress);
        if (!cancelled) setSwig(account);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [swigAddress]);

  return { swig, loading, error };
}

// ─── useFundSwig ──────────────────────────────────────────────────────────────

const SYSTEM_PROGRAM = solanaAddress("11111111111111111111111111111111");

function buildSolTransferInstruction(
  from: Address,
  to: Address,
  lamports: bigint,
): Instruction {
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);
  view.setUint32(0, 2, true); // Transfer instruction index
  view.setUint32(4, Number(lamports & 0xffffffffn), true);
  view.setUint32(8, Number(lamports >> 32n), true);
  return {
    programAddress: SYSTEM_PROGRAM,
    accounts: [
      { address: from, role: AccountRole.WRITABLE_SIGNER },
      { address: to, role: AccountRole.WRITABLE },
    ],
    data,
  };
}

type UseFundSwigReturn = {
  fund: (
    ownerAddress: Address,
    vaultAddress: Address,
    lamports: bigint,
  ) => Promise<string>;
  loading: boolean;
  error: Error | null;
};

export function useFundSwig(): UseFundSwigReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { solana } = useSolana();

  const fund = useCallback(
    async (
      ownerAddress: Address,
      vaultAddress: Address,
      lamports: bigint,
    ): Promise<string> => {
      setLoading(true);
      setError(null);
      try {
        const ix = buildSolTransferInstruction(
          ownerAddress,
          vaultAddress,
          lamports,
        );
        return await sendViaPhantomTx(solana, ownerAddress, [ix]);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [solana],
  );

  return { fund, loading, error };
}
