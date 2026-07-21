import { getAiGenerationStatus } from "@/lib/actions/ai-jobs";
import { getActionError } from "@/lib/action-result";

export type AiGenerationPollResult = {
  status: string;
  error: string | null;
  result: Record<string, unknown> | null;
};

/**
 * Polls an enqueued AI generation until completed or failed.
 */
export async function pollAiGeneration(
  deckId: string,
  generationId: string,
  opts?: { intervalMs?: number; timeoutMs?: number }
): Promise<AiGenerationPollResult> {
  const intervalMs = opts?.intervalMs ?? 1500;
  const timeoutMs = opts?.timeoutMs ?? 180_000;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const status = await getAiGenerationStatus(deckId, generationId);
    const actionError = getActionError(status);
    if (actionError) throw new Error(actionError);

    if (status.status === "completed") {
      return {
        status: status.status,
        error: null,
        result: status.result ?? null,
      };
    }

    if (status.status === "failed") {
      throw new Error(status.error ?? "Generation failed");
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Timed out waiting for AI generation");
}
