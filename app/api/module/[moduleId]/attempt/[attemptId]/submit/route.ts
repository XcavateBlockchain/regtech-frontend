import { PutObjectCommand } from "@aws-sdk/client-s3";
import type { Address } from "@solana/kit";
import { createNoopSigner } from "@solana/signers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { appEnv } from "@/constants/app-env";
import {
  findPartnerPda,
  getClaimCredentialInstructionAsync,
  getSubmitAttemptInstructionAsync,
} from "@/generated/reg_tech";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";
import {
  executeViaSwigDelegate,
  getAttestorSigner,
  sendServerTransaction,
  uuidToBytes,
} from "@/lib/solana/admin";
import { findCredentialPda, findModulePda } from "@/lib/solana/pda";

const bodySchema = z.object({
  walletAddress: z.string().min(32),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      selectedOptionIds: z.array(z.string()),
    }),
  ),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ moduleId: string; attemptId: string }> },
) {
  try {
    const { moduleId, attemptId } = await params;
    const body = await req.json();
    const { walletAddress, answers } = bodySchema.parse(body);

    // ── Load user ────────────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // ── Load attempt (must belong to user, not yet submitted) ────────────────
    const attempt = await prisma.assessmentAttempt.findFirst({
      where: { id: attemptId, userId: user.id, submittedAt: null },
      include: {
        batch: {
          include: {
            questions: {
              include: { options: true },
            },
          },
        },
      },
    });
    if (!attempt?.onChainAttemptAddress) {
      return NextResponse.json(
        { error: "Attempt not found or already submitted" },
        { status: 404 },
      );
    }

    // ── Load module + company ────────────────────────────────────────────────
    const module = await prisma.module.findFirst({
      where: { id: moduleId, status: "ACTIVE" },
      include: { company: true },
    });
    if (
      !module?.moduleIdHash ||
      !module.company.swigAddress ||
      !module.company.attestor
    ) {
      return NextResponse.json(
        { error: "Module not available" },
        { status: 404 },
      );
    }

    const company = module.company;
    const partnerIdBytes = uuidToBytes(company.partnerId);

    // ── Score answers ─────────────────────────────────────────────────────────
    const answerMap = new Map(
      answers.map((a) => [a.questionId, a.selectedOptionIds]),
    );
    let correctPoints = 0;
    let totalPoints = 0;
    const answerRows: {
      attemptId: string;
      questionId: string;
      selectedOptions: string[];
      isCorrect: boolean;
    }[] = [];

    if (!attempt.batch) {
      return NextResponse.json(
        { error: "Attempt is missing batch assignment" },
        { status: 500 },
      );
    }

    for (const question of attempt.batch.questions) {
      totalPoints += question.points;
      const selected = answerMap.get(question.id) ?? [];
      const correctOptionIds = question.options
        .filter((o) => o.isCorrect)
        .map((o) => o.id);
      const isCorrect =
        correctOptionIds.length === selected.length &&
        correctOptionIds.every((id) => selected.includes(id));
      if (isCorrect) correctPoints += question.points;
      answerRows.push({
        attemptId,
        questionId: question.id,
        selectedOptions: selected,
        isCorrect,
      });
    }

    const scoreBps =
      totalPoints > 0 ? Math.round((correctPoints / totalPoints) * 10000) : 0;
    const passed = scoreBps >= module.passThreshold;
    const score = Math.round(scoreBps / 100);

    // ── Save answers to DB ────────────────────────────────────────────────────
    await prisma.attemptAnswer.createMany({ data: answerRows });

    // ── Submit attempt on-chain via attestor ──────────────────────────────────
    const [partnerPda] = await findPartnerPda({ partnerId: partnerIdBytes });
    const [modulePda] = await findModulePda(
      partnerIdBytes,
      module.moduleIdHash,
    );

    const attestorSigner = await getAttestorSigner(company.attestor as string);
    const submitIx = await getSubmitAttemptInstructionAsync({
      attestor: attestorSigner,
      user: walletAddress as Address,
      partner: partnerPda,
      module: modulePda,
      attempt: attempt.onChainAttemptAddress as Address,
      scoreBps,
    });
    await sendServerTransaction(attestorSigner, [submitIx]);

    // ── Update attempt record ─────────────────────────────────────────────────
    await prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        score,
        passed,
        onChainScoreBps: scoreBps,
        submittedAt: new Date(),
      },
    });

    // ── Issue credential if passed ────────────────────────────────────────────
    let credentialId: string | null = null;
    if (passed && company.collectionAddress) {
      const enrollment = await prisma.moduleEnrollment.findUnique({
        where: { moduleId_userId: { moduleId, userId: user.id } },
        select: { onChainEnrollmentAddress: true },
      });
      if (enrollment?.onChainEnrollmentAddress) {
        const [credentialPda] = await findCredentialPda(
          walletAddress as Address,
          partnerIdBytes,
          module.moduleIdHash,
        );

        const metadataKey = `credentials/${module.moduleIdHash}/${user.id}.json`;
        const metadataBody = JSON.stringify({
          name: module.name,
          description: `Credential for ${module.name}`,
          batchLabel: attempt.batch.label,
          scoreBps,
          issuedAt: new Date().toISOString(),
        });
        await s3.send(
          new PutObjectCommand({
            Bucket: appEnv.AWS_S3_BUCKET_NAME,
            Key: metadataKey,
            Body: metadataBody,
            ContentType: "application/json",
          }),
        );
        const metadataUri = `https://${appEnv.AWS_S3_BUCKET_NAME}.s3.${appEnv.XCAV_AWS_REGION}.amazonaws.com/${metadataKey}`;

        const claimIx = await getClaimCredentialInstructionAsync({
          partnerAdmin: createNoopSigner(company.swigAddress as Address),
          partner: partnerPda,
          module: modulePda,
          enrollment: enrollment.onChainEnrollmentAddress as Address,
          attempt: attempt.onChainAttemptAddress as Address,
          credential: credentialPda,
          metadataUri,
        });
        const txHash = await executeViaSwigDelegate(
          company.swigAddress as Address,
          claimIx as never,
        );

        const credential = await prisma.credential.create({
          data: {
            recipientId: user.id,
            issuingCompanyId: company.id,
            issuedByUserId: company.ownerId,
            moduleId,
            onChainPartnerId: company.partnerId,
            moduleIdHash: module.moduleIdHash,
            credentialType: module.credentialType,
            metadataUri,
            scoreBps,
            onChainAddress: credentialPda,
            txSignature: txHash,
          },
        });
        credentialId = credential.id;

        await prisma.moduleEnrollment.update({
          where: { moduleId_userId: { moduleId, userId: user.id } },
          data: {
            status: "COMPLETED",
            finalScoreBps: scoreBps,
            completedAt: new Date(),
            credentialId,
          },
        });
      }
    } else if (!passed) {
      await prisma.moduleEnrollment.update({
        where: { moduleId_userId: { moduleId, userId: user.id } },
        data: { status: "FAILED" },
      });
    }

    return NextResponse.json({ passed, score, scoreBps, credentialId });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/module/:moduleId/attempt/:attemptId/submit]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
