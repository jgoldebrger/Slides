import type { AiAddonFeatureId } from "@/lib/ai/addons/catalog";
import { AI_ADDON_FEATURE_IDS } from "@/lib/ai/addons/catalog";

const ENV_PREFIX = "AI_ADDON_";

function envFlag(id: string): boolean | undefined {
  const key = `${ENV_PREFIX}${id.toUpperCase()}`;
  const val = process.env[key];
  if (val === "1" || val === "true") return true;
  if (val === "0" || val === "false") return false;
  return undefined;
}

const DEFAULT_ENABLED = new Set<string>(AI_ADDON_FEATURE_IDS);

export function isAiAddonEnabled(
  id: AiAddonFeatureId,
  orgOverrides?: Record<string, boolean> | null
): boolean {
  if (orgOverrides && id in orgOverrides) {
    return Boolean(orgOverrides[id]);
  }
  const env = envFlag(id);
  if (env !== undefined) return env;
  return DEFAULT_ENABLED.has(id);
}

export function enabledAiAddons(
  orgOverrides?: Record<string, boolean> | null
): AiAddonFeatureId[] {
  return AI_ADDON_FEATURE_IDS.filter((id) => isAiAddonEnabled(id, orgOverrides));
}
