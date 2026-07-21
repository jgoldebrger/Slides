export type RateLimitAction =
  | "outline"
  | "generate"
  | "export"
  | "auth_login"
  | "auth_signup"
  | "auth_reset";

const DEFAULT_LIMITS: Record<RateLimitAction, number> = {
  outline: 20,
  generate: 20,
  export: 30,
  auth_login: 20,
  auth_signup: 10,
  auth_reset: 5,
};

const WINDOW_MS = 60 * 60 * 1000;

type MemoryBucket = { count: number; windowStart: number };

const memoryStore = new Map<string, MemoryBucket>();

function getLimit(action: RateLimitAction): number {
  const envKey = `RATE_LIMIT_${action.toUpperCase()}` as keyof NodeJS.ProcessEnv;
  const fromEnv = process.env[envKey];
  if (fromEnv) {
    const parsed = Number(fromEnv);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_LIMITS[action];
}

function memoryKey(orgId: string, action: RateLimitAction) {
  return `${orgId}:${action}`;
}

function checkMemory(orgId: string, action: RateLimitAction) {
  const now = Date.now();
  const key = memoryKey(orgId, action);
  const bucket = memoryStore.get(key);
  const limit = getLimit(action);

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    memoryStore.set(key, { count: 1, windowStart: now });
    return { allowed: true as const, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    const retryAfterMs = WINDOW_MS - (now - bucket.windowStart);
    return {
      allowed: false as const,
      retryAfterMs,
      message: `Rate limit exceeded for ${action}. Try again later.`,
    };
  }

  bucket.count += 1;
  return { allowed: true as const, remaining: limit - bucket.count };
}

type BumpResult = {
  allowed: boolean;
  remaining?: number;
  retry_after_ms?: number;
};

async function checkDatabase(orgId: string, action: RateLimitAction) {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const limit = getLimit(action);
  const windowStart = new Date(Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS);

  const { data, error } = await supabase.rpc("bump_rate_limit", {
    p_org_id: orgId,
    p_action: action,
    p_window_start: windowStart.toISOString(),
    p_limit: limit,
    p_window_ms: WINDOW_MS,
  });

  if (error) throw error;

  const result = data as BumpResult;
  if (!result.allowed) {
    return {
      allowed: false as const,
      retryAfterMs: result.retry_after_ms ?? WINDOW_MS,
      message: `Rate limit exceeded for ${action}. Try again later.`,
    };
  }
  return {
    allowed: true as const,
    remaining: result.remaining ?? 0,
  };
}

async function checkAuthDatabase(
  identityKey: string,
  action: RateLimitAction
) {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const limit = getLimit(action);
  const windowStart = new Date(Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS);

  const { data, error } = await supabase.rpc("bump_auth_rate_limit", {
    p_identity_key: identityKey,
    p_action: action,
    p_window_start: windowStart.toISOString(),
    p_limit: limit,
    p_window_ms: WINDOW_MS,
  });

  if (error) throw error;

  const result = data as BumpResult;
  if (!result.allowed) {
    return {
      allowed: false as const,
      retryAfterMs: result.retry_after_ms ?? WINDOW_MS,
      message: `Rate limit exceeded for ${action}. Try again later.`,
    };
  }
  return {
    allowed: true as const,
    remaining: result.remaining ?? 0,
  };
}

export async function checkRateLimit(orgId: string, action: RateLimitAction) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      return await checkDatabase(orgId, action);
    } catch {
      return checkMemory(orgId, action);
    }
  }
  return checkMemory(orgId, action);
}

export class RateLimitError extends Error {
  retryAfterMs: number;

  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export async function assertRateLimit(orgId: string, action: RateLimitAction) {
  const result = await checkRateLimit(orgId, action);
  if (!result.allowed) {
    throw new RateLimitError(result.message, result.retryAfterMs);
  }
  return result;
}

/** Email-keyed limits for login/signup/reset — DB-backed when service role is set. */
export async function assertAuthRateLimit(
  action: "auth_login" | "auth_signup" | "auth_reset",
  identity: string
) {
  const key = `auth:${action}:${identity.trim().toLowerCase() || "unknown"}`;

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const result = await checkAuthDatabase(key, action);
      if (!result.allowed) {
        throw new RateLimitError(result.message, result.retryAfterMs);
      }
      return result;
    } catch (err) {
      if (err instanceof RateLimitError) throw err;
      // fall through to memory
    }
  }

  const result = checkMemory(key, action);
  if (!result.allowed) {
    throw new RateLimitError(result.message, result.retryAfterMs);
  }
  return result;
}
