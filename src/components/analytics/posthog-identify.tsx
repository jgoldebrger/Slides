"use client";

import { useEffect } from "react";
import { identifyUser } from "@/components/analytics/posthog-provider";

export function PostHogIdentify({
  userId,
  email,
  orgId,
}: {
  userId: string;
  email: string;
  orgId: string;
}) {
  useEffect(() => {
    identifyUser(userId, { email, org_id: orgId });
  }, [userId, email, orgId]);

  return null;
}
