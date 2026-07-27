import { createHash, randomBytes } from "crypto";
import { getAppUrl } from "@/lib/app-url";

export function generateShareToken() {
  return randomBytes(32).toString("base64url");
}

export function hashShareToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function shareViewUrl(token: string) {
  return `${getAppUrl()}/view/${token}`;
}
