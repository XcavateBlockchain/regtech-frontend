import type { Address } from "@solana/kit";
import { createNoopSigner } from "@solana/signers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  findPartnerPda,
  getEnrollUserInstructionAsync,
} from "@/generated/reg_tech";
import { prisma } from "@/lib/prisma";
import { executeViaSwigDelegate, uuidToBytes } from "@/lib/solana/admin";
import { findEnrollmentPda, findModulePda } from "@/lib/solana/pda";

const bodySchema = z.object({
  companyId: z.string().min(1),
  walletAddress: z.string().min(32), // caller (must be OWNER or ISSUER)
  employeeUserId: z.string().min(1), // User.id of the employee to enroll
  moduleId: z.string().min(1),
  reasonCode: z.number().int().min(0).max(255).default(0),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { companyId, walletAddress, employeeUserId, moduleId, reasonCode } =
      bodySchema.parse(body);

    // ── Load company + verify caller ─────────────────────────────────────────
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

    // Allow OWNER or any ISSUER-permission employee.
    const isOwner = company.owner.walletAddress === walletAddress;
    if (!isOwner) {
      const emp = await prisma.employee.findFirst({
        where: { companyId, user: { walletAddress }, permission: "ISSUER" },
      });
      if (!emp) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // ── Load module ──────────────────────────────────────────────────────────
    const module = await prisma.module.findFirst({
      where: { id: moduleId, companyId },
    });
    if (!module?.moduleIdHash) {
      return NextResponse.json(
        { error: "Module not found or not yet registered on-chain" },
        { status: 404 },
      );
    }

    // ── Load employee user ───────────────────────────────────────────────────
    const employeeUser = await prisma.user.findUnique({
      where: { id: employeeUserId },
    });
    if (!employeeUser) {
      return NextResponse.json(
        { error: "Employee user not found" },
        { status: 404 },
      );
    }

    // ── Derive PDAs ──────────────────────────────────────────────────────────
    const partnerIdBytes = uuidToBytes(company.partnerId);
    const [partnerPda] = await findPartnerPda({ partnerId: partnerIdBytes });
    const [modulePda] = await findModulePda(
      partnerIdBytes,
      module.moduleIdHash,
    );
    const [enrollmentPda] = await findEnrollmentPda(
      employeeUser.walletAddress as Address,
      partnerIdBytes,
      module.moduleIdHash,
    );

    // ── Build + send instruction via Swig delegate ───────────────────────────
    const ix = await getEnrollUserInstructionAsync({
      partnerAdmin: createNoopSigner(company.swigAddress as Address),
      user: employeeUser.walletAddress as Address,
      partner: partnerPda,
      module: modulePda,
      enrollment: enrollmentPda,
      reasonCode,
    });

    const txHash = await executeViaSwigDelegate(
      company.swigAddress as Address,
      ix as never,
    );

    // ── Update DB ────────────────────────────────────────────────────────────
    const employee = await prisma.employee.findFirst({
      where: { userId: employeeUserId, companyId },
    });

    if (employee) {
      await prisma.moduleAssignment.updateMany({
        where: { moduleId, employeeId: employee.id },
        data: {
          onChainEnrollmentAddress: enrollmentPda,
          status: "IN_PROGRESS",
        },
      });
    }

    return NextResponse.json(
      { txHash, enrollmentAddress: enrollmentPda },
      { status: 200 },
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/company/enroll-user]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
