import { inngest } from "./client";
import { runGenerateOutline } from "@/lib/ai/generate-outline";
import { fillDeckSlides } from "@/lib/ai/fill-deck-slides";
import { refreshDeckSlides } from "@/lib/ai/refresh-deck-slides";
import { runRewriteSlide } from "@/lib/ai/rewrite-slide";
import { runSlideVisualJob } from "@/lib/ai/run-slide-visual";
import { runSlideBackgroundJob } from "@/lib/ai/run-slide-background";
import { runGenerateSpeakerNotes } from "@/lib/ai/generate-speaker-notes";
import { runDeckQa } from "@/lib/ai/run-deck-qa";
import { runChartNarrative } from "@/lib/ai/generate-chart-narrative";
import { runGenerateAltText } from "@/lib/ai/generate-alt-text";
import { runGenerateShareBlurb } from "@/lib/ai/generate-share-blurb";
import { runTranslateDeck } from "@/lib/ai/translate-deck";
import { runNarrateDeck } from "@/lib/ai/run-narrate-deck";
import { runWeeklyAutoDraft } from "@/lib/ai/weekly-auto-draft";
import { runExport } from "@/lib/export/run-export";
import { captureJobError } from "@/lib/observability/sentry";
import type { BackgroundStyle, VisualStyle } from "@/lib/ai/visuals";
import {
  deckJobEventSchema,
  exportJobEventSchema,
  parseEventData,
  rewriteSlideEventSchema,
  slideBackgroundEventSchema,
  slideVisualEventSchema,
  deckAiJobEventSchema,
  speakerNotesEventSchema,
  slideAiJobEventSchema,
  translateDeckEventSchema,
  narrateDeckEventSchema,
} from "@/lib/inngest/event-schemas";

export const generateOutlineJob = inngest.createFunction(
  {
    id: "generate-outline",
    retries: 2,
    concurrency: { limit: 1, key: "event.data.deckId" },
    triggers: [{ event: "deck/outline.generate" }],
  },
  async ({ event, step }) => {
    const data = parseEventData(
      deckJobEventSchema,
      event.data,
      "deck/outline.generate"
    );

    try {
      return await step.run("generate-outline", () =>
        runGenerateOutline(data.deckId, data.userId)
      );
    } catch (err) {
      captureJobError(err, {
        job: "deck/outline.generate",
        deckId: data.deckId,
        orgId: data.orgId,
      });
      throw err;
    }
  }
);

export const generateDeckJob = inngest.createFunction(
  {
    id: "generate-deck",
    retries: 2,
    concurrency: { limit: 1, key: "event.data.deckId" },
    triggers: [{ event: "deck/generate" }],
  },
  async ({ event, step }) => {
    const data = parseEventData(deckJobEventSchema, event.data, "deck/generate");

    try {
      return await step.run("fill-slides", () =>
        fillDeckSlides(data.deckId, data.userId)
      );
    } catch (err) {
      captureJobError(err, {
        job: "deck/generate",
        deckId: data.deckId,
        orgId: data.orgId,
      });
      throw err;
    }
  }
);

export const refreshDeckJob = inngest.createFunction(
  {
    id: "refresh-deck",
    retries: 2,
    concurrency: { limit: 1, key: "event.data.deckId" },
    triggers: [{ event: "deck/refresh" }],
  },
  async ({ event, step }) => {
    const data = parseEventData(deckJobEventSchema, event.data, "deck/refresh");

    try {
      return await step.run("refresh-slides", () =>
        refreshDeckSlides(data.deckId, data.userId, {
          revisionReason: data.revisionReason,
        })
      );
    } catch (err) {
      captureJobError(err, {
        job: "deck/refresh",
        deckId: data.deckId,
        orgId: data.orgId,
      });
      throw err;
    }
  }
);

export const exportDeckJob = inngest.createFunction(
  {
    id: "export-deck",
    retries: 2,
    concurrency: { limit: 1, key: "event.data.deckId" },
    triggers: [{ event: "deck/export" }],
  },
  async ({ event, step }) => {
    const data = parseEventData(exportJobEventSchema, event.data, "deck/export");

    try {
      return await step.run("run-export", () =>
        runExport(data.exportId, data.deckId)
      );
    } catch (err) {
      captureJobError(err, {
        job: "deck/export",
        deckId: data.deckId,
        exportId: data.exportId,
        orgId: data.orgId,
      });
      throw err;
    }
  }
);

export const rewriteSlideJob = inngest.createFunction(
  {
    id: "rewrite-slide",
    retries: 2,
    concurrency: { limit: 1, key: "event.data.slideId" },
    triggers: [{ event: "deck/slide.rewrite" }],
  },
  async ({ event, step }) => {
    const data = parseEventData(
      rewriteSlideEventSchema,
      event.data,
      "deck/slide.rewrite"
    );

    try {
      return await step.run("rewrite-slide", () =>
        runRewriteSlide({
          deckId: data.deckId,
          slideId: data.slideId,
          userId: data.userId,
          generationId: data.generationId,
          instructions: data.instructions,
        })
      );
    } catch (err) {
      captureJobError(err, {
        job: "deck/slide.rewrite",
        deckId: data.deckId,
        orgId: data.orgId,
      });
      throw err;
    }
  }
);

export const slideVisualJob = inngest.createFunction(
  {
    id: "slide-visual",
    retries: 2,
    concurrency: { limit: 1, key: "event.data.slideId" },
    triggers: [{ event: "deck/slide.visual" }],
  },
  async ({ event, step }) => {
    const data = parseEventData(
      slideVisualEventSchema,
      event.data,
      "deck/slide.visual"
    );

    try {
      return await step.run("slide-visual", () =>
        runSlideVisualJob({
          deckId: data.deckId,
          slideId: data.slideId,
          generationId: data.generationId,
          mode: data.mode,
          instructions: data.instructions,
          visualStyle: data.visualStyle as VisualStyle | undefined,
          sourcePath: data.sourcePath,
          sourceMimeType: data.sourceMimeType,
          keepAnnotations: data.keepAnnotations,
        })
      );
    } catch (err) {
      captureJobError(err, {
        job: "deck/slide.visual",
        deckId: data.deckId,
        orgId: data.orgId,
      });
      throw err;
    }
  }
);

export const slideBackgroundJob = inngest.createFunction(
  {
    id: "slide-background",
    retries: 2,
    concurrency: { limit: 1, key: "event.data.deckId" },
    triggers: [{ event: "deck/slide.background" }],
  },
  async ({ event, step }) => {
    const data = parseEventData(
      slideBackgroundEventSchema,
      event.data,
      "deck/slide.background"
    );

    try {
      return await step.run("slide-background", () =>
        runSlideBackgroundJob({
          deckId: data.deckId,
          slideId: data.slideId,
          generationId: data.generationId,
          scope: data.scope,
          instructions: data.instructions,
          style: data.style as BackgroundStyle,
          variationSeed: data.variationSeed,
        })
      );
    } catch (err) {
      captureJobError(err, {
        job: "deck/slide.background",
        deckId: data.deckId,
        orgId: data.orgId,
      });
      throw err;
    }
  }
);

export const speakerNotesJob = inngest.createFunction(
  {
    id: "speaker-notes",
    retries: 2,
    concurrency: { limit: 1, key: "event.data.deckId" },
    triggers: [{ event: "deck/speaker-notes.generate" }],
  },
  async ({ event, step }) => {
    const data = parseEventData(
      speakerNotesEventSchema,
      event.data,
      "deck/speaker-notes.generate"
    );

    try {
      return await step.run("speaker-notes", () =>
        runGenerateSpeakerNotes({
          deckId: data.deckId,
          slideId: data.slideId,
          generationId: data.generationId,
          scope: data.scope,
        })
      );
    } catch (err) {
      captureJobError(err, {
        job: "deck/speaker-notes.generate",
        deckId: data.deckId,
        orgId: data.orgId,
      });
      throw err;
    }
  }
);

export const deckQaJob = inngest.createFunction(
  {
    id: "deck-qa",
    retries: 2,
    concurrency: { limit: 1, key: "event.data.deckId" },
    triggers: [{ event: "deck/qa.run" }],
  },
  async ({ event, step }) => {
    const data = parseEventData(
      deckAiJobEventSchema,
      event.data,
      "deck/qa.run"
    );

    try {
      return await step.run("deck-qa", () =>
        runDeckQa({
          deckId: data.deckId,
          generationId: data.generationId,
        })
      );
    } catch (err) {
      captureJobError(err, {
        job: "deck/qa.run",
        deckId: data.deckId,
        orgId: data.orgId,
      });
      throw err;
    }
  }
);

export const chartNarrativeJob = inngest.createFunction(
  {
    id: "chart-narrative",
    retries: 2,
    concurrency: { limit: 1, key: "event.data.slideId" },
    triggers: [{ event: "deck/slide.chart-narrative" }],
  },
  async ({ event, step }) => {
    const data = parseEventData(
      slideAiJobEventSchema,
      event.data,
      "deck/slide.chart-narrative"
    );

    try {
      return await step.run("chart-narrative", () =>
        runChartNarrative({
          deckId: data.deckId,
          slideId: data.slideId,
          generationId: data.generationId,
        })
      );
    } catch (err) {
      captureJobError(err, {
        job: "deck/slide.chart-narrative",
        deckId: data.deckId,
        orgId: data.orgId,
      });
      throw err;
    }
  }
);

export const altTextJob = inngest.createFunction(
  {
    id: "alt-text",
    retries: 2,
    concurrency: { limit: 1, key: "event.data.slideId" },
    triggers: [{ event: "deck/slide.alt-text" }],
  },
  async ({ event, step }) => {
    const data = parseEventData(
      slideAiJobEventSchema,
      event.data,
      "deck/slide.alt-text"
    );

    try {
      return await step.run("alt-text", () =>
        runGenerateAltText({
          deckId: data.deckId,
          slideId: data.slideId,
          generationId: data.generationId,
        })
      );
    } catch (err) {
      captureJobError(err, {
        job: "deck/slide.alt-text",
        deckId: data.deckId,
        orgId: data.orgId,
      });
      throw err;
    }
  }
);

export const shareBlurbJob = inngest.createFunction(
  {
    id: "share-blurb",
    retries: 2,
    concurrency: { limit: 1, key: "event.data.deckId" },
    triggers: [{ event: "deck/share-blurb.generate" }],
  },
  async ({ event, step }) => {
    const data = parseEventData(
      deckAiJobEventSchema,
      event.data,
      "deck/share-blurb.generate"
    );

    try {
      return await step.run("share-blurb", () =>
        runGenerateShareBlurb({
          deckId: data.deckId,
          generationId: data.generationId,
        })
      );
    } catch (err) {
      captureJobError(err, {
        job: "deck/share-blurb.generate",
        deckId: data.deckId,
        orgId: data.orgId,
      });
      throw err;
    }
  }
);

export const translateDeckJob = inngest.createFunction(
  {
    id: "translate-deck",
    retries: 2,
    concurrency: { limit: 1, key: "event.data.deckId" },
    triggers: [{ event: "deck/translate" }],
  },
  async ({ event, step }) => {
    const data = parseEventData(
      translateDeckEventSchema,
      event.data,
      "deck/translate"
    );

    try {
      return await step.run("translate-deck", () =>
        runTranslateDeck({
          deckId: data.deckId,
          userId: data.userId,
          generationId: data.generationId,
          language: data.language,
        })
      );
    } catch (err) {
      captureJobError(err, {
        job: "deck/translate",
        deckId: data.deckId,
        orgId: data.orgId,
      });
      throw err;
    }
  }
);

export const narrateDeckJob = inngest.createFunction(
  {
    id: "narrate-deck",
    retries: 2,
    concurrency: { limit: 1, key: "event.data.deckId" },
    triggers: [{ event: "deck/narrate" }],
  },
  async ({ event, step }) => {
    const data = parseEventData(
      narrateDeckEventSchema,
      event.data,
      "deck/narrate"
    );

    try {
      return await step.run("narrate-deck", () =>
        runNarrateDeck({
          deckId: data.deckId,
          generationId: data.generationId,
          voice: data.voice as import("@/lib/ai/tts-voices").AiTtsVoice | undefined,
          speed: data.speed,
        })
      );
    } catch (err) {
      captureJobError(err, {
        job: "deck/narrate",
        deckId: data.deckId,
        orgId: data.orgId,
      });
      throw err;
    }
  }
);

export const weeklyAutoDraftJob = inngest.createFunction(
  {
    id: "weekly-auto-draft",
    triggers: [{ cron: "0 14 * * 1" }],
  },
  async ({ step }) => {
    return await step.run("weekly-auto-draft", () => runWeeklyAutoDraft());
  }
);

export const inngestFunctions = [
  generateOutlineJob,
  generateDeckJob,
  refreshDeckJob,
  exportDeckJob,
  rewriteSlideJob,
  slideVisualJob,
  slideBackgroundJob,
  speakerNotesJob,
  deckQaJob,
  chartNarrativeJob,
  altTextJob,
  shareBlurbJob,
  translateDeckJob,
  narrateDeckJob,
  weeklyAutoDraftJob,
];
