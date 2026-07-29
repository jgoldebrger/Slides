"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Highlighter,
  Italic,
  Palette,
  Type,
  Underline,
} from "lucide-react";
import {
  RICH_TEXT_COLORS,
  RICH_TEXT_FONT_SIZES,
  RICH_TEXT_HIGHLIGHTS,
  sanitizeRichText,
} from "@/lib/slides/rich-text";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  singleLine?: boolean;
  className?: string;
};

function applyFontSize(size: string) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (range.collapsed) return;
  const span = document.createElement("span");
  span.style.fontSize = size;
  try {
    range.surroundContents(span);
  } catch {
    span.appendChild(range.extractContents());
    range.insertNode(span);
  }
  selection.removeAllRanges();
}

export function RichTextEditor({
  id,
  label,
  value,
  onChange,
  placeholder,
  minHeight = "4.5rem",
  singleLine = false,
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const lastValueRef = useRef<string | null>(null);
  const isSyncingRef = useRef(false);

  const syncFromDom = useCallback(() => {
    if (isSyncingRef.current) return;
    const el = editorRef.current;
    if (!el) return;
    let html = sanitizeRichText(el.innerHTML);
    if (singleLine) {
      html = html.replace(/<br\s*\/?>/gi, " ").replace(/\n/g, " ");
    }
    if (html === "<br>" || html === "<div><br></div>") html = "";
    if (html === lastValueRef.current) return;
    lastValueRef.current = html;
    onChange(html);
  }, [onChange, singleLine]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || focused) return;
    if (value === lastValueRef.current) return;
    isSyncingRef.current = true;
    el.innerHTML = value ? sanitizeRichText(value) : "";
    lastValueRef.current = value;
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  }, [value, focused]);

  function exec(cmd: string, arg?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    syncFromDom();
  }

  function handleFontSize(size: string) {
    editorRef.current?.focus();
    applyFontSize(size);
    syncFromDom();
  }

  function handleColor(color: string) {
    editorRef.current?.focus();
    if (color) document.execCommand("foreColor", false, color);
    else document.execCommand("removeFormat", false);
    syncFromDom();
  }

  function handleHighlight(color: string) {
    editorRef.current?.focus();
    if (color) document.execCommand("hiliteColor", false, color);
    else document.execCommand("removeFormat", false);
    syncFromDom();
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <div className="overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
        <div
          className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-1 py-1"
          role="toolbar"
          aria-label="Text formatting"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec("bold")}
            aria-label="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec("italic")}
            aria-label="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec("underline")}
            aria-label="Underline"
          >
            <Underline className="h-4 w-4" />
          </Button>

          <div className="mx-1 h-5 w-px bg-border" aria-hidden />

          <label className="flex items-center gap-1 px-1">
            <Type className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <select
              className="h-8 max-w-[6.5rem] rounded-md border border-input bg-background px-1.5 text-xs"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) handleFontSize(e.target.value);
                e.target.value = "";
              }}
              aria-label="Font size"
            >
              <option value="" disabled>
                Size
              </option>
              {RICH_TEXT_FONT_SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1 px-1">
            <Palette className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <select
              className="h-8 max-w-[6.5rem] rounded-md border border-input bg-background px-1.5 text-xs"
              defaultValue=""
              onChange={(e) => {
                handleColor(e.target.value);
                e.target.value = "";
              }}
              aria-label="Text color"
            >
              <option value="" disabled>
                Color
              </option>
              {RICH_TEXT_COLORS.map((c) => (
                <option key={c.label} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1 px-1">
            <Highlighter className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <select
              className="h-8 max-w-[6.5rem] rounded-md border border-input bg-background px-1.5 text-xs"
              defaultValue=""
              onChange={(e) => {
                handleHighlight(e.target.value);
                e.target.value = "";
              }}
              aria-label="Highlight color"
            >
              <option value="" disabled>
                Highlight
              </option>
              {RICH_TEXT_HIGHLIGHTS.map((c) => (
                <option key={c.label} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          id={id}
          ref={editorRef}
          role="textbox"
          aria-multiline={!singleLine}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          className={cn(
            "min-w-0 px-3 py-2 text-sm outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
            "[&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline",
            singleLine && "whitespace-nowrap overflow-x-auto"
          )}
          style={{ minHeight: singleLine ? undefined : minHeight }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            syncFromDom();
          }}
          onInput={syncFromDom}
          onKeyDown={(e) => {
            if (singleLine && e.key === "Enter") {
              e.preventDefault();
            }
          }}
        />
      </div>
    </div>
  );
}
