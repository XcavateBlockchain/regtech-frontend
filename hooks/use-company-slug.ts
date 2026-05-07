"use client";

import { useParams, usePathname } from "next/navigation";

export function useCompanySlug(): string | null {
  const params = useParams<{ slug?: string }>();
  const pathname = usePathname();

  const fromParams = typeof params?.slug === "string" ? params.slug : null;
  if (fromParams) return fromParams;

  // Best-effort fallback (e.g. for non-segmented routes during transitions).
  const m = pathname.match(/^\/company\/([^/]+)(?:\/|$)/);
  return m?.[1] ?? null;
}
