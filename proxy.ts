import { type NextRequest, NextResponse } from "next/server";
import { appEnv } from "@/constants/app-env";

function getRootDomain(): string | null {
  const raw = appEnv.APP_URL;
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.host.split(":")[0] ?? null;
  } catch {
    const host = raw.replace(/^https?:\/\//, "").split("/")[0];
    return host?.split(":")?.[0] ?? null;
  }
}

function urlIncludesLocalhost(url: string) {
  return url.includes("localhost") || url.includes("127.0.0.1");
}

function extractSubdomain(request: NextRequest): string | null {
  const url = request.url;
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0];

  if (urlIncludesLocalhost(url)) {
    const fullUrlMatch = url.match(/http:\/\/([^.]+)\.localhost/);
    if (fullUrlMatch?.[1]) return fullUrlMatch[1];

    if (hostname.includes(".localhost")) return hostname.split(".")[0] || null;

    return null;
  }

  const rootDomain = getRootDomain();
  if (!rootDomain) return null;
  const rootDomainFormatted = rootDomain.split(":")[0];

  if (hostname.includes("---") && hostname.endsWith(".vercel.app")) {
    const parts = hostname.split("---");
    return parts.length > 0 ? parts[0] : null;
  }

  const isSubdomain =
    hostname !== rootDomainFormatted &&
    hostname !== `www.${rootDomainFormatted}` &&
    hostname.endsWith(`.${rootDomainFormatted}`);

  return isSubdomain ? hostname.replace(`.${rootDomainFormatted}`, "") : null;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0];
  const rootDomain = getRootDomain();

  const subdomain = extractSubdomain(request);
  if (subdomain) {
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // On a subdomain, we expect URLs like:
    // - /            (canonical) → rewrite to /company/:slug
    // - /modules     (canonical) → rewrite to /company/:slug/modules
    // If someone hits /company/:slug/* on the subdomain, avoid double-prefixing and
    // canonicalize it back to /*.
    const slugPrefix = `/company/${subdomain}`;
    if (pathname === slugPrefix || pathname.startsWith(`${slugPrefix}/`)) {
      const canonicalPath =
        pathname === slugPrefix ? "/" : pathname.slice(slugPrefix.length);
      const targetUrl = request.nextUrl.clone();
      targetUrl.pathname = canonicalPath || "/";
      return NextResponse.redirect(targetUrl, 308);
    }

    const dest = pathname === "/" ? slugPrefix : `${slugPrefix}${pathname}`;
    const url = request.nextUrl.clone();
    url.pathname = dest;
    return NextResponse.rewrite(url);
  }

  if (rootDomain) {
    const root = rootDomain.split(":")[0];
    const isRootHost = hostname === root || hostname === `www.${root}`;
    if (isRootHost) {
      const m = pathname.match(/^\/company\/([^/]+)(\/.*)?$/);
      if (m) {
        const slug = m[1];
        const rest = m[2] ?? "";
        const port = host.includes(":") ? `:${host.split(":")[1]}` : "";
        const targetHost =
          urlIncludesLocalhost(request.url) && root === "localhost"
            ? `${slug}.localhost${port}`
            : `${slug}.${root}`;

        const targetUrl = new URL(request.url);
        targetUrl.host = targetHost;
        targetUrl.pathname = rest || "/";
        targetUrl.search = search;
        return NextResponse.redirect(targetUrl, 308);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|[\\w-]+\\.\\w+).*)"],
};
