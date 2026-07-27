import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server Actions are capped at 4.5MB on Vercel; large uploads go direct to Supabase.
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, { silent: true })
  : nextConfig;
