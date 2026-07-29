import { sanitizeRichText } from "@/lib/slides/rich-text";
import { cn } from "@/lib/utils";

type RichTextContentProps = {
  html: string;
  className?: string;
  style?: React.CSSProperties;
  as?: "span" | "p" | "div";
};

export function RichTextContent({
  html,
  className,
  style,
  as: Tag = "span",
}: RichTextContentProps) {
  if (!html) return null;
  const safe = sanitizeRichText(html);
  return (
    <Tag
      className={cn(
        "[&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline",
        className
      )}
      style={style}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
