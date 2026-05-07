import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  userId: z.string().min(8),
});

type AttemptRow = {
  id: string;
  startedAt: Date;
  submittedAt: Date | null;
  score: number | null;
  onChainScoreBps: number | null;
  passed: boolean | null;
  assessment: { moduleId: string };
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const { userId } = querySchema.parse({
      userId: searchParams.get("userId") ?? "",
    });

    const user = await prisma.user.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        walletAddress: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const enrollments = await prisma.moduleEnrollment.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        status: true,
        joinedAt: true,
        updatedAt: true,
        finalScoreBps: true,
        completedAt: true,
        credentialId: true,
        module: {
          select: {
            id: true,
            name: true,
            thumbnailUrl: true,
            company: { select: { name: true } },
          },
        },
      },
    });

    const moduleIds = enrollments.map((e) => e.module.id);
    if (moduleIds.length === 0) {
      return NextResponse.json(
        {
          user,
          modules: [],
          credentials: { ACTIVE: [], REVOKED: [], EXPIRED: [] },
        },
        { status: 200 },
      );
    }

    const attempts = await prisma.assessmentAttempt.findMany({
      where: {
        userId: user.id,
        assessment: { moduleId: { in: moduleIds } },
      },
      select: {
        id: true,
        assessment: { select: { moduleId: true } },
        startedAt: true,
        submittedAt: true,
        score: true,
        onChainScoreBps: true,
        passed: true,
      },
      orderBy: { startedAt: "desc" },
    });

    const credentials = await prisma.credential.findMany({
      where: { recipientId: user.id, moduleId: { in: moduleIds } },
      select: {
        id: true,
        moduleId: true,
        status: true,
        issuedAt: true,
        metadataUri: true,
        scoreBps: true,
      },
      orderBy: { issuedAt: "desc" },
    });

    const attemptsByModule = new Map<string, AttemptRow[]>();
    for (const a of attempts as AttemptRow[]) {
      const list = attemptsByModule.get(a.assessment.moduleId) ?? [];
      list.push(a);
      attemptsByModule.set(a.assessment.moduleId, list);
    }

    const credentialByModule = new Map<string, (typeof credentials)[number]>();
    for (const c of credentials) {
      if (c.moduleId && !credentialByModule.has(c.moduleId)) {
        credentialByModule.set(c.moduleId, c);
      }
    }

    const credentialGroups = {
      ACTIVE: credentials.filter((c) => c.status === "ACTIVE"),
      REVOKED: credentials.filter((c) => c.status === "REVOKED"),
      EXPIRED: credentials.filter((c) => c.status === "EXPIRED"),
    } as const;

    const modules = enrollments
      .map((e) => {
        const moduleAttempts = attemptsByModule.get(e.module.id) ?? [];
        const lastAttempt = moduleAttempts[0] ?? null;
        const submitted = moduleAttempts.filter((a) => a.submittedAt);
        const avgScoreBps =
          submitted.length > 0
            ? Math.round(
                submitted.reduce(
                  (sum, a) => sum + (a.onChainScoreBps ?? 0),
                  0,
                ) / submitted.length,
              )
            : null;
        const bestScoreBps = moduleAttempts.reduce<number | null>((best, a) => {
          const v = a.onChainScoreBps;
          if (typeof v !== "number") return best;
          if (best === null) return v;
          return Math.max(best, v);
        }, null);

        const lastActivity =
          lastAttempt?.startedAt ?? e.completedAt ?? e.updatedAt ?? e.joinedAt;

        const cred = credentialByModule.get(e.module.id) ?? null;

        return {
          moduleId: e.module.id,
          moduleName: e.module.name,
          companyName: e.module.company.name,
          thumbnailUrl: e.module.thumbnailUrl,
          status: e.status,
          attemptsUsed: moduleAttempts.length,
          avgScoreBps,
          lastAttempt: lastAttempt
            ? {
                attemptId: lastAttempt.id,
                startedAt: lastAttempt.startedAt,
                submittedAt: lastAttempt.submittedAt,
                score: lastAttempt.score,
                scoreBps: lastAttempt.onChainScoreBps,
                passed: lastAttempt.passed,
              }
            : null,
          bestScoreBps,
          credential: cred
            ? {
                id: cred.id,
                status: cred.status,
                issuedAt: cred.issuedAt,
                metadataUri: cred.metadataUri,
                scoreBps: cred.scoreBps,
              }
            : null,
          lastActivity,
        };
      })
      .sort((a, b) => {
        const at = new Date(a.lastActivity).getTime();
        const bt = new Date(b.lastActivity).getTime();
        return bt - at;
      });

    return NextResponse.json(
      {
        user,
        modules,
        credentials: credentialGroups,
      },
      { status: 200 },
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[GET /api/user/dashboard]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
