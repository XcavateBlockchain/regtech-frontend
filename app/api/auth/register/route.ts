import { NextResponse } from "next/server";
import { z } from "zod";
import { addAttestor } from "@/lib/attestor";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  walletAddress: z.string().min(32),
  name: z.string().min(1),
  email: z.email(),
  companyName: z.string().min(1).max(120),
  companySlug: z.string().min(2).max(64),
  industry: z.string().min(1),
  description: z.string().max(2000).optional(),
  swigAddress: z.string().min(32),
  swigId: z.string().min(1), // base64-encoded 32-byte id
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const attestorEntry = await addAttestor();

    // Check for duplicates
    const [existingWallet, existingEmail, existingSlug] = await Promise.all([
      prisma.user.findUnique({ where: { walletAddress: data.walletAddress } }),
      prisma.user.findUnique({ where: { email: data.email } }),
      prisma.company.findUnique({ where: { slug: data.companySlug } }),
    ]);

    if (existingWallet) {
      return NextResponse.json(
        { error: "Wallet already registered" },
        { status: 409 },
      );
    }
    if (existingEmail) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }
    if (existingSlug) {
      return NextResponse.json(
        { error: "Company URL already taken" },
        { status: 409 },
      );
    }

    // Create User + Company in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          userId: `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
          walletAddress: data.walletAddress,
          name: data.name,
          email: data.email,
          role: "OWNER",
        },
      });

      const company = await tx.company.create({
        data: {
          name: data.companyName,
          slug: data.companySlug,
          description: data.description ?? null,
          swigAddress: data.swigAddress,
          swigId: data.swigId,
          attestor: attestorEntry.address,
          txConfirmed: false,
          ownerId: user.id,
        },
      });

      return { userId: user.id, companyId: company.id };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/auth/register]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
