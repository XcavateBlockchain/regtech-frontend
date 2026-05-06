import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  email: z.email(),
});

/**
 * Email lookup session bootstrap for learner / employee flows.
 * Replace with magic-link, OTP, or password-verified auth before production exposure.
 */
export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { email } = bodySchema.parse(json);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        userId: true,
        role: true,
        walletAddress: true,
        company: { select: { id: true } },
        employment: { select: { companyId: true } },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account for this email" },
        { status: 404 },
      );
    }

    const companyId =
      user.role === "OWNER"
        ? (user.company?.id ?? null)
        : user.role === "EMPLOYEE"
          ? (user.employment?.companyId ?? null)
          : null;

    return NextResponse.json({
      userId: user.userId,
      role: user.role,
      companyId,
      walletAddress: user.walletAddress,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/auth/login]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
