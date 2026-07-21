"use server";

import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email/send-welcome";
import { requireUser } from "@/lib/permissions";
import { assertAuthRateLimit, RateLimitError } from "@/lib/rate-limit";
import { passwordSchema } from "@/lib/validations";
import { toPublicError, PublicError } from "@/lib/errors/public-error";
import { z } from "zod";

const emailSchema = z.string().email();

function authPublicError(message: string | undefined, fallback: string) {
  if (!message) return fallback;
  // Keep intentional auth UX strings; strip infra leaks
  if (/invalid login|email not confirmed|user already|password/i.test(message)) {
    return message;
  }
  return toPublicError(new PublicError(fallback));
}

export async function signInAction(email: string, password: string) {
  const parsedEmail = emailSchema.safeParse(email.trim());
  if (!parsedEmail.success) return { error: "Enter a valid email" };

  try {
    await assertAuthRateLimit("auth_login", parsedEmail.data);
  } catch (err) {
    if (err instanceof RateLimitError) return { error: err.message };
    return { error: "Too many attempts. Try again later." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsedEmail.data,
    password,
  });
  if (error) return { error: authPublicError(error.message, "Could not sign in") };
  return { success: true as const };
}

export async function signUpAction(input: {
  email: string;
  password: string;
  displayName: string;
}) {
  const parsedEmail = emailSchema.safeParse(input.email.trim());
  if (!parsedEmail.success) return { error: "Enter a valid email" };

  const parsedPassword = passwordSchema.safeParse(input.password);
  if (!parsedPassword.success) {
    return {
      error: parsedPassword.error.issues[0]?.message ?? "Invalid password",
    };
  }

  const displayName = input.displayName.trim();
  if (!displayName) return { error: "Name is required" };

  try {
    await assertAuthRateLimit("auth_signup", parsedEmail.data);
  } catch (err) {
    if (err instanceof RateLimitError) return { error: err.message };
    return { error: "Too many attempts. Try again later." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsedEmail.data,
    password: parsedPassword.data,
    options: {
      data: { display_name: displayName },
    },
  });
  if (error) return { error: authPublicError(error.message, "Could not create account") };
  return { success: true as const, email: parsedEmail.data };
}

export async function requestPasswordResetAction(email: string) {
  const parsedEmail = emailSchema.safeParse(email.trim());
  if (!parsedEmail.success) return { error: "Enter a valid email" };

  try {
    await assertAuthRateLimit("auth_reset", parsedEmail.data);
  } catch (err) {
    if (err instanceof RateLimitError) return { error: err.message };
    return { error: "Too many attempts. Try again later." };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  // Always return success to avoid email enumeration. Supabase sends the mail.
  await supabase.auth.resetPasswordForEmail(parsedEmail.data, {
    redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });

  return {
    success: true as const,
    message:
      "If an account exists for that email, you will receive reset instructions.",
  };
}

export async function updatePasswordAction(password: string) {
  const parsedPassword = passwordSchema.safeParse(password);
  if (!parsedPassword.success) {
    return {
      error: parsedPassword.error.issues[0]?.message ?? "Invalid password",
    };
  }

  const { user } = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsedPassword.data,
  });
  if (error) return { error: authPublicError(error.message, "Could not update password") };

  await supabase
    .from("profiles")
    .update({
      email: user.email,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  return { success: true as const };
}

/** Welcome email only for the authenticated user's own address. */
export async function sendWelcomeEmailOnSignup(
  email: string,
  displayName: string
) {
  try {
    const { user } = await requireUser();
    if (!user.email || user.email.toLowerCase() !== email.trim().toLowerCase()) {
      return { error: "Unauthorized" };
    }
    return sendWelcomeEmail({ to: user.email, displayName });
  } catch {
    return { error: "Unauthorized" };
  }
}
