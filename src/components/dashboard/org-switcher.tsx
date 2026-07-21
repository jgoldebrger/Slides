"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { switchOrganization } from "@/lib/actions/org";
import type { UserOrg } from "@/lib/org-context";

type OrgSwitcherProps = {
  orgs: UserOrg[];
  activeOrgId: string;
};

export function OrgSwitcher({ orgs, activeOrgId }: OrgSwitcherProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (orgs.length <= 1) return null;

  function handleChange(orgId: string) {
    if (orgId === activeOrgId) return;
    startTransition(async () => {
      const result = await switchOrganization(orgId);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <select
      aria-label="Switch workspace"
      value={activeOrgId}
      disabled={pending}
      onChange={(e) => handleChange(e.target.value)}
      className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
    >
      {orgs.map((org) => (
        <option key={org.id} value={org.id}>
          {org.name}
        </option>
      ))}
    </select>
  );
}
