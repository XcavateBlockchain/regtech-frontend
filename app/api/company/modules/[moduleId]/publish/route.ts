import { PutObjectCommand } from "@aws-sdk/client-s3";
import type { Address } from "@solana/kit";
import { createNoopSigner } from "@solana/signers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { appEnv } from "@/constants/app-env";
import {
  findPartnerPda,
  getRegisterModuleInstructionAsync,
} from "@/generated/reg_tech";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";
import { executeViaSwigDelegate, uuidToBytes } from "@/lib/solana/admin";
import { findModulePda } from "@/lib/solana/pda";

const bodySchema = z.object({
  companyId: z.string().min(1),
  walletAddress: z.string().min(32),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  try {
    const { moduleId } = await params;
    const body = await req.json();
    const { companyId, walletAddress } = bodySchema.parse(body);

    const module = await prisma.module.findFirst({
      where: { id: moduleId, companyId, status: "DRAFT" },
    });
    if (!module?.moduleIdHash || !module.moduleCode) {
      return NextResponse.json(
        { error: "Module not found or not ready to publish" },
        { status: 404 },
      );
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { owner: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    if (!company.txConfirmed || !company.swigAddress) {
      return NextResponse.json(
        { error: "Company not yet registered on-chain" },
        { status: 400 },
      );
    }
    if (company.owner.walletAddress !== walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const actor = await prisma.user.findUnique({
      where: { walletAddress },
      select: { id: true },
    });

    const metadata = {
      name: module.name,
      description: module.description,
      category: module.category,
      language: module.language,
      completionTime: module.completionTime,
      thumbnailUrl: module.thumbnailUrl,
      credentialType: module.credentialType,
      moduleCode: module.moduleCode,
    };

    const metadataKey = `modules/${module.moduleIdHash}/metadata.json`;
    await s3.send(
      new PutObjectCommand({
        Bucket: appEnv.AWS_S3_BUCKET_NAME,
        Key: metadataKey,
        Body: JSON.stringify(metadata),
        ContentType: "application/json",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    const metadataUri = `https://${appEnv.AWS_S3_BUCKET_NAME}.s3.${appEnv.XCAV_AWS_REGION}.amazonaws.com/${metadataKey}`;

    const partnerIdBytes = uuidToBytes(company.partnerId);
    const [partnerPda] = await findPartnerPda({ partnerId: partnerIdBytes });
    const [modulePda] = await findModulePda(
      partnerIdBytes,
      module.moduleIdHash,
    );

    const ix = await getRegisterModuleInstructionAsync({
      partnerAdmin: createNoopSigner(company.swigAddress as Address),
      partner: partnerPda,
      module: modulePda,
      moduleIdHash: new Uint8Array(Buffer.from(module.moduleIdHash, "hex")),
      moduleCode: module.moduleCode,
      metadataUri,
      passThresholdBpsOverride: module.passThreshold,
      cooldownSecondsOverride: null,
      expiresInSeconds: module.expiresInSeconds ?? null,
    });

    const txHash = await executeViaSwigDelegate(
      company.swigAddress as Address,
      ix as never,
    );

    await prisma.module.update({
      where: { id: moduleId },
      data: {
        metadataUri,
        txConfirmed: true,
        txHash,
        status: "ACTIVE",
      },
    });

    if (actor) {
      await prisma.activityLog.create({
        data: {
          companyId,
          actorId: actor.id,
          type: "MODULE_PUBLISHED",
          metadata: {
            moduleId,
            moduleName: module.name,
            txHash,
          },
        },
      });
    }

    return NextResponse.json({ txHash, moduleId }, { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/company/modules/:moduleId/publish]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
