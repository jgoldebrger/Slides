import { sendEmail } from "@/lib/email/client";
import { escapeHtml } from "@/lib/share/invite-token";

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: {
  to: string;
  resetUrl: string;
}) {
  const safeUrl = escapeHtml(resetUrl);
  return sendEmail({
    to,
    subject: "Reset your UpdateDeck password",
    html: `
      <p>We received a request to reset your UpdateDeck password.</p>
      <p><a href="${safeUrl}">Choose a new password</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
}
