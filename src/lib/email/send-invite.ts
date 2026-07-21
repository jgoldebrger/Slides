import { sendEmail } from "@/lib/email/client";
import { escapeHtml } from "@/lib/share/invite-token";

export async function sendInviteEmail({
  to,
  displayName,
  orgName,
  inviteUrl,
}: {
  to: string;
  displayName: string;
  orgName: string;
  inviteUrl: string;
}) {
  const safeName = escapeHtml(displayName);
  const safeOrg = escapeHtml(orgName);
  const safeUrl = escapeHtml(inviteUrl);

  return sendEmail({
    to,
    subject: `You've been invited to ${orgName} on UpdateDeck`,
    html: `
      <p>Hi ${safeName},</p>
      <p>You've been invited to join <strong>${safeOrg}</strong> on UpdateDeck.</p>
      <p><a href="${safeUrl}">Accept invitation</a></p>
      <p>This link expires in 7 days. If you do not have an account yet, create one with this email, then open the link again.</p>
    `,
  });
}
