import { NextResponse } from "next/server";
import { z } from "zod";
import { FundingRequestStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  companyId: z.string().min(1),
  walletAddress: z.string().min(32),
  lamports: z.string().min(1),
  dailyCapLamports: z.string().optional(),
  reason: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = bodySchema.parse(body);

    if (!/^\d+$/.test(data.lamports)) {
      return NextResponse.json(
        { error: "lamports must be an integer string" },
        { status: 400 },
      );
    }
    const lamports = BigInt(data.lamports);
    if (lamports <= 0n) {
      return NextResponse.json(
        { error: "lamports must be > 0" },
        { status: 400 },
      );
    }

    if (data.dailyCapLamports !== undefined) {
      if (!/^\d+$/.test(data.dailyCapLamports)) {
        return NextResponse.json(
          { error: "dailyCapLamports must be an integer string when set" },
          { status: 400 },
        );
      }
      if (BigInt(data.dailyCapLamports) <= 0n) {
        return NextResponse.json(
          { error: "dailyCapLamports must be > 0 when set" },
          { status: 400 },
        );
      }
    }

    const company = await prisma.company.findUnique({
      where: { id: data.companyId },
      include: { owner: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    if (company.owner.walletAddress !== data.walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const record = await prisma.fundingRequest.create({
      data: {
        companyId: data.companyId,
        requestedLamports: data.lamports,
        dailyCapLamports: data.dailyCapLamports ?? null,
        reason: data.reason ?? null,
        status: FundingRequestStatus.PENDING,
        requestedByWallet: data.walletAddress,
      },
    });

    return NextResponse.json({ requestId: record.id }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/company/fund-swig/request]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
