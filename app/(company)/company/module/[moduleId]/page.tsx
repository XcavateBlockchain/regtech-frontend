import Image from "next/image";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-button";
import {
  KpiStats,
  ModuleDetails,
  ModuleHeader,
  ResultsTable,
} from "@/features/module";
import { prisma } from "@/lib/prisma";

export default async function ModuleDetailsPage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    select: {
      id: true,
      name: true,
      status: true,
      description: true,
      thumbnailUrl: true,
      files: { select: { id: true, fileName: true, fileUrl: true } },
    },
  });

  if (!module) notFound();

  return (
    <div className="mx-auto flex w-full max-w-[1512px] flex-col gap-6 px-6 py-6">
      <div className="flex items-center justify-between">
        <BackLink />
      </div>

      <ModuleHeader
        module={{
          id: module.id,
          title: module.name,
          status: module.status,
          description: module.description,
        }}
      />
      <section className="grid grid-cols-1 gap-4 md:grid-cols-[360px_1fr]">
        <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
          {module.thumbnailUrl ? (
            <div className="flex flex-col gap-2 p-2">
              <Image
                src={module.thumbnailUrl}
                alt={module.name}
                width={720}
                height={480}
                unoptimized
                className="h-auto w-full rounded-md object-cover"
              />
              <a
                href={module.thumbnailUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Open thumbnail
              </a>
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center text-sm text-muted-foreground">
              No thumbnail
            </div>
          )}
        </div>
        <div className="rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Module files
          </h2>
          {module.files.length ? (
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {module.files.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="truncate text-muted-foreground">
                    {f.fileName}
                  </span>
                  <a
                    href={f.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    View
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No files uploaded.
            </p>
          )}
        </div>
      </section>
      <KpiStats />
      <ModuleDetails text={module.description} />
      <ResultsTable />
    </div>
  );
}
