import type { Metadata } from "next";
import { Suspense } from "react";
import { BillingActions } from "@/components/settings/billing-actions";
import { SettingsSection } from "@/components/settings/settings-section";
import { requireSettingsAccess } from "@/lib/settings-guard";

export const metadata: Metadata = { title: "Billing · Settings" };

export default async function SettingsBillingPage() {
  await requireSettingsAccess();

  return (
    <SettingsSection
      title="Billing"
      description="Workspace subscription and payment method."
    >
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading billing…</p>
        }
      >
        <BillingActions
          stripeEnabled={Boolean(
            process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID
          )}
        />
      </Suspense>
    </SettingsSection>
  );
}
