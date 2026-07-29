/** Allowed inline HTML for slide text fields (stored in title, body, bullets, quote). */

const ALLOWED_TAGS =
  /^(b|strong|i|em|u|span|br|font)$/i;

const FONT_SIZE_MAP: Record<string, number> = {
  "12px": 12,
  "14px": 14,
  "16px": 16,
  "18px": 18,
  "20px": 20,
  "24px": 24,
  "32px": 32,
};

export const RICH_TEXT_COLORS = [
  { label: "Default", value: "" },
  { label: "Brand blue", value: "var(--link)" },
  { label: "Dark", value: "var(--foreground)" },
  { label: "Muted", value: "var(--muted-foreground)" },
  { label: "Red", value: "#dc2626" },
  { label: "Green", value: "#16a34a" },
  { label: "Orange", value: "#ea580c" },
] as const;

export const RICH_TEXT_HIGHLIGHTS = [
  { label: "None", value: "" },
  { label: "Yellow", value: "#fef08a" },
  { label: "Blue", value: "#bfdbfe" },
  { label: "Green", value: "#bbf7d0" },
  { label: "Pink", value: "#fbcfe8" },
] as const;

export const RICH_TEXT_FONT_SIZES = [
  { label: "Small", value: "14px" },
  { label: "Normal", value: "16px" },
  { label: "Large", value: "20px" },
  { label: "XL", value: "24px" },
  { label: "Title", value: "32px" },
] as const;

export function hasRichTextMarkup(value: string | undefined | null): boolean {
  return Boolean(value && /<[a-z][\s\S]*>/i.test(value));
}

export function richTextToPlainText(html: string | undefined | null): string {
  if (!html) return "";
  if (!hasRichTextMarkup(html)) return html;
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeStyle(style: string): string {
  const allowed: string[] = [];
  for (const part of style.split(";")) {
    const [rawKey, rawVal] = part.split(":");
    if (!rawKey || !rawVal) continue;
    const key = rawKey.trim().toLowerCase();
    const val = rawVal.trim();
    if (
      (key === "color" || key === "background-color" || key === "font-size") &&
      !/url\s*\(/i.test(val)
    ) {
      allowed.push(`${key}:${val}`);
    }
  }
  return allowed.join(";");
}

/** Strip unsafe markup; keep basic inline formatting. */
export function sanitizeRichText(input: string): string {
  if (!input) return "";
  if (!hasRichTextMarkup(input)) return input;

  let html = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/\s+on\w+="[^"]*"/gi, "")
    .replace(/\s+on\w+='[^']*'/gi, "");

  if (typeof document !== "undefined") {
    const container = document.createElement("div");
    container.innerHTML = html;
    sanitizeNode(container);
    return container.innerHTML;
  }

  // Server fallback: strip disallowed tags, keep text
  html = html.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag: string) => {
    if (ALLOWED_TAGS.test(tag)) return match;
    return "";
  });
  return html;
}

function sanitizeNode(node: Node): void {
  const children = Array.from(node.childNodes);
  for (const child of children) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (!ALLOWED_TAGS.test(tag)) {
        while (el.firstChild) {
          el.parentNode?.insertBefore(el.firstChild, el);
        }
        el.remove();
        continue;
      }
      for (const attr of Array.from(el.attributes)) {
        if (attr.name === "style") {
          const clean = sanitizeStyle(attr.value);
          if (clean) el.setAttribute("style", clean);
          else el.removeAttribute("style");
        } else if (attr.name === "color" && tag === "font") {
          el.setAttribute("color", attr.value.replace(/[^\w#(),.% -]/g, ""));
        } else {
          el.removeAttribute(attr.name);
        }
      }
      sanitizeNode(el);
    }
  }
}

export type PptxTextRun = {
  text: string;
  options?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
    fontSize?: number;
    highlight?: string;
  };
};

function hexForPptx(color: string): string | undefined {
  const c = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.replace("#", "");
  if (/^#[0-9a-f]{3}$/i.test(c)) {
    const [, r, g, b] = c.match(/^#(.)(.)(.)$/) ?? [];
    if (r && g && b) return `${r}${r}${g}${g}${b}${b}`;
  }
  return undefined;
}

function parseStyleAttr(style: string): PptxTextRun["options"] {
  const opts: PptxTextRun["options"] = {};
  for (const part of style.split(";")) {
    const [rawKey, rawVal] = part.split(":");
    if (!rawKey || !rawVal) continue;
    const key = rawKey.trim().toLowerCase();
    const val = rawVal.trim();
    if (key === "color") {
      const hex = hexForPptx(val);
      if (hex) opts.color = hex;
    } else if (key === "background-color") {
      const hex = hexForPptx(val);
      if (hex) opts.highlight = hex;
    } else if (key === "font-size") {
      opts.fontSize =
        FONT_SIZE_MAP[val] ?? (parseInt(val, 10) || undefined);
    }
  }
  return opts;
}

/** Convert sanitized HTML to pptxgenjs text runs (basic inline styles). */
export function richTextToPptxRuns(
  html: string,
  base: PptxTextRun["options"] = {}
): PptxTextRun[] {
  const plain = richTextToPlainText(html);
  if (!hasRichTextMarkup(html)) {
    return plain ? [{ text: plain, options: base }] : [];
  }

  if (typeof document === "undefined") {
    return plain ? [{ text: plain, options: base }] : [];
  }

  const container = document.createElement("div");
  container.innerHTML = sanitizeRichText(html);
  const runs: PptxTextRun[] = [];

  function walk(node: Node, inherited: PptxTextRun["options"]) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text) runs.push({ text, options: { ...inherited } });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const next: PptxTextRun["options"] = { ...inherited };
    if (tag === "b" || tag === "strong") next.bold = true;
    if (tag === "i" || tag === "em") next.italic = true;
    if (tag === "u") next.underline = true;
    if (tag === "br") {
      runs.push({ text: "\n", options: { ...next } });
      return;
    }
    if (el.getAttribute("style")) {
      Object.assign(next, parseStyleAttr(el.getAttribute("style") ?? ""));
    }
    if (tag === "font" && el.getAttribute("color")) {
      const hex = hexForPptx(el.getAttribute("color") ?? "");
      if (hex) next.color = hex;
    }
    el.childNodes.forEach((child) => walk(child, next));
  }

  container.childNodes.forEach((child) => walk(child, base));
  return runs.length ? runs : plain ? [{ text: plain, options: base }] : [];
}
