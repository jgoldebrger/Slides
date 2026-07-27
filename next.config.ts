import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Slide image uploads allow up to 5MB; default Server Action limit is 1MB.
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, { silent: true })
  : nextConfig;
