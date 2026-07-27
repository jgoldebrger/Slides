import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppUrlFromEnv } from "@/lib/app-url";

describe("getAppUrlFromEnv", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllEnvs();
  });

  it("uses NEXT_PUBLIC_APP_URL when configured", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com/";
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
    expect(getAppUrlFromEnv()).toBe("https://app.example.com");
  });

  it("ignores localhost NEXT_PUBLIC_APP_URL on Vercel", () => {
    vi.stubEnv("VERCEL", "1");
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "slides.example.vercel.app";
    expect(getAppUrlFromEnv()).toBe("https://slides.example.vercel.app");
  });

  it("falls back to Vercel production host", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "slides.example.vercel.app";
    delete process.env.VERCEL_URL;
    expect(getAppUrlFromEnv()).toBe("https://slides.example.vercel.app");
  });

  it("falls back to deployment host on preview", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.VERCEL_URL = "slides-preview.vercel.app";
    expect(getAppUrlFromEnv()).toBe("https://slides-preview.vercel.app");
  });

  it("uses localhost in local dev", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL;
    process.env.NODE_ENV = "development";
    expect(getAppUrlFromEnv()).toBe("http://localhost:3000");
  });
});
