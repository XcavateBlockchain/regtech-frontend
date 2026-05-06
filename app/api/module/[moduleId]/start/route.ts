import type { Address } from "@solana/kit";
import { createNoopSigner } from "@solana/signers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  findPartnerPda,
  getEnrollUserInstructionAsync,
  getStartAttemptInstructionAsync,
} from "@/generated/reg_tech";
import { prisma } from "@/lib/prisma";
import {
  executeViaSwigDelegate,
  getAttestorSigner,
  sendServerTransaction,
  uuidToBytes,
} from "@/lib/solana/admin";
import {
  findAttemptPda,
  findEnrollmentPda,
  findModulePda,
} from "@/lib/solana/pda";

const bodySchema = z.object({
  walletAddress: z.string().min(32),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  try {
    const { moduleId } = await params;
    const body = await req.json();
    const { walletAddress } = bodySchema.parse(body);

    // ── Load user ────────────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json(
        { error: "User not found — please sign up first" },
        { status: 401 },
      );
    }

    // ── Load module ──────────────────────────────────────────────────────────
    const module = await prisma.module.findFirst({
      where: { id: moduleId, status: "ACTIVE", txConfirmed: true },
      include: {
        company: { include: { owner: true } },
        assessment: {
          include: {
            batches: { select: { id: true, label: true } },
          },
        },
      },
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
    if (!module.assessment) {
      return NextResponse.json(
        { error: "Module has no assessment" },
        { status: 400 },
      );
    }

    const company = module.company;
    const partnerIdBytes = uuidToBytes(company.partnerId);
    const [partnerPda] = await findPartnerPda({ partnerId: partnerIdBytes });
    const [modulePda] = await findModulePda(
      partnerIdBytes,
      module.moduleIdHash,
    );
    const [enrollmentPda] = await findEnrollmentPda(
      walletAddress as Address,
      partnerIdBytes,
      module.moduleIdHash,
    );

    // ── Enroll user if not yet enrolled ──────────────────────────────────────
    let enrollment = await prisma.moduleEnrollment.findUnique({
      where: { moduleId_userId: { moduleId, userId: user.id } },
    });

    if (!enrollment) {
      const enrollIx = await getEnrollUserInstructionAsync({
        partnerAdmin: createNoopSigner(company.swigAddress as Address),
        user: walletAddress as Address,
        partner: partnerPda,
        module: modulePda,
        enrollment: enrollmentPda,
        reasonCode: 0,
      });
      await executeViaSwigDelegate(
        company.swigAddress as Address,
        enrollIx as never,
      );

      enrollment = await prisma.moduleEnrollment.create({
        data: {
          moduleId,
          userId: user.id,
          status: "IN_PROGRESS",
          onChainEnrollmentAddress: enrollmentPda,
        },
      });
    } else if (!enrollment.onChainEnrollmentAddress) {
      await prisma.moduleEnrollment.update({
        where: { moduleId_userId: { moduleId, userId: user.id } },
        data: {
          onChainEnrollmentAddress: enrollmentPda,
          status: "IN_PROGRESS",
        },
      });
    }

    // ── Resume existing unsubmitted attempt if any ───────────────────────────
    const existing = await prisma.assessmentAttempt.findFirst({
      where: {
        assessmentId: module.assessment.id,
        userId: user.id,
        submittedAt: null,
      },
      select: { id: true, batchId: true },
      orderBy: { startedAt: "desc" },
    });
    if (existing) {
      if (!existing.batchId) {
        return NextResponse.json(
          { error: "Attempt is missing batch assignment" },
          { status: 500 },
        );
      }

      const batch = await prisma.questionBatch.findUnique({
        where: { id: existing.batchId },
        select: {
          questions: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              text: true,
              type: true,
              sortOrder: true,
              options: {
                orderBy: { sortOrder: "asc" },
                select: { id: true, text: true, sortOrder: true },
              },
            },
          },
        },
      });
      if (!batch) {
        return NextResponse.json(
          { error: "Batch not found" },
          { status: 404 },
        );
      }
      const questions = batch.questions;
      return NextResponse.json({ attemptId: existing.id, questions });
    }

    // ── Count previous attempts to set attempt number ────────────────────────
    const attemptCount = await prisma.assessmentAttempt.count({
      where: { assessmentId: module.assessment.id, userId: user.id },
    });
    const attemptNumber = attemptCount + 1;

    // ── Derive attempt PDA + start on-chain ──────────────────────────────────
    const [attemptPda] = await findAttemptPda(
      walletAddress as Address,
      partnerIdBytes,
      module.moduleIdHash,
    );

    const attestorSigner = await getAttestorSigner(company.attestor as string);
    const startIx = await getStartAttemptInstructionAsync({
      attestor: attestorSigner,
      user: walletAddress as Address,
      partner: partnerPda,
      module: modulePda,
      enrollment: (enrollment.onChainEnrollmentAddress ??
        enrollmentPda) as Address,
      attempt: attemptPda,
    });
    await sendServerTransaction(attestorSigner, [startIx]);

    const batches = module.assessment.batches;
    const randomBatch = batches[Math.floor(Math.random() * batches.length)];
    if (!randomBatch) {
      return NextResponse.json(
        { error: "Module has no question batches" },
        { status: 400 },
      );
    }

    // ── Create attempt DB record ──────────────────────────────────────────────
    const attempt = await prisma.assessmentAttempt.create({
      data: {
        assessmentId: module.assessment.id,
        userId: user.id,
        attemptNumber,
        onChainAttemptAddress: attemptPda,
        batchId: randomBatch.id,
      },
    });

    const batch = await prisma.questionBatch.findUnique({
      where: { id: randomBatch.id },
      select: {
        questions: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            text: true,
            type: true,
            sortOrder: true,
            options: {
              orderBy: { sortOrder: "asc" },
              select: { id: true, text: true, sortOrder: true },
            },
          },
        },
      },
    });
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }
    const questions = batch.questions;

    return NextResponse.json({ attemptId: attempt.id, questions });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/module/:moduleId/start]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
