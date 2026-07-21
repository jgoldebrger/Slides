import { PublicError } from "@/lib/errors/public-error";

const NOT_CONFIGURED_MESSAGE =
  "Background jobs are not configured. Set INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY in your deployment (Inngest dashboard → Manage → Keys, or connect the Inngest Vercel integration).";

/** Local dev with `npm run dev:all` sets INNGEST_DEV=1 and uses the Inngest Dev Server. */
export function isInngestDev(): boolean {
  return process.env.INNGEST_DEV === "1";
}

export function isInngestConfigured(): boolean {
  return Boolean(process.env.INNGEST_EVENT_KEY?.trim()) || isInngestDev();
}

export function assertInngestConfigured(): void {
  if (!isInngestConfigured()) {
    throw new PublicError(NOT_CONFIGURED_MESSAGE);
  }
}
