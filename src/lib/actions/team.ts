"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInviteEmail } from "@/lib/email/send-invite";
import { requireOrgAdmin, getUserOrg, requireUser } from "@/lib/permissions";
import { canManageTeam } from "@/lib/roles";
import {
  createInviteToken,
  hashInviteToken,
} from "@/lib/share/invite-token";
import {
  teamMemberInviteSchema,
  teamMemberUpdateSchema,
} from "@/lib/validations";
import { actionError, formError, toPublicError } from "@/lib/errors/public-error";

export type TeamMember = {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
};

function canAssignRole(actorRole: string, targetRole: string): boolean {
  if (actorRole === "owner") return true;
  if (actorRole === "admin") {
    return ["viewer", "member", "admin"].includes(targetRole);
  }
  return false;
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  const { supabase, orgId } = await requireOrgAdmin();

  const { data: members, error } = await supabase
    .from("organization_members")
    .select("id, user_id, role, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  if (error) throw new Error("Could not load team members");

  const userIds = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", userIds)
    : { data: [] };

  const profilesById = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      {
        displayName: p.display_name ?? "",
        email: (p.email as string | null) ?? "",
      },
    ])
  );

  return (members ?? []).map((m) => {
    const profile = profilesById.get(m.user_id);
    return {
      id: m.id,
      userId: m.user_id,
      email: profile?.email ?? "",
      displayName: profile?.displayName ?? "",
      role: m.role as string,
      createdAt: m.created_at,
    };
  });
}

/** Invite by email — no plaintext password. Accept via /invite/[token]. */
export async function createTeamMember(payload: unknown) {
  const parsed = teamMemberInviteSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { orgId, role: actorRole, orgName, user } = await requireOrgAdmin();
  const { email, display_name, role } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  if (!canAssignRole(actorRole, role)) {
    return { error: { _form: ["You cannot assign that role"] } };
  }

  try {
    const admin = createAdminClient();

    // Already a member?
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (existingProfile?.id) {
      const { data: existingMember } = await admin
        .from("organization_members")
        .select("id")
        .eq("org_id", orgId)
        .eq("user_id", existingProfile.id)
        .maybeSingle();
      if (existingMember) {
        return { error: { _form: ["User is already a member of this workspace"] } };
      }
    }

    const token = createInviteToken();
    const tokenHash = hashInviteToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: inviteError } = await admin.from("org_invites").insert({
      org_id: orgId,
      email: normalizedEmail,
      role,
      token_hash: tokenHash,
      invited_by: user.id,
      expires_at: expiresAt,
    });

    if (inviteError) {
      return formError(toPublicError(inviteError, "Could not create invite"));
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const inviteUrl = `${appUrl}/invite/${token}`;

    // Always email the invitee — notify_team_invites is for inviter alerts, not gating delivery
    await sendInviteEmail({
      to: normalizedEmail,
      displayName: display_name,
      orgName,
      inviteUrl,
    });

    revalidatePath("/team");
    return { success: true, invited: true as const };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to invite user";
    return { error: { _form: [message] } };
  }
}

export async function acceptOrgInvite(token: string) {
  const { user } = await requireUser();
  if (!user.email) return { error: "Your account has no email" };

  const tokenHash = hashInviteToken(token);
  const admin = createAdminClient();

  const { data: invite, error } = await admin
    .from("org_invites")
    .select("*")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !invite) {
    return { error: "Invite is invalid or expired" };
  }

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return {
      error: `This invite was sent to ${invite.email}. Sign in with that email to accept.`,
    };
  }

  // Claim invite atomically before membership insert
  const acceptedAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await admin
    .from("org_invites")
    .update({ accepted_at: acceptedAt })
    .eq("id", invite.id)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("id, org_id, role")
    .maybeSingle();

  if (claimError || !claimed) {
    return { error: "Invite is invalid or expired" };
  }

  const { error: memberError } = await admin.from("organization_members").insert({
    org_id: claimed.org_id,
    user_id: user.id,
    role: claimed.role,
  });

  if (memberError) {
    if (memberError.code === "23505") {
      return { success: true, orgId: claimed.org_id as string };
    }
    // Roll back claim so invite can be retried
    await admin
      .from("org_invites")
      .update({ accepted_at: null })
      .eq("id", claimed.id);
    return { error: "Could not join workspace. Try again." };
  }

  await admin
    .from("profiles")
    .update({
      email: user.email,
      display_name:
        (user.user_metadata?.display_name as string | undefined) ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  revalidatePath("/", "layout");
  return { success: true, orgId: claimed.org_id as string };
}

export async function getInvitePreview(token: string) {
  const tokenHash = hashInviteToken(token);
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("org_invites")
    .select("email, role, expires_at, org_id, accepted_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!invite || invite.revoked_at || invite.accepted_at) {
    return { error: "Invite is invalid or expired" as const };
  }
  if (new Date(invite.expires_at) < new Date()) {
    return { error: "Invite is invalid or expired" as const };
  }

  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", invite.org_id)
    .maybeSingle();

  return {
    email: invite.email as string,
    role: invite.role as string,
    orgName: org?.name ?? "Workspace",
    expiresAt: invite.expires_at as string,
  };
}

export async function updateTeamMember(payload: unknown) {
  const parsed = teamMemberUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: "Invalid member data" };
  }

  const { supabase, orgId, user, role: actorRole } = await requireOrgAdmin();
  const { member_id, display_name, role } = parsed.data;

  const { data: member } = await supabase
    .from("organization_members")
    .select("user_id, role")
    .eq("id", member_id)
    .eq("org_id", orgId)
    .single();

  if (!member) return { error: "Member not found" };

  if (role && !canAssignRole(actorRole, role)) {
    return { error: "You cannot assign that role" };
  }

  if (role === "owner" && actorRole !== "owner") {
    return { error: "Only owners can assign the owner role" };
  }

  if (member.user_id === user.id && role && role !== member.role) {
    return { error: "You cannot change your own role" };
  }

  if (role && role !== "owner" && member.role === "owner") {
    const { count } = await supabase
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("role", "owner");

    if ((count ?? 0) <= 1) {
      return { error: "Cannot remove the last owner" };
    }
  }

  if (role) {
    const { error } = await supabase
      .from("organization_members")
      .update({ role })
      .eq("id", member_id)
      .eq("org_id", orgId);

    if (error) return actionError(toPublicError(error));
  }

  if (display_name) {
    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({ display_name, updated_at: new Date().toISOString() })
      .eq("id", member.user_id);

    await admin.auth.admin.updateUserById(member.user_id, {
      user_metadata: { display_name },
    });
  }

  revalidatePath("/team");
  return { success: true };
}

export async function removeTeamMember(memberId: string) {
  const { supabase, orgId, user } = await requireOrgAdmin();

  const { data: member } = await supabase
    .from("organization_members")
    .select("user_id, role")
    .eq("id", memberId)
    .eq("org_id", orgId)
    .single();

  if (!member) return { error: "Member not found" };
  if (member.user_id === user.id) {
    return { error: "You cannot remove yourself" };
  }

  if (member.role === "owner") {
    const { count } = await supabase
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("role", "owner");

    if ((count ?? 0) <= 1) {
      return { error: "Cannot remove the last owner" };
    }
  }

  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId)
    .eq("org_id", orgId);

  if (error) return actionError(toPublicError(error));

  revalidatePath("/team");
  return { success: true };
}

export async function getSignupSettings() {
  const { supabase, orgId, role } = await getUserOrg();

  const { data } = await supabase
    .from("app_settings")
    .select("default_org_id")
    .eq("id", 1)
    .single();

  return {
    defaultOrgId: data?.default_org_id ?? null,
    isDefaultOrg: data?.default_org_id === orgId,
    canManage: canManageTeam(role),
  };
}

export async function setDefaultSignupOrg() {
  const { supabase, orgId, role } = await requireOrgAdmin();
  if (role !== "owner") {
    return { error: "Only owners can change signup settings" };
  }

  const { error } = await supabase.from("app_settings").upsert({
    id: 1,
    default_org_id: orgId,
    updated_at: new Date().toISOString(),
  });

  if (error) return actionError(toPublicError(error));

  revalidatePath("/team");
  return { success: true };
}

export async function clearDefaultSignupOrg() {
  const { supabase, role } = await requireOrgAdmin();
  if (role !== "owner") {
    return { error: "Only owners can change signup settings" };
  }

  const { error } = await supabase
    .from("app_settings")
    .update({
      default_org_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) return actionError(toPublicError(error));

  revalidatePath("/team");
  return { success: true };
}
