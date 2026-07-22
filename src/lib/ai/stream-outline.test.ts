import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildOutlineStreamContext } from "@/lib/ai/stream-outline";
import { NO_PROJECT_CONTENT_MESSAGE } from "@/lib/ai/no-project-content-error";

const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/ai/load-org-tone", () => ({
  loadOrgAiTone: vi.fn().mockResolvedValue("executive"),
}));

vi.mock("@/lib/ai/load-deck-audience", () => ({
  loadDeckAudience: vi.fn().mockResolvedValue("general"),
}));

vi.mock("@/lib/ai/load-org-deck-style", () => ({
  loadOrgDeckStyle: vi.fn().mockResolvedValue(null),
}));

describe("buildOutlineStreamContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let call = 0;
    mockSingle.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return Promise.resolve({
          data: {
            id: "deck-1",
            org_id: "org-1",
            project_id: "proj-1",
            type: "project_status",
            metadata: {},
            outline: null,
          },
          error: null,
        });
      }
      if (call === 2) {
        return Promise.resolve({
          data: { name: "Acme", description: null },
          error: null,
        });
      }
      if (call === 3) {
        return Promise.resolve({ data: {}, error: null });
      }
      return Promise.resolve({ count: 0, error: null });
    });
    mockSelect.mockImplementation((cols: string, opts?: { count?: string }) => {
      if (opts?.count) {
        return {
          eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
        };
      }
      return { eq: vi.fn(() => ({ single: mockSingle })) };
    });
  });

  it("throws when filtered project updates are empty", async () => {
    await expect(buildOutlineStreamContext("deck-1")).rejects.toThrow(
      NO_PROJECT_CONTENT_MESSAGE
    );
  });
});
