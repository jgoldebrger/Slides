import { afterEach, describe, expect, it } from "vitest";
import { getAppUrl } from "@/lib/app-url";

describe("getAppUrl", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("uses NEXT_PUBLIC_APP_URL when configured", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com/";
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
    expect(getAppUrl()).toBe("https://app.example.com");
  });

  it("falls back to Vercel production host", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "slides.example.vercel.app";
    delete process.env.VERCEL_URL;
    expect(getAppUrl()).toBe("https://slides.example.vercel.app");
  });

  it("falls back to deployment host on preview", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.VERCEL_URL = "slides-preview.vercel.app";
    expect(getAppUrl()).toBe("https://slides-preview.vercel.app");
  });

  it("uses localhost in local dev", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
    expect(getAppUrl()).toBe("http://localhost:3000");
  });
});
