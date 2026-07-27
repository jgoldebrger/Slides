"use client";

import { useEffect, useState } from "react";
import { Bookmark, Star } from "lucide-react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import {
  listPromptLibrary,
  savePromptLibraryEntry,
  togglePromptFavorite,
} from "@/lib/actions/ai-workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type PromptRow = {
  id: string;
  name: string;
  body: string;
  scope: string;
  is_favorite: boolean;
  tags: string[];
};

export function PromptLibraryPanel() {
  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [scope, setScope] = useState<"personal" | "org">("personal");
  const [loading, setLoading] = useState(false);

  async function load() {
    const result = await listPromptLibrary();
    if ("prompts" in result) setPrompts(result.prompts as PromptRow[]);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSave() {
    if (!name.trim() || !body.trim()) return;
    setLoading(true);
    const result = await savePromptLibraryEntry({ name, body, scope });
    const err = getActionError(result);
    if (err) toast.error(err);
    else {
      toast.success("Prompt saved");
      setName("");
      setBody("");
      await load();
    }
    setLoading(false);
  }

  async function handleFavorite(id: string, favorite: boolean) {
    await togglePromptFavorite(id, favorite);
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="prompt-name">Name</Label>
          <Input
            id="prompt-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Board prep rewrite"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="prompt-scope">Scope</Label>
          <select
            id="prompt-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as "personal" | "org")}
            className="flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
          >
            <option value="personal">Personal</option>
            <option value="org">Org shared</option>
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="prompt-body">Prompt</Label>
        <Textarea
          id="prompt-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Rewrite for executives with {{audience}} tone…"
        />
      </div>
      <Button disabled={loading} onClick={() => void handleSave()}>
        <Bookmark className="mr-1 h-4 w-4" />
        Save prompt
      </Button>

      <ul className="divide-y divide-border rounded-lg border border-border">
        {prompts.map((p) => (
          <li key={p.id} className="flex items-start justify-between gap-2 p-3">
            <div className="min-w-0">
              <p className="font-medium">{p.name}</p>
              <p className="truncate text-xs text-muted-foreground">{p.body}</p>
              <p className="text-xs text-muted-foreground">{p.scope}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void handleFavorite(p.id, !p.is_favorite)}
              aria-label={p.is_favorite ? "Unfavorite" : "Favorite"}
            >
              <Star
                className={`h-4 w-4 ${p.is_favorite ? "fill-current text-warning" : ""}`}
              />
            </Button>
          </li>
        ))}
        {!prompts.length && (
          <li className="p-4 text-sm text-muted-foreground">No prompts yet.</li>
        )}
      </ul>
    </div>
  );
}
