import { createHash } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { z } from "zod";
import { appEnv } from "@/constants/app-env";
import { batches as customersBatches } from "@/constants/customers-batch";
import { batches as regulatorsBatches } from "@/constants/regulators.batch";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";

function totalPointsForBatch(batch: { questions: { points: number }[] }) {
  return batch.questions.reduce((sum, q) => sum + q.points, 0);
}

function validateEqualBatchPoints(bank: { id: string; questions: { points: number }[] }[]) {
  if (!bank.length) return { ok: false as const, reason: "No batches available" };
  const totals = bank.map((b) => ({ id: b.id, total: totalPointsForBatch(b) }));
  const expected = totals[0]?.total ?? 0;
  const mismatch = totals.find((t) => t.total !== expected);
  if (mismatch) {
    return {
      ok: false as const,
      reason: `Batch point mismatch: expected ${expected}, got ${mismatch.total} in ${mismatch.id}`,
    };
  }
  return { ok: true as const, totalPoints: expected };
}

const dataSchema = z.object({
  mode: z.enum(["manual", "ai"]),
  title: z.string().min(3).max(120),
  description: z.string().min(3).max(500),
  category: z.enum(["securities", "aml", "kyc", "defi", "tax"]),
  completionTime: z.enum(["15", "30", "45", "60", "90"]),
  language: z.enum(["en", "es", "fr", "de", "zh"]),
  passingScore: z.coerce.number().int().min(1).max(100),
  recipients: z.coerce.number().int().min(1).max(10000),
  moduleType: z.enum(["employee", "user"]),
});

async function uploadToS3(key: string, file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  await s3.send(
    new PutObjectCommand({
      Bucket: appEnv.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return `https://${appEnv.AWS_S3_BUCKET_NAME}.s3.${appEnv.XCAV_AWS_REGION}.amazonaws.com/${key}`;
}

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

    const modules = await prisma.module.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        category: true,
        status: true,
        thumbnailUrl: true,
        txConfirmed: true,
      },
    });

    return NextResponse.json({ modules }, { status: 200 });
  } catch (e) {
    console.error("[GET /api/company/modules]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const companyId = fd.get("companyId") as string | null;
    const walletAddress = fd.get("walletAddress") as string | null;
    const thumbnail = fd.get("thumbnail") as File | null;
    const contents = fd.getAll("contents") as File[];
    const rawData = fd.get("data") as string | null;

    if (!companyId || !walletAddress || !thumbnail || !rawData) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const data = dataSchema.parse(JSON.parse(rawData));

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

    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const moduleCode = `${slug}-${crypto.randomUUID().slice(0, 8)}`;
    const moduleIdHash = createHash("sha256").update(moduleCode).digest("hex");

    const ext = thumbnail.name.split(".").pop() ?? "jpg";
    const thumbnailUrl = await uploadToS3(
      `modules/${moduleIdHash}/thumbnail.${ext}`,
      thumbnail,
    );

    const fileUrls: { url: string; file: File }[] = [];
    for (let i = 0; i < contents.length; i++) {
      const f = contents[i];
      const fext = f.name.split(".").pop() ?? "bin";
      const url = await uploadToS3(
        `modules/${moduleIdHash}/content-${i}.${fext}`,
        f,
      );
      fileUrls.push({ url, file: f });
    }

    const bank =
      data.moduleType === "employee" ? regulatorsBatches : customersBatches;
    const bankValidation = validateEqualBatchPoints(bank);
    if (!bankValidation.ok) {
      return NextResponse.json(
        { error: "Invalid quiz bank", details: bankValidation.reason },
        { status: 500 },
      );
    }

    const actor = await prisma.user.findUnique({
      where: { walletAddress },
      select: { id: true },
    });

    const module = await prisma.module.create({
      data: {
        companyId,
        name: data.title,
        description: data.description,
        category: data.category,
        language: data.language,
        completionTime: data.completionTime,
        thumbnailUrl,
        moduleCode,
        moduleIdHash,
        moduleType: data.moduleType === "employee" ? "EMPLOYEE" : "USER",
        passThreshold: data.passingScore * 100,
        coolDownSeconds: 0,
        maxRecipients: data.recipients,
        status: "DRAFT",
        credentialType: data.category.toUpperCase(),
        files: {
          create: fileUrls.map(({ url, file }, i) => ({
            fileName: file.name,
            fileUrl: url,
            fileSize: file.size,
            mimeType: file.type,
            sortOrder: i,
          })),
        },
        assessment: {
          create: {
            title: data.title,
            batches: {
              create: bank.map((b, batchIndex) => ({
                label: b.id,
                sortOrder: batchIndex,
                questions: {
                  create: b.questions.map((q) => ({
                    text: q.text,
                    type: q.type,
                    explanation: q.explanation,
                    points: q.points,
                    sortOrder: q.sortOrder,
                    options: {
                      create: q.options.map((o) => ({
                        text: o.text,
                        isCorrect: o.isCorrect,
                        sortOrder: o.sortOrder,
                      })),
                    },
                  })),
                },
              })),
            },
          },
        },
      },
    });

    if (actor) {
      await prisma.activityLog.create({
        data: {
          companyId,
          actorId: actor.id,
          type: "MODULE_CREATED",
          metadata: {
            moduleId: module.id,
            moduleName: module.name,
          },
        },
      });
    }

    return NextResponse.json({ moduleId: module.id }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/company/modules]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
