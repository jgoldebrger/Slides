import { PublicError } from "@/lib/errors/public-error";
import {
  analyzeProjectUpdates,
  type ContentAnalysis,
} from "@/lib/ai/analyze-project-updates";

export const NO_PROJECT_CONTENT_MESSAGE =
  "Add project updates before generating a deck";

export class NoProjectContentError extends PublicError {
  constructor(message = NO_PROJECT_CONTENT_MESSAGE) {
    super(message);
    this.name = "NoProjectContentError";
  }
}

export function assertProjectContentForGeneration(
  updates: Record<string, unknown>
): ContentAnalysis {
  const analysis = analyzeProjectUpdates(updates);
  if (analysis.totalItems === 0) {
    throw new NoProjectContentError();
  }
  return analysis;
}
