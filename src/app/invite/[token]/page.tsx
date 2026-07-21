import type { Metadata } from "next";
import Link from "next/link";
import { InviteAcceptCard } from "@/components/auth/invite-accept-card";
import { getInvitePreview } from "@/lib/actions/team";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Accept invite" };

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const preview = await getInvitePreview(token);

  if ("error" in preview) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invite unavailable</CardTitle>
            <CardDescription>{preview.error}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Ask a workspace admin to send a new invite.
            </p>
            <Button asChild variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <InviteAcceptCard
        token={token}
        orgName={preview.orgName}
        email={preview.email}
        role={preview.role}
        signedIn={!!user}
        signedInEmail={user?.email ?? null}
      />
    </main>
  );
}
