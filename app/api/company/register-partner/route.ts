import type { Address } from "@solana/kit";
import { none } from "@solana/options";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  findPartnerPda,
  getRegisterPartnerInstructionAsync,
} from "@/generated/reg_tech";
import { addAttestor } from "@/lib/attestor";
import { prisma } from "@/lib/prisma";
import {
  createCredentialCollection,
  getPartnerAdminAddress,
  getAdminSigner,
  getAttestorSigner,
  sendServerTransaction,
  uuidToBytes,
} from "@/lib/solana/admin";

const bodySchema = z.object({
  companyId: z.string().min(1),
  // walletAddress of the caller — used to verify they are the OWNER
  walletAddress: z.string().min(32),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { companyId, walletAddress } = bodySchema.parse(body);

    // Verify caller is the company OWNER
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { owner: true },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    if (company.owner.walletAddress !== walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (company.txConfirmed) {
      return NextResponse.json(
        { error: "Partner already registered on-chain" },
        { status: 409 },
      );
    }
    if (!company.swigAddress) {
      return NextResponse.json(
        { error: "Swig wallet not set — complete registration first" },
        { status: 400 },
      );
    }

    // Generate a fresh attestor keypair for this company if none exists yet.
    let attestorAddress = company.attestor;
    if (!attestorAddress) {
      const entry = await addAttestor();
      attestorAddress = entry.address;
      await prisma.company.update({
        where: { id: companyId },
        data: { attestor: attestorAddress },
      });
    } else {
      // Fail fast: ensure the private key is present locally before sending tx.
      await getAttestorSigner(attestorAddress);
    }

    const adminSigner = await getAdminSigner();
    const partnerIdBytes = uuidToBytes(company.partnerId);

    // Derive partner PDA
    const [partnerPda] = await findPartnerPda({ partnerId: partnerIdBytes });

    // Create mpl-core credential collection with partnerPda as updateAuthority
    const collectionAddress = await createCredentialCollection(
      company.name,
      partnerPda,
    );

    // Build register_partner instruction
    const partnerAdminWallet = await getPartnerAdminAddress(
      company.swigAddress as Address,
    );
    const registerIx = await getRegisterPartnerInstructionAsync({
      admin: adminSigner,
      partner: partnerPda,
      collection: collectionAddress,
      partnerAdmin: partnerAdminWallet,
      attestor: attestorAddress as Address,
      partnerId: partnerIdBytes,
      name: company.name,
      passThresholdBpsOverride: none(),
      cooldownSecondsOverride: none(),
    });

    // Broadcast — admin signs + pays
    const txHash = await sendServerTransaction(adminSigner, [registerIx]);

    // Update company record
    await prisma.company.update({
      where: { id: companyId },
      data: {
        collectionAddress: String(collectionAddress),
        txHash,
        txConfirmed: true,
        attestor: attestorAddress,
      },
    });

    return NextResponse.json(
      { txHash, collectionAddress: String(collectionAddress) },
      { status: 200 },
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/company/register-partner]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
