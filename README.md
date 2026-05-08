# Regtech Frontend

Next.js 16 + Solana app for issuing and verifying training credentials. The frontend talks to an [Anchor program](https://github.com/XcavateBlockchain/regtech-contracts) (`Smart Contracts`) through a Codama-generated TypeScript client and signs on-chain operations through per-company Swig wallets.

For a deep dive on how the wallet/on-chain stack fits together, see [`notes/wallet-stack.md`](./notes/wallet-stack.md). For product-side roles and flows see [`DEMO_GUIDE.md`](./DEMO_GUIDE.md).

## Stack

| Layer | Package(s) | Where it lives |
|---|---|---|
| Anchor IDL | n/a (artifact) | [`anchor/idl/regtech.json`](./anchor/idl/regtech.json) |
| Codama-generated client | `codama`, `@codama/renderers-js` | Config: [`codama.json`](./codama.json) → output: [`generated/reg_tech/`](./generated/reg_tech) |
| Solana Kit + React Hooks | `@solana/kit`, `@solana/react-hooks`, `@solana/signers`, `@solana/transactions` | RPC singleton + action hooks: [`hooks/use-contract.ts`](./hooks/use-contract.ts) |
| Phantom wallet (user) | `@phantom/react-sdk`, `@phantom/browser-sdk` | Provider: [`providers/solana-provider.tsx`](./providers/solana-provider.tsx); wallet façade: [`hooks/use-wallet-kit.ts`](./hooks/use-wallet-kit.ts) |
| Swig (company vault) | `@swig-wallet/kit` | Server signing: [`lib/solana/admin.ts`](./lib/solana/admin.ts) |

Other notable pieces: Prisma (`prisma/`, generated at `generated/prisma/`), Metaplex mpl-core for credential NFTs, AWS S3 for uploads.

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.x (lockfile is `bun.lock`)
- Postgres database (set `DATABASE_URL`)
- Phantom App ID — create at <https://phantom.com/portal> and allowlist `${NEXT_PUBLIC_APP_URL}/auth/callback`
- Solana RPC URL (devnet by default)
- A Solana keypair for the admin/attestor/Swig delegate. Generate with:

  ```bash
  solana-keygen new --no-bip39-passphrase -o ./admin.json
  ```

  Then put the JSON byte array into `XCAVATE_ADMIN_PRIVATE_KEY` and the base58 pubkey into `XCAVATE_ADMIN_PUBLIC_KEY`.

## Setup

```bash
# 1. Install deps (also runs `prisma generate` via postinstall)
bun install

# 2. Configure env
cp .env.example .env.local
# edit .env.local — see required vars below

# 3. Apply DB schema
bunx prisma migrate dev

# 4. (One-time, before first registration) Create the global mpl-core credential collection
bun run scripts/init-global-collection.ts
# Copy the printed address into XCAVATE_GLOBAL_COLLECTION_ADDRESS in .env.local

# 5. (One-time, on a fresh program) Initialize program config
bun run scripts/init-program.ts
```

Required env vars (see [`.env.example`](./.env.example) for the full list):

- `NEXT_PUBLIC_PHANTOM_APP_ID`
- `NEXT_PUBLIC_SOLANA_RPC_URL`, `NEXT_PUBLIC_SOLANA_WS_URL`
- `NEXT_PUBLIC_APP_URL`
- `XCAVATE_ADMIN_PRIVATE_KEY`, `XCAVATE_ADMIN_PUBLIC_KEY`, `XCAVATE_GLOBAL_COLLECTION_ADDRESS`
- `DATABASE_URL`
- AWS S3 vars if using uploads

## Run

```bash
# Dev server (http://localhost:3000)
bun dev

# Production build (also runs `prisma migrate deploy`)
bun run build
bun run start

# Regenerate the Codama client after the IDL changes
bun run codama:js

# Lint / format / typecheck
bun run check         # lint + typecheck
bun run lint
bun run typecheck
bun run format
bun run format:fix
```

## Layout

```
anchor/idl/regtech.json     # Anchor IDL artifact — codegen input
codama.json                 # Codama config
generated/reg_tech/         # Codama-generated TypeScript client (do not edit)
generated/prisma/           # Prisma client
providers/                  # React providers (Phantom, wallet modal, auth)
hooks/use-contract.ts       # RPC + program action hooks
hooks/use-wallet-kit.ts     # Phantom wallet façade
lib/solana/                 # Server-side admin signer, Swig delegate, PDAs
app/api/                    # Next.js route handlers (server-signed program calls)
features/                   # Feature folders (auth, company, modules, wallet, ...)
notes/wallet-stack.md       # Deep dive: Phantom + Swig + Codama + Solana Kit
DEMO_GUIDE.md               # Product-side roles and flows
```
