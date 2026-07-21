"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Globe, Image, Mic, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import {
  applyQaFix,
  createAudienceVariant,
  generateSpeakerNotes,
  generateTitleHeroImage,
  getDeckQaResult,
  narrateFullDeck,
  runDeckQaCheck,
  setWeeklyAutoDraft,
  translateDeck,
} from "@/lib/actions/ai-enhancements";
import {
  DECK_AUDIENCES,
  DECK_AUDIENCE_LABELS,
  type DeckAudience,
} from "@/lib/ai/audience";
import type { DeckQaResult } from "@/lib/ai/schemas/deck-ai";
import {
  SUPPORTED_TRANSLATE_LANGUAGES,
  TRANSLATE_LANGUAGE_LABELS,
  type TranslateLanguage,
} from "@/lib/ai/schemas/translate";
import { pollAiGeneration } from "@/lib/hooks/poll-ai-generation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type DeckAiPanelProps = {
  deckId: string;
  initialAudience?: DeckAudience;
  initialQa?: DeckQaResult | null;
  initialAutoRefreshWeekly?: boolean;
};

export function DeckAiPanel({
  deckId,
  initialAudience = "general",
  initialQa = null,
  initialAutoRefreshWeekly = false,
}: DeckAiPanelProps) {
  const router = useRouter();
  const [audience, setAudience] = useState<DeckAudience>(initialAudience);
  const [qa, setQa] = useState<DeckQaResult | null>(initialQa);
  const [runningQa, setRunningQa] = useState(false);
  const [generatingNotes, setGeneratingNotes] = useState(false);
  const [variantLoading, setVariantLoading] = useState<DeckAudience | null>(null);
  const [forkAsSeparateDeck, setForkAsSeparateDeck] = useState(false);
  const [fixingIndex, setFixingIndex] = useState<number | null>(null);
  const [translateLang, setTranslateLang] = useState<TranslateLanguage>("es");
  const [translating, setTranslating] = useState(false);
  const [narrating, setNarrating] = useState(false);
  const [titleImageLoading, setTitleImageLoading] = useState(false);
  const [autoWeekly, setAutoWeekly] = useState(initialAutoRefreshWeekly);

  async function handleRunQa() {
    setRunningQa(true);
    try {
      const result = await runDeckQaCheck(deckId);
      const actionError = getActionError(result);
      if (actionError) {
        toast.error(actionError);
        return;
      }
      if (!("generationId" in result) || !result.generationId) {
        toast.error("Failed to start deck QA");
        return;
      }
      toast.message("Reviewing deck…");
      const done = await pollAiGeneration(deckId, result.generationId);
      const qaResult = done.result as DeckQaResult | null;
      if (!qaResult?.findings) {
        const { qa: latest } = await getDeckQaResult(deckId);
        if (latest) setQa(latest);
        else toast.error("QA completed without results");
        return;
      }
      setQa(qaResult);
      toast.success(`Deck QA complete — score ${qaResult.score}/100`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Deck QA failed");
    } finally {
      setRunningQa(false);
    }
  }

  async function handleQaFix(index: number) {
    setFixingIndex(index);
    try {
      const result = await applyQaFix(deckId, index);
      const actionError = getActionError(result);
      if (actionError) {
        toast.error(actionError);
        return;
      }
      if ("generationId" in result && result.generationId) {
        toast.message("Applying fix…");
        await pollAiGeneration(deckId, result.generationId);
        toast.success("Fix applied");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fix failed");
    } finally {
      setFixingIndex(null);
    }
  }

  async function handleGenerateAllNotes() {
    setGeneratingNotes(true);
    try {
      const result = await generateSpeakerNotes(deckId);
      const actionError = getActionError(result);
      if (actionError) {
        toast.error(actionError);
        return;
      }
      if (!("generationId" in result) || !result.generationId) {
        toast.error("Failed to start speaker notes");
        return;
      }
      toast.message("Generating speaker notes…");
      await pollAiGeneration(deckId, result.generationId);
      toast.success("Speaker notes generated for all slides");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Speaker notes failed");
    } finally {
      setGeneratingNotes(false);
    }
  }

  async function handleAudienceVariant(target: DeckAudience) {
    setVariantLoading(target);
    try {
      const result = await createAudienceVariant(deckId, target, {
        forkAsSeparateDeck,
      });
      const actionError = getActionError(result);
      if (actionError) {
        toast.error(actionError);
        return;
      }
      setAudience(target);
      if ("forkedDeckId" in result && result.forkedDeckId) {
        toast.success(`Forked deck for ${DECK_AUDIENCE_LABELS[target]}`);
        router.push(`/decks/${result.forkedDeckId}/editor`);
        return;
      }
      toast.success(`Refreshing slides for ${DECK_AUDIENCE_LABELS[target]} audience`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Audience variant failed");
    } finally {
      setVariantLoading(null);
    }
  }

  async function handleTranslate() {
    setTranslating(true);
    try {
      const result = await translateDeck(deckId, translateLang);
      const actionError = getActionError(result);
      if (actionError) {
        toast.error(actionError);
        return;
      }
      if (!("generationId" in result) || !result.generationId) return;
      toast.message("Translating deck…");
      await pollAiGeneration(deckId, result.generationId);
      toast.success(`Deck translated to ${TRANSLATE_LANGUAGE_LABELS[translateLang]}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setTranslating(false);
    }
  }

  async function handleNarrateDeck() {
    setNarrating(true);
    try {
      const result = await narrateFullDeck(deckId);
      const actionError = getActionError(result);
      if (actionError) {
        toast.error(actionError);
        return;
      }
      if (!("generationId" in result) || !result.generationId) return;
      toast.message("Generating narration for all slides…");
      await pollAiGeneration(deckId, result.generationId);
      toast.success("Deck narration cached");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Narration failed");
    } finally {
      setNarrating(false);
    }
  }

  async function handleTitleHero() {
    setTitleImageLoading(true);
    try {
      const result = await generateTitleHeroImage(deckId);
      const actionError = getActionError(result);
      if (actionError) {
        toast.error(actionError);
        return;
      }
      if ("generationId" in result && result.generationId) {
        toast.message("Generating title image…");
        await pollAiGeneration(deckId, result.generationId);
        toast.success("Title hero image ready");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Title image failed");
    } finally {
      setTitleImageLoading(false);
    }
  }

  async function handleWeeklyToggle(enabled: boolean) {
    const result = await setWeeklyAutoDraft(deckId, enabled);
    const actionError = getActionError(result);
    if (actionError) {
      toast.error(actionError);
      return;
    }
    setAutoWeekly(enabled);
    toast.success(enabled ? "Weekly auto-outline enabled" : "Weekly auto-outline disabled");
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <h3 className="font-medium">AI tools</h3>

      <div className="space-y-2">
        <Label htmlFor="deck-audience">Target audience</Label>
        <select
          id="deck-audience"
          value={audience}
          onChange={(e) => void handleAudienceVariant(e.target.value as DeckAudience)}
          disabled={variantLoading !== null}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {DECK_AUDIENCES.map((a) => (
            <option key={a} value={a}>
              {DECK_AUDIENCE_LABELS[a]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={forkAsSeparateDeck}
            onChange={(e) => setForkAsSeparateDeck(e.target.checked)}
          />
          Fork as separate deck when changing audience
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={runningQa} onClick={() => void handleRunQa()}>
          <ClipboardCheck className="mr-2 h-4 w-4" />
          {runningQa ? "Reviewing…" : "Run deck QA"}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={generatingNotes} onClick={() => void handleGenerateAllNotes()}>
          <Sparkles className="mr-2 h-4 w-4" />
          {generatingNotes ? "Generating…" : "Generate all notes"}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={titleImageLoading} onClick={() => void handleTitleHero()}>
          <Image className="mr-2 h-4 w-4" />
          {titleImageLoading ? "Generating…" : "Title hero image"}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={narrating} onClick={() => void handleNarrateDeck()}>
          <Mic className="mr-2 h-4 w-4" />
          {narrating ? "Narrating…" : "Narrate full deck"}
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="translate-lang">Translate deck</Label>
          <select
            id="translate-lang"
            value={translateLang}
            onChange={(e) => setTranslateLang(e.target.value as TranslateLanguage)}
            className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {SUPPORTED_TRANSLATE_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {TRANSLATE_LANGUAGE_LABELS[lang]}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={translating} onClick={() => void handleTranslate()}>
          <Globe className="mr-2 h-4 w-4" />
          {translating ? "Translating…" : "Translate"}
        </Button>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={autoWeekly}
          onChange={(e) => void handleWeeklyToggle(e.target.checked)}
        />
        Auto-refresh outline weekly (Mondays)
      </label>

      {qa && (
        <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
          <p className="text-sm font-medium">QA score: {qa.score}/100</p>
          <p className="text-xs text-muted-foreground">{qa.summary}</p>
          <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
            {qa.findings.map((finding, i) => (
              <li key={`${finding.category}-${i}`} className="rounded border border-border bg-background p-2">
                <p className="font-medium capitalize">
                  {finding.severity} · {finding.category.replace(/_/g, " ")}
                  {finding.slideTitle ? ` · ${finding.slideTitle}` : ""}
                </p>
                <p>{finding.message}</p>
                <p className="text-muted-foreground">{finding.suggestion}</p>
                {finding.slideOrder !== null && finding.fixInstruction && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7"
                    disabled={fixingIndex === i}
                    onClick={() => void handleQaFix(i)}
                  >
                    {fixingIndex === i ? "Fixing…" : "Fix"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Users className="h-3 w-3" aria-hidden />
        Audience affects outline, fill, refresh, and rewrite.
      </p>
    </div>
  );
}
