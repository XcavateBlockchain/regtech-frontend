import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { inviteClaimSchema } from "@/lib/validations/invite-schema";

function newExternalUserId() {
  return `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

const tokenSchema = z.object({
  token: z.string().min(8),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = tokenSchema.parse(await params);
    const json = await req.json();
    const { name, walletAddress } = inviteClaimSchema.parse(json);

    const invite = await prisma.invite.findUnique({
      where: { token },
      select: {
        id: true,
        email: true,
        companyId: true,
        permission: true,
        expiresAt: true,
        claimedAt: true,
        company: { select: { ownerId: true } },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (invite.claimedAt) {
      return NextResponse.json(
        { error: "Invite already claimed" },
        { status: 409 },
      );
    }
    const now = new Date();
    if (invite.expiresAt.getTime() <= now.getTime()) {
      return NextResponse.json({ error: "Invite expired" }, { status: 410 });
    }

    const existingByEmail = await prisma.user.findUnique({
      where: { email: invite.email },
      select: { id: true, walletAddress: true, role: true },
    });
    const existingByWallet = await prisma.user.findUnique({
      where: { walletAddress },
      select: { id: true, email: true, role: true },
    });

    if (
      existingByEmail &&
      existingByWallet &&
      existingByEmail.id !== existingByWallet.id
    ) {
      return NextResponse.json(
        { error: "Email and wallet belong to different accounts" },
        { status: 409 },
      );
    }

    if (existingByEmail && existingByEmail.role !== "EMPLOYEE") {
      return NextResponse.json(
        { error: "Email already belongs to a non-employee account" },
        { status: 409 },
      );
    }
    if (existingByWallet && existingByWallet.role !== "EMPLOYEE") {
      return NextResponse.json(
        { error: "Wallet already belongs to a non-employee account" },
        { status: 409 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = existingByEmail
        ? await tx.user.update({
            where: { id: existingByEmail.id },
            data: { name, walletAddress, role: "EMPLOYEE" },
            select: { id: true, userId: true },
          })
        : existingByWallet
          ? await tx.user.update({
              where: { id: existingByWallet.id },
              data: { name, email: invite.email, role: "EMPLOYEE" },
              select: { id: true, userId: true },
            })
          : await tx.user.create({
              data: {
                userId: newExternalUserId(),
                walletAddress,
                name,
                email: invite.email,
                role: "EMPLOYEE",
              },
              select: { id: true, userId: true },
            });

      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          companyId: invite.companyId,
          permission: invite.permission,
          inviteId: invite.id,
          invitedAt: now,
          invitedByUserId: invite.company.ownerId,
        },
        select: { id: true },
      });

      await tx.invite.update({
        where: { id: invite.id },
        data: {
          claimedAt: now,
          claimedBy: walletAddress,
          employeeId: employee.id,
        },
      });

      return { userId: user.userId, companyId: invite.companyId };
    });

    return NextResponse.json(
      { ...result, role: "EMPLOYEE" as const },
      { status: 200 },
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/invite/:token/claim]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}

