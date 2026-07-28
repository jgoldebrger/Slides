"use client";

import { useMemo, useState } from "react";
import { DeckListRow } from "@/components/decks/deck-list-row";
import {
  EntityListEmpty,
  EntityListPanel,
  EntityListSearchToolbar,
} from "@/components/shared/entity-list";
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
  updated_at?: string;
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

  const noun = isViewer ? "presentation" : "deck";
  const countLabel = `${filtered.length} ${noun}${filtered.length === 1 ? "" : "s"}`;

  return (
    <div className="space-y-4">
      <EntityListSearchToolbar
        value={query}
        onChange={setQuery}
        placeholder={isViewer ? "Search presentations…" : "Search decks…"}
        ariaLabel={isViewer ? "Search presentations" : "Search decks"}
        countLabel={countLabel}
      />

      {filtered.length === 0 ? (
        <EntityListEmpty
          message={
            isViewer
              ? "No presentations match your search."
              : "No decks match your search."
          }
        />
      ) : (
        <EntityListPanel>
          {filtered.map((deck) => (
            <DeckListRow key={deck.id} deck={deck} isViewer={isViewer} />
          ))}
        </EntityListPanel>
      )}
    </div>
  );
}
