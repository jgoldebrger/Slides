import { getAppUrl } from "@/lib/app-url";
import { sendEmail } from "@/lib/email/client";

export async function sendWelcomeEmail({
  to,
  displayName,
}: {
  to: string;
  displayName?: string | null;
}) {
  const appUrl = await getAppUrl();
  const name = displayName?.trim() || "there";
  return sendEmail({
    to,
    subject: "Welcome to UpdateDeck",
    html: `
      <p>Hi ${name},</p>
      <p>Welcome to UpdateDeck — turn structured project updates into polished decks.</p>
      <p><a href="${appUrl}/dashboard">Open your dashboard</a></p>
    `,
  });
}
