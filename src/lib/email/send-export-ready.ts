import { sendEmail } from "@/lib/email/client";

type SendExportReadyEmailInput = {
  to: string;
  deckName: string;
  exportUrl: string;
};

export async function sendExportReadyEmail({
  to,
  deckName,
  exportUrl,
}: SendExportReadyEmailInput) {
  return sendEmail({
    to,
    subject: `Your export is ready: ${deckName}`,
    html: `
      <p>Your PowerPoint export for <strong>${deckName}</strong> is ready.</p>
      <p><a href="${exportUrl}">Download your deck</a></p>
    `,
  });
}
