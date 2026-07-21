import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Slide } from "@/types/slide";

const mockUpload = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockFrom,
    storage: {
      from: () => ({
        upload: mockUpload,
      }),
    },
  }),
}));

vi.mock("@/lib/export/pptx", () => ({
  generatePptxBuffer: vi.fn().mockResolvedValue(Buffer.from("PK-fake-pptx")),
}));

vi.mock("@/lib/storage/images", () => ({
  getSignedStorageUrl: vi.fn().mockResolvedValue(null),
  resolveSlideImageUrl: vi.fn().mockResolvedValue(null),
  resolveSlideBackgroundUrl: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/email/send-export-ready", () => ({
  sendExportReadyEmail: vi.fn().mockResolvedValue({ skipped: true }),
}));

function chainable(data: unknown) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
    update: vi.fn().mockReturnThis(),
  };
  builder.update.mockReturnValue({
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: data
        ? { id: (data as { id?: string }).id ?? "export-1", created_by: null, notified_at: null }
        : null,
      error: null,
    }),
    single: vi.fn().mockResolvedValue({ data, error: null }),
  });
  return builder;
}

describe("runExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads PPTX and marks export completed", async () => {
    const slides: Slide[] = [
      {
        id: "s1",
        order: 0,
        type: "title",
        layout: "title",
        title: "Status",
        content: { body: "Q3" },
      },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === "exports") {
        return chainable({
          id: "export-1",
          deck_id: "deck-1",
          created_by: null,
          status: "processing",
          storage_path: null,
        });
      }
      if (table === "decks") {
        return chainable({
          id: "deck-1",
          org_id: "org-1",
          name: "Test Deck",
          apply_branding: false,
        });
      }
      if (table === "slides") {
        const b = chainable(slides.map((s) => ({
          id: s.id,
          order: s.order,
          type: s.type,
          layout: s.layout,
          title: s.title,
          content: s.content,
          speaker_notes: null,
          metadata: {},
        })));
        b.order = vi.fn().mockResolvedValue({
          data: slides.map((s) => ({
            id: s.id,
            order: s.order,
            type: s.type,
            layout: s.layout,
            title: s.title,
            content: s.content,
            speaker_notes: null,
            metadata: {},
          })),
          error: null,
        });
        return b;
      }
      if (table === "brand_kits") {
        return chainable(null);
      }
      return chainable(null);
    });

    const { runExport } = await import("@/lib/export/run-export");
    const result = await runExport("export-1", "deck-1");

    expect(result.success).toBe(true);
    expect(mockUpload).toHaveBeenCalled();
  });
});
