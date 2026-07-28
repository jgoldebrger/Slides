"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthFormHeader } from "@/components/auth/auth-form-header";
import { requestPasswordResetAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const result = await requestPasswordResetAction(email);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMessage(result.message ?? "Check your email for reset instructions.");
  }

  return (
    <div className="space-y-8">
      <AuthFormHeader
        title="Reset password"
        description="Enter your email and we'll send a reset link if an account exists."
      />

      {message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-10"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "forgot-error" : undefined}
            />
          </div>
          {error && (
            <p id="forgot-error" role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
