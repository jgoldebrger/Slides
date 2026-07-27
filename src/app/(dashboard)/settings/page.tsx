import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BillingActions } from "@/components/settings/billing-actions";
import { OrgAiSettingsForm } from "@/components/settings/org-ai-settings-form";
import { OrgPortfolioPanel } from "@/components/settings/org-portfolio-panel";
import { AiAddonsHub } from "@/components/decks/ai-addons-hub";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { AiCostMeter } from "@/components/ai/ai-cost-meter";
import { AiConnectorsPanel } from "@/components/ai/ai-connectors-panel";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProfileSettings } from "@/lib/actions/profile";
import { canManageTeam } from "@/lib/roles";
import { getOrgContext } from "@/lib/viewer-guard";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { isViewer, role } = await getOrgContext();
  if (isViewer) redirect("/decks");

  const isAdmin = canManageTeam(role);
  const profile = await getProfileSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your workspace preferences."
      />

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

      {isAdmin ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>AI preferences</CardTitle>
              <CardDescription>
                Org-wide AI behavior and feature flags.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrgAiSettingsForm />
              <div className="mt-6">
                <AiAddonsHub scope="org" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Org memory</CardTitle>
              <CardDescription>
                Portfolio rollup and insight patterns across projects.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrgPortfolioPanel />
            </CardContent>
          </Card>

          <AiCostMeter />

          <Card>
            <CardHeader>
              <CardTitle>AI connectors</CardTitle>
              <CardDescription>
                Slack, Jira, email, and other intake sources.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AiConnectorsPanel />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>AI preferences</CardTitle>
            <CardDescription>
              Only workspace admins can change org-wide AI settings.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

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

