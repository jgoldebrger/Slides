"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  getBillingStatus,
  openBillingPortal,
  startBillingCheckout,
} from "@/lib/actions/billing";
import { Button } from "@/components/ui/button";

type BillingActionsProps = {
  stripeEnabled: boolean;
};

export function BillingActions({ stripeEnabled }: BillingActionsProps) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("none");
  const [hasCustomer, setHasCustomer] = useState(false);

  useEffect(() => {
    if (!stripeEnabled) return;
    void getBillingStatus().then((result) => {
      setStatus(result.subscriptionStatus);
      setHasCustomer(result.hasCustomer);
    });
  }, [stripeEnabled]);

  useEffect(() => {
    const billing = searchParams.get("billing");
    if (billing === "success") toast.success("Subscription updated");
    if (billing === "cancelled") toast.info("Checkout cancelled");
  }, [searchParams]);

  if (!stripeEnabled) {
    return (
      <p className="text-sm text-muted-foreground">
        Billing is not configured. Add Stripe keys to enable subscriptions.
      </p>
    );
  }

  async function handleCheckout() {
    setLoading(true);
    const result = await startBillingCheckout();
    if ("error" in result && result.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    if ("url" in result && result.url) {
      window.location.href = result.url;
    }
    setLoading(false);
  }

  async function handlePortal() {
    setLoading(true);
    const result = await openBillingPortal();
    if ("error" in result && result.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    if ("url" in result && result.url) {
      window.location.href = result.url;
    }
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Status: <span className="capitalize text-foreground">{status}</span>
      </p>
      {hasCustomer ? (
        <Button onClick={handlePortal} disabled={loading}>
          {loading ? "Redirecting…" : "Manage subscription"}
        </Button>
      ) : (
        <Button onClick={handleCheckout} disabled={loading}>
          {loading ? "Redirecting…" : "Start subscription"}
        </Button>
      )}
    </div>
  );
}
