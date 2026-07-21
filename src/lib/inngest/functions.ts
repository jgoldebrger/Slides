import { inngest } from "./client";
import { runGenerateOutline } from "@/lib/ai/generate-outline";
import { fillDeckSlides } from "@/lib/ai/fill-deck-slides";
import { refreshDeckSlides } from "@/lib/ai/refresh-deck-slides";
import { runRewriteSlide } from "@/lib/ai/rewrite-slide";
import { runSlideVisualJob } from "@/lib/ai/run-slide-visual";
import { runSlideBackgroundJob } from "@/lib/ai/run-slide-background";
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
        refreshDeckSlides(data.deckId, data.userId)
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

export const inngestFunctions = [
  generateOutlineJob,
  generateDeckJob,
  refreshDeckJob,
  exportDeckJob,
  rewriteSlideJob,
  slideVisualJob,
  slideBackgroundJob,
];
