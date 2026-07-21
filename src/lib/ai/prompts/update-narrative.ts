export function buildUpdateNarrativePrompt({
  projectName,
  before,
  after,
}: {
  projectName: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}) {
  return `You write a concise executive summary of what changed in a project status update.

Project: ${projectName}

Previous update snapshot:
${JSON.stringify(before, null, 2)}

Current update:
${JSON.stringify(after, null, 2)}

Return a 2-4 sentence narrative and 3-6 bullet highlights of the most important changes.
Do not invent facts not supported by the diff.`;
}
