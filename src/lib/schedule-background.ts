import { waitUntil } from "@vercel/functions";

/** Run work after the HTTP response without blocking the caller. */
export function scheduleBackgroundWork(task: () => Promise<unknown>) {
  const wrapped = task().catch((err) => {
    console.error("[background]", err);
  });

  try {
    waitUntil(wrapped);
  } catch {
    void wrapped;
  }
}
