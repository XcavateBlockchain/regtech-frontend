import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress || walletAddress.length < 32) {
      return NextResponse.json(
        { error: "walletAddress required" },
        { status: 400 },
      );
    }

    const company = await prisma.company.findFirst({
      where: { owner: { walletAddress } },
      select: { id: true },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const [activeModules, credentialsIssued, employees, publicEnrolled] =
      await Promise.all([
        prisma.module.count({
          where: { companyId: company.id, status: "ACTIVE" },
        }),
        prisma.credential.count({
          where: { issuingCompanyId: company.id },
        }),
        prisma.employee.count({
          where: { companyId: company.id },
        }),
        prisma.moduleEnrollment.count({
          where: { module: { companyId: company.id } },
        }),
      ]);

    return NextResponse.json(
      { activeModules, credentialsIssued, employees, publicEnrolled },
      { status: 200 },
    );
  } catch (e) {
    console.error("[GET /api/company/stats]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
