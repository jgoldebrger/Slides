"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/permissions";
import { sendWelcomeEmail } from "@/lib/email/send-welcome";
import { actionError, toPublicError } from "@/lib/errors/public-error";
import { z } from "zod";

const profileSettingsSchema = z.object({
  // Form always sends displayName (may be ""); optional() alone does not allow "".
  displayName: z.string().trim().max(100).optional(),
  notifyExportReady: z.boolean().optional(),
  notifyTeamInvites: z.boolean().optional(),
});

export async function sendWelcomeEmailAction(displayName: string) {
  const { user } = await requireUser();
  if (!user.email) return { skipped: true };
  return sendWelcomeEmail({ to: user.email, displayName });
}

export async function updateProfileSettings(payload: {
  displayName?: string;
  notifyExportReady?: boolean;
  notifyTeamInvites?: boolean;
}) {
  const parsed = profileSettingsSchema.safeParse(payload);
  if (!parsed.success) return actionError("Invalid profile settings");

  const { supabase, user } = await requireUser();

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    email: user.email,
  };

  if (parsed.data.displayName !== undefined) {
    updates.display_name = parsed.data.displayName;
  }
  if (parsed.data.notifyExportReady !== undefined) {
    updates.notify_export_ready = parsed.data.notifyExportReady;
  }
  if (parsed.data.notifyTeamInvites !== undefined) {
    updates.notify_team_invites = parsed.data.notifyTeamInvites;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) return actionError(toPublicError(error));

  if (parsed.data.displayName !== undefined) {
    await supabase.auth.updateUser({
      data: { display_name: parsed.data.displayName },
    });
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function getProfileSettings() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("profiles")
    .select("display_name, notify_export_ready, notify_team_invites, email")
    .eq("id", user.id)
    .single();

  return {
    displayName: data?.display_name ?? "",
    notifyExportReady: data?.notify_export_ready ?? true,
    notifyTeamInvites: data?.notify_team_invites ?? true,
    email: data?.email ?? user.email ?? "",
  };
}
