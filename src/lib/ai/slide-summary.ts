export function summarizeSlideContent(content: Record<string, unknown>): string {
  const parts: string[] = [];

  if (typeof content.body === "string" && content.body.trim()) {
    parts.push(content.body.trim());
  }

  if (Array.isArray(content.bullets)) {
    for (const bullet of content.bullets) {
      if (typeof bullet === "string" && bullet.trim()) {
        parts.push(bullet.trim());
      }
    }
  }

  if (Array.isArray(content.metrics)) {
    for (const metric of content.metrics) {
      if (metric && typeof metric === "object") {
        const record = metric as { label?: string; value?: string };
        if (record.label && record.value) {
          parts.push(`${record.label}: ${record.value}`);
        }
      }
    }
  }

  return parts.join("; ").slice(0, 120);
}
