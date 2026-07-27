import { headers } from "next/headers";

function isLocalhostHost(host: string): boolean {
  const hostname = host.toLowerCase().split(":")[0];
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function normalizeOrigin(url: string): string {
  return url.replace(/\/$/, "");
}

function hostToOrigin(host: string, proto = "https"): string {
  const cleanHost = host.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `${proto}://${cleanHost}`;
}

/** Env-based origin (jobs, emails). Ignores localhost APP_URL on Vercel/production. */
export function getAppUrlFromEnv(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    const normalized = normalizeOrigin(configured);
    const isDeployed =
      process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
    if (!(isDeployed && /localhost|127\.0\.0\.1/i.test(normalized))) {
      return normalized;
    }
  }

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) {
    return hostToOrigin(productionHost);
  }

  const deploymentHost = process.env.VERCEL_URL?.trim();
  if (deploymentHost) {
    return hostToOrigin(deploymentHost);
  }

  return "http://localhost:3000";
}

/** Request-aware origin — use for share links and user-facing redirects. */
export async function getAppUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const primaryHost = host.split(",")[0]?.trim();
      if (primaryHost && !isLocalhostHost(primaryHost)) {
        const proto =
          h.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
        return normalizeOrigin(`${proto}://${primaryHost}`);
      }
    }
  } catch {
    // Outside a request (background jobs, scripts).
  }

  return getAppUrlFromEnv();
}
