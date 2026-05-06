import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  try {
    const { moduleId } = await params;
    const walletAddress = new URL(req.url).searchParams.get("walletAddress");

    const module = await prisma.module.findFirst({
      where: { id: moduleId, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        thumbnailUrl: true,
        completionTime: true,
        language: true,
        passThreshold: true,
        assessment: {
          select: {
            id: true,
            _count: { select: { batches: true } },
            batches: {
              take: 1,
              orderBy: { sortOrder: "asc" },
              select: {
                label: true,
                questions: { select: { points: true } },
              },
            },
          },
        },
      },
    });

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    let enrollment = null;
    if (walletAddress) {
      const user = await prisma.user.findUnique({
        where: { walletAddress },
        select: { id: true },
      });
      if (user) {
        const enroll = await prisma.moduleEnrollment.findUnique({
          where: { moduleId_userId: { moduleId, userId: user.id } },
          select: { status: true },
        });
        if (enroll) {
          const attempt = await prisma.assessmentAttempt.findFirst({
            where: {
              assessment: { moduleId },
              userId: user.id,
              submittedAt: null,
            },
            select: { id: true },
            orderBy: { startedAt: "desc" },
          });
          enrollment = {
            status: enroll.status,
            activeAttemptId: attempt?.id ?? null,
          };
        }
      }
    }

    return NextResponse.json({
      module: {
        id: module.id,
        name: module.name,
        description: module.description,
        category: module.category,
        thumbnailUrl: module.thumbnailUrl,
        completionTime: module.completionTime,
        language: module.language,
        passThreshold: module.passThreshold,
        quiz: {
          batchCount: module.assessment?._count.batches ?? 0,
          pointsPerBatch:
            module.assessment?.batches[0]?.questions.reduce(
              (sum, q) => sum + q.points,
              0,
            ) ?? 0,
          sampleBatchLabel: module.assessment?.batches[0]?.label ?? null,
        },
      },
      enrollment,
    });
  } catch (e) {
    console.error("[GET /api/module/:moduleId]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
