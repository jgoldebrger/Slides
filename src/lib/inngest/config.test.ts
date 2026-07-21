import { afterEach, describe, expect, it } from "vitest";
import {
  assertInngestConfigured,
  isInngestConfigured,
  isInngestDev,
} from "./config";

describe("inngest config", () => {
  const originalEventKey = process.env.INNGEST_EVENT_KEY;
  const originalDev = process.env.INNGEST_DEV;

  afterEach(() => {
    if (originalEventKey === undefined) {
      delete process.env.INNGEST_EVENT_KEY;
    } else {
      process.env.INNGEST_EVENT_KEY = originalEventKey;
    }
    if (originalDev === undefined) {
      delete process.env.INNGEST_DEV;
    } else {
      process.env.INNGEST_DEV = originalDev;
    }
  });

  it("treats INNGEST_DEV=1 as configured", () => {
    delete process.env.INNGEST_EVENT_KEY;
    process.env.INNGEST_DEV = "1";
    expect(isInngestDev()).toBe(true);
    expect(isInngestConfigured()).toBe(true);
    expect(() => assertInngestConfigured()).not.toThrow();
  });

  it("requires INNGEST_EVENT_KEY in production mode", () => {
    delete process.env.INNGEST_DEV;
    delete process.env.INNGEST_EVENT_KEY;
    expect(isInngestConfigured()).toBe(false);
    expect(() => assertInngestConfigured()).toThrow(/INNGEST_EVENT_KEY/);
  });

  it("accepts INNGEST_EVENT_KEY", () => {
    delete process.env.INNGEST_DEV;
    process.env.INNGEST_EVENT_KEY = "test-event-key";
    expect(isInngestConfigured()).toBe(true);
  });
});
