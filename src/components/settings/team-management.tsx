"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  clearDefaultSignupOrg,
  createTeamMember,
  removeTeamMember,
  setDefaultSignupOrg,
  updateTeamMember,
  type TeamMember,
} from "@/lib/actions/team";
import { getActionError } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ASSIGNABLE_ROLES } from "@/lib/roles";

const roleLabels: Record<string, string> = {
  viewer: "Viewer (presentations only)",
  member: "Member (can edit)",
  admin: "Admin (can manage users)",
  owner: "Owner",
};

type TeamManagementProps = {
  members: TeamMember[];
  actorRole: string;
  isDefaultSignupOrg: boolean;
};

export function TeamManagement({
  members,
  actorRole,
  isDefaultSignupOrg,
}: TeamManagementProps) {
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    const form = new FormData(e.currentTarget);
    const result = await createTeamMember({
      email: form.get("email"),
      display_name: form.get("display_name"),
      role: form.get("role") ?? "viewer",
    });

    const err = getActionError(result);
    if (err) toast.error(err);
    else {
      toast.success("Invite sent");
      (e.target as HTMLFormElement).reset();
    }
    setCreating(false);
  }

  async function handleRoleChange(member: TeamMember, role: string) {
    setSavingId(member.id);
    const result = await updateTeamMember({ member_id: member.id, role });
    const err = getActionError(result);
    if (err) toast.error(err);
    else toast.success("Role updated");
    setSavingId(null);
  }

  async function handleNameSave(member: TeamMember, displayName: string) {
    if (displayName === member.displayName) return;
    setSavingId(member.id);
    const result = await updateTeamMember({
      member_id: member.id,
      display_name: displayName,
    });
    const err = getActionError(result);
    if (err) toast.error(err);
    else toast.success("Name updated");
    setSavingId(null);
  }

  async function handleRemoveConfirm() {
    if (!removeTarget) return;
    setRemoving(true);
    const result = await removeTeamMember(removeTarget.id);
    const err = getActionError(result);
    if (err) toast.error(err);
    else {
      toast.success("User removed");
      setRemoveTarget(null);
    }
    setRemoving(false);
  }

  const assignableRoles =
    actorRole === "owner"
      ? ASSIGNABLE_ROLES
      : ASSIGNABLE_ROLES.filter((r) => r !== "owner");

  return (
    <div className="space-y-6">
      {actorRole === "owner" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Public signup</CardTitle>
            <CardDescription>
              New users who sign up on the login page join this workspace as
              viewers.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {isDefaultSignupOrg
                ? "This workspace receives new signups."
                : "Another workspace is set for new signups (or each user gets their own)."}
            </p>
            {isDefaultSignupOrg ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  const r = await clearDefaultSignupOrg();
                  const err = getActionError(r);
                  if (err) toast.error(err);
                  else toast.success("Public signup target cleared");
                }}
              >
                Clear signup target
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  const r = await setDefaultSignupOrg();
                  const err = getActionError(r);
                  if (err) toast.error(err);
                  else toast.success("This workspace is now the signup target");
                }}
              >
                Use this workspace
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite teammate</CardTitle>
          <CardDescription>
            Send an email invite link. They set their own password — no temporary
            passwords.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="display_name">Name</Label>
              <Input id="display_name" name="display_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                defaultValue="viewer"
                className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                {assignableRoles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={creating}>
                {creating ? "Sending invite…" : "Send invite"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team members</CardTitle>
          <CardDescription>
            {members.length} user{members.length === 1 ? "" : "s"} in this
            workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <Input
                    defaultValue={member.displayName}
                    className="max-w-xs font-medium"
                    onBlur={(e) => handleNameSave(member, e.target.value)}
                    disabled={savingId === member.id}
                    aria-label={`Display name for ${member.email}`}
                  />
                  <p className="truncate text-sm text-muted-foreground">
                    {member.email}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member, e.target.value)}
                    disabled={
                      savingId === member.id ||
                      (member.role === "owner" && actorRole !== "owner")
                    }
                    aria-label={`Role for ${member.email}`}
                    className="h-9 rounded-md border border-border bg-card px-2 text-sm"
                  >
                    {assignableRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setRemoveTarget(member)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Dialog
        open={removeTarget !== null}
        onOpenChange={(next) => {
          if (!next) setRemoveTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove team member?</DialogTitle>
            <DialogDescription>
              Remove{" "}
              {removeTarget?.email || removeTarget?.displayName || "this user"}{" "}
              from the workspace? They will lose access immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveTarget(null)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleRemoveConfirm()}
              disabled={removing}
            >
              {removing ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
