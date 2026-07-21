"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acceptOrgInvite } from "@/lib/actions/team";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type InviteAcceptCardProps = {
  token: string;
  orgName: string;
  email: string;
  role: string;
  signedIn: boolean;
  signedInEmail: string | null;
};

export function InviteAcceptCard({
  token,
  orgName,
  email,
  role,
  signedIn,
  signedInEmail,
}: InviteAcceptCardProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptOrgInvite(token);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  const emailMismatch =
    signedIn &&
    signedInEmail &&
    signedInEmail.toLowerCase() !== email.toLowerCase();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle as="h1">Join {orgName}</CardTitle>
        <CardDescription>
          You&apos;ve been invited as <strong>{role}</strong> (
          {email}).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!signedIn ? (
          <>
            <p className="text-sm text-muted-foreground">
              Sign in or create an account with <strong>{email}</strong>, then
              open this invite link again.
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href={`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`}>
                  Sign in to accept
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link
                  href={`/signup?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(`/invite/${token}`)}`}
                >
                  Create account
                </Link>
              </Button>
            </div>
          </>
        ) : emailMismatch ? (
          <p className="text-sm text-destructive" role="alert">
            Signed in as {signedInEmail}. This invite is for {email}. Switch
            accounts to accept.
          </p>
        ) : (
          <>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button
              type="button"
              className="w-full"
              disabled={pending}
              onClick={handleAccept}
            >
              {pending ? "Joining…" : `Join ${orgName}`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
