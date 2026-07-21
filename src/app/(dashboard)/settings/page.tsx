import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BillingActions } from "@/components/settings/billing-actions";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getProfileSettings } from "@/lib/actions/profile";
import { getOrgContext } from "@/lib/viewer-guard";
import { canManageTeam } from "@/lib/roles";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { isViewer, role } = await getOrgContext();
  if (isViewer) redirect("/decks");

  const profile = await getProfileSettings();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Manage your workspace preferences.</p>
      </div>

      {canManageTeam(role) && (
        <Card>
          <CardHeader>
            <CardTitle>Team</CardTitle>
            <CardDescription>
              View all users, create accounts, and change roles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/settings/team">Manage team</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
          <CardDescription>
            Manage your workspace subscription and payment method.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading billing…</p>}>
            <BillingActions
              stripeEnabled={Boolean(
                process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID
              )}
            />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Profile and notification preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileSettingsForm initial={profile} />
        </CardContent>
      </Card>
    </div>
  );
}
