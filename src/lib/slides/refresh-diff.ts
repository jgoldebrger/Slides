import type { SlideSnapshot } from "@/lib/decks/revisions";

export type SlideFieldChange = {
  field: "title" | "speaker_notes" | "content";
  before: string;
  after: string;
};

export type SlideDiff = {
  slideId: string;
  order: number;
  title: string;
  changed: boolean;
  changes: SlideFieldChange[];
};

export type RefreshDiff = {
  revisionId: string;
  revision: number;
  refreshedAt: string;
  reason?: string;
  slides: SlideDiff[];
  changedCount: number;
};

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function diffSlideSnapshots({
  before,
  after,
  slideId,
}: {
  before: SlideSnapshot;
  after: {
    title: string;
    content: Record<string, unknown>;
    speaker_notes?: string | null;
  };
  slideId: string;
}): SlideDiff {
  const changes: SlideFieldChange[] = [];

  if (before.title !== after.title) {
    changes.push({
      field: "title",
      before: before.title,
      after: after.title,
    });
  }

  const beforeNotes = before.speaker_notes ?? "";
  const afterNotes = after.speaker_notes ?? "";
  if (beforeNotes !== afterNotes) {
    changes.push({
      field: "speaker_notes",
      before: beforeNotes,
      after: afterNotes,
    });
  }

  const beforeContent = stableStringify(before.content);
  const afterContent = stableStringify(after.content);
  if (beforeContent !== afterContent) {
    changes.push({
      field: "content",
      before: beforeContent,
      after: afterContent,
    });
  }

  return {
    slideId,
    order: before.order,
    title: after.title,
    changed: changes.length > 0,
    changes,
  };
}

export function buildRefreshDiff({
  revisionId,
  revision,
  refreshedAt,
  beforeSlides,
  afterSlides,
}: {
  revisionId: string;
  revision: number;
  refreshedAt: string;
  beforeSlides: SlideSnapshot[];
  afterSlides: Array<{
    id: string;
    order: number;
    title: string;
    content: Record<string, unknown>;
    speaker_notes?: string | null;
  }>;
}): RefreshDiff {
  const slides = beforeSlides.map((before) => {
    const after =
      afterSlides.find((s) => s.order === before.order) ??
      afterSlides[before.order];

    if (!after) {
      return {
        slideId: "",
        order: before.order,
        title: before.title,
        changed: true,
        changes: [
          {
            field: "content" as const,
            before: stableStringify(before.content),
            after: "",
          },
        ],
      };
    }

    return diffSlideSnapshots({
      before,
      after: {
        title: after.title,
        content: after.content,
        speaker_notes: after.speaker_notes,
      },
      slideId: after.id,
    });
  });

  const changedCount = slides.filter((s) => s.changed).length;

  return {
    revisionId,
    revision,
    refreshedAt,
    slides,
    changedCount,
  };
}
