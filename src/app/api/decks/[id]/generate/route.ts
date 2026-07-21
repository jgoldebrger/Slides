import { enqueueDeckGeneration } from "@/lib/actions/decks";
import { handleApiError, respondFromActionResult } from "@/lib/api/response";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await enqueueDeckGeneration(id);
    return respondFromActionResult(result);
  } catch (err) {
    return handleApiError(err);
  }
}
