"use client";

type AiResultPanelProps = {
  data: unknown;
  title?: string;
  className?: string;
};

function formatValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "object" && item !== null
          ? JSON.stringify(item)
          : String(item)
      )
      .join(", ");
  }
  return JSON.stringify(value, null, 2);
}

export function AiResultPanel({ data, title, className }: AiResultPanelProps) {
  if (data == null) return null;

  if (typeof data === "string") {
    return (
      <div
        className={`rounded-md border border-border bg-muted/30 p-3 text-sm ${className ?? ""}`}
      >
        {title ? (
          <p className="mb-1 text-xs font-medium text-muted-foreground">{title}</p>
        ) : null}
        <p className="whitespace-pre-wrap">{data}</p>
      </div>
    );
  }

  if (Array.isArray(data)) {
    return (
      <div className={`space-y-2 ${className ?? ""}`}>
        {title ? (
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
        ) : null}
        <ul className="max-h-56 list-disc space-y-1 overflow-auto pl-4 text-sm">
          {data.map((item, index) => (
            <li key={index}>{formatValue(item)}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    return (
      <div
        className={`max-h-56 space-y-2 overflow-auto rounded-md border border-border bg-muted/30 p-3 ${className ?? ""}`}
      >
        {title ? (
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
        ) : null}
        {entries.map(([key, value]) => (
          <div key={key}>
            <span className="text-xs font-medium capitalize">
              {key.replace(/_/g, " ")}
            </span>
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {formatValue(value)}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <pre
      className={`max-h-56 overflow-auto rounded-md bg-muted/50 p-3 text-xs ${className ?? ""}`}
    >
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
