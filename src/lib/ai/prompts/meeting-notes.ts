export function buildMeetingNotesPrompt({
  projectName,
  notes,
}: {
  projectName: string;
  notes: string;
}) {
  return `You extract structured project update fields from meeting notes or transcripts.

Project: ${projectName}

Rules:
- Use ONLY information present in the notes. Do not invent metrics, dates, or names.
- Leave arrays empty when a section has no relevant content.
- progress should be a short narrative paragraph if discussed.
- metrics need label and value strings when numbers are mentioned.

Meeting notes:
${notes}`;
}
