import { sendEmail } from "@/lib/email/client";

export async function sendWelcomeEmail({
  to,
  displayName,
}: {
  to: string;
  displayName?: string | null;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
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
