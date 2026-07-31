import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/client";
import { escapeHtml } from "@/lib/share/invite-token";

export async function notifyDeckOwnerOfDeferredQuestion({
  supabase,
  deckId,
  question,
}: {
  supabase: SupabaseClient;
  deckId: string;
  question: string;
}): Promise<void> {
  const { data: deck, error: deckError } = await supabase
    .from("decks")
    .select("name, org_id")
    .eq("id", deckId)
    .maybeSingle();

  if (deckError || !deck) return;

  // organization_members.user_id references auth.users, not profiles directly,
  // so load member IDs first and resolve their profile emails separately.
  const { data: members, error: membersError } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("org_id", deck.org_id)
    .in("role", ["owner", "admin", "member"])
    .limit(5);

  if (membersError || !members?.length) return;

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("email")
    .in(
      "id",
      members.map((member) => member.user_id)
    );

  if (profilesError) return;

  const recipients = [
    ...new Set(
      (profiles ?? [])
        .map((profile) => profile.email?.trim())
        .filter((email): email is string => Boolean(email))
    ),
  ];
  const safeDeckName = escapeHtml(deck.name);
  const safeQuestion = escapeHtml(question);
  const subjectDeckName = deck.name.replace(/[\r\n]+/g, " ").trim();

  await Promise.allSettled(
    recipients.map((to) =>
      sendEmail({
        to,
        subject: `New viewer question on ${subjectDeckName}`,
        html: `<p>A viewer asked a question the AI could not answer from your deck:</p><blockquote>${safeQuestion}</blockquote><p>Review it in the editor for <strong>${safeDeckName}</strong>.</p>`,
      })
    )
  );
}
