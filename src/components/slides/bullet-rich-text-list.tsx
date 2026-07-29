"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { RichTextEditor } from "@/components/slides/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type BulletRichTextListProps = {
  id?: string;
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
};

export function BulletRichTextList({
  id,
  label,
  items,
  onChange,
}: BulletRichTextListProps) {
  const [rows, setRows] = useState<string[]>(items.length ? items : [""]);

  useEffect(() => {
    const next = items.length ? items : [""];
    setRows((prev) =>
      JSON.stringify(prev) === JSON.stringify(next) ? prev : next
    );
  }, [items]);

  function emit(next: string[]) {
    setRows(next);
    onChange(next);
  }

  function updateItem(index: number, value: string) {
    const next = [...rows];
    next[index] = value;
    emit(next);
  }

  function addItem() {
    emit([...rows, ""]);
  }

  function removeItem(index: number) {
    const next = rows.filter((_, i) => i !== index);
    emit(next.length ? next : [""]);
  }

  return (
    <div className="space-y-2">
      <Label id={id}>{label}</Label>
      <div className="space-y-2">
        {rows.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <span className="mt-3 w-4 shrink-0 text-xs text-muted-foreground">
              •
            </span>
            <div className="min-w-0 flex-1">
              <RichTextEditor
                value={item}
                onChange={(value) => updateItem(index, value)}
                placeholder="Bullet point"
                singleLine
                minHeight="2.5rem"
              />
            </div>
            {rows.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-1 h-8 w-8 shrink-0 text-muted-foreground"
                onClick={() => removeItem(index)}
                aria-label={`Remove bullet ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add bullet
      </Button>
    </div>
  );
}
