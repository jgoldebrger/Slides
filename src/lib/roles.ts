export const VIEWER_ROLE = "viewer" as const;

export const EDITOR_ROLES = ["owner", "admin", "member"] as const;

export const ADMIN_ROLES = ["owner", "admin"] as const;

export const ASSIGNABLE_ROLES = [
  "viewer",
  "member",
  "admin",
  "owner",
] as const;

export type OrgRole = (typeof EDITOR_ROLES)[number] | typeof VIEWER_ROLE;

export function isViewerRole(role: string): boolean {
  return role === VIEWER_ROLE;
}

export function canEditOrg(role: string): boolean {
  return !isViewerRole(role);
}

export function canManageTeam(role: string): boolean {
  return ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}
