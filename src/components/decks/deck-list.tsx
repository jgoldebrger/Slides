"use client";

import { useMemo, useState } from "react";
import { DeckListRow } from "@/components/decks/deck-list-row";
import { Input } from "@/components/ui/input";
import {
  SEARCH_DEBOUNCE_MS,
  useDebouncedValue,
} from "@/lib/hooks/use-debounce";

type DeckItem = {
  id: string;
  name: string;
  type: string;
  status: string;
  projectName?: string;
};

type DeckListProps = {
  decks: DeckItem[];
  isViewer: boolean;
};

export function DeckList({ decks, isViewer }: DeckListProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return decks;
    return decks.filter(
      (deck) =>
        deck.name.toLowerCase().includes(q) ||
        deck.type.replace(/_/g, " ").toLowerCase().includes(q) ||
        (deck.projectName?.toLowerCase().includes(q) ?? false)
    );
  }, [decks, debouncedQuery]);

  return (
    <div className="space-y-3">
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={isViewer ? "Search presentations…" : "Search decks…"}
        aria-label={isViewer ? "Search presentations" : "Search decks"}
      />
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No decks match your search.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {filtered.map((deck) => (
            <DeckListRow key={deck.id} deck={deck} isViewer={isViewer} />
          ))}
        </ul>
      )}
    </div>
  );
}
